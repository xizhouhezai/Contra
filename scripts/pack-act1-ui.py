"""Cut the three Act I gameplay UI sheets.

Follows docs/game/design/stage-art-prompts-batch1.md section 7: one sheet per
asset, with the sub-frames laid out as the doc specifies (three directions in a
row, four icons in a 2x2, one route panel).
"""

from pathlib import Path

from PIL import Image

from spritekit import cut_cell, erase_watermark, key_backdrop, prep

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'act1'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'ui'

WAVES = ((128, 64), (128, 64), (128, 64))
ICONS = (64, 64)


def fit(im: Image.Image, size, stretch: bool = False) -> Image.Image:
    w, h = size
    art = im.resize((w, h), Image.LANCZOS) if stretch else im
    if not stretch:
        art.thumbnail((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(art, ((w - art.width) // 2, (h - art.height) // 2))
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    sheet = erase_watermark(Image.open(sorted(SRC.glob('act1-ui-wave-warning_*.png'))[-1]))
    strip = Image.new('RGBA', (sum(w for w, _ in WAVES), 64), (0, 0, 0, 0))
    x = 0
    for i, size in enumerate(WAVES):
        # stretched: the doc's bars are 2:1 and the painted plates are upright
        cell = fit(prep(cut_cell(sheet, i, 3, 1, inset=10), punch_white=False), size, stretch=True)
        strip.alpha_composite(cell, (x, 0))
        x += size[0]
    strip.save(OUT / 'ui-wave-warning.webp', 'WEBP', quality=93, method=6)
    print(f'ui-wave-warning: {strip.size}')

    map_sheet = erase_watermark(Image.open(sorted(SRC.glob('act1-ui-route-map_*.png'))[-1]))
    w, h = map_sheet.size
    band = map_sheet.crop((0, (h - w // 2) // 2, w, (h + w // 2) // 2))
    # the panel is a torn paper sheet on a painted paper backdrop, so it is
    # keyed on the corner colour rather than on white
    panel = key_backdrop(band)
    fit(panel, (256, 128)).save(OUT / 'ui-route-map.webp', 'WEBP', quality=93, method=6)
    print('ui-route-map: (256, 128)')

    icons = erase_watermark(Image.open(sorted(SRC.glob('act1-ui-room-icons_*.png'))[-1]))
    out = Image.new('RGBA', (ICONS[0] * 2, ICONS[1] * 2), (0, 0, 0, 0))
    for i in range(4):
        cell = fit(prep(cut_cell(icons, i, 2, 2, inset=10), punch_white=False), ICONS)
        out.alpha_composite(cell, ((i % 2) * ICONS[0], (i // 2) * ICONS[1]))
    out.save(OUT / 'ui-room-type-icon.webp', 'WEBP', quality=93, method=6)
    print(f'ui-room-type-icon: {out.size}')


if __name__ == '__main__':
    main()