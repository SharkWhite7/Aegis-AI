import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/http/app.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { authHeader, freshDb, seedWorld } from "./helpers.ts";
import { findAgentBySlug } from "../src/marketplace/agents.ts";

const app = async () => {
  const db = freshDb();
  const world = await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter() });
  return { db, instance, ...world };
};



test("health reports the stage honestly", async () => {
  const { instance, db } = await app();
  const r = await instance.inject({ method: "GET", url: "/health" });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { status: "ok", stage: "pre-alpha" });
  await instance.close();
  await db.close();
});

test("waitlist accepts a signup and says nothing about who is on the list", async () => {
  const { instance, db } = await app();
  const first = await instance.inject({
    method: "POST",
    url: "/waitlist",
    payload: { email: "ana@example.com", gameTitle: "GTA VI", source: "hero" },
  });
  assert.equal(first.statusCode, 202);
  assert.deepEqual(first.json(), { ok: true });

  const again = await instance.inject({
    method: "POST",
    url: "/waitlist",
    payload: { email: "ANA@example.com", source: "nav" },
  });
  // Same answer: the form must not become a way to test whether an address
  // has already signed up.
  assert.equal(again.statusCode, 202);
  assert.deepEqual(again.json(), { ok: true });

  const count = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM waitlist_entry");
  assert.equal(count?.n, 1);
  await instance.close();
  await db.close();
});

test("waitlist rejects a bad address with 400 and names the field", async () => {
  const { instance, db } = await app();
  const r = await instance.inject({
    method: "POST", url: "/waitlist", payload: { email: "nope" },
  });
  assert.equal(r.statusCode, 400);
  assert.equal(r.json().error, "invalid_request");
  assert.equal(r.json().field, "email");
  await instance.close();
  await db.close();
});

test("there is no waitlist count endpoint", async () => {
  const { instance, db } = await app();
  for (const url of ["/waitlist/count", "/waitlist"]) {
    const r = await instance.inject({ method: "GET", url });
    assert.equal(r.statusCode, 404, `${url} must not expose a count`);
  }
  await instance.close();
  await db.close();
});

test("the marketplace lists the six built-ins, most stars first", async () => {
  const { instance, db } = await app();
  const r = await instance.inject({ method: "GET", url: "/agents" });
  assert.equal(r.statusCode, 200);
  const { agents } = r.json() as { agents: Array<{ name: string; starCount: number }> };
  assert.equal(agents.length, 6);
  for (const a of agents) assert.equal(a.starCount, 0);
  assert.ok(agents.some((a) => a.name === "The Hustler"));
  await instance.close();
  await db.close();
});

test("publishing and starring an agent moves it to the top", async () => {
  const { instance, db, player, other } = await app();

  const created = await instance.inject({
    method: "POST",
    url: "/agents",
    headers: await authHeader(db, player.id),
    payload: {
      name: "The Navigator",
      role: "Knows the back roads.",
      personaBrief: "A long enough persona brief to satisfy the minimum rule.",
    },
  });
  assert.equal(created.statusCode, 201);
  const agentId = created.json().id as string;
  assert.equal(created.json().visibility, "draft");

  // A draft is not in the listing.
  let listed = (await instance.inject({ method: "GET", url: "/agents" })).json();
  assert.equal(listed.agents.length, 6);

  assert.equal(
    (await instance.inject({
      method: "POST", url: `/agents/${agentId}/publish`, headers: await authHeader(db, player.id),
    })).statusCode,
    200,
  );

  const starred = await instance.inject({
    method: "POST", url: `/agents/${agentId}/star`, headers: await authHeader(db, other.id),
  });
  assert.equal(starred.statusCode, 200);
  assert.equal(starred.json().starCount, 1);

  listed = (await instance.inject({ method: "GET", url: "/agents" })).json();
  assert.equal(listed.agents.length, 7);
  assert.equal(listed.agents[0].name, "The Navigator", "most stars must lead");
  await instance.close();
  await db.close();
});

test("an author starring their own agent is a 403", async () => {
  const { instance, db, player } = await app();
  const created = await instance.inject({
    method: "POST", url: "/agents", headers: await authHeader(db, player.id),
    payload: {
      name: "The Navigator", role: "Knows the back roads.",
      personaBrief: "A long enough persona brief to satisfy the minimum rule.",
    },
  });
  const agentId = created.json().id as string;
  await instance.inject({ method: "POST", url: `/agents/${agentId}/publish`, headers: await authHeader(db, player.id) });
  const r = await instance.inject({
    method: "POST", url: `/agents/${agentId}/star`, headers: await authHeader(db, player.id),
  });
  assert.equal(r.statusCode, 403);
  assert.equal(r.json().error, "forbidden");
  await instance.close();
  await db.close();
});

test("acting routes refuse anyone who is not signed in", async () => {
  const { instance, db } = await app();

  // No credential at all.
  const missing = await instance.inject({ method: "GET", url: "/agents/mine" });
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.json().error, "unauthorized");

  // A token that was never issued, and a player id used as one — which is
  // exactly what the old header accepted.
  for (const value of ["Bearer not-a-real-token-at-all", "Bearer short", "notbearer x"]) {
    const r = await instance.inject({
      method: "GET", url: "/agents/mine", headers: { authorization: value },
    });
    assert.equal(r.statusCode, 401, `${value} must not authenticate`);
  }
  await instance.close();
  await db.close();
});

test("a full chat exchange: session, turn, transcript, end", async () => {
  const { instance, db, player } = await app();
  const agent = await findAgentBySlug(db, "hustler");

  const started = await instance.inject({
    method: "POST", url: "/chat/sessions", headers: await authHeader(db, player.id),
    payload: { gameTitle: "Cyberpunk 2077", agentId: agent!.id },
  });
  assert.equal(started.statusCode, 201);
  const sessionId = started.json().session.id as string;

  const turn = await instance.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/turns`, headers: await authHeader(db, player.id),
    payload: { text: "how long to the docks", liveContext: "just left the freeway" },
  });
  assert.equal(turn.statusCode, 200);
  assert.equal(turn.json().refused, false);
  assert.match(turn.json().copilotTurn.text, /^stub reply /);

  const transcript = await instance.inject({
    method: "GET", url: `/chat/sessions/${sessionId}/turns`,
  });
  assert.deepEqual(
    (transcript.json().turns as Array<{ role: string }>).map((t) => t.role),
    ["player", "copilot"],
  );

  const ended = await instance.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/end`, headers: await authHeader(db, player.id),
    payload: { summary: "talked about the docks" },
  });
  assert.equal(ended.statusCode, 200);
  assert.equal(ended.json().session.summary, "talked about the docks");
  // Ending a session debriefs it, which is the only thing that writes
  // memories. An explicit summary wins over the generated one.
  assert.equal(ended.json().debrief.summarySource, "provided");
  assert.equal(ended.json().debrief.memoriesStored, 1);
  await instance.close();
  await db.close();
});

test("a model refusal is reported as 422, not as a reply", async () => {
  const db = freshDb();
  const world = await seedWorld(db);
  const agent = await findAgentBySlug(db, "fixer");

  const ok = buildApp({ db, model: new StubModelAdapter() });
  const started = await ok.inject({
    method: "POST", url: "/chat/sessions", headers: await authHeader(db, world.player.id),
    payload: { gameTitle: "Cyberpunk 2077", agentId: agent!.id },
  });
  const sessionId = started.json().session.id as string;
  await ok.close();

  const refusing = buildApp({ db, model: new StubModelAdapter({ refuse: true }) });
  const r = await refusing.inject({
    method: "POST", url: `/chat/sessions/${sessionId}/turns`, headers: await authHeader(db, world.player.id),
    payload: { text: "something declined" },
  });
  assert.equal(r.statusCode, 422);
  assert.equal(r.json().refused, true);
  assert.equal(r.json().copilotTurn, null);
  await refusing.close();
  await db.close();
});

test("profile lookup never generates; only the POST spends", async () => {
  const { instance, db, player } = await app();
  const miss = await instance.inject({ method: "GET", url: "/profiles/Hollow%20Knight" });
  assert.equal(miss.statusCode, 404);
  assert.match(miss.json().message, /no profile on file/);

  const generated = await instance.inject({
    method: "POST", url: "/profiles", headers: await authHeader(db, player.id),
    payload: { title: "Hollow Knight" },
  });
  assert.equal(generated.statusCode, 200);
  assert.equal(generated.json().slug, "hollowknight");

  const hit = await instance.inject({ method: "GET", url: "/profiles/hollow-knight" });
  assert.equal(hit.statusCode, 200, "the site's normalisation must match ours");
  await instance.close();
  await db.close();
});

test("model-spending routes are rate limited per player", async () => {
  const db = freshDb();
  const world = await seedWorld(db);
  const instance = buildApp({
    db, model: new StubModelAdapter(), modelCallsPerWindow: 2, windowMs: 60_000,
  });
  const headers = await authHeader(db, world.player.id);

  const codes: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const r = await instance.inject({
      method: "POST", url: "/profiles", headers, payload: { title: `Game Number ${i}` },
    });
    codes.push(r.statusCode);
  }
  assert.deepEqual(codes, [200, 200, 429, 429]);
  await instance.close();
  await db.close();
});

test("waitlist signups are rate limited by address", async () => {
  const db = freshDb();
  await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter(), signupsPerWindow: 2 });
  const codes: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const r = await instance.inject({
      method: "POST", url: "/waitlist", payload: { email: `a${i}@example.com` },
    });
    codes.push(r.statusCode);
  }
  assert.deepEqual(codes, [202, 202, 429]);
  await instance.close();
  await db.close();
});

test("a draft is readable only by its author, and a stranger gets 404", async () => {
  const { instance, db, player, other } = await app();

  const created = await instance.inject({
    method: "POST",
    url: "/agents",
    headers: await authHeader(db, player.id),
    payload: {
      name: "Secret Draft",
      role: "unreleased",
      personaBrief: "PRIVATE: an unpublished prompt that has not been shared.",
    },
  });
  assert.equal(created.statusCode, 201);
  const slug = created.json().slug as string;
  assert.equal(created.json().visibility, "draft");

  // THE POINT: before this rule existed, the slug alone handed a stranger
  // the full personaBrief of an unpublished agent, with a 200.
  const stranger = await instance.inject({ method: "GET", url: `/agents/${slug}` });
  assert.equal(stranger.statusCode, 404, "an unauthenticated reader must not see a draft");
  assert.ok(
    !JSON.stringify(stranger.json()).includes("PRIVATE"),
    "the persona brief must not leak in the error body either",
  );

  // Another signed-in player is still a stranger to it.
  const someoneElse = await instance.inject({
    method: "GET",
    url: `/agents/${slug}`,
    headers: await authHeader(db, other.id),
  });
  assert.equal(someoneElse.statusCode, 404);

  // 404 and not 403: a 403 would confirm the slug exists.
  const author = await instance.inject({
    method: "GET",
    url: `/agents/${slug}`,
    headers: await authHeader(db, player.id),
  });
  assert.equal(author.statusCode, 200, "the author must still see their own draft");
  assert.equal(author.json().slug, slug);

  // Once published, it is public again.
  await instance.inject({
    method: "POST",
    url: `/agents/${created.json().id}/publish`,
    headers: await authHeader(db, player.id),
  });
  const published = await instance.inject({ method: "GET", url: `/agents/${slug}` });
  assert.equal(published.statusCode, 200);

  await instance.close();
  await db.close();
});
