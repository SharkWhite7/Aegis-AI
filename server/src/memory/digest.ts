/**
 * The per-turn digest assembler.
 *
 * Memory cannot live in the model's context window: a conversation that
 * keeps its history only there loses it the moment the window rolls, and
 * with it the feature the whole subscription rests on. So memory is stored
 * outside the model and a digest is injected every turn.
 *
 * This file is that injection, and it is deliberately a pure function —
 * no database, no clock, no model. It is the one component whose
 * correctness can be pinned down completely by tests today.
 *
 * The bound is a TOKEN budget, not a row count. Row counts look stable and
 * are not: ten long memories and ten short ones are not the same prompt,
 * and the failure mode of getting this wrong is silent — the digest simply
 * stops fitting and the companion starts forgetting without an error.
 */

import type { MemoryEntry, MemoryKind } from "../domain/types.ts";

/**
 * Rough token estimate: ~4 characters per token.
 *
 * This is an approximation and is treated as one — the budget is a safety
 * margin, not an exact fit. The real measure is the provider's token
 * counting endpoint; swap it in via `estimate` when a credential exists
 * and the count matters more than the round trip.
 */
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

/**
 * What goes in first when space is short.
 *
 * Goals lead because they are the only kind the companion can act on this
 * turn. Conversation trails because it is the easiest to reconstruct and
 * the least costly to lose.
 */
const KIND_PRIORITY: Record<MemoryKind, number> = {
  goal: 0,
  preference: 1,
  challenge_outcome: 2,
  fact: 3,
  event: 4,
  conversation: 5,
};

const LABEL: Record<MemoryKind, string> = {
  goal: "goal",
  preference: "prefers",
  challenge_outcome: "challenge",
  fact: "fact",
  event: "happened",
  conversation: "said",
};

export type DigestInput = {
  /** Written when the previous session closed. Always included if present. */
  previousSummary: string | null;
  /** Live memories only — callers must have excluded superseded rows. */
  memories: MemoryEntry[];
  budgetTokens: number;
  estimate?: (text: string) => number;
};

export type Digest = {
  /** The text injected into the model's system prompt. */
  text: string;
  /** Which memories made it in, so callers can mark them referenced. */
  includedIds: string[];
  usedTokens: number;
  /** How many live memories did not fit. Worth logging: it is the signal
      that the budget needs raising or consolidation needs to run. */
  droppedCount: number;
};

/**
 * Ordering: priority by kind, then salience (high first), then newest
 * first, then id. The last key is there only to make the result total —
 * without it two equally-ranked memories could order differently between
 * runs and the digest would stop being reproducible.
 */
const compare = (a: MemoryEntry, b: MemoryEntry): number =>
  KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] ||
  b.salience - a.salience ||
  (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildDigest(input: DigestInput): Digest {
  const estimate = input.estimate ?? estimateTokens;
  const budget = Math.max(0, input.budgetTokens);

  const lines: string[] = [];
  let used = 0;

  const fits = (line: string): boolean => {
    // +1 for the newline that joins it to what came before.
    const cost = estimate(line) + 1;
    if (used + cost > budget) return false;
    used += cost;
    return true;
  };

  if (input.previousSummary) {
    const line = `Last session: ${input.previousSummary}`;
    // The summary is how session 100 opens knowing session 1, so it gets
    // first refusal on the budget. If it does not fit on its own, nothing
    // else would be more valuable, so the digest comes back empty.
    if (fits(line)) lines.push(line);
  }

  const ordered = [...input.memories].sort(compare);
  const includedIds: string[] = [];
  let dropped = 0;

  for (const m of ordered) {
    const line = `- [${LABEL[m.kind]}] ${m.text}`;
    if (fits(line)) {
      lines.push(line);
      includedIds.push(m.id);
    } else {
      // Keep scanning rather than breaking: a later memory may be short
      // enough to fit where this one was not.
      dropped += 1;
    }
  }

  return {
    text: lines.join("\n"),
    includedIds,
    usedTokens: used,
    droppedCount: dropped,
  };
}
