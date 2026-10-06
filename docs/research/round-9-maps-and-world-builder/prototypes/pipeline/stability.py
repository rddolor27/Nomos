"""Two consistency questions on reference worlds: python stability.py [--seeds N]

1. How many settlements sit within 10% or 20% of a tier threshold (500, 5,000, 50,000)? Under
   M7 growth those flip tier, and place.py then builds a different-sized, different layout.
2. How large is the country when its arrays are stored in a save instead of regenerated?
"""
import argparse
import gzip
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

from model import LANDMARKS, TIERS, WONDERS  # noqa: E402
from rng import mix  # noqa: E402
from world import generate  # noqa: E402

THRESHOLDS = (500, 5_000, 50_000)


def varint(n):
    out = bytearray()
    n = (n << 1) ^ (n >> 63)
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def stored(w):
    cols = struct.pack(f'<{len(w.elevation)}h', *w.elevation) + bytes(w.biome) + bytes(w.temperature)
    cols += bytes(w.moisture) + bytes(w.river) + bytes(w.coast)
    cols += struct.pack(f'<{len(w.receiver)}h', *w.receiver)
    roads = b''.join(varint(len(p)) + b''.join(varint(c - prev) for prev, c in zip([0] + p, p)) for p in w.roads)
    things = b''.join(struct.pack('<HBBBI', s.id, s.x, s.y, TIERS.index(s.tier), s.population) +
                      bytes(LANDMARKS.index(k) for k in s.landmarks) for s in w.settlements)
    things += bytes(v for p in w.wonders for v in (WONDERS.index(p.kind), p.x, p.y))
    things += bytes(v for p in w.landmarks for v in (LANDMARKS.index(p.kind), p.x, p.y))
    return cols, roads, things


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=20)
    args = parser.parse_args()
    near10 = near20 = total = 0
    sizes = []
    for k in range(args.seeds):
        w = generate(mix(0xA11CE + k))
        for s in w.settlements[1:]:
            total += 1
            near10 += any(abs(s.population - t) * 10 <= t for t in THRESHOLDS)
            near20 += any(abs(s.population - t) * 5 <= t for t in THRESHOLDS)
        cols, roads, things = stored(w)
        sizes.append((len(cols), len(roads), len(things), len(gzip.compress(cols + roads + things, 9))))
    print(f'{args.seeds} worlds, {total} non-capital settlements')
    print(f'  within 10% of a tier threshold: {near10} ({near10 * 100 / total:.1f}%)')
    print(f'  within 20% of a tier threshold: {near20} ({near20 * 100 / total:.1f}%)')
    raw = sorted(a + b + c for a, b, c, _ in sizes)
    gz = sorted(d for *_, d in sizes)
    print(f'stored country: raw {raw[len(raw) // 2]:,} B median (columns {sizes[0][0]:,} B), '
          f'gzip-9 {gz[len(gz) // 2]:,} B median [{gz[0]:,}-{gz[-1]:,}]')


if __name__ == '__main__':
    main()
