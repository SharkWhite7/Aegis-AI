"use client";

import {
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";
import { gsap, EASE, prefersReducedMotion } from "./gsap";
import { onBooted } from "../boot";

type Kind = "mask" | "fade";

type RevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: ElementType;
  kind?: Kind;
  delay?: number;
  stagger?: number;
  duration?: number;
  /** Play once the boot sequence clears, not on scroll. Above-the-fold only. */
  onBoot?: boolean;
  /** ScrollTrigger start string. Ignored when onBoot is set. */
  start?: string;
};

export default function Reveal({
  children,
  className,
  id,
  as: Tag = "div",
  kind = "mask",
  delay = 0,
  stagger = 0.075,
  duration = 1.1,
  onBoot = false,
  start = "top 84%",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const settle = () => el.removeAttribute("data-reveal");

    if (prefersReducedMotion()) {
      settle();
      return;
    }

    const targets =
      kind === "mask"
        ? Array.from(el.querySelectorAll<HTMLElement>(".mask > *"))
        : [el];

    if (targets.length === 0) {
      settle();
      return;
    }

    // y: 0 in both halves pins the base offset GSAP parses off the
    // element, so only yPercent drives the motion.
    const from =
      kind === "mask" ? { yPercent: 105, y: 0 } : { opacity: 0, y: 14 };
    const to = kind === "mask" ? { yPercent: 0, y: 0 } : { opacity: 1, y: 0 };

    let tween: gsap.core.Tween | null = null;

    const play = () => {
      tween = gsap.fromTo(targets, from, {
        ...to,
        duration,
        delay,
        stagger,
        ease: EASE.out,
        onStart: settle,
      });
    };

    if (onBoot) {
      // Fallback: if the boot gate never opens, do not strand the content.
      const guard = window.setTimeout(play, 3200);
      const off = onBooted(() => {
        window.clearTimeout(guard);
        play();
      });
      return () => {
        window.clearTimeout(guard);
        off();
        tween?.scrollTrigger?.kill();
        tween?.kill();
      };
    }

    tween = gsap.fromTo(targets, from, {
      ...to,
      duration,
      delay,
      stagger,
      ease: EASE.out,
      onStart: settle,
      scrollTrigger: { trigger: el, start, once: true },
    });

    return () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, [kind, delay, stagger, duration, onBoot, start]);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-reveal={kind}
    >
      {children}
    </Tag>
  );
}

/** One clipped line of display type. Children slide up out of the mask. */
export function MaskLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className="mask">
      <span className={className}>{children}</span>
    </span>
  );
}
