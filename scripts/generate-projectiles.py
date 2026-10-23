# -*- coding: utf-8 -*-
"""
Draw the ten player projectiles.

The game has ten weapons with genuinely different behaviour - a beam, a spread,
a homing missile, a piercing spike - and every one of them fired the same grey
box. The enemy set got real art; this is the player half that was never made.

Each sprite is drawn to be readable at 18px on screen: one dominant colour, one
clear silhouette, a bright core so it reads against a dark backdrop. Shape
carries the identity more than colour does, because a player watching a fight
perceives the outline first.
"""
import math
import os
import sys
import io

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SIZE = 64
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/game/requirements/assets/projectiles'


def blank():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))


def glow(img, radius=6, strength=1.6):
    """Adds an outer glow from the sprite's own colour."""
    halo = img.filter(ImageFilter.GaussianBlur(radius))
    a = halo.getchannel('A').point(lambda v: min(255, int(v * strength)))
    halo.putalpha(a)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.alpha_composite(halo)
    out.alpha_composite(img)
    return out


def orb(colour, core, r=13):
    img = blank()
    d = ImageDraw.Draw(img)
    cx = cy = SIZE // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)
    d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=core)
    return glow(img, 5, 1.5)


def dart(colour, core, length=26, thickness=7):
    """Elongated energy dart, pointing right."""
    img = blank()
    d = ImageDraw.Draw(img)
    cy = SIZE // 2
    x0 = SIZE // 2 - length // 2
    x1 = SIZE // 2 + length // 2
    d.polygon([(x1, cy), (x0, cy - thickness), (x0 + 5, cy), (x0, cy + thickness)], fill=colour)
    d.polygon([(x1 - 4, cy), (x0 + 8, cy - thickness // 2), (x0 + 8, cy + thickness // 2)], fill=core)
    return glow(img, 4, 1.4)


def spike(colour, core):
    """Armour-piercing spike: sharp, narrow, no rounded edges."""
    img = blank()
    d = ImageDraw.Draw(img)
    cy = SIZE // 2
    d.polygon([(SIZE - 12, cy), (14, cy - 9), (22, cy), (14, cy + 9)], fill=colour)
    d.polygon([(SIZE - 16, cy), (22, cy - 4), (26, cy), (22, cy + 4)], fill=core)
    return glow(img, 3, 1.3)


def pellet(colour, core, n=3):
    """A small cluster of pellets, for scatter weapons."""
    img = blank()
    d = ImageDraw.Draw(img)
    cx = cy = SIZE // 2
    for i, (dx, dy) in enumerate([(-2, 0), (8, -9), (8, 9)][:n]):
        r = 7 if i == 0 else 5
        x, y = cx + dx, cy + dy
        d.ellipse([x - r, y - r, x + r, y + r], fill=colour)
        d.ellipse([x - r // 2, y - r // 2, x + r // 2, y + r // 2], fill=core)
    return glow(img, 4, 1.35)


def beam(colour, core):
    """A continuous beam segment: flat, long, no taper."""
    img = blank()
    d = ImageDraw.Draw(img)
    cy = SIZE // 2
    d.rectangle([6, cy - 5, SIZE - 6, cy + 5], fill=colour)
    d.rectangle([6, cy - 2, SIZE - 6, cy + 2], fill=core)
    return glow(img, 5, 1.5)


def shell(colour, core):
    """A fat shell with a segmented body, for grenades and cluster bombs."""
    img = blank()
    d = ImageDraw.Draw(img)
    cy = SIZE // 2
    d.rounded_rectangle([16, cy - 11, SIZE - 16, cy + 11], radius=9, fill=colour)
    for x in (26, 34, 42):
        d.line([(x, cy - 10), (x, cy + 10)], fill=core, width=2)
    d.ellipse([SIZE - 24, cy - 5, SIZE - 14, cy + 5], fill=core)
    return glow(img, 4, 1.3)


def clock(colour, core):
    """Clockwork bullet: a ring with an inner pointer, for the replay weapon."""
    img = blank()
    d = ImageDraw.Draw(img)
    cx = cy = SIZE // 2
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=colour, width=5)
    d.line([(cx, cy), (cx + 9, cy - 7)], fill=core, width=3)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=core)
    return glow(img, 4, 1.4)


def prism():
    """Refracting crystal: a triangle with rainbow split along one edge."""
    img = blank()
    d = ImageDraw.Draw(img)
    cx = cy = SIZE // 2
    d.polygon([(cx + 16, cy), (cx - 12, cy - 13), (cx - 12, cy + 13)], fill=(240, 244, 255, 255))
    d.polygon([(cx + 8, cy), (cx - 6, cy - 7), (cx - 6, cy + 7)], fill=(255, 255, 255, 255))
    for i, col in enumerate([(255, 107, 157, 190), (255, 210, 120, 190), (120, 220, 255, 190)]):
        d.line([(cx, cy), (SIZE - 6, cy - 10 + i * 10)], fill=col, width=2)
    return glow(img, 4, 1.3)


SPRITES = {
    'pulse':   lambda: orb((74, 158, 255, 255), (220, 240, 255, 255)),
    'scatter': lambda: pellet((255, 159, 28, 255), (255, 240, 200, 255)),
    'rifle':   lambda: dart((127, 214, 255, 255), (240, 252, 255, 255)),
    'homing':  lambda: dart((167, 139, 250, 255), (240, 235, 255, 255), 24, 8),
    'pierce':  lambda: spike((232, 228, 220, 255), (255, 255, 255, 255)),
    'cluster': lambda: shell((214, 69, 44, 255), (255, 200, 150, 255)),
    'laser':   lambda: beam((255, 45, 85, 255), (255, 230, 240, 255)),
    'grenade': lambda: shell((139, 111, 71, 255), (240, 220, 170, 255)),
    'replay':  lambda: clock((200, 144, 31, 255), (255, 245, 210, 255)),
    'prism':   prism,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, draw in SPRITES.items():
        img = draw()
        path = os.path.join(OUT, 'player-' + name + '.webp')
        img.save(path, 'WEBP', lossless=True, quality=100)
        png = os.path.join(OUT, 'player-' + name + '.png')
        img.save(png)
        print('%-22s %d bytes' % ('player-' + name + '.webp', os.path.getsize(path)))


main()
