import Section from "@/components/primitives/Section";
import DotRow from "@/components/primitives/DotRow";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";

/* What a character file actually holds. Taken from the same shape the six
   built-in personalities are written in. */
const FILE: Array<[string, string]> = [
  ["name", "the mechanic"],
  ["voice", "diagnosis, then the bill"],
  ["watches", "engine damage · launch · lot"],
  ["remembers", "garage · builds · lap times"],
  ["speaks when", "event, question, or 90s quiet"],
  ["won't", "admire the paint"],
];

const TERMS: Array<[string, string]> = [
  ["Creator keeps", "70%"],
  ["Costs to publish", "Nothing"],
  ["Review window", "24h"],
];

export default function Market() {
  return (
    <Section id="market" n="05" label="Market">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Anyone can</MaskLine>
          <MaskLine>
            write one<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end md:col-span-8 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            A character is a file: a voice, a temper, what it watches, what it
            keeps, and when it is allowed to speak. Write one, price it, publish
            it. The six that ship with the app are written the same way.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 gap-y-12 pt-16 lg:pt-20">
        <Reveal kind="fade" className="col-span-12 lg:col-span-6">
          <div className="panel">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <span className="t-label text-bone">character file</span>
              <span className="t-label text-bone-mute">draft</span>
            </div>
            <ul className="px-4 py-3">
              {FILE.map(([term, value], i) => (
                <DotRow
                  key={term}
                  term={term}
                  value={value}
                  accent={i === FILE.length - 1}
                />
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-label mb-6 text-bone-mute">Terms</p>
          <ul>
            {TERMS.map(([term, value]) => (
              <li
                key={term}
                className="flex items-end justify-between gap-6 border-b border-line-soft py-5"
              >
                <span className="t-body-lg text-bone-dim">{term}</span>
                <span className="t-display-s text-bone">{value}</span>
              </li>
            ))}
          </ul>
          <p className="t-small mt-6 text-bone-mute">
            Creator tools come after the companion itself works. If you want to
            write characters for it, say so when you ask for access.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
