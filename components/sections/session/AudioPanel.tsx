import PanelHead from "./PanelHead";
import { CUES } from "@/lib/audio";

export default function AudioPanel() {
  return (
    <>
      <PanelHead
        head="It knows when to stop"
        lede="Picking a record is the easy half. Knowing the minute to play nothing is the hard one."
      />

      <div className="grid-12 mt-12 gap-y-14 lg:mt-14">
        {/* The cue sheet. Moment above, decision below — a script
            annotation, not another two-column table. */}
        <div className="col-span-12 lg:col-span-7">
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
        </div>

        {/* Flat teal field, bled right — the hero's side, which the page
            has not used since. */}
        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
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
        </div>
      </div>
    </>
  );
}
