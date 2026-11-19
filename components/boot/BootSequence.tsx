"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";
import { markBooted } from "@/lib/boot";
import Wordmark from "@/components/chrome/Wordmark";
import { SITE } from "@/lib/site";

const KEY = "aegis:booted";

const LINES: Array<[string, string]> = [
  ["companion runtime", "ready"],
  ["memory index", "1,204 sessions"],
  ["voice engine", "live"],
  ["context bridge", "attached"],
];

export default function BootSequence() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const skip = () => {
      gsap.set(el, { display: "none" });
      markBooted();
    };

    // Second visit in this tab, or the user asked for less motion.
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(KEY) === "1";
    } catch {
      // Private mode can throw on access. Treat as unseen.
    }

    if (seen || prefersReducedMotion()) {
      skip();
      return;
    }

    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      /* non-fatal */
    }

    const rows = el.querySelectorAll<HTMLElement>("[data-boot-row]");
    const bar = el.querySelector<HTMLElement>("[data-boot-bar]");
    const mark = el.querySelector<HTMLElement>("[data-boot-mark]");

    const tl = gsap.timeline();

    tl.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: 0.4 })
      .fromTo(
        rows,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.11 },
        0.18,
      )
      .fromTo(
        bar,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.95, ease: "power2.inOut" },
        0.18,
      )
      .to(el, {
        yPercent: -100,
        duration: 0.9,
        ease: "expo.inOut",
        onStart: markBooted,
        onComplete: () => gsap.set(el, { display: "none" }),
      });

    // Any click or keypress cuts straight to the site.
    const bail = () => {
      tl.kill();
      markBooted();
      gsap.to(el, {
        yPercent: -100,
        duration: 0.5,
        ease: "expo.inOut",
        onComplete: () => gsap.set(el, { display: "none" }),
      });
      detach();
    };

    const detach = () => {
      window.removeEventListener("keydown", bail);
      el.removeEventListener("click", bail);
    };

    window.addEventListener("keydown", bail);
    el.addEventListener("click", bail);

    return () => {
      detach();
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={root}
      className="boot-overlay flex cursor-pointer items-center"
      role="status"
      aria-label={`Starting ${SITE.name}`}
    >
      <noscript>
        {/* Without JS the overlay would never lift. */}
        <style>{`.boot-overlay{display:none !important}`}</style>
      </noscript>

      <div className="shell w-full">
        <div className="grid-12">
          <div className="col-span-12 md:col-span-7 lg:col-span-5">
            <div data-boot-mark className="text-bone">
              <Wordmark />
            </div>

            <ul className="mt-9 space-y-2.5">
              {LINES.map(([k, v]) => (
                <li
                  key={k}
                  data-boot-row
                  className="t-mono flex items-baseline gap-3 text-bone-dim"
                >
                  <span className="whitespace-nowrap uppercase tracking-[0.1em]">
                    {k}
                  </span>
                  <span
                    className="-translate-y-[0.3em] flex-1 border-b border-dotted border-line"
                    aria-hidden
                  />
                  <span className="whitespace-nowrap text-bone">{v}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 h-px w-full bg-line-soft">
              <div
                data-boot-bar
                className="h-px w-full origin-left bg-magenta"
              />
            </div>

            <p className="t-label mt-4 text-bone-mute">
              Press any key to skip
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
