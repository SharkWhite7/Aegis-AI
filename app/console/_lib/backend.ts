/**
 * The web app's client for the companion service.
 *
 * The service is a separate process; this is the only place the app talks
 * to it, so the service token never leaks into a component.
 */

/*
 * NOTE: this module is server-only, and nothing enforces that.
 *
 * The `server-only` package turns an accidental import from a client
 * component into a build error. It is not a dependency here and adding
 * one would mean editing the site's package.json, which is outside this
 * work's remit. Without it, such an import would fail quietly instead:
 * a non-NEXT_PUBLIC_ variable is `undefined` in a client bundle, so the
 * service token would not leak, but the call would misbehave.
 *
 * Worth adding the package the next time package.json is in scope.
 */

import { BACKEND_URL, SERVICE_TOKEN } from "./config";

export class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export type Json = Record<string, unknown>;

export async function call(
  path: string,
  init: { method?: string; body?: Json; token?: string; service?: boolean } = {},
): Promise<{ status: number; body: Json }> {
  if (!BACKEND_URL) {
    throw new BackendUnavailableError("AEGIS_BACKEND_URL is not configured");
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers["authorization"] = `Bearer ${init.token}`;
  if (init.service) headers["x-aegis-service"] = SERVICE_TOKEN;

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method: init.method ?? "GET",
      headers,
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      // A screen should fail fast rather than hang on a dead service.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (cause) {
    throw new BackendUnavailableError(
      cause instanceof Error ? cause.message : "could not reach the companion service",
    );
  }

  const text = await response.text();
  let body: Json = {};
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = { error: "bad_response", message: text.slice(0, 200) };
    }
  }
  return { status: response.status, body };
}

export type SignedInPlayer = {
  id: string;
  handle: string;
  displayName: string | null;
};

/** Resolves the session cookie to a player, or null if it is not valid. */
export async function whoAmI(token: string): Promise<SignedInPlayer | null> {
  const { status, body } = await call("/auth/me", { token });
  if (status !== 200) return null;
  return (body["player"] as SignedInPlayer | undefined) ?? null;
}

export async function signInWithDiscord(identity: {
  discordId: string;
  username: string;
  displayName?: string | null;
}): Promise<{ token: string; player: SignedInPlayer }> {
  const { status, body } = await call("/auth/discord", {
    method: "POST",
    service: true,
    body: {
      discordId: identity.discordId,
      username: identity.username,
      ...(identity.displayName ? { displayName: identity.displayName } : {}),
    },
  });
  if (status !== 200 && status !== 201) {
    throw new BackendUnavailableError(
      `the companion service refused the sign-in (${status})`,
    );
  }
  return {
    token: body["token"] as string,
    player: body["player"] as SignedInPlayer,
  };
}

export async function signOut(token: string): Promise<void> {
  // Best effort: the cookie is cleared either way, so a service that is
  // down must not trap someone in a session they asked to leave.
  try {
    await call("/auth/signout", { method: "POST", token });
  } catch {
    /* ignored on purpose */
  }
}

// ── The companion ────────────────────────────────────────────────────────

export type Agent = {
  id: string;
  slug: string;
  name: string;
  role: string;
  source: "builtin" | "community";
  starCount: number;
};

export type GameProfile = {
  id: string;
  slug: string;
  title: string;
  status: "generated" | "pre_release" | "unknown";
};

export type Turn = {
  id: string;
  seq: number;
  role: "player" | "copilot";
  text: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  gameProfileId: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  turnCount: number;
};

export async function listAgents(): Promise<Agent[]> {
  const { status, body } = await call("/agents?limit=50");
  if (status !== 200) return [];
  return (body["agents"] as Agent[] | undefined) ?? [];
}

export async function startSession(
  token: string,
  input: { gameTitle: string; agentId: string },
): Promise<{ session: ChatSession; profile: GameProfile; agent: Agent }> {
  const { status, body } = await call("/chat/sessions", {
    method: "POST",
    token,
    body: { gameTitle: input.gameTitle, agentId: input.agentId },
  });
  if (status !== 201) {
    throw new BackendUnavailableError(
      (body["message"] as string | undefined) ?? `could not start a session (${status})`,
    );
  }
  return body as unknown as { session: ChatSession; profile: GameProfile; agent: Agent };
}

export type TurnResult = {
  refused: boolean;
  copilotTurn: Turn | null;
  latencyMs: number;
};

export async function takeTurn(
  token: string,
  sessionId: string,
  text: string,
): Promise<TurnResult> {
  const { status, body } = await call(`/chat/sessions/${sessionId}/turns`, {
    method: "POST",
    token,
    body: { text },
  });
  // 422 is the companion declining, which is a real outcome and not an
  // error to hide: the caller shows that nothing was said.
  if (status !== 200 && status !== 422) {
    throw new BackendUnavailableError(
      (body["message"] as string | undefined) ?? `the turn failed (${status})`,
    );
  }
  return {
    refused: Boolean(body["refused"]),
    copilotTurn: (body["copilotTurn"] as Turn | null) ?? null,
    latencyMs: Number(body["latencyMs"] ?? 0),
  };
}

export async function getTurns(token: string, sessionId: string): Promise<Turn[]> {
  const { status, body } = await call(`/chat/sessions/${sessionId}/turns`, { token });
  if (status !== 200) return [];
  return (body["turns"] as Turn[] | undefined) ?? [];
}

export type EndResult = {
  session: ChatSession;
  debrief: { memoriesStored: number; summarySource: string } | null;
};

export async function endSession(
  token: string,
  sessionId: string,
): Promise<EndResult> {
  const { status, body } = await call(`/chat/sessions/${sessionId}/end`, {
    method: "POST",
    token,
    body: {},
  });
  if (status !== 200) {
    throw new BackendUnavailableError(`could not close the session (${status})`);
  }
  return body as unknown as EndResult;
}
