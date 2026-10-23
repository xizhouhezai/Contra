"""Cut the generated warning / projectile / muzzle sheets into game-sized assets.

Deliverables follow docs/game/design/asset-index.md sections 13-15:
effects/ gets the telegraph indicators and muzzle flashes, projectiles/ the
enemy bullets. muzzle-white is derived from muzzle-blue because a white flash
painted on a white sheet has nothing left to key once the background is removed.
aim-line and charge-spark are drawn instead: a 64x4 strip and a 32px point of
light lose everything that makes them readable when a soft painted glow is
downscaled that far, and an unreadable telegraph is a fairness bug.
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

from spritekit import contact, cut_cell, erase_watermark, export, prep, tint

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'vibe_images' / 'archive' / 'effects'
ASSETS = ROOT / 'docs' / 'game' / 'requirements' / 'assets'
EFFECTS = ASSETS / 'effects'
PROJECTILES = ASSETS / 'projectiles'
QA = ROOT / 'vibe_images' / 'archive' / '_qa'
DARK = (26, 32, 38)
VERMILION = (214, 69, 44)
MAGENTA = (255, 45, 85)
HOT = (255, 226, 214)
SCALE = 8


def sheet(pattern: str) -> Image.Image:
    return erase_watermark(Image.open(sorted(ARCHIVE.glob(pattern))[0]))


def hot_white(im: Image.Image) -> Image.Image:
    out = Image.new('RGBA', im.size, (255, 250, 240, 0))
    out.putalpha(im.getchannel('A'))
    return out


def make_aim_line(w: int = 64, h: int = 4) -> Image.Image:
    """Horizontal telegraph line: dim tail, vermillion core, hot head."""
    W, H = w * SCALE, h * SCALE
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    mid = H // 2
    d.rectangle((0, mid - SCALE, W, mid + SCALE), fill=VERMILION + (64,))
    d.rectangle((0, mid - SCALE // 2, W, mid + SCALE // 2), fill=VERMILION + (235,))
    d.rectangle((0, mid, W, mid), fill=HOT + (255,))
    head = W - 5 * SCALE
    d.polygon([(head - 4 * SCALE, mid - 2 * SCALE), (head + 2 * SCALE, mid), (head - 4 * SCALE, mid + 2 * SCALE)],
              fill=VERMILION + (255,))
    d.polygon([(head - 2 * SCALE, mid - SCALE), (head + SCALE, mid), (head - 2 * SCALE, mid + SCALE)], fill=HOT + (255,))

    fade = Image.new('L', (W, 1))
    fade.putdata([clamp(255 * min(1.0, 0.28 + x / (W * 0.55))) for x in range(W)])
    a = ImageChops.multiply(im.getchannel('A'), fade.resize((W, H)))
    im.putalpha(a)
    return im.resize((w, h), Image.LANCZOS)


def make_charge_spark(size: int = 32) -> Image.Image:
    """Impact point where a spike will erupt: hot core, four vermillion blades."""
    S = size * SCALE
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = S // 2
    d.ellipse((c - 12 * SCALE, c - 12 * SCALE, c + 12 * SCALE, c + 12 * SCALE), fill=VERMILION + (48,))
    d.ellipse((c - 7 * SCALE, c - 7 * SCALE, c + 7 * SCALE, c + 7 * SCALE), fill=VERMILION + (120,))
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.polygon([(c - dy * SCALE, c - dx * SCALE), (c + dx * 15 * SCALE, c + dy * 15 * SCALE),
                   (c + dy * SCALE, c + dx * SCALE)], fill=VERMILION + (255,))
    d.ellipse((c - 3 * SCALE, c - 3 * SCALE, c + 3 * SCALE, c + 3 * SCALE), fill=HOT + (255,))
    return im.resize((size, size), Image.LANCZOS)


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def main() -> None:
    warn = sheet('fx-warnings-sheet_*.png')
    export(make_aim_line(), 'aim-line', EFFECTS, (64, 4))
    export(tint(prep(cut_cell(warn, 1)), VERMILION, alpha_gain=1.6, hot=0.88), 'ground-warn', EFFECTS, (64, 16), stretch=True)
    export(tint(prep(cut_cell(warn, 2)), VERMILION), 'charge-aura', EFFECTS, (48, 48))
    export(make_charge_spark(), 'charge-spark', EFFECTS, (32, 32))

    bullets_a = sheet('fx-bullets-sheet-a_*.png')
    export(prep(cut_cell(bullets_a, 0)), 'enemy-pulse', PROJECTILES, (64, 64))
    export(prep(cut_cell(bullets_a, 1)), 'enemy-pellet', PROJECTILES, (64, 64))
    export(prep(cut_cell(bullets_a, 2)), 'enemy-homing', PROJECTILES, (64, 64))
    export(prep(cut_cell(bullets_a, 3)), 'enemy-lobbed', PROJECTILES, (64, 64))

    bullets_b = sheet('fx-bullets-sheet-b_*.png')
    export(prep(cut_cell(bullets_b, 0, cols=3, rows=1), punch_white=False), 'enemy-mirror', PROJECTILES, (64, 64))
    export(prep(cut_cell(bullets_b, 1, cols=3, rows=1)), 'enemy-spike', PROJECTILES, (64, 64))
    export(prep(cut_cell(bullets_b, 2, cols=3, rows=1)), 'enemy-heavy', PROJECTILES, (64, 64))

    muzzles = sheet('fx-muzzles-sheet_*.png')
    # punch_white stays off: the white-hot core of a flash is the sprite, not a hole.
    blue = prep(cut_cell(muzzles, 0), punch_white=False)
    export(blue, 'muzzle-blue', EFFECTS, (32, 32))
    export(prep(cut_cell(muzzles, 1), punch_white=False), 'muzzle-purple', EFFECTS, (32, 32))
    export(prep(cut_cell(muzzles, 2), punch_white=False), 'muzzle-orange', EFFECTS, (32, 32))
    export(hot_white(blue), 'muzzle-white', EFFECTS, (32, 32))

    impacts = sheet('fx-impacts-sheet_*.png')
    export(prep(cut_cell(impacts, 0)), 'impact-small', EFFECTS, (32, 32))
    export(prep(cut_cell(impacts, 1)), 'impact-med', EFFECTS, (64, 64))
    export(prep(cut_cell(impacts, 2)), 'impact-pierce', EFFECTS, (48, 48))
    export(tint(prep(cut_cell(impacts, 3)), MAGENTA, hot=0.9), 'impact-laser', EFFECTS, (48, 48))
    export(prep(sheet('fx-impact-big_*.png')), 'impact-big', EFFECTS, (128, 128))

    contact(EFFECTS, QA / 'fx-qa-effects.png')
    contact(PROJECTILES, QA / 'fx-qa-projectiles.png')


if __name__ == '__main__':
    main()
