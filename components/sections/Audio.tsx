import Section from "@/components/primitives/Section";
import DotRow from "@/components/primitives/DotRow";
import Quote from "@/components/primitives/Quote";
import Waveform from "@/components/primitives/Waveform";
import Reveal, { MaskLine } from "@/lib/motion/Reveal";

/* Scene → tape. BPM is the honest unit here: it is what the DJ argues in. */
const SCORE: Array<[string, string]> = [
  ["Pursuit", "sirens, side a · 148"],
  ["Ocean drive, late", "dub, no vocals · 96"],
  ["Street race", "baile, redline · 132"],
  ["After the drop", "comedown tape · 74"],
  ["Driving nowhere", "night tape, side b · 88"],
];

export default function Audio() {
  return (
    <Section id="audio" n="03" label="Audio">
      <div className="grid-12 gap-y-14">
        <Reveal
          as="h2"
          className="t-display-m col-span-12 text-bone lg:col-span-7"
        >
          <MaskLine>It scores the drive</MaskLine>
          <MaskLine>
            and takes no requests<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 self-end md:col-span-8 lg:col-span-4 lg:col-start-9"
        >
          <p className="t-body-lg text-bone-dim">
            Connect Spotify and it runs the queue, in tempo with what you are
            doing. Leave it disconnected and it just tells you what to put on,
            which it will do whether you asked or not.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 gap-y-12 pt-16 lg:pt-20">
        <Reveal kind="fade" className="col-span-12 lg:col-span-6">
          <div className="flex items-end justify-between gap-6 pb-4">
            <p className="t-label text-bone-mute">Scene &rarr; tape</p>
            <Waveform className="w-24" />
          </div>
          <hr className="rule" />
          <ul>
            {SCORE.map(([scene, tape], i) => (
              <DotRow
                key={scene}
                term={scene}
                value={tape}
                accent={i === 0}
                className="border-b border-line-soft"
              />
            ))}
          </ul>
          <p className="t-small mt-6 text-bone-mute">
            Playback control needs a Premium account and your authorisation.
            Revoke it from Spotify and the DJ goes back to talking.
          </p>
        </Reveal>

        <Reveal
          kind="fade"
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <Quote attribution="The DJ · 01:51, holding the good one back">
            that was 96 bpm and you were doing thirty. the record was not the
            problem.
          </Quote>
        </Reveal>
      </div>
    </Section>
  );
}
