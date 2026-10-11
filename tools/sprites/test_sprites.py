"""Checks every sprite module against the conventions in README.md, then M2.7's street sprites against their plan.
Run: python tools/sprites/test_sprites.py"""
import functools
import importlib
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import characters as ch  # noqa: E402
from build_all import CATEGORIES  # noqa: E402
from spritekit import BODY_HUES, PALETTE, body_hue  # noqa: E402

NAME = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*(?:_[a-z0-9]+(?:-[a-z0-9]+)*)*$')
UNOUTLINED = ('terrain_', 'crop_')
OUTLINE = np.array(PALETTE['OUTLINE'])
FACINGS = ('down', 'left', 'right')
RESTING_FACES = ('neutral', 'blink', 'neutral-dot', 'blink-dot', 'neutral-tall', 'blink-tall', 'neutral-wide', 'blink-wide')
PAD = 4        # room round the 18x22 body canvas for an item held out past its edge
ITEM_PX = 8    # the plan's carried items are 8x8
CARRIED = ('bread', 'vegetables', 'fish', 'milk', 'cloth', 'tools', 'fuel')


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


# ---------------------------------------------------------------------------- M2.7: life on the street
@functools.cache
def characters_sheet():
    return ch.build(holds=True)


def body_canvas(im, dx=0, dy=0):
    """An image's opaque pixels on a blank body canvas padded by PAD all round, moved by (dx, dy)."""
    out = np.zeros((ch.H + 2 * PAD, ch.W + 2 * PAD), bool)
    out[PAD + dy:PAD + dy + im.height, PAD + dx:PAD + dx + im.width] = np.array(im)[:, :, 3] > 0
    return out


def hold_problems():
    """The carried item's hip hold: shared by down and left, mirrored for right, absent facing up, clear of every
    resting face, and written to the body frames that carry one."""
    problems = []
    for pose in ('stand', 'walk_0', 'walk_1'):
        left = ch.hold_point(pose, 'left')
        if ch.hold_point(pose, 'up') is not None:
            problems.append(f'{pose} facing up holds an item')
        if ch.hold_point(pose, 'down') != left or ch.hold_point(pose, 'right') != [ch.W - ITEM_PX - left[0], left[1]]:
            problems.append(f'{pose}: the hold is not shared by down and left and mirrored for right')
        for facing in FACINGS:
            x, y = ch.hold_point(pose, facing)
            cell = np.zeros((ch.H + 2 * PAD, ch.W + 2 * PAD), bool)
            cell[PAD + y:PAD + y + ITEM_PX, PAD + x:PAD + x + ITEM_PX] = True
            for resting in RESTING_FACES:
                if (cell & body_canvas(ch.face(resting, facing), *ch.face_offset(pose, facing))).any():
                    problems.append(f'{pose} {facing}: the item cell covers the {resting} face')
    if ch.eat_points('down')[0] != ch.hold_point('stand', 'down') or ch.eat_points('up') is not None:
        problems.append('eating does not start at the hold, or shows an item facing up')
    bodies = {name: meta for name, _, _, meta in characters_sheet().frames if name.startswith('blob_')}
    for name, meta in bodies.items():
        pose = f"walk_{meta['frame']}" if meta['pose'] == 'walk' else meta['pose']
        if {k: meta[k] for k in ('hold', 'eat') if k in meta} != ch.hold_fields(pose, meta['facing']):
            problems.append(f'{name}: its hold fields are not the pose and facing')
    if sum('hold' in meta for meta in bodies.values()) != 9 * len(BODY_HUES):
        problems.append('a hold belongs to the stand and the two walk frames of down, left and right, on every hue')
    return problems


def chew_problems():
    """Two eating faces for each of down, left and right: the resting round eyes kept calm and open, a mouth that
    differs between the frames, and nothing off the standing body."""
    problems = []
    frames = {name: im for name, im, _, _ in characters_sheet().frames}
    for facing in FACINGS:
        shown = np.array(ch.body_fill('stand', facing))[:, :, 3] > 0
        eyes = np.array(frames[f'face_neutral_{facing}'])
        faces = [np.array(frames[f'face_chew_{n}_{facing}']) for n in (0, 1)]
        if (faces[0] == faces[1]).all():
            problems.append(f'chew {facing}: the two frames match')
        for n, face in enumerate(faces):
            if not (face[eyes[:, :, 3] > 0] == eyes[eyes[:, :, 3] > 0]).all():
                problems.append(f'chew_{n} {facing}: the resting round eyes are not kept')
            if ((face[:, :, 3] > 0) & ~shown).any():
                problems.append(f'chew_{n} {facing}: leaves the standing body')
    return problems


def carry_problems():
    """Each carried good is one 8x8 frame for all six hues, which no hue recolours, and the stock pips show 0 to 3 lit
    beads."""
    problems = []
    frames = {name: im for name, im, _, _ in importlib.import_module('icons').build().frames}
    carried = sorted(name for name in frames if name.startswith('carry_'))
    if carried != sorted(f'carry_{good}' for good in CARRIED):
        problems.append(f'carried goods are {carried}, not one frame for each of {CARRIED}')
    for good in CARRIED:
        item = frames[f'carry_{good}']
        if item.size != (ITEM_PX, ITEM_PX):
            problems.append(f'carry_{good} is {item.size[0]}x{item.size[1]}, not {ITEM_PX}x{ITEM_PX}')
        for hue in BODY_HUES:
            if not (np.array(body_hue(item, hue)) == np.array(item)).all():
                problems.append(f'carry_{good}: the {hue} hue recolours it')
    for level in range(4):
        pip = np.array(frames[f'pip_stock_{level}'])
        lit = ((pip[:, :, :3] == PALETTE['WHITE']).all(axis=2) & (pip[:, :, 3] > 0)).sum()
        if pip.shape[:2] != (ITEM_PX, ITEM_PX) or lit != level:
            problems.append(f'pip_stock_{level}: {lit} lit beads on a {pip.shape[1]}x{pip.shape[0]} frame')
    return problems


STREET_CHECKS = [('street holds', hold_problems), ('street chewing faces', chew_problems),
                 ('street carried goods', carry_problems)]


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
    for label, street_check in STREET_CHECKS:
        problems = street_check()
        status = 'ok' if not problems else f'{len(problems)} problem(s)'
        print(f'{label}: {status}')
        for p in problems[:20]:
            print('  ' + p)
        failed |= bool(problems)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
