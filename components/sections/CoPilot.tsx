import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { PERSONAS } from "@/lib/personas";
import { PROMPT_LINE, ANSWERS } from "@/lib/copilot";

const LEADER = "·".repeat(160);

/**
 * Six voices answering one line, all six visible at once.
 *
 * There is deliberately no selection here. Six labels in a list with
 * exactly one open and its content revealed adjacent is an accordion
 * however it is dressed, and the answers are close enough in length to
 * sit on the page together — so the page simply shows them. No state, no
 * drawer, no height invariant, no scroll compensation: a server component
 * that ships zero JavaScript.
 *
 * The leader earns its place for the same reason a contents page's does:
 * it carries the eye from a name to that name's content across a gutter,
 * and because the six names differ in length the leaders differ too,
 * which is what gives the column its rhythm.
 */
export default function CoPilot() {
  return (
    <Section id="co-pilot" n="03" label="Co-Pilot">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>Six voices.</MaskLine>
          <MaskLine>
            One seat<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            One line, put to all six. They heard the same session, and they
            do not agree.
          </p>
          <hr className="rule my-7" />
          <p className="t-mono text-bone">
            <span className="mr-2 text-magenta" aria-hidden>
              &rsaquo;
            </span>
            {PROMPT_LINE}
          </p>
          <p className="t-label mt-3.5 text-bone-dim">
            Asked once. Answered six ways.
          </p>
        </Reveal>
      </div>

      {/* Column slugs — 11px at 0.17em tracking is noise below lg. */}
      <div className="grid-12 mt-20 hidden border-y border-line py-3 lg:mt-24 lg:grid">
        <span className="t-label col-span-1 text-bone-dim">No.</span>
        <span className="t-label col-span-5 text-bone-dim">Personality</span>
        <span className="t-label col-span-6 text-bone-dim">Answer</span>
      </div>

      {/* One mask per row, not per element: six tracks dealt upward in
          sequence. The hairline sits on the <li>, outside the mask, because
          .mask carries a 0.08em overhang that would clip and offset it. The
          grid is the mask's GRANDCHILD — .mask > * is display:block and is
          declared after .grid-12 at equal specificity, so a grid placed as
          the direct child collapses into stacked blocks. */}
      <Reveal kind="mask" stagger={0.08} start="top 80%">
        <ol className="border-b border-line lg:border-t-0">
          {PERSONAS.map((p, i) => (
            <li
              key={p.id}
              className={i === 0 ? "" : "border-t border-line-soft"}
            >
              <span className="mask">
                <span>
                  <div className="grid-12 items-baseline py-[clamp(1.25rem,1.9vw,2rem)]">
                    <span className="t-label nums col-span-12 text-bone-dim lg:col-span-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="col-span-12 mt-3 lg:col-span-5 lg:mt-0">
                      <div className="flex items-baseline">
                        {/* nowrap stays: the leader absorbs this name's
                            width on one line, and these strings are ours. */}
                        <span className="t-display-s whitespace-nowrap text-bone">
                          {p.name}
                        </span>
                        <span
                          className="leader-dots t-mono ml-3 hidden text-bone-mute lg:block"
                          aria-hidden
                        >
                          {LEADER}
                        </span>
                      </div>
                      <p className="t-label mt-3 text-bone-dim">{p.role}</p>
                    </div>

                    <p className="t-lede col-span-12 mt-5 text-bone lg:col-span-6 lg:mt-0">
                      {ANSWERS[p.id]}
                    </p>
                  </div>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
