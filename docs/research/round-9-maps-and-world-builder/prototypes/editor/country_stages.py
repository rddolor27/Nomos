"""Times each stage of tools/worldgen's country generator on its 96x64 grid, in CPython.

Runs the stages in world.generate's order, checks the staged world has generate's fingerprint,
and dumps one priority-flood input and output for drain_port.mjs. Python reference timings only,
never browser timings. Usage: python country_stages.py [seeds] [repeats]  (writes country.json)
"""
import json
import statistics
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'tools' / 'worldgen'))

import climate  # noqa: E402
import drainage  # noqa: E402
import features  # noqa: E402
import roads  # noqa: E402
import settle  # noqa: E402
import terrain  # noqa: E402
from world import World, fingerprint, generate  # noqa: E402

STAGES = ('shape', 'rain', 'drain', 'temperature', 'moisture', 'coasts', 'biomes', 'slopes', 'habitability',
          'settle', 'farm', 'roads', 'survey', 'wonders', 'landmarks')


def staged(seed, width=96, height=64):
    t, w = {}, World(seed, width, height)

    def run(name, fn):
        start = time.perf_counter()
        out = fn()
        t[name] = (time.perf_counter() - start) * 1000
        return out

    w.template, elevation, ocean = run('shape', lambda: terrain.shape(seed, width, height))
    wet, w.wind = run('rain', lambda: climate.rain(seed, width, height, elevation, ocean))
    w.elevation, lake, w.receiver, _, w.river = run('drain', lambda: drainage.drain(seed, width, height, elevation, ocean, wet))
    water = bytearray(o | k for o, k in zip(ocean, lake))
    w.temperature, w.cold = run('temperature', lambda: climate.temperature(seed, width, height, w.elevation))
    w.moisture = run('moisture', lambda: climate.moisture(seed, width, height, wet, water, w.river))
    w.coast = run('coasts', lambda: climate.coasts(width, height, w.elevation, ocean))
    w.biome = run('biomes', lambda: climate.biomes(seed, width, height, w.elevation, w.temperature, w.moisture, ocean,
                                                   lake, w.river, w.coast))
    slope = run('slopes', lambda: climate.slopes(width, height, w.elevation, water))
    score = run('habitability', lambda: settle.habitability(width, height, w.biome, w.elevation, w.river, w.coast,
                                                            w.temperature, w.moisture, slope))
    w.settlements = run('settle', lambda: settle.settle(seed, width, height, score, len(water) - sum(water)))
    w.biome = run('farm', lambda: settle.farm(seed, width, w.biome, w.settlements))
    w.roads, w.bridges = run('roads', lambda: roads.build(width, height, w.biome, w.elevation, w.river, w.receiver,
                                                          w.settlements))
    land = run('survey', lambda: features.survey(w))
    w.wonders = run('wonders', lambda: features.wonders(w, land))
    w.landmarks = run('landmarks', lambda: features.landmarks(w, land, w.wonders))
    return w, t, (elevation, ocean)


def main():
    seeds = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    repeats = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    staged(0x5EED0001)
    times = {s: [] for s in STAGES}
    totals, mismatches = [], 0
    for k in range(seeds):
        seed = 0x5EED0100 + k
        if fingerprint(staged(seed)[0]) != fingerprint(generate(seed)):
            mismatches += 1
        for _ in range(repeats):
            _, t, _ = staged(seed)
            for s in STAGES:
                times[s].append(t[s])
            totals.append(sum(t.values()))
    stats = {s: {'median': statistics.median(v), 'min': min(v), 'max': max(v)} for s, v in times.items()}
    stats['total'] = {'median': statistics.median(totals), 'min': min(totals), 'max': max(totals)}

    seed = 0x5EED0100
    _, _, (elevation, ocean) = staged(seed)
    flood_ms = []
    for _ in range(9):
        start = time.perf_counter()
        filled, receiver, order = drainage.flood(seed, 96, 64, elevation, ocean)
        flood_ms.append((time.perf_counter() - start) * 1000)
    dump = {'seed': seed, 'width': 96, 'height': 64, 'elevation': elevation, 'ocean': list(ocean),
            'filled': filled, 'receiver': receiver, 'order': order,
            'floodMs': {'median': statistics.median(flood_ms), 'min': min(flood_ms), 'max': max(flood_ms)}}
    out = {'python': sys.version.split()[0], 'seeds': seeds, 'repeats': repeats, 'warmup': 1,
           'fingerprintMismatches': mismatches, 'stages': stats, 'flood': dump}
    (HERE / 'country.json').write_text(json.dumps(out), encoding='utf-8')
    print(f'python {out["python"]}, {seeds} seeds x {repeats} repeats, fingerprint mismatches {mismatches}')
    for s in STAGES + ('total',):
        v = stats[s]
        print(f'{s:13s} {v["median"]:8.2f} ms [{v["min"]:.2f}-{v["max"]:.2f}]')
    print(f'flood alone   {dump["floodMs"]["median"]:8.2f} ms [{dump["floodMs"]["min"]:.2f}-{dump["floodMs"]["max"]:.2f}]')


if __name__ == '__main__':
    main()
