"""Map sprites for Nomos's zoomed-out views: the Country view (8x8 terrain) and the Region view
(16x16 terrain), where people give way to settlements, plus place pins for the District view.

GBA-era top-down pixel art with light from the top left, drawn fresh as ASCII grids in the
shared 32-colour palette.

- Settlement icons grow with size only: one house, a few houses, a cluster, a dense cluster
  with a tower, a walled cluster with a keep. Every icon uses the same houses and roofs, so
  no icon can read as richer, poorer or more criminal than another. Each has a gold ring
  overlay for the place being watched.
- Terrain tiles keep every detail inside the tile, so each tiles with itself and sits beside
  any other tile without transitions. Peaks are overlays that rise into the tile above.
- A caravan cart and a sailing boat carry trade, facing left and right.
- Place pins mark spots, never people. The true-crime and recorded-crime pins differ in shape
  (a round drop against a filed card on a post) as well as colour.

Build: python tools/sprites/map.py
"""
import numpy as np
from PIL import Image

from spritekit import PALETTE, Sheet, add_outline, cmap, from_ascii, mirror, pad

# One symbol per palette colour; where colours pair up, uppercase is the lighter one.
# The BODY_* colours stay out so the blob body is unique, VERMILLION is kept for the
# true-crime pin and NAVY for the recorded-crime pin, so no settlement or terrain uses them.
# ICE_L and ICE shade the snow tiles, as they shade the ground snow in seasons.py.
P = cmap(
    O='OUTLINE', W='WHITE', C='CREAM', c='CREAM_D', S='SAND', s='SAND_D',
    L='WOOD_L', w='WOOD', d='WOOD_D', G='GRASS_L', g='GRASS', k='LEAF_D',
    T='TEAL', t='TEAL_D', A='WATER_L', a='WATER', N='NAVY', n='NAVY_D',
    H='STONE_L', h='STONE', x='STONE_D', R='ROOF', r='ROOF_D', V='VERMILLION',
    Y='GOLD', P='PINK', p='PINK_D', U='PLUM', I='ICE_L', i='ICE',
)


def grid(rows, size=None):
    """Render one hand-drawn grid; rows must all be the same width."""
    width = len(rows[0])
    ragged = [i for i, r in enumerate(rows) if len(r) != width]
    if ragged:
        raise ValueError(f'ragged rows {ragged} (expected width {width})')
    if size and (width, len(rows)) != size:
        raise ValueError(f'grid is {width}x{len(rows)}, expected {size[0]}x{size[1]}')
    return from_ascii(rows, P)


def outlined(rows):
    return add_outline(pad(grid(rows)))


def stack(size, parts, base=None):
    """Composite (image, (x, y)) parts in order onto a blank canvas or a copy of base.
    Every part must fit inside: map tiles never spill into their neighbours."""
    out = base.copy() if base else Image.new('RGBA', size, (0, 0, 0, 0))
    for im, (x, y) in parts:
        if x < 0 or y < 0 or x + im.width > out.width or y + im.height > out.height:
            raise ValueError(f'part at ({x},{y}) size {im.size} spills out of {out.size}')
        out.alpha_composite(im, (x, y))
    return out


# =========================================================================== terrain, 16x16

GRASS16 = [
    [
        'gggggggggggggggg',
        'gggGgggggggggggg',
        'ggggkggggggggkgg',
        'gggggggggggggggg',
        'gggggggggGgggggg',
        'gkgggggggggkgggg',
        'gggggggggggggggg',
        'ggggggGggggggggg',
        'gggggggkgggggGgg',
        'gggggggggggggggk',
        'ggGggggggggggggg',
        'gggkgggggggkgggg',
        'gggggggggggggggg',
        'gggggggGgggggggg',
        'ggggggggkggggkgg',
        'gggggggggggggggg',
    ],
    [
        'gggggggggggggggg',
        'ggggggggggkggggg',
        'gGgggggggggggggg',
        'ggkggggggggggGgg',
        'ggggggggggggggkg',
        'gggggGgggggggggg',
        'ggggggkggggggggg',
        'gggggggggggkgggg',
        'gggggggggggggggg',
        'gkggggggggGggggg',
        'gggggggggggkgggg',
        'ggggggGggggggggg',
        'gggggggkgggggggg',
        'gggggggggggggGgg',
        'ggGggggggggggggk',
        'gggkgggggggggggg',
    ],
]

# Four fields in a running bond between hedgerows: tilled soil, ripe grain, a green crop in
# rows and a sprouting field. The grain field wraps round the tile edge, so the bond hides
# the grid.
FARM16 = [
    'kkkkkkkkkkkkkkkk',
    'SSSSkLLLLLLkSSSS',
    'sssskwwwwwwkssss',
    'SSSSkLLLLLLkSSSS',
    'SSSSkwwwwwwkSSSS',
    'sssskLLLLLLkssss',
    'SSSSkwwwwwwkSSSS',
    'SSSSkLLLLLLkSSSS',
    'kkkkkkkkkkkkkkkk',
    'kgGggGggkwwwwwww',
    'kgGggGggkggggggg',
    'kgGggGggkwwwwwww',
    'kgGggGggkggggggg',
    'kgGggGggkwwwwwww',
    'kgGggGggkggggggg',
    'kgGggGggkwwwwwww',
]

SAND16 = [
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSS',
    'SSSCCSSSSSSSSSSS',
    'SSSSssSSSSSSSSSS',
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSCCSSS',
    'SSSSSSSSSSSSssSS',
    'SSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSS',
    'SCCSSSSSSSSSSSSS',
    'SSssSSSSSCSSSSSS',
    'SSSSSSSSSSsSSSSS',
    'SSSSSSSSSSSSSSSS',
    'SSSSSSCCSSSSSSSS',
    'SSSSSSSssSSSSSSS',
    'SSSSSSSSSSSSSSSS',
]

# Snow on cold lowland: white with low drifts, each an ice-blue curve that is paler on its lit
# left and deeper on its shaded right.
SNOW16 = [
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWIIWWWW',
    'WWWIIIWWWWWWiWWW',
    'WWIWWWIWWWWWWWWW',
    'WIWWWWWiWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWIIWWWWWWWWWWW',
    'WWWWWiWWWWIIIWWW',
    'WWWWWWWWWIWWWIWW',
    'WWWWWWWWIWWWWWiW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
]

# Two frames: each wave crest flattens into a line below it, with the same number of lit pixels.
WATER16 = [
    [
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaAaaaa',
        'aaaaaaaaaaAaAaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaAaaaaaaaaaaaa',
        'aaAaAaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
    ],
    [
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaAAAaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaAAAaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaa',
    ],
]

# Marsh in the map-symbol manner: open-water slivers under a shadowed bank, with reed tufts.
MARSH16 = [
    'gggggggggggggggg',
    'gGgGgggggggggggg',
    'gkGkggggggtttggg',
    'ggkggggggaaAaagg',
    'ggggggggggTTTggg',
    'gggggggggggggggg',
    'gggggggggggGgGgg',
    'ggTTgggggggkGkgg',
    'gggttttgggggkggg',
    'ggaAaaaagggggggg',
    'gggTTTTggggggggg',
    'gggggggggggtttgg',
    'gggggGgGggaaaAag',
    'gggggkGkgggTTTgg',
    'TTggggkggggggggg',
    'gggggggggggggggg',
]

# Rolling hills: grass domes lit on their top-left shoulder and shaded down the right. Their
# contour is dark green, not OUTLINE, so they read as ground rather than as bushes or trees.
HILL_BIG = [
    '....GGGgg....',
    '..GGGGgggg...',
    '.GGGgggggggk.',
    'GGgggggggggkk',
    'gggggggggkkkt',
]
HILL_SMALL = [
    '..GGgg..',
    '.GGggggk',
    'ggggggkt',
]
HILL_TINY = [
    '.GGg.',
    'GGggk',
    'Gggkk',
    'ggkkt',
]
# Staggered so a field of hills tiles on the diagonal instead of in rows; the front hill
# reaches past the big one so they overlap side by side.
HILLS16_SPOTS = [(HILL_BIG, (0, 1)), (HILL_SMALL, (6, 7)), (HILL_SMALL, (0, 11))]
HILLS8_SPOTS = [(HILL_TINY, (0, 1))]

# Highland under the peaks: a boulder and bare earth in the top corners, which stay in view
# beside a peak, and more of both lower down for a mountain tile left without one.
MOUNTAIN16 = [
    'gggggggggggggggg',
    'gHHhggggggggSsgg',
    'Hhhhxggggggssssg',
    'gxxxggggggggssgg',
    'gggggggggggggggg',
    'gggggggggggggGgg',
    'gGggggggggggggkg',
    'ggkggggggggggggg',
    'gggggggggggggggg',
    'gggggggggHHhgggg',
    'ggggggggHhhhxggg',
    'gggggggggxxxgggg',
    'gggSssgggggggggg',
    'ggsssssggggGgggg',
    'gggsssggggggkggg',
    'gggggggggggggggg',
]

# Peaks are clean triangles with their outline drawn in: a lit face on the left and a shaded
# face on the right meeting at a ridge, snow lit white and shaded pale blue, and a gully or
# two. The tall peak is 16x24 and rises 8 px into the tile above.
PEAK16 = [
    '................',
    '.......OO.......',
    '......OWAO......',
    '......OWAO......',
    '......OWAO......',
    '.....OWWAAO.....',
    '.....OWWAAO.....',
    '.....OWWAAO.....',
    '....OWWWAAAO....',
    '....OHWWAAhO....',
    '....OHHWAhhO....',
    '...OHHHWAhhxO...',
    '...OHHHHWhhxO...',
    '...OHHHhHhhxO...',
    '..OHHHhHHhhhxO..',
    '..OHHhHHHhhxxO..',
    '..OHhHHHHhhhxO..',
    '.OHHHHHHHHhhhxO.',
    '.OHHHHHHHHhhhxO.',
    '.OHHHhHHHHhhxxO.',
    'OHHHhHHHHHhhhxxO',
    'OHHhHHHHHHhhhxxO',
    'OhhhhhhhhhxxxxxO',
    'OOOOOOOOOOOOOOOO',
]

# A low peak, 16x16, for foothills and the edges of a range: broader, with a small snowcap.
PEAK16_LOW = [
    '................',
    '.......OO.......',
    '......OWAO......',
    '......OWAO......',
    '.....OHWAhO.....',
    '.....OHHhhO.....',
    '....OHHHhhhO....',
    '....OHHHhhxO....',
    '...OHHhHHhhxO...',
    '...OHHHhHhhxO...',
    '..OHHHHHHhhhxO..',
    '..OHhHHHHhhhxO..',
    '.OHHHhHHHHhhxxO.',
    '.OHHHHHHHHhhhxO.',
    'OhhhhhhhhhhxxxxO',
    'OOOOOOOOOOOOOOOO',
]

# Map trees, outlined one by one and packed over a shaded forest floor, so the gaps between
# crowns read as shadow and tiles join without a seam. Crowns are lit on the top left and
# shaded teal on the bottom right; conifers are darker and pointed.
TREE_ROUND = [
    '.GGg.',
    'GGggk',
    'Gggkk',
    'ggkkt',
    '.kkt.',
]
TREE_ROUND_SMALL = [
    'GGg',
    'Ggk',
    'gkt',
]
TREE_POINT = [
    '..g..',
    '.Ggk.',
    '.Ggk.',
    'Ggkkt',
    'gkkkt',
]
# Top-left corners of each outlined tree, drawn back to front.
FOREST16_ROUND = [(11, 0), (0, 0), (8, 1), (4, 4), (0, 8), (9, 8), (5, 9)]
FOREST16_POINT = [(1, 0), (9, 0), (5, 3), (0, 6), (9, 6), (4, 9), (9, 9)]
FOREST_FLOOR = 'LEAF_D'


# =========================================================================== terrain, 8x8

GRASS8 = [
    [
        'gggggggg',
        'ggggGggg',
        'gggggkgg',
        'gggggggg',
        'gkgggggg',
        'gggggggg',
        'ggggggkg',
        'gggGgggg',
    ],
    [
        'gggggggg',
        'gkgggggg',
        'gggggGgg',
        'gggggggg',
        'gggggggk',
        'ggGggggg',
        'gggkgggg',
        'gggggggg',
    ],
]

# Four small fields between grass verges, the lower pair offset in a running bond: tilled
# soil, ripe grain, a green crop in rows and a sprouting field that wraps round the edge.
FARM8 = [
    'gggggggg',
    'LLLgSSSg',
    'wwwgsssg',
    'LLLgSSSg',
    'gggggggg',
    'wgGgGgww',
    'ggGgGggg',
    'wgGgGgww',
]

SAND8 = [
    'SSSSSSSS',
    'SSSSSSSS',
    'SSCCSSSS',
    'SSSssSSS',
    'SSSSSSSS',
    'SSSSSCCS',
    'SSSSSSss',
    'SSSSSSSS',
]

SNOW8 = [
    'WWWWWWWW',
    'WWIIIWWW',
    'WIWWWiWW',
    'WWWWWWWW',
    'WWWWWWWW',
    'WWWWWIIW',
    'WWWWWWWW',
    'WWWWWWWW',
]

WATER8 = [
    [
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaAaa',
        'aaaaAaAa',
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaaaa',
    ],
    [
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaAAAa',
        'aaaaaaaa',
        'aaaaaaaa',
        'aaaaaaaa',
    ],
]

MARSH8 = [
    'gggggggg',
    'ggggttgg',
    'gggaAaag',
    'ggggTTgg',
    'gGgGgggg',
    'gkGkgggg',
    'ggkggTTg',
    'gggggggg',
]

MOUNTAIN8 = [
    'gggggggg',
    'gggggggg',
    'ggHhgggg',
    'gHhhxgSg',
    'ggxxgsss',
    'gggggggg',
    'gGgggggg',
    'ggkggggg',
]

# A small peak, 8x10 with its outline drawn in; it rises 2 px into the tile above.
PEAK8 = [
    '...OO...',
    '..OWAO..',
    '..OWAO..',
    '.OWWAAO.',
    '.OHWAhO.',
    '.OHHhhO.',
    'OHHHhhxO',
    'OHHhhhxO',
    'OhhhhxxO',
    'OOOOOOOO',
]

TREE8_ROUND = [
    'GGg',
    'Ggk',
    'gkt',
]
TREE8_POINT = [
    '.g.',
    'Ggk',
    'Ggk',
    'gkt',
]
FOREST8_ROUND = [(0, 0), (3, 1), (1, 3)]
FOREST8_POINT = [(0, 0), (3, 1), (1, 2)]


# =========================================================================== settlements
# Every settlement is stacked from the same few outlined parts, back to front, so outlines
# between buildings come out clean. Roofs are all terracotta: colour never ranks a place.

HOUSE_GABLE = [
    '....R....',
    '...RRr...',
    '..RRRrr..',
    '.RRRRrrr.',
    'RRRRRrrrr',
    '.CCCCCCc.',
    '.CCCdCCc.',
    '.CCCdCCc.',
]
HOUSE_WIDE = [
    '.RRRRRRRr.',
    'RRRRRRRRrr',
    'RRRRRRRrrr',
    'rrrrrrrrrr',
    '.CCCCCCCc.',
    '.CdCCCCCc.',
    '.CdCCCCCc.',
]
# A stone tower with a copper-green spire, the landmark of a city.
TOWER = [
    '..TT..',
    '..Tt..',
    '.TTtt.',
    '.TTtt.',
    'TTTttt',
    'tttttt',
    'HHHhhx',
    'HHdhhx',
    'HHHhhx',
    'HHHhhx',
    'HHdhhx',
    'HHHhhx',
    'HHHhhx',
    'HHdhhx',
    'HHHhhx',
    'HHHhhx',
]
# The keep: a broad crenellated tower with a small spire, the landmark of the capital.
KEEP = [
    '....TT....',
    '....Tt....',
    '...TTtt...',
    '...TTtt...',
    'H.HH.Hh.hx',
    'HHHHHhhhhx',
    'HHHHHhhhhx',
    'HHdHHhhdhx',
    'HHHHHhhhhx',
    'HHHHHhhhhx',
    'HHdHHhhdhx',
    'HHHHHhhhhx',
    'HHHHHhhhhx',
    'HHHHddhhhx',
    'HHHHddhhhx',
]
# Town walls: a crenellated back wall, side walls, round corner towers and a gated front wall.
WALL_BACK = [
    'H.H.H.H.H.H.H.H.H.H.H.H.h.h',
    'HHHHHHHHHHHHHHHHHHHHHHhhhhh',
    'hhhhhhhhhhhhhhhhhhhhhhhhxxx',
]
WALL_SIDE = [
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
    'Hh',
]
WALL_FRONT = [
    'H.H.H.H.H.H.H.H.H.H.H.h.h',
    'HHHHHHHHHHHHHHHHHHHHHhhhh',
    'HHHHHHHHHHHddHHHHHHHHhhhx',
    'hhhhhhhhhhdddhhhhhhhhhhxx',
    'hhhhhhhhhhdddhhhhhhhhhxxx',
]
CORNER_TOWER = [
    'H.Hh',
    'HHhx',
    'HHhx',
    'HHhx',
    'HHhx',
    'HHhx',
    'hhxx',
]

GROUND_COURT = 'SAND'   # the paved yard inside the capital's walls


def settlements():
    gable, wide = outlined(HOUSE_GABLE), outlined(HOUSE_WIDE)
    tower, keep = outlined(TOWER), outlined(KEEP)
    back, side, front = outlined(WALL_BACK), outlined(WALL_SIDE), outlined(WALL_FRONT)
    corner = outlined(CORNER_TOWER)

    out = {}
    out['hamlet'] = stack(gable.size, [(gable, (0, 0))])
    out['village'] = stack((22, 15), [
        (gable, (9, 0)),
        (wide, (0, 5)),
        (gable, (11, 5)),
    ])
    out['town'] = stack((27, 19), [
        (gable, (8, 0)),
        (wide, (15, 2)),
        (wide, (0, 5)),
        (gable, (16, 9)),
        (wide, (5, 10)),
    ])
    out['city'] = stack((30, 29), [
        (tower, (11, 0)),
        (wide, (0, 9)),
        (gable, (19, 8)),
        (gable, (5, 12)),
        (wide, (17, 14)),
        (wide, (0, 19)),
        (gable, (10, 18)),
        (wide, (18, 20)),
    ])
    yard = Image.new('RGBA', (25, 14), (*PALETTE[GROUND_COURT], 255))
    out['capital'] = stack((32, 31), [
        (back, (2, 4)),
        (corner, (0, 2)),
        (corner, (26, 2)),
        (yard, (3, 8)),
        (side, (1, 8)),
        (side, (27, 8)),
        (keep, (11, 0)),
        (gable, (3, 9)),
        (gable, (19, 9)),
        (wide, (2, 15)),
        (wide, (19, 15)),
        (front, (3, 22)),
        (corner, (0, 20)),
        (corner, (26, 20)),
    ])
    return out


# --------------------------------------------------------------------------- highlight ring

def ellipse_ring(w, h, cx, cy, rx, ry):
    """A 1-px ellipse outline on a w x h canvas, with L-shaped corners thinned away."""
    ys, xs = np.mgrid[0:h, 0:w]
    inside = ((xs + 0.5 - cx) / rx) ** 2 + ((ys + 0.5 - cy) / ry) ** 2 <= 1.0
    core = inside.copy()
    core[1:, :] &= inside[:-1, :]
    core[:-1, :] &= inside[1:, :]
    core[:, 1:] &= inside[:, :-1]
    core[:, :-1] &= inside[:, 1:]
    ring = inside & ~core
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not ring[y, x]:
                continue
            hv = (ring[y, x - 1] or ring[y, x + 1]) and (ring[y - 1, x] or ring[y + 1, x])
            n8 = ring[y - 1:y + 2, x - 1:x + 2].sum() - 1
            if hv and n8 == 2:
                ring[y, x] = False
    return ring


def highlight(icon):
    """A gold ring on the ground round a settlement's footprint. Where the icon stands, the
    ring is cut away, so it reads as passing behind the houses; anchors line up with the icon."""
    w, h = icon.size
    rx = w / 2 + 3
    ry = max(4.0, rx * 0.45)
    margin_x, margin_top, margin_bottom = int(np.ceil(rx - w / 2)) + 2, 2, int(np.ceil(ry * 0.45)) + 3
    cw, ch = w + 2 * margin_x, h + margin_top + margin_bottom
    cx, cy = margin_x + w / 2, margin_top + h - ry * 0.55
    ring = ellipse_ring(cw, ch, cx, cy, rx, ry)
    a = np.zeros((ch, cw, 4), dtype=np.uint8)
    a[ring] = (*PALETTE['GOLD'], 255)
    im = add_outline(Image.fromarray(a))
    cut = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    cut.paste(icon, (margin_x, margin_top))
    arr, mask = np.array(im), np.array(cut)[:, :, 3] > 0
    arr[mask] = 0
    im = Image.fromarray(arr)
    left, top, right, bottom = im.getbbox()   # keep only the ring; the anchor moves with it
    ax, ay = margin_x + w // 2 - left, margin_top + h - 1 - top
    return im.crop((left, top, right, bottom)), (ax, ay)


# =========================================================================== movers

# A covered cart facing left, 12x8 with its outline drawn in: an arched canvas hood with a
# hoop, a plank bed, two wheels with light hubs and the shaft reaching forward.
CARAVAN = [
    '...OOOOOO...',
    '..OCCCcCCO..',
    '.OCCCCcCccO.',
    '.OCCCCcCccO.',
    'OOLLLLLLLLwO',
    'wwdwwwwwwwdO',
    'OOOLOOOOLOO.',
    '..OOO..OOO..',
]
# A trading sloop, 12x12 with its outline: jib and mainsail either side of the mast.
BOAT = [
    '.....d....',
    '....Wd....',
    '...WWdC...',
    '..WWWdCC..',
    '.WWWWdCCc.',
    'WWWWWdCCcc',
    '.....d....',
    'LLLLLLLLLw',
    '.wwwwwwwwd',
    '..ddddddd.',
]


# =========================================================================== place pins
# 8x12 with outlines drawn in. Each pin ends in a tip on its bottom row, which is its anchor.
# Report and arrest pins are neutral greys and creams, with no weapons or handcuffs.

PIN_CRIME_TRUE = [      # a round drop: what actually happened here (true view only)
    '..OOOO..',
    '.OVPVVO.',
    'OVPVVVrO',
    'OVVWWVrO',
    'OVVWWVrO',
    'OVVVVrrO',
    '.OVVrrO.',
    '..OVrO..',
    '..OVrO..',
    '...OrO..',
    '...OrO..',
    '....O...',
]
PIN_CRIME_RECORDED = [  # a filed card on a post: what the record says happened here
    'OOOOOO..',
    'ONNNNOO.',
    'ONCCCNnO',
    'ONNNNNnO',
    'ONCCCCnO',
    'ONNNNNnO',
    'ONCCNNnO',
    'OnnnnnnO',
    '.OOOOOO.',
    '...OxO..',
    '...OxO..',
    '....O...',
]
PIN_REPORT = [          # a speech bubble whose tail points at the spot: someone told the police
    '.OOOOOO.',
    'OWWWWWCO',
    'OWWWWWCO',
    'OxWxWxcO',
    'OWWWWWcO',
    'OCCCCccO',
    '.OCcOOO.',
    '..OcO...',
    '.OcO....',
    '.OcO....',
    'OcO.....',
    'OO......',
]
PIN_ARREST = [          # a plain inverted triangle: someone was arrested here
    '........',
    'OOOOOOOO',
    'OHHHHHhO',
    'OHHHHhhO',
    'OHHCChhO',
    '.OHCChO.',
    '.OHHhhO.',
    '.OHhhxO.',
    '..OHhO..',
    '..OHxO..',
    '..OhxO..',
    '...OO...',
]


# =========================================================================== assembly

def tile(rows, size):
    return grid(rows, (size, size))


def solid(name, size):
    return Image.new('RGBA', (size, size), (*PALETTE[name], 255))


def forest(size, units, spots):
    """Pack outlined trees over the shaded floor; units cycle through the spots in order."""
    trees = [outlined(u) for u in units]
    parts = [(trees[i % len(trees)], xy) for i, xy in enumerate(spots)]
    return stack((size, size), parts, base=solid(FOREST_FLOOR, size))


def hills(base, spots):
    """Grass domes with a dark-green contour on a grass tile, back to front."""
    contour = PALETTE['LEAF_D']
    return stack(base.size, [(add_outline(pad(grid(rows)), contour), xy) for rows, xy in spots], base=base)


def tip(im):
    """The pin's tip: the middle of its lowest opaque pixels, which the renderer puts on the spot."""
    a = np.array(im)[:, :, 3] > 0
    y = int(np.nonzero(a.any(axis=1))[0].max())
    xs = np.nonzero(a[y])[0]
    return int(xs[len(xs) // 2]), y


def build():
    sheet = Sheet('map')

    # Region view, 16x16. Fields carry no lighting, so the second farmland variant mirrors
    # the first; the two mix in any order.
    for i, rows in enumerate(GRASS16):
        sheet.add(f'map16_grassland_{i}', tile(rows, 16))
    farm = tile(FARM16, 16)
    sheet.add('map16_farmland_0', farm)
    sheet.add('map16_farmland_1', mirror(farm))
    sheet.add('map16_forest-deciduous', forest(16, [TREE_ROUND_SMALL] + [TREE_ROUND] * 6, FOREST16_ROUND))
    sheet.add('map16_forest-conifer', forest(16, [TREE_POINT], FOREST16_POINT))
    sheet.add('map16_hills', hills(tile(GRASS16[1], 16), HILLS16_SPOTS))
    sheet.add('map16_mountain', tile(MOUNTAIN16, 16))
    sheet.add('map16_peak', grid(PEAK16, (16, 24)), overlay=True)
    sheet.add('map16_peak-low', grid(PEAK16_LOW, (16, 16)), overlay=True)
    sheet.add('map16_sand', tile(SAND16, 16))
    sheet.add('map16_snow', tile(SNOW16, 16))
    sheet.add('map16_marsh', tile(MARSH16, 16))
    for i, rows in enumerate(WATER16):
        sheet.add(f'map16_water_{i}', tile(rows, 16))

    # Country view, 8x8
    for i, rows in enumerate(GRASS8):
        sheet.add(f'map8_grassland_{i}', tile(rows, 8))
    farm = tile(FARM8, 8)
    sheet.add('map8_farmland_0', farm)
    sheet.add('map8_farmland_1', mirror(farm))
    sheet.add('map8_forest-deciduous', forest(8, [TREE8_ROUND], FOREST8_ROUND))
    sheet.add('map8_forest-conifer', forest(8, [TREE8_POINT], FOREST8_POINT))
    sheet.add('map8_hills', hills(tile(GRASS8[1], 8), HILLS8_SPOTS))
    sheet.add('map8_mountain', tile(MOUNTAIN8, 8))
    sheet.add('map8_peak', grid(PEAK8, (8, 10)), overlay=True)
    sheet.add('map8_sand', tile(SAND8, 8))
    sheet.add('map8_snow', tile(SNOW8, 8))
    sheet.add('map8_marsh', tile(MARSH8, 8))
    for i, rows in enumerate(WATER8):
        sheet.add(f'map8_water_{i}', tile(rows, 8))

    # Settlements by size, each with its watched-place ring
    for size, icon in settlements().items():
        sheet.add(f'settlement_{size}', icon)
        ring, anchor = highlight(icon)
        sheet.add(f'settlement_highlight_{size}', ring, anchor=anchor, target=f'settlement_{size}')

    # Movers: anchored on the ground or waterline under their middle
    cart = grid(CARAVAN, (12, 8))
    sheet.add('caravan_left', cart)
    sheet.add('caravan_right', mirror(cart))
    boat = add_outline(pad(grid(BOAT)))
    sheet.add('boat_left', boat)
    sheet.add('boat_right', mirror(boat))

    # District pins: the anchor is the tip; the true-crime pin is shown only in the true view
    pins = {
        'crime-true': (PIN_CRIME_TRUE, {'view': 'true'}),
        'crime-recorded': (PIN_CRIME_RECORDED, {}),
        'report': (PIN_REPORT, {}),
        'arrest': (PIN_ARREST, {}),
    }
    for name, (rows, meta) in pins.items():
        im = grid(rows, (8, 12))
        sheet.add(f'pin_{name}', im, anchor=tip(im), **meta)
    return sheet


if __name__ == '__main__':
    build().save()
