#!/usr/bin/env python
"""Generate act-I placeholder art for the stage expansion.

There is no image-generation API in this environment, so these are drawn rather
than prompted. They are not meant to be the final art: they are the right size,
the right frame count and the right palette, so the game can load them and the
level work can proceed while the real art is produced from the prompts in
stage-art-prompts-batch1.md.

Each piece follows the Riso rules the real art has to follow - flat limited
palette, hard edges, no rounded corners - so replacing one later is a texture swap
rather than a redesign.
"""
from PIL import Image, ImageDraw
import os

INK = (26, 26, 26, 255)
PAPER = (244, 241, 234, 255)
VERM = (214, 69, 44, 255)
TEAL = (31, 111, 107, 255)
OCHRE = (200, 144, 31, 255)

ROOT = 'docs/game/requirements/assets'
ENEMIES = os.path.join(ROOT, 'enemies-packed')
BOSSES = os.path.join(ROOT, 'bosses')
TERRAIN = os.path.join(ROOT, 'terrain')
BACKGROUNDS = os.path.join(ROOT, 'backgrounds')
EFFECTS = os.path.join(ROOT, 'effects')

for d in (ENEMIES, BOSSES, TERRAIN, BACKGROUNDS, EFFECTS):
    os.makedirs(d, exist_ok=True)


def save(img, directory, name):
    path = os.path.join(directory, name)
    img.save(path)
    img.save(path.replace('.webp', '.png'))
    print(' wrote', name, img.size)


def box(d, x0, y0, x1, y1, fill, outline=INK, w=3):
    d.rectangle([x0, y0, x1, y1], fill=fill, outline=outline, width=w)


# ── enemies: 128x128, idle and hit ────────────────────────────────
def scrapper(hit):
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    dy = 6 if hit else 0
    box(d, 30, 52 + dy, 96, 96 + dy, body)
    box(d, 44, 34 + dy, 82, 56 + dy, body)
    # legs
    for lx in (38, 62, 86):
        d.rectangle([lx, 96 + dy, lx + 8, 118], fill=body, outline=INK, width=2)
    # the broken red lamp and the working teal one
    d.ellipse([50, 40 + dy, 60, 50 + dy], fill=VERM if not hit else PAPER)
    d.ellipse([66, 40 + dy, 74, 48 + dy], fill=TEAL)
    # backpack full of scrap
    box(d, 88, 60 + dy, 112, 92 + dy, OCHRE)
    return im


def crane_hook(hit):
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    off = 8 if hit else 0
    d.rectangle([58 + off, 0, 70 + off, 56], fill=body, outline=INK, width=3)
    box(d, 40 + off, 56, 92 + off, 74, body)
    d.line([50 + off, 74, 44 + off, 104], fill=body, width=12)
    d.line([44 + off, 104, 62 + off, 118], fill=VERM, width=12)
    return im


def steam_vent(hit):
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 34, 92, 94, 118, (34, 34, 34, 255))
    for i in range(12):
        d.ellipse([40, 96, 88, 110], outline=PAPER, width=2)
    puffs = 5 if hit else 2
    for i in range(puffs):
        y = 82 - i * 14
        r = 10 + i * 4
        d.ellipse([64 - r, y - r, 64 + r, y + r], fill=(255, 255, 255, 190))
    return im


def audit_drone(hit):
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    sk = 10 if hit else 0
    box(d, 34, 40 + sk, 94, 84 + sk, body)
    d.ellipse([54, 84 + sk, 74, 104 + sk], fill=TEAL if not hit else VERM)
    box(d, 40, 28 + sk, 56, 42 + sk, body)
    box(d, 72, 28 + sk, 88, 42 + sk, body)
    return im


for name, fn in (('scrapper', scrapper), ('crane-hook', crane_hook),
                 ('steam-vent', steam_vent), ('audit-drone', audit_drone)):
    save(fn(False), ENEMIES, name + '-idle-00.webp')
    save(fn(True), ENEMIES, name + '-hit-00.webp')


# ── mini bosses: 360x360, q-01..q-04 ─────────────────────────────
def foreman(phase):
    im = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    lean = phase * 4
    box(d, 110, 120 + lean, 250, 300, body)
    box(d, 140, 70 + lean, 220, 124 + lean, body)
    box(d, 250, 150 + lean, 320, 180 + lean, VERM if phase >= 2 else body)
    box(d, 40, 150 + lean, 110, 250 + lean, OCHRE)
    return im


def pipe_warden(phase):
    im = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    for i in range(3):
        a = i * 40 + phase * 10
        d.line([180, 240, 180 + a - 40, 240 - 90], fill=body, width=22)
    core = VERM if phase == 2 else body
    d.ellipse([140, 200, 220, 280], fill=core, outline=INK, width=4)
    return im


def scaffold_crane(phase):
    im = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    box(d, 60, 250, 300, 300, body)
    d.rectangle([170, 120, 200, 260], fill=body, outline=INK, width=4)
    arm = phase * 18
    d.line([185, 130, 185 + 130 - arm, 130], fill=OCHRE, width=16)
    d.line([185 - arm, 130, 185 + 130 - arm, 130 + phase * 40], fill=body, width=6)
    return im


def audit_clerk(phase):
    im = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (34, 34, 34, 255)
    box(d, 90, 110, 270, 290, body)
    open_w = phase * 26
    box(d, 110, 130, 250, 270, TEAL)
    if open_w > 0:
        box(d, 110 - open_w, 130, 110, 270, body)
        box(d, 250, 130, 250 + open_w, 270, body)
    for i in range(4):
        box(d, 130, 150 + i * 30, 230, 168 + i * 30, VERM if phase >= 2 else TEAL)
    return im


for name, fn in (('miniboss-dock-foreman', foreman), ('miniboss-pipe-warden', pipe_warden),
                 ('miniboss-scaffold-crane', scaffold_crane), ('miniboss-audit-clerk', audit_clerk)):
    for q in range(1, 5):
        save(fn(q - 1), BOSSES, name + '-q-0%d.webp' % q)


# ── terrain kits ─────────────────────────────────────────────────
def ground_tile():
    im = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 0, 0, 256, 64, (44, 44, 44, 255))
    for x in range(0, 256, 32):
        d.line([x, 0, x, 64], fill=INK, width=2)
    for x in range(8, 256, 40):
        d.ellipse([x, 8, x + 6, 14], fill=VERM)
    d.line([0, 0, 256, 0], fill=PAPER, width=3)
    return im


def wall_tile():
    im = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 0, 0, 256, 64, (38, 38, 38, 255))
    for y in range(0, 64, 16):
        d.line([0, y, 256, y], fill=INK, width=2)
    box(d, 96, 16, 160, 48, TEAL)
    return im


def platform_tile():
    im = Image.new('RGBA', (384, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 0, 0, 384, 24, (44, 44, 44, 255))
    for x in range(0, 384, 24):
        d.line([x, 24, x, 34], fill=INK, width=2)
    d.line([0, 24, 384, 24], fill=PAPER, width=2)
    return im


def door_frames():
    im = Image.new('RGBA', (288, 160), (0, 0, 0, 0))
    states = [VERM, OCHRE, TEAL]
    for i in range(3):
        d = ImageDraw.Draw(im)
        x = i * 96
        box(d, x + 6, 0, x + 90, 160, (44, 44, 44, 255))
        box(d, x + 16, 20, x + 80, 140, states[i])
        d.rectangle([x + 40, 74, x + 56, 90], fill=PAPER)
    return im


def hazard_tiles():
    im = Image.new('RGBA', (384, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(3):
        x = i * 128
        box(d, x, 24, x + 128, 104, (44, 44, 44, 255))
        for k in range(6):
            d.line([x + k * 22, 24, x + k * 22 + 12, 104], fill=VERM, width=4)
    return im


def props_sheet():
    im = Image.new('RGBA', (256, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fills = [(44, 44, 44, 255), OCHRE, VERM, TEAL]
    for r in range(3):
        for c in range(4):
            x, y = c * 64 + 8, r * 64 + 8
            box(d, x, y, x + 48, y + 48, fills[(r + c) % 4])
    return im


save(ground_tile(), TERRAIN, 'tiles-act1-floor.webp')
save(wall_tile(), TERRAIN, 'tiles-act1-wall.webp')
save(platform_tile(), TERRAIN, 'tiles-act1-platform.webp')
save(door_frames(), TERRAIN, 'tiles-act1-door.webp')
save(hazard_tiles(), TERRAIN, 'tiles-act1-hazard.webp')
save(props_sheet(), TERRAIN, 'tiles-act1-props.webp')


# ── backgrounds: 1920x540 ────────────────────────────────────────
def banded(base, far, mid, near):
    im = Image.new('RGBA', (1920, 540), base)
    d = ImageDraw.Draw(im)
    for colour, top, step in ((far, 300, 60), (mid, 360, 44), (near, 420, 30)):
        x = 40
        i = 0
        while x < 1920:
            h = step + (i % 3) * 26
            d.rectangle([x, top - h, x + 90 + (i % 4) * 30, top], fill=colour)
            x += 120 + (i % 3) * 40
            i += 1
    return im


save(banded(PAPER, (198, 198, 194, 255), (150, 150, 146, 255), (96, 96, 92, 255)),
     BACKGROUNDS, 'bg-act1-warehouse-far.webp')
save(banded(PAPER, (176, 150, 140, 255), (128, 104, 96, 255), (72, 58, 54, 255)),
     BACKGROUNDS, 'bg-act1-corridor-mid.webp')
save(banded((226, 232, 230, 255), (150, 190, 188, 255), (104, 150, 148, 255), (70, 104, 102, 255)),
     BACKGROUNDS, 'bg-act1-scaffold-sky.webp')


# ── ui ───────────────────────────────────────────────────────────
def wave_warning():
    im = Image.new('RGBA', (384, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(3):
        x = i * 128
        box(d, x + 8, 4, x + 120, 60, VERM)
        tri = [(x + 20, 32), (x + 44, 14), (x + 44, 50)] if i == 0 else \
              [(x + 108, 32), (x + 84, 14), (x + 84, 50)] if i == 1 else \
              [(x + 64, 10), (x + 44, 34), (x + 84, 34)]
        d.polygon(tri, fill=PAPER, outline=INK)
    return im


def route_map():
    im = Image.new('RGBA', (256, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(30, 100), (80, 100), (80, 50), (140, 50), (140, 90), (210, 90)]
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=INK, width=3)
    for i, p in enumerate(pts):
        colour = VERM if i == len(pts) - 1 else INK
        box(d, p[0] - 14, p[1] - 14, p[0] + 14, p[1] + 14, colour)
    return im


def room_icons():
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box(d, 8, 8, 56, 56, PAPER)
    d.line([16, 16, 48, 48], fill=INK, width=4)
    d.line([48, 16, 16, 48], fill=INK, width=4)
    box(d, 72, 8, 120, 56, PAPER)
    box(d, 84, 20, 108, 44, OCHRE)
    box(d, 8, 72, 56, 120, PAPER)
    for k in range(3):
        d.rectangle([14 + k * 8, 104 - k * 10, 50 - k * 8, 110 - k * 10], fill=INK)
    box(d, 72, 72, 120, 120, PAPER)
    d.ellipse([84, 80, 108, 104], fill=INK)
    return im


save(wave_warning(), EFFECTS, 'ui-wave-warning.webp')
save(route_map(), EFFECTS, 'ui-route-map.webp')
save(room_icons(), EFFECTS, 'ui-room-type-icons.webp')

print('\n合计完成')
