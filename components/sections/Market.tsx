import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { SHEET, TERMS } from "@/lib/market";

export default function Market() {
  return (
    <Section id="market" n="08" label="Marketplace">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Make the</MaskLine>
          <MaskLine>
            Seventh<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            The six are not special. They are written to a sheet anyone can
            write to, and this is the whole of it.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 mt-20 gap-y-16 lg:mt-24">
        {/* The blank sheet. Showing the character limits is the point:
            they are the craft constraint the six were written against. */}
        <Reveal
          kind="fade"
          start="top 80%"
          className="col-span-12 lg:col-span-7"
        >
          <p className="t-label text-bone-dim">Character sheet</p>
          <dl className="mt-5 border-b border-line">
            {SHEET.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-baseline gap-5 py-4 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <dt className="t-label min-w-0 text-bone sm:w-48 sm:shrink-0">
                  {f.label}
                </dt>
                {/* The rule needs slack to be a rule. Below sm there is
                    none, so label and hint simply share the line. */}
                <span
                  className="hidden h-px min-w-6 flex-1 -translate-y-[0.35em] bg-line-hard sm:block"
                  aria-hidden
                />
                <dd className="t-mono ml-auto shrink-0 text-right text-bone-dim sm:ml-0">
                  {f.hint}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal
          kind="fade"
          start="top 80%"
          delay={0.1}
          className="col-span-12 lg:col-span-4 lg:col-start-9"
        >
          <p className="t-label text-bone-dim">Terms</p>
          <ul className="mt-5">
            {TERMS.map((t, i) => (
              <li
                key={t.n}
                className={`py-5 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="t-label nums shrink-0 text-magenta">
                    {t.n}
                  </span>
                  <h3 className="t-head text-bone">{t.head}</h3>
                </div>
                <p className="t-small mt-3 text-bone-dim">{t.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
