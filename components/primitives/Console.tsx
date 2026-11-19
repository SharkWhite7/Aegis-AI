"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion/gsap";
import { onBooted } from "@/lib/boot";
import type { Turn } from "@/lib/personas";
import Waveform from "./Waveform";

type ConsoleProps = {
  turns: Turn[];
  /** Shown in the header strip, beside the live dot. */
  title: string;
  /** Right side of the header strip. */
  eyebrow?: string;
  /** Optional track line, set in magenta under the transcript. */
  nowPlaying?: string;
  footerLabel?: string;
  /** Stagger the turns in once the boot gate opens. Off for swapped content. */
  animateOnBoot?: boolean;
  delay?: number;
  className?: string;
};

export default function Console({
  turns,
  title,
  eyebrow = "Co-pilot",
  nowPlaying,
  footerLabel = "Listening",
  animateOnBoot = false,
  delay = 0.9,
  className = "",
}: ConsoleProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animateOnBoot) return;
    const el = root.current;
    if (!el) return;

    const rows = el.querySelectorAll<HTMLElement>("[data-turn]");
    if (prefersReducedMotion()) {
      gsap.set(rows, { opacity: 1 });
      return;
    }

    gsap.set(rows, { opacity: 0, y: 5 });

    let tween: gsap.core.Tween | null = null;
    const guard = window.setTimeout(run, 3600);

    function run() {
      window.clearTimeout(guard);
      tween = gsap.to(rows, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        delay,
        stagger: 0.26,
        ease: EASE.out,
      });
    }

    const off = onBooted(run);

    return () => {
      window.clearTimeout(guard);
      off();
      tween?.kill();
    };
  }, [animateOnBoot, delay]);

  return (
    <div ref={root} className={`panel ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="dot-live" aria-hidden />
          <span className="t-label text-bone">{title}</span>
        </div>
        <span className="t-label text-bone-mute">{eyebrow}</span>
      </div>

      <ol className="space-y-3.5 px-4 py-5">
        {turns.map((turn, i) => (
          <li key={i} data-turn className="flex gap-3">
            <span className="t-mono shrink-0 text-bone-mute">{turn.t}</span>
            <span
              className={`t-mono ${
                turn.who === "you" ? "text-bone-mute" : "text-bone-dim"
              }`}
            >
              {turn.who === "you" && (
                <span className="mr-1.5 text-magenta" aria-hidden>
                  &rsaquo;
                </span>
              )}
              {turn.text}
            </span>
          </li>
        ))}

        {nowPlaying && (
          <li data-turn className="flex gap-3 pt-1">
            <span className="t-mono shrink-0 text-bone-mute" aria-hidden>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
            <span className="t-mono text-magenta">
              &#9834;&ensp;{nowPlaying}
            </span>
          </li>
        )}
      </ol>

      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
        <Waveform className="w-32" />
        <span className="t-label text-bone-mute">{footerLabel}</span>
      </div>
    </div>
  );
}
