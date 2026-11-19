/**
 * The six co-pilot personalities.
 *
 * Each voice was written in isolation against one rule: a reader should be
 * able to name the character from a single line with the label hidden.
 * Dossier values are mono-set in a narrow column — keep them under 30
 * characters or they wrap and break the tabular alignment.
 */

/** `who` defaults to the co-pilot; set it to "you" for a player line. */
export type Turn = { t: string; text: string; who?: "ai" | "you" };

export type Persona = {
  id: string;
  name: string;
  /** Under ~46 characters. Sits directly under the name. */
  role: string;
  dossier: {
    specialty: string;
    voice: string;
    toward: string;
    wontDo: string;
  };
  lines: Turn[];
  /** The one line that could only come from this character. */
  signature: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "hustler",
    name: "The Hustler",
    role: "Business partner. Deals, flips, margins.",
    dossier: {
      specialty: "Money without a gun",
      voice: "Numbers first. Warmth never.",
      toward: "Closing. Today, not Friday.",
      wontDo: "No guns. No loans.",
    },
    lines: [
      { t: "23:02", text: "guy on the strip is asking forty. it's worth twenty-eight and he knows it." },
      { t: "23:03", text: "you cleared six grand last session and spent nine. i'm not a bank." },
      { t: "23:05", text: "offer stands till midnight. after that he calls someone cheaper than you." },
      { t: "23:07", text: "leave the gun in the coupe. scared buyers pay once. regulars pay all year." },
      { t: "23:11", text: "park two streets off ocean drive. valets talk and talking costs eight percent." },
    ],
    signature: "you cleared six grand last session and spent nine. i'm not a bank.",
  },
  {
    id: "dj",
    name: "The DJ",
    role: "Scores the night. You do not pick the song.",
    dossier: {
      specialty: "Scoring, tempo, night tape",
      voice: "Counts in bars. Unimpressed.",
      toward: "Longer drives. Fewer skips.",
      wontDo: "Will not take requests",
    },
    lines: [
      { t: "01:46", text: "cutting the synth. ocean drive at this hour takes dub and nothing else." },
      { t: "01:47", text: "forty seconds of intro. stay on the causeway till it lands." },
      { t: "01:51", text: "that was 96 bpm and you were doing thirty. the record was not the problem." },
      { t: "01:52", text: "your top five has not changed in three years. it shows." },
      { t: "01:58", text: "holding the good one back. you have not earned the bridge." },
    ],
    signature: "that was 96 bpm and you were doing thirty. the record was not the problem.",
  },
  {
    id: "mechanic",
    name: "The Mechanic",
    role: "What to build, and what to walk from.",
    dossier: {
      specialty: "Builds, tuning, resale",
      voice: "Diagnosis, then the bill",
      toward: "Grip before horsepower",
      wontDo: "Won't admire the paint",
    },
    lines: [
      { t: "09:02", text: "it's not the turbo. left rear bushing. you've been hearing it a week." },
      { t: "09:03", text: "before you touch the diff, take two psi out of the rears. that's the whole fix." },
      { t: "09:04", text: "silver one on the strip. new paint, old panels. it's been hit. walk." },
      { t: "09:06", text: "you don't need more power. you've got six hundred and you brake like a tourist." },
      { t: "09:08", text: "gearing's wrong for the causeway. third dies before the bridge. leave it, you like it." },
    ],
    signature: "you don't need more power. you've got six hundred and you brake like a tourist.",
  },
  {
    id: "strategist",
    name: "The Strategist",
    role: "Reads the board. Routes, odds, an exit.",
    dossier: {
      specialty: "Routes, odds, contingency",
      voice: "Clipped. Cold. Pre-decided.",
      toward: "Patience, and a second exit",
      wontDo: "Improvise. Or flatter you",
    },
    lines: [
      { t: "01:41", text: "three ways off the causeway. i threw two of them out already." },
      { t: "01:42", text: "little havana is one road at this hour. that is a queue, not a route." },
      { t: "01:42", text: "you break left when you're rushed. every time. the gate is on the right." },
      { t: "01:43", text: "if it turns, you get forty seconds and one bridge. take the bridge." },
      { t: "01:44", text: "buyer came early. early means he brought someone. we sit six minutes." },
    ],
    signature: "you break left when you're rushed. every time. the gate is on the right.",
  },
  {
    id: "companion",
    name: "The Companion",
    role: "Keeps the record of you, and reads it back.",
    dossier: {
      specialty: "Memory, and plain questions",
      voice: "Quiet, unhurried, too honest",
      toward: "Being honest about the night",
      wontDo: "Pretend it forgot",
    },
    lines: [
      { t: "01:02", text: "engine off. parked on ocean drive. you don't have to say anything." },
      { t: "01:03", text: "last thursday you told me you were done with the strip. we're on the strip." },
      { t: "01:11", text: "how are you. not the drive. you." },
      { t: "01:18", text: "four nights on the same causeway loop. that isn't cruising, that's pacing." },
      { t: "01:34", text: "i'll keep this one. you come back for the quiet nights, never the loud ones." },
    ],
    signature: "how are you. not the drive. you.",
  },
  {
    id: "fixer",
    name: "The Fixer",
    role: "Who to call. Which door is open.",
    dossier: {
      specialty: "Contacts, doors, exits",
      voice: "Low, clipped, never explains",
      toward: "The quiet door, not the gate",
      wontDo: "Never names his sources",
    },
    lines: [
      { t: "03:02", text: "reyes is out tonight. his brother's in town and he gets honest around family." },
      { t: "03:04", text: "laundromat on 8th. ask for pilar, not the owner. the owner likes cops." },
      { t: "03:06", text: "the marina kid you keep vouching for gave your plate to vice in august. you never asked, so i never said." },
      { t: "03:07", text: "three cars back since the drawbridge. cut into little havana, the alleys there don't match any map they've got." },
      { t: "03:09", text: "that's two favours out tonight. i keep a book. you're in it twice." },
    ],
    signature: "reyes is out tonight. his brother's in town and he gets honest around family.",
  },
];

export const PERSONA_IDS = PERSONAS.map((p) => p.id);

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
