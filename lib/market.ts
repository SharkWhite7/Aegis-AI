/**
 * Section 08's content.
 *
 * No invented figures. A creator statement with install counts and dollar
 * amounts would be fabricated revenue for a marketplace that does not
 * exist yet — the same failure the Premise record block and the GTA VI
 * profile card were both rebuilt to avoid.
 *
 * What is real and worth showing is the format. The six built-in voices
 * are written to exactly this sheet, with exactly these limits, so the
 * honest artefact is the blank one.
 */
export type Field = { label: string; hint: string };

export const SHEET: Field[] = [
  { label: "Name", hint: "the; something" },
  { label: "Role", hint: "46 characters" },
  { label: "Specialty", hint: "30 characters" },
  { label: "Voice", hint: "30 characters" },
  { label: "Pushes you toward", hint: "30 characters" },
  { label: "Won't do", hint: "30 characters" },
  { label: "Five lines", hint: "in character, lowercase" },
];

export type Term = { n: string; head: string; body: string };

export const TERMS: Term[] = [
  {
    n: "01",
    head: "Free",
    body: "Publish it and charge nothing. Anyone can install it, and it sits in the same roster as the six.",
  },
  {
    n: "02",
    head: "Priced",
    body: "Set a price or a subscription. You decide what it costs, not us.",
  },
  {
    n: "03",
    head: "The split",
    body: "Not decided yet. It will be published before the marketplace opens rather than after, because a split announced afterwards is a split nobody agreed to.",
  },
];
