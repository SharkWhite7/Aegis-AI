/**
 * The HTTP surface.
 *
 * Consumed by the companion client (desktop/mobile), not by the marketing
 * site — with one exception, the waitlist, which the site posts to through
 * its own same-origin route handler. See server/README.md.
 *
 * ── Identity ────────────────────────────────────────────────────────────
 *
 * Routes that act as a player read `Authorization: Bearer <token>`, where
 * the token is a sign-in session issued by `POST /auth/discord` and
 * revocable by signing out. It replaces the old `x-aegis-player` header,
 * which identified without authenticating: anyone who knew a player id
 * could act as that player.
 *
 * `POST /auth/discord` is the one route that mints a session without
 * proving who you are, so it is guarded by a shared service token and may
 * only be called by the web app — the half that actually completed the
 * Discord handshake. Without `serviceToken` configured, it is refused
 * outright rather than left open.
 */

import { Readable } from "node:stream";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import type { Db } from "../db/db.ts";
import type { ModelAdapter } from "../model/adapter.ts";
import { mapError, UnauthorizedError } from "./errors.ts";
import { fixedWindow, type RateLimiter } from "./ratelimit.ts";
import { requireHandle, requireString } from "../domain/validate.ts";
import { joinWaitlist } from "../waitlist/service.ts";
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
import {
  endSession,
  recentTurns,
  startSession,
  takeTurn,
  takeTurnStream,
  type TurnStreamEvent,
} from "../chat/service.ts";
import { remember } from "../memory/repo.ts";
import { ensureProfile, findBySlug } from "../profiles/repo.ts";
import { createPlayer, findPlayerById, findPlayerByHandle } from "../players/repo.ts";
import {
  authenticate,
  issueSession,
  revokeSession,
  serviceTokenMatches,
  upsertPlayerByDiscord,
} from "../auth/sessions.ts";
import { slugify } from "../profiles/normalize.ts";

export type AppOptions = {
  db: Db;
  model: ModelAdapter;
  /** Calls per window for routes that spend a model call. */
  modelCallsPerWindow?: number;
  windowMs?: number;
  /** Calls per window for waitlist signups, keyed by client address. */
  signupsPerWindow?: number;
  /**
   * Shared secret the web app presents to mint sessions. When absent,
   * POST /auth/discord refuses every request rather than accepting any.
   */
  serviceToken?: string | undefined;
  /**
   * Enables POST /auth/dev, which signs anyone in as any handle with no
   * proof. Decided by devSignInAllowed() in src/auth/dev.ts, never by a
   * bare default here. Off unless explicitly passed.
   */
  devSignIn?: boolean | undefined;
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

  const bearer = (req: FastifyRequest): string | null => {
    const raw = req.headers["authorization"];
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (typeof header !== "string") return null;
    const [scheme, ...rest] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer") return null;
    const token = rest.join(" ").trim();
    return token.length > 0 ? token : null;
  };

  /** Resolves the signed-in player, or throws a 401. */
  const actor = async (req: FastifyRequest): Promise<string> => {
    const player = await authenticate(db, bearer(req));
    if (!player) throw new UnauthorizedError();
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

  // ── Sign in ────────────────────────────────────────────────────────────

  /**
   * Mints a session for a Discord identity the web app has already
   * verified. Service-token only: this route trusts its caller about who
   * the player is, so the caller must prove it is the web app.
   */
  app.post("/auth/discord", async (req, reply) => {
    const raw = req.headers["x-aegis-service"];
    const presented = Array.isArray(raw) ? raw[0] : raw;
    if (!serviceTokenMatches(presented, opts.serviceToken)) {
      // Deliberately indistinguishable from a wrong token: whether the
      // server has one configured is not something a caller should learn.
      return reply.code(401).send({
        error: "unauthorized",
        message: "this route is not open",
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const { player, created } = await upsertPlayerByDiscord(db, {
      discordId: body["discordId"],
      username: body["username"],
      displayName: body["displayName"],
    });
    const { token, session } = await issueSession(db, player.id);
    // The only time the token is ever returned. Only its hash is stored.
    return reply.code(created ? 201 : 200).send({
      token,
      expiresAt: session.expiresAt,
      player,
      created,
    });
  });

  /**
   * Development sign-in. Mints a real session for a handle, with no
   * proof of anything. Off unless the caller passed devSignIn, which
   * src/auth/dev.ts only allows outside production and behind an
   * explicit opt-in.
   */
  app.post("/auth/dev", async (req, reply) => {
    if (opts.devSignIn !== true) {
      return reply.code(404).send({ error: "not_found", message: "no such route" });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const handle = requireHandle(body["handle"]);
    const player =
      (await findPlayerByHandle(db, handle)) ??
      (await createPlayer(db, { handle }));
    const { token, session } = await issueSession(db, player.id);
    return reply.code(200).send({ token, expiresAt: session.expiresAt, player });
  });

  app.get("/auth/me", async (req) => {
    const playerId = await actor(req);
    return { player: await findPlayerById(db, playerId) };
  });

  app.post("/auth/signout", async (req, reply) => {
    const token = bearer(req);
    // Idempotent on purpose: signing out twice, or with a token that is
    // already dead, is a success. The client's job is to drop the cookie.
    if (token) await revokeSession(db, token);
    return reply.code(204).send();
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

  /**
   * The same turn, streamed as newline-delimited JSON.
   *
   * NDJSON rather than Server-Sent Events because the request carries a
   * body: EventSource is GET-only, so the client needs fetch either way,
   * and NDJSON costs nothing to parse off a reader.
   *
   * The first event is pulled before the response begins. A turn can fail
   * validation — unknown session, closed session, empty text — and once
   * headers are out, a failure can only be a truncated 200. Pulling one
   * event first means those still answer with a real status code.
   */
  app.post("/chat/sessions/:id/turns/stream", async (req, reply) => {
    const playerId = await actor(req);
    if (!spendModelCall(playerId, reply)) return reply;

    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;

    const events = takeTurnStream(
      db,
      { sessionId: id, text: body["text"], liveContext: body["liveContext"] },
      model,
    );

    // Throws here, before any header is sent, for anything invalid.
    const first = await events.next();

    async function* lines(): AsyncGenerator<string> {
      if (!first.done) yield `${JSON.stringify(first.value)}\n`;
      for await (const event of events) {
        yield `${JSON.stringify(event satisfies TurnStreamEvent)}\n`;
      }
    }

    reply.header("content-type", "application/x-ndjson; charset=utf-8");
    reply.header("cache-control", "no-store");
    // Readable.from calls the generator's return() when the response is
    // destroyed, so a client that walks away still runs the finally that
    // records what the companion said.
    return Readable.from(lines());
  });

  app.get("/chat/sessions/:id/turns", async (req) => {
    const { id } = req.params as { id: string };
    return { turns: await recentTurns(db, id, 200) };
  });

  // Ending a session debriefs it: one model call that writes the summary
  // and extracts the memories to carry forward. This is the only thing in
  // the product that creates memories, so it is rate limited like any
  // other spending route.
  app.post("/chat/sessions/:id/end", async (req, reply) => {
    const playerId = await actor(req);
    if (!spendModelCall(playerId, reply)) return reply;
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;
    return endSession(db, id, {
      summary: body["summary"],
      // Opt out with {"debrief": false} to close a session without
      // spending a model call on it.
      ...(body["debrief"] === false ? {} : { model }),
    });
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
