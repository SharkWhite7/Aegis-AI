# Handover — the site on `main`

Written by the session that built sections 01 through 10, on standing
down. Everything below is either measured or was found by breaking it.

## State

Ten sections live on `main`: hero, Premise, Co-Pilot, Your Game,
Missions, Audio, Memory, Marketplace, Price, Access. Lint and typecheck
exit 0; the production build is static. A read-only copy is published at
https://claude.ai/artifact/NfzNjrM2EnaVZcoTkRzEF1 (private).

## Invariants that are arithmetic, not taste

Break these and the page fails quietly, which is how each was found.

**Display sizes are derived from measured glyph widths.** `--t-display-xl`
is `clamp(3.5rem, 11.8vw, 12.5rem)` because the widest hero line measures
**4.771 × font-size** in Archivo at `font-stretch: 64%`, and that has to
fit 8 columns at every width from 360 to 2560px. Change the face, the
width axis, the copy or the column span and you must re-measure. The
first version was eyeballed and wrapped a line at two common widths.

**Never put `whitespace-nowrap` on a display line.** `body` carries
`overflow-x: clip`, so a line that outgrows its column does not wrap —
it leaves the viewport and the page hides it with no scrollbar to hint
anything is missing. Silent truncation is the worst failure mode
available. Removed everywhere; regression-tested by injecting a 56%
longer string.

**The mask pre-state uses `translate`, not `transform`.** GSAP parses an
existing `transform` as a base offset and composes its tween on top of
it, so a masked line animates 105% → 0% while still sitting 179px down,
stranded inside its own mask. GSAP nulls `translate` when it takes over,
so the handover is clean. `lib/motion/Reveal.tsx` also pins `y: 0` in
both halves of the tween as a second guard.

**A grid must be the mask's grandchild, never its direct child.**
`.mask > *` is `display: block` and is declared after `.grid-12` at equal
specificity, so source order wins and a grid placed directly inside
collapses into stacked blocks.

**A focus ring goes on the `.mask` element itself.** `.mask` is
`overflow: hidden`, which clips a ring drawn on any descendant.

**`.bleed-left` / `.bleed-right` derive from `--container-shell`.** A
plain `-(--shell-pad)` only reaches the shell's padding edge, so above
about 1824px the band stops short of the viewport and the bleed reads as
a mistake. Measured 120px short at 1920, 440px at 2560.

**Verify at a sub-path, never at the domain root.** The first publish
shipped with no stylesheet because the export was tested at
`localhost:3000/`, where absolute asset paths work by accident.
`scripts/export-static.py` encodes the four places that break off-root.

## Open, in rough order of cost

1. **`--color-bone-mute` is 2.85:1 on ink** — below the 4.5:1 AA minimum,
   and still carrying content in the hero facts and the status bar. New
   sections already use `bone-dim` (6.8:1); the old ones were never swept.
2. **No footer**, and therefore no non-affiliation notice. The product is
   a companion for third-party games and the original name came off a
   Rockstar property; a disclaimer was flagged on day one and never built.
3. **No email input in Access.** The copy is there, the field is not,
   because a form that drops addresses is worse than no form. PR #1 brings
   the endpoint.
4. **Section 09 Architecture is unbuilt.** A design workflow chose a
   five-lane timing diagram built from 1px grid-placed divs rather than
   SVG — so the marks land on the real 12-column field and `G` verifies
   them. An adversarial pass then returned seven blocking findings on it;
   it should not be built from the original spec without them.
5. **Numbering shifts.** Price is 09 and Access is 10 because the index
   lists only sections that exist. Both move when Architecture lands.
6. **A copy conflict with PR #1.** Access promises "you hear from us
   once… not a drip sequence", and the backend schema has `confirmed_at`
   for double opt-in, which means two emails. See
   `server/WAITLIST-ENDPOINT.md`. One of the two has to give.

## Still undecided, and getting more expensive

Three landing pages exist: this one on `main`, `feat/coming-soon-landing`
(an independent implementation of the same sections from an older base),
and `feat/landing-estatica` (a standalone hand-written HTML page).
Neither of the latter two has been evaluated or discarded.

## The doctrine, in one line

Nothing is fabricated. The GTA VI profile card ships four empty fields
and a sentence saying the game is not out, because that is more credible
than filling them in. Three sections were rebuilt for breaking this.
`docs/brief.md` has the long version.
