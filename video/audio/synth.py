"""
Sound design primitives.

Everything the pieces play is generated here from first principles — sines,
noise and envelopes. Nothing is sampled and nothing is licensed, so the
audio is as much ours as the copy is, and there is no third-party clearance
sitting between a render and a post.

Filtering is done in the frequency domain over the whole buffer. For static
beds that is exact and costs one FFT; short transients are filtered as their
own small buffers, which is cheaper than any time-domain filter written in
Python would be.
"""

import numpy as np

SR = 48000


def t_axis(dur, sr=SR):
    return np.arange(int(round(dur * sr))) / sr


def db(x):
    """Decibels to linear gain."""
    return 10.0 ** (x / 20.0)


def shape(x, sr, lo=None, hi=None, order=4):
    """Soft band shaping. `lo` rolls off below it, `hi` rolls off above it."""
    n = len(x)
    if n < 8:
        return x
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    g = np.ones_like(f)
    fs = np.maximum(f, 1e-9)
    if lo:
        g *= 1.0 / (1.0 + (lo / fs) ** order)
    if hi:
        g *= 1.0 / (1.0 + (fs / hi) ** order)
    return np.fft.irfft(X * g, n=n)


def noise(dur, sr=SR, seed=0):
    """Deterministic white noise. A fixed seed keeps renders reproducible."""
    return np.random.default_rng(seed).standard_normal(int(round(dur * sr)))


def sine(dur, freq, sr=SR, phase=0.0):
    return np.sin(2 * np.pi * freq * t_axis(dur, sr) + phase)


def env_exp(dur, decay, sr=SR, attack=0.004):
    """Percussive envelope: near-instant attack, exponential tail."""
    t = t_axis(dur, sr)
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    return a * np.exp(-t / decay)


def env_ad(dur, attack, release, sr=SR):
    """Swell: raised-cosine in, raised-cosine out, flat between."""
    n = int(round(dur * sr))
    e = np.ones(n)
    na, nr = int(attack * sr), int(release * sr)
    if na > 0:
        e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if nr > 0:
        e[n - nr:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e


class Bus:
    """A stereo buffer that events are stamped into at absolute times."""

    def __init__(self, dur, sr=SR):
        self.sr = sr
        self.n = int(round(dur * sr))
        self.buf = np.zeros((2, self.n))

    def add(self, at, mono, gain=1.0, pan=0.0):
        """`pan` is -1 hard left to +1 hard right, constant power."""
        i = int(round(at * self.sr))
        if i >= self.n:
            return
        seg = mono[: self.n - i] if i >= 0 else mono[-i:][: self.n]
        j = max(i, 0)
        if len(seg) == 0:
            return
        th = (pan + 1) * np.pi / 4
        self.buf[0, j:j + len(seg)] += seg * gain * np.cos(th) * np.sqrt(2) / 1.0
        self.buf[1, j:j + len(seg)] += seg * gain * np.sin(th) * np.sqrt(2) / 1.0

    def add_stereo(self, at, left, right, gain=1.0):
        for ch, mono in ((0, left), (1, right)):
            i = int(round(at * self.sr))
            if i >= self.n:
                continue
            seg = mono[: self.n - i]
            self.buf[ch, i:i + len(seg)] += seg * gain


def soft_clip(x, drive=1.0):
    """tanh saturation. Catches transient peaks without a brickwall artefact."""
    return np.tanh(x * drive) / np.tanh(drive)


def write_wav(path, bus, peak_db=-3.0, drive=2.4):
    """
    24-bit WAV. Loudness is set afterwards by ffmpeg's EBU R128 pass.

    The buffer is normalised, then saturated, then normalised again. Order
    matters: saturating a signal whose peak is already below unity does
    nothing, and a score built from sub hits has a crest factor high enough
    that R128 cannot lift it to -14 LUFS without clipping. The tanh stage
    takes the top off the transients and puts harmonics there instead,
    which is also how the sub survives a phone speaker.
    """
    import wave

    x = bus.buf
    peak = np.max(np.abs(x))
    if peak > 0:
        x = x / peak * 0.92
    x = soft_clip(x, drive)
    peak = np.max(np.abs(x))
    if peak > 0:
        x = x / peak * db(peak_db)
    data = np.clip(x.T.reshape(-1), -1.0, 1.0)
    ints = (data * (2 ** 23 - 1)).astype(np.int32)
    raw = ints.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(bus.sr)
        w.writeframes(raw)
    return path
