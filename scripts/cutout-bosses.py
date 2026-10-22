# -*- coding: utf-8 -*-
"""
Cut the white background out of the boss illustrations.

These were generated as RGB with the character on flat white. A plain threshold
would eat the character too - Claude's outfit is white, and so is the maid apron
- so the removal is a flood fill from the border instead: only white that is
connected to the edge of the canvas is background. White enclosed by the
character stays.

The alpha edge is feathered over a short ramp rather than hard-clipped, because
a 1-bit edge on a 768x1024 illustration shows as stair-stepping at game size.
"""
import os
import sys
import io
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = 'docs/game/requirements/assets/bosses/generated'
OUT = 'docs/game/requirements/assets/bosses/cutout'

# A pixel counts as background when it is bright and near-neutral. The tolerance
# is loose enough to catch the soft shadow under the character, tight enough not
# to swallow the pale lilac in Claude's hair.
THRESHOLD = 238
NEUTRAL_SPREAD = 12

os.makedirs(OUT, exist_ok=True)


def background_mask(rgb):
    """Flood fill from every border pixel; returns a boolean background mask."""
    h, w, _ = rgb.shape
    bright = rgb.min(axis=2) >= THRESHOLD
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) <= NEUTRAL_SPREAD
    candidate = bright & neutral

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def main():
    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.png'):
            continue
        path = os.path.join(SRC, name)
        rgb = np.asarray(Image.open(path).convert('RGB'))

        bg = background_mask(rgb)
        alpha = np.where(bg, 0, 255).astype(np.uint8)

        alpha_img = Image.fromarray(alpha, mode='L')
        # Feather the cut: a 2px blur softens the stair-step without eating into
        # the character, which the flood fill already excluded.
        alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(2))

        out = Image.merge('RGBA', (*Image.fromarray(rgb).split(), alpha_img))

        box = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            out = out.crop(box)

        stem = name.rsplit('.', 1)[0]
        target = os.path.join(OUT, stem + '.webp')
        out.save(target, 'WEBP', quality=92, method=6)
        pct = 100.0 * bg.sum() / bg.size
        print(f'{stem:20s} 背景 {pct:5.1f}%  输出 {out.width}x{out.height}')


main()
