"""Exports the default town, Highcourt, as map v1 (plan: M0.4 Task 2).

place.build_site lays the town out; this turns its Site into terrain kinds, a walk grid, ground tile
frames and entities for mapfile.write_map. Run `python tools/worldgen/export_map.py` to write
assets/maps/town.nmap and refresh assets/LICENSES.md, or with --check to compare the generator's
output with the committed map.
"""
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent / 'sprites'))

from licenses import ASSETS, LICENSES, write_licenses  # noqa: E402
from mapfile import (ENTITY_CIVIC, ENTITY_HOME, ENTITY_SHOP, ENTITY_WORKPLACE, WALK_BLOCKED, WALK_DOOR,  # noqa: E402
                     WALK_OPEN, WALK_ROAD, Entity, save_or_check, write_map)
from model import PlaceContext  # noqa: E402
from place import CLIFFS, build_site, tile_for  # noqa: E402
from showcase import Sheets  # noqa: E402
from spritekit import PALETTE  # noqa: E402

TOWN_MAP = ASSETS / 'maps' / 'town.nmap'
# Pinned here, not read from place.DEMOS, so editing a demo cannot change the committed town.
TOWN = PlaceContext(seed=0xC0FFEE42, name='Highcourt', biome='grassland', temperature=140, moisture=140,
                    tier='capital', population=52000, river='ns', roads='new',
                    landmarks=('clock-tower', 'library', 'fountain'))

ANIMALS = ('cow', 'sheep', 'goat', 'horse', 'chicken', 'duck', 'dog', 'cat')
# Ground never takes a role, alert, edge, background or body-hue colour, so these are the only choices.
GROUND_COLOURS = ('GRASS_L', 'GRASS', 'LEAF_D', 'SAND', 'SAND_D', 'WOOD_L', 'WOOD_D', 'WATER_L', 'WATER')
BUILT_COLOURS = {'home': 'PLUM', 'workplace': 'STONE', 'shop': 'CREAM_D', 'civic': 'STONE_L', 'landmark': 'WOOD'}
ENTITY_KINDS = {'home': ENTITY_HOME, 'workplace': ENTITY_WORKPLACE, 'shop': ENTITY_SHOP, 'civic': ENTITY_CIVIC}
KIND_OF_PREFIX = {'house': 'home', 'work': 'workplace', 'shop': 'shop', 'civic': 'civic', 'landmark': 'landmark'}
# Placeholder values from the plan: a home's capacity by form, a shop's opening and closing minute.
CAPACITY = {'hut': 2, 'detached': 4, 'row-left': 4, 'row-middle': 4, 'row-right': 4, 'farmhouse': 6, 'apartment': 24}
HOURS = {'shop_general': (480, 1200), 'shop_market-stall': (360, 840)}


def built_kind(name):
    if name == 'shop_warehouse':
        return 'workplace'
    return KIND_OF_PREFIX[name.split('_')[0]]


def footprints(site):
    """Every footprinted sprite as (name, tx, ty, fw, fh), in row-major order of its top-left tile."""
    found = [(name, tx, ty, fw, fh) for name, rects in site.places.items() for tx, ty, fw, fh in rects]
    return sorted(found, key=lambda f: (f[2], f[1]))


def door_for(site, name, tx, ty, fw, fh):
    """Names repeat, so a door belongs to the footprint it lies just below. A stall that plaza_piece built has
    none, and takes the tile below its middle, where Site.settle puts one."""
    for door_name, (x, y) in site.doors:
        if door_name == name and y == ty + fh and tx <= x < tx + fw:
            return x, y
    return tx + fw // 2, ty + fh


def check_door(site, name, x, y):
    if not site.inside(x, y) or site.big[y][x]:
        raise ValueError(f'the door of {name} at ({x}, {y}) is off the map or on a footprint')


def make_entity(name, rect, door, frame):
    tx, ty, fw, fh = rect
    kind = built_kind(name)
    a, b = 0, 0
    if kind == 'home':
        a = CAPACITY[name.split('_')[2]]
    elif kind == 'shop':
        a, b = HOURS[name]
    return Entity(ENTITY_KINDS[kind], tx, ty, fw, fh, *door, frame, a, b)


def walk_at(site, x, y, door_cells):
    if (x, y) in door_cells:
        return WALK_DOOR
    solid = site.solid[y][x]
    if site.big[y][x] or (solid and solid not in ANIMALS):
        return WALK_BLOCKED
    if site.road[y][x]:
        return WALK_ROAD
    if site.kind[y][x] == 'water' or site.kind[y][x] in CLIFFS:
        return WALK_BLOCKED
    return WALK_OPEN


def cell_names(site, kind_at, door_cells):
    """Row-major, per cell: its terrain kind name, its walk value and its ground tile's frame name."""
    kind_names, walk, frame_names = [], [], []
    for y in range(site.h):
        for x in range(site.w):
            category, name = tile_for(site, x, y)
            kind = kind_at.get((x, y), site.kind[y][x])
            # Map v1 holds no ground sprites, so a footbridge's water cells draw as the paved causeway
            # place.cross lays on other crossings; otherwise blobs would seem to walk on the river.
            if site.road[y][x] and kind == 'water':
                kind, category, name = 'paving', 'nature', 'terrain_paving'
            kind_names.append(kind)
            walk.append(walk_at(site, x, y, door_cells))
            frame_names.append(f'{category}/{name}')
    return kind_names, walk, frame_names


def first_tiles(site):
    """The first non-shore tile of each ground kind, as (category, name)."""
    first = {}
    for y in range(site.h):
        for x in range(site.w):
            category, name = tile_for(site, x, y)
            if not name.startswith('shore_'):
                first.setdefault(site.kind[y][x], (category, name))
    return first


def nearest_ground_colour(image):
    """The ground palette name nearest a tile's mean opaque colour, by squared RGB distance in exact integers."""
    pixels = np.asarray(image).reshape(-1, 4)
    opaque = pixels[pixels[:, 3] == 255, :3].astype(np.int64)
    total, count = [int(v) for v in opaque.sum(axis=0)], len(opaque)
    return min(GROUND_COLOURS, key=lambda name: sum((total[k] - count * PALETTE[name][k]) ** 2 for k in range(3)))


def kind_colour(kind, ground, sheets):
    if kind in BUILT_COLOURS:
        return PALETTE[BUILT_COLOURS[kind]]
    image, _ = sheets.get(*ground[kind])
    return PALETTE[nearest_ground_colour(image)]


def town_map(ctx):
    """The keyword arguments of write_map for the settlement that build_site lays out from ctx."""
    site = build_site(ctx)
    sprite_frame = {s.name: f'{s.category}/{s.name}' for s in site.standing}
    rects = footprints(site)
    kind_at = {(x, y): built_kind(name) for name, tx, ty, fw, fh in rects
               for y in range(ty, ty + fh) for x in range(tx, tx + fw)}
    placed = [(name, rect, door_for(site, name, *rect)) for name, *rect in rects if built_kind(name) in ENTITY_KINDS]
    for name, _, (x, y) in placed:
        check_door(site, name, x, y)
    kind_names, walk, frame_names = cell_names(site, kind_at, {door for _, _, door in placed})
    kinds = list(dict.fromkeys(kind_names))
    frames = list(dict.fromkeys(frame_names + [sprite_frame[name] for name, _, _ in placed]))
    ground, sheets = first_tiles(site), Sheets()
    entities = [make_entity(name, rect, door, frames.index(sprite_frame[name])) for name, rect, door in placed]
    return dict(width=site.w, height=site.h, kinds=[(kind, kind_colour(kind, ground, sheets)) for kind in kinds],
                frames=frames, terrain=[kinds.index(kind) for kind in kind_names], walk=walk,
                tiles=[frames.index(frame) for frame in frame_names], entities=entities)


def export(ctx):
    return write_map(**town_map(ctx))


def describe(town):
    print(f'{town["width"]}x{town["height"]} tiles, {len(town["frames"])} frames, '
          f'{sum(map(bool, town["walk"]))} walkable cells')
    print('kinds: ' + ', '.join(f'{name} #{r:02X}{g:02X}{b:02X}' for name, (r, g, b) in town['kinds']))
    print('entities: ' + ', '.join(f'{sum(e.kind == kind for e in town["entities"])} {name}'
                                   for name, kind in ENTITY_KINDS.items()))


def main(check):
    town = town_map(TOWN)
    describe(town)
    status = save_or_check(TOWN_MAP, write_map(**town), check)
    if status == 0 and not check:
        print(f'{write_licenses()} files listed in {LICENSES.name}')
    return status


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
