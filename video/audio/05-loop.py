"""
Score for 05 · Loop.

A six-second bed that wraps. Every partial is an exact multiple of 1/6 Hz,
so the waveform is continuous across the join, and the last transient
decays before the file ends. The hiss does not wrap on its own, so its
head and tail are crossfaded into each other.
"""

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

import numpy as np
from synth import SR, Bus, sine, noise, shape, env_exp, db, t_axis, write_wav

PERIOD = 6.0
XFADE = 0.5

bus = Bus(PERIOD)
T = t_axis(PERIOD)

# ── Hiss, crossfaded head to tail so the join is silent ──────────────────
for ch, seed in ((0, 7), (1, 19)):
    h = shape(noise(PERIOD + XFADE, seed=seed), SR, lo=190, hi=5200)
    n, nx = int(PERIOD * SR), int(XFADE * SR)
    head, tail = h[:n].copy(), h[n:n + nx]
    f = np.linspace(0, 1, nx)
    head[:nx] = head[:nx] * f + tail * (1 - f)
    bus.buf[ch] += head / np.max(np.abs(head)) * db(-40)

# ── Drone. 55 / 82.5 / 110 Hz are 330 / 495 / 660 cycles in six seconds. ─
drone = np.zeros(len(T))
for f, amp in ((55.0, 1.00), (55.0 + 1 / 6, 0.80),
               (82.5, 0.50), (82.5 - 1 / 6, 0.40),
               (110.0, 0.22)):
    drone += amp * np.sin(2 * np.pi * f * T)
drone = shape(drone, SR, hi=420)
drone /= np.max(np.abs(drone))
bus.buf[0] += drone * db(-17)
bus.buf[1] += np.roll(drone, 400) * db(-17)

# ── One mark per personality. The sixth decays well before the wrap. ─────
for i in range(6):
    at = i * 1.0
    body = sine(0.6, 69.0) * env_exp(0.6, 0.11)
    bus.add(at, body, gain=db(-15) if i == 0 else db(-21))
    tick = shape(noise(0.07, seed=300 + i), SR, lo=1800, hi=7500)
    bus.add(at + 0.02, tick * env_exp(0.07, 0.017), gain=db(-31),
            pan=-0.3 + 0.12 * i)

write_wav(str(pathlib.Path(__file__).parent.parent / "out" / "05-loop.wav"), bus)
print(f"05-loop.wav  {PERIOD:.2f}s")
