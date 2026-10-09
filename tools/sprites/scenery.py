"""Scenery sprites for Nomos's City view: shore autotiles, cliffs, meadows, vista props and trees.

GBA-era top-down pixel art in three-quarter view, lit from the top left, drawn fresh as ASCII
grids in the shared palette. Terrain (shores, cliffs, meadows) has no outline and joins
nature.py's terrain_grass_*, terrain_sand and terrain_water_* tiles; props and trees get the
1-px outline ring, like nature.py's.

Shore autotiles come in two sets, grass banks and sand beaches. Every coastline crosses a tile
edge at its midpoint, between pixels 7 and 8, so the twelve shapes of a set join one another
and the plain tiles. Choose a tile from the land or water at its four corners, which each
shore tile also lists in its manifest entry as `corners` (nw, ne, sw, se; 1 is land):

    land corners              tile
    all four                  terrain_grass_* or terrain_sand
    none                      terrain_water_*
    two on one side           shore_<set>_<d>: water along side <d>
    one                       shore_<set>_<d>-outer: water along both sides that meet at corner <d>
    three                     shore_<set>_<d>-inner: water only at corner <d>
    two on a diagonal         not drawn

On a map with one terrain value per cell, give each land cell beside water the tile named for
its water neighbours instead: water north is _n, north and east is _ne-outer, and water only
at the north-east diagonal is _ne-inner. Land must then be at least two cells thick. Each
shore tile has frames _0 and _1 that show terrain_water_0 and _1 pixel for pixel wherever
water shows, so shores shimmer in step with open water.
"""
from abc import ABC, abstractmethod

import numpy as np
from PIL import Image

import nature
from buildings import Canvas, add_with_snow, snowing
from military import tops
from seasons import snow_tile
from spritekit import PALETTE, TILE, Sheet, add_outline, cmap, from_ascii, pad
from walls import COURSE

# nature.py's symbols plus foam, the sea-glass shallows off a beach and lilac flowers
P = {**nature.P, **cmap(I='ICE_L', Q='MINT_S', q='MINT_D', B='LILAC_L', b='LILAC_S')}

# Shore symbols that change between the two frames: (frame 0, frame 1), where None shows the
# water frame underneath. '#' shows the land texture and '.' the water frame.
TWO_FRAME = {
    '0': ('WHITE', None), '1': (None, 'WHITE'),           # foam breaking and re-forming
    '2': ('WATER_L', None), '3': (None, 'WATER_L'),       # glints off the foam
    '6': ('SAND_D', 'WHITE'),                             # wet sand the wave runs up over
    '7': ('ICE_L', 'WHITE'), '8': ('WHITE', 'ICE_L'),     # surf filling in and thinning
}

SHAPES = ('n', 'e', 's', 'w', 'ne-outer', 'se-outer', 'sw-outer', 'nw-outer',
          'ne-inner', 'se-inner', 'sw-inner', 'nw-inner')
# land at the nw, ne, sw and se corners of each shape
CORNERS = {
    'n': '0011', 'e': '1010', 's': '1100', 'w': '0101',
    'ne-outer': '0010', 'se-outer': '1000', 'sw-outer': '0100', 'nw-outer': '0001',
    'ne-inner': '1011', 'se-inner': '1110', 'sw-inner': '1101', 'nw-inner': '0111',
}


def grid(rows, size=None):
    """Render one hand-drawn grid; rows must all be the same width."""
    width = len(rows[0])
    ragged = [i for i, r in enumerate(rows) if len(r) != width]
    if ragged:
        raise ValueError(f'ragged rows {ragged} (expected width {width})')
    if size and (width, len(rows)) != size:
        raise ValueError(f'grid is {width}x{len(rows)}, expected {size[0]}x{size[1]}')
    return from_ascii(rows, P)


def tile(rows):
    return grid(rows, (TILE, TILE))


def outlined(rows):
    return add_outline(pad(grid(rows)))


# --------------------------------------------------------------------------- shores
# Grass banks: an earth lip, lit on north and west edges and shaded on east ones; facing south,
# the bank shows a two-pixel earth face under hanging grass. Foam hugs the bank and breaks in
# different places each frame. Sand beaches: two rows of wet sand, a surf line that runs up
# the sand in frame 1, then sea-glass shallows that fade into open water.

SHORE_GRASS = {
    'n': [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '3.2..32.3..32...',
        'W0WW1WW0WWW0W1WW',
        'wwkwwLwwwwkwwwLw',
        '###G#####G#####G',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
    'e': [
        '#######k0.......',
        '#######dW.......',
        '#######dW3......',
        '#######d12......',
        '#######wW.......',
        '#######dW3......',
        '#######d0.......',
        '#######dW.......',
        '#######dW3......',
        '#######dW2......',
        '#######d0.......',
        '#######wW.......',
        '#######d1.......',
        '#######dW3......',
        '#######dW.......',
        '#######dW2......',
    ],
    's': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        'kkkkkkkkkkkkkkkk',
        'kwwwLwkwwkwwLwwk',
        'wdddddddddwddddd',
        'W1WW0WWW0W1WWW0W',
        '32.3..32...3.2..',
        '................',
        '................',
        '................',
        '................',
    ],
    'w': [
        '......3WL#######',
        '.......0w#######',
        '......2Ww#######',
        '.......WwG######',
        '.......1w#######',
        '......3Wk#######',
        '......2Ww#######',
        '.......0w#######',
        '......3Ww#######',
        '.......WLG######',
        '.......Ww#######',
        '......30w#######',
        '......2Ww#######',
        '.......1k#######',
        '.......Ww#######',
        '.......WwG######',
    ],
    'ne-outer': [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '3.2..32.........',
        'W0WW1WW3........',
        'wwkwwL0W.3......',
        '###G#wwWW2......',
        '######ww0.......',
        '#######wW.......',
        '#######d1.......',
        '#######dW3......',
        '#######dW.......',
        '#######dW2......',
    ],
    'se-outer': [
        '#######k0.......',
        '#######dW.......',
        '#######dW3......',
        '#######d12......',
        '#######wW.......',
        '#######dW3......',
        '#######d0.......',
        'kkkkkkkkW.......',
        'kwwwLwkwW3......',
        'wddddddWW2......',
        'W1WW0WWW2.......',
        '32.3..32........',
        '................',
        '................',
        '................',
        '................',
    ],
    'sw-outer': [
        '......3WL#######',
        '.......0w#######',
        '......2Ww#######',
        '.......WwG######',
        '.......1w#######',
        '......3Wk#######',
        '......2Ww#######',
        '.......0kkkkkkkk',
        '......3WwkwwLwwk',
        '.......WWdwddddd',
        '.......30W1WWW0W',
        '.......2...3.2..',
        '................',
        '................',
        '................',
        '................',
    ],
    'nw-outer': [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '........3..32...',
        '.......3.WW0W1WW',
        '......3.WWkwwwLw',
        '.......WWkw####G',
        '.......Wkw######',
        '......30w#######',
        '......2Ww#######',
        '.......1k#######',
        '.......Ww#######',
        '.......WwG######',
    ],
    'ne-inner': [
        '#######k0.......',
        '#######dW.......',
        '#######dW3......',
        '#######d12......',
        '#######wW.3.....',
        '#######dW0......',
        '#######wwWW32...',
        '########wwW0W1WW',
        '#########wkwwwLw',
        '###############G',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
    'se-inner': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        '#######wkkkkkkkk',
        '#######dwkwwLwwk',
        '#######dddwddddd',
        '#######ddW1WWW0W',
        '#######wW1.3.2..',
        '#######d1.3.....',
        '#######dW3......',
        '#######dW.......',
        '#######dW2......',
    ],
    'sw-inner': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        'kkkkkkkkw#######',
        'kwwwLwkww#######',
        'wdddddddLG######',
        'W1WW0WWdw#######',
        '32.3..W0w#######',
        '.....32Ww#######',
        '.......1k#######',
        '.......Ww#######',
        '.......WwG######',
    ],
    'nw-inner': [
        '......3WL#######',
        '.......0w#######',
        '......2Ww#######',
        '.......WwG######',
        '.......1w#######',
        '......1Wk#######',
        '3.2..1WLw#######',
        'W0WW1WLw########',
        'wwkwwLw#########',
        '###G############',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
}

SHORE_SAND = {
    'n': [
        '................',
        '................',
        '................',
        '................',
        '.qq...q..q..q..q',
        'qqqqqqqqqqqqqqqq',
        'QQQQQQQQQQQQQQQQ',
        '7W8888WW7W88888W',
        'ss66ssssss666sss',
        'ssss#ssss#sssss#',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
    'e': [
        '######ssWQq.....',
        '######ss8Qq.....',
        '#######s8Qqq....',
        '######s68Qq.....',
        '######s68Qq.....',
        '######ssWQqq....',
        '######ssWQq.....',
        '#######s7Qq.....',
        '######ssWQqq....',
        '######ss8Qq.....',
        '######ss8Qqq....',
        '######s68Qqq....',
        '#######68Qq.....',
        '######s68Qq.....',
        '######ssWQq.....',
        '######ss7Qqq....',
    ],
    's': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        'ss#ssss#ssss#sss',
        'sss66ssssss666ss',
        'W8888WW7W88888W7',
        'QQQQQQQQQQQQQQQQ',
        'qqqqqqqqqqqqqqqq',
        '..q..q..q.qq...q',
        '................',
        '................',
        '................',
        '................',
    ],
    'w': [
        '.....qQ7ss######',
        '....qqQWss######',
        '....qqQ86s######',
        '.....qQ86s######',
        '.....qQ8s#######',
        '.....qQ8ss######',
        '....qqQWss######',
        '.....qQWss######',
        '.....qQ7ss######',
        '....qqQWs#######',
        '.....qQ86s######',
        '.....qQ86s######',
        '....qqQ86s######',
        '.....qQ8ss######',
        '.....qQ8ss######',
        '....qqQWs#######',
    ],
    'ne-outer': [
        '................',
        '................',
        '................',
        '................',
        '.qq...q.........',
        'qqqqqqqqq.......',
        'QQQQQQQqq.......',
        '7W8888WQqq......',
        'ss66ssW7Qqqq....',
        'ssss#ssW8Qq.....',
        '######ss8Qqq....',
        '######s68Qqq....',
        '#######68Qq.....',
        '######s68Qq.....',
        '######ssWQq.....',
        '######ss7Qqq....',
    ],
    'se-outer': [
        '######ssWQq.....',
        '######ss8Qq.....',
        '#######s8Qqq....',
        '######s68Qq.....',
        '######s68Qq.....',
        '######ssWQqq....',
        'ss#ssssWWQq.....',
        'sss66sWWQqq.....',
        'W8888WWQqq......',
        'QQQQQQQqq.......',
        'qqqqqqqq........',
        '..q..q..........',
        '................',
        '................',
        '................',
        '................',
    ],
    'sw-outer': [
        '.....qQ7ss######',
        '....qqQWss######',
        '....qqQ86s######',
        '.....qQ86s######',
        '.....qQ8s#######',
        '.....qQ8ss######',
        '....qqQWWsss#sss',
        '.....qqQ7Ws666ss',
        '.....qqqQ88888W7',
        '.......qqQQQQQQQ',
        '........qqqqqqqq',
        '........q.qq...q',
        '................',
        '................',
        '................',
        '................',
    ],
    'nw-outer': [
        '................',
        '................',
        '................',
        '................',
        '.........q..q..q',
        '........qqqqqqqq',
        '.......qqQQQQQQQ',
        '......qqQW88888W',
        '.....qqQW8666sss',
        '....qqQW86sssss#',
        '.....qQ86s######',
        '.....qQ86s######',
        '....qqQ86s######',
        '.....qQ8ss######',
        '.....qQ8ss######',
        '....qqQWs#######',
    ],
    'ne-inner': [
        '######ssWQq.....',
        '######ss8Qq.....',
        '#######s8Qqq....',
        '######s68Qq.....',
        '######s68Qqqq..q',
        '######ssWWQqqqqq',
        '########s7WQQQQQ',
        '########ss88888W',
        '#########s666sss',
        '##########sssss#',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
    'se-inner': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        '##########ss#sss',
        '#########ss666ss',
        '########ss8888W7',
        '#######ss88QQQQQ',
        '######ss88Qqqqqq',
        '######s68Qqq...q',
        '#######68Qq.....',
        '######s68Qq.....',
        '######ssWQq.....',
        '######ss7Qqq....',
    ],
    'sw-inner': [
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
        'ss#sss##########',
        'sss66s##########',
        'W8888Wss########',
        'QQQQQW7ss#######',
        'qqqqqQW86s######',
        '..q.qqQ86s######',
        '....qqQ86s######',
        '.....qQ8ss######',
        '.....qQ8ss######',
        '....qqQWs#######',
    ],
    'nw-inner': [
        '.....qQ7ss######',
        '....qqQWss######',
        '....qqQ86s######',
        '.....qQ86s######',
        '.qq.qqQ8s#######',
        'qqqqqQ88ss######',
        'QQQQQ88ss#######',
        '7W8888ss########',
        'ss66sss#########',
        'ssss#s##########',
        '################',
        '################',
        '################',
        '################',
        '################',
        '################',
    ],
}


def cells(rows, ch):
    return [(x, y) for y, r in enumerate(rows) for x, c in enumerate(r) if c == ch]


def groups(points):
    """8-connected groups of (x, y) points."""
    left, out = set(points), []
    while left:
        stack, group = [left.pop()], []
        while stack:
            x, y = stack.pop()
            group.append((x, y))
            for nb in ((x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                if nb in left:
                    left.remove(nb)
                    stack.append(nb)
        out.append(group)
    return out


def crest_pairs():
    """Each crest of terrain_water_0 with the line it flattens into in terrain_water_1, so a crest
    that the coast would cut is dropped from both frames together."""
    crests, flats = groups(cells(nature.WATER[0], 'A')), groups(cells(nature.WATER[1], 'A'))
    pairs, glints = [], []
    for c in crests:
        xs, base = {x for x, _ in c}, max(y for _, y in c)
        flat = next((f for f in flats if len(c) > 1 and {x for x, _ in f} == xs
                     and {y for _, y in f} == {base}), None)
        if flat:
            flats.remove(flat)
            pairs.append(c + flat)
        else:
            glints.append(c)
    return pairs + [a + b for a, b in zip(glints, flats)]


CRESTS = crest_pairs()


def grow(mask):
    """Grow a mask by one pixel in all eight directions."""
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    out[1:, 1:] |= mask[:-1, :-1]
    out[1:, :-1] |= mask[:-1, 1:]
    out[:-1, 1:] |= mask[1:, :-1]
    out[:-1, :-1] |= mask[1:, 1:]
    return out


def calm_water(rows, frame):
    """terrain_water_<frame> with every crest within two pixels of the coast dropped whole."""
    calm = grow(grow(np.array([[ch != '.' for ch in r] for r in rows])))
    water = [list(r) for r in nature.WATER[frame]]
    for pair in CRESTS:
        if any(calm[y, x] for x, y in pair):
            for x, y in pair:
                water[y][x] = 'a'
    return water


def land_texture(rows, texture, base):
    """The plain tile's texture with every tuft or fleck the coast would cut dropped whole."""
    tex = [list(r) for r in texture]
    near = grow(np.array([[ch != '#' for ch in r] for r in rows]))
    for fleck in groups([(x, y) for y, r in enumerate(texture) for x, c in enumerate(r) if c != base]):
        if any(near[y, x] for x, y in fleck):
            for x, y in fleck:
                tex[y][x] = base
    return tex


def water_tile(rows, frame, texture=None, base=None):
    """One frame of a tile that shows water: the water frame where '.', the land texture where
    '#', the drawn pixels elsewhere. Water and land stay pixel for pixel the plain tiles' own."""
    if len(rows) != TILE or any(len(r) != TILE for r in rows):
        raise ValueError(f'water tile is not {TILE}x{TILE}')
    water = calm_water(rows, frame)
    tex = land_texture(rows, texture, base) if texture else None
    im = Image.new('RGBA', (TILE, TILE))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '#':
                rgb = P[tex[y][x]]
            elif ch == '.':
                rgb = P[water[y][x]]
            elif ch in TWO_FRAME:
                name = TWO_FRAME[ch][frame]
                rgb = P[water[y][x]] if name is None else PALETTE[name]
            else:
                rgb = P[ch]
            px[x, y] = (*rgb, 255)
    return im


def add_shores(sheet, kind, grids, textures, base):
    for i, shape in enumerate(SHAPES):
        for frame in (0, 1):
            im = water_tile(grids[shape], frame, textures[i % len(textures)], base)
            sheet.add(f'shore_{kind}_{shape}_{frame}', im, corners=CORNERS[shape])


# --------------------------------------------------------------------------- cliffs
# A cliff is three rows of tiles: cliff_top, the raised grass with its rim; a row of faces
# (wavy rock ribs lit on the left, with fractures), ended by the two corners; and a row of
# cliff_foot or cliff_foot-water under the faces and corners. The corners are taper ends: the
# rim rolls down over a shoulder of rock that dies into the ground, so the raised ground needs
# no side edges. Faces also stack for taller cliffs, though the corners fit a one-row face.
# The faces share their edge columns, so any face sits beside any other or a corner.

CLIFF_TOP = [
    'gggggggggggggggg',
    'gggggggggggggggg',
    'ggggggggggGgkggg',
    'gggggggggggkgggg',
    'gggggggggggggggg',
    'gggGgkgkgggggggg',
    'ggggkgkggggggggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
    'gggggggggggggGgg',
    'gggggggggggggggg',
    'ggGggggGgggGgggg',
    'gGgGgGGgGgGgGggG',
    'gkgggkggkgggkgkg',
    'kkgkkkkkkkgkkkkk',
    'kxkkxkxkkxkkxkkx',
]

CLIFF_FACES = [
    [
        'HHhhhhxxHHhhhhxx',
        'HHhhhhxxHHhhhhxx',
        'HHhhhhxxHHhhhhxx',
        'HHhhhhhxxHHhhhxx',
        'HHhhhhhxxHxxxxxx',
        'HHhhhhhxxHHHHHxx',
        'HHhhhhhxxHHhhhxx',
        'xHHhhhhxxHHhhhhx',
        'xHHhhhhxxHHhhhhx',
        'xxxxxxhxxHHhhhhx',
        'xHHHHHxxHHhhhhhx',
        'xHHhhhxxHHhhhhhx',
        'xHHhhhxxHHhhhhhx',
        'HHhhhhxxHHhhhhxx',
        'HHhhhhxxHHhhhhxx',
        'HHhhhhxxHHhhhhxx',
    ],
    [
        'HHhhxxHHHhhhhhxx',
        'HHhhxxHHHhhhhhxx',
        'HHhxxHHxxxxxxhxx',
        'HHhxxHHHHHHHHhxx',
        'HHhxxHHHhhhhhhxx',
        'HHhxxHHhhhxxHhxx',
        'HHhxxHHhhhxxHhxx',
        'xHHhxxHHhhxxHHhx',
        'xHHhxxHHhhxxHHhx',
        'xHHhxxHHhhxxHHhx',
        'xHHhxxHHhhhxxHhx',
        'xHHhxxHHhhhxxHhx',
        'xxxxxxHHhhhxxHhx',
        'HHHHxxHHHhhhhhxx',
        'HHhhxxHHHhhhhhxx',
        'HHhhxxHHHhhhhhxx',
    ],
]

# the left end catches the light; the right end is in shade
CLIFF_CORNER_LEFT = [
    'ggggggggGGGkkkkk',
    'ggggggggGkkHHHHH',
    'ggggggGGkHHhhhxx',
    'ggggggGkHHHhhhxx',
    'gggggGkHxHxxxxxx',
    'ggggGkHxxHHHHHxx',
    'ggggGHHxxHHhhhxx',
    'ggggkHHxxHHhhhhx',
    'gggGHHhxxHHhhhhx',
    'ggGkHxhxxHHhhhhx',
    'ggGHHHxxHHhhhhhx',
    'ggkHHhxxHHhhhhhx',
    'gGHHhhxxHHhhhhhx',
    'GkHHhhxxHHhhhhxx',
    'GHHhhhxxHHhhhhxx',
    'kHHhhhxxHHhhhhxx',
]

CLIFF_CORNER_RIGHT = [
    'kkkkkggkgggggggg',
    'xxxxxkkggggggggg',
    'HHhxxxxkgkgggggg',
    'HHhxxHHxkggggggg',
    'HHhxxHHHxkgggggg',
    'HHhxxHHhhxkkgggg',
    'HHhxxHHhhhxggggg',
    'xHHhxxHHhhxkgggg',
    'xHHhxxHHhhxxgggg',
    'xHHhxxHHhhxxkkgg',
    'xHHhxxHHhhhxxggg',
    'xHHhxxHHhhhxxkgg',
    'xxxxxxHHhhhxxxgg',
    'HHHHxxHHHhhhhxkk',
    'HHhhxxHHHhhhhhxg',
    'HHhhxxHHHhhhhhxk',
]

CLIFF_FOOT = [
    'kxkkkxkkkkkxkkkk',
    'kHxkkkkkkHxkkkkk',
    'kkkkgkkkkkkkgkkk',
    'gkgkggkgkgkggkgk',
    'gggggggggggggggg',
    'gggggggggGgkgggg',
    'ggggggggggkgkggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
    'ggGgkggggggggggg',
    'gggkgggggggggggg',
    'gggggggggggggggg',
    'gggggggggggGgkgg',
    'ggggggggggggkggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
]

# Wet boulders at the foot of a sea cliff with surf in the gaps; '.' is the water frame. Rock
# reaches row 7 at both edges, where a beach's coast crosses, so a beach can carry the coast on.
CLIFF_FOOT_WATER = [
    'xxhxxxxhxxxxhxxx',
    'HHhxxHHHhxxHHHhx',
    'Hhhhxhhhhhxhhhhh',
    'hhhhxhhhhhxhhhhh',
    'hhhxxxhhhxxxhhhh',
    'hhx0WWxxx1WWxhhh',
    'hhxW1.1W0W..1xhh',
    'xxW...0..1...Wxx',
    '1W0..........1W0',
    '..1............W',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]


def add_cliffs(sheet):
    sheet.add('cliff_top', tile(CLIFF_TOP))
    for i, rows in enumerate(CLIFF_FACES):
        sheet.add(f'cliff_face_{i}', tile(rows))
    sheet.add('cliff_corner-left', tile(CLIFF_CORNER_LEFT))
    sheet.add('cliff_corner-right', tile(CLIFF_CORNER_RIGHT))
    sheet.add('cliff_foot', tile(CLIFF_FOOT))
    for frame in (0, 1):
        sheet.add(f'cliff_foot-water_{frame}', water_tile(CLIFF_FOOT_WATER, frame))


# --------------------------------------------------------------------------- meadows
# Grass with drifts of wildflowers: white daisies with gold eyes, buttercups, pink clover and
# lilac bells, each over a dark stem pixel so it reads at 1x. Every flower stays inside its
# tile, so the meadows mix with one another and with terrain_grass_* in any order.

MEADOWS = [
    [
        'gggggggggggggggg',
        'ggWggggggggggggg',
        'gWYWgWgggggggggg',
        'ggWkWYWggggggGgg',
        'gggggWkggggggkgg',
        'gggggggggggggggg',
        'gGgggggggggYgggg',
        'ggkGgkggggYkgYgg',
        'gggkggggggkggkgg',
        'ggggggggggggYggg',
        'gggggggbggggkggg',
        'ggPgggbBkbgggggg',
        'gPpPPgkggBkggggg',
        'gkPpkggggkgggggg',
        'gggkgggggggggggg',
        'gggggggggggggggg',
    ],
    [
        'gggggggggggggggg',
        'ggggggggggggbggg',
        'ggggggggggbBkbgg',
        'ggYgggggggkgBkgg',
        'gYkgYggggggggkgg',
        'ggggkggggggggggg',
        'gggggggGgggggggg',
        'ggggggkGkggPgPgg',
        'ggggggggkggPpPPg',
        'ggggggggggkPpkgg',
        'ggggggggggggkggg',
        'ggggWggggggggggg',
        'gggWYWgWgggggggg',
        'ggggWkWYWggggggg',
        'gggggggWkggggggg',
        'gggggggggggggggg',
    ],
    [
        'gggggggggggggggg',
        'gggggggggggggggg',
        'ggggggggggggWggg',
        'ggbgggggggggkggg',
        'gbBkggGggggggggg',
        'gBkbggkGkggggggg',
        'ggkBkggggggggggg',
        'gggkgggggggggggg',
        'ggggggggggYggggg',
        'gggWgggggYkYgggg',
        'ggWYWggggkgkYggg',
        'gggWkggggggggkgg',
        'gggggggggggggggg',
        'gggggggPgggggGgg',
        'ggggggPpPggggkGg',
        'gggggggkgggggggg',
    ],
]


# --------------------------------------------------------------------------- props
# The railing and its posts are full-tile parts outlined separately, like nature.py's fences,
# so railings laid side by side join without a seam. The viewer is drawn in profile: seen
# face-on, its two lenses would read as eyes.

RAIL_BARS = [
    '................',
    '................',
    '................',
    '................',
    '................',
    'CCCCCCCCCCCCCCCC',
    'cccccccccccccccc',
    '................',
    '................',
    '................',
    '................',
    'cccccccccccccccc',
    '................',
    '................',
    '................',
    '................',
]

RAIL_POSTS = [
    '................',
    '................',
    '................',
    '...CC.......CC..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '...Cc.......Cc..',
    '..hHhx.....hHhx.',
    '................',
]

VIEWER = [
    '...GGGGGGGGg....',
    '.xxGGggggggkxxx.',
    'xHxGgggggggkxnnA',
    'xhxGgggggggkxnnn',
    '.xxgkkkkkkkkxxx.',
    '......xhHx......',
    '.......Hx.......',
    '......HHhxx.....',
    '......Hxxhx.....',
    '......HHhhx.....',
    '.......Hx.......',
    '.......Hx.......',
    '.......Hx.......',
    '.......Hx.......',
    '.......Hx.......',
    '......HHxx......',
    '.....HHhhxx.....',
]

PICNIC_TABLE = [
    '...LLLLLLLLLLLLLLLL...',
    '...wwwwwwwwwwwwwwww...',
    '....d............d....',
    'LLLLLLLLLLLLLLLLLLLLLL',
    'dddddddddddddddddddddd',
    'LLLLLLLLLLLLLLLLLLLLLL',
    'dddddddddddddddddddddd',
    'LLLLLLLLLLLLLLLLLLLLLL',
    'wwwwwwwwwwwwwwwwwwwwww',
    '...wd............dw...',
    '.LLLLLLLLLLLLLLLLLLLL.',
    '.wwwwwwwwwwwwwwwwwwww.',
    '.dw.wd..........dw.wd.',
    'dw...wd........dw...wd',
]

STONE_STEPS = [
    'HHHHHHHHHHHh',
    'HHHhHHHHHHHh',
    'xxxxxxxxxxxx',
    'hhhhhhxhhhhx',
    'CHHHHHHHHHHh',
    'HHHHHHHHhHHh',
    'xxxxxxxxxxxx',
    'hhhxhhhhhhhx',
    'CHHHHHHHHHHh',
    'HHHHhHHHHHHh',
    'xxxxxxxxxxxx',
    'hhhhhhhhxhhx',
    'CHHHHHHHHHHh',
    'HHHHHHHhHHHh',
    'xxxxxxxxxxxx',
    'hhhhhxhhhhhx',
    'CHHHHHHHHHHh',
    'HHHhHHHHHHHh',
    'xxxxxxxxxxxx',
    'hhhhhhhhhhhx',
    'xxxxxxxxxxxx',
]

FOOTBRIDGE = [
    'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
    'Lw......Lw..........Lw......Lw',
    'Lw......Lw..........Lw......Lw',
    'LLwLLwLLwLLwLLwLLwLLwLLwLLwLLw',
    'LLwLLwLLwLLwLLwLLwLLwLLwLLwLLw',
    'LLwLLwLLwLLwLLwLLwLLwLLwLLwLLw',
    'LLwLLwLLwLLwLLwLLwLLwLLwLLwLLw',
    'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
    'LwwLLwLLLwLwLLwLLwLLwLLwLLwLLw',
    'LwLLwLLwLwwLLwLLwLLwLLwLLwLLLw',
    'dddddddddddddddddddddddddddddd',
    'HHhx......................HHhx',
    'Hhhx......................Hhhx',
]

STEPPING_STONES = [
    '..........HHHh.........',
    '..HHHh...HHhhhx...HHh..',
    '.HHhhhx..hhhhxx..HHhhx.',
    '.hhhhxx...xxxx...hhhxx.',
    '..xxxx............xxx..',
]

REEDS = [
    '...d.......',
    '..ww...d...',
    '..Lw..wd...',
    '..wd..Lw.G.',
    '...g..wd.G.',
    '.G.g...g.g.',
    '.G.gG..g.gk',
    '.g.gG.Gg.gk',
    'Gg.gg.Gg.gk',
    'Gk.gk.gk.k.',
    'gk.gkGgkGk.',
    'gkGgkGgkgk.',
    'kgggkgkgkk.',
    '.kkkkkkkk..',
]

LILY_PADS = [
    [
        '..GGGG.........',
        '.GGggg.k...GGg.',
        'GGgggkkk..GGggk',
        '.gggkkk...gggkk',
        '..kkk.....WPkk.',
        '.......GGGPYP..',
        '......GGgggPk..',
        '......ggg.kkk..',
        '.......kk.kk...',
    ],
    [
        '...GGGG........',
        '..GGggg.k..GGg.',
        '.GGgggkkk.GGggk',
        '..gggkkk..gggkk',
        '...kkk....WPkk.',
        '......GGGPYP...',
        '.....GGgggPk...',
        '.....ggg.kkk...',
        '......kk.kk....',
    ],
]

BEACH_ROCKS = [
    '.....HHHh.........',
    '...HHHHhhh........',
    '..HHhhhhhhx...HHh.',
    '..Hhhhhhhxx..HHhhx',
    '.HHhhhhhxxx.HHhhxx',
    '.Hhhhhhxxxx.hhhxxx',
    'HHhhhhxxxtt.hhxxxt',
    'hhhhhxxxtt.HHhxtt.',
    'xhhxxxxtt.HHhhxxt.',
    '.xxxttt...hhhxxtt.',
    '..........xxxtt...',
]


def railing():
    out = add_outline(grid(RAIL_BARS, (TILE, TILE)))
    out.alpha_composite(add_outline(grid(RAIL_POSTS, (TILE, TILE))))
    return out


def steps():
    """Steps cut into a one-row cliff face, from its foot to the rim. The outline's top row is
    left off, so the top tread runs straight onto the grass above instead of ending in a line."""
    im = outlined(STONE_STEPS)
    a = np.array(im)
    a[0, :, 3] = 0
    return Image.fromarray(a)


def add_props(sheet):
    sheet.add('prop_viewpoint-rail', railing())
    sheet.add('prop_viewer', outlined(VIEWER))
    sheet.add('prop_picnic-table', outlined(PICNIC_TABLE))
    sheet.add('prop_reeds', outlined(REEDS))
    sheet.add('prop_beach-rocks', outlined(BEACH_ROCKS))
    # people walk over these, so they are drawn with the ground, under people, not y-sorted
    sheet.add('prop_stone-steps', steps(), layer='ground')
    sheet.add('prop_footbridge', outlined(FOOTBRIDGE), layer='ground')
    sheet.add('prop_stepping-stones', outlined(STEPPING_STONES), layer='ground')
    for i, rows in enumerate(LILY_PADS):
        sheet.add(f'prop_lily-pads_{i}', outlined(rows), layer='ground')


# --------------------------------------------------------------------------- bridges
# Stone bridges carry main and country roads over rivers (owner, 10 October 2026); lanes keep the
# footbridge. A piece is one tile of the road, its deck in the road's own surface between low
# parapets, so a bridge is laid like the road it carries. Across a river running down the map the
# deck runs across, and the south face shows an arch over every water tile; across a river running
# across the map the deck runs down, seen from above, with a cutwater on both sides of every pier.
# The end pieces stand on the two shore tiles, where pillars end the parapets. Every piece anchors
# at the bottom centre of its footprint and draws with the ground, under people.

ROADS = {'main': 3, 'country': 2}       # tiles across the deck
VAULT = {3: (6, 9), 4: (4, 11)}         # an arch's opening, by rows under the crown: its first columns
OPEN = (3, 12)                          # ...and below them, down to the river
CUTWATER = [                            # a pier's cutwater pointing west, seen from above
    '..KKK',
    '.KKkk',
    'KKkkk',
    'Kkkkk',
    'kkkkk',
    'xkkkx',
    '.xxxx',
    '..xxx',
]
CUTWATER_EAST = ['KKK..', 'kkkK.', 'kkkkK', 'kkkkk', 'kkkkx', 'kkkxx', 'xxxx.', 'xxx..']


def deck_surface(road, i):
    return nature.CUT_STONE if road == 'main' else nature.GRAVEL[i % 2]


def arch(c, top, bottom):
    """A span's face under the deck: coursed stone round one arch, its vault in shadow and the river
    showing below; piers stand on the tile edges, so arches side by side share them."""
    c.tile(0, top, TILE - 1, bottom, COURSE, stagger=4)
    crown = top + 2
    for y in range(crown, bottom + 1):
        x0, x1 = VAULT.get(y - crown + 3, OPEN)
        c.put(x0 - 1, y, 'K')
        c.put(x1 + 1, y, 'x')
        c.hline(x0, x1, y, 'n' if y < crown + 5 else '_')
    c.hline(VAULT[3][0] - 1, VAULT[3][1] + 1, crown - 1, 'K')
    c.hline(VAULT[4][0] - 1, VAULT[3][0] - 1, crown, 'K')
    c.hline(VAULT[3][1] + 1, VAULT[4][1] + 1, crown, 'x')


def capped(c, x0, x1, y):
    """A parapet's cap, seen from above: two rows of stone, or snow."""
    lit, plain, shade = tops()
    c.hline(x0, x1, y, lit)
    c.hline(x0, x1, y + 1, shade if snowing() else plain)


def pillar(c, x, top, base):
    """A 4-px pillar ending a parapet: its cap, then its face down to its base."""
    capped(c, x, x + 3, top)
    c.rect(x, top + 2, x + 3, base, 'k')
    c.vline(x, top + 2, base, 'K')
    c.vline(x + 3, top + 2, base, 'x')
    c.hline(x, x + 3, base, 'x')


class BridgePiece(ABC):
    """One tile of a bridge along its road. Subclasses draw the stonework round a deck they mark
    with stone, so the outline rings the whole; image() then lays the road's surface on the deck."""

    def __init__(self, road, axis, part, size, deck, anchor, footprint, joins):
        self.road, self.part = road, part
        self.name = f'bridge_{road}_{axis}_{part}'
        self.size, self.deck, self.anchor = size, deck, anchor
        self.footprint, self.joins = footprint, joins

    @abstractmethod
    def stone(self, c):
        """Draw the parapets, faces and piers; the deck box is already filled."""

    def tiles(self):
        x0, y0, x1, y1 = self.deck
        return [(x, y) for y in range(y0, y1, TILE) for x in range(x0, x1, TILE)]

    def image(self):
        c = Canvas(*self.size)
        x0, y0, x1, y1 = self.deck
        c.rect(x0, y0, x1 - 1, y1 - 1, 'k')
        self.stone(c)
        im = c.image()
        for i, (x, y) in enumerate(self.tiles()):
            im.paste(nature.tile(deck_surface(self.road, x // TILE + y // TILE)), (x, y))
            if snowing():
                im.alpha_composite(snow_tile('light', i), (x, y))
        return im

    def add_to(self, sheet):
        add_with_snow(sheet, self.name, self.image(), self.image, anchor=self.anchor,
                      footprint=self.footprint, joins=self.joins, layer='ground')


class AcrossBridge(BridgePiece):
    """A piece of a deck running across the map: the north parapet's inner face over the deck, the
    south parapet's outer face under it, then a string course and the face of the bridge, which
    over the banks slopes down into the ground."""

    RISE, DROP = 8, 18

    def __init__(self, road, part):
        lanes = ROADS[road]
        top, bottom = self.RISE, self.RISE + lanes * TILE
        joins = {'span': 'lr', 'end-left': 'r', 'end-right': 'l'}[part]
        super().__init__(road, 'horizontal', part, (TILE, bottom + self.DROP), (0, top, TILE, bottom),
                         (TILE // 2, bottom - 1), [1, lanes], joins)

    def stone(self, c):
        top, b = self.RISE, self.deck[3] - 1
        x0, x1 = {'span': (0, TILE - 1), 'end-left': (1, TILE - 1), 'end-right': (0, TILE - 2)}[self.part]
        capped(c, x0, x1, top - 7)                                       # north parapet
        c.tile(x0, top - 5, x1, top - 1, COURSE, stagger=4, oy=3)
        capped(c, x0, x1, b - 2)                                         # south parapet
        c.tile(x0, b, x1, b + 3, COURSE, stagger=4)
        if self.part == 'span':
            c.hline(0, TILE - 1, b + 4, 'K')                             # string course
            c.hline(0, TILE - 1, b + 5, 'x')
            arch(c, b + 6, b + self.DROP - 1)
            return
        left = self.part == 'end-left'
        for x in range(3, TILE) if left else range(0, TILE - 3):         # the abutment's wing wall
            depth = min(self.DROP - 1, 2 + (x if left else TILE - 1 - x))
            c.put(x, b + 4, 'K')
            c.put(x, b + 5, 'x')
            c.tile(x, b + 6, x, b + depth, COURSE, stagger=4, ox=x)
        px = 1 if left else TILE - 5
        pillar(c, px, top - 9, top - 1)                                  # 2 px over the parapets
        pillar(c, px, b - 4, b + 3)


class DownBridge(BridgePiece):
    """A piece of a deck running down the map, seen from above: a parapet each side and, on a span,
    a pier's cutwater pointing up and down the river from both of them."""

    SIDE = 10                                   # parapet and cutwater beside the deck, with the outline

    def __init__(self, road, part):
        lanes = ROADS[road]
        w = lanes * TILE + 2 * self.SIDE
        joins = {'span': 'u', 'end-top': '', 'end-bottom': 'u'}[part]
        super().__init__(road, 'vertical', part, (w, TILE), (self.SIDE, 0, w - self.SIDE, TILE),
                         (w // 2, TILE - 1), [lanes, 1], joins)

    def stone(self, c):
        west, east = self.deck[0] - 4, self.deck[2]
        y0, y1 = {'span': (0, TILE - 1), 'end-top': (7, TILE - 1), 'end-bottom': (0, 8)}[self.part]
        lit, plain, shade = tops()
        for x, ramp in ((west, (lit, lit, plain, 'x')), (east, (lit, plain, plain, 'x'))):
            for dx, ch in enumerate(ramp):
                c.vline(x + dx, y0, y1, ch)
            for y in (3, 11):
                if y0 <= y <= y1:
                    c.hline(x, x + 3, y, 'x')
        if self.part == 'span':
            c.stamp(west - 5, 4, CUTWATER)
            c.stamp(east + 4, 4, CUTWATER_EAST)
            return
        py = 1 if self.part == 'end-top' else 9
        for x in (west, east):
            pillar(c, x, py, py + 5)


BRIDGES = [cls(road, part) for road in ROADS
           for cls, parts in ((AcrossBridge, ('end-left', 'span', 'end-right')),
                              (DownBridge, ('end-top', 'span', 'end-bottom')))
           for part in parts]


def add_bridges(sheet):
    for piece in BRIDGES:
        piece.add_to(sheet)


# --------------------------------------------------------------------------- trees
# Crowns follow nature.py's trees: clumps lit on top, a dark rim where each tucks over the one
# below, a deep underside. The blossom is a generic white-and-pink flowering tree; the autumn
# tree is gold and ochre with a few terracotta leaves; the palm leans, so it anchors at its foot.

TREE_BLOSSOM = [
    '...........WWW..WWW...........',
    '.........WWWWWWWWWWPP.........',
    '........WWPWWWWWWPWPPP........',
    '.......WWWWPPPPPPPPPPPp.......',
    '.......WWPPPPPPPPPPPPWp.......',
    '......pWPPPPPPPPPPPPPPpp......',
    '....WWWPPPPWPPPPPPPPPPpWWW....',
    '..WWWWWpPPPPPPPPPPPPPPpWWWWP..',
    '.WWPWWWWpPPPPPPPPPWPPpWWWWWPP.',
    '.WWPPPPWWppPPPWPPPPppWPPPPPPPp',
    'WWPPPPPWWPUppppppppUWWWPPPPWP.',
    'UPPPPPPPWPPpWWWWWWpWWWPPPPPPPU',
    '.UPPWPPPPPpWWWWWWWWpPPPPPPPPU.',
    '..UPPPUPPpWWWWWWWWWWpPPPPWPU..',
    '...UUUpppWWWPPPPPPWWPpppUUU...',
    '......UWWWWPPPPPPPPWPPWU......',
    '.......UUWPPPPPPPWPPPUU.......',
    '.........UUUUUUUUUUUU.........',
    '...........d......d...........',
    '...........Lw....Lw...........',
    '............Lw..Lw............',
    '.............LwLw.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwwd............',
    '............dLwwwdd...........',
    '...........LLwwwwwdd..........',
    '..........LLw.ww..ddd.........',
]

TREE_AUTUMN = [
    '............YY.YYY............',
    '..........YYYYYYYYss..........',
    '.........YYYSYYYYYssL.........',
    '.........YYYssssSsssL.........',
    '.........YssssssssssL.........',
    '.........sssssssssrsL.........',
    '.......YYsssssssssssLYY.......',
    '.....YYYYLssssYsssssLYYss.....',
    '.....YYSYYLLssssssLLYYYss.....',
    '....YYYssYYYLLLLLLYYYssssL....',
    '....YssssYYYsrLYYYYYYssssL....',
    '....wsssYsYYssLLYYYYsssrsw....',
    '.....sssssssssYYYYsssYsss.....',
    '.....wwssssSLLYYLLsssssww.....',
    '.......LLLLLYYYYYYLLLLL.......',
    '.......YYYYYYYssYYYsssL.......',
    '.......wYYrYYYssYYYsssw.......',
    '........wwYYssssssYsww........',
    '..........wwwwwwwwww..........',
    '.............Lwd..............',
    '.............Lwd..............',
    '.............Lwd..............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '.............Lwwd.............',
    '............dLwwdd............',
    '...........LLwwwwdd...........',
    '..........LLw.ww.ddd..........',
]

TREE_PALM = [
    '..............g...............',
    '......gggg....g.......gggg....',
    '....gggkkkgg..gg....ggkkkggg..',
    '...ggkk.kkkkg.kk...gkkk.kkk.g.',
    '..ggk.k.k.kkkg.k..gkk.k.k.k.gg',
    '..g...k...kkkkgk.gkkk.k...k.kg',
    '..k....GGGG.kkkkgkkkkGGGG.....',
    '.....GGGgggGGkkkkkGGGgggGGG...',
    '....GgggkggggGGkkGggggg.ggGG..',
    '...Gg.k.k.ggggwdwdGgg.k.k.gGG.',
    '..Ggk.k...k.GGgwdgGGk.k.k.kgG.',
    '..G.k.....kGGggswgggG.....k.G.',
    '.GG.......GGggLdd.ggGG......GG',
    '.Gk.......Ggg.Lsw...gGG.....kG',
    '.........Gg.k.Lsw...kgG.......',
    '........GGk.k.Ldd...k.GG......',
    '........G.k...Lsw.....kG......',
    '........k.....Lsw.....k.......',
    '..............Ldd.............',
    '..............Lsw.............',
    '.............Lsw..............',
    '.............Ldd..............',
    '.............Lsw..............',
    '.............Lsw..............',
    '.............Ldd..............',
    '............Lsw...............',
    '............Lsw...............',
    '............Ldd...............',
    '...........Lsw................',
    '..........LLswd...............',
]

PALM_FOOT = 12   # trunk centre on the bottom row of TREE_PALM


def add_trees(sheet):
    sheet.add('tree_blossom', outlined(TREE_BLOSSOM))
    sheet.add('tree_autumn', outlined(TREE_AUTUMN))
    palm = outlined(TREE_PALM)
    sheet.add('tree_palm', palm, anchor=(PALM_FOOT + 1, palm.height - 1))


# --------------------------------------------------------------------------- assembly

def build():
    sheet = Sheet('scenery')
    add_shores(sheet, 'grass', SHORE_GRASS, nature.GRASS, 'g')
    add_shores(sheet, 'sand', SHORE_SAND, [nature.SAND], 'S')
    add_cliffs(sheet)
    for i, rows in enumerate(MEADOWS):
        sheet.add(f'terrain_meadow_{i}', tile(rows))
    add_props(sheet)
    add_bridges(sheet)
    add_trees(sheet)
    return sheet


if __name__ == '__main__':
    build().save()
