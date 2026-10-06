"""Per-stage golden fingerprints and timings of the reference country generator.

python stages.py [--seeds N] [--width W --height H] [--out GOLDEN.json]

Runs world.generate's stages in its order, hashes each stage's output with the same lowbias32
fold as world.fingerprint, and checks the last hash against world.fingerprint itself, so the
orchestration below cannot silently drift from world.py.
"""
import argparse
import json
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

import climate  # noqa: E402
import drainage  # noqa: E402
import features  # noqa: E402
import roads  # noqa: E402
import settle  # noqa: E402
import terrain  # noqa: E402
from model import LANDMARKS, TIERS, WONDERS  # noqa: E402
from rng import SETTLEMENT, below, mix  # noqa: E402
from world import World, fingerprint  # noqa: E402


def fold(*columns):
    h = mix(0x57A6E)
    for column in columns:
        values = column if isinstance(column, (list, tuple, bytes, bytearray)) else [column]
        h = mix(h ^ len(values))
        for v in values:
            h = mix(h ^ (v & 0xFFFFFFFF))
    return h


def run(seed, width, height):
    w = World(seed, width, height)
    marks, prints = {}, {}

    def stage(name, fn, digest):
        t0 = time.perf_counter()
        out = fn()
        marks[name] = time.perf_counter() - t0
        prints[name] = digest(out)
        return out

    w.template, elevation, ocean = stage('shape', lambda: terrain.shape(seed, width, height),
                                         lambda o: fold(terrain.TEMPLATES.index(o[0]), o[1], o[2]))
    wet, w.wind = stage('rain', lambda: climate.rain(seed, width, height, elevation, ocean),
                        lambda o: fold(o[0], 'nesw'.index(o[1])))
    w.elevation, lake, w.receiver, flow, w.river = stage(
        'drain', lambda: drainage.drain(seed, width, height, elevation, ocean, wet), lambda o: fold(*o))
    water = bytearray(o | k for o, k in zip(ocean, lake))
    w.temperature, w.cold = stage('temperature', lambda: climate.temperature(seed, width, height, w.elevation),
                                  lambda o: fold(o[0], 'ns'.index(o[1])))
    w.moisture = stage('moisture', lambda: climate.moisture(seed, width, height, wet, water, w.river), fold)
    w.coast = stage('coasts', lambda: climate.coasts(width, height, w.elevation, ocean), fold)
    w.biome = stage('biomes', lambda: climate.biomes(seed, width, height, w.elevation, w.temperature, w.moisture,
                                                     ocean, lake, w.river, w.coast), fold)
    slope = climate.slopes(width, height, w.elevation, water)
    score = stage('habitability', lambda: settle.habitability(width, height, w.biome, w.elevation, w.river,
                                                              w.coast, w.temperature, w.moisture, slope), fold)
    w.settlements = stage('settle', lambda: settle.settle(seed, width, height, score, len(water) - sum(water)),
                          lambda o: fold([v for s in o for v in (s.id, s.x, s.y, TIERS.index(s.tier), s.population)]))
    w.biome = stage('farm', lambda: settle.farm(seed, width, w.biome, w.settlements), fold)
    w.roads, w.bridges = stage('roads', lambda: roads.build(width, height, w.biome, w.elevation, w.river,
                                                            w.receiver, w.settlements),
                               lambda o: fold([v for p in o[0] for v in (len(p), *p)], o[1]))
    land = stage('survey', lambda: features.survey(w),
                 lambda L: fold(L.slope, L.forest_depth, L.town, L.big, L.wet, L.hotspot, L.hot_reach))
    w.wonders = stage('wonders', lambda: features.wonders(w, land),
                      lambda o: fold([v for p in o for v in (WONDERS.index(p.kind), p.x, p.y)]))
    w.landmarks = stage('landmarks', lambda: features.landmarks(w, land, w.wonders),
                        lambda o: fold([v for p in o for v in (LANDMARKS.index(p.kind), p.x, p.y)],
                                       [LANDMARKS.index(k) for s in w.settlements for k in s.landmarks]))
    prints['world'] = fingerprint(w)
    land_cells = len(water) - sum(water)
    return w, marks, prints, land_cells


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=10)
    parser.add_argument('--width', type=int, default=96)
    parser.add_argument('--height', type=int, default=64)
    parser.add_argument('--out')
    args = parser.parse_args()
    from world import generate
    seeds = [mix(0xA11CE + k) for k in range(args.seeds)]
    timings, golden, counts = {}, [], []
    for seed in seeds:
        t0 = time.perf_counter()
        w, marks, prints, land = run(seed, args.width, args.height)
        total = time.perf_counter() - t0
        if args.width == 96 and args.height == 64:
            assert prints['world'] == fingerprint(generate(seed)), 'orchestration drifted from world.generate'
        for k, v in marks.items():
            timings.setdefault(k, []).append(v)
        timings.setdefault('total', []).append(total)
        golden.append({'seed': seed, 'width': args.width, 'height': args.height,
                       'stages': {k: f'{v:08x}' for k, v in prints.items()}})
        tiers = {t: sum(1 for s in w.settlements if s.tier == t) for t in TIERS}
        counts.append((seed, w.template, land, len(w.settlements), tiers, len(w.roads),
                       len({c for p in w.roads for c in p}), len(w.wonders)))
    print(f'python {sys.version.split()[0]} | grid {args.width}x{args.height} | {len(seeds)} seeds | per stage, '
          f'median [min-max] ms')
    for k, v in timings.items():
        print(f'  {k:13s} {statistics.median(v) * 1000:9.1f} [{min(v) * 1000:.1f}-{max(v) * 1000:.1f}]')
    for seed, template, land, n, tiers, nroads, road_cells, nw in counts:
        print(f'  {seed:08x} {template:11s} land {land} settlements {n} '
              f'({", ".join(f"{t} {c}" for t, c in tiers.items() if c)}) routes {nroads} road cells {road_cells} '
              f'wonders {nw}')
    if args.out:
        Path(args.out).write_text(json.dumps(golden, indent=1), encoding='utf-8')
        print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
