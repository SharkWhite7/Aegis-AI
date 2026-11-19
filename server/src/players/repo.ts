/**
 * Players.
 *
 * No email at creation, no plan column, and no API key column — ever.
 * Inference is managed, so there is nowhere for a player-supplied key to
 * go, which is the point.
 */

import type { Db } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { Player } from "../domain/types.ts";
import { optionalString, requireHandle } from "../domain/validate.ts";

type Row = {
  id: string;
  handle: string;
  display_name: string | null;
  created_at: string;
};

const toPlayer = (r: Row): Player => ({
  id: r.id,
  handle: r.handle,
  displayName: r.display_name,
  createdAt: r.created_at,
});

export async function createPlayer(
  db: Db,
  input: { handle: unknown; displayName?: unknown },
): Promise<Player> {
  const player: Player = {
    id: newId(),
    handle: requireHandle(input.handle),
    displayName: optionalString(input.displayName, "displayName", { max: 60 }),
    createdAt: now(),
  };
  await db.run(
    "INSERT INTO player (id, handle, display_name, created_at) VALUES (?, ?, ?, ?)",
    [player.id, player.handle, player.displayName, player.createdAt],
  );
  return player;
}

export async function findPlayerById(db: Db, id: string): Promise<Player | null> {
  const row = await db.get<Row>("SELECT * FROM player WHERE id = ?", [id]);
  return row ? toPlayer(row) : null;
}

export async function findPlayerByHandle(
  db: Db,
  handle: string,
): Promise<Player | null> {
  const row = await db.get<Row>("SELECT * FROM player WHERE handle = ?", [
    handle.toLowerCase(),
  ]);
  return row ? toPlayer(row) : null;
}
