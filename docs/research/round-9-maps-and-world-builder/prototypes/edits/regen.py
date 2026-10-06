"""Edit blast radius on the reference world generator (round 9, question 3).

Edits enter tools/worldgen as stage inputs: elevation deltas before rain, biome paint after biomes,
pinned or forbidden settlement sites, and extra road edges. Each edited world is compared with the
unedited one, with and without settlement locks, to count what regenerates.

    python regen.py blast [seeds]    edit blast radius (default 30 seeds)
    python regen.py uid [seeds]      the settlement edits again, with draws keyed by settlement cell
    python regen.py stages [seeds]   per-stage CPython timings
    python regen.py places [seeds]   place-layout churn when one context field changes
    python regen.py pins [seeds]     would a house pinned at its old tiles collide after that change
    python regen.py sizes [seeds]    materialised world size, raw and deflated
    python regen.py checks [seeds]   connectivity, food land and hearth fairness

Set PYTHONDONTWRITEBYTECODE=1 so no caches land beside tools/worldgen.
"""
import dataclasses
import heapq
import statistics
import sys
import time
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))

import climate  # noqa: E402
import drainage  # noqa: E402
import features  # noqa: E402
import roads  # noqa: E402
import settle  # noqa: E402
import terrain  # noqa: E402
from grid import dist2, neighbours  # noqa: E402
from model import LANDMARKS, TIERS, WONDERS  # noqa: E402
from rng import SETTLEMENT, below, draw  # noqa: E402
from world import World, _context, fingerprint, generate  # noqa: E402

W, H = 96, 64
EDIT = 0x9000  # research-only stream for picking edit targets
LAYOUT_FIELDS = ('biome', 'temperature', 'moisture', 'sea', 'coast', 'river', 'roads', 'landmarks', 'tier')
WATER = (climate.OCEAN, climate.LAKE)


def seeds(n):
    return [draw(0x00C0FFEE, EDIT, k) for k in range(n)]


def landmarks_by_uid(w, land, wonders):
    """features.landmarks with every per-settlement draw keyed by the settlement's cell, not its rank id."""
    proxies = [dataclasses.replace(s, id=cell(s)) for s in w.settlements]
    view = dataclasses.replace(w, settlements=proxies)
    out = features.landmarks(view, land, wonders)
    for s, p in zip(w.settlements, proxies):
        s.landmarks = p.landmarks
    return out


def staged(seed, edits=None, pins=None, target=None, clock=None, uid_keys=False):
    """world.generate with edits applied inside their own stage; pins are Settlement records kept as-is."""
    e = edits or {}
    tick = clock or (lambda name: None)
    w = World(seed, W, H)
    w.template, elevation, ocean = terrain.shape(seed, W, H)
    for i, d in e.get('elevation', {}).items():
        if not ocean[i]:
            elevation[i] = max(1, min(terrain.TOP, elevation[i] + d))
    tick('shape')
    wet, w.wind = climate.rain(seed, W, H, elevation, ocean)
    tick('rain')
    w.elevation, lake, w.receiver, _, w.river = drainage.drain(seed, W, H, elevation, ocean, wet)
    tick('drainage')
    water = bytearray(o | k for o, k in zip(ocean, lake))
    w.temperature, w.cold = climate.temperature(seed, W, H, w.elevation)
    w.moisture = climate.moisture(seed, W, H, wet, water, w.river)
    w.coast = climate.coasts(W, H, w.elevation, ocean)
    tick('climate')
    w.biome = climate.biomes(seed, W, H, w.elevation, w.temperature, w.moisture, ocean, lake, w.river, w.coast)
    for i, b in e.get('biome', {}).items():
        if not water[i]:
            w.biome[i] = b
    tick('biomes')
    slope = climate.slopes(W, H, w.elevation, water)
    score = settle.habitability(W, H, w.biome, w.elevation, w.river, w.coast, w.temperature, w.moisture, slope)
    for i in e.get('forbid', ()):
        score[i] = 0
    w.conflicts = []
    if pins is None:
        w.settlements = settle.settle(seed, W, H, score, len(water) - sum(water))
    else:
        valid = []
        for p in pins:
            (w.conflicts if water[p.y * W + p.x] else valid).append(p)
        w.settlements = settle_pinned(seed, score, len(water) - sum(water), valid, target)
    tick('settlements')
    w.biome = settle.farm(seed, W, w.biome, w.settlements)
    tick('farmland')
    w.roads, w.bridges = build_roads(w, e.get('roads', ()))
    tick('roads')
    land = features.survey(w)
    w.wonders = features.wonders(w, land)
    tick('wonders')
    w.landmarks = (landmarks_by_uid if uid_keys else features.landmarks)(w, land, w.wonders)
    tick('landmarks')
    return w


def settle_pinned(seed, score, land, pins, target=None):
    """settle.settle with pinned sites taken first; generated sites fill up to the target count."""
    goal = target if target is not None else max(4, land // (50 + below(21, seed, SETTLEMENT, settle.PER)))
    jittered = {i: s * (768 + draw(seed, SETTLEMENT, settle.JITTER, i) % 513) // 1024
                for i, s in enumerate(score) if s >= settle.MIN_SCORE}
    ranked = sorted(jittered, key=lambda i: (-jittered[i], i))
    spacing = land * 64 // (goal * 100)
    fixed = [(p.x, p.y) for p in pins]
    while True:
        taken, made = list(fixed), []
        for i in ranked:
            if len(taken) >= goal:
                break
            x, y = i % W, i // W
            need = settle.LEADER_SPACING if len(made) < settle.LEADERS else spacing
            if all(dist2(x, y, tx, ty) >= need for tx, ty in taken):
                taken.append((x, y))
                made.append((x, y))
        if len(taken) >= goal or spacing <= 4:
            break
        spacing = spacing * 3 // 4
    top = 150_000 + below(350_001, seed, SETTLEMENT, settle.CAPITAL)
    rows = []
    for k, (x, y) in enumerate(made, 1):
        late = max(0, k - settle.HEAD)
        rank = k + late * late // settle.TAIL
        rows.append((top // rank * (750 + below(501, seed, SETTLEMENT, settle.SIZE, k)) // 1000, 1, k, x, y, None))
    rows += [(p.population, 0, j, p.x, p.y, p.tier) for j, p in enumerate(pins)]
    rows.sort(key=lambda r: (-r[0], r[1], r[2]))
    return [settle.Settlement(sid, x, y, tier or settle._tier(sid, people), people)
            for sid, (people, _, _, x, y, tier) in enumerate(rows)]


def build_roads(w, extra=()):
    """roads.build plus forced extra edges, given as pairs of settlement cells."""
    label = roads.landmasses(W, H, w.biome)
    cells = [s.y * W + s.x for s in w.settlements]
    edges = roads.route_graph(w.settlements, [label[c] for c in cells])
    at = {c: k for k, c in enumerate(cells)}
    have = {tuple(sorted(e)) for e in edges}
    for a, b in extra:
        if a in at and b in at and label[a] == label[b]:
            e = tuple(sorted((at[a], at[b])))
            if e not in have:
                edges.append(e)
                have.add(e)
    people = [s.population for s in w.settlements]

    def pull(edge):
        a, b = edge
        sa, sb = w.settlements[a], w.settlements[b]
        return -(people[a] * people[b] // dist2(sa.x, sa.y, sb.x, sb.y)), a, b

    steps = roads._steps(W, H, w.biome, w.river, w.receiver)
    enter = [16 + roads.COVER.get(b, 0) + max(0, e) // 40 + (roads.BRIDGE if w.river[i] else 0)
             for i, (b, e) in enumerate(zip(w.biome, w.elevation))]
    road = bytearray(W * H)
    paths = []
    for a, b in sorted(edges, key=pull):
        path = roads._walk(cells[a], cells[b], W, steps, enter, w.elevation, road)
        for c in path:
            road[c] = 1
        paths.append(path)
    homes = set(cells)
    return paths, sorted(c for c in range(W * H) if road[c] and w.river[c] and c not in homes)


def brush(centre, radius, value):
    cx, cy = centre % W, centre // W
    return {y * W + x: value for y in range(cy - radius, cy + radius + 1) for x in range(cx - radius, cx + radius + 1)
            if 0 <= x < W and 0 <= y < H and dist2(x, y, cx, cy) <= radius * radius}


def inland(w):
    return [i for i, b in enumerate(w.biome) if b not in WATER and 3 <= i % W < W - 3 and 3 <= i // W < H - 3]


def pick(seq, seed, *key):
    return seq[draw(seed, EDIT, *key) % len(seq)]


def cell(s):
    return s.y * W + s.x


def contexts(w):
    """Layout-relevant context fields per settlement cell (place seed and name left out)."""
    out = {}
    for s in w.settlements:
        ctx = _context(w, s.x, s.y, 0, '', tier=s.tier, population=s.population, landmarks=s.landmarks)
        out[cell(s)] = tuple(getattr(ctx, f) for f in LAYOUT_FIELDS)
    return out


def capital_reach(w):
    """Settlements with no land route to the capital (separate landmass)."""
    label = roads.landmasses(W, H, w.biome)
    cap = label[cell(w.settlements[0])]
    return sum(1 for s in w.settlements if label[cell(s)] != cap)


def compare(a, b):
    ca, cb = {cell(s): s for s in a.settlements}, {cell(s): s for s in b.settlements}
    kept = set(ca) & set(cb)
    xa, xb = contexts(a), contexts(b)
    ctx_changed = {c for c in kept if xa[c] != xb[c]}
    id_changed = {c for c in kept if ca[c].id != cb[c].id}
    fields = {f: sum(1 for c in kept if xa[c][k] != xb[c][k]) for k, f in enumerate(LAYOUT_FIELDS)}
    new = set(cb) - set(ca)
    ra, rb = {c for p in a.roads for c in p}, {c for p in b.roads for c in p}
    wa, wb = {(p.kind, p.x, p.y) for p in a.wonders}, {(p.kind, p.x, p.y) for p in b.wonders}
    la, lb = {(p.kind, p.x, p.y) for p in a.landmarks}, {(p.kind, p.x, p.y) for p in b.landmarks}
    return {
        'biome cells': sum(x != y for x, y in zip(a.biome, b.biome)),
        'river cells': sum((x > 0) != (y > 0) for x, y in zip(a.river, b.river)),
        'road cells': len(ra ^ rb),
        'settlements lost': len(set(ca) - set(cb)),
        'settlements new': len(new),
        'rank ids changed': len(id_changed),
        'contexts changed': len(ctx_changed),
        'layouts changed, rank-keyed seed': len(ctx_changed | id_changed) + len(new),
        'layouts changed, cell-keyed seed': len(ctx_changed) + len(new),
        'wonders changed': len(wa - wb),
        'map landmarks changed': len(la - lb),
        'no land route to capital': capital_reach(b) - capital_reach(a),
        'pin conflicts': len(getattr(b, 'conflicts', [])),
        'total settlements': len(ca),
        **{'field ' + f: n for f, n in fields.items()},
    }


def edit_cases(seed, base):
    """One keyed edit of each kind: (name, edits, free-mode pins, locked-mode pins, locked target)."""
    land = inland(base)
    others = [s for s in base.settlements if s.id]
    keep = list(base.settlements)
    cases = []
    centre = pick(land, seed, 1)
    cases.append(('raise +200 r2', {'elevation': brush(centre, 2, 200)}, None, keep, len(keep)))
    centre = pick(land, seed, 2)
    cases.append(('lower -150 r2', {'elevation': brush(centre, 2, -150)}, None, keep, len(keep)))
    centre = pick(land, seed, 3)
    cases.append(('paint conifer r2', {'biome': brush(centre, 2, climate.CONIFER)}, None, keep, len(keep)))
    open_land = [i for i in land if base.biome[i] in (climate.GRASSLAND, climate.DECIDUOUS, climate.FARMLAND)
                 and all(dist2(i % W, i // W, s.x, s.y) >= 9 for s in base.settlements)]
    if open_land:
        at = pick(open_land, seed, 4)
        village = settle.Settlement(-1, at % W, at // W, 'village', 1200)
        cases.append(('add village', {}, [village], keep + [village], len(keep) + 1))
    label = roads.landmasses(W, H, base.biome)
    linked = {tuple(sorted((p[0], p[-1]))) for p in base.roads}
    pairs = [(cell(s), cell(t)) for s in base.settlements for t in base.settlements
             if cell(s) < cell(t) and label[cell(s)] == label[cell(t)] and dist2(s.x, s.y, t.x, t.y) <= 400
             and (cell(s), cell(t)) not in linked]
    if pairs:
        cases.append(('add road', {'roads': [pick(pairs, seed, 5)]}, None, keep, len(keep)))
    gone = pick(others, seed, 6)
    rest = [s for s in keep if s is not gone]
    cases.append(('delete settlement', {'forbid': [cell(gone)]}, None, rest, len(rest)))
    return cases


def summarise(rows):
    keys = list(rows[0].keys())
    out = {}
    for k in keys:
        vals = [r[k] for r in rows]
        out[k] = (statistics.median(vals), min(vals), max(vals), sum(1 for v in vals if v))
    return out


def blast(n):
    results = {}
    t0 = time.perf_counter()
    for k, seed in enumerate(seeds(n)):
        base = staged(seed)
        assert fingerprint(base) == fingerprint(generate(seed)) if k == 0 else True
        for name, edits, free_pins, lock_pins, lock_target in edit_cases(seed, base):
            free = staged(seed, edits, free_pins)
            locked = staged(seed, edits, lock_pins, lock_target)
            results.setdefault((name, 'free'), []).append(compare(base, free))
            results.setdefault((name, 'locked'), []).append(compare(base, locked))
        print(f'seed {k + 1}/{n} {time.perf_counter() - t0:.0f}s', file=sys.stderr)
    for (name, mode), rows in results.items():
        print(f'\n## {name} [{mode}] n={len(rows)}')
        for key, (med, lo, hi, nonzero) in summarise(rows).items():
            print(f'  {key:36s} median {med:7.1f}  [{lo}-{hi}]  nonzero in {nonzero}/{len(rows)}')


def blast_uid(n):
    """The settlement edits again, with landmark draws and place seeds keyed by settlement cell."""
    wanted = ('raise +200 r2', 'lower -150 r2', 'add village', 'delete settlement')
    results = {}
    t0 = time.perf_counter()
    for k, seed in enumerate(seeds(n)):
        base = staged(seed, uid_keys=True)
        for name, edits, free_pins, lock_pins, lock_target in edit_cases(seed, base):
            if name not in wanted:
                continue
            free = staged(seed, edits, free_pins, uid_keys=True)
            locked = staged(seed, edits, lock_pins, lock_target, uid_keys=True)
            results.setdefault((name, 'free, uid keys'), []).append(compare(base, free))
            results.setdefault((name, 'locked, uid keys'), []).append(compare(base, locked))
        print(f'seed {k + 1}/{n} {time.perf_counter() - t0:.0f}s', file=sys.stderr)
    keys = ('settlements lost', 'settlements new', 'contexts changed', 'layouts changed, cell-keyed seed',
            'field landmarks', 'field roads', 'field tier', 'pin conflicts', 'total settlements')
    for (name, mode), rows in results.items():
        print(f'\n## {name} [{mode}] n={len(rows)}')
        for key, (med, lo, hi, nonzero) in summarise(rows).items():
            if key in keys:
                print(f'  {key:36s} median {med:7.1f}  [{lo}-{hi}]  nonzero in {nonzero}/{len(rows)}')


def stages(n):
    times = {}
    for seed in seeds(n):
        for rep in range(3):
            last = [time.perf_counter()]

            def tick(name):
                now = time.perf_counter()
                if rep:
                    times.setdefault(name, []).append((now - last[0]) * 1000)
                last[0] = now
            staged(seed, clock=tick)
    total = sum(statistics.median(v) for v in times.values())
    for name, v in times.items():
        med = statistics.median(v)
        print(f'{name:12s} median {med:7.1f} ms [{min(v):.1f}-{max(v):.1f}]  {100 * med / total:4.1f}%  n={len(v)}')
    print(f'total median sum {total:.0f} ms')


def churn(a, b):
    cells = a.width * a.height
    terrain_changed = sum(x != y for ra, rb in zip(a.terrain, b.terrain) for x, y in zip(ra, rb)) / cells
    tiles_changed = sum(x != y for ra, rb in zip(a.tiles, b.tiles) for x, y in zip(ra, rb)) / cells

    def kept(category):
        sa = {(s.name, s.x, s.y) for s in a.standing if s.category == category}
        sb = {(s.name, s.x, s.y) for s in b.standing if s.category == category}
        return len(sa & sb) / len(sa) if sa else None
    return terrain_changed, tiles_changed, kept('houses'), kept('buildings')


def perturbations(ctx):
    free = [s for s in 'nesw' if s not in ctx.sea]
    out = [('population x2 (control)', dataclasses.replace(ctx, population=ctx.population * 2))]
    side = next((s for s in free if s not in ctx.roads), None)
    if side:
        out.append(('road side +1', dataclasses.replace(ctx, roads=''.join(sorted(ctx.roads + side, key='nesw'.index)))))
    side = next((s for s in free if s not in ctx.river), None)
    if side:
        out.append(('river side +1', dataclasses.replace(ctx, river=''.join(sorted(ctx.river + side, key='nesw'.index)))))
    swap = {'grassland': 'forest-deciduous', 'forest-deciduous': 'grassland', 'farmland': 'grassland',
            'forest-conifer': 'forest-deciduous', 'hills': 'grassland'}
    if ctx.biome in swap:
        out.append(('biome swap', dataclasses.replace(ctx, biome=swap[ctx.biome])))
    out.append(('temperature +8', dataclasses.replace(ctx, temperature=min(255, ctx.temperature + 8))))
    out.append(('moisture +8', dataclasses.replace(ctx, moisture=min(255, ctx.moisture + 8))))
    extra = {'capital': 'fountain', 'city': 'fountain', 'town': 'fountain', 'village': 'windmill'}.get(ctx.tier)
    if extra and extra not in ctx.landmarks:
        out.append(('landmark +1', dataclasses.replace(ctx, landmarks=ctx.landmarks + (extra,))))
    out.append(('place seed +1', dataclasses.replace(ctx, seed=(ctx.seed + 1) & 0xFFFFFFFF)))
    return out


def places(n):
    import place
    from world import place_contexts
    rows = {}
    checked = False
    for seed in seeds(n):
        ctxs = [c for c in place_contexts(generate(seed)) if c.tier]
        sample = [c for c in ctxs if c.tier in ('city', 'town')][:1] + [c for c in ctxs if c.tier in ('village', 'hamlet')][:2]
        for ctx in sample:
            base = place.build(ctx)
            if not checked:
                again = place.build(ctx)
                assert (again.terrain, again.tiles, again.standing) == (base.terrain, base.tiles, base.standing)
                checked = True
            for name, other in perturbations(ctx):
                rows.setdefault(name, []).append(churn(base, place.build(other)))
    print('perturbation               n   terrain changed      tiles changed        houses kept          civic kept')
    for name, vals in rows.items():
        cols = []
        for j in range(4):
            v = [r[j] for r in vals if r[j] is not None]
            cols.append(f'{100 * statistics.median(v):5.1f}% [{100 * min(v):.0f}-{100 * max(v):.0f}]' if v else 'n/a')
        print(f'{name:24s} {len(vals):3d}   ' + '   '.join(f'{c:18s}' for c in cols))


def footprints(layout, frame, tile):
    out = []
    for s in layout.standing:
        if s.category in ('houses', 'buildings', 'landmarks', 'wonders'):
            f = frame(s.category, s.name)
            if 'footprint' in f:
                fw, fh = f['footprint']
                out.append((s.category, s.name, (s.x - fw * tile // 2) // tile, (s.y + 1) // tile - fh, fw, fh))
    return out


def pins(n):
    """Would a house pinned at its old tiles still fit after a country edit changes the context?"""
    import place
    from spritekit import TILE
    from world import place_contexts
    rows = {}
    for seed in seeds(n):
        ctxs = [c for c in place_contexts(generate(seed)) if c.tier]
        sample = [c for c in ctxs if c.tier in ('city', 'town')][:1] + [c for c in ctxs if c.tier in ('village', 'hamlet')][:2]
        for ctx in sample:
            base = place.build(ctx)
            houses = [f for f in footprints(base, place.frame, TILE) if f[0] == 'houses']
            for name, other in perturbations(ctx):
                new = place.build(other)
                taken = {}
                for f in footprints(new, place.frame, TILE):
                    for y in range(f[3], f[3] + f[5]):
                        for x in range(f[2], f[2] + f[4]):
                            taken[(x, y)] = f
                same = clash = 0
                for h in houses:
                    tiles = [(x, y) for y in range(h[3], h[3] + h[5]) for x in range(h[2], h[2] + h[4])]
                    if all(taken.get(t) == h for t in tiles):
                        same += 1
                    elif any(new.terrain[y][x] not in place.OPEN or (t in taken and taken[t] != h)
                             for t in tiles for x, y in (t,)):
                        clash += 1
                rows.setdefault(name, []).append((same / len(houses), clash / len(houses)) if houses else None)
    print('perturbation               n   house unchanged        pinned house would clash')
    for name, vals in rows.items():
        vals = [v for v in vals if v]
        a, b = [v[0] for v in vals], [v[1] for v in vals]
        print(f'{name:24s} {len(vals):3d}   {100 * statistics.median(a):5.1f}% [{100 * min(a):.0f}-{100 * max(a):.0f}]'
              f'      {100 * statistics.median(b):5.1f}% [{100 * min(b):.0f}-{100 * max(b):.0f}]')


def pack_world(w):
    out = bytearray()
    for v in w.elevation:
        out += (v & 0xFFFF).to_bytes(2, 'little')
    for column in (w.biome, w.temperature, w.moisture, w.river, w.coast):
        out += bytes(column)
    dirs = {(dx, dy): k + 1 for k, (dx, dy) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0), (1, -1), (1, 1), (-1, 1), (-1, -1)))}
    out += bytes(0 if r < 0 else dirs[(r % W - i % W, r // W - i // W)] for i, r in enumerate(w.receiver))
    out += len(w.settlements).to_bytes(2, 'little')
    for s in w.settlements:
        out += bytes((s.x, s.y, TIERS.index(s.tier), len(s.landmarks))) + s.population.to_bytes(4, 'little')
        out += bytes(LANDMARKS.index(k) for k in s.landmarks)
    out += len(w.roads).to_bytes(2, 'little')
    for path in w.roads:
        out += len(path).to_bytes(2, 'little') + path[0].to_bytes(2, 'little')
        out += bytes(dirs[(b % W - a % W, b // W - a // W)] for a, b in zip(path, path[1:]))
    out += bytes([len(w.wonders)]) + bytes(v for p in w.wonders for v in (WONDERS.index(p.kind), p.x, p.y))
    out += bytes([len(w.landmarks)]) + bytes(v for p in w.landmarks for v in (LANDMARKS.index(p.kind), p.x, p.y))
    return bytes(out)


def sizes(n):
    raw, deflated = [], []
    for seed in seeds(n):
        data = pack_world(generate(seed))
        c = zlib.compressobj(9, zlib.DEFLATED, -15)
        z = c.compress(data) + c.flush()
        raw.append(len(data))
        deflated.append(len(z))
    b64 = [(z + 2) // 3 * 4 for z in deflated]
    for name, v in (('raw bytes', raw), ('deflate-raw bytes', deflated), ('base64 chars', b64)):
        print(f'{name:18s} median {statistics.median(v):8.0f} [{min(v)}-{max(v)}] n={len(v)}  zlib {zlib.ZLIB_VERSION}')


def food(w):
    """Farmable cells (farmland, grassland, broadleaf) within each settlement's field radius plus one."""
    out = []
    for s in w.settlements:
        r = settle.FIELDS[s.tier] + 1
        cnt = sum(1 for y in range(max(0, s.y - r), min(H, s.y + r + 1)) for x in range(max(0, s.x - r), min(W, s.x + r + 1))
                  if dist2(x, y, s.x, s.y) <= r * r and w.biome[y * W + x] in (climate.FARMLAND, climate.GRASSLAND, climate.DECIDUOUS))
        farm = sum(1 for y in range(max(0, s.y - r), min(H, s.y + r + 1)) for x in range(max(0, s.x - r), min(W, s.x + r + 1))
                   if dist2(x, y, s.x, s.y) <= r * r and w.biome[y * W + x] == climate.FARMLAND)
        out.append((s.tier, s.population, cnt, farm))
    return out


def quality(w):
    biome = bytearray(climate.GRASSLAND if b == climate.FARMLAND else b for b in w.biome)
    water = bytearray(b in WATER for b in biome)
    slope = climate.slopes(W, H, w.elevation, water)
    return settle.habitability(W, H, biome, w.elevation, w.river, w.coast, w.temperature, w.moisture, slope)


def regions(w, hearths):
    """Multi-source Dijkstra over land with road-like terrain costs; returns region per cell (-1 unreached)."""
    nbrs = neighbours(W, H)
    cost = [None if b in WATER else 16 + roads.COVER.get(b, 0) for b in w.biome]
    best = [1 << 60] * (W * H)
    owner = [-1] * (W * H)
    heap = []
    for k, c in enumerate(hearths):
        best[c] = 0
        owner[c] = k
        heap.append((0, k, c))
    heapq.heapify(heap)
    while heap:
        d, k, c = heapq.heappop(heap)
        if d > best[c] or owner[c] != k:
            continue
        for m in nbrs[c]:
            if cost[m] is None:
                continue
            nd = d + cost[m] * (14 if (m % W != c % W and m // W != c // W) else 10)
            if nd < best[m] or (nd == best[m] and k < owner[m]):
                best[m], owner[m] = nd, k
                heapq.heappush(heap, (nd, k, m))
    return owner


def gap(w, hearths, q):
    """(area gap, people gap, share ratio): spread of mean cell quality, of population-weighted
    settlement-cell quality, and max/min population share across culture regions."""
    owner = regions(w, hearths)
    k = len(hearths)
    sums, cnts, wq, pop = [0] * k, [0] * k, [0] * k, [0] * k
    for i, o in enumerate(owner):
        if o >= 0:
            sums[o] += q[i]
            cnts[o] += 1
    for s in w.settlements:
        o = owner[cell(s)]
        if o >= 0:
            wq[o] += q[cell(s)] * s.population
            pop[o] += s.population
    if min(cnts) == 0 or min(pop) == 0:
        return 9.99, 9.99, 99.0
    area = [s / c for s, c in zip(sums, cnts)]
    people = [a / p for a, p in zip(wq, pop)]
    return ((max(area) - min(area)) / (sum(sums) / sum(cnts)),
            (max(people) - min(people)) / (sum(wq) / sum(pop)),
            max(pop) / min(pop))


def poisson(land, seed, count, spacing2, salt):
    out = []
    for t in range(4000):
        c = land[draw(seed, EDIT, 50, salt, t) % len(land)]
        if all(dist2(c % W, c // W, o % W, o // W) >= spacing2 for o in out):
            out.append(c)
            if len(out) == count:
                return out
    return out


def checks(n):
    reach, food_rows, gaps_poisson, gaps_uniform, tries = [], [], [], [], []
    for seed in seeds(n):
        w = generate(seed)
        reach.append((capital_reach(w), len(w.settlements)))
        food_rows += food(w)
        q = quality(w)
        main = roads.landmasses(W, H, w.biome)
        cap = main[cell(w.settlements[0])]
        land = [i for i in inland(w) if main[i] == cap]
        count = 4 + draw(seed, EDIT, 49) % 5
        first_pass = None
        for salt in range(40):
            g = gap(w, poisson(land, seed, count, 144, salt), q)
            gaps_poisson.append(g)
            if first_pass is None and g[1] <= 0.10 and g[2] <= 2.0:
                first_pass = salt + 1
            hearths = [land[draw(seed, EDIT, 60, salt, j) % len(land)] for j in range(count)]
            gaps_uniform.append(gap(w, hearths, q))
        tries.append(first_pass or 99)
    per_k = []
    for seed in seeds(n):
        w = generate(seed)
        farmable = sum(1 for b in w.biome if b in (climate.FARMLAND, climate.GRASSLAND, climate.DECIDUOUS))
        per_k.append(farmable * 1000 / sum(s.population for s in w.settlements))
    print(f'country farmable cells per 1,000 people: median {statistics.median(per_k):.2f} [{min(per_k):.2f}-{max(per_k):.2f}] n={len(per_k)}')
    islands = [r for r, _ in reach]
    total = sum(t for _, t in reach)
    print(f'settlements with no land route to the capital: {sum(islands)} of {total} '
          f'({100 * sum(islands) / total:.1f}%); worlds with any: {sum(1 for r in islands if r)}/{len(islands)}')
    for tier in TIERS:
        rows = [r for r in food_rows if r[0] == tier]
        if rows:
            farmable = [r[2] for r in rows]
            farms = [r[3] for r in rows]
            zero = sum(1 for f in farms if f == 0)
            print(f'{tier:8s} n={len(rows):4d} farmable cells median {statistics.median(farmable):4.0f} [{min(farmable)}-{max(farmable)}]'
                  f'  farmland median {statistics.median(farms):3.0f}  with no farmland {zero} ({100 * zero / len(rows):.0f}%)')
    for name, g in (('keyed Poisson-disc hearths', gaps_poisson), ('uniform random hearths', gaps_uniform)):
        ok = [v for v in g if v[0] < 9]
        for j, metric in enumerate(('area-mean quality gap', 'people-weighted quality gap')):
            vals = [v[j] for v in ok]
            line = ', '.join(f'<= {int(t * 100)}%: {100 * sum(1 for v in vals if v <= t) / len(vals):.0f}%' for t in (0.05, 0.10, 0.20, 0.30))
            print(f'{name}, {metric}: n={len(vals)} median {100 * statistics.median(vals):.1f}% '
                  f'[{100 * min(vals):.1f}-{100 * max(vals):.1f}]  pass {line}')
        shares = [v[2] for v in ok]
        line = ', '.join(f'<= {t}x: {100 * sum(1 for v in shares if v <= t) / len(shares):.0f}%' for t in (1.5, 2.0, 3.0))
        print(f'{name}, largest/smallest population share: median {statistics.median(shares):.2f}x  pass {line}')
        both = sum(1 for v in ok if v[1] <= 0.10 and v[2] <= 2.0)
        print(f'{name}, people gap <= 10% and shares <= 2x: {both} of {len(ok)} layouts')
    found = sum(1 for t in tries if t < 99)
    print(f'Poisson-disc tries to the first layout passing both: median {statistics.median(tries)} [{min(tries)}-{max(tries)}]; '
          f'found within 40 tries in {found} of {len(tries)} worlds')


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'blast'
    count = int(sys.argv[2]) if len(sys.argv) > 2 else {'blast': 30, 'uid': 30, 'stages': 5, 'places': 10, 'pins': 10, 'sizes': 20, 'checks': 20}[mode]
    {'blast': blast, 'uid': blast_uid, 'stages': stages, 'places': places, 'pins': pins, 'sizes': sizes,
     'checks': checks}[mode](count)
