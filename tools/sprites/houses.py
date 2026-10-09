"""Houses: original GBA-era top-down pixel-art homes for Nomos, in three-quarter view.

Seven building styles (thatched cottage, timber frame, brick, stone, painted plaster,
weatherboard, rubble) in shapes sized by density, never by wealth: a detached house, row-house
pieces that tile side by side, an apartment block, a village hut and a farmhouse; for a dense
core, tall gabled townhouse pieces and corner houses that end a terrace with a wing along the
side street; and a small gabled cabin for suburbs and outskirts. Row and townhouse pieces also come
handed, their door on the other side. Every style shares the same windows, chimney size and
lintels, and draws its door, flower boxes, curtains and chimney pots from the same few choices by
style and roof, so no style reads as richer or poorer (content rule 5). Roofs are drawn in
terracotta and recoloured for the other variants.
Each shape also gets a night overlay of lit windows that fits every style of that shape, and
each style of a shape a snow overlay that fits every roof colour.

Build: python tools/sprites/houses.py
"""
import numpy as np
from PIL import Image

from spritekit import PALETTE, TILE, Sheet, add_outline, cmap, from_ascii, overlay, recolor

# One symbol per palette colour, shared by every grid in this module. The digits are the
# roof ramp (light, base, shade, deep): roofs are drawn in terracotta and recoloured.
SYM = cmap(**{
    'K': 'OUTLINE', 'w': 'WHITE', 'C': 'CREAM', 'c': 'CREAM_D', 'Y': 'SAND', 'y': 'SAND_D',
    'L': 'WOOD_L', 'W': 'WOOD', 'D': 'WOOD_D', 'G': 'GRASS_L', 'g': 'GRASS', 'F': 'LEAF_D',
    'B': 'WATER_L', 'b': 'WATER', 'N': 'NAVY', 'n': 'NAVY_D', 'S': 'STONE_L', 's': 'STONE',
    'd': 'STONE_D', 'R': 'ROOF', 'r': 'ROOF_D', 'V': 'VERMILLION', 'o': 'GOLD', 'P': 'PINK',
    'p': 'PINK_D', 'M': 'PLUM', 'u': 'BODY_L', 'I': 'ICE_L', 'i': 'ICE',
    '1': 'SAND', '2': 'ROOF', '3': 'ROOF_D', '4': 'WOOD_D', '5': 'WOOD_D',
})
# Roof ramp under snow. '5' is the eave's underside, in the deep tone, which snow never covers.
SNOW_TONE = {'1': 'w', '2': 'w', '3': 'I', '4': 'i'}

ROOF_COLOURS = {
    'terracotta': {},
    'slate': {'SAND': 'STONE_L', 'ROOF': 'STONE', 'ROOF_D': 'STONE_D', 'WOOD_D': 'NAVY_D'},
    'thatch': {'SAND': 'BODY_L', 'ROOF': 'SAND', 'ROOF_D': 'SAND_D', 'WOOD_D': 'WOOD'},
    'plum': {'SAND': 'PINK_D', 'ROOF': 'PLUM', 'ROOF_D': 'NAVY', 'WOOD_D': 'NAVY_D'},
    'green': {'SAND': 'GRASS', 'ROOF': 'LEAF_D', 'ROOF_D': 'NAVY', 'WOOD_D': 'NAVY_D'},
}
STYLES = ('cottage', 'timber', 'brick', 'stone', 'plaster', 'board', 'rubble')

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
# Doors are 16 x 17 with their frame: a 14-px opening fits the blob body. They are drawn in a paint's
# lit (h), body (m) and edge (e) tones, on a stone step (S) with a stone knob.
DOORS = {
    'boards': [
        "..eeeeeeeeeeee..",
        ".ehhhhhhhhhhhhe.",
        "ehhmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmSme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "ehmmmemmmmemmmme",
        "emmmmemmmmemmmme",
        "eSSSSSSSSSSSSSSe",
    ],
    'panels': [                # four sunk panels, shaded at the top and left, lit at the bottom and right
        "..eeeeeeeeeeee..",
        ".ehhhhhhhhhhhhe.",
        "ehmmmmmmmmmmmmme",
        "ehmeeeemmeeeemme",
        "ehmemmhmmemmhmme",
        "ehmemmhmmemmhmme",
        "ehmemmhmmemmhmme",
        "ehmehhhmmehhhmme",
        "ehmmmmmmmmmmmSme",
        "ehmmmmmmmmmmmmme",
        "ehmeeeemmeeeemme",
        "ehmemmhmmemmhmme",
        "ehmemmhmmemmhmme",
        "ehmemmhmmemmhmme",
        "ehmehhhmmehhhmme",
        "emmmmmmmmmmmmmme",
        "eSSSSSSSSSSSSSSe",
    ],
    'stable': [                # split across the middle, so the top half opens on its own
        "..eeeeeeeeeeee..",
        ".ehhhhhhhhhhhhe.",
        "ehhmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "eeeeeeeeeeeeeeee",
        "ehhhhhhhhhhhhhhe",
        "ehmmmmemmmmemSme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "ehmmmmemmmmemmme",
        "emmmmmemmmmemmme",
        "eSSSSSSSSSSSSSSe",
    ],
}
DOOR = DOORS['boards']                     # every design has its size
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
# A flower box's first row covers the window's bottom frame, never its glass. Every set flowers.
FLOWERS = ("gPgGwgFgVGg", "gPgFPgGgPFg", "gwgFwgGgwFg", "gBgFBgGgBFg", "gugFugGguFg")

# ------------------------------------------------------------------ dressing
# Paints as (lit, body, edge) symbols, for doors and flower boxes.
PAINTS = {'wood': 'LWD', 'green': 'gFn', 'plum': 'pMN', 'slate': 'Ssd', 'oak': 'YyW', 'cream': 'wCc'}
# Each style's door paint under each roof colour, in ROOF_COLOURS order: never the colour of its own
# walls or roof, and each paint about as common as the others.
DOOR_PAINTS = {
    'cottage': ('green', 'oak', 'plum', 'slate', 'wood'),
    'timber': ('slate', 'green', 'wood', 'oak', 'plum'),
    'brick': ('plum', 'cream', 'slate', 'green', 'oak'),
    'stone': ('wood', 'plum', 'cream', 'green', 'oak'),
    'plaster': ('oak', 'wood', 'green', 'cream', 'slate'),
    'board': ('green', 'plum', 'slate', 'cream', 'cream'),
    'rubble': ('slate', 'wood', 'green', 'wood', 'plum'),
}
CURTAIN = 'P'
POTS = {8: ".Rr..Rr.", 6: "..Rr.."}       # chimney pots, standing on the cap's lit course
SHIFTED = ('timber', 'stone', 'board')     # styles whose chimneys stand at a shape's other place


def painted(art, paint):
    lit, body, edge = PAINTS[paint]
    return [row.translate(str.maketrans({'h': lit, 'm': body, 'e': edge})) for row in art]


class Trim:
    """One frame's dressing: its door's design and paint, the flowers in its boxes, whether its upper
    panes have curtains, and whether its chimney has pots. Style and roof pick them from the same few
    choices, so place.py's uniform draws of style and roof spread them evenly, and no style dresses
    richer or poorer."""

    def __init__(self, style, roof):
        i, j = STYLES.index(style), list(ROOF_COLOURS).index(roof)
        self.paint = DOOR_PAINTS[style][j]
        self.door = painted(list(DOORS.values())[(i + j) % len(DOORS)], self.paint)
        self.flowers = FLOWERS[(2 * i + j) % len(FLOWERS)]
        self.curtains = (2 * i + j) % 3 == 0
        self.pots = (i + j) % 2 == 0

    def box(self, width):
        rows = [self.flowers[:width], 'h' * width, 'e' + 'm' * (width - 2) + 'e', '.' + '~' * (width - 2) + '.']
        return painted(rows, self.paint)

    def window(self, art):
        """Curtains drawn back each side of the upper panes, behind the glass."""
        if not self.curtains:
            return art
        w = len(art[0])
        drapes = {(1, 1), (w - 2, 1)} if w < 7 else {(x, y) for x in (1, w - 2) for y in (1, 2, 3)}
        drapes |= {(2, 1), (w - 3, 1)}
        return [''.join(CURTAIN if (x, y) in drapes and ch in 'Bbw' else ch for x, ch in enumerate(row))
                for y, row in enumerate(art)]

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
    'board': BRICK_STACK,
    'rubble': [
        "SSSSSSSS",
        "dsssssdd",
        ".CYYcYy.",
        ".YYycYy.",
        ".cccccc.",
        ".YcCYYy.",
        ".ycYYyy.",
        ".cccccc.",
        ".CYYcYy.",
        ".YYycYy.",
    ],
}
ROOF_SHADE = {'1': '2', '2': '3', '3': '4', '4': '4'}


def chimney_art(style, small=False, pots=False):
    """A style's chimney; the small one (for the hut) drops two middle columns and three rows. Pots
    replace the cap's top course and leave its outline over the roof as it was, so one snow overlay
    still fits every roof."""
    art = CHIMNEY[style]
    if small:
        art = [row[:3] + row[5:] for row in art[:7]]
    return [POTS[len(art[0])], art[0]] + art[2:] if pots else art

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
    'board': [             # fish-scale shingles, each course half a scale over
        ".hh..hh.",
        "........",
        "-..--..-",
        ".--..--.",
        "h..hh..h",
        "........",
        ".--..--.",
        "-..--..-",
    ],
    'rubble': [            # heavy stone slabs
        "hhhhhhhhhhhhhhhh",
        ".........|......",
        ".........|......",
        "----------------",
        "hhhhhhhhhhhhhhhh",
        "...|............",
        "...|............",
        "----------------",
    ],
}
TONES = {   # per roof facet: front, lit left hip, shaded right hip
    'F': {'.': '2', 'h': '1', '-': '3', '|': '3', ',': '3', "'": '1'},
    'L': {'.': '1', 'h': '1', '-': '2', '|': '2', ',': '2', "'": '1'},
    'R': {'.': '3', 'h': '3', '-': '4', '|': '4', ',': '4', "'": '2'},
}
THATCH = 'cottage'


def hip_roof(g, x0, y0, x1, y1, style, ends=(True, True), plain=False):
    """A hipped roof over columns x0..x1, rows y0..y1, lit from the top left.

    `ends` says which ends get a hip; a row-house middle piece has none, so its roof runs
    straight through both edges and tiles with its neighbours. `plain` drops the texture,
    for a roof under snow.
    """
    tex = ['.'] if plain else ROOF_TEX[style]
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
        g[y1][x] = '5'
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


class HipRoof:
    """A hipped roof seen from the front, over columns x0..x1 and rows y0..y1 (see hip_roof)."""

    def __init__(self, x0, y0, x1, y1, ends=(True, True)):
        self.x0, self.y0, self.x1, self.y1, self.ends = x0, y0, x1, y1, ends

    def wall_top(self, x, y0):
        return y0

    def draw(self, g, style, plain=False):
        hip_roof(g, self.x0, self.y0, self.x1, self.y1, style, self.ends, plain)


class GableRoof:
    """A roof with its gable to the street: two slopes fall from a ridge that runs back from the apex.

    The front rake climbs at 45 degrees from the eave corners on row `eave` to an apex over the middle
    of `span`, and each slope shows `depth` rows behind it. A terrace's end piece clips the span at
    `clip` to leave room for its outline, so every piece of a terrace keeps the same gable. The slopes
    face the sides, so their courses run back from the street: the texture is read turned a quarter.
    """

    def __init__(self, span, eave, depth, clip=None):
        self.gx0, self.gx1 = span
        self.x0, self.x1 = clip or span
        self.eave, self.depth = eave, depth

    def rake(self, x):
        return self.eave - min(x - self.gx0, self.gx1 - x)

    def wall_top(self, x, y0):
        return min(y0, self.rake(x) + 1)

    def draw(self, g, style, plain=False):
        tex = ['.'] if plain else ROOF_TEX[style]
        mid = self.gx0 + self.gx1                     # twice the ridge's column
        for x in range(self.x0, self.x1 + 1):
            left = 2 * x < mid
            run = x - self.gx0 if left else self.gx1 - x
            front = self.rake(x)
            back = front - self.depth
            tones = TONES['F' if left else 'R']
            for y in range(back, front + 1):
                g[y][x] = tones[at(tex, y, run)]
            g[back][x] = '1' if left else '2'          # the far verge catches the light
            ridge = (mid - 1) // 2 - x if left else x - (mid + 1) // 2    # columns from the ridge
            if style == THATCH:
                self.thatch(g, x, left, ridge, back, front)
            else:
                g[front - 1][x] = '1' if left else '2'
                if left and ridge == 0:               # the ridge, lit on its sunny side
                    for y in range(back, front - 1):
                        g[y][x] = '1'
            g[front][x] = '5'

    @staticmethod
    def thatch(g, x, left, ridge, back, front):
        """A thick verge of cut straw ends, and a block-cut ridge whose edges are notched."""
        g[front - 2][x] = ('2' if x % 2 else '3') if left else ('3' if x % 2 else '4')
        g[front - 1][x] = ('3' if x % 3 else '2') if left else '4'
        for y in range(back, front - 2):
            if ridge < 2:
                g[y][x] = ('2' if ridge else '1') if left else ('3' if ridge else '2')
            elif ridge == 2 and y % 4 in (1, 2):
                g[y][x] = '3' if left else '4'


class WingRoof(HipRoof):
    """A hipped roof that turns a street corner: a gabled wing runs back from one end along the side
    street, its ridge square to the main one, so the house fronts both streets. `wing` is a GableRoof
    whose front gable hides under this roof; only its slopes and far gable show behind the ridge."""

    def __init__(self, x0, y0, x1, y1, ends, wing):
        super().__init__(x0, y0, x1, y1, ends)
        self.wing = wing

    def draw(self, g, style, plain=False):
        behind = blank(len(g[0]), len(g))
        self.wing.draw(behind, style, plain)
        super().draw(g, style, plain)
        for y, row in enumerate(behind):
            for x, ch in enumerate(row):
                if ch != '.' and g[y][x] == '.':
                    g[y][x] = ch


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
    'board': [             # lapped boards, with a butt joint here and there
        "LLLLLLLLLLLLLLLL",
        "LLLLLLLLLLLWLLLL",
        "WWWWWWWWWWWWWWWW",
        "LLLLLLLLLLLLLLLL",
        "LLLWLLLLLLLLLLLL",
        "WWWWWWWWWWWWWWWW",
    ],
    'rubble': [            # fieldstones in rough courses, rounded at the corners
        "CYYYYccCYYYccCcc",
        "YYYYYycYYYYycYyc",
        "cyyyyyccyyyyccyc",
        "cccccccccccccccc",
        "CYYccCYYYYccCYcc",
        "YYYycYYYYYycYYyc",
        "cyyyccyyyyyccyyc",
        "cccccccccccccccc",
    ],
}
PLINTH = {
    'default': ["SSsSSSsdSSsSSSsd", "ssdsssddssdsssdd"],
    'stone': ["sdsssdssdsssssds", "dddddddddddddddd"],
}
LINTEL = {    # one row above every opening, in each style's own material
    'cottage': 'W', 'timber': 'W', 'brick': 'S', 'stone': 'S', 'plaster': 'c', 'board': 'D', 'rubble': 'W',
}


def wall(g, style, x0, y0, x1, y1, openings, top):
    """Front wall over x0..x1 down to row y1, from row top(x), which a gable lifts above y0.
    `openings` are (x, y, w, h) boxes for doors and windows."""
    tex = WALL_TEX[style]
    for x in range(x0, x1 + 1):
        for y in range(top(x), y1 + 1):
            g[y][x] = at(tex, x, y)
    if style == 'timber':
        below = [o for o in openings if o[1] > y0]
        timber_frame(g, x0, y0, x1, y1, below)
        timber_gable(g, y0, [o for o in openings if o not in below])
    plinth = PLINTH.get(style, PLINTH['default'])
    for i, y in enumerate((y1 - 1, y1)):
        for x in range(x0, x1 + 1):
            g[y][x] = at(plinth, x, i)
    for (ox, oy, ow, oh) in openings:
        if style != 'timber':
            for x in range(ox - 1, ox + ow + 1):
                if x0 <= x <= x1:
                    g[oy - 1][x] = LINTEL[style]
    for x in range(x0, x1 + 1):              # the shadow under the eave or the rake
        y = top(x)
        g[y][x] = SHADE.get(g[y][x], g[y][x])


def timber_gable(g, y0, openings):
    """A post each side of a gable window, from its head beam down to the tie beam on row y0."""
    for (ox, oy, ow, oh) in openings:
        for x in range(ox - 1, ox + ow + 1):
            g[oy - 1][x] = 'W'
        for x in (ox - 1, ox + ow):
            for y in range(oy - 1, y0):
                g[y][x] = 'W'


def timber_frame(g, x0, y0, x1, y1, openings):
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
    """Where everything goes on one house shape; the same for every style. `joins` names the edges
    a terrace piece shares with its neighbours."""

    def __init__(self, w, h, roof, walls, joins=None):
        self.w, self.h = w, h
        self.roof, self.walls, self.joins = roof, walls, joins
        self.doors, self.windows, self.chimneys = [], [], []
        self.roof_of = None

    def handed(self, shape):
        """A handed twin of this plan, which is the shape named `shape`: the same roof, walls and
        chimneys, to dress with a door and windows the other way round. It shares the shape's snow."""
        twin = Plan(self.w, self.h, self.roof, self.walls, self.joins)
        twin.chimneys, twin.roof_of = self.chimneys, shape
        return twin

    def door(self, x):
        self.doors.append(x)
        return self

    def window(self, x, y, extra='sill', kind='large'):
        self.windows.append((x, y, extra, WINDOWS[kind]))
        return self

    def chimney(self, x, y, small=False, shift=0):
        """A chimney at x, or at x + shift for the SHIFTED styles, so rows of mixed styles vary."""
        self.chimneys.append((x, y, small, shift))
        return self

    def stacks(self, style, pots):
        """(x, y, art) of each chimney as this style builds it."""
        moved = style in SHIFTED
        return [(x + shift * moved, y, chimney_art(style, small, pots)) for (x, y, small, shift) in self.chimneys]

    def openings(self):
        y1 = self.walls[3]
        out = [(x, y1 - len(DOOR) + 1, len(DOOR[0]), len(DOOR)) for x in self.doors]
        for (x, y, _, art) in self.windows:
            out.append((x, y, len(art[0]), len(art)))
        return out


def draw_house(plan, style, roof, snow=False):
    w, h = plan.w, plan.h
    x0, y0, x1, y1 = plan.walls
    trim = Trim(style, roof)
    g = blank(w, h)
    wall(g, style, x0, y0, x1, y1, plan.openings(), lambda x: plan.roof.wall_top(x, y0))
    for x in plan.doors:
        stamp(g, trim.door, x, y1 - len(DOOR) + 1)
    for (x, y, extra, art) in plan.windows:
        stamp(g, trim.window(art), x, y)
        if extra == 'box':
            stamp(g, trim.box(len(art[0]) + 2), x - 1, y + len(art) - 1)
        elif extra == 'sill':
            stamp(g, [r[:len(art[0]) + 2] for r in SILL], x - 1, y + len(art))
    im = render(g)
    r = blank(w, h)
    plan.roof.draw(r, style, plain=snow)
    stacks = plan.stacks(style, trim.pots)
    for (cx, cy, art) in stacks:              # each chimney shades the roof to its right
        for y in range(cy + len(art) + 1):
            for x in (cx + len(art[0]) - 1, cx + len(art[0])):
                if r[y][x] in ROOF_SHADE:
                    r[y][x] = ROOF_SHADE[r[y][x]]
    if snow:
        r = [[SNOW_TONE.get(ch, ch) for ch in row] for row in r]
    im.alpha_composite(recolor(render(r), ROOF_COLOURS[roof]))
    c = blank(w, h)
    for (cx, cy, art) in stacks:
        stamp(c, art, cx, cy)
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
    """Every shape's layout. Hipped roofs start on row 4 so chimneys can rise above the roofline."""
    p = {}
    # Detached, farmhouse and apartment fronts are mirror-symmetric about a centred door.
    p['detached'] = (Plan(48, 48, HipRoof(1, 4, 46, 25), walls=(3, 26, 44, 46))
                     .door(16).window(5, 30, 'box').window(34, 30, 'box').chimney(32, 1, shift=-24))
    # A row unit is a door and a window; every piece keeps the same rhythm so a terrace reads
    # as evenly spaced homes, and the end pieces keep 2 px of wall at the corner. A handed
    # piece reverses the rhythm, so neighbours can pair their doors.
    p['row-left'] = (Plan(32, 48, HipRoof(1, 4, 31, 25, ends=(True, False)), walls=(3, 26, 31, 46))
                     .door(5).window(23, 30, 'box', 'small').chimney(12, 1, shift=8))
    p['row-middle'] = (Plan(32, 48, HipRoof(0, 4, 31, 25, ends=(False, False)), walls=(0, 26, 31, 46))
                       .door(3).window(22, 30, 'box', 'small').chimney(12, 1, shift=8))
    p['row-right'] = (Plan(32, 48, HipRoof(0, 4, 30, 25, ends=(False, True)), walls=(0, 26, 28, 46))
                      .door(2).window(20, 30, 'box', 'small').chimney(12, 1, shift=-8))
    p['row-left-handed'] = p['row-left'].handed('row-left').door(14).window(5, 30, 'box', 'small')
    p['row-middle-handed'] = p['row-middle'].handed('row-middle').door(13).window(3, 30, 'box', 'small')
    p['row-right-handed'] = p['row-right'].handed('row-right').door(11).window(2, 30, 'box', 'small')
    # The hut's walls run 1 px under its eave so a narrow window fits each side of the door.
    p['hut'] = (Plan(32, 32, HipRoof(1, 3, 30, 12), walls=(2, 13, 29, 30))
                .door(8).window(3, 16, 'sill', 'narrow').window(25, 16, 'sill', 'narrow')
                .chimney(20, 1, small=True, shift=-14))
    p['farmhouse'] = (Plan(64, 48, HipRoof(1, 4, 62, 25), walls=(3, 26, 60, 46))
                      .door(24).window(9, 30, 'box').window(46, 30, 'box')
                      .chimney(8, 1, shift=8).chimney(48, 1, shift=-8))
    a = Plan(64, 64, HipRoof(1, 4, 62, 15), walls=(3, 16, 60, 62))
    for x in (8, 21, 34, 47):
        a.window(x, 18, 'box' if x in (8, 47) else 'sill')
        a.window(x, 31, 'sill' if x in (8, 47) else 'box')
    a.door(24).window(8, 47, 'sill').window(47, 47, 'sill').chimney(10, 1, shift=8).chimney(46, 1, shift=-8)
    p['apartment'] = a
    p.update(townhouses())
    p.update(corners())
    # A small one-storey cottage for suburbs and outskirts, its gable to the road over a centred door.
    # It is named cabin, since cottage already names a style.
    p['cabin'] = (Plan(32, 48, GableRoof((1, 30), 28, 12), walls=(2, 29, 29, 46))
                  .door(8).window(3, 32, 'sill', 'narrow').window(25, 32, 'sill', 'narrow')
                  .window(14, 18, 'sill', 'narrow').chimney(17, 1, shift=-10))
    return p


def corners():
    """A corner house ends a dense terrace where a side street passes. Its main block fronts the street
    below and joins the terrace; a wing runs back along the side street, so it fronts both streets. The
    left version has its corner on the left; each is drawn, not mirrored, to keep the light."""
    left = (Plan(48, 64, WingRoof(1, 16, 47, 30, (True, False), GableRoof((1, 20), 26, 15)),
                 walls=(3, 31, 47, 62), joins='r')
            .door(5).window(24, 46, 'box').window(37, 46, 'box')
            .window(8, 32, 'sill').window(24, 32, 'box').window(37, 32, 'sill').chimney(32, 13, shift=-8))
    right = (Plan(48, 64, WingRoof(0, 16, 46, 30, (False, True), GableRoof((27, 46), 26, 15)),
                  walls=(0, 31, 44, 62), joins='l')
             .door(27).window(2, 46, 'box').window(15, 46, 'box')
             .window(2, 32, 'sill').window(15, 32, 'box').window(31, 32, 'sill').chimney(8, 13, shift=8))
    return {'corner-left': left, 'corner-right': right}


def townhouses():
    """Tall, narrow terrace pieces for a dense core, each with its own gable to the street, so a
    terrace reads as separate homes. Every piece shares one gable and one rhythm of door and windows,
    and comes handed too."""
    pieces = {'townhouse-left': ((2, 31), (1, 31), 'r'), 'townhouse-middle': ((0, 31), (0, 31), 'lr'),
              'townhouse-right': ((0, 29), (0, 30), 'l')}
    p = {}
    for shape, ((wx0, wx1), clip, joins) in pieces.items():
        p[shape] = (Plan(32, 64, GableRoof((0, 31), 30, 14, clip), walls=(wx0, 31, wx1, 62), joins=joins)
                    .door(4).window(22, 46, 'box', 'small')
                    .window(8, 32, 'sill', 'small').window(22, 32, 'box', 'small')
                    .window(12, 20, 'sill', 'small').chimney(18, 1, shift=-12))
        p[f'{shape}-handed'] = (p[shape].handed(shape).door(12).window(3, 46, 'box', 'small')
                                .window(3, 32, 'box', 'small').window(17, 32, 'sill', 'small')
                                .window(12, 20, 'sill', 'small'))
    return p


def footprint(plan):
    return [plan.w // TILE, plan.h // TILE]


def build():
    sheet = Sheet('houses')
    for shape, plan in plans().items():
        night = f'house_{shape}_night'
        joins = {'joins': plan.joins} if plan.joins else {}
        for style in STYLES:
            snow = f'house_{style}_{plan.roof_of or shape}_snow'
            for roof in ROOF_COLOURS:
                im = draw_house(plan, style, roof)
                doors = [[x + len(DOOR[0]) // 2, plan.walls[3]] for x in plan.doors]
                sheet.add(f'house_{style}_{shape}_roof-{roof}', im, footprint=footprint(plan),
                          door=doors[0], night=night, snow=snow, **joins)
            if plan.roof_of:
                continue
            bare = draw_house(plan, style, 'terracotta')
            sheet.add(snow, overlay(bare, draw_house(plan, style, 'terracotta', snow=True)),
                      footprint=footprint(plan), layer='snow')
        sheet.add(night, draw_night(plan), footprint=footprint(plan), layer='night')
    return sheet


if __name__ == '__main__':
    build().save()
