"""Lays out a zoomed-in place, a settlement district or a natural-wonder vista, from the sprite sheets.

build(ctx) turns a model.PlaceContext into a Layout: a terrain grid, its tiles with shores autotiled
by the rule in tools/sprites/showcase_wonders.py, ground and standing sprites anchored in pixels,
and blob people. Every choice is a keyed draw on ctx.seed, PLACE for the layout and CROWD for the
people, so the same record always gives the same place. House styles and looks are uniform draws
that nothing else reads (sprites README art direction; content rules 1 and 8).
Run `python tools/worldgen/place.py --demo` to write dist/worldgen/demo/*.png.
"""
import json
import sys
from dataclasses import dataclass
from heapq import heappop, heappush
from math import isqrt
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'sprites'))

from looks import look_for  # noqa: E402
from model import PlaceContext  # noqa: E402
from noise import fbm, value  # noqa: E402
from placedraw import render  # noqa: E402
from rng import CROWD, PLACE, draw  # noqa: E402
from spritekit import ASSETS, TILE  # noqa: E402

DEMO = ASSETS.parents[1] / 'dist' / 'worldgen' / 'demo'

SIZES = {'capital': (48, 28), 'city': (48, 28), 'town': (40, 24), 'village': (32, 20), 'hamlet': (32, 20)}
VISTA_SIZE = (30, 18)
PLAZAS = {'capital': (16, 5), 'city': (14, 5), 'town': (12, 4)}
BLOCK = {'capital': 5, 'city': 5, 'town': 4}         # rows from one street to the next
REACH = {'capital': 17, 'city': 15, 'town': 12}      # street length beyond the lanes beside the plaza
HOUSES = {'capital': (20, 30), 'city': (20, 30), 'town': (12, 20), 'village': (6, 10), 'hamlet': (3, 5)}
CROWDS = {'capital': (24, 40), 'city': (24, 40), 'town': (14, 24), 'village': (8, 14), 'hamlet': (4, 8)}
VISITORS = (4, 8)
CIVIC = {'capital': ('civic_town-hall', 'civic_courthouse', 'civic_records-office', 'civic_police-station',
                     'civic_clinic', 'civic_school', 'shop_general', 'shop_warehouse'),
         'town': ('civic_town-hall', 'civic_police-station', 'civic_clinic', 'civic_school', 'shop_general')}
CIVIC['city'] = CIVIC['capital']
STALLS = {'capital': 3, 'city': 3, 'town': 2}
MATERIALS = ('brick', 'cottage', 'plaster', 'stone', 'timber')
ROOFS = ('green', 'plum', 'slate', 'terracotta', 'thatch')
WONDER_FRAMES = {'waterfall': 'wonder_waterfall_0', 'sea-arch': 'wonder_sea-arch_0', 'geyser': 'wonder_geyser_2',
                 'hot-springs': 'wonder_hot-springs_0', 'crystal-cave': 'wonder_crystal-cave_1'}
LANDMARK_FRAMES = {'lighthouse': 'landmark_lighthouse_0', 'windmill': 'landmark_windmill_0',
                   'fountain': 'landmark_fountain_0'}

OPEN = ('grass', 'meadow', 'sand')
CLIFFS = ('cliff_top', 'cliff_face', 'cliff_corner-left', 'cliff_corner-right', 'cliff_foot', 'cliff_foot-water')
CROPS = ('crop_grain_seedling', 'crop_grain_growing', 'crop_grain_ripe', 'crop_grain_stubble',
         'crop_veg_seedling', 'crop_veg_growing', 'crop_veg_ripe', 'soil')
DIRS = ((0, -1), (1, 0), (0, 1), (-1, 0))
SIDES = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
CORNERS = {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}
INWARD = {'n': 2, 'e': 3, 's': 0, 'w': 1}
OPPOSITE = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}
PROP_Y, BEAST_Y, PERSON_Y = 12, 13, 14   # anchor rows in a tile: people draw in front of what shares it

# First keys of the PLACE and CROWD draws, one per purpose, so each stage draws on its own.
(GROUND, SEA, RIVER, POND, RIDGE, ROUTE, STREET, LOT, STYLE, FORM, WORK, MARK, VISTA, TREE,
 SCATTER, FIELD, HERD, DECOR, INLET) = range(1, 20)
SPOT, POSE, FACE, JOB, EMOTE, COUNT = range(1, 7)

_frames = {}


def frame(category, name):
    if category not in _frames:
        manifest = json.loads((ASSETS / f'{category}.json').read_text(encoding='utf-8'))
        _frames[category] = manifest['frames']
    return _frames[category][name]


def rise(f):
    """Tile rows a footprinted sprite's image rises above its footprint."""
    return -((f['footprint'][1] * TILE - 1 - f['anchor'][1]) // TILE)


def grid(w, h, fill):
    return [[fill] * w for _ in range(h)]


def threshold(values, per_mille):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, len(ordered) * (1000 - per_mille) // 1000)]


def line(a, b):
    (x0, y0), (x1, y1) = a, b
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x1 > x0 else -1), (1 if y1 > y0 else -1)
    err, out = dx + dy, []
    while True:
        out.append((x0, y0))
        if (x0, y0) == (x1, y1):
            return out
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


@dataclass(frozen=True)
class Sprite:
    category: str
    name: str
    x: int
    y: int


@dataclass(frozen=True)
class Person:
    look: int
    stem: str
    facing: str
    expression: str
    job: str | None
    emote: str | None
    x: int
    y: int
    lift: int = 0          # pixels drawn above the anchor, for sitting on a bench


@dataclass
class Layout:
    width: int
    height: int
    terrain: list          # rows of terrain kinds
    tiles: list            # rows of (category, name)
    ground: list
    standing: list
    people: list


class Site:
    """The grids a place is built on: terrain kinds plus what stands where."""

    def __init__(self, ctx, w, h):
        self.ctx, self.w, self.h = ctx, w, h
        self.kind = grid(w, h, 'grass')
        self.sea = grid(w, h, False)
        self.road = grid(w, h, False)
        self.solid = grid(w, h, None)     # what stands on a tile: footprints, trunks, props
        self.big = grid(w, h, False)      # footprints of buildings, houses, landmarks and wonders
        self.shade = grid(w, h, False)    # under a big sprite's image, above its footprint
        self.crown = grid(w, h, False)    # under a tree crown, above its trunk
        self.keep = grid(w, h, False)     # kept clear: plaza, green, fields, the view of a wonder
        self.ground, self.standing = [], []
        self.bands = []                   # (top row, face rows, foot kind) of cliffs laid over water
        self.cx, self.cy = w // 2, h // 2
        self.plaza = None
        self.green = []
        self.entries = []
        self.places = {}                  # name -> list of footprint rects (tx, ty, fw, fh)
        self.doors = []                   # (name, door tile) of houses and buildings
        self.fields, self.pastures = [], []

    def draw(self, sub, *key):
        return draw(self.ctx.seed, PLACE, sub, *key)

    def below(self, n, sub, *key):
        return self.draw(sub, *key) % n

    def chance(self, per_mille, sub, *key):
        return self.draw(sub, *key) % 1000 < per_mille

    def pick(self, items, sub, *key):
        return items[self.below(len(items), sub, *key)]

    def noise(self, sub, x, y, cell, octaves=3):
        return fbm(self.draw(sub), PLACE, x * TILE, y * TILE, cell, octaves)

    def cells(self):
        return [(x, y) for y in range(self.h) for x in range(self.w)]

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def water(self, x, y):
        return self.inside(x, y) and self.kind[y][x] == 'water'

    def wet4(self, x, y):
        return any(self.water(x + dx, y + dy) for dx, dy in DIRS)

    def bank(self, x, y):
        return any(self.water(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))

    def free(self, x, y):
        return (self.inside(x, y) and self.kind[y][x] in OPEN and not self.road[y][x] and not self.solid[y][x]
                and not self.keep[y][x] and not self.shade[y][x] and not self.bank(x, y))

    def buildable(self, x, y):
        return self.free(x, y) and not self.crown[y][x] and (self.kind[y][x] != 'sand' or self.desert())

    def desert(self):
        ctx = self.ctx
        return ctx.biome == 'sand' or ctx.wonder == 'dune' or (ctx.moisture < 70 and ctx.temperature > 165)

    def standable(self, x, y):
        k = self.kind[y][x]
        return ((k in OPEN or k in ('path', 'paving')) and not self.solid[y][x] and not self.shade[y][x]
                and not self.crown[y][x] and not self.bank(x, y))

    def step(self, x, y):
        """Cost of a road through a tile, or None where no road may go."""
        k = self.kind[y][x]
        if k in CLIFFS or self.sea[y][x] or self.solid[y][x] or (self.keep[y][x] and not self.road[y][x]):
            return None
        if self.road[y][x]:
            return 4
        if k == 'water':
            return 30
        return 22 if self.bank(x, y) else 10

    def put(self, category, name, x, y, ground=False):
        (self.ground if ground else self.standing).append(Sprite(category, name, x, y))

    def build(self, category, name, tx, ty):
        """A footprinted sprite with its footprint's top-left tile at (tx, ty)."""
        f = frame(category, name)
        fw, fh = f['footprint']
        x, y = tx * TILE + fw * TILE // 2, (ty + fh) * TILE - 1
        for cy in range(ty, ty + fh):
            for cx in range(tx, tx + fw):
                self.solid[cy][cx] = name
                self.big[cy][cx] = True
        for cy in range(max(0, ty - rise(f)), ty):
            for cx in range(tx, tx + fw):
                self.shade[cy][cx] = True
        self.places.setdefault(name, []).append((tx, ty, fw, fh))
        self.put(category, name, x, y)

    def prop(self, category, name, tx, ty, wide=False):
        """A prop centred on one tile, or on two side by side when wide."""
        span = 2 if wide else 1
        for cx in range(tx, tx + span):
            self.solid[ty][cx] = name
        f = frame(category, name)
        self.put(category, name, tx * TILE + (span * TILE - f['w']) // 2 + f['anchor'][0], ty * TILE + PROP_Y)

    def tree(self, category, name, tx, ty):
        """Plants a tree with its trunk on (tx, ty), unless its crown would hide a building."""
        f = frame(category, name)
        x, y = tx * TILE + TILE // 2, ty * TILE + PROP_Y
        left, top = x - f['anchor'][0], y - f['anchor'][1]
        crown = [(cx, cy) for cy in range(top // TILE, ty) for cx in range(left // TILE, (left + f['w'] - 1) // TILE + 1)
                 if self.inside(cx, cy)]
        if any(self.big[cy][cx] for cx, cy in crown):
            return
        self.solid[ty][tx] = name
        for cx, cy in crown:
            self.crown[cy][cx] = True
        self.put(category, name, x, y)

    def lay_path(self, cells):
        for x, y in cells:
            self.road[y][x] = True
            if self.kind[y][x] in OPEN:
                self.kind[y][x] = 'path'

    def fits(self, tx, ty, fw, fh, up, ground_ok, margin=1):
        if tx < 0 or ty - up < 0 or tx + fw > self.w or ty + fh > self.h:
            return False
        for cy in range(ty, ty + fh):
            for cx in range(tx, tx + fw):
                if not ground_ok(cx, cy):
                    return False
        for cy in range(ty - margin, ty + fh + margin):
            for cx in range(tx - margin, tx + fw + margin):
                if self.inside(cx, cy) and self.solid[cy][cx]:
                    return False
        for cy in range(max(0, ty - up), ty):
            for cx in range(tx, tx + fw):
                if self.solid[cy][cx] or self.crown[cy][cx]:
                    return False
        return True

    def spur(self, x, y, limit, avoid):
        """Free tiles leading from (x, y) to a road, at most `limit` of them, or None."""
        if not self.inside(x, y):
            return None
        if self.road[y][x]:
            return []
        if not self.free(x, y) or (x, y) in avoid:
            return None
        parent, frontier = {(x, y): None}, [(x, y)]
        for _ in range(limit):
            nxt = []
            for cx, cy in frontier:
                for dx, dy in ((0, 1), (-1, 0), (1, 0), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if (nx, ny) in parent or not self.inside(nx, ny):
                        continue
                    if self.road[ny][nx] and not self.water(nx, ny):
                        path = [(cx, cy)]
                        while parent[path[-1]]:
                            path.append(parent[path[-1]])
                        return path
                    if self.free(nx, ny) and (nx, ny) not in avoid:
                        parent[(nx, ny)] = (cx, cy)
                        nxt.append((nx, ny))
            frontier = nxt
        return None

    def find_lot(self, fw, fh, up, doors, target, spur=0, ground_ok=None, margin=1, salt=0):
        """The cheapest footprint whose doors reach a road; doors are pixel offsets from its left."""
        ok = ground_ok or self.buildable
        best = None
        for ty in range(0, self.h - fh):
            for tx in range(0, self.w - fw + 1):
                if not self.fits(tx, ty, fw, fh, up, ok, margin):
                    continue
                avoid = {(cx, cy) for cy in range(ty, ty + fh) for cx in range(tx, tx + fw)}
                spurs = []
                for dx in doors:
                    path = self.spur(tx + dx // TILE, ty + fh, spur, avoid)
                    if path is None:
                        break
                    spurs.append(path)
                    avoid |= set(path)
                else:
                    gap = abs(tx + fw // 2 - target[0]) + abs(ty + fh - target[1])
                    cost = gap * 8 + sum(map(len, spurs)) * 6 + self.below(8, LOT, salt, tx, ty)
                    if best is None or cost < best[0]:
                        best = (cost, tx, ty, spurs)
        return best

    def settle(self, category, name, lot):
        """Builds on a lot from find_lot, lays its spur paths and notes its door, bottom centre."""
        _, tx, ty, spurs = lot
        self.build(category, name, tx, ty)
        for path in spurs:
            self.lay_path(path)
        fw, fh = frame(category, name)['footprint']
        self.doors.append((name, (tx + fw // 2, ty + fh)))

    def layout(self):
        tiles = [[tile_for(self, x, y) for x in range(self.w)] for y in range(self.h)]
        return Layout(self.w, self.h, [row[:] for row in self.kind], tiles, self.ground, self.standing, self.people)


def tile_for(site, x, y):
    """The shore rule of showcase_wonders.py: a land tile takes its shape from its water neighbours."""
    kind = site.kind[y][x]
    if kind == 'water':
        return 'nature', 'terrain_water_0'
    if kind in OPEN:
        shore = 'sand' if kind == 'sand' else 'grass'
        wet = {side for side, (dx, dy) in SIDES.items() if site.water(x + dx, y + dy)}
        for corner in CORNERS:
            if set(corner) <= wet:
                return 'scenery', f'shore_{shore}_{corner}-outer_0'
        for side in 'nesw':
            if side in wet:
                return 'scenery', f'shore_{shore}_{side}_0'
        for corner, (dx, dy) in CORNERS.items():
            if site.water(x + dx, y + dy):
                return 'scenery', f'shore_{shore}_{corner}-inner_0'
    if kind == 'grass':
        return 'nature', f'terrain_grass_{(x * 7 + y * 13) % 5 % 3}'
    if kind == 'meadow':
        return 'scenery', f'terrain_meadow_{(x * 5 + y * 3) % 3}'
    if kind == 'cliff_face':
        return 'scenery', f'cliff_face_{(x * 3 + y) % 2}'
    if kind == 'cliff_foot-water':
        return 'scenery', 'cliff_foot-water_0'
    if kind in CLIFFS:
        return 'scenery', kind
    return 'nature', {'sand': 'terrain_sand', 'paving': 'terrain_paving', 'path': 'terrain_dirt-path',
                      'soil': 'terrain_soil-tilled'}.get(kind, kind)


# ------------------------------------------------------------------------------------------ terrain

def edge_cell(site, side, t, depth):
    return {'n': (t, depth), 's': (t, site.h - 1 - depth), 'w': (depth, t), 'e': (site.w - 1 - depth, t)}[side]


def lay_ground(site):
    """Sand for deserts, whose sparse grass grows as tufts; elsewhere grass with drifts of meadow."""
    ctx = site.ctx
    if site.desert():
        site.kind = grid(site.w, site.h, 'sand')
        return
    noise = {(x, y): site.noise(GROUND, x, y, 96) for x, y in site.cells()}
    cut = threshold(noise.values(), 40 if ctx.biome.startswith('forest') else 80 + ctx.moisture // 2)
    for x, y in site.cells():
        site.kind[y][x] = 'meadow' if noise[(x, y)] >= cut else 'grass'


def lay_sea(site, sides, depth, cliffs):
    for i, side in enumerate('nesw'):
        if side not in sides:
            continue
        span = site.w if side in 'ns' else site.h
        seed = site.draw(SEA, i)
        straight = cliffs and side == 's'
        for t in range(span):
            d = depth if straight else depth + value(seed, PLACE, t * TILE, 0, 7 * TILE) * 5 // 65536 - 2
            for k in range(max(1, d)):
                x, y = edge_cell(site, side, t, k)
                site.kind[y][x] = 'water'
                site.sea[y][x] = True
    if cliffs and 's' in sides:
        top = site.h - depth - 3
        carve_band(site, top, 1, 'cliff_foot-water', 0, site.w - 1)
        site.bands.append((top, 1, 'cliff_foot-water'))


def carve_band(site, top, faces, foot, x0, x1):
    """A cliff from x0 to x1: rim, face rows and foot; ends inside the map taper with corners."""
    for x in range(x0, x1 + 1):
        left, right = x == x0 and x0 > 0, x == x1 and x1 < site.w - 1
        if not (left or right):
            site.kind[top][x] = 'cliff_top'
        for r in range(top + 1, top + 1 + faces):
            site.kind[r][x] = 'cliff_corner-left' if left else 'cliff_corner-right' if right else 'cliff_face'
        site.kind[top + 1 + faces][x] = foot


def finish_bands(site):
    """Where water cut a one-face cliff, step it back a tile and taper the new ends."""
    for top, faces, foot in site.bands:
        if faces != 1:
            continue
        rows = (top, top + 1, top + 2)
        near = [x for x in range(site.w) if any(site.water(x + dx, r + dy) and not (r + dy == top + 3)
                                                 for r in rows for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
        for x in near:
            for r in rows:
                if site.kind[r][x] in CLIFFS:
                    site.kind[r][x] = 'sand' if site.kind[r][x] == 'cliff_foot-water' else 'grass'
        x = 0
        while x < site.w:
            if site.kind[top + 1][x] not in CLIFFS:
                x += 1
                continue
            end = x
            while end + 1 < site.w and site.kind[top + 1][end + 1] in CLIFFS:
                end += 1
            if end - x < 2:
                for cx in range(x, end + 1):
                    for r in rows:
                        site.kind[r][cx] = 'sand' if site.kind[r][cx] == 'cliff_foot-water' else 'grass'
            else:
                carve_band(site, top, 1, foot, x, end)
            x = end + 1


def river_points(site, sides):
    """Pairs of river ends, leaning away from the centre, where the place itself sits."""
    w, h = site.w, site.h

    def point(side, high, salt):
        span = w if side in 'ns' else h
        t = span * (3 if high else 1) // 4 + site.below(3, RIVER, salt, ord(side)) - 1
        return edge_cell(site, side, t, 0)

    if len(sides) == 1:
        seas = [s for s in 'nesw' if s in site.ctx.sea and s != sides[0]]
        sides = [sides[0], seas[0] if seas else OPPOSITE[sides[0]]]
    if len(sides) == 2:
        a, b = sides
        if OPPOSITE[a] == b:
            high = site.chance(500, RIVER, 1)
            return [(point(a, high, 2), point(b, high, 3))]
        pair = (a, b)
        lean = {'n': 'e' in pair, 's': 'e' in pair, 'e': 's' in pair, 'w': 's' in pair}
        return [(point(a, lean[a], 2), point(b, lean[b], 3))]
    qx, qy = site.chance(500, RIVER, 4), site.chance(500, RIVER, 5)
    meet = (w * (1 + 2 * qx) // 4, h * (1 + 2 * qy) // 4)
    return [(point(s, qx if s in 'ns' else qy, 6 + i), meet) for i, s in enumerate(sides)]


def carve_river(site, a, b, salt, width=2, avoid=None):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    steps = max(abs(dx), abs(dy), 1)
    norm = isqrt(dx * dx + dy * dy) or 1
    seed = site.draw(RIVER, 100 + salt)
    prev = None
    for i in range(steps + 1):
        envelope = 4 * i * (steps - i) * 64 // (steps * steps)
        off = (value(seed, PLACE, i * TILE, 0, 7 * TILE) - 32768) * 3 * envelope // (32768 * 64)
        point = (ax + dx * i // steps - dy * off // norm, ay + dy * i // steps + dx * off // norm)
        for cx, cy in (line(prev, point) if prev else [point]):
            for x in range(cx, cx + width):
                for y in range(cy, cy + width):
                    if site.inside(x, y) and not (avoid and avoid(x, y)):
                        site.kind[y][x] = 'water'
        prev = point


def lay_ponds(site, spare):
    noise = {(x, y): site.noise(POND, x, y, 48, 2) for x, y in site.cells()}
    cut = threshold(noise.values(), 60)
    for (x, y), n in noise.items():
        if n >= cut and not spare(x, y) and site.kind[y][x] in OPEN:
            site.kind[y][x] = 'water'


def tidy_water(site):
    """Floods land too thin for the shore tiles: water on opposite sides or on opposite corners only.

    Each pass judges every cell on the same grid before flooding any, so the result never depends
    on the order cells are visited in; an editor that tidies only the cells a stroke touched then
    gets the same map as a whole-map rebuild.
    """
    while True:
        thin = [(x, y) for x, y in site.cells() if site.kind[y][x] in OPEN and _thin(site, x, y)]
        if not thin:
            return
        for x, y in thin:
            site.kind[y][x] = 'water'
        flooded = set(thin)
        while True:
            joined = {(x, y) for x, y in flooded
                      if any(site.inside(x + dx, y + dy) and site.sea[y + dy][x + dx] for dx, dy in DIRS)}
            if not joined:
                break
            for x, y in joined:
                site.sea[y][x] = True
            flooded -= joined


def _thin(site, x, y):
    n, e, s, w = (site.water(x + dx, y + dy) for dx, dy in DIRS)
    ne, se, sw, nw = (site.water(x + dx, y + dy) for dx, dy in CORNERS.values())
    return (n and s) or (e and w) or (not (n or e or s or w) and ((ne and sw) or (nw and se)))


def lay_beach(site, width):
    dist = grid(site.w, site.h, 99)
    frontier = [(x, y) for x, y in site.cells() if site.sea[y][x]]
    for x, y in frontier:
        dist[y][x] = 0
    while frontier:
        nxt = []
        for x, y in frontier:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if site.inside(nx, ny) and dist[ny][nx] > dist[y][x] + 1 and not site.water(nx, ny):
                        dist[ny][nx] = dist[y][x] + 1
                        nxt.append((nx, ny))
        frontier = nxt
    noise = {(x, y): site.noise(SEA, x, y, 64, 2) for x, y in site.cells()}
    wide = threshold(noise.values(), 500)
    for x, y in site.cells():
        if site.kind[y][x] in ('grass', 'meadow') and dist[y][x] <= width + (noise[(x, y)] >= wide):
            site.kind[y][x] = 'sand'


def lay_ridges(site, count, spare):
    """Short cliffs with tapered ends on hills and mountains, kept off the middle of the place."""
    for i in range(count):
        for attempt in range(20):
            length = 6 + site.below(7, RIDGE, i, attempt, 0)
            x0 = 1 + site.below(max(1, site.w - length - 2), RIDGE, i, attempt, 1)
            top = 1 + site.below(max(1, site.h - 5), RIDGE, i, attempt, 2)
            box = [(x, y) for x in range(x0 - 1, x0 + length + 1) for y in range(top - 1, top + 4)]
            if all(site.inside(x, y) and site.kind[y][x] in OPEN and not site.bank(x, y) and not spare(x, y)
                   for x, y in box):
                carve_band(site, top, 1, 'cliff_foot', x0, x0 + length - 1)
                break


def lay_water(site, sea, cliffs, depth, rivers, spare, dry=None):
    if sea:
        lay_sea(site, sea, depth, cliffs)
        if not cliffs and not site.ctx.wonder:
            carve_inlet(site)
    for i, (a, b) in enumerate(rivers):
        carve_river(site, a, b, i, avoid=dry)
    if site.ctx.biome == 'marsh':
        lay_ponds(site, spare)
    tidy_water(site)
    finish_bands(site)
    if sea and not cliffs:
        lay_beach(site, 2)


# ------------------------------------------------------------------------------------------- roads

def route(site, start, heading, goal):
    """Cheapest road from start to a tile where goal holds. It never turns on, into or out of
    water, so every river crossing is straight and has a bank tile at each end for a bridge."""
    sx, sy = start
    best, prev, seq = {(sx, sy, heading): 0}, {}, 0
    heap = [(0, 0, sx, sy, heading)]
    while heap:
        cost, _, x, y, d = heappop(heap)
        if cost > best[(x, y, d)]:
            continue
        if goal(x, y) and (x, y) != (sx, sy):
            path = [(x, y)]
            state = (x, y, d)
            while state in prev:
                state = prev[state]
                path.append(state[:2])
            return path[::-1]
        bx, by = x - DIRS[d][0], y - DIRS[d][1]
        for nd, (dx, dy) in enumerate(DIRS):
            if nd == (d + 2) % 4:
                continue
            nx, ny = x + dx, y + dy
            if not site.inside(nx, ny):
                continue
            step = site.step(nx, ny)
            if step is None:
                continue
            turn = nd != d
            if turn and (site.water(x, y) or site.water(bx, by) or site.water(nx, ny)):
                continue
            c = cost + step + (15 if turn else 0)
            if c < best.get((nx, ny, nd), 1 << 60):
                best[(nx, ny, nd)] = c
                prev[(nx, ny, nd)] = (x, y, d)
                seq += 1
                heappush(heap, (c, seq, nx, ny, nd))
    return None


def straight(site, a, b):
    """The tiles from a toward b in a line, stopping where a road may not go, before a long
    stretch of water, and short of the river where it does not cross."""
    (x, y), (bx, by) = a, b
    dx, dy = (bx > x) - (bx < x), (by > y) - (by < y)
    cells = []
    while site.inside(x, y) and site.step(x, y) is not None:
        if site.water(x, y):
            run = 0
            while site.water(x + dx * run, y + dy * run):
                run += 1
            far = (x + dx * run, y + dy * run)
            if run > 4 or not site.inside(*far) or site.step(*far) is None:
                break
        cells.append((x, y))
        if (x, y) == (bx, by):
            break
        x, y = x + dx, y + dy
    while cells and (site.water(*cells[-1]) or (site.wet4(*cells[-1]) and not site.road[cells[-1][1]][cells[-1][0]])):
        cells.pop()
    return cells


def pave(site, cells):
    """Lays a road along cells in order; river crossings get footbridges or a paved causeway."""
    spans, i = [], 0
    while i < len(cells):
        if site.water(*cells[i]):
            j = i
            while j < len(cells) and site.water(*cells[j]):
                j += 1
            spans.append((max(i - 1, 0), min(j, len(cells) - 1)))
            i = j
        else:
            i += 1
    crossing = {k for a, b in spans for k in range(a, b + 1)}
    site.lay_path([c for k, c in enumerate(cells) if k not in crossing])
    for a, b in spans:
        cross(site, cells[a:b + 1], cells[b + 1] if b + 1 < len(cells) else None,
              cells[a - 1] if a > 0 else None)


def cross(site, span, after, before):
    for x, y in span:
        site.road[y][x] = True
    (x0, y0), (x1, y1) = span[0], span[-1]
    if y0 != y1:
        for x, y in span:
            site.kind[y][x] = 'paving'
        return
    a, b = min(x0, x1), max(x0, x1)
    if (b - a + 1) % 2:
        extra = next((c for c in (after, before) if c and c[1] == y0), None)
        if extra is None:
            for x, y in span:
                site.kind[y][x] = 'paving' if site.water(x, y) else site.kind[y][x]
            return
        a, b = min(a, extra[0]), max(b, extra[0])
    for x in range(a, b + 1, 2):
        site.put('scenery', 'prop_footbridge', x * TILE + TILE, y0 * TILE + TILE - 1, ground=True)


def road_entry(site, side, salt):
    span = site.w if side in 'ns' else site.h
    mid = span // 2 + site.below(span // 3 + 1, ROUTE, salt) - span // 6
    for off in sorted(range(-span // 2, span // 2), key=lambda o: (abs(o), o)):
        t = mid + off
        if 2 <= t < span - 2:
            x, y = edge_cell(site, side, t, 0)
            if site.step(x, y) is not None and not site.water(x, y) and not site.bank(x, y):
                return x, y
    return None


def lay_roads(site):
    ctx = site.ctx
    sides = [s for s in 'nesw' if s in ctx.roads and s not in ctx.sea]
    if not sides:
        sides = [site.pick([s for s in 'nesw' if s not in ctx.sea] or ['n'], ROUTE, 0)]
    for i, side in enumerate(sides):
        start = road_entry(site, side, i + 1)
        if start is None:
            continue
        path = route(site, start, INWARD[side], lambda x, y: site.road[y][x])
        if path:
            pave(site, path)
            site.entries.append((side, start))


def centre_spot(site, cw, ch, above, below, side):
    """Top-left of a cw x ch centre whose surroundings are dry land, nearest the middle."""
    ideal = ((site.w - cw) // 2, (site.h - ch) // 2)

    def dry(x, y):
        return (site.inside(x, y) and site.kind[y][x] in OPEN and not site.bank(x, y)
                and (site.kind[y][x] != 'sand' or site.desert()))

    best = None
    for y in range(above, site.h - ch - below + 1):
        for x in range(side, site.w - cw - side + 1):
            gap = abs(x - ideal[0]) * 2 + abs(y - ideal[1]) * 3
            if best and gap >= best[0]:
                continue
            if all(dry(cx, cy) for cy in range(y - above, y + ch + below) for cx in range(x - side, x + cw + side)):
                best = (gap, x, y)
    return (best[1], best[2]) if best else ideal


# --------------------------------------------------------------------------------------- settlement

def lay_town(site):
    tier = site.ctx.tier
    pw, ph = PLAZAS[tier]
    px, py = centre_spot(site, pw, ph, 4, 2, 3)
    site.plaza = (px, py, pw, ph)
    site.cx, site.cy = px + pw // 2, py + ph // 2
    for y in range(py, py + ph):
        for x in range(px, px + pw):
            site.kind[y][x] = 'paving'
            site.road[y][x] = True
            site.keep[y][x] = True
    gap = BLOCK[tier]
    rows = [(py, 0), (py + ph - 1, 0)]
    k, r = 1, py - gap
    while r >= 1:
        rows.append((r, k))
        k, r = k + 1, r - gap
    k, r = 1, py + ph - 1 + gap
    while r <= site.h - 2:
        rows.append((r, k))
        k, r = k + 1, r + gap
    top, bottom = min(r for r, _ in rows), max(r for r, _ in rows)
    for x in (px - 1, px + pw):
        pave(site, straight(site, (x, py), (x, top)))
        pave(site, straight(site, (x, py + 1), (x, bottom)))
    for r, k in rows:
        if k and site.road[r][px - 1]:
            pave(site, straight(site, (px - 1, r), (px + pw, r)))
        for x, step in ((px - 1, -1), (px + pw, 1)):
            if site.road[r][x]:
                reach = REACH[tier] - 2 * k + site.below(5, STREET, r, step) - 2
                pave(site, straight(site, (x, r), (min(site.w - 2, max(1, x + step * reach)), r)))


def lay_village(site):
    hamlet = site.ctx.tier == 'hamlet'
    gw, gh = (3, 3) if hamlet else (7, 5)
    gx, gy = centre_spot(site, gw, gh, 3, 2, 3)
    site.cx, site.cy = gx + gw // 2, gy + gh // 2
    for y in range(gy, gy + gh):
        for x in range(gx, gx + gw):
            if gx < x < gx + gw - 1 and gy < y < gy + gh - 1:
                site.kind[y][x] = 'meadow'
                site.keep[y][x] = True
            else:
                site.kind[y][x] = 'path'
                site.road[y][x] = True
    site.keep[site.cy][site.cx] = False
    site.prop('nature', 'prop_well', site.cx, site.cy)
    site.green = [(x, y) for y in range(gy + 1, gy + gh - 1) for x in range(gx + 1, gx + gw - 1)]


def place_civic(site, names):
    _, py, _, ph = site.plaza
    for name in names:
        f = frame('buildings', name)
        fw, fh = f['footprint']
        if name == 'civic_town-hall':
            target = (site.cx, py)
        elif name == 'shop_warehouse':
            target = (site.cx + site.w // 3 * (1 if site.chance(500, LOT, 90) else -1), site.cy + ph)
        else:
            target = (site.cx, site.cy)
        lot = site.find_lot(fw, fh, rise(f), [fw * TILE // 2], target, spur=1, salt=CIVIC['capital'].index(name))
        if lot:
            site.settle('buildings', name, lot)


def on_plaza(site, x, y):
    px, py, pw, ph = site.plaza
    return px <= x < px + pw and py < y < py + ph and not site.solid[y][x] and not site.shade[y][x]


def plaza_piece(site, category, name, target, salt):
    f = frame(category, name)
    fw, fh = f['footprint']
    lot = site.find_lot(fw, fh, rise(f), [], target, ground_ok=lambda x, y: on_plaza(site, x, y), salt=salt)
    if lot:
        site.build(category, name, lot[1], lot[2])
    return lot


def place_plaza(site):
    """The fountain in the middle of the plaza, the clock tower at one end, stalls between."""
    px, py, pw, ph = site.plaza
    marks = site.ctx.landmarks
    left = site.chance(500, MARK, 1)
    if 'clock-tower' in marks:
        plaza_piece(site, 'landmarks', 'landmark_clock-tower', (px + 1 if left else px + pw - 1, py + ph - 1), 1)
    if 'fountain' in marks:
        plaza_piece(site, 'landmarks', LANDMARK_FRAMES['fountain'], (site.cx, py + ph - 1), 2)
    f = frame('buildings', 'shop_market-stall')
    for i in range(STALLS[site.ctx.tier]):
        target = (px + pw - 3 if (i % 2 == 0) == left else px + 2, py + ph - 1)
        if not plaza_piece(site, 'buildings', 'shop_market-stall', target, 10 + i):
            lot = site.find_lot(3, 2, rise(f), [24], (site.cx, py), spur=0, salt=20 + i)
            if lot:
                site.settle('buildings', 'shop_market-stall', lot)


def place_village_shop(site):
    if site.ctx.tier != 'village':
        return
    if site.chance(500, LOT, 70):
        f = frame('buildings', 'shop_general')
        lot = site.find_lot(4, 2, rise(f), [32], (site.cx, site.cy), spur=2, salt=71)
        if lot:
            site.settle('buildings', 'shop_general', lot)
        return
    f = frame('buildings', 'shop_market-stall')
    for i in range(1 + site.below(2, LOT, 72)):
        lot = site.find_lot(3, 2, rise(f), [24], (site.cx, site.cy), spur=1, salt=73 + i)
        if lot:
            site.settle('buildings', 'shop_market-stall', lot)


def outskirts(site, salt):
    """A keyed point between the centre and the edge of the place."""
    dx, dy = site.pick(((-1, 0), (1, 0), (-1, -1), (1, -1), (-1, 1), (1, 1)), WORK, salt)
    return site.cx + dx * site.w // 3, site.cy + dy * site.h // 3


def place_works(site):
    ctx = site.ctx
    names = []
    if ctx.biome in ('farmland', 'grassland'):
        names.append(site.pick(('work_farm', 'work_pasture'), WORK, 1))
    if ctx.biome.startswith('forest'):
        names.append('work_lumber-camp')
    if ctx.biome in ('hills', 'mountain', 'peak'):
        names.append(site.pick(('work_quarry', 'work_mine'), WORK, 2))
    if ctx.tier in ('town', 'city', 'capital'):
        names.append(site.pick(('work_workshop', 'work_fuel-works'), WORK, 3))
    for i, name in enumerate(names):
        f = frame('buildings', name)
        fw, fh = f['footprint']
        target = (site.cx, site.cy) if name in ('work_workshop', 'work_fuel-works') else outskirts(site, 10 + i)
        lot = (site.find_lot(fw, fh, rise(f), [fw * TILE // 2], target, spur=4, salt=20 + i)
               or site.find_lot(fw, fh, rise(f), [], target, salt=30 + i))
        if lot:
            site.settle('buildings', name, lot)


def place_dock(site):
    f = frame('buildings', 'work_dock')
    best = None
    for ty in range(1, site.h - 4):
        for tx in range(1, site.w - 5):
            if site.fits(tx, ty, 4, 2, rise(f), lambda x, y: dock_ground(site, x, y, ty)):
                if all(site.sea[ty + dy][x] for dy in (2, 3) for x in range(tx, tx + 4)):
                    cost = abs(tx + 2 - site.cx) + site.below(6, WORK, 40, tx, ty)
                    if best is None or cost < best[0]:
                        best = (cost, tx, ty)
    if best:
        site.build('buildings', 'work_dock', best[1], best[2])
        site.doors.append(('work_dock', (best[1] - 1, best[2] + 1)))


def dock_ground(site, x, y, ty):
    """The shed stands on land, its front row on the shore tiles of a south-facing coast."""
    if site.kind[y][x] not in OPEN or site.road[y][x] or site.solid[y][x] or site.keep[y][x] or site.shade[y][x]:
        return False
    return y == ty or site.sea[y + 1][x]


def carve_inlet(site):
    """A harbour cut into an east or west coast, so a dock can face south onto it."""
    side = next((s for s in 'ew' if s in site.ctx.sea), None)
    if side is None or 's' in site.ctx.sea:
        return
    xs = list(range(site.w)) if side == 'w' else list(range(site.w - 1, -1, -1))
    y0 = site.h * 2 // 3 + site.below(3, INLET, 0) - 1
    for y in range(y0, min(site.h - 1, y0 + 3)):
        coast = next((x for x in xs if not site.sea[y][x]), None)
        for k in range(7 if coast is not None else 0):
            x = coast + (k if side == 'w' else -k)
            if site.inside(x, y):
                site.kind[y][x] = 'water'
                site.sea[y][x] = True


def lighthouse(site):
    name = LANDMARK_FRAMES['lighthouse']
    f = frame('landmarks', name)
    best = None
    for ty in range(1, site.h - 2):
        for tx in range(0, site.w - 3):
            cells = [(x, y) for y in (ty, ty + 1) for x in range(tx, tx + 3)]
            if any(site.solid[y][x] or site.road[y][x] or site.shade[y][x] or site.kind[y][x] in CLIFFS for x, y in cells):
                continue
            if not (site.sea[ty + 1][tx + 1] and not site.water(tx + 1, ty)):
                continue
            if any(site.solid[y][x] for y in range(max(0, ty - rise(f)), ty) for x in range(tx, tx + 3)):
                continue
            cost = site.below(10, MARK, 20, tx, ty) - abs(tx + 1 - site.cx)
            if best is None or cost < best[0]:
                best = (cost, tx, ty)
    if best:
        site.build('landmarks', name, best[1], best[2])


def viaduct(site):
    """A viaduct over a river two tiles wide, where four free tiles flank it on each side."""
    best = None
    for y in range(2, site.h - 1):
        for x in range(5, site.w - 6):
            if not (site.water(x, y) and site.water(x + 1, y)) or site.water(x - 1, y) or site.water(x + 2, y):
                continue
            ends = list(range(x - 4, x)) + list(range(x + 2, x + 6))
            if any(not site.inside(cx, y) or site.solid[y][cx] or site.water(cx, y) or site.kind[y][cx] in CLIFFS
                   or (site.road[y][cx] and site.kind[y][cx] != 'path') for cx in ends):
                continue
            if any(site.shade[y][cx] for cx in range(x - 4, x + 6)):
                continue
            if any(site.solid[ry][cx] or site.big[ry][cx] for ry in (y - 2, y - 1) for cx in range(x - 4, x + 6)):
                continue
            on_road = sum(site.road[y][cx] for cx in ends)
            cost = -on_road * 4 + abs(y - site.cy) + site.below(4, MARK, 30, x, y)
            if best is None or cost < best[0]:
                best = (cost, x, y)
    if not best:
        return
    _, x, y = best
    for name, tx in (('landmark_viaduct_end-left', x - 4), ('landmark_viaduct_span', x),
                     ('landmark_viaduct_end-right', x + 2)):
        site.build('landmarks', name, tx, y)
    site.ground = [s for s in site.ground if not (s.name == 'prop_footbridge' and s.y // TILE == y
                                                  and x - 2 <= s.x // TILE <= x + 3)]


def place_landmarks(site):
    """Every landmark but the windmill, which waits for the fields it stands among."""
    marks = site.ctx.landmarks
    if 'viaduct' in marks and any(site.water(x, y) and not site.sea[y][x] for x, y in site.cells()):
        viaduct(site)
    if 'lighthouse' in marks and site.ctx.sea:
        lighthouse(site)
    for i, kind in enumerate(('library', 'glasshouse', 'observatory', 'amphitheatre', 'garden-terraces')):
        if kind in marks:
            name = f'landmark_{kind}'
            f = frame('landmarks', name)
            fw, fh = f['footprint']
            lot = site.find_lot(fw, fh, rise(f), [fw * TILE // 2], (site.cx, site.cy), spur=2, salt=40 + i)
            if lot:
                site.settle('landmarks', name, lot)
    for kind in ('clock-tower', 'fountain'):
        if kind in marks and site.plaza is None:
            name = LANDMARK_FRAMES.get(kind, f'landmark_{kind}')
            f = frame('landmarks', name)
            fw, fh = f['footprint']
            lot = site.find_lot(fw, fh, rise(f), [], (site.cx, site.cy + 3), salt=50)
            if lot:
                site.build('landmarks', name, lot[1], lot[2])


def place_windmill(site):
    name = LANDMARK_FRAMES['windmill']
    f = frame('landmarks', name)
    rects = site.fields + site.pastures
    best = None
    for ty in range(1, site.h - 2):
        for tx in range(0, site.w - 3):
            if not site.fits(tx, ty, 3, 2, rise(f), site.buildable):
                continue
            near = min((abs(tx + 1 - (fx + fw // 2)) + abs(ty + 1 - (fy + fh // 2)) for fx, fy, fw, fh in rects),
                       default=0)
            edge = min(tx, site.w - 3 - tx, ty, site.h - 2 - ty)
            cost = near * 4 + edge * 3 + site.below(6, MARK, 60, tx, ty)
            if best is None or cost < best[0]:
                best = (cost, tx, ty)
    if best:
        site.build('landmarks', name, best[1], best[2])


def house_name(site, i, unit, form):
    """Material and roof are uniform draws keyed by the house alone, so no style can mark wealth."""
    material = site.pick(MATERIALS, STYLE, i, unit, 0)
    roof = site.pick(ROOFS, STYLE, i, unit, 1)
    return f'house_{material}_{form}_roof-{roof}'


def house_forms(site, i, dense, left):
    r = site.below(100, FORM, i)
    if not dense:
        return [('hut',), ('detached',), ('farmhouse',)][0 if r < 35 else 1 if r < 80 else 2]
    apartments = {'town': 15, 'city': 35, 'capital': 40}[site.ctx.tier]
    if r < apartments:
        return ('apartment',)
    units = min(left, 2 + site.below(3 if site.ctx.tier == 'town' else 4, FORM, i, 1))
    if units < 2:
        return ('detached',)
    return ('row-left',) + ('row-middle',) * (units - 2) + ('row-right',)


def place_houses(site):
    tier = site.ctx.tier
    lo, hi = HOUSES[tier]
    count = lo + site.below(hi - lo + 1, FORM, 0)
    dense = tier in ('town', 'city', 'capital')
    made = 0
    for i in range(count * 3):
        if made >= count:
            break
        forms = house_forms(site, i, dense, count - made)
        options = [forms]
        if len(forms) > 2:
            options.append(('row-left', 'row-right'))
        if dense:
            options.append(('detached',))
        for opts in options:
            names = [house_name(site, i, u, form) for u, form in enumerate(opts)]
            sizes = [frame('houses', n)['footprint'] for n in names]
            doors, x = [], 0
            for n, (fw, _) in zip(names, sizes):
                doors.append(x + frame('houses', n)['door'][0])
                x += fw * TILE
            fw, fh = sum(s[0] for s in sizes), sizes[0][1]
            spur = 0 if len(opts) > 1 else (1 if dense else 3)
            lot = site.find_lot(fw, fh, 0, doors, (site.cx, site.cy), spur=spur, salt=100 + i)
            if lot:
                _, tx, ty, spurs = lot
                x = tx
                for n, (ufw, _), door in zip(names, sizes, doors):
                    site.build('houses', n, x, ty)
                    site.doors.append((n, (tx + door // TILE, ty + fh)))
                    x += ufw
                for path in spurs:
                    site.lay_path(path)
                made += len(opts)
                break


# ------------------------------------------------------------------------------------ fields, decor

def place_fields(site, count, pasture):
    """Fenced fields of one crop each, and pastures, on open ground away from the centre, drawn
    to the sides where the country map shows farmland."""
    for i in range(count + (1 if pasture else 0)):
        is_pasture = pasture and i == count
        fw, fh = 3 + site.below(4, FIELD, i, 0), 2 + site.below(2, FIELD, i, 1)
        best = None
        for ty in range(1, site.h - fh):
            for tx in range(1, site.w - fw):
                ring = [(x, y) for y in range(ty - 1, ty + fh + 1) for x in range(tx - 1, tx + fw + 1)]
                if not all(site.free(x, y) and not site.crown[y][x] for x, y in ring):
                    continue
                gap = abs(tx + fw // 2 - site.cx) + abs(ty + fh // 2 - site.cy)
                if gap < 7:
                    continue
                roadside = any(site.road[y][x] for x in range(tx - 2, tx + fw + 2) for y in (ty - 2, ty + fh + 1)
                               if site.inside(x, y))
                toward = _toward(tx + fw // 2 - site.cx, ty + fh // 2 - site.cy)
                cost = (gap * 3 - (12 if roadside else 0) - (30 if toward in site.ctx.farmland else 0)
                        + site.below(10, FIELD, i, tx, ty))
                if best is None or cost < best[0]:
                    best = (cost, tx, ty)
        if not best:
            continue
        _, tx, ty = best
        crop = 'crop_pasture' if is_pasture else site.pick(CROPS, FIELD, i, 2)
        for y in range(ty, ty + fh):
            for x in range(tx, tx + fw):
                site.kind[y][x] = crop
                site.keep[y][x] = True
        fence(site, tx - 1, ty - 1, tx + fw, ty + fh, gate=tx + site.below(fw, FIELD, i, 3))
        (site.pastures if is_pasture else site.fields).append((tx, ty, fw, fh))


def _toward(dx, dy):
    if abs(dx) >= abs(dy):
        return 'e' if dx > 0 else 'w'
    return 's' if dy > 0 else 'n'


def fence(site, x0, y0, x1, y1, gate):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if y in (y0, y1):
                if x == x0:
                    name = 'prop_fence_corner_top-left' if y == y0 else 'prop_fence_corner_bottom-left'
                elif x == x1:
                    name = 'prop_fence_corner_top-right' if y == y0 else 'prop_fence_corner_bottom-right'
                elif y == y1 and x == gate:
                    site.keep[y][x] = True
                    continue
                else:
                    name = 'prop_fence_horizontal'
            elif x in (x0, x1):
                name = 'prop_fence_vertical'
            else:
                continue
            site.prop('nature', name, x, y)


def decorate(site):
    """Lamp posts, benches, signposts and the clutter of trade beside the buildings."""
    town = site.plaza is not None
    if town:
        px, py, pw, ph = site.plaza
        for x, y in ((px, py + ph - 1), (px + pw - 1, py + ph - 1), (px, py), (px + pw - 1, py)):
            if not site.solid[y][x] and not site.shade[y][x]:
                site.prop('nature', 'prop_lamp-post', x, y)
        spots = [(x, y) for y in range(py + 1, py + ph) for x in range(px + 1, px + pw - 1)
                 if on_plaza(site, x, y) and not any(site.solid[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
        for i in range(min(len(spots), 2 + site.below(2, DECOR, 1))):
            x, y = spots[site.below(len(spots), DECOR, 2, i)]
            if not any(site.solid[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                site.prop('nature', 'prop_bench', x, y)
    elif site.green:
        spots = [(x, y) for x, y in site.green if not site.solid[y][x] and abs(x - site.cx) + abs(y - site.cy) > 1]
        for i in range(min(len(spots), 2)):
            x, y = spots[site.below(len(spots), DECOR, 3, i)]
            if not site.solid[y][x]:
                site.prop('nature', 'prop_bench' if i == 0 else 'prop_flower-patch', x, y)
    lamps = []
    for x, y in site.cells():
        if not site.road[y][x] or site.kind[y][x] != 'path' or not site.chance(300, DECOR, x, y):
            continue
        if any(abs(x - lx) + abs(y - ly) < (7 if town else 6) for lx, ly in lamps):
            continue
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if site.free(nx, ny) and not site.crown[ny][nx]:
                site.prop('nature', 'prop_lamp-post' if town else 'prop_flower-patch', nx, ny)
                lamps.append((nx, ny))
                break
    for side, (x, y) in site.entries:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if site.free(nx, ny) and not site.crown[ny][nx]:
                site.prop('nature', 'prop_signpost', nx, ny)
                break
    clutter = {'shop_general': ('prop_barrel', 'prop_crate'), 'shop_warehouse': ('prop_crate', 'prop_barrel', 'prop_crate'),
               'work_dock': ('prop_barrel', 'prop_crate'), 'shop_market-stall': ('prop_crate',),
               'work_farm': ('prop_hay-bale', 'prop_hay-bale'), 'work_pasture': ('prop_hay-bale',),
               'work_workshop': ('prop_barrel', 'prop_crate'), 'work_fuel-works': ('prop_barrel',),
               'work_lumber-camp': ('tree_log', 'tree_deciduous_stump'), 'work_quarry': ('rock_boulder',),
               'work_mine': ('rock_ore', 'rock_coal')}
    for name, rects in sorted(site.places.items()):
        for tx, ty, fw, fh in rects:
            ring = [(x, ty + fh - 1) for x in (tx - 1, tx + fw)] + [(x, ty + fh) for x in (tx - 1, tx + fw)]
            for k, prop_name in enumerate(clutter.get(name, ())):
                for x, y in ring[k:] + ring[:k]:
                    if site.free(x, y) and not site.crown[y][x]:
                        site.prop('nature', prop_name, x, y)
                        break
    for i, (tx, ty, fw, fh) in enumerate(site.fields):
        x, y = tx + fw + 1, ty + fh
        if site.free(x, y) and site.free(x + 1, y) and not site.crown[y][x] and not site.crown[y][x + 1]:
            if site.chance(500, DECOR, 5, i):
                site.prop('nature', 'prop_cart_grain_left', x, y, wide=True)
            else:
                site.prop('nature', 'prop_hay-bale', x, y)


# ---------------------------------------------------------------------------------------- nature

def tree_mix(site):
    """Weighted tree sprites for the climate: conifers when cold or high, palms when hot or coastal."""
    ctx = site.ctx
    t, m, biome = ctx.temperature, ctx.moisture, ctx.biome
    if biome in ('peak', 'mountain') or t < 70:
        return [(('nature', 'tree_conifer'), 10)]
    if site.desert() or t > 200:
        return [(('scenery', 'tree_palm'), 10)]
    mix = []
    if biome == 'forest-conifer' or t < 110:
        mix.append((('nature', 'tree_conifer'), 8 if biome == 'forest-conifer' else 4))
    if t < 130:
        mix.append((('scenery', 'tree_autumn'), 3))
    mix += [(('nature', 'tree_deciduous_mature'), 8), (('nature', 'tree_deciduous_young'), 3)]
    if m >= 150 and 90 <= t <= 190:
        mix.append((('scenery', 'tree_blossom'), 3))
    if ctx.sea and t > 150:
        mix.append((('scenery', 'tree_palm'), 2))
    return mix


def choose(site, mix, sub, *key):
    r = site.below(sum(wt for _, wt in mix), sub, *key)
    for item, wt in mix:
        if r < wt:
            return item
        r -= wt
    return mix[-1][0]


def near_built(site, reach):
    """Tiles within `reach` of a road or a building, where only garden trees grow."""
    near = grid(site.w, site.h, False)
    for x, y in site.cells():
        if (site.road[y][x] and not site.water(x, y)) or site.big[y][x]:
            for cy in range(max(0, y - reach), min(site.h, y + reach + 1)):
                for cx in range(max(0, x - reach), min(site.w, x + reach + 1)):
                    near[cy][cx] = True
    return near


def plant(site):
    """Trees on a jittered grid, clumped by noise, thick along the edges of the view and thin in town."""
    ctx = site.ctx
    density = {'forest-deciduous': 650, 'forest-conifer': 650, 'peak': 260, 'mountain': 220, 'hills': 170,
               'marsh': 110, 'farmland': 90}.get(ctx.biome, 130)
    if not ctx.biome.startswith('forest'):
        density = density * (ctx.moisture + 100) // 250
    if site.desert():
        density = 70
    mix = tree_mix(site)
    beach = [(('scenery', 'tree_palm'), 1)] if ctx.sea and ctx.temperature > 120 else []
    noise = {(x, y): site.noise(TREE, x, y, 80) for x, y in site.cells()}
    mid = threshold(noise.values(), 500)
    built = near_built(site, 2)
    farms = [(fx + fw // 2, fy + fh // 2) for fx, fy, fw, fh in site.fields]
    farms += [d for name, d in site.doors if 'farmhouse' in name or name == 'work_farm']
    for by in range(0, site.h, 2):
        for bx in range(0, site.w, 2):
            x, y = bx + site.below(2, TREE, bx, by, 0), by + site.below(2, TREE, bx, by, 1)
            if not site.inside(x, y) or not site.free(x, y) or site.crown[y][x]:
                continue
            if any(site.inside(x + dx, y + dy) and site.big[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                continue
            sand = site.kind[y][x] == 'sand' and not site.desert()
            if sand and not beach:
                continue
            p = density * (3 if noise[(x, y)] >= mid else 1) // 2
            if built[y][x]:
                p //= 3
            if min(x, y, site.w - 1 - x, site.h - 1 - y) <= 1 and not sand and not site.desert():
                p = max(p, 650)
            if not site.chance(p, TREE, bx, by, 2):
                continue
            fruit = any(abs(x - fx) + abs(y - fy) < 6 for fx, fy in farms) and site.chance(500, TREE, x, y, 3)
            category, name = ('nature', 'tree_fruit') if fruit else choose(site, beach if sand else mix, TREE, x, y, 4)
            site.tree(category, name, x, y)
    scatter(site)


def scatter(site):
    """Bushes, flowers and rocks between the trees."""
    ctx = site.ctx
    rocky = ctx.biome in ('hills', 'mountain', 'peak')
    if site.desert():
        items = [(('scenery', 'prop_reeds'), 4), (('scenery', 'prop_beach-rocks'), 2), (('nature', 'rock_boulder'), 1),
                 (('nature', 'rock_outcrop'), 1)]
    else:
        items = [(('nature', 'prop_bush'), 3), (('nature', 'prop_flower-patch'), 2 + ctx.moisture // 80),
                 (('nature', 'rock_boulder'), 8 if rocky else 1)]
    if rocky:
        items.append((('nature', 'rock_outcrop'), 6 if ctx.biome == 'peak' else 3))
    rate = 140 if site.desert() else {'peak': 260, 'mountain': 200, 'hills': 150}.get(ctx.biome, 80)
    for by in range(0, site.h, 3):
        for bx in range(0, site.w, 3):
            x, y = bx + site.below(3, SCATTER, bx, by, 0), by + site.below(3, SCATTER, bx, by, 1)
            if not site.inside(x, y) or not site.free(x, y) or site.crown[y][x] or not site.chance(rate, SCATTER, bx, by, 2):
                continue
            if any(site.inside(x + dx, y + dy) and site.solid[y + dy][x + dx] for dx, dy in DIRS):
                continue
            if site.plaza and abs(x - site.cx) + abs(y - site.cy) < 6:
                continue
            category, name = choose(site, items, SCATTER, x, y)
            if name == 'rock_outcrop':
                if site.free(x + 1, y) and not site.crown[y][x + 1]:
                    site.prop(category, name, x, y, wide=True)
            else:
                site.prop(category, name, x, y)
    for x, y in site.cells():
        if site.water(x, y) and not site.sea[y][x] and site.wet4(x, y) and site.chance(70, SCATTER, x, y, 5):
            land = [(x + dx, y + dy) for dx, dy in DIRS if site.inside(x + dx, y + dy) and not site.water(x + dx, y + dy)]
            if ctx.biome == 'marsh' or site.chance(400, SCATTER, x, y, 6):
                if not land and not site.road[y][x] and not site.solid[y][x]:
                    site.put('scenery', site.pick(('prop_lily-pads_0', 'prop_lily-pads_1'), SCATTER, x, y, 7),
                             x * TILE + TILE // 2, y * TILE + 11, ground=True)
        if (ctx.biome == 'marsh' and site.kind[y][x] in OPEN and site.wet4(x, y) and not site.road[y][x]
                and not site.solid[y][x] and not site.keep[y][x] and site.chance(250, SCATTER, x, y, 8)):
            site.prop('scenery', 'prop_reeds', x, y)


# --------------------------------------------------------------------------------------- animals

def herd(site):
    ctx = site.ctx
    kinds = ('cow', 'sheep', 'goat', 'horse')
    for i, (tx, ty, fw, fh) in enumerate(site.pastures):
        species = 'goat' if ctx.biome in ('hills', 'mountain') else site.pick(kinds, HERD, i)
        cells = [(x, y) for y in range(ty, ty + fh) for x in range(tx, tx + fw)]
        for k in range(min(len(cells) // 2, 2 + site.below(3, HERD, i, 1))):
            x, y = cells[site.below(len(cells), HERD, i, 2, k)]
            if site.solid[y][x]:
                continue
            site.solid[y][x] = species
            pose = site.pick(('graze_left', 'graze_right', 'idle_left', 'idle_right', 'idle_down'), HERD, i, 3, k)
            site.put('animals', f'{species}_{pose}', x * TILE + TILE // 2, y * TILE + BEAST_Y)
    homes = [d for name, d in site.doors if 'farmhouse' in name or name in ('work_farm', 'work_pasture')]
    for i, (dx_, dy_) in enumerate(homes[:3]):
        for k in range(2 + site.below(2, HERD, 10, i)):
            x, y = dx_ + site.below(5, HERD, 11, i, k) - 2, dy_ + site.below(3, HERD, 12, i, k)
            if site.inside(x, y) and site.free(x, y) and not site.crown[y][x]:
                site.solid[y][x] = 'chicken'
                pose = site.pick(('peck_left', 'peck_right', 'idle_down', 'walk_left_0'), HERD, 13, i, k)
                site.put('animals', f'chicken_{pose}', x * TILE + TILE // 2, y * TILE + BEAST_Y)
    pond = [(x, y) for x, y in site.cells() if site.water(x, y) and not site.sea[y][x] and not site.road[y][x]
            and sum(site.water(x + dx, y + dy) for dx, dy in DIRS) >= 3]
    for k in range(min(len(pond), 2 + site.below(2, HERD, 20))):
        x, y = pond[site.below(len(pond), HERD, 21, k)]
        if not site.solid[y][x]:
            site.solid[y][x] = 'duck'
            site.put('animals', site.pick(('duck_swim_left_0', 'duck_swim_right_0'), HERD, 22, k),
                     x * TILE + TILE // 2, y * TILE + 11)
    if ctx.tier and site.doors:
        pet = site.pick(('dog', 'cat'), HERD, 30)
        for k in range(len(site.doors)):
            _, (x, y) = site.doors[site.below(len(site.doors), HERD, 31, k)]
            for cx, cy in ((x + 1, y), (x - 1, y), (x, y + 1)):
                if site.inside(cx, cy) and site.standable(cx, cy):
                    site.solid[cy][cx] = pet
                    site.put('animals', f'{pet}_idle_{site.pick(("down", "left", "right"), HERD, 32)}',
                             cx * TILE + TILE // 2, cy * TILE + BEAST_Y)
                    return


# ---------------------------------------------------------------------------------------- people

def populate(site, count, jobs, spots, facing_hint=None, emotes=('heart', 'coin', 'food', 'question', 'sweat')):
    """Puts people on standable tiles; jobs is a list of (job, tiles) placed first."""
    seed = site.ctx.seed
    taken = set()
    people = []

    def crowd(sub, *key):
        return draw(seed, CROWD, sub, *key)

    def add(x, y, job, stem_kind, facing, i):
        expression = ('neutral',) * 7 + ('happy',) * 2 + ('blink',)
        face = expression[crowd(FACE, i) % 10]
        if stem_kind == 'walk':
            stem = f'walk_{facing}_{crowd(POSE, i, 2) % 2}'
        elif stem_kind == 'sit':
            stem = f'sit_{facing}'
        else:
            stem = f'stand_{facing}'
        emote = None
        if crowd(EMOTE, i) % 100 < 14:
            emote = 'sleep' if stem_kind == 'sit' and face == 'blink' else emotes[crowd(EMOTE, i, 1) % len(emotes)]
            if job and emote in ('heart', 'food'):
                emote = 'sweat'
        # A sitter is anchored just in front of the bench, so it draws over it, and lifted onto the seat.
        lift = 5 if stem_kind == 'sit' and site.solid[y][x] == 'prop_bench' else 0
        jitter = 0 if lift else crowd(SPOT, i, 9) % 5 - 2
        oy = y * TILE + (PROP_Y + 1 if lift else PERSON_Y)
        people.append(Person(look_for(seed, len(people)), stem, facing, face, job, emote,
                             x * TILE + TILE // 2 + jitter, oy, lift))
        taken.add((x, y))

    def facing_for(x, y, i, kind):
        if facing_hint:
            return facing_hint(i)
        if kind == 'walk':
            horizontal = (site.road[y][x - 1] if x > 0 else False) or (site.road[y][x + 1] if x + 1 < site.w else False)
            return ('left', 'right')[crowd(POSE, i, 3) % 2] if horizontal else ('down', 'up')[crowd(POSE, i, 3) % 2]
        return ('down', 'down', 'down', 'left', 'right', 'up')[crowd(POSE, i, 4) % 6]

    i = 0
    for job, tiles in jobs:
        for k in range(len(tiles)):
            x, y = tiles[crowd(JOB, i, k) % len(tiles)]
            if (x, y) not in taken:
                add(x, y, job, 'stand', facing_for(x, y, i, 'stand'), i)
                i += 1
                break
    benches = [(x, y) for x, y in site.cells() if site.solid[y][x] == 'prop_bench' and (x, y) not in taken]
    pool = [c for c in spots if c not in taken]
    while len(people) < count and pool:
        x, y = pool.pop(crowd(SPOT, i) % len(pool))
        kind = 'walk' if site.road[y][x] and crowd(POSE, i) % 100 < 45 else 'stand'
        lonely = crowd(SPOT, i, 1) % 3 > 0
        if benches and crowd(POSE, i, 1) % 100 < 18:
            x, y = benches.pop(crowd(POSE, i, 5) % len(benches))
            add(x, y, None, 'sit', 'down', i)
        elif not (lonely and any((x + dx, y + dy) in taken for dx, dy in DIRS)):
            add(x, y, None, kind, facing_for(x, y, i, kind), i)
        i += 1
    site.people = people


def settlement_people(site):
    tier = site.ctx.tier
    lo, hi = CROWDS[tier]
    count = lo + draw(site.ctx.seed, CROWD, COUNT) % (hi - lo + 1)

    def around(names, reach=1):
        tiles = []
        for name, (x, y) in site.doors:
            if name in names:
                tiles += [(x + dx, y + dy) for dx in range(-reach, reach + 1) for dy in (0, 1)
                          if site.inside(x + dx, y + dy) and site.standable(x + dx, y + dy)]
        return tiles

    jobs = []
    police = around(('civic_police-station',), 2)
    if police:
        jobs += [('police', police)] * (2 if tier in ('city', 'capital') else 1)
    clinic = around(('civic_clinic',))
    if clinic:
        jobs.append(('clinic', clinic))
    for tx, ty, fw, fh in site.places.get('shop_market-stall', [])[:3]:
        beside = [(x, ty + fh - 1) for x in (tx - 1, tx + fw)] + [(tx + fw // 2, ty + fh)]
        beside = [c for c in beside if site.inside(*c) and site.standable(*c)]
        if beside:
            jobs.append(('merchant', beside))
    shop = around(('shop_general',))
    if shop and not site.places.get('shop_market-stall'):
        jobs.append(('merchant', shop))
    crops = [(x, y) for tx, ty, fw, fh in site.fields for y in range(ty, ty + fh) for x in range(tx, tx + fw)
             if not site.solid[y][x]]
    if crops:
        jobs += [('farmer', crops)] * (1 + (len(site.fields) > 2))
    works = around(('work_workshop',), 2)
    if works:
        jobs.append(('builder', works))
    spots = [(x, y) for x, y in site.cells() if site.standable(x, y)
             and (site.road[y][x] or site.keep[y][x] or abs(x - site.cx) + abs(y - site.cy) < 10)
             and not site.kind[y][x].startswith('crop')]
    populate(site, count, jobs, spots)


# ------------------------------------------------------------------------------------- the build

def build_settlement(site):
    ctx = site.ctx
    middle = (site.w // 4, site.h // 4, site.w * 3 // 4, site.h * 3 // 4)

    def spare(x, y):
        return middle[0] <= x < middle[2] and middle[1] <= y < middle[3]

    sides = [s for s in 'nesw' if s in ctx.river]
    lay_water(site, ctx.sea, ctx.coast == 'cliffs', 4 if ctx.tier in ('city', 'capital') else 3,
              river_points(site, sides) if sides else [], spare)
    if ctx.biome in ('hills', 'mountain', 'peak'):
        lay_ridges(site, 1 if ctx.biome == 'hills' else 2, spare)
    if ctx.tier in PLAZAS:
        lay_town(site)
        lay_roads(site)
        place_civic(site, CIVIC[ctx.tier][:1])
        place_plaza(site)
        place_civic(site, CIVIC[ctx.tier][1:])
    else:
        lay_village(site)
        lay_roads(site)
        place_village_shop(site)
    if ctx.sea and ctx.coast != 'cliffs':
        place_dock(site)
    place_landmarks(site)
    place_works(site)
    place_houses(site)
    if ctx.tier in ('village', 'hamlet') or ctx.biome == 'farmland' or ctx.farmland:
        fields = {'hamlet': 1, 'village': 3}.get(ctx.tier, len(ctx.farmland) or 1) + (ctx.biome == 'farmland')
        place_fields(site, fields, ctx.biome in ('farmland', 'grassland', 'hills'))
    if 'windmill' in ctx.landmarks:
        place_windmill(site)
    decorate(site)
    plant(site)
    herd(site)
    settlement_people(site)


def build(ctx):
    w, h = VISTA_SIZE if ctx.wonder else SIZES[ctx.tier]
    site = Site(ctx, w, h)
    lay_ground(site)
    if ctx.wonder:
        build_vista(site)
    else:
        build_settlement(site)
    return site.layout()


# --------------------------------------------------------------------------------- wonder sites

def build_vista(site):
    """Shapes the land the wonder needs, sets it where it shows best and gathers visitors in front."""
    ctx = site.ctx
    kind = ctx.wonder
    name = WONDER_FRAMES.get(kind, f'wonder_{kind}')
    f = frame('wonders', name)
    fw, fh = f['footprint']
    up = rise(f)
    w, h = site.w, site.h
    cx = w // 2 + site.below(5, VISTA, 0) - 2
    tx, bottom, facing = cx - fw // 2, 9, 'up'
    sea, cliffs, depth, rivers = ctx.sea, ctx.coast == 'cliffs', 3, []
    view = (cx - 5, bottom + 2, cx + 5, bottom + 5)
    if kind in ('waterfall', 'glacier'):
        top = 3 if kind == 'waterfall' else 2
        carve_band(site, top, 2, 'cliff_foot', 0, w - 1)
        bottom = top + up + fh - 1
        pool = tx + fw // 2 - 1
        out = next((s for s in 'swe' if s in ctx.river), 's')
        mouth = {'s': (pool + site.below(7, VISTA, 1) - 3, h - 1), 'e': (w - 1, bottom + 4), 'w': (0, bottom + 4)}[out]
        rivers.append(((pool, bottom + 1), mouth))
        if 'n' in ctx.river:
            for y in range(top):
                site.kind[y][pool] = site.kind[y][pool + 1] = 'water'
        view = (cx - 6, bottom + 1, cx + 6, bottom + 5)
    elif kind == 'crystal-cave':
        carve_band(site, 5, 1, 'cliff_foot', tx - 4, tx + fw + 3)
        bottom = 7
        view = (cx - 5, 9, cx + 5, 12)
    elif kind == 'sea-arch':
        sea = sea or 's'
        side = next(s for s in 'snew' if s in sea)
        if side == 's':
            depth, cliffs, bottom, facing = 6, ctx.coast != 'beach', h - 4, 'down'
            view = (cx - 6, 5, cx + 6, h - depth - 4)
        elif side == 'n':
            depth, cliffs, bottom = 7, False, 4
            view = (cx - 6, 10, cx + 6, 13)
        else:
            depth, cliffs, bottom = 10, False, h // 2 + 1
            tx, facing = (w - 8, 'right') if side == 'e' else (3, 'left')
            view = (w - 19, bottom - 4, w - 14, bottom + 2) if side == 'e' else (13, bottom - 4, 18, bottom + 2)
    elif ctx.river:
        rivers = river_points(site, [s for s in 'nesw' if s in ctx.river])
    keep_out = (tx - 2, bottom - fh - up - 1, tx + fw + 1, view[3] + 1)

    def spare(x, y):
        return keep_out[0] <= x <= keep_out[2] and keep_out[1] <= y <= keep_out[3]

    falls = kind in ('waterfall', 'glacier')
    lay_water(site, sea, cliffs, depth, rivers, spare, (lambda x, y: y <= bottom) if falls else None)
    if ctx.biome in ('hills', 'mountain', 'peak'):
        lay_ridges(site, 1 if ctx.biome == 'hills' or falls else 2, spare)
    ty = bottom - fh + 1
    if falls:
        pave(site, straight(site, (cx - 5, bottom + 3), (cx + 5, bottom + 3)))
    if kind == 'sea-arch':
        for y in range(ty - 1, bottom + 2):
            for x in range(tx - 1, tx + fw + 1):
                if site.inside(x, y) and site.kind[y][x] in OPEN:
                    site.kind[y][x], site.sea[y][x] = 'water', True
        tidy_water(site)
        for k, x in enumerate((tx - 2, tx + fw + 1, tx + fw + 4)):
            y = ty + 1 + site.below(2, VISTA, 3, k)
            if site.water(x, y) and site.water(x + 1, y):
                site.prop('scenery', 'prop_beach-rocks', x, y)
    if kind == 'dune':
        oasis(site, cx + (6 if site.chance(500, VISTA, 2) else -9), bottom + 3)
    site.build('wonders', name, tx, ty)
    site.cx, site.cy = tx + fw // 2, bottom
    box = [(x, y) for y in range(view[1], view[3] + 1) for x in range(view[0], view[2] + 1)
           if site.inside(x, y) and site.standable(x, y)]
    trail(site, box)
    furnish(site, kind, box, facing, (tx, ty, fw, fh))
    for x, y in box:
        site.keep[y][x] = True
    if kind == 'giant-tree':
        glade(site, tx + fw // 2, bottom + 2)
    plant(site)
    herd(site)
    lo, hi = VISITORS
    count = lo + draw(ctx.seed, CROWD, COUNT) % (hi - lo + 1)
    spots = [(x, y) for x, y in box if site.standable(x, y)]
    spots += [(x, y) for x, y in site.cells() if site.road[y][x] and site.standable(x, y) and (x, y) not in spots][:4]

    def toward(i):
        r = draw(ctx.seed, CROWD, POSE, i, 6) % 10
        return facing if r < 6 else ('left', 'right', 'down', 'down')[r - 6]

    populate(site, count, [], spots, toward, ('heart', 'heart', 'question', 'food'))


def oasis(site, x0, y0):
    """A pool with a grass bank in a grove of palms, the shade a desert view needs."""
    for y in range(y0 - 1, y0 + 3):
        for x in range(x0 - 1, x0 + 4):
            if site.inside(x, y):
                site.kind[y][x] = 'grass'
    for y in range(y0, y0 + 2):
        for x in range(x0, x0 + 3):
            if site.inside(x, y):
                site.kind[y][x] = 'water'
    tidy_water(site)
    grove = ((x0 - 2, y0), (x0 + 4, y0 + 1), (x0 + 1, y0 - 2), (x0 + 3, y0 + 3), (x0 - 2, y0 + 2), (x0 + 4, y0 - 1),
             (x0 - 1, y0 - 2), (x0 + 3, y0 - 2))
    for x, y in grove:
        if site.inside(x, y) and site.free(x, y) and not site.crown[y][x]:
            site.tree('scenery', 'tree_palm', x, y)


def glade(site, x0, y0):
    """Keeps a sunny clearing of wildflowers in front of the giant tree."""
    for x, y in site.cells():
        dx, dy = x - x0, y - y0
        if dx * dx * 25 + dy * dy * 64 <= 1600 and site.kind[y][x] in OPEN and not site.solid[y][x]:
            if not site.road[y][x]:
                site.kind[y][x] = 'meadow'
            site.keep[y][x] = True


def trail(site, box):
    """A footpath from the edge of the view to the visitors' spot."""
    goal = set(box)
    sides = [s for s in 'nesw' if s in site.ctx.roads] + ['s', 'w', 'e', 'n']
    for i, side in enumerate(sides):
        if side in site.ctx.sea:
            continue
        start = road_entry(site, side, 90 + i)
        path = start and route(site, start, INWARD[side], lambda x, y: (x, y) in goal)
        if path:
            pave(site, path)
            site.entries.append((side, start))
            return


def furnish(site, kind, box, facing, rect):
    """The props of a viewpoint: a rail at the edge, a viewer, a picnic table and benches."""
    tx, ty, fw, fh = rect
    if not box:
        return
    if kind == 'sea-arch' and facing == 'down':
        rim = max(y for _, y in box) + 1
        xs = [x for x, y in box if y == rim - 1]
        for x in range(min(xs) + 1, max(xs)):
            if site.kind[rim][x] == 'cliff_top' and not site.solid[rim][x]:
                site.prop('scenery', 'prop_viewpoint-rail', x, rim)
    if kind == 'canyon-view':
        for x in range(tx + 1, tx + fw - 1):
            if site.free(x, ty + fh):
                site.prop('scenery', 'prop_viewpoint-rail', x, ty + fh)
    if kind == 'crystal-cave' and site.kind[ty][tx - 2] == 'cliff_face':
        site.put('scenery', 'prop_stone-steps', (tx - 2) * TILE + TILE // 2, (ty + 1) * TILE, ground=True)
    if kind in ('geyser', 'hot-springs', 'caldera-lake', 'stone-arch'):
        for x, y in [(x, y) for y in range(ty - 1, ty + fh + 1) for x in (tx - 2, tx - 1, tx + fw, tx + fw + 1)]:
            if site.free(x, y) and not site.crown[y][x] and site.chance(400, VISTA, 20, x, y):
                site.prop('nature', 'rock_boulder', x, y)
    cells = [(x, y) for x, y in box if site.free(x, y) and not site.crown[y][x]]
    near = {'up': lambda c: c[1], 'down': lambda c: -c[1], 'left': lambda c: c[0], 'right': lambda c: -c[0]}[facing]
    ordered = sorted(cells, key=lambda c: (near(c), c[0], c[1]))
    front, back = ordered[:len(ordered) // 3], ordered[len(ordered) // 2:]
    decor = ('scenery', 'prop_reeds') if site.desert() else ('nature', 'prop_flower-patch')
    pieces = [('scenery', 'prop_viewer', front, False), ('scenery', 'prop_picnic-table', back, True),
              ('nature', 'prop_bench', back, False), ('nature', 'prop_bench', back, False),
              (*decor, ordered, False), (*decor, ordered, False)]
    for k, (category, name, pool, wide) in enumerate(pieces):
        pool = [(x, y) for x, y in pool if site.free(x, y) and not site.crown[y][x]
                and (not wide or (site.free(x + 1, y) and not site.crown[y][x + 1]))
                and not any(site.solid[y + dy][x + dx] for dx in (-1, 0, 1, 2) for dy in (-1, 0, 1)
                            if site.inside(x + dx, y + dy))]
        if pool:
            x, y = pool[site.below(len(pool), VISTA, 10, k)]
            site.prop(category, name, x, y, wide=wide)


# ------------------------------------------------------------------------------------------ demo

DEMOS = [
    ('coastal-town', PlaceContext(seed=0x5EA51DE, name='Saltmere', biome='grassland', temperature=165, moisture=120,
                                  tier='town', population=1800, sea='s', coast='beach', roads='nw',
                                  landmarks=('lighthouse', 'fountain'))),
    ('river-village', PlaceContext(seed=0x00F1E1D5, name='Millbrook', biome='farmland', temperature=135, moisture=150,
                                   tier='village', population=240, river='ns', roads='ew', landmarks=('windmill',))),
    ('capital', PlaceContext(seed=0xC0FFEE42, name='Highcourt', biome='grassland', temperature=140, moisture=140,
                             tier='capital', population=52000, river='ns', roads='new',
                             landmarks=('clock-tower', 'library', 'fountain'))),
    ('desert-dune', PlaceContext(seed=0xD00E5A1D, name='Amber Reach', biome='sand', temperature=235, moisture=25,
                                 roads='w', wonder='dune')),
    ('forest-giant-tree', PlaceContext(seed=0x6EA7EE01, name='Eldergrove', biome='forest-deciduous',
                                       temperature=140, moisture=190, roads='s', wonder='giant-tree')),
    ('cliff-sea-arch', PlaceContext(seed=0x5EAA7C44, name='Gull Arch', biome='grassland', temperature=130,
                                    moisture=140, sea='s', coast='cliffs', roads='w', wonder='sea-arch')),
    ('mountain-waterfall', PlaceContext(seed=0xFA115EED, name='Silverfall', biome='mountain', temperature=105,
                                        moisture=170, river='ns', roads='w', wonder='waterfall')),
    ('peak-glacier', PlaceContext(seed=0x61AC1E55, name='Whitecrown', biome='peak', temperature=25, moisture=120,
                                  roads='s', wonder='glacier')),
]


def overlaps(layout):
    """Standing sprites whose footprints share a tile, and big sprites drawn over another's footprint."""
    owner, found, big = {}, [], []
    for s in layout.standing:
        if s.category == 'animals':
            continue
        f = frame(s.category, s.name)
        if 'footprint' in f:
            fw, fh = f['footprint']
            x0, y1 = (s.x - fw * TILE // 2) // TILE, s.y // TILE
            tiles = [(x, y) for y in range(y1 - fh + 1, y1 + 1) for x in range(x0, x0 + fw)]
            image = (s.x - f['anchor'][0], s.y - f['anchor'][1], s.x - f['anchor'][0] + f['w'], s.y - f['anchor'][1] + f['h'])
            big.append((s, image, (x0 * TILE, (y1 - fh + 1) * TILE, (x0 + fw) * TILE, (y1 + 1) * TILE)))
        elif s.name.startswith('tree_'):
            tiles = [(s.x // TILE, s.y // TILE)]
        else:
            left = s.x - f['anchor'][0]
            tiles = [(x, s.y // TILE) for x in range((left + 2) // TILE, (left + f['w'] - 3) // TILE + 1)]
        for t in tiles:
            if t in owner and owner[t] != s:
                found.append(f'{owner[t].name} and {s.name} share tile {t}')
            owner[t] = s
    for a, (ax0, ay0, ax1, ay1), _ in big:
        for b, _, (bx0, by0, bx1, by1) in big:
            if a.y > b.y and ax0 < bx1 and bx0 < ax1 and ay0 < by1 and by0 < ay1:
                found.append(f'{a.name} hides the footprint of {b.name}')
    return found


def demo():
    for name, ctx in DEMOS:
        layout = build(ctx)
        path = render(layout, DEMO / f'{name}.png')
        houses = sum(s.category == 'houses' for s in layout.standing)
        trees = sum(s.name.startswith('tree_') for s in layout.standing)
        print(f'{path}  houses {houses}, people {len(layout.people)}, trees {trees}')
        for problem in overlaps(layout):
            print(f'  overlap: {problem}')


if __name__ == '__main__':
    if '--demo' in sys.argv:
        demo()
    else:
        print('usage: python tools/worldgen/place.py --demo')
