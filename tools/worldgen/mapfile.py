"""Writes map v1, the one binary map the worker and the renderer both read (plan: M0.4 Task 1).

Little-endian: a 16-byte header, the terrain kinds, the frame names, the terrain, walk and tile grids
(row-major from the top-left), then 18-byte entities. packages/sim-protocol/src/map.ts parses it, and
write_map raises ValueError on every rule that parser checks, so a map that reaches disk loads.
Run `python tools/worldgen/mapfile.py` to write the 3x2 test fixture, or with --check to compare it
with the committed file.
"""
import struct
import sys
from dataclasses import dataclass
from pathlib import Path

MAP_MAGIC = 0x50414D4E
MAP_VERSION = 1
MAX_SIDE = 1024
MAX_KINDS = 255
MAX_COUNT = 0xFFFF
DAY_MINUTES = 1440
NO_FRAME = 0xFFFF
WALK_BLOCKED, WALK_OPEN, WALK_ROAD, WALK_DOOR = range(4)
ENTITY_HOME, ENTITY_WORKPLACE, ENTITY_SHOP, ENTITY_CIVIC = range(1, 5)

HEADER = struct.Struct('<I6H')    # magic, version, width, height, kinds, frames, entities
ENTITY = struct.Struct('<4B7H')   # kind, w, h, 0, x, y, doorX, doorY, frame, a, b
FIXTURE = Path(__file__).resolve().parents[2] / 'packages' / 'sim-protocol' / 'test' / 'fixtures' / 'tiny.nmap'


@dataclass(frozen=True)
class Entity:
    """A building: its footprint's top-left tile, size, door tile and frame index. a is a home's capacity or a
    shop's opening minute, b its closing minute."""
    kind: int
    x: int
    y: int
    w: int
    h: int
    door_x: int
    door_y: int
    frame: int
    a: int = 0
    b: int = 0


def require(ok, message):
    if not ok:
        raise ValueError(message)


def check_name(name, what):
    require(name.isascii() and 1 <= len(name) <= 255, f'{what} {name[:32]!r} is not 1 to 255 ASCII characters')


def check_grid(grid, name, cells, limit, also=()):
    require(len(grid) == cells, f'{name} has {len(grid)} cells, expected {cells}')
    require(all(0 <= v < limit or v in also for v in grid), f'{name} holds a value outside 0..{limit - 1}')


def check_entity(e, width, height, frame_count):
    require(ENTITY_HOME <= e.kind <= ENTITY_CIVIC, f'entity kind {e.kind} is not 1 to 4')
    require(1 <= e.w <= 255 and 1 <= e.h <= 255, f'entity footprint {e.w} by {e.h} is not 1 to 255 tiles a side')
    require(0 <= e.x and e.x + e.w <= width and 0 <= e.y and e.y + e.h <= height,
            f'entity footprint at ({e.x}, {e.y}), {e.w} by {e.h}, leaves the {width} by {height} map')
    require(0 <= e.door_x < width and 0 <= e.door_y < height, f'entity door ({e.door_x}, {e.door_y}) leaves the map')
    require(0 <= e.frame < frame_count, f'entity frame {e.frame} is not one of {frame_count} frames')
    got = f'not a {e.a} and b {e.b}'
    if e.kind == ENTITY_HOME:
        require(1 <= e.a <= MAX_COUNT and e.b == 0, f'a home needs capacity a >= 1 and b 0, {got}')
    elif e.kind == ENTITY_SHOP:
        require(0 <= e.a < e.b <= DAY_MINUTES, f'a shop needs opening a < closing b <= {DAY_MINUTES}, {got}')
    else:
        require(e.a == 0 and e.b == 0, f'a workplace or civic building needs a and b of 0, {got}')


def check_map(width, height, kinds, frames, terrain, walk, tiles, entities):
    require(1 <= width <= MAX_SIDE and 1 <= height <= MAX_SIDE,
            f'a map {width} by {height} tiles is not 1 to {MAX_SIDE} a side')
    require(1 <= len(kinds) <= MAX_KINDS, f'{len(kinds)} kinds is not 1 to {MAX_KINDS}')
    require(len(frames) <= MAX_COUNT and len(entities) <= MAX_COUNT, 'too many frames or entities')
    for name, rgb in kinds:
        check_name(name, 'kind')
        require(len(rgb) == 3 and all(0 <= c <= 255 for c in rgb), f'kind {name!r} colour {rgb} is not three bytes')
    for name in frames:
        check_name(name, 'frame')
    cells = width * height
    check_grid(terrain, 'terrain', cells, len(kinds))
    check_grid(walk, 'walk', cells, WALK_DOOR + 1)
    check_grid(tiles, 'tiles', cells, len(frames), also=(NO_FRAME,))
    for e in entities:
        check_entity(e, width, height, len(frames))


def write_map(width, height, kinds, frames, terrain, walk, tiles, entities):
    """kinds are (name, (r, g, b)); frames are 'category/name'; the grids are flat and row-major."""
    check_map(width, height, kinds, frames, terrain, walk, tiles, entities)
    out = [HEADER.pack(MAP_MAGIC, MAP_VERSION, width, height, len(kinds), len(frames), len(entities))]
    out += [bytes((*rgb, len(name))) + name.encode('ascii') for name, rgb in kinds]
    out += [bytes((len(name),)) + name.encode('ascii') for name in frames]
    out += [bytes(terrain), bytes(walk), struct.pack(f'<{len(tiles)}H', *tiles)]
    out += [ENTITY.pack(e.kind, e.w, e.h, 0, e.x, e.y, e.door_x, e.door_y, e.frame, e.a, e.b) for e in entities]
    return b''.join(out)


def save_or_check(path, data, check):
    """Writes data to path, or with check compares it with the file there. Returns the exit status."""
    if check:
        if path.exists() and path.read_bytes() == data:
            print(f'{path.name} matches its generator')
            return 0
        print(f'{path} differs from its generator: rerun it without --check')
        return 1
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print(f'{path.name}: {len(data)} bytes')
    return 0


def tiny():
    """3x2 tiles: a home and a shop over their doors, then open ground and a road tile with no frame."""
    kinds = [('grass', (76, 170, 60)), ('path', (168, 108, 60)), ('home', (122, 74, 134)), ('shop', (204, 196, 176))]
    frames = ['buildings/shop_general', 'houses/house_cottage_detached_roof-terracotta',
              'nature/terrain_dirt-path', 'nature/terrain_grass_0']
    terrain = [2, 3, 0,
               1, 1, 1]
    walk = [WALK_BLOCKED, WALK_BLOCKED, WALK_OPEN,
            WALK_DOOR, WALK_DOOR, WALK_ROAD]
    tiles = [3, 3, 3,
             2, 2, NO_FRAME]
    entities = [Entity(ENTITY_HOME, 0, 0, 1, 1, 0, 1, frame=1, a=3),
                Entity(ENTITY_SHOP, 1, 0, 1, 1, 1, 1, frame=0, a=480, b=1200)]
    return write_map(3, 2, kinds, frames, terrain, walk, tiles, entities)


if __name__ == '__main__':
    sys.exit(save_or_check(FIXTURE, tiny(), '--check' in sys.argv))
