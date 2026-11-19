import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import BuildBar from "./access/BuildBar";

export default function Access() {
  return (
    <Section id="access" n="10" label="Access">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Not open</MaskLine>
          <MaskLine>
            Yet<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            No launch date yet, and this page will not invent one. What it
            shows is where the build actually stands.
          </p>
        </Reveal>
      </div>

      <Reveal kind="fade" start="top 80%" className="mt-20 lg:mt-24">
        <div className="grid-12 gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <BuildBar />
          </div>

          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <p className="t-head text-bone">
              Leave an address and you hear from us once, when it opens.
            </p>
            <p className="t-small mt-6 text-bone-dim">
              Once. Not a newsletter, not a drip sequence, not a launch
              countdown. The next thing in your inbox from us is the thing
              working.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
