/**
 * The HTTP surface.
 *
 * Consumed by the companion client (desktop/mobile), not by the marketing
 * site — with one exception, the waitlist, which the site posts to through
 * its own same-origin route handler. See server/README.md.
 *
 * ── Identity, and the gap in it ─────────────────────────────────────────
 *
 * Routes that act as a player read `x-aegis-player`. That is
 * IDENTIFICATION, NOT AUTHENTICATION: anyone who knows a player id can
 * send it. It is enough to build and test the product's shape and it must
 * not be reachable from the internet as it stands. Real auth is the single
 * thing that has to exist before this service is exposed.
 */

import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import type { Db } from "../db/db.ts";
import type { ModelAdapter } from "../model/adapter.ts";
import { mapError } from "./errors.ts";
import { fixedWindow, type RateLimiter } from "./ratelimit.ts";
import { ValidationError, requireString } from "../domain/validate.ts";
import { joinWaitlist } from "../waitlist/service.ts";
import { createPlayer, findPlayerById } from "../players/repo.ts";
import {
  createAgent,
  findAgentBySlug,
  setVisibility,
  starAgent,
  topAgents,
  unstarAgent,
  agentsByAuthor,
  hasStarred,
} from "../marketplace/agents.ts";
import { endSession, recentTurns, startSession, takeTurn } from "../chat/service.ts";
import { remember } from "../memory/repo.ts";
import { ensureProfile, findBySlug } from "../profiles/repo.ts";
import { slugify } from "../profiles/normalize.ts";

export type AppOptions = {
  db: Db;
  model: ModelAdapter;
  /** Calls per window for routes that spend a model call. */
  modelCallsPerWindow?: number;
  windowMs?: number;
  /** Calls per window for waitlist signups, keyed by client address. */
  signupsPerWindow?: number;
  logger?: boolean;
};

const numberParam = (raw: unknown, fallback: number): number => {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export function buildApp(opts: AppOptions): FastifyInstance {
  const { db, model } = opts;
  const windowMs = opts.windowMs ?? 60_000;
  const modelLimiter: RateLimiter = fixedWindow(
    opts.modelCallsPerWindow ?? 30,
    windowMs,
  );
  const signupLimiter: RateLimiter = fixedWindow(
    opts.signupsPerWindow ?? 10,
    windowMs,
  );

  const app = Fastify({
    logger: opts.logger ?? false,
    // A companion turn carries a short message and at most a few KB of
    // player-reported context. Anything larger is a mistake or an attack.
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler((err, _req, reply) => {
    const { status, body } = mapError(err);
    if (status === 500) app.log.error({ err }, "unhandled error");
    reply.code(status).send(body);
  });

  /** Resolves the acting player, or throws a 400. See the header note. */
  const actor = async (req: FastifyRequest): Promise<string> => {
    const raw = req.headers["x-aegis-player"];
    const id = requireString(Array.isArray(raw) ? raw[0] : raw, "x-aegis-player", {
      max: 64,
    });
    const player = await findPlayerById(db, id);
    if (!player) throw new ValidationError("x-aegis-player", "unknown player");
    return player.id;
  };

  const spendModelCall = (key: string, reply: { code: (n: number) => unknown; send: (b: unknown) => unknown }): boolean => {
    if (modelLimiter.take(key)) return true;
    reply.code(429);
    reply.send({
      error: "rate_limited",
      message: "too many model calls; slow down",
      retryAfterSeconds: modelLimiter.retryAfter(),
    });
    return false;
  };

  // ── Health ─────────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok", stage: "pre-alpha" }));

  // ── Waitlist ───────────────────────────────────────────────────────────
  //
  // Always answers `{ ok: true }` for a valid address whether or not it was
  // already on the list. Reporting "already on the list" would turn the
  // form into a way of testing whether a given address had signed up.
  // There is no count endpoint, by design.

  app.post("/waitlist", async (req, reply) => {
    const key = req.ip || "unknown";
    if (!signupLimiter.take(key)) {
      return reply.code(429).send({
        error: "rate_limited",
        message: "too many signups from this address",
        retryAfterSeconds: signupLimiter.retryAfter(),
      });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    await joinWaitlist(db, {
      email: body["email"],
      gameTitle: body["gameTitle"],
      source: body["source"],
    });
    return reply.code(202).send({ ok: true });
  });

  // ── Players ────────────────────────────────────────────────────────────

  app.post("/players", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const player = await createPlayer(db, {
      handle: body["handle"],
      displayName: body["displayName"],
    });
    return reply.code(201).send(player);
  });

  // ── Marketplace ────────────────────────────────────────────────────────

  /** The marketplace tab: most stars first. */
  app.get("/agents", async (req) => {
    const q = req.query as Record<string, unknown>;
    const agents = await topAgents(db, {
      limit: numberParam(q["limit"], 20),
      offset: numberParam(q["offset"], 0),
    });
    return { agents };
  });

  app.get("/agents/mine", async (req) => ({
    agents: await agentsByAuthor(db, await actor(req)),
  }));

  app.get("/agents/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const agent = await findAgentBySlug(db, slug);
    if (!agent) return reply.code(404).send({ error: "not_found", message: "agent not found" });
    return agent;
  });

  app.post("/agents", async (req, reply) => {
    const authorId = await actor(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const agent = await createAgent(db, {
      authorId,
      name: body["name"],
      role: body["role"],
      personaBrief: body["personaBrief"],
    });
    return reply.code(201).send(agent);
  });

  app.post("/agents/:id/publish", async (req) => {
    const { id } = req.params as { id: string };
    return setVisibility(db, id, await actor(req), "published");
  });

  app.post("/agents/:id/unpublish", async (req) => {
    const { id } = req.params as { id: string };
    return setVisibility(db, id, await actor(req), "draft");
  });

  app.post("/agents/:id/star", async (req) => {
    const { id } = req.params as { id: string };
    return starAgent(db, id, await actor(req));
  });

  app.delete("/agents/:id/star", async (req) => {
    const { id } = req.params as { id: string };
    return unstarAgent(db, id, await actor(req));
  });

  app.get("/agents/:id/star", async (req) => {
    const { id } = req.params as { id: string };
    return { starred: await hasStarred(db, id, await actor(req)) };
  });

  // ── Game profiles ──────────────────────────────────────────────────────

  /** Read-only lookup. Never generates, so it cannot be used to spend. */
  app.get("/profiles/:title", async (req, reply) => {
    const { title } = req.params as { title: string };
    const profile = await findBySlug(db, slugify(title));
    if (!profile) {
      // A real answer, and the one the site already renders honestly.
      return reply.code(404).send({
        error: "not_found",
        message: "no profile on file for that title",
      });
    }
    return profile;
  });

  /** Generates on first sight of a title. Rate limited: it spends. */
  app.post("/profiles", async (req, reply) => {
    const playerId = await actor(req);
    if (!spendModelCall(playerId, reply)) return reply;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = requireString(body["title"], "title", { min: 2, max: 120 });
    return ensureProfile(db, title, model);
  });

  // ── Chat ───────────────────────────────────────────────────────────────

  app.post("/chat/sessions", async (req, reply) => {
    const playerId = await actor(req);
    if (!spendModelCall(playerId, reply)) return reply;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const started = await startSession(
      db,
      {
        playerId,
        gameTitle: body["gameTitle"],
        agentId: requireString(body["agentId"], "agentId", { max: 64 }),
      },
      model,
    );
    return reply.code(201).send(started);
  });

  app.post("/chat/sessions/:id/turns", async (req, reply) => {
    const playerId = await actor(req);
    if (!spendModelCall(playerId, reply)) return reply;
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await takeTurn(
      db,
      {
        sessionId: id,
        text: body["text"],
        liveContext: body["liveContext"],
      },
      model,
    );
    // A refusal is reported as one. The client decides what to show; we do
    // not put words in the companion's mouth.
    return reply.code(result.refused ? 422 : 200).send(result);
  });

  app.get("/chat/sessions/:id/turns", async (req) => {
    const { id } = req.params as { id: string };
    return { turns: await recentTurns(db, id, 200) };
  });

  app.post("/chat/sessions/:id/end", async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;
    return endSession(db, id, body["summary"]);
  });

  // ── Memory ─────────────────────────────────────────────────────────────

  app.post("/memory", async (req, reply) => {
    const playerId = await actor(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const entry = await remember(db, {
      playerId,
      kind: body["kind"],
      text: body["text"],
      salience: body["salience"],
      sessionId: (body["sessionId"] as string | undefined) ?? null,
      gameProfileId: (body["gameProfileId"] as string | undefined) ?? null,
    });
    return reply.code(201).send(entry);
  });

  return app;
}
