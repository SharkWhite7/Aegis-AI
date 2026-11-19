import { STAGES, DONE, TOTAL } from "@/lib/progress";

/**
 * Eleven segments, one per stage. Segmented rather than smooth because
 * the segments ARE the denominator: a reader can count them, so the bar
 * never implies a precision the project does not have. One segment is
 * magenta — the stage actually in flight.
 */
export default function BuildBar() {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="t-label text-bone-dim">Build</span>
        <span className="t-label nums text-bone-dim">
          {String(DONE).padStart(2, "0")} of {TOTAL} shipped
        </span>
      </div>

      <div
        className="mt-4 flex gap-1"
        role="img"
        aria-label={`Build progress: ${DONE} of ${TOTAL} stages shipped`}
      >
        {STAGES.map((s) => (
          <span key={s.id} className="seg" data-state={s.state} aria-hidden />
        ))}
      </div>

      <ol className="mt-6 border-b border-line">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-baseline gap-4 py-2 ${
              i === 0 ? "border-t border-line" : "border-t border-line-soft"
            }`}
          >
            <span className="t-label nums shrink-0 text-bone-mute" aria-hidden>
              {s.id}
            </span>
            <span
              className={`t-mono min-w-0 ${
                s.state === "queued" ? "text-bone-dim" : "text-bone"
              }`}
            >
              {s.label}
            </span>
            <span
              className={`t-label ml-auto shrink-0 ${
                s.state === "building" ? "text-magenta" : "text-bone-dim"
              }`}
            >
              {s.state === "done"
                ? "shipped"
                : s.state === "building"
                  ? "building"
                  : "queued"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
