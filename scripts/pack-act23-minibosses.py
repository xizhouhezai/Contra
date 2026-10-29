"""Cut the eight Act II/III mid-boss sheets into 360x360 move frames.

Same pipeline as pack-act1-minibosses.py: four poses on a 2x2 white sheet,
cut, flood the white out, trim to content, then align the frames on a shared
footprint and scale them together so the body never changes size between
poses.

The hanging jailer is the exception: it dangles from cables that run off the
top of its cells, so its frames are pinned at the top edge instead of the
ground, otherwise the chain/claw tails would drag the body up and down.

Usage:
    uv run --no-project --with pillow python scripts/pack-act23-minibosses.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

from spritekit import clean_white_and_shadow, cut_cell, drop_small, erase_watermark, remove_white

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'minibosses'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
FRAME = 360

SHEETS = {
    # name: (act folder, glob, options)
    'miniboss-coolant-overseer': ('act2', 'act2-miniboss-coolant-overseer_*.png', {}),
    'miniboss-array-warden': ('act2', 'act2-miniboss-array-warden_*.png', {}),
    'miniboss-forge-master': ('act2', 'act2-miniboss-forge-master_*.png', {}),
    'miniboss-redline-clerk': ('act2', 'act2-miniboss-redline-clerk_*.png', {'strip_line': True}),
    'miniboss-archive-keeper': ('act3', 'act3-miniboss-archive-keeper_*.png', {}),
    'miniboss-mirror-lieutenant': ('act3', 'act3-miniboss-mirror-lieutenant_*.png', {}),
    'miniboss-shaft-gaoler': ('act3', 'act3-miniboss-shaft-gaoler_*.png', {'anchor': 'top', 'margin': 1.0}),
    'miniboss-emergence-herald': ('act3', 'act3-miniboss-emergence-herald_*.png', {}),
}


def strip_ground_line(cell: Image.Image) -> Image.Image:
    """Crop off the flat baseline stroke the redline sheet came back with.

    It is a separate horizontal ink run under the boots, so cutting at its top
    row removes the line without touching the figure.
    """
    rgb = cell.convert('RGB')
    px = rgb.load()
    alpha = cell.getchannel('A') if 'A' in cell.getbands() else None
    w, h = cell.size
    for y in range(round(h * 0.7), h):
        run = best = 0
        for x in range(w):
            r, g, b = px[x, y]
            if (alpha is None or alpha.getpixel((x, y)) > 100) and max(r, g, b) < 110:
                run += 1
                best = max(best, run)
            else:
                run = 0
        if best > w * 0.35:
            return cell.crop((0, 0, w, max(1, y)))
    return cell


def footprint_box(im: Image.Image, frac: float = 0.16):
    """Bounding box of the dark mass the unit stands on.

    Ink only: the red slash, molten splash, pale spray and teal hover glow are
    effects that can reach lower than the feet/base, and anchoring to them
    would lift the body off the ground line.
    """
    rgb = im.convert('RGB')
    px = rgb.load()
    ap = im.load()
    dark = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            if ap[x, y][3] > 100 and max(r, g, b) < 110:
                dark.append((x, y))
    if not dark:
        return im.getchannel('A').getbbox() or (0, 0, im.width, im.height)
    rows = {}
    for _, y in dark:
        rows[y] = rows.get(y, 0) + 1
    width = max(x for x, _ in dark) - min(x for x, _ in dark) + 1
    wide = max(5, round(0.035 * width))
    base = max(y for y, n in rows.items() if n >= wide)
    top = max(0, base - round(im.height * frac))
    strip = [(x, y) for x, y in dark if top <= y <= base]
    return (min(x for x, _ in strip), min(y for _, y in strip),
            max(x for x, _ in strip) + 1, base + 1)


def pack(frames, anchor: str = 'bottom', margin: float = 0.97) -> list:
    feet = [footprint_box(f) for f in frames]
    full = [f.getchannel('A').getbbox() or (0, 0, f.width, f.height) for f in frames]
    widest = max(b[2] - b[0] for b in full)
    tallest = max(b[3] - b[1] for b in full)
    widest_foot = max(b[2] - b[0] for b in feet)
    scale = min(FRAME / widest, FRAME / tallest, FRAME / widest_foot) * margin
    cells = []
    for im, b, f in zip(frames, feet, full):
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        dx = round((FRAME - (f[2] - f[0]) * scale) / 2 - f[0] * scale)
        dy = round(0 - f[1] * scale) if anchor == 'top' else round(FRAME - b[3] * scale)
        cell.alpha_composite(im.resize((w, h), Image.LANCZOS), (dx, dy))
        cells.append(cell)
    return cells


def ink_ratio(im: Image.Image) -> float:
    """Share of the sprite's solid pixels that read as ink black."""
    px = im.load()
    solid = ink = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 100:
                continue
            solid += 1
            if max(r, g, b) < 100:
                ink += 1
    return ink / solid if solid else 0.0


def qa_sheet(rows) -> None:
    cell = FRAME
    pad = 10
    label_h = 22
    sheet = Image.new('RGB', (cell * 4 + pad * 5, (cell + label_h) * len(rows) + pad), (24, 25, 28))
    d = ImageDraw.Draw(sheet)
    for row, (name, cells) in enumerate(rows):
        y = pad + row * (cell + label_h)
        d.text((pad, y + 4), name, fill=(244, 241, 234))
        for i, c in enumerate(cells):
            sheet.paste(c, (pad + i * (cell + pad), y + label_h), c)
    sheet.save(QA / 'act23-qa-minibosses.png')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (act, pattern, options) in SHEETS.items():
        src = ROOT / 'vibe_images' / 'archive' / act
        sheet = erase_watermark(Image.open(sorted(src.glob(pattern))[-1]))
        cells = [cut_cell(sheet, i, 2, 2, inset=8) for i in range(4)]
        if options.get('strip_line'):
            cells = [strip_ground_line(c) for c in cells]
        frames = [drop_small(clean_white_and_shadow(remove_white(c, 240)), 0.002) for c in cells]
        frames = [f.crop(f.getchannel('A').getbbox() or (0, 0, f.width, f.height)) for f in frames]
        cells = pack(frames, options.get('anchor', 'bottom'), options.get('margin', 0.97))
        for i, cell in enumerate(cells, start=1):
            # Both formats are written, and both are the new art. The 32 .png
            # files in this folder were left behind by
            # generate-acts23-minibosses.py, which wrote placeholder art to
            # `.png` as well as `.webp`; repacking only the webp left the png at
            # the old colour-block version. The game loads `.webp` only, so this
            # never affected a player - but a stale png sitting next to the real
            # art is a trap for the next person who opens the folder.
            cell.save(OUT / f'{name}-q-{i:02d}.png')
            cell.save(OUT / f'{name}-q-{i:02d}.webp', 'WEBP', quality=93, method=6)
        ratios = [ink_ratio(c) for c in cells]
        print(f'{name}: ink {min(ratios):.0%}..{max(ratios):.0%} '
              f'bytes {min((OUT / f"{name}-q-{i:02d}.webp").stat().st_size for i in range(1, 5)) // 1024}'
              f'..{max((OUT / f"{name}-q-{i:02d}.webp").stat().st_size for i in range(1, 5)) // 1024}KB')
        rows.append((name, cells))
    qa_sheet(rows)
    print(f'qa sheet: {QA / "act23-qa-minibosses.png"}')


if __name__ == '__main__':
    main()
