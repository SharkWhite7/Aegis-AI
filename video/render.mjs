/**
 * Frame-accurate renderer.
 *
 * Playwright is driven as a camera, not as a screen recorder: the page is
 * never allowed to run its own clock. For each frame the renderer calls
 * SCENE.draw(t) with an exact timestamp, takes one screenshot, and pipes
 * the PNG straight into ffmpeg's stdin. Nothing is written to disk between
 * the two, so a 30-second 1080p piece costs no frame storage at all.
 *
 *   node render.mjs <scene.html> [--format 16x9|1x1] [--fps 30] [--out name]
 *
 * The scene supplies duration and fps; the flags only override them.
 */

/* Playwright is installed globally in this container and reachable through
   NODE_PATH, which ESM resolution ignores. createRequire gets it back. */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const FORMATS = {
  "16x9": { w: 1920, h: 1080 },
  "1x1": { w: 1080, h: 1080 },
  "9x16": { w: 1080, h: 1920 },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/* A module script will not load over file:// — Chromium gives it a null
   origin and blocks it. Serving the directory over loopback is the whole
   fix, and it keeps relative imports working exactly as they read. */
function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
      const file = path.resolve(dir, rel);
      if (!file.startsWith(dir)) {
        res.writeHead(403).end();
        return;
      }
      try {
        const body = await readFile(file);
        res.writeHead(200, {
          "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
          "cache-control": "no-store",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const scenePath = process.argv[2];
if (!scenePath) {
  console.error("usage: node render.mjs <scene.html> [--format 16x9] [--out name]");
  process.exit(1);
}

const formatKey = arg("format", "16x9");
const format = FORMATS[formatKey];
if (!format) {
  console.error(`unknown format "${formatKey}" — expected ${Object.keys(FORMATS).join(", ")}`);
  process.exit(1);
}

const sceneName = path.basename(scenePath, ".html");
const outName = arg("out", `${sceneName}-${formatKey}`);
const outDir = path.join(ROOT, "out");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${outName}.mp4`);

const server = await serve(ROOT);
const port = server.address().port;
const url = `http://127.0.0.1:${port}/${path.relative(ROOT, path.resolve(scenePath)).split(path.sep).join("/")}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: format.w, height: format.h },
  deviceScaleFactor: 1,
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.SCENE && window.SCENE.ready === true, { timeout: 20000 });
await page.evaluate(() => document.fonts.ready);

const meta = await page.evaluate(() => ({
  fps: window.SCENE.fps,
  duration: window.SCENE.duration,
}));
const fps = Number(arg("fps", meta.fps));
const duration = Number(arg("duration", meta.duration));
const frames = Math.round(fps * duration);

if (errors.length) {
  console.error("page errors before render:\n" + errors.join("\n"));
  await browser.close();
  server.close();
  process.exit(1);
}

console.log(
  `${sceneName} · ${formatKey} ${format.w}x${format.h} · ${fps}fps · ${duration}s · ${frames} frames`,
);

const ff = spawn(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-f", "image2pipe",
    "-framerate", String(fps),
    "-i", "-",
    "-an",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "16",
    "-profile:v", "high",
    "-level", "4.2",
    "-pix_fmt", "yuv420p",
    /* X re-encodes anything it is given; a keyframe every second keeps
       their transcode from smearing the hard type on a cut. */
    "-g", String(fps),
    "-movflags", "+faststart",
    outFile,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const ffDone = new Promise((resolve, reject) => {
  ff.on("close", (code) =>
    code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
  );
  ff.on("error", reject);
});

const write = (buf) =>
  ff.stdin.write(buf) ? Promise.resolve() : new Promise((r) => ff.stdin.once("drain", r));

const started = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate(
    ([t, i]) => window.SCENE.draw(t, i),
    [f / fps, f],
  );
  await write(await page.screenshot({ type: "png" }));
  if (f % 60 === 0 || f === frames - 1) {
    const pct = Math.round(((f + 1) / frames) * 100);
    process.stdout.write(`\r  ${String(pct).padStart(3)}%  frame ${f + 1}/${frames}`);
  }
}
process.stdout.write("\n");

ff.stdin.end();
await ffDone;
await browser.close();
server.close();

if (errors.length) {
  console.error("page errors during render:\n" + errors.join("\n"));
  process.exit(1);
}

console.log(`  ${outFile}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
