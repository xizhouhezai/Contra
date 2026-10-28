#!/usr/bin/env python
"""Generate acts II / III mid-boss placeholder art (8 units x 4 frames, 360x360).

There is no image-generation API in this environment, so these are drawn rather
than prompted - the same call scripts/generate-act1-art.py made for the act-I
slots.  This batch fills the eight acts-II/III mid-boss slots so the wave and
mini-boss work can be wired up and played now.

These are placeholders, not final art.  They carry the parts the game actually
depends on - 360x360 canvas, four frames q-01..q-04, transparent RGBA, ids that
match the filenames the code loads, the five-colour Riso palette - and they carry
the four pose beats the design asks for (idle / wind-up / hit / dying).  What
they do not carry is detail: no anti-aliasing, no texture beyond halftone dots,
no volume.  Replacing one later is dropping a new 360x360 webp under the same
filename, not redesigning the unit.

Spec source: docs/game/design/stage-art-prompts-batch1.md §1.3 (360x360, four
frames, webp + png, transparent, `{id}-q-{01..04}`) and §6 (mid-boss shape
language).  Palette: docs/game/design/art-style.md §1.

Rules the frames follow, and why:

* **One rig, one anchor.**  Every frame is drawn from the same constants: the
  legs/baseline are laid out from GROUND and never move, only the upper assembly
  takes the frame's LEAN/DROP.  So the feet stay on the same row in all four
  frames and the silhouette keeps its envelope.  batch1 §7 records the failure
  this avoids: the act-I hook/crane grew in one frame and the body read as
  shrunken beside it.
* **Ink lands the mass.**  Bodies are flat INK; paper is a 2-3px rim or a small
  inset panel; vermilion/teal/ochre are small tells (lamp, gauge, crack, heat).
  batch1 §7 also records the opposite failure: "主体墨黑" written without a
  percentage came back paper-white, so `validate()` asserts a per-frame ink floor
  instead of trusting the drawing code.
* **No rounded corners.**  Rectangles and sharp polygons only; the handful of
  ellipses are gauges, lamps and halftone dots, never a body corner.
* **Real halftone, not a gradient.**  `halftone()` stamps solid ink dots on a
  rotated grid with a ramped radius.  Five inks, one dot colour.

Reuse note: scripts/spritekit.py exists to cut alpha out of AI sheets that came
back on a white backdrop (`remove_white` / `prep` / `erase_watermark` /
`key_backdrop`).  Nothing here starts opaque, so that whole path is dead weight.
Its `contact()` globs every *.webp in a folder at a fixed zoom, which would drag
the act-I art into this QA sheet at the wrong scale, so the sheet is composed
locally; the conventions kept from it are the dark QA backdrop and the filename
label under each cell.
"""

import math
import os

from PIL import Image, ImageChops, ImageDraw

# ── palette (art-style.md §1, five inks only) ────────────────────
INK = (26, 26, 26, 255)
PAPER = (244, 241, 234, 255)
VERM = (214, 69, 44, 255)
TEAL = (31, 111, 107, 255)
OCHRE = (200, 144, 31, 255)

SIZE = 360
GROUND = 312                       # every unit's feet land on this row, always
OUT = os.path.join('docs', 'game', 'requirements', 'assets', 'minibosses')
QA_DIR = os.path.join('vibe_images', 'archive', '_qa')
QA_SHEET = os.path.join(QA_DIR, 'acts23-qa-minibosses.png')

# Per-frame rig.  LEAN shifts the upper assembly sideways, DROP shifts it down
# (wind-up rises a hair, dying sinks).  Feet ignore both, so the anchor holds.
# The deltas are deliberately large: an early pass used +-10 and q-01/q-02 came
# out nearly identical, which fails the "four frames must be distinguishable"
# bar even though the anchor test passed.
LEAN = (0, 18, -18, 8)
DROP = (0, -4, 5, 10)


# ── drawing helpers ──────────────────────────────────────────────
def canvas():
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def box(d, x0, y0, x1, y1, fill=INK, outline=None, w=2):
    d.rectangle([int(x0), int(y0), int(x1), int(y1)], fill=fill, outline=outline,
                width=w if outline else 0)


def poly(d, pts, fill=INK, outline=None, w=2):
    d.polygon([(int(x), int(y)) for x, y in pts], fill=fill,
              outline=outline, width=w if outline else 0)


def seg(d, p0, p1, width, fill=INK):
    """Thick limb with squared ends - no rounded caps."""
    d.line([tuple(map(int, p0)), tuple(map(int, p1))], fill=fill, width=width)
    r = width // 2
    for x, y in (p0, p1):
        box(d, x - r, y - r, x + r, y + r, fill)


def limb(d, pts, width, fill=INK):
    for i in range(len(pts) - 1):
        seg(d, pts[i], pts[i + 1], width, fill)


def rot(pts, cx, cy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * ca - (y - cy) * sa,
             cy + (x - cx) * sa + (y - cy) * ca) for x, y in pts]


def octagon(cx, cy, r):
    k = r * 0.55
    return [(cx - r, cy - k), (cx - k, cy - r), (cx + k, cy - r), (cx + r, cy - k),
            (cx + r, cy + k), (cx + k, cy + r), (cx - k, cy + r), (cx - r, cy + k)]


def zig(d, pts, width, color):
    d.line([(int(x), int(y)) for x, y in pts], fill=color, width=width,
           joint='curve')


def halftone(im, area, spacing=9.0, radius=3.0, color=INK, angle=24, fade=None):
    """Solid dots on a rotated grid, radius ramped over the area.

    Real halftone: dots stay one flat ink and only their size changes, so the
    result is still five-colour.  Painted only where the canvas is already
    opaque, so dots never leak outside the silhouette.
    """
    x0, y0, x1, y1 = area
    overlay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    w, h = float(max(1, x1 - x0)), float(max(1, y1 - y0))
    n = int(math.hypot(w, h) / spacing) + 2
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    for j in range(-n, n + 1):
        for i in range(-n, n + 1):
            px = cx + i * spacing * ca - j * spacing * sa
            py = cy + i * spacing * sa + j * spacing * ca
            if not (x0 <= px < x1 and y0 <= py < y1):
                continue
            f = 1.0
            if fade == 'up':
                f = (y1 - py) / h
            elif fade == 'down':
                f = (py - y0) / h
            elif fade == 'left':
                f = (x1 - px) / w
            elif fade == 'right':
                f = (px - x0) / w
            r = radius * max(0.0, f)
            if r < 0.8:
                continue
            od.ellipse([px - r, py - r, px + r, py + r], fill=color)
    overlay.putalpha(ImageChops.multiply(overlay.getchannel('A'),
                                        im.getchannel('A')))
    im.alpha_composite(overlay)


def page(d, x, y, w, h, tilt=0, color=PAPER):
    """A paper leaf - archive keeper's loose sheets, clerk's file."""
    base = [(x, y), (x + w, y - 3), (x + w + 2, y + h), (x - 3, y + h + 2)]
    poly(d, rot(base, x + w / 2.0, y + h / 2.0, tilt), fill=color, outline=INK, w=2)
    for k in range(1, 3):
        d.line([x + 4, y + h * k / 3.0, x + w - 3, y + h * k / 3.0 - 2],
               fill=INK, width=2)


def legs(d, xs, top=252, w=46, foot=12):
    """Two column legs with flat feet - identical in every frame."""
    for lx in xs:
        box(d, lx, top, lx + w, GROUND)
        box(d, lx - 8, GROUND - foot, lx + w + 8, GROUND)
    return GROUND


# ── act II · 硅基深处 ────────────────────────────────────────────
def coolant_overseer(p):
    """冷却监工: hose-wrapped mechanical torso, teal pressure gauge on the chest."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    legs(d, (124, 190))
    box(d, 112 + lx, 156 + dy, 248 + lx, 258 + dy)
    d.line([112 + lx, 158 + dy, 248 + lx, 158 + dy], fill=PAPER, width=3)
    box(d, 140 + lx, 96 + dy, 220 + lx, 154 + dy)
    box(d, 152 + lx, 112 + dy, 208 + lx, 124 + dy, VERM if p == 2 else TEAL)

    # coolant hoses coiled over the shoulders
    for pts in (((104 + lx, 250 + dy), (84 + lx, 180 + dy), (128 + lx, 158 + dy)),
                ((256 + lx, 250 + dy), (278 + lx, 182 + dy), (236 + lx, 160 + dy))):
        limb(d, pts, 15)
        limb(d, [(x + 5, y - 4) for x, y in pts], 3, PAPER)

    # chest gauge - the readable weak point
    cx, cy = 180 + lx, 206 + dy
    poly(d, octagon(cx, cy, 24), fill=INK, outline=VERM if p >= 2 else PAPER, w=4)
    seg(d, (cx, cy), (cx + 13, cy - 11), 4, VERM if p == 2 else TEAL)

    if p == 1:                                    # hoses pull taut, torso swells
        box(d, 100 + lx, 176 + dy, 112 + lx, 250 + dy)
        box(d, 248 + lx, 176 + dy, 260 + lx, 250 + dy)
    if p == 2:                                    # struck: red burst at the seam
        zig(d, [(118 + lx, 170 + dy), (146 + lx, 192 + dy),
                (124 + lx, 212 + dy), (156 + lx, 236 + dy)], 5, VERM)
    if p == 3:                                    # dying: hose snapped, coolant out
        zig(d, [(210 + lx, 168 + dy), (186 + lx, 196 + dy),
                (214 + lx, 216 + dy), (188 + lx, 244 + dy)], 5, TEAL)
        limb(d, [(248 + lx, 236 + dy), (300 + lx, 250 + dy), (316 + lx, 240 + dy)], 12)
    return im


def array_warden(p):
    """阵列巡守: server rack personified, blade-chassis shoulders, LED eyes."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    legs(d, (128, 198), top=264, w=44, foot=12)

    # rack body with a vent line per U
    box(d, 128 + lx, 150 + dy, 232 + lx, 268 + dy)
    for k in range(4):
        y = 166 + dy + k * 24
        d.line([140 + lx, y, 196 + lx, y], fill=PAPER, width=2)
        box(d, 204 + lx, y + 2, 216 + lx, y + 10, VERM if p == 2 else TEAL)

    # head + the row of teal indicator eyes
    box(d, 146 + lx, 94 + dy, 214 + lx, 152 + dy)
    d.line([146 + lx, 96 + dy, 214 + lx, 96 + dy], fill=PAPER, width=3)
    for k in range(5):
        box(d, 154 + lx + k * 12, 112 + dy, 160 + lx + k * 12, 126 + dy,
            VERM if p == 2 else TEAL)

    # shoulders: two tiers of blade chassis each side
    lift = 8 if p == 1 else 0
    for side in (-1, 1):
        cxs = 180 + lx + side * 98
        for t in range(2):
            y = 128 + dy - lift + t * 20
            box(d, cxs - 34, y, cxs + 34, y + 16)
            for k in range(3):
                d.line([cxs - 24 + k * 20, y + 3, cxs - 24 + k * 20, y + 13],
                       fill=PAPER, width=2)
        seg(d, (180 + lx + side * 46, 178 + dy), (cxs - side * 30, 146 + dy - lift), 14)

    if p == 1:                                    # vents thrown open
        for k in range(3):
            box(d, 176 + lx, 170 + dy + k * 22, 226 + lx, 182 + dy + k * 22, TEAL)
    if p == 2:                                    # one chassis knocked off
        poly(d, rot([(248, 132), (306, 120), (314, 146), (256, 158)], 278, 140, 16),
             fill=INK, outline=PAPER, w=3)
        zig(d, [(128 + lx, 200 + dy), (168 + lx, 218 + dy),
                (140 + lx, 234 + dy)], 5, VERM)
    if p == 3:                                    # dying: faceplate swinging open
        box(d, 132 + lx, 158 + dy, 228 + lx, 262 + dy)
        for k in range(4):
            box(d, 142 + lx, 168 + dy + k * 22, 218 + lx, 182 + dy + k * 22, TEAL)
        poly(d, [(228 + lx, 158 + dy), (250 + lx, 168 + dy),
                 (250 + lx, 258 + dy), (228 + lx, 262 + dy)],
             fill=INK, outline=PAPER, w=2)
    return im


def forge_master(p):
    """熔炉匠长: heavy smith, ochre casting tongs for a right arm, hot seams."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    legs(d, (116, 192), top=248, w=48, foot=14)

    box(d, 104 + lx, 140 + dy, 256 + lx, 258 + dy)
    d.line([104 + lx, 142 + dy, 256 + lx, 142 + dy], fill=PAPER, width=3)
    box(d, 138 + lx, 92 + dy, 222 + lx, 146 + dy)
    box(d, 152 + lx, 108 + dy, 208 + lx, 120 + dy, VERM if p >= 2 else OCHRE)

    # residual heat in the belly plate, as actual dots
    halftone(im, (118 + lx, 200 + dy, 244 + lx, 254 + dy),
             spacing=8, radius=3.2, color=VERM, fade='up')

    # left arm: a solid block, the anvil side
    seg(d, (114 + lx, 170 + dy), (90 + lx, 224 + dy), 22)
    box(d, 68 + lx, 218 + dy, 106 + lx, 254 + dy)

    # right arm into the casting tongs; the swing stays small so the bbox holds
    swing = (-8, -30, 12, 20)[p]
    seg(d, (238 + lx, 170 + dy), (284 + lx, 148 + dy), 24)
    hub = (294 + lx, 142 + dy)
    seg(d, (284 + lx, 148 + dy), hub, 18)
    for s in (-1, 1):
        claw = rot([(hub[0], hub[1]), (hub[0] + 20, hub[1] - 9 * s),
                    (hub[0] + 44, hub[1] + 3 * s), (hub[0] + 22, hub[1] + 6 * s)],
                   hub[0], hub[1], swing)
        poly(d, claw, fill=OCHRE, outline=INK, w=3)

    if p == 1:                                    # winding up, tongs cocked back
        box(d, 96 + lx, 190 + dy, 106 + lx, 250 + dy, INK, outline=PAPER)
    if p == 2:                                    # struck
        zig(d, [(128 + lx, 162 + dy), (158 + lx, 188 + dy),
                (132 + lx, 206 + dy), (162 + lx, 232 + dy)], 5, VERM)
    if p == 3:                                    # dying: tongs droop, seam splits
        zig(d, [(214 + lx, 158 + dy), (190 + lx, 188 + dy),
                (218 + lx, 208 + dy), (192 + lx, 238 + dy)], 5, OCHRE)
        box(d, 150 + lx, 220 + dy, 232 + lx, 228 + dy, OCHRE)
    return im


def redline_clerk(p):
    """红线书记: rewrites rooms, vermilion correction pen, paper file under arm."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    legs(d, (144, 186), top=254, w=28, foot=12)

    box(d, 134 + lx, 126 + dy, 226 + lx, 256 + dy)
    d.line([135 + lx, 128 + dy, 225 + lx, 128 + dy], fill=PAPER, width=3)
    box(d, 148 + lx, 74 + dy, 212 + lx, 128 + dy)
    box(d, 158 + lx, 88 + dy, 202 + lx, 98 + dy, PAPER)

    # the file clamped under the left arm
    page(d, 96 + lx, 186 + dy, 40, 52, -6)

    # the correction pen.  q-02 cocked up to redline, q-03 knocked flat, q-04
    # dropped; keeping it near horizontal in q-01/q-04 holds the frame bbox.
    pen = (0, -62, 24, 30)[p]
    seg(d, (228 + lx, 180 + dy), (252 + lx, 194 + dy), 20)
    pivot = (252 + lx, 190 + dy)
    shaft = [(248 + lx, 198 + dy), (260 + lx, 186 + dy),
             (316 + lx, 132 + dy), (304 + lx, 122 + dy)]
    poly(d, rot(shaft, pivot[0], pivot[1], pen), fill=VERM, outline=INK, w=3)
    nib = rot([(304 + lx, 122 + dy), (316 + lx, 132 + dy), (310 + lx, 108 + dy)],
              pivot[0], pivot[1], pen)
    poly(d, nib, fill=INK)

    if p == 1:                                    # bracing behind the raised pen
        box(d, 136 + lx, 152 + dy, 148 + lx, 246 + dy, PAPER, outline=INK, w=2)
    if p == 2:                                    # struck, ink knocked off the nib
        zig(d, [(152 + lx, 148 + dy), (180 + lx, 174 + dy),
                (156 + lx, 194 + dy), (184 + lx, 220 + dy)], 5, VERM)
    if p == 3:                                    # dying: the file drops, ink spills
        page(d, 118 + lx, 236 + dy, 38, 48, 18)
        zig(d, [(164 + lx, 140 + dy), (192 + lx, 172 + dy),
                (168 + lx, 192 + dy), (196 + lx, 224 + dy)], 5, VERM)
        box(d, 150 + lx, 232 + dy, 208 + lx, 240 + dy, VERM)
    return im


# ── act III · 推理之巅 ───────────────────────────────────────────
def archive_keeper(p):
    """档案看守: collapsed archive, hunched cabinet cracking open, pages loose."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    gap = (0, 5, 9, 20)[p]

    # squashed base the figure is folded onto
    box(d, 96, 218, 264, GROUND)
    for k in range(3):
        d.line([108, 242 + k * 22, 252, 242 + k * 22], fill=PAPER, width=2)

    # hunched upper cabinet, leaning forward, left edge lifted off the base
    body = [(140 + lx, 84 + dy), (232 + lx, 70 + dy),
            (262 + lx, 220), (112 + lx, 226)]
    poly(d, body, fill=INK)
    poly(d, body, outline=None)
    d.line([(142 + lx, 86 + dy), (230 + lx, 72 + dy)], fill=PAPER, width=3)

    # the door panel, folding further open every frame
    door = [(232 + lx, 72 + dy), (232 + lx + 10 + gap, 78 + dy + gap),
            (262 + lx + gap, 218 - gap), (262 + lx, 220)]
    poly(d, door, fill=INK, outline=PAPER, w=3)

    # the crack through the cabinet
    zig(d, [(188 + lx, 86 + dy), (176 + lx, 130 + dy),
            (194 + lx, 168 + dy), (178 + lx, 214)], 5 + p, VERM if p >= 2 else PAPER)

    # index tabs on the cabinet face - the only teal
    for k in range(3):
        box(d, 128 + lx, 116 + dy + k * 26, 152 + lx, 126 + dy + k * 26,
            TEAL if p < 2 else VERM)

    # loose pages: more of them, and further out, as it comes apart.  They stay
    # inside a sane margin of the body - debris that flies to the frame edge
    # changes the frame bbox and undoes the "same size" read the rig protects.
    pages = [(96, 108, 26, 34), (248, 74, 24, 32)]
    if p >= 1:
        pages.append((276, 132, 22, 28))
    if p >= 2:
        pages += [(78, 62, 24, 30), (284, 96, 20, 26)]
    if p == 3:
        pages += [(104, 44, 22, 28), (242, 42, 22, 28), (206, 64, 18, 24)]
    for i, (x, y, w, h) in enumerate(pages):
        page(d, x, y + (6 if p == 3 else 0), w, h, tilt=(-8, 6, -14, 10)[i % 4])

    if p == 3:
        box(d, 150, 226, 236, 234, TEAL)
    return im


def mirror_lieutenant(p):
    """镜像副官: symmetric officer, one half paper, displaced press ghosts."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    ghost = (0, 6, -7, 12)[p]

    # displaced ghosts behind the body - a bad registration on the press
    for gx, gy in ((-11, -8), (11, 6)):
        if p == 3:
            gx *= 2
        for y0, y1 in ((134, 250), (80, 134)):
            d.rectangle([112 + gx + lx, y0 + gy + dy, 248 + gx + lx, y1 + gy + dy],
                        outline=PAPER, width=2)

    legs(d, (126, 194), top=252, w=40, foot=12)
    box(d, 108 + lx, 132 + dy, 252 + lx, 252 + dy)
    d.line([109 + lx, 134 + dy, 251 + lx, 134 + dy], fill=PAPER, width=3)
    box(d, 146 + lx, 78 + dy, 214 + lx, 132 + dy)
    box(d, 158 + lx, 92 + dy, 202 + lx, 102 + dy, VERM if p == 2 else PAPER)

    # shoulder blocks give it the officer's width - a bare rectangle read as a
    # thin pole next to the other seven
    for side in (-1, 1):
        box(d, 180 + lx + side * 72 - 20, 136 + dy, 180 + lx + side * 72 + 20,
            168 + dy)
        seg(d, (180 + lx + side * 50, 152 + dy),
            (180 + lx + side * 74, 232 + dy), 20)

    # the paper half: a narrow strip down the left edge plus paper rules, not a
    # paper silhouette.  Filling the whole left half with paper read as a second
    # body colour and cost the frame its ink floor - the split is legible from
    # the strip + the displaced ghost edges + the rule pattern.
    shift = (0, 0, 0, -16)[p]
    box(d, 114 + lx + shift, 80 + dy, 130 + lx + shift, 130 + dy, PAPER,
        outline=INK, w=2)
    box(d, 114 + lx + shift, 142 + dy, 130 + lx + shift, 250 + dy, PAPER,
        outline=INK, w=2)
    for k in range(4):
        d.line([140 + lx + shift, 160 + dy + k * 22, 168 + lx + shift,
                160 + dy + k * 22], fill=PAPER, width=3)
    box(d, 114 + lx + shift, 252, 130 + lx + shift, GROUND, PAPER, outline=INK, w=2)

    if p == 1:                                    # bracing, ghost edges thicken
        d.line([180 + lx + ghost + 22, 132 + dy, 180 + lx + ghost + 22, 252 + dy],
               fill=PAPER, width=2)
    if p == 2:                                    # struck: the halves disagree
        zig(d, [(196 + lx, 148 + dy), (180 + lx, 178 + dy),
                (200 + lx, 198 + dy), (182 + lx, 226 + dy)], 5, VERM)
    if p == 3:                                    # dying: the halves come apart
        zig(d, [(180 + lx, 132 + dy), (170 + lx, 178 + dy),
                (186 + lx, 214 + dy), (176 + lx, 252 + dy)], 6, TEAL)
        box(d, 196 + lx, 236 + dy, 214 + lx, 244 + dy, TEAL)
    return im


def shaft_gaoler(p):
    """井道看守: spider-legged unit clamped in a vertical shaft, one teal lamp."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    curl = (0, 9, -7, 14)[p]

    # four legs per side; the knees take the frame, the hips do not
    for side in (-1, 1):
        for k, (kx, ky, fx, fy, w) in enumerate((
                (74, 26, 150, 264, 15),
                (94, 2, 138, 172, 13),
                (84, -26, 120, 124, 12),
                (54, -50, 78, 92, 11))):
            hip = (180 + lx + side * 34, 152 + dy + k * 18)
            knee = (hip[0] + side * (kx + curl), hip[1] + ky)
            foot = (180 + lx + side * fx, fy)
            limb(d, [hip, knee, foot], w)

    box(d, 136 + lx, 138 + dy, 224 + lx, 238 + dy)
    d.line([137 + lx, 140 + dy, 223 + lx, 140 + dy], fill=PAPER, width=3)
    # mandible plates, ink with a paper edge
    for x0 in (150, 184):
        poly(d, [(x0 + lx, 234 + dy), (x0 + 26 + lx, 234 + dy),
                 (x0 + 14 + lx, 262 + dy)], fill=INK, outline=PAPER, w=2)

    # the single lamp eye
    ec = VERM if p == 2 else TEAL
    d.ellipse([162 + lx, 166 + dy, 198 + lx, 202 + dy], fill=ec,
              outline=INK, width=4)
    d.ellipse([172 + lx, 176 + dy, 182 + lx, 186 + dy], fill=INK)

    if p == 1:                                    # front legs pull in to strike
        limb(d, [(150 + lx, 226 + dy), (128 + lx, 268 + dy), (150 + lx, 268 + dy)], 10)
        limb(d, [(210 + lx, 226 + dy), (232 + lx, 268 + dy), (210 + lx, 268 + dy)], 10)
    if p == 2:                                    # struck, lamp flares red
        zig(d, [(140 + lx, 190 + dy), (166 + lx, 210 + dy),
                (144 + lx, 226 + dy)], 5, VERM)
    if p == 3:                                    # dying: legs buckle, coolant leaks
        zig(d, [(206 + lx, 148 + dy), (186 + lx, 176 + dy),
                (212 + lx, 194 + dy)], 5, TEAL)
        box(d, 150 + lx, 226 + dy, 216 + lx, 234 + dy, TEAL)
    return im


def cube(d, x, y, s, dx=9, dy=9, net=False):
    """A box in the press's flat three-face style - no gradients, no bevels.

    The three faces are one flat INK mass; the folds between them are teal
    hairlines and only the outer silhouette gets a paper rim.  Outlining every
    face in paper was the first draft and it dropped the body to 68% ink - the
    paper stopped being an edge highlight and became a second body colour.
    """
    front = [(x, y), (x + s, y), (x + s, y + s), (x, y + s)]
    top = [(x, y), (x + dx, y - dy), (x + s + dx, y - dy), (x + s, y)]
    right = [(x + s, y), (x + s + dx, y - dy),
             (x + s + dx, y + s - dy), (x + s, y + s)]
    for face in (top, right, front):
        poly(d, face, fill=INK)
    # outer rim only
    d.line([x + dx, y - dy, x + s + dx, y - dy], fill=PAPER, width=2)
    d.line([x + s + dx, y - dy, x + s + dx, y + s - dy], fill=PAPER, width=2)
    d.line([x, y + s, x + s, y + s], fill=PAPER, width=2)
    # face folds
    d.line([x, y, x + dx, y - dy], fill=TEAL, width=2)
    d.line([x + s, y, x + s, y + s], fill=TEAL, width=2)
    if net:
        for k in range(1, 3):
            d.line([x + s * k / 3.0, y + 2, x + s * k / 3.0, y + s - 2],
                   fill=TEAL, width=2)
        d.line([x + 2, y + s / 2.0, x + s - 2, y + s / 2.0], fill=TEAL, width=2)


def emergence_herald(p):
    """涌现先驱: unstable figure assembled from repeated cubes, teal net lines."""
    im, d = canvas()
    lx, dy = LEAN[p], DROP[p]
    apart = (0, 0, 4, 12)[p]

    cube(d, 156 + lx, 84 + dy, 44, net=True)                 # head
    cube(d, 140 + lx - apart, 142 + dy, 70, net=True)        # torso
    cube(d, 100 + lx, 148 + dy, 38, net=True)                # shoulder L
    cube(d, 222 + lx, 148 + dy, 38, net=True)                # shoulder R
    cube(d, 96 + lx - apart, 196 + dy, 32, net=True)         # arm L
    cube(d, 238 + lx + apart, 196 + dy, 32, net=True)        # arm R
    cube(d, 128 + lx - apart // 2, 254, 42)                  # leg L
    cube(d, 190 + lx + apart // 2, 254, 42)                  # leg R

    # the net running between the parts, or snapped where the frame breaks it
    wires = ((150, 130, 168, 144), (110, 188, 140, 198),
             (222, 188, 250, 198), (206, 228, 214, 252))
    for x0, y0, x1, y1 in wires:
        if p == 3:
            d.line([x0, y0, x0 + 9, y0 + 6], fill=TEAL, width=2)
            d.line([x1 - 9, y1 - 6, x1, y1], fill=TEAL, width=2)
        else:
            d.line([x0, y0, x1, y1], fill=TEAL, width=2)

    if p == 1:                                    # a new cube being pulled in
        cube(d, 60 + lx, 136 + dy, 28, net=True)
        d.line([88 + lx, 150 + dy, 100 + lx, 158 + dy], fill=TEAL, width=2)
    if p == 2:                                    # struck: a face gives way
        zig(d, [(178 + lx, 148 + dy), (162 + lx, 178 + dy),
                (186 + lx, 204 + dy), (168 + lx, 230 + dy)], 5, VERM)
        cube(d, 246 + lx, 108 + dy, 24)
    if p == 3:                                    # dying: the construction sheds
        cube(d, 294 + lx, 104 + dy, 26)
        cube(d, 44 + lx, 222, 24)
        zig(d, [(176 + lx, 138 + dy), (164 + lx, 172 + dy),
                (188 + lx, 198 + dy)], 5, TEAL)
    return im


# ── batch ────────────────────────────────────────────────────────
ASSETS = (
    # act II · 硅基深处
    ('miniboss-coolant-overseer', coolant_overseer),
    ('miniboss-array-warden', array_warden),
    ('miniboss-forge-master', forge_master),
    ('miniboss-redline-clerk', redline_clerk),
    # act III · 推理之巅
    ('miniboss-archive-keeper', archive_keeper),
    ('miniboss-mirror-lieutenant', mirror_lieutenant),
    ('miniboss-shaft-gaoler', shaft_gaoler),
    ('miniboss-emergence-herald', emergence_herald),
)


def save(im, name):
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, name + '.png'))
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=92, method=6)
    print(' wrote', name, im.size)


def build():
    """Draw, then put every unit's feet on GROUND with one shift for all frames.

    The per-frame rig already keeps the four frames identical in scale, but the
    units themselves were drawn at different heights: the herald's leg cubes
    ended at y=298 and the gaoler's lowest foot at 272.  If the game anchors a
    sprite by the bottom of its texture those two would float 14px and 40px
    relative to the other six.  So the shift is measured once, from q-01, and
    applied to all four frames of that unit - measuring per frame would make the
    feet jump whenever a frame adds debris below the body.
    """
    for name, fn in ASSETS:
        frames = [fn(q - 1) for q in range(4)]
        bottom = frames[0].getchannel('A').getbbox()[3]
        dy = GROUND - bottom
        for q, im in enumerate(frames, start=1):
            if dy:
                shifted = Image.new('RGBA', im.size, (0, 0, 0, 0))
                shifted.alpha_composite(im, (0, dy))
                im = shifted
            save(im, '%s-q-%02d' % (name, q))


# ── verification ─────────────────────────────────────────────────
def measure(path):
    im = Image.open(path)
    rgba = im.convert('RGBA')
    w, h = rgba.size
    alpha = rgba.getchannel('A').load()
    rgb = rgba.convert('RGB').load()
    clear = opaque = ink = 0
    for y in range(h):
        for x in range(w):
            if alpha[x, y] == 0:
                clear += 1
                continue
            opaque += 1
            r, g, b = rgb[x, y]
            if (r + g + b) / 3.0 < 70:
                ink += 1
    bbox = rgba.getchannel('A').getbbox()
    return dict(size=(w, h), mode=im.mode, clear=clear / (w * h),
                ink=ink / opaque if opaque else 0.0, bbox=bbox)


def body_area(path):
    """Opaque pixel count - the "did this unit change size" measure.

    Two earlier probes were wrong and are recorded so they are not retried:

    * Full-canvas bbox width.  A raised pen or a page drifting outward moves it
      by up to 35% while the body itself is untouched.
    * Contiguous run through the torso row.  It collapses or jumps by 63% as
      soon as a limb or a shoulder block happens to weld onto the torso in one
      frame, so it measures contact, not scale.

    Opaque area is stable under both: the same rig in four poses moves it by at
    most ~9% across this whole batch, which is exactly what "no resize" means.
    """
    hist = Image.open(path).convert('RGBA').getchannel('A').histogram()
    return SIZE * SIZE - hist[0]


def validate():
    print('\n== verification: size / mode / alpha / ink / anchor ==')
    bad = 0
    for name, _ in ASSETS:
        frames = []
        for q in range(1, 5):
            stem = '%s-q-%02d' % (name, q)
            png = os.path.join(OUT, stem + '.png')
            webp = os.path.join(OUT, stem + '.webp')
            for path in (png, webp):
                if not os.path.exists(path):
                    print(' MISSING', path)
                    bad += 1
                elif os.path.getsize(path) < 512:
                    print(' SUSPICIOUS', path, os.path.getsize(path))
                    bad += 1
            s = measure(webp)
            p = measure(png)
            frames.append(s)
            for tag, st in (('webp', s), ('png', p)):
                if st['size'] != (SIZE, SIZE):
                    print(' FAIL %s size %s' % (tag, stem), st['size'])
                    bad += 1
                if st['mode'] != 'RGBA':
                    print(' FAIL %s mode %s' % (tag, stem), st['mode'])
                    bad += 1
                if st['clear'] < 0.60:
                    print(' FAIL %s clear %.3f < 0.60 %s' % (tag, st['clear'], stem))
                    bad += 1
                if st['ink'] < 0.70:
                    print(' FAIL %s ink %.3f < 0.70 %s' % (tag, st['ink'], stem))
                    bad += 1
        heights = [b[3] - b[1] for b in (f['bbox'] for f in frames)]
        bottoms = [b[3] for b in (f['bbox'] for f in frames)]
        areas = [body_area(os.path.join(OUT, '%s-q-%02d.webp' % (name, q)))
                 for q in range(1, 5)]
        if max(bottoms) - min(bottoms) > 2:
            print(' FAIL anchor drift', name, bottoms)
            bad += 1
        if max(bottoms) != GROUND:
            print(' FAIL not on GROUND', name, max(bottoms), '!=', GROUND)
            bad += 1
        spread = (max(areas) - min(areas)) / float(max(areas))
        if spread > 0.15:
            print(' FAIL body resizes %.0f%%' % (100 * spread), name, areas)
            bad += 1
        print(' %-30s clear %2.0f%%  ink %2.0f%%  h %s  area %s  bottom %s'
              % (name, 100 * min(f['clear'] for f in frames),
                 100 * min(f['ink'] for f in frames), heights, areas, bottoms))

    mine = [a[0] for a in ASSETS]
    files = os.listdir(OUT)
    webp = [f for f in files if f.endswith('.webp') and f.rsplit('-q-', 1)[0] in mine]
    png = [f for f in files if f.endswith('.png') and f.rsplit('-q-', 1)[0] in mine]
    print('\n this batch: %d webp + %d png = %d' % (len(webp), len(png),
                                                    len(webp) + len(png)))
    print(' folder total: %d webp + %d png = %d'
          % (len([f for f in files if f.endswith('.webp')]),
             len([f for f in files if f.endswith('.png')]), len(files)))
    if (len(webp), len(png)) != (32, 32):
        print(' FAIL expected 32 webp + 32 png')
        bad += 1
    print(' problems: %d' % bad)
    return bad


# ── QA contact sheet ─────────────────────────────────────────────
def contact_sheet():
    """8 rows x 4 frames: full size on paper, plus small copies on a dark band.

    Two backdrops because one is not enough.  Paper shows the ink silhouette - a
    body that is 80% ink is invisible on the dark stage spritekit.contact()
    uses, and the first sheet read as a field of black rectangles.  The dark band
    shows the alpha edge, which paper hides.  So each row carries both: the four
    frames at cell size on paper, then the same four at 56px over dark.
    """
    cols, cell, pad, label = 4, 180, 6, 16
    mini, band = 56, 68
    paper = (244, 241, 234)
    dark = (26, 32, 38)
    rows = len(ASSETS)
    cw = cell + pad * 2
    ch = pad + cell + label + band + pad
    out = Image.new('RGB', (cols * cw, rows * ch), paper)
    dr = ImageDraw.Draw(out)
    for r, (name, _) in enumerate(ASSETS):
        top = r * ch
        dr.rectangle([0, top + pad + cell + label, cols * cw - 1, top + ch - pad - 1],
                     fill=dark)
        for c in range(4):
            stem = '%s-q-%02d' % (name, c + 1)
            art = Image.open(os.path.join(OUT, stem + '.webp')).convert('RGBA')
            x = c * cw + pad
            big = art.resize((cell, cell), Image.BOX)
            out.paste(big, (x, top + pad), big)
            dr.text((x, top + pad + cell + 3), stem, fill=(26, 26, 26))
            sm = art.resize((mini, mini), Image.BOX)
            out.paste(sm, (x + (cell - mini) // 2, top + pad + cell + label + 6), sm)
    os.makedirs(QA_DIR, exist_ok=True)
    out.save(QA_SHEET)
    print('\n QA sheet', QA_SHEET, out.size)


def main():
    build()
    problems = validate()
    contact_sheet()
    return problems


if __name__ == '__main__':
    raise SystemExit(1 if main() else 0)
