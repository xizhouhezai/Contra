"""Shared cutout helpers for turning generated white-background sheets into
transparent, game-sized webp/png assets.

Used by the prop, effect, projectile and weapon packing scripts, so the flood
fill, speck cleanup and export sizing live in one place.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# The generator's corner mark sits in the bottom-right of every sheet. Painting
# that box white before the flood fill stops the grey glyphs from becoming art.
WATERMARK_BOX = (0.74, 0.92)


def clamp(v: float, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, int(round(v))))


def cut_cell(sheet: Image.Image, index: int, cols: int = 2, rows: int = 2, inset: int = 4) -> Image.Image:
    cw, ch = sheet.width // cols, sheet.height // rows
    col, row = index % cols, index // cols
    return sheet.crop((col * cw + inset, row * ch + inset, (col + 1) * cw - inset, (row + 1) * ch - inset))


def erase_watermark(im: Image.Image) -> Image.Image:
    """Whiten the generator's corner mark; call once on the whole sheet."""
    out = im.convert('RGB')
    fx, fy = WATERMARK_BOX
    ImageDraw.Draw(out).rectangle(
        (int(out.width * fx), int(out.height * fy), out.width - 1, out.height - 1),
        fill=(255, 255, 255),
    )
    return out


def remove_white(im: Image.Image, threshold: int = 229) -> Image.Image:
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    seen = bytearray(w * h)
    q = deque()

    def near_white(x, y):
        r, g, b = px[x, y]
        return min(r, g, b) >= threshold and max(r, g, b) - min(r, g, b) <= 12

    def seed(x, y):
        i = y * w + x
        if not seen[i] and near_white(x, y):
            seen[i] = 1
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)
    while q:
        cx, cy = q.popleft()
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not seen[j] and near_white(nx, ny):
                    seen[j] = 1
                    q.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                mp[x, y] = 255
    alpha = ImageChops.invert(mask).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.45))
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def drop_small(im: Image.Image, fraction: float = 0.003) -> Image.Image:
    a = im.getchannel('A')
    w, h = im.size
    px = a.load()
    seen = bytearray(w * h)
    comps = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y] == 0:
                continue
            q = deque([(x, y)])
            seen[i] = 1
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny] > 0:
                            seen[j] = 1
                            q.append((nx, ny))
            comps.append(pts)
    if not comps:
        return im
    floor = max(len(c) for c in comps) * fraction
    keep = Image.new('L', (w, h), 0)
    kp = keep.load()
    for comp in comps:
        if len(comp) >= floor:
            for x, y in comp:
                kp[x, y] = 255
    im.putalpha(ImageChops.multiply(a, keep))
    return im


def clean_white_and_shadow(im: Image.Image) -> Image.Image:
    """Drop enclosed pure-white holes and the soft shadow touching the cutout."""
    rgb = im.convert('RGB')
    a = im.getchannel('A')
    px = rgb.load()
    ap = a.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if not ap[x, y]:
                continue
            r, g, b = px[x, y]
            if min(r, g, b) >= 248 and max(r, g, b) - min(r, g, b) <= 6:
                ap[x, y] = 0
    candidate = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if ap[x, y]:
                r, g, b = px[x, y]
                v = (r + g + b) / 3
                if v >= 150 and max(r, g, b) - min(r, g, b) <= 22:
                    candidate[y * w + x] = 1
    seen = bytearray(w * h)
    q = deque()
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if not candidate[i] or seen[i]:
                continue
            edge = x == 0 or y == 0 or x == w - 1 or y == h - 1
            if not edge:
                edge = not ap[x - 1, y] or not ap[x + 1, y] or not ap[x, y - 1] or not ap[x, y + 1]
            if edge:
                seen[i] = 1
                q.append((x, y))
    while q:
        cx, cy = q.popleft()
        ap[cx, cy] = 0
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if candidate[j] and not seen[j]:
                    seen[j] = 1
                    q.append((nx, ny))
    im.putalpha(a)
    return im


def tint(im: Image.Image, color, alpha_gain: float = 1.0, hot: float = 0.72) -> Image.Image:
    """Force a flat warning hue while keeping the hot white core readable.

    The generator paints glow as pale pink, which reads as grey once it is
    downscaled to a 4 pixel telegraph strip. Pixels brighter than `hot` ramp to
    white-hot, everything else becomes `color`.
    """
    rgba = im.convert('RGBA')
    mix = rgba.convert('L').point(lambda v: clamp((v - hot * 255) * 255 / (255 * (1 - hot))))
    base = Image.new('RGB', rgba.size, color)
    out = Image.composite(Image.new('RGB', rgba.size, (255, 255, 255)), base, mix)
    a = rgba.getchannel('A')
    if alpha_gain != 1.0:
        a = a.point(lambda v: clamp(v * alpha_gain))
    out.putalpha(a)
    return out.convert('RGBA')


def contact(folder: Path, qa_path: Path, zoom: int = 4, cols: int = 4, dark=(26, 32, 38)) -> Path:
    """Tile a folder's webps on a dark stage so alpha edges and halos show."""
    files = sorted(folder.glob('*.webp'))
    pad, label = 12, 24
    cells = []
    for f in files:
        im = Image.open(f).convert('RGBA')
        cells.append((f.stem, im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)))
    if not cells:
        return qa_path
    rows = -(-len(cells) // cols)
    cw = max(c.width for _, c in cells) + pad * 2
    ch = max(c.height for _, c in cells) + pad * 2 + label
    sheet = Image.new('RGB', (cols * cw, rows * ch), dark)
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.paste(im, (x + (cw - im.width) // 2, y + pad), im)
        draw.text((x + pad, y + ch - label), name, fill=(220, 220, 220))
    sheet.save(qa_path)
    return qa_path


def prep(cell: Image.Image, punch_white: bool = True, clear: int = 229) -> Image.Image:
    """Cut a cell out of its white background.

    punch_white is off for sprites that are legitimately white filled, such as
    the mirror enemy's orb, where the enclosed white is the body itself.
    A higher `clear` keeps pale, thinly outlined art (steam, light cones) whole:
    at the default the flood leaks through anti-aliased outlines and shreds it.
    """
    im = drop_small(remove_white(cell, clear))
    if punch_white:
        im = clean_white_and_shadow(im)
    bbox = im.getchannel('A').getbbox()
    return im.crop(bbox) if bbox else im


def export(im: Image.Image, name: str, out_dir: Path, size=None, stretch: bool = False, max_size=None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    if size is None:
        im.thumbnail(max_size, Image.LANCZOS)
        art = im
        w, h = art.size
    else:
        w, h = size
        art = im.resize((w, h), Image.LANCZOS) if stretch else im
        if not stretch:
            art.thumbnail((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(art, ((w - art.width) // 2, (h - art.height) // 2))
    out.save(out_dir / f'{name}.png')
    out.save(out_dir / f'{name}.webp', 'WEBP', quality=93, method=6)
    print(f'{name}: {(w, h)}, art {art.size}')
