# VICE AI — brief

> Your World. Your AI. Your Story.

## What it is

An AI companion that runs **beside** a game, not inside it. A desktop/mobile
app running alongside GTA VI. It talks to the player by voice while they
play, remembers previous sessions, learns their playstyle, generates
personalised challenges, and scores the moment with music.

GTA VI is the entry point, not the ceiling. The long game is a new product
category: **AI gaming companions** — an ecosystem where agents become part
of how people play, explore and experience virtual worlds.

There is no public GTA VI integration API for external agents. VICE AI
ships as an independent companion app and modifies nothing in the game.
"No mods, no injection" is a product claim and a legal position, not a
limitation to apologise for.

## Product surface

1. **AI Co-Pilot** — voice companion. The player picks a personality.
2. **Dynamic missions** — AI-generated objectives from the player's
   preferences and context. e.g. *"Today you make money without weapons.
   Business, driving, strategy."*
3. **AI DJ + Spotify** — reads the activity (chase, night cruise, street
   race, cruising, exploring) and scores it. Authorised playback control.
4. **Persistent memory** — sessions, preferences, goals, favourite
   activities, conversations, completed challenges. It compounds.
5. **Marketplace** — creators build, publish and monetise AI characters.
   Free tier, premium personalities, creator revenue share.

## The six personalities

| id | name | territory |
|---|---|---|
| `hustler` | The Hustler | business partner — deals, flips, money without violence |
| `dj` | The DJ | music curator — reads the moment and scores it |
| `mechanic` | The Mechanic | cars — builds, tuning, what to buy, what to avoid |
| `strategist` | The Strategist | plans — approach, routes, contingency, the cold read |
| `companion` | The Companion | friend — conversation, memory, asks how you are |
| `fixer` | The Fixer | street — who to call, where to lose a tail, local knowledge |

The hero already promises: *"Six personalities. One of them becomes yours."*

## Business model

Freemium. **Free**: basic companion, limited conversation, basic
challenges. **Pro**: advanced personalities, expanded memory, more voice,
advanced mission generation. **Marketplace**: premium characters, creator
subscriptions, revenue share.

---

# Design doctrine — read this twice

The site must look **designed**, not generated. The brief from the founder
was explicit: sophisticated, and nothing that reads as AI output.

## Banned outright

- `border-radius` above 2px. The global reset zeroes it.
- `box-shadow`. Also zeroed globally.
- `backdrop-filter` / glassmorphism. Frosted cards are the single loudest
  tell.
- Colour gradients as decoration. Purple-to-blue anything.
- Generic icon sets (Lucide/Feather/Heroicons) dropped into feature cards.
- Emoji as iconography.
- A 3-column grid of equal cards with an icon, a bold title and two lines
  of grey text. This is the shape of generated marketing pages.
- Copy that sounds like an assistant: "Seamlessly...", "Unlock the power
  of...", "Elevate your...", "How can I help you today?"
- Pill-shaped buttons.

## Required

- **Typography carries the page.** Archivo variable at `font-stretch: 64%`
  for display — a real condensed cut on the `wdth` axis, not a squashed
  one. Instrument Sans for body. JetBrains Mono for labels and data.
- **Asymmetry.** The 12-column grid exists to be broken deliberately.
  Things sit at column 9, not at "66%".
- **Restraint with the accent.** Magenta `#FF2D6F` should occupy under 5%
  of any viewport. Currently: full stops in the headline, numerals, the
  live dot. Deep teal `#0F3B38` is a large flat field colour only.
- **Hairlines, not borders.** 1px at low alpha. Dot leaders. Rules.
- **Texture over gloss.** Desaturated `feTurbulence` grain at 6%,
  fixed, `mix-blend-mode: overlay`.
- **Copy in character.** The co-pilot in the hero says *"eleven minutes on
  the causeway. nine if you stop asking."* — not "I can help you plan a
  route." Specific nouns. Lowercase. Clipped. Opinions. It pushes back.
- **Motion that is one idea, done well.** A single mask reveal primitive
  (`lib/motion/Reveal.tsx`), Lenis smooth scroll on the GSAP ticker.
  Everything resolves instantly under `prefers-reduced-motion`.

## Design system reference

`app/globals.css` is the source of truth. It holds:

- Theme tokens: `--color-ink`, `--color-ink-raise`, `--color-ink-deep`,
  `--color-bone`, `--color-bone-dim`, `--color-bone-mute`,
  `--color-magenta`, `--color-teal`, `--color-line`, `--color-line-soft`,
  `--color-line-hard`. These generate Tailwind utilities
  (`text-bone-dim`, `bg-teal/20`, `border-line`, …).
- Type classes: `.t-display-xl` `.t-display-l` `.t-display-m`
  `.t-display-s` `.t-head` `.t-lede` `.t-body-lg` `.t-small` `.t-label`
  `.t-mono`. They set family/size/weight/leading/tracking and deliberately
  never set colour — colour always comes from a Tailwind utility.
- Layout: `.shell` (max 1680px, fluid padding), `.grid-12` (12 columns,
  24px gutter).
- Components: `.panel` (hairline + raised ink, no radius), `.btn-stamp`
  (hard-edged action), `.wordmark`, `.dot-live`, `.rule`, `.link-wipe`.
- Motion: `.mask` + `[data-reveal]` pre-states.

Display sizes are fluid by `clamp()` and never by breakpoint utilities.
`--t-display-xl` is tuned so the widest hero line (4.771 × font-size)
fits 8 columns at every width from 360px to 2560px.

## Built so far

- `S0` design system, grid, grain, Lenis + GSAP runtime, nav, status bar,
  column guides (press G).
- `S1` boot sequence (dot-leader load log, skippable, once per tab) and
  the hero: three lines of display type with magenta full stops, a live
  co-pilot console at columns 9–12, a lede and three numbered facts.

Sections still to build: Premise, Co-Pilot, Missions, Audio/DJ, Memory,
Marketplace, Architecture, Pricing, Horizon, Access, Footer.
