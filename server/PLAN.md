# AEGIS AI — backend plan (first cut)

Status: proposal. No implementation code written yet.
Branch: `backend`, cut from `origin/main` @ 36e6ce7.
Author's constraint: files under `server/` only; nothing outside it touched.

This plan follows `docs/brief.md`. Where it disagrees with the brief, or
where the brief forbids something a normal backend would do, that is
called out in **Honest limits** rather than quietly resolved.

---

## 0. What was measured before writing this

The project rule is measure, do not assume. What is asserted below as
verified was run in this container; everything else is marked unverified.

| Check | Result |
|---|---|
| `origin/main` vs local `HEAD` | identical, `36e6ce7` |
| `backend` branch cut from main | done; `git diff origin/main..HEAD` empty |
| Node | `v22.23.5` |
| Next | `16.4.6` |
| `node:sqlite` usable | **yes** — STRICT tables, prepared statements and a UNIQUE violation all behaved; emits `ExperimentalWarning: SQLite is an experimental feature` |
| Postgres server | **not available** — `psql` client 16.15 present, no server; Docker CLI 29.10.0 present but daemon not running, and starting it was denied |
| Next route-handler rules | read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `02-guides/backend-for-frontend.md` |

Two findings from those docs shape section 2:

1. Route Handlers **must** live inside `app/`. There is no way to add an
   HTTP endpoint to the Next app from `server/`.
2. Next's own docs: *"Next.js backend capabilities are not a full backend
   replacement. They serve as an API layer."*

One finding from the site's own source shapes section 1:
`components/sections/Hero.tsx:93` and `components/chrome/Nav.tsx:41` both
link to `#access`, and no Access section exists in `components/sections/`.
The site's primary call to action currently points at nothing.

---

## 1. Scope

### Build first

**1. Waitlist capture.**
Chosen first not because it is easy but because it is the only item on the
list with a live defect behind it: two CTAs on the shipped site are dead
anchors. Small, finishable, and its correctness does not depend on any
unbuilt component.

**2. Game profile generator.**
The "any game" claim in the brief is the product's actual differentiator,
and it is the only one of the large features that is entirely
server-shaped — a title goes in, a structured profile comes out. No
desktop client needed to build or test it.

Its output contract should be the six fields the site already ships in
`lib/profiles.ts` (`World`, `Economy`, `Traversal`, `Pressure`,
`Vocabulary`, `Lead voice`) so the site can consume generated profiles
without a translation layer. The site has already committed to that shape
publicly; the generator should meet it rather than invent a second one.

This is also the most dangerous thing in the plan. See **Honest limits 4**.

**3. Memory store + per-turn digest assembler.**
Built as one unit, because the digest defines what the store has to be
able to answer; designing the tables first and the query later is how you
get a schema that cannot serve its only consumer. The assembler is a pure
function — four parts in, one bounded prompt out — so it is unit-testable
today with synthetic turns and no model and no client.

### Not in the first cut

**Model orchestration — partly.** The *assembler* is in scope (item 3).
Actually calling a managed model and tuning the voice is not. The brief is
explicit that the product is judged on "whether the voice is any good",
and that is a human judgement requiring a client that speaks. Building the
orchestration loop before anything can listen to it optimises a metric
nobody has yet heard.

**Live context — not buildable here.** The brief calls this "the hard part
of this product and its actual moat". It is screen and audio capture on
the player's own machine: a desktop-client problem, not a server one. The
server's only job now is to define the ingest contract so the client has
something to target. Nothing to build server-side beyond that shape.

**Voice in / out — not buildable yet.** Needs an STT and TTS vendor plus
the desktop client, and it is latency-bound: a companion that answers
three seconds late is not the product. Cannot be meaningfully built or
measured without the client that captures and plays audio.

**AI DJ / Spotify — blocked, not unbuilt.** "Authorised playback control"
needs a registered Spotify application and acceptance of their developer
terms. That is a commercial and legal step before it is a coding one.

**Marketplace — premature.** Creator publishing, payments and revenue
share presuppose creators. A pre-alpha with a waitlist has none.

---

## 2. Stack

### Runtime and language

Node 22 LTS (measured `v22.23.5`), TypeScript. One language across site
and backend, and — more usefully — the backend can share the site's
existing type shapes (`Profile`, `Persona`, `Turn`) instead of
re-describing them and letting the two drift.

### Where the backend lives: both, with a sharp line

Not one or the other. The two halves have different consumers, connection
shapes, deploy cadences and blast radii, and forcing them into one
deployable makes one of them worse.

**In the Next app — exactly one endpoint: `POST /api/waitlist`.**
It is a browser form on the marketing site. Same origin means no CORS, no
preflight, no second hostname, and it ships and rolls back with the page
that contains the form. Standing up a separate service for one form POST
would be ceremony.

**In `server/` — everything companion-related, as a long-lived service.**
Its consumer is the desktop/mobile app, not the website. It needs
persistent duplex connections for streaming voice and live context;
request/response route handlers on a serverless target are the wrong
primitive for that, and Next's docs say as much. It is also stateful and
should be deployed deliberately, whereas the marketing site is being
pushed to `main` many times a day — a headline change must not redeploy
the companion runtime, and a bad companion deploy must not take the
marketing site down.

The honest counter-argument, stated rather than hidden: for the first cut,
whose only shipped surface is a waitlist form, a separate service is
overkill. That is precisely why the waitlist goes in the site and not into
the service.

### The boundary problem this creates

`POST /api/waitlist` has to be `app/api/waitlist/route.ts`. I am
instructed not to create or modify anything outside `server/`, and Route
Handlers cannot live anywhere else. So I am stopping and saying so rather
than doing it. Three ways forward, in my order of preference:

1. **The site session adds the route handler; I supply the spec, the
   validation and the storage behind it.** Keeps the boundary intact and
   puts the file in the hands of whoever owns `app/`. Needs coordination.
2. **I am given permission for exactly one new file,
   `app/api/waitlist/route.ts`**, touching nothing else. Fastest, but it
   crosses a line the user drew, so it is their call, not mine.
3. **The form posts cross-origin to the `server/` service.** Needs no
   permission at all, and is worse: CORS, a second public hostname, and a
   marketing-critical path behind a second deploy target.

### Framework

Fastify for the HTTP surface. The reason is validation, not routing: the
no-fabrication rule means model output has to be checked structurally
before it is stored, and Fastify's JSON Schema validation is the same
validator for both inbound HTTP bodies and generator output, so there is
one place where "what a valid profile is" is defined.

Over Express: no first-class schema validation. Over Hono: its edge
portability is not a benefit for a service that is deliberately
long-lived and stateful. With so few routes in the first cut, `node:http`
would genuinely do; the dependency is bought for the validator.

### Datastore

**Target: Postgres.** Memory is the feature the subscription rests on —
the brief is explicit that memory cannot live in the context window — so
it must not be the component that loses data. Postgres also gives JSONB
for profile documents and a clear path to pgvector for semantic memory
retrieval, which is the obvious next step once the digest has more
memories than it can fit.

**But: I could not verify Postgres in this container.** No server is
installed, and starting the Docker daemon was denied. Recommending it for
the first cut would mean handing over code I have never run, which the
project rule forbids.

So, concretely:
- All SQL written portable and plain. No ORM — the schema is small and the
  digest query is the one performance-critical path, so I want to read it.
- Data access behind a narrow interface so the store is swappable.
- Develop and verify against `node:sqlite` in this container, which is
  measured working, noting it is flagged experimental by Node.
- I will not claim the Postgres schema works until it has been run
  against a real instance. To do that I need either Docker permission or
  a reachable dev Postgres URL. Flagged as a decision below.

---

## 3. Data model

Field types are indicative; the load-bearing decisions are the notes.

### `waitlist_entry` — deliberately not a player

    id            uuid pk
    email         text unique, case-insensitive
    game_title    text null     -- what they typed, if the form asks
    source        text          -- which CTA: hero | nav
    created_at    timestamptz
    confirmed_at  timestamptz null

An unconfirmed row is not a subscriber. `game_title` is the single most
useful signal the waitlist can collect: it tells us which profiles to
generate first, and it is a real question rather than a vanity field.

Kept separate from `player` on purpose. Joining the waitlist is not
creating an account, and a pre-alpha with no product should not be minting
player records.

### `player`

    id            uuid pk
    created_at    timestamptz
    display_name  text null
    plan          'free' | 'pro'
    persona_id    text          -- one of the six, or a marketplace id later
    settings      jsonb         -- voice on/off, verbosity

No email at creation. No API key field, ever — see **Honest limits 3**.

### `game_profile` — per title, not per player

    id                uuid pk
    slug              text unique   -- normalised title
    title             text          -- as displayed
    aliases           text[]
    status            'generated' | 'pre_release' | 'unknown'
    fields            jsonb         -- the six site fields
    generator_version text
    model_id          text
    created_at, refreshed_at

Generated once per title and shared across all players, exactly as the
brief describes. That reuse is the entire economics of "no per-title
engineering".

`slug` should be produced by the same normalisation the site already uses
in `lib/profiles.ts` (lowercase, strip non-alphanumerics) so a title typed
on the site and a title typed in the app resolve to one profile.

**The load-bearing decision:** each of the six fields is
`{ value: string | null, provenance, confidence }`, and `value` being
`null` is a *meaningful* answer — "known to be unknown", not "missing".
`lib/profiles.ts` already does this: the GTA VI profile is deliberately
mostly blank, with the comment that "a spec sheet asserting an unreleased
game's economy would be the same honesty failure". The generator must be
able to say nothing, and nullability is where that rule lives in the
schema rather than in a reviewer's attention.

### `session`

    id              uuid pk
    player_id       -> player
    game_profile_id -> game_profile
    persona_id      text
    started_at, ended_at
    summary         text null   -- written at end; feeds the next digest
    turn_count      int

`summary` is what makes session 100 open knowing session 1 without
replaying 99 transcripts.

### `memory_entry`

    id                 uuid pk
    player_id          -> player          -- player-scoped
    session_id         -> session null     -- origin; null if derived
    game_profile_id    -> game_profile null
    kind               'preference' | 'goal' | 'fact' | 'event'
                       | 'conversation' | 'challenge_outcome'
    text               text               -- one assertion, human-readable
    salience           real
    last_referenced_at timestamptz
    superseded_by      uuid null -> memory_entry
    embedding          vector null        -- later
    created_at         timestamptz

**Player-scoped, with an optional game link.** The brief's memory thread
is about the *person*: "it knows the difference between a bad week and a
quiet one". That cannot cross games if memory is scoped to a session or to
a title. Some memories are about the player, some about the player in a
world, and the schema has to express both.

**`superseded_by` is not optional.** The brief's session-047 example — "it
remembers that you said two hours last thursday and logged off at four" —
requires memories that can later be contradicted and retired. Without
supersession the digest accumulates contradictions and the companion gets
*worse* as it accumulates, which would break the one claim the monthly fee
rests on.

### `turn` — append-only

    id, session_id, role ('player' | 'copilot'), text,
    audio_ref null, created_at, latency_ms

`latency_ms` is stored because voice is latency-bound and it is the thing
we will need to have measured before anyone asks.

### The per-turn digest is not a table

It is a derived, size-bounded projection, rebuilt each turn from: the top
salient player-level memories, the top memories for the current game, the
previous session's summary, open goals and the active challenge. Bounded
by **token budget, not row count**, and composed with the profile and
persona (static for the session) and the live context (from the client).

That bound is the thing to measure first, because it is where the memory
feature either holds or quietly stops fitting.

---

## 4. Honest limits

Where this plan risks contradicting the brief.

**1. Pre-alpha must stay visible as pre-alpha.**
The waitlist must not send mail that implies access exists, and it must
not expose a signup count. A number like "1,842 on the list" is a
fabricated metric by construction, and `lib/site.ts` carries
`stage: "PRE-ALPHA"`. I will not build a public counter endpoint. If one
is wanted later it is a product decision, not a backend convenience.

**2. The product never reads or modifies the game — and the site has
already promised this in public.**
`lib/profiles.ts` ships the line "nothing is read from the game, and
nothing is written to it." Nothing in this plan touches a game process,
because live context is out of scope. Recording the constraint for
whoever builds it: that channel must be OS-level screen and audio
observation only — never game memory reads, never injection, never
process attach. If it ever reads game memory, the legal position in the
brief collapses and the site's published claim becomes false.

**3. No bring-your-own-key, with a consequence worth naming.**
No key field on `player`, no "advanced" escape hatch. The brief's second
reason is the stronger one and I am not arguing with it. But managed
inference means AEGIS AI holds the credential and pays for every turn,
while the live-context channel feeds attacker-influenceable content —
whatever is on screen — into that prompt. So per-player rate limits and
cost budgets are not hardening to add later; they are a direct consequence
of the no-key decision and belong in the first cut of anything that calls
a model.

**4. The profile generator is a fabrication engine unless constrained.
This is the part of the plan I most want argued with.**
It is a model writing content that the companion then treats as ground
truth, stores, and repeats across every future session. If it invents one
street name for GTA VI, the companion will state it confidently forever
and it will compound. The brief anticipates exactly this: "A profile that
says 'you are a companion for GTA VI' produces a companion that invents
street names."

So "nothing gets fabricated" has to be enforced *in the generator*, not in
review. My proposal: the generator's default for any field it cannot
support is `null`, not a guess; provenance is recorded per field; and for
a title marked `pre_release` it populates nothing beyond the verifiable.
The flagship profile therefore stays mostly empty, which is what the site
already does deliberately — and on a site for a GTA VI companion,
restraint about GTA VI is the most credible thing on the page.

**5. "Works with any game" is an unbounded, user-triggered generation
surface.**
Any typed string can trigger a model call and a stored profile. Not a
contradiction of the brief, but an honest limit on the claim: it needs an
abuse bound before it is exposed publicly, and nonsense titles need to
resolve to `status: 'unknown'` — which the site already renders honestly
as "No profile on file."

**6. What I could not verify.**
The Postgres schema above has not been run. Docker's daemon is not running
here and starting it was denied, and no Postgres server is installed. The
SQLite findings are measured; the Postgres ones are design intent only,
and I will not report the schema as working until it has been executed.

---

## 5. Decisions taken

All three open questions were answered. Recorded here because the first
affects whoever owns `app/`.

**1. Waitlist endpoint — I spec it, the site session builds it.**
The file boundary stays intact. My side, under `server/`: the endpoint
contract, request validation, storage and the data layer behind it. The
site session's side: `app/api/waitlist/route.ts`, which calls into it.
I will write the spec so that file is small and has no decisions left in
it.

**2. Datastore — Postgres, verified against a real dev instance.**
A reachable dev Postgres URL is to be supplied. Until it exists I will
write portable SQL behind the swappable data layer and verify what I can
on `node:sqlite`, and I will not report the Postgres schema as working
before it has run against Postgres.

One note on how that URL should arrive, because both obvious routes have a
problem. Environment variables on this environment are stored in plain
text and shown in an approval prompt, so a connection string containing a
real password does not belong in one; and the credential tool here is for
HTTPS header secrets, explicitly not database passwords. That leaves two
clean options:

- A **throwaway dev instance** whose URL is not a meaningful secret, set
  as an environment variable, with its host allowed through the network
  policy.
- **Allowing the Docker daemon**, so Postgres runs locally with no
  credential to hand over at all.

The second is the simpler form of the same request and needs nothing
shared. Either works; the first needs a host and a disposable password.

**3. Scope order — confirmed.**
Waitlist capture, then the game profile generator, then the memory store
with its per-turn digest assembler. Model orchestration, live context,
voice, DJ and marketplace stay out of the first cut, for the reasons in
section 1.
