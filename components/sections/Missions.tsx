import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { BRIEF, LEDGER } from "@/lib/missions";

export default function Missions() {
  return (
    <Section id="missions" n="05" label="Missions">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>It writes</MaskLine>
          <MaskLine>
            The brief<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            Nobody wrote these in advance. They come from what you did
            last week.
          </p>
        </Reveal>
      </div>

      {/* The brief: bracketed by rules, never boxed — the console and the
          profile card already own the panel. */}
      <Reveal kind="fade" start="top 80%" className="mt-20 lg:mt-24">
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <span className="t-label text-bone">Brief {BRIEF.no}</span>
          <span className="t-label text-bone-dim">Issued {BRIEF.issued}</span>
        </div>

        <div className="grid-12 gap-y-12 py-10">
          <div className="col-span-12 lg:col-span-7">
            <p className="t-head text-bone">{BRIEF.objective}</p>

            <ol className="mt-10">
              {BRIEF.constraints.map((c, i) => (
                <li
                  key={c}
                  className={`flex items-baseline gap-5 py-3 ${
                    i === 0 ? "border-t border-line" : "border-t border-line-soft"
                  }`}
                >
                  <span className="t-label nums shrink-0 text-magenta">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="t-mono text-bone">{c}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Provenance. Separated from the artefact on purpose: the brief
              is what was generated, this is what it was generated from. */}
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="t-label text-bone-dim">Why this one</p>
            <div className="mt-5 border-t border-line pt-5">
              {BRIEF.why.map((line) => (
                <p key={line} className="t-mono text-bone-dim">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* The ledger: proof that these accumulate, including the ones that
          did not go well. */}
      <Reveal kind="fade" start="top 85%" className="mt-16 lg:mt-20">
        <p className="t-label text-bone-dim">Ledger</p>
        <dl className="mt-5 border-b border-line">
          {LEDGER.map((row, i) => (
            <div
              key={row.no}
              className={`grid-12 items-baseline py-3.5 ${
                i === 0 ? "border-t border-line" : "border-t border-line-soft"
              }`}
            >
              <dt className="t-label nums col-span-3 text-bone-dim sm:col-span-2 lg:col-span-1">
                {row.no}
              </dt>
              <dd className="t-mono col-span-9 text-bone sm:col-span-7 lg:col-span-8">
                {row.brief}
              </dd>
              <dd
                className={`t-label col-span-12 mt-2 sm:col-span-3 sm:mt-0 sm:text-right ${
                  row.outcome === "issued" ? "text-magenta" : "text-bone-dim"
                }`}
              >
                {row.outcome}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}
