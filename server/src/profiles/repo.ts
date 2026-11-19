/**
 * Game profile storage.
 *
 * Profiles are per title and shared by every player: generated once, read
 * many times. `ensureProfile` is the "any game" entry point — it is what
 * makes typing a title cost one generation ever, rather than one per
 * player, which is the whole economics of "no per-title engineering".
 */

import type { Db } from "../db/db.ts";
import { ConflictError } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { GameProfile, ProfileFields, ProfileStatus } from "../domain/types.ts";
import { validateProfileFields } from "../domain/validate.ts";
import { GENERATOR_VERSION, generateProfile } from "./generator.ts";
import { isSlugUsable, slugify } from "./normalize.ts";
import type { ModelAdapter } from "../model/adapter.ts";

type Row = {
  id: string;
  slug: string;
  title: string;
  aliases: string;
  status: string;
  fields: string;
  generator_version: string;
  model_id: string | null;
  created_at: string;
  refreshed_at: string | null;
};

const toProfile = (r: Row): GameProfile => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  aliases: JSON.parse(r.aliases) as string[],
  status: r.status as ProfileStatus,
  // Re-validated on read: a row written by an older generator version, or
  // by hand, does not get to bypass the no-fabrication invariant.
  fields: validateProfileFields(JSON.parse(r.fields)),
  generatorVersion: r.generator_version,
  modelId: r.model_id,
  createdAt: r.created_at,
  refreshedAt: r.refreshed_at,
});

export async function findBySlug(
  db: Db,
  slug: string,
): Promise<GameProfile | null> {
  const row = await db.get<Row>("SELECT * FROM game_profile WHERE slug = ?", [slug]);
  return row ? toProfile(row) : null;
}

export async function findById(db: Db, id: string): Promise<GameProfile | null> {
  const row = await db.get<Row>("SELECT * FROM game_profile WHERE id = ?", [id]);
  return row ? toProfile(row) : null;
}

export type NewProfile = {
  title: string;
  status: ProfileStatus;
  fields: ProfileFields;
  modelId: string | null;
  aliases?: string[];
};

export async function insertProfile(
  db: Db,
  input: NewProfile,
): Promise<GameProfile> {
  const slug = slugify(input.title);
  const profile: GameProfile = {
    id: newId(),
    slug,
    title: input.title,
    aliases: input.aliases ?? [input.title],
    status: input.status,
    fields: input.fields,
    generatorVersion: GENERATOR_VERSION,
    modelId: input.modelId,
    createdAt: now(),
    refreshedAt: null,
  };
  await db.run(
    `INSERT INTO game_profile
       (id, slug, title, aliases, status, fields, generator_version, model_id, created_at, refreshed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      profile.id,
      profile.slug,
      profile.title,
      JSON.stringify(profile.aliases),
      profile.status,
      JSON.stringify(profile.fields),
      profile.generatorVersion,
      profile.modelId,
      profile.createdAt,
    ],
  );
  return profile;
}

export class UnusableTitleError extends Error {
  constructor(title: string) {
    super(`title ${JSON.stringify(title)} is too short to generate a profile`);
    this.name = "UnusableTitleError";
  }
}

/**
 * Returns the profile for a title, generating it once if it is new.
 *
 * Two players typing the same title at the same moment both generate; the
 * UNIQUE index on slug means one insert wins and the loser re-reads the
 * winner's row rather than failing. That costs a duplicate model call in a
 * rare race, which is cheaper than holding a lock across one.
 */
export async function ensureProfile(
  db: Db,
  title: string,
  model: ModelAdapter,
): Promise<GameProfile> {
  const slug = slugify(title);
  if (!isSlugUsable(slug)) throw new UnusableTitleError(title);

  const existing = await findBySlug(db, slug);
  if (existing) return existing;

  const generated = await generateProfile(title, model);
  try {
    return await insertProfile(db, {
      title,
      status: generated.status,
      fields: generated.fields,
      modelId: generated.modelId,
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      const raced = await findBySlug(db, slug);
      if (raced) return raced;
    }
    throw err;
  }
}
