"""Place-layer timings and stored sizes: python places.py [--seeds N]

Builds every settlement and wonder of N reference worlds with place.build, times each build,
and gzips a compact binary of each layout (terrain kind bytes plus 6 bytes per sprite or person)
to see whether storing a visited place costs more than regenerating it.
"""
import argparse
import statistics
import struct
import sys
import time
import zlib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))
sys.path.insert(0, str(ROOT / 'tools' / 'sprites'))

import place  # noqa: E402
from rng import mix  # noqa: E402
from world import generate, place_contexts  # noqa: E402


def packed(layout):
    kinds, names = {}, {}
    terrain = bytes(kinds.setdefault(k, len(kinds)) for row in layout.terrain for k in row)
    sprites = b''.join(struct.pack('<HHH', names.setdefault((s.category, s.name), len(names)), s.x, s.y)
                       for s in layout.ground + layout.standing)
    people = b''.join(struct.pack('<HHH', p.look, p.x, p.y) for p in layout.people)
    return terrain + sprites + people


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=3)
    args = parser.parse_args()
    times, sizes, counts = defaultdict(list), defaultdict(list), defaultdict(list)
    for k in range(args.seeds):
        world = generate(mix(0xA11CE + k))
        for ctx in place_contexts(world):
            group = f'wonder {ctx.wonder}' if ctx.wonder else ctx.tier
            group = 'wonder' if ctx.wonder else group
            t0 = time.perf_counter()
            layout = place.build(ctx)
            times[group].append(time.perf_counter() - t0)
            blob = packed(layout)
            sizes[group].append((len(blob), len(zlib.compress(blob, 9))))
            counts[group].append((len(layout.standing) + len(layout.ground), len(layout.people)))
    print(f'python {sys.version.split()[0]} | {args.seeds} worlds | place.build median [min-max] ms, raw / zlib-9 bytes')
    for group in ('capital', 'city', 'town', 'village', 'hamlet', 'wonder'):
        if group not in times:
            continue
        t = times[group]
        raw = statistics.median(s[0] for s in sizes[group])
        gz = statistics.median(s[1] for s in sizes[group])
        sprites = statistics.median(c[0] for c in counts[group])
        people = statistics.median(c[1] for c in counts[group])
        print(f'  {group:8s} n={len(t):3d}  {statistics.median(t) * 1000:7.0f} [{min(t) * 1000:.0f}-{max(t) * 1000:.0f}] ms  '
              f'{raw:6.0f} / {gz:5.0f} B  sprites {sprites:.0f} people {people:.0f}')


if __name__ == '__main__':
    main()
