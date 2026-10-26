"""Build the Act I room kit: floor, wall, platform, props, hazard, door.

Follows docs/game/design/stage-art-prompts-batch1.md section 5. The floor and
wall sets are cut from a generated plate texture rather than painted as nine
separate tiles: nine tiles from nine model-drawn cells never line up, while a
texture that is blended into itself at the edges, cropped 3x3 and put back
together is seamless by construction. The props, hazard and door sheets are
regular grids, so they are cut cell by cell.
"""

from pathlib import Path

from PIL import Image, ImageDraw

from bgkit import wrap, wrap_vertical
from spritekit import contact, cut_cell, erase_watermark, prep

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'tiles'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
INK = (26, 26, 26)
PAPER = (244, 241, 234)
VERMILION = (214, 69, 44)
CELLS = (85, 85, 86)


def tileable(im: Image.Image, band: int = 96) -> Image.Image:
    """Blend the texture into itself on both axes so it repeats without a seam."""
    out = wrap(im.convert('RGBA'), band, size=im.size)
    return wrap_vertical(out, band)


def nine_slice(texture: Path, name: str, cap: bool = False) -> Image.Image:
    size = sum(CELLS)
    im = tileable(Image.open(texture)).resize((size, size), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    if cap:
        d.rectangle((0, 0, size - 1, 3), fill=INK)
        d.line((0, 4, size - 1, 4), fill=PAPER)
    else:
        d.line((0, 1, size - 1, 1), fill=INK, width=3)
        d.line((0, size - 2, size - 1, size - 2), fill=INK, width=3)
        d.line((1, 0, 1, size - 1), fill=INK, width=3)
        d.line((size - 2, 0, size - 2, size - 1), fill=INK, width=3)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=93, method=6)
    print(f'{name}: {im.size}')
    return im


def platform(texture: Path) -> Image.Image:
    """Three 128 wide segments: end cap, repeatable middle, end cap.

    The deck is 16px thick and the underside is a dashed line, which is the
    language for a one-way platform the player can pass through from below.
    """
    deck = tileable(Image.open(texture)).crop((0, 0, 512, 512)).resize((384, 16), Image.LANCZOS)
    im = Image.new('RGBA', (384, 64), (0, 0, 0, 0))
    im.alpha_composite(deck, (0, 0))
    d = ImageDraw.Draw(im)
    d.line((0, 1, 383, 1), fill=INK, width=2)
    d.line((0, 2, 383, 2), fill=PAPER)
    d.line((0, 15, 383, 15), fill=INK)
    for x in range(0, 384, 4):
        d.line((x, 19, x + 1, 19), fill=INK)
    for seg in (0, 256):
        d.line((seg + 1, 0, seg + 1, 15), fill=INK)
        d.line((seg + 2, 0, seg + 2, 15), fill=PAPER)
        d.line((seg + 127, 0, seg + 127, 15), fill=INK)
        d.line((seg + 126, 0, seg + 126, 15), fill=PAPER)
    for brace in (48, 176, 304):
        d.polygon([(brace + 20, 16), (brace + 44, 16), (brace + 32, 30)], fill=INK)
    im.save(OUT / 'tiles-act1-platform.webp', 'WEBP', quality=93, method=6)
    print(f'tiles-act1-platform: {im.size}')
    return im


def grid_sheet(path: Path, cols: int, rows: int, cell: tuple, name: str, tint=None, bottom: bool = False) -> Image.Image:
    sheet = erase_watermark(Image.open(path))
    tw, th = cell
    out = Image.new('RGBA', (tw * cols, th * rows), (0, 0, 0, 0))
    for row in range(rows):
        for col in range(cols):
            art = prep(cut_cell(sheet, row * cols + col, cols, rows, inset=6))
            if tint:
                from PIL import ImageChops
                art = ImageChops.overlay(art, Image.new('RGBA', art.size, tint))
            scale = min(tw / art.width, th / art.height)
            w, h = max(1, round(art.width * scale)), max(1, round(art.height * scale))
            resized = art.resize((w, h), Image.LANCZOS)
            y = th - h if bottom else (th - h) // 2
            out.alpha_composite(resized, (col * tw + (tw - w) // 2, row * th + y))
    out.save(OUT / f'{name}.webp', 'WEBP', quality=93, method=6)
    print(f'{name}: {out.size}')
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    floor = nine_slice(sorted(SRC.glob('act1-tiles-floor-texture_*.png'))[-1], 'tiles-act1-floor')
    wall = nine_slice(sorted(SRC.glob('act1-tiles-wall-texture_*.png'))[-1], 'tiles-act1-wall', cap=True)
    platform(sorted(SRC.glob('act1-tiles-floor-texture_*.png'))[-1])
    grid_sheet(sorted(SRC.glob('act1-tiles-props-sheet_*.png'))[-1], 4, 3, (64, 64), 'tiles-act1-props', bottom=True)
    grid_sheet(sorted(SRC.glob('act1-tiles-hazard-sheet_*.png'))[-1], 3, 1, (128, 128), 'tiles-act1-hazard')
    grid_sheet(sorted(SRC.glob('act1-tiles-door-sheet_*.png'))[-1], 3, 1, (96, 160), 'tiles-act1-door')

    contact(OUT, QA / 'act1-qa-tiles.png', zoom=2, cols=3)


if __name__ == '__main__':
    main()