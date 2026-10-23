"""Cut the generated boss attack sheets into one sprite per move.

Follows docs/game/design/asset-index.md section 17: every move gets its own
silhouette so the player can read the attack from the shape alone. Sizes are
bounding boxes, so the wide beam, lance and ground vines keep their aspect
instead of being stretched.
"""

from pathlib import Path

from PIL import Image, ImageDraw

from spritekit import contact, cut_cell, erase_watermark, export, prep

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'effects'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'boss-effects'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
VERMILION = (214, 69, 44)


def sheet(pattern: str) -> Image.Image:
    return erase_watermark(Image.open(sorted(ARCHIVE.glob(pattern))[0]))


def make_beam(w: int = 128, h: int = 32) -> Image.Image:
    """Drawn, not cut: a painted beam's pale halo is near-white, so the flood
    fill that removes the background eats straight through into its core."""
    S = 4
    W, H = w * S, h * S
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    mid = H // 2
    d.ellipse((0, mid - int(H * 0.3), W, mid + int(H * 0.3)), fill=VERMILION + (60,))
    d.ellipse((int(W * 0.01), mid - int(H * 0.19), int(W * 0.99), mid + int(H * 0.19)), fill=VERMILION + (240,))
    d.ellipse((int(W * 0.05), mid - int(H * 0.08), int(W * 0.95), mid + int(H * 0.08)), fill=(255, 240, 235, 255))
    r = int(H * 0.2)
    cx = int(W * 0.94)
    d.ellipse((cx - r, mid - r, cx + r, mid + r), fill=(255, 255, 255, 255))
    return im.resize((w, h), Image.LANCZOS)


def main() -> None:
    a = sheet('fx-boss-sheet-a_*.png')
    b = sheet('fx-boss-sheet-b_*.png')

    # punch_white stays off for the glow sprites: their white-hot core is the
    # sprite, and their pale halo is reachable by the flood fill.
    export(make_beam(), 'boss-beam', OUT, (128, 32))
    export(prep(sheet('fx-boss-chain_*.png')), 'boss-chain', OUT, (48, 48))
    export(prep(cut_cell(a, 2), punch_white=False), 'boss-sweep', OUT, (128, 128))
    export(prep(cut_cell(a, 3), punch_white=False), 'boss-lance', OUT, (96, 32))
    export(prep(cut_cell(b, 0), punch_white=False), 'boss-swarm', OUT, (96, 96))
    export(prep(cut_cell(b, 1)), 'boss-vines', OUT, (128, 64))
    export(prep(cut_cell(b, 2), punch_white=False), 'boss-burst', OUT, (128, 128))
    export(prep(cut_cell(b, 3), punch_white=False), 'boss-scythe', OUT, (160, 160))

    contact(OUT, QA / 'fx-qa-boss-effects.png', zoom=2)


if __name__ == '__main__':
    main()
