import Reveal, { MaskLine } from "@/lib/motion/Reveal";
import Section from "@/components/primitives/Section";
import { THREAD } from "@/lib/memory";

export default function Memory() {
  return (
    <Section id="memory" n="07" label="Memory">
      <div className="grid-12 items-end gap-y-10">
        <Reveal
          as="h2"
          kind="mask"
          stagger={0.085}
          className="t-display-m col-span-12 text-bone lg:col-span-6"
        >
          <MaskLine>It starts</MaskLine>
          <MaskLine>
            Knowing nothing<span className="text-magenta">.</span>
          </MaskLine>
        </Reveal>

        <Reveal
          kind="fade"
          delay={0.14}
          className="col-span-12 lg:col-span-5 lg:col-start-8"
        >
          <p className="t-body-lg text-bone-dim">
            Everything it knows, it learned from you. The first session is
            almost useless. The hundredth is not.
          </p>
        </Reveal>
      </div>

      {/* The entries lengthen down the page on purpose: accumulation set
          as type, rather than described in a sentence about accumulation. */}
      <Reveal kind="fade" start="top 80%" className="mt-20 lg:mt-24">
        <ol className="border-b border-line">
          {THREAD.map((entry, i) => (
            <li
              key={entry.session}
              className={`grid-12 items-baseline gap-y-4 py-8 lg:py-10 ${
                i === 0 ? "border-t border-line" : "border-t border-line-soft"
              }`}
            >
              <div className="col-span-12 flex items-baseline gap-4 lg:col-span-3">
                <span className="t-label text-bone-dim">Session</span>
                <span
                  className={`t-display-s nums ${
                    i === THREAD.length - 1 ? "text-bone" : "text-bone-dim"
                  }`}
                >
                  {entry.session}
                </span>
              </div>
              <p className="t-lede col-span-12 text-bone lg:col-span-8 lg:col-start-5">
                {entry.text}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* Deletion is the other half of a memory claim, and burying it
          three menus deep is the usual tell that it was an afterthought. */}
      <Reveal kind="fade" start="top 85%" className="mt-16 lg:mt-20">
        <div className="grid-12 gap-y-6">
          <p className="t-label col-span-12 text-bone-dim lg:col-span-3">
            It is yours
          </p>
          <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-8 lg:col-start-5">
            Read it, export it, delete it. Deleting it is one line, not a
            settings page three menus deep — and afterwards the companion is
            back at session one, which is exactly as useless as it sounds.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
