import Section from "@/components/primitives/Section";
import DotRow from "@/components/primitives/DotRow";
import Quote from "@/components/primitives/Quote";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";

/* One generated brief, shown whole. A list of feature bullets would say the
   same thing and prove none of it. */
const BRIEF = {
  codename: "Capital, no powder",
  issued: "02:14 · session 27",
  rows: [
    ["Objective", "move 250k before sunrise"],
    ["Constraint", "no weapon fired"],
    ["Constraint", "two deliveries over 140"],
    ["Constraint", "finish with the panels straight"],
    ["Pays", "850 xp · unlocks the importer"],
  ] as Array<[string, string]>,
};

const INPUTS: Array<[string, string]> = [
  ["01", "What you did last session, and what you avoided."],
  ["02", "What the city is offering tonight."],
  ["03", "The personality you are riding with, and what it refuses to do."],
];

export default function Missions() {
  return (
    <Section id="missions" n="02" label="Missions">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>The night</MaskLine>
          <MaskLine>
            has an objective<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end md:col-span-8 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            It reads the last session and writes tonight&rsquo;s brief. Take it,
            argue it down, or ask for something harder. The constraints are the
            point &mdash; anyone can tell you to go and earn money.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 gap-y-12 pt-16 lg:pt-20">
        {/* ── The brief ──────────────────────────────────────── */}
        <Reveal kind="fade" className="col-span-12 lg:col-span-6">
          <div className="panel">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <span className="t-label text-bone">Tonight</span>
              <span className="t-label text-bone-mute">{BRIEF.issued}</span>
            </div>

            <div className="px-4 pt-5 pb-2">
              <p className="t-head text-bone">{BRIEF.codename}</p>
              <ul className="mt-4">
                {BRIEF.rows.map(([term, value], i) => (
                  <DotRow
                    key={term + i}
                    term={term}
                    value={value}
                    accent={term === "Pays"}
                  />
                ))}
              </ul>
            </div>

            <div className="border-t border-line px-4 py-3">
              <span className="t-label text-bone-mute">
                Generated · not scripted
              </span>
            </div>
          </div>
        </Reveal>

        {/* ── What it reads ──────────────────────────────────── */}
        <Reveal
          kind="fade"
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-label mb-6 text-bone-mute">What it reads</p>
          <ul>
            {INPUTS.map(([n, text], i) => (
              <li
                key={n}
                className={`flex items-baseline gap-5 py-4 ${
                  i === 0 ? "" : "border-t border-line-soft"
                }`}
              >
                <span className="t-label shrink-0 text-magenta">{n}</span>
                <span className="t-body-lg text-bone">{text}</span>
              </li>
            ))}
          </ul>

          <Quote
            className="mt-12"
            attribution="The Hustler · on the third night of the same contract"
          >
            you&rsquo;ve run this one three nights. tonight you do it without
            the gun.
          </Quote>
        </Reveal>
      </div>
    </Section>
  );
}
