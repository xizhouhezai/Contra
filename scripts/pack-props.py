"""Cut generated prop sheets into transparent, game-sized assets."""

from pathlib import Path

from PIL import Image

from spritekit import cut_cell, export, prep

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'props'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'props'


def main() -> None:
    p1 = Image.open(sorted(ARCHIVE.glob('props-obstacles-sheet_*.png'))[0])
    export(prep(cut_cell(p1, 0)), 'pillar', OUT, (24, 200), stretch=True)
    export(prep(cut_cell(p1, 1)), 'step', OUT, (120, 40), stretch=True)
    export(prep(cut_cell(p1, 2)), 'bouncewall', OUT, (24, 200), stretch=True)
    export(prep(cut_cell(p1, 3)), 'container', OUT, max_size=(256, 192))
    p2 = Image.open(sorted(ARCHIVE.glob('props-deco-sheet_*.png'))[0])
    export(prep(cut_cell(p2, 0)), 'deco-light', OUT, max_size=(64, 64))
    export(prep(cut_cell(p2, 1)), 'deco-steam', OUT, max_size=(96, 128))
    export(prep(cut_cell(p2, 2)), 'deco-chain', OUT, max_size=(64, 256))
    export(prep(cut_cell(p2, 3)), 'deco-panel', OUT, max_size=(128, 96))
    p3 = Image.open(sorted(ARCHIVE.glob('prop-broken-monitor_*.png'))[0])
    export(prep(p3), 'deco-monitor', OUT, max_size=(128, 128))
    p4 = Image.open(sorted(ARCHIVE.glob('prop-pipes_*.png'))[0])
    export(prep(p4), 'pipes', OUT, (192, 192))


if __name__ == '__main__':
    main()
