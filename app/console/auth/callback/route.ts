import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  SESSION_COOKIE,
  STATE_COOKIE,
  signInReadiness,
} from "../../_lib/config";
import { signInWithDiscord } from "../../_lib/backend";

const sameState = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const back = (request: NextRequest, reason: string): NextResponse => {
  const url = new URL("/console", request.url);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
};

/** Where Discord sends the player back. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!signInReadiness().ready) return back(request, "not_configured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;

  // A mismatched or missing state means this callback was not started by
  // this browser. Nothing is exchanged.
  if (!code || !sameState(state ?? undefined, expected)) {
    return back(request, "bad_state");
  }

  let discordToken: string;
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) return back(request, "discord_refused");
    discordToken = ((await tokenResponse.json()) as { access_token?: string })
      .access_token ?? "";
    if (!discordToken) return back(request, "discord_refused");
  } catch {
    return back(request, "discord_unreachable");
  }

  let identity: { id?: string; username?: string; global_name?: string | null };
  try {
    const me = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${discordToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!me.ok) return back(request, "discord_refused");
    identity = (await me.json()) as typeof identity;
  } catch {
    return back(request, "discord_unreachable");
  }

  if (!identity.id || !identity.username) return back(request, "discord_refused");

  let session: { token: string };
  try {
    session = await signInWithDiscord({
      discordId: identity.id,
      username: identity.username,
      displayName: identity.global_name ?? null,
    });
  } catch {
    return back(request, "service_unavailable");
  }

  const response = NextResponse.redirect(new URL("/console", request.url));
  response.cookies.delete(STATE_COOKIE);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Matches the service's own session lifetime.
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
