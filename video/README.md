# video

Five pieces for X, rendered from this repository's own design system.

Everything here obeys one rule, which comes before any of the craft: **no
piece shows AEGIS AI working.** The product is pre-alpha and does not run.
A screen recording of an app that does not exist is a fake demo, and a fake
demo in motion is far more damaging than an overclaim in text — a reader
discounts a sentence, a viewer believes an interface. So the campaign is
built from what is genuinely ours: the copy, the typography, the design
doctrine, the build schedule, and the site that does exist.

The one piece of third-party material in the whole directory is nothing:
no gameplay, no GTA footage, no stock, no licensed music.

## The pieces

| file | format | length | what it argues |
|---|---|---|---|
| `scenes/01-voices.html` | 16:9 · 1:1 | 30s | The six voices, one per beat, in their own words from `lib/personas.ts`. |
| `scenes/02-beside.html` | 16:9 · 1:1 | 24s | The category: four parts assembled every turn into one voice. No mods, no injection. |
| `scenes/03-memory.html` | 16:9 · 1:1 | 18s | Memory is not the context window. Session 100 opens knowing session 1. |
| `scenes/04-public.html` | 16:9 | 38s | Built in public: the real build bar, a real screenshot, the real banned list. |
| `scenes/05-loop.html` | 1:1 · 16:9 | 6s | A seamless loop, one second per personality. |

Masters are 1920×1080 and 1080×1080, H.264 High, yuv420p, 30fps, keyframe
every second, AAC 256k at 48kHz, loudness normalised to −14 LUFS with a
true peak under −1.2 dBFS — which is what X normalises to, so nothing is
turned up or squashed on upload.

## Why the frames are captured and not recorded

A screen recorder samples whatever the browser managed to paint. This
renders instead: a scene exposes `SCENE.draw(t)`, the renderer calls it
once per frame with an exact timestamp, screenshots, and pipes the PNG
straight into ffmpeg's stdin. Nothing reads the wall clock, nothing is
dropped, no frame storage is used, and a re-render of the same scene
produces the same file. Every number in a piece — a cut, a reveal, a
loudness target — is a constant you can read in the source.

```
node render.mjs scenes/01-voices.html --format 16x9 --out 01-voices-16x9
./build.sh 01-voices 16x9     # frames + score + loudness + mux + report
```

Formats are `16x9`, `1x1`, `9x16`. Every size in `lib/stage.css` is in
`vmin`, so type renders at the same optical size in all of them and only
the measure changes.

## Audio

Synthesised from scratch in `audio/`: sines, noise, envelopes and
frequency-domain shaping, with a fixed seed so renders are reproducible.
Nothing is sampled and nothing is licensed. Each score's constants mirror
its scene's constants exactly — if a cut moves in the HTML it has to move
in the Python, and the two files say so at the top.

## Capturing the site again

`04-public` shows a real screenshot of the landing page. To refresh it:

```
npx next build && npx next start -p 3100
node capture-site.mjs
convert shots/access.png -resize 1760x shots/access-wide.png
convert shots/full.png   -resize 300x  shots/full-strip.png
```

The shot chosen is the Access section, because it is the part of the site
that says "Not open yet" and counts the stages that have actually shipped.
The caption in the piece states what it is: a screenshot of a web page,
not of a product.

## Boundaries

This directory is additive. It does not touch `app/`, `components/`,
`lib/`, `docs/` or `package.json` — the copy it uses is copied into
`lib/content.js` with its provenance noted, so another session editing the
site cannot be broken by a render.
