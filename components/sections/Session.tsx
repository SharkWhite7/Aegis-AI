import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import Tabs from "@/components/primitives/Tabs";
import MissionsPanel from "./session/MissionsPanel";
import AudioPanel from "./session/AudioPanel";
import MemoryPanel from "./session/MemoryPanel";

/**
 * Missions, Audio and Memory were three sections of roughly a screen and
 * a half each. They are one night from three angles, so they are now one
 * section the reader steps through — 4.1k pixels of scroll become 1.6k,
 * and nothing was cut.
 */
export default function Session() {
  return (
    <Section id="session" n="04" label="The session">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>It runs</MaskLine>
          <MaskLine>
            The night<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            A brief to chase, a score to drive to, and a record of what
            happened. Three jobs, one night.
          </p>
        </Reveal>
      </div>

      <Reveal kind="fade" start="top 80%" className="mt-14 lg:mt-16">
        <Tabs
          label="The session"
          items={[
            { id: "missions", label: "Missions", panel: <MissionsPanel /> },
            { id: "audio", label: "Audio", panel: <AudioPanel /> },
            { id: "memory", label: "Memory", panel: <MemoryPanel /> },
          ]}
        />
      </Reveal>
    </Section>
  );
}
