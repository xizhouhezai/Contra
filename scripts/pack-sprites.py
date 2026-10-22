# -*- coding: utf-8 -*-
"""
Pack per-character PNG frames into sprite sheets the game can play.

Two problems the raw frames have, both fixed here:

  * the character sits at 76% of the frame instead of the 90% the art was
    specified at, so the game draws it small;
  * the height wanders between frames by up to 16%, which reads as the
    character bobbing up and down when the animation plays.

Normalising against a common scale rather than per-frame keeps the relative
motion: a jump frame is meant to be higher than an idle frame, and only the
shared drift is removed.
"""
import os, sys, io, json
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = 'docs/game/requirements/assets/animated'
OUT = 'docs/game/requirements/assets/animated-sheets'
TARGET_HEIGHT = 0.90   # the character should fill this much of the frame
FRAME = 256            # output frame size, down from 512

CLIPS = ['idle', 'walk', 'attack', 'jump', 'hurt']


def load_frames(folder, clip):
    names = sorted(f for f in os.listdir(folder) if f.startswith(clip + '-') and f.endswith('.png'))
    return [Image.open(os.path.join(folder, n)).convert('RGBA') for n in names], names


def bbox_of(im):
    a = np.asarray(im.getchannel('A'))
    ys, xs = np.where(a > 10)
    if len(ys) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    os.makedirs(OUT, exist_ok=True)
    summary = {}

    for ch in sorted(os.listdir(SRC)):
        folder = os.path.join(SRC, ch)
        if not os.path.isdir(folder):
            continue

        # Pass 1: measure every frame so one scale can serve the whole character.
        measured = {}
        tallest = 0
        for clip in CLIPS:
            frames, names = load_frames(folder, clip)
            if not frames:
                continue
            boxes = [bbox_of(f) for f in frames]
            measured[clip] = list(zip(frames, boxes))
            for b in boxes:
                if b:
                    tallest = max(tallest, b[3] - b[1])

        if tallest == 0:
            print(f'{ch}: no frames with content, skipped')
            continue

        # One scale for the whole character: this is what holds the frames
        # together. Per-frame scaling would flatten the jump arc.
        scale = (FRAME * TARGET_HEIGHT) / tallest

        entry = {'frame': FRAME, 'clips': {}}
        for clip, items in measured.items():
            cells = []
            for im, box in items:
                if box is None:
                    cells.append(Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0)))
                    continue

                cropped = im.crop(box)
                w = max(1, int(round(cropped.width * scale)))
                h = max(1, int(round(cropped.height * scale)))
                resized = cropped.resize((w, h), Image.LANCZOS)

                # Anchored at the bottom, centred horizontally: a standing
                # character's feet stay on the same line across frames.
                cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
                x = (FRAME - w) // 2
                y = FRAME - h
                cell.alpha_composite(resized, (x, y))
                cells.append(cell)

            sheet = Image.new('RGBA', (FRAME * len(cells), FRAME), (0, 0, 0, 0))
            for i, c in enumerate(cells):
                sheet.alpha_composite(c, (i * FRAME, 0))

            out = os.path.join(OUT, f'{ch}-{clip}.webp')
            sheet.save(out, 'WEBP', quality=92, method=6)
            entry['clips'][clip] = {'frames': len(cells), 'file': f'{ch}-{clip}.webp'}

        summary[ch] = entry
        print(f"{ch}: {len(entry['clips'])} clips, scale {scale:.3f}")

    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.webp'))
    print()
    print(f'sheets {len(os.listdir(OUT)) - 1}, {round(total/1024/1024, 2)} MB')


main()
