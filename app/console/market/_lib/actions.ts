"use server";

/**
 * The marketplace's mutations.
 *
 * Every one re-reads the session cookie and resolves it against the
 * service before doing anything. A Server Action is reachable by a direct
 * POST, not only through the form that renders it, so an action that
 * trusts its caller is an open endpoint with a nicer name. The screen
 * having checked is not a check.
 *
 * None of these decide authorship or star eligibility. The service owns
 * both — an author cannot star their own agent, and only an author can
 * change visibility — and a second copy of those rules here would be a
 * second thing to keep in step. What arrives from the service is reported
 * as it was worded.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "../../_lib/config";
import { whoAmI } from "../../_lib/backend";
import { NO_STATE, type MarketState } from "./state";
import {
  createDraft,
  setPublished,
  star,
  unstar,
  type MarketAgent,
} from "../../_lib/market";

/**
 * The caller's token, or why there isn't one.
 *
 * Three outcomes, not two. `whoAmI` throws when the service cannot be
 * reached, and returning null for that would make every action below
 * answer "You are not signed in" — a statement about the player's session
 * that nothing checked. An action that cannot tell says so.
 */
type Auth =
  | { ok: true; token: string | null }
  | { ok: false; reason: string };

async function token(): Promise<Auth> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (!value) return { ok: true, token: null };
  try {
    // A cookie being present proves nothing: the session may have been
    // revoked since. Resolving it against the service is the actual check.
    const player = await whoAmI(value);
    return { ok: true, token: player ? value : null };
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

const failed = (error: string): MarketState => ({ error, note: null });
const did = (note: string): MarketState => ({ error: null, note });

const field = (form: FormData, name: string): string =>
  String(form.get(name) ?? "").trim();

/**
 * Stars or unstars, then makes the screens re-read the real state.
 *
 * The action deliberately returns no star count. The button renders the
 * count and the starred flag from what the page last read off the
 * service, and `revalidatePath` is what refreshes that. Handing a count
 * back for the client to display would create a second, divergeable copy
 * of a number the agent_star primary key is the only authority on.
 */
export async function toggleStar(
  _previous: MarketState,
  form: FormData,
): Promise<MarketState> {
  const auth = await token();
  if (!auth.ok) return failed(auth.reason);
  if (!auth.token) return failed("You are not signed in.");

  const agentId = field(form, "agentId");
  const slug = field(form, "slug");
  const wanted = field(form, "intent") === "star";
  if (!agentId) return failed("No agent.");

  const result = wanted ? await star(auth.token, agentId) : await unstar(auth.token, agentId);
  if (!result.ok) return failed(result.reason);

  // Both screens show star state, and the ranking is sorted on it.
  if (slug) revalidatePath(`/console/market/${slug}`);
  revalidatePath("/console/market");
  return NO_STATE;
}

/**
 * Writes a draft.
 *
 * The lengths are not validated here beyond emptiness. The service's
 * limits (name 2-60, role 2-80, brief 20-2000) are the real ones and it
 * names the field it rejected, so its message reaches the author intact
 * rather than being replaced by a looser guess at the same rule.
 */
export async function writeDraft(
  _previous: MarketState,
  form: FormData,
): Promise<MarketState> {
  // Read before anything can fail, so every failing path below can hand
  // the author's text back to the form.
  const name = field(form, "name");
  const role = field(form, "role");
  const personaBrief = field(form, "personaBrief");
  const typed = { name, role, personaBrief };
  const lost = (error: string): MarketState => ({ error, note: null, draft: typed });

  const auth = await token();
  if (!auth.ok) return lost(auth.reason);
  if (!auth.token) return lost("You are not signed in.");

  if (!name || !role || !personaBrief) {
    return lost("A name, a role and a persona brief — all three.");
  }

  const result = await createDraft(auth.token, typed);
  if (!result.ok) return lost(result.reason);

  revalidatePath("/console/market/mine");
  const agent: MarketAgent = result.value;
  return did(`Saved “${agent.name}” as a draft. It is not listed until you publish it.`);
}

/** Publishes or unpublishes. Author-only, enforced at the service. */
export async function changeVisibility(
  _previous: MarketState,
  form: FormData,
): Promise<MarketState> {
  const auth = await token();
  if (!auth.ok) return failed(auth.reason);
  if (!auth.token) return failed("You are not signed in.");

  const agentId = field(form, "agentId");
  const publish = field(form, "intent") === "publish";
  if (!agentId) return failed("No agent.");

  const result = await setPublished(auth.token, agentId, publish);
  if (!result.ok) return failed(result.reason);

  const agent = result.value;
  revalidatePath("/console/market/mine");
  revalidatePath("/console/market");
  revalidatePath(`/console/market/${agent.slug}`);
  // No success note on purpose: the row moving between Drafts and
  // Published is the feedback, and it comes from re-reading the service.
  // See VisibilityButton.
  return NO_STATE;
}
