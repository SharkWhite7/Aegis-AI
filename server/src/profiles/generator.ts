/**
 * The game profile generator.
 *
 * This turns a bare title into the profile the companion is assembled
 * from. It is also the most dangerous component in the backend, because it
 * is a model writing content that the companion will later treat as ground
 * truth, store, and repeat in every future session. One invented street
 * name does not stay one invented street name.
 *
 * So the no-fabrication rule is enforced here, in code, and does NOT
 * depend on the model following its instructions:
 *
 *   1. The prompt tells the model to withhold rather than guess.
 *   2. Whatever comes back, `enforce()` below overwrites it — a
 *      pre-release or unknown title has every model-written field stripped
 *      to a withheld null before anything is validated or stored.
 *   3. Validation then rejects any field whose value, provenance and
 *      confidence disagree.
 *
 * Step 2 is the one that matters. Steps 1 and 3 are a request and a check;
 * step 2 is a guarantee.
 */

import {
  PROFILE_FIELD_KEYS,
  PROFILE_FIELD_LABELS,
  type ProfileFields,
  type ProfileStatus,
} from "../domain/types.ts";
import {
  ValidationError,
  requireOneOf,
  validateProfileConsistency,
  validateProfileFields,
} from "../domain/validate.ts";
import { ModelRefusedError, type ModelAdapter } from "../model/adapter.ts";

export const GENERATOR_VERSION = "profile-gen-1";

const withheld = () => ({ value: null, provenance: "withheld" as const, confidence: 0 });

const allWithheld = (): ProfileFields => ({
  world: withheld(),
  economy: withheld(),
  traversal: withheld(),
  pressure: withheld(),
  vocabulary: withheld(),
  leadVoice: withheld(),
});

/** JSON Schema handed to the model as an output constraint. */
export const PROFILE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["status", "fields"],
  properties: {
    status: { type: "string", enum: ["generated", "pre_release", "unknown"] },
    fields: {
      type: "object",
      additionalProperties: false,
      required: [...PROFILE_FIELD_KEYS],
      properties: Object.fromEntries(
        PROFILE_FIELD_KEYS.map((k) => [
          k,
          {
            type: "object",
            additionalProperties: false,
            required: ["value", "provenance", "confidence"],
            properties: {
              value: { type: ["string", "null"], maxLength: 240 },
              provenance: { type: "string", enum: ["model", "withheld"] },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
          },
        ]),
      ),
    },
  },
};

const SYSTEM = `You write game profiles for a companion app that runs beside a game.

A profile carries what the companion needs to know about one game. It is
content, not instructions: never write "you are a companion for X". Write
the facts of the world.

The six fields, each one short — a phrase or a clipped sentence, lowercase:

${PROFILE_FIELD_KEYS.map((k) => `- ${k} (${PROFILE_FIELD_LABELS[k]})`).join("\n")}

Rules, in order of importance:

1. Never guess. If you cannot support a field from what you actually know
   about the released game, set its value to null with provenance
   "withheld" and confidence 0. A withheld field is a correct answer. An
   invented one is repeated to the player forever.
2. If the title is announced but not released, set status "pre_release" and
   withhold every field. You do not know its map, its economy or its slang,
   and a spec sheet for an unshipped game is the worst thing you can write.
3. If you do not recognise the title at all, set status "unknown" and
   withhold every field.
4. Otherwise set status "generated" and fill only the fields you can
   support, with confidence reflecting how sure you are.

Nothing is read from the game and nothing is written to it. You are
describing a world from public knowledge of it, not inspecting a process.`;

export type GeneratedProfile = {
  status: ProfileStatus;
  fields: ProfileFields;
  modelId: string;
};

/**
 * The server-side guarantee. Runs on every generation, before validation.
 *
 * Returns fields with model-written content removed wherever the status
 * says we cannot stand behind it. Exported so it can be tested directly.
 */
export function enforce(
  status: ProfileStatus,
  fields: ProfileFields,
): ProfileFields {
  if (status === "pre_release" || status === "unknown") return allWithheld();

  const out = {} as ProfileFields;
  for (const key of PROFILE_FIELD_KEYS) {
    const f = fields[key];
    // A field claiming content with no confidence is a guess wearing a
    // number. Drop it rather than store it.
    out[key] = f.value !== null && f.confidence > 0 ? f : withheld();
  }
  return out;
}

export async function generateProfile(
  title: string,
  model: ModelAdapter,
): Promise<GeneratedProfile> {
  const result = await model.structured({
    system: SYSTEM,
    prompt: `Title: ${title}`,
    schema: PROFILE_SCHEMA,
  });

  if (result.refused) {
    throw new ModelRefusedError(
      `the model declined to generate a profile for ${JSON.stringify(title)}`,
    );
  }

  if (typeof result.data !== "object" || result.data === null) {
    throw new ValidationError("profile", "model returned a non-object");
  }
  const payload = result.data as Record<string, unknown>;

  const status = requireOneOf(payload["status"], "status", [
    "generated",
    "pre_release",
    "unknown",
  ] as const);

  // Validate the shape first so a malformed field is a clear error, then
  // enforce, then re-check consistency against the (possibly stripped)
  // fields. Enforcing before validating would hide schema breakage.
  const declared = validateProfileFields(payload["fields"]);
  const fields = enforce(status, declared);
  validateProfileConsistency(status, fields);

  return { status, fields, modelId: result.modelId };
}
