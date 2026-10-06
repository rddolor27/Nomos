"""Culture: festival decorations, culture emblems and banners, and everyday dishes.

Nomos's cultures are fictional and learned (content rule 8). They shape preferences only, never
show on a body or in clothing, and never map to a real ethnicity, nation or religion. So culture
lives in things: decorations a festival puts up, emblems for the inspector, the culture lens and
banners, and dishes found across many cultures rather than iconic to one.

GBA-era top-down pixel art in the shared palette, lit from the top left. Every sprite is a
hand-drawn ASCII grid; the large pieces are stamped together from hand-drawn parts. Props and
icons get the shared 1-px OUTLINE ring, except three thin unringed layers: the cord of the
lanterns and bunting, the bonfire's sparks and the stall's steam.

Nothing here uses the six body hues, so no emblem or dish can be read as belonging to a body
colour, and the blob stays the only thing on the map in those colours. Emblems avoid religious
and national symbols (no crosses, crescents, six-pointed stars, hooked shapes, yin-yang, triple
spirals, maple leaves or real flags), and none suggests wealth: the diamond is a folk lozenge,
not a gem.

Build: python tools/sprites/culture.py
"""
import spritekit as sk

# One key for every grid, as in icons.py. Upper case is the lighter tone of a pair.
KEY = sk.cmap(
    O='OUTLINE', W='WHITE',
    C='CREAM', c='CREAM_D',
    S='SAND', s='SAND_D',
    T='WOOD_L', t='WOOD', u='WOOD_D',
    G='GRASS_L', g='GRASS', f='LEAF_D',
    E='TEAL', e='TEAL_D',
    A='WATER_L', a='WATER',
    N='NAVY', n='NAVY_D',
    **{'1': 'STONE_L', '2': 'STONE', '3': 'STONE_D'},
    R='ROOF', r='ROOF_D',
    V='VERMILLION',
    Y='GOLD',
    P='PINK', p='PINK_D',
    M='PLUM',
)


def _check(rows, name, w=None, h=None):
    width = len(rows[0])
    if any(len(r) != width for r in rows):
        raise ValueError(f'{name}: ragged rows')
    if (w and width != w) or (h and len(rows) != h):
        raise ValueError(f'{name}: grid is {width}x{len(rows)}, expected {w}x{h}')
    return rows


def grid(rows, name='grid'):
    return sk.from_ascii(_check(rows, name), KEY)


def outlined(rows, name='prop'):
    """A prop drawn as fills, padded and ringed with the shared outline."""
    return sk.add_outline(sk.pad(grid(rows, name)))


def icon(rows, size, name):
    """An inspector icon: fills inside a clear 1-px border, ringed with the shared outline."""
    _check(rows, name, size, size)
    if rows[0].strip('.') or rows[-1].strip('.') or any(r[0] != '.' or r[-1] != '.' for r in rows):
        raise ValueError(f'{name}: keep a clear 1-px border for the outline')
    return sk.add_outline(grid(rows, name))


def _outer(rows, dx, dy):
    """True if the part pixel at (dx, dy) touches transparency or the part's edge."""
    for nx, ny in ((dx - 1, dy), (dx + 1, dy), (dx, dy - 1), (dx, dy + 1)):
        if ny < 0 or ny >= len(rows) or nx < 0 or nx >= len(rows[ny]) or rows[ny][nx] in '. ':
            return True
    return False


class Canvas:
    """A grid of KEY symbols ('.' is transparent) that hand-drawn parts are stamped onto."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = [['.'] * w for _ in range(h)]

    def put(self, x, y, ch):
        if ch not in '. ' and 0 <= x < self.w and 0 <= y < self.h:
            self.a[y][x] = ch

    def get(self, x, y):
        return self.a[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def stamp(self, x, y, rows):
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                self.put(x + dx, y + dy, ch)

    def prop(self, x, y, rows):
        """Stamp a part drawn with its own OUTLINE ring. Ring pixels over transparency are
        skipped, so the final add_outline draws them and every outline stays 1 px wide."""
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == 'O' and self.get(x + dx, y + dy) == '.' and _outer(rows, dx, dy):
                    continue
                self.put(x + dx, y + dy, ch)

    def rows(self):
        return [''.join(r) for r in self.a]

    def image(self):
        return sk.add_outline(grid(self.rows()))


def layer(w, h, rows, x=0, y=0):
    """Place a small hand-drawn grid at (x, y) on an empty w x h grid, ready for overlay()."""
    out = [['.'] * w for _ in range(h)]
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch != '.':
                out[y + dy][x + dx] = ch
    return [''.join(r) for r in out]


def overlay(im, rows):
    """Composite an unringed layer (the cord, sparks or steam) over a finished, ringed sprite."""
    out = im.copy()
    out.alpha_composite(grid(rows))
    return out


# =============================================================================== festival
# ---------------------------------------------------------------- lanterns and bunting
# Both strips are 32x16 and tile horizontally: the cord sags between the tile edges, where it
# sits on row 1, so any run of strips (and any mix of lantern colours) joins seamlessly.
SAG = [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4,
       4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 1, 1]
STRIP_W, STRIP_H = 32, 16


def cord_rows():
    """The cord as an unringed layer: one dark pixel per column."""
    rows = [['.'] * STRIP_W for _ in range(STRIP_H)]
    for x, y in enumerate(SAG):
        rows[y][x] = 'u'
    return [''.join(r) for r in rows]


# A round paper lantern: wooden caps, a glowing core, shade at the lower right.
# k = cap, L = core, B = body, D = shade, H = hot centre.
LANTERN = [
    "..kk..",
    ".BLLB.",
    "BLHLBB",
    "BLLLBD",
    "BBLBBD",
    ".BBDD.",
    "..kk..",
]
LANTERN_COLOURS = {
    'gold': dict(k='t', L='C', B='Y', D='R', H='W'),
    'vermillion': dict(k='t', L='Y', B='V', D='r', H='C'),
    'teal': dict(k='t', L='A', B='E', D='e', H='W'),
}
LANTERN_X = (5, 21)          # left column of each lantern; the cord sits on row 3 above both


def lanterns(colour):
    ramp = LANTERN_COLOURS[colour]
    c = Canvas(STRIP_W, STRIP_H)
    part = [''.join(ramp.get(ch, ch) for ch in row) for row in LANTERN]
    for x in LANTERN_X:
        c.stamp(x, SAG[x + 2] + 1, part)
    return overlay(c.image(), cord_rows())


# Pennants hang from the cord, so each column of a flag starts just under the cord.
FLAG = [3, 5, 6, 5, 3]                       # column heights of a 5-wide pennant
FLAG_X = (2, 10, 18, 26)                     # left column of each pennant
FLAG_COLOURS = [('V', 'r'), ('Y', 'R'), ('E', 'e'), ('P', 'p')]


def bunting():
    c = Canvas(STRIP_W, STRIP_H)
    for (base, shade), x0 in zip(FLAG_COLOURS, FLAG_X):
        for i, height in enumerate(FLAG):
            x = x0 + i
            for d in range(1, height + 1):
                c.put(x, SAG[x] + d, shade if i == len(FLAG) - 1 else base)
    return overlay(c.image(), cord_rows())


# ---------------------------------------------------------------- arch
# A plain garden arch for a festival gate: two posts on stone footings, a bent wooden frame and
# a leafy garland with small flowers that wraps the top of each post. 48x48, three tiles wide,
# 30 px open between the posts.
ARCH = [
    '................................................',
    '................................................',
    '.......................ff.......................',
    '..................ggffffgfggGG..................',
    '..............ggffGGPPfgggggGGGGff..............',
    '..............ggffGGPpgfggVVGGGGff..............',
    '............GGfgfgggGGffGGVrffggGGGG............',
    '..........GGGGYYgfggGGffGGffffggWWGGGG..........',
    '..........fgGGYRggGGTTTTttttGGggWcfgGG..........',
    '.........fgfGGffggTTTTTTttttttgggggfGGg.........',
    '.........gGGfgGGTTT..........tttffGGfff.........',
    '.......GgfWWgfGTT..............ttfGGYYfff.......',
    '.......gggWcGGTT................ttGGYRfff.......',
    '.......fgggfGTT..................ttgggffg.......',
    '......ggGGfgTT....................ttgggggg......',
    '......ggGGgfTT....................ttgggggg......',
    '.....gGGggfTT......................ttgfffgf.....',
    '.....fGVVgftt......................ttgfPPff.....',
    '.....gGVrGgt........................tggPpff.....',
    '....ggGGGGgf........................fgggffff....',
    '....GGffggff........................ffggffff....',
    '....GGffggf..........................fggffff....',
    '....fgGGfg............................ffffgg....',
    '....gfGGff............................ffggff....',
    '.....Gfgf..............................fffg.....',
    '.....Tttu..............................Tttu.....',
    '....gTttu.............................gTttu.....',
    '....fTgtu.............................fTgtu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttug.............................Tttug....',
    '.....Ttguf.............................Ttguf....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '....gTttu.............................gTttu.....',
    '....fTgtu.............................fTgtu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '.....Tttu..............................Tttu.....',
    '....111111............................111111....',
    '....222223............................222223....',
    '....222223............................222223....',
    '....222223............................222223....',
    '....333333............................333333....',
    '................................................',
]


# ---------------------------------------------------------------- bonfire
# Back stones, then the flame, then a teepee of logs, then the front stones. Two flame frames
# flicker; logs and stones never move. Sparks are an unringed layer.
FLAMES = [
    [
        "........V.........",
        "........VV........",
        ".......VVV........",
        ".......VYV........",
        "......VVYV........",
        "......VYYVV.......",
        "..V...VYYYV.......",
        "..VV..VYCYV....V..",
        "..VV.VVYCYVV...VV.",
        ".VYV.VYYCYYV..VVV.",
        ".VYVVVYCCCYV..VYV.",
        ".VYYVYYCCCYVV.VYV.",
        "VVYYVYCCWCCYVVVYV.",
        "VYYYYYCCWCCYYVYYV.",
        "VYYCYYCWWWCCYYYYV.",
        "VYYCCYCWWWCCYYCYV.",
        "VYCCCCCWWWCCCCCYV.",
        "VYCCCCWWWWWCCCCYV.",
        "VYYCCCWWWWWCCCYYV.",
        ".VYCCCCWWWCCCCYV..",
        ".VYYCCCCCCCCCYYV..",
        "..VYYYCCCCCCYYV...",
        "...VVYYYYYYYYV....",
        ".....VVVVVVVV.....",
    ],
    [
        ".........V........",
        "........VV........",
        "........VVV.......",
        ".......VVYV.......",
        "...V...VYYV.......",
        "...VV..VYYV.......",
        "..VVV.VVYCV.......",
        "..VYV.VYYCVV......",
        "..VYVVVYCCYV...V..",
        ".VYYVVYYCCYV..VV..",
        ".VYYVYYCCCYVV.VV..",
        ".VYYYYCCCCYVVVYV..",
        "VVYCYYCCWCCYVYYV..",
        "VYYCYYCWWCCYYYYVV.",
        "VYYCCYCWWWCCYYYYV.",
        "VYCCCYCWWWCCYYCYV.",
        "VYCCCCCWWWCCCCCYV.",
        "VYCCCCWWWWWCCCCYV.",
        "VYYCCCWWWWWCCCYYV.",
        ".VYCCCCWWWCCCCYV..",
        ".VYYCCCCCCCCCYYV..",
        "..VYYYCCCCCCYYV...",
        "...VVYYYYYYYYV....",
        ".....VVVVVVVV.....",
    ],
]
LOGS = [
    "....................",
    "........TTtu........",
    ".......TtuTtu.......",
    ".......TtuTtu.......",
    "......TtuTtTtu......",
    ".....Ttu.Tt.Ttu.....",
    ".....Ttu.Tt..Ttu....",
    "....Ttu..Tt..Ttu....",
    "...Ttu...Tt...Ttu...",
    "..Ttu....Tt....Ttu..",
    "..Ttu....Tt....Ttu..",
    ".Ttu.....Tt.....Ttu.",
]
STONE = [
    ".OOOO.",
    "O1112O",
    "O2223O",
    ".OOOO.",
]
BACK_STONES = [(1, 21), (25, 21)]
FRONT_STONES = [(0, 24), (4, 26), (9, 27), (17, 27), (22, 26), (26, 24)]
SPARKS = [
    [(11, 4), (21, 2), (19, 8)],
    [(12, 2), (22, 6), (6, 7)],
]


def bonfire(frame):
    c = Canvas(32, 32)
    for x, y in BACK_STONES:
        c.prop(x, y, STONE)
    c.stamp(7, 3, FLAMES[frame])
    c.stamp(6, 18, LOGS)
    for x, y in FRONT_STONES:
        c.prop(x, y, STONE)
    sparks = [['.'] * 32 for _ in range(32)]
    for x, y in SPARKS[frame]:
        sparks[y][x] = 'Y'
    return overlay(c.image(), [''.join(r) for r in sparks])


# ---------------------------------------------------------------- food stall
# A festival food stall: a PLUM-and-GOLD striped canopy with a pointed valance (the shops'
# stalls are teal and cream with scallops), a cloth-draped counter, grilled skewers, a stew pot
# with steam and a stack of flatbreads. 48x48, three tiles wide.
STALL_W, STALL_H = 48, 48


def _stripe(x):
    return 'M' if ((x - 1) // 4) % 2 == 0 else 'Y'


POT = [                       # rim, stew, lip, a body with two handles
    "...OOOOOOOO...",
    "..O11111111O..",
    ".O1uuuuuuuu3O.",
    ".O1RSRgRVRR3O.",
    "OO1111122223OO",
    "O2O12222223O3O",
    "O3O12222223O3O",
    ".OO12222223OO.",
    "...O333333O...",
    "....OOOOOO....",
]
SKEWERS = [                   # two skewers on a grill tray
    ".RRVVRRgg.",
    "TrrVrrrffT",
    "OOOOOOOOOO",
    ".VVRRggRR.",
    "TrrrffrrrT",
    "1111111111",
    "2222222223",
]
BREADS = [                    # two flatbreads stacked, low enough to see a vendor behind
    "..OOOOOOO..",
    ".OSSCSSSsO.",
    "OSCSSuSSSsO",
    "OTTTTTTTTtO",
    ".OSSSSSSsO.",
    "OSSuSSSSssO",
    "OTTTTTTTTtO",
    ".OOOOOOOOO.",
]
HANG_LANTERN = [
    ".O.",
    "OuO",
    "OYO",
    "CYR",
    "YYR",
    "OYO",
]
STEAM = [                     # two wisps rising from the pot
    ".W.....",
    "W....W.",
    "W.....W",
    ".W....W",
    ".W...W.",
    ".....W.",
]


def food_stall():
    c = Canvas(STALL_W, STALL_H)
    # canopy: lit back rows, stripes, a dark fold, then pointed tips on every stripe
    for x in range(1, STALL_W - 1):
        s = _stripe(x)
        lit = {'M': 'p', 'Y': 'C'}[s]
        fold = {'M': 'n', 'Y': 'R'}[s]
        for y in range(1, 8):
            c.put(x, y, lit if y <= 2 else s)
        c.put(x, 8, fold)
        depth = 3 if (x - 1) % 4 in (1, 2) else 1
        for y in range(9, 9 + depth):
            c.put(x, y, s if y < 8 + depth else fold)
    # posts
    for x0 in (2, STALL_W - 5):
        for y in range(10, 34):
            for dx, ch in enumerate('Ttu'):
                c.put(x0 + dx, y, ch)
    # counter: sand top, a gold trim band and a plum cloth drape with folds
    ct = 33
    for x in range(1, STALL_W - 1):
        c.put(x, ct, 'S')
        c.put(x, ct + 1, 'T')
        c.put(x, ct + 2, 'O')
        c.put(x, ct + 3, 'Y')
        c.put(x, ct + 4, 'R')
        for y in range(ct + 5, STALL_H - 1):
            c.put(x, y, 'p' if (x + 1) % 6 == 0 else 'n' if (x + 4) % 6 == 0 else 'M')
    # food on the counter (the middle stays low, so a vendor behind it shows), small lanterns
    c.prop(5, ct - 7, SKEWERS)
    c.prop(16, ct - 7, BREADS)
    c.prop(29, ct - 9, POT)
    for x in (9, STALL_W - 12):
        c.prop(x, 12, HANG_LANTERN)
    return overlay(c.image(), layer(STALL_W, STALL_H, STEAM, 32, ct - 15))


# ---------------------------------------------------------------- music stage
# A small raised stage: a peaked red canopy with a gold scalloped valance, a plum curtain, two
# posts, a board floor big enough for three blobs, a boarded front and a step up.
STAGE_W, STAGE_H = 64, 58
FLOOR_Y, FRONT_Y = 36, 48     # first floor row, and the front edge below the floor
CURTAIN = 'pMMMnM'            # one fold of the curtain, repeated across
STEP = [
    "OOOOOOOOOOOOOO",
    "OSSSSSSSSSSSSO",
    "OTTTTTTTTTTTTO",
    "OOOOOOOOOOOOOO",
    "OttttttttttttO",
    "OttttttttttttO",
    "OuuuuuuuuuuuuO",
]


def stage():
    c = Canvas(STAGE_W, STAGE_H)
    # canopy: a low peaked fabric roof, lit along its top edge, seamed every 8 px
    for x in range(1, STAGE_W - 1):
        top = 1 + abs(2 * x - (STAGE_W - 1)) // 10
        for y in range(top, 11):
            c.put(x, y, 'P' if y <= top + 1 else 'r' if (x - 4) % 8 == 0 else 'V')
    # curtain backdrop with vertical folds and a shadowed hem
    for y in range(11, FLOOR_Y):
        for x in range(6, STAGE_W - 6):
            c.put(x, y, 'n' if y == FLOOR_Y - 1 else CURTAIN[(x - 6) % len(CURTAIN)])
    # valance: a gold band with scallops
    for x in range(1, STAGE_W - 1):
        k = (x - 1) % 6
        c.put(x, 11, 'Y')
        if 1 <= k <= 4:
            c.put(x, 12, 'Y' if k <= 2 else 'R')
        if k in (2, 3):
            c.put(x, 13, 'R')
    # posts at the front corners
    for x0 in (3, STAGE_W - 6):
        for y in range(12, FRONT_Y):
            for dx, ch in enumerate('Ttu'):
                c.put(x0 + dx, y, ch)
    # floor boards running front to back, each with one staggered joint
    for y in range(FLOOR_Y, FRONT_Y):
        for x in range(1, STAGE_W - 1):
            board, k = divmod(x - 1, 4)
            joint = y - FLOOR_Y == (board * 5) % 12
            c.put(x, y, 's' if k == 0 or joint else 'C' if y == FLOOR_Y else 'S')
    # front edge, boarded front and a step up
    for x in range(1, STAGE_W - 1):
        c.put(x, FRONT_Y, 'O')
        for y in range(FRONT_Y + 1, STAGE_H - 1):
            c.put(x, y, 'T' if y == FRONT_Y + 1 else 'u' if x % 6 == 0 else 't')
    c.prop(25, STAGE_H - 1 - len(STEP), STEP)
    for x in (8, STAGE_W - 11):
        c.prop(x, 14, HANG_LANTERN)
    return c.image()


# ---------------------------------------------------------------- instruments
# Instruments are sized against the 16-px blob: a drum about two thirds its height, a lute
# about as tall, a flute about as long as the blob is wide.
DRUM = [                      # skin, gold hoops, a red shell with laced cord
    "..CCCCCC..",
    "CCWCCCCCcc",
    "YcCCCCCccR",
    "YYYYYYYYRR",
    "VCVVVCVVrC",
    "PVCVCVCVCr",
    "PVVCVVVCrr",
    "YYYYYYYYRR",
    ".YYYYYYRR.",
]
LUTE = [                      # a plucked string instrument: pegbox, neck, pear body
    "..tt..",
    ".1tt1.",
    "..Tu..",
    "..Cu..",
    "..Cu..",
    "..Cu..",
    ".TCCt.",
    "TSCCSt",
    "TSuuSt",
    "TSuuSt",
    "TSCCSt",
    "TSWWSt",
    ".TSSt.",
    "..tu..",
]
FLUTE = [                     # a wooden flute lying down: gold end bands, finger holes
    "YTuTTTuTuTuTTY",
    "YttttttttttttY",
]


# =============================================================================== emblems
# Each culture has an emblem and a colour, which banners and the culture lens share. The colours
# are mid tones, unlike the pastel body hues, and avoid the police navy, the merchant teal and
# the reds and oranges that round 3 keeps for crime, so culture never lines up with a body
# colour, a job or crime.
CULTURE_COLOURS = {           # palette name, then the banner trim's light, base and shade
    'leaf': ('GRASS', 'G', 'g', 'f'),
    'wave': ('WATER', 'A', 'a', '3'),
    'sunburst': ('SAND_D', 'S', 's', 't'),
    'spiral': ('LEAF_D', 'g', 'f', '3'),
    'diamond': ('STONE', '1', '2', '3'),
    'mountain': ('PLUM', 'p', 'M', '3'),
    'flower': ('PINK_D', 'P', 'p', 'M'),
    'feather': ('WOOD_L', 'S', 'T', 't'),
}

EMBLEM_16 = {
    'leaf': [                 # one leaf with a midrib and veins
        "................",
        "................",
        ".............f..",
        "..........gGf...",
        ".......GGGgfg...",
        "......GGGGfGf...",
        ".....GGgGfgf....",
        "....GGGgfGGf....",
        "....GGGfGGgf....",
        "....Ggfgggf.....",
        "....GfGGgf......",
        "....fgggf.......",
        "...f............",
        "..f.............",
        "................",
        "................",
    ],
    'wave': [                 # three rolling bands
        "................",
        "..AA....AA....A.",
        ".AaaA..AaaA..Aa.",
        ".aaaaAAaaaaAAaa.",
        ".a..aaaa..aaaa..",
        "................",
        "..AA....AA....A.",
        ".AaaA..AaaA..Aa.",
        ".aaaaAAaaaaAAaa.",
        ".a..aaaa..aaaa..",
        "................",
        "..AA....AA....A.",
        ".AaaA..AaaA..Aa.",
        ".aaaaAAaaaaAAaa.",
        ".a..aaaa..aaaa..",
        "................",
    ],
    'sunburst': [             # a disc with eight short rays, no face
        "................",
        ".......ss.......",
        "..ss...st...ss..",
        "..st........st..",
        "......Ssss......",
        ".....SSssss.....",
        "....SSssssss....",
        ".ss.Ssssssst.ss.",
        ".st.ssssssst.st.",
        "....sssssstt....",
        ".....sssstt.....",
        "......tttt......",
        "..ss........ss..",
        "..st...ss...st..",
        ".......st.......",
        "................",
    ],
    'spiral': [               # a single rounded spiral, two turns
        "................",
        "....gfffffff....",
        "..gffffffffff3..",
        ".gff........ff3.",
        ".ff..gfffff..f3.",
        ".ff.gffffff3.f3.",
        ".ff.ff....f3.f3.",
        ".ff.ff.gf.f3.f3.",
        ".ff.ff.f3.f3.f3.",
        ".ff.ff.f3.f3.f3.",
        ".ff.ff.ffff3.f3.",
        ".f3.ff.3333..f3.",
        "....ff......ff3.",
        "....fffffffff3..",
        ".....33333333...",
        "................",
    ],
    'diamond': [              # a nested folk lozenge
        "................",
        ".......22.......",
        "......2222......",
        ".....22CC22.....",
        "....22CCCC22....",
        "...22CC22CC22...",
        "..22CCW222CC22..",
        ".22CC222222CC22.",
        ".22CC222333cc33.",
        "..22CC2233cc33..",
        "...22CC23cc33...",
        "....22CCcc33....",
        ".....22Cc33.....",
        "......2233......",
        ".......23.......",
        "................",
    ],
    'mountain': [             # two snow-capped peaks
        "................",
        "................",
        "......W.........",
        ".....WW1........",
        ".....WW1...W....",
        "....MWM13.W11...",
        "....MMM33.p13...",
        "...MMMMM33pp33..",
        "...MMMMM33pp33..",
        "..MMMMMM333p333.",
        "..MMMMMMM33pp33.",
        ".MMMMMMMM333p33.",
        ".MMMMMMMM333p33.",
        ".MMMMMMMMM33333.",
        "................",
        "................",
    ],
    'flower': [               # five round petals around a gold centre
        "................",
        "......PPpp......",
        ".....PPpppp.....",
        ".....PppppM.....",
        "..PPpMpppMMPpp..",
        ".PPpppMppMPpppp.",
        ".PppppMYYMppppM.",
        ".ppppMYYYYpppMM.",
        ".pppMMYYRRMpMMM.",
        "...MMppRRPpMM...",
        "...PpppMPpppM...",
        "..PppppMPpppMM..",
        "...pppMMpppMM...",
        "...ppMM..ppMM...",
        "................",
        "................",
    ],
    'feather': [              # a quill feather with a notch in its vane
        "................",
        "....TT..........",
        "....tCT.........",
        "...ttCTS........",
        "....ttCTS.......",
        "....ttCTTS......",
        ".....ttCTTS.....",
        ".....ttCTS......",
        "......ttCTTS....",
        "......ttCTTS....",
        ".......ttCTS....",
        "........tCT.....",
        "..........C.....",
        "..........C.....",
        "...........C....",
        "................",
    ],
}

EMBLEM_8 = {
    'leaf': [
        "........",
        "....GGf.",
        "...GGfg.",
        "..GGfgf.",
        "..Gfgf..",
        ".gfff...",
        ".f......",
        "........",
    ],
    'wave': [                 # two rolling crests (not two zigzags, which read as a zodiac glyph)
        "........",
        "..AAA...",
        ".AaaaAA.",
        ".a...aa.",
        "..AAA...",
        ".AaaaAA.",
        ".a...aa.",
        "........",
    ],
    'sunburst': [
        "........",
        ".s.Ss.s.",
        "..Ssss..",
        ".Ssssst.",
        ".sssstt.",
        "..sstt..",
        ".s.tt.t.",
        "........",
    ],
    'spiral': [
        "........",
        "..gfff..",
        ".f....3.",
        ".f.ff.3.",
        ".f.f..3.",
        ".f..33..",
        "..f.....",
        "........",
    ],
    'diamond': [
        "........",
        "...22...",
        "..2222..",
        ".22CC22.",
        ".22Cc33.",
        "..2233..",
        "...23...",
        "........",
    ],
    'mountain': [
        "........",
        "...W....",
        "..WW1...",
        "..MW3.W.",
        ".MMM3p1.",
        ".MMM3p3.",
        ".MMM3p3.",
        "........",
    ],
    'flower': [
        "........",
        "...Pp...",
        ".Pppppp.",
        ".ppYYpM.",
        "..pYYM..",
        ".ppMppM.",
        ".pM..pM.",
        "........",
    ],
    'feather': [
        "........",
        ".T......",
        ".tTS....",
        ".tCTS...",
        "..tCTS..",
        "...tCT..",
        "......C.",
        "........",
    ],
}

# A cream banner hanging from a rod on a pole, trimmed in the culture's colour, with a
# swallowtail. L, K and k are the trim's light, base and shade; the 8x8 emblem goes at EMBLEM_AT.
BANNER = [
    "................",
    ".TTTTTTTTTTTTTT.",
    ".tttttttttttttt.",
    "..LKKKKKKKKKKk..",
    "..LKKKKKKKKKKk..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..WCCCCCCCCCCc..",
    "..LKKKKKKKKKKk..",
    "..LKKKKKKKKKKk..",
    "..LKKKk..LKKKk..",
    "..LKKk.Tt.LKKk..",
    "..LKk..Tt..LKk..",
    "..Lk...Tt...Lk..",
    ".......Tt.......",
    ".......Tt.......",
    ".......Tt.......",
    ".......Tt.......",
    ".......Tt.......",
    ".......Tt.......",
    ".....111111.....",
    ".....222223.....",
    ".....333333.....",
    "................",
]
EMBLEM_AT = (4, 6)


def banner(name):
    _, light, base, shade = CULTURE_COLOURS[name]
    rows = [r.replace('L', light).replace('K', base).replace('k', shade) for r in BANNER]
    im = sk.add_outline(grid(rows, f'banner {name}'))
    im.alpha_composite(icon(EMBLEM_8[name], 8, name), EMBLEM_AT)
    return im


# =============================================================================== dishes
DISH_16 = {
    'stew': [                 # a stew pot with two handles
        "................",
        "................",
        "................",
        "....11111111....",
        "...1rrrrrrrr2...",
        "...1RSRgRVRR2...",
        "..111111222223..",
        ".21222222222333.",
        ".31222222222333.",
        "..122222222233..",
        "..122222222233..",
        "...1222222233...",
        "....33333333....",
        "................",
        "................",
        "................",
    ],
    'soup': [                 # a bowl of soup with herbs and a swirl of cream
        "................",
        "................",
        "................",
        "................",
        "................",
        "...AAAAAAAAAA...",
        "..ARRCCRRRRRRa..",
        ".ARCRRRRgRRRRRa.",
        ".ARRRRRRRRRgRRa.",
        ".AAAaaaaaaaaaaN.",
        ".aaaaaaaaaaaaaN.",
        "..aaaaaaaaaaaN..",
        "...aaaaaaaaaN...",
        ".....NNNNNN.....",
        "................",
        "................",
    ],
    'flatbread': [            # a round flatbread with toasted spots
        "................",
        "................",
        "................",
        "................",
        "................",
        "...SSSSSSSSSS...",
        ".SSCCSSSuSSSSSs.",
        ".SCSSSuSSSSTSSs.",
        ".SSSTSSSSSuSSss.",
        "..sSSSSSSSSSss..",
        "...TTTTTTTTTT...",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    'loaf': [                 # a loaf with its cut end showing the crumb
        "................",
        "................",
        "................",
        "...TTTT.........",
        "..TCCCCTSSSSS...",
        ".TCCCCCCTSSSSSs.",
        ".TCcCCCCTSSSSSs.",
        ".TCCCCcCTTTTTTt.",
        ".TCCCCCCTTTTTTt.",
        ".TCcCCCCTTTTTTt.",
        ".TCCCCcCTTTTTtu.",
        ".TCCCCCCTttttuu.",
        ".TTTTTTTTuuuuu..",
        "................",
        "................",
        "................",
    ],
    'porridge': [             # a wooden bowl of porridge with berries and a spoon
        "................",
        "................",
        "...........11...",
        "..........112...",
        ".........112....",
        "........112.....",
        "....SSSS1SS.....",
        "...SCSSSSSSs....",
        "..SSSVSSPSSss...",
        ".TTTTTTTTTTTTTt.",
        ".ttttttttttttuu.",
        "..ttttttttttuu..",
        "...ttttttttuu...",
        ".....uuuuuu.....",
        "................",
        "................",
    ],
    'pie': [                  # a lattice pie in a tin
        "................",
        "................",
        "................",
        "................",
        "....STSTSTST....",
        "..TCSSSSSSSSST..",
        ".SVVSVVSVVSVVVs.",
        ".TSSSSSSSSSSSss.",
        ".SrVSrVSrVSrrrs.",
        "..STSTSTSTSTST..",
        ".12222222222233.",
        "..333333333333..",
        "................",
        "................",
        "................",
        "................",
    ],
    'skewer': [               # grilled pieces and a pepper on a stick
        "................",
        "................",
        ".............TT.",
        "..........TRRr..",
        "..........RRrr..",
        "..........Rrru..",
        ".........TT.....",
        "......PVVr......",
        "......VVVr......",
        "......Vrrr......",
        ".....TT.........",
        "..TRRr..........",
        "..RRrr..........",
        "..Rrru..........",
        ".TT.............",
        "................",
    ],
    'salad': [                # a bowl of leaves with tomato
        "................",
        "................",
        "................",
        "................",
        ".....G..G.......",
        "...GGgGGgG.G....",
        "..GgGgVVgGgGG...",
        ".gGgfGVrGgfGgf..",
        ".WWWWWWWWWWWWWc.",
        ".CCCCCCCCCCCCcc.",
        "..CCCCCCCCCCcc..",
        "...CCCCCCCCcc...",
        ".....cccccc.....",
        "................",
        "................",
        "................",
    ],
    'noodles': [              # a bowl of noodles, strands over the rim
        "................",
        "................",
        "................",
        "................",
        "......CC........",
        "...CCSCCSCCC....",
        "..CSCCSCCSCCSC..",
        "..SCCSgCCSCCSC..",
        ".CCSCCSCCgCCSCC.",
        ".VCVVVVVVVVVCVr.",
        ".PCVVVVVVVVVCrr.",
        "..CVVVVVVVVVrr..",
        "...VVVVVVVVrr...",
        ".....rrrrrr.....",
        "................",
        "................",
    ],
    'dumplings': [            # a pile of pleated dumplings on a board
        "................",
        "................",
        "......cCcC......",
        ".....cCWCCc.....",
        ".....CCCCcc.....",
        "................",
        "..cCcC...cCcC...",
        ".cCWCCc.cCWCCc..",
        ".CWCCCc.CWCCCc..",
        ".CCCCcc.CCCCcc..",
        "..cccc...cccc...",
        ".TTTTTTTTTTTTTt.",
        ".tttttttttttttu.",
        "................",
        "................",
        "................",
    ],
    'roast': [                # a roast bird on a platter
        "................",
        "................",
        "................",
        "................",
        ".....RRRRR......",
        "...RRSSRRRRr....",
        "..RSSRRRRRRrr...",
        ".CRRRRRRRRRrrrC.",
        ".CTRRRRRRRRrruC.",
        "..RRRRRRRRrrr...",
        ".gWWWWWWWWWWWcg.",
        ".CCCCCCCCCCCCcc.",
        "..cccccccccccc..",
        "................",
        "................",
        "................",
    ],
    'pickles': [              # a jar of pickles with a wooden lid
        "................",
        "....TTTTTTTT....",
        "....tttttttt....",
        "....AAAAAAAA....",
        "...ASSSSSSSSa...",
        "...WGgSGgSGga...",
        "...AGgSGgSGga...",
        "...AGgSGgSGga...",
        "...AGgSGgSGga...",
        "...AGgSGgSGga...",
        "...AgfSgfSgfa...",
        "...ASffSffSfa...",
        "...ASSSSSSSSa...",
        "....aaaaaaaa....",
        "................",
        "................",
    ],
}

DISH_8 = {
    'stew': [
        "........",
        "........",
        "..1111..",
        "..RSgR..",
        ".211223.",
        "..1223..",
        "..3333..",
        "........",
    ],
    'soup': [
        "........",
        "........",
        "........",
        ".ARCRRa.",
        ".AAaaaN.",
        "..aaaN..",
        "...NN...",
        "........",
    ],
    'flatbread': [
        "........",
        "........",
        "........",
        "..SSSS..",
        ".SCuSSs.",
        ".sSSuss.",
        "..TTTT..",
        "........",
    ],
    'loaf': [
        "........",
        "..TTT...",
        ".TCCTSS.",
        ".TCCTSs.",
        ".TCCTTt.",
        ".TTTTtt.",
        "........",
        "........",
    ],
    'porridge': [
        "........",
        "......1.",
        "..SSS1..",
        ".SCVSSs.",
        ".TTTTTt.",
        "..tttu..",
        "...uu...",
        "........",
    ],
    'pie': [
        "........",
        "........",
        "..STST..",
        ".SVSVVs.",
        ".SSSSSs.",
        ".STSTSs.",
        ".122223.",
        "........",
    ],
    'skewer': [
        "........",
        "......T.",
        "....PV..",
        "....Vr..",
        "..RR....",
        "..Rr....",
        ".T......",
        "........",
    ],
    'salad': [
        "........",
        "..G.G...",
        ".GgVgGf.",
        ".gGgfgf.",
        ".WWWWWc.",
        "..CCCc..",
        "...cc...",
        "........",
    ],
    'noodles': [
        "........",
        "........",
        "..CSCS..",
        ".CSCgCC.",
        ".VCVVCr.",
        "..VVVr..",
        "...rr...",
        "........",
    ],
    'dumplings': [
        "........",
        "........",
        "..cCcC..",
        ".cCWCCc.",
        ".CCCCcc.",
        ".TTTTTt.",
        "..tttt..",
        "........",
    ],
    'roast': [
        "........",
        "........",
        "..RRRr..",
        ".RSRRrr.",
        ".CRRRrC.",
        ".WWWWWc.",
        "..cccc..",
        "........",
    ],
    'pickles': [
        "........",
        "..TTTT..",
        "..tttt..",
        ".AGSGSa.",
        ".WgSgSa.",
        ".AgSgfa.",
        "..aaaa..",
        "........",
    ],
}


# =============================================================================== sheet
def build():
    sheet = sk.Sheet('culture')
    # strips join left and right; cord_row is where the cord meets both tile edges
    for colour in LANTERN_COLOURS:
        sheet.add(f'festival_lanterns_{colour}', lanterns(colour), joins='lr', cord_row=SAG[0])
    sheet.add('festival_bunting', bunting(), joins='lr', cord_row=SAG[0])
    sheet.add('festival_arch', sk.add_outline(grid(ARCH, 'arch')), footprint=[3, 1])
    sheet.add('festival_stage', stage(), footprint=[4, 2])
    sheet.add('festival_food-stall', food_stall(), footprint=[3, 2])
    for frame in range(2):
        sheet.add(f'festival_bonfire_{frame}', bonfire(frame), footprint=[2, 1])
    sheet.add('instrument_drum', outlined(DRUM, 'drum'))
    sheet.add('instrument_lute', outlined(LUTE, 'lute'))
    sheet.add('instrument_flute', outlined(FLUTE, 'flute'))
    for name, (colour, *_) in CULTURE_COLOURS.items():
        sheet.add(f'emblem_{name}_16', icon(EMBLEM_16[name], 16, name), colour=colour)
        sheet.add(f'emblem_{name}_8', icon(EMBLEM_8[name], 8, name), colour=colour)
        sheet.add(f'banner_{name}', banner(name), colour=colour)
    for name in DISH_16:
        sheet.add(f'dish_{name}_16', icon(DISH_16[name], 16, name))
        sheet.add(f'dish_{name}_8', icon(DISH_8[name], 8, name))
    return sheet


if __name__ == '__main__':
    build().save()
