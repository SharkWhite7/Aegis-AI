import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { INCLUDED, CHANGE_LINE } from "@/lib/pricing";

export default function Pricing() {
  return (
    <Section id="pricing" n="09" label="Price">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Free.</MaskLine>
          <MaskLine>
            Not forever<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            Nothing is held back for a tier that does not exist yet. There
            is no trial, no cap, and no locked row.
          </p>
        </Reveal>
      </div>

      {/* One unbroken run. No dividing rules anywhere in this block —
          there are no tiers to divide, and the absence is the argument. */}
      <Reveal kind="fade" start="top 80%" className="mt-20 lg:mt-24">
        <p className="t-head col-span-12 text-bone">
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
      </Reveal>

      <Reveal kind="fade" start="top 85%" className="mt-16 lg:mt-20">
        <div className="grid-12 gap-y-5">
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
