/**
 * Section 05's content.
 *
 * The objective is deliberately not a money target: the hero already has
 * "forty grand, no guns", and a second round number next to it reads as a
 * copy of the first rather than a second idea. What makes a brief
 * interesting is its constraints, and what makes it credible is its
 * provenance — so both are on the page.
 */
export const BRIEF = {
  no: "044",
  issued: "22:09",
  objective: "Get to the north bridge without touching a main road.",
  constraints: [
    "no main roads",
    "no map, no markers",
    "before it starts getting light",
  ],
  why: [
    "you take the causeway every night.",
    "you have not been north of the river in eleven sessions.",
  ],
};

export type LedgerRow = { no: string; brief: string; outcome: string };

/** Refused and expired are the honest entries. A ledger of nothing but
    completions is a feature list wearing a table's clothes. */
export const LEDGER: LedgerRow[] = [
  { no: "044", brief: "north bridge, no main roads", outcome: "issued" },
  { no: "043", brief: "sell the one you keep polishing", outcome: "refused" },
  { no: "041", brief: "one hour, no map", outcome: "done" },
  { no: "038", brief: "make rent without the garage", outcome: "done" },
  { no: "035", brief: "drive someone else's car all night", outcome: "expired" },
];
