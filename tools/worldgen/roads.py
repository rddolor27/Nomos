"""Roads: a route graph per landmass (Kruskal's minimum spanning tree plus spanner extras where
the graph detour passes 1.5x), each route then walked cell by cell with A* over slope, height
and cover. Water stops roads except at river crossings, which become bridges, and reusing a
road costs half, so routes merge into trunks. Each road then takes a class: major where it
joins the towns, minor elsewhere. Sea lanes then join the landmasses, port to port.
"""
import heapq
from math import isqrt

from climate import CONIFER, DECIDUOUS, FARMLAND, GRASSLAND, HILLS, LAKE, MARSH, MOUNTAIN, OCEAN, PEAK, SAND, SNOW
from grid import DIAG, ORTHO, dist2, neighbours, parts

COVER = {GRASSLAND: 0, FARMLAND: 0, SAND: 6, DECIDUOUS: 8, CONIFER: 10, SNOW: 12, MARSH: 18, HILLS: 14,
         MOUNTAIN: 48, PEAK: 160}
BRIDGE = 72
STRAIGHT, DIAGONAL = 10, 14
SPAN2 = 14 * 14
MINOR, MAJOR = 0, 1
HUBS = ('capital', 'city', 'town')


def landmasses(width, height, biome):
    return parts(neighbours(width, height, False), bytearray(b not in (OCEAN, LAKE) for b in biome))[0]


def route_graph(settlements, mass, span2=SPAN2):
    """Route edges (a, b) by settlement index: a spanning tree per landmass, then the shortest
    extra pairs within span2 whose way round the graph is over 1.5x the straight line. With
    span2=0 it is the spanning tree alone."""
    n = len(settlements)
    pairs = sorted((dist2(s.x, s.y, t.x, t.y), a, b)
                   for a, s in enumerate(settlements) for b, t in enumerate(settlements)
                   if a < b and mass[a] == mass[b])
    root = list(range(n))

    def find(a):
        while root[a] != a:
            root[a] = root[root[a]]
            a = root[a]
        return a

    links = [[] for _ in range(n)]
    edges, rest = [], []
    for d2, a, b in pairs:
        ra, rb = find(a), find(b)
        if ra != rb:
            root[ra] = rb
            edges.append((a, b))
            links[a].append((b, isqrt(d2 * 100)))
            links[b].append((a, isqrt(d2 * 100)))
        elif d2 <= span2:
            rest.append((d2, a, b))
    for d2, a, b in rest:
        direct = isqrt(d2 * 100)
        if _around(links, a, b, direct * 3 // 2) * 2 > direct * 3:
            edges.append((a, b))
            links[a].append((b, direct))
            links[b].append((a, direct))
    return edges


def _around(links, start, goal, limit):
    best = {start: 0}
    heap = [(0, start)]
    while heap:
        d, c = heapq.heappop(heap)
        if c == goal:
            return d
        if d > limit or d > best[c]:
            continue
        for m, w in links[c]:
            if d + w < best.get(m, limit + 1):
                best[m] = d + w
                heapq.heappush(heap, (d + w, m))
    return limit + 1


def _steps(width, height, biome, river, receiver):
    """Per cell, the moves A* may take: (target, base cost). A diagonal may not cut a water
    corner or slip between two river cells that flow into each other."""
    wet = [b in (OCEAN, LAKE) for b in biome]
    out = []
    for y in range(height):
        for x in range(width):
            moves = []
            for dx, dy in ORTHO + DIAG:
                tx, ty = x + dx, y + dy
                if not (0 <= tx < width and 0 <= ty < height) or wet[ty * width + tx]:
                    continue
                if dx and dy:
                    a, b = y * width + tx, ty * width + x
                    if wet[a] or wet[b] or (river[a] and river[b] and (receiver[a] == b or receiver[b] == a)):
                        continue
                moves.append((ty * width + tx, DIAGONAL if dx and dy else STRAIGHT))
            out.append(tuple(moves))
    return out


def _walk(start, goal, width, steps, enter, elevation, road):
    gx, gy = goal % width, goal // width
    cost = {start: 0}
    came = {start: -1}
    heap = [(0, 0, start)]
    while heap:
        _, g, c = heapq.heappop(heap)
        if c == goal:
            break
        if g > cost[c]:
            continue
        ec = elevation[c]
        for m, base in steps[c]:
            step = base * (enter[m] + abs(elevation[m] - ec) // 4) // 16
            if road[m]:
                step //= 2
            ng = g + step
            if ng < cost.get(m, ng + 1):
                cost[m] = ng
                came[m] = c
                dx, dy = abs(m % width - gx), abs(m // width - gy)
                # Half the octile distance: the cheapest step is a reused road at half price.
                ahead = (STRAIGHT * max(dx, dy) + (DIAGONAL - STRAIGHT) * min(dx, dy)) // 2
                heapq.heappush(heap, (ng + ahead, ng, m))
    path = [goal]
    while came[path[-1]] >= 0:
        path.append(came[path[-1]])
    return path[::-1]


def build(width, height, biome, elevation, river, receiver, settlements):
    """Returns (roads, bridges): one cell path per route, and the river cells roads cross."""
    label = landmasses(width, height, biome)
    cells = [s.y * width + s.x for s in settlements]
    edges = route_graph(settlements, [label[c] for c in cells])
    people = [s.population for s in settlements]

    def pull(edge):
        a, b = edge
        d2 = dist2(settlements[a].x, settlements[a].y, settlements[b].x, settlements[b].y)
        return -(people[a] * people[b] // d2), a, b

    steps = _steps(width, height, biome, river, receiver)
    enter = [16 + COVER.get(b, 0) + max(0, e) // 40 + (BRIDGE if river[i] else 0)
             for i, (b, e) in enumerate(zip(biome, elevation))]
    road = bytearray(width * height)
    roads = []
    for a, b in sorted(edges, key=pull):
        path = _walk(cells[a], cells[b], width, steps, enter, elevation, road)
        for c in path:
            road[c] = 1
        roads.append(path)
    homes = set(cells)
    bridges = sorted(c for c in range(width * height) if road[c] and river[c] and c not in homes)
    return roads, bridges


def classes(width, height, biome, settlements, roads):
    """One class per road, MINOR or MAJOR. On each landmass a spanning tree links the capitals,
    cities and towns, and the cheapest chain of roads between each linked pair is major."""
    label = landmasses(width, height, biome)
    hubs = [i for i, s in enumerate(settlements) if s.tier in HUBS]
    tree = route_graph([settlements[i] for i in hubs], [label[settlements[i].uid] for i in hubs], span2=0)
    at = {s.uid: i for i, s in enumerate(settlements)}
    links = [[] for _ in settlements]
    for r, path in enumerate(roads):
        a, b = at[path[0]], at[path[-1]]
        links[a].append((b, len(path) - 1, r))
        links[b].append((a, len(path) - 1, r))
    out = bytearray(len(roads))
    for a, b in tree:
        for r in _chain(links, hubs[a], hubs[b]):
            out[r] = MAJOR
    return out


def _chain(links, start, goal):
    """The roads along the cheapest way between two settlements: Dijkstra over the roads, each
    weighted by its steps, with ties to the lower settlement index."""
    best = {start: 0}
    came = {start: (-1, -1)}
    heap = [(0, start)]
    while heap:
        d, c = heapq.heappop(heap)
        if c == goal:
            break
        if d > best[c]:
            continue
        for m, steps, r in links[c]:
            if d + steps < best.get(m, d + steps + 1):
                best[m] = d + steps
                came[m] = (c, r)
                heapq.heappush(heap, (d + steps, m))
    out = []
    c = goal
    while came[c][0] >= 0:
        c, r = came[c]
        out.append(r)
    return out


def lanes(width, height, biome, settlements):
    """Sea lanes as cell paths: a spanning tree over landmasses whose links are the closest pair of
    ports, each sailed over open sea, so every settlement on a landmass with a port reaches the rest."""
    label = landmasses(width, height, biome)
    nbrs = neighbours(width, height)
    ports = [s for s in settlements if any(biome[m] == OCEAN for m in nbrs[s.uid])]
    pairs = sorted((dist2(a.x, a.y, b.x, b.y), a.uid, b.uid) for a in ports for b in ports
                   if a.uid < b.uid and label[a.uid] != label[b.uid])
    root = {}

    def find(m):
        while root.get(m, m) != m:
            m = root[m]
        return m

    out = []
    for _, a, b in pairs:
        ra, rb = find(label[a]), find(label[b])
        if ra != rb:
            path = _sail(a, b, nbrs, biome)
            if path:
                root[ra] = rb
                out.append(path)
    return out


def _sail(start, goal, nbrs, biome):
    """The fewest open-sea cells from one port to another, or [] when no sea joins them."""
    came = {start: -1}
    frontier = [start]
    while frontier:
        nxt = []
        for c in frontier:
            for m in nbrs[c]:
                if m in came:
                    continue
                came[m] = c
                if m == goal:
                    path = [m]
                    while came[path[-1]] >= 0:
                        path.append(came[path[-1]])
                    return path[::-1]
                if biome[m] == OCEAN:
                    nxt.append(m)
        frontier = nxt
    return []
