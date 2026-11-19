/**
 * Claims about the co-pilot's own record — not about any game's save
 * format. "Needs from the game: nothing" is the no-mods position stated
 * as a spec.
 */
const RECORD: Array<[string, string]> = [
  ["What it keeps", "every session"],
  ["What it forgets", "nothing"],
  ["What it needs from the game", "nothing"],
];

const LEADER = "·".repeat(120);

export function PremiseStatement() {
  return (
    <div className="grid-12 items-end gap-y-12">
      <h2 className="t-display-m col-span-12 text-bone lg:col-span-7">
        The game
        <br />
        Keeps score.
        <br />
        It cannot
        <br />
        Remember<span className="text-magenta">.</span>
      </h2>

      <p className="t-lede col-span-12 text-bone-dim lg:col-span-4 lg:col-start-9">
        Four hundred hours in, the game knows your completion percentage and
        nothing else. It was never listening &mdash; not to the run you
        abandoned twice, not to the car you went back for. A save file holds
        flags. It was never built to hold a night.
      </p>
    </div>
  );
}

export function Record() {
  return (
    <div>
      {/* Bracketed by a rule top and bottom. A bracket needs two sides. */}
      <div className="grid-12">
        <dl className="col-span-12 border-y border-line lg:col-span-6">
          {RECORD.map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-baseline gap-4 py-3 ${
                i === 0 ? "" : "border-t border-line-soft"
              }`}
            >
              <dt className="t-label min-w-0 text-bone-dim">{k}</dt>
              <span
                className="leader-dots t-mono hidden text-bone-mute sm:block"
                aria-hidden
              >
                {LEADER}
              </span>
              <dd className="t-mono ml-auto shrink-0 text-right text-bone sm:ml-0">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* The teal field, bled left, so the book alternates sides rather
          than repeating the cover's right-hand column. */}
      <div className="mt-12 lg:mt-14">
        <div className="grid-12">
          <div className="bleed-left col-span-12 bg-teal py-12 lg:col-span-9 lg:py-16">
            <div className="grid-12">
              <p className="t-quote col-span-12 text-bone lg:col-span-7 lg:col-start-2">
                Something that was listening would have an opinion about all
                of it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
