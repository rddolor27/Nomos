"""Per-stage golden fingerprints for the TypeScript port: python tools/worldgen/goldens.py [--seeds N] [--check]

Runs world.generate's stages in order, with terrain.shape and drainage.drain opened up, and folds each stage's output
into a 32-bit fingerprint, so a port that drifts names the stage where it starts. The mirror must match
world.generate: on the first CHECKED seeds of each size it compares its world fingerprint with world.fingerprint of
world.generate, and stops on a difference. Writes packages/worldgen/test/fixtures/goldens-v1.json. --check compares
the committed file's first N worlds of each size with a fresh run instead.
"""
import argparse
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import climate  # noqa: E402
import countries  # noqa: E402
import drainage  # noqa: E402
import features  # noqa: E402
import rng  # noqa: E402
import roads  # noqa: E402
import settle  # noqa: E402
import terrain  # noqa: E402
from grid import neighbours, parts  # noqa: E402
from model import BIOMES, LANDMARKS, TIERS, WONDERS  # noqa: E402
from noise import fbm  # noqa: E402
from rng import ELEVATION, SHAPE, below, draw, mix  # noqa: E402
from world import SIZES, World, fingerprint, generate  # noqa: E402

ROOT = HERE.parents[1]
FIXTURE = ROOT / 'packages' / 'worldgen' / 'test' / 'fixtures' / 'goldens-v1.json'
VERSION = 1
FIRST = 0x5EED0001
SEEDS = 100
CHECKED = 2
FOLD_SEED = 0x57A6E
SIDES = 'nesw'
STAGES = ('falloff', 'relief', 'chains', 'raw', 'land', 'shape', 'rain', 'erode', 'lakes', 'drain', 'climate',
          'biomes', 'habitability', 'settle', 'countries', 'farm', 'routes', 'roads', 'lanes', 'survey', 'wonders',
          'landmarks', 'world')


def fold(*parts_):
    """Each part is a sequence or one number; its length goes in first, then its values, as world.fingerprint feeds."""
    h = mix(FOLD_SEED)
    for part in parts_:
        values = part if isinstance(part, (list, tuple, bytes, bytearray)) else [part]
        h = mix(h ^ len(values))
        for v in values:
            h = mix(h ^ (v & rng.MASK))
    return h


def rows(records):
    return [v for record in records for v in record]


def paths(cell_paths):
    return [v for path in cell_paths for v in (len(path), *path)]


def shape(seed, width, height, out):
    """terrain.shape, line for line, with a fold after each step."""
    t = terrain
    n = width * height
    template = t.TEMPLATES[below(len(t.TEMPLATES), seed, SHAPE, t.PICK)]
    lo, hi = t.LAND_PERMILLE[template]
    land_target = lo + below(hi - lo + 1, seed, SHAPE, t.LAND)
    falloff = [max(-4 * t.ONE, min(3 * t.ONE, f + e)) for f, e in
               zip(t.SHAPES[template](seed, width, height, land_target), t._edges(seed, width, height, template))]
    out['falloff'] = fold(t.TEMPLATES.index(template), land_target, falloff)
    relief = [(fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * t.RELIEF // 16 for y in range(height) for x in range(width)]
    out['relief'] = fold(relief)
    coast = sorted(f + r for f, r in zip(falloff, relief))[n - n * land_target // 1000]
    rise = [f - coast for f in falloff]
    chains = t._chains(seed, width, height, rise)
    out['chains'] = fold(coast, chains)
    raw = [t.PLATEAU * min(u, t.RAMP) // t.RAMP + max(0, u - t.RAMP) // 16 + r + c if u > 0 else u + r + c
           for u, r, c in zip(rise, relief, chains)]
    raw = [v + draw(seed, ELEVATION, t.GRAIN, i) % (2 * t.GRAIN_RAW + 1) - t.GRAIN_RAW for i, v in enumerate(raw)]
    sea = sorted(raw)[n - n * land_target // 1000]
    out['raw'] = fold(sea, raw)
    land = t._tidy(bytearray(1 if v > sea else 0 for v in raw), width, height)
    out['land'] = fold(land)
    elevation = [min(t.TOP, max(1, 1 + (v - sea) * t.SCALE // t.ONE)) if land[i]
                 else max(-t.TOP, min(0, (v - sea) * t.SCALE // t.ONE)) for i, v in enumerate(raw)]
    water = bytearray(1 - v for v in land)
    label, _ = parts(neighbours(width, height), water)
    edge = set(label[i] for i in t._border(width, height) if water[i])
    ocean = bytearray(1 if water[i] and label[i] in edge else 0 for i in range(n))
    out['shape'] = fold(t.TEMPLATES.index(template), elevation, ocean)
    return template, elevation, ocean


def drain(seed, width, height, elevation, ocean, rain, out):
    """drainage.drain, line for line: each erosion pass, then lakes, then the final drainage."""
    d = drainage
    passes = []
    for _ in range(d.EROSION_PASSES):
        filled, receiver, order = d.flood(seed, width, height, elevation, ocean)
        flow = d.accumulate(order, receiver, rain, ocean)
        elevation = d._erode(elevation, filled, receiver, flow, ocean)
        passes += [filled, receiver, order, flow, elevation]
    out['erode'] = fold(*passes)
    filled, receiver, order = d.flood(seed, width, height, elevation, ocean)
    lake, terminal, elevation = d._lakes(width, height, elevation, filled, ocean)
    out['lakes'] = fold(filled, receiver, order, lake, terminal, elevation)
    if any(terminal):
        sinks = bytearray(o | t for o, t in zip(ocean, terminal))
        filled, receiver, order = d.flood(seed, width, height, elevation, sinks)
        elevation = [f if f > e and not lake[i] else e for i, (e, f) in enumerate(zip(elevation, filled))]
    flow = d.accumulate(order, receiver, rain, ocean)
    river = d.rivers(width, height, flow, receiver, lake, ocean)
    out['drain'] = fold(elevation, lake, receiver, flow, river)
    return elevation, lake, receiver, river


def stages(size, seed, check):
    """world.generate, line for line, folding each stage. Returns the fingerprints in STAGES order, as hex."""
    width, height = SIZES[size]
    out = {}
    w = World(seed, width, height)
    w.template, elevation, ocean = shape(seed, width, height, out)
    wet, w.wind = climate.rain(seed, width, height, elevation, ocean)
    out['rain'] = fold(SIDES.index(w.wind), wet)
    w.elevation, lake, w.receiver, w.river = drain(seed, width, height, elevation, ocean, wet, out)
    water = bytearray(o | k for o, k in zip(ocean, lake))
    w.temperature, w.cold = climate.temperature(seed, width, height, w.elevation)
    w.moisture = climate.moisture(seed, width, height, wet, water, w.river)
    w.coast = climate.coasts(width, height, w.elevation, ocean)
    out['climate'] = fold(SIDES.index(w.cold), w.temperature, w.moisture, w.coast)
    w.biome = climate.biomes(seed, width, height, w.elevation, w.temperature, w.moisture, ocean, lake, w.river, w.coast)
    out['biomes'] = fold(w.biome)
    slope = climate.slopes(width, height, w.elevation, water)
    score = settle.habitability(width, height, w.biome, w.elevation, w.river, w.coast, w.temperature, w.moisture, slope)
    out['habitability'] = fold(slope, score)
    land = len(water) - sum(water)
    w.settlements = settle.settle(seed, width, height, score, land)
    out['settle'] = fold(rows((s.id, s.x, s.y, TIERS.index(s.tier), s.population, s.uid) for s in w.settlements))
    w.country, w.countries = countries.found(seed, width, height, w.biome, w.river, w.receiver, w.settlements, land)
    out['countries'] = fold(w.country, rows((c.id, c.capital, c.colour) for c in w.countries),
                            [TIERS.index(s.tier) for s in w.settlements])
    w.biome = settle.farm(seed, width, w.biome, w.settlements)
    out['farm'] = fold(w.biome)
    mass = roads.landmasses(width, height, w.biome)
    out['routes'] = fold(rows(roads.route_graph(w.settlements, [mass[s.uid] for s in w.settlements])))
    w.roads, w.bridges = roads.build(width, height, w.biome, w.elevation, w.river, w.receiver, w.settlements)
    out['roads'] = fold(paths(w.roads), w.bridges)
    w.lanes = roads.lanes(width, height, w.biome, w.settlements)
    out['lanes'] = fold(paths(w.lanes))
    survey = features.survey(w)
    out['survey'] = fold(survey.slope, survey.forest_depth, survey.town, survey.big, survey.wet, survey.hotspot,
                         survey.hot_reach)
    w.wonders = features.wonders(w, survey)
    out['wonders'] = fold(rows((WONDERS.index(p.kind), p.x, p.y) for p in w.wonders))
    w.landmarks = features.landmarks(w, survey, w.wonders)
    out['landmarks'] = fold(rows((LANDMARKS.index(p.kind), p.x, p.y) for p in w.landmarks),
                            paths([LANDMARKS.index(k) for k in s.landmarks] for s in w.settlements))
    out['world'] = fingerprint(w)
    if check and out['world'] != fingerprint(generate(seed, width, height)):
        raise SystemExit(f'goldens.py no longer mirrors world.generate: {size} {seed:08x} differs')
    return ' '.join(f'{out[name]:08x}' for name in STAGES)


def task(job):
    return stages(*job)


def build(seeds):
    jobs = [(size, FIRST + k, k < CHECKED) for size in SIZES for k in range(seeds)]
    with ProcessPoolExecutor() as pool:
        prints = list(pool.map(task, jobs))
    return {
        'version': VERSION,
        'stages': list(STAGES),
        'streams': {name: number for name, number in vars(rng).items() if name.isupper() and name != 'MASK'},
        'names': {'biomes': list(BIOMES), 'tiers': list(TIERS), 'wonders': list(WONDERS), 'landmarks': list(LANDMARKS),
                  'templates': list(terrain.TEMPLATES)},
        'sizes': {size: list(cells) for size, cells in SIZES.items()},
        'worlds': [{'size': size, 'seed': seed, 'prints': p} for (size, seed, _), p in zip(jobs, prints)],
    }


def check(seeds):
    """The committed file's first `seeds` worlds of each size against a fresh run, so CI can check a few quickly."""
    if not FIXTURE.exists():
        return False
    committed = json.loads(FIXTURE.read_text(encoding='utf-8'))
    fresh = build(seeds)
    picked = [w for w in committed['worlds'] if w['seed'] - FIRST < seeds]
    heads = [{k: v for k, v in data.items() if k != 'worlds'} for data in (committed, fresh)]
    return heads[0] == heads[1] and picked == fresh['worlds']


def main():
    parser = argparse.ArgumentParser(description='Write the per-stage goldens for the TypeScript world generator.')
    parser.add_argument('--seeds', type=int, default=SEEDS, help=f'seeds of each size, from {FIRST:08x}')
    parser.add_argument('--check', action='store_true', help='compare with the committed file instead of writing it')
    args = parser.parse_args()
    name = FIXTURE.relative_to(ROOT).as_posix()
    if args.check:
        if check(args.seeds):
            print(f'{name} matches on {args.seeds} seeds of each size')
            return 0
        print(f'{name} is out of date: run python tools/worldgen/goldens.py and commit the result', file=sys.stderr)
        return 1
    text = json.dumps(build(args.seeds), indent=1) + '\n'
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(text, encoding='utf-8', newline='\n')
    print(f'wrote {name}: {args.seeds} seeds of each size, {len(STAGES)} stages ({len(text):,} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
