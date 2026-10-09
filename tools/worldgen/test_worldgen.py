"""Checks the world generator: the snow biome, the countries stage and the previews. Run:
python tools/worldgen/test_worldgen.py [--seeds N --size standard|large]

Each check returns a list of problems. World checks take one world each, and the runner feeds the
sample through them a world at a time, so a sweep of 100 large worlds never holds them all.
"""
import argparse
import sys
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import place  # noqa: E402
from climate import GRASSLAND, HILLS, HILLS_AT, SNOW, SNOW_BELOW, biomes  # noqa: E402
from grid import neighbours  # noqa: E402
from model import PlaceContext  # noqa: E402
from settle import habitability  # noqa: E402
from world import SIZES, generate  # noqa: E402

FIRST = 0x5EED0001
SNOWY = ('standard', 0x5EED000A)
SAMPLE = [('standard', FIRST), ('standard', FIRST + 1), ('standard', FIRST + 2), SNOWY, ('large', FIRST)]


@lru_cache(maxsize=8)
def world(size, seed):
    return generate(seed, *SIZES[size])


def lowland(temperature, hill=-1):
    """climate.biomes on a 5x3 all-land grid at elevation 200 and moisture 100, with hills at cell `hill`."""
    n = 15
    dry = bytearray(n)
    elevation = [400 if i == hill else 200 for i in range(n)]
    return list(biomes(1, 5, 3, elevation, bytearray(temperature), bytearray([100] * n), dry, dry, dry, dry))


def snow_on_cold_lowland():
    problems = []
    for t, cover in ((39, SNOW), (40, GRASSLAND)):
        want = [HILLS if i == 7 else cover for i in range(15)]
        got = lowland([t] * 15, hill=7)
        if got != want:
            problems.append(f'at temperature {t}: {got}, want {want}')
    return problems


def lone_snow_melts():
    got = lowland([30 if i == 7 else 100 for i in range(15)])
    return [f'a lone cold cell stayed snow: {got}'] if SNOW in got else []


def snow_is_uninhabitable():
    n = 81

    def scores(cover):
        return habitability(9, 9, bytearray([cover] * n), [200] * n, bytearray(n), bytearray(n), bytearray([30] * n),
                            bytearray([100] * n), [0] * n)
    problems = [f'snow scores {max(scores(SNOW))}'] if any(scores(SNOW)) else []
    if not any(scores(GRASSLAND)):
        problems.append('grassland scores 0 too, so this check proves nothing')
    return problems


def snow_places_build():
    ctx = PlaceContext(seed=1, name='snow', biome='snow', temperature=20, moisture=100, wonder='geyser')
    layout = place.build(ctx)
    return [] if isinstance(layout, place.Layout) else [f'place.build returned {type(layout).__name__}']


def snow_falls_on_a_cold_world():
    return [] if SNOW in world(*SNOWY).biome else [f'no snow on {SNOWY[0]} {SNOWY[1]:08x}']


def snow_lies_on_cold_lowland(w):
    """Snow is lowland, and it or a neighbour is colder than SNOW_BELOW, since despeckling lets a lone
    cell a little warmer join the snow around it."""
    nbrs = neighbours(w.width, w.height)
    return [f'snow at {i % w.width},{i // w.width}: elevation {w.elevation[i]}, '
            f'coldest nearby {min(w.temperature[k] for k in (i, *nbrs[i]))}'
            for i, b in enumerate(w.biome) if b == SNOW
            and (w.elevation[i] >= HILLS_AT or min(w.temperature[k] for k in (i, *nbrs[i])) >= SNOW_BELOW)]


CHECKS = [snow_on_cold_lowland, lone_snow_melts, snow_is_uninhabitable, snow_places_build, snow_falls_on_a_cold_world]
WORLD_CHECKS = [snow_lies_on_cold_lowland]


def main():
    parser = argparse.ArgumentParser(description='Check the world generator.')
    parser.add_argument('--seeds', type=int, help=f'check seeds {FIRST:08x} onward instead of the default sample')
    parser.add_argument('--size', choices=SIZES, default='standard', help='world size for --seeds')
    args = parser.parse_args()
    sample = [(args.size, FIRST + k) for k in range(args.seeds)] if args.seeds else SAMPLE
    results = [(check.__name__, check()) for check in CHECKS]
    found = {check.__name__: [] for check in WORLD_CHECKS}
    for size, seed in sample:
        w = world(size, seed)
        for check in WORLD_CHECKS:
            found[check.__name__] += [f'{size} {seed:08x}: {problem}' for problem in check(w)]
    failed = False
    for name, problems in results + list(found.items()):
        print(f'{name}: {"ok" if not problems else f"{len(problems)} problem(s)"}')
        for problem in problems[:20]:
            print('  ' + problem)
        failed |= bool(problems)
    print(f'{len(sample)} worlds checked')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
