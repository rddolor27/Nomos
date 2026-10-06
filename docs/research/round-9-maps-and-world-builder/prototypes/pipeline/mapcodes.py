"""What square map tiles must express on reference countries: python mapcodes.py [--seeds N]

- Coast: land cells beside water, sorted by whether place.py's 12-tile shore rule (4 sides,
  4 outer and 4 inner corners) can draw them; two opposite wet sides or three or more cannot.
- Rivers and roads: the share of diagonal steps, which a 4-bit (N/E/S/W) connection tile set
  cannot draw without turning each diagonal into two orthogonal steps.
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

from climate import CLIFFS, LAKE, OCEAN  # noqa: E402
from rng import mix  # noqa: E402
from world import generate  # noqa: E402

SIDES = ((0, -1), (1, 0), (0, 1), (-1, 0))
CORNERS = ((1, -1), (1, 1), (-1, 1), (-1, -1))


def classify(w, x, y):
    def wet(dx, dy):
        tx, ty = x + dx, y + dy
        return 0 <= tx < w.width and 0 <= ty < w.height and w.biome[ty * w.width + tx] in (OCEAN, LAKE)
    n, e, s, west = (wet(dx, dy) for dx, dy in SIDES)
    sides = n + e + s + west
    if sides >= 3 or (n and s) or (e and west):
        return 'unrepresentable'
    if sides == 2:
        return 'outer corner'
    if sides == 1:
        return 'side'
    if any(wet(dx, dy) for dx, dy in CORNERS):
        return 'inner corner'
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=10)
    args = parser.parse_args()
    coast, cliffs, steps = Counter(), 0, Counter()
    cells = rivers = roads = bridges = 0
    for k in range(args.seeds):
        w = generate(mix(0xA11CE + k))
        cells += w.width * w.height
        for i, b in enumerate(w.biome):
            if b in (OCEAN, LAKE):
                continue
            kind = classify(w, i % w.width, i // w.width)
            if kind:
                coast[kind] += 1
                cliffs += w.coast[i] == CLIFFS
        for i, r in enumerate(w.receiver):
            if w.river[i] and r >= 0 and (w.river[r] or w.biome[r] in (OCEAN, LAKE)):
                rivers += 1
                diagonal = (i % w.width != r % w.width) and (i // w.width != r // w.width)
                steps['river diagonal' if diagonal else 'river straight'] += 1
        for path in w.roads:
            for a, b in zip(path, path[1:]):
                roads += 1
                diagonal = (a % w.width != b % w.width) and (a // w.width != b // w.width)
                steps['road diagonal' if diagonal else 'road straight'] += 1
        bridges += len(w.bridges)
    total = sum(coast.values())
    print(f'{args.seeds} worlds, {cells} cells | coast land cells {total} ({cliffs} on cliff coasts)')
    for kind in ('side', 'outer corner', 'inner corner', 'unrepresentable'):
        print(f'  {kind:16s} {coast[kind]:5d}  {coast[kind] * 100 / total:5.1f}%')
    print(f'river links {rivers}: diagonal {steps["river diagonal"]} ({steps["river diagonal"] * 100 / rivers:.1f}%)')
    print(f'road steps {roads}: diagonal {steps["road diagonal"]} ({steps["road diagonal"] * 100 / roads:.1f}%) '
          f'| bridges {bridges}')


if __name__ == '__main__':
    main()
