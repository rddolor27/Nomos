"""Integer value noise on a keyed lattice, returning 0..65535.

Fractions use 15 bits, so every intermediate fits a signed 32-bit integer and a TypeScript port
with >> gives the same values; no floats or trigonometry, which differ between engines.
"""
from rng import draw

ONE = 1 << 15


def fade(t):
    """Smoothstep 3t^2 - 2t^3 for t in [0, ONE]."""
    return ((t * t >> 15) * (3 * ONE - 2 * t)) >> 15


def value(seed, stream, x, y, cell, octave=0):
    ix, fx = divmod(x, cell)
    iy, fy = divmod(y, cell)
    tx, ty = fade(fx * ONE // cell), fade(fy * ONE // cell)
    a, b, c, d = (draw(seed, stream, octave, ix + dx, iy + dy) >> 16 for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)))
    top = a + ((b - a) * tx >> 15)
    bottom = c + ((d - c) * tx >> 15)
    return top + ((bottom - top) * ty >> 15)


def fbm(seed, stream, x, y, cell, octaves=5):
    """Octaves halve in size and weight; each octave has its own lattice."""
    total = weight = 0
    amp = 1 << octaves
    for octave in range(octaves):
        total += value(seed, stream, x, y, max(1, cell >> octave), octave) * amp
        weight += amp
        amp >>= 1
    return total // weight
