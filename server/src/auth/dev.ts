/**
 * A sign-in for development only.
 *
 * It exists because the funnel cannot be exercised end to end without a
 * way in, and the Discord application does not exist yet. It mints a real
 * session for a named handle with no proof of anything, which is exactly
 * as dangerous as it sounds.
 *
 * So the gate is deliberately two conditions, not one, and neither is a
 * default:
 *
 *   NODE_ENV must not be "production"   AND   AEGIS_DEV_SIGNIN must be
 *   set to the exact opt-in string below.
 *
 * A single flag is too easy to set by accident in a deploy; a flag that
 * also has to survive NODE_ENV=production is not. `devSignInAllowed` is
 * pure and tested, so the thing that decides this is not buried in a
 * start-up script.
 *
 * Delete this file when Discord sign-in works.
 */

export const DEV_SIGNIN_OPT_IN = "yes-i-know-this-is-not-auth";

export type EnvLike = {
  NODE_ENV?: string | undefined;
  AEGIS_DEV_SIGNIN?: string | undefined;
};

export function devSignInAllowed(env: EnvLike): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.AEGIS_DEV_SIGNIN === DEV_SIGNIN_OPT_IN;
}
