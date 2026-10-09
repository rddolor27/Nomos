"""Countries: 3-5 per world, each grown from its capital by one multi-source Dijkstra over terrain
costs, so borders bend to mountains, lakes, rivers and coasts. Countries are map facts only: no
other stage reads them (owner, 9 October 2026).
"""
import heapq
from dataclasses import dataclass
from math import isqrt

from climate import LAKE, OCEAN
from grid import dist2, neighbours
from roads import COVER, DIAGONAL, STRAIGHT
from rng import below

# The countries' world stream. It joins rng.py's list with the TypeScript port, because vectors.py
# records every stream there into sim-core's kernel fixtures (M8.1 plan, Ruling 1).
COUNTRY = 13
COUNT, COLOUR = range(2)
COLOURS = 5
CAPITAL_TIERS = ('capital', 'city', 'town')
# Tuned on previews. Water costs far more than any land step, so an island without a capital joins
# the country with the cheapest crossing.
RIVER_STEP = 30
WATER = 640
FAR = 1 << 30


@dataclass(frozen=True)
class Country:
    id: int         # 1..K, its value in World.country
    capital: int    # settlement id
    colour: int     # index into the map colour table


def count(seed):
    return 3 + below(3, seed, COUNTRY, COUNT)


def capitals(settlements, k, land):
    """Settlement ids: the largest first, then each town or larger in population order at least a
    spacing from every capital chosen; the spacing shrinks by a quarter until k fit."""
    candidates = [s for s in settlements if s.tier in CAPITAL_TIERS]
    spacing = isqrt(land // k)
    while True:
        chosen = []
        for s in candidates:
            if all(dist2(s.x, s.y, c.x, c.y) >= spacing * spacing for c in chosen):
                chosen.append(s)
                if len(chosen) == k:
                    return [c.id for c in chosen]
        if spacing == 0:
            return [c.id for c in chosen]
        spacing = spacing * 3 // 4


def _slips(c, a, b, m, wet, river, receiver):
    """A diagonal from c to m past side cells a and b may not cut a water corner between two land
    cells, nor slip between two river cells that flow into each other, as roads may not."""
    if not wet[c] and not wet[m] and (wet[a] or wet[b]):
        return True
    return bool(river[a] and river[b] and (receiver[a] == b or receiver[b] == a))


def grow(width, height, biome, river, receiver, sources):
    """Each cell's cheapest source, water included, as labels 1.. in source order. The heap key
    (cost, cell) is unique, so a tie goes to the source popped first, whatever the heap's internals."""
    n = width * height
    nbrs = neighbours(width, height)
    wet = [b in (OCEAN, LAKE) for b in biome]
    enter = [WATER if wet[i] else 16 + COVER[b] for i, b in enumerate(biome)]
    cost, label = [FAR] * n, [0] * n
    for k, cell in enumerate(sources, 1):
        cost[cell], label[cell] = 0, k
    heap = [(0, cell) for cell in sources]
    heapq.heapify(heap)
    while heap:
        d, c = heapq.heappop(heap)
        if d > cost[c]:
            continue
        for m in nbrs[c]:
            dx, dy = m % width - c % width, m // width - c // width
            if dx and dy and _slips(c, c + dx, c + dy * width, m, wet, river, receiver):
                continue
            step = (DIAGONAL if dx and dy else STRAIGHT) * enter[m] // 16 + RIVER_STEP * river[m]
            if d + step < cost[m]:
                cost[m], label[m] = d + step, label[c]
                heapq.heappush(heap, (d + step, m))
    return label
