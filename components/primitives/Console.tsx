"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE, prefersReducedMotion } from "@/lib/motion/gsap";
import { onBooted } from "@/lib/boot";
import Waveform from "./Waveform";

type Turn = { t: string; who: "ai" | "you"; text: string };

const TRANSCRIPT: Turn[] = [
  { t: "22:14", who: "ai", text: "you pulled off the freeway. we doing this or not?" },
  { t: "22:14", who: "ai", text: "buyer in little havana wants the coupe. forty grand, no guns." },
  { t: "22:15", who: "you", text: "how long" },
  { t: "22:15", who: "ai", text: "eleven minutes on the causeway. nine if you stop asking." },
  { t: "22:16", who: "ai", text: "putting something on for the drive." },
];

export default function Console({ delay = 0.9 }: { delay?: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [delay]);

  return (
    <div ref={root} className="panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="dot-live" aria-hidden />
          <span className="t-label text-bone">The Hustler</span>
        </div>
        <span className="t-label text-bone-mute">Co-pilot</span>
      </div>

      <ol className="space-y-3.5 px-4 py-5">
        {TRANSCRIPT.map((turn, i) => (
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

        <li data-turn className="flex gap-3 pt-1">
          <span className="t-mono shrink-0 text-bone-mute" aria-hidden>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          <span className="t-mono text-magenta">
            &#9834;&ensp;night tape &mdash; side b
          </span>
        </li>
      </ol>

      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
        <Waveform className="w-32" />
        <span className="t-label text-bone-mute">Listening</span>
      </div>
    </div>
  );
}
