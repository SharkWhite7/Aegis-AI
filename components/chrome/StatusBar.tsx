"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

const fmt = () =>
  new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "America/New_York",
  });

export default function StatusBar() {
  // Rendered null on the server so the clock cannot cause a hydration mismatch.
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    setClock(fmt());
    const id = window.setInterval(() => setClock(fmt()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-ink-deep/92">
      <div className="shell">
        <div className="flex h-[var(--bar-h)] items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="dot-live" aria-hidden />
            <span className="t-label text-bone-dim">
              {SITE.stage}
              <span className="mx-2 text-bone-mute" aria-hidden>
                &middot;
              </span>
              Build {SITE.build}
            </span>
          </div>

          <span className="t-label hidden text-bone-mute sm:block">
            {SITE.coords}
          </span>

          <span className="t-label text-bone-mute">
            <span>EST </span>
            {clock ?? "--:--:--"}
          </span>
        </div>
      </div>
    </div>
  );
}
