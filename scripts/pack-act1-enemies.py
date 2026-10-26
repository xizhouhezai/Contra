"""Cut the Act I enemy sheets into 128x128 idle/hit frames.

Follows docs/game/design/stage-art-prompts-batch1.md sections 1.3 and 3:
two frames per enemy, transparent webp, bottom-aligned like the existing
enemies-packed files so the game's collision box sits on the feet.

Two traps in this batch:
- the frames cannot be split by column. The drone's scan cone and the hit
  laser reach across the middle of the sheet, so a column cut slices them.
  Sprites are grouped by connected component instead.
- punch_white hollows a riso sprite whose body panels are paper white, so it
  stays off; the scrapper needs it on to lose the grey shadow under its feet.
"""

import json
from collections import deque
from pathlib import Path

from PIL import Image

from spritekit import contact, drop_small, erase_watermark, remove_white

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'enemies-packed'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
FRAME = 128

SHEETS = {
    'scrapper': ('act1-scrapper-sheet-v3_*.png', {'shadow': True, 'box': 'content'}),
    'crane-hook': ('act1-cranehook-sheet-v2_*.png', {'box': 'content', 'anchor': 'top'}),
    'steam-vent': ('act1-steamvent-sheet-v3_*.png', {'clear': 250, 'box': 'content'}),
    'audit-drone': ('act1-auditdrone-sheet-v3_*.png', {'anchor': 'top'}),
}


def components(alpha: Image.Image):
    w, h = alpha.size
    px = alpha.load()
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
    return comps


def split_frames(rgba: Image.Image) -> list:
    """Group the sheet's parts into the left and right sprite."""
    comps = components(rgba.getchannel('A'))
    comps.sort(key=len, reverse=True)
    if len(comps) < 2:
        return [rgba, rgba]
    anchors = sorted((sum(x for x, _ in c) / len(c) for c in comps[:2]))
    groups = [[], []]
    for comp in comps:
        cx = sum(x for x, _ in comp) / len(comp)
        side = 0 if abs(cx - anchors[0]) <= abs(cx - anchors[1]) else 1
        groups[side].append(comp)

    frames = []
    for group in groups:
        canvas = Image.new('RGBA', rgba.size, (0, 0, 0, 0))
        src = rgba.load()
        dst = canvas.load()
        for comp in group:
            for x, y in comp:
                dst[x, y] = src[x, y]
        frames.append(canvas.crop(canvas.getbbox()))
    return frames


def bbox(im: Image.Image):
    return im.getbbox() or (0, 0, im.width, im.height)


def body_box(im: Image.Image):
    """Bounding box of the creature itself, ignoring its own effects.

    The drone's scan cone and its hit laser are separate parts of the same
    frame; letting them into the box makes the drone shrink or drift between
    frames, which reads as a size pop on every hit.
    """
    comps = components(im.getchannel('A'))
    if not comps:
        return (0, 0, im.width, im.height)
    big = max(comps, key=len)
    xs = [x for x, _ in big]
    ys = [y for _, y in big]
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def pack_pair(frames, anchor: str = 'bottom', box: str = 'body') -> list:
    """One scale and one anchor for both frames, so idle and hit never pop.

    Which box drives it depends on the enemy. Riso frames whose effect grows
    (a vent's steam column, the impact splash) align on the whole content so
    the base stays on the baseline; the drone aligns on its body, because its
    scan cone and laser would otherwise shrink the drone to fit them.
    """
    boxes = [bbox(f) if box == 'content' else body_box(f) for f in frames]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes))
    uw, uh = union[2] - union[0], union[3] - union[1]
    scale = min(FRAME / uw, FRAME / uh)
    cells = []
    if box == 'content':
        # Frames are already cropped tight, so the only thing that needs to
        # line up is the baseline: share the scale, then sit each frame on it.
        for im in frames:
            w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
            cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
            cell.alpha_composite(im.resize((w, h), Image.LANCZOS),
                                 ((FRAME - w) // 2, 0 if anchor == 'top' else FRAME - h))
            cells.append(cell)
        return cells

    ox = (FRAME - uw * scale) / 2
    oy = 0 if anchor == 'top' else FRAME - uh * scale
    for im, b in zip(frames, boxes):
        w = max(1, round(im.width * scale))
        h = max(1, round(im.height * scale))
        cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        cell.alpha_composite(im.resize((w, h), Image.LANCZOS),
                             (round(ox - b[0] * scale), round(oy - b[1] * scale)))
        cells.append(cell)
    return cells


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}

    for name, (pattern, options) in SHEETS.items():
        sheet = erase_watermark(Image.open(sorted(SRC.glob(pattern))[-1]))
        rgba = drop_small(remove_white(sheet, options.get('clear', 229)))
        frames = split_frames(rgba)

        if options.get('shadow'):
            from spritekit import clean_white_and_shadow
            frames = [clean_white_and_shadow(f) for f in frames]
            frames = [f.crop(f.getchannel('A').getbbox()) for f in frames]

        slots = {}
        for slot, cell in zip(('idle-00', 'hit-00'),
                              pack_pair(frames, options.get('anchor', 'bottom'), options.get('box', 'body'))):
            filename = f'{name}-{slot}.webp'
            cell.save(OUT / filename, 'WEBP', quality=92, method=6)
            slots[slot] = filename
        manifest[name] = slots
        print(f'{name}: {", ".join(slots.values())}')

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    contact(OUT, QA / 'act1-qa-enemies.png', zoom=2, cols=6)


if __name__ == '__main__':
    main()