/**
 * Who is looking, or why that cannot be said.
 *
 * Two screens need the viewer's token as well as their identity — the
 * token because `/agents/:slug` scopes a draft to its author, and the
 * identity because an author sees different controls. `currentPlayer()`
 * in the console's shared lib returns the player without the token and
 * collapses an unreachable service into `null`, which is the wrong shape
 * here on both counts.
 *
 * The important part is the third state. `whoAmI` throws when the service
 * cannot be reached, and a page that treats that as `null` tells the
 * player they are not signed in — an assertion about their session that
 * nothing checked. "Signed out" and "cannot tell" are different facts,
 * so they are different results.
 */

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../_lib/config";
import { whoAmI, type SignedInPlayer } from "../../_lib/backend";

export type Viewer =
  | { ok: true; token: string | null; player: SignedInPlayer | null }
  | { ok: false; reason: string };

export async function viewer(): Promise<Viewer> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? null;

  // No cookie is a fact, not a failure: nobody is signed in, and no
  // request is needed to know it.
  if (!token) return { ok: true, token: null, player: null };

  try {
    // A null player here is also a fact: the service was asked and said
    // the session is no longer valid.
    return { ok: true, token, player: await whoAmI(token) };
  } catch (cause) {
    return {
      ok: false,
      reason:
        cause instanceof Error
          ? `The companion service did not answer: ${cause.message}`
          : "The companion service did not answer.",
    };
  }
}
