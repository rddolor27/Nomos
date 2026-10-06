"""Zoom consistency on reference worlds: python consistency.py [--seeds N]

Does each built place show what the Country and Region views promise for it? Landmark icons,
road sides and river sides from the PlaceContext are checked against the built Site. The place
is built exactly as place.build does, keeping the Site so its road entries are visible.
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))
sys.path.insert(0, str(ROOT / 'tools' / 'sprites'))

import place  # noqa: E402
from rng import mix  # noqa: E402
from world import generate, place_contexts  # noqa: E402

MARK_SPRITES = {'lighthouse': 'landmark_lighthouse_0', 'windmill': 'landmark_windmill_0',
                'fountain': 'landmark_fountain_0'}


def built_site(ctx):
    w, h = place.VISTA_SIZE if ctx.wonder else place.SIZES[ctx.tier]
    site = place.Site(ctx, w, h)
    place.lay_ground(site)
    if ctx.wonder:
        place.build_vista(site)
    else:
        place.build_settlement(site)
    return site


def edge_water(site, side):
    cells = {'n': [(x, 0) for x in range(site.w)], 's': [(x, site.h - 1) for x in range(site.w)],
             'w': [(0, y) for y in range(site.h)], 'e': [(site.w - 1, y) for y in range(site.h)]}[side]
    return any(site.kind[y][x] == 'water' and not site.sea[y][x] for x, y in cells)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=3)
    args = parser.parse_args()
    c = Counter()
    missing = Counter()
    for k in range(args.seeds):
        w = generate(mix(0xA11CE + k))
        for ctx in place_contexts(w):
            if ctx.wonder:
                continue
            site = built_site(ctx)
            names = {s.name for s in site.standing}
            for mark in ctx.landmarks:
                c['landmarks promised'] += 1
                if MARK_SPRITES.get(mark, f'landmark_{mark}') in names:
                    c['landmarks drawn'] += 1
                else:
                    missing[mark] += 1
            promised = {s for s in ctx.roads if s not in ctx.sea}
            entered = {side for side, _ in site.entries}
            c['road sides promised'] += len(promised)
            c['road sides entered'] += len(promised & entered)
            for side in ctx.river:
                if side in ctx.sea:
                    c['river sides into the sea band'] += 1
                    continue
                c['river sides promised'] += 1
                c['river sides drawn'] += edge_water(site, side)
    print(f'{args.seeds} worlds')
    for what in ('landmarks', 'road sides', 'river sides'):
        p = c[f'{what} promised']
        d = c[f'{what} drawn'] if what != 'road sides' else c['road sides entered']
        print(f'  {what:12s} {d}/{p} shown ({d * 100 / max(1, p):.1f}%)')
    print('  landmarks missing by kind:', dict(missing))
    print(f"  river sides that are also sea sides (not checked): {c['river sides into the sea band']}")


if __name__ == '__main__':
    main()
