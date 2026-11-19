import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import BuildBar from "./access/BuildBar";

export default function Access() {
  return (
    <Section id="access" n="06" label="Access">
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

      {/* The build bar stands alone. There is no mailing-list promise
          beside it, so it takes the width rather than leaving a column
          of nothing where a pitch used to be. */}
      <Reveal kind="fade" start="top 80%" className="mt-14 lg:mt-16">
        <div className="grid-12">
          <div className="col-span-12 lg:col-span-7">
            <BuildBar />
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
