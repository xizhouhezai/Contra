# -*- coding: utf-8 -*-
"""
Pack generated enemy art into game-ready sprites.

The raw images are 512x512 with the creature floating inside a lot of
transparent margin. Scaling the canvas to a 36px collision box made the enemy
a few pixels across, because most of that 512 was empty.

These are cropped to their content, then padded into a square frame the game
can scale to the collision box directly.
"""
import os, sys, io, json
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = 'docs/game/requirements/assets/enemies'
OUT = 'docs/game/requirements/assets/enemies-packed'
FRAME = 128

os.makedirs(OUT, exist_ok=True)
manifest = {}

for enemy in sorted(os.listdir(SRC)):
    d = os.path.join(SRC, enemy)
    if not os.path.isdir(d):
        continue
    frames = {}
    for f in sorted(os.listdir(d)):
        if not f.lower().endswith(('.webp', '.png')):
            continue
        slot = f.rsplit('.', 1)[0]
        im = Image.open(os.path.join(d, f)).convert('RGBA')
        a = np.asarray(im.getchannel('A'))
        ys, xs = np.where(a > 10)
        if len(ys) == 0:
            continue
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        cropped = im.crop(box)
        scale = min(FRAME / cropped.width, FRAME / cropped.height)
        w = max(1, int(round(cropped.width * scale)))
        h = max(1, int(round(cropped.height * scale)))
        resized = cropped.resize((w, h), Image.LANCZOS)
        cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        cell.alpha_composite(resized, ((FRAME - w) // 2, FRAME - h))
        out = os.path.join(OUT, enemy + '-' + slot + '.webp')
        cell.save(out, 'WEBP', quality=92, method=6)
        frames[slot] = enemy + '-' + slot + '.webp'
    if frames:
        manifest[enemy] = frames
        print('%-15s %d frames' % (enemy, len(frames)))

with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as fp:
    json.dump(manifest, fp, ensure_ascii=False, indent=2)

total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.webp'))
print()
print('%d enemies, %d KB' % (len(manifest), round(total / 1024)))
