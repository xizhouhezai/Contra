"""Cut one act's room backgrounds to the 1920x540 room band.

Follows docs/game/design/stage-art-prompts-batch1.md section 4 for act I and
stage-art-prompts-batch23.md section 3 for acts II / III: new layers for
roguelite rooms, opaque, at the room band aspect (32:9). The sheets are
generated at 21:9, so the middle band is cropped out - the prompts keep the top
and bottom quarters plain for exactly that reason.

Act I keeps the original `backgrounds-rooms/` folder and file names. Acts II and
III write to their own folders, and their output names are mapped explicitly
instead of reusing the source stem: the act II server hall sheet is generated as
`act2-bg-server-hall-v2` but reads as the `far` layer in-game (batch 2/3
section 7.1 calls this out), so a `-far` lookup would miss it if the raw name
leaked through.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
ASSETS = ROOT / 'docs' / 'game' / 'requirements' / 'assets'
W, H = 1920, 540

SHEETS = {
    1: {
        'bg-act1-warehouse-far': 'act1-bg-warehouse-far-v2_*.png',
        'bg-act1-corridor-mid': 'act1-bg-corridor-mid-v2_*.png',
        'bg-act1-scaffold-sky': 'act1-bg-scaffold-sky-v3_*.png',
    },
    2: {
        'bg-act2-server-hall-far': 'act2-bg-server-hall-v2_*.png',
        'bg-act2-coolant-corridor-mid': 'act2-bg-coolant-corridor-mid_*.png',
        'bg-act2-forge-hall-far': 'act2-bg-forge-hall-far_*.png',
    },
    3: {
        'bg-act3-collapsing-archive-far': 'act3-bg-collapsing-archive-far_*.png',
        'bg-act3-mirror-gallery-mid': 'act3-bg-mirror-gallery-mid_*.png',
        'bg-act3-shaft-void-sky': 'act3-bg-shaft-void-sky_*.png',
    },
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
    parser = argparse.ArgumentParser(description='Pack one act of the room backgrounds.')
    parser.add_argument('--act', type=int, choices=(1, 2, 3), default=1,
                        help='act whose raw sheets to pack (default 1)')
    args = parser.parse_args()
    act = args.act

    src = ROOT / 'vibe_images' / 'archive' / f'act{act}'
    out = ASSETS / ('backgrounds-rooms' if act == 1 else f'backgrounds-rooms-act{act}')
    out.mkdir(parents=True, exist_ok=True)
    qa = QA / f'act{act}-qa-rooms.png'

    tiles = []
    for name, pattern in SHEETS[act].items():
        im = band(Image.open(sorted(src.glob(pattern))[-1]))
        im.save(out / f'{name}.webp', 'WEBP', quality=92, method=6)
        tiles.append((name, im))
        print(f'{name}: {im.size}')

    zoom = 0.5
    tw, th = int(W * zoom), int(H * zoom)
    sheet = Image.new('RGB', (tw, (th + 20) * len(tiles)), (18, 22, 26))
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (0, i * (th + 20) + 20))
        draw.text((8, i * (th + 20) + 4), name, fill=(235, 235, 235))
    sheet.save(qa)


if __name__ == '__main__':
    main()
