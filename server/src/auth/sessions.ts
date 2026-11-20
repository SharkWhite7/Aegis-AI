/**
 * Sign-in sessions.
 *
 * Replaces the `x-aegis-player` header, which identified without
 * authenticating: anyone who knew a player id could act as that player.
 * That was fine for building the shape and is the one thing that barred
 * this service from the internet.
 *
 * Two decisions worth stating:
 *
 * **Server-side sessions, not a self-contained signed token.** A signed
 * token cannot be revoked before it expires, and a player's entire memory
 * sits behind this. "It expires in thirty days" is not the same as signing
 * out.
 *
 * **The token is never stored.** What goes in the database is its
 * SHA-256. A dump of `auth_session` therefore does not let anyone sign in
 * as anybody — it only lets them recognise a token they already hold.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { Player } from "../domain/types.ts";
import { ValidationError, requireString } from "../domain/validate.ts";

/** How long a session lasts without being renewed. */
export const SESSION_TTL_DAYS = 30;

/** 32 bytes of randomness; base64url so it is cookie-safe. */
const mintToken = (): string => randomBytes(32).toString("base64url");

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export type AuthSession = {
  id: string;
  playerId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

type SessionRow = {
  id: string;
  player_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type PlayerRow = {
  id: string;
  handle: string;
  display_name: string | null;
  discord_id: string | null;
  created_at: string;
};

const toPlayer = (r: PlayerRow): Player => ({
  id: r.id,
  handle: r.handle,
  displayName: r.display_name,
  createdAt: r.created_at,
});

const addDays = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

/**
 * Issues a session and returns the token ONCE. It cannot be recovered
 * afterwards — only its hash is kept — so the caller must set the cookie
 * with what comes back here.
 */
export async function issueSession(
  db: Db,
  playerId: string,
): Promise<{ token: string; session: AuthSession }> {
  const token = mintToken();
  const session: AuthSession = {
    id: newId(),
    playerId,
    createdAt: now(),
    expiresAt: addDays(SESSION_TTL_DAYS),
    revokedAt: null,
  };
  await db.run(
    `INSERT INTO auth_session (id, player_id, token_hash, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL)`,
    [session.id, session.playerId, hashToken(token), session.createdAt, session.expiresAt],
  );
  return { token, session };
}

/**
 * Resolves a token to the player it signs in, or null.
 *
 * Looks the row up by hash rather than scanning, so this is one indexed
 * read. A revoked or expired session resolves to null and is not
 * distinguished from a wrong token — the caller has no use for the
 * difference and saying which would leak whether a token ever existed.
 */
export async function authenticate(
  db: Db,
  token: string | null | undefined,
): Promise<Player | null> {
  if (typeof token !== "string" || token.length < 20) return null;

  const row = await db.get<SessionRow & { token_hash: string }>(
    "SELECT * FROM auth_session WHERE token_hash = ?",
    [hashToken(token)],
  );
  if (!row) return null;
  if (row.revoked_at !== null) return null;
  if (row.expires_at <= now()) return null;

  const player = await db.get<PlayerRow>("SELECT * FROM player WHERE id = ?", [
    row.player_id,
  ]);
  return player ? toPlayer(player) : null;
}

/** Signing out. Idempotent: an unknown token is not an error. */
export async function revokeSession(db: Db, token: string): Promise<void> {
  await db.run(
    "UPDATE auth_session SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    [now(), hashToken(token)],
  );
}

/** Ends every session for a player. For "sign out everywhere". */
export async function revokeAllSessions(db: Db, playerId: string): Promise<number> {
  const live = await db.all<{ id: string }>(
    "SELECT id FROM auth_session WHERE player_id = ? AND revoked_at IS NULL",
    [playerId],
  );
  await db.run(
    "UPDATE auth_session SET revoked_at = ? WHERE player_id = ? AND revoked_at IS NULL",
    [now(), playerId],
  );
  return live.length;
}

// ── Discord identities ───────────────────────────────────────────────────

const HANDLE_SAFE = /[^a-z0-9_-]/g;

/**
 * Derives a usable handle from a Discord username.
 *
 * Discord allows characters our handles do not, and two people can produce
 * the same stripped handle, so a taken one gets a short suffix rather than
 * failing the sign-in. Nobody should be unable to sign in because somebody
 * else has a similar name.
 */
async function freeHandle(db: Db, preferred: string): Promise<string> {
  const base =
    preferred.toLowerCase().replace(HANDLE_SAFE, "").slice(0, 24) || "player";
  const padded = base.length >= 2 ? base : `${base}0`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate =
      attempt === 0 ? padded : `${padded.slice(0, 24)}-${newId().slice(0, 4)}`;
    const taken = await db.get("SELECT 1 FROM player WHERE handle = ?", [candidate]);
    if (!taken) return candidate;
  }
  throw new ValidationError("handle", "could not derive a free handle");
}

export type DiscordIdentity = {
  discordId: unknown;
  username: unknown;
  displayName?: unknown;
};

/**
 * Finds or creates the player behind a Discord account.
 *
 * Keyed on the Discord id, never on the username: Discord usernames can be
 * changed, and keying on one would hand somebody else's memory to whoever
 * took their old name.
 */
export async function upsertPlayerByDiscord(
  db: Db,
  identity: DiscordIdentity,
): Promise<{ player: Player; created: boolean }> {
  const discordId = requireString(identity.discordId, "discordId", { max: 64 });
  const username = requireString(identity.username, "username", { max: 64 });
  const displayName =
    identity.displayName === undefined || identity.displayName === null
      ? null
      : requireString(identity.displayName, "displayName", { max: 60 });

  const existing = await db.get<PlayerRow>(
    "SELECT * FROM player WHERE discord_id = ?",
    [discordId],
  );
  if (existing) {
    if (displayName !== null && displayName !== existing.display_name) {
      await db.run("UPDATE player SET display_name = ? WHERE id = ?", [
        displayName,
        existing.id,
      ]);
      return { player: { ...toPlayer(existing), displayName }, created: false };
    }
    return { player: toPlayer(existing), created: false };
  }

  const player: Player = {
    id: newId(),
    handle: await freeHandle(db, username),
    displayName,
    createdAt: now(),
  };
  await db.run(
    `INSERT INTO player (id, handle, display_name, discord_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [player.id, player.handle, player.displayName, discordId, player.createdAt],
  );
  return { player, created: true };
}

// ── The service token ────────────────────────────────────────────────────

/**
 * Guards the one route that mints a session without proving who you are.
 *
 * Only the web app may call it, because it is the half that actually
 * completed the Discord handshake. Compared in constant time so the token
 * cannot be recovered a byte at a time.
 */
export function serviceTokenMatches(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (typeof presented !== "string" || typeof expected !== "string") return false;
  if (expected.length === 0) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
