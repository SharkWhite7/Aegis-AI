import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb, seedWorld } from "./helpers.ts";
import {
  DEFAULT_CEILINGS,
  checkCeiling,
  recordSpend,
  spendSummary,
  spentSince,
  type Ceilings,
} from "../src/limits/ceiling.ts";
import {
  CeilingReachedError,
  recentTurns,
  startSession,
  takeTurn,
  takeTurnStream,
} from "../src/chat/service.ts";
import { findAgentBySlug } from "../src/marketplace/agents.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { drain, type ModelAdapter, type SpeakEvent, type SpeakRequest, type SpeakResult, type StructuredRequest, type StructuredResult } from "../src/model/adapter.ts";

/**
 * A stub that reports usage it was told to report.
 *
 * The real StubModelAdapter reports zero tokens, which is the honest answer
 * for a stub that called nothing. Metering needs a non-zero number to
 * meter, so this test double supplies one explicitly rather than the stub
 * pretending to have spent something.
 */
class MeteredAdapter implements ModelAdapter {
  readonly id = "metered-stub";
  calls = 0;

  readonly usage: { inputTokens: number; outputTokens: number };

  constructor(usage: { inputTokens: number; outputTokens: number }) {
    this.usage = usage;
  }

  async *speakStream(_req: SpeakRequest): AsyncIterable<SpeakEvent> {
    this.calls += 1;
    yield { type: "delta", text: "a measured reply" };
    yield {
      type: "done",
      modelId: this.id,
      refused: false,
      usage: this.usage,
    };
  }

  speak(req: SpeakRequest): Promise<SpeakResult> {
    return drain(this.speakStream(req));
  }

  async structured(_req: StructuredRequest): Promise<StructuredResult> {
    return { data: {}, modelId: this.id, refused: false };
  }
}

const tiny = (over: Partial<Ceilings>): Ceilings => ({
  ...DEFAULT_CEILINGS,
  ...over,
});

async function world() {
  const db = freshDb();
  const { player, profile } = await seedWorld(db);
  const agent = await findAgentBySlug(db, "hustler");
  assert.ok(agent);
  return { db, player, profile, agent };
}

// ── The ledger ───────────────────────────────────────────────────────────

test("an empty ledger sums to zero, not null", async () => {
  const { db, player } = await world();
  assert.equal(
    await spentSince(db, player.id, "model_input_tokens", "1970-01-01T00:00:00.000Z"),
    0,
    "SUM over no rows is NULL in SQL; the module must not leak that",
  );
  await db.close();
});

test("the ledger sums, and a negative row corrects an earlier one", async () => {
  const { db, player } = await world();
  await recordSpend(db, { playerId: player.id, kind: "model_input_tokens", units: 500 });
  await recordSpend(db, { playerId: player.id, kind: "model_input_tokens", units: 250 });
  assert.equal(await spentSince(db, player.id, "model_input_tokens", "1970-01-01T00:00:00.000Z"), 750);

  // A correction is another row. An UPDATE would erase what was consumed.
  await recordSpend(db, { playerId: player.id, kind: "model_input_tokens", units: -250 });
  assert.equal(await spentSince(db, player.id, "model_input_tokens", "1970-01-01T00:00:00.000Z"), 500);

  const rows = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM spend_entry");
  assert.equal(rows[0]?.n, 3, "three rows, because nothing was overwritten");
  await db.close();
});

test("zero units records nothing, and a fraction is refused rather than rounded", async () => {
  const { db, player } = await world();
  await recordSpend(db, { playerId: player.id, kind: "tts_characters", units: 0 });
  const rows = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM spend_entry");
  assert.equal(rows[0]?.n, 0);

  await assert.rejects(
    () => recordSpend(db, { playerId: player.id, kind: "tts_characters", units: 1.5 }),
    TypeError,
    "silently rounding a count is how a ledger starts disagreeing with reality",
  );
  await db.close();
});

test("only one kind is counted against its own ceiling", async () => {
  const { db, player } = await world();
  await recordSpend(db, { playerId: player.id, kind: "tts_characters", units: 999 });
  assert.equal(await spentSince(db, player.id, "model_input_tokens", "1970-01-01T00:00:00.000Z"), 0);
  assert.equal(await spentSince(db, player.id, "tts_characters", "1970-01-01T00:00:00.000Z"), 999);
  await db.close();
});

// ── The window ───────────────────────────────────────────────────────────

test("consumption outside the window does not count against the ceiling", async () => {
  const { db, player } = await world();
  await recordSpend(db, { playerId: player.id, kind: "model_input_tokens", units: 100 });

  const ceilings = tiny({ model_input_tokens: 50 });

  // Measured now, the row is inside the window and over the ceiling.
  const nowVerdict = await checkCeiling(db, player.id, { ceilings, windowMs: 60_000 });
  assert.equal(nowVerdict.allowed, false);

  // Measured a day later, the same row is outside it.
  const laterVerdict = await checkCeiling(db, player.id, {
    ceilings,
    windowMs: 60_000,
    nowMs: Date.now() + 24 * 60 * 60 * 1000,
  });
  assert.equal(laterVerdict.allowed, true, "the window must actually roll");
  await db.close();
});

test("a ceiling of zero blocks that kind outright", async () => {
  const { db, player } = await world();
  const verdict = await checkCeiling(db, player.id, {
    ceilings: tiny({ tts_characters: 0 }),
  });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.allowed === false && verdict.kind, "tts_characters");
  assert.equal(verdict.allowed === false && verdict.spent, 0);
  await db.close();
});

test("the verdict names which kind ran out, with the numbers", async () => {
  const { db, player } = await world();
  await recordSpend(db, { playerId: player.id, kind: "model_output_tokens", units: 80 });
  const verdict = await checkCeiling(db, player.id, {
    ceilings: tiny({ model_output_tokens: 80 }),
  });
  assert.equal(verdict.allowed, false);
  if (verdict.allowed === false) {
    assert.equal(verdict.kind, "model_output_tokens");
    assert.equal(verdict.spent, 80);
    assert.equal(verdict.ceiling, 80);
    assert.equal(
      verdict.spent >= verdict.ceiling,
      true,
      "at the ceiling is reached, not merely over it",
    );
  }
  await db.close();
});

test("one player's consumption does not reach another player's ceiling", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  await recordSpend(db, { playerId: player.id, kind: "model_input_tokens", units: 10_000 });
  const ceilings = tiny({ model_input_tokens: 100 });

  assert.equal((await checkCeiling(db, player.id, { ceilings })).allowed, false);
  assert.equal(
    (await checkCeiling(db, other.id, { ceilings })).allowed,
    true,
    "a ceiling is per player; a shared one would let anyone lock everyone out",
  );
  await db.close();
});

// ── The turn loop ────────────────────────────────────────────────────────

test("a turn meters what the provider reported", async () => {
  const { db, player, profile, agent } = await world();
  const model = new MeteredAdapter({ inputTokens: 1200, outputTokens: 340 });
  const session = await startSession(db, {
    playerId: player.id,
    gameTitle: profile.title,
    agentId: agent.id,
  }, model);

  await takeTurn(db, { sessionId: session.session.id, text: "where next?" }, model);

  const summary = await spendSummary(db, player.id);
  assert.equal(summary.units.model_input_tokens, 1200);
  assert.equal(summary.units.model_output_tokens, 340);
  await db.close();
});

test("THE POINT: a turn refused by the ceiling leaves no trace in the transcript", async () => {
  const { db, player, profile, agent } = await world();
  const model = new MeteredAdapter({ inputTokens: 1000, outputTokens: 100 });
  const session = await startSession(db, {
    playerId: player.id,
    gameTitle: profile.title,
    agentId: agent.id,
  }, model);
  const id = session.session.id;

  // One turn goes through and is metered.
  await takeTurn(db, { sessionId: id, text: "first" }, model);
  assert.equal((await recentTurns(db, id)).length, 2, "player line plus reply");
  assert.equal(model.calls, 1);

  // The ceiling is now reached. The next turn must be refused.
  const ceilings = tiny({ model_input_tokens: 1000 });
  await assert.rejects(
    () => takeTurn(db, { sessionId: id, text: "second", limits: { ceilings } }, model),
    CeilingReachedError,
  );

  // The refusal left nothing behind: no orphan player line, and the model
  // was never called. An unanswered line would sit there forever and every
  // later turn would pay input tokens to carry it in the history.
  const turns = await recentTurns(db, id);
  assert.equal(turns.length, 2, "the refused turn must not be on the record");
  assert.ok(
    !turns.some((t) => t.text === "second"),
    "the player's refused words must not be stored as a turn",
  );
  assert.equal(model.calls, 1, "the model must not be called past the ceiling");
  await db.close();
});

test("the refusal carries the numbers the caller needs to explain it", async () => {
  const { db, player, profile, agent } = await world();
  const model = new MeteredAdapter({ inputTokens: 700, outputTokens: 70 });
  const session = await startSession(db, {
    playerId: player.id,
    gameTitle: profile.title,
    agentId: agent.id,
  }, model);
  await takeTurn(db, { sessionId: session.session.id, text: "one" }, model);

  await assert.rejects(
    () =>
      takeTurn(
        db,
        {
          sessionId: session.session.id,
          text: "two",
          limits: { ceilings: tiny({ model_input_tokens: 700 }) },
        },
        model,
      ),
    (err: unknown) => {
      assert.ok(err instanceof CeilingReachedError);
      assert.equal(err.verdict.kind, "model_input_tokens");
      assert.equal(err.verdict.spent, 700);
      assert.equal(err.verdict.ceiling, 700);
      assert.match(err.message, /700 of 700 model_input_tokens/);
      return true;
    },
  );
  await db.close();
});

test("a turn under the ceiling is not refused, and the stub meters nothing", async () => {
  const { db, player, profile, agent } = await world();
  const session = await startSession(db, {
    playerId: player.id,
    gameTitle: profile.title,
    agentId: agent.id,
  }, new StubModelAdapter());

  // The ordinary stub reports zero usage, which is the truth for a call it
  // never made. So it must record no ledger rows at all.
  const result = await takeTurn(
    db,
    { sessionId: session.session.id, text: "hello" },
    new StubModelAdapter(),
  );
  assert.equal(result.refused, false);
  const rows = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM spend_entry");
  assert.equal(rows[0]?.n, 0, "a stub that spent nothing must not record a spend");
  await db.close();
});

test("an abandoned stream records no invented usage", async () => {
  const { db, player, profile, agent } = await world();
  const session = await startSession(db, {
    playerId: player.id,
    gameTitle: profile.title,
    agentId: agent.id,
  }, new StubModelAdapter());

  // Walk away after the first delta, before the provider reports usage.
  const stream = takeTurnStream(
    db,
    { sessionId: session.session.id, text: "cut me off" },
    new MeteredAdapter({ inputTokens: 900, outputTokens: 90 }),
  );
  for await (const event of stream) {
    if (event.type === "delta") break;
  }

  // THE HONEST GAP, asserted so it cannot change silently: no usage report
  // arrived, so nothing is metered. Estimating it would put an invented
  // number in a ledger whose only job is to be true. The per-minute rate
  // limiter is what bounds this, not the ceiling.
  const summary = await spendSummary(db, player.id);
  assert.equal(summary.units.model_input_tokens, 0);
  assert.equal(summary.units.model_output_tokens, 0);

  // The transcript is still correct, which Phase 3 guarantees.
  const turns = await recentTurns(db, session.session.id);
  assert.equal(turns.length, 2, "the player's line and the partial reply are both kept");
  await db.close();
});
