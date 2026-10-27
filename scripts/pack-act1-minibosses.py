"""Cut the four Act I mid-boss sheets into 360x360 move frames.

Follows docs/game/design/stage-art-prompts-batch1.md section 6: four frames
each, named miniboss-xxx-q-01..04, sized 360x360.

Frames are aligned on their footprint (the lowest strip of the sprite) instead
of the whole silhouette: a crane whose jib swings overhead or a tangle of
tentacles that spreads out would otherwise change the boss's on-screen size
between frames. The pipe warden's exposed-core frame also gets its glow lifted,
because that frame is the player's attack window and has to read instantly.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from spritekit import clean_white_and_shadow, contact, cut_cell, drop_small, erase_watermark, remove_white

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'minibosses'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
FRAME = 360
VERMILION = (255, 86, 48)

SHEETS = {
    'miniboss-dock-foreman': ('act1-miniboss-foreman_*.png', {}),
    'miniboss-pipe-warden': ('act1-miniboss-pipewarden_*.png', {'boost': 2}),
    'miniboss-scaffold-crane': ('act1-miniboss-crane_*.png', {}),
    'miniboss-audit-clerk': ('act1-miniboss-clerk-v2_*.png', {'box': 'body', 'anchor': 'top'}),
}


def footprint_box(im: Image.Image, frac: float = 0.22):
    """Bounding box of the lowest strip of the sprite, the part that stands."""
    box = im.getchannel('A').getbbox() or (0, 0, im.width, im.height)
    top = round(box[3] - (box[3] - box[1]) * frac)
    strip = im.crop((box[0], top, box[2], box[3]))
    sub = strip.getchannel('A').getbbox() or (0, 0, strip.width, strip.height)
    return (box[0] + sub[0], top + sub[1], box[0] + sub[2], top + sub[3])


def body_box(im: Image.Image):
    box = im.getchannel('A').getbbox() or (0, 0, im.width, im.height)
    return box


def core_glow(im: Image.Image) -> Image.Image:
    """Light up the exposed valve core so the attack window is unmissable."""
    rgb = im.convert('RGB')
    w, h = im.size
    px = rgb.load()
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if im.getpixel((x, y))[3] > 40 and r > 120 and r - g > 60:
                xs.append(x)
                ys.append(y)
    if not xs:
        return im
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    radius = int(max(max(xs) - min(xs), max(ys) - min(ys)) * 0.9)
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for step in range(6, 0, -1):
        r = int(radius * step / 6)
        alpha = int(26 + (6 - step) * 16)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=VERMILION + (alpha,))
    glow = glow.filter(ImageFilter.GaussianBlur(radius * 0.25))
    out = Image.alpha_composite(glow, im.convert('RGBA'))
    return out


def pack(frames, anchor: str = 'bottom', box: str = 'footprint') -> list:
    boxes = [footprint_box(f) if box == 'footprint' else body_box(f) for f in frames]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes))
    uw, uh = union[2] - union[0], union[3] - union[1]
    scale = min(FRAME / uw, FRAME / uh)
    # keep the whole silhouette in frame when it is smaller than the cell
    full = [f.getchannel('A').getbbox() or (0, 0, f.width, f.height) for f in frames]
    widest = max(b[2] - b[0] for b in full)
    tallest = max(b[3] - b[1] for b in full)
    scale = min(scale, FRAME / widest, FRAME / tallest)
    ox = (FRAME - uw * scale) / 2
    oy = 0 if anchor == 'top' else FRAME - uh * scale
    cells = []
    for im, b, f in zip(frames, boxes, full):
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        dx = round(ox - b[0] * scale)
        dy = round(oy - (b[1] - f[1]) * scale)
        cell.alpha_composite(im.resize((w, h), Image.LANCZOS), (dx, dy))
        cells.append(cell)
    return cells


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (pattern, options) in SHEETS.items():
        sheet = erase_watermark(Image.open(sorted(SRC.glob(pattern))[-1]))
        # The flood fill cannot reach the background showing through an arm or
        # a tentacle loop, so the enclosed pure-white holes are punched out
        # separately. Paper white in the art is #f4f1ea, safely below the punch
        # threshold, so the painted highlights survive.
        frames = [drop_small(clean_white_and_shadow(remove_white(cut_cell(sheet, i, 2, 2, inset=8), 240)), 0.002)
                  for i in range(4)]
        frames = [f.crop(f.getchannel('A').getbbox() or (0, 0, f.width, f.height)) for f in frames]
        if 'boost' in options:
            frames[options['boost'] - 1] = core_glow(frames[options['boost'] - 1])
        cells = pack(frames, options.get('anchor', 'bottom'), options.get('box', 'footprint'))
        for i, cell in enumerate(cells, start=1):
            filename = f'{name}-q-{i:02d}.webp'
            cell.save(OUT / filename, 'WEBP', quality=93, method=6)
        print(f'{name}: q-01..q-04 {cells[0].size}')

    contact(OUT, QA / 'act1-qa-minibosses.png', zoom=1, cols=4)


if __name__ == '__main__':
    main()