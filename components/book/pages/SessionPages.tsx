import { BRIEF, LEDGER } from "@/lib/missions";
import { CUES } from "@/lib/audio";
import { THREAD } from "@/lib/memory";

function Head({ head, lede }: { head: string; lede: string }) {
  return (
    <div className="grid-12 items-end gap-y-5">
      <h2 className="t-head col-span-12 text-bone lg:col-span-5">
        {head}
        <span className="text-magenta">.</span>
      </h2>
      <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-6 lg:col-start-7">
        {lede}
      </p>
    </div>
  );
}

/** The artefact, whole: what was generated. */
export function Brief() {
  return (
    <div>
      <Head
        head="It writes the brief"
        lede="Nobody wrote these in advance. They come from what you did last week."
      />

      <div className="mt-10 lg:mt-12">
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <span className="t-label text-bone">Brief {BRIEF.no}</span>
          <span className="t-label text-bone-dim">Issued {BRIEF.issued}</span>
        </div>

        <div className="grid-12 gap-y-10 pt-8">
          <div className="col-span-12 lg:col-span-7">
            <p className="t-head text-bone">{BRIEF.objective}</p>
            <ol className="mt-8">
              {BRIEF.constraints.map((c, i) => (
                <li
                  key={c}
                  className={`flex items-baseline gap-5 py-2.5 ${
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

          {/* Provenance, apart from the artefact on purpose: the brief is
              what was generated, this is what it was generated from. */}
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
      </div>
    </div>
  );
}

/** Proof that they accumulate, including the ones that went badly. */
export function Ledger() {
  return (
    <div>
      <p className="t-label text-bone-dim">Ledger</p>
      <dl className="mt-5 border-b border-line">
        {LEDGER.map((row, i) => (
          <div
            key={row.no}
            className={`grid-12 items-baseline py-4 ${
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
    </div>
  );
}

export function Audio() {
  return (
    <div>
      <Head
        head="It knows when to stop"
        lede="Picking a record is the easy half. Knowing the minute to play nothing is the hard one."
      />

      <div className="grid-12 mt-10 gap-y-12 lg:mt-12">
        {/* Moment above, decision below — a script annotation, not another
            two-column table. */}
        <div className="col-span-12 lg:col-span-7">
          <p className="t-label text-bone-dim">Cue sheet</p>
          <ol className="mt-4 border-b border-line">
            {CUES.map((cue, i) => (
              <li
                key={cue.no}
                className={`flex gap-5 py-4 ${
                  i === 0 ? "border-t border-line" : "border-t border-line-soft"
                }`}
              >
                <span className="t-label nums shrink-0 pt-1 text-bone-dim">
                  {cue.no}
                </span>
                <div className="min-w-0">
                  <p className="t-body-lg text-bone">{cue.moment}</p>
                  <p className="t-mono mt-1.5 text-bone-dim">
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

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <div className="bleed-right bg-teal px-6 py-8 lg:px-8 lg:py-10">
            <p className="t-label text-bone-dim">Connected service</p>
            <p className="t-head mt-4 text-bone">Spotify</p>
            <p className="t-small mt-6 text-bone-dim">
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
    </div>
  );
}

export function Memory() {
  return (
    <div>
      <Head
        head="It starts knowing nothing"
        lede="Everything it knows, it learned from you. The first session is almost useless. The hundredth is not."
      />

      {/* The entries lengthen down the page on purpose: accumulation set as
          type, rather than described in a sentence about accumulation. */}
      <div className="mt-10 lg:mt-12">
        <ol className="border-b border-line">
          {THREAD.map((entry, i) => (
            <li
              key={entry.session}
              className={`grid-12 items-baseline gap-y-3 py-5 ${
                i === 0 ? "border-t border-line" : "border-t border-line-soft"
              }`}
            >
              <div className="col-span-12 flex items-baseline gap-4 lg:col-span-3">
                <span className="t-label text-bone-dim">Session</span>
                <span
                  className={`t-head nums ${
                    i === THREAD.length - 1 ? "text-bone" : "text-bone-dim"
                  }`}
                >
                  {entry.session}
                </span>
              </div>
              <p className="t-body-lg col-span-12 text-bone lg:col-span-8 lg:col-start-5">
                {entry.text}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Deletion is the other half of a memory claim. */}
      <div className="grid-12 mt-8 gap-y-4">
        <p className="t-label col-span-12 text-bone-dim lg:col-span-3">
          It is yours
        </p>
        <p className="t-small col-span-12 text-bone-dim lg:col-span-8 lg:col-start-5">
          Read it, export it, delete it. Deleting it is one line, not a
          settings page three menus deep &mdash; and afterwards the companion
          is back at session one, which is exactly as useless as it sounds.
        </p>
      </div>
    </div>
  );
}
