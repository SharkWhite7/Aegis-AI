import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAgent,
  setVisibility,
  starAgent,
  unstarAgent,
  topAgents,
  hasStarred,
  seedBuiltinAgents,
  ForbiddenError,
  NotFoundError,
  agentsByAuthor,
} from "../src/marketplace/agents.ts";
import { createPlayer } from "../src/players/repo.ts";
import { BUILTIN_AGENTS } from "../src/marketplace/builtins.ts";
import { freshDb, seedWorld } from "./helpers.ts";

const brief = "A long enough persona brief to satisfy the minimum length rule.";

test("the six built-ins are seeded, published, and seeding is idempotent", async () => {
  const db = freshDb();
  assert.equal(await seedBuiltinAgents(db), 6);
  assert.equal(await seedBuiltinAgents(db), 0, "second run must insert nothing");
  const listed = await topAgents(db, { limit: 50 });
  assert.equal(listed.length, 6);
  assert.deepEqual(
    [...listed.map((a) => a.slug)].sort(),
    [...BUILTIN_AGENTS.map((b) => b.slug)].sort(),
  );
  await db.close();
});

test("an agent is created as a draft and does not appear in the listing", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  assert.equal(agent.visibility, "draft");
  assert.equal(agent.starCount, 0);

  const listed = await topAgents(db, { limit: 50 });
  assert.ok(!listed.some((a) => a.id === agent.id), "drafts must stay unlisted");
  // The author can still see their own.
  assert.ok((await agentsByAuthor(db, player.id)).some((a) => a.id === agent.id));
  await db.close();
});

test("only the author can publish", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  await assert.rejects(
    () => setVisibility(db, agent.id, other.id, "published"),
    ForbiddenError,
  );
  const published = await setVisibility(db, agent.id, player.id, "published");
  assert.equal(published.visibility, "published");
  await db.close();
});

test("a draft cannot be starred", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  await assert.rejects(() => starAgent(db, agent.id, other.id), ForbiddenError);
  await db.close();
});

test("one player is one star, however many times they click", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  await setVisibility(db, agent.id, player.id, "published");

  const a = await starAgent(db, agent.id, other.id);
  const b = await starAgent(db, agent.id, other.id);
  const c = await starAgent(db, agent.id, other.id);
  assert.equal(a.starCount, 1);
  assert.equal(b.starCount, 1, "starring twice must not move the count");
  assert.equal(c.starCount, 1);
  assert.equal(await hasStarred(db, agent.id, other.id), true);
  await db.close();
});

test("an author cannot star their own agent", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  await setVisibility(db, agent.id, player.id, "published");
  await assert.rejects(
    () => starAgent(db, agent.id, player.id),
    /author cannot star their own agent/,
  );
  const [listed] = await topAgents(db, { limit: 1 });
  assert.equal(listed?.starCount, 0, "every agent must start at zero");
  await db.close();
});

test("unstarring removes exactly that player's star", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const third = await createPlayer(db, { handle: "caio" });
  const agent = await createAgent(db, {
    authorId: player.id,
    name: "The Navigator",
    role: "Knows the back roads.",
    personaBrief: brief,
  });
  await setVisibility(db, agent.id, player.id, "published");

  await starAgent(db, agent.id, other.id);
  await starAgent(db, agent.id, third.id);
  const down = await unstarAgent(db, agent.id, other.id);
  assert.equal(down.starCount, 1);
  assert.equal(await hasStarred(db, agent.id, other.id), false);
  assert.equal(await hasStarred(db, agent.id, third.id), true);
  await db.close();
});

test("most stars is always on top; ties break by age, oldest first", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const voters = [];
  for (const h of ["v1", "v2", "v3", "v4", "v5"]) {
    voters.push(await createPlayer(db, { handle: h }));
  }

  const make = async (name: string) => {
    const a = await createAgent(db, {
      authorId: player.id,
      name,
      role: "A role.",
      personaBrief: brief,
    });
    await setVisibility(db, a.id, player.id, "published");
    return a;
  };

  // Created in this order, so creation order and star order disagree.
  const first = await make("First Published");
  const second = await make("Second Published");
  const third = await make("Third Published");

  await starAgent(db, third.id, voters[0]!.id);
  await starAgent(db, third.id, voters[1]!.id);
  await starAgent(db, third.id, voters[2]!.id);
  await starAgent(db, second.id, voters[0]!.id);
  await starAgent(db, second.id, voters[1]!.id);
  await starAgent(db, first.id, other.id);

  const ranked = await topAgents(db, { limit: 50 });
  const community = ranked.filter((a) => a.source === "community");
  assert.deepEqual(
    community.map((a) => [a.name, a.starCount]),
    [
      ["Third Published", 3],
      ["Second Published", 2],
      ["First Published", 1],
    ],
    "ranking must be by star count, descending",
  );

  // The six built-ins all sit at zero: they must come after, in a stable
  // order, and pagination must not repeat or skip any of them.
  const zeroes = ranked.filter((a) => a.starCount === 0);
  assert.equal(zeroes.length, 6);
  const pageA = await topAgents(db, { limit: 4, offset: 0 });
  const pageB = await topAgents(db, { limit: 4, offset: 4 });
  const ids = [...pageA, ...pageB].map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "pages must not repeat rows");
  assert.deepEqual(ids, ranked.slice(0, 8).map((a) => a.id));
  await db.close();
});

test("starring a missing agent is a not-found, not a silent no-op", async () => {
  const db = freshDb();
  const { other } = await seedWorld(db);
  await assert.rejects(() => starAgent(db, "nope", other.id), NotFoundError);
  await db.close();
});

test("a too-short persona brief is rejected", async () => {
  const db = freshDb();
  const { player } = await seedWorld(db);
  await assert.rejects(
    () =>
      createAgent(db, {
        authorId: player.id,
        name: "X Y",
        role: "A role.",
        personaBrief: "too short",
      }),
    /personaBrief/,
  );
  await db.close();
});

test("two authors can publish agents with the same name", async () => {
  const db = freshDb();
  const { player, other } = await seedWorld(db);
  const a = await createAgent(db, {
    authorId: player.id, name: "The Driver", role: "Drives.", personaBrief: brief,
  });
  const b = await createAgent(db, {
    authorId: other.id, name: "The Driver", role: "Drives.", personaBrief: brief,
  });
  assert.notEqual(a.slug, b.slug);
  await db.close();
});
