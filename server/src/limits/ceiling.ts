/**
 * A per-player consumption ceiling.
 *
 * The rate limiter next door caps calls per minute. That is a different
 * guarantee: it stops a burst, not a grind. A player who stays politely
 * under the per-minute limit all day consumes all day, and because
 * inference is managed — AEGIS AI holds the credential and pays for every
 * turn — that consumption is ours. A voice turn costs a model call *plus*
 * speech synthesis, so the figure multiplies exactly when voice ships.
 *
 * Two decisions worth stating, because both are refusals to guess:
 *
 * 1. **Units, not money.** A ceiling in dollars needs a price per token.
 *    We do not have one here, and inventing one would make the ceiling
 *    itself invented — a number that looks like a limit and is not. Tokens
 *    and characters are what providers actually report, so those are what
 *    this counts. Prices can convert the ledger to money later, outside
 *    this module, once a real price exists.
 *
 * 2. **The check runs before the call, so a turn can overshoot.** Nothing
 *    knows a turn's token count until the model has answered. This reads
 *    what is already recorded and refuses the *next* turn once the ceiling
 *    is reached, which means a player can cross it by at most one turn's
 *    worth. Reserving an estimate up front instead would charge for tokens
 *    that were never spent, and that is the worse lie. The overshoot is
 *    bounded by `maxTokens` on the request, not unbounded.
 *
 * The ledger is append-only. A correction is another row with negative
 * units, never an UPDATE: an UPDATE would erase the record of what was
 * actually consumed.
 */

import type { Db } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";

export type SpendKind =
  | "model_input_tokens"
  | "model_output_tokens"
  | "tts_characters"
  | "stt_seconds";

export const SPEND_KINDS: readonly SpendKind[] = [
  "model_input_tokens",
  "model_output_tokens",
  "tts_characters",
  "stt_seconds",
];

/** Units of each kind a single player may consume inside one window. */
export type Ceilings = Readonly<Record<SpendKind, number>>;

export const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Pre-alpha defaults, chosen to be generous for a real player and finite
 * for an abusive one — not derived from a price, because there isn't one.
 *
 * Sized against the turn loop as it stands: the stable prefix plus a
 * bounded digest puts a text turn in the low thousands of input tokens, so
 * 2,000,000 input tokens is roughly a few hundred turns a day. These are
 * a starting point to be revised against measured usage, which is why they
 * are one exported constant and not scattered literals.
 */
export const DEFAULT_CEILINGS: Ceilings = {
  model_input_tokens: 2_000_000,
  model_output_tokens: 400_000,
  tts_characters: 200_000,
  stt_seconds: 3_600,
};

export type SpendInput = {
  playerId: string;
  sessionId?: string | null;
  kind: SpendKind;
  /** Signed. Negative corrects an earlier row; zero is not recorded. */
  units: number;
};

/**
 * Append one entry to the ledger.
 *
 * Zero units writes nothing: a row that records no consumption is noise in
 * a table whose whole job is to be summed. A non-integer is rejected rather
 * than rounded, because silently rounding a count is how a ledger starts
 * disagreeing with the thing it meters.
 */
export async function recordSpend(db: Db, input: SpendInput): Promise<void> {
  if (!Number.isFinite(input.units) || !Number.isInteger(input.units)) {
    throw new TypeError(`spend units must be an integer, got ${input.units}`);
  }
  if (input.units === 0) return;
  await db.run(
    `INSERT INTO spend_entry (id, player_id, session_id, kind, units, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [newId(), input.playerId, input.sessionId ?? null, input.kind, input.units, now()],
  );
}

/** Units of one kind a player has consumed since an ISO timestamp. */
export async function spentSince(
  db: Db,
  playerId: string,
  kind: SpendKind,
  sinceIso: string,
): Promise<number> {
  const row = await db.get<{ total: number | null }>(
    `SELECT SUM(units) AS total FROM spend_entry
      WHERE player_id = ? AND kind = ? AND created_at >= ?`,
    [playerId, kind, sinceIso],
  );
  // SUM over no rows is NULL, not 0, on both SQLite and Postgres.
  return row?.total ?? 0;
}

export type CeilingVerdict =
  | { allowed: true }
  | {
      allowed: false;
      /** Which kind is exhausted. The first one found, not all of them. */
      kind: SpendKind;
      spent: number;
      ceiling: number;
      /** When the window this was measured over rolls past. */
      windowStartedAt: string;
    };

/**
 * Whether a player may consume more right now.
 *
 * Returns the *first* exhausted kind rather than every one, because the
 * caller's only decision is whether to proceed, and naming one real cause
 * is more useful than a list.
 */
export async function checkCeiling(
  db: Db,
  playerId: string,
  opts: { ceilings?: Ceilings; windowMs?: number; nowMs?: number } = {},
): Promise<CeilingVerdict> {
  const ceilings = opts.ceilings ?? DEFAULT_CEILINGS;
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const nowMs = opts.nowMs ?? Date.now();
  const since = new Date(nowMs - windowMs).toISOString();

  for (const kind of SPEND_KINDS) {
    const ceiling = ceilings[kind];
    // A ceiling of 0 blocks that kind outright, which is a legitimate
    // configuration (voice off for everyone, say) and not a bug.
    const spent = await spentSince(db, playerId, kind, since);
    if (spent >= ceiling) {
      return { allowed: false, kind, spent, ceiling, windowStartedAt: since };
    }
  }
  return { allowed: true };
}

/** Everything a player has consumed in the window, for an honest read-out. */
export async function spendSummary(
  db: Db,
  playerId: string,
  opts: { windowMs?: number; nowMs?: number } = {},
): Promise<{ windowStartedAt: string; units: Record<SpendKind, number> }> {
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const nowMs = opts.nowMs ?? Date.now();
  const since = new Date(nowMs - windowMs).toISOString();

  const units = {} as Record<SpendKind, number>;
  for (const kind of SPEND_KINDS) {
    units[kind] = await spentSince(db, playerId, kind, since);
  }
  return { windowStartedAt: since, units };
}

/** The environment variable that configures each kind's ceiling. */
export const CEILING_ENV: Readonly<Record<SpendKind, string>> = {
  model_input_tokens: "AEGIS_CEILING_MODEL_INPUT_TOKENS",
  model_output_tokens: "AEGIS_CEILING_MODEL_OUTPUT_TOKENS",
  tts_characters: "AEGIS_CEILING_TTS_CHARACTERS",
  stt_seconds: "AEGIS_CEILING_STT_SECONDS",
};

/**
 * Ceilings from the environment, falling back to the defaults per kind.
 *
 * Throws on a value it cannot read rather than falling back. An operator
 * lowering a ceiling during an incident must not be silently given the
 * default instead — that is the one moment the fallback would be worst,
 * and a typo is exactly when it would happen.
 */
export function ceilingsFromEnv(
  env: Record<string, string | undefined>,
): Ceilings {
  const out = { ...DEFAULT_CEILINGS } as Record<SpendKind, number>;
  for (const kind of SPEND_KINDS) {
    const raw = env[CEILING_ENV[kind]];
    if (raw === undefined || raw.trim() === "") continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError(
        `${CEILING_ENV[kind]} must be a non-negative integer, got ${JSON.stringify(raw)}`,
      );
    }
    out[kind] = n;
  }
  return out;
}
