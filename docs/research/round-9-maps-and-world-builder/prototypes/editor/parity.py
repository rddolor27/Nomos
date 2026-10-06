"""Dumps random grids run through place.py's tidy_water and tile_for, for parity.mjs to compare.

Usage: python parity.py [grids]  (writes parity.json beside this file)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORLDGEN = HERE.parents[4] / 'tools' / 'worldgen'
sys.path.insert(0, str(WORLDGEN))

import place  # noqa: E402
from model import PlaceContext  # noqa: E402
from rng import draw  # noqa: E402

KINDS = ['water', 'grass', 'meadow', 'sand', 'path', 'paving', 'soil']
LAND = ['grass', 'grass', 'grass', 'meadow', 'meadow', 'sand', 'sand', 'path', 'paving', 'soil']


def grid_case(n):
    w, h = 32 + n % 3 * 8, 20 + n % 2 * 8
    wet = 15 + draw(7, 1, n) % 40
    site = place.Site(PlaceContext(seed=n, name='t', biome='grassland', temperature=128, moisture=128), w, h)
    for y in range(h):
        for x in range(w):
            blob = draw(7, 2, n, x // 3, y // 3) % 100 < wet
            speck = draw(7, 3, n, x, y) % 100 < 12
            site.kind[y][x] = 'water' if blob != speck else LAND[draw(7, 4, n, x, y) % len(LAND)]
    before = [KINDS.index(site.kind[y][x]) for y in range(h) for x in range(w)]
    place.tidy_water(site)
    after = [KINDS.index(site.kind[y][x]) for y in range(h) for x in range(w)]
    tiles = ['/'.join(place.tile_for(site, x, y)) for y in range(h) for x in range(w)]
    return {'w': w, 'h': h, 'before': before, 'after': after, 'tiles': tiles}


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    cases = [grid_case(n) for n in range(count)]
    (HERE / 'parity.json').write_text(json.dumps(cases), encoding='utf-8')
    flips = sum(a != b for c in cases for a, b in zip(c['before'], c['after']))
    print(f'{count} grids, {sum(len(c["before"]) for c in cases)} cells, {flips} flooded by tidy_water')


if __name__ == '__main__':
    main()
