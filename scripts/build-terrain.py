"""Build seamless ground tiles and the 9-slice platform from generated strips.

The strips come from the image model as one continuous walkway band on a flat
backdrop. Cropping a band, scaling it uniformly to 60px, and mirroring the
central 128px gives a 256px loop whose outer columns match exactly. The mirror
axis is the only symmetry; plate seams hide it at play size.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageStat

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'terrain'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'terrain'
OUT.mkdir(parents=True, exist_ok=True)

STRIPS = {
    'ground-cold': 'ground-cold-strip_*.png',
    'ground-teal': 'ground-teal-strip_*.png',
    'ground-grey': 'ground-grey-strip_*.png',
}


def find_band(im: Image.Image) -> tuple[int, int]:
    """Rows of the walkway band, found by distance from the backdrop colour."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    bg = px[4, 4]
    counts = []
    for y in range(h):
        n = 0
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 40:
                n += 1
        counts.append(n)
    threshold = (w // 4) * 0.15
    groups = []
    start = None
    for y, n in enumerate(counts):
        if n > threshold and start is None:
            start = y
        elif n <= threshold and start is not None:
            groups.append((start, y))
            start = None
    if start is not None:
        groups.append((start, h))
    return max(groups, key=lambda g: g[1] - g[0])


def build_tile(strip_path: Path) -> Image.Image:
    im = Image.open(strip_path).convert('RGB')
    top, bottom = find_band(im)
    band = im.crop((0, top, im.width, bottom))
    height = 60
    width = round(band.width * height / band.height)
    band = band.resize((width, height), Image.LANCZOS)
    mid = width // 2
    half = band.crop((mid - 64, 0, mid + 64, height))
    tile = Image.new('RGB', (256, height))
    tile.paste(half, (0, 0))
    tile.paste(half.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (128, 0))
    # 4px trim strip; the tile is 64 tall with the walkable top at y=0.
    trim = Image.new('RGB', (256, 64))
    trim.paste(tile, (0, 0))
    bottom_colour = tuple(round(v * 0.45) for v in ImageStat.Stat(tile.crop((0, 56, 256, 60))).mean)
    ImageDraw.Draw(trim).rectangle((0, 60, 255, 63), fill=bottom_colour)
    return trim


def recolour(tile: Image.Image, kind: str) -> Image.Image:
    """Palette variants share the cold strip's readable plate structure."""
    out = tile.convert('RGB').copy()
    if kind != 'cold':
        src = tile.convert('RGB').load()
        px = out.load()
        for y in range(out.height):
            for x in range(out.width):
                r, g, b = src[x, y]
                warm = r > g + 10
                if kind == 'teal':
                    r, g, b = r * 0.82, g * 1.32, b * 1.04
                    if warm:
                        r, g, b = r * 1.55, g * 1.0, b * 0.72
                else:
                    lum = 0.299 * r + 0.587 * g + 0.114 * b
                    r, g, b = lum * 0.98, lum * 0.94, lum * 1.12
                    if warm:
                        r, g, b = r * 0.55 + 86 * 0.45, g * 0.55 + 70 * 0.45, b * 0.55 + 98 * 0.45
                px[x, y] = (min(255, round(r)), min(255, round(g)), min(255, round(b)))
    deck, notch, rivet, lip, high, rust = {
        'cold': ((58, 82, 84), (26, 42, 44), (170, 190, 182), (12, 28, 30), (150, 176, 168), (100, 62, 42)),
        'teal': ((45, 98, 86), (18, 46, 42), (214, 164, 64), (10, 32, 30), (128, 168, 154), (148, 82, 34)),
        'grey': ((78, 88, 108), (34, 40, 54), (170, 164, 190), (18, 22, 34), (162, 168, 190), (86, 70, 98)),
    }[kind]
    d = ImageDraw.Draw(out)
    d.rectangle((0, 1, out.width - 1, 6), fill=deck)
    for x in range(4, out.width, 8):
        d.line((x, 4, x + 2, 4), fill=notch)
    for x in (20, 84, 148, 212):
        d.line((x, 1, x, 6), fill=rust)
    for x in (64, 128, 192):
        d.line((x, 0, x, 9), fill=lip)
        d.ellipse((x - 2, 2, x, 4), fill=rivet)
    d.rectangle((0, 7, out.width - 1, 9), fill=lip)
    d.line((0, 0, out.width - 1, 0), fill=high)
    d.line((0, 10, out.width - 1, 10), fill=lip)
    return out


def build_platform() -> Image.Image:
    """96x96, 3x3 of 32px cells: ledge top, repeatable sides, brackets below."""
    out = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    base = (37, 78, 71, 255)
    d.rectangle((0, 0, 95, 95), fill=base)
    # Ledge top: highlight, walkable surface, dark lip.
    d.rectangle((0, 0, 95, 1), fill=(160, 190, 178, 255))
    d.rectangle((0, 2, 95, 7), fill=(74, 112, 101, 255))
    d.rectangle((0, 8, 95, 9), fill=(12, 36, 35, 255))
    for x in range(6, 96, 8):
        d.line((x, 4, x + 3, 4), fill=(28, 58, 54, 255), width=1)
    for x in (8, 24, 72, 88):
        d.ellipse((x, 12, x + 2, 14), fill=(200, 144, 31, 255))
    # Plate seams sit on the 9-slice cell boundaries so stretching keeps them.
    for x in (32, 63):
        d.line((x, 10, x, 91), fill=(10, 28, 27, 255))
        d.line((x + 1, 10, x + 1, 91), fill=(52, 92, 83, 255))
    for y in (32, 63):
        d.line((0, y, 95, y), fill=(10, 28, 27, 255))
        d.line((0, y + 1, 95, y + 1), fill=(52, 92, 83, 255))
    for x in (20, 76):
        for y in (22, 86):
            d.ellipse((x, y, x + 1, y + 1), fill=(200, 144, 31, 255))
    for x in (14, 78):
        d.line((x, 14, x, 78), fill=(96, 62, 40, 255))
        d.line((x + 1, 22, x + 1, 68), fill=(120, 78, 48, 255))
    # Side bevels.
    d.rectangle((0, 0, 2, 95), fill=(10, 26, 26, 255))
    d.rectangle((3, 10, 4, 95), fill=(47, 82, 76, 255))
    d.rectangle((93, 0, 95, 95), fill=(8, 22, 22, 255))
    d.rectangle((91, 10, 92, 95), fill=(31, 62, 58, 255))
    # Base and corner brackets (fixed corners only).
    d.rectangle((0, 92, 95, 95), fill=(8, 20, 21, 255))
    for bx in (6, 80):
        d.polygon([(bx, 96), (bx + 10, 96), (bx + 10, 90), (bx + 5, 86), (bx, 90)], fill=(12, 28, 29, 255))
    # Small transparent bevels at the outer corners.
    for cx, cy, sx, sy in ((0, 0, 1, 1), (95, 0, -1, 1), (0, 95, 1, -1), (95, 95, -1, -1)):
        d.polygon([(cx, cy), (cx + 3 * sx, cy), (cx, cy + 3 * sy)], fill=(0, 0, 0, 0))
    return out


def main() -> None:
    sources = sorted(ARCHIVE.glob(STRIPS['ground-cold']))
    if not sources:
        raise SystemExit('cold strip missing')
    cold = build_tile(sources[0])
    for name in ('ground-cold', 'ground-teal', 'ground-grey'):
        kind = name.split('-', 1)[1]
        tile = recolour(cold, kind)
        tile.save(OUT / f'{name}.png')
        tile.save(OUT / f'{name}.webp', 'WEBP', lossless=True, method=6)
        print(f'{name}: 256x64')
    platform = build_platform()
    platform.save(OUT / 'platform-9slice.png')
    platform.save(OUT / 'platform-9slice.webp', 'WEBP', lossless=True, method=6)
    print('platform-9slice: 96x96')


if __name__ == '__main__':
    main()
