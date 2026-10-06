"""Landmarks: the built wonders a country is proud of, as City-view set pieces with map icons.

Original GBA-era top-down pixel art in three-quarter view, lit from the top left and finished
with the shared 1-px OUTLINE ring. Each set piece stands on whole tiles and anchors at the bottom
centre of its footprint. Roofs, walls, windows and doors come from buildings.py, so the
landmarks share the eave lines, glass and trim of the town around them. Light, spray and foam
are unringed layers on top, and the observatory's night overlay lights its glass the way the
houses' night overlays do.

Every design is fictional: no replica of a real landmark, no religious, royal, national or
military symbol, no statues, no gold opulence and no text. Red and orange stay with the crime
glyphs, and the body-hue ramps appear only as glass, flowers and night glints.

Build: python tools/sprites/landmarks.py
"""
import math

import numpy as np
from PIL import Image

import buildings
from buildings import _hash, roof_hip, wall
from spritekit import Sheet, add_outline, cmap, from_ascii, pad

KEY = {**buildings.SYM, **cmap(I='ICE_L', i='ICE', e='LILAC', o='ROSE', u='BODY_L')}


class Canvas(buildings.Canvas):
    """The buildings canvas, rendered with the landmark key and an unringed top layer."""

    def __init__(self, w, h):
        super().__init__(w, h)
        self.over = []            # (x, y, rows) composited above the ringed art: light, spray, foam
        self.fill = None          # colour for OUTLINE pixels that overlapping rings box in

    def thin(self, fill):
        self.fill = fill

    def image(self):
        im = add_outline(from_ascii(self.rows(), KEY))
        if self.fill:
            a = np.array(im)
            o = (a[:, :, 3] > 0) & (a[:, :, :3] == KEY['O']).all(axis=2)
            boxed = np.zeros_like(o)
            boxed[1:-1, 1:-1] = o[1:-1, 1:-1] & o[:-2, 1:-1] & o[2:, 1:-1] & o[1:-1, :-2] & o[1:-1, 2:]
            a[boxed, :3] = KEY[self.fill]
            im = Image.fromarray(a)
        if self.over:
            top = Canvas(self.w, self.h)
            for x, y, rows in self.over:
                top.stamp(x, y, rows)
            im.alpha_composite(from_ascii(top.rows(), KEY))
        return im


def ellipse(cx, cy, rx, ry):
    """Pixels inside an ellipse, with their offsets from the centre normalised to the radii."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if u * u + v * v <= 1:
                yield x, y, u, v


def ring(rows):
    """Wrap a part's fills in a 1-px OUTLINE ring, growing the grid by a pixel on each side."""
    h, w = len(rows) + 2, max(len(r) for r in rows) + 2
    fill = [['.'] * w for _ in range(h)]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch not in '. ':
                fill[y + 1][x + 1] = ch
    out = [r[:] for r in fill]
    for y in range(h):
        for x in range(w):
            if fill[y][x] == '.' and any(0 <= y + dy < h and 0 <= x + dx < w and fill[y + dy][x + dx] != '.'
                                         for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = 'O'
    return [''.join(r) for r in out]


def layer(w, h):
    return [['.'] * w for _ in range(h)]


def rows_of(grid):
    return [''.join(r) for r in grid]


def grass(x, y, ch='G'):
    """Grass with the terrain tiles' sparse light and dark blades. In buildings.SYM 'g' is the
    light green and 'G' the mid green."""
    n = _hash(x, y) % 19
    if n == 0:
        return 'g' if ch != 'l' else 'G'
    if n == 1 and ch != 'l':
        return 'l'
    return ch


def mound(c, cx, base, rx, ry):
    """A grassy hill standing on the base row: lit on its top left, shaded on its lower right,
    with a dark foot so it reads as raised ground rather than an outline on the grass."""
    for x, y, u, v in ellipse(cx, base + 0.5, rx, ry):
        if y > base:
            continue
        lit = u + v * 0.7
        ch = 'g' if lit < -0.95 else 'l' if u > 0.62 or lit > 0.45 or y >= base - 1 else 'G'
        c.put(x, y, grass(x, y, ch))


def outlined(rows):
    return add_outline(pad(from_ascii(rows, KEY)))


# ------------------------------------------------------------------ library
# A long reading hall of warm sandstone under a slate roof: tall arched windows between cream
# pilasters, a cream entrance bay rising above the eave with an open-book plaque, a fanlight
# over closed double doors, a broad flight of steps and two clipped shrubs in planters.
BOOK = [                                           # an open book on a framed stone plaque
    '.OOOOOOOOOOOOOOOOO.',
    'OKKKKKKKKKKKKKKKKkO',
    'OKk..OOO...OOO..kxO',
    'OKkOOWWWOOOCCCOOkxO',
    'OKOWWWWWWOCCCCCcOxO',
    'OKOWxxxxWOCxxxxcOxO',
    'OKOWWWWWWOCCCCCcOxO',
    'OKOWxxxWWOCCxxxcOxO',
    'OKOWWWWWWOCCCCCcOxO',
    'OKkOOOOOWOCOOOOOkxO',
    'OKkxxxxxOOOxxxxxkxO',
    'OkxxxxxxxxxxxxxxxxO',
    '.OOOOOOOOOOOOOOOOO.',
]


def arched_window(w, h, frame='C'):
    """A tall window under a round head: a fanlit head, then two lights in four panes."""
    f = frame
    left = (w - 3) // 2
    right = w - 3 - left - 2
    rows = ['..' + 'O' * (w - 4) + '..', '.O' + f * (w - 4) + 'O.']
    rows += ['O' + f + 'A' * (w - 4) + f + 'O'] * 3
    rows.append('O' + f * (w - 2) + 'O')
    body = h - 8
    for i in range(body):
        g = 'A' if i < body // 2 else 'a'
        rows.append('O' + f * (w - 2) + 'O' if i in (body // 3, 2 * body // 3) else
                    'O' + f + g * left + f + g * right + f + 'O')
    rows.append('O' + f * (w - 2) + 'O')
    rows.append('O' * w)
    rows = [list(r) for r in rows]
    rows[2][2] = rows[3][2] = rows[6][2] = 'W'
    return [''.join(r) for r in rows]


SHRUB = [
    '..OOOOO..',
    '.OgggGGO.',
    'OggGGGGGO',
    'OgGGGGlGO',
    'OGGGGlllO',
    '.OllllO..',
    'OKKKKKKkO',
    'OkkkkkkxO',
    'OkkkkkkxO',
    'OOOOOOOOO',
]


def library():
    W, H = 96, 72
    c = Canvas(W, H)
    E, base, g = 22, 63, 70                    # eave row, wall base row, ground row
    wx0, wx1 = 3, W - 4
    roof_hip(c, 1, W - 2, 1, E - 1, 'slate', 'slate')
    c.hline(wx0, wx1, E, 'O')
    wall(c, wx0, wx1, E + 1, base, 'sand', plinth=None)
    for y, ch in ((E + 1, 's'), (E + 2, 'C'), (E + 3, 'C'), (E + 4, 's')):
        c.hline(wx0, wx1, y, ch)                # frieze under the eave
    c.rect(wx0, base - 5, wx1, base, 'k')       # rusticated plinth
    c.tile(wx0, base - 5, wx1, base, ['Kkkkkkkkkkkx', 'kkkkkkkkkkkx', 'xxxxxxxxxxxx'], stagger=6)
    c.hline(wx0, wx1, base - 6, 'K')
    c.vline(wx0, base - 5, base, 'K')
    c.vline(wx1, base - 5, base, 'x')
    for px in (4, 17, 29, W - 31, W - 19, W - 6):     # cream pilasters between the windows
        c.vline(px, E + 5, base - 7, 'W' if px < W // 2 else 'C')
        c.vline(px + 1, E + 5, base - 7, 'C')
        c.vline(px + 2, E + 5, base - 7, 's')
    for x in (7, 19, W - 28, W - 16):
        c.stamp(x, E + 6, arched_window(9, 28))
        c.put(x + 4, E + 5, 'W')                # keystone
        c.hline(x, x + 8, E + 34, 'C')
        c.swap(x, E + 35, x + 8, E + 35, buildings.SHADE)
    bx0, bx1 = W // 2 - 14, W // 2 + 13         # cream entrance bay rising above the eave
    top = 7
    c.rect(bx0, top, bx1, base - 6, 'C')
    c.tile(bx0, top + 3, bx1, base - 6, ['CCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC',
                                          'cccccccccccccC'], stagger=7, oy=1)
    for y, ch in ((top, 'W'), (top + 1, 'C'), (top + 2, 'c'), (top + 3, 'O')):
        c.hline(bx0 - 1, bx1 + 1, y, ch)
    c.vline(bx0 - 1, top + 4, base - 6, 'O')
    c.vline(bx1 + 1, top + 4, base - 6, 'O')
    c.vline(bx0, top + 4, base - 6, 'W')
    c.vline(bx1, top + 4, base - 6, 'c')
    c.prop(W // 2 - 9, top + 5, BOOK)
    ax, r, spring = W // 2, 9, base - 17        # fanlit arch over the doors
    for y in range(spring - r - 2, base + 1):
        for x in range(ax - r - 2, ax + r + 2):
            d = math.hypot(x + 0.5 - ax, min(0.0, y + 0.5 - spring))
            if y >= spring:
                d = abs(x + 0.5 - ax)
            if d < r - 1:
                ang = math.degrees(math.atan2(spring - y, x + 0.5 - ax))
                fan = y < spring and abs(ang % 45) < 8
                c.put(x, y, 'C' if fan else 'A' if y < spring - 3 else 'a')
            elif d < r:
                c.put(x, y, 'O')
            elif d < r + 2 and y < spring:
                c.put(x, y, 'W' if x < ax else 'c')
    c.rect(ax - 1, spring - r - 2, ax, spring - r - 1, 'W')   # keystone
    c.hline(ax - r + 1, ax + r - 2, spring, 'C')
    c.stamp(ax - 9, spring + 1, buildings.door_double(h=base - spring))
    for i in range(3):                          # steps, widening toward the street
        y = base + 1 + 2 * i
        x0, x1 = 26 - 3 * i, W - 27 + 3 * i
        c.hline(x0, x1, y, 'C')
        c.hline(x0, x1, y + 1, 'c')
        c.put(x1, y + 1, 'K')
    c.hline(20, W - 21, g, 'K')
    c.ground(8, SHRUB)
    c.ground(W - 17, SHRUB)
    return c.image(), [6, 2]


# ------------------------------------------------------------------ clock tower
# A slim civic tower of pale ashlar: a stone plinth with the door, a shaft with a narrow
# window, a grey stone clock stage with one round face, a louvred stage and a slate pyramid
# roof with a plain ball finial (no cross-bar or vane, so nothing on top reads as a cross).
CLOCK_FACE = [
    '.....OOOOOO.....',
    '...OOWWWWWWOO...',
    '..OWWCCCCCCCcO..',
    '.OWCCCCCxCCCCcO.',
    '.OWCCCCCxCCCCcO.',
    'OWCCCCCCxCCCCCcO',
    'OWCCCCCCxCCCCCcO',
    'OWxCCCCCxCCCCxcO',
    'OWxCCCCxxCCCCxcO',
    'OWCCCCxxCCCCCCcO',
    'OWCCCxxCCCCCCCcO',
    '.OCCCCCCCCCCCcO.',
    '.OCCCCCCxCCCCcO.',
    '..OcCCCCCCCccO..',
    '...OOccccccOO...',
    '.....OOOOOO.....',
]

LOUVRE = [
    '.OOOO.',
    'OnnnnO',
    'OnnnnO',
    'OdwwdO',
    'OnnnnO',
    'OdwwdO',
    'OnnnnO',
    'OdwwdO',
    'OnnnnO',
    'OOOOOO',
]


def clock_tower():
    W, H = 32, 96
    c = Canvas(W, H)
    g = H - 2
    # roof: a slate pyramid with flared eaves, lit on its left face
    widths = [2, 4, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28]
    top = 4
    for i, w in enumerate(widths):
        y = top + i
        x0, x1 = 16 - w // 2, 15 + w // 2
        for x in range(x0, x1 + 1):
            ch = 'K' if x < 16 - w // 4 else 'x' if x > 15 + w // 4 else 'k'
            if (y - top) % 3 == 2 and x0 < x < x1:
                ch = {'K': 'k', 'k': 'x', 'x': 'x'}[ch]
            c.put(x, y, ch)
    eave = top + len(widths)
    c.hline(2, 29, eave, 'k')
    c.hline(2, 29, eave + 1, 'x')
    c.prop(14, 0, ['.OO.', 'OKkO', 'OkxO', '.OO.'])
    c.vline(15, 3, 3, 'x')
    c.vline(16, 3, 3, 'x')
    # louvred stage
    y0 = eave + 2
    c.hline(4, 27, y0, 'O')
    c.rect(5, y0 + 1, 26, y0 + 12, 'C')
    c.vline(5, y0 + 1, y0 + 12, 'W')
    c.vline(26, y0 + 1, y0 + 12, 'c')
    c.stamp(8, y0 + 2, LOUVRE)
    c.stamp(18, y0 + 2, LOUVRE)
    # clock stage
    cs = y0 + 13
    c.hline(3, 28, cs, 'O')
    c.hline(3, 28, cs + 1, 'K')
    c.rect(4, cs + 2, 27, cs + 20, 'k')
    c.vline(4, cs + 2, cs + 20, 'K')
    c.vline(27, cs + 2, cs + 20, 'x')
    c.hline(3, 28, cs + 21, 'K')
    c.hline(3, 28, cs + 22, 'x')
    c.hline(3, 28, cs + 23, 'O')
    c.stamp(8, cs + 3, CLOCK_FACE)
    # shaft of pale ashlar
    s0 = cs + 24
    base = g - 6
    c.rect(5, s0, 26, base, 'C')
    c.tile(5, s0, 26, base, ['WCCCCCCc', 'CCCCCCCc', 'CCCCCCCc', 'cccccccc'], stagger=4)
    c.vline(5, s0, base, 'W')
    c.vline(6, s0, base, 'C')
    c.vline(26, s0, base, 'c')
    c.hline(5, 26, s0, 'c')
    c.stamp(13, s0 + 4, buildings.NARROW_WINDOW)
    c.hline(13, 17, s0 + 15, 'K')
    # plinth and door
    c.hline(4, 27, base - 1, 'O')
    c.hline(4, 27, base, 'K')
    c.hline(4, 27, base + 1, 'k')
    c.rect(4, base + 2, 27, g, 'k')
    c.tile(4, base + 2, 27, g, ['Kkkkkkx', 'kkkkkkx', 'xxxxxxx'], stagger=3)
    c.vline(27, base + 2, g, 'x')
    c.rect(5, g - 17, 26, g, 'K')
    c.vline(26, g - 16, g, 'k')
    c.stamp(7, g - 15, buildings.door_double(h=16))
    return c.image(), [2, 2]


# ------------------------------------------------------------------ observatory
# A white dome on a stone drum, set on a small grassy hill with steps. The dome's shutter is
# open on a slit, and the pale telescope tube shows inside it, tilted to the sky.
SMALL_ARCH = ['.OOO.', 'OAAAO', 'OWAaO', 'OAAaO', 'OaaaO', 'OaaaO', 'OOOOO']


def observatory():
    c, _ = observatory_canvas()
    return c.image(), [4, 3]


def observatory_night():
    """Lit glass only, drawn over the day sprite after dark like the houses' night overlays.
    The telescope is left out, so the night-tinted tube shows dark against the glowing slit."""
    c, windows = observatory_canvas()
    g = layer(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            if c.get(x, y) == 'n':
                g[y][x] = 'Y'
    for wx, wy in windows:
        for dy, row in enumerate(SMALL_ARCH):
            for dx, ch in enumerate(row):
                if ch in 'AaW':
                    g[wy + dy][wx + dx] = 'Y'
        g[wy + 2][wx + 1] = 'u'
    return from_ascii(rows_of(g), KEY), [4, 3]


def observatory_canvas():
    W, H = 64, 64
    c = Canvas(W, H)
    g = H - 2
    mound(c, 31.5, g, 31, 21)
    for i in range(6):                             # steps up the hill to the door
        y = g - 2 * i
        x0, x1 = 25 - i // 2, 38 + i // 2
        c.hline(x0, x1, y, 's')
        c.hline(x0, x1, y - 1, 'C')
    cx, r = 32.0, 16
    rim, base = 27, 47                             # drum top and foot at the centre line

    def sag(x):                                    # how far the near side of a ring dips
        u = (x + 0.5 - cx) / r
        return round(3 * math.sqrt(max(0.0, 1 - u * u)))

    for x in range(int(cx) - r, int(cx) + r):      # stone drum, shaded as a cylinder
        u = (x + 0.5 - cx) / r
        for y in range(rim + sag(x) - 2, base + sag(x) - 3):
            ch = 'K' if u < -0.62 else 'x' if u > 0.6 else 'k'
            if (y - rim) % 4 == 0:
                ch = 'x' if ch == 'k' else ch
            c.put(x, y, ch)
        c.put(x, rim + sag(x) - 3, 'C')            # cream ring where the dome sits
        c.put(x, rim + sag(x) - 2, 'c')
    for x, y, u, v in ellipse(cx, rim - 3, r, r + 1):   # white dome lit from the top left
        if y >= rim - 3 + sag(x):
            continue
        light = u * 0.8 + v * 0.6
        c.put(x, y, 'W' if light < -0.5 else 'C' if light < 0.3 else 'c' if light < 0.8 else 'K')
    sx0, sx1 = 30, 35                              # shutter slit from the base over the top
    for y in range(rim - r - 6, rim + sag(sx0) - 3):
        for x in range(sx0, sx1 + 1):
            if c.get(x, y) not in '.O' or y >= rim - r - 4:
                c.put(x, y, 'n')
        for x, ch in ((sx0 - 1, 'W'), (sx1 + 1, 'c')):
            if c.get(x, y) not in '.n':
                c.put(x, y, ch)
    for i in range(18):                            # the refractor, tilted up through the slit
        y = rim - 4 - i
        x = sx0 + 1 + i // 7
        for dx, ch in enumerate('WCc'):
            c.put(x + dx, y, ch)
    c.prop(sx0 + 2, rim - 25, ['OOOOO', 'OxAxO', 'OOOOO'])     # dew cap and lens
    c.rect(int(cx) - 11, base - 18, int(cx) + 10, base - 1, 'K')   # stone door surround
    c.vline(int(cx) + 10, base - 17, base - 1, 'k')
    c.stamp(int(cx) - 9, base - 16, buildings.door_double(h=16))
    windows = [(int(cx) - 15, rim + 4), (int(cx) + 11, rim + 4)]
    for x, y in windows:
        c.stamp(x, y, SMALL_ARCH)
    return c, windows


# ------------------------------------------------------------------ windmill
# A great tower mill on a mound: a whitewashed tower, a domed slate cap, and four canvas sails on
# lattice frames that turn a sixteenth of a turn per frame. The sails repeat every quarter turn,
# so four frames loop smoothly.
SAIL_R = 20


def sail_cell(px, py, angle):
    """What one sail point shows: 'd' the stock, 'w' a frame bar, 'C' canvas, or None."""
    for k in range(4):
        t = math.radians(angle + 90 * k)
        a = px * math.sin(t) - py * math.cos(t)    # along the sail, out from the hub
        b = px * math.cos(t) + py * math.sin(t)    # across it, on the trailing side
        if -1 <= a <= SAIL_R and abs(b) <= 0.8:
            return 'd'
        if 5 <= a <= SAIL_R and 0.8 < b <= 6:
            if b > 5.3 or (a - 5) % 5 < 0.6 or a > SAIL_R - 0.6:
                return 'w'
            return 'C'
    return None


def sails(angle):
    """Four sails at `angle` degrees, supersampled 4x4 per pixel; stock and bars win ties."""
    size = 2 * SAIL_R + 3
    c0 = size / 2
    grid = layer(size, size)
    for y in range(size):
        for x in range(size):
            hits = {'d': 0, 'w': 0, 'C': 0}
            for sy in range(4):
                for sx in range(4):
                    ch = sail_cell(x + (sx + 0.5) / 4 - c0, y + (sy + 0.5) / 4 - c0, angle)
                    if ch:
                        hits[ch] += 1
            if hits['d'] >= 6:
                grid[y][x] = 'd'
            elif hits['w'] >= 6:
                grid[y][x] = 'w'
            elif sum(hits.values()) >= 8:
                grid[y][x] = 'C'
    return rows_of(grid)


def windmill(frame):
    W, H = 48, 64
    c = Canvas(W, H)
    g = H - 2
    mound(c, 23.5, g, 23, 13)
    top, base = 25, g - 4
    for y in range(top, base + 1):                 # tapered whitewashed tower
        t = (y - top) / (base - top)
        half = round(8 + 4 * t)
        x0, x1 = 24 - half, 23 + half
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            c.put(x, y, 'W' if u < 0.18 else 'c' if u > 0.78 else 'C')
    c.stamp(15, base - 13, buildings.door_double(h=14))
    for (x, y) in ((21, 31), (25, 38)):
        c.stamp(x, y, ['OOOO', 'OAaO', 'OaaO', 'OOOO'])
    cap = [                                        # domed slate cap, wider than the tower top
        '.......KKKkkx.......',
        '.....KKKkkkkkxx.....',
        '...KKKkkkkkkkkkxx...',
        '..KKkkkkxkkkkkkkxx..',
        '.KKkkkkkkkkkxkkkkxx.',
        '.Kkkkxkkkkkkkkkkkkx.',
        'KKkkkkkkkkxkkkkkkkxx',
        'Kkkkkkkkkkkkkkkkkkkx',
        'Kkkkkkkkkkkkkkkkkkkx',
        'xxxxxxxxxxxxxxxxxxxx',
    ]
    c.prop(13, top - 11, ring(cap))
    s = sails((4 - frame) % 4 * 22.5)              # counter-clockwise, canvas trailing the stocks
    hub = (23.5, 21.5)
    off = (round(hub[0] - len(s[0]) / 2), round(hub[1] - len(s) / 2))
    c.prop(off[0] - 1, off[1] - 1, ring(s))
    c.prop(21, 19, ['.OOO.', 'OLLwO', 'OLwdO', 'OwddO', '.OOO.'])    # hub
    c.thin('d')
    return c.image(), [3, 2]


# ------------------------------------------------------------------ fountain
# A broad round basin of pale stone with a central pedestal, a middle bowl and a top spout.
# Water rises from the spout, spills from the bowl in two falls and rings out across the pool.
def bowl(c, cx, cy, rx, ry, lip=2, water=True):
    """A round stone bowl seen from above: lit rim, water inside, its rounded side below."""
    for x, y, u, v in ellipse(cx, cy + lip, rx, ry):
        if v > 0:
            c.put(x, y, 'K' if u < -0.6 else 'x' if u > 0.55 else 'k')
    for x, y, u, v in ellipse(cx, cy, rx, ry):
        c.put(x, y, 'C' if u < -0.2 and v < 0.3 else 'K')
    if water:
        for x, y, u, v in ellipse(cx, cy + 0.5, rx - 2, max(1.0, ry - 1.5)):
            c.put(x, y, 'x' if v < -0.35 else 'a')


def fountain(frame):
    W, H = 48, 48
    c = Canvas(W, H)
    cx = 24.0
    bowl(c, cx, 34.5, 22.5, 8.5, lip=4)            # the great basin
    ripples = ((8, 35), (15, 38), (30, 33), (36, 37), (21, 40), (12, 32))
    for i, (x, y) in enumerate(ripples):
        dx = 1 if (i + frame) % 2 else -1
        c.hline(x + dx, x + dx + 2, y, 'A')
    for x, y, u, v in ellipse(cx, 36.5, 5, 2):     # pedestal foot in the water
        c.put(x, y, 'K' if u < 0 else 'k')
    c.rect(22, 21, 25, 36, 'k')                    # column
    c.vline(22, 21, 36, 'K')
    c.vline(25, 21, 36, 'x')
    bowl(c, cx, 21.0, 10.5, 3.5, lip=3)            # lower bowl
    c.rect(23, 11, 24, 20, 'K')
    c.vline(24, 11, 20, 'k')
    bowl(c, cx, 11.0, 5.5, 2, lip=2)               # upper bowl
    jet = ['AW', 'WA', 'AW', 'WA', 'AW'] if frame == 0 else ['WA', 'AW', 'WA', 'AW', 'WA']
    c.prop(22, 4, ring(jet))
    spill = layer(W, H)                            # water spilling from both bowls, in arcs
    arcs = (((11, 22), (12, 23), (12, 24), (12, 25), (13, 26), (13, 27), (13, 28), (13, 29), (14, 30),
             (14, 31), (14, 32)),
            ((6, 12), (6, 13), (7, 14), (7, 15), (7, 16), (7, 17), (8, 18)),
            ((1, 3), (2, 2), (3, 3), (4, 4), (4, 5)))   # the jet's crown falling outward
    for side in (-1, 1):
        for n, arc in enumerate(arcs):
            for i, (dx, y) in enumerate(arc):
                x = int(cx) + side * dx - (side < 0)
                if n == 2 and (i + frame) % 2:
                    continue
                spill[y][x] = 'W' if (i + frame) % 3 == 0 else 'A'
        for k in range(3):                         # splashes where the outer falls land
            x = int(cx) + side * (13 + k) - (side < 0)
            spill[33 + (k + frame) % 2][x] = 'W' if k != 1 else 'A'
    c.over.append((0, 0, rows_of(spill)))
    return c.image(), [3, 2]


# ------------------------------------------------------------------ lighthouse
# A banded cream-and-stone tower on a rocky islet, with a railed gallery, a glazed lantern and a
# grey cap. The beam sweeps left, flares toward the viewer, then sweeps right; foam laps the rocks.
BOULDERS = [  # (left, top, width, height), back to front
    (4, 0, 16, 10), (25, 1, 17, 10), (13, 3, 22, 11), (0, 7, 15, 9), (31, 7, 16, 9), (11, 10, 26, 8),
]


def boulder(w, h):
    """A rounded rock, flatter underneath, lit on its top left and dark on its lower right."""
    rows = []
    for y in range(h):
        row = ''
        for x in range(w):
            u, v = (x + 0.5) / w * 2 - 1, (y + 0.5) / h * 2 - 1
            d = u * u + (v * 1.1) ** 2 if v < 0 else u * u * 0.8 + v * v * 0.5
            if d > 1:
                row += '.'
                continue
            light = u * 0.6 + v * 0.8
            row += 'K' if light < -0.45 else 'x' if light > 0.4 else 'k'
        rows.append(row)
    return rows


def lighthouse(frame):
    W, H = 48, 96
    c = Canvas(W, H)
    islet = H - 21                                 # top row of the rocks
    yt, yb = 25, islet + 6                         # tower from under the gallery to its foot
    for y in range(yt, yb + 1):                    # banded tower, tapering upward
        t = (y - yt) / (yb - yt)
        w = 2 * round(6 + 3 * t)
        x0, x1 = 24 - w // 2, 23 + w // 2
        for x in range(x0, x1 + 1):
            u = (x - x0) / (x1 - x0)
            dip = 1 if 0.3 < u < 0.7 else 0        # bands curve round the near side
            stone = ((y - yt - dip) // 9) % 2 == 1 or y > yb - 5
            if stone:
                ch = 'K' if u < 0.2 else 'x' if u > 0.75 else 'k'
            else:
                ch = 'W' if u < 0.2 else 'c' if u > 0.75 else 'C'
            c.put(x, y, ch)
    c.hline(14, 33, yb - 5, 'K')                   # flared stone foot
    c.rect(14, yb - 4, 33, yb, 'k')
    c.vline(14, yb - 4, yb, 'K')
    c.vline(33, yb - 4, yb, 'x')
    c.vline(32, yb - 4, yb, 'x')
    for y, x in ((38, 22), (56, 22), (47, 23)):
        c.stamp(x, y, ['OOOO', 'OAaO', 'OaaO', 'OOOO'])
    c.stamp(19, yb - 14, ['..OOOOOO..', '.OddddddO.', 'OddwwwwddO'] + ['OdwwddwwdO'] * 6 + ['OOOOOOOOOO'])
    for bx, by, bw, bh in BOULDERS:
        c.prop(bx, islet + by, ring(boulder(bw, bh)))
    for x, y in ((9, islet + 1), (30, islet + 2), (16, islet + 4), (6, islet + 8)):
        c.put(x, y, 'G')
        c.put(x + 1, y, 'g')
    # gallery: lit floor, front face, shadow, and a railing of balusters
    c.hline(14, 33, 21, 'K')
    c.hline(14, 33, 22, 'k')
    c.hline(14, 33, 23, 'x')
    c.hline(15, 32, 17, 'K')
    for x in range(15, 33):
        c.vline(x, 18, 20, 'k' if x % 2 else 'x')
    for y in range(10, 17):                        # lantern: glass round a lamp
        for x in range(19, 29):
            c.put(x, y, 'x' if x in (19, 28) or (x in (23, 24) and y < 12) else 'A')
    c.rect(21, 12, 26, 15, 'Y')
    c.rect(22, 13, 25, 14, 'W')
    c.hline(18, 29, 9, 'x')
    for i, w in enumerate((12, 12, 10, 8, 6)):     # domed cap
        y = 8 - i
        x0, x1 = 24 - w // 2, 23 + w // 2
        c.hline(x0, x1, y, 'k')
        c.put(x0, y, 'K')
        c.put(x0 + 1, y, 'K')
        c.put(x1, y, 'x')
    c.prop(21, 0, ['.OOOO.', 'OKKkxO', '.OOOO.'])
    c.over.append((0, 0, beam(W, H, frame)))
    c.over.append((0, 0, surf(c, islet, frame)))
    return c.image(), [3, 2]


def beam(w, h, frame):
    """The lamp's light: a wedge sweeping left, a flare toward the viewer, then right."""
    g = layer(w, h)
    lamp_y = 13
    if frame == 1:
        for (dx, dy, ch) in ((7, 0, 'W'), (8, 0, 'W'), (9, 0, 'C'), (11, 0, 'C'), (6, -4, 'C'), (6, 4, 'C'),
                             (5, -3, 'W'), (5, 3, 'W'), (0, -8, 'W'), (0, -9, 'C')):
            for x in (23 - dx, 24 + dx) if dx else (23, 24):
                g[lamp_y + dy][x] = ch
        return rows_of(g)
    for i in range(20):                            # wedge widening away from the lamp
        x = 18 - i if frame == 0 else 29 + i
        if not 0 <= x < w:
            break
        half = 1 + i // 4
        for d in range(-half, half + 1):
            y = lamp_y + d - i // 7
            if abs(d) <= half - 1 - i // 12 and i < 14:
                g[y][x] = 'W' if abs(d) < 1 + i // 8 else 'C'
            elif (x + y) % 2 == 0:
                g[y][x] = 'C'
    return rows_of(g)


def surf(c, islet, frame):
    """Foam lapping along the rocks' waterline and a few crests nearby, shifting each frame."""
    g = layer(c.w, c.h)
    for x in range(c.w):
        rock = [y for y in range(islet, c.h) if c.get(x, y) != '.']
        if not rock:
            continue
        y = max(rock) + 1                          # the waterline, over the rocks' outline
        if (x + frame * 2) % 7 < 5 and y < c.h:
            g[y][x] = 'W' if (x + frame) % 4 else 'A'
        if (x * 3 + frame * 5) % 11 == 0 and y - 1 > islet:
            g[y - 1][x] = 'W'                      # spray thrown up on the stones
    for k, (x, y) in enumerate(((1, c.h - 9), (43, c.h - 11), (6, c.h - 1), (36, c.h - 1))):
        dx = (frame + k) % 3 - 1
        for i in range(3):
            if 0 <= x + dx + i < c.w:
                g[y][x + dx + i] = 'W' if i == 1 else 'A'
    return rows_of(g)


# ------------------------------------------------------------------ viaduct
# A grey stone viaduct of tall round arches carrying a dirt road between low parapets. The span
# tiles left to right: the half-piers at its edges meet their neighbours' to make whole piers.
# Each end is a masonry abutment and a grassy embankment that ramps the road down at 1:2.
BLOCKS = ['Kkkkkkkx', 'kkkkkkkx', 'kkkkkkkx', 'xxxxxxxx']
ROAD = 'sssLsssssSssssLssssssSsssLssssss'          # one 32-px repeat of dirt-road speckle
SPAN_W, ARCH_R, SPRING = 32, 11, 27


def deck(c, x, top, face=True):
    """One column of deck from row `top`: back parapet, road, front parapet and string course."""
    for r, ch in enumerate('CK' + 'd' + 'sss' + 'CKkx' + ('Wx' if face else '')):
        if ch == 's':
            ch = ROAD[(x * 7 + r * 11) % 32] if r != 3 else ROAD[(x + 13) % 32]
        c.put(x, top + r, ch)


def masonry(c, x, y0, y1):
    for y in range(y0, y1 + 1):
        c.put(x, y, BLOCKS[y % 4][(x + (y // 4) * 4) % 8])


def viaduct_span():
    W, H = SPAN_W, 48
    c = Canvas(W, H)
    g = H - 2
    for x in range(W):
        deck(c, x, 1)
        masonry(c, x, 13, g)
    cx = W / 2
    for y in range(13, g + 1):                     # arch opening, voussoir ring and shadow
        for x in range(W):
            dx = x + 0.5 - cx
            dy = min(0.0, y + 0.5 - SPRING)
            d = ARCH_R - math.hypot(dx, dy)        # depth inside the opening
            plinth = y >= g - 3 and abs(dx) > ARCH_R - 2
            if d > 0 and not plinth:
                if d < 1:
                    c.put(x, y, 'O')
                elif dy < 0 and d < 3 or dy == 0 and y < SPRING + 2 and d < 3:
                    c.put(x, y, 'x')
                else:
                    c.put(x, y, '_')
            elif -2.5 < d <= 0 and dy < 0:
                ang = math.degrees(math.atan2(-dy, dx))
                c.put(x, y, 'C' if abs(ang - 90) < 7 else 'x' if (ang % 15) < 2.5 else 'K')
            elif plinth:
                c.put(x, y, 'K' if y == g - 3 else 'k' if dx < 0 else 'x')
    return c.image(), [2, 1]


def viaduct_end(side):
    # Drawn column by column out from the span joint rather than mirrored, so both ends keep
    # the light on the top left.
    W, H = 64, 48
    c = Canvas(W, H)
    g = H - 2
    abut = 14                                      # masonry columns beside the span

    def col(x):
        return W - 1 - x if side == 'left' else x

    for x in range(W):
        run = col(x)
        top = 1 + run // 2
        if run < abut:
            deck(c, x, top)
            masonry(c, x, top + 13, g)
            if run == abut - 1:
                c.vline(x, top + 13, g, 'K' if side == 'left' else 'x')
        else:
            deck(c, x, top, face=False)
            c.put(x, top + 11, 'l')                # the parapet's shadow on the bank
            for y in range(top + 12, g + 1):
                c.put(x, y, grass(x, y, 'l' if y >= g - 1 else 'G'))
    post = ['OOOOO', 'OCCCO', 'OKkxO', 'OOOOO', 'OKkxO', 'OKkxO', 'OKkxO', 'OOOOO']
    px = 1 if side == 'left' else W - 6
    c.prop(px, 1 + (W - 4) // 2 + 4, post)       # pillar where the parapet ends
    return c.image(), [4, 1]


# ------------------------------------------------------------------ glasshouse
# A botanical glasshouse of three glazed vaults side by side, their arched ends facing the
# street. White ribs, pale roof glass, palms and flowering shrubs pressing against the panes.
PALM = [                                           # a palm crown rising above the canopy
    '.....gg..gg.....',
    '...ggGGggGGgg...',
    '..gGG.lGGl.GGg..',
    '.gG..gGllGg..Gl.',
    'gG..gG.ll.Gg..Gl',
    'G..gG..wd..lG..l',
    '..gl...wd...lG..',
]


def canopy(c, x0, x1, top, bottom, seed):
    """Dense planting behind glass: rounded crowns lit on top, flowers in the lower leaves."""
    crowns = [(x0 + 4 + 9 * i + _hash(i, seed) % 3, 4 + _hash(seed, i) % 3) for i in range((x1 - x0) // 9 + 1)]
    for x in range(x0, x1 + 1):
        edge = min(top + 6 - math.sqrt(max(0.0, r * r - (x - cx) ** 2)) for cx, r in crowns)
        for y in range(max(top, int(edge)), bottom):
            n = _hash(x, y + seed) % 17
            depth = y - edge
            if depth < 1.5 or n < 3:
                ch = 'g'
            elif n > 13 or (depth > 9 and n > 9):
                ch = 'l'
            elif depth > 7 and n == 3:
                ch = 'P'
            elif depth > 7 and n == 4:
                ch = 'o'
            else:
                ch = 'G'
            c.put(x, y, ch)


def glasshouse():
    W, H = 96, 64
    c = Canvas(W, H)
    g = H - 2
    plinth = g - 4                                 # top row of the stone plinth
    eave = plinth - 17                             # where the arches spring
    depth, r = 14, 15
    for bcx in (16.0, 48.0, 80.0):
        x0, x1 = int(bcx - r), int(bcx + r) - 1
        arch = {x: round(eave - math.sqrt(max(0.0, r * r - (x + 0.5 - bcx) ** 2))) for x in range(x0, x1 + 1)}
        for x in range(x0, x1 + 1):
            side = (x + 0.5 - bcx) / r
            for z in range(depth + 1):             # the vault going back, reflecting the sky
                bar = z % 4 == 0 or (x - int(bcx)) % 5 == 0
                ch = 'W' if bar or (side < -0.5 and z % 4 == 1) else 'I' if side < 0.1 else 'i' if side < 0.6 else 'A'
                c.put(x, arch[x] - z, 'C' if bar and side > 0.6 else ch)
            for y in range(arch[x] + 1, plinth):   # front glass
                c.put(x, y, 'A')
        palm = int(bcx) - 8
        for y in range(eave - 6, eave + 2):
            c.put(palm + 7, y, 'w')
            c.put(palm + 8, y, 'd')
        c.stamp(palm, eave - 11, PALM)
        canopy(c, x0, x1, eave - 4, plinth, int(bcx))
        for gx, gy in ((x0 + 3, plinth - 3), (x0 + 17, eave + 7)):   # glints on the glass
            for i in range(4):
                c.put(gx + i, gy - i, 'I')
        for x in range(x0, x1 + 1):                # white glazing bars, front arch and transoms
            c.put(x, arch[x], 'W')
            for y in range(arch[x] + 1, plinth):
                if (x - int(bcx)) % 5 == 0 or y in (eave, eave + 9):
                    c.put(x, y, 'W' if x < bcx + 6 else 'C')
    for gx in (31, 63):                            # gutter posts between the bays
        c.rect(gx, eave - 2, gx + 1, plinth - 1, 'W')
        c.vline(gx + 1, eave - 2, plinth - 1, 'c')
        c.hline(gx - 1, gx + 2, eave - 3, 'C')
    c.rect(1, plinth, W - 2, g, 'k')               # stone plinth
    c.tile(1, plinth, W - 2, g, ['Kkkkkkkx', 'kkkkkkkx', 'xxxxxxxx'], stagger=4)
    c.hline(1, W - 2, plinth, 'K')
    door = ['O' * 18, 'OWWWWWWWOWWWWWWWWO'] + ['OWAAWAAWOWAAWAAWWO'] * 2 + \
           ['OWAaWAaWOWAaWAaWWO'] * 4 + ['OWWWWWWWOWWWWWWWWO'] + ['OWaaWaaWOWaaWaaWWO'] * 4 + \
           ['OWWWWWWWOWWWWWWWWO']
    c.stamp(W // 2 - 9, g - len(door) + 1, door)
    c.hline(W // 2 - 10, W // 2 + 9, g, 'K')
    return c.image(), [6, 2]


# ------------------------------------------------------------------ amphitheatre
# An open-air theatre of stone tiers cut into a grassy hill, with cream stair aisles, a sandy
# floor inside a kerb and a low wooden stage at the front, so the seats face the viewer.
def amphitheatre():
    W, H = 96, 64
    c = Canvas(W, H)
    cx, cy, k = 48.0, 47.0, 0.5                    # orchestra centre on the ground; depth squash
    tiers = 7
    radii = [12 + 3.5 * t for t in range(tiers + 1)]
    rise = 2
    rim = rise * tiers
    aisles = (40, 90, 140)

    def ground(x, y, h):
        """Ground-plane offset of screen pixel (x, y) seen on a surface at height h."""
        return x + 0.5 - cx, cy - (y + 0.5 + h)

    def in_half(gx, gy, r):
        return gy >= 0 and (gx / r) ** 2 + (gy / (k * r)) ** 2 <= 1

    def aisle(gx, gy):
        ang = math.degrees(math.atan2(gy / k, gx))
        return any(abs(ang - a) * math.hypot(gx, gy / k) * math.pi / 180 < 1.3 for a in aisles)

    outer = radii[-1] + 5
    for x in range(W):                             # the hill: a crest behind, flanks sloping down
        dx = abs(x + 0.5 - cx)
        if dx <= outer:
            top = cy - rim - 5 - k * outer * math.sqrt(1 - (dx / outer) ** 2)
        else:
            top = cy - rim - 5 + (dx - outer) * 2.4
        foot = cy + 4 if dx > radii[-1] else cy
        for y in range(int(top), int(foot) + 1):
            rim_px = y < top + 2 and dx > outer - 6
            shade = ('l' if x > cx else 'g') if rim_px else 'l' if y >= foot - 1 or x > cx + outer - 2 else 'G'
            c.put(x, y, grass(x, y, shade))
    for x in range(W):                             # walk round the top of the seats
        for y in range(H):
            gx, gy = ground(x, y, rim)
            if in_half(gx, gy, radii[-1] + 2.5) and not in_half(gx, gy, radii[-1]):
                c.put(x, y, 'S' if _hash(x, y) % 5 else 's')
    for t in range(tiers - 1, -1, -1):
        h = rise * (t + 1)
        for x in range(W):
            for y in range(H):
                gx, gy = ground(x, y, h)
                _, below = ground(x, y, h - rise)
                if in_half(gx, gy, radii[t + 1]):          # seat tread, lit from above
                    c.put(x, y, 'C' if aisle(gx, gy) else 'K')
                if in_half(gx, gy, radii[t]) and not in_half(gx, below, radii[t]):
                    side = gx / radii[t]                   # riser, darker where it faces away
                    c.put(x, y, 'c' if aisle(gx, gy) else 'x' if side < -0.5 else 'k')
        for x in range(W):                         # the tier's end wall facing the viewer
            dx = abs(x + 0.5 - cx)
            if radii[t] <= dx < radii[t + 1]:
                c.put(x, int(cy - h), 'C')
                for y in range(int(cy - h) + 1, int(cy) + 1):
                    c.put(x, y, 'x' if (y - int(cy)) % 3 == 0 or (x + (y // 3) * 4) % 8 == 0 else 'k')
    for x, y, u, v in ellipse(cx, cy + 0.5, radii[0] + 1, k * radii[0] + 3):   # orchestra floor
        c.put(x, y, 'C' if u * u + v * v > 0.78 else 'S' if _hash(x, y) % 7 else 's')
    sx0, sx1, st = 30, 65, 53                      # wooden stage, open to the seats
    for y in range(st, st + 6):
        for x in range(sx0, sx1 + 1):
            c.put(x, y, 's' if (x - sx0) % 6 == 5 else 'C' if y == st else 'S')
    c.hline(sx0, sx1, st + 6, 'O')
    c.rect(sx0, st + 7, sx1, st + 8, 'w')
    c.hline(sx0, sx1, st + 7, 'L')
    for px in (sx0 + 1, sx1 - 3):                  # lantern posts at the stage corners
        c.prop(px - 1, st - 10, ['.OOO.', 'OYCYO', 'OYYsO', '.OwO.', '.OwO.', '.OwO.', '.OwO.',
                                 '.OwO.', '.OwO.', '.OOO.'])
    return c.image(), [6, 4]


# ------------------------------------------------------------------ garden terraces
# Public gardens stepping up a slope in three terraces: coped retaining walls hung with ivy,
# mown lawns, clipped hedges, flower beds, topiary, a central stair between cheek walls and a
# small round fountain on the lowest terrace.
FLOWERS = 'PeWYo'
TOPIARY = [
    '..g..',
    '.gGl.',
    '.gGl.',
    'gGGll',
    'gGGGl',
    'gGGll',
    '.lll.',
    '..d..',
]
TREE = [
    '....gggG....',
    '..gggGGGGl..',
    '.ggGGGGGGll.',
    'ggGGGGGGGGll',
    'gGGGlGGGGGll',
    'GGGGGGGGGlll',
    '.GGGGGGGllll',
    '..lGGGGllll.',
    '...llllll...',
    '.....dd.....',
    '.....dw.....',
    '.....dw.....',
]


def hedge(c, x0, x1, y):
    """A clipped hedge running left to right, its lit top on row y and its face below."""
    c.hline(x0, x1, y - 1, 'O')
    c.hline(x0, x1, y, 'g')
    c.hline(x0, x1, y + 1, 'G')
    c.hline(x0, x1, y + 2, 'l')
    c.vline(x0 - 1, y, y + 2, 'O')
    c.vline(x1 + 1, y, y + 2, 'O')
    for x in range(x0 + 2, x1, 5):
        c.put(x, y + 1, 'l')


def flower_bed(c, x0, x1, y0, y1):
    """A bed edged with clipped box: clumps of flowers in staggered rows over their leaves."""
    c.rect(x0, y0, x1, y1, 'l')
    for y in range(y0 + 1, y1, 2):
        for x in range(x0 + 1 + (y // 2) % 2 * 2, x1 - 1, 4):
            ch = FLOWERS[_hash(x, y) % len(FLOWERS)]
            c.rect(x, y, min(x + 2, x1 - 1), y, ch)
            c.put(x + 1, y - 1, ch if y > y0 + 1 else c.get(x + 1, y - 1))
            c.hline(x, min(x + 2, x1 - 1), y + 1, 'G')
            c.put(x + 3, y, 'G')
    c.hline(x0 + 1, x1 - 1, y1, 'd')
    c.hline(x0, x1, y1 + 1, 'O')


def lawn(c, x0, x1, y0, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c.put(x, y, 'g' if (x - y) % 10 < 3 else grass(x, y))


def retaining_wall(c, x0, x1, y0, y1):
    c.hline(x0, x1, y0, 'W')
    c.hline(x0, x1, y0 + 1, 'c')
    c.rect(x0, y0 + 2, x1, y1, 'k')
    c.tile(x0, y0 + 2, x1, y1, ['Kkkkkkx', 'kkkkkkx', 'xxxxxxx'], stagger=3)
    c.vline(x0, y0 + 2, y1, 'K')
    c.vline(x1, y0 + 2, y1, 'x')
    for x in range(x0 + 3, x1 - 3):              # ivy hanging from the coping
        drop = (_hash(x // 3, y0) % 7) - 2
        for y in range(y0 + 2, y0 + 2 + max(0, drop)):
            c.put(x, y, 'G' if (x + y) % 3 else 'l')


def garden_terraces():
    W, H = 96, 72
    c = Canvas(W, H)
    g = H - 2
    cx = W // 2
    levels = [  # x0, x1, surface top row, wall top row, wall bottom row (back to front)
        (10, W - 11, 9, 21, 28),
        (5, W - 6, 29, 42, 49),
        (1, W - 2, 50, None, None),
    ]
    c.prop(0, 0, ring(TREE))                     # trees behind the top terrace
    c.prop(W - 14, 0, ring(TREE))
    for x0, x1, top, wtop, wbot in levels:
        lawn(c, x0, x1, top, (wtop or g) - 1)
        if wtop:
            retaining_wall(c, x0, x1, wtop, wbot)
    # back terrace: a long border of flowers before a hedge
    hedge(c, 11, W - 12, 10)
    flower_bed(c, 13, cx - 11, 13, 19)
    flower_bed(c, cx + 10, W - 14, 13, 19)
    # middle terrace: two beds, hedges along the back
    hedge(c, 6, cx - 10, 31)
    hedge(c, cx + 9, W - 7, 31)
    flower_bed(c, 9, cx - 13, 34, 40)
    flower_bed(c, cx + 12, W - 10, 34, 40)
    # front terrace: gravel walk, beds and the fountain
    for y in range(51, g + 1):
        for x in range(cx - 7, cx + 7):
            c.put(x, y, 'S' if _hash(x, y) % 6 else 's')
    flower_bed(c, 5, 31, 53, 59)
    flower_bed(c, W - 32, W - 6, 53, 59)
    hedge(c, 2, cx - 16, 64)
    hedge(c, cx + 15, W - 3, 64)
    for x, y, u, v in ellipse(cx, 58.5, 11, 4.5):
        c.put(x, y, 'K' if u * u + v * v > 0.55 else 'a')
    for x, y, u, v in ellipse(cx, 60.5, 11, 4.5):
        if v > 0.3 and c.get(x, y) not in 'Ka':
            c.put(x, y, 'k' if u < 0.5 else 'x')
    c.hline(cx - 4, cx + 3, 58, 'A')
    c.rect(cx - 1, 53, cx, 58, 'K')
    c.put(cx, 53, 'k')
    # central stair through both walls, between cheek walls with ball finials
    for wtop, wbot in ((21, 28), (42, 49)):
        for y in range(wtop, wbot + 2):
            for x in range(cx - 7, cx + 7):
                c.put(x, y, 'C' if (y - wtop) % 2 == 0 else 'c')
        for xw in (cx - 9, cx + 7):
            c.rect(xw, wtop - 1, xw + 1, wbot + 1, 'K')
            c.vline(xw + 1, wtop - 1, wbot + 1, 'k')
            c.prop(xw - 1, wtop - 4, ['.OO.', 'OKkO', 'OkxO', '.OO.'])
    for x, y in ((6, 28), (W - 11, 28), (2, 49), (W - 7, 49)):
        c.prop(x - 1, y - len(TOPIARY), ring(TOPIARY))
    c.thin('l')
    return c.image(), [6, 3]


# ------------------------------------------------------------------ map icons
# Each landmark's silhouette distilled for the Region view (16 px) and the Country view (8 px),
# drawn as fills and ringed like map.py's icons. Tall ones rise into the tile above.
ICON16 = {
    'lighthouse': [
        '......Kk......',
        '.....Kkkx.....',
        'CC...AYYa...CC',
        '..CC.AYYa.CC..',
        '....KKkkxx....',
        '.....WCCc.....',
        '.....WCCc.....',
        '.....Kkkx.....',
        '.....Kkkx.....',
        '.....WCCc.....',
        '....WCCCCc....',
        '....KkkkKx....',
        '....Kkkkkx....',
        '....WCCCCc....',
        '....WCCCCc....',
        '...KkkkkkKx...',
        '...KkkddkKx...',
        '..KKkkddkkxx..',
        'KKkkkkkkkkkkxx',
        'Kkkkxkkkkxkkkx',
        '.xkkkkxkkkkxx.',
        '..xxxxxxxxxx..',
    ],
    'viaduct': [
        '..............',
        '..............',
        '..............',
        'CCCCCCCCCCCCCC',
        'ssssssssssssss',
        'WCCCCCCCCCCCCc',
        'kKCCCKkkKCCCKx',
        'kC...CkkC...Cx',
        'k.....kk.....x',
        'k.....kk.....x',
        'k.....kk.....x',
        'k.....kk.....x',
        'xAaAaAxxAaAaAx',
        'aaaaaaaaaaaaaa',
    ],
    'observatory': [
        '.......W......',
        '.....WWWC.....',
        '....WWWnCc....',
        '...WWWCnCcc...',
        '...WWCCnCcc...',
        '..WWCCCnCccc..',
        '..CCCCCccccc..',
        '..KKkkkkkkxx..',
        '..KkkkddkkKx..',
        '..KkkkddkkKx..',
        '.gGGGGCCGGGGl.',
        'gGGGGGCCGGGGGl',
        'GGGGGGCCGGGlll',
        'llllllllllllll',
    ],
    'clock-tower': [
        '......Kk......',
        '.....KKkx.....',
        '....KKkkxx....',
        '...KKkkkkxx...',
        '..xxxxxxxxxx..',
        '...CnnCnnCc...',
        '...CnnCnnCc...',
        '..kkkkkkkkkx..',
        '..kkWWWWWkkx..',
        '..kWWWdWWWkx..',
        '..kWWWdWWWkx..',
        '..kWWddWWWkx..',
        '..kkWWWWWkkx..',
        '..kkkkkkkkkx..',
        '...WCCCCCCc...',
        '...WCCaCCCc...',
        '...WCCaCCCc...',
        '...WCCCCCCc...',
        '..KKkkkkkkxx..',
        '..Kkkwwwkkkx..',
        '..Kkkwwwkkkx..',
    ],
    'glasshouse': [
        '..............',
        '..............',
        '..IWIi..IWIi..',
        '.IWIiiA.WIiiA.',
        'IIWIiiAIIWIiiA',
        'IWIIiiAIWIIiiA',
        'WWWWWWWWWWWWWW',
        'WAgAgAWAgAgAgW',
        'WgGgGgWgGgGgGW',
        'GGlGGGlGGlGPGG',
        'GPGGlGGGPGGlGG',
        'KKKKKWAAWKKKKk',
        'kkkkkWaaWkkkkx',
    ],
    'library': [
        '....KKKKKk....',
        '....KWWWWx....',
        '.KKkKWkkWxkkx.',
        'KKkkKkkkkxkkkx',
        'xxxxxxxxxxxxxx',
        'SaSaSCddCSaSas',
        'SaSaSCddCSaSas',
        'SaSaSCddCSaSas',
        'KKKKKCddCKKKKk',
        '..CCCCCCCCCC..',
    ],
    'amphitheatre': [
        '....gGGGGl....',
        '..gGGGGGGGGl..',
        '.gGKKKKKKKKGl.',
        'gGKkkkkkkkkkGl',
        'GKkKKKKKKKKkKl',
        'GKkKkkkkkkKkKl',
        'GkKkKSSSSKkKkl',
        'KKkKSSSSSSKkKK',
        '...LLLLLLLL...',
        '...wwwwwwww...',
    ],
    'windmill': [
        'C...........C.',
        'CCw.......wCC.',
        '.Cww.....wwC..',
        '..www...www...',
        '...ww.Kxww....',
        '....wKddx.....',
        '...wwKddxww...',
        '..wwwWCCcwww..',
        '.CwwWCCCCcwwC.',
        'CC..WCCCCc..CC',
        'C...WCddCc...C',
        '....WCddCc....',
        '..gGGGddGGGl..',
        '.gGGGGGGGGGll.',
    ],
    'garden-terraces': [
        '..............',
        '..gGGGGGGGGl..',
        '..GPGeCCGPGl..',
        '..kkkkCCkkkk..',
        '.gGGGGCCGGGGl.',
        '.GYGPGCCGeGPl.',
        '.kkkkkCCkkkkx.',
        'gGGGGGCCGGGGGl',
        'GPGeGKaaKGYGPl',
        'GGGGGGKkGGGGGl',
        'llllllllllllll',
    ],
    'fountain': [
        '......AW......',
        '.....WAAW.....',
        '....A.Kk.A....',
        '...A.KKkkk.A..',
        '......kkx.....',
        '......Kk......',
        '..KKKKKKKKKk..',
        '.KaaaaaaaaaaK.',
        '.KAaaAaaaAaak.',
        '..kkkkkkkkkx..',
        '..xxxxxxxxxx..',
    ],
}

ICON8 = {
    'lighthouse': [
        '..Kk..',
        '.AYYa.',
        '..CC..',
        '..kk..',
        '..CC..',
        '.Kkkx.',
        'KkkkkK',
        '.xxxx.',
    ],
    'viaduct': [
        'CCCCCC',
        'Kkkkkx',
        'k.kk.x',
        'k.kk.x',
        'aaaaaa',
    ],
    'observatory': [
        '..WC..',
        '.WWnc.',
        'WWCnCc',
        '.kkkx.',
        'gGGGGl',
        'llllll',
    ],
    'clock-tower': [
        '..Kx..',
        '.KKxx.',
        '.kWWx.',
        '.kWdx.',
        '.WCCc.',
        '.WCCc.',
        '.Kwwx.',
    ],
    'glasshouse': [
        '.I..I.',
        'IIiIIi',
        'WWWWWW',
        'GgGgGl',
        'KKAAKk',
    ],
    'library': [
        '..WW..',
        'Kkkkkx',
        'SaSSas',
        'SaddaS',
        'KKddKk',
    ],
    'amphitheatre': [
        '.gGGl.',
        'gKKKKl',
        'KkKKkK',
        'kKSSKk',
        '.wwww.',
    ],
    'windmill': [
        'C....C',
        '.w..w.',
        '..Kx..',
        '.wCCw.',
        'C.CC.C',
        '.gddl.',
    ],
    'garden-terraces': [
        '.gGGl.',
        '.kCCk.',
        'gPCCel',
        'kkCCkx',
        'GGaaGl',
        'llllll',
    ],
    'fountain': [
        '..AW..',
        '..Kk..',
        '.KKkk.',
        'KaAaaK',
        '.kkkx.',
    ],
}


# ------------------------------------------------------------------ sheet
def build():
    sheet = Sheet('landmarks')

    def add(name, art, **meta):
        im, footprint = art
        sheet.add(f'landmark_{name}', im, footprint=footprint, **meta)

    for i in range(3):
        add(f'lighthouse_{i}', lighthouse(i))
    add('viaduct_span', viaduct_span(), joins='lr')
    add('viaduct_end-left', viaduct_end('left'), joins='r')
    add('viaduct_end-right', viaduct_end('right'), joins='l')
    add('observatory', observatory(), night='landmark_observatory_night')
    add('observatory_night', observatory_night(), layer='night')
    add('clock-tower', clock_tower())
    add('glasshouse', glasshouse())
    add('library', library())
    add('amphitheatre', amphitheatre())
    for i in range(4):
        add(f'windmill_{i}', windmill(i))
    add('garden-terraces', garden_terraces())
    for i in range(2):
        add(f'fountain_{i}', fountain(i))
    for size, icons, tall in ((16, ICON16, 24), (8, ICON8, 10)):
        for name, rows in icons.items():
            if len({len(r) for r in rows}) != 1 or len(rows[0]) != size - 2 or len(rows) > tall - 2:
                raise ValueError(f'map{size} {name}: fill must be {size - 2} wide and at most {tall - 2} tall')
            im = outlined(rows)
            sheet.add(f'map{size}_landmark_{name}', pad(im, 0, max(0, size - im.height), 0, 0))
    return sheet


if __name__ == '__main__':
    build().save()
