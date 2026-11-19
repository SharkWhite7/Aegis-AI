/**
 * Game profiles for section 04.
 *
 * Every value here is something widely known about a released game. The
 * flagship is the exception and the point: GTA VI is announced and not
 * shipped, so its profile is mostly blank and says so. A spec sheet
 * asserting an unreleased game's economy would be the same honesty
 * failure the Premise record block had to be rebuilt to avoid — and on a
 * site for a GTA VI companion, restraint about GTA VI is the most
 * credible thing on the page.
 */

export type Profile = {
  id: string;
  title: string;
  /** Matched against typed input, normalised. */
  aliases: string[];
  /** Right side of the card header. */
  status: "generated" | "pre-release";
  /** Empty string renders as an em dash: known to be unknown. */
  fields: Array<[string, string]>;
  /** Overrides the default footer line. */
  note?: string;
};

export const PROFILE_FIELDS = [
  "World",
  "Economy",
  "Traversal",
  "Pressure",
  "Vocabulary",
  "Lead voice",
] as const;

const F = (
  world: string,
  economy: string,
  traversal: string,
  pressure: string,
  vocabulary: string,
  lead: string,
): Array<[string, string]> => [
  ["World", world],
  ["Economy", economy],
  ["Traversal", traversal],
  ["Pressure", pressure],
  ["Vocabulary", vocabulary],
  ["Lead voice", lead],
];

export const PROFILES: Profile[] = [
  {
    id: "gta6",
    title: "GTA VI",
    aliases: ["gta vi", "gta 6", "gta6", "grand theft auto vi", "grand theft auto 6"],
    status: "pre-release",
    fields: F("leonida. announced, not shipped.", "", "", "", "", "the hustler"),
    note: "Nothing here is guessed. The profile is written from the game, and the game is not out yet.",
  },
  {
    id: "eldenring",
    title: "Elden Ring",
    aliases: ["elden ring", "eldenring", "elden"],
    status: "generated",
    fields: F(
      "open, hostile, and unmarked",
      "runes. dropped where you died.",
      "torrent, and sites of grace",
      "constant. nothing is optional.",
      "grace, flask, poise, runes",
      "the strategist",
    ),
  },
  {
    id: "rdr2",
    title: "Red Dead Redemption II",
    aliases: ["red dead redemption 2", "red dead redemption ii", "red dead ii", "red dead 2", "rdr2", "rdr 2", "red dead"],
    status: "generated",
    fields: F(
      "1899. the frontier closing.",
      "cash, bounties, camp funds",
      "a horse, and patience",
      "lawmen, weather, your own camp",
      "fence, bounty, honour, provisions",
      "the fixer",
    ),
  },
  {
    id: "forza",
    title: "Forza Horizon",
    aliases: ["forza horizon", "forza", "horizon"],
    status: "generated",
    fields: F(
      "a festival with roads attached",
      "credits, cars, the auction house",
      "the car is the whole game",
      "the clock and the leaderboard",
      "tune, grip, sector, drivetrain",
      "the mechanic",
    ),
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk 2077",
    aliases: ["cyberpunk 2077", "cyberpunk", "cp2077", "2077"],
    status: "generated",
    fields: F(
      "night city. vertical and loud.",
      "eddies, and what you bolt on",
      "car, bike, and too many stairs",
      "a countdown you did not choose",
      "ripperdoc, eddies, braindance",
      "the fixer",
    ),
  },
  {
    id: "minecraft",
    title: "Minecraft",
    aliases: ["minecraft", "mine craft"],
    status: "generated",
    fields: F(
      "whatever you have dug so far",
      "what you carry, and what you lost",
      "on foot until you build better",
      "nightfall, and your own ambition",
      "nether, redstone, spawn, bedrock",
      "the companion",
    ),
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Null means no profile on file — which is a real answer, not a failure. */
export function matchProfile(query: string): Profile | null {
  const n = norm(query);
  if (n.length < 2) return null;
  return (
    PROFILES.find((p) => p.aliases.some((a) => norm(a).startsWith(n))) ??
    PROFILES.find((p) => p.aliases.some((a) => norm(a).includes(n))) ??
    null
  );
}

export const ON_FILE = PROFILES.filter((p) => p.status === "generated");

/* Every state carries a footer line, so the card does not change height
   while someone is typing into it. */
export const NOTE_GENERATED =
  "Written from the title alone. Nothing is read from the game, and nothing is written to it.";

export const NOTE_UNKNOWN =
  "No profile on file. VICE AI writes one the first time you launch it.";

export const NOTE_WAITING =
  "Type anything you play. There is no supported-games list to be on.";
