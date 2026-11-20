import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DISCORD_CLIENT_ID,
  DISCORD_REDIRECT_URI,
  STATE_COOKIE,
  signInReadiness,
} from "../../_lib/config";

/**
 * Sends the player to Discord.
 *
 * Only the `identify` scope is asked for: the id and the username, and no
 * email. Anything more would be collected for no reason, and the first
 * thing a player sees should not be a consent screen asking for their
 * inbox.
 */
export async function GET(): Promise<NextResponse> {
  const readiness = signInReadiness();
  if (!readiness.ready) {
    // The front door already says this; a direct hit on the route should
    // not fall through to a broken redirect.
    return NextResponse.json(
      {
        error: "not_configured",
        message: "sign-in is not configured in this build",
        missing: readiness.missing,
      },
      { status: 503 },
    );
  }

  // Binds the callback to this browser: without it, anyone could feed a
  // code to the callback and sign somebody in.
  const state = randomBytes(16).toString("base64url");

  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", DISCORD_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/console",
    maxAge: 600,
  });
  return response;
}
