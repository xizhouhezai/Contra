# -*- coding: utf-8 -*-
"""
Generate the twelve stage soundtracks.

No sampler, no library - every sound here is built from oscillators and noise.
That is a constraint, not a preference: there is no audio toolchain on this
machine, so the music has to be arithmetic.

Each track is written to match the stage brief: a low drone for the dock,
hammered metal for the corridor, airy pads for the bridge, and so on. The
distinction is carried by three things the generator can actually control -
tempo, timbre, and which percussion it uses - because a listener has to be able
to tell one stage from the next without looking.

Everything loops. The bars are generated into a list and written end to end, and
the reverb tail of the last bar is folded back into the head, so the join is
continuous rather than a fade that betrays where the file ends.
"""
import math
import os
import sys
import io
import wave

import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SR = 44100


def adsr(n, attack, decay, sustain, release, sr=SR):
    """Attack-decay-sustain-release envelope over n samples."""
    a = max(1, int(attack * sr))
    d = max(1, int(decay * sr))
    r = max(1, int(release * sr))
    s = max(1, n - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sustain, d),
        np.full(s, sustain),
        np.linspace(sustain, 0, r),
    ])
    if len(env) < n:
        env = np.pad(env, (0, n - len(env)))
    return env[:n]


def sine(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return np.sin(2 * math.pi * freq * t)


def saw(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return 2.0 * (t * freq - np.floor(0.5 + t * freq))


def square(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return np.sign(np.sin(2 * math.pi * freq * t))


def noise(dur, sr=SR):
    return np.random.uniform(-1, 1, int(dur * sr))


def lowpass(sig, alpha):
    """One-pole low pass; alpha near 0 is dull, near 1 is bright."""
    out = np.empty_like(sig)
    acc = 0.0
    for i in range(len(sig)):
        acc += alpha * (sig[i] - acc)
        out[i] = acc
    return out


def kick(sr=SR):
    dur = 0.22
    n = int(dur * sr)
    t = np.arange(n) / sr
    freq = 120 * np.exp(-t * 26) + 42
    body = np.sin(2 * math.pi * np.cumsum(freq) / sr)
    return body * np.exp(-t * 12)


def snare(sr=SR):
    dur = 0.18
    n = int(dur * sr)
    t = np.arange(n) / sr
    body = noise(dur) * np.exp(-t * 26)
    tone = np.sin(2 * math.pi * 190 * t) * np.exp(-t * 20) * 0.5
    return (body) * 0.7 + tone


def hat(sr=SR):
    dur = 0.06
    n = int(dur * sr)
    t = np.arange(n) / sr
    return noise(dur) * np.exp(-t * 70) * 0.5


def metal_hit(sr=SR):
    """A struck steel plate: inharmonic partials with a short decay."""
    dur = 0.35
    n = int(dur * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)
    for ratio, amp, decay in ((1.0, 1.0, 9), (2.76, 0.6, 12), (5.4, 0.35, 16), (8.9, 0.2, 22)):
        out += amp * np.sin(2 * math.pi * 180 * ratio * t) * np.exp(-t * decay)
    return out * 0.5


def place(track, sample, at_seconds, gain=1.0):
    i = int(at_seconds * SR)
    end = min(len(track), i + len(sample))
    if end > i:
        track[i:end] += sample[: end - i] * gain


def reverb(sig, mix=0.28, decay=0.42, taps=(0.031, 0.053, 0.079, 0.117, 0.163)):
    """Cheap Schroeder-ish reverb: a few delayed copies, each quieter."""
    out = sig.copy()
    for k, delay in enumerate(taps):
        d = int(delay * SR)
        gain = mix * (decay ** k)
        out[d:] += sig[:-d] * gain if d < len(sig) else 0
    return out


def fold_tail(sig, tail_seconds=1.2, sr=SR):
    """Wrap the decaying tail of a track onto its beginning, so it loops."""
    n = int(tail_seconds * sr)
    if len(sig) <= n * 2:
        return sig
    body = sig[:-n].copy()
    tail = sig[-n:]
    # A short ramp keeps the wrapped tail from clicking into the first sample.
    ramp = np.linspace(1.0, 0.0, n)
    body[:n] += tail * ramp
    return body


def normalise(sig, peak=0.85):
    m = np.max(np.abs(sig))
    if m < 1e-9:
        return sig
    return sig * (peak / m)


def write_wav(path, stereo):
    data = np.clip(stereo, -1.0, 1.0)
    ints = (data * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(ints.tobytes())


# Note frequencies, A4 = 440.
def note(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
             'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pitch = name[:-1]
    octave = int(name[-1])
    semis = names[pitch] + (octave - 4) * 12
    return 440.0 * (2 ** (semis / 12))


STAGES = [
    # file, bpm, seconds, pad notes, bass note, kick?, snare?, metal?, hat?, brightness
    ('bgm-01-dock',        70, 120, ['D3', 'F3', 'A3', 'C4'], 'D2', False, False, False, False, 0.020),
    ('bgm-02-corridor',   100, 120, ['A2', 'C3', 'E3'],        'A1', True,  True,  True,  False, 0.060),
    ('bgm-03-bridge',      90, 120, ['G3', 'B3', 'D4', 'F#4'], 'G2', False, False, False, True,  0.035),
    ('bgm-04-auditor',    130, 150, ['C3', 'D#3', 'G3'],       'C2', True,  True,  True,  True,  0.075),
    ('bgm-05-coolant',     85, 120, ['E3', 'G3', 'B3'],        'E2', False, False, False, False, 0.015),
    ('bgm-06-server',     110, 120, ['B2', 'D3', 'F#3', 'A3'], 'B1', True,  False, False, True,  0.090),
    ('bgm-07-forge',      140, 120, ['F2', 'G#2', 'C3'],       'F1', True,  True,  True,  True,  0.110),
    ('bgm-08-rewriter',   135, 150, ['C#3', 'E3', 'G3', 'A#3'], 'C#2', True, True,  False, True,  0.045),
    ('bgm-09-archive',     75, 120, ['F3', 'A3', 'C4', 'E4'],  'F2', False, False, False, False, 0.025),
    ('bgm-10-mirror',      95, 120, ['A3', 'C4', 'E4', 'G#4'], 'A2', False, True,  False, True,  0.040),
    ('bgm-11-abyss',       80, 120, ['C2', 'D#2', 'G2'],       'C1', False, False, False, False, 0.010),
    ('bgm-12-emergence',  145, 180, ['D3', 'F3', 'A3', 'C#4'], 'D2', True,  True,  True,  True,  0.085),
]


def build(cfg):
    name, bpm, seconds, pads, bass_name, use_kick, use_snare, use_metal, use_hat, bright = cfg
    beat = 60.0 / bpm
    bar = beat * 4
    bars = int(math.ceil(seconds / bar))
    total = int(bars * bar * SR)
    left = np.zeros(total)
    right = np.zeros(total)

    rng = np.random.default_rng(abs(hash(name)) % (2 ** 32))

    # Pad: the sustained bed. Detuned copies spread across the stereo field.
    for bi in range(bars):
        at = bi * bar
        for vi, nname in enumerate(pads):
            f = note(nname)
            dur = bar * 0.98
            sig = saw(f, dur) * 0.5 + saw(f * 1.003, dur) * 0.5
            sig = lowpass(sig, bright)
            sig *= adsr(len(sig), 0.4, 0.3, 0.7, 0.6)
            pan = (vi / max(1, len(pads) - 1)) * 0.7 + 0.15
            place(left, sig * (1 - pan), at, 0.16)
            place(right, sig * pan, at, 0.16)

    # Bass: one long note per bar, or two on the faster tracks.
    bass_f = note(bass_name)
    per_bar = 2 if bpm >= 120 else 1
    for bi in range(bars):
        for k in range(per_bar):
            at = bi * bar + k * (bar / per_bar)
            dur = (bar / per_bar) * 0.9
            sig = sine(bass_f, dur) * 0.7 + saw(bass_f, dur) * 0.3
            sig = lowpass(sig, 0.05)
            sig *= adsr(len(sig), 0.02, 0.1, 0.8, 0.15)
            place(left, sig, at, 0.22)
            place(right, sig, at, 0.22)

    # Percussion.
    for bi in range(bars):
        for k in range(4):
            at = bi * bar + k * beat
            if use_kick and k in (0, 2):
                place(left, kick(), at, 0.55)
                place(right, kick(), at, 0.55)
            if use_snare and k in (1, 3):
                place(left, snare(), at, 0.28)
                place(right, snare(), at, 0.30)
            if use_hat:
                place(left, hat(), at + beat * 0.5, 0.10)
                place(right, hat(), at + beat * 0.5, 0.12)
            if use_metal and k == 0:
                place(left, metal_hit(), at, 0.22)
                place(right, metal_hit(), at + 0.004, 0.20)

    # A sparse melodic line, so the tracks are not just chords.
    scale = [note(n) for n in pads]
    for bi in range(bars):
        if rng.random() > 0.55:
            continue
        f = scale[int(rng.integers(0, len(scale)))] * 2
        at = bi * bar + beat * float(rng.integers(0, 4))
        dur = beat * 1.4
        sig = square(f, dur) * 0.5 + sine(f * 2, dur) * 0.5
        sig = lowpass(sig, 0.16)
        sig *= adsr(len(sig), 0.01, 0.12, 0.35, 0.25)
        place(left, sig, at, 0.09)
        place(right, sig, at + 0.01, 0.09)

    left = reverb(left, mix=0.24 if bpm < 120 else 0.16)
    right = reverb(right, mix=0.26 if bpm < 120 else 0.18)

    # Fold the reverb tail back onto the head.
    #
    # The reverb rings past the last bar. If the file simply ends there, the
    # tail is cut and playback jumps from near-silence straight back to a full
    # first beat - an audible click every loop. Wrapping the overhang onto the
    # beginning makes the last sample flow into the first, which is what a
    # looping track needs.
    left = fold_tail(left, tail_seconds=1.2)
    right = fold_tail(right, tail_seconds=1.2)

    left = normalise(left, 0.85)
    right = normalise(right, 0.85)
    return np.stack([left, right], axis=1)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.tmp/bgm'
    os.makedirs(out, exist_ok=True)
    for cfg in STAGES:
        name = cfg[0]
        stereo = build(cfg)
        path = os.path.join(out, name + '.wav')
        write_wav(path, stereo)
        mb = os.path.getsize(path) / 1024 / 1024
        print('%-20s %5.1fs  %5.1f MB' % (name, len(stereo) / SR, mb))


main()
