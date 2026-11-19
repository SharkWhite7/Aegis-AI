import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest, estimateTokens } from "../src/memory/digest.ts";
import type { MemoryEntry, MemoryKind } from "../src/domain/types.ts";

let n = 0;
const mem = (
  kind: MemoryKind,
  text: string,
  salience = 0.5,
  createdAt = "2026-01-01T00:00:00.000Z",
): MemoryEntry => ({
  id: `m${String(++n).padStart(3, "0")}`,
  playerId: "p1",
  sessionId: null,
  gameProfileId: null,
  kind,
  text,
  salience,
  lastReferencedAt: null,
  supersededBy: null,
  createdAt,
});

test("an empty digest is empty, not a placeholder", () => {
  const d = buildDigest({ previousSummary: null, memories: [], budgetTokens: 500 });
  assert.equal(d.text, "");
  assert.deepEqual(d.includedIds, []);
  assert.equal(d.droppedCount, 0);
});

test("the previous session summary leads the digest", () => {
  const d = buildDigest({
    previousSummary: "drove the causeway, sold nothing",
    memories: [mem("fact", "drives at night")],
    budgetTokens: 500,
  });
  assert.match(d.text.split("\n")[0] ?? "", /^Last session: drove the causeway/);
});

test("goals outrank everything else when space is short", () => {
  const d = buildDigest({
    previousSummary: null,
    memories: [
      mem("conversation", "asked about the weather", 0.9),
      mem("goal", "wants to clear the garage debt", 0.1),
    ],
    budgetTokens: 500,
  });
  const lines = d.text.split("\n");
  assert.match(lines[0] ?? "", /\[goal\]/);
  assert.match(lines[1] ?? "", /\[said\]/);
});

test("the bound is tokens, not rows", () => {
  // Twenty short memories and two very long ones: a row-count bound would
  // treat these as the same prompt. They are not.
  const short = Array.from({ length: 20 }, (_, i) => mem("fact", `fact ${i}`));
  const long = Array.from({ length: 2 }, (_, i) =>
    mem("fact", `${"a very long remembered detail ".repeat(20)}${i}`),
  );

  const budget = 120;
  const dShort = buildDigest({ previousSummary: null, memories: short, budgetTokens: budget });
  const dLong = buildDigest({ previousSummary: null, memories: long, budgetTokens: budget });

  assert.ok(dShort.usedTokens <= budget, `short used ${dShort.usedTokens}`);
  assert.ok(dLong.usedTokens <= budget, `long used ${dLong.usedTokens}`);
  assert.ok(
    dShort.includedIds.length > dLong.includedIds.length,
    "short memories should fit in greater number than long ones",
  );
});

test("never exceeds the budget, across many budgets", () => {
  const memories = Array.from({ length: 60 }, (_, i) =>
    mem("fact", `remembered thing number ${i} with some padding text`, i / 60),
  );
  for (const budget of [0, 1, 5, 17, 40, 100, 250, 1000, 5000]) {
    const d = buildDigest({
      previousSummary: "a summary line of some length to compete for room",
      memories,
      budgetTokens: budget,
    });
    assert.ok(
      d.usedTokens <= budget,
      `budget ${budget} exceeded: used ${d.usedTokens}`,
    );
    assert.ok(estimateTokens(d.text) <= budget + 1, `text over budget at ${budget}`);
  }
});

test("dropped memories are counted, so the budget can be tuned", () => {
  const memories = Array.from({ length: 30 }, (_, i) => mem("fact", `fact ${i}`));
  const d = buildDigest({ previousSummary: null, memories, budgetTokens: 30 });
  assert.ok(d.droppedCount > 0);
  assert.equal(d.includedIds.length + d.droppedCount, 30);
});

test("the digest is deterministic for equal-ranked memories", () => {
  const memories = [
    mem("fact", "alpha", 0.5, "2026-01-01T00:00:00.000Z"),
    mem("fact", "beta", 0.5, "2026-01-01T00:00:00.000Z"),
    mem("fact", "gamma", 0.5, "2026-01-01T00:00:00.000Z"),
  ];
  const a = buildDigest({ previousSummary: null, memories, budgetTokens: 500 });
  const b = buildDigest({
    previousSummary: null,
    memories: [...memories].reverse(),
    budgetTokens: 500,
  });
  assert.equal(a.text, b.text, "input order must not change the digest");
});

test("higher salience wins within a kind, then recency", () => {
  const d = buildDigest({
    previousSummary: null,
    memories: [
      mem("fact", "low", 0.1, "2026-03-01T00:00:00.000Z"),
      mem("fact", "high", 0.9, "2026-01-01T00:00:00.000Z"),
    ],
    budgetTokens: 500,
  });
  assert.match(d.text.split("\n")[0] ?? "", /high/);
});
