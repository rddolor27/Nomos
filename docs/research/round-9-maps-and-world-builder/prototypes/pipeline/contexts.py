"""Census of the PlaceContext records reference worlds hand to the place generator.

python contexts.py [--seeds N]: how often each art-relevant case occurs, such as cold sites
(no snow art), cliff coasts not facing south (only south-facing cliffs exist), hill and
mountain sites and wonders.
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

from climate import FARMLAND, LAKE, OCEAN  # noqa: E402
from rng import mix  # noqa: E402
from world import generate, place_contexts  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=10)
    args = parser.parse_args()
    c = Counter()
    land = cold_land = 0
    for k in range(args.seeds):
        w = generate(mix(0xA11CE + k))
        for i, b in enumerate(w.biome):
            if b not in (OCEAN, LAKE):
                land += 1
                cold_land += w.temperature[i] < 50
        for s in w.settlements:
            ring = [w.biome[(s.y + dy) * w.width + s.x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                    if (dx or dy) and 0 <= s.x + dx < w.width and 0 <= s.y + dy < w.height]
            c['settlement farmland neighbour'] += FARMLAND in ring
        for ctx in place_contexts(w):
            kind = 'wonder' if ctx.wonder else 'settlement'
            c[f'{kind} biome {ctx.biome}'] += 1
            c[kind] += 1
            c[f'{kind} cold <50'] += ctx.temperature < 50
            c[f'{kind} hills/mountain/peak'] += ctx.biome in ('hills', 'mountain', 'peak')
            c[f'{kind} sea'] += bool(ctx.sea)
            c[f'{kind} cliffs'] += ctx.coast == 'cliffs'
            c[f'{kind} cliffs without s'] += ctx.coast == 'cliffs' and 's' not in ctx.sea
            c[f'{kind} river'] += bool(ctx.river)
            c[f'{kind} roads>=3'] += len(ctx.roads) >= 3
            c[f'{kind} no road'] += not ctx.roads
            c[f'{kind} desert'] += ctx.biome == 'sand' or (ctx.moisture < 70 and ctx.temperature > 165)
            if ctx.wonder:
                c[f'wonder:{ctx.wonder}'] += 1
    print(f'{args.seeds} worlds | land cells {land}, temperature < 50: {cold_land} ({cold_land * 100 / land:.1f}%)')
    for kind in ('settlement', 'wonder'):
        n = c[kind]
        print(f'{kind}s {n}')
        for key in ('cold <50', 'hills/mountain/peak', 'sea', 'cliffs', 'cliffs without s', 'river', 'roads>=3',
                    'no road', 'desert', 'farmland neighbour'):
            v = c[f'{kind} {key}']
            print(f'  {key:20s} {v:4d}  {v * 100 / n:5.1f}%')
        print('  biomes:', ', '.join(f'{k.split(" biome ")[1]} {v}' for k, v in sorted(c.items())
                                     if k.startswith(f'{kind} biome ')))
    print('wonders:', ', '.join(f'{k[7:]} {v}' for k, v in sorted(c.items()) if k.startswith('wonder:')))


if __name__ == '__main__':
    main()
