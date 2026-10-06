"""Natural wonders and built landmarks. Each wonder kind scores every cell by its own site rule
and needs a minimum score, so a world without desert gets no dune; 4-8 kinds are tried in a
keyed order. Landmarks sit in settlements by tier and site with keyed chances, plus viaducts,
observatories and lighthouses on cells of their own.
"""
from dataclasses import dataclass

from climate import (CLIFFS, CONIFER, DECIDUOUS, FARMLAND, GRASSLAND, HILLS, HILLS_AT, LAKE, MOUNTAIN, OCEAN,
                     PEAK, SAND, slopes)
from grid import ORTHO, dist2, distances, neighbours
from model import LANDMARKS, TIERS, WONDERS
from rng import LANDMARK, WONDER, below, chance, draw, shuffled

WONDER_GAP2 = 8 * 8
# Sub-purposes inside the WONDER and LANDMARK streams.
COUNT, ORDER, TIE, HOTSPOT, HOT_REACH, CAVE = range(6)
ODDS, ARRANGE, SPOTS, LOOKOUTS, GAPS = range(5)

# Per mille by tier (capital, city, town, village, hamlet); each kind also needs its site.
CHANCES = {
    'clock-tower': (1000, 600, 300, 0, 0),
    'library': (800, 500, 0, 0, 0),
    'fountain': (500, 400, 250, 0, 0),
    'glasshouse': (300, 300, 250, 0, 0),
    'amphitheatre': (700, 600, 0, 0, 0),
    'garden-terraces': (0, 0, 500, 500, 0),
    'windmill': (0, 0, 0, 450, 400),
    'lighthouse': (700, 700, 600, 100, 0),
}


@dataclass(frozen=True)
class Spot:
    kind: str
    x: int
    y: int


@dataclass
class Land:
    """Fields the site rules share, computed once per world by `survey`."""
    w: object
    nbrs: tuple
    water: bytearray
    slope: list
    forest_depth: list
    town: list
    big: list
    wet: list
    hotspot: int
    hot_reach: int


def survey(world):
    w, n = world, world.width * world.height
    nbrs = neighbours(w.width, w.height)
    water = bytearray(b in (OCEAN, LAKE) for b in w.biome)
    forest = bytearray(b in (DECIDUOUS, CONIFER) for b in w.biome)
    homes = [s.y * w.width + s.x for s in w.settlements]
    big = [s.y * w.width + s.x for s in w.settlements if s.tier in ('capital', 'city')]
    hot = [i for i, b in enumerate(w.biome) if b in (HILLS, MOUNTAIN)]
    return Land(w=w, nbrs=nbrs, water=water, slope=slopes(w.width, w.height, w.elevation, water),
                forest_depth=distances(nbrs, [i for i in range(n) if not forest[i]], forest, limit=8),
                town=distances(nbrs, homes, limit=12), big=distances(nbrs, big, limit=12),
                wet=distances(nbrs, [i for i in range(n) if water[i] or w.river[i]], limit=8),
                hotspot=max(hot, key=lambda i: (draw(w.seed, WONDER, HOTSPOT, i), i)) if hot else -1,
                hot_reach=6 + below(5, w.seed, WONDER, HOT_REACH))


def _xy(L, i):
    return i % L.w.width, i // L.w.width


def _at(L, x, y):
    return y * L.w.width + x if 0 <= x < L.w.width and 0 <= y < L.w.height else -1


def _framed(L, i):
    """Far enough inside the map for an icon that rises into the row above."""
    x, y = _xy(L, i)
    return 1 <= x < L.w.width - 1 and 2 <= y < L.w.height - 1


def _heated(L, i):
    return L.hotspot >= 0 and dist2(*_xy(L, i), *_xy(L, L.hotspot)) <= L.hot_reach * L.hot_reach


def _count(L, i, biomes):
    return sum(1 for m in L.nbrs[i] if L.w.biome[m] in biomes)


def _waterfall(L, i):
    w, r = L.w, L.w.receiver[i]
    if not w.river[i] or r < 0 or w.biome[r] == LAKE:
        return 0
    drop = w.elevation[i] - max(0, w.elevation[r])
    return drop * 2 + w.river[i] * 20 + (40 if w.elevation[i] >= HILLS_AT else 0) if drop >= 60 else 0


def _canyon_view(L, i):
    w, r = L.w, L.w.receiver[i]
    if not w.river[i] or r < 0 or w.moisture[i] >= 150 or not 150 <= w.elevation[i] <= 650:
        return 0
    (x, y), (rx, ry) = _xy(L, i), _xy(L, r)
    px, py = ry - y, x - rx
    banks = []
    for sign in (1, -1):
        cells = [_at(L, x + sign * k * px, y + sign * k * py) for k in (1, 2)]
        banks.append(max((w.elevation[c] for c in cells if c >= 0), default=0))
    cut = min(banks) - w.elevation[i]
    return cut * 3 + 150 - w.moisture[i] if cut >= 50 else 0


def _giant_tree(L, i):
    if L.forest_depth[i] < 2 or L.w.moisture[i] < 140 or L.town[i] < 4:
        return 0
    return L.forest_depth[i] * 25 + L.w.moisture[i] // 2


def _sea_arch(L, i):
    w = L.w
    if w.coast[i] != CLIFFS:
        return 0
    x, y = _xy(L, i)
    open_sea = sum(1 for dx, dy in ORTHO
                   if all((c := _at(L, x + k * dx, y + k * dy)) >= 0 and w.biome[c] == OCEAN for k in (1, 2, 3)))
    return w.elevation[i] + open_sea * 40 if open_sea else 0


def _stone_arch(L, i):
    w = L.w
    t, m, b = w.temperature[i], w.moisture[i], w.biome[i]
    if t < 130 or m > 120:
        return 0
    if b in (HILLS, MOUNTAIN):
        edge = 30 if _count(L, i, (SAND,)) else 0
    elif b == SAND and _count(L, i, (HILLS, MOUNTAIN)):
        edge = 40
    else:
        return 0
    return L.slope[i] * 2 + edge + t - 130 + 120 - m


def _dune(L, i):
    w = L.w
    if w.biome[i] != SAND or w.temperature[i] < 150 or w.moisture[i] > 90:
        return 0
    sand = _count(L, i, (SAND,))
    return sand * 15 + w.temperature[i] - 150 + 90 - w.moisture[i] if sand >= 6 else 0


def _glacier(L, i):
    w = L.w
    if w.biome[i] not in (PEAK, MOUNTAIN) or w.temperature[i] > 40:
        return 0
    return (40 - w.temperature[i]) * 4 + w.elevation[i] // 10 + 1


def _crystal_cave(L, i):
    w = L.w
    if w.biome[i] not in (HILLS, MOUNTAIN) or w.river[i] or L.slope[i] < 60:
        return 0
    return L.slope[i] + draw(w.seed, WONDER, CAVE, i) % 64


def _hot_springs(L, i):
    b = L.w.biome[i]
    hilly = b == HILLS or _count(L, i, (HILLS,))
    if not _heated(L, i) or L.water[i] or b in (MOUNTAIN, PEAK) or not hilly or L.wet[i] > 2:
        return 0
    return 100 - 30 * L.wet[i] + L.slope[i] // 4


def _geyser(L, i):
    if not _heated(L, i) or L.water[i] or L.w.biome[i] in (MOUNTAIN, PEAK, HILLS) or L.slope[i] > 40:
        return 0
    return 100 - L.slope[i]


def _caldera_lake(L, i):
    if not _heated(L, i) or L.w.biome[i] not in (HILLS, MOUNTAIN):
        return 0
    return L.w.elevation[i] // 4


SITES = {'waterfall': _waterfall, 'canyon-view': _canyon_view, 'giant-tree': _giant_tree, 'sea-arch': _sea_arch,
         'stone-arch': _stone_arch, 'dune': _dune, 'glacier': _glacier, 'crystal-cave': _crystal_cave,
         'hot-springs': _hot_springs, 'geyser': _geyser, 'caldera-lake': _caldera_lake}
assert set(SITES) == set(WONDERS)


def wonders(world, L):
    seed, n = world.seed, world.width * world.height
    wanted = max(4, min(8, 2 + (n - sum(L.water)) // 900 + below(3, seed, WONDER, COUNT)))
    placed = []
    for kind in shuffled(WONDERS, seed, WONDER, ORDER):
        if len(placed) == wanted:
            break
        rule, k = SITES[kind], WONDERS.index(kind)
        best = None
        for i in range(n):
            if L.water[i] or L.town[i] < 2 or L.big[i] < 3 or not _framed(L, i):
                continue
            score = rule(L, i)
            x, y = _xy(L, i)
            if score <= 0 or any(dist2(x, y, p.x, p.y) < WONDER_GAP2 for p in placed):
                continue
            key = (score, draw(seed, WONDER, TIE, k, i))
            if best is None or key > best[0]:
                best = (key, i)
        if best:
            placed.append(Spot(kind, *_xy(L, best[1])))
    return placed


def _lighthouse_spot(world, L, s, used):
    """A coastal land cell beside the settlement, facing the most sea, below it if possible."""
    best = None
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            i = _at(L, s.x + dx, s.y + dy)
            if i < 0 or L.water[i] or world.coast[i] == 0 or L.town[i] == 0 or i in used or not _framed(L, i):
                continue
            key = (_count(L, i, (OCEAN,)) + 2 * (dy >= 0), draw(world.seed, LANDMARK, SPOTS, s.uid, i))
            if best is None or key > best[0]:
                best = (key, i)
    return best[1] if best else -1


def _fits(world, L, s, kind):
    w, i = world, s.y * world.width + s.x
    if kind == 'glasshouse':
        return 90 <= w.temperature[i] <= 170
    if kind == 'amphitheatre':
        return L.slope[i] >= 40 or _count(L, i, (HILLS, MOUNTAIN)) >= 2
    if kind == 'garden-terraces':
        return w.biome[i] == HILLS or _count(L, i, (HILLS,)) >= 2
    if kind == 'windmill':
        return w.biome[i] in (GRASSLAND, FARMLAND) or _count(L, i, (FARMLAND,)) >= 1
    return True


def landmarks(world, L, wonder_spots):
    """Fills each settlement's in-place landmarks; returns the landmarks with cells of their own."""
    seed = world.seed
    used = {s.y * world.width + s.x for s in world.settlements} | {p.y * world.width + p.x for p in wonder_spots}
    out = []
    for s in world.settlements:
        tier = TIERS.index(s.tier)
        light = _lighthouse_spot(world, L, s, used) if world.coast[s.y * world.width + s.x] else -1
        kinds = [kind for kind in CHANCES
                 if (kind != 'lighthouse' or light >= 0) and _fits(world, L, s, kind)
                 and chance(CHANCES[kind][tier], seed, LANDMARK, ODDS, s.uid, LANDMARKS.index(kind))]
        kinds = shuffled(kinds, seed, LANDMARK, ARRANGE, s.uid)
        if s.tier == 'capital':
            kinds.remove('clock-tower')
            kinds.insert(0, 'clock-tower')
        s.landmarks = tuple(kinds[:3 if s.tier == 'capital' else 2])
        if 'lighthouse' in s.landmarks:
            used.add(light)
            out.append(Spot('lighthouse', *_xy(L, light)))
    return out + _viaducts(world, L, used) + _observatories(world, L, used)


def _viaducts(world, L, used):
    """Where a road crosses a river between steep banks: at most two, apart from each other."""
    w, bridges = world, set(world.bridges)
    depth = {}
    for path in w.roads:
        for k in range(2, len(path) - 2):
            c = path[k]
            if c in bridges and c not in used:
                bank = min(max(w.elevation[path[k - 1]], w.elevation[path[k - 2]]),
                           max(w.elevation[path[k + 1]], w.elevation[path[k + 2]]))
                depth[c] = max(depth.get(c, 0), bank - w.elevation[c])
    ranked = sorted(((d, draw(w.seed, LANDMARK, GAPS, c), c) for c, d in depth.items() if d >= 40), reverse=True)
    out = []
    for _, _, c in ranked:
        x, y = _xy(L, c)
        if len(out) < 2 and all(dist2(x, y, p.x, p.y) >= WONDER_GAP2 for p in out):
            used.add(c)
            out.append(Spot('viaduct', x, y))
    return out


def _observatories(world, L, used):
    """High ground 2-4 cells from a town or city: one or two per world, apart from each other."""
    w = world
    towns = [(s.x, s.y) for s in w.settlements if s.tier in ('capital', 'city', 'town')]
    ranked = []
    for i, e in enumerate(w.elevation):
        if L.water[i] or e < HILLS_AT or i in used or w.biome[i] == PEAK or not _framed(L, i):
            continue
        x, y = _xy(L, i)
        if any(4 <= dist2(x, y, tx, ty) <= 16 for tx, ty in towns):
            ranked.append((e + draw(w.seed, LANDMARK, LOOKOUTS, i) % 50, i))
    wanted = 1 + below(2, w.seed, LANDMARK, LOOKOUTS)
    out = []
    for _, i in sorted(ranked, reverse=True):
        x, y = _xy(L, i)
        if len(out) < wanted and all(dist2(x, y, p.x, p.y) >= WONDER_GAP2 for p in out):
            used.add(i)
            out.append(Spot('observatory', x, y))
    return out
