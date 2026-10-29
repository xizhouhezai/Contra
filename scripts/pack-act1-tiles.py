"""Build a room kit for one act: floor, wall, platform, props, hazard, door.

Follows docs/game/design/stage-art-prompts-batch1.md section 5 for the act I
kit and stage-art-prompts-batch23.md section 4 for the act II / III kits. The
sets are structurally identical across acts - only the globs, the source folder
and the output prefix change - so one script packs all three, and `--act 1`
stays byte-identical to the old act I output.

The floor and wall sets are cut from a generated plate texture rather than
painted as nine separate tiles: nine tiles from nine model-drawn cells never
line up, while a texture that is blended into itself at the edges, cropped 3x3
and put back together is seamless by construction. The props, hazard and door
sheets are regular grids, so they are cut cell by cell.

The platform is the one place where the acts differ in substance, not just in
naming: act I has no platform texture and its deck is cropped out of the floor
plate, while acts II / III ship a dedicated `act*-tiles-platform-texture_*.png`
(batch 2/3 section 1.6 asks for it). `platform()` therefore takes the texture
path and the output name instead of hard-coding the act I pair.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

from bgkit import wrap, wrap_vertical
from spritekit import cut_cell, erase_watermark, prep

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'tiles'
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


def platform(texture: Path, name: str) -> Image.Image:
    """Three 128 wide segments: end cap, repeatable middle, end cap.

    The deck is 16px thick and the underside is a dashed line, which is the
    language for a one-way platform the player can pass through from below.

    The texture is passed in because act I crops the floor plate here while
    acts II / III have their own platform texture; naming it keeps the output
    act-prefixed instead of the old hard-coded act I file.
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
    im.save(OUT / f'{name}.webp', 'WEBP', quality=93, method=6)
    print(f'{name}: {im.size}')
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


def contact_act(act: int, qa_path: Path, zoom: int, cols: int) -> None:
    """Contact sheet limited to one act's tiles.

    All three acts share assets/tiles/, so the shared spritekit.contact() - which
    globs every webp in the folder - would mix acts II / III into the act I
    sheet. Filtering by the act prefix keeps each sheet to its own six tiles.
    """
    files = sorted(OUT.glob(f'tiles-act{act}-*.webp'))
    pad, label = 12, 24
    cells = [(f.stem, Image.open(f).convert('RGBA')) for f in files]
    cells = [(n, im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)) for n, im in cells]
    rows = -(-len(cells) // cols)
    cw = max(c.width for _, c in cells) + pad * 2
    ch = max(c.height for _, c in cells) + pad * 2 + label
    sheet = Image.new('RGB', (cols * cw, rows * ch), (26, 32, 38))
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(im, (x + (cw - im.width) // 2, y + pad), im)
        draw.text((x + pad, y + ch - label), name, fill=(220, 220, 220))
    sheet.save(qa_path)


def main() -> None:
    parser = argparse.ArgumentParser(description='Pack one act of the room kit.')
    parser.add_argument('--act', type=int, choices=(1, 2, 3), default=1,
                        help='act whose raw sheets to pack (default 1)')
    args = parser.parse_args()
    act = args.act

    src = ROOT / 'vibe_images' / 'archive' / f'act{act}'
    prefix = f'tiles-act{act}'
    OUT.mkdir(parents=True, exist_ok=True)

    floor_src = sorted(src.glob(f'act{act}-tiles-floor-texture_*.png'))[-1]
    # Act I has no platform sheet: its deck is cropped from the floor plate.
    # Acts II / III ship one, and using the floor there would look wrong.
    platform_src = floor_src if act == 1 else sorted(src.glob(f'act{act}-tiles-platform-texture_*.png'))[-1]

    nine_slice(floor_src, f'{prefix}-floor')
    nine_slice(sorted(src.glob(f'act{act}-tiles-wall-texture_*.png'))[-1], f'{prefix}-wall', cap=True)
    platform(platform_src, f'{prefix}-platform')
    grid_sheet(sorted(src.glob(f'act{act}-tiles-props-sheet_*.png'))[-1], 4, 3, (64, 64), f'{prefix}-props', bottom=True)
    grid_sheet(sorted(src.glob(f'act{act}-tiles-hazard-sheet_*.png'))[-1], 3, 1, (128, 128), f'{prefix}-hazard')
    grid_sheet(sorted(src.glob(f'act{act}-tiles-door-sheet_*.png'))[-1], 3, 1, (96, 160), f'{prefix}-door')

    contact_act(act, QA / f'act{act}-qa-tiles.png', zoom=2, cols=3)


if __name__ == '__main__':
    main()
