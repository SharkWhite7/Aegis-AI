import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { CUES } from "@/lib/audio";

export default function Audio() {
  return (
    <Section id="audio" n="06" label="Audio">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>It knows</MaskLine>
          <MaskLine>
            When to stop<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            Picking a record is the easy half. Knowing the minute to play
            nothing is the hard one.
          </p>
        </Reveal>
      </div>

      <div className="grid-12 mt-20 gap-y-16 lg:mt-24">
        {/* The cue sheet. Moment above, decision below — a script
            annotation, not another two-column table. */}
        <Reveal
          kind="fade"
          start="top 80%"
          className="col-span-12 lg:col-span-7"
        >
          <p className="t-label text-bone-dim">Cue sheet</p>
          <ol className="mt-5 border-b border-line">
            {CUES.map((cue, i) => (
              <li
                key={cue.no}
                className={`flex gap-5 py-5 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <span className="t-label nums shrink-0 pt-1 text-bone-dim">
                  {cue.no}
                </span>
                <div className="min-w-0">
                  <p className="t-body-lg text-bone">{cue.moment}</p>
                  <p className="t-mono mt-2 text-bone-dim">
                    <span className="mr-2 text-magenta" aria-hidden>
                      &rarr;
                    </span>
                    {cue.decision}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* Flat teal field, bled right — the hero's side, which the page
            has not used since. */}
        <Reveal
          kind="fade"
          start="top 80%"
          delay={0.1}
          className="col-span-12 lg:col-span-4 lg:col-start-9"
        >
          <div className="bleed-right bg-teal px-6 py-10 lg:px-8 lg:py-12">
            <p className="t-label text-bone-dim">Connected service</p>
            <p className="t-head mt-4 text-bone">Spotify</p>
            <p className="t-small mt-7 text-bone-dim">
              It takes the controls: the queue, the playlists, the volume.
            </p>
            <p className="t-small mt-4 text-bone-dim">
              It never adds anything to your library and it never posts.
              Playback only, and you can revoke it from Spotify the same
              minute you change your mind.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
