/**
 * The marketplace's half of the companion-service client.
 *
 * Separate from backend.ts on purpose: that file is the session and chat
 * surface, and two workstreams editing one client is how merge conflicts
 * happen. Both share the one `call()` transport so the service token and
 * the timeout have a single definition.
 *
 * Shape note: these functions never substitute a value for a failure. A
 * list that could not be fetched comes back as `{ ok: false }`, not as an
 * empty array — an empty marketplace and an unreachable service look
 * identical to a reader otherwise, and only one of them is true.
 */

import { call, BackendUnavailableError } from "./backend";

/**
 * The agent as the service defines it (server/src/domain/types.ts).
 *
 * backend.ts also has an `Agent`, deliberately narrower: it carries what
 * the voice picker needs. This one carries what the marketplace needs,
 * including the persona brief and the draft/published state.
 */
export type MarketAgent = {
  id: string;
  slug: string;
  name: string;
  role: string;
  /** Up to 2,000 characters that reach the model as a system instruction. */
  personaBrief: string;
  source: "builtin" | "community";
  authorId: string | null;
  visibility: "draft" | "published";
  starCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Either the thing, or why there is no thing.
 *
 * `reason` is for a person to read. It is always something the service or
 * the transport actually said, never a guess at a cause.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const no = (reason: string): Result<never> => ({ ok: false, reason });

/** Pulls the service's own message out of an error body, if it sent one. */
const messageFrom = (body: Record<string, unknown>, fallback: string): string => {
  const message = body["message"];
  return typeof message === "string" && message.length > 0 ? message : fallback;
};

const asAgent = (body: Record<string, unknown>): MarketAgent =>
  body as unknown as MarketAgent;

const asAgents = (body: Record<string, unknown>): MarketAgent[] => {
  const list = body["agents"];
  return Array.isArray(list) ? (list as MarketAgent[]) : [];
};

/**
 * Wraps a call so a dead service becomes a reason rather than a crash.
 *
 * EMPTY_BODY: `call()` sets `content-type: application/json` on every
 * request, body or not, and Fastify rejects that header with an empty body
 * (FST_ERR_CTP_EMPTY_JSON_BODY), which its error handler turns into a 500.
 * So a POST or DELETE that carries no payload still has to send `body: {}`.
 * Observed, not guessed: starring from the browser returned 500 until it
 * did. backend.ts already does this in `endSession`, and `signOut` is the
 * one place that does not — it swallows its own errors, which is why the
 * gap went unnoticed. Fixed here rather than in `call()`, which is a
 * shared file this work may change by only the one line that exports it.
 */
async function attempt(
  path: string,
  init: Parameters<typeof call>[1] = {},
): Promise<Result<{ status: number; body: Record<string, unknown> }>> {
  try {
    return ok(await call(path, init));
  } catch (cause) {
    if (cause instanceof BackendUnavailableError) {
      return no(`The companion service did not answer: ${cause.message}`);
    }
    throw cause;
  }
}

// ── Reads ────────────────────────────────────────────────────────────────

export type RankedPage = {
  /** This page of the ranking, most stars first. */
  agents: MarketAgent[];
  /** Zero-based index of the first row on this page. */
  offset: number;
  /**
   * Whether the service held at least one more row past this page.
   *
   * Established by asking for one row more than is shown and seeing
   * whether it arrives — there is no count endpoint, so this is the only
   * honest way to know, and a "next" link is never offered on a guess.
   */
  hasMore: boolean;
};

/**
 * One page of the ranking. The order is the service's: star_count DESC,
 * created_at ASC (server/src/marketplace/ranking.ts). Nothing is re-sorted
 * here — a second sort in the client is a second ranking rule nobody
 * reviewed.
 */
export async function rankedAgents(
  opts: { limit?: number; offset?: number } = {},
): Promise<Result<RankedPage>> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 99);
  const offset = Math.max(opts.offset ?? 0, 0);
  // One extra row, discarded before display, to learn whether there is a
  // next page. The service clamps limit to 100, hence the 99 above.
  const probe = await attempt(`/agents?limit=${limit + 1}&offset=${offset}`);
  if (!probe.ok) return probe;

  const { status, body } = probe.value;
  if (status !== 200) {
    return no(messageFrom(body, `The service refused the listing (${status}).`));
  }
  const all = asAgents(body);
  return ok({ agents: all.slice(0, limit), offset, hasMore: all.length > limit });
}

/**
 * One agent by slug, or null when the service says there is no such slug.
 *
 * The token is not optional in practice, even though the type allows it.
 * The service scopes a draft to its author, so a call without one is a
 * call as a stranger: the author's own draft comes back as a 404. Passing
 * it is what makes the author's own work readable to them.
 */
export async function agentBySlug(
  slug: string,
  token?: string | null,
): Promise<Result<MarketAgent | null>> {
  const got = await attempt(`/agents/${encodeURIComponent(slug)}`, {
    ...(token ? { token } : {}),
  });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status === 404) return ok(null);
  if (status !== 200) {
    return no(messageFrom(body, `The service refused that agent (${status}).`));
  }
  return ok(asAgent(body));
}

/** The caller's own agents, drafts included. Newest first, as the service sends them. */
export async function myAgents(token: string): Promise<Result<MarketAgent[]>> {
  const got = await attempt("/agents/mine", { token });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status === 401) return no("That sign-in is no longer valid.");
  if (status !== 200) {
    return no(messageFrom(body, `The service refused your agents (${status}).`));
  }
  return ok(asAgents(body));
}

/**
 * Whether the caller has starred this agent, straight from the service.
 *
 * The only source of this answer. A star button rendered from anything
 * else — a local guess, a count that looks odd — can disagree with the
 * primary key that actually enforces one star per player.
 */
export async function starState(
  token: string,
  agentId: string,
): Promise<Result<boolean>> {
  const got = await attempt(`/agents/${encodeURIComponent(agentId)}/star`, { token });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status !== 200) {
    return no(messageFrom(body, `The service would not say (${status}).`));
  }
  return ok(Boolean(body["starred"]));
}

// ── Writes ───────────────────────────────────────────────────────────────

export type StarResult = { starred: boolean; starCount: number };

/** Stars an agent. Idempotent at the service, so a double click is harmless. */
export async function star(
  token: string,
  agentId: string,
): Promise<Result<StarResult>> {
  return setStar(token, agentId, "POST");
}

export async function unstar(
  token: string,
  agentId: string,
): Promise<Result<StarResult>> {
  return setStar(token, agentId, "DELETE");
}

async function setStar(
  token: string,
  agentId: string,
  method: "POST" | "DELETE",
): Promise<Result<StarResult>> {
  const got = await attempt(`/agents/${encodeURIComponent(agentId)}/star`, {
    method,
    token,
    // EMPTY_BODY, below. These routes take no payload, and still need one.
    body: {},
  });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status !== 200) {
    // 403 here is a real rule, not a fault: an author cannot star their
    // own agent, and only a published agent can be starred. The service's
    // own wording is passed through rather than reworded into something
    // that might not match what it enforced.
    return no(messageFrom(body, `The star did not go through (${status}).`));
  }
  return ok({
    starred: Boolean(body["starred"]),
    starCount: Number(body["starCount"] ?? 0),
  });
}

export type DraftInput = { name: string; role: string; personaBrief: string };

/** Writes a draft. Publishing is a separate, explicit step at the service. */
export async function createDraft(
  token: string,
  input: DraftInput,
): Promise<Result<MarketAgent>> {
  const got = await attempt("/agents", { method: "POST", token, body: { ...input } });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status !== 201) {
    // The service's validation messages name the field and its limits,
    // which is more use to an author than a generic refusal.
    return no(messageFrom(body, `The draft was not accepted (${status}).`));
  }
  return ok(asAgent(body));
}

/** Author-only at the service; this does not re-decide that. */
export async function setPublished(
  token: string,
  agentId: string,
  published: boolean,
): Promise<Result<MarketAgent>> {
  const path = `/agents/${encodeURIComponent(agentId)}/${
    published ? "publish" : "unpublish"
  }`;
  const got = await attempt(path, { method: "POST", token, body: {} });
  if (!got.ok) return got;

  const { status, body } = got.value;
  if (status !== 200) {
    return no(messageFrom(body, `That did not go through (${status}).`));
  }
  return ok(asAgent(body));
}
