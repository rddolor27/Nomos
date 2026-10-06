"""Houses: original GBA-era top-down pixel-art homes for Nomos, in three-quarter view.

Five building styles (thatched cottage, timber frame, brick, stone, painted plaster) in five
shapes sized by density, never by wealth: a detached house, row-house pieces that tile side by
side, an apartment block, a village hut and a farmhouse. Every style shares the same door,
windows, chimney size, lintels and flower boxes, so no style reads as richer or poorer
(content rule 5). Roofs are drawn in terracotta and recoloured for the other variants.
Each shape also gets a night overlay of lit windows that fits every style of that shape.

Build: python tools/sprites/houses.py
"""
import numpy as np
from PIL import Image

from spritekit import PALETTE, TILE, Sheet, add_outline, cmap, from_ascii, recolor

# One symbol per palette colour, shared by every grid in this module. The digits are the
# roof ramp (light, base, shade, deep): roofs are drawn in terracotta and recoloured.
SYM = cmap(**{
    'K': 'OUTLINE', 'w': 'WHITE', 'C': 'CREAM', 'c': 'CREAM_D', 'Y': 'SAND', 'y': 'SAND_D',
    'L': 'WOOD_L', 'W': 'WOOD', 'D': 'WOOD_D', 'G': 'GRASS_L', 'g': 'GRASS', 'F': 'LEAF_D',
    'B': 'WATER_L', 'b': 'WATER', 'N': 'NAVY', 'n': 'NAVY_D', 'S': 'STONE_L', 's': 'STONE',
    'd': 'STONE_D', 'R': 'ROOF', 'r': 'ROOF_D', 'V': 'VERMILLION', 'o': 'GOLD', 'P': 'PINK',
    'p': 'PINK_D', 'M': 'PLUM', 'u': 'BODY_L',
    '1': 'SAND', '2': 'ROOF', '3': 'ROOF_D', '4': 'WOOD_D',
})

ROOF_COLOURS = {
    'terracotta': {},
    'slate': {'SAND': 'STONE_L', 'ROOF': 'STONE', 'ROOF_D': 'STONE_D', 'WOOD_D': 'NAVY_D'},
    'thatch': {'SAND': 'BODY_L', 'ROOF': 'SAND', 'ROOF_D': 'SAND_D', 'WOOD_D': 'WOOD'},
    'plum': {'SAND': 'PINK_D', 'ROOF': 'PLUM', 'ROOF_D': 'NAVY', 'WOOD_D': 'NAVY_D'},
    'green': {'SAND': 'GRASS', 'ROOF': 'LEAF_D', 'ROOF_D': 'NAVY', 'WOOD_D': 'NAVY_D'},
}
STYLES = ('cottage', 'timber', 'brick', 'stone', 'plaster')

# Darker partner of each colour: eave shadows and the shadows under sills and boxes.
SHADE = {'C': 'c', 'c': 'S', 'w': 'C', 'Y': 'y', 'y': 'W', 'L': 'W', 'W': 'D', 'D': 'D',
         'R': 'r', 'r': 'D', 'S': 's', 's': 'd', 'd': 'n', 'M': 'N', 'p': 'M', 'P': 'p',
         'N': 'n', 'B': 'b', 'b': 'N', 'g': 'F', 'G': 'g', 'F': 'n'}


# ------------------------------------------------------------------ grid helpers
def blank(w, h):
    return [['.'] * w for _ in range(h)]


def stamp(g, rows, x, y):
    """Paste ASCII rows at (x, y): '.' leaves a pixel alone, '~' darkens what is there."""
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch == '.' or not (0 <= y + dy < len(g) and 0 <= x + dx < len(g[0])):
                continue
            if ch == '~':
                ch = SHADE.get(g[y + dy][x + dx], g[y + dy][x + dx])
            g[y + dy][x + dx] = ch


def render(g):
    return from_ascii([''.join(r) for r in g], SYM)


def at(tex, x, y):
    row = tex[y % len(tex)]
    return row[x % len(row)]


# ------------------------------------------------------------------ parts shared by every style
DOOR = [                      # 16 x 17 with its frame: a 14-px opening fits the blob body
    "..DDDDDDDDDDDD..",
    ".DLLLLLLLLLLLLD.",
    "DLLWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWSWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DLWWWDWWWWDWWWWD",
    "DWWWWDWWWWDWWWWD",
    "DSSSSSSSSSSSSSSD",
]
WINDOW = [                    # 9 x 9, four panes
    "CCCCCCCCC",
    "CbbbCbbbC",
    "CBBwCBBBC",
    "CBwBCBBBC",
    "CCCCCCCCC",
    "CbBBCbBBC",
    "CBBBCBBwC",
    "CBBBCBBBC",
    "CCCCCCCCC",
]
WINDOW_SMALL = [              # 7 x 9, two panes wide, for row houses
    "CCCCCCC",
    "CbbCbbC",
    "CBwCBBC",
    "CwBCBBC",
    "CCCCCCC",
    "CbBCbBC",
    "CBBCBwC",
    "CBBCBBC",
    "CCCCCCC",
]
WINDOW_NARROW = [             # 4 x 9, one pane wide, a pair flanks the hut's door
    "CCCC",
    "CbbC",
    "CBwC",
    "CwBC",
    "CCCC",
    "CbBC",
    "CBBC",
    "CBBC",
    "CCCC",
]
WINDOWS = {'large': WINDOW, 'small': WINDOW_SMALL, 'narrow': WINDOW_NARROW}
SILL = ["CCCCCCCCCCC", ".~~~~~~~~~."]
FLOWER_BOX = [                # first row covers the window's bottom frame, never its glass
    "gPgGwgFgVGg",
    "LLLLLLLLLLL",
    "DWWWWWWWWWD",
    ".~~~~~~~~~.",
]

# Chimneys rise above the roofline; each style builds its own in its wall material.
BRICK_STACK = [
    "SSSSSSSS",
    "dsssssdd",
    ".CCCCCC.",
    ".RrrCRD.",
    ".rrrCrD.",
    ".CCCCCC.",
    ".CRrrrD.",
    ".CrrrrD.",
    ".CCCCCC.",
    ".RrrCRD.",
]
CHIMNEY = {
    'cottage': [
        "SSSSSSSS",
        "dsssssdd",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
        ".CCCCCc.",
    ],
    'timber': BRICK_STACK,
    'brick': BRICK_STACK,
    'stone': [
        "SSSSSSSS",
        "dsssssdd",
        ".SSSdSd.",
        ".sssdsd.",
        ".dddddd.",
        ".SdSSSd.",
        ".sdsssd.",
        ".dddddd.",
        ".SSSdSd.",
        ".sssdsd.",
    ],
    'plaster': [
        "CCCCCCCC",
        "cccccccc",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
        ".MMMMMN.",
    ],
}
ROOF_SHADE = {'1': '2', '2': '3', '3': '4', '4': '4'}


def chimney_art(style, small=False):
    """A style's chimney; the small one (for the hut) drops two middle columns and three rows."""
    art = CHIMNEY[style]
    return [row[:3] + row[5:] for row in art[:7]] if small else art

# ------------------------------------------------------------------ roofs
# Texture symbols: '.' body, 'h' lit course edge, '-' course shadow, '|' joint,
# ',' shade stroke, "'" light stroke. Widths divide 32 so row houses tile seamlessly.
ROOF_TEX = {
    'cottage': [           # thatch: sparse straw strokes, a soft wavy layer line every 8 rows
        "..,.......,.....",
        "..,..'....,.....",
        ".....'.......,..",
        "......,......,..",
        ".,....,....'....",
        ".,.........'....",
        "....,.......,...",
        ",.-,,..,,-.,.,-,",
    ],
    'timber': [            # wooden shingles, irregular
        "----------------",
        "..|.....|...|...",
        "..|.,,,.|...|...",
        "----------------",
        "|....|...|......",
        "|....|...|,,,,,.",
        "----------------",
        "....|......|..|.",
        ",,,.|......|..|.",
    ],
    'brick': [             # plain clay tiles
        "--------",
        "|h......",
        "|.......",
        "........",
        "--------",
        "....|h..",
        "....|...",
        "........",
    ],
    'stone': [             # slate
        "hhhhhhhhhhhhhhhh",
        "...|......|.....",
        "----------------",
        "hhhhhhhhhhhhhhhh",
        "......|.......|.",
        "----------------",
    ],
    'plaster': [           # barrel tiles
        ".h.,.h.,",
        ".h.,.h.,",
        ".h.,.h.,",
        ".h.,.h.,",
        ".--,.--,",
    ],
}
TONES = {   # per roof facet: front, lit left hip, shaded right hip
    'F': {'.': '2', 'h': '1', '-': '3', '|': '3', ',': '3', "'": '1'},
    'L': {'.': '1', 'h': '1', '-': '2', '|': '2', ',': '2', "'": '1'},
    'R': {'.': '3', 'h': '3', '-': '4', '|': '4', ',': '4', "'": '2'},
}
THATCH = 'cottage'


def hip_roof(g, x0, y0, x1, y1, style, ends=(True, True)):
    """A hipped roof over columns x0..x1, rows y0..y1, lit from the top left.

    `ends` says which ends get a hip; a row-house middle piece has none, so its roof runs
    straight through both edges and tiles with its neighbours.
    """
    tex = ROOF_TEX[style]
    thatch = style == THATCH
    eave = 3 if thatch else 2
    yb = y1 - eave
    for y in range(y0, yb + 1):
        k = (yb - y) // 2
        for x in range(x0, x1 + 1):
            t = at(tex, x, y)
            if ends[0] and x < x0 + k:
                ch = TONES['L'][t]
            elif ends[1] and x > x1 - k:
                ch = TONES['R'][t]
            else:
                ch = TONES['F'][t]
                if not thatch and ends[0] and x == x0 + k:
                    ch = '1'
                if not thatch and ends[1] and x == x1 - k:
                    ch = '3'
            g[y][x] = ch
    k0 = (yb - y0) // 2
    rx0 = x0 + k0 + 1 if ends[0] else x0
    rx1 = x1 - k0 - 1 if ends[1] else x1
    if thatch:                     # block-cut ridge: a band with a zigzag lower edge
        mid = (x0 + x1) // 2
        for x in range(rx0 - 3 if ends[0] else rx0, (rx1 + 4 if ends[1] else rx1 + 1)):
            lit = ends[0] and x < rx0
            shade = ends[1] and x > rx1
            body = '1' if lit else ('3' if shade else '2')
            g[y0][x] = '1' if not shade else '2'
            g[y0 + 1][x] = body
            g[y0 + 2][x] = body if x % 4 in (1, 2) else ('4' if shade else '3')
            if x % 4 in (1, 2):
                g[y0 + 3][x] = '4' if shade else '3'
    else:
        for x in range(rx0, rx1 + 1):
            g[y0][x] = '1'
            g[y0 + 1][x] = '3' if x % 4 == 3 else '2'
    for x in range(x0, x1 + 1):
        left = ends[0] and x < x0 + 3
        right = ends[1] and x > x1 - 3
        if thatch:                 # a thick eave of cut straw ends
            g[y1 - 2][x] = ('1' if x % 2 else '2') if left else (
                ('3' if x % 2 else '4') if right else ('2' if x % 2 else '3'))
            g[y1 - 1][x] = '2' if left else ('4' if right else ('3' if x % 3 else '2'))
        else:
            g[y1 - 1][x] = '1' if left else ('3' if right else '2')
        g[y1][x] = '4'
    chamfer = 5 if thatch else 2
    for i in range(chamfer):
        for j in range(chamfer - i):
            if ends[0]:
                g[y0 + i][x0 + j] = '.'
            if ends[1]:
                g[y0 + i][x1 - j] = '.'
    if thatch:                     # rounded eave corners
        for (dx, dy) in ((0, 0), (1, 0), (0, 1)):
            if ends[0]:
                g[y1 - dy][x0 + dx] = '.'
            if ends[1]:
                g[y1 - dy][x1 - dx] = '.'


# ------------------------------------------------------------------ walls
WALL_TEX = {
    'cottage': ["C"],
    'timber': ["C"],
    'brick': [
        "CCCCCCCC",
        "CRrrrrrr",
        "Crrrrrrr",
        "CCCCCCCC",
        "rrrCRrrr",
        "rrrCrrrr",
    ],
    'stone': [
        "SSSSSSdSSSSSSSSd",
        "ssssssdSsssssssd",
        "ssssssdssssssssd",
        "dddddddddddddddd",
        "SSdSSSSSSSSdSSSS",
        "ssdSssssssSdssss",
        "ssdssssssssdssss",
        "dddddddddddddddd",
    ],
    'plaster': ["M"],
}
PLINTH = {
    'default': ["SSsSSSsdSSsSSSsd", "ssdsssddssdsssdd"],
    'stone': ["sdsssdssdsssssds", "dddddddddddddddd"],
}
LINTEL = {    # one row above every opening, in each style's own material
    'cottage': 'W', 'timber': 'W', 'brick': 'S', 'stone': 'S', 'plaster': 'c',
}


def wall(g, style, x0, y0, x1, y1, openings, ends=(True, True)):
    """Front wall over x0..x1, y0..y1. `openings` are (x, y, w, h) boxes for doors/windows."""
    tex = WALL_TEX[style]
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = at(tex, x, y)
    if style == 'timber':
        timber_frame(g, x0, y0, x1, y1, openings, ends)
    plinth = PLINTH.get(style, PLINTH['default'])
    for i, y in enumerate((y1 - 1, y1)):
        for x in range(x0, x1 + 1):
            g[y][x] = at(plinth, x, i)
    for (ox, oy, ow, oh) in openings:
        if style != 'timber':
            for x in range(ox - 1, ox + ow + 1):
                if x0 <= x <= x1:
                    g[oy - 1][x] = LINTEL[style]
    for x in range(x0, x1 + 1):
        g[y0][x] = SHADE.get(g[y0][x], g[y0][x])


def timber_frame(g, x0, y0, x1, y1, openings, ends):
    """One-pixel oak frame on cream infill: plate, sill beam, posts, heads and braces."""
    for x in range(x0, x1 + 1):
        g[y0][x] = 'W'                             # top plate, darkened by the eave shadow
        g[y1 - 2][x] = 'W'                         # sill beam just above the plinth
    posts = {x0, x1}                               # corner posts, or half a shared party post
    for (ox, oy, ow, oh) in openings:
        posts |= {ox - 1, ox + ow}
        for x in range(ox - 1, ox + ow + 1):
            if x0 <= x <= x1:
                g[oy - 1][x] = 'W'                 # head beam
    posts = sorted(p for p in posts if x0 <= p <= x1)
    for x in posts:
        for y in range(y0, y1 - 1):
            g[y][x] = 'W'
    # one brace in every bay that holds no opening and is wide enough to read
    top, bot = y0 + 1, y1 - 3
    centre = (x0 + x1) / 2
    for a, b in zip(posts, posts[1:]):
        xa, xb = a + 1, b - 1
        if xb - xa + 1 < 4 or any(ox <= xb and xa < ox + ow for (ox, oy, ow, oh) in openings):
            continue
        span = bot - top
        for i in range(span + 1):
            t = i / span
            x = round(xa + t * (xb - xa)) if (xa + xb) / 2 < centre else round(xb - t * (xb - xa))
            g[bot - i][x] = 'W'


# ------------------------------------------------------------------ assembling a house
def ring(im, mask):
    """Outline `mask` against the rest of the sprite (its edges over the roof)."""
    a = np.array(im)
    m = np.array(mask, dtype=bool)
    near = np.zeros_like(m)
    near[1:, :] |= m[:-1, :]
    near[:-1, :] |= m[1:, :]
    near[:, 1:] |= m[:, :-1]
    near[:, :-1] |= m[:, 1:]
    hit = near & ~m & (a[:, :, 3] > 0)
    a[hit] = (*PALETTE['OUTLINE'], 255)
    return Image.fromarray(a)


class Plan:
    """Where everything goes on one house shape; the same for every style."""

    def __init__(self, w, h, roof, walls, ends=(True, True)):
        self.w, self.h = w, h
        self.roof, self.walls, self.ends = roof, walls, ends
        self.doors, self.windows, self.chimneys = [], [], []

    def door(self, x):
        self.doors.append(x)
        return self

    def window(self, x, y, extra='sill', kind='large'):
        self.windows.append((x, y, extra, WINDOWS[kind]))
        return self

    def chimney(self, x, y, small=False):
        self.chimneys.append((x, y, small))
        return self

    def openings(self):
        y1 = self.walls[3]
        out = [(x, y1 - len(DOOR) + 1, len(DOOR[0]), len(DOOR)) for x in self.doors]
        for (x, y, _, art) in self.windows:
            out.append((x, y, len(art[0]), len(art)))
        return out


def draw_house(plan, style, roof):
    w, h = plan.w, plan.h
    x0, y0, x1, y1 = plan.walls
    g = blank(w, h)
    wall(g, style, x0, y0, x1, y1, plan.openings(), plan.ends)
    for x in plan.doors:
        stamp(g, DOOR, x, y1 - len(DOOR) + 1)
    for (x, y, extra, art) in plan.windows:
        stamp(g, art, x, y)
        if extra == 'box':
            stamp(g, [r[:len(art[0]) + 2] for r in FLOWER_BOX], x - 1, y + len(art) - 1)
        elif extra == 'sill':
            stamp(g, [r[:len(art[0]) + 2] for r in SILL], x - 1, y + len(art))
    im = render(g)
    r = blank(w, h)
    rx0, ry0, rx1, ry1 = plan.roof
    hip_roof(r, rx0, ry0, rx1, ry1, style, plan.ends)
    for (cx, cy, small) in plan.chimneys:     # each chimney shades the roof to its right
        art = chimney_art(style, small)
        for y in range(ry0, cy + len(art) + 1):
            for x in (cx + len(art[0]) - 1, cx + len(art[0])):
                if r[y][x] in ROOF_SHADE:
                    r[y][x] = ROOF_SHADE[r[y][x]]
    im.alpha_composite(recolor(render(r), ROOF_COLOURS[roof]))
    c = blank(w, h)
    for (cx, cy, small) in plan.chimneys:
        stamp(c, chimney_art(style, small), cx, cy)
    cim = render(c)
    im.alpha_composite(cim)
    im = ring(im, np.array(cim)[:, :, 3] > 0)
    return add_outline(im)


def draw_night(plan):
    """Lit glass only, to draw over any style of this shape after dark."""
    g = blank(plan.w, plan.h)
    for (x, y, _, art) in plan.windows:
        lit = [''.join('o' if ch in 'Bbw' else '.' for ch in row) for row in art]
        stamp(g, lit, x, y)
        g[y + 1][x + 1] = 'u'
    return render(g)


# ------------------------------------------------------------------ shapes
def plans():
    """Every shape's layout. Roof rows start at 4 so chimneys can rise above the roofline."""
    p = {}
    # Detached, farmhouse and apartment fronts are mirror-symmetric about a centred door.
    p['detached'] = (Plan(48, 48, roof=(1, 4, 46, 25), walls=(3, 26, 44, 46))
                     .door(16).window(5, 30, 'box').window(34, 30, 'box').chimney(32, 1))
    # A row unit is a door and a window; every piece keeps the same rhythm so a terrace reads
    # as evenly spaced homes, and the end pieces keep 2 px of wall at the corner.
    p['row-left'] = (Plan(32, 48, roof=(1, 4, 31, 25), walls=(3, 26, 31, 46), ends=(True, False))
                     .door(5).window(23, 30, 'box', 'small').chimney(12, 1))
    p['row-middle'] = (Plan(32, 48, roof=(0, 4, 31, 25), walls=(0, 26, 31, 46), ends=(False, False))
                       .door(3).window(22, 30, 'box', 'small').chimney(12, 1))
    p['row-right'] = (Plan(32, 48, roof=(0, 4, 30, 25), walls=(0, 26, 28, 46), ends=(False, True))
                      .door(2).window(20, 30, 'box', 'small').chimney(12, 1))
    # The hut's walls run 1 px under its eave so a narrow window fits each side of the door.
    p['hut'] = (Plan(32, 32, roof=(1, 3, 30, 12), walls=(2, 13, 29, 30))
                .door(8).window(3, 16, 'sill', 'narrow').window(25, 16, 'sill', 'narrow')
                .chimney(20, 1, small=True))
    p['farmhouse'] = (Plan(64, 48, roof=(1, 4, 62, 25), walls=(3, 26, 60, 46))
                      .door(24).window(9, 30, 'box').window(46, 30, 'box')
                      .chimney(8, 1).chimney(48, 1))
    a = Plan(64, 64, roof=(1, 4, 62, 15), walls=(3, 16, 60, 62))
    for x in (8, 21, 34, 47):
        a.window(x, 18, 'box' if x in (8, 47) else 'sill')
        a.window(x, 31, 'sill' if x in (8, 47) else 'box')
    a.door(24).window(8, 47, 'sill').window(47, 47, 'sill').chimney(10, 1).chimney(46, 1)
    p['apartment'] = a
    return p


def footprint(plan):
    return [plan.w // TILE, plan.h // TILE]


def build():
    sheet = Sheet('houses')
    for shape, plan in plans().items():
        night = f'house_{shape}_night'
        for style in STYLES:
            for roof in ROOF_COLOURS:
                im = draw_house(plan, style, roof)
                doors = [[x + len(DOOR[0]) // 2, plan.walls[3]] for x in plan.doors]
                sheet.add(f'house_{style}_{shape}_roof-{roof}', im, footprint=footprint(plan),
                          door=doors[0], night=night)
        sheet.add(night, draw_night(plan), footprint=footprint(plan), layer='night')
    return sheet


if __name__ == '__main__':
    build().save()
