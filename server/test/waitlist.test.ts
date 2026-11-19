import { test } from "node:test";
import assert from "node:assert/strict";
import { joinWaitlist, countWaitlist } from "../src/waitlist/service.ts";
import { ValidationError } from "../src/domain/validate.ts";
import { freshDb } from "./helpers.ts";

test("a signup is stored, normalised", async () => {
  const db = freshDb();
  const r = await joinWaitlist(db, {
    email: " Ana@Example.COM ",
    gameTitle: "GTA VI",
    source: "hero",
  });
  assert.equal(r.status, "added");
  assert.equal(r.entry.email, "ana@example.com");
  assert.equal(r.entry.gameTitle, "GTA VI");
  assert.equal(await countWaitlist(db), 1);
  await db.close();
});

test("signing up twice is idempotent, not a duplicate or an error", async () => {
  const db = freshDb();
  const first = await joinWaitlist(db, { email: "ana@example.com", source: "hero" });
  const second = await joinWaitlist(db, { email: "ANA@example.com", source: "nav" });
  assert.equal(first.status, "added");
  assert.equal(second.status, "already");
  assert.equal(first.entry.id, second.entry.id);
  assert.equal(await countWaitlist(db), 1, "no second row");
  await db.close();
});

test("the game title is optional", async () => {
  const db = freshDb();
  const r = await joinWaitlist(db, { email: "b@example.com" });
  assert.equal(r.entry.gameTitle, null);
  assert.equal(r.entry.source, "other");
  await db.close();
});

test("a bad address is rejected before storage", async () => {
  const db = freshDb();
  await assert.rejects(() => joinWaitlist(db, { email: "nope" }), ValidationError);
  await assert.rejects(() => joinWaitlist(db, { email: 42 }), ValidationError);
  assert.equal(await countWaitlist(db), 0);
  await db.close();
});

test("an unrecognised source is rejected rather than coerced", async () => {
  const db = freshDb();
  await assert.rejects(
    () => joinWaitlist(db, { email: "c@example.com", source: "injected" }),
    /source: must be one of/,
  );
  await db.close();
});

test("a new signup is never pre-confirmed", async () => {
  const db = freshDb();
  await joinWaitlist(db, { email: "d@example.com" });
  const row = await db.get<{ confirmed_at: string | null }>(
    "SELECT confirmed_at FROM waitlist_entry WHERE email = ?",
    ["d@example.com"],
  );
  assert.equal(row?.confirmed_at, null, "an unconfirmed row is not a subscriber");
  await db.close();
});
