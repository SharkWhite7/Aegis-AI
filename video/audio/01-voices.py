"""
Score for 01 · Six Voices.

The grid is the edit: a cut every 3.8 seconds, so the pulse sits at 0.95s —
63 BPM, four to a beat. Nothing here is decorative. The sub marks the cut,
the noise follows the magenta bar across the frame, the ticks land on the
line reveals, and the drone steps up twice so that six identical beats do
not feel identical.

The outro opens with a hole: everything stops for a third of a second
before the last statement. Silence is the loudest thing available in a
format that autoplays muted and rewards the tap.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import (SR, Bus, sine, noise, shape, env_exp, env_ad, db,
                   t_axis, write_wav)

# Must match scenes/01-voices.html exactly.
INTRO = 1.60
BEAT = 3.80
N_VOICES = 6
OUTRO_AT = INTRO + BEAT * N_VOICES          # 24.40
DUR = OUTRO_AT + 5.60                       # 30.00
LINES_PER_BEAT = [2, 2, 2, 2, 1, 2]         # how many masked lines each voice sets

CUTS = [INTRO] + [INTRO + i * BEAT for i in range(1, N_VOICES)] + [OUTRO_AT]

bus = Bus(DUR)
T = t_axis(DUR)

# ── Room tone ────────────────────────────────────────────────────────────
# Tape hiss, not silence. It gives the cuts something to interrupt.
for ch, seed in ((0, 11), (1, 29)):
    h = shape(noise(DUR, seed=seed), SR, lo=190, hi=5400)
    h *= 1.0 + 0.22 * np.sin(2 * np.pi * 0.07 * T)
    bus.buf[ch] += h / np.max(np.abs(h)) * db(-42)

# ── Drone ────────────────────────────────────────────────────────────────
# C2 and G2 with detuned partners, so the pair beats slowly against itself.
gain_pts = [
    (0.00, 0.00), (1.00, 0.34), (INTRO, 0.48),
    (INTRO + 2 * BEAT, 0.60),                     # voice 3 — it thickens
    (INTRO + 4 * BEAT, 0.76),                     # voice 5 — the turn
    (OUTRO_AT - 0.06, 0.76),
    (OUTRO_AT + 0.02, 0.00),                      # the hole
    (OUTRO_AT + 0.42, 0.95),
    (DUR - 2.6, 0.95), (DUR - 0.05, 0.0),
]
dgain = np.interp(T, [p[0] for p in gain_pts], [p[1] for p in gain_pts])

# Slow tape wow on the pitch, integrated so the phase stays continuous.
wow = 1.0 + 0.0016 * np.sin(2 * np.pi * 0.19 * T) + 0.0009 * np.sin(2 * np.pi * 0.041 * T)
drone = np.zeros(len(T))
for f, amp, det in ((65.41, 1.00, 0.17), (98.00, 0.52, -0.13), (130.81, 0.22, 0.09)):
    for ff, a in ((f, amp), (f + det, amp * 0.8)):
        ph = 2 * np.pi * np.cumsum(ff * wow) / SR
        drone += a * np.sin(ph)
drone = shape(drone, SR, hi=430)
drone /= np.max(np.abs(drone))
bus.buf[0] += drone * dgain * db(-19)
bus.buf[1] += np.roll(drone, 380) * dgain * db(-19)   # a few ms of width

# ── Air ──────────────────────────────────────────────────────────────────
# A high band that only arrives for the last statement.
air_pts = [(0, 0.0), (INTRO + 4 * BEAT, 0.0), (OUTRO_AT + 0.45, 1.0),
           (DUR - 2.0, 1.0), (DUR, 0.0)]
again = np.interp(T, [p[0] for p in air_pts], [p[1] for p in air_pts])
for ch, seed in ((0, 71), (1, 83)):
    a = shape(noise(DUR, seed=seed), SR, lo=3200, hi=9000)
    bus.buf[ch] += a / np.max(np.abs(a)) * again * db(-40)

# ── Pulse ────────────────────────────────────────────────────────────────
# 0.95s, four to the cut. Under everything, felt rather than heard.
k = 0
while k * 0.95 < OUTRO_AT:
    at = k * 0.95
    body = sine(0.45, 73.0) * env_exp(0.45, 0.10)
    bus.add(at, body, gain=db(-27))
    k += 1

# ── Cuts ─────────────────────────────────────────────────────────────────
for c in CUTS:
    # The sub lands when the magenta bar is mid-frame. At the last cut it is
    # a thud rather than a ring: a 1.1s tail would play straight through the
    # hole the drone opens, and the hole is the point of the ending.
    last = abs(c - OUTRO_AT) < 1e-6
    decay = 0.10 if last else 0.26
    hit = sine(1.1, 46.0, phase=-np.pi / 2) * env_exp(1.1, decay)
    hit += sine(1.1, 92.0) * env_exp(1.1, 0.07) * 0.35
    bus.add(c + 0.02, hit, gain=db(-9))

    # Noise that travels left to right with the bar itself.
    sw = shape(noise(0.52, seed=int(c * 977) % 9999), SR, lo=700, hi=7200)
    sw *= env_ad(0.52, 0.20, 0.26)
    left = sw * np.linspace(1.0, 0.05, len(sw))
    right = sw * np.linspace(0.05, 1.0, len(sw))
    bus.add_stereo(c - 0.24, left, right, gain=db(-21))

# The drone comes back under the closing statement, and this is the only
# place in the piece where the bottom is allowed to be wide open.
reopen = sine(2.4, 41.0, phase=-np.pi / 2) * env_exp(2.4, 0.85, attack=0.06)
bus.add(OUTRO_AT + 0.40, reopen, gain=db(-11))

# ── Beat detail ──────────────────────────────────────────────────────────
for i in range(N_VOICES):
    b = INTRO + i * BEAT
    for k in range(LINES_PER_BEAT[i]):
        tick = shape(noise(0.07, seed=1000 + i * 10 + k), SR, lo=1800, hi=7000)
        tick *= env_exp(0.07, 0.017)
        bus.add(b + 0.14 + k * 0.10, tick, gain=db(-29), pan=-0.25)
    # The name seats with a low thud, not a click.
    thud = sine(0.5, 88.0) * env_exp(0.5, 0.11)
    bus.add(b + 0.86, thud, gain=db(-20))

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "01-voices.wav"), bus)
print(f"01-voices.wav  {DUR:.2f}s  {len(CUTS)} cuts")
