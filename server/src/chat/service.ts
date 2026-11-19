/**
 * Chat: sessions and turns.
 *
 * This is the companion talking to the player while they play. One turn is
 * one assembly of the four parts, one model call, and two appended rows.
 *
 * The context window holds only the recent turns; everything older lives
 * in memory and arrives as the digest. That split is the point — a
 * conversation that keeps its history only in the window loses it when the
 * window rolls, and with it the feature the subscription rests on.
 */

import type { Db } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { Agent, GameProfile, Session, Turn, TurnRole } from "../domain/types.ts";
import { requireString, optionalString } from "../domain/validate.ts";
import { buildDigest, type Digest } from "../memory/digest.ts";
import { liveMemories, markReferenced } from "../memory/repo.ts";
import { findAgentById, NotFoundError } from "../marketplace/agents.ts";
import { ensureProfile, findById as findProfileById } from "../profiles/repo.ts";
import type { ModelAdapter, SpeakMessage } from "../model/adapter.ts";
import { buildStablePrompt, buildVolatilePrompt } from "./prompt.ts";

/** How many recent turns go into the model's messages array. */
export const HISTORY_TURNS = 20;

/** Token budget for the injected digest. Measured, not guessed — see tests. */
export const DEFAULT_DIGEST_BUDGET = 700;

type SessionRow = {
  id: string;
  player_id: string;
  game_profile_id: string;
  agent_id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  turn_count: number;
};

type TurnRow = {
  id: string;
  session_id: string;
  seq: number;
  role: string;
  text: string;
  latency_ms: number | null;
  created_at: string;
};

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  playerId: r.player_id,
  gameProfileId: r.game_profile_id,
  agentId: r.agent_id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  summary: r.summary,
  turnCount: r.turn_count,
});

const toTurn = (r: TurnRow): Turn => ({
  id: r.id,
  sessionId: r.session_id,
  seq: r.seq,
  role: r.role as TurnRole,
  text: r.text,
  latencyMs: r.latency_ms,
  createdAt: r.created_at,
});

export async function findSession(db: Db, id: string): Promise<Session | null> {
  const row = await db.get<SessionRow>("SELECT * FROM session WHERE id = ?", [id]);
  return row ? toSession(row) : null;
}

/** Oldest first, which is the order the model's messages array needs. */
export async function recentTurns(
  db: Db,
  sessionId: string,
  limit = HISTORY_TURNS,
): Promise<Turn[]> {
  const rows = await db.all<TurnRow>(
    "SELECT * FROM turn WHERE session_id = ? ORDER BY seq DESC LIMIT ?",
    [sessionId, limit],
  );
  return rows.map(toTurn).reverse();
}

export class SessionClosedError extends Error {
  constructor() {
    super("session has ended");
    this.name = "SessionClosedError";
  }
}

// ── Starting a session ───────────────────────────────────────────────────

export type StartSessionInput = {
  playerId: string;
  /** Any title. The profile is generated on first sight of a new one. */
  gameTitle: unknown;
  agentId: string;
};

export async function startSession(
  db: Db,
  input: StartSessionInput,
  model: ModelAdapter,
): Promise<{ session: Session; profile: GameProfile; agent: Agent }> {
  const title = requireString(input.gameTitle, "gameTitle", { min: 2, max: 120 });

  const agent = await findAgentById(db, input.agentId);
  if (!agent) throw new NotFoundError("agent");

  // Generating the profile happens outside the transaction on purpose: it
  // is a model call and can take seconds, and holding a write transaction
  // open across it would block every other writer.
  const profile = await ensureProfile(db, title, model);

  const session: Session = {
    id: newId(),
    playerId: input.playerId,
    gameProfileId: profile.id,
    agentId: agent.id,
    startedAt: now(),
    endedAt: null,
    summary: null,
    turnCount: 0,
  };

  await db.run(
    `INSERT INTO session
       (id, player_id, game_profile_id, agent_id, started_at, ended_at, summary, turn_count)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, 0)`,
    [
      session.id,
      session.playerId,
      session.gameProfileId,
      session.agentId,
      session.startedAt,
    ],
  );

  return { session, profile, agent };
}

// ── Taking a turn ────────────────────────────────────────────────────────

export type TakeTurnInput = {
  sessionId: string;
  text: unknown;
  /** Player-reported, not observed. See prompt.ts. */
  liveContext?: unknown;
  digestBudgetTokens?: number;
};

export type TakeTurnResult = {
  playerTurn: Turn;
  /** Null when the model declined. No reply is invented in that case. */
  copilotTurn: Turn | null;
  refused: boolean;
  latencyMs: number;
  digest: Pick<Digest, "usedTokens" | "droppedCount" | "includedIds">;
};

/**
 * The previous session's summary, which is how a new session opens knowing
 * what happened in the last one.
 */
const previousSummary = async (
  db: Db,
  playerId: string,
  currentSessionId: string,
): Promise<string | null> => {
  const row = await db.get<{ summary: string | null }>(
    `SELECT summary FROM session
      WHERE player_id = ? AND id <> ? AND summary IS NOT NULL
      ORDER BY started_at DESC LIMIT 1`,
    [playerId, currentSessionId],
  );
  return row?.summary ?? null;
};

export async function takeTurn(
  db: Db,
  input: TakeTurnInput,
  model: ModelAdapter,
): Promise<TakeTurnResult> {
  const text = requireString(input.text, "text", { max: 2000 });
  const liveContext = optionalString(input.liveContext, "liveContext", {
    max: 4000,
  });

  const session = await findSession(db, input.sessionId);
  if (!session) throw new NotFoundError("session");
  if (session.endedAt !== null) throw new SessionClosedError();

  const profile = await findProfileById(db, session.gameProfileId);
  if (!profile) throw new NotFoundError("game profile");
  const agent = await findAgentById(db, session.agentId);
  if (!agent) throw new NotFoundError("agent");

  // Append the player's turn before calling the model. If the model call
  // fails the player's words are still on the record, which is the
  // behaviour you want: losing what someone said is worse than a missing
  // reply they can see failed.
  const history = await recentTurns(db, session.id);
  const playerTurn = await appendTurn(db, session.id, "player", text, null);

  const memories = await liveMemories(db, session.playerId, {
    gameProfileId: profile.id,
  });
  const digest = buildDigest({
    previousSummary: await previousSummary(db, session.playerId, session.id),
    memories,
    budgetTokens: input.digestBudgetTokens ?? DEFAULT_DIGEST_BUDGET,
  });

  const messages: SpeakMessage[] = [
    ...history.map((t) => ({ role: t.role, text: t.text })),
    { role: "player" as const, text },
  ];

  const startedAt = Date.now();
  const spoken = await model.speak({
    systemStable: buildStablePrompt(profile, agent),
    systemVolatile: buildVolatilePrompt({ digest: digest.text, liveContext }),
    messages,
  });
  const latencyMs = Date.now() - startedAt;

  if (spoken.refused) {
    // Nothing is fabricated in the companion's voice. The caller decides
    // what to show; the transcript records that no reply was produced.
    return {
      playerTurn,
      copilotTurn: null,
      refused: true,
      latencyMs,
      digest: {
        usedTokens: digest.usedTokens,
        droppedCount: digest.droppedCount,
        includedIds: digest.includedIds,
      },
    };
  }

  const copilotTurn = await appendTurn(
    db,
    session.id,
    "copilot",
    spoken.text,
    latencyMs,
  );
  await markReferenced(db, digest.includedIds);

  return {
    playerTurn,
    copilotTurn,
    refused: false,
    latencyMs,
    digest: {
      usedTokens: digest.usedTokens,
      droppedCount: digest.droppedCount,
      includedIds: digest.includedIds,
    },
  };
}

/**
 * Appends one turn and keeps session.turn_count in step, in a single
 * transaction. `seq` is derived inside it, so two concurrent turns cannot
 * both claim the same number — the UNIQUE (session_id, seq) index would
 * reject the second, which is the behaviour we want over a silent
 * overwrite.
 */
async function appendTurn(
  db: Db,
  sessionId: string,
  role: TurnRole,
  text: string,
  latencyMs: number | null,
): Promise<Turn> {
  return db.tx(async (tx) => {
    const row = await tx.get<{ next: number }>(
      "SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM turn WHERE session_id = ?",
      [sessionId],
    );
    const seq = row?.next ?? 1;
    const turn: Turn = {
      id: newId(),
      sessionId,
      seq,
      role,
      text,
      latencyMs,
      createdAt: now(),
    };
    await tx.run(
      `INSERT INTO turn (id, session_id, seq, role, text, latency_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [turn.id, turn.sessionId, turn.seq, turn.role, turn.text, turn.latencyMs, turn.createdAt],
    );
    await tx.run(
      "UPDATE session SET turn_count = turn_count + 1 WHERE id = ?",
      [sessionId],
    );
    return turn;
  });
}

// ── Ending a session ─────────────────────────────────────────────────────

/**
 * Closes a session and records its summary. The summary is what the next
 * session's digest opens with, so a session that ends without one is a
 * hole in the player's history.
 */
export async function endSession(
  db: Db,
  sessionId: string,
  summary: unknown,
): Promise<Session> {
  const session = await findSession(db, sessionId);
  if (!session) throw new NotFoundError("session");

  const text = optionalString(summary, "summary", { max: 1200 });
  const stamp = now();
  await db.run(
    "UPDATE session SET ended_at = ?, summary = ? WHERE id = ?",
    [stamp, text, sessionId],
  );
  return { ...session, endedAt: stamp, summary: text };
}
