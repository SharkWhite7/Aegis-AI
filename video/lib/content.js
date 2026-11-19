/**
 * Copy for the video pieces.
 *
 * Every string here is lifted verbatim from lib/personas.ts, lib/site.ts
 * and docs/brief.md on main. Nothing is rewritten for the camera and
 * nothing is invented: the lines are the product's own approved copy, which
 * is the only claim these pieces make.
 *
 * Order is dramatic, not the source order. Money first, then the two that
 * argue with the player, then the cold read, then the turn — the Companion
 * line is the shortest and lands hardest after four long ones — then the
 * Fixer to close on something the player did not know.
 */

export const SITE = {
  name: "AEGIS AI",
  tagline: "Your World. Your AI. Your Story.",
  build: "0.1.0",
  stage: "PRE-ALPHA",
};

export const VOICES = [
  {
    id: "hustler",
    name: "The Hustler",
    role: "Business partner. Deals, flips, margins.",
    specialty: "Money without a gun",
    wontDo: "No guns. No loans.",
    t: "23:03",
    line: "you cleared six grand last session and spent nine. i'm not a bank.",
  },
  {
    id: "mechanic",
    name: "The Mechanic",
    role: "What to build, and what to walk from.",
    specialty: "Builds, tuning, resale",
    wontDo: "Won't admire the paint",
    t: "09:06",
    line: "you don't need more power. you've got six hundred and you brake like a tourist.",
  },
  {
    id: "dj",
    name: "The DJ",
    role: "Scores the night. You do not pick the song.",
    specialty: "Scoring, tempo, night tape",
    wontDo: "Will not take requests",
    t: "01:51",
    line: "that was 96 bpm and you were doing thirty. the record was not the problem.",
  },
  {
    id: "strategist",
    name: "The Strategist",
    role: "Reads the board. Routes, odds, an exit.",
    specialty: "Routes, odds, contingency",
    wontDo: "Improvise. Or flatter you",
    t: "01:42",
    line: "you break left when you're rushed. every time. the gate is on the right.",
  },
  {
    id: "companion",
    name: "The Companion",
    role: "Keeps the record of you, and reads it back.",
    specialty: "Memory, and plain questions",
    wontDo: "Pretend it forgot",
    t: "01:11",
    line: "how are you. not the drive. you.",
  },
  {
    id: "fixer",
    name: "The Fixer",
    role: "Who to call. Which door is open.",
    specialty: "Contacts, doors, exits",
    wontDo: "Never names his sources",
    t: "03:02",
    line: "reyes is out tonight. his brother's in town and he gets honest around family.",
  },
];

/** The Companion's memory line — the whole argument for the product. */
export const MEMORY_LINE = {
  t: "01:03",
  name: "The Companion",
  line: "last thursday you told me you were done with the strip. we're on the strip.",
};

/** The four-part assembly from the brief's architecture diagram. */
export const STACK = [
  ["GAME PROFILE", "generated from the title. nothing else."],
  ["PERSONALITY", "one of six. or one you bought."],
  ["MEMORY", "every session before this one."],
  ["LIVE CONTEXT", "screen, audio, input. right now."],
];

/**
 * The build, from lib/progress.ts on main. The denominator is real: these
 * are the project's actual stages, and a stage flips to shipped in that
 * file, in that repo, which is why the bar moves on a commit.
 */
export const STAGES = [
  ["01", "Product definition", "SHIPPED"],
  ["02", "Design system", "SHIPPED"],
  ["03", "The six voices", "SHIPPED"],
  ["04", "This site", "BUILDING"],
  ["05", "Waitlist", "QUEUED"],
  ["06", "Game profile generator", "QUEUED"],
  ["07", "Persistent memory", "QUEUED"],
  ["08", "Companion runtime", "QUEUED"],
  ["09", "Voice, in and out", "QUEUED"],
  ["10", "Live context", "QUEUED"],
  ["11", "Private alpha", "QUEUED"],
];

/** docs/brief.md, "Banned outright". Verbatim, trimmed to six for timing. */
export const BANNED = [
  "border-radius above 2px",
  "box-shadow",
  "backdrop-filter / glassmorphism",
  "colour gradients as decoration",
  "generic icon sets in feature cards",
  "pill-shaped buttons",
];

/**
 * components/sections/Access.tsx, verbatim.
 *
 * This replaced a mailing-list promise that main dropped while this piece
 * was being cut. A video quoting copy the site no longer carries would
 * promise a signup that does not exist — the same failure the campaign
 * exists to avoid, arriving by staleness rather than by invention. Check
 * this string against the section before every re-render.
 */
export const ACCESS_COPY =
  "What it shows is where the build actually stands.";
