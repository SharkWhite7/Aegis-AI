/**
 * Domain types for the AEGIS AI companion backend.
 *
 * These mirror the shapes the marketing site already ships in `lib/` so the
 * two halves cannot drift. In particular PROFILE_FIELD_KEYS below is the
 * same six fields as PROFILE_FIELDS in lib/profiles.ts.
 */

/** ISO-8601 UTC string. Lexically sortable, which the queries rely on. */
export type Timestamp = string;

// ── Game profiles ────────────────────────────────────────────────────────

/**
 * The six fields the site renders. Kept in this order: the profile card
 * displays them in it.
 */
export const PROFILE_FIELD_KEYS = [
  "world",
  "economy",
  "traversal",
  "pressure",
  "vocabulary",
  "leadVoice",
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number];

/** Display labels, matching PROFILE_FIELDS in the site's lib/profiles.ts. */
export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  world: "World",
  economy: "Economy",
  traversal: "Traversal",
  pressure: "Pressure",
  vocabulary: "Vocabulary",
  leadVoice: "Lead voice",
};

/**
 * Where a field's content came from. This exists so that a value can never
 * be stored without saying how it was arrived at.
 *
 * - `model`     the generator produced it from the title alone.
 * - `curated`   a human wrote it.
 * - `withheld`  the generator was asked and declined, because the title is
 *               unreleased or it had nothing it could support. `value` is
 *               null and that is the answer, not a gap to fill in later.
 */
export type Provenance = "model" | "curated" | "withheld";

/**
 * A single profile field.
 *
 * `value: null` is meaningful — "known to be unknown". The site already
 * renders exactly this as an em dash, and ships GTA VI deliberately blank.
 * Nullability here is where the no-fabrication rule lives in the type
 * system rather than in a reviewer's attention.
 */
export type ProfileField = {
  value: string | null;
  provenance: Provenance;
  /** 0..1. Must be 0 when value is null; enforced in validate.ts. */
  confidence: number;
};

export type ProfileFields = Record<ProfileFieldKey, ProfileField>;

export type ProfileStatus = "generated" | "pre_release" | "unknown";

export type GameProfile = {
  id: string;
  slug: string;
  title: string;
  aliases: string[];
  status: ProfileStatus;
  fields: ProfileFields;
  generatorVersion: string;
  modelId: string | null;
  createdAt: Timestamp;
  refreshedAt: Timestamp | null;
};

// ── Players ──────────────────────────────────────────────────────────────

export type Player = {
  id: string;
  handle: string;
  displayName: string | null;
  createdAt: Timestamp;
};

// ── Marketplace agents ───────────────────────────────────────────────────

export type AgentSource = "builtin" | "community";
export type AgentVisibility = "draft" | "published";

/**
 * An agent is a voice a player can talk to: one of the six built-ins, or
 * one someone authored and published.
 *
 * No price. Nothing is charged for yet, and a dormant price field would
 * assert a commerce feature that does not exist.
 */
export type Agent = {
  id: string;
  slug: string;
  name: string;
  role: string;
  /** The voice instruction that actually reaches the model. */
  personaBrief: string;
  source: AgentSource;
  authorId: string | null;
  visibility: AgentVisibility;
  starCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ── Sessions, turns ──────────────────────────────────────────────────────

export type Session = {
  id: string;
  playerId: string;
  gameProfileId: string;
  agentId: string;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  summary: string | null;
  turnCount: number;
};

export type TurnRole = "player" | "copilot";

export type Turn = {
  id: string;
  sessionId: string;
  seq: number;
  role: TurnRole;
  text: string;
  latencyMs: number | null;
  createdAt: Timestamp;
};

// ── Memory ───────────────────────────────────────────────────────────────

export type MemoryKind =
  | "preference"
  | "goal"
  | "fact"
  | "event"
  | "conversation"
  | "challenge_outcome";

export const MEMORY_KINDS: readonly MemoryKind[] = [
  "preference",
  "goal",
  "fact",
  "event",
  "conversation",
  "challenge_outcome",
];

export type MemoryEntry = {
  id: string;
  playerId: string;
  sessionId: string | null;
  gameProfileId: string | null;
  kind: MemoryKind;
  text: string;
  salience: number;
  lastReferencedAt: Timestamp | null;
  /** Non-null means retired: contradicted by the memory it points at. */
  supersededBy: string | null;
  createdAt: Timestamp;
};

// ── Waitlist ─────────────────────────────────────────────────────────────

export type WaitlistSource = "hero" | "nav" | "other";

export type WaitlistEntry = {
  id: string;
  email: string;
  gameTitle: string | null;
  source: WaitlistSource;
  createdAt: Timestamp;
  confirmedAt: Timestamp | null;
};
