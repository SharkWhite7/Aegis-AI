# Roadmap — from a backend to a companion you can talk to

Written after the backend landed on `main` and the app surface was
approved. The marketing page stays exactly where it is, at `app/page.tsx`.
The app is a second surface in the same Next project, under
`app/console/`, so it inherits the design system rather than growing a
second one that drifts.

Three decisions already taken, and they shape everything below:

| | |
|---|---|
| **Where the app lives** | New routes in the existing Next project. It inherits `app/globals.css` and `components/`. |
| **How a player gets in** | Discord OAuth. No passwords stored, no email provider needed, and gamers already have an account. |
| **What the first playable version is** | **Voice, not text.** The brief's literal promise: type a game, hear a voice. |

## One correction that makes this smaller than it sounds

**Voice does not require a desktop app.** A browser captures a microphone
and plays audio. What requires a desktop app is **live context** — reading
the screen — and the brief conflates the two because its moat depends on
the second.

So: a web app, with voice in and out, and live context deliberately out of
scope until there is a reason to build a desktop client. That keeps the
first voice release reachable instead of putting a whole second platform
in front of it.

## How the phases work

Each phase ends in something a person can use, not a layer that only
makes sense once the next one lands. The funnel is built in order —
sign in, name a game, pick a voice, talk, come back and be remembered —
because that is the order a player meets it in, and building it in that
order means every phase can be judged by using it.

No dates. "Done" means it works and was verified, in the repo.

---

## Phase 0 — Prove the foundation against the real model

**Why first:** everything on `main` is tested against a deterministic
stub. 95 tests pass, the plumbing is proven, and **nobody has ever seen
the real model do any of it.** The profile generator and the memory
debrief are both model calls whose output quality is completely
unmeasured. Building four phases on top of that before looking is how you
find out late.

Cheapest phase on the list, and the one with the highest information
return.

- Run a real session end to end: generate a profile for a real title,
  hold a conversation, close it, and read what the debrief actually
  extracted.
- Check the things only a real call can show: does the generator withhold
  rather than guess on a pre-release title; does the debrief distinguish a
  fact from an instruction; are the summaries worth injecting.
- Fix the prompts against what we see, not against what we hoped.

**You provide:** a Claude API key as an environment variable
(`ANTHROPIC_API_KEY`) in the environment's settings. For Anthropic's own
hosts it cannot be a network secret, so it goes in an environment
variable, readable by anything running in that environment's sessions.

**Done when:** a real transcript and its extracted memories are on the
record, and the prompts have been corrected against them.

---

## Phase 1 — Identity, and the shell the app lives in

**Delivers:** you sign in with Discord and land on a page that knows who
you are.

- Discord OAuth: the authorize redirect, the callback route, token
  exchange.
- Real sessions: signed, `httpOnly` cookies. This **replaces**
  `x-aegis-player`, which identifies without authenticating and is the one
  thing that bars the service from the internet.
- Players are created on first sign-in and linked to a Discord id.
- The `app/console/` shell: the app's own chrome, built from the existing
  design system.
- **A non-affiliation notice.** The handover flagged this on day one and
  it was never built. It matters more in the app than on the marketing
  page, because the app is what runs beside somebody else's game.

**You provide:** a registered Discord application (client id, secret,
redirect URI). I cannot create that.

**Done when:** sign in, reload, still signed in; sign out; and a second
account is a genuinely separate player with separate memory.

---

## Phase 2 — The funnel, working, in text

**Delivers:** the product exists for the first time. You name a game, pick
one of the six voices, have a conversation, close it, come back tomorrow
and it remembers.

Text before audio deliberately: it is the same turn loop, and getting the
conversation right while you can read every byte of it is far easier than
debugging it through a microphone.

- Name a game — the profile generates on first sight of a new title.
- Pick a voice from the six.
- A chat screen taking real turns against the backend.
- Session start and end wired, so **the debrief actually runs** and memory
  fills by itself.
- The returning-player path: the second session opens knowing the first.

**Done when:** two sessions a day apart, and the second one refers to the
first without being told to.

---

## Phase 3 — Streaming

**Delivers:** replies arrive as they are written instead of all at once.

Not cosmetic, and not optional later: it is the prerequisite for voice.
Audio cannot start playing until text starts arriving, so without this
every spoken reply waits for the whole thing to finish generating first.

- Replace the per-turn POST with a stream.
- The turn still records, and the debrief still runs, when a stream is
  interrupted halfway.

**Done when:** text appears progressively, and a reply abandoned midway
still leaves a correct transcript.

---

## Phase 4 — The companion speaks

**Delivers:** you type, and it answers out loud.

Half of the promise, and the half with less that can go wrong. Worth
shipping on its own.

- Choose a text-to-speech provider.
- **Cast the six voices.** This is a product decision, not code: the DJ
  and the Hustler must not sound like the same person reading different
  lines. Six voices that sound alike is worse than one voice.
- Speak the stream as it arrives.

**Also in this phase, and no longer deferrable: a per-player cost
ceiling.** Rate limiting caps calls per minute; it does not cap spend. A
voice turn costs a model call *plus* speech synthesis, so the cost of an
abusive session multiplies here. Inference is managed — AEGIS AI pays for
every turn — so the ceiling stops being housekeeping and becomes part of
the feature.

**Done when:** six personalities are audibly different people, and a
single player cannot spend past their ceiling.

---

## Phase 5 — You speak

**Delivers:** the brief's promise. You talk, it talks back.

- Microphone capture in the browser.
- Speech-to-text.
- **Push-to-talk first.** The hard problem in voice input is not
  transcription, it is knowing when the player is talking *to the
  companion* rather than to a friend, to the game, or to nobody. A
  companion that answers the room is worse than one you have to press a
  key for. Always-listening is its own project, after this works.

**Done when:** a whole session happens without the keyboard, and it does
not answer things that were not said to it.

---

## Phase 6 — Fit to run, before the first player who is not us

Nothing here is a feature, and all of it must be true before anybody
outside uses the product. Parts can start earlier; none can be skipped.

- **Postgres, provisioned and migrated.** The schema has never been
  executed against a real instance. SQLite in a container dies with the
  container, and memory is the thing the subscription rests on.
- **Deployment.** The service runs nowhere today.
- **Backups of memory.** Losing it destroys the one claim the product is
  sold on.
- **Observability.** `latency_ms` and digest token counts are recorded and
  nothing aggregates them.
- **A privacy policy, and a decision about what we keep.** Transcripts and
  memories about real people are personal data. This is a legal minimum
  before the first outside user, not after.

**Done when:** a player's memory survives a deploy, a restart, and the
loss of a container.

---

## After that, in the brief but not in a phase yet

- **Missions** (brief surface 2). Nothing exists in the backend. Worth
  doing after memory fills by itself, because then missions can be written
  from what the player actually did rather than from a template.
- **Marketplace.** Built and merged, but **not safe to open**: anybody can
  publish a 2,000-character `personaBrief` that goes straight into a
  system prompt, with no moderation at all. Needs review before it has
  users. The six built-in voices are enough to prove the product.
- **AI DJ / Spotify** (surface 3). Blocked on a Spotify developer
  agreement, not on code.
- **Live context.** The brief's own moat, and the reason a desktop client
  would eventually exist. Out until there is a product to attach it to.

---

## Constraints carried over, not rediscovered

`docs/handover.md` records invariants that were each found by breaking
them. They apply to the app's screens too, and three of them would bite
immediately:

- **`--color-bone-mute` is 2.85:1 on ink**, below the 4.5:1 AA minimum,
  and is still carrying content in older sections. New app screens use
  `bone-dim` (6.8:1). Do not repeat it.
- **Never `whitespace-nowrap` on a display line.** `body` carries
  `overflow-x: clip`, so an overlong line leaves the viewport silently,
  with no scrollbar to suggest anything is missing.
- **Display sizes derive from measured glyph widths.** `--t-display-xl`
  fits because the widest hero line measures 4.771 × font-size at
  `font-stretch: 64%` in 8 columns. New copy at a display size, or a
  different column span, has to be re-measured in a browser — not
  eyeballed.

Also carried: a grid must be a mask's grandchild and never its direct
child; focus rings go on the `.mask` element itself; and a static export
must be verified at a sub-path, never at the domain root.

## The doctrine, unchanged

Nothing is fabricated. The GTA VI profile ships four empty fields and a
sentence saying the game is not out, because that is more credible than
filling them in. The backend enforces the same rule in code: a generated
profile cannot carry a value it cannot source, and a model that returns a
spec sheet for an unreleased game persists nothing.

That applies to the app as much as the page. No invented player counts,
no progress bar that moves on a decision instead of a commit, and no
companion line that implies it can see a screen it cannot see.
