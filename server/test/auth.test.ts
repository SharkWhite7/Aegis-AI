import { test } from "node:test";
import assert from "node:assert/strict";
import {
  issueSession,
  authenticate,
  revokeSession,
  revokeAllSessions,
  upsertPlayerByDiscord,
  serviceTokenMatches,
} from "../src/auth/sessions.ts";
import { buildApp } from "../src/http/app.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { createPlayer } from "../src/players/repo.ts";
import { devSignInAllowed, DEV_SIGNIN_OPT_IN } from "../src/auth/dev.ts";
import { freshDb, seedWorld } from "./helpers.ts";

const SERVICE = "a-shared-service-token";

test("a fresh session authenticates the player it was issued for", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const { token } = await issueSession(db, player.id);

  const got = await authenticate(db, token);
  assert.equal(got?.id, player.id);
  await db.close();
});

test("the token is never stored — only its hash", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const { token } = await issueSession(db, player.id);

  const rows = await db.all<{ token_hash: string }>("SELECT * FROM auth_session");
  assert.equal(rows.length, 1);
  const stored = JSON.stringify(rows[0]);
  assert.ok(!stored.includes(token), "a dump of the table must not contain the token");
  // Still long enough to be a hash rather than something truncated.
  assert.equal(rows[0]?.token_hash.length, 64);
  await db.close();
});

test("nonsense, empty and near-miss tokens authenticate nobody", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const { token } = await issueSession(db, player.id);

  for (const bad of [null, undefined, "", "short", player.id, `${token}x`, token.slice(0, -1)]) {
    assert.equal(await authenticate(db, bad), null, `${String(bad)} must not authenticate`);
  }
  await db.close();
});

test("signing out ends that session and no other", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const a = await issueSession(db, player.id);
  const b = await issueSession(db, player.id);

  await revokeSession(db, a.token);
  assert.equal(await authenticate(db, a.token), null, "the signed-out session is dead");
  assert.equal((await authenticate(db, b.token))?.id, player.id, "the other survives");

  // Idempotent: signing out twice is a success, not an error.
  await revokeSession(db, a.token);
  await db.close();
});

test("sign out everywhere ends every live session", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const a = await issueSession(db, player.id);
  const b = await issueSession(db, player.id);

  assert.equal(await revokeAllSessions(db, player.id), 2);
  assert.equal(await authenticate(db, a.token), null);
  assert.equal(await authenticate(db, b.token), null);
  await db.close();
});

test("an expired session stops authenticating", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const { token } = await issueSession(db, player.id);
  await db.run("UPDATE auth_session SET expires_at = ?", ["2020-01-01T00:00:00.000Z"]);
  assert.equal(await authenticate(db, token), null);
  await db.close();
});

test("deleting a player takes their sessions with them", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const { token } = await issueSession(db, player.id);
  await db.run("DELETE FROM player WHERE id = ?", [player.id]);
  assert.equal(await authenticate(db, token), null);
  await db.close();
});

// ── Discord identities ───────────────────────────────────────────────────

test("the same Discord account resolves to the same player", async () => {
  const db = freshDb();
  const first = await upsertPlayerByDiscord(db, {
    discordId: "1234", username: "ana", displayName: "Ana",
  });
  const second = await upsertPlayerByDiscord(db, {
    discordId: "1234", username: "ana", displayName: "Ana",
  });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.player.id, second.player.id);
  await db.close();
});

test("identity follows the Discord id, not the username", async () => {
  // Someone renames themselves; their memory must still be theirs. And
  // someone who takes the old name must NOT inherit it.
  const db = freshDb();
  const original = await upsertPlayerByDiscord(db, { discordId: "1234", username: "ana" });
  const renamed = await upsertPlayerByDiscord(db, { discordId: "1234", username: "ana-2" });
  assert.equal(renamed.player.id, original.player.id, "a rename keeps the player");

  const impostor = await upsertPlayerByDiscord(db, { discordId: "9999", username: "ana" });
  assert.notEqual(impostor.player.id, original.player.id, "the name is not the identity");
  await db.close();
});

test("a clashing or unusable username still yields a sign-in", async () => {
  const db = freshDb();
  await createPlayer(db, { handle: "ana" });
  const clash = await upsertPlayerByDiscord(db, { discordId: "1", username: "ana" });
  assert.notEqual(clash.player.handle, "ana");
  assert.match(clash.player.handle, /^ana-/);

  // Nothing survives the strip, so a fallback is used rather than failing.
  const unusable = await upsertPlayerByDiscord(db, { discordId: "2", username: "???" });
  assert.match(unusable.player.handle, /^player/);
  await db.close();
});

test("a changed display name is picked up on the next sign-in", async () => {
  const db = freshDb();
  await upsertPlayerByDiscord(db, { discordId: "1", username: "ana", displayName: "Ana" });
  const again = await upsertPlayerByDiscord(db, {
    discordId: "1", username: "ana", displayName: "Ana B.",
  });
  assert.equal(again.player.displayName, "Ana B.");
  await db.close();
});

// ── The service token ────────────────────────────────────────────────────

test("the service token is compared exactly, and an absent one matches nothing", () => {
  assert.equal(serviceTokenMatches("abc", "abc"), true);
  assert.equal(serviceTokenMatches("abc", "abd"), false);
  assert.equal(serviceTokenMatches("ab", "abc"), false);
  assert.equal(serviceTokenMatches("", ""), false, "an empty expectation matches nothing");
  assert.equal(serviceTokenMatches("abc", undefined), false);
  assert.equal(serviceTokenMatches(undefined, "abc"), false);
});

// ── Over HTTP ────────────────────────────────────────────────────────────

const appWith = async (serviceToken?: string) => {
  const db = freshDb();
  await seedWorld(db);
  const instance = buildApp({
    db,
    model: new StubModelAdapter(),
    ...(serviceToken === undefined ? {} : { serviceToken }),
  });
  return { db, instance };
};

test("sign in, use the session, sign out, and it stops working", async () => {
  const { db, instance } = await appWith(SERVICE);

  const signedIn = await instance.inject({
    method: "POST",
    url: "/auth/discord",
    headers: { "x-aegis-service": SERVICE },
    payload: { discordId: "1234", username: "ana", displayName: "Ana" },
  });
  assert.equal(signedIn.statusCode, 201);
  const token = signedIn.json().token as string;
  assert.equal(signedIn.json().created, true);
  assert.ok(typeof signedIn.json().expiresAt === "string");

  const authorization = `Bearer ${token}`;
  const me = await instance.inject({ method: "GET", url: "/auth/me", headers: { authorization } });
  assert.equal(me.statusCode, 200);
  // seedWorld already holds the handle "ana", so the derived one is
  // suffixed. That collision handling is the point, not an accident.
  assert.match(me.json().player.handle, /^ana(-|$)/);

  const out = await instance.inject({
    method: "POST", url: "/auth/signout", headers: { authorization },
  });
  assert.equal(out.statusCode, 204);

  const after = await instance.inject({ method: "GET", url: "/auth/me", headers: { authorization } });
  assert.equal(after.statusCode, 401, "the session is over");
  await instance.close();
  await db.close();
});

test("signing in a second time returns 200, not a second player", async () => {
  const { db, instance } = await appWith(SERVICE);
  const payload = { discordId: "1234", username: "ana" };
  const h = { "x-aegis-service": SERVICE };

  const first = await instance.inject({ method: "POST", url: "/auth/discord", headers: h, payload });
  const second = await instance.inject({ method: "POST", url: "/auth/discord", headers: h, payload });
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 200);
  assert.equal(first.json().player.id, second.json().player.id);
  assert.notEqual(first.json().token, second.json().token, "each sign-in is its own session");
  await instance.close();
  await db.close();
});

test("minting a session needs the service token", async () => {
  const { db, instance } = await appWith(SERVICE);
  for (const headers of [{}, { "x-aegis-service": "wrong" }]) {
    const r = await instance.inject({
      method: "POST", url: "/auth/discord", headers,
      payload: { discordId: "1234", username: "ana" },
    });
    assert.equal(r.statusCode, 401);
  }
  await instance.close();
  await db.close();
});

test("with no service token configured the route is shut, not open", async () => {
  // The dangerous default would be to treat "unconfigured" as "no check".
  const { db, instance } = await appWith(undefined);
  const r = await instance.inject({
    method: "POST", url: "/auth/discord",
    headers: { "x-aegis-service": "anything" },
    payload: { discordId: "1234", username: "ana" },
  });
  assert.equal(r.statusCode, 401);
  await instance.close();
  await db.close();
});

test("one player's token cannot act as another player", async () => {
  const { db, instance } = await appWith(SERVICE);
  const h = { "x-aegis-service": SERVICE };
  const ana = await instance.inject({
    method: "POST", url: "/auth/discord", headers: h,
    payload: { discordId: "1", username: "ana" },
  });
  const bia = await instance.inject({
    method: "POST", url: "/auth/discord", headers: h,
    payload: { discordId: "2", username: "bia" },
  });

  const meAsAna = await instance.inject({
    method: "GET", url: "/auth/me",
    headers: { authorization: `Bearer ${ana.json().token}` },
  });
  assert.equal(meAsAna.json().player.id, ana.json().player.id);
  assert.notEqual(ana.json().player.id, bia.json().player.id);
  await instance.close();
  await db.close();
});

// ── The development sign-in, and its gate ────────────────────────────────

test("the dev sign-in gate needs BOTH conditions, and defaults to off", () => {
  const ok = { NODE_ENV: "development", AEGIS_DEV_SIGNIN: DEV_SIGNIN_OPT_IN };
  assert.equal(devSignInAllowed(ok), true);

  // Production closes it whatever the flag says. This is the condition
  // that matters: a flag alone is too easy to set by accident in a deploy.
  assert.equal(devSignInAllowed({ ...ok, NODE_ENV: "production" }), false);

  // And the flag has to be exact — "true", "1" and "yes" do not open it.
  for (const flag of [undefined, "", "true", "1", "yes", "YES-I-KNOW-THIS-IS-NOT-AUTH"]) {
    assert.equal(
      devSignInAllowed({ NODE_ENV: "development", AEGIS_DEV_SIGNIN: flag }),
      false,
      `${String(flag)} must not open the dev sign-in`,
    );
  }
  assert.equal(devSignInAllowed({}), false, "an empty environment is closed");
});

test("the dev route does not exist unless it is switched on", async () => {
  const db = freshDb();
  await seedWorld(db);
  const instance = buildApp({ db, model: new StubModelAdapter() });
  const r = await instance.inject({
    method: "POST", url: "/auth/dev", payload: { handle: "ana" },
  });
  assert.equal(r.statusCode, 404, "it must not merely refuse — it must not be there");
  await instance.close();
  await db.close();
});

test("switched on, the dev route signs in and reuses the same player", async () => {
  const db = freshDb();
  const instance = buildApp({ db, model: new StubModelAdapter(), devSignIn: true });

  const first = await instance.inject({
    method: "POST", url: "/auth/dev", payload: { handle: "tester" },
  });
  assert.equal(first.statusCode, 200);
  const second = await instance.inject({
    method: "POST", url: "/auth/dev", payload: { handle: "tester" },
  });
  assert.equal(first.json().player.id, second.json().player.id);
  assert.notEqual(first.json().token, second.json().token);

  const me = await instance.inject({
    method: "GET", url: "/auth/me",
    headers: { authorization: `Bearer ${first.json().token}` },
  });
  assert.equal(me.json().player.handle, "tester");
  await instance.close();
  await db.close();
});
