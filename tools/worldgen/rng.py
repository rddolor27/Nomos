"""Keyed random draws: every value is a pure function of (seed, stream, key...).

Nothing keeps state, so a draw never depends on the order in which cells, places or people are
visited, and a zoomed-in place regenerates identically every time. All arithmetic stays in 32-bit
unsigned integers, so a TypeScript port with Math.imul and >>> 0 gives the same values.
"""
import secrets

MASK = 0xFFFFFFFF

# One stream per purpose, so adding draws to one stage never shifts another. Append only.
SHAPE, ELEVATION, RIDGES, TEMPERATURE, MOISTURE, SETTLEMENT, ROAD, WONDER, LANDMARK, PLACE, LOOK, CROWD = range(1, 13)


def mix(x):
    """lowbias32 (Chris Wellons, public domain): a 32-bit bijection with strong avalanche."""
    x &= MASK
    x ^= x >> 16
    x = (x * 0x7FEB352D) & MASK
    x ^= x >> 15
    x = (x * 0x846CA68B) & MASK
    return x ^ (x >> 16)


def draw(seed, stream, *key):
    """A uniform 32-bit value. The seed is hashed first so neighbouring seeds give unrelated worlds."""
    h = mix(mix(seed ^ 0x9E3779B9) ^ stream)
    for k in key:
        h = mix(h ^ (k & MASK))
    return h


def below(n, seed, stream, *key):
    return draw(seed, stream, *key) % n


def chance(per_mille, seed, stream, *key):
    return draw(seed, stream, *key) % 1000 < per_mille


def pick(items, seed, stream, *key):
    return items[below(len(items), seed, stream, *key)]


def shuffled(items, seed, stream, *key):
    """A keyed order: each item's rank comes from its own draw, so the order is stable."""
    order = sorted(range(len(items)), key=lambda i: (draw(seed, stream, *key, i), i))
    return [items[i] for i in order]


def new_seed():
    return secrets.randbits(32)


def parse_seed(text):
    return int(text, 16) & MASK


def seed_text(seed):
    return f'{seed:08x}'
