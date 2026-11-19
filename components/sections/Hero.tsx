import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import SectionLabel from "@/components/primitives/SectionLabel";
import Console from "@/components/primitives/Console";
import { SITE } from "@/lib/site";
import type { Turn } from "@/lib/personas";

/* Scripted demo, not persona data — it carries a player turn and the music
   handoff, which the dossier transcripts in section 03 deliberately do not. */
const HERO_TRANSCRIPT: Turn[] = [
  { t: "22:14", text: "you pulled off the freeway. we doing this or not?" },
  { t: "22:14", text: "buyer in little havana wants the coupe. forty grand, no guns." },
  { t: "22:15", who: "you", text: "how long" },
  { t: "22:15", text: "eleven minutes on the causeway. nine if you stop asking." },
  { t: "22:16", text: "putting something on for the drive." },
];

const FACTS: Array<[string, string]> = [
  ["01", "Runs alongside the game. No mods, no injection."],
  ["02", "Remembers every session you have ever played."],
  ["03", "Six personalities. One of them becomes yours."],
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] scroll-mt-[var(--nav-h)] flex-col justify-between overflow-hidden pt-[var(--nav-h)]"
    >
      {/* Field block, snapped to column 9 so its edge lands on the grid
          rather than at an arbitrary percentage, then bled off-screen.
          No left border: it would only restate the console's own edge up
          top, and below the rule it cuts straight through the facts. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
      >
        <div className="shell h-full">
          <div className="grid-12 h-full">
            <div
              className="col-span-4 col-start-9 h-full bg-teal/20"
              style={{ marginRight: "calc(var(--shell-pad) * -1)" }}
            />
          </div>
        </div>
      </div>

      {/* ── Meta row ─────────────────────────────────────────── */}
      <div className="shell relative w-full pt-8">
        <div className="grid-12 items-center">
          <div className="col-span-7">
            <SectionLabel n="00">Companion</SectionLabel>
          </div>
          <div className="col-span-5 flex justify-end">
            <p className="t-label text-right text-bone-mute">
              <span className="text-bone">{SITE.status}</span>
              <span className="mx-2" aria-hidden>
                &middot;
              </span>
              Entry point &mdash; GTA VI
            </p>
          </div>
        </div>
      </div>

      {/* ── Statement ────────────────────────────────────────── */}
      <div className="shell relative w-full py-12 lg:py-8">
        <div className="grid-12 items-start gap-y-12">
          <Reveal
            as="h1"
            onBoot
            delay={0.18}
            stagger={0.085}
            className="t-display-xl col-span-12 text-bone lg:col-span-8"
          >
            <MaskLine className="whitespace-nowrap">
              Your World<span className="text-magenta">.</span>
            </MaskLine>
            <MaskLine className="whitespace-nowrap">
              Your AI<span className="text-magenta">.</span>
            </MaskLine>
            <MaskLine className="whitespace-nowrap">
              Your Story<span className="text-magenta">.</span>
            </MaskLine>
          </Reveal>

          <Reveal
            kind="fade"
            onBoot
            delay={0.62}
            className="col-span-12 lg:col-span-4 lg:mt-2"
          >
            <Console
              turns={HERO_TRANSCRIPT}
              title="The Hustler"
              nowPlaying="night tape — side b"
              animateOnBoot
              delay={0.95}
            />
          </Reveal>
        </div>
      </div>

      {/* ── Footing ──────────────────────────────────────────── */}
      <Reveal
        kind="fade"
        onBoot
        delay={0.78}
        className="shell relative w-full pb-14"
      >
        <hr className="rule" />
        <div className="grid-12 gap-y-10 pt-8">
          <div className="col-span-12 md:col-span-5">
            <p className="t-lede text-bone-dim">{SITE.description}</p>
            <a href="#access" className="btn-stamp mt-7">
              Request access
              <span className="arrow" aria-hidden>
                &#8594;
              </span>
            </a>
          </div>

          <ul className="col-span-12 md:col-span-6 md:col-start-7">
            {FACTS.map(([n, text], i) => (
              <li
                key={n}
                className={`flex items-baseline gap-5 py-3.5 ${
                  i === 0 ? "" : "border-t border-line-soft"
                }`}
              >
                <span className="t-label shrink-0 text-magenta">{n}</span>
                <span className="t-body-lg text-bone">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
