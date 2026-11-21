"use server";

/**
 * The app's mutations.
 *
 * Every one of these re-reads the session cookie before doing anything.
 * That is not belt-and-braces: a Server Action is reachable by a direct
 * POST, not only through the UI that renders it, so an action that trusts
 * its caller is an open endpoint with a nicer name.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./config";
import {
  endSession as endSessionCall,
  startSession as startSessionCall,
  whoAmI,
} from "./backend";

/** The caller's token, or null when they are not signed in. */
async function token(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  // Resolving it against the service is the actual check; a cookie being
  // present proves nothing, since the session may have been revoked.
  const player = await whoAmI(value);
  return player ? value : null;
}

export type FormState = { error: string | null };

export async function beginSession(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const auth = await token();
  if (!auth) return { error: "You are not signed in." };

  const gameTitle = String(form.get("gameTitle") ?? "").trim();
  const agentId = String(form.get("agentId") ?? "").trim();

  if (gameTitle.length < 2) {
    return { error: "Name a game — any game. Two characters at least." };
  }
  if (!agentId) return { error: "Pick a voice." };

  let sessionId: string;
  try {
    const started = await startSessionCall(auth, { gameTitle, agentId });
    sessionId = started.session.id;
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "The companion service did not answer.",
    };
  }
  // redirect() throws, so it must sit outside the try above or it would be
  // caught and reported as a failure.
  redirect(`/console/play/${sessionId}`);
}

export async function finishSession(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const auth = await token();
  if (!auth) return { error: "You are not signed in." };

  const sessionId = String(form.get("sessionId") ?? "");
  if (!sessionId) return { error: "No session." };

  try {
    await endSessionCall(auth, sessionId);
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : "Could not close the session.",
    };
  }
  redirect("/console");
}
