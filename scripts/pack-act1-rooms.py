"""Cut the Act I room backgrounds to the 1920x540 room band.

Follows docs/game/design/stage-art-prompts-batch1.md section 4: three new
layers for roguelite rooms, opaque, at the room band aspect (32:9). The sheets
are generated at 21:9, so the middle band is cropped out - the prompts keep the
top and bottom quarters plain for exactly that reason.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'backgrounds-rooms'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
W, H = 1920, 540

SHEETS = {
    'bg-act1-warehouse-far': 'act1-bg-warehouse-far-v2_*.png',
    'bg-act1-corridor-mid': 'act1-bg-corridor-mid-v2_*.png',
    'bg-act1-scaffold-sky': 'act1-bg-scaffold-sky-v3_*.png',
}


def drop_watermark(im: Image.Image) -> Image.Image:
    """These sheets carry a paper band, so the corner mark is painted over with
    the band's own paper tone before the band gets cropped away."""
    im = im.convert('RGB')
    paper = im.getpixel((6, im.height - 6))
    ImageDraw.Draw(im).rectangle(
        (int(im.width * 0.72), int(im.height * 0.84), im.width - 1, im.height - 1), fill=paper)
    return im


def band(im: Image.Image) -> Image.Image:
    im = drop_watermark(im)
    height = round(im.width * H / W)
    top = max(0, (im.height - height) // 2)
    return im.crop((0, top, im.width, top + height)).resize((W, H), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name, pattern in SHEETS.items():
        im = band(Image.open(sorted(SRC.glob(pattern))[-1]))
        im.save(OUT / f'{name}.webp', 'WEBP', quality=92, method=6)
        tiles.append((name, im))
        print(f'{name}: {im.size}')

    zoom = 0.5
    tw, th = int(W * zoom), int(H * zoom)
    sheet = Image.new('RGB', (tw, (th + 20) * len(tiles)), (18, 22, 26))
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (0, i * (th + 20) + 20))
        draw.text((8, i * (th + 20) + 4), name, fill=(235, 235, 235))
    sheet.save(QA / 'act1-qa-rooms.png')


if __name__ == '__main__':
    main()