"""Make a random world and draw it at every zoom: python tools/worldgen/generate.py [--seed HEX]

Without --seed every run makes a new world; the seed it prints rebuilds that world exactly. Writes
the Country and Region maps, the capital, the largest town and village, every natural wonder's
view, the capital in all four seasons and a line-up of the world's first people to
dist/worldgen/<seed>/.
"""
import argparse
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import mapdraw  # noqa: E402
import place  # noqa: E402
import placedraw  # noqa: E402
from looks import look_for  # noqa: E402
from rng import new_seed, parse_seed, seed_text  # noqa: E402
from world import DIST, generate, place_contexts, summary  # noqa: E402

LINEUP = (12, 4)
FACINGS = ('down', 'left', 'up', 'right')


def chosen(contexts):
    """The capital, the largest town and village, and every wonder."""
    settlements = [c for c in contexts if c.tier]
    picks = settlements[:1]
    for tier in ('town', 'village'):
        picks += [c for c in settlements if c.tier == tier][:1]
    return picks + [c for c in contexts if c.wonder]


def lineup(seed):
    """The world's first people, each row turned another way, so patterns show from the side and back."""
    cols, rows = LINEUP
    w, h = (cols * 24 + 8) // 16 + 1, (rows * 28 + 8) // 16 + 1
    tiles = [[('nature', f'terrain_grass_{(x * 7 + y * 13) % 5 % 3}') for x in range(w)] for y in range(h)]
    people = [place.Person(look_for(seed, r * cols + c), f'stand_{FACINGS[r]}', FACINGS[r], 'neutral', None, None,
                           16 + c * 24, 26 + r * 28) for r in range(rows) for c in range(cols)]
    return place.Layout(w, h, [], tiles, [], [], people)


def main():
    parser = argparse.ArgumentParser(description='Generate a random world and draw it at every zoom.')
    parser.add_argument('--seed', type=parse_seed, help='hex seed; a new one each run if left out')
    args = parser.parse_args()
    seed = new_seed() if args.seed is None else args.seed
    start = time.perf_counter()
    world = generate(seed)
    seconds = time.perf_counter() - start
    out = DIST / seed_text(seed)
    out.mkdir(parents=True, exist_ok=True)
    mapdraw.country_png(world, out / 'country.png')
    mapdraw.region_png(world, out / 'region.png')
    picks = chosen(place_contexts(world))
    for ctx in picks:
        placedraw.render(place.build(ctx), out / f'{ctx.name}.png')
    capital = picks[0]
    placedraw.seasons(place.build(capital), out / f'{capital.name}_seasons.png', capital.temperature)
    placedraw.render(lineup(seed), out / 'looks.png', scale=3)
    print(summary(world, seconds))
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
