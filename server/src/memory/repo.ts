/**
 * Memory storage.
 *
 * Player-scoped with an optional game link, because the memory thread the
 * product is sold on is about the person — "it knows the difference
 * between a bad week and a quiet one" — which cannot cross games if memory
 * is scoped to a title.
 */

import type { Db } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { MemoryEntry, MemoryKind } from "../domain/types.ts";
import { requireMemoryKind, requireString, requireUnitInterval } from "../domain/validate.ts";

type Row = {
  id: string;
  player_id: string;
  session_id: string | null;
  game_profile_id: string | null;
  kind: string;
  text: string;
  salience: number;
  last_referenced_at: string | null;
  superseded_by: string | null;
  created_at: string;
};

const toMemory = (r: Row): MemoryEntry => ({
  id: r.id,
  playerId: r.player_id,
  sessionId: r.session_id,
  gameProfileId: r.game_profile_id,
  kind: r.kind as MemoryKind,
  text: r.text,
  salience: r.salience,
  lastReferencedAt: r.last_referenced_at,
  supersededBy: r.superseded_by,
  createdAt: r.created_at,
});

export type RememberInput = {
  playerId: string;
  sessionId?: string | null;
  gameProfileId?: string | null;
  kind: unknown;
  text: unknown;
  salience?: unknown;
};

export async function remember(
  db: Db,
  input: RememberInput,
): Promise<MemoryEntry> {
  const entry: MemoryEntry = {
    id: newId(),
    playerId: input.playerId,
    sessionId: input.sessionId ?? null,
    gameProfileId: input.gameProfileId ?? null,
    kind: requireMemoryKind(input.kind),
    text: requireString(input.text, "text", { max: 600 }),
    salience:
      input.salience === undefined
        ? 0.5
        : requireUnitInterval(input.salience, "salience"),
    lastReferencedAt: null,
    supersededBy: null,
    createdAt: now(),
  };
  await db.run(
    `INSERT INTO memory_entry
       (id, player_id, session_id, game_profile_id, kind, text, salience,
        last_referenced_at, superseded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    [
      entry.id,
      entry.playerId,
      entry.sessionId,
      entry.gameProfileId,
      entry.kind,
      entry.text,
      entry.salience,
      entry.createdAt,
    ],
  );
  return entry;
}

/**
 * Retires `oldId`, pointing it at the memory that replaced it.
 *
 * This is what stops the digest accumulating contradictions. The brief's
 * own example needs it: "it remembers that you said two hours last
 * thursday and logged off at four" is only possible if a memory can be
 * contradicted later. Without supersession the companion gets worse as it
 * accumulates, not better.
 */
export async function supersede(
  db: Db,
  oldId: string,
  replacementId: string,
): Promise<void> {
  await db.run("UPDATE memory_entry SET superseded_by = ? WHERE id = ?", [
    replacementId,
    oldId,
  ]);
}

/**
 * Live memories for a player, most salient first.
 *
 * `gameProfileId` widens rather than narrows: it returns memories about
 * the person (no game) plus memories about the person in this world. That
 * is the whole reason the column is nullable.
 */
export async function liveMemories(
  db: Db,
  playerId: string,
  opts: { gameProfileId?: string | null; limit?: number } = {},
): Promise<MemoryEntry[]> {
  const limit = opts.limit ?? 200;
  const rows = opts.gameProfileId
    ? await db.all<Row>(
        `SELECT * FROM memory_entry
          WHERE player_id = ? AND superseded_by IS NULL
            AND (game_profile_id IS NULL OR game_profile_id = ?)
          ORDER BY salience DESC, created_at DESC
          LIMIT ?`,
        [playerId, opts.gameProfileId, limit],
      )
    : await db.all<Row>(
        `SELECT * FROM memory_entry
          WHERE player_id = ? AND superseded_by IS NULL
          ORDER BY salience DESC, created_at DESC
          LIMIT ?`,
        [playerId, limit],
      );
  return rows.map(toMemory);
}

/** Marks memories as having been used this turn. Feeds later decay work. */
export async function markReferenced(db: Db, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const stamp = now();
  const holes = ids.map(() => "?").join(",");
  await db.run(
    `UPDATE memory_entry SET last_referenced_at = ? WHERE id IN (${holes})`,
    [stamp, ...ids],
  );
}
