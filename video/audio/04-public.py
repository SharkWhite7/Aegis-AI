"""
Score for 04 · Built in Public.

The longest piece and the only one with a document in it, so the sound is
closer to a machine than to a mood: the eleven stages print out, the six
banned rules are struck off, and the bottom only opens for the last
statement. Nothing swells under the screenshot — that act is evidence, not
an argument, and it should feel like it is being shown rather than sold.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import (SR, Bus, sine, noise, shape, env_exp, env_ad, db,
                   t_axis, write_wav)

# Must match scenes/04-public.html exactly.
A1, A2, A3, A4, A5 = ((0.00, 6.00), (6.00, 14.60), (14.60, 21.60),
                      (21.60, 29.60), (29.60, 38.00))
DUR = A5[1]
CUTS = [A2[0], A3[0], A4[0], A5[0]]
N_STAGES, N_BANNED = 11, 6

bus = Bus(DUR)
T = t_axis(DUR)

for ch, seed in ((0, 13), (1, 37)):
    h = shape(noise(DUR, seed=seed), SR, lo=185, hi=5300)
    h *= 1.0 + 0.2 * np.sin(2 * np.pi * 0.05 * T)
    bus.buf[ch] += h / np.max(np.abs(h)) * db(-42)

pts = [
    (0.00, 0.00), (1.10, 0.30), (A1[1] - 0.40, 0.38),
    (A2[0] + 0.10, 0.52), (A2[1] - 0.50, 0.66),
    (A3[0] + 0.02, 0.22),            # evidence, not argument
    (A3[1] - 0.40, 0.30),
    (A4[0] + 0.10, 0.58), (A4[1] - 0.50, 0.74),
    (A5[0] - 0.05, 0.74),
    (A5[0] + 0.03, 0.00),            # the hole
    (A5[0] + 0.55, 1.00),
    (DUR - 2.6, 1.00), (DUR - 0.05, 0.0),
]
dgain = np.interp(T, [p[0] for p in pts], [p[1] for p in pts])

wow = 1.0 + 0.0015 * np.sin(2 * np.pi * 0.13 * T) + 0.0008 * np.sin(2 * np.pi * 0.029 * T)
drone = np.zeros(len(T))
for f, amp, det in ((58.27, 1.00, 0.16), (87.31, 0.48, -0.12), (116.54, 0.21, 0.08)):
    for ff, a in ((f, amp), (f + det, amp * 0.8)):
        drone += a * np.sin(2 * np.pi * np.cumsum(ff * wow) / SR)
drone = shape(drone, SR, hi=420)
drone /= np.max(np.abs(drone))
bus.buf[0] += drone * dgain * db(-19)
bus.buf[1] += np.roll(drone, 420) * dgain * db(-19)

# Pulse through the two document acts only.
for k in range(int(A5[0])):
    at = k * 1.0
    if A2[0] <= at < A3[0] or A4[0] <= at < A5[0]:
        bus.add(at, sine(0.42, 69.0) * env_exp(0.42, 0.09), gain=db(-29))

for c in CUTS:
    last = abs(c - A5[0]) < 1e-6
    hit = sine(1.1, 46.0, phase=-np.pi / 2) * env_exp(1.1, 0.10 if last else 0.24)
    hit += sine(1.1, 92.0) * env_exp(1.1, 0.06) * 0.35
    bus.add(c + 0.02, hit, gain=db(-10))
    sw = shape(noise(0.52, seed=int(c * 509) % 9999), SR, lo=700, hi=7200)
    sw *= env_ad(0.52, 0.20, 0.26)
    bus.add_stereo(c - 0.24, sw * np.linspace(1.0, 0.05, len(sw)),
                   sw * np.linspace(0.05, 1.0, len(sw)), gain=db(-21))

# Act 1: two statements.
for k, off in enumerate((0.18, 0.34)):
    bus.add(off, sine(0.8, 62.0 - k * 5) * env_exp(0.8, 0.15), gain=db(-13))

# Act 2: the segments zip in, then eleven rows print.
zip_ = shape(noise(0.60, seed=210), SR, lo=1200, hi=9000)
zip_ *= np.linspace(0.2, 1.0, len(zip_)) * env_exp(0.60, 0.26, attack=0.02)
bus.add_stereo(A2[0] + 0.70, zip_ * np.linspace(1.0, 0.2, len(zip_)),
               zip_ * np.linspace(0.2, 1.0, len(zip_)), gain=db(-26))
for i in range(N_STAGES):
    at = A2[0] + 1.35 + i * 0.30
    tick = shape(noise(0.055, seed=600 + i), SR, lo=2400, hi=9500)
    bus.add(at, tick * env_exp(0.055, 0.013), gain=db(-28),
            pan=-0.35 if i % 2 == 0 else 0.35)
    if i < 4:   # the stages that have actually shipped get weight
        bus.add(at, sine(0.3, 110.0) * env_exp(0.3, 0.05), gain=db(-24))

# Act 3: one shutter, then nothing. The page is simply shown.
sh = shape(noise(0.14, seed=321), SR, lo=900, hi=6500)
bus.add(A3[0] + 0.12, sh * env_exp(0.14, 0.030), gain=db(-22))

# Act 4: six rules struck off.
for i in range(N_BANNED):
    at = A4[0] + 1.10 + i * 0.52
    x = shape(noise(0.08, seed=700 + i), SR, lo=3000, hi=11000)
    bus.add(at, x * env_exp(0.08, 0.016), gain=db(-26), pan=0.28)
    bus.add(at, sine(0.26, 148.0) * env_exp(0.26, 0.035), gain=db(-27))

# Act 5: the bottom opens once, under the only promise the piece makes.
bus.add(A5[0] + 0.52, sine(3.0, 41.0, phase=-np.pi / 2) * env_exp(3.0, 0.95, attack=0.06),
        gain=db(-10))
for k, off in enumerate((0.32, 0.50, 0.68)):
    bus.add(A5[0] + off, sine(0.5, 90.0 - k * 5) * env_exp(0.5, 0.09), gain=db(-20))

apts = [(0, 0.0), (A5[0], 0.0), (A5[0] + 0.8, 1.0), (DUR - 1.8, 1.0), (DUR, 0.0)]
again = np.interp(T, [p[0] for p in apts], [p[1] for p in apts])
for ch, seed in ((0, 91), (1, 103)):
    a = shape(noise(DUR, seed=seed), SR, lo=3200, hi=9000)
    bus.buf[ch] += a / np.max(np.abs(a)) * again * db(-40)

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "04-public.wav"), bus)
print(f"04-public.wav  {DUR:.2f}s")
