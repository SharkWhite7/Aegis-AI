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
| `scenes/06-world.html` | 16:9 · 1:1 | 14s | The tagline travelling through a night world, with a composed 120 BPM track. |

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

## 06, and the footage question

`06-world` was cut against a reference the founder sent: GTA VI trailer
material with 3D type composited into the scene. The footage is not usable
— it is Rockstar's, the project forbids any game capture, and the reference
was itself a third party's promo — but almost nothing that makes it work
depends on the game. Two things do, and both were measured off the file
rather than guessed:

- **125 BPM, and 65% of the energy below 150 Hz.** Almost no air. The
  weight is the whole effect. `audio/06-world.py` targets the same balance
  from scratch at 120 BPM, which is the nearest tempo whose beat is a whole
  number of frames at 30fps.
- **The type lives in the scene**, with perspective, approaching and
  passing the camera. That is a technique, not a licence.

So the piece keeps the mechanic and supplies its own world: a night drive
built from the design system's hairlines — the road, the posts, the lamps,
a field of distant lights. The projection is done by hand rather than with
CSS perspective, because a browser rasterises a 3D layer once and scales
the bitmap, which arrives soft; computing `s = P / (P - z)` and setting
`font-size` means the glyphs are drawn at the size they are seen at.

## Using real footage

`render.mjs` takes `--plate <file>`: a video the piece is composited over.

```
node render.mjs scenes/06-world.html --format 16x9 --plate drive.mp4
```

Frames are extracted up front at the render's own fps and crop, then fed in
one at a time, so the plate advances in lockstep with `SCENE.draw(t)`
rather than playing on its own clock — the same determinism the rest of the
pipeline has. A plate shorter than the scene fails loudly with the two
durations rather than rendering a piece that runs out of picture. With a
plate present the drawn world hides itself and the type, chrome, vignette
and grain stay.

**Only footage the project holds the rights to goes in here**: licensed
stock, or something shot for this. Game capture does not qualify, whoever
captured it — it is the publisher's, and the campaign's whole position is
that it does not overclaim. There is no point protecting that position in
the copy and spending it on a background.

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
