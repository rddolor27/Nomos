"""Times place.build for place.py's demo contexts in CPython (reference timings, not browser).

Usage: python place_timing.py [repeats]
"""
import statistics
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'tools' / 'worldgen'))

import place  # noqa: E402


def main():
    repeats = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    for _, ctx in place.DEMOS:
        place.build(ctx)
    print(f'python {sys.version.split()[0]}, 1 warm-up, {repeats} repeats')
    for name, ctx in place.DEMOS:
        ms = []
        for _ in range(repeats):
            start = time.perf_counter()
            layout = place.build(ctx)
            ms.append((time.perf_counter() - start) * 1000)
        print(f'{name:20s} {layout.width}x{layout.height}  {statistics.median(ms):8.1f} ms [{min(ms):.1f}-{max(ms):.1f}]'
              f'  standing {len(layout.standing)}, people {len(layout.people)}')


if __name__ == '__main__':
    main()
