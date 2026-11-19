/**
 * Capture the real landing page.
 *
 * These are screenshots of a web page that exists and is served from this
 * repository — not of a product. The shots chosen are the ones that say so
 * themselves: the Access section, which reads "Not open yet", and the build
 * bar, which counts the stages that have actually shipped.
 *
 *   npx next start -p 3100   (in another shell)
 *   node capture-site.mjs
 */

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "shots");
const URL_ = process.argv[2] ?? "http://127.0.0.1:3100/";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

await page.goto(URL_, { waitUntil: "networkidle" });

/* The boot sequence runs once per tab and is skippable. Give it its run,
   then make sure it is gone before anything is captured. */
await page.waitForTimeout(1200);
await page.keyboard.press("Escape").catch(() => {});
await page.mouse.click(800, 500).catch(() => {});
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const o = document.querySelector(".boot-overlay");
  if (o) o.remove();
});
await page.evaluate(() => document.fonts.ready);

const targets = [
  ["access", "#access"],
  ["premise", "#premise"],
  ["memory", "#memory"],
  ["pricing", "#pricing"],
];

for (const [name, sel] of targets) {
  const el = await page.$(sel);
  if (!el) {
    console.log(`  ${name}: no ${sel} on the page`);
    continue;
  }
  await el.scrollIntoViewIfNeeded();
  /* Lenis animates the scroll and GSAP reveals on entry; both need to
     settle before the frame is worth keeping. */
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ${name} -> shots/${name}.png`);
}

/* One full-page sheet, for the shot that says "this is a site". */
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, "full.png"), fullPage: true });
console.log("  full -> shots/full.png");

await browser.close();
