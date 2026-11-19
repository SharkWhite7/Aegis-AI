/**
 * The build bar's data.
 *
 * A bar needs a denominator, and the denominator has to be something we
 * can stand behind — the same rule that leaves four fields empty on the
 * GTA VI profile card. So these are the real stages of the whole project,
 * spec through private alpha, and the bar reads wherever it honestly
 * reads. Today that is low, because the companion runtime starts now.
 *
 * Nothing here is a percentage anyone invented: the fraction is stages
 * done over stages planned, and the page says so under the bar. A stage
 * flips to "done" when it actually ships, in this file, in this repo —
 * which is why the bar moves on a commit rather than on a decision.
 */
export type Stage = {
  id: string;
  label: string;
  state: "done" | "building" | "queued";
};

export const STAGES: Stage[] = [
  { id: "01", label: "Product definition", state: "done" },
  { id: "02", label: "Design system", state: "done" },
  { id: "03", label: "The six voices", state: "done" },
  { id: "04", label: "This site", state: "building" },
  { id: "05", label: "Waitlist", state: "queued" },
  { id: "06", label: "Game profile generator", state: "queued" },
  { id: "07", label: "Persistent memory", state: "queued" },
  { id: "08", label: "Companion runtime", state: "queued" },
  { id: "09", label: "Voice, in and out", state: "queued" },
  { id: "10", label: "Live context", state: "queued" },
  { id: "11", label: "Private alpha", state: "queued" },
];

export const DONE = STAGES.filter((s) => s.state === "done").length;
export const BUILDING = STAGES.filter((s) => s.state === "building").length;
export const TOTAL = STAGES.length;

/** Half credit for the stage in flight, so the bar moves between ships. */
export const FRACTION = (DONE + BUILDING * 0.5) / TOTAL;
