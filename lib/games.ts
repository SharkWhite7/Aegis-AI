import type { Turn } from "./personas";

/**
 * The hero's game control. Four titles, deliberately of four different
 * kinds: picking four open-world crime games would only prove we can
 * swap street names. Elden Ring is the hard case — no car, no radio, no
 * money to flip — and its transcript carries no track line at all,
 * because there is nothing to score. That absence is the proof.
 *
 * Titles are named for compatibility, as plain text. No logos, no marks,
 * no implied endorsement.
 */
export type Game = {
  id: string;
  /** Shown in the control. */
  label: string;
  /** Which of the six fits this world. The roster is the same six. */
  persona: string;
  turns: Turn[];
  /** Omitted where the game has no music to take over. */
  nowPlaying?: string;
};

export const GAMES: Game[] = [
  {
    id: "gta6",
    label: "GTA VI",
    persona: "The Hustler",
    turns: [
      { t: "22:14", text: "you pulled off the freeway. we doing this or not?" },
      { t: "22:14", text: "buyer in little havana wants the coupe. forty grand, no guns." },
      { t: "22:15", who: "you", text: "how long" },
      { t: "22:15", text: "eleven minutes on the causeway. nine if you stop asking." },
      { t: "22:16", text: "putting something on for the drive." },
    ],
    nowPlaying: "night tape — side b",
  },
  {
    id: "rdr2",
    label: "Red Dead II",
    persona: "The Fixer",
    turns: [
      { t: "19:40", text: "the fence at emerald ranch shut an hour ago. van horn keeps odd hours." },
      { t: "19:41", text: "not the valentine road. there's been a patrol on that bridge since tuesday." },
      { t: "19:42", who: "you", text: "what's it worth" },
      { t: "19:42", text: "less than you think. he knows you rode two days to reach him." },
      { t: "19:44", text: "leave the horse at the treeline. it's recognisable and so are you." },
    ],
    // No track line either: it is 1899 and there is no radio to take over.
    // Two of the four worlds have no music, which is the honest shape of
    // the feature — it applies where music exists, and nowhere else.
  },
  {
    id: "forza",
    label: "Forza Horizon",
    persona: "The Mechanic",
    turns: [
      { t: "14:08", text: "you're giving away half a second in the third sector. it isn't the engine." },
      { t: "14:09", text: "rears are two psi over. take it out before you run it again." },
      { t: "14:09", who: "you", text: "just give me more power" },
      { t: "14:10", text: "you have eight hundred and you brake in a straight line. no." },
      { t: "14:12", text: "gearing's wrong for this route. fourth runs out before the crest." },
    ],
    nowPlaying: "drive tape — side a",
  },
  {
    id: "eldenring",
    label: "Elden Ring",
    persona: "The Strategist",
    turns: [
      { t: "02:51", text: "two ways into the keep. i threw one of them out before you got here." },
      { t: "02:52", text: "you've died here three times and rolled left every time. he knows that." },
      { t: "02:53", who: "you", text: "i can take him" },
      { t: "02:53", text: "not from the front, and not with that shield on your back." },
      { t: "02:55", text: "take the lift and come in from above. the fight is shorter that way." },
    ],
    // No track line: there is no radio in this world, and the companion
    // knows it. Saying nothing here says more than a line of copy would.
  },
];

export const DEFAULT_GAME = GAMES[0].id;
