"""Times tools/worldgen/noise.py's fbm over a 96x64 grid and dumps the values for noise_port.mjs.

Usage: python noise_ratio.py  (writes noise.json)
"""
import json
import statistics
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'tools' / 'worldgen'))

from noise import fbm  # noqa: E402

SEED, STREAM, W, H, CELL, OCTAVES = 0x5EED0100, 2, 96, 64, 24, 5


def grid():
    return [fbm(SEED, STREAM, x * 16, y * 16, CELL * 16, OCTAVES) for y in range(H) for x in range(W)]


def main():
    grid()
    ms = []
    for _ in range(9):
        start = time.perf_counter()
        values = grid()
        ms.append((time.perf_counter() - start) * 1000)
    out = {'python': sys.version.split()[0], 'seed': SEED, 'stream': STREAM, 'w': W, 'h': H, 'cell': CELL * 16,
           'octaves': OCTAVES, 'values': values, 'ms': {'median': statistics.median(ms), 'min': min(ms), 'max': max(ms)}}
    (HERE / 'noise.json').write_text(json.dumps(out), encoding='utf-8')
    print(f'python {out["python"]}: fbm 96x64 x {OCTAVES} octaves {out["ms"]["median"]:.2f} ms [{min(ms):.2f}-{max(ms):.2f}]')


if __name__ == '__main__':
    main()
