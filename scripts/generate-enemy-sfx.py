# -*- coding: utf-8 -*-
"""
Two enemy combat sounds.

An enemy attack is now readable in the rule layer - a wind-up, then a shot - but
a player looking at their own character will not see a small drone on the far
side of the screen charge up. The wind-up has to be audible, and the shot needs a
different colour from the player's own gun so the two are never confused.

enemyTelegraph is a short descending blip, deliberately the opposite shape of the
boss wind-up: the boss rises, an ordinary enemy falls.
enemyShot is a dry mechanical snap rather than a musical note, so it reads as
"something was fired at me".
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


def env(n, attack=0.004, decay=0.3):
    a = int(RATE * attack)
    d = int(RATE * decay)
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0.0, 1.0, a)
    if a + d <= n:
        e[a:a + d] = e[a:a + d] * np.linspace(1.0, 0.0, d)
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
    """Descending double blip: shorter and lower than the boss warning."""
    parts = []
    for freq, dur in ((660.0, 0.07), (440.0, 0.09)):
        sig = tone(freq, dur, (1.0, 0.3)) * env(int(RATE * dur), 0.003, dur * 0.9)
        parts.append(sig)
        parts.append(np.zeros(int(RATE * 0.025)))
    return np.concatenate(parts)


def shot():
    """Dry mechanical snap: a filtered noise burst with a short body."""
    dur = 0.16
    n = int(RATE * dur)
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n)
    # A one-pole low-pass takes the hiss off and leaves a thud.
    out = np.zeros(n)
    prev = 0.0
    alpha = 0.35
    for i in range(n):
        prev = prev + alpha * (noise[i] - prev)
        out[i] = prev
    body = tone(180.0, dur, (1.0, 0.4)) * 0.5
    return (out * 0.8 + body) * env(n, 0.001, 0.12)


def write(name, sig):
    peak = np.max(np.abs(sig)) or 1.0
    sig = sig / peak * 0.7
    fade = int(RATE * 0.012)
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
        check=True, stdin=subprocess.DEVNULL,
    )
    os.remove(wav_path)
    print('%-22s %6d bytes' % (name + '.ogg', os.path.getsize(ogg_path)))


os.makedirs(OUT, exist_ok=True)
write('enemyTelegraph', telegraph())
write('enemyShot', shot())
