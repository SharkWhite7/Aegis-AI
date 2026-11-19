/**
 * Validation.
 *
 * Two jobs, and the second is the important one:
 *
 *  1. Structural checks on inbound HTTP bodies.
 *  2. The semantic invariants that keep the product honest — above all the
 *     no-fabrication rule for profile fields, which is not expressible as a
 *     JSON Schema because it ties three properties of one object together.
 *
 * Everything here throws ValidationError, which the HTTP layer maps to 400.
 */

import {
  PROFILE_FIELD_KEYS,
  MEMORY_KINDS,
  type MemoryKind,
  type ProfileField,
  type ProfileFields,
  type ProfileStatus,
  type WaitlistSource,
} from "./types.ts";

export class ValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "ValidationError";
    this.field = field;
  }
}

const fail = (field: string, message: string): never => {
  throw new ValidationError(field, message);
};

// ── Primitives ───────────────────────────────────────────────────────────

export function requireString(
  value: unknown,
  field: string,
  opts: { min?: number; max: number },
): string {
  if (typeof value !== "string") fail(field, "must be a string");
  const s = (value as string).trim();
  const min = opts.min ?? 1;
  if (s.length < min) fail(field, `must be at least ${min} character(s)`);
  if (s.length > opts.max) fail(field, `must be at most ${opts.max} characters`);
  return s;
}

export function optionalString(
  value: unknown,
  field: string,
  opts: { max: number },
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requireString(value, field, opts);
}

export function requireOneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(field, `must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function requireUnitInterval(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(field, "must be a finite number");
  }
  const n = value as number;
  if (n < 0 || n > 1) fail(field, "must be between 0 and 1");
  return n;
}

// ── Email ────────────────────────────────────────────────────────────────

/**
 * Deliberately permissive: one @, something either side, a dot in the
 * domain, no whitespace. Stricter regexes reject valid addresses, and the
 * only real proof an address works is the confirmation mail.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Returns the normalised (trimmed, lowercased) address. */
export function requireEmail(value: unknown, field = "email"): string {
  const raw = requireString(value, field, { max: 254 });
  const email = raw.toLowerCase();
  if (!EMAIL_RE.test(email)) fail(field, "is not a valid email address");
  return email;
}

export const WAITLIST_SOURCES: readonly WaitlistSource[] = ["hero", "nav", "other"];

// ── Handles ──────────────────────────────────────────────────────────────

const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,30}$/;

export function requireHandle(value: unknown, field = "handle"): string {
  const h = requireString(value, field, { max: 32 }).toLowerCase();
  if (!HANDLE_RE.test(h)) {
    fail(field, "must be 2-31 chars of lowercase letters, digits, - or _");
  }
  return h;
}

// ── Memory ───────────────────────────────────────────────────────────────

export const requireMemoryKind = (value: unknown, field = "kind"): MemoryKind =>
  requireOneOf(value, field, MEMORY_KINDS);

// ── Profile fields: the no-fabrication invariant ─────────────────────────

/**
 * A profile field is only valid if its three properties agree:
 *
 *   value === null  <->  provenance === "withheld"  and  confidence === 0
 *
 * That biconditional is the rule. A null value must declare that it was
 * withheld rather than merely absent, and — the half that actually stops
 * fabrication — a non-null value can never be labelled "withheld" to
 * smuggle an unsourced guess past review.
 *
 * It is checked here, on the way into the database, so a generator that
 * invents a street name cannot persist it whatever its output looked like.
 */
export function validateProfileField(
  value: unknown,
  field: string,
): ProfileField {
  if (typeof value !== "object" || value === null) {
    fail(field, "must be an object");
  }
  const o = value as Record<string, unknown>;

  const provenance = requireOneOf(o["provenance"], `${field}.provenance`, [
    "model",
    "curated",
    "withheld",
  ] as const);
  const confidence = requireUnitInterval(o["confidence"], `${field}.confidence`);

  const rawValue = o["value"];
  if (rawValue === null || rawValue === undefined) {
    if (provenance !== "withheld") {
      fail(field, 'a null value must have provenance "withheld"');
    }
    if (confidence !== 0) fail(field, "a null value must have confidence 0");
    return { value: null, provenance: "withheld", confidence: 0 };
  }

  const text = requireString(rawValue, `${field}.value`, { max: 240 });
  if (provenance === "withheld") {
    fail(field, 'a non-null value cannot have provenance "withheld"');
  }
  if (confidence <= 0) {
    fail(field, "a non-null value must have confidence above 0");
  }
  return { value: text, provenance, confidence };
}

/** All six fields must be present. A missing field is not the same as null. */
export function validateProfileFields(
  value: unknown,
  field = "fields",
): ProfileFields {
  if (typeof value !== "object" || value === null) {
    fail(field, "must be an object");
  }
  const o = value as Record<string, unknown>;
  const out = {} as ProfileFields;
  for (const key of PROFILE_FIELD_KEYS) {
    if (!(key in o)) {
      fail(`${field}.${key}`, "is required (use a withheld null, not omission)");
    }
    out[key] = validateProfileField(o[key], `${field}.${key}`);
  }
  return out;
}

/**
 * Cross-checks status against the fields.
 *
 * A pre-release title must not carry model-generated content in any field.
 * GTA VI is the flagship and it is not out; a spec sheet asserting its
 * economy is the exact failure the brief names. Curated content is allowed
 * — a human can write what is genuinely known from announcements.
 */
export function validateProfileConsistency(
  status: ProfileStatus,
  fields: ProfileFields,
): void {
  if (status === "pre_release") {
    for (const key of PROFILE_FIELD_KEYS) {
      if (fields[key].provenance === "model") {
        fail(
          `fields.${key}`,
          "a pre-release title cannot carry model-generated content; " +
            "withhold it or have a human curate it",
        );
      }
    }
  }
  if (status === "unknown") {
    for (const key of PROFILE_FIELD_KEYS) {
      if (fields[key].value !== null) {
        fail(`fields.${key}`, 'an "unknown" profile must withhold every field');
      }
    }
  }
}
