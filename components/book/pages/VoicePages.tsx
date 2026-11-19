import { PERSONAS } from "@/lib/personas";
import { PROMPT_LINE, ANSWERS } from "@/lib/copilot";

const LEADER = "·".repeat(160);

/** The question, alone on its page. The answers are overleaf. */
export function Ask() {
  return (
    <div className="grid-12 items-end gap-y-12">
      <h2 className="t-display-m col-span-12 text-bone lg:col-span-6">
        Six voices.
        <br />
        One seat<span className="text-magenta">.</span>
      </h2>

      <div className="col-span-12 lg:col-span-5 lg:col-start-8">
        <p className="t-body-lg text-bone-dim">
          One line, put to all six. They heard the same session, and they do
          not agree.
        </p>
        <hr className="rule my-7" />
        <p className="t-mono text-bone">
          <span className="mr-2 text-magenta" aria-hidden>
            &rsaquo;
          </span>
          {PROMPT_LINE}
        </p>
        <p className="t-label mt-3.5 text-bone-dim">
          Asked once. Answered six ways, overleaf.
        </p>
      </div>
    </div>
  );
}

/**
 * All six answers at once, with no selection. Six labels with exactly one
 * open is an accordion however it is dressed, and the answers are close
 * enough in length to sit together — so the page simply shows them. The
 * leader carries the eye from a name to its answer across the gutter.
 */
export function Answers() {
  return (
    <div>
      <div className="grid-12 hidden border-y border-line py-2.5 lg:grid">
        <span className="t-label col-span-1 text-bone-dim">No.</span>
        <span className="t-label col-span-5 text-bone-dim">Personality</span>
        <span className="t-label col-span-6 text-bone-dim">Answer</span>
      </div>

      <ol className="border-b border-line">
        {PERSONAS.map((p, i) => (
          <li key={p.id} className={i === 0 ? "" : "border-t border-line-soft"}>
            <div className="grid-12 items-baseline py-[clamp(0.75rem,1.1vw,1.25rem)]">
              <span className="t-label nums col-span-12 text-bone-dim lg:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="col-span-12 mt-2 lg:col-span-5 lg:mt-0">
                <div className="flex items-baseline">
                  {/* nowrap stays: the leader absorbs this name's width on
                      one line, and these strings are ours. */}
                  <span className="t-head whitespace-nowrap text-bone">
                    {p.name}
                  </span>
                  <span
                    className="leader-dots t-mono ml-3 hidden text-bone-mute lg:block"
                    aria-hidden
                  >
                    {LEADER}
                  </span>
                </div>
              </div>

              <p className="t-body-lg col-span-12 mt-3 text-bone lg:col-span-6 lg:mt-0">
                {ANSWERS[p.id]}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
