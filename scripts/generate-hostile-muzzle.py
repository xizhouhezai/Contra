#!/usr/bin/env python
"""Generate muzzle-hostile.png: the enemy's own muzzle flash.

REQ-ART-004 wants every attack to be visible, and REQ-CMB-002 wants the warning to
be readable. The enemy flash used to be muzzle-orange, the same colour three player
weapons use, so the one thing it had to communicate - "this is not yours" - it
could not.

Red with a hot core, drawn the same way as the other muzzle flashes so it sits in
the same visual family without sharing a colour.
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

SIZE = 32
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
cx = cy = SIZE / 2

# A four-point star: the shape the other flashes use, so the family reads as one.
for i in range(4):
    angle = math.radians(i * 90)
    length = 15 if i % 2 == 0 else 10
    x = cx + math.cos(angle) * length
    y = cy + math.sin(angle) * length
    d.line([(cx - (x - cx) * 0.35, cy - (y - cy) * 0.35), (x, y)], fill=(220, 38, 38, 230), width=5)

# Hot core, tighter and brighter than the arms.
d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(255, 170, 120, 255))
d.ellipse([cx - 2.5, cy - 2.5, cx + 2.5, cy + 2.5], fill=(255, 240, 220, 255))

img = img.filter(ImageFilter.GaussianBlur(0.6))

out = 'docs/game/requirements/assets/effects'
os.makedirs(out, exist_ok=True)
img.save(os.path.join(out, 'muzzle-hostile.png'))
img.save(os.path.join(out, 'muzzle-hostile.webp'), lossless=True)
print('muzzle-hostile', img.size)
