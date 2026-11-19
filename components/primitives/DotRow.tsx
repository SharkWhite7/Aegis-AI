import type { ReactNode } from "react";

/**
 * One line of a dot-leader table: term on the left, value on the right,
 * a dotted rule carrying the eye across. The filler is baseline-dropped by
 * em so it keeps its seat when either side changes size.
 */
export default function DotRow({
  term,
  value,
  accent = false,
  className = "",
}: {
  term: ReactNode;
  value: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <li className={`flex items-end gap-3 py-2.5 ${className}`}>
      <span className="t-mono shrink-0 text-bone-dim">{term}</span>
      <span
        aria-hidden
        className="mb-[0.42em] h-0 min-w-6 flex-1 border-b border-dotted border-line"
      />
      <span
        className={`t-mono min-w-0 text-right wrap-break-word ${
          accent ? "text-magenta" : "text-bone"
        }`}
      >
        {value}
      </span>
    </li>
  );
}
