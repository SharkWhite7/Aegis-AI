/**
 * A one-shot gate so the hero waits for the boot sequence instead of
 * both playing over each other. Module state is per-tab, which is
 * exactly the lifetime we want.
 */
let booted = false;
let waiters: Array<() => void> = [];

export function markBooted() {
  if (booted) return;
  booted = true;
  const queue = waiters;
  waiters = [];
  queue.forEach((fn) => fn());
}

export function isBooted() {
  return booted;
}

/** Returns an unsubscribe fn. Fires immediately if boot already happened. */
export function onBooted(fn: () => void) {
  if (booted) {
    fn();
    return () => {};
  }
  waiters.push(fn);
  return () => {
    waiters = waiters.filter((f) => f !== fn);
  };
}
