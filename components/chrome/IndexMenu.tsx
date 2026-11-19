"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV } from "@/lib/site";
import Wordmark from "./Wordmark";
import { lenis } from "@/lib/motion/SmoothScroll";

/**
 * The section index, as an overlay rather than a row of links.
 *
 * A horizontal nav cannot hold this site: seven numbered links already
 * overflow their column between 1024 and 1440px, and four more sections
 * are still to come. Measured, not guessed — at 1024px the row ran 255px
 * past its box. An overlay works at every width, scales to any number of
 * sections, and removes the separate mobile-menu problem rather than
 * leaving it for later.
 *
 * It is portalled to <body>. <header> is fixed with a z-index, which makes
 * it a stacking context, so an overlay rendered inside it cannot paint
 * above the status bar — that bar is a later sibling of <header> at the
 * same z-index and wins on source order no matter how high the overlay
 * sets its own.
 */
export default function IndexMenu() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Captured now: by cleanup time the ref may point somewhere else.
    const opener = trigger.current;

    lenis()?.stop();
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      // Keep focus inside the dialog while it is open.
      const items = panel.current?.querySelectorAll<HTMLElement>("a, button");
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lenis()?.start();
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="t-label group flex items-center gap-3 text-bone-dim transition-colors duration-300 hover:text-bone"
      >
        Index
        <span className="nums text-bone-mute" aria-hidden>
          {String(NAV.length).padStart(2, "0")}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] bg-ink"
          role="dialog"
            aria-modal="true"
            aria-label="Section index"
          >
            <div className="shell flex h-full flex-col">
              <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-between">
                <span className="text-bone">
                  <Wordmark />
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="t-label text-bone-dim transition-colors duration-300 hover:text-bone"
                >
                  Close
                </button>
              </div>

              <nav
                ref={panel}
                className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-8"
              >
                <ol>
                  {NAV.map((item) => (
                    <li key={item.href} className="border-t border-line-soft">
                      <a
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-baseline gap-5 py-3 lg:gap-8 lg:py-4"
                      >
                        <span className="t-label nums shrink-0 text-bone-mute transition-colors duration-300 group-hover:text-magenta">
                          {item.n}
                        </span>
                        <span className="t-display-s text-bone-dim transition-colors duration-300 group-hover:text-bone">
                          {item.label}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
