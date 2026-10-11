"""Checks the M2.7 street mockup art against the sprite conventions, so a pick can move into tools/sprites unchanged.
Run: python docs/mockups/generator/test_street.py"""
import sys
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from street_art import CELL, CHEWS, GOODS, HOLDS, MARGIN, Carrier  # noqa: E402  (also puts tools/sprites on the path)
from street_buildings import BY_GOOD, PIPS, Draper, FuelStore, MarketStall  # noqa: E402
import characters as ch  # noqa: E402
import spritekit as sk  # noqa: E402
from test_sprites import NAME, outline_is_only_edges  # noqa: E402


def sprites():
    """Every new sprite under the name the plan's asset list would give it."""
    named = {f'carry_{g.name}': g.image() for g in GOODS}
    for good in MarketStall.GOODS:
        named[f'shop_market-stall_{good}'] = MarketStall(good, BY_GOOD[good], icon_sign=True).image()
    for shop, stem in ((Draper, 'shop_draper'), (FuelStore, 'shop_fuel-store')):
        for look in shop.LOOKS:
            named[f'{stem}-{look}'] = shop(look).image()
            named[f'{stem}-{look}_snow'] = shop(look).image(snow=True)
    for pip in PIPS:
        for level in range(4):
            named[f'pip_stock-{pip.key}_{level}'] = pip.image(level)
    for chew in CHEWS:
        for facing in ('down', 'left', 'right'):
            for frame in (0, 1):
                named[f'face_chew-{chew.key}_{frame}_{facing}'] = chew.image(facing, frame)
    return named


def test_every_sprite_keeps_the_conventions():
    sheet = sk.Sheet('street')
    for name, im in sprites().items():
        assert NAME.match(name), name
        sheet.add(name, im)                       # rejects an off-palette colour or any partial alpha
        assert outline_is_only_edges(im), f'{name}: OUTLINE used as a fill'
        assert np.array(im)[:, :, 3].max() > 0, f'{name}: empty'


SIZES = (('carry_', (CELL, CELL)), ('pip_', (CELL, CELL)), ('face_', (ch.W, ch.H)),
         ('shop_market-stall', (48, 48)), ('shop_', (64, 48)))


def test_sizes_follow_the_asset_list():
    for name, im in sprites().items():
        want = next(size for prefix, size in SIZES if name.startswith(prefix))
        assert im.size == want, f'{name}: {im.size}, want {want}'


def test_snow_changes_only_what_a_roof_changes():
    for shop in (Draper, FuelStore):
        for look in shop.LOOKS:
            plain, snow = np.array(shop(look).image()), np.array(shop(look).image(snow=True))
            changed = (plain != snow).any(axis=2)
            assert changed.any(), f'{shop.NAME} look {look} has no snow'
            assert changed[40:].sum() < changed[:40].sum(), 'snow reached below the roof'


def test_a_carried_good_never_covers_the_eyes_while_walking():
    """The item's cell must leave every resting face's pixels alone, so no good reads as a beak or a mouth."""
    for hold in HOLDS:
        for facing in ('down', 'left', 'right'):
            for pose in ('stand', 'walk_0', 'walk_1'):
                x0, y0 = hold.cell(facing, pose)
                dx, dy = ch.face_offset(pose, facing)
                for eyes in ch.EYES:
                    expression = 'neutral' if eyes == 'round' else f'neutral-{eyes}'
                    face = np.array(ch.face(expression, facing))[:, :, 3] > 0
                    face = np.roll(np.roll(face, dy, axis=0), dx, axis=1)
                    for good in GOODS:
                        item = np.array(good.image())[:, :, 3] > 0
                        for r in range(CELL):
                            for c in range(CELL):
                                y, x = y0 + r, x0 + c
                                assert not (item[r, c] and 0 <= y < ch.H and 0 <= x < ch.W and face[y, x]), \
                                    f'hold {hold.key} {facing} {pose} {eyes} {good.name} covers the face at {x},{y}'


def test_the_chewing_faces_differ_by_frame_and_stay_on_the_body():
    for chew in CHEWS:
        for facing in ('down', 'left', 'right'):
            first, second = (np.array(chew.image(facing, f)) for f in (0, 1))
            assert (first != second).any(), f'chew {chew.key} {facing}: the frames match'
            body = np.array(ch.body_fill('stand', facing))[:, :, 3] > 0
            for im in (first, second):
                assert not ((im[:, :, 3] > 0) & ~body).any(), f'chew {chew.key} {facing} leaves the body'


def test_the_carrier_frames_are_one_canvas():
    sizes = {Carrier(h).frame(f, p, g, hold).size for h in sk.BODY_HUES for f in ('down', 'left', 'right', 'up')
             for p in ('stand', 'walk_0', 'walk_1') for g in GOODS[:2] for hold in HOLDS[:1]}
    assert len(sizes) == 1 and MARGIN[0] > 0


def main():
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
    for name, fn in tests:
        fn()
        print(f'ok  {name}')
    print(f'{len(sprites())} sprites, {len(tests)} checks passed')


if __name__ == '__main__':
    main()
