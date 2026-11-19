import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import ProfileFinder from "./your-game/ProfileFinder";

const STAYS: Array<[string, string, string]> = [
  ["01", "Written here", "The profile, from the title alone. No port, no plugin, no per-game engineering."],
  ["02", "Captured here", "Screen, audio, and what you say out loud. The game is never touched."],
  ["03", "Kept here", "Every session, carried into the next one. Not held in a context window."],
];

export default function YourGame() {
  return (
    <Section id="your-game" n="03" label="Your Game">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Any title.</MaskLine>
          <MaskLine>
            Not a shortlist<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            You type what you play. AEGIS AI writes the profile before
            your first session.
          </p>
        </Reveal>
      </div>

      <Reveal kind="fade" start="top 80%" className="mt-14 lg:mt-16">
        <ProfileFinder />
      </Reveal>

      <Reveal kind="fade" start="top 85%" className="mt-14 lg:mt-16">
        <hr className="rule" />
        <ul className="grid-12 gap-y-9 pt-9">
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
      </Reveal>
    </Section>
  );
}
