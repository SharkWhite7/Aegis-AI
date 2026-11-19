"""
Score for 03 · It Remembers.

The quietest piece in the campaign on purpose. Act one is a thing the
companion says about the player, so almost nothing happens under it: room
tone, a low drone, and two soft marks where the line seats. The sound only
arrives for the mechanism, and opens all the way for the payoff.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import (SR, Bus, sine, noise, shape, env_exp, env_ad, db,
                   t_axis, write_wav)

# Must match scenes/03-memory.html exactly.
A1, A2, A3 = (0.00, 6.20), (6.20, 12.40), (12.40, 18.00)
DUR = A3[1]
CUTS = [A2[0], A3[0]]

bus = Bus(DUR)
T = t_axis(DUR)

for ch, seed in ((0, 3), (1, 23)):
    h = shape(noise(DUR, seed=seed), SR, lo=180, hi=5000)
    h *= 1.0 + 0.24 * np.sin(2 * np.pi * 0.06 * T)
    bus.buf[ch] += h / np.max(np.abs(h)) * db(-41)

pts = [
    (0.00, 0.00), (1.20, 0.26), (A1[1] - 0.40, 0.34),
    (A2[0] + 0.02, 0.12),
    (A2[0] + 0.70, 0.58), (A2[0] + 3.20, 0.72),
    (A3[0] - 0.05, 0.72),
    (A3[0] + 0.03, 0.00),            # the hole before the payoff
    (A3[0] + 0.55, 1.00),
    (DUR - 2.2, 1.00), (DUR - 0.05, 0.0),
]
dgain = np.interp(T, [p[0] for p in pts], [p[1] for p in pts])

wow = 1.0 + 0.0014 * np.sin(2 * np.pi * 0.15 * T) + 0.0007 * np.sin(2 * np.pi * 0.033 * T)
drone = np.zeros(len(T))
for f, amp, det in ((61.74, 1.00, 0.16), (92.50, 0.48, -0.11), (123.47, 0.20, 0.07)):
    for ff, a in ((f, amp), (f + det, amp * 0.8)):
        drone += a * np.sin(2 * np.pi * np.cumsum(ff * wow) / SR)
drone = shape(drone, SR, hi=410)
drone /= np.max(np.abs(drone))
bus.buf[0] += drone * dgain * db(-19)
bus.buf[1] += np.roll(drone, 430) * dgain * db(-19)

# Act one: two soft marks where the line seats, then a low note for the name.
for k, at in enumerate((0.26, 0.56)):
    tick = shape(noise(0.09, seed=900 + k), SR, lo=1400, hi=6000)
    bus.add(at, tick * env_exp(0.09, 0.024), gain=db(-33), pan=-0.2)
bus.add(2.26, sine(0.7, 84.0) * env_exp(0.7, 0.14), gain=db(-21))

# Cuts.
for c in CUTS:
    last = abs(c - A3[0]) < 1e-6
    hit = sine(1.1, 46.0, phase=-np.pi / 2) * env_exp(1.1, 0.10 if last else 0.24)
    hit += sine(1.1, 92.0) * env_exp(1.1, 0.06) * 0.35
    bus.add(c + 0.02, hit, gain=db(-10))
    sw = shape(noise(0.52, seed=int(c * 811) % 9999), SR, lo=700, hi=7200)
    sw *= env_ad(0.52, 0.20, 0.26)
    bus.add_stereo(c - 0.24, sw * np.linspace(1.0, 0.05, len(sw)),
                   sw * np.linspace(0.05, 1.0, len(sw)), gain=db(-21))

# Act two: a knock per display line, a tick per paragraph.
for k, off in enumerate((0.18, 0.33, 0.48)):
    bus.add(A2[0] + off, sine(0.4, 98.0 - k * 7) * env_exp(0.4, 0.07), gain=db(-19))
for k, off in enumerate((1.20, 2.00)):
    tick = shape(noise(0.07, seed=950 + k), SR, lo=2200, hi=8000)
    bus.add(A2[0] + off, tick * env_exp(0.07, 0.018), gain=db(-31), pan=0.32)

# Act three: the bottom opens, once.
bus.add(A3[0] + 0.52, sine(2.8, 41.0, phase=-np.pi / 2) * env_exp(2.8, 0.90, attack=0.06),
        gain=db(-10))
for k, off in enumerate((0.36, 0.56, 0.76)):
    bus.add(A3[0] + off, sine(0.5, 88.0 - k * 5) * env_exp(0.5, 0.09), gain=db(-20))

apts = [(0, 0.0), (A3[0], 0.0), (A3[0] + 0.8, 1.0), (DUR - 1.6, 1.0), (DUR, 0.0)]
again = np.interp(T, [p[0] for p in apts], [p[1] for p in apts])
for ch, seed in ((0, 41), (1, 53)):
    a = shape(noise(DUR, seed=seed), SR, lo=3200, hi=9000)
    bus.buf[ch] += a / np.max(np.abs(a)) * again * db(-40)

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "03-memory.wav"), bus)
print(f"03-memory.wav  {DUR:.2f}s")
