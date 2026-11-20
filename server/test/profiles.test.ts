import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/profiles/normalize.ts";
import { enforce, generateProfile } from "../src/profiles/generator.ts";
import { ensureProfile, UnusableTitleError } from "../src/profiles/repo.ts";
import { StubModelAdapter } from "../src/model/stub.ts";
import { ModelRefusedError } from "../src/model/adapter.ts";
import { freshDb, modelFields, withheldFields } from "./helpers.ts";

test("slugify matches the site's norm(): lowercase, alphanumerics only", () => {
  // Same inputs the site's lib/profiles.ts aliases rely on.
  assert.equal(slugify("GTA VI"), "gtavi");
  assert.equal(slugify("gta 6"), "gta6");
  assert.equal(slugify("Red Dead Redemption II"), "reddeadredemptionii");
  assert.equal(slugify("Cyberpunk 2077"), "cyberpunk2077");
  assert.equal(slugify("  Elden   Ring  "), "eldenring");
});

test("enforce strips model content from a pre-release title", () => {
  // The server guarantee: it does not matter what the model returned.
  const out = enforce("pre_release", modelFields());
  for (const f of Object.values(out)) {
    assert.equal(f.value, null);
    assert.equal(f.provenance, "withheld");
    assert.equal(f.confidence, 0);
  }
});

test("enforce strips everything from an unknown title", () => {
  const out = enforce("unknown", modelFields());
  for (const f of Object.values(out)) assert.equal(f.value, null);
});

test("enforce keeps supportable content for a released title", () => {
  const out = enforce("generated", modelFields());
  assert.equal(out.world.value, "night city. vertical and loud.");
});

test("enforce drops a value that carries no confidence", () => {
  const fields = modelFields();
  fields.economy = { value: "invented currency", provenance: "model", confidence: 0 };
  const out = enforce("generated", fields);
  assert.equal(out.economy.value, null, "a guess wearing a number must be dropped");
  assert.equal(out.world.value, "night city. vertical and loud.");
});

test("a model claiming content for a pre-release title cannot persist it", async () => {
  // The dangerous case, end to end: the model ignores its instructions and
  // returns a full spec sheet for an unreleased game.
  const rogue = new StubModelAdapter({
    structuredPayload: { status: "pre_release", fields: modelFields() },
  });
  const generated = await generateProfile("GTA VI", rogue);
  assert.equal(generated.status, "pre_release");
  for (const f of Object.values(generated.fields)) {
    assert.equal(f.value, null, "no invented field may survive generation");
  }
});

test("generation rejects a structurally broken payload", async () => {
  const broken = new StubModelAdapter({
    structuredPayload: { status: "generated", fields: { world: "just a string" } },
  });
  await assert.rejects(() => generateProfile("Anything", broken), /fields\./);
});

test("a refusal is surfaced, not papered over", async () => {
  const refusing = new StubModelAdapter({ refuse: true });
  await assert.rejects(
    () => generateProfile("Anything", refusing),
    ModelRefusedError,
  );
});

test("ensureProfile generates once and reuses afterwards", async () => {
  const db = freshDb();
  let calls = 0;
  const counting = new StubModelAdapter();
  const wrapped = {
    id: counting.id,
    speakStream: counting.speakStream.bind(counting),
    speak: counting.speak.bind(counting),
    structured: async (r: Parameters<typeof counting.structured>[0]) => {
      calls += 1;
      return counting.structured(r);
    },
  };

  const a = await ensureProfile(db, "Elden Ring", wrapped);
  const b = await ensureProfile(db, "elden   ring", wrapped);
  assert.equal(a.id, b.id, "same title must resolve to one shared profile");
  assert.equal(calls, 1, "the second lookup must not call the model");
  await db.close();
});

test("a title too short to be a game is refused before any model call", async () => {
  const db = freshDb();
  const stub = new StubModelAdapter();
  await assert.rejects(() => ensureProfile(db, "x", stub), UnusableTitleError);
  await db.close();
});

test("stored profiles are re-validated on read", async () => {
  const db = freshDb();
  const stub = new StubModelAdapter();
  const p = await ensureProfile(db, "Some New Game", stub);
  assert.equal(p.status, "unknown");
  // Corrupt the row the way a bad migration or a hand edit would.
  await db.run("UPDATE game_profile SET fields = ? WHERE id = ?", [
    JSON.stringify({ ...withheldFields(), world: { value: "made up", provenance: "withheld", confidence: 0 } }),
    p.id,
  ]);
  const { findById } = await import("../src/profiles/repo.ts");
  await assert.rejects(() => findById(db, p.id), /cannot have provenance "withheld"/);
  await db.close();
});
