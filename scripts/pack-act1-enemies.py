"""Cut the Act I enemy sheets into 128x128 idle/hit frames.

Follows docs/game/design/stage-art-prompts-batch1.md sections 1.3 and 3:
two frames per enemy, transparent webp, bottom-aligned like the existing
enemies-packed files so the game's collision box sits on the feet.

punch_white stays off: these are riso-print sprites whose body panels are
paper white, so the enclosed-white cleanup would hollow the creature out.
"""

import json
from pathlib import Path

from PIL import Image

from spritekit import contact, erase_watermark, prep

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'enemies-packed'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
FRAME = 128

SHEETS = {
    'scrapper': 'act1-scrapper-sheet-v2_*.png',
    'crane-hook': 'act1-cranehook-sheet_*.png',
    'steam-vent': 'act1-steamvent-sheet-v2_*.png',
    'audit-drone': 'act1-auditdrone-sheet_*.png',
}


def place(im: Image.Image) -> Image.Image:
    scale = min(FRAME / im.width, FRAME / im.height)
    w = max(1, round(im.width * scale))
    h = max(1, round(im.height * scale))
    cell = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    cell.alpha_composite(im.resize((w, h), Image.LANCZOS), ((FRAME - w) // 2, FRAME - h))
    return cell


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}

    for name, pattern in SHEETS.items():
        path = sorted(SRC.glob(pattern))[-1]
        sheet = erase_watermark(Image.open(path))
        half = sheet.width // 2
        frames = {}
        for slot, box in (('idle-00', (0, 0, half, sheet.height)), ('hit-00', (half, 0, sheet.width, sheet.height))):
            cell = place(prep(sheet.crop(box), punch_white=False))
            filename = f'{name}-{slot}.webp'
            cell.save(OUT / filename, 'WEBP', quality=92, method=6)
            frames[slot] = filename
        manifest[name] = frames
        print(f'{name}: {", ".join(frames.values())}')

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    contact(OUT, QA / 'act1-qa-enemies.png', zoom=2, cols=6)


if __name__ == '__main__':
    main()
