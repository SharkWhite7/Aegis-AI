"use client";

import { useSyncExternalStore } from "react";
import { SITE } from "@/lib/site";

const fmt = () =>
  new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "America/New_York",
  });

/* A ticking clock is external state, not render state. useSyncExternalStore
   gives React a server snapshot to hydrate against, so the clock can be
   client-only without a hydration mismatch and without setState in an
   effect. getSnapshot returns a string, which compares by value, so React
   only re-renders on the second boundary. */
const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 1000);
  return () => window.clearInterval(id);
};

const getServerSnapshot = (): string | null => null;

export default function StatusBar() {
  const clock = useSyncExternalStore(subscribe, fmt, getServerSnapshot);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-ink-deep">
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

          <span className="t-label hidden text-bone-dim sm:block">
            {SITE.coords}
          </span>

          <span className="t-label text-bone-dim">
            <span>EST </span>
            {clock ?? "--:--:--"}
          </span>
        </div>
      </div>
    </div>
  );
}
