import PanelHead from "./PanelHead";
import { THREAD } from "@/lib/memory";

export default function MemoryPanel() {
  return (
    <>
      <PanelHead
        head="It starts knowing nothing"
        lede="Everything it knows, it learned from you. The first session is almost useless. The hundredth is not."
      />

      {/* The entries lengthen down the page on purpose: accumulation set
          as type, rather than described in a sentence about accumulation. */}
      <div className="mt-12 lg:mt-14">
        <ol className="border-b border-line">
          {THREAD.map((entry, i) => (
            <li
              key={entry.session}
              className={`grid-12 items-baseline gap-y-4 py-7 lg:py-8 ${
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
      </div>

      {/* Deletion is the other half of a memory claim, and burying it
          three menus deep is the usual tell that it was an afterthought. */}
      <div className="mt-10 lg:mt-12">
        <div className="grid-12 gap-y-6">
          <p className="t-label col-span-12 text-bone-dim lg:col-span-3">
            It is yours
          </p>
          <p className="t-body-lg col-span-12 text-bone-dim lg:col-span-8 lg:col-start-5">
            Read it, export it, delete it. Deleting it is one line, not a
            settings page three menus deep &mdash; and afterwards the companion
            is back at session one, which is exactly as useless as it sounds.
          </p>
        </div>
      </div>
    </>
  );
}
