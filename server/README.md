# AEGIS AI — companion backend

Pre-alpha. Runs the companion: game profiles, memory, the marketplace and
chat. Lives entirely under `server/`; nothing outside this directory is
touched by it.

**There is no payment processing anywhere in this service, and no price
column in the schema.** Publishing an agent is free and starring one is
free. When money arrives it is an additive migration, not a rewrite.

## Running it

```bash
cd server
npm install
npm test            # 75 tests, no network and no credential needed
npm run typecheck
npm start           # http://127.0.0.1:8787
```

Node 22.18+ runs the TypeScript directly (type stripping), so there is no
build step. `npm run typecheck` is still the gate — stripping erases types
without checking them.

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `AEGIS_DB` | `./aegis.db` | SQLite file. `:memory:` in tests. |
| `PORT` / `HOST` | `8787` / `127.0.0.1` | Listen address. |
| `ANTHROPIC_API_KEY` | unset | When absent the server runs on the **stub** adapter and says so loudly at boot. |

Without a credential every reply is a deterministic placeholder. That is
announced in the boot log and as a warning, because starting silently on a
stub is how you demo plumbing and believe you heard the product.

## What is built, and what is honestly not

Built and tested:

- **Waitlist capture** — the site's two "Request access" CTAs point at a
  `#access` section that does not exist yet. See `WAITLIST-ENDPOINT.md`.
- **Game profile generator** — any title in, a six-field profile out,
  generated once per title and shared by every player.
- **Memory + per-turn digest** — stored outside the model, injected every
  turn, bounded by a token budget.
- **Marketplace** — authoring, publishing, stars, ranking by stars.
- **Chat** — sessions and turns, assembling the four parts per turn.

Not built, and why:

- **Live context** (screen and audio capture) — a desktop-client problem,
  not a server one. The brief calls it the product's actual moat. What
  exists here is the ingest *contract* only: `liveContext` on a turn is
  text the **player typed**, clearly labelled as their report rather than
  something observed. Nothing captures a screen.
- **Voice in / out** — needs the client plus an STT/TTS vendor, and it is
  latency-bound in a way that cannot be judged without both.
- **AI DJ / Spotify** — blocked on a Spotify developer agreement, not on
  code.
- **Payments and revenue share** — deliberately out, as asked.

## The three things that matter most

### 1. The no-fabrication rule is enforced in code, not in review

The profile generator is a model writing content the companion later
treats as ground truth, stores, and repeats in every future session. One
invented street name does not stay one invented street name.

So it is guarded in three layers, and only the second is a guarantee:

1. The prompt asks the model to withhold rather than guess.
2. `enforce()` in `src/profiles/generator.ts` overwrites whatever came
   back: a pre-release or unrecognised title has **every** model-written
   field stripped to a withheld null before anything is validated.
3. `validateProfileField` rejects any field whose `value`, `provenance`
   and `confidence` disagree — in both directions. A null cannot claim
   model provenance, and content cannot be labelled "withheld" to smuggle
   an unsourced guess through.

A test asserts the dangerous case directly: a model that ignores its
instructions and returns a full spec sheet for GTA VI persists nothing.

Withheld fields are also *named* to the model as unknown rather than
omitted from the prompt. Omission leaves a silence the model fills by
improvising, which is the exact failure withholding was for.

### 2. Memory is stored outside the model and bounded by tokens

`src/memory/digest.ts` is a pure function and the one component whose
correctness is fully pinned down today. The bound is a **token budget, not
a row count** — ten long memories and ten short ones are not the same
prompt, and the failure mode of getting it wrong is silent: the digest
stops fitting and the companion forgets without raising anything.

`memory_entry.superseded_by` is not optional. The brief's own example —
"it remembers that you said two hours last thursday and logged off at
four" — needs memories that can be contradicted and retired. Without
supersession the digest accumulates contradictions and the companion gets
*worse* as it accumulates.

### 3. The cache split is load-bearing

`buildStablePrompt` (profile + agent voice) does not change within a
session and carries the cache breakpoint. `buildVolatilePrompt` (memory
digest + player-reported context) is rebuilt every turn and must sit
*after* it. Reversed, the cache is invalidated on every single turn. A test
asserts memory never appears in the stable half.

## Marketplace ranking

The rule, as asked for: most stars always on top. Ties break by age,
oldest first, so the order is total and pagination cannot skip or repeat
rows. One star per player, enforced by `agent_star`'s primary key.

Two judgement calls worth knowing about, both reversible:

- **An author cannot star their own agent.** One self-star is a small
  thumb on a scale that decides the whole front page, and allowing it
  means every agent starts at 1, which carries no information.
- **Ranking on raw star count has no cold start.** The first agent to get
  popular stays on top, and a better one published later has no path to
  the page where anyone would see it. It also rewards reach over quality:
  one star per player stops one person clicking twice, not an author who
  can ask a thousand people to click once. Both are fixed by changing one
  function, which is why the rule lives alone in `ranking.ts`.

## Datastore

SQLite today via `node:sqlite`, Postgres as the target.

`src/db/schema.sql` runs unchanged on both. That portability costs
idiomatic types — ids and timestamps are `TEXT`, JSON columns are `TEXT`
holding JSON — and on Postgres those become `uuid` / `timestamptz` /
`jsonb` in a later additive migration. One schema that can actually be
executed beats two dialects that drift.

The `Db` seam in `src/db/db.ts` is **async** even though `node:sqlite` is
synchronous: a sync interface could never be backed by Postgres, which
would make the swappability claim false. SQL uses `?` placeholders; a
Postgres implementation rewrites those to `$1..$n`, and that is the only
dialect difference the repositories rely on.

Two measured notes:

- `node:sqlite` works here and enforces constraints, and Node flags it
  experimental — it prints a warning on first use.
- **The Postgres schema has not been run.** No Postgres server is
  installed in this container and the Docker daemon could not be started.
  It is design intent until it has been executed against a real instance.

## Known gaps

**Identity is not authentication.** Routes that act as a player read
`x-aegis-player`, and anyone who knows a player id can send it. That is
enough to build and test the product's shape; it must not be reachable
from the internet as it stands. Real auth is the one thing that has to
exist before this service is exposed.

**Rate limiting is per process and in memory.** `src/http/ratelimit.ts`
caps model-spending routes per player and signups per address. It is not
hardening to add later — inference is managed, so AEGIS AI pays for every
turn, and the live-context channel will carry attacker-influenceable
content. But N instances allow N times the rate, and a restart forgets
everything. A shared store is needed before horizontal scaling.

**Refusal fallbacks are absent, on purpose.** `fallbacks` does not exist
anywhere in the installed SDK's params (`@anthropic-ai/sdk` 0.74.0, checked
against its own type declarations). So a refusal is surfaced as a refusal
and no reply is invented. Revisit on an SDK upgrade.

**The voice is unverified.** Every test runs on the stub. Whether the
companion is any good is a human judgement that needs the real model and
someone listening, and nothing in this repository can stand in for it.

## Layout

```
src/
  db/        schema.sql, the async Db seam, node:sqlite implementation
  domain/    types, ids, validation (incl. the no-fabrication invariant)
  players/   player records — no key column, ever
  waitlist/  signup capture; no public counter
  profiles/  normalisation, the generator and its enforcement, storage
  memory/    storage with supersession, and the pure digest assembler
  marketplace/ agents, stars, the ranking rule, the six built-ins
  chat/      prompt assembly (the four parts) and the turn loop
  model/     the model seam, deterministic stub, managed adapter
  http/      Fastify app, error mapping, rate limiting
test/        75 tests; no network, no credential
```
