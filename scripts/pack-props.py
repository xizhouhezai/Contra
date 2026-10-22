"""Cut generated prop sheets into transparent, game-sized assets."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'props'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'props'
OUT.mkdir(parents=True, exist_ok=True)


def cut_cell(sheet: Image.Image, panel: int, inset: int = 4) -> Image.Image:
    half_w, half_h = sheet.width // 2, sheet.height // 2
    col, row = panel % 2, panel // 2
    return sheet.crop((col * half_w + inset, row * half_h + inset, (col + 1) * half_w - inset, (row + 1) * half_h - inset))


def remove_white(im: Image.Image) -> Image.Image:
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    seen = bytearray(w * h)
    q = deque()

    def near_white(x, y):
        r, g, b = px[x, y]
        return min(r, g, b) >= 229 and max(r, g, b) - min(r, g, b) <= 12

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



def prep(cell: Image.Image) -> Image.Image:
    im = clean_white_and_shadow(drop_small(remove_white(cell)))
    bbox = im.getchannel('A').getbbox()
    return im.crop(bbox) if bbox else im


def export(im: Image.Image, name: str, size, stretch: bool = False, max_size=None) -> None:
    if size is None:
        im.thumbnail(max_size, Image.LANCZOS)
        art = im
        w, h = art.size
    else:
        w, h = size
        if stretch:
            art = im.resize((w, h), Image.LANCZOS)
        else:
            im.thumbnail((w, h), Image.LANCZOS)
            art = im
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(art, ((w - art.width) // 2, (h - art.height) // 2))
    out.save(OUT / f'{name}.png')
    out.save(OUT / f'{name}.webp', 'WEBP', quality=93, method=6)
    print(f'{name}: {(w, h)}, art {art.size}')

def main() -> None:
    p1 = Image.open(sorted(ARCHIVE.glob('props-obstacles-sheet_*.png'))[0])
    export(prep(cut_cell(p1, 0)), 'pillar', (24, 200), stretch=True)
    export(prep(cut_cell(p1, 1)), 'step', (120, 40), stretch=True)
    export(prep(cut_cell(p1, 2)), 'bouncewall', (24, 200), stretch=True)
    export(prep(cut_cell(p1, 3)), 'container', None, max_size=(256, 192))
    p2 = Image.open(sorted(ARCHIVE.glob('props-deco-sheet_*.png'))[0])
    export(prep(cut_cell(p2, 0)), 'deco-light', None, max_size=(64, 64))
    export(prep(cut_cell(p2, 1)), 'deco-steam', None, max_size=(96, 128))
    export(prep(cut_cell(p2, 2)), 'deco-chain', None, max_size=(64, 256))
    export(prep(cut_cell(p2, 3)), 'deco-panel', None, max_size=(128, 96))
    p3 = Image.open(sorted(ARCHIVE.glob('prop-broken-monitor_*.png'))[0])
    export(prep(p3), 'deco-monitor', None, max_size=(128, 128))
    p4 = Image.open(sorted(ARCHIVE.glob('prop-pipes_*.png'))[0])
    export(prep(p4), 'pipes', (192, 192))


if __name__ == '__main__':
    main()
