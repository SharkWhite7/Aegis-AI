/**
 * Deterministic timeline.
 *
 * Nothing here reads the wall clock. A scene exposes draw(t) and the
 * renderer calls it once per frame with an exact timestamp, so the same
 * second always produces the same pixels — a re-render is byte-stable and
 * a frame can be inspected on its own.
 */

export const EASE = {
  linear: (x) => x,
  /* The site's --ease-out-expo, as a function. */
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  /* The site's --ease-in-out-quint. */
  inOutQuint: (x) =>
    x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2,
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
};

/** Progress of a segment starting at `at` and lasting `dur`, clamped 0..1. */
export function seg(t, at, dur, ease = EASE.outExpo) {
  if (dur <= 0) return t >= at ? 1 : 0;
  const x = Math.min(1, Math.max(0, (t - at) / dur));
  return ease(x);
}

/** A segment that runs forward then back: 0 → 1 → 0. */
export function pulse(t, at, dur, ease = EASE.inOutSine) {
  const x = Math.min(1, Math.max(0, (t - at) / dur));
  return ease(x < 0.5 ? x * 2 : (1 - x) * 2);
}

export const lerp = (a, b, x) => a + (b - a) * x;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** Deterministic hash-noise in [0,1). Used for grain drift, never Math.random. */
export function noise(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Reveal a masked line. `p` 0 = below the mask, 1 = seated.
 * Writes `translate` rather than `transform` for the same reason the site
 * does: nothing else is allowed to compose on top of it.
 */
export function maskIn(el, p) {
  el.style.translate = `0 ${(1 - p) * 108}%`;
}

/** Drop a masked line back out of frame. `p` 0 = seated, 1 = gone. */
export function maskOut(el, p) {
  el.style.translate = `0 ${-p * 108}%`;
}

export function setOpacity(el, v) {
  el.style.opacity = String(v);
}

/** Horizontal rule that wipes in from its left edge. */
export function wipeX(el, p, origin = "left") {
  el.style.transformOrigin = origin;
  el.style.transform = `scaleX(${p})`;
}

/**
 * Split a string into lines that fit `max` characters without breaking a
 * word. Measured in characters on purpose: the lines are set in a known
 * face at a known size, so a character budget is predictable and keeps the
 * ragged edge under control.
 */
export function wrapChars(text, max) {
  const out = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) {
      out.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Build `<span class="mask"><span>…</span></span>` and return the inner span. */
export function maskedLine(parent, text, cls = "") {
  const outer = document.createElement("span");
  outer.className = "mask " + cls;
  const inner = document.createElement("span");
  inner.textContent = text;
  outer.appendChild(inner);
  parent.appendChild(outer);
  return inner;
}

/** Animated film grain: the tile is re-seated every frame so it moves. */
export function grain(el, frame) {
  const x = Math.floor(noise(frame) * 140);
  const y = Math.floor(noise(frame + 97) * 140);
  el.style.backgroundPosition = `${x}px ${y}px`;
}
