"""Workplaces, shops and civic buildings: original GBA-era top-down pixel art for Nomos.

Three-quarter view on whole 16-px tiles, lit from the top left, finished with a 1-px OUTLINE
ring. Signs are pictograms, never words. Doorways are 16 px wide inside, so the shared 18x22
blob body (16 px wide) fits through them. Buildings show their function only: no gold trim,
no grand or shabby variants, and police and jail imagery stays plain.

A standard building matches the houses: a 24-row roof, an eave line, a 21-row front wall and
a 2-px roof overhang, so a 4-tile building is 64x48 and eaves line up along a street.

Every building also gets a snow overlay: it is drawn a second time under snowfall(), where the
roof helpers lay snow on every roof, and the pixels that change become `<name>_snow`.
"""
from contextlib import contextmanager

from spritekit import TILE, Sheet, add_outline, cmap, from_ascii, overlay

SYM = cmap(
    O='OUTLINE', W='WHITE', C='CREAM', c='CREAM_D', S='SAND', s='SAND_D',
    L='WOOD_L', w='WOOD', d='WOOD_D', g='GRASS_L', G='GRASS', l='LEAF_D',
    T='TEAL', t='TEAL_D', A='WATER_L', a='WATER', N='NAVY', n='NAVY_D',
    K='STONE_L', k='STONE', x='STONE_D', R='ROOF', r='ROOF_D', V='VERMILLION',
    Y='GOLD', y='BODY_S', P='PINK', p='PINK_D', U='PLUM', I='ICE_L', i='ICE',
)

ROOF = 24        # roof rows of a standard two-tile-deep building (the eave line follows)
WALL = 21        # front-wall rows between the eave line and the ground outline
DOOR_H = 18      # doorway rows including its top outline


# ------------------------------------------------------------------ canvas
def _outer(rows, dx, dy):
    """True if the stamp pixel at (dx, dy) touches a transparent cell or the stamp's edge."""
    for nx, ny in ((dx - 1, dy), (dx + 1, dy), (dx, dy - 1), (dx, dy + 1)):
        if ny < 0 or ny >= len(rows) or nx < 0 or nx >= len(rows[ny]) or rows[ny][nx] in '. ':
            return True
    return False


class Canvas:
    """A grid of palette symbols; '.' is transparent. Stamps skip '.' and ' ', and '_' erases."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = [['.'] * w for _ in range(h)]
        self.under = []           # (x, y, rows) composited beneath the outlined art, unoutlined

    def put(self, x, y, ch):
        if ch in '. ' or not (0 <= x < self.w and 0 <= y < self.h):
            return
        self.a[y][x] = '.' if ch == '_' else ch

    def get(self, x, y):
        return self.a[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def stamp(self, x, y, rows, flip=False):
        for dy, row in enumerate(rows):
            row = row[::-1] if flip else row
            for dx, ch in enumerate(row):
                self.put(x + dx, y + dy, ch)

    def prop(self, x, y, rows, flip=False):
        """Stamp art whose outer outline ring is written only over opaque pixels. Over
        transparency add_outline draws the ring instead, so outlines stay 1 px wide."""
        rows = [r[::-1] for r in rows] if flip else rows
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == 'O' and self.get(x + dx, y + dy) == '.' and _outer(rows, dx, dy):
                    continue
                self.put(x + dx, y + dy, ch)

    def ground(self, x, rows, flip=False):
        """A prop standing on the ground row: its bottom outline lands on the ground outline."""
        self.prop(x, self.h - len(rows), rows, flip)

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, ch)

    def hline(self, x0, x1, y, ch):
        self.rect(x0, y, x1, y, ch)

    def vline(self, x, y0, y1, ch):
        self.rect(x, y0, x, y1, ch)

    def tile(self, x0, y0, x1, y1, pat, ramp=None, stagger=0, ox=0, oy=0):
        """Fill a box with a repeating ASCII pattern; each course of rows shifts by `stagger`."""
        ph, pw = len(pat), len(pat[0])
        for y in range(y0, y1 + 1):
            course, ry = divmod(y - y0 + oy, ph)
            for x in range(x0, x1 + 1):
                ch = pat[ry][(x - x0 + ox + course * stagger) % pw]
                self.put(x, y, ramp.get(ch, ch) if ramp else ch)

    def swap(self, x0, y0, x1, y1, mapping):
        for y in range(max(0, y0), min(self.h - 1, y1) + 1):
            for x in range(max(0, x0), min(self.w - 1, x1) + 1):
                ch = self.a[y][x]
                if ch in mapping:
                    self.a[y][x] = mapping[ch]

    def rows(self):
        return [''.join(r) for r in self.a]

    def image(self):
        im = add_outline(from_ascii(self.rows(), SYM))
        if self.under:
            base = Canvas(self.w, self.h)
            for x, y, rows in self.under:
                base.stamp(x, y, rows)
            low = from_ascii(base.rows(), SYM)
            low.alpha_composite(im)
            im = low
        return im


class Sprite:
    """A finished drawing: the canvas plus the footprint in tiles and an optional anchor."""

    def __init__(self, c, footprint, anchor=None):
        self.c, self.footprint, self.anchor = c, footprint, anchor


def _hash(x, y):
    """A fixed pseudo-random value for (x, y), for scattered texture without randomness."""
    return ((x * 73856093) ^ (y * 19349663)) & 0xFFFF


# ------------------------------------------------------------------ materials
# Ramps map pattern letters H (highlight), B (base) and D (dark) to palette symbols.
RAMPS = {
    'terracotta': dict(H='S', B='R', D='r'),
    'slate': dict(H='K', B='k', D='x'),
    'green': dict(H='g', B='G', D='l'),
    'shingle': dict(H='L', B='w', D='d'),
    'thatch': dict(H='C', B='S', D='s'),
    'cream': dict(H='W', B='C', D='c'),
    'sand': dict(H='C', B='S', D='s'),
    'stone': dict(H='K', B='k', D='x'),
    'wood': dict(H='L', B='w', D='d'),
    'red': dict(H='p', B='V', D='r'),
    'snow': dict(H='W', B='W', D='I'),
}
SNOW_DECK = {'K': 'W', 'k': 'W', 'x': 'I'}     # stone decks and spires under snow

_snowing = False


@contextmanager
def snowfall():
    """While active, every roof helper draws its roof under snow."""
    global _snowing
    _snowing = True
    try:
        yield
    finally:
        _snowing = False


def snowing():
    return _snowing


def add_with_snow(sheet, name, im, redraw, anchor=None, **meta):
    """Add a sprite and, when snow changes it, its `<name>_snow` overlay from redraw() under snowfall()."""
    with snowfall():
        snow = overlay(im, redraw())
    if snow is None:
        sheet.add(name, im, anchor=anchor, **meta)
        return
    sheet.add(name, im, anchor=anchor, snow=f'{name}_snow', **meta)
    shape = {'footprint': meta['footprint']} if 'footprint' in meta else {}
    sheet.add(f'{name}_snow', snow, anchor=anchor, layer='snow', **shape)

BEAM_IN = 8                       # ridge beam inset from the roof ends
SHOULDER = [5, 3, 2, 1, 1, 0]     # rounded roof shoulders: inset per row under the beam
SHADE = {'C': 'c', 'W': 'C', 'S': 's', 'k': 'x', 'K': 'k', 'w': 'd', 'L': 'w', 'V': 'r', 'R': 'r'}


def roof_mark(tex, rel, x, H, B, D):
    """Quiet surface marks on a roof face; rel is the row index under the beam."""
    if tex == 'tile':                     # clay tiles: scalloped course lines every 5 rows
        cy, course = rel % 5, rel // 5
        u = (x + course * 3) % 6
        if cy == 4:
            return D if u in (0, 1, 2, 3) else B
        if cy == 3 and u == 4:
            return D
        if cy == 0 and u == 1:
            return H
    elif tex == 'slate':                  # slates: lit top edges, course lines every 4 rows
        cy, course = rel % 4, rel // 4
        u = (x + course * 3) % 6
        if cy == 3:
            return D
        if cy == 0 and u in (1, 2, 3):
            return H
        if u == 0 and cy in (1, 2):
            return D
    elif tex == 'shingle':                # wood shingles: courses every 3 rows, broken lines
        cy, course = rel % 3, rel // 3
        u = (x + course * 2) % 5
        if cy == 2 and u != 4:
            return D
        if cy == 0 and u == 1:
            return H
    elif tex == 'thatch':                 # straw: short strokes, wavy courses
        cy, course = rel % 4, rel // 4
        u = (x + course * 2) % 4
        if cy == 3 and u in (0, 1):
            return D
        if cy in (0, 1) and u == 2:
            return H if (x // 4 + course) % 2 else B
    elif tex == 'ribbed':                 # metal sheets: standing seams every 4 px
        return {0: H, 3: D}.get(x % 4, B)
    return B


def roof_hip(c, x0, x1, y0, y1, ramp, tex):
    """Rounded hipped roof: a ridge beam on top, curved shoulders lit on the left and shaded on
    the right, a quiet textured face and a two-tone eave lip on the last three rows. Under snow
    the face is plain and only the lowest eave row keeps the roof's colour."""
    edge = RAMPS[ramp]['D']
    if _snowing:
        ramp, tex = 'snow', None
    rp = RAMPS[ramp]
    H, B, D = rp['H'], rp['B'], rp['D']
    b0, b1 = x0 + BEAM_IN, x1 - BEAM_IN
    c.hline(b0 + 1, b1 - 1, y0, H)
    c.hline(b0, b1, y0 + 1, B)
    c.hline(b0, b1, y0 + 2, B)
    c.hline(b0 + 1, b1, y0 + 3, D)
    c.vline(b0, y0 + 1, y0 + 3, H)
    c.vline(b1, y0 + 1, y0 + 2, D)
    top = y0 + 4                          # first body row: an outline under the beam
    n = y1 - top
    for y in range(top, y1 + 1):
        k = y - top
        ins = SHOULDER[k] if k < len(SHOULDER) else 0
        lx, rx = x0 + ins, x1 - ins
        for x in range(lx, rx + 1):
            if y == top and b0 <= x <= b1:
                c.put(x, y, 'O')
            else:
                c.put(x, y, roof_mark(tex, k - 1, x - x0, H, B, D) if k >= 2 and y < y1 - 2 else B)
        if y < y1 - 2:                    # lit left band, shaded right band
            c.put(lx + 1, y, H)
            c.put(rx - 1, y, D)
            if k / max(1, n) < 0.55:
                c.put(lx + 2 if k < 3 else lx + 3, y, H)
                c.put(rx - 2 if k < 3 else rx - 3, y, D)
    c.hline(x0, x1, y1 - 2, H)
    c.hline(x0, x1, y1 - 1, B)
    c.hline(x0, x1, y1, edge)
    c.put(x1, y1 - 2, B)
    c.put(x0 + 1, y1 - 1, H)
    c.put(x1, y1 - 1, D)


def roof_gable(c, x0, x1, front, rise, depth, ramp, trim='C'):
    """Front-gable roof: two planes in a chevron band (lit left, shaded right) above a gable.

    `front` is the trim row at the eave corners, `rise` the apex height above it (slope 1:2) and
    `depth` the band thickness. Returns (apex column, function giving the trim row at x)."""
    rp = RAMPS['snow' if _snowing else ramp]
    H, B, D = rp['H'], rp['B'], rp['D']
    xm = (x0 + x1) // 2
    odd = (x1 - x0) % 2

    def trim_row(x):
        dist = (xm - x) if x <= xm else (x - xm - odd)
        return front - max(0, rise - dist // 2)

    for x in range(x0, x1 + 1):
        yf = trim_row(x)
        left = x <= xm
        for y in range(yf - depth, yf + 1):
            rel = yf - y
            if rel == 0:
                ch = trim
            elif rel == 1:
                ch = 'O'
            elif rel % 4 == 1:
                ch = D
            else:
                ch = B if left else D
                if left and rel % 4 == 2 and (x + rel) % 3 == 0:
                    ch = H
            c.put(x, y, ch)
    for y in range(front - rise - depth, front - rise + 1):
        c.put(xm, y, H)
        if odd:
            c.put(xm + 1, y, B)
    return xm, trim_row


def roof_flat(c, x0, x1, y0, y1):
    """Flat stone roof seen from above: a light parapet around a paved deck, front face below."""
    c.rect(x0, y0, x1, y1, 'K')
    c.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 5, 'k')
    c.tile(x0 + 2, y0 + 2, x1 - 2, y1 - 5, ['kkkkkkx', 'kkkkkkx', 'xxxxxxx'], stagger=3, oy=1)
    c.hline(x0 + 2, x1 - 2, y0 + 2, 'x')                      # parapet shadow on the deck
    c.vline(x0 + 2, y0 + 2, y1 - 5, 'x')
    c.vline(x1, y0, y1 - 3, 'k')
    c.vline(x1 - 1, y0 + 1, y1 - 4, 'k')
    c.hline(x0 + 1, x1 - 1, y1 - 4, 'k')
    c.hline(x0, x1, y1 - 3, 'K')                              # parapet front face
    c.hline(x0, x1, y1 - 2, 'k')
    c.hline(x0, x1, y1 - 1, 'k')
    c.hline(x0, x1, y1, 'x')
    if _snowing:
        c.swap(x0, y0, x1, y1 - 3, SNOW_DECK)


def wall(c, x0, x1, y0, y1, ramp, tex='plaster', plinth='stone'):
    """Front wall from the row under the eave (y0) to the ground row (y1)."""
    rp = RAMPS[ramp]
    H, B, D = rp['H'], rp['B'], rp['D']
    if tex == 'plaster':
        c.rect(x0, y0, x1, y1, B)
    elif tex == 'clapboard':
        c.tile(x0, y0, x1, y1, ['B', 'B', 'D'], dict(B=B, D=D), oy=1)
    elif tex == 'stone':
        c.tile(x0, y0, x1, y1, ['HBBBBBD', 'BBBBBBD', 'BBBBBBD', 'DDDDDDD'], rp, stagger=3, oy=1)
    elif tex == 'vboard':
        c.tile(x0, y0, x1, y1, ['HBBD'], rp)
    elif tex == 'log':
        c.tile(x0, y0, x1, y1, ['H', 'B', 'D'], rp)
    c.hline(x0, x1, y0, D)                                    # eave shadow
    c.vline(x0, y0 + 1, y1, H)                                # lit left corner
    c.vline(x1, y0 + 1, y1, D)                                # shaded right corner
    if plinth:
        pr = RAMPS[plinth]
        c.hline(x0, x1, y1 - 2, pr['H'])
        c.tile(x0, y1 - 1, x1, y1, ['BBBBBD'], pr, stagger=3)


class Building(Sprite):
    """A standard shell: a hipped roof over a front wall, `w` tiles wide and two tiles deep."""

    def __init__(self, w_tiles, roof_rows=ROOF, overhang=2, top=0, depth=2):
        self.W = w_tiles * TILE
        self.H = top + roof_rows + WALL + 3
        super().__init__(Canvas(self.W, self.H), [w_tiles, depth])
        self.top = top
        self.E = top + 1 + roof_rows          # eave line row
        self.g = self.H - 2                   # ground row (last wall row)
        self.wx0, self.wx1 = 1 + overhang, self.W - 2 - overhang

    def roof(self, ramp, tex):
        roof_hip(self.c, 1, self.W - 2, self.top + 1, self.E - 1, ramp, tex)
        self.c.hline(self.wx0, self.wx1, self.E, 'O')

    def wall(self, ramp, tex='plaster', plinth='stone'):
        wall(self.c, self.wx0, self.wx1, self.E + 1, self.g, ramp, tex, plinth)

    def door_x(self):
        return (self.W - 18) // 2

    def doorway(self, x=None, **kw):
        self.c.stamp(self.door_x() if x is None else x, self.g - DOOR_H + 1, doorway(**kw))

    def window(self, x, frame='W', y=None, sill='K', w=10, h=10):
        y = self.E + 5 if y is None else y
        self.c.stamp(x, y, window(frame, w, h))
        if sill:
            self.c.hline(x, x + w - 1, y + h, sill)
            self.c.swap(x, y + h + 1, x + w - 1, y + h + 1, SHADE)


# ------------------------------------------------------------------ stamps
def doorway(inner='d', floor='w', h=DOOR_H):
    """Arched open doorway, 18 wide (16 inside), bottom on the ground row."""
    rows = ['...' + 'O' * 12 + '...',
            '.OO' + inner * 12 + 'OO.']
    rows += ['O' + inner * 16 + 'O'] * (h - 4)
    rows += ['O' + floor * 16 + 'O'] * 2
    return rows


def door_double(leaf='w', hi='L', lo='d', band=None, h=DOOR_H):
    """Closed double door, 18 wide (16 inside): planked leaves, optional iron bands."""
    rows = ['O' * 18]
    for i in range(1, h):
        half = hi + leaf + lo + leaf + leaf + lo + leaf + lo
        if band and i in (4, h - 5):
            half = band * 8
        if i == 1:
            half = lo * 8
        rows.append('O' + half + half + 'O')
    rows = [list(r) for r in rows]
    for r in rows[1:]:
        r[9] = 'O'
    rows[h // 2 + 1][7] = 'x' if band else 'Y'
    rows[h // 2 + 1][11] = 'x' if band else 'Y'
    return [''.join(r) for r in rows]


def window(frame='W', w=10, h=10):
    """Four-pane window with a glint; the frame colour is the trim."""
    f = frame
    inner = w - 2
    half = (inner - 3) // 2
    rest = inner - 3 - half
    rows = ['O' * w, 'O' + f * inner + 'O']
    mid = (h - 2) // 2 + 1
    for i in range(2, h - 2):
        if i == mid:
            rows.append('O' + f * inner + 'O')
            continue
        g = 'A' if i < mid else 'a'
        rows.append('O' + f + g * half + f + g * rest + f + 'O')
    rows.append('O' + f * inner + 'O')
    rows.append('O' * w)
    rows = [list(r) for r in rows]
    rows[2][2] = rows[2][3] = rows[3][2] = 'W'
    return [''.join(r) for r in rows]


NARROW_WINDOW = [
    'OOOOO',
    'OWAAO',
    'OAAAO',
    'OAAAO',
    'OAAAO',
    'OWWWO',
    'OaaaO',
    'OaaaO',
    'OaaaO',
    'OaaaO',
    'OOOOO',
]


def awning(w, c1='T', d1='t', c2='C', d2='c', h=7):
    """Striped awning seen from above: outlined top, sloped stripes, dark fold, scalloped valance."""
    rows = []
    for y in range(h):
        row = ''
        for x in range(w):
            stripe = ((x - 1) // 4) % 2
            base, dark = (c1, d1) if stripe == 0 else (c2, d2)
            if y == 0:
                row += 'O'
            elif y < h - 3:
                row += base
            elif y == h - 3:
                row += dark
            elif y == h - 2:
                row += dark if (x - 1) % 4 in (1, 2) else 'O'
            else:
                row += 'O' if (x - 1) % 4 in (1, 2) else '.'
        rows.append(row)
    rows = [list(r) for r in rows]
    for y in range(h - 1):
        rows[y][0] = rows[y][w - 1] = 'O'
    return [''.join(r) for r in rows]


# ------------------------------------------------------------------ pictograms (signs)
CROSS = [               # clinic: a GRASS-green cross on white (never a red cross)
    '..OOOOOOOOO..',
    '.OWWWWWWWWWO.',
    'OWWWWGGGWWWWO',
    'OWWWWGgGWWWWO',
    'OWWWWGGGWWWcO',
    'OWGGGGGGGGGcO',
    'OWGgGGGGGGlcO',
    'OWGGGGGGGGlcO',
    'OWWWWGGlWWWcO',
    'OWWWWGGlWWWcO',
    'OWWWWllWWWWcO',
    '.OccccccccccO',
    '..OOOOOOOOOO.',
]

BADGE = [               # police: a plain gold shield badge on a navy plate
    'OOOOOOOOOOOOO',
    'ONNNNNNNNNNNO',
    'ONNYNNNNNYNnO',
    'ONNYYYYYYYNnO',
    'ONNYWYYYYyNnO',
    'ONNYWYyYYyNnO',
    'ONNYYyYyYyNnO',
    'ONNYYYyYYyNnO',
    'ONNNYYYYyNNnO',
    'ONNNNYYyNNNnO',
    'ONNNNNyNNNNnO',
    'OnnnnnnnnnnnO',
    'OOOOOOOOOOOOO',
]

COIN = [                # shops: a gold coin (the plan's civic signal for shops)
    '...OOOOO...',
    '..OYYYYYO..',
    '.OYWWYYYyO.',
    'OYWYYYYYyyO',
    'OYWYYyYYyyO',
    'OYYYyYyYyyO',
    'OYYYYyYYyyO',
    'OYYYYYYyyyO',
    '.OYYyyyyyO.',
    '..OyyyyyO..',
    '...OOOOO...',
]

COIN_SMALL = [
    '.OOO.',
    'OYWYO',
    'OYYyO',
    'OyyyO',
    '.OOO.',
]

CLOCK = [               # town hall: a clock face
    '..OOOOO..',
    '.OWCCCCO.',
    'OWCCdCCcO',
    'OCCCdCCcO',
    'OCCCdddcO',
    'OCCCCCCcO',
    'OCCCCCCcO',
    '.OcccccO.',
    '..OOOOO..',
]

SCROLL = [              # records office: a rolled scroll of records
    '.OOO.......OOO.',
    'OLwdOOOOOOOLwdO',
    'OLwdCCCCCCCLwdO',
    'OLwdCxxxxCCLwdO',
    'OLwdCCCCCCcLwdO',
    'OLwdCxxxxxcLwdO',
    'OLwdCCCCCccLwdO',
    'OLwdOOOOOOOLwdO',
    '.OOO.......OOO.',
]

SCALES = [              # courthouse: balance scales
    '......x......',
    '.xxxxxxxxxxx.',
    '.x...xx....x.',
    'x.x..xx...x.x',
    'x.x..xx...x.x',
    'xxx..xx...xxx',
    '.....xx......',
    '...xxxxxx....',
]

CUPOLA = [              # school: an open bell cupola (the bell is the pictogram)
    '.......O.......',
    '......ORO......',
    '.....ORRrO.....',
    '....ORRRRrO....',
    '...ORSRRRrrO...',
    '..ORSRRRRRrrO..',
    '.ORRRRRRRRRrrO.',
    'OSSSSSSSSSSSSsO',
    'OrrrrrrrrrrrrrO',
    '.OWCOdddddOcxO.',
    '.OWCOddYddOcxO.',
    '.OWCOdYYydOcxO.',
    '.OWCOdYWydOcxO.',
    '.OWCOYYYyyOcxO.',
    '.OWCOddyddOcxO.',
    'OCCCCCCCCCCCCcO',
    'OCcCCcCCcCCcCcO',
    'OccccccccccccxO',
]


# ------------------------------------------------------------------ props
CRATE = [
    'OOOOOOOOOO',
    'OLLLLLLLwO',
    'OwwwwwwwdO',
    'OOOOOOOOOO',
    'OLwwddwwdO',
    'OLwdwwdwdO',
    'OLdwwwwddO',
    'OLwdwwdwdO',
    'OLwwddwwdO',
    'OOOOOOOOOO',
]

SACK = [
    '..OOOO..',
    '.OsSSsO.',
    '..OsSO..',
    '.OSCCSO.',
    'OSCCCCsO',
    'OSCWCCsO',
    'OSCCCSsO',
    'OsSSSssO',
    '.OOOOOO.',
]

BARREL = [
    '.OOOOOO.',
    'OLwwwwdO',
    'OdLLLwdO',
    'OxxxxxxO',
    'OLwwwwdO',
    'OLwwwwdO',
    'OxxxxxxO',
    'OLwwwwdO',
    '.OOOOOO.',
]

JAR = [
    '.OOOO.',
    'OSRRrO',
    '.ORrO.',
    'OSRRrO',
    'ORRRrO',
    'ORRrrO',
    '.OrrO.',
    '..OO..',
]

POT = [
    '.OOOOO.',
    'OsSSSsO',
    '.OsssO.',
    'ORRRRrO',
    'OSRRRrO',
    'ORRRrrO',
    '.OrrrO.',
    '..OOO..',
]

LOG_END = [
    '.OOO.',
    'OSLSO',
    'OLdLO',
    'OSLSO',
    '.OOO.',
]

HAY = [
    '.OOOOOOOO.',
    'OSCSSSCSsO',
    'OSSsSSSssO',
    'OOOOOOOOOO',
    'OSSSsSSSsO',
    'OCSSsSCSsO',
    'OSSSsSSssO',
    'OsssssssO.',
    '.OOOOOOO..',
]

SMOKE = [               # a little smoke in CREAM_D: two puffs drifting up and to the right
    '....Cc.',
    '...CCcc',
    '...Cccc',
    '.CC.cc.',
    'CCcc...',
    'Ccccc..',
    '.ccc...',
]

SAWHORSE = [
    'OOOOOOOOOOOOOOO',
    'OSLLLLLLLLLLLwO',
    'OLwwwwwwwwwwwdO',
    'OOOOOOOOOOOOOOO',
    '.OwO.......OwO.',
    'OwOwO.....OwOwO',
    'OwOwO.....OwOwO',
    'OwOwO.....OwOwO',
    'OOOOO.....OOOOO',
]


def log_pile(tiers):
    """A pile of log ends, bottom tier first, sharing outlines between neighbours."""
    n = len(tiers)
    c = Canvas(4 * tiers[0] + 1, 4 * n + 1)
    for t, count in enumerate(tiers):
        for i in range(count):
            c.stamp(4 * i + 2 * t, 4 * (n - 1 - t), LOG_END)
    return c.rows()


# ------------------------------------------------------------------ civic
def clinic():
    b = Building(4)
    b.roof('green', 'shingle')
    b.wall('cream')
    b.doorway()
    b.window(b.wx0 + 5)
    b.window(b.wx1 - 14)
    b.c.prop((b.W - 13) // 2, b.E - 10, CROSS)
    return b


def police():
    b = Building(4)
    c = b.c
    b.roof('slate', 'slate')
    b.wall('cream')
    c.hline(b.wx0, b.wx1, b.E + 1, 'n')                       # navy beam under the eave
    c.hline(b.wx0, b.wx1, b.E + 2, 'N')
    for x0 in (b.wx0, b.wx1 - 2):                             # navy corner posts
        c.rect(x0, b.E + 1, x0 + 1, b.g, 'N')
        c.vline(x0 + 2, b.E + 3, b.g, 'n')
    c.vline(b.wx0, b.E + 2, b.g, 'K')
    c.vline(b.wx1, b.E + 1, b.g, 'n')
    dx = b.door_x()
    c.rect(dx - 1, b.g - DOOR_H, dx + 18, b.g, 'N')           # navy door frame
    c.vline(dx + 18, b.g - DOOR_H + 1, b.g, 'n')
    b.doorway()
    b.window(b.wx0 + 6, 'N')
    b.window(b.wx1 - 15, 'N')
    c.prop((b.W - 13) // 2, b.E - 10, BADGE)
    return b


def school():
    b = Building(4, top=13)
    c = b.c
    b.roof('terracotta', 'tile')
    b.wall('cream', 'clapboard')
    b.doorway()
    b.window(b.wx0 + 4, 'w', sill='L')
    b.window(b.wx1 - 13, 'w', sill='L')
    c.prop(b.W // 2 - 7, b.top + 4 - len(CUPOLA) + 1, CUPOLA)
    return b


def town_hall():
    b = Building(5, top=12)
    c = b.c
    b.roof('terracotta', 'tile')
    b.wall('sand')
    W = b.W
    tx0, tx1 = W // 2 - 10, W // 2 + 9                        # clock tower, front centre
    for i in range(9):                                        # slate pyramid roof
        y = 1 + i
        x0, x1 = W // 2 - 1 - i - (i > 0), W // 2 + i + (i > 0)
        c.hline(x0, x1, y, 'x' if i == 8 else 'k')
        c.put(x0, y, 'K')
        c.put(x0 + 1, y, 'K')
        c.put(x1, y, 'x')
    if _snowing:
        c.swap(0, 1, W - 1, 8, SNOW_DECK)
    c.hline(tx0 - 1, tx1 + 1, 10, 'O')
    c.hline(tx0 - 1, tx1 + 1, 11, 'C')                        # cornice
    c.hline(tx0 - 1, tx1 + 1, 12, 's')
    c.hline(tx0 - 1, tx1 + 1, 13, 'O')
    c.rect(tx0, 14, tx1, b.E - 1, 'S')
    c.vline(tx0 - 1, 14, b.E - 1, 'O')
    c.vline(tx1 + 1, 14, b.E - 1, 'O')
    c.vline(tx0, 14, b.E - 1, 'C')
    c.vline(tx1, 14, b.E - 1, 's')
    c.hline(tx0, tx1, 14, 's')
    c.stamp(W // 2 - 5, 16, CLOCK)
    c.stamp(W // 2 - 3, 27, ['OOOOOO', 'OddddO', 'OwwwwO', 'OddddO', 'OwwwwO', 'OddddO', 'OOOOOO'])
    c.hline(tx0, tx1, b.E - 2, 'C')                           # band where tower meets facade
    c.hline(tx0, tx1, b.E - 1, 's')
    dx = b.door_x()                                           # stone surround on the entrance
    c.rect(dx - 2, b.g - DOOR_H - 1, dx + 19, b.g, 'K')
    c.vline(dx + 19, b.g - DOOR_H, b.g, 'k')
    c.vline(dx + 18, b.g - DOOR_H + 1, b.g, 'k')
    b.doorway()
    for x in (b.wx0 + 5, b.wx0 + 17, b.wx1 - 26, b.wx1 - 14):
        b.window(x, 'C', sill='C')
    return b


def records_office():
    b = Building(4)
    c = b.c
    b.roof('shingle', 'shingle')
    b.wall('stone', 'stone', plinth=None)
    b.doorway()
    for x in (b.wx0 + 5, b.wx1 - 14):
        b.window(x, 'w', sill='K')
        for yy, row in ((b.E + 7, 'VSaTSV'), (b.E + 11, 'aTSVaS')):   # shelves of records
            for i, ch in enumerate(row):
                xx = x + 2 + i + (1 if i >= 3 else 0)
                for dy in (0, 1):
                    if c.get(xx, yy + dy) in 'Aa':
                        c.put(xx, yy + dy, ch)
    c.prop((b.W - 15) // 2, b.E - 7, SCROLL)
    return b


def courthouse():
    b = Building(5)
    c = b.c
    W, E, g = b.W, b.E, b.g
    b.roof('slate', 'slate')
    wall(c, b.wx0, b.wx1, E + 1, g, 'cream', plinth=None)
    c.rect(9, E + 1, W - 10, g - 3, 'c')                      # wall in the portico's shade
    c.hline(9, W - 10, E + 3, 'S')
    c.stamp(W // 2 - 9, g - 3 - DOOR_H + 1, doorway())        # doorway on the top step
    for x in (17, W - 22):                                    # narrow windows between columns
        c.stamp(x, E + 8, NARROW_WINDOW)
    px0, px1 = 7, W - 8                                       # pediment (slope 1:2)
    xm = (px0 + px1) // 2
    for x in range(px0, px1 + 1):
        dist = (xm - x) if x <= xm else (x - xm - 1)
        yt = E - 3 - max(0, 13 - dist // 2)
        c.vline(x, yt + 1, E - 3, 'C')
        c.put(x, yt, 'O')
        c.put(x, yt + 1, 'W' if x <= xm else 'c')
    c.stamp(xm - 6, E - 13, SCALES)
    c.hline(px0 - 1, px1 + 1, E - 2, 'O')                     # entablature
    c.hline(px0 - 1, px1 + 1, E - 1, 'W')
    c.hline(px0 - 1, px1 + 1, E, 'C')
    c.hline(px0 - 1, px1 + 1, E + 1, 'c')
    c.hline(px0 - 1, px1 + 1, E + 2, 'O')
    for cx in (10, 24, 51, 65):                               # four plain columns
        c.hline(cx - 1, cx + 5, E + 3, 'W')
        c.hline(cx - 1, cx + 5, E + 4, 'O')
        for y in range(E + 5, g - 2):
            c.stamp(cx - 1, y, ['OWCCccO'])
        c.hline(cx - 1, cx + 5, g - 3, 'K')
    c.hline(5, W - 6, g - 2, 'O')                             # steps
    c.hline(5, W - 6, g - 1, 'K')
    c.hline(4, W - 5, g, 'k')
    c.put(4, g, 'K')
    return b


def jail():
    b = Building(4)
    c = b.c
    roof_flat(c, 2, b.W - 3, 1, b.E - 1)
    c.hline(b.wx0, b.wx1, b.E, 'O')
    b.wall('stone', 'stone', plinth=None)
    c.stamp(b.door_x(), b.g - DOOR_H + 1, door_double(band='x'))
    for x in (b.wx0 + 6, b.wx1 - 13):                         # small high barred windows
        c.stamp(x, b.E + 4, ['OOOOOOOO', 'OkdkdkdO', 'OkdkdkdO', 'OkdkdkdO', 'OOOOOOOO'])
        c.hline(x, x + 7, b.E + 9, 'K')
    return b


# ------------------------------------------------------------------ commerce
def shop():
    b = Building(4)
    c = b.c
    b.roof('terracotta', 'tile')
    b.wall('sand')
    dx = b.wx1 - 21
    b.doorway(dx)
    c.stamp(b.wx0 + 3, b.E + 8, window('w', w=22, h=11))
    for i, ch in enumerate('VVSSGGaaVS'):                     # goods on display
        c.put(b.wx0 + 5 + i * 2, b.E + 16, ch)
        c.put(b.wx0 + 6 + i * 2, b.E + 16, ch)
    c.hline(b.wx0 + 3, b.wx0 + 24, b.E + 19, 'C')
    c.prop(b.wx0 - 2, b.E, awning(b.wx1 - b.wx0 + 5))
    c.swap(b.wx0, b.E + 7, b.wx1, b.E + 7, SHADE)             # awning shadow on the wall
    c.prop(dx + 4, b.E - 12, COIN)
    return b


CRATE_APPLES = [
    '.OVOVOVO.',
    'OVPVVPVVO',
    'OVVrVVrrO',
    'OOOOOOOOO',
    'OLwwwwwdO',
    'OOOOOOOOO',
]
CRATE_GREENS = [
    '.OgOGOgO.',
    'OGgGGgGlO',
    'OGGlGGllO',
    'OOOOOOOOO',
    'OLwwwwwdO',
    'OOOOOOOOO',
]
CRATE_BREAD = [
    '.OOOOOOO.',
    'OSCSSCSsO',
    'OssSssSsO',
    'OOOOOOOOO',
    'OLwwwwwdO',
    'OOOOOOOOO',
]


def market_stall(open_=True):
    W, H = 48, 48
    c = Canvas(W, H)
    g = H - 2
    ct = g - 12                                                # counter top row
    c.rect(2, ct, W - 3, ct + 2, 'L')
    c.hline(2, W - 3, ct, 'S')
    c.hline(2, W - 3, ct + 3, 'O')
    c.tile(2, ct + 4, W - 3, g, ['wwwwwwwwwwwd', 'wwwwwwwwwwwd', 'dddddddddddd'], stagger=4)
    c.vline(2, ct + 4, g, 'L')
    c.vline(W - 3, ct + 4, g, 'd')
    for px in (3, W - 6):                                      # front posts
        c.prop(px - 1, 14, ['OLdO'] * (ct - 14))
    c.tile(2, 1, W - 3, 10, ['TTTTCCCC'], ox=2)                # canopy, lighter at the back
    c.swap(2, 1, W - 3, 3, {'T': 'g', 'C': 'W'})
    c.swap(2, 1, W - 3, 1, {'g': 'T', 'W': 'C'})
    c.prop(1, 7, awning(W - 2, h=7))
    c.tile(2, 7, W - 3, 7, ['TTTTCCCC'], ox=2)
    if open_:
        for x, crate in ((5, CRATE_APPLES), (17, CRATE_GREENS), (29, CRATE_BREAD)):
            c.prop(x, ct - 5, crate)
        c.vline(W // 2, 14, 15, 'x')                           # coin sign on a short chain
        c.prop(W // 2 - 2, 16, COIN_SMALL)
    else:
        c.tile(3, 13, W - 4, ct - 1, ['TTTTCCCC'], ox=1)       # canvas let down over the front
        c.swap(3, ct - 3, W - 4, ct - 1, {'T': 't', 'C': 'c'})
        c.swap(3, 13, W - 4, 13, {'T': 't', 'C': 'c'})
        c.vline(2, 13, ct - 1, 't')
        c.vline(W - 3, 13, ct - 1, 'c')
        for x in (12, W // 2, W - 13):                         # ties
            c.vline(x, ct - 6, ct - 5, 'd')
    return Sprite(c, [3, 2])


def big_doors(c, x0, y_ground, w, leaf='w', hi='L', lo='d', brace='L'):
    """Wide double doors with X braces, bottom on the ground row; w includes the outline."""
    h = DOOR_H
    c.rect(x0, y_ground - h + 1, x0 + w - 1, y_ground, 'O')
    c.rect(x0 + 1, y_ground - h + 2, x0 + w - 2, y_ground, leaf)
    mid = x0 + w // 2
    c.vline(mid, y_ground - h + 2, y_ground, 'O')
    for (a, b) in ((x0 + 1, mid - 1), (mid + 1, x0 + w - 2)):
        c.hline(a, b, y_ground - h + 2, lo)
        c.vline(a, y_ground - h + 3, y_ground, hi)
        span = b - a
        for i in range(h - 3):
            y = y_ground - h + 3 + i
            t = i / (h - 4)
            c.put(a + round(t * span), y, brace)
            c.put(b - round(t * span), y, brace)
    return mid


def warehouse():
    b = Building(4)
    c = b.c
    b.roof('slate', 'ribbed')
    b.wall('wood', 'vboard', plinth=None)
    big_doors(c, b.W // 2 - 13, b.g, 26)
    c.hline(b.W // 2 - 14, b.W // 2 + 13, b.g - DOOR_H, 'x')  # door rail
    c.ground(b.wx0 + 1, SACK)
    c.ground(b.wx0 + 7, SACK)
    c.prop(b.wx0 + 3, b.H - 15, SACK)
    c.ground(b.wx1 - 17, BARREL)
    c.ground(b.wx1 - 10, CRATE)
    c.prop(b.wx1 - 10, b.H - 19, CRATE)
    return b


# ------------------------------------------------------------------ workplaces
def farm():
    W, H = 80, 60
    c = Canvas(W, H)
    g = H - 2
    bx0, bx1 = 1, 54                                          # barn with a front gable
    front = g - WALL
    xm, trim_row = roof_gable(c, bx0, bx1, front, 13, 15, 'slate', trim='C')
    for x in range(bx0 + 2, bx1 - 1):                         # gable wall
        c.vline(x, trim_row(x) + 1, front, 'V')
        if x > xm:
            c.put(x, trim_row(x) + 1, 'r')
    wall(c, bx0 + 2, bx1 - 2, front + 1, g, 'red', 'vboard', plinth=None)
    c.hline(bx0 + 2, bx1 - 2, front + 1, 'C')
    c.hline(bx0 + 2, bx1 - 2, front + 2, 'r')
    c.stamp(xm - 3, front - 8, ['OOOOOOOO', 'OCCCCCCO', 'OCddddCO', 'OCdSSdCO', 'OCSSSSCO', 'OCCCCCCO',
                                'OOOOOOOO'])
    big_doors(c, xm - 10, g, 22, leaf='r', hi='V', lo='r', brace='C')
    sx0, sx1 = 58, 77                                         # silo
    c.rect(sx0, 9, sx1, g, 'K')
    for y in range(9, g + 1):
        band = (y - 9) % 6 == 5
        if band:
            c.hline(sx0, sx1, y, 'k')
        c.put(sx0, y, 'W')
        c.put(sx0 + 1, y, 'C')
        c.put(sx1, y, 'x')
        c.put(sx1 - 1, y, 'k')
        c.put(sx1 - 2, y, 'x' if band else 'k')
    c.prop(sx0, 1, [
        '......OOOOOOOO......',
        '....OOrRRRRRRrOO....',
        '...ORRSRRRRRRRrrO...',
        '..ORSRRRRRRRRRRrrO..',
        '.ORSRRRRRRRRRRRRrrO.',
        '.ORRRRRRRRRRRRRRRrO.',
        'ORRRRRRRRRRRRRRRRrrO',
        'OrrrrrrrrrrrrrrrrrrO',
        'OOOOOOOOOOOOOOOOOOOO',
    ])
    c.stamp(sx0 + 7, 24, ['OOOOOO', 'OddddO', 'OddddO', 'OOOOOO'])
    c.vline(sx0 + 9, 30, g - 1, 'x')                          # ladder
    c.vline(sx0 + 11, 30, g - 1, 'x')
    for y in range(31, g - 1, 3):
        c.put(sx0 + 10, y, 'x')
    c.ground(sx0 + 1, SACK)
    c.ground(sx0 + 12, SACK)
    return Sprite(c, [5, 2])


def pasture():
    b = Building(4, roof_rows=20)
    c = b.c
    b.roof('thatch', 'thatch')
    b.wall('wood', 'log', plinth=None)
    ox0, ox1 = b.wx0 + 3, b.wx0 + 30                          # open front, hay inside
    c.rect(ox0, b.g - DOOR_H + 1, ox1, b.g, 'O')
    c.rect(ox0 + 1, b.g - DOOR_H + 2, ox1 - 1, b.g, 'd')
    c.hline(ox0 + 1, ox1 - 1, b.g - DOOR_H + 2, 'n')
    c.prop(ox0 + 7, b.g - 14, HAY[:7] + ['.OOOOOOO..'])
    c.ground(ox0 + 2, HAY)
    c.ground(ox0 + 13, HAY)
    fx0, fx1 = ox1 + 1, b.wx1                                 # paddock fence: rails and posts
    for y in (b.g - 11, b.g - 7):
        c.hline(fx0, fx1, y - 1, 'O')
        c.hline(fx0, fx1, y, 'C')
        c.hline(fx0, fx1, y + 1, 'S')
        c.hline(fx0, fx1, y + 2, 'O')
    for x in (fx0 + 2, fx0 + 11, fx1 - 4):
        c.ground(x, ['OOOO'] + ['OCsO'] * 13 + ['OOOO'])
    c.ground(fx0 + 3, ['OOOOOOOOOOOOOOOO', 'OLAAAAAAAAAAAAwO', 'OwwwwwwwwwwwwwdO', 'OddddddddddddddO',
                       'OOOOOOOOOOOOOOOO'])                    # water trough
    return b


def boat_rows():
    """A rowing boat seen from above, bow up: lit left gunwale, two thwarts, oars shipped."""
    prof = [1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 3]
    w, cx = 15, 7
    rows = []
    for r, hw in enumerate(prof):
        row = ['.'] * w
        for x in range(cx - hw, cx + hw + 1):
            d = x - cx
            if abs(d) == hw or r in (0, len(prof) - 1):
                ch = 'L' if d < 0 else 'w'
            elif abs(d) == hw - 1:
                ch = 'w' if d < 0 else 'd'
            else:
                ch = 'L' if r in (6, 11) else 'd'
            row[x] = ch
        if r == 8:                                            # oar blades out over the water
            row[cx - hw - 1] = row[cx + hw + 1] = 'L'
        rows.append(''.join(row))
    return rows


def dock():
    W, H = 64, 66
    c = Canvas(W, H)
    hx0, hx1 = 1, 34                                          # fish hut on the bank
    E = 17
    g = E + WALL
    shore = g + 5                                             # first water row
    roof_hip(c, hx0, hx1, 1, E - 1, 'shingle', 'shingle')
    c.hline(hx0 + 2, hx1 - 2, E, 'O')
    wall(c, hx0 + 2, hx1 - 2, E + 1, g, 'wood', 'log', plinth=None)
    c.stamp(hx0 + 4, g - DOOR_H + 1, doorway())
    c.stamp(hx1 - 9, E + 4, ['OOOOOO', 'OwwwwO', 'OAAWAO', 'OaaaaO', 'OwwwwO', 'OOOOOO'])
    for x in (hx1 - 9, hx1 - 6):                              # fish drying by the door
        c.stamp(x, E + 11, ['.O.', 'OKO', 'OkO', 'OxO', '.O.'])
    px0, px1 = 40, 53                                         # pier: planks across, pilings
    pend = H - 7
    for y in range(g - 3, pend + 1):
        k = (y - g) % 3
        c.hline(px0, px1, y, 'L' if k == 0 else 'w' if k == 1 else 'd')
    c.vline(px0, g - 3, pend, 'L')
    c.vline(px1, g - 3, pend, 'd')
    c.hline(px0, px1, pend + 1, 'O')                          # deck edge facing the viewer
    c.hline(px0, px1, pend + 2, 'w')
    c.hline(px0, px1, pend + 3, 'd')
    for x in (px0 + 1, px1 - 2):
        c.rect(x, pend + 4, x + 1, pend + 5, 'd')
        c.put(x, pend + 4, 'w')
    for y in range(shore + 2, pend - 1, 7):                   # side pilings in the water
        c.rect(px1 + 1, y, px1 + 2, y + 2, 'd')
        c.put(px1 + 1, y, 'w')
    bx, by = 23, shore + 3                                    # rowing boat beside the pier
    c.stamp(bx, by, boat_rows())
    c.hline(bx + 13, px0 - 1, by + 7, 'S')                    # mooring rope
    c.stamp(px0 + 1, by + 5, ['OOOO', 'OKxO', 'OxxO', 'OOOO'])  # bollard
    water = []                                                # unoutlined, so it merges with water tiles
    for y in range(shore, H):
        row = ''
        for x in range(W):
            edge = x < 1 or x > W - 2 or (y == shore and (x < 4 or x > W - 5))
            row += '.' if edge else 'a'
        water.append(row)
    rip = [list(r) for r in water]
    for (x, y) in ((4, shore + 3), (12, shore + 9), (5, shore + 15), (57, shore + 4),
                   (56, shore + 13), (24, H - 3), (44, H - 1)):
        for dx in range(3):
            rip[y - shore][x + dx] = 'A'
    for x in (px0, px0 + 3, px1 - 3, px1):                    # ripples at the pilings
        rip[pend + 6 - shore][x] = 'A'
    c.under.append((0, shore, [''.join(r) for r in rip]))
    return Sprite(c, [4, 2], anchor=(W // 2, g + 1))


def lumber_camp():
    W, H = 80, 46
    c = Canvas(W, H)
    g = H - 2
    roof_hip(c, 1, 38, 1, 18, 'shingle', 'shingle')            # open shed on posts
    c.hline(3, 36, 19, 'O')
    c.rect(3, 20, 36, g, 'd')
    c.hline(3, 36, 20, 'n')
    for px in (3, 34):
        c.vline(px, 20, g, 'L')
        c.vline(px + 1, 20, g, 'w')
        c.vline(px + 2, 20, g, 'O')
    c.vline(36, 20, g, 'w')
    c.vline(35, 20, g, 'L')
    c.vline(34, 20, g, 'O')
    for y in range(g - 11, g, 4):                             # stacked boards
        c.hline(7, 31, y, 'O')
        c.hline(7, 31, y + 1, 'S')
        c.hline(7, 31, y + 2, 's')
        c.put(31, y + 1, 'L')
        c.put(31, y + 2, 'w')
    c.ground(42, SAWHORSE)
    c.hline(40, 58, H - 11, 'L')                              # a log across the trestle,
    c.hline(40, 58, H - 10, 'w')                              # overhanging both ends evenly
    c.hline(40, 58, H - 9, 'd')
    for x in range(42, 57, 4):
        c.put(x, H - 10, 'd')
    c.ground(60, log_pile([4, 3, 2, 1]))
    return Sprite(c, [5, 2])


def _in_rrect(x, y, box):
    x0, y0, x1, y1, r = box
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r


def quarry():
    W, H = 64, 46
    c = Canvas(W, H)
    g = H - 2
    levels = [(1, 7, 44, g, 7), (4, 9, 41, g - 2, 6), (8, 16, 37, g - 4, 5), (12, 23, 33, g - 6, 4)]
    for y in range(H):
        for x in range(W):
            lv = max((i for i, box in enumerate(levels) if _in_rrect(x, y, box)), default=-1)
            if lv == 0 and not _in_rrect(x, y, (2, 8, 43, g - 1, 7)) and _hash(x, y) % 3 == 0:
                continue                                      # ragged outer edge
            if lv < 0:
                continue
            if lv == 0:                                       # dirt rim around the pit
                ch = 'S' if _hash(x, y) % 9 == 0 else 's'
            elif lv == 3:                                     # pit floor
                ch = 'k' if _hash(x, y) % 11 == 0 else 'x'
            else:
                top = min(yy for yy in range(H) if _in_rrect(x, yy, levels[lv]))
                nxt = levels[lv + 1]
                if y <= top + 1:
                    ch = 'K'                                  # ledge edge, lit
                elif nxt[0] <= x <= nxt[2] and y < nxt[1]:
                    ch = 'x' if (y - top) % 3 == 0 or (x + y) % 7 == 0 else 'k'   # far face
                elif x < nxt[0]:
                    ch = 'x'                                  # left face, in shade
                else:
                    ch = 'K'                                  # right face and near ledge, lit
            c.put(x, y, ch)
    for lv in (1, 2, 3):                                      # drop edges
        for x in range(W):
            ys = [yy for yy in range(H) if _in_rrect(x, yy, levels[lv])]
            if ys:
                c.put(x, ys[0], 'O')
    for (x, y) in ((15, 31), (24, 34), (29, 29), (18, 36)):    # rubble
        c.stamp(x, y, ['.O.', 'OKO', '.O.'])
    blk = ['OOOOOOOOO', 'OKKKKKKkO', 'OkkkkkkxO', 'OOOOOOOOO', 'OKkkkkkxO', 'OkkkkkkxO', 'OkkkkkxxO',
           'OOOOOOOOO']
    c.ground(47, blk)                                         # cut blocks at the rim
    c.ground(55, blk[:5] + blk[4:])                           # a taller block staggers the seams
    c.prop(47, H - 15, blk)
    for y in range(2, 16):                                    # hoist: post on the far rim, boom over the pit
        c.put(40, y, 'L')
        c.put(41, y, 'w')
    c.hline(21, 41, 2, 'L')
    c.hline(21, 41, 3, 'w')
    for i in range(5):                                        # brace
        c.put(39 - i, 4 + i, 'w')
    c.vline(22, 4, 26, 'S')                                   # rope down to a hanging block
    c.stamp(19, 27, ['OOOOOOO', 'OKKKKkO', 'OkkkkxO', 'OOOOOOO'])
    return Sprite(c, [4, 2])


def mine():
    W, H = 64, 50
    c = Canvas(W, H)
    g = H - 2
    tops = [14, 12, 10, 9, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 4, 4, 5, 5, 4, 4, 3, 3, 3, 3, 3, 4,
            4, 4, 4, 5, 5, 5, 4, 4, 4, 3, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12, 13, 14,
            15, 17, 19, 21]
    for x in range(1, W - 1):                                 # rock outcrop with a grassy brow
        t = tops[x]
        c.vline(x, t, g, 'k')
        for y in range(t + 5, g + 1):
            if _hash(x, y) % 13 == 0:
                c.put(x, y, 'x')
            elif _hash(x, y) % 17 == 0:
                c.put(x, y, 'K')
        c.vline(x, t, t + 2, 'G')
        c.put(x, t, 'g')
        c.put(x, t + 3, 'l')
        c.put(x, t + 4, 'x')
    for (bx, by, rx, ry) in ((9, 25, 6, 5), (55, 27, 6, 5), (12, 39, 5, 4), (51, 40, 6, 4)):
        for y in range(by - ry, by + ry + 1):                 # boulders: lit upper left, dark lower right
            for x in range(bx - rx, bx + rx + 1):
                e = ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2
                if e <= 1:
                    edge = e > 0.55
                    if edge and (x - bx) + (y - by) < 0:
                        c.put(x, y, 'K')
                    elif edge:
                        c.put(x, y, 'x')
                    else:
                        c.put(x, y, 'k')
    tx = W // 2 - 11                                          # timbered tunnel
    c.rect(tx, g - 21, tx + 21, g, 'O')
    c.rect(tx + 3, g - 17, tx + 18, g, 'x')
    c.rect(tx + 4, g - 16, tx + 17, g, 'n')
    c.hline(tx + 1, tx + 20, g - 20, 'L')
    c.hline(tx + 1, tx + 20, g - 19, 'w')
    c.hline(tx + 1, tx + 20, g - 18, 'd')
    c.vline(tx + 1, g - 17, g, 'L')
    c.vline(tx + 2, g - 17, g, 'w')
    c.vline(tx + 19, g - 17, g, 'L')
    c.vline(tx + 20, g - 17, g, 'w')
    for y in range(g - 6, g + 1, 2):                          # rails running out
        c.hline(tx + 5, tx + 16, y, 'd')
    c.vline(tx + 7, g - 8, g, 'K')
    c.vline(tx + 14, g - 8, g, 'K')
    c.stamp(tx + 18, g - 15, ['.OO.', 'OYYO', 'OYyO', '.OO.'])  # lantern
    c.ground(tx + 24, [                                       # ore cart
        '.O.O.OO.O.',
        'OrOxOrrOxO',
        'OOOOOOOOOO',
        'OKkkkkkkxO',
        'OkkkkkkkxO',
        'OxxxxxxxxO',
        '.OOOOOOOO.',
        '.OxO..OxO.',
        '..O....O..',
    ])
    return Sprite(c, [4, 2])


def fuel_works():
    W, H = 64, 48
    c = Canvas(W, H)
    g = H - 2
    cx, top, rx = 23, 14, 21
    for y in range(top, g + 1):                               # earth-covered charcoal kiln
        t = (y - top) / (g - top)
        half = max(4, min(rx, int(round(rx * min(1.0, (1 - (1 - t) ** 2) ** 0.5 * 1.08)))))
        for x in range(cx - half, cx + half + 1):
            u = (x - cx) / max(1, half)
            ch = 'w'
            if u < -0.55 and t < 0.75:
                ch = 'L'
            if u > 0.55 or t > 0.82:
                ch = 'd'
            if _hash(x, y) % 19 == 0 and t > 0.15:
                ch = 'G' if ch != 'd' else 'l'
            c.put(x, y, ch)
    c.prop(cx - 3, top - 2, ['OOOOOOO', 'OKkkkxO', 'OxxxxxO', 'OOOOOOO'])   # vent
    c.prop(cx - 1, top - 2 - len(SMOKE), SMOKE)
    for x in (cx - 12, cx - 4, cx + 4, cx + 11):              # air holes at the base
        c.stamp(x, g - 3, ['OOO', 'OxO', 'OOO'])
    c.ground(46, log_pile([3, 2, 1]))
    c.prop(47, H - 22, [                                      # basket of charcoal on the logs
        '.O.O.O.O.',
        'OxOkOxOxO',
        'OkxxkxxkO',
        'OOOOOOOOO',
        'OLwLwLwdO',
        'OwLwLwLdO',
        '.OOOOOOO.',
    ])
    return Sprite(c, [4, 2])


def workshop():
    b = Building(4, top=9)
    c = b.c
    b.roof('slate', 'shingle')
    b.wall('sand', plinth='stone')
    chx = b.W - 18                                            # chimney with smoke
    c.prop(chx, b.top + 6, ['OOOOOOOO', 'OKKKKKkO', 'OkkkkkxO', 'OOOOOOOO', '.OKkkxO.', '.OKkkxO.',
                            '.OkkkxO.', '.OOOOOO.'])
    c.prop(chx + 1, b.top + 6 - len(SMOKE), SMOKE)
    ox0, ox1 = b.wx0 + 4, b.wx0 + 29                          # open front: forge and anvil
    c.rect(ox0, b.g - DOOR_H + 1, ox1, b.g, 'O')
    c.rect(ox0 + 1, b.g - DOOR_H + 2, ox1 - 1, b.g, 'd')
    c.hline(ox0 + 1, ox1 - 1, b.g - DOOR_H + 2, 'n')
    c.ground(ox0 + 2, [
        'OOOOOOOOO',
        'OrRRrRRrO',
        'ORrOOOrRO',
        'OrOYVYOrO',
        'ORrYYYrRO',
        'OrRRrRRrO',
        'ORrRRrRrO',
        'OrRRrRRrO',
        'ORrRRrRrO',
        'OrrrrrrrO',
        'OOOOOOOOO',
    ])
    c.ground(ox0 + 13, ['OOOOOOOOO', 'OKKKKKKkO', 'OOkkkkkOO', '..OkxO...', '.OkkkkxO.', 'OOOOOOOOO'])
    c.ground(b.wx1 - 16, CRATE)
    c.prop(b.wx1 - 16, b.H - 19, CRATE)
    c.ground(b.wx1 - 7, POT)
    c.ground(ox1 + 1, JAR)
    return b


SPRITES = [
    ('civic_clinic', clinic),
    ('civic_police-station', police),
    ('civic_school', school),
    ('civic_town-hall', town_hall),
    ('civic_records-office', records_office),
    ('civic_courthouse', courthouse),
    ('civic_jail', jail),
    ('shop_general', shop),
    ('shop_market-stall', market_stall),
    ('shop_market-stall_closed', lambda: market_stall(False)),
    ('shop_warehouse', warehouse),
    ('work_farm', farm),
    ('work_pasture', pasture),
    ('work_dock', dock),
    ('work_lumber-camp', lumber_camp),
    ('work_quarry', quarry),
    ('work_mine', mine),
    ('work_fuel-works', fuel_works),
    ('work_workshop', workshop),
]


def build():
    sheet = Sheet('buildings')
    for name, fn in SPRITES:
        s = fn()
        im = s.c.image()
        anchor = s.anchor or (im.width // 2, im.height - 1)
        add_with_snow(sheet, name, im, lambda: fn().c.image(), anchor=anchor, footprint=s.footprint)
    return sheet


if __name__ == '__main__':
    build().save()
