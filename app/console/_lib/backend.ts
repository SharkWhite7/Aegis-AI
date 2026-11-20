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

type Json = Record<string, unknown>;

async function call(
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
