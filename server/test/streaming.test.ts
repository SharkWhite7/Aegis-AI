import { test } from "node:test";
import assert from "node:assert/strict";
import { takeTurnStream, startSession, endSession } from "../src/chat/service.ts";
import { recentTurns } from "../src/chat/service.ts";
import { findAgentBySlug, NotFoundError } from "../src/marketplace/agents.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { drain } from "../src/model/adapter.ts";
import { buildApp } from "../src/http/app.ts";
import { authHeader, freshDb, seedWorld } from "./helpers.ts";
import type { Db } from "../src/db/db.ts";
import type { ModelAdapter } from "../src/model/adapter.ts";

const open = async (db: Db, model: ModelAdapter, playerId: string) => {
  const agent = await findAgentBySlug(db, "hustler");
  const { session } = await startSession(
    db,
    { playerId, gameTitle: "Cyberpunk 2077", agentId: agent!.id },
    model,
  );
  return session;
};

// ── The model seam ───────────────────────────────────────────────────────

test("a reply arrives in pieces, and the pieces are the reply", async () => {
  const model = new StubModelAdapter();
  const req = { systemStable: "s", systemVolatile: "v", messages: [] };

  const deltas: string[] = [];
  let done = false;
  for await (const event of model.speakStream(req)) {
    if (event.type === "delta") deltas.push(event.text);
    else done = true;
  }
  assert.ok(deltas.length > 1, "a single chunk would not test anything");
  assert.equal(done, true, "the stream must end with a done event");

  const whole = await model.speak(req);
  assert.equal(deltas.join(""), whole.text, "the pieces are exactly the reply");
});

test("drain turns a stream into the whole-reply shape", async () => {
  const model = new StubModelAdapter();
  const req = { systemStable: "s", systemVolatile: "v", messages: [] };
  const drained = await drain(model.speakStream(req));
  assert.match(drained.text, /^stub reply /);
  assert.equal(drained.refused, false);
});

// ── The turn ─────────────────────────────────────────────────────────────

test("a streamed turn records the same transcript as a whole one", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new StubModelAdapter();
  const session = await open(db, model, player.id);

  const deltas: string[] = [];
  let reply: string | null = null;
  for await (const event of takeTurnStream(
    db, { sessionId: session.id, text: "how long" }, model,
  )) {
    if (event.type === "delta") deltas.push(event.text);
    if (event.type === "done") reply = event.copilotTurn?.text ?? null;
  }

  assert.equal(deltas.join(""), reply, "what was streamed is what was stored");
  const turns = await recentTurns(db, session.id);
  assert.deepEqual(turns.map((t) => t.role), ["player", "copilot"]);
  await db.close();
});

test("THE POINT: abandoning a stream still leaves a correct transcript", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  // Delays between chunks so the break lands mid-reply rather than after.
  const model = new StubModelAdapter({ chunkDelayMs: 5 });
  const session = await open(db, model, player.id);

  let received = "";
  for await (const event of takeTurnStream(
    db, { sessionId: session.id, text: "two ways into the keep" }, model,
  )) {
    if (event.type === "delta") {
      received += event.text;
      break; // the player closes the tab after the first piece
    }
  }

  // Leaving the loop returns the generator, which runs its finally.
  const turns = await recentTurns(db, session.id);
  assert.deepEqual(
    turns.map((t) => t.role),
    ["player", "copilot"],
    "the player's words and what was actually said are both on the record",
  );
  assert.equal(turns[0]?.text, "two ways into the keep");
  assert.equal(
    turns[1]?.text,
    received.trim(),
    "the stored reply is what was said, not padded out and not invented",
  );
  assert.ok(
    turns[1]!.text.length < "stub reply 00000000".length,
    "and it is genuinely shorter than the full reply",
  );
  await db.close();
});

test("a refusal mid-stream stores no reply at all", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const session = await open(db, new StubModelAdapter(), player.id);

  const refusing = new StubModelAdapter({ refuse: true });
  let refused = false;
  for await (const event of takeTurnStream(
    db, { sessionId: session.id, text: "something declined" }, refusing,
  )) {
    if (event.type === "done") refused = event.refused;
  }

  assert.equal(refused, true);
  const turns = await recentTurns(db, session.id);
  assert.deepEqual(turns.map((t) => t.role), ["player"], "no words are put in its mouth");
  await db.close();
});

test("a closed session refuses to stream, before anything is appended", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const model = new StubModelAdapter();
  const session = await open(db, model, player.id);
  await endSession(db, session.id, { summary: "done" });

  const stream = takeTurnStream(db, { sessionId: session.id, text: "hi" }, model);
  await assert.rejects(() => stream.next(), /session has ended/);
  assert.equal((await recentTurns(db, session.id)).length, 0);
  await db.close();
});

// ── Over HTTP ────────────────────────────────────────────────────────────

const parseNdjson = (body: string): Array<Record<string, unknown>> =>
  body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

test("the stream route emits ndjson: player, deltas, then done", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter() });
  const headers = await authHeader(db, player.id);
  const agent = await findAgentBySlug(db, "hustler");

  const started = await instance.inject({
    method: "POST", url: "/chat/sessions", headers,
    payload: { gameTitle: "Cyberpunk 2077", agentId: agent!.id },
  });
  const sessionId = started.json().session.id as string;

  const r = await instance.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/turns/stream`,
    headers, payload: { text: "how long to the docks" },
  });

  assert.equal(r.statusCode, 200);
  assert.match(r.headers["content-type"] as string, /application\/x-ndjson/);

  const events = parseNdjson(r.body);
  assert.equal(events[0]?.["type"], "player");
  assert.equal(events.at(-1)?.["type"], "done");

  const deltas = events.filter((e) => e["type"] === "delta");
  assert.ok(deltas.length > 1, "the reply must arrive in pieces");

  const streamed = deltas.map((d) => d["text"]).join("");
  const done = events.at(-1) as { copilotTurn: { text: string } | null };
  assert.equal(streamed, done.copilotTurn?.text);
  await instance.close();
  await db.close();
});

test("a bad streaming request answers with a status, not a truncated 200", async () => {
  // Once headers are out a failure can only be a broken body, so the
  // route pulls the first event before responding.
  const db = freshDb();
  const { player } = await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter() });
  const headers = await authHeader(db, player.id);

  const missing = await instance.inject({
    method: "POST", url: "/chat/sessions/nope/turns/stream",
    headers, payload: { text: "hello" },
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error, "not_found");

  const started = await instance.inject({
    method: "POST", url: "/chat/sessions", headers,
    payload: {
      gameTitle: "Cyberpunk 2077",
      agentId: (await findAgentBySlug(db, "fixer"))!.id,
    },
  });
  const empty = await instance.inject({
    method: "POST",
    url: `/chat/sessions/${started.json().session.id}/turns/stream`,
    headers, payload: { text: "" },
  });
  assert.equal(empty.statusCode, 400);
  await instance.close();
  await db.close();
});

test("streaming a turn needs a signed-in player", async () => {
  const db = freshDb();
  await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter() });
  const r = await instance.inject({
    method: "POST", url: "/chat/sessions/whatever/turns/stream",
    payload: { text: "hello" },
  });
  assert.equal(r.statusCode, 401);
  await instance.close();
  await db.close();
});

test("streaming is rate limited like every other route that spends", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const instance = buildApp({
    db, model: new StubModelAdapter(), modelCallsPerWindow: 2,
  });
  const headers = await authHeader(db, player.id);
  const agent = await findAgentBySlug(db, "hustler");

  // The session itself spends one.
  const started = await instance.inject({
    method: "POST", url: "/chat/sessions", headers,
    payload: { gameTitle: "Cyberpunk 2077", agentId: agent!.id },
  });
  const sessionId = started.json().session.id as string;

  const first = await instance.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/turns/stream`,
    headers, payload: { text: "one" },
  });
  const second = await instance.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/turns/stream`,
    headers, payload: { text: "two" },
  });
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  await instance.close();
  await db.close();
});
