/**
 * The shape an action reports back in, and its resting value.
 *
 * In its own module because a `"use server"` file may export async
 * functions and nothing else — a plain object exported from actions.ts
 * compiles and builds clean, then fails at request time with
 * `A "use server" file can only export async functions, found object`.
 * A type would survive there, being erased, but the initial value cannot.
 */
export type MarketState = {
  /** Shown to the person who submitted. Null when nothing went wrong. */
  error: string | null;
  /** A plain statement of what happened, when something did. */
  note: string | null;
  /**
   * What the author had typed, echoed back when the write failed.
   *
   * React resets an uncontrolled form once its action completes, which
   * would throw away up to 2,000 characters of someone's writing on a
   * failure they did not cause. The inputs take these as their
   * defaultValue, so the reset puts the text back instead of clearing it.
   * Null on success, which is what empties the form.
   */
  draft?: { name: string; role: string; personaBrief: string } | null;
};

export const NO_STATE: MarketState = { error: null, note: null, draft: null };
