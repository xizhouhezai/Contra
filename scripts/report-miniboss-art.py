#!/usr/bin/env python
"""Report which mid-boss slots still hold placeholder art.

The eight acts II/III mid-bosses were generated procedurally by
scripts/generate-acts23-minibosses.py because this environment has no image
API. Their behaviour, HP and drops are final; only the drawings are stand-ins,
and replacing one is dropping a new 360x360 webp under the same filename.

That makes "is this slot still a placeholder" a question the repository should
be able to answer without eyeballing 32 files. Size separates them cleanly
today - act I's painted frames are 31-41KB, the drawn placeholders 2-5KB - but
size alone is a weak oracle: real art could compress small. So this reports the
signal and the spec's own floor rather than silently deciding.

Usage:
    python scripts/report-miniboss-art.py           # summary table
    python scripts/report-miniboss-art.py --strict  # exit 1 while placeholders remain

Exit code is 0 unless --strict is given, because a placeholder is a known,
documented state (docs/game/design/stage-art-prompts-batch23.md section 11),
not a build failure.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs' / 'game' / 'requirements' / 'assets' / 'minibosses'

# Every mid-boss id the rules layer knows, in campaign order.
# Source: packages/game-core/src/data/minibosses.ts MINIBOSS_IDS.
MIDBOSSES = [
    ('miniboss-dock-foreman', 1, 'act I'),
    ('miniboss-pipe-warden', 2, 'act I'),
    ('miniboss-scaffold-crane', 3, 'act I'),
    ('miniboss-audit-clerk', 4, 'act I'),
    ('miniboss-coolant-overseer', 5, 'act II'),
    ('miniboss-array-warden', 6, 'act II'),
    ('miniboss-forge-master', 7, 'act II'),
    ('miniboss-redline-clerk', 8, 'act II'),
    ('miniboss-archive-keeper', 9, 'act III'),
    ('miniboss-mirror-lieutenant', 10, 'act III'),
    ('miniboss-shaft-gaoler', 11, 'act III'),
    ('miniboss-emergence-herald', 12, 'act III'),
]

FRAMES = 4
EXPECTED_SIZE = (360, 360)

# Below this, a frame cannot be painted art at 360x360: the act I frames are
# 31-41KB and the drawn placeholders 2-5KB, so 12KB sits in the empty middle.
PLACEHOLDER_CEILING = 12 * 1024


def audit(midboss_id: str) -> tuple:
    """(frames found, bytes per frame, colours per frame) for one mid-boss."""
    sizes = []
    colours = []
    found = 0
    for q in range(1, FRAMES + 1):
        path = ART / f'{midboss_id}-q-{q:02d}.webp'
        if not path.is_file():
            sizes.append(0)
            colours.append(0)
            continue
        found += 1
        sizes.append(path.stat().st_size)
        with Image.open(path) as im:
            if im.size != EXPECTED_SIZE:
                return found, sizes, colours
            # A flat-shaded placeholder has very few distinct colours; painted
            # art has hundreds. Reported as a second, size-independent signal.
            rgb = im.convert('RGB')
            colours.append(len(rgb.getcolors(maxcolors=1 << 16) or []))
    return found, sizes, colours


def main() -> int:
    strict = '--strict' in sys.argv

    if not ART.is_dir():
        print(f'missing folder: {ART}')
        return 1

    print(f'{"mid-boss":30s} {"act":7s} {"frames":6s} {"avg":>7s} {"colours":>8s}  verdict')
    placeholder_count = 0
    problem_count = 0

    for midboss_id, stage, act in MIDBOSSES:
        found, sizes, colours = audit(midboss_id)
        if found != FRAMES:
            print(f'{midboss_id:30s} {act:7s} {found}/{FRAMES:2d}  MISSING FRAMES')
            problem_count += 1
            continue

        avg = sum(sizes) / len(sizes)
        avg_colours = sum(colours) / len(colours)
        if avg < PLACEHOLDER_CEILING:
            verdict = 'placeholder'
            placeholder_count += 1
        else:
            verdict = 'painted'
        print(
            f'{midboss_id:30s} {act:7s} {found:2d}/{FRAMES:2d}  '
            f'{avg / 1024:5.1f}KB {avg_colours:8.0f}  {verdict}'
        )

    print()
    print(f'{placeholder_count} of {len(MIDBOSSES)} mid-bosses still on placeholder art')
    if problem_count:
        print(f'{problem_count} with structural problems (missing frames or wrong size)')

    if problem_count:
        return 1
    if strict and placeholder_count:
        print('FAIL: --strict given but placeholders remain '
              '(prompts: docs/game/design/stage-art-prompts-batch23.md section 11)')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
