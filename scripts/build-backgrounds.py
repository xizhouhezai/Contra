#!/usr/bin/env python3
"""Build the four 1920x1080 seamless parallax layers of the default backdrop.

Keying and tiling live in bgkit.py so the per-stage scenes match these layers
exactly. Run it after replacing a raw panorama under vibe_images/archive/
backgrounds/; it rewrites assets/backgrounds-v2/ and drops QA sheets next to
the raws.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

from bgkit import H, W, edge_delta, fit, key_white, save_webp, seam_delta, wrap

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'backgrounds'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'backgrounds-v2'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'

SOURCES = {
    'sky': ('bg-sky_1792657606261_b80318bd.png', None, 120, 320),
    'far': ('bg-far_1792657635613_202f7fbf.png', (234, 160), 240, 320),
    'mid': ('bg-mid_1792657674936_73bf59e3.png', (242, 178), 80, 320),
    'near': ('bg-near_1792657709401_f40782eb.png', (238, 172), 80, 320),
}
PAPER = (244, 241, 234)
GAME_ALPHA = [0.72, 0.58, 0.44, 0.30]


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
        im = wrap(im, band)
        layers[name] = im
        save_webp(im, OUT / f'{name}.webp')
        print(f'{name}: {im.size} seam={seam_delta(im):.2f} adjacent={edge_delta(im):.2f}')

    full = Image.new('RGBA', (W, H), PAPER + (255,))
    game = full.copy()
    for index, name in enumerate(layers):
        full.alpha_composite(layers[name])
        faded = layers[name].copy()
        faded.putalpha(faded.getchannel('A').point(lambda v: int(v * GAME_ALPHA[index])))
        game.alpha_composite(faded)
    full.convert('RGB').save(QA / 'bg-v2-composite.png')
    game.convert('RGB').save(QA / 'bg-v2-game-mix.png')

    for name, im in layers.items():
        pair = Image.new('RGBA', (W * 2, H))
        pair.paste(im, (0, 0))
        pair.paste(im, (W, 0))
        pair.resize((W, H // 2), Image.LANCZOS).convert('RGB').save(QA / f'bg-v2-tile-{name}.png')
        bg = checker((480, H)) if name != 'sky' else Image.new('RGB', (480, H), (20, 24, 28))
        zoom = pair.crop((W - 240, 0, W + 240, H))
        bg.paste(zoom, (0, 0), zoom)
        bg.save(QA / f'bg-v2-seam-{name}.png')

        band_bg = checker((480, H)) if name != 'sky' else Image.new('RGB', (480, H), (20, 24, 28))
        band = im.crop((W - 240, 180, W, 720)).resize((480, H), Image.LANCZOS)
        band_bg.paste(band, (0, 0), band)
        band_bg.save(QA / f'bg-v2-blend-{name}.png')

    sheet = checker((W // 3 * 2, H // 3 * 2), 40)
    for i, (name, im) in enumerate(layers.items()):
        t = im.resize((W // 3, H // 3), Image.LANCZOS)
        sheet.paste(t, ((i % 2) * W // 3, (i // 2) * H // 3), t)
    sheet.save(QA / 'bg-v2-layers.png')


if __name__ == '__main__':
    main()
