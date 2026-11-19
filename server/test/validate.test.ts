import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  requireEmail,
  requireHandle,
  validateProfileConsistency,
  validateProfileField,
  validateProfileFields,
} from "../src/domain/validate.ts";
import { withheldFields, modelFields } from "./helpers.ts";

test("email is normalised and validated", () => {
  assert.equal(requireEmail("  Ana@Example.COM "), "ana@example.com");
  assert.throws(() => requireEmail("not-an-email"), ValidationError);
  assert.throws(() => requireEmail("a@b"), ValidationError);
  assert.throws(() => requireEmail(""), ValidationError);
});

test("handles are lowercased and bounded", () => {
  assert.equal(requireHandle("Ana_99"), "ana_99");
  assert.throws(() => requireHandle("a"), ValidationError);
  assert.throws(() => requireHandle("has space"), ValidationError);
});

// ── The no-fabrication invariant, both directions ────────────────────────

test("a withheld null field is valid", () => {
  const f = validateProfileField(
    { value: null, provenance: "withheld", confidence: 0 },
    "fields.world",
  );
  assert.equal(f.value, null);
  assert.equal(f.provenance, "withheld");
});

test("a null value cannot claim model provenance", () => {
  assert.throws(
    () =>
      validateProfileField(
        { value: null, provenance: "model", confidence: 0.5 },
        "fields.world",
      ),
    /must have provenance "withheld"/,
  );
});

test("a null value cannot carry confidence", () => {
  assert.throws(
    () =>
      validateProfileField(
        { value: null, provenance: "withheld", confidence: 0.4 },
        "fields.world",
      ),
    /must have confidence 0/,
  );
});

test("a real value cannot be smuggled in as withheld", () => {
  // This is the half that actually stops fabrication: labelling content
  // "withheld" must not let it past as unsourced.
  assert.throws(
    () =>
      validateProfileField(
        { value: "vice beach", provenance: "withheld", confidence: 0 },
        "fields.world",
      ),
    /cannot have provenance "withheld"/,
  );
});

test("a real value must carry confidence above zero", () => {
  assert.throws(
    () =>
      validateProfileField(
        { value: "vice beach", provenance: "model", confidence: 0 },
        "fields.world",
      ),
    /must have confidence above 0/,
  );
});

test("an omitted field is not the same as a withheld one", () => {
  const fields = withheldFields() as Record<string, unknown>;
  delete fields["economy"];
  assert.throws(
    () => validateProfileFields(fields),
    /fields.economy: is required/,
  );
});

test("a pre-release title cannot carry model-generated content", () => {
  // GTA VI is the flagship and it is not out. This is the guard.
  assert.throws(
    () => validateProfileConsistency("pre_release", modelFields()),
    /pre-release title cannot carry model-generated content/,
  );
  // Withheld everywhere is fine.
  validateProfileConsistency("pre_release", withheldFields());
});

test("a pre-release title may carry human-curated content", () => {
  const fields = withheldFields();
  fields.world = {
    value: "leonida. announced, not shipped.",
    provenance: "curated",
    confidence: 1,
  };
  validateProfileConsistency("pre_release", fields);
});

test("an unknown profile must withhold every field", () => {
  assert.throws(
    () => validateProfileConsistency("unknown", modelFields()),
    /must withhold every field/,
  );
});
