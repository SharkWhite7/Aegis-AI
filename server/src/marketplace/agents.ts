/**
 * Marketplace agents: authoring, publishing, stars, ranking.
 *
 * No money changes hands here and there is no price anywhere in this
 * module. People will sell agents later; today publishing is free and
 * starring is free, and a dormant price field would assert a commerce
 * feature that does not exist.
 */

import type { Db } from "../db/db.ts";
import { ConflictError } from "../db/db.ts";
import { newId, now } from "../domain/ids.ts";
import type { Agent, AgentSource, AgentVisibility } from "../domain/types.ts";
import { ValidationError, requireString } from "../domain/validate.ts";
import { BUILTIN_AGENTS } from "./builtins.ts";
import { rankedPublishedSql } from "./ranking.ts";

type Row = {
  id: string;
  slug: string;
  name: string;
  role: string;
  persona_brief: string;
  source: string;
  author_id: string | null;
  visibility: string;
  star_count: number;
  created_at: string;
  updated_at: string;
};

const toAgent = (r: Row): Agent => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  role: r.role,
  personaBrief: r.persona_brief,
  source: r.source as AgentSource,
  authorId: r.author_id,
  visibility: r.visibility as AgentVisibility,
  starCount: r.star_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Slug from a name: lowercase, words joined by hyphens. */
const slugifyName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

// ── Reads ────────────────────────────────────────────────────────────────

export async function findAgentById(db: Db, id: string): Promise<Agent | null> {
  const row = await db.get<Row>("SELECT * FROM agent WHERE id = ?", [id]);
  return row ? toAgent(row) : null;
}

export async function findAgentBySlug(
  db: Db,
  slug: string,
): Promise<Agent | null> {
  const row = await db.get<Row>("SELECT * FROM agent WHERE slug = ?", [slug]);
  return row ? toAgent(row) : null;
}

/** The marketplace listing: most stars first. See ranking.ts for the rule. */
/**
 * An agent as a given viewer is allowed to see it.
 *
 * A draft belongs to its author. Anyone else gets null, which the caller
 * turns into a 404 rather than a 403: a 403 would confirm that the slug
 * exists, and a slug carries the agent's name.
 *
 * The rule lives here, not in the route, because a second caller would
 * otherwise have to remember it. `viewerId` must be an id the caller has
 * already authenticated — an id read straight off a request would make
 * this check decorative.
 */
export async function agentVisibleTo(
  db: Db,
  slug: string,
  viewerId: string | null,
): Promise<Agent | null> {
  const agent = await findAgentBySlug(db, slug);
  if (!agent) return null;
  if (agent.visibility === "published") return agent;
  return viewerId !== null && agent.authorId === viewerId ? agent : null;
}

export async function topAgents(
  db: Db,
  opts: { limit?: number; offset?: number } = {},
): Promise<Agent[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const rows = await db.all<Row>(rankedPublishedSql(), [limit, offset]);
  return rows.map(toAgent);
}

/** An author's own agents, drafts included. */
export async function agentsByAuthor(
  db: Db,
  authorId: string,
): Promise<Agent[]> {
  const rows = await db.all<Row>(
    "SELECT * FROM agent WHERE author_id = ? ORDER BY created_at DESC",
    [authorId],
  );
  return rows.map(toAgent);
}

// ── Authoring ────────────────────────────────────────────────────────────

export type CreateAgentInput = {
  authorId: string;
  name: unknown;
  role: unknown;
  personaBrief: unknown;
};

/**
 * Creates a community agent as a draft. Publishing is a separate, explicit
 * step so nobody's half-written character appears in the listing.
 */
export async function createAgent(
  db: Db,
  input: CreateAgentInput,
): Promise<Agent> {
  const name = requireString(input.name, "name", { min: 2, max: 60 });
  const role = requireString(input.role, "role", { min: 2, max: 80 });
  // Long enough to be a character, short enough to stay in a cached
  // system prefix without dominating it.
  const personaBrief = requireString(input.personaBrief, "personaBrief", {
    min: 20,
    max: 2000,
  });

  const base = slugifyName(name);
  if (base.length < 2) {
    throw new ValidationError("name", "must contain letters or digits");
  }

  const stamp = now();
  const agent: Agent = {
    id: newId(),
    // Suffixed so two people can both publish "The Driver".
    slug: `${base}-${newId().slice(0, 6)}`,
    name,
    role,
    personaBrief,
    source: "community",
    authorId: input.authorId,
    visibility: "draft",
    starCount: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };

  await db.run(
    `INSERT INTO agent
       (id, slug, name, role, persona_brief, source, author_id, visibility,
        star_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'community', ?, 'draft', 0, ?, ?)`,
    [
      agent.id,
      agent.slug,
      agent.name,
      agent.role,
      agent.personaBrief,
      agent.authorId,
      agent.createdAt,
      agent.updatedAt,
    ],
  );
  return agent;
}

export async function setVisibility(
  db: Db,
  agentId: string,
  actorId: string,
  visibility: AgentVisibility,
): Promise<Agent> {
  const agent = await findAgentById(db, agentId);
  if (!agent) throw new NotFoundError("agent");
  if (agent.source === "builtin") {
    throw new ForbiddenError("built-in agents cannot be republished");
  }
  if (agent.authorId !== actorId) {
    throw new ForbiddenError("only the author can change an agent's visibility");
  }
  await db.run("UPDATE agent SET visibility = ?, updated_at = ? WHERE id = ?", [
    visibility,
    now(),
    agentId,
  ]);
  return { ...agent, visibility, updatedAt: now() };
}

// ── Stars ────────────────────────────────────────────────────────────────

/**
 * Recomputes star_count from agent_star rather than incrementing it.
 *
 * Slower, and right: the count is a cache of a COUNT(*) and recomputing
 * makes every call idempotent and self-healing. An increment that runs
 * twice, or runs when the insert was a no-op, leaves a number nobody can
 * reconcile — and this number is what the whole ranking sorts on.
 */
const recount = async (db: Db, agentId: string): Promise<number> => {
  const row = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM agent_star WHERE agent_id = ?",
    [agentId],
  );
  const n = row?.n ?? 0;
  await db.run("UPDATE agent SET star_count = ?, updated_at = ? WHERE id = ?", [
    n,
    now(),
    agentId,
  ]);
  return n;
};

export type StarResult = { starred: boolean; starCount: number };

/**
 * Stars an agent. Idempotent: starring twice is not an error and does not
 * move the count, because one person is one star.
 *
 * An author cannot star their own agent. One self-star is a small thumb on
 * a scale that decides the entire front page, and allowing it means every
 * agent starts at 1 — which carries no information at all. This is a
 * judgement call and it lives in one `if`, easy to reverse.
 */
export async function starAgent(
  db: Db,
  agentId: string,
  playerId: string,
): Promise<StarResult> {
  return db.tx(async (tx) => {
    const agent = await findAgentById(tx, agentId);
    if (!agent) throw new NotFoundError("agent");
    if (agent.visibility !== "published") {
      throw new ForbiddenError("only published agents can be starred");
    }
    if (agent.authorId !== null && agent.authorId === playerId) {
      throw new ForbiddenError("an author cannot star their own agent");
    }

    try {
      await tx.run(
        "INSERT INTO agent_star (agent_id, player_id, created_at) VALUES (?, ?, ?)",
        [agentId, playerId, now()],
      );
    } catch (err) {
      // Already starred. Fall through to the recount, which is the whole
      // point of recomputing: the result is the same either way.
      if (!(err instanceof ConflictError)) throw err;
    }
    return { starred: true, starCount: await recount(tx, agentId) };
  });
}

export async function unstarAgent(
  db: Db,
  agentId: string,
  playerId: string,
): Promise<StarResult> {
  return db.tx(async (tx) => {
    const agent = await findAgentById(tx, agentId);
    if (!agent) throw new NotFoundError("agent");
    await tx.run(
      "DELETE FROM agent_star WHERE agent_id = ? AND player_id = ?",
      [agentId, playerId],
    );
    return { starred: false, starCount: await recount(tx, agentId) };
  });
}

export const hasStarred = async (
  db: Db,
  agentId: string,
  playerId: string,
): Promise<boolean> =>
  Boolean(
    await db.get("SELECT 1 FROM agent_star WHERE agent_id = ? AND player_id = ?", [
      agentId,
      playerId,
    ]),
  );

// ── Seeding ──────────────────────────────────────────────────────────────

/** Idempotent: safe to run on every boot and in every test. */
export async function seedBuiltinAgents(db: Db): Promise<number> {
  let inserted = 0;
  for (const b of BUILTIN_AGENTS) {
    const existing = await findAgentBySlug(db, b.slug);
    if (existing) continue;
    const stamp = now();
    await db.run(
      `INSERT INTO agent
         (id, slug, name, role, persona_brief, source, author_id, visibility,
          star_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'builtin', NULL, 'published', 0, ?, ?)`,
      [newId(), b.slug, b.name, b.role, b.personaBrief, stamp, stamp],
    );
    inserted += 1;
  }
  return inserted;
}
