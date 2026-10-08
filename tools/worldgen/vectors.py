"""Write the kernel test vectors for the TypeScript port: python tools/worldgen/vectors.py [--check]

Runs rng.py and noise.py over fixed inputs, with negative keys and coordinates and values at and above
2**31 on purpose, and writes packages/sim-core/test/fixtures/kernels.json. With --check it compares that
file with a fresh run instead of writing it, and exits 1 on any difference.
"""
import argparse
import json
import sys
from itertools import product
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from noise import fade, fbm, value  # noqa: E402
from rng import below, draw, mix  # noqa: E402

ROOT = HERE.parents[1]
FIXTURE = ROOT / 'packages' / 'sim-core' / 'test' / 'fixtures' / 'kernels.json'

MIX_INPUTS = (0, 1, 2, 12345678, 0x7FFFFFFF, 0x80000000, 0x9E3779B9, 0xFFFFFFFF)
SEEDS = (0, 1, 42, 0x09F02FFE, 0x7FFFFFFF, 0x80000000, 0xFFFFFFFF)
STREAMS = (0, 1, 12, 255)
KEYS = ((), (0,), (-1,), (7, -37), (2**31, 5, 9), (0xFFFFFFFF, 1, 2, 3))
BELOW_N = (1, 2, 3, 1000, 65536, 0x7FFFFFFF)
FADE_INPUTS = (*range(0, 32769, 1024), 1, 32767)


def build():
    """Every kernel's cases, in the order the plan lists their inputs."""
    return {
        'mix': [[x, mix(x)] for x in MIX_INPUTS],
        'draw': [
            {'seed': seed, 'stream': stream, 'keys': keys, 'out': draw(seed, stream, *keys)}
            for seed, stream, keys in product(SEEDS, STREAMS, KEYS)
        ],
        'below': [
            {'n': n, 'seed': seed, 'stream': stream, 'keys': keys, 'out': below(n, seed, stream, *keys)}
            for n, seed, stream, keys in product(BELOW_N, SEEDS[:3], STREAMS[:2], KEYS[1:4])
        ],
        'fade': [[t, fade(t)] for t in FADE_INPUTS],
        'value': [
            {'seed': seed, 'stream': stream, 'x': x, 'y': y, 'cell': cell, 'octave': octave,
             'out': value(seed, stream, x, y, cell, octave)}
            for seed, stream, x, y, cell, octave in product(
                (1, 42), (3,), (-50, -1, 0, 15, 100, 1000), (-7, 0, 33, 999), (1, 3, 7, 16, 96), (0, 2))
        ],
        'fbm': [
            {'seed': seed, 'stream': stream, 'x': x, 'y': y, 'cell': cell, 'octaves': octaves,
             'out': fbm(seed, stream, x, y, cell, octaves)}
            for seed, stream, (x, y), cell, octaves in product(
                (42,), (5,), ((-50, 3), (0, 0), (15, 77), (1000, 999)), (1, 3, 32, 96), (1, 3, 5))
        ],
    }


def main():
    parser = argparse.ArgumentParser(description='Write the kernel test vectors for the TypeScript port.')
    parser.add_argument('--check', action='store_true', help='compare with the committed file instead of writing it')
    args = parser.parse_args()
    kernels = build()
    for kernel, cases in kernels.items():
        print(f'{kernel}: {len(cases)} cases')
    text = (json.dumps(kernels, indent=2, sort_keys=True) + '\n').encode()
    name = FIXTURE.relative_to(ROOT).as_posix()
    if not args.check:
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_bytes(text)
        print(f'wrote {name} ({len(text)} bytes)')
        return 0
    # git on Windows may check the file out with CRLF line ends; a JSON string never holds a raw newline
    if FIXTURE.exists() and FIXTURE.read_bytes().replace(b'\r\n', b'\n') == text:
        print(f'{name} matches')
        return 0
    print(f'{name} is out of date: run python tools/worldgen/vectors.py and commit the result', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
