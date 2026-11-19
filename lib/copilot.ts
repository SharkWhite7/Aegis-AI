/**
 * Section 03's own copy. The six voices themselves live in personas.ts and
 * are fixed; this is only what they say to one line.
 *
 * The line is a statement, not a question. Players do not ask tidy
 * questions — they say a thing and the co-pilot answers it. It also splits
 * six ways on its own: the Hustler hears a deadline, the DJ hears a drive,
 * the Mechanic hears a job, the Strategist hears a scope, the Companion
 * hears a person, the Fixer hears a window closing.
 */
export const PROMPT_LINE = "i've got three hours before i log off";

/**
 * One answer per voice, keyed by persona id. Range is 78-92 characters, so
 * every answer sets within one line of the others at the same measure and
 * the roster keeps an even rhythm. That is a copy constraint, not a CSS one.
 */
export const ANSWERS: Record<string, string> = {
  hustler:
    "three hours is two flips. stop test-driving the inventory and go see the buyer.",
  dj: "then you're driving, not working. i'll put something on that lasts all three.",
  mechanic:
    "three hours gets the rear bushing done and a shakedown run. then the noise is gone.",
  strategist:
    "then don't start anything with a second half. pick something that ends when you do.",
  companion:
    "you said two hours last night and logged off at four. i'm just saying it out loud.",
  fixer:
    "marisol's at the yard till four. after that nobody answers and you've lost the window.",
};
