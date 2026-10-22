#!/usr/bin/env python3
"""Build the four 1920x1080 seamless parallax layers from the generated 21:9 art.

Layers far/mid/near are painted on a near-white background, so alpha comes from
a luma key: bright neutral pixels go transparent, dark structure stays opaque,
and saturated pixels are rescued so warm lamps survive the key. The sky layer is
opaque by design.

Tiling: the art was not painted seamless. The right edge fades into a mirrored
copy of the left edge, ending with both boundary columns on the same pixel, so
the tile repeats without a hard seam. The fade band is the only ghosted area.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'backgrounds'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'backgrounds-v2'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
W, H = 1920, 1080

SOURCES = {
    'sky': ('bg-sky_1792657606261_b80318bd.png', None, 120, 320),
    'far': ('bg-far_1792657635613_202f7fbf.png', (234, 160), 240, 320),
    'mid': ('bg-mid_1792657674936_73bf59e3.png', (242, 178), 80, 320),
    'near': ('bg-near_1792657709401_f40782eb.png', (238, 172), 80, 320),
}
PAPER = (244, 241, 234)
GAME_ALPHA = [0.72, 0.58, 0.44, 0.30]


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def fit(im, offset=None):
    """Crop the 21:9 source to 16:9; a custom offset also drops the watermark."""
    im = im.convert('RGB')
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    left = (im.width - W) // 2 if offset is None else min(max(0, offset), im.width - W)
    return im.crop((left, 0, left + W, H))


def key_white(im, clear, solid):
    """Alpha from how far a pixel sits below the painted backdrop near-white."""
    r, g, b = im.split()
    minc = ImageChops.darker(ImageChops.darker(r, g), b)
    maxc = ImageChops.lighter(ImageChops.lighter(r, g), b)
    spread = ImageChops.subtract(maxc, minc)

    span = max(1, clear - solid)
    luma = minc.point(lambda v: 0 if v >= clear else (255 if v <= solid else clamp((clear - v) * 255 / span)))
    colour = spread.point(lambda v: 0 if v <= 30 else (255 if v >= 72 else clamp((v - 30) * 255 / 42)))
    alpha = ImageChops.lighter(luma, colour)
    alpha = alpha.point(lambda v: 0 if v < 14 else v)

    out = im.copy()
    out.putalpha(alpha)
    return out


def wrap(im, band):
    """Tile the layer horizontally; returns the tile and its boundary delta.

    The right band crossfades from the original edge into a reversed copy of the
    left edge, so at x=W-1 the pixel equals S(0). The wrap boundary is then a
    mirror axis instead of a cut, and no hard column survives.
    """
    im = im.convert('RGBA')
    left = im.crop((0, 0, band, H)).transpose(Image.FLIP_LEFT_RIGHT)
    right = im.crop((W - band, 0, W, H))

    ramp = []
    for i in range(band):
        t = i / (band - 1)
        ramp.append(clamp(255 * t * t * (3 - 2 * t)))
    mask = Image.new('L', (band, 1))
    mask.putdata(ramp)
    mask = mask.resize((band, H), Image.NEAREST)

    blended = Image.composite(left, right, mask)
    out = im.copy()
    out.paste(blended, (W - band, 0))

    # Close the one-pixel gap lossy WebP edge blocks can open at the join.
    out.paste(out.crop((0, 0, 1, H)), (W - 1, 0))

    left_edge = out.crop((0, 0, 1, H))
    right_edge = out.crop((W - 1, 0, W, H))
    seam_delta = sum(ImageChops.difference(left_edge, right_edge).tobytes()) / (H * 4)
    return out, seam_delta


def edge_delta(im):
    """Mean per-channel delta of neighbouring columns, as a seam reference."""
    a = im.crop((0, 0, W - 1, H))
    b = im.crop((1, 0, W, H))
    diff = ImageChops.difference(a, b)
    return sum(diff.tobytes()) / ((W - 1) * H * 4)


def save_webp(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=90, method=6)


def checker(size, cell=48):
    im = Image.new('RGB', size, (200, 200, 200))
    d = ImageDraw.Draw(im)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                d.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(230, 230, 230))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)

    layers = {}
    for name, (filename, key, band, offset) in SOURCES.items():
        im = fit(Image.open(SRC / filename), offset)
        if key is not None:
            im = key_white(im, *key)
        im, seam = wrap(im, band)
        layers[name] = im
        adjacent = edge_delta(im)
        save_webp(im, OUT / f'{name}.webp')
        print(f'{name}: {im.size} seam={seam:.2f} adjacent={adjacent:.2f}')

    # Full-opacity composite on paper, and the in-game alpha mix.
    full = Image.new('RGBA', (W, H), PAPER + (255,))
    game = full.copy()
    for name in ('sky', 'far', 'mid', 'near'):
        full.alpha_composite(layers[name])
        faded = layers[name].copy()
        faded.putalpha(faded.getchannel('A').point(lambda v: int(v * GAME_ALPHA[list(SOURCES).index(name)])))
        game.alpha_composite(faded)
    full.convert('RGB').save(QA / 'bg-v2-composite.png')
    game.convert('RGB').save(QA / 'bg-v2-game-mix.png')

    # Seam proof: two tiles side by side plus a 1:1 crop around both joins.
    for name, im in layers.items():
        pair = Image.new('RGBA', (W * 2, H))
        pair.paste(im, (0, 0))
        pair.paste(im, (W, 0))
        pair.resize((W, H // 2), Image.LANCZOS).convert('RGB').save(QA / f'bg-v2-tile-{name}.png')
        bg = checker((480, H)) if name != 'sky' else Image.new('RGB', (480, H), (20, 24, 28))
        zoom = pair.crop((W - 240, 0, W + 240, H))
        bg.paste(zoom, (0, 0), zoom)
        bg.save(QA / f'bg-v2-seam-{name}.png')

        band_bg = checker((480, 1080)) if name != 'sky' else Image.new('RGB', (480, 1080), (20, 24, 28))
        band = im.crop((W - 240, 180, W, 720)).resize((480, 1080), Image.LANCZOS)
        band_bg.paste(band, (0, 0), band)
        band_bg.save(QA / f'bg-v2-blend-{name}.png')

    # Layer contact sheet against a checkerboard.
    sheet = checker((W // 3 * 2, H // 3 * 2), 40)
    for i, (name, im) in enumerate(layers.items()):
        t = im.resize((W // 3, H // 3), Image.LANCZOS)
        sheet.paste(t, ((i % 2) * W // 3, (i // 2) * H // 3), t)
    sheet.save(QA / 'bg-v2-layers.png')


if __name__ == '__main__':
    main()
