"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabItem = { id: string; label: string; panel: ReactNode };

/**
 * Three sections that each ran over a screen, folded into one that does
 * not. The panels are server-rendered and passed in as nodes, so nothing
 * here needs to know what it is showing.
 *
 * Only the active panel is mounted. Keeping all three in the DOM and
 * hiding two would put every scroll-triggered reveal inside a zero-height
 * box, which fires the trigger at the wrong scroll position and leaves the
 * panel blank when it is finally shown.
 *
 * Inactive tabs are `bone-dim`, not `bone-mute`: mute measures 2.85:1 on
 * ink, and these are controls, not decoration.
 */
export default function Tabs({
  items,
  label,
  className = "",
}: {
  items: TabItem[];
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState(items[0].id);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = items.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;

    e.preventDefault();
    const id = items[next].id;
    setActive(id);
    refs.current[id]?.focus();
  }

  const current = items.find((t) => t.id === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-5"
      >
        {items.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              className="group flex items-baseline gap-3 pb-1"
            >
              <span
                className={`t-label nums transition-colors duration-300 ${
                  on ? "text-magenta" : "text-bone-mute"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`t-head text-[1.0625rem] transition-colors duration-300 ${
                  on
                    ? "border-b border-bone text-bone"
                    : "border-b border-transparent text-bone-dim group-hover:text-bone"
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel-${current.id}`}
        aria-labelledby={`${base}-tab-${current.id}`}
        tabIndex={0}
        className="mt-12 lg:mt-14"
      >
        {current.panel}
      </div>
    </div>
  );
}
