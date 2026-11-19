"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Leaf = { id: string; n: string; label: string; node: ReactNode };

/**
 * The site as a book: one idea per page, turned rather than scrolled.
 *
 * Only the current leaf is mounted. That is also why no page content uses
 * `Reveal` — a ScrollTrigger inside a container that never scrolls never
 * fires, and the page would come up blank. The turn is the motion.
 *
 * Turning is bound to arrows, PageUp/Down, Home/End, space, the two
 * controls, and a horizontal drag. The hash follows the page so the index
 * overlay and a pasted link both still land somewhere.
 */
export default function Book({ leaves }: { leaves: Leaf[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const stage = useRef<HTMLDivElement>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const [more, setMore] = useState(false);

  const go = useCallback(
    (next: number, how: 1 | -1) => {
      const clamped = Math.max(0, Math.min(leaves.length - 1, next));
      setI((cur) => {
        if (clamped === cur) return cur;
        setDir(how);
        try {
          history.replaceState(null, "", `#${leaves[clamped].id}`);
        } catch {
          /* a blocked history write must not stop the page turning */
        }
        return clamped;
      });
    },
    [leaves],
  );

  // Open on whatever the URL names, then follow the index overlay's links.
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.replace("#", "");
      if (!id) return;
      const at = leaves.findIndex((l) => l.id === id);
      if (at >= 0) setI((cur) => (at === cur ? cur : (setDir(at > cur ? 1 : -1), at)));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [leaves]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      // Let a field, a menu or anything else with focus have the key first.
      if (el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (document.querySelector('[role="dialog"]')) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(i + 1, 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          go(i - 1, -1);
          break;
        case "Home":
          e.preventDefault();
          go(0, -1);
          break;
        case "End":
          e.preventDefault();
          go(leaves.length - 1, 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i, leaves.length]);

  // A short window or a long page: say so instead of cutting it off.
  useEffect(() => {
    const el = leaf.current;
    if (!el) return;
    const check = () =>
      setMore(
        el.scrollHeight - el.clientHeight > 2 &&
          el.scrollTop + el.clientHeight < el.scrollHeight - 2,
      );
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [i]);

  const page = leaves[i];
  const first = i === 0;
  const last = i === leaves.length - 1;

  return (
    <div className="book">
      {/* ── Running head ─────────────────────────────────────── */}
      <div className="shell flex shrink-0 items-center gap-4 pt-5 pb-4">
        <span className="t-label nums text-magenta">{page.n}</span>
        <span className="h-px w-8 bg-line-hard" aria-hidden />
        <span className="t-label text-bone-dim">{page.label}</span>
        <span className="t-label nums ml-auto text-bone-dim">
          {String(i + 1).padStart(2, "0")}
          <span className="mx-1.5 text-bone-mute" aria-hidden>
            /
          </span>
          {String(leaves.length).padStart(2, "0")}
        </span>
      </div>

      {/* ── The leaf ─────────────────────────────────────────── */}
      <div
        ref={stage}
        className="book-stage"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          drag.current = { x: e.clientX, id: e.pointerId };
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) < 56) return;
          go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }}
      >
        <div
          key={page.id}
          ref={leaf}
          className="book-leaf shell"
          data-dir={dir}
          aria-live="polite"
        >
          {page.node}
        </div>

        {more && (
          <div className="book-more" aria-hidden>
            <span className="t-label text-bone-mute">More below</span>
          </div>
        )}
      </div>

      {/* ── Turn ─────────────────────────────────────────────── */}
      <div className="shell flex shrink-0 items-center gap-5 pt-4 pb-5">
        <button
          type="button"
          onClick={() => go(i - 1, -1)}
          disabled={first}
          className="btn-turn"
          aria-label="Previous page"
        >
          <span aria-hidden>&#8592;</span>
        </button>
        <button
          type="button"
          onClick={() => go(i + 1, 1)}
          disabled={last}
          className="btn-turn"
          aria-label="Next page"
        >
          <span aria-hidden>&#8594;</span>
        </button>

        <ol className="flex min-w-0 flex-1 gap-1" aria-hidden>
          {leaves.map((l, at) => (
            <li
              key={l.id}
              className="seg-turn"
              data-state={at < i ? "read" : at === i ? "here" : "ahead"}
            />
          ))}
        </ol>

        <span className="t-label hidden shrink-0 text-bone-mute sm:block">
          {last ? "End" : "Turn"}
        </span>
      </div>
    </div>
  );
}
