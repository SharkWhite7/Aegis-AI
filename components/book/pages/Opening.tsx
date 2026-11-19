import GameConsole from "@/components/sections/hero/GameConsole";
import { SITE } from "@/lib/site";

/* Mirrors the three facts the scrolling hero carried. */
const FACTS: Array<[string, string]> = [
  ["01", "Runs alongside the game. No mods, no injection."],
  ["02", "Remembers every session you have ever played."],
  ["03", "Six personalities. One of them becomes yours."],
];

/**
 * The cover. Display-l rather than the hero's display-xl: that clamp was
 * measured against eight columns of a scrolling page, and this frame is
 * shorter and wider. Three lines at display-l set 652px wide at 1440,
 * well inside the shell.
 */
export function Cover() {
  return (
    <div className="grid-12 items-end gap-y-10">
      <h1 className="t-display-l col-span-12 text-bone lg:col-span-7">
        Your World<span className="text-magenta">.</span>
        <br />
        Your AI<span className="text-magenta">.</span>
        <br />
        Your Story<span className="text-magenta">.</span>
      </h1>

      <div className="col-span-12 lg:col-span-4 lg:col-start-9">
        <p className="t-lede text-bone-dim">{SITE.description}</p>
        <p className="t-label mt-8 text-bone-mute">
          Turn the page
          <span className="ml-3 text-magenta" aria-hidden>
            &#8594;
          </span>
        </p>
      </div>
    </div>
  );
}

/** The claim demonstrating itself: change the title, the night changes. */
export function Live() {
  return (
    <div className="grid-12 items-start gap-y-12">
      <div className="col-span-12 lg:col-span-6">
        <GameConsole />
      </div>

      <ul className="col-span-12 lg:col-span-5 lg:col-start-8">
        {FACTS.map(([n, text], i) => (
          <li
            key={n}
            className={`flex items-baseline gap-5 py-4 ${
              i === 0 ? "" : "border-t border-line-soft"
            }`}
          >
            <span className="t-label shrink-0 text-magenta">{n}</span>
            <span className="t-body-lg text-bone">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
