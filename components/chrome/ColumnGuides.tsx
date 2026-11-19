"use client";

import { useEffect, useState } from "react";

/** Press G to check alignment against the 12-column field. */
export default function ColumnGuides() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "g") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="col-guides" data-on={on} aria-hidden>
      <div className="shell h-full">
        <div className="grid-12 h-full">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="h-full border-x border-magenta/10 bg-magenta/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
