"""
Score for 06 · Your World.

This one is a track, not a bed. The reference the piece was cut against
measured 124.8 BPM with 65% of its energy below 150 Hz and almost nothing
above 6k — a club master, where the weight is the whole point. This aims at
the same balance from scratch: four on the floor, a sub sitting at 50-70 Hz
where a phone speaker can still move air, and the top reserved for hats and
the word passes.

120 BPM, so a beat is 15 frames at 30fps and every hit lands on a whole
frame. Seven bars. The arrangement opens a layer per bar, then drops
everything on beat 22, which is the frame the drive stops and the wordmark
parks. Nothing is sampled; nothing is licensed.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import SR, Bus, sine, noise, shape, env_exp, env_ad, db, t_axis, write_wav

BPM = 120
B = 60 / BPM                     # 0.5s
BEATS = 28
DUR = B * BEATS                  # 14.0s
LAND = 22 * B                    # the drop, and the landing frame
bt = lambda n: n * B             # beat index -> seconds

bus = Bus(DUR)
T = t_axis(DUR)

# ── Harmony ──────────────────────────────────────────────────────────────
# C minor. One root per bar; the bass lives at 50-70 Hz on purpose.
ROOTS = [65.41, 65.41, 51.91, 58.27, 65.41, 65.41, 65.41]   # C Ab Bb C
root_at = lambda beat: ROOTS[min(beat // 4, len(ROOTS) - 1)]

def saw(dur, f, n=12):
    """Band-limited sawtooth by summing harmonics. Warmer than a sine and
    it survives the loudness pass without turning to mud."""
    t = t_axis(dur)
    out = np.zeros(len(t))
    for k in range(1, n + 1):
        if f * k > SR / 2.2:
            break
        out += np.sin(2 * np.pi * f * k * t) / k
    return out / np.max(np.abs(out))

def kick():
    """Pitch sweep from the click down into the sub."""
    d = 0.40
    t = t_axis(d)
    f = 48 + 150 * np.exp(-t / 0.020)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, 0.095, attack=0.001)
    click = shape(noise(0.012, seed=1), SR, lo=1200, hi=7000) * env_exp(0.012, 0.004)
    out = body
    out[:len(click)] += click * 0.5
    return out

def clap(seed):
    """Four taps and a tail — a single noise burst reads as a snare, and
    this piece wants the hand clap that sits on 2 and 4."""
    d = 0.30
    out = np.zeros(int(d * SR))
    for i, off in enumerate((0.000, 0.009, 0.018, 0.028)):
        n = shape(noise(0.10, seed=seed + i), SR, lo=1100, hi=4200)
        n *= env_exp(0.10, 0.012 if i < 3 else 0.075)
        k = int(off * SR)
        out[k:k + len(n)] += n * (0.6 if i < 3 else 1.0)
    return out / np.max(np.abs(out))

def hat(seed, open_=False):
    d = 0.09 if open_ else 0.035
    return shape(noise(d, seed=seed), SR, lo=6500, hi=13000) * env_exp(d, d / 3.2)

# ── Pad ──────────────────────────────────────────────────────────────────
pad_pts = [(0, 0.0), (bt(2), 0.45), (bt(12), 0.62), (bt(20), 0.75),
           (LAND + 0.04, 1.0), (DUR - 2.0, 1.0), (DUR - 0.05, 0.0)]
pg = np.interp(T, [p[0] for p in pad_pts], [p[1] for p in pad_pts])
pad = np.zeros(len(T))
for f, a in ((130.81, 1.0), (155.56, 0.6), (196.00, 0.5), (130.81 + 0.2, 0.7)):
    pad += a * np.sin(2 * np.pi * f * T)
pad = shape(pad, SR, hi=900)
pad /= np.max(np.abs(pad))
bus.buf[0] += pad * pg * db(-19)
bus.buf[1] += np.roll(pad, 390) * pg * db(-19)

# ── Drums and bass, bar by bar ───────────────────────────────────────────
for beat in range(BEATS):
    at = bt(beat)
    if at >= LAND:                       # the drop: nothing after it
        break
    bar = beat // 4
    inbar = beat % 4

    bus.add(at, kick(), gain=db(-10))

    if bar >= 1 and inbar in (1, 3):
        bus.add(at, clap(100 + beat), gain=db(-10))

    if bar >= 2:
        bus.add(at + B / 2, hat(200 + beat), gain=db(-18), pan=0.22)
        if inbar == 3:
            bus.add(at + 3 * B / 4, hat(260 + beat, open_=True), gain=db(-20), pan=-0.22)

    # Sub: root on the beat, octave stab on the offbeat.
    r = root_at(beat)
    # Sine for the weight plus a filtered saw an octave up for the note:
    # a pure sine at 60 Hz is felt but not heard on a phone, and the track
    # has to survive one.
    bus.add(at, sine(0.42, r) * env_exp(0.42, 0.14, attack=0.006), gain=db(-13))
    bus.add(at, shape(saw(0.40, r * 2), SR, hi=900) * env_exp(0.40, 0.12),
            gain=db(-13))
    bus.add(at + B / 2, sine(0.20, r * 2) * env_exp(0.20, 0.05), gain=db(-22))

    # Arpeggio from bar 3, sixteenths, alternating across the stereo field.
    if bar >= 3:
        steps = [1.0, 1.1892, 1.4983, 1.7818]      # root, m3, 5, m7
        for k in range(4):
            n = saw(0.16, r * 4 * steps[k]) * env_exp(0.16, 0.040)
            n = shape(n, SR, lo=180, hi=1500 + 900 * bar)
            bus.add(at + k * B / 4, n, gain=db(-13), pan=-0.4 + 0.27 * k)
            # A thin octave above, so the figure reads on a phone speaker
            # where nothing below 200 Hz is reproduced at all.
            hi_ = saw(0.12, r * 8 * steps[k], n=6) * env_exp(0.12, 0.028)
            bus.add(at + k * B / 4, shape(hi_, SR, lo=400, hi=5200),
                    gain=db(-23), pan=0.4 - 0.27 * k)

# ── Word passes ──────────────────────────────────────────────────────────
# Each tagline line leaves frame on beats 6, 10, 14, 18 and 22. The sweep
# follows it out rather than announcing it.
for beat in (6, 10, 14, 18, 22):
    at = bt(beat) - 0.34
    sw = shape(noise(0.46, seed=800 + beat), SR, lo=500, hi=9000)
    sw *= env_ad(0.46, 0.30, 0.14) * np.linspace(0.3, 1.0, int(0.46 * SR))
    bus.add_stereo(at, sw * np.linspace(0.9, 0.25, len(sw)),
                   sw * np.linspace(0.25, 0.9, len(sw)), gain=db(-17))

# ── Riser into the drop ──────────────────────────────────────────────────
# Built from chunks with a climbing low corner: a filter sweep without a
# time-varying filter.
rise_len = bt(22) - bt(19)
chunks = 24
for i in range(chunks):
    seg_d = rise_len / chunks
    lo = 300 + i * 190
    c = shape(noise(seg_d * 1.6, seed=900 + i), SR, lo=lo, hi=lo + 5200)
    c *= np.linspace(0.25 + 0.75 * i / chunks, 0.3 + 0.8 * (i + 1) / chunks, len(c))
    bus.add(bt(19) + i * seg_d, c, gain=db(-24))

# ── The drop ─────────────────────────────────────────────────────────────
bus.add(LAND, sine(3.4, 41.0, phase=-np.pi / 2) * env_exp(3.4, 0.70, attack=0.004),
        gain=db(-11))
bus.add(LAND, kick(), gain=db(-9))
crash = shape(noise(2.2, seed=777), SR, lo=2400, hi=12000) * env_exp(2.2, 0.55)
bus.add_stereo(LAND, crash, np.roll(crash, 260), gain=db(-15))

# ── Room tone under everything ───────────────────────────────────────────
for ch, seed in ((0, 31), (1, 43)):
    h = shape(noise(DUR, seed=seed), SR, lo=200, hi=5200)
    bus.buf[ch] += h / np.max(np.abs(h)) * db(-44)

# Master high-pass. Everything under ~34 Hz is energy no phone and few
# laptops reproduce, and on a track this bass-forward it is a large share
# of the budget — removing it is what lets the sub that IS audible sit
# where the reference's does.
for ch in (0, 1):
    bus.buf[ch] = shape(bus.buf[ch], SR, lo=34, order=6)

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "06-world.wav"), bus, drive=2.8)
print(f"06-world.wav  {DUR:.2f}s  {BPM} BPM")
