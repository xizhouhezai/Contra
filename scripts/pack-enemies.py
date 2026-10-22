#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Turn the raw enemy sheets into game sprites.

Each raw file is a 2x2 grid: top row idle, bottom row hit. Two panels are kept
(top-left idle, bottom-left hit), matted against white, normalised to a common
body height, and written twice:

  * 512x512 transparent PNGs under assets/enemies/<id>/ for future edits;
  * a 64x32 WebP sheet under assets/sprites/enemy-<id>.webp, which is what the
    game loads (two 32px frames, idle then hit).

The scale comes from the idle panel only, so the hit flash does not make the
body shrink.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'vibe_images/archive/enemies'
RAW_OUT = ROOT / 'docs/game/requirements/assets/enemies'
SHEET_OUT = ROOT / 'docs/game/requirements/assets/sprites'

IDS = [
    'patrol', 'turret', 'carrier', 'charger', 'flyer',
    'warden', 'armored', 'forge', 'mirror', 'elite-charger',
]
PANELS = {'idle-00': 0, 'hit-00': 2}
CELL = 1024 // 2
INSET = 4
BODY_HEIGHT = round(512 * 0.80)
GAME_FRAME = 32
GAME_BODY = round(GAME_FRAME * 0.90)


def cut_cell(sheet: Image.Image, index: int) -> Image.Image:
    x = (index % 2) * CELL
    y = (index // 2) * CELL
    cell = sheet.crop((x + INSET, y + INSET, x + CELL - INSET, y + CELL - INSET))
    return cell.resize((CELL, CELL), Image.LANCZOS)


def remove_background(cell: Image.Image) -> Image.Image:
    rgb = cell.convert('RGB')
    w, h = rgb.size
    r, g, b = rgb.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    mask = ImageChops.multiply(
        rgb.convert('L').point(lambda v: 255 if v >= 229 else 0),
        ImageChops.subtract(mx, mn).point(lambda v: 255 if v <= 20 else 0),
    )
    mp = mask.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if mp[x, y] and not seen[i]:
                seen[i] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if mp[x, y] and not seen[i]:
                seen[i] = 1
                q.append((x, y))
    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if mp[nx, ny] and not seen[j]:
                    seen[j] = 1
                    q.append((nx, ny))
    bg = Image.new('L', (w, h), 0)
    bp = bg.load()
    for y in range(h):
        base = y * w
        for x in range(w):
            if seen[base + x]:
                bp[x, y] = 255
    alpha = ImageChops.invert(bg).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    rgba = rgb.convert('RGBA')
    rgba.putalpha(alpha)
    return rgba


def drop_small_components(im: Image.Image) -> Image.Image:
    alpha = im.getchannel('A')
    w, h = im.size
    mask = alpha.point(lambda v: 255 if v > 16 else 0)
    px = mask.load()
    seen = bytearray(w * h)
    components = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y] == 0:
                continue
            q = deque([(x, y)])
            seen[i] = 1
            comp = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny] > 0:
                            seen[j] = 1
                            q.append((nx, ny))
            components.append(comp)
    if not components:
        return im
    largest = max(len(c) for c in components)
    keep = set()
    for comp in components:
        if len(comp) >= largest * 0.003:
            keep.update(comp)
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for x, y in keep:
        op[x, y] = 255
    im.putalpha(ImageChops.multiply(alpha, out))
    return im


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getchannel('A').getbbox()
    return im.crop(bbox) if bbox else im


def panel(sheet: Image.Image, index: int) -> Image.Image:
    cell = remove_background(cut_cell(sheet, index))
    return trim(drop_small_components(cell))


def main() -> None:
    RAW_OUT.mkdir(parents=True, exist_ok=True)
    for enemy_id in IDS:
        matches = sorted(ARCHIVE.glob(f'enemy-{enemy_id}-sheet_*.png'))
        if not matches:
            print(f'{enemy_id}: source sheet missing')
            continue
        sheet = Image.open(matches[0])
        idle = panel(sheet, PANELS['idle-00'])
        hit = panel(sheet, PANELS['hit-00'])
        scale = BODY_HEIGHT / idle.height

        folder = RAW_OUT / enemy_id
        folder.mkdir(parents=True, exist_ok=True)
        raw = {}
        for name, sprite in (('idle-00', idle), ('hit-00', hit)):
            width = max(1, round(sprite.width * scale))
            height = max(1, round(sprite.height * scale))
            resized = sprite.resize((width, height), Image.LANCZOS)
            canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((512 - width) // 2, 512 - 8 - height))
            canvas.save(folder / f'{name}.png')
            raw[name] = resized

        game_scale = GAME_BODY / raw['idle-00'].height
        cells = []
        for name in ('idle-00', 'hit-00'):
            sprite = raw[name]
            width = max(1, round(sprite.width * game_scale))
            height = max(1, round(sprite.height * game_scale))
            resized = sprite.resize((width, height), Image.LANCZOS)
            cell = Image.new('RGBA', (GAME_FRAME, GAME_FRAME), (0, 0, 0, 0))
            cell.paste(resized, ((GAME_FRAME - width) // 2, GAME_FRAME - height), resized)
            cells.append(cell)
        sheet_out = Image.new('RGBA', (GAME_FRAME * 2, GAME_FRAME), (0, 0, 0, 0))
        for i, cell in enumerate(cells):
            sheet_out.alpha_composite(cell, (i * GAME_FRAME, 0))
        sheet_out.save(SHEET_OUT / f'enemy-{enemy_id}.webp', 'WEBP', quality=95, method=6)
        print(f'{enemy_id}: idle {idle.size} hit {hit.size} -> 2x{GAME_FRAME}px sheet')


if __name__ == '__main__':
    main()
