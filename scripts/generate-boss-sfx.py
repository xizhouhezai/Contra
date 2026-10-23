# -*- coding: utf-8 -*-
"""
Two boss sounds the game was missing.

Boss moves became real when core.ts started applying them, and the player now
gets a 1.2 second warning before an attack lands. That warning is only fair if it
is audible: a player watching their own aim does not see a wind-up drawn on the
far side of the arena, so the telegraph needs a sound of its own.

bossTelegraph rises - two notes a fifth apart, short, repeated - because a rising
figure reads as "about to happen". bossAttack is a single low body hit, so the two
are never confused when they land half a second apart.
"""
import io
import math
import os
import subprocess
import sys
import wave

import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

RATE = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/game/requirements/assets/audio/sfx'
FFMPEG = r'C:\Users\yr137\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe'


def env(n, attack=0.005, decay=0.35):
    """Percussive envelope: fast attack, exponential decay."""
    a = int(RATE * attack)
    d = int(RATE * decay)
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0.0, 1.0, a)
    tail = np.linspace(1.0, 0.0, d)
    e[a:a + d] = e[a:a + d] * tail[: max(0, min(d, n - a))]
    if a + d < n:
        e[a + d:] = 0.0
    return e


def tone(freq, seconds, harmonics=(1.0,)):
    n = int(RATE * seconds)
    t = np.arange(n) / RATE
    sig = np.zeros(n)
    for i, amp in enumerate(harmonics, start=1):
        sig += amp * np.sin(2 * math.pi * freq * i * t)
    return sig


def telegraph():
    """Rising double blip, then a short hold - a wind-up."""
    parts = []
    for freq, dur in ((520.0, 0.11), (780.0, 0.11), (780.0, 0.10)):
        sig = tone(freq, dur, (1.0, 0.35, 0.12)) * env(int(RATE * dur), 0.004, dur)
        parts.append(sig)
        parts.append(np.zeros(int(RATE * 0.035)))
    sig = np.concatenate(parts)
    return sig


def attack():
    """Low body hit with a noise transient - a move landing."""
    dur = 0.42
    n = int(RATE * dur)
    body = tone(92.0, dur, (1.0, 0.5, 0.25)) * env(n, 0.004, 0.34)
    # A pitch drop makes a hit feel heavy rather than like a note.
    t = np.arange(n) / RATE
    drop = np.sin(2 * math.pi * (92.0 - 46.0 * t / dur) * t)
    rng = np.random.default_rng(20)
    noise = rng.standard_normal(n) * env(n, 0.001, 0.06) * 0.35
    return (body * 0.7 + drop * 0.5 + noise)


def write(name, sig):
    peak = np.max(np.abs(sig)) or 1.0
    sig = sig / peak * 0.72
    # Fade the last 15ms so the loop point and the file end never click.
    fade = int(RATE * 0.015)
    if fade < len(sig):
        sig[-fade:] *= np.linspace(1.0, 0.0, fade)
    pcm = (sig * 32767).astype('<i2')
    wav_path = os.path.join(OUT, name + '.wav')
    with wave.open(wav_path, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())

    ogg_path = os.path.join(OUT, name + '.ogg')
    subprocess.run(
        [FFMPEG, '-nostdin', '-y', '-loglevel', 'error', '-i', wav_path,
         '-c:a', 'libvorbis', '-qscale:a', '5', ogg_path],
        check=True,
        stdin=subprocess.DEVNULL,
    )
    os.remove(wav_path)
    print('%-22s %6d bytes' % (name + '.ogg', os.path.getsize(ogg_path)))


os.makedirs(OUT, exist_ok=True)
write('bossTelegraph', telegraph())
write('bossAttack', attack())
