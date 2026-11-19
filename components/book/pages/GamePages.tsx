import ProfileFinder from "@/components/sections/your-game/ProfileFinder";

const STAYS: Array<[string, string, string]> = [
  ["01", "Written here", "The profile, from the title alone. No port, no plugin, no per-game engineering."],
  ["02", "Captured here", "Screen, audio, and what you say out loud. The game is never touched."],
  ["03", "Kept here", "Every session, carried into the next one. Not held in a context window."],
];

export function AnyTitle() {
  return (
    <div>
      <div className="grid-12 items-end gap-y-8">
        <h2 className="t-display-m col-span-12 text-bone lg:col-span-6">
          Any title.
          <br />
          Not a shortlist<span className="text-magenta">.</span>
        </h2>
        <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-5 lg:col-start-8">
          You type what you play. AEGIS AI writes the profile before your
          first session.
        </p>
      </div>

      <div className="mt-10 lg:mt-12">
        <ProfileFinder />
      </div>
    </div>
  );
}

export function Stays() {
  return (
    <div>
      <p className="t-label text-bone-dim">Where the work happens</p>
      <hr className="rule mt-5" />
      <ul className="grid-12 gap-y-10 pt-10">
        {STAYS.map(([n, head, body]) => (
          <li key={n} className="col-span-12 md:col-span-4">
            <div className="flex items-baseline gap-4">
              <span className="t-label shrink-0 text-magenta">{n}</span>
              <h3 className="t-head text-bone">{head}</h3>
            </div>
            <p className="t-small mt-4 text-bone-dim">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
