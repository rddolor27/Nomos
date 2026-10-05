"""Country mode: an original invented country (native 320x180, scaled 3x nearest-neighbour).
Everything is drawn procedurally for this mockup (original art), with colours from the CC0 tileset palette
so it matches the street and city views. Settlement names are invented and generic."""
import sys
import math
from PIL import Image
import numpy as np
from pix import OUTLINE, draw_text, text_width, blend_rect, upscale, from_ascii
from tiles import hexc
import town

W, H = 320, 180
rng = np.random.default_rng(31)
K = OUTLINE[:3]

C = {k: hexc(v) for k, v in {
    'grass': '#73ad28', 'grass_d': '#5a9e2b', 'grass_l': '#8dbc25',
    'sea_deep': '#2f6fa0', 'sea': '#43b1de', 'sea_l': '#72c4e6', 'foam': '#cde9ff', 'bank': '#2a5963',
    'sand': '#ffd896', 'sand_d': '#f1b07e',
    'road': '#ffcb8d', 'road_d': '#e19a71',
    'tree': '#4a952d', 'tree_l': '#8dbc25', 'tree_d': '#387d2d', 'pine': '#2b6e4e', 'pine_d': '#253a4a',
    'rock_l': '#a3abbd', 'rock': '#7d8699', 'rock_d': '#5d6578', 'snow': '#fafdff', 'snow_d': '#cde9ff',
    'hill': '#8dbc25', 'hill_d': '#5a9e2b',
    'wheat': '#f8c48a', 'wheat_d': '#e9945d', 'soil': '#bf5f29', 'soil_d': '#b64e20', 'crop': '#8dbc25',
    'hedge': '#4a7a2a',
    'thatch': '#d15c2d', 'thatch_l': '#e97d37', 'tile': '#db3024', 'teal': '#3e726d', 'plaster': '#d2b37d',
    'wall': '#eecf9b', 'door': '#3a2420', 'stone': '#a3abbd', 'stone_d': '#7d8699',
    'wood': '#bd7959', 'wood_d': '#7d3e24',
    'navy': '#34477e', 'gold': '#ffcc40', 'red': '#e0402e',
}.items()}


# ------------------------------------------------------------------------------------------ helpers
def value_noise(w, h, cell, seed):
    r = np.random.default_rng(seed)
    gw, gh = w // cell + 3, h // cell + 3
    grid = r.random((gh, gw))
    ys = np.arange(h) / cell
    xs = np.arange(w) / cell
    y0 = ys.astype(int)
    x0 = xs.astype(int)
    fy = ys - y0
    fx = xs - x0
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    a = grid[y0][:, x0]
    b = grid[y0][:, x0 + 1]
    c = grid[y0 + 1][:, x0]
    d = grid[y0 + 1][:, x0 + 1]
    top = a * (1 - fx) + b * fx
    bot = c * (1 - fx) + d * fx
    return top * (1 - fy)[:, None] + bot * fy[:, None]


def fractal(w, h, seed, cells=(32, 16, 8, 4)):
    f = np.zeros((h, w))
    amp, tot = 1.0, 0.0
    for i, c in enumerate(cells):
        f += amp * value_noise(w, h, c, seed + i)
        tot += amp
        amp *= 0.5
    return f / tot


def interp(points, y):
    ys = [p[0] for p in points]
    xs = [p[1] for p in points]
    return np.interp(y, ys, xs)


def put(a, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        a[y, x, :3] = c
        a[y, x, 3] = 255


def stamp(a, rows, x0, y0, cmap):
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch != '.':
                put(a, x0 + dx, y0 + dy, cmap[ch])


def dilate(m, n=1):
    out = m.copy()
    for _ in range(n):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def bezier(p0, p1, bend=0.0, n=None):
    (x0, y0), (x1, y1) = p0, p1
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    cx, cy = mx - dy / L * bend, my + dx / L * bend
    n = n or int(L * 2) + 2
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
        pts.append((x, y))
    return pts


def raster(pts):
    out = []
    for (x, y) in pts:
        p = (int(round(x)), int(round(y)))
        if not out or out[-1] != p:
            out.append(p)
    return out


# ------------------------------------------------------------------------------------------ geography
COAST = [(0, 276), (16, 282), (30, 270), (44, 258), (56, 264), (70, 268), (84, 255), (98, 246), (110, 238),
         (120, 228), (130, 220), (140, 210), (150, 200), (160, 192), (180, 180)]
ISLANDS = [(297, 92, 8, 6), (286, 30, 5, 4), (306, 56, 3, 2), (284, 140, 6, 4)]
RIVER = [(94, 26), (100, 38), (110, 50), (124, 62), (140, 74), (151, 84), (163, 92), (177, 100), (191, 106),
         (205, 110), (219, 112), (236, 113)]

SETTLEMENTS = {  # name: (kind, x, y, true_crime_rate, label_dx, label_dy)
    'STONEGATE': ('capital', 98, 100, 0.92, 0, 17),
    'MILLBRIDGE': ('town', 160, 80, 0.55, 0, 11),
    'SALTHAVEN': ('town', 204, 126, 0.62, 0, 11),
    'FELLWICK': ('town', 48, 56, 0.40, 0, 11),
    'COLDBROOK': ('village', 126, 42, 0.30, 0, 8),
    'GREYMOOR': ('village', 214, 32, 0.25, 0, 8),
    'REEDHOLM': ('village', 196, 92, 0.38, 0, 8),
    'BRACKENBY': ('village', 40, 132, 0.28, 0, 8),
    'DUNMERE': ('village', 34, 92, 0.32, 0, 8),
    'WESTCROFT': ('village', 16, 118, 0.25, 4, 8),
    'HOLLOWAY': ('village', 134, 132, 0.35, 0, 8),
    'NETHERLY': ('village', 240, 62, 0.25, 0, 8),
}
# recorded crime rate on the same scale (about a quarter of true overall; highest share in the capital)
RECORDED = {'STONEGATE': 0.30, 'MILLBRIDGE': 0.15, 'SALTHAVEN': 0.14, 'FELLWICK': 0.10, 'COLDBROOK': 0.07,
            'GREYMOOR': 0.06, 'REEDHOLM': 0.09, 'BRACKENBY': 0.07, 'DUNMERE': 0.08, 'WESTCROFT': 0.06,
            'HOLLOWAY': 0.09, 'NETHERLY': 0.06}
FOCUS = 'MILLBRIDGE'
SX = {n: (s[1], s[2]) for n, s in SETTLEMENTS.items()}
BAR_LEFT = {'FELLWICK'}   # bar + EST. on the left where the right side is crowded

ROADS = [  # (a, b, main, bend)
    ('STONEGATE', 'MILLBRIDGE', True, -8), ('MILLBRIDGE', 'SALTHAVEN', True, 6), ('STONEGATE', 'FELLWICK', True, 5),
    ('STONEGATE', 'SALTHAVEN', True, -10),
    ('COLDBROOK', 'MILLBRIDGE', False, 4), ('FELLWICK', 'COLDBROOK', False, -6), ('GREYMOOR', 'MILLBRIDGE', False, -5),
    ('NETHERLY', 'MILLBRIDGE', False, 6), ('REEDHOLM', 'SALTHAVEN', False, -3), ('REEDHOLM', 'MILLBRIDGE', False, 3),
    ('HOLLOWAY', 'STONEGATE', False, 4), ('HOLLOWAY', 'SALTHAVEN', False, -4), ('BRACKENBY', 'STONEGATE', False, -6),
    ('DUNMERE', 'STONEGATE', False, 3), ('WESTCROFT', 'DUNMERE', False, -3), ('WESTCROFT', 'BRACKENBY', False, 3),
    ('FELLWICK', 'DUNMERE', False, 4),
]
MIGRATION = [('BRACKENBY', 'STONEGATE', -1), ('HOLLOWAY', 'SALTHAVEN', 1), ('GREYMOOR', 'MILLBRIDGE', 1)]  # side of the road
CARAVANS = [('STONEGATE', 'MILLBRIDGE', 0.56), ('MILLBRIDGE', 'SALTHAVEN', 0.74)]
ROBBERY = ('STONEGATE', 'FELLWICK', 0.5)


def land_mask():
    yy, xx = np.mgrid[0:H, 0:W]
    coast = interp(COAST, yy)
    n = fractal(W, H, 5)
    f = (coast - xx) / 9.0 + (n - 0.5) * 3.2
    land = f > 0
    for (cx, cy, rx, ry) in ISLANDS:
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 + (n - 0.5) * 0.9
        land |= d < 1.0
    return land


def build_terrain():
    a = np.zeros((H, W, 4), np.uint8)
    a[:, :, 3] = 255
    land = land_mask()
    sea = ~land
    # --- sea: deep / shallow / foam, with little wave marks
    near = dilate(land, 4) & sea
    a[sea, :3] = C['sea_deep']
    a[near, :3] = C['sea']
    foam = dilate(land, 1) & sea
    a[foam, :3] = C['foam']
    for _ in range(70):
        x, y = int(rng.integers(0, W - 3)), int(rng.integers(12, H - 2))
        if sea[y, x:x + 4].all() and not near[y, x:x + 4].any():
            put(a, x, y, C['sea_l'])
            put(a, x + 1, y - 1, C['sea_l'])
            put(a, x + 2, y, C['sea_l'])
    # --- land: grass with speckle, beach rim
    g = rng.random((H, W))
    a[land, :3] = C['grass']
    a[land & (g < 0.15), :3] = C['grass_d']
    a[land & (g > 0.975), :3] = C['grass_l']
    beach = land & dilate(sea, 1)
    a[beach, :3] = C['sand']
    # lake
    yy, xx = np.mgrid[0:H, 0:W]
    lake = (((xx - 66) / 8.0) ** 2 + ((yy - 124) / 4.5) ** 2 + (fractal(W, H, 9) - 0.5) * 0.8) < 1
    a[dilate(lake, 1) & ~lake & land, :3] = C['bank']
    a[lake, :3] = C['sea']
    a[lake & (g < 0.08), :3] = C['sea_l']
    return a, land, lake


def farmland(a, land, x0, y0, cols, rows, fw=7, fh=5):
    kinds = ['wheat', 'crop', 'soil', 'wheat', 'crop']
    for j in range(rows):
        for i in range(cols):
            x, y = x0 + i * (fw + 1), y0 + j * (fh + 1)
            k = kinds[int(rng.integers(0, len(kinds)))]
            if not land[y:y + fh, x:x + fw].all():
                continue
            for yy in range(y, y + fh):
                for xx in range(x, x + fw):
                    if k == 'wheat':
                        c = C['wheat'] if (yy - y) % 2 == 0 else C['wheat_d']
                    elif k == 'crop':
                        c = C['crop'] if (xx - x) % 2 == 0 else C['grass_d']
                    else:
                        c = C['soil'] if (yy - y) % 2 == 0 else C['soil_d']
                    put(a, xx, yy, c)
            for xx in range(x - 1, x + fw + 1):     # hedgerows
                put(a, xx, y + fh, C['hedge'])
            for yy in range(y - 1, y + fh + 1):
                put(a, x + fw, yy, C['hedge'])


def draw_river(a, land):
    pts = []
    for i in range(len(RIVER) - 1):
        pts += bezier(RIVER[i], RIVER[i + 1], bend=(2 if i % 2 else -2))
    m = np.zeros((H, W), bool)
    for (x, y) in pts:
        xi, yi = int(round(x)), int(round(y))
        for dx in (0, 1):
            for dy in (0, 1):
                if 0 <= yi + dy < H and 0 <= xi + dx < W:
                    m[yi + dy, xi + dx] = True
    bank = dilate(m, 1) & ~m & land
    a[bank, :3] = C['bank']
    a[m, :3] = C['sea']
    hl = m & (rng.random((H, W)) < 0.18)
    a[hl, :3] = C['sea_l']
    return m


MOUNTAIN_CACHE = {}


def mountain(a, cx, by, w, h):
    """Triangle mountain with lit left face, shaded right face, snow cap, dark outline."""
    for y in range(h):
        half = (w // 2) * (y + 1) / h
        x0, x1 = int(round(cx - half)), int(round(cx + half))
        for x in range(x0, x1 + 1):
            yy = by - h + y
            snow = y < h * 0.36
            if x < cx:
                c = C['snow'] if snow else C['rock_l']
            else:
                c = C['snow_d'] if snow else C['rock_d']
            if x == x0 or x == x1:
                c = K
            put(a, x, yy, c)
        # ridge texture
    for x in range(int(cx - w // 2), int(cx + w // 2) + 1):
        put(a, x, by, K)
    put(a, cx, by - h - 1, K)


def hill(a, x, y):
    rows = ["..OOO..", ".OLLGO.", "OLGGGgO"]
    stamp(a, rows, x, y, {'O': C['hill_d'], 'L': C['grass_l'], 'G': C['grass'], 'g': C['grass_d']})


def tree(a, x, y, pine=False):
    if pine:
        rows = ["..O..", ".OPO.", "OPPpO", "OPppO", ".OdO."]
        cmap = {'O': K, 'P': C['pine'], 'p': C['pine_d'], 'd': C['wood_d']}
    else:
        rows = [".OOO.", "OLGGO", "OGGgO", ".OgO."]
        cmap = {'O': K, 'L': C['tree_l'], 'G': C['tree'], 'g': C['tree_d']}
    stamp(a, rows, x, y, cmap)


# ------------------------------------------------------------------------------------------ settlements
HUT = ["...O...",
       "..OrO..",
       ".OrrrO.",
       "OrrrrrO",
       "OwwdwwO",
       "OOOOOOO"]
HOUSE = ["..OOOOO..",
         ".OrrrrrO.",
         "OrrrrrrrO",
         "OwwwdwwwO",
         "OwwwdwwwO",
         "OOOOOOOOO"]
HALL = ["...O...",            # town hall with a little spire
        "..OrO..",
        "..OrO..",
        ".OrrrO.",
        "OrrrrrO",
        "OwwwwwO",
        "OwwdwwO",
        "OOOOOOO"]


def _cm(roof):
    return {'O': K, 'r': C[roof], 'w': C['wall'], 'd': C['door']}


def hut(a, x, y, roof):
    stamp(a, HUT, x, y, _cm(roof))


def house(a, x, y, roof):
    stamp(a, HOUSE, x, y, _cm(roof))


def village_icon(a, cx, cy):
    """A village: a couple of huts."""
    hut(a, cx - 7, cy - 4, 'thatch')
    hut(a, cx - 1, cy - 3, 'plaster')
    return (cx - 7, cy - 4, cx + 6, cy + 3)


def town_icon(a, cx, cy):
    """A town: a cluster of roofs around a hall."""
    house(a, cx - 10, cy - 4, 'thatch')
    stamp(a, HALL, cx - 3, cy - 8, _cm('teal'))
    house(a, cx + 3, cy - 4, 'tile')
    house(a, cx - 7, cy + 1, 'tile')
    house(a, cx + 1, cy + 1, 'thatch')
    return (cx - 10, cy - 8, cx + 12, cy + 7)


def capital_icon(a, cx, cy):
    """The capital: a walled cluster of roofs with a central keep tower and a flag."""
    x0, y0, x1, y1 = cx - 15, cy - 7, cx + 15, cy + 10
    # courtyard paving
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(a, x, y, C['road'])
    # houses inside (two rows)
    roofs = ['thatch', 'tile', 'teal', 'tile', 'thatch', 'plaster']
    i = 0
    for hy in (y0 + 2, y0 + 8):
        for hx in (x0 + 3, x0 + 11, x1 - 19, x1 - 11):
            if abs(hx + 4 - cx) < 6:
                continue
            house(a, hx, hy, roofs[i % len(roofs)])
            i += 1
    # wall ring: 2px stone with dark outline, crenellated top
    for x in range(x0 - 2, x1 + 3):
        for y in range(y0 - 2, y1 + 3):
            ring = not (x0 <= x <= x1 and y0 <= y <= y1)
            if not ring:
                continue
            outer = x in (x0 - 2, x1 + 2) or y in (y0 - 2, y1 + 2)
            inner = x in (x0 - 1, x1 + 1) or y in (y0 - 1, y1 + 1)
            if outer:
                put(a, x, y, K)
            elif inner:
                put(a, x, y, C['stone'] if (x * 3 + y) % 4 else C['stone_d'])
    for x in range(x0 - 2, x1 + 3):
        put(a, x, y0 - 3, K if x % 2 == 0 else C['stone'])
        if x % 2 == 1:
            put(a, x, y0 - 4, K)
    for x in range(x0, x1 + 1):                       # inner shadow under the north wall
        put(a, x, y0, C['road_d'])
    # corner towers
    for (tx, ty) in ((x0 - 1, y0 - 1), (x1 + 1, y0 - 1), (x0 - 1, y1 + 1), (x1 + 1, y1 + 1)):
        for dx in range(-2, 3):
            for dy in range(-4, 3):
                edge = dx in (-2, 2) or dy in (-4, 2)
                put(a, tx + dx, ty + dy, K if edge else (C['stone'] if dx < 1 else C['stone_d']))
        put(a, tx - 1, ty - 5, K)
        put(a, tx + 1, ty - 5, K)
    # gate in the south wall
    for y in range(y1 - 1, y1 + 3):
        for x in (cx - 1, cx, cx + 1):
            put(a, x, y, C['door'] if y > y1 - 1 else K)
    # central keep: tall tower, pointed navy roof, red flag
    tx = cx - 3
    top = cy - 12
    for y in range(top, cy + 7):
        for x in range(tx, tx + 7):
            if x in (tx, tx + 6):
                put(a, x, y, K)
            else:
                put(a, x, y, C['stone'] if x < tx + 4 else C['stone_d'])
    for x in range(tx, tx + 7):
        put(a, x, cy + 7, K)
    for (x, y) in ((tx + 3, top + 4), (tx + 3, top + 5), (tx + 3, cy + 1), (tx + 3, cy + 2)):
        put(a, x, y, C['door'])
    roof = ["...O...", "..OnO..", ".OnnnO.", "OnnnnnO"]
    stamp(a, roof, tx, top - 4, {'O': K, 'n': C['navy']})
    for y in range(top - 10, top - 4):
        put(a, tx + 3, y, K)
    stamp(a, ["rrrr", "rrr.", "rr.."], tx + 4, top - 10, {'r': C['red']})
    return (x0 - 3, top - 10, x1 + 3, y1 + 3)


TRUE_C = (238, 96, 72)
TRUE_D = (176, 40, 30)
REC_C = (120, 170, 240)
PALE = (226, 226, 232)
PALE_B = (206, 212, 228)


def crime_bar(a, x, y, rate, h=10, rec=0.0):
    """Paired bar in one frame: wide red column = true crime rate, thin blue column = recorded rate."""
    for yy in range(y, y + h + 2):
        put(a, x, yy, K)
        put(a, x + 4, yy, K)
    for xx in range(x, x + 5):
        put(a, xx, y, K)
        put(a, xx, y + h + 1, K)
    tf = int(round(rate * h))
    rf = int(round(rec * h))
    for i in range(h):
        yy = y + h - i
        put(a, x + 1, yy, TRUE_C if i < tf else PALE)
        put(a, x + 2, yy, TRUE_D if i < tf else PALE)
        put(a, x + 3, yy, REC_C if i < rf else PALE_B)


# ------------------------------------------------------------------------------------------ overlays
def label(img, text, cx, y, color):
    """3x5 text with a 1px dark outline, centred on cx."""
    w = text_width(text)
    x = int(round(cx - w / 2))
    x = max(2, min(W - w - 2, x))
    tmp = Image.new('RGBA', (w + 2, 7), (0, 0, 0, 0))
    draw_text(tmp, 1, 1, text, color + (255,))
    al = np.array(tmp)[:, :, 3] > 0
    ring = dilate(al, 1) & ~al
    diag = np.zeros_like(al)
    diag[1:, 1:] |= al[:-1, :-1]
    diag[1:, :-1] |= al[:-1, 1:]
    diag[:-1, 1:] |= al[1:, :-1]
    diag[:-1, :-1] |= al[1:, 1:]
    ring |= diag & ~al
    px = img.load()
    for yy in range(7):
        for xx in range(w + 2):
            X, Y = x - 1 + xx, y - 1 + yy
            if not (0 <= X < W and 0 <= Y < H):
                continue
            if al[yy, xx]:
                px[X, Y] = color + (255,)
            elif ring[yy, xx]:
                px[X, Y] = (16, 14, 22, 255)


def tag_text(img, text, x, y, color):
    """Left-aligned 3x5 text with a 1px dark outline."""
    w = text_width(text)
    label(img, text, x + w / 2.0, y, color)


def road_points(p, q):
    for (a_, b_, main, bend) in ROADS:
        if (a_, b_) == (p, q):
            return bezier(SX[p], SX[q], bend)
        if (a_, b_) == (q, p):
            return list(reversed(bezier(SX[q], SX[p], bend)))
    raise KeyError((p, q))


def flow_band(img, p, q, offset=4, trim0=9, trim1=12, color=(250, 246, 232)):
    """Migration flow drawn as a band running alongside the road from p to q, with an arrowhead."""
    pts = road_points(p, q)
    (sx0, sy0), (tx1, ty1) = SX[p], SX[q]
    keep = [(x, y) for (x, y) in pts if math.hypot(x - sx0, y - sy0) >= trim0 and math.hypot(x - tx1, y - ty1) >= trim1]
    off = []
    for i in range(len(keep)):
        xa, ya = keep[max(0, i - 2)]
        xb, yb = keep[min(len(keep) - 1, i + 2)]
        L = math.hypot(xb - xa, yb - ya) or 1
        nx, ny = -(yb - ya) / L, (xb - xa) / L
        off.append((keep[i][0] + nx * offset, keep[i][1] + ny * offset))
    m = np.zeros((H, W), bool)
    for (x, y) in raster(off[:-3]):
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            if 0 <= y + dy < H and 0 <= x + dx < W:
                m[y + dy, x + dx] = True
    (xa, ya), (xb, yb) = off[-7], off[-1]
    ang = math.atan2(yb - ya, xb - xa)
    for r in range(0, 6):
        for s in range(-r, r + 1):
            hx = xb - math.cos(ang) * r + math.cos(ang + math.pi / 2) * s * 0.8
            hy = yb - math.sin(ang) * r + math.sin(ang + math.pi / 2) * s * 0.8
            xi, yi = int(round(hx)), int(round(hy))
            if 0 <= yi < H and 0 <= xi < W:
                m[yi, xi] = True
    ring = dilate(m, 1) & ~m
    px = img.load()
    for y, x in zip(*np.nonzero(ring)):
        px[int(x), int(y)] = (20, 16, 28, 255)
    for y, x in zip(*np.nonzero(m)):
        px[int(x), int(y)] = color + (255,)


def arrow(img, p0, p1, bend, color=(250, 246, 232)):
    """Migration flow: dashed 2px light line with dark outline and a chevron head."""
    pts = raster(bezier(p0, p1, bend))
    m = np.zeros((H, W), bool)
    body = pts[:-3]
    for i, (x, y) in enumerate(body):
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            if 0 <= y + dy < H and 0 <= x + dx < W:
                m[y + dy, x + dx] = True
    # arrow head
    (xa, ya), (xb, yb) = pts[-6], pts[-1]
    ang = math.atan2(yb - ya, xb - xa)
    for r in range(0, 6):
        for s in range(-r, r + 1):
            hx = xb - math.cos(ang) * r + math.cos(ang + math.pi / 2) * s * 0.8
            hy = yb - math.sin(ang) * r + math.sin(ang + math.pi / 2) * s * 0.8
            xi, yi = int(round(hx)), int(round(hy))
            if 0 <= yi < H and 0 <= xi < W:
                m[yi, xi] = True
    ring = dilate(m, 1) & ~m
    px = img.load()
    for y, x in zip(*np.nonzero(ring)):
        px[int(x), int(y)] = (20, 16, 28, 255)
    for y, x in zip(*np.nonzero(m)):
        px[int(x), int(y)] = color + (255,)


CARAVAN = [
    "..OOOO..",
    ".OccccO.",
    "OcCccCcO",
    "ObbbbbbO",
    ".OwOOwO.",
    "..O..O..",
]


def caravan(img, x, y):
    im = from_ascii(CARAVAN, {'O': OUTLINE, 'c': (246, 240, 222), 'C': (204, 196, 176), 'b': (189, 121, 89),
                              'w': (90, 60, 40)})
    img.alpha_composite(im, (x - 4, y - 4))


MINI_ALERT = [
    ".OOOOO.",
    "OWWRWWO",
    "OWWRWWO",
    "OWWRWWO",
    "OWWWWWO",
    "OWWRWWO",
    ".OOWOO.",
    "...O...",
]


def alert(img, x, y):
    im = from_ascii(MINI_ALERT, {'O': OUTLINE, 'W': (255, 255, 255), 'R': (226, 52, 44)})
    img.alpha_composite(im, (x - 3, y - 8))


def live_highlight(img, box):
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 - 3, y0 - 3, x1 + 3, y1 + 2
    px = img.load()
    gold = (255, 216, 74, 255)
    dark = (16, 14, 22, 255)
    for x in range(x0, x1 + 1):
        for (y, c) in ((y0, gold), (y1, gold), (y0 - 1, dark), (y1 + 1, dark), (y0 + 1, dark), (y1 - 1, dark)):
            if (x - x0) % 4 < 3 or c == dark:
                if c == dark and ((y in (y0 + 1, y1 - 1)) and (x in (x0, x1))):
                    continue
                if 0 <= x < W and 0 <= y < H:
                    if c == dark and (y in (y0 + 1, y1 - 1)):
                        continue
                    px[x, y] = c
    for y in range(y0, y1 + 1):
        for (x, c) in ((x0, gold), (x1, gold), (x0 - 1, dark), (x1 + 1, dark)):
            if (y - y0) % 4 < 3 or c == dark:
                if 0 <= x < W and 0 <= y < H:
                    px[x, y] = c
    # LIVE tag: dark box, red dot, white text
    t = 'LIVE'
    w = text_width(t) + 9
    tx, ty = (x0 + x1) // 2 - w // 2, y0 - 10
    for yy in range(ty, ty + 7):
        for xx in range(tx, tx + w):
            if (xx in (tx, tx + w - 1)) and (yy in (ty, ty + 6)):
                continue
            px[xx, yy] = (22, 20, 32, 255)
    for (dx, dy) in ((2, 2), (3, 2), (2, 3), (3, 3), (2, 4), (3, 4)):
        px[tx + dx, ty + dy - 0] = (240, 60, 52, 255)
    draw_text(img, tx + 6, ty + 1, t, (255, 255, 255, 255))
    return (tx, ty, tx + w, ty + 7)


def hud_country(img):
    blend_rect(img, (0, 0, W, 10), (16, 18, 30), 0.74)
    px = img.load()
    for x in range(W):
        r, g, b, a = px[x, 10]
        px[x, 10] = (int(r * 0.7), int(g * 0.7), int(b * 0.7), 255)
    white = (246, 244, 236, 255)
    dim = (170, 176, 196, 255)
    x = town.chip(img, 2, 2, 'REGION VIEW')
    x = draw_text(img, x + 5, 3, 'YEAR 3', white)
    x = draw_text(img, x + 3, 3, '\u00b7', dim)
    x = draw_text(img, x + 3, 3, 'POP 310K', white)
    # which world the overlays show: the TRUE state (robbery "!", red bars) vs the RECORD
    town.chip(img, x + 7, 2, 'VIEW: TRUE', fg=(24, 20, 30), bg=TRUE_C)
    parts = [('THEFTS/YR', dim), ('TRUE', TRUE_C + (255,)), ('48K', white),
             ('RECORDED', REC_C + (255,)), ('12K', white)]
    gaps = [5, 3, 6, 3]
    total = sum(text_width(p) for p, _ in parts) + sum(gaps)
    x = W - 4 - total
    for i, (p, c) in enumerate(parts):
        x = draw_text(img, x, 3, p, c)
        if i < len(gaps):
            x += gaps[i]


MINI_CITY = ["....O....",
             "...OnO...",
             "O.OnnnO.O",
             "OsOsssOsO",
             "OsssdsssO",
             "OOOOOOOOO"]


def legend(img):
    """Compact footer legend strip (same dark translucent style as the HUD), three rows."""
    y0 = H - 30
    blend_rect(img, (0, y0, W, H), (16, 18, 30), 0.82)
    px = img.load()
    for x in range(W):
        r, g, b, _ = px[x, y0 - 1]
        px[x, y0 - 1] = (int(r * 0.7), int(g * 0.7), int(b * 0.7), 255)
    white = (246, 244, 236, 255)
    dim = (170, 176, 196, 255)
    r1, r2, r3 = y0 + 3, y0 + 12, y0 + 21
    x = 5
    a = np.array(img)
    items1 = []
    stamp(a, HUT, x, r1 - 1, _cm('thatch'))
    items1.append(('VILLAGE', x + 10))
    x = x + 10 + text_width('VILLAGE') + 8
    stamp(a, HUT, x, r1 - 1, _cm('tile'))
    stamp(a, HUT, x + 4, r1, _cm('thatch'))
    items1.append(('TOWN', x + 14))
    x = x + 14 + text_width('TOWN') + 8
    stamp(a, MINI_CITY, x, r1 - 1, {'O': K, 'n': C['navy'], 's': C['stone'], 'd': C['door']})
    items1.append(('CITY', x + 12))
    x = x + 12 + text_width('CITY') + 8
    for xx in range(x, x + 10):
        put(a, xx, r1 + 2, C['road'])
        put(a, xx, r1 + 3, C['road'])
        put(a, xx, r1 + 4, C['road_d'])
    items1.append(('ROUTE', x + 13))
    x = x + 13 + text_width('ROUTE') + 8
    cx_car = x + 4
    items1.append(('CARAVAN', x + 11))
    x = x + 11 + text_width('CARAVAN') + 8
    ax_mig = x
    items1.append(('MIGRATION', x + 15))
    x = x + 15 + text_width('MIGRATION') + 8
    ax_rob = x + 3
    items1.append(('ROBBERY', x + 9))
    crime_bar(a, 6, r2 - 2, 0.7, h=6, rec=0.34)
    img.paste(Image.fromarray(a).copy())
    caravan(img, cx_car, r1 + 3)
    arrow(img, (ax_mig, r1 + 3), (ax_mig + 11, r1 + 3), 0)
    alert(img, ax_rob, r1 + 7)
    for t, xx in items1:
        draw_text(img, xx, r1 + 1, t, white)
    # row 2: crime bars
    x2 = draw_text(img, 15, r2 + 1, 'CRIME:', white) + 4
    x2 = draw_text(img, x2, r2 + 1, 'TRUE', TRUE_C + (255,)) + 4
    x2 = draw_text(img, x2, r2 + 1, '/', white) + 4
    x2 = draw_text(img, x2, r2 + 1, 'RECORDED', REC_C + (255,)) + 8
    draw_text(img, x2, r2 + 1, '(EST. = MODELLED)', dim)
    # row 3: live vs aggregate
    px = img.load()
    gold = (255, 216, 74, 255)
    xb = 5
    for xx in range(xb, xb + 9):
        if (xx - xb) % 3 < 2:
            px[xx, r3] = gold
            px[xx, r3 + 5] = gold
    for yy in range(r3, r3 + 6):
        if (yy - r3) % 3 < 2:
            px[xb, yy] = gold
            px[xb + 8, yy] = gold
    x3 = draw_text(img, 17, r3 + 1, 'LIVE = AGENTS SHOWN, ALIGNED TO THE RECORD', white)
    draw_text(img, x3 + 8, r3 + 1, 'OTHERS = AGGREGATE', dim)


def build():
    a, land, lake = build_terrain()
    # farmland around the plains settlements (drawn before trees and roads)
    farmland(a, land, 116, 88, 4, 2)
    farmland(a, land, 76, 116, 4, 2)
    farmland(a, land, 172, 64, 3, 2)
    farmland(a, land, 150, 112, 4, 2)
    farmland(a, land, 6, 130, 3, 2)
    farmland(a, land, 222, 72, 2, 2)
    farmland(a, land, 46, 104, 3, 1)
    river = draw_river(a, land)
    # hills
    for (x, y) in [(70, 40), (80, 46), (62, 46), (92, 52), (140, 104), (150, 108), (128, 112), (30, 76),
                   (178, 118), (170, 126), (116, 128), (230, 46), (60, 136), (20, 144)]:
        hill(a, x, y)
    # mountains (north-west range), back to front
    peaks = [(18, 30, 13, 10), (30, 26, 15, 12), (44, 30, 13, 10), (58, 26, 15, 13), (72, 30, 13, 10),
             (86, 27, 13, 11), (100, 31, 11, 9), (112, 28, 11, 8), (8, 40, 11, 9), (24, 40, 13, 10),
             (38, 42, 11, 9), (52, 40, 13, 10), (66, 42, 11, 8), (82, 41, 11, 8), (122, 36, 9, 7)]
    for (cx, by, w, h) in sorted(peaks, key=lambda p: p[1]):
        mountain(a, cx, by, w, h)
    # forests
    nf = fractal(W, H, 21)
    yy, xx = np.mgrid[0:H, 0:W]
    forest = np.zeros((H, W), bool)
    for (fx, fy, rx, ry) in [(196, 50, 28, 13), (66, 76, 16, 9), (166, 140, 18, 8), (10, 100, 9, 8),
                             (236, 92, 9, 10), (174, 24, 16, 7), (96, 146, 14, 6)]:
        forest |= (((xx - fx) / rx) ** 2 + ((yy - fy) / ry) ** 2 + (nf - 0.5) * 1.4) < 1
    forest &= land & ~lake
    sx = {n: (s[1], s[2]) for n, s in SETTLEMENTS.items()}
    keep_clear = np.zeros((H, W), bool)
    for n, (k, x, y, *_r) in SETTLEMENTS.items():
        r = 15 if k == 'capital' else (10 if k == 'town' else 7)
        keep_clear[max(0, y - r):y + r, max(0, x - r - 2):x + r + 6] = True
    keep_clear |= dilate(river, 2)
    trees = []
    for y in range(12, H - 4, 3):
        for x in range((y // 3) % 2 * 2, W - 4, 4):
            if forest[y, x] and not keep_clear[y, x] and rng.random() < 0.9:
                trees.append((x + int(rng.integers(-1, 2)), y + int(rng.integers(-1, 2))))
    for (x, y) in sorted(trees, key=lambda p: p[1]):
        tree(a, x - 2, y - 3, pine=(y < 70 and rng.random() < 0.6) or rng.random() < 0.2)
    # roads
    road_px = set()
    main_px = set()
    for (p, q, main, bend) in ROADS:
        pts = raster(bezier(sx[p], sx[q], bend))
        for (x, y) in pts:
            road_px.add((x, y))
            if main:
                main_px.add((x, y))
                main_px.add((x + 1, y))
    for (x, y) in sorted(road_px | main_px):
        if 0 <= x < W and 0 <= y < H:
            put(a, x, y + 1, C['road_d']) if (x, y + 1) not in road_px and (x, y + 1) not in main_px else None
    for (x, y) in road_px | main_px:
        if 0 <= x < W and 0 <= y < H:
            if river[y, x] or lake[y, x]:
                put(a, x, y, C['wood'])             # bridge planks
            else:
                put(a, x, y, C['road'])
    # settlements
    boxes = {}
    for n, (k, x, y, rate, ldx, ldy) in SETTLEMENTS.items():
        if k == 'capital':
            boxes[n] = capital_icon(a, x, y)
        elif k == 'town':
            boxes[n] = town_icon(a, x, y)
        else:
            boxes[n] = village_icon(a, x, y)
    bars = {}
    for n, (k, x, y, rate, ldx, ldy) in SETTLEMENTS.items():
        bx0, by0, bx1, by1 = boxes[n]
        bh = 10 if k != 'village' else 8
        bx, byy = bx1 + 2, (by0 - 1 if k != 'village' else y - 7)
        if n in BAR_LEFT:
            bx = bx0 - 7
        if n == FOCUS:
            bx = bx1 + 6        # keep the live town's bar outside its gold LIVE outline
        crime_bar(a, bx, byy, rate, h=bh, rec=RECORDED[n])
        bars[n] = (bx, byy, bh)
    hx, hy = SETTLEMENTS['SALTHAVEN'][1], SETTLEMENTS['SALTHAVEN'][2]
    land_now = land
    px_x = hx + 10
    while px_x < W - 1 and land_now[hy + 2, px_x]:
        px_x += 1
    for x in range(hx + 12, px_x + 5):                 # pier
        put(a, x, hy + 2, C['wood'])
        put(a, x, hy + 3, C['wood_d'])
    stamp(a, ["..O...", ".OwO..", "OwwwO.", "..O...", "OOOOOO", ".Obbo."], px_x + 8, hy + 4,
          {'O': K, 'w': (250, 250, 250), 'b': C['wood'], 'o': C['wood_d']})
    img = Image.fromarray(a).copy()
    # overlays: migration arrows, caravans, robbery, live focus, names
    for (p, q, side) in MIGRATION:
        flow_band(img, p, q, offset=4 if side > 0 else -4, trim0=32 if p == 'HOLLOWAY' else 12,
                  trim1=19 if SETTLEMENTS[q][0] == 'capital' else 13)
    for (p, q, t) in CARAVANS:
        bend = [r[3] for r in ROADS if (r[0], r[1]) == (p, q)][0]
        pts = bezier(sx[p], sx[q], bend)
        x, y = pts[int(t * (len(pts) - 1))]
        caravan(img, int(round(x)), int(round(y)))
    p, q, t = ROBBERY
    bend = [r[3] for r in ROADS if (r[0], r[1]) == (p, q)][0]
    pts = bezier(sx[p], sx[q], bend)
    x, y = pts[int(t * (len(pts) - 1))]
    alert(img, int(round(x)), int(round(y)) - 1)
    live_box = live_highlight(img, boxes[FOCUS])
    for n, (bx, byy, bh) in bars.items():          # every settlement except the live one is modelled
        if n != FOCUS:
            ex = bx - 2 - text_width('EST.') if n in BAR_LEFT else bx + 7
            tag_text(img, 'EST.', ex, byy + bh // 2 - 1, (200, 204, 220))
    for n, (k, x, y, rate, ldx, ldy) in SETTLEMENTS.items():
        col = (255, 216, 74) if k == 'capital' else ((255, 255, 255) if k == 'town' else (236, 232, 214))
        label(img, n, x + ldx, y + ldy, col)
    hud_country(img)
    legend(img)
    BOXES.update(boxes)
    BOXES['_live_tag'] = live_box
    return img


BOXES = {}

if __name__ == '__main__':
    native = build()
    native.save('/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/country_native.png')
    upscale(native.convert('RGB'), 3).save(sys.argv[1] if len(sys.argv) > 1 else
                                           '/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/country_3x.png')
