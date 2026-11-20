import { openSqlite } from "../src/db/sqlite.ts";
import type { Db } from "../src/db/db.ts";
import { createPlayer } from "../src/players/repo.ts";
import { seedBuiltinAgents } from "../src/marketplace/agents.ts";
import { insertProfile } from "../src/profiles/repo.ts";
import type { GameProfile, Player, ProfileFields } from "../src/domain/types.ts";
import { issueSession } from "../src/auth/sessions.ts";

/** A fresh in-memory database per test. No shared state between tests. */
export const freshDb = (): Db => openSqlite(":memory:");

export const withheldFields = (): ProfileFields => ({
  world: { value: null, provenance: "withheld", confidence: 0 },
  economy: { value: null, provenance: "withheld", confidence: 0 },
  traversal: { value: null, provenance: "withheld", confidence: 0 },
  pressure: { value: null, provenance: "withheld", confidence: 0 },
  vocabulary: { value: null, provenance: "withheld", confidence: 0 },
  leadVoice: { value: null, provenance: "withheld", confidence: 0 },
});

export const modelFields = (): ProfileFields => ({
  world: { value: "night city. vertical and loud.", provenance: "model", confidence: 0.9 },
  economy: { value: "eddies, and what you bolt on", provenance: "model", confidence: 0.8 },
  traversal: { value: "car, bike, and too many stairs", provenance: "model", confidence: 0.8 },
  pressure: { value: "a countdown you did not choose", provenance: "model", confidence: 0.7 },
  vocabulary: { value: "ripperdoc, eddies, braindance", provenance: "model", confidence: 0.9 },
  leadVoice: { value: "the fixer", provenance: "model", confidence: 0.6 },
});

export async function seedWorld(db: Db): Promise<{
  player: Player;
  other: Player;
  profile: GameProfile;
}> {
  await seedBuiltinAgents(db);
  const player = await createPlayer(db, { handle: "ana" });
  const other = await createPlayer(db, { handle: "bia" });
  const profile = await insertProfile(db, {
    title: "Cyberpunk 2077",
    status: "generated",
    fields: modelFields(),
    modelId: "stub",
  });
  return { player, other, profile };
}

/**
 * Signs a player in and returns the Authorization header for them.
 *
 * Tests go through the real session machinery rather than a header that
 * names a player id, because that header no longer exists.
 */
export async function authHeader(
  db: Db,
  playerId: string,
): Promise<{ authorization: string }> {
  const { token } = await issueSession(db, playerId);
  return { authorization: `Bearer ${token}` };
}
