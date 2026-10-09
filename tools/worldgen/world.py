"""The country generator: one seed in, one World out, the same World for the same seed.

`generate` runs the stages in order (shape, rain, drainage, climate, biomes, settlements, countries,
roads, wonders, landmarks); `place_contexts` hands each settlement and wonder to the place generator;
`fingerprint` hashes everything for determinism tests. Run as a script to draw a new world.
"""
import argparse
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import climate  # noqa: E402
import countries  # noqa: E402
import drainage  # noqa: E402
import features  # noqa: E402
import roads  # noqa: E402
import settle  # noqa: E402
import terrain  # noqa: E402
from grid import neighbours, side, sides_text  # noqa: E402
from model import BIOMES, LANDMARKS, TIERS, WONDERS, PlaceContext  # noqa: E402
from rng import PLACE, draw, mix, new_seed, parse_seed, seed_text  # noqa: E402

DIST = HERE.parents[1] / 'dist' / 'worldgen'
SIZES = {'standard': (96, 64), 'large': (192, 128)}
# The cells on each side of a cell, diagonals included, for the sea a place faces.
FACING = {'n': ((-1, -1), (0, -1), (1, -1)), 'e': ((1, -1), (1, 0), (1, 1)),
          's': ((-1, 1), (0, 1), (1, 1)), 'w': ((-1, -1), (-1, 0), (-1, 1))}


@dataclass
class World:
    seed: int
    width: int
    height: int
    template: str = ''
    wind: str = ''
    cold: str = ''
    elevation: list = field(default_factory=list)       # land 1..1000 above sea level, water 0 or below
    biome: bytearray = field(default_factory=bytearray)
    temperature: bytearray = field(default_factory=bytearray)
    moisture: bytearray = field(default_factory=bytearray)
    river: bytearray = field(default_factory=bytearray)
    receiver: list = field(default_factory=list)
    coast: bytearray = field(default_factory=bytearray)     # climate.INLAND, BEACH or CLIFFS
    settlements: list = field(default_factory=list)
    roads: list = field(default_factory=list)
    bridges: list = field(default_factory=list)
    lanes: list = field(default_factory=list)            # sea lanes between landmasses, port to port
    wonders: list = field(default_factory=list)
    landmarks: list = field(default_factory=list)
    country: bytearray = field(default_factory=bytearray)   # per cell: 0 for water, 1..K on land
    countries: list = field(default_factory=list)          # countries.Country, in id order


def generate(seed, width=96, height=64):
    w = World(seed, width, height)
    w.template, elevation, ocean = terrain.shape(seed, width, height)
    wet, w.wind = climate.rain(seed, width, height, elevation, ocean)
    w.elevation, lake, w.receiver, _, w.river = drainage.drain(seed, width, height, elevation, ocean, wet)
    water = bytearray(o | k for o, k in zip(ocean, lake))
    w.temperature, w.cold = climate.temperature(seed, width, height, w.elevation)
    w.moisture = climate.moisture(seed, width, height, wet, water, w.river)
    w.coast = climate.coasts(width, height, w.elevation, ocean)
    w.biome = climate.biomes(seed, width, height, w.elevation, w.temperature, w.moisture, ocean, lake, w.river, w.coast)
    slope = climate.slopes(width, height, w.elevation, water)
    score = settle.habitability(width, height, w.biome, w.elevation, w.river, w.coast, w.temperature, w.moisture, slope)
    land = len(water) - sum(water)
    w.settlements = settle.settle(seed, width, height, score, land)
    w.country, w.countries = countries.found(seed, width, height, w.biome, w.river, w.receiver, w.settlements, land)
    w.biome = settle.farm(seed, width, w.biome, w.settlements)
    w.roads, w.bridges = roads.build(width, height, w.biome, w.elevation, w.river, w.receiver, w.settlements)
    w.lanes = roads.lanes(width, height, w.biome, w.settlements)
    land = features.survey(w)
    w.wonders = features.wonders(w, land)
    w.landmarks = features.landmarks(w, land, w.wonders)
    return w


def _facing(world, x, y, kind):
    return sides_text(s for s, cells in FACING.items()
                      if any(0 <= x + dx < world.width and 0 <= y + dy < world.height
                             and world.biome[(y + dy) * world.width + x + dx] == kind for dx, dy in cells))


def _context(world, x, y, seed, name, **extra):
    i = y * world.width + x
    sea = _facing(world, x, y, climate.OCEAN)
    river = ''
    if world.river[i]:
        nbrs = neighbours(world.width, world.height)
        flows = [world.receiver[i]] if world.receiver[i] >= 0 else []
        flows += [u for u in nbrs[i] if world.receiver[u] == i and (world.river[u] or world.biome[u] == climate.LAKE)]
        for c in flows:
            river += side(c % world.width - x, c // world.width - y, river)
    roads = ''
    for path in world.roads:
        for k, c in enumerate(path):
            if c == i:
                for j in (k - 1, k + 1):
                    if 0 <= j < len(path):
                        roads += side(path[j] % world.width - x, path[j] // world.width - y, roads + sea)
    return PlaceContext(seed=seed, name=name, biome=BIOMES[world.biome[i]], temperature=world.temperature[i],
                        moisture=world.moisture[i], sea=sea, coast=climate.COASTS[world.coast[i]] if sea else '',
                        river=sides_text(river), roads=sides_text(roads),
                        farmland=_facing(world, x, y, climate.FARMLAND), **extra)


def place_contexts(world):
    """One context per settlement, then one per wonder, each with its own keyed seed."""
    return ([_context(world, s.x, s.y, draw(world.seed, PLACE, 0, s.uid), f'{s.tier}-{s.id}', tier=s.tier,
                      population=s.population, landmarks=s.landmarks) for s in world.settlements]
            + [_context(world, p.x, p.y, draw(world.seed, PLACE, 1, WONDERS.index(p.kind)), f'wonder-{p.kind}',
                        wonder=p.kind) for p in world.wonders])


def fingerprint(world):
    h = mix(world.seed)

    def feed(*values):
        nonlocal h
        for v in values:
            h = mix(h ^ (v & 0xFFFFFFFF))

    feed(world.width, world.height)
    for column in (world.elevation, world.biome, world.temperature, world.moisture, world.river,
                   world.receiver, world.coast):
        feed(len(column), *column)
    feed(len(world.settlements))
    for s in world.settlements:
        feed(s.id, s.x, s.y, TIERS.index(s.tier), s.population, len(s.landmarks),
             *(LANDMARKS.index(k) for k in s.landmarks))
    for paths in (world.roads, world.lanes):
        feed(len(paths))
        for path in paths:
            feed(len(path), *path)
    feed(len(world.bridges), *world.bridges)
    feed(len(world.wonders), *(v for p in world.wonders for v in (WONDERS.index(p.kind), p.x, p.y)))
    feed(len(world.landmarks), *(v for p in world.landmarks for v in (LANDMARKS.index(p.kind), p.x, p.y)))
    feed(len(world.countries), *(v for c in world.countries for v in (c.capital, c.colour)))
    feed(len(world.country), *world.country)
    return h


def _country_lines(world, land):
    cells = Counter(world.country)
    held = Counter(world.country[s.uid] for s in world.settlements)
    out = []
    for c in world.countries:
        s = world.settlements[c.capital]
        out.append(f'country {c.id}: {s.tier}-{s.id} at ({s.x},{s.y}), colour {c.colour}, '
                   f'{cells[c.id]:,} land cells ({cells[c.id] * 100 // land}%), {held[c.id]} settlements')
    return out


def summary(world, seconds):
    n = world.width * world.height
    land = sum(1 for b in world.biome if b not in (climate.OCEAN, climate.LAKE))
    counts = Counter(world.biome)
    tiers = Counter(s.tier for s in world.settlements)
    inside = Counter(k for s in world.settlements for k in s.landmarks)
    outside = Counter(p.kind for p in world.landmarks)
    return '\n'.join([
        f'seed {seed_text(world.seed)}  template {world.template}  land {land * 100 // n}%  wind from {world.wind}  '
        f'cold {world.cold}  {seconds:.2f}s  fingerprint {fingerprint(world):08x}',
        'biomes: ' + ', '.join(f'{BIOMES[b]} {counts[b]}' for b in range(len(BIOMES)) if counts[b]),
        'settlements: ' + ', '.join(f'{t} {tiers[t]}' for t in TIERS if tiers[t])
        + f'  (largest {world.settlements[0].population:,})',
        *_country_lines(world, land),
        f'roads: {len(world.roads)} routes over {len({c for p in world.roads for c in p})} cells, '
        f'{len(world.bridges)} bridges, {len(world.lanes)} sea lanes',
        'wonders: ' + (', '.join(f'{p.kind} ({p.x},{p.y})' for p in world.wonders) or 'none'),
        'landmarks in place: ' + (', '.join(f'{k} {inside[k]}' for k in LANDMARKS if inside[k]) or 'none'),
        'landmarks on the map: ' + (', '.join(f'{k} {outside[k]}' for k in LANDMARKS if outside[k]) or 'none')])


def main():
    parser = argparse.ArgumentParser(description='Generate and draw a random country.')
    parser.add_argument('--seed', type=parse_seed, help='hex seed; a new one each run if left out')
    args = parser.parse_args()
    seed = new_seed() if args.seed is None else args.seed
    start = time.perf_counter()
    world = generate(seed)
    seconds = time.perf_counter() - start
    import mapdraw
    out = DIST / seed_text(seed)
    out.mkdir(parents=True, exist_ok=True)
    mapdraw.country_png(world, out / 'country.png')
    mapdraw.region_png(world, out / 'region.png')
    print(summary(world, seconds))
    print(f'wrote {out / "country.png"} and {out / "region.png"}')


if __name__ == '__main__':
    main()
