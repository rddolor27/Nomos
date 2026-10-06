"""Checks every sprite module against the conventions in README.md. Run: python tools/sprites/test_sprites.py"""
import importlib
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_all import CATEGORIES  # noqa: E402
from spritekit import PALETTE  # noqa: E402

NAME = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*(?:_[a-z0-9]+(?:-[a-z0-9]+)*)*$')
UNOUTLINED = ('terrain_', 'crop_')
OUTLINE = np.array(PALETTE['OUTLINE'])


def outline_is_only_edges(im):
    """OUTLINE pixels must touch transparency or another colour; a solid OUTLINE block would be a black fill."""
    a = np.array(im)
    is_outline = (a[:, :, 3] > 0) & (a[:, :, :3] == OUTLINE).all(axis=2)
    solid = np.zeros_like(is_outline)
    solid[1:-1, 1:-1] = (is_outline[1:-1, 1:-1] & is_outline[:-2, 1:-1] & is_outline[2:, 1:-1]
                         & is_outline[1:-1, :-2] & is_outline[1:-1, 2:])
    return not solid.any()


def check(name):
    sheet = importlib.import_module(name).build()
    problems = []
    if not sheet.frames:
        problems.append('no sprites')
    for frame_name, im, (ax, ay), _ in sheet.frames:
        if not NAME.match(frame_name):
            problems.append(f'{frame_name}: name breaks the naming convention')
        if not (0 <= ax < im.width and 0 <= ay < im.height):
            problems.append(f'{frame_name}: anchor ({ax},{ay}) outside {im.width}x{im.height}')
        if np.array(im)[:, :, 3].max() == 0:
            problems.append(f'{frame_name}: empty image')
        if not frame_name.startswith(UNOUTLINED) and not outline_is_only_edges(im):
            problems.append(f'{frame_name}: OUTLINE used as a fill')
    return len(sheet.frames), problems


def main():
    failed = False
    for name in CATEGORIES:
        try:
            count, problems = check(name)
        except ModuleNotFoundError:
            print(f'{name}: not written yet')
            continue
        status = 'ok' if not problems else f'{len(problems)} problem(s)'
        print(f'{name}: {count} sprites, {status}')
        for p in problems[:20]:
            print('  ' + p)
        failed |= bool(problems)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
