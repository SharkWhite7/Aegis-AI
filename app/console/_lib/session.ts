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
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./config";
import { whoAmI, type SignedInPlayer } from "./backend";

/**
 * The signed-in player, or null.
 *
 * `cookies()` is async in Next 16 — a synchronous read is no longer
 * available — and reading it opts the route out of prerendering, which is
 * correct here: an app screen is per-player by definition.
 */
export async function currentPlayer(): Promise<SignedInPlayer | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await whoAmI(token);
  } catch {
    // The service being unreachable is not the same as being signed out,
    // but from a screen's point of view there is nothing to show either
    // way. The caller decides what to say.
    return null;
  }
}
