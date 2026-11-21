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
import {
  checkCeiling,
  recordSpend,
  type CeilingVerdict,
  type Ceilings,
} from "../limits/ceiling.ts";
import { newId, now } from "../domain/ids.ts";
import type { Agent, GameProfile, Session, Turn, TurnRole } from "../domain/types.ts";
import { requireString, optionalString } from "../domain/validate.ts";
import { buildDigest, type Digest } from "../memory/digest.ts";
import { liveMemories, markReferenced, remember, supersede } from "../memory/repo.ts";
import { runDebrief } from "../memory/debrief.ts";
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

/**
 * Thrown when a player has consumed their window's ceiling.
 *
 * Carries the verdict rather than a message alone so the HTTP layer can
 * say which kind ran out and how much was consumed. A ceiling the player
 * cannot see is indistinguishable from a bug.
 */
export class CeilingReachedError extends Error {
  // A plain field, not a constructor parameter property: Node strips types
  // rather than compiling them, so `readonly x` in a parameter list is not
  // available here (tsconfig enforces it with erasableSyntaxOnly).
  readonly verdict: Extract<CeilingVerdict, { allowed: false }>;

  constructor(verdict: Extract<CeilingVerdict, { allowed: false }>) {
    super(
      `consumption ceiling reached: ${verdict.spent} of ${verdict.ceiling} ${verdict.kind}`,
    );
    this.name = "CeilingReachedError";
    this.verdict = verdict;
  }
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

export type TurnLimits = {
  ceilings?: Ceilings;
  windowMs?: number;
  /** Injectable so a test does not have to wait a day. */
  nowMs?: number;
};

export type TakeTurnInput = {
  sessionId: string;
  /** Overrides for the consumption ceiling. Defaults when absent. */
  limits?: TurnLimits;
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

/**
 * Everything a turn needs before the model is asked anything.
 *
 * Shared by the whole-reply and streaming paths so the assembly of the
 * four parts — profile, voice, memory digest, player context — has one
 * implementation. It is the core of the product; two copies of it would
 * drift and only one of them would be tested.
 */
async function prepareTurn(
  db: Db,
  input: TakeTurnInput,
): Promise<{
  session: Session;
  playerTurn: Turn;
  systemStable: string;
  systemVolatile: string;
  messages: SpeakMessage[];
  digest: Digest;
}> {
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

  // The ceiling is checked here, before the player's turn is appended.
  // A refused turn must leave no trace: an orphan player line would sit
  // in the transcript unanswered forever, and every later turn would pay
  // input tokens to carry it in the history.
  const verdict = await checkCeiling(db, session.playerId, {
    ...(input.limits?.ceilings ? { ceilings: input.limits.ceilings } : {}),
    ...(input.limits?.windowMs !== undefined ? { windowMs: input.limits.windowMs } : {}),
    ...(input.limits?.nowMs !== undefined ? { nowMs: input.limits.nowMs } : {}),
  });
  if (!verdict.allowed) throw new CeilingReachedError(verdict);

  // The player's turn is appended before the model is called. If the call
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

  return {
    session,
    playerTurn,
    systemStable: buildStablePrompt(profile, agent),
    systemVolatile: buildVolatilePrompt({ digest: digest.text, liveContext }),
    messages: [
      ...history.map((t) => ({ role: t.role, text: t.text })),
      { role: "player" as const, text },
    ],
    digest,
  };
}

// ── Streaming a turn ─────────────────────────────────────────────────────

export type TurnStreamEvent =
  | { type: "player"; turn: Turn }
  | { type: "delta"; text: string }
  | {
      type: "done";
      copilotTurn: Turn | null;
      refused: boolean;
      latencyMs: number;
      digest: Pick<Digest, "usedTokens" | "droppedCount" | "includedIds">;
    };

/**
 * A turn, a piece at a time.
 *
 * The reply is persisted in a `finally`, so a consumer that walks away
 * mid-stream still leaves a correct transcript: what the companion
 * actually said is on the record, and the player's words were already
 * there. Nothing is invented to fill the gap — a reply cut short is
 * stored as what was said, not padded out.
 *
 * A refusal persists nothing. Partial text before a refusal is not a
 * reply, and storing it would put words in the companion's mouth.
 */
export async function* takeTurnStream(
  db: Db,
  input: TakeTurnInput,
  model: ModelAdapter,
): AsyncGenerator<TurnStreamEvent> {
  const prep = await prepareTurn(db, input);
  yield { type: "player", turn: prep.playerTurn };

  const startedAt = Date.now();
  let spoken = "";
  let refused = false;
  let copilotTurn: Turn | null = null;
  let usage: { inputTokens: number; outputTokens: number } | undefined;

  try {
    for await (const event of model.speakStream({
      systemStable: prep.systemStable,
      systemVolatile: prep.systemVolatile,
      messages: prep.messages,
    })) {
      if (event.type === "delta") {
        spoken += event.text;
        yield { type: "delta", text: event.text };
      } else {
        refused = event.refused;
        usage = event.usage;
      }
    }
  } finally {
    // Runs whether the stream finished, threw, or the consumer abandoned
    // it — an async generator's finally runs when it is returned early.
    if (!refused && spoken.trim().length > 0) {
      copilotTurn = await appendTurn(
        db,
        prep.session.id,
        "copilot",
        spoken.trim(),
        Date.now() - startedAt,
      );
      await markReferenced(db, prep.digest.includedIds);
    }

    // Metered from what the provider reported, refusal included: a
    // declined request still consumed its input tokens and we were still
    // charged for them.
    //
    // A KNOWN HOLE, recorded rather than papered over: when a consumer
    // abandons the stream the provider's usage report may never arrive,
    // and this then records nothing. Estimating it would put an invented
    // number in a ledger whose only job is to be true. What bounds that
    // gap is the per-minute rate limiter, not this.
    if (usage) {
      await recordSpend(db, {
        playerId: prep.session.playerId,
        sessionId: prep.session.id,
        kind: "model_input_tokens",
        units: usage.inputTokens,
      });
      await recordSpend(db, {
        playerId: prep.session.playerId,
        sessionId: prep.session.id,
        kind: "model_output_tokens",
        units: usage.outputTokens,
      });
    }
  }

  yield {
    type: "done",
    copilotTurn,
    refused,
    latencyMs: Date.now() - startedAt,
    digest: {
      usedTokens: prep.digest.usedTokens,
      droppedCount: prep.digest.droppedCount,
      includedIds: prep.digest.includedIds,
    },
  };
}

/**
 * A turn, as one reply.
 *
 * Drains the streaming path rather than duplicating it, so there is one
 * implementation of a turn and the two forms cannot disagree.
 */
export async function takeTurn(
  db: Db,
  input: TakeTurnInput,
  model: ModelAdapter,
): Promise<TakeTurnResult> {
  let playerTurn: Turn | null = null;

  for await (const event of takeTurnStream(db, input, model)) {
    if (event.type === "player") playerTurn = event.turn;
    else if (event.type === "done") {
      if (!playerTurn) throw new Error("the stream ended without a player turn");
      return {
        playerTurn,
        copilotTurn: event.copilotTurn,
        refused: event.refused,
        latencyMs: event.latencyMs,
        digest: event.digest,
      };
    }
  }
  throw new Error("the turn stream ended without finishing");
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

export type DebriefReport = {
  /** Where the stored summary came from. */
  summarySource: "provided" | "generated" | "none";
  memoriesStored: number;
  supersededCount: number;
  /** Supersession targets the model named that did not belong to this player. */
  rejectedSupersessions: number;
  droppedCandidates: number;
  modelId: string;
};

export type EndSessionResult = {
  session: Session;
  /** Null when no debrief ran: no model, no turns, or already closed. */
  debrief: DebriefReport | null;
};

export type EndSessionOptions = {
  /** An explicit summary. Overrides the generated one if both exist. */
  summary?: unknown;
  /** When given, the session is debriefed: summary and memories extracted. */
  model?: ModelAdapter;
};

/**
 * Closes a session, and debriefs it.
 *
 * The debrief is what makes memory a feature rather than a schema: until
 * this runs, nothing in the product writes a memory, and a session that
 * ends without one is a hole in the player's history.
 *
 * Idempotent. A session that is already closed is returned untouched and
 * is NOT debriefed again — re-running would spend a model call to store
 * duplicates of what the first run already stored.
 */
export async function endSession(
  db: Db,
  sessionId: string,
  opts: EndSessionOptions = {},
): Promise<EndSessionResult> {
  const session = await findSession(db, sessionId);
  if (!session) throw new NotFoundError("session");

  const provided = optionalString(opts.summary, "summary", { max: 1200 });

  if (session.endedAt !== null) {
    // Already closed. Say so by returning it unchanged rather than
    // throwing: closing twice is a harmless client retry, and charging a
    // second debrief for it would not be.
    return { session, debrief: null };
  }

  const turns = await recentTurns(db, sessionId, 200);

  // No model, or nothing was said: close with whatever the caller gave us
  // and spend nothing. A debrief of an empty transcript has no content to
  // find, and asking for one anyway is how you get invented memories.
  if (!opts.model || turns.length === 0) {
    return { session: await close(db, session, provided), debrief: null };
  }

  const existing = await liveMemories(db, session.playerId, {
    gameProfileId: session.gameProfileId,
  });

  const debrief = await runDebrief(
    turns.map((t) => ({ role: t.role, text: t.text })),
    existing,
    opts.model,
  );

  let supersededCount = 0;
  for (const candidate of debrief.memories) {
    const stored = await remember(db, {
      playerId: session.playerId,
      sessionId: session.id,
      gameProfileId: session.gameProfileId,
      kind: candidate.kind,
      text: candidate.text,
      salience: candidate.salience,
    });
    if (candidate.supersedesId !== null) {
      await supersede(db, candidate.supersedesId, stored.id);
      supersededCount += 1;
    }
  }

  const summary = provided ?? debrief.summary;

  return {
    session: await close(db, session, summary),
    debrief: {
      summarySource:
        provided !== null ? "provided" : debrief.summary !== null ? "generated" : "none",
      memoriesStored: debrief.memories.length,
      supersededCount,
      rejectedSupersessions: debrief.rejectedSupersessions,
      droppedCandidates: debrief.droppedCandidates,
      modelId: debrief.modelId,
    },
  };
}

const close = async (
  db: Db,
  session: Session,
  summary: string | null,
): Promise<Session> => {
  const stamp = now();
  await db.run("UPDATE session SET ended_at = ?, summary = ? WHERE id = ?", [
    stamp,
    summary,
    session.id,
  ]);
  return { ...session, endedAt: stamp, summary };
};
