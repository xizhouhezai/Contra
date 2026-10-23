"""Cut the generated enemy weapon props into game-sized overlays.

Follows docs/game/design/asset-index.md section 18: only four enemies need a
separate weapon, the rest already have theirs painted into the sprite. The
caster is its own sheet because the shared sheet drew it with a gauntlet hand
gripping it, which cannot be cropped out of a 20 pixel prop.
"""

from pathlib import Path

from PIL import Image

from spritekit import contact, cut_cell, erase_watermark, export, prep

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'effects'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'enemy-weapons'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'


def sheet(pattern: str) -> Image.Image:
    return erase_watermark(Image.open(sorted(ARCHIVE.glob(pattern))[0]))


def main() -> None:
    a = sheet('fx-enemy-weapons-sheet_*.png')
    export(prep(cut_cell(a, 0)), 'pulse-gun', OUT, (24, 16))
    export(prep(cut_cell(a, 1)), 'launcher-pod', OUT, (28, 20))
    export(prep(cut_cell(a, 2)), 'scatter-cannon', OUT, (40, 24))
    export(prep(sheet('fx-enemy-caster_*.png')), 'caster', OUT, (20, 24))
    contact(OUT, QA / 'fx-qa-enemy-weapons.png', zoom=6, cols=4)


if __name__ == '__main__':
    main()
