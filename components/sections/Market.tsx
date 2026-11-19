import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { SHEET, TERMS } from "@/lib/market";
import { INCLUDED, CHANGE_LINE } from "@/lib/pricing";

export default function Market() {
  return (
    <Section id="market" n="05" label="Marketplace">
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

      {/* Price. A sub-block rather than its own section: the sheet above
          is what you make, this is what it costs to run it. One unbroken
          run of items — there are no tiers to divide, and the absence of
          dividing rules is the argument. */}
      <Reveal kind="fade" start="top 85%" className="mt-12 lg:mt-14">
        <hr className="rule" />
        <div className="grid-12 mt-8 items-end gap-y-8">
          <h3 className="t-display-s col-span-12 text-bone lg:col-span-4">
            Free. Not forever<span className="text-magenta">.</span>
          </h3>
          <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-6 lg:col-start-7">
            Nothing is held back for a tier that does not exist yet. There is
            no trial, no cap, and no locked row.
          </p>
        </div>

        <p className="t-head mt-10 text-bone">
          {INCLUDED.map((item, i) => (
            <span key={item}>
              {i > 0 && (
                <span className="mx-3 text-bone-mute" aria-hidden>
                  &middot;
                </span>
              )}
              {item}
            </span>
          ))}
        </p>

        <div className="grid-12 mt-10 gap-y-5">
          <p className="t-label col-span-12 text-bone-dim lg:col-span-3">
            What happens later
          </p>
          <p className="t-body-lg col-span-12 text-bone lg:col-span-7 lg:col-start-5">
            {CHANGE_LINE}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
