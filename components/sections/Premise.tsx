import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";

/**
 * Claims about the co-pilot's own record — not about any game's save
 * format. GTA VI is unreleased and nobody here has read its save file;
 * stating its internals in a mono table would read as measurement.
 * "Needs from the game: nothing" is the no-mods position stated as a spec.
 */
const RECORD: Array<[string, string]> = [
  ["What it keeps", "every session"],
  ["What it forgets", "nothing"],
  ["What it needs from the game", "nothing"],
];

const LEADER = "·".repeat(120);

export default function Premise() {
  return (
    <Section id="premise" n="02" label="Premise">
      <div className="grid-12 items-end gap-y-14">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-l col-span-12 text-bone lg:col-span-7"
        >
          <MaskLine className="whitespace-nowrap">The game</MaskLine>
          <MaskLine className="whitespace-nowrap">Keeps score.</MaskLine>
          <MaskLine className="whitespace-nowrap">It cannot</MaskLine>
          <MaskLine className="whitespace-nowrap">
            Remember<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.22}
          className="col-span-12 lg:col-span-4 lg:col-start-9"
        >
          <p className="t-lede text-bone-dim">
            Four hundred hours in, the game knows your completion percentage
            and nothing else. It was never listening — not to the run you
            abandoned twice, not to the car you went back for, not to what
            you said while you drove. A save file holds flags. It was never
            built to hold a night.
          </p>
        </Reveal>
      </div>

      <Reveal kind="fade" start="top 78%">
        {/* Bracketed by a rule top and bottom. A bracket needs two sides;
            open at the top it is just the hero's facts list again. */}
        <div className="grid-12 mt-20 lg:mt-24">
          <dl className="col-span-12 border-y border-line lg:col-span-6">
            {RECORD.map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-baseline gap-4 py-3 ${
                  i === 0 ? "" : "border-t border-line-soft"
                }`}
              >
                <dt className="t-label min-w-0 text-bone-dim">{k}</dt>
                <span
                  className="leader-dots t-mono hidden text-bone-mute sm:block"
                  aria-hidden
                >
                  {LEADER}
                </span>
                <dd className="t-mono ml-auto shrink-0 text-right text-bone sm:ml-0">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Mirror of the hero's right-bled teal column, bled left, so the
            page alternates rather than repeats. */}
        <div className="mt-20 lg:mt-24">
          <hr className="rule" />
          <div className="grid-12">
            <div className="bleed-left col-span-12 bg-teal py-16 lg:col-span-9 lg:py-20">
              <div className="grid-12">
                <p className="t-quote col-span-12 text-bone lg:col-span-7 lg:col-start-2">
                  Something that was listening would have an opinion about all
                  of it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
