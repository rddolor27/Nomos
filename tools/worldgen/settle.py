"""Settlements: habitability from biome, water, slope and height; greedy placement by keyed,
jittered score with a minimum spacing; rank-size populations and tiers; then farmland round
every settlement, wider for bigger ones.
"""
from dataclasses import dataclass

from climate import BEACH, CLIFFS, CONIFER, DECIDUOUS, FARMLAND, GRASSLAND, HILLS, LAKE, MARSH, MOUNTAIN, SAND
from grid import dist2, neighbours
from rng import SETTLEMENT, below, draw

BASE = {GRASSLAND: 100, DECIDUOUS: 75, CONIFER: 55, HILLS: 55, MARSH: 25, SAND: 20, MOUNTAIN: 5}
MIN_SCORE = 30
# Settlement icons rise up to four rows above their cell, so keep them clear of the top edge.
MARGIN, TOP_MARGIN = 2, 4
FIELDS = {'capital': 3, 'city': 2, 'town': 2, 'village': 1, 'hamlet': 1}
# The best few sites, which become the capital and cities, keep further apart.
LEADERS, LEADER_SPACING = 5, 12 * 12
# A country map shows only its notable places, so the k-th shown place has a true rank that
# grows faster than k: exactly P1/k for the top HEAD, then steeper, reaching the villages and
# hamlets that plain P1/k over 35-75 places never would.
HEAD, TAIL = 6, 2
PER, JITTER, CAPITAL, SIZE, FIELD = range(5)


@dataclass
class Settlement:
    id: int
    x: int
    y: int
    tier: str
    population: int
    # The settlement's cell. Per-settlement draws key on it, because ids follow population rank
    # and an edit that adds or removes a place would re-roll every place ranked below it.
    uid: int = 0
    landmarks: tuple = ()


def habitability(width, height, biome, elevation, river, coast, temperature, moisture, slope):
    nbrs = neighbours(width, height)
    out = [0] * (width * height)
    for i, b in enumerate(biome):
        x, y = i % width, i // width
        if b not in BASE or not (MARGIN <= x < width - MARGIN and TOP_MARGIN <= y < height - MARGIN):
            continue
        h = BASE[b]
        if river[i]:
            h += 30 + 10 * river[i]
        elif any(river[m] for m in nbrs[i]):
            h += 20
        h += 35 if coast[i] == BEACH else 15 if coast[i] == CLIFFS else 0
        if any(biome[m] == LAKE for m in nbrs[i]):
            h += 25
        t = temperature[i]
        h -= slope[i] // 3 + elevation[i] // 12 + max(0, 60 - t) // 2 + max(0, t - 200) // 2
        h -= max(0, 50 - moisture[i]) // 2
        out[i] = max(0, h)
    return out


def _sites(seed, width, height, score, land):
    """Best sites first, each at least a spacing from those already taken (the first few further
    still); the spacing shrinks until the land's quota of settlements fits."""
    target = max(4, land // (50 + below(21, seed, SETTLEMENT, PER)))
    jittered = {i: s * (768 + draw(seed, SETTLEMENT, JITTER, i) % 513) // 1024
                for i, s in enumerate(score) if s >= MIN_SCORE}
    ranked = sorted(jittered, key=lambda i: (-jittered[i], i))
    spacing = land * 64 // (target * 100)
    while True:
        taken = []
        for i in ranked:
            x, y = i % width, i // width
            need = LEADER_SPACING if len(taken) < LEADERS else spacing
            if all(dist2(x, y, tx, ty) >= need for tx, ty in taken):
                taken.append((x, y))
                if len(taken) == target:
                    return taken
        if spacing <= 4:
            return taken
        spacing = spacing * 3 // 4


def settle(seed, width, height, score, land):
    """Settlements in id order: id 0 is the capital, then by falling population."""
    sites = _sites(seed, width, height, score, land)
    top = 150_000 + below(350_001, seed, SETTLEMENT, CAPITAL)
    people = []
    for k, (x, y) in enumerate(sites, 1):
        late = max(0, k - HEAD)
        rank = k + late * late // TAIL
        people.append(top // rank * (750 + below(501, seed, SETTLEMENT, SIZE, y * width + x)) // 1000)
    order = sorted(range(len(sites)), key=lambda k: (-people[k], k))
    out = []
    for sid, k in enumerate(order):
        x, y = sites[k]
        out.append(Settlement(sid, x, y, _tier(sid, people[k]), people[k], uid=y * width + x))
    return out


def _tier(sid, people):
    if sid == 0:
        return 'capital'
    return 'city' if people >= 50_000 else 'town' if people >= 5_000 else 'village' if people >= 500 else 'hamlet'


def farm(seed, width, biome, settlements):
    """Grassland and broadleaf forest round each settlement turn to fields, out to a ragged
    radius that grows with tier; the settlement's own cell keeps its land."""
    out = bytearray(biome)
    homes = {s.y * width + s.x for s in settlements}
    height = len(biome) // width
    for s in settlements:
        r = FIELDS[s.tier]
        for y in range(max(0, s.y - r - 1), min(height, s.y + r + 2)):
            for x in range(max(0, s.x - r - 1), min(width, s.x + r + 2)):
                i = y * width + x
                if i in homes or biome[i] not in (GRASSLAND, DECIDUOUS):
                    continue
                if dist2(x, y, s.x, s.y) <= r * r + below(3, seed, SETTLEMENT, FIELD, i):
                    out[i] = FARMLAND
    return out
