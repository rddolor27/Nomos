"""Golden vectors from the Python reference: python vectors.py OUT.json [--draws N] [--noise N]

Inputs come from Python's own seeded `random`, not from rng.py, so a bug in the code under test
cannot hide inside its own test data.
"""
import argparse
import json
import random
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

from noise import fade, fbm, value  # noqa: E402
from rng import mix, draw  # noqa: E402

EDGE_SEEDS = (0, 1, 0x7FFFFFFF, 0x80000000, 0xFFFFFFFF, 0x9E3779B9)
EDGE_KEYS = (0, 1, -1, -2, 0x7FFFFFFF, 0x80000000, -0x80000000, 0xFFFFFFFF, 1 << 32, (1 << 32) + 1,
             -(1 << 32) - 1, (1 << 52) - 1, -(1 << 52) + 1)


def key(r):
    kind = r.randrange(5)
    if kind == 0:
        return r.randint(-1000, 1000)
    if kind == 1:
        return r.getrandbits(32)
    if kind == 2:
        return -r.getrandbits(31)
    if kind == 3:
        return r.randint(-(1 << 52) + 1, (1 << 52) - 1)
    return r.choice(EDGE_KEYS)


def seed(r):
    return r.choice(EDGE_SEEDS) if r.randrange(10) == 0 else r.getrandbits(32)


def fold(values):
    h = mix(0x5EED)
    for v in values:
        h = mix(h ^ (v & 0xFFFFFFFF))
    return h


def draw_cases(r, n):
    cases = []
    for _ in range(n):
        s, stream = seed(r), r.choice((r.randrange(16), r.getrandbits(32), 0x100 + r.randrange(16)))
        keys = [key(r) for _ in range(r.randrange(7))]
        cases.append([s, stream, keys, draw(s, stream, *keys)])
    return cases


def noise_cases(r, n):
    cases = []
    for i in range(n):
        s, stream = seed(r), r.randrange(16)
        span = r.choice((64, 4096, 1 << 20))
        x, y = r.randint(-span, span), r.randint(-span, span)
        cell = r.choice((1, 2, 7, 8, 10, 16, 24, 32, 48, 64, 80, 96, 112, r.randint(1, 300)))
        if i % 2:
            octave = r.choice((0, 1, 2, 0x108, r.randrange(1 << 16)))
            cases.append(['value', s, stream, x, y, cell, octave, value(s, stream, x, y, cell, octave)])
        else:
            octaves = r.randint(1, 10)
            cases.append(['fbm', s, stream, x, y, cell, octaves, fbm(s, stream, x, y, cell, octaves)])
    return cases


def grid_fingerprint(s, stream, width, height, cell, octaves):
    """The access pattern of terrain.py: every cell of a grid, row by row, non-negative coordinates."""
    return fold(fbm(s, stream, x, y, cell, octaves) for y in range(height) for x in range(width))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('out')
    parser.add_argument('--draws', type=int, default=200_000)
    parser.add_argument('--noise', type=int, default=100_000)
    args = parser.parse_args()
    r = random.Random(0x9A11)
    start = time.perf_counter()
    draws = draw_cases(r, args.draws)
    t_draw = time.perf_counter() - start
    start = time.perf_counter()
    noises = noise_cases(r, args.noise)
    t_noise = time.perf_counter() - start
    grids = [[s, st, w, h, c, o, grid_fingerprint(s, st, w, h, c, o)]
             for s, st, w, h, c, o in ((0x5EED0001, 2, 96, 64, 24, 5), (0xC0FFEE42, 4, 96, 64, 32, 2),
                                       (0xDEADBEEF, 5, 96, 64, 16, 3), (0x00000000, 3, 96, 64, 8, 3))]
    payload = {
        'python': sys.version.split()[0],
        'fade': [fade(t) for t in range(1 << 15 | 1)],
        'draws': draws,
        'noise': noises,
        'grids': grids,
        'fold_draws': fold(c[3] for c in draws),
        'fold_noise': fold(c[-1] for c in noises),
        'seconds': {'draws': round(t_draw, 3), 'noise': round(t_noise, 3)},
    }
    Path(args.out).write_text(json.dumps(payload), encoding='utf-8')
    print(f"python {payload['python']}: {len(draws)} draws in {t_draw:.2f}s, {len(noises)} noise in {t_noise:.2f}s, "
          f"fold_draws {payload['fold_draws']:08x}, fold_noise {payload['fold_noise']:08x}")
    for g in grids:
        print('grid', ' '.join(f'{v:x}' if i in (0, 6) else str(v) for i, v in enumerate(g)))


if __name__ == '__main__':
    main()
