/**
 * Section 06's content.
 *
 * The claim worth making is not that it plays more music. It is that it
 * knows the minute to play none — so one cue in five is silence, and
 * another is the companion backing off because you kept skipping.
 */
export type Cue = { no: string; moment: string; decision: string };

export const CUES: Cue[] = [
  {
    no: "01",
    moment: "Pulling onto the causeway",
    decision: "something with a long intro. you have eleven minutes.",
  },
  {
    no: "02",
    moment: "Three cars behind you since the drawbridge",
    decision: "nothing. it cuts out.",
  },
  {
    no: "03",
    moment: "02:14, and the strip is empty",
    decision: "side b, from the top.",
  },
  {
    no: "04",
    moment: "You skipped twice in a row",
    decision: "it stops asking and puts the night tape back on.",
  },
  {
    no: "05",
    moment: "The engine goes off",
    decision: "it lets the last one finish.",
  },
];
