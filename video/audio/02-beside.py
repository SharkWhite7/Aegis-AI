"""
Score for 02 · Beside the Game.

The piece is an assembly, so the sound is mechanical: each part lands with a
stamp, and the drone gains a layer under every one of them. The payoff is the
row where the four become one voice — that is the only place the bottom
opens up before the closing position.

Rows every 2.0s put the pulse at 1.0s, which is 60 BPM.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import (SR, Bus, sine, noise, shape, env_exp, env_ad, db,
                   t_axis, write_wav)

# Must match scenes/02-beside.html exactly.
P = {
    "open": (0.00, 3.80),
    "stack": (3.80, 11.80),
    "result": (11.80, 15.20),
    "claim": (15.20, 19.20),
    "end": (19.20, 24.00),
}
DUR = P["end"][1]
ROW = 2.0
ROW_AT = [P["stack"][0] + i * ROW for i in range(4)]
CUTS = [P["stack"][0], P["claim"][0], P["end"][0]]

bus = Bus(DUR)
T = t_axis(DUR)

# ── Room tone ────────────────────────────────────────────────────────────
for ch, seed in ((0, 5), (1, 17)):
    h = shape(noise(DUR, seed=seed), SR, lo=190, hi=5200)
    h *= 1.0 + 0.2 * np.sin(2 * np.pi * 0.09 * T)
    bus.buf[ch] += h / np.max(np.abs(h)) * db(-42)

# ── Drone ────────────────────────────────────────────────────────────────
# One step per part. By the fourth row the bottom is carrying four voices,
# which is the argument the rows are making in type.
pts = [(0.0, 0.0), (0.9, 0.30), (P["open"][1], 0.38)]
for i, at in enumerate(ROW_AT):
    pts.append((at + 0.10, 0.44 + 0.09 * i))
pts += [
    (P["result"][0] - 0.05, 0.80),
    (P["result"][0] + 0.03, 0.18),      # a breath before the payoff
    (P["result"][0] + 0.55, 1.00),
    (P["claim"][0] - 0.06, 1.00),
    (P["claim"][0] + 0.02, 0.30),       # the position is stated into space
    (P["claim"][0] + 0.60, 0.82),
    (P["end"][0] + 0.40, 0.92),
    (DUR - 2.2, 0.92), (DUR - 0.05, 0.0),
]
dgain = np.interp(T, [p[0] for p in pts], [p[1] for p in pts])

wow = 1.0 + 0.0015 * np.sin(2 * np.pi * 0.17 * T) + 0.0008 * np.sin(2 * np.pi * 0.037 * T)
drone = np.zeros(len(T))
for f, amp, det in ((55.00, 1.00, 0.15), (82.41, 0.50, -0.12), (110.00, 0.24, 0.08)):
    for ff, a in ((f, amp), (f + det, amp * 0.8)):
        drone += a * np.sin(2 * np.pi * np.cumsum(ff * wow) / SR)
drone = shape(drone, SR, hi=420)
drone /= np.max(np.abs(drone))
bus.buf[0] += drone * dgain * db(-19)
bus.buf[1] += np.roll(drone, 410) * dgain * db(-19)

# ── Pulse ────────────────────────────────────────────────────────────────
k = 0
while k * 1.0 < P["claim"][0]:
    bus.add(k * 1.0, sine(0.45, 69.0) * env_exp(0.45, 0.09), gain=db(-28))
    k += 1

# ── Cuts ─────────────────────────────────────────────────────────────────
for c in CUTS:
    hit = sine(1.1, 46.0, phase=-np.pi / 2) * env_exp(1.1, 0.22)
    hit += sine(1.1, 92.0) * env_exp(1.1, 0.06) * 0.35
    bus.add(c + 0.02, hit, gain=db(-10))
    sw = shape(noise(0.52, seed=int(c * 613) % 9999), SR, lo=700, hi=7200)
    sw *= env_ad(0.52, 0.20, 0.26)
    bus.add_stereo(c - 0.24, sw * np.linspace(1.0, 0.05, len(sw)),
                   sw * np.linspace(0.05, 1.0, len(sw)), gain=db(-21))

# ── The stamps ───────────────────────────────────────────────────────────
# Each part lands as a press: a short metallic transient over a low knock.
for i, at in enumerate(ROW_AT):
    knock = sine(0.42, 104.0 - i * 6) * env_exp(0.42, 0.075)
    bus.add(at + 0.14, knock, gain=db(-17), pan=-0.18 + 0.12 * i)
    press = shape(noise(0.10, seed=400 + i), SR, lo=1500, hi=8200)
    press *= env_exp(0.10, 0.021)
    bus.add(at + 0.14, press, gain=db(-25), pan=-0.18 + 0.12 * i)
    tick = shape(noise(0.06, seed=500 + i), SR, lo=2600, hi=9000)
    bus.add(at + 0.48, tick * env_exp(0.06, 0.014), gain=db(-32), pan=0.3)

# ── The payoff ───────────────────────────────────────────────────────────
res = P["result"][0]
open_up = sine(2.6, 41.0, phase=-np.pi / 2) * env_exp(2.6, 0.80, attack=0.05)
bus.add(res + 0.20, open_up, gain=db(-10))
bus.add(res + 0.20, sine(0.8, 82.0) * env_exp(0.8, 0.12), gain=db(-18))

# ── The position ─────────────────────────────────────────────────────────
# Two statements, two stamps: NO MODS. NO INJECTION.
for k, off in enumerate((0.16, 0.34)):
    st = sine(0.9, 58.0 - k * 6) * env_exp(0.9, 0.16)
    bus.add(P["claim"][0] + off, st, gain=db(-13))

# ── Air over the end card ────────────────────────────────────────────────
apts = [(0, 0.0), (P["end"][0], 0.0), (P["end"][0] + 0.7, 1.0), (DUR - 1.6, 1.0), (DUR, 0.0)]
again = np.interp(T, [p[0] for p in apts], [p[1] for p in apts])
for ch, seed in ((0, 61), (1, 73)):
    a = shape(noise(DUR, seed=seed), SR, lo=3200, hi=9000)
    bus.buf[ch] += a / np.max(np.abs(a)) * again * db(-40)

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "02-beside.wav"), bus)
print(f"02-beside.wav  {DUR:.2f}s")
