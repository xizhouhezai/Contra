#!/usr/bin/env python3
"""Build the per-stage 1920x1080 four-layer parallax sets.

Follows docs/game/design/asset-index.md section 11: every stage gets its own
sky / far / mid / near set so the backdrop alone identifies where the player
is. Keying and tiling come from bgkit, so these layers match the default
backdrop in behaviour; the key threshold is read off each raw image because a
dawn fog bank, a rust corridor and a high-altitude sky are not the same white.

Raw panoramas live in vibe_images/archive/scenes/ as <stage>-<layer>_*.png.
"""
from pathlib import Path
from PIL import Image, ImageDraw

from bgkit import H, W, auto_key, fit, key_white, save_webp, seam_delta, wrap, wrap_vertical

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'vibe_images' / 'archive' / 'scenes'
OUT = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'scenes'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
PAPER = (244, 241, 234)
GAME_ALPHA = {'sky': 0.72, 'far': 0.58, 'mid': 0.44, 'near': 0.30}
BAND = {'sky': 120, 'far': 120, 'mid': 80, 'near': 80}
LAYERS = ('sky', 'far', 'mid', 'near')
STAGES = ('stage-01', 'stage-02', 'stage-03', 'stage-05', 'stage-06', 'stage-07',
          'stage-09', 'stage-10', 'stage-11', 'stage-04', 'stage-08', 'stage-12')
# Stage 11 is a vertical scroller: its layers repeat on y, not x.
VERTICAL = {'stage-11'}


def raw(stage: str, layer: str) -> Path:
    """Newest generation wins: a re-run of one layer supersedes the earlier take."""
    key = stage.replace('-', '')
    hits = sorted(SRC.glob(f'{key}-{layer}_*.png'), reverse=True)
    if not hits:
        raise FileNotFoundError(f'{stage} {layer}: no raw under {SRC}')
    return hits[0]


def ready(stage: str) -> bool:
    key = stage.replace('-', '')
    return all(sorted(SRC.glob(f'{key}-{layer}_*.png')) for layer in LAYERS)


def build(stage: str) -> dict:
    vertical = stage in VERTICAL
    layers = {}
    for layer in LAYERS:
        im = fit(Image.open(raw(stage, layer)))
        if layer != 'sky':
            im = key_white(im, *auto_key(im))
        im = wrap_vertical(im, BAND[layer]) if vertical else wrap(im, BAND[layer])
        layers[layer] = im
        save_webp(im, OUT / stage / f'{layer}.webp')
        joined = im.transpose(Image.TRANSPOSE) if vertical else im
        print(f'{stage}/{layer}: seam={seam_delta(joined):.2f}')
    return layers


def composite(layers: dict, alpha: bool) -> Image.Image:
    out = Image.new('RGBA', (W, H), PAPER + (255,))
    for layer in LAYERS:
        im = layers[layer]
        if alpha:
            im = im.copy()
            factor = GAME_ALPHA[layer]
            im.putalpha(im.getchannel('A').point(lambda v: int(v * factor)))
        out.alpha_composite(im)
    return out.convert('RGB')


def main():
    done = [stage for stage in STAGES if ready(stage)]
    built = {}
    for stage in done:
        layers = build(stage)
        composite(layers, alpha=False).save(QA / f'scene-{stage}-full.png')
        composite(layers, alpha=True).save(QA / f'scene-{stage}-game.png')
        built[stage] = composite(layers, alpha=True).resize((W // 3, H // 3))

    if not built:
        print('no stage raws found, nothing to build')
        return
    first = next(iter(built.values()))
    sheet = Image.new('RGB', (first.width, first.height * len(built) + 10 * len(built)), (18, 22, 26))
    draw = ImageDraw.Draw(sheet)
    for i, (stage, im) in enumerate(built.items()):
        sheet.paste(im, (0, i * (im.height + 10)))
        draw.text((8, i * (im.height + 10) + 4), stage, fill=(240, 240, 240))
    sheet.save(QA / 'scene-identity.png')
    print(f'QA: {QA / "scene-identity.png"}')


if __name__ == '__main__':
    main()
