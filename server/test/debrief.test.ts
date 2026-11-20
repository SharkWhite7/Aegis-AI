import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enforceDebrief,
  runDebrief,
  MAX_MEMORIES_PER_SESSION,
} from "../src/memory/debrief.ts";
import { endSession, startSession, takeTurn } from "../src/chat/service.ts";
import { liveMemories, remember } from "../src/memory/repo.ts";
import { findAgentBySlug } from "../src/marketplace/agents.ts";
import { createPlayer } from "../src/players/repo.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { ModelRefusedError } from "../src/model/adapter.ts";
import type {
  ModelAdapter,
  SpeakRequest,
  SpeakResult,
  StructuredRequest,
  StructuredResult,
} from "../src/model/adapter.ts";
import { ValidationError } from "../src/domain/validate.ts";
import { freshDb, seedWorld } from "./helpers.ts";

const NONE = {
  allowedSupersessionIds: new Set<string>(),
  existingTexts: new Set<string>(),
};

/**
 * A memory candidate as the model would return it: deliberately typed
 * loosely, because several tests feed `enforceDebrief` values a correct
 * model never would, which is the whole point of enforcing.
 */
const mem = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: "preference",
  text: "drives at night",
  salience: 0.6,
  supersedesId: null,
  ...over,
});

// ── enforceDebrief, the pure part ────────────────────────────────────────

test("a well-formed debrief passes through", () => {
  const out = enforceDebrief(
    { summary: "drove the causeway", memories: [mem()] },
    NONE,
  );
  assert.equal(out.summary, "drove the causeway");
  assert.equal(out.memories.length, 1);
  assert.equal(out.memories[0]?.kind, "preference");
  assert.equal(out.droppedCandidates, 0);
});

test("a null summary and an empty list are valid answers", () => {
  const out = enforceDebrief({ summary: null, memories: [] }, NONE);
  assert.equal(out.summary, null);
  assert.deepEqual(out.memories, []);
});

test("memories must be an array", () => {
  assert.throws(
    () => enforceDebrief({ summary: null, memories: "nope" }, NONE),
    ValidationError,
  );
});

test("an unknown memory kind is rejected", () => {
  assert.throws(
    () => enforceDebrief({ summary: null, memories: [mem({ kind: "vibes" })] }, NONE),
    /memories\[0\].kind: must be one of/,
  );
});

test("salience outside 0..1 is rejected", () => {
  assert.throws(
    () => enforceDebrief({ summary: null, memories: [mem({ salience: 1.5 })] }, NONE),
    /salience: must be between 0 and 1/,
  );
});

test("one session cannot flood memory, however many it returns", () => {
  const many = Array.from({ length: 40 }, (_, i) => mem({ text: `thing ${i}` }));
  const out = enforceDebrief({ summary: null, memories: many }, NONE);
  assert.equal(out.memories.length, MAX_MEMORIES_PER_SESSION);
  assert.equal(out.droppedCandidates, 40 - MAX_MEMORIES_PER_SESSION);
});

test("a memory already on file is not restated", () => {
  const out = enforceDebrief(
    { summary: null, memories: [mem({ text: "Drives  at NIGHT!" })] },
    { allowedSupersessionIds: new Set(), existingTexts: new Set(["drives at night"]) },
  );
  assert.equal(out.memories.length, 0, "case and spacing are not new information");
  assert.equal(out.droppedCandidates, 1);
});

test("duplicates inside one batch collapse", () => {
  const out = enforceDebrief(
    { summary: null, memories: [mem(), mem(), mem({ text: "drives at night." })] },
    NONE,
  );
  assert.equal(out.memories.length, 1);
  assert.equal(out.droppedCandidates, 2);
});

// ── The guarantee: supersession ownership ────────────────────────────────

test("a supersession of a known memory is accepted", () => {
  const out = enforceDebrief(
    { summary: null, memories: [mem({ supersedesId: "m-1" })] },
    { allowedSupersessionIds: new Set(["m-1"]), existingTexts: new Set() },
  );
  assert.equal(out.memories[0]?.supersedesId, "m-1");
  assert.equal(out.rejectedSupersessions, 0);
});

test("a supersession of an unknown id is refused, but the memory is kept", () => {
  // The memory is new information either way. What must not happen is one
  // transcript retiring a memory it was never shown.
  const out = enforceDebrief(
    { summary: null, memories: [mem({ supersedesId: "someone-elses-memory" })] },
    { allowedSupersessionIds: new Set(["m-1"]), existingTexts: new Set() },
  );
  assert.equal(out.memories.length, 1);
  assert.equal(out.memories[0]?.supersedesId, null);
  assert.equal(out.rejectedSupersessions, 1);
});

test("a refusal is surfaced, not papered over", async () => {
  await assert.rejects(
    () => runDebrief([], [], new StubModelAdapter({ refuse: true })),
    ModelRefusedError,
  );
});

// ── End to end, through endSession ───────────────────────────────────────

/** Counts structured calls, so "spent nothing" can be asserted. */
class CountingAdapter implements ModelAdapter {
  readonly id = "counting";
  structuredCalls = 0;
  readonly #inner: StubModelAdapter;
  readonly #debriefPrompts: string[] = [];
  constructor(opts: { structuredPayload?: unknown } = {}) {
    this.#inner = new StubModelAdapter(opts);
  }
  get debriefPrompts(): readonly string[] {
    return this.#debriefPrompts;
  }
  async speak(req: SpeakRequest): Promise<SpeakResult> {
    return this.#inner.speak(req);
  }
  async structured(req: StructuredRequest): Promise<StructuredResult> {
    this.structuredCalls += 1;
    this.#debriefPrompts.push(req.prompt);
    return this.#inner.structured(req);
  }
}

const liveSession = async (
  db: ReturnType<typeof freshDb>,
  model: ModelAdapter,
  playerId: string,
) => {
  const agent = await findAgentBySlug(db, "hustler");
  const { session } = await startSession(
    db,
    { playerId, gameTitle: "Cyberpunk 2077", agentId: agent!.id },
    model,
  );
  return session;
};

test("ending a session writes a summary and the memories to carry forward", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new StubModelAdapter();
  const session = await liveSession(db, model, player.id);

  await takeTurn(db, { sessionId: session.id, text: "heading to the docks" }, model);

  const before = await liveMemories(db, player.id);
  assert.equal(before.length, 0, "nothing writes memory before the debrief");

  const result = await endSession(db, session.id, { model });
  assert.equal(result.debrief?.summarySource, "generated");
  assert.equal(result.debrief?.memoriesStored, 1);
  assert.match(result.session.summary ?? "", /^stub summary /);

  const after = await liveMemories(db, player.id);
  assert.equal(after.length, 1);
  assert.equal(after[0]?.sessionId, session.id, "memory records where it came from");
  await db.close();
});

test("an explicit summary wins over the generated one", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new StubModelAdapter();
  const session = await liveSession(db, model, player.id);
  await takeTurn(db, { sessionId: session.id, text: "hello" }, model);

  const result = await endSession(db, session.id, { model, summary: "mine" });
  assert.equal(result.session.summary, "mine");
  assert.equal(result.debrief?.summarySource, "provided");
  await db.close();
});

test("THE POINT: a memory from one session reaches the next session's prompt", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);

  // Session one: the debrief records something specific.
  const writer = new CountingAdapter({
    structuredPayload: {
      summary: "sold the coupe on the causeway",
      memories: [
        { kind: "preference", text: "will not drive anything automatic", salience: 0.9 },
      ],
    },
  });
  const first = await liveSession(db, writer, player.id);
  await takeTurn(db, { sessionId: first.id, text: "what should i buy" }, writer);
  await endSession(db, first.id, { model: writer });

  // Session two: a fresh adapter, so nothing can leak through the model.
  const reader = new RecordingAdapter();
  const second = await liveSession(db, reader, player.id);
  await takeTurn(db, { sessionId: second.id, text: "and now" }, reader);

  const volatile = reader.calls.at(-1)!.systemVolatile;
  assert.match(volatile, /will not drive anything automatic/);
  assert.match(volatile, /Last session: sold the coupe on the causeway/);
  await db.close();
});

class RecordingAdapter implements ModelAdapter {
  readonly id = "recording";
  readonly calls: SpeakRequest[] = [];
  readonly #inner = new StubModelAdapter();
  async speak(req: SpeakRequest): Promise<SpeakResult> {
    this.calls.push(req);
    return this.#inner.speak(req);
  }
  async structured(req: StructuredRequest): Promise<StructuredResult> {
    return this.#inner.structured(req);
  }
}

test("a contradicted memory is retired and stops reaching the model", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const setup = new StubModelAdapter();

  const stale = await remember(db, {
    playerId: player.id,
    kind: "goal",
    text: "wants to buy the coupe",
    salience: 0.9,
  });

  const correcting = new CountingAdapter({
    structuredPayload: {
      summary: "sold it",
      memories: [
        {
          kind: "goal",
          text: "sold the coupe, saving for a garage",
          salience: 0.9,
          supersedesId: stale.id,
        },
      ],
    },
  });

  const session = await liveSession(db, correcting, player.id);
  await takeTurn(db, { sessionId: session.id, text: "done with it" }, correcting);
  const result = await endSession(db, session.id, { model: correcting });

  assert.equal(result.debrief?.supersededCount, 1);
  const live = await liveMemories(db, player.id);
  assert.deepEqual(live.map((m) => m.text), ["sold the coupe, saving for a garage"]);
  void setup;
  await db.close();
});

test("SECURITY: one player's session cannot retire another player's memory", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const victim = await createPlayer(db, { handle: "victim" });

  const theirs = await remember(db, {
    playerId: victim.id,
    kind: "goal",
    text: "their private goal",
    salience: 0.9,
  });

  // A transcript that somehow produces a supersession aimed at a memory
  // belonging to somebody else.
  const hostile = new CountingAdapter({
    structuredPayload: {
      summary: "nothing much",
      memories: [
        { kind: "event", text: "tried something", salience: 0.5, supersedesId: theirs.id },
      ],
    },
  });

  const session = await liveSession(db, hostile, player.id);
  await takeTurn(db, { sessionId: session.id, text: "hi" }, hostile);
  const result = await endSession(db, session.id, { model: hostile });

  assert.equal(result.debrief?.rejectedSupersessions, 1);
  assert.equal(result.debrief?.supersededCount, 0);
  assert.equal(result.debrief?.memoriesStored, 1, "the memory itself is still stored");

  const victimsMemories = await liveMemories(db, victim.id);
  assert.equal(victimsMemories.length, 1, "the other player's memory survives");
  assert.equal(victimsMemories[0]?.supersededBy, null);
  await db.close();
});

test("the debrief is not offered another player's memories as targets", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const other = await createPlayer(db, { handle: "zoe" });
  await remember(db, {
    playerId: other.id, kind: "fact", text: "a secret about zoe", salience: 0.9,
  });
  await remember(db, {
    playerId: player.id, kind: "fact", text: "a fact about ana", salience: 0.9,
  });

  const model = new CountingAdapter();
  const session = await liveSession(db, model, player.id);
  await takeTurn(db, { sessionId: session.id, text: "hi" }, model);
  await endSession(db, session.id, { model });

  const debriefPrompt = model.debriefPrompts.at(-1) ?? "";
  assert.match(debriefPrompt, /a fact about ana/);
  assert.ok(
    !debriefPrompt.includes("a secret about zoe"),
    "another player's memories must never enter this prompt",
  );
  await db.close();
});

// ── Not spending when there is nothing to find ───────────────────────────

test("a session with no turns is closed without a model call", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new CountingAdapter();
  const session = await liveSession(db, model, player.id);
  const callsAfterStart = model.structuredCalls; // the profile generation

  const result = await endSession(db, session.id, { model });
  assert.equal(result.debrief, null);
  assert.equal(model.structuredCalls, callsAfterStart, "nothing was spent");
  assert.notEqual(result.session.endedAt, null, "but the session is closed");
  await db.close();
});

test("closing twice does not debrief twice", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new CountingAdapter();
  const session = await liveSession(db, model, player.id);
  await takeTurn(db, { sessionId: session.id, text: "something" }, model);

  const first = await endSession(db, session.id, { model });
  assert.equal(first.debrief?.memoriesStored, 1);
  const spent = model.structuredCalls;

  const second = await endSession(db, session.id, { model });
  assert.equal(second.debrief, null, "a retry must not re-debrief");
  assert.equal(model.structuredCalls, spent, "and must not spend again");
  assert.equal((await liveMemories(db, player.id)).length, 1, "no duplicates");
  await db.close();
});

test("a caller can close a session without spending, and no memory is written", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new CountingAdapter();
  const session = await liveSession(db, model, player.id);
  await takeTurn(db, { sessionId: session.id, text: "something" }, model);
  const spent = model.structuredCalls;

  const result = await endSession(db, session.id, { summary: "closed by hand" });
  assert.equal(result.debrief, null);
  assert.equal(result.session.summary, "closed by hand");
  assert.equal(model.structuredCalls, spent);
  assert.equal((await liveMemories(db, player.id)).length, 0);
  await db.close();
});
