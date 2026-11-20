/**
 * What the app needs from the environment, and what it does when a piece
 * is missing.
 *
 * Nothing here throws at import time. A missing setting makes the screen
 * that needs it say so plainly, which is more useful than a 500 and more
 * honest than a sign-in button that cannot work.
 */

export const BACKEND_URL = process.env["AEGIS_BACKEND_URL"] ?? "";
export const SERVICE_TOKEN = process.env["AEGIS_SERVICE_TOKEN"] ?? "";
export const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
export const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";
export const DISCORD_REDIRECT_URI = process.env["DISCORD_REDIRECT_URI"] ?? "";

export const SESSION_COOKIE = "aegis_session";
/** Guards the OAuth round trip against cross-site forgery. */
export const STATE_COOKIE = "aegis_oauth_state";

export type Readiness = {
  ready: boolean;
  /** Names of the settings that are missing, for an honest message. */
  missing: string[];
};

export function signInReadiness(): Readiness {
  const missing: string[] = [];
  if (!BACKEND_URL) missing.push("AEGIS_BACKEND_URL");
  if (!SERVICE_TOKEN) missing.push("AEGIS_SERVICE_TOKEN");
  if (!DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  if (!DISCORD_CLIENT_SECRET) missing.push("DISCORD_CLIENT_SECRET");
  if (!DISCORD_REDIRECT_URI) missing.push("DISCORD_REDIRECT_URI");
  return { ready: missing.length === 0, missing };
}
