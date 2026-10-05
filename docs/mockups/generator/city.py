"""Image 2: city view zoomed out ("city mode"). Native 320x180 (1 px = 4 px of the close-up,
i.e. one 16px tile = 4px), scaled 3x nearest-neighbour. Everything here is drawn procedurally
(original), using colours sampled from the CC0 tileset so both views share one palette."""
import sys
import math
from PIL import Image
import numpy as np
from pix import OUTLINE, draw_text, text_width, blend_rect, upscale
from tiles import hexc
import town

W, H = 320, 180
rng = np.random.default_rng(12)

C = {k: hexc(v) for k, v in {
    'grass': '#73ad28', 'grass_d': '#5a9e2b', 'grass_l': '#8dbc25',
    'path': '#ffcb8d', 'path_l': '#ffd896', 'rim': '#e19a71', 'pave_line': '#ffbc75',
    'water': '#43b1de', 'water_l': '#72c4e6', 'water_d': '#2a5963', 'foam': '#cde9ff',
    'tree': '#4a952d', 'tree_l': '#8dbc25', 'tree_d': '#387d2d', 'pine': '#2b6e4e', 'pine_d': '#253a4a',
    'trunk': '#7d3e24',
    'thatch': '#d15c2d', 'thatch_l': '#e97d37', 'thatch_d': '#862b26',
    'plaster': '#d2b37d', 'plaster_l': '#eecf9b', 'plaster_d': '#bd7959',
    'tile': '#db3024', 'tile_l': '#f55f2a', 'tile_d': '#862b26',
    'teal': '#3e726d', 'teal_l': '#589a8c', 'teal_d': '#2a5963',
    'slate': '#5d6578', 'slate_l': '#7d8699', 'slate_d': '#353a49', 'navy': '#34477e',
    'wall': '#d2b37d', 'wall_d': '#bd7959', 'door': '#3a2420', 'window': '#ffd896',
    'dirt': '#bf5f29', 'dirt_d': '#b64e20', 'crop': '#73ad28',
    'awn_g': '#469e5c', 'awn_c': '#f6eed6', 'wood': '#bd7959', 'wood_d': '#7d3e24',
}.items()}


def put(a, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        a[y, x, :3] = c
        a[y, x, 3] = 255


def rect(a, x0, y0, x1, y1, c):
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    if x1 > x0 and y1 > y0:
        a[y0:y1, x0:x1, :3] = c
        a[y0:y1, x0:x1, 3] = 255


# ---------------------------------------------------------------------------------------- map
def make_ground():
    a = np.zeros((H, W, 4), np.uint8)
    a[:, :, :3] = C['grass']
    a[:, :, 3] = 255
    noise = rng.random((H, W))
    a[noise < 0.16, :3] = C['grass_d']
    a[(noise > 0.97), :3] = C['grass_l']
    return a


def road_mask():
    m = np.zeros((H, W), bool)
    def r(x0, y0, x1, y1):
        m[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = True
    # main avenue (continues the close-up's street: lab view at (60,42), street y 70..106 -> 59..68)
    r(0, 60, 236, 69)
    r(252, 60, W, 69)
    # north road
    r(0, 26, 236, 30)
    r(252, 26, W, 30)
    # south road
    r(0, 124, 236, 129)
    r(252, 124, W, 129)
    # verticals
    r(26, 10, 31, H)
    r(98, 69, 105, H)        # the close-up's south path continues
    r(172, 10, 178, H)
    r(212, 30, 216, 124)
    r(282, 10, 286, H)
    # lanes inside blocks
    r(31, 94, 98, 97)
    r(105, 94, 172, 97)
    r(178, 94, 236, 97)
    r(130, 30, 133, 60)
    r(52, 30, 55, 46)
    return m


def plaza_mask():
    m = np.zeros((H, W), bool)
    m[77:81, 104:126] = True       # close-up's path to the garden
    # close-up plaza: x 8..140, y 112..168 -> 62..95, 70..84
    m[70:84, 62:95] = True
    # market square east
    m[69:82, 146:172] = True
    # north plaza
    m[30:40, 178:206] = True
    return m


def river(a):
    """Wavy river with two bridges; returns water mask."""
    m = np.zeros((H, W), bool)
    for y in range(H):
        cx = 244 + 3.0 * math.sin(y / 17.0) + 1.5 * math.sin(y / 5.3)
        hw = 6 + 1.2 * math.sin(y / 23.0)
        x0, x1 = int(round(cx - hw)), int(round(cx + hw))
        m[y, max(0, x0):min(W, x1)] = True
    edge = m & ~(np.roll(m, 1, 1) & np.roll(m, -1, 1) & np.roll(m, 1, 0) & np.roll(m, -1, 0))
    a[m, :3] = C['water']
    rip = rng.random((H, W))
    a[m & (rip < 0.08), :3] = C['water_l']
    a[m & (rip > 0.985), :3] = C['foam']
    # dark bank outline outside the water
    nb = np.zeros_like(m)
    nb[:, 1:] |= m[:, :-1]
    nb[:, :-1] |= m[:, 1:]
    bank = nb & ~m
    a[bank, :3] = C['water_d']
    a[edge, :3] = C['water_l']
    return m


def paint_paths(a, roads, plaza):
    allp = roads | plaza
    a[allp, :3] = C['path']
    # paving lines on avenues / plazas (every 4 px = one 16px tile)
    yy, xx = np.mgrid[0:H, 0:W]
    grid = ((xx % 4 == 0) | (yy % 4 == 0))
    a[plaza & grid, :3] = C['pave_line']
    # rim where path meets grass
    gr = ~allp
    nb = np.zeros_like(allp)
    nb[1:, :] |= gr[:-1, :]
    nb[:-1, :] |= gr[1:, :]
    nb[:, 1:] |= gr[:, :-1]
    nb[:, :-1] |= gr[:, 1:]
    a[allp & nb, :3] = C['rim']
    nbp = np.zeros_like(allp)
    nbp[1:, :] |= allp[:-1, :]
    nbp[:-1, :] |= allp[1:, :]
    nbp[:, 1:] |= allp[:, :-1]
    nbp[:, :-1] |= allp[:, 1:]
    a[gr & nbp, :3] = C['grass_d']
    return allp


def bridge(a, x0, x1, y0, y1):
    rect(a, x0, y0, x1, y1, C['wood'])
    for x in range(x0, x1):
        if x % 2 == 0:
            for y in range(y0, y1):
                put(a, x, y, C['wood_d'])
    for x in range(x0, x1):
        put(a, x, y0 - 1, OUTLINE[:3])
        put(a, x, y1, OUTLINE[:3])


def field(a, x0, y0, x1, y1):
    rect(a, x0, y0, x1, y1, C['dirt'])
    for y in range(y0, y1):
        if (y - y0) % 3 == 1:
            for x in range(x0 + 1, x1 - 1):
                put(a, x, y, C['crop'] if (x + y) % 5 else C['grass_l'])
        elif (y - y0) % 3 == 2:
            for x in range(x0, x1):
                put(a, x, y, C['dirt_d'])
    for x in range(x0 - 1, x1 + 1):
        put(a, x, y0 - 1, C['wood_d'])
        put(a, x, y1, C['wood_d'])
    for y in range(y0 - 1, y1 + 1):
        put(a, x0 - 1, y, C['wood_d'])
        put(a, x1, y, C['wood_d'])


ROOFS = {
    'thatch': ('thatch', 'thatch_l', 'thatch_d', 'wall'),
    'plaster': ('plaster', 'plaster_l', 'plaster_d', 'plaster_l'),
    'tile': ('tile', 'tile_l', 'tile_d', 'wall'),
    'teal': ('teal', 'teal_l', 'teal_d', 'wall'),
    'police': ('slate', 'slate_l', 'slate_d', 'navy'),
}


def building(a, x, y, w, h, kind, shop=False, door=0.3):
    """Front-facing building block: roof (top ~2/3) + wall strip with door; dark outline."""
    roof, roof_l, roof_d, wall = ROOFS[kind]
    wall_h = max(3, h // 3)
    roof_h = h - wall_h
    # outline box
    rect(a, x - 1, y - 1, x + w + 1, y + h + 1, OUTLINE[:3])
    rect(a, x, y, x + w, y + roof_h, C[roof])
    rect(a, x, y, x + w, y + 1, C[roof_l])
    rect(a, x, y + roof_h - 1, x + w, y + roof_h, C[roof_d])
    if kind in ('tile', 'police', 'teal'):
        for yy in range(y + 2, y + roof_h - 1, 2):     # tile courses
            for xx in range(x + (yy // 2) % 2, x + w, 3):
                put(a, xx, yy, C[roof_d] if kind != 'police' else C['slate_d'])
    else:
        put(a, x + w // 2, y + 1, C[roof_l])
    rect(a, x, y + roof_h, x + w, y + h, C[wall])
    # windows + door
    dx = x + max(1, int(w * door))
    for xx in range(x + 1, x + w - 1, 3):
        if abs(xx - dx) > 1:
            put(a, xx, y + roof_h + 1, C['window'])
    rect(a, dx, y + h - 2, dx + 2, y + h, C['door'])
    if shop:
        for xx in range(x - 1, x + w + 1):
            put(a, xx, y + roof_h, C['awn_g'] if (xx // 2) % 2 == 0 else C['awn_c'])
            if (xx // 2) % 2 == 0:
                put(a, xx, y + roof_h + 1, C['awn_g'])
    if kind == 'police':
        put(a, x + w, y + h - 3, (90, 150, 240))
        put(a, x + w // 2 + 1, y + roof_h // 2, (255, 204, 64))


TREE = ["OOO", "OLGO", "OGgO", ".OO."]


def tree(a, x, y, pine=False):
    if pine:
        rows = ["..O..", ".OPO.", ".OPO.", "OPpPO", "OpPpO", ".OdO."]
        cmap = {'O': OUTLINE[:3], 'P': C['pine'], 'p': C['pine_d'], 'd': C['trunk']}
    else:
        rows = [".OOO.", "OLGGO", "OGGgO", "OgGgO", ".OOO."]
        cmap = {'O': OUTLINE[:3], 'L': C['tree_l'], 'G': C['tree'], 'g': C['tree_d']}
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch != '.':
                put(a, x + dx, y + dy, cmap[ch])


def forest(a, x0, y0, x1, y1, density=0.5, pine_ratio=0.4, avoid=None):
    pts = []
    for y in range(y0, y1, 3):
        for x in range(x0 + (y // 3) % 2 * 2, x1, 4):
            if rng.random() < density:
                pts.append((x + rng.integers(-1, 2), y + rng.integers(-1, 2)))
    for (x, y) in sorted(pts, key=lambda p: p[1]):
        if avoid is not None and avoid[min(H - 1, max(0, y + 2)), min(W - 1, max(0, x + 2))]:
            continue
        tree(a, x, y, pine=rng.random() < pine_ratio)


# ---------------------------------------------------------------------------------------- build
LAB = (60, 42)   # top-left of the close-up's 80x45 footprint in city px


def build_map():
    a = make_ground()
    roads = road_mask()
    plaza = plaza_mask()
    water = river(a)
    roads &= ~water
    plaza &= ~water
    allp = paint_paths(a, roads, plaza)
    bridge(a, 234, 255, 60, 69)
    bridge(a, 234, 255, 124, 129)
    blocked = allp | water

    # farmland east of the river
    field(a, 290, 34, 316, 56)
    field(a, 292, 76, 318, 118)
    field(a, 258, 136, 280, 170)

    # ---- the close-up block at 1/4 scale (house A, MARKET shop, POLICE, house B)
    lx, ly = LAB
    bl = []
    bl.append((lx + 0, ly + 4, 16, 13, 'thatch', False))
    bl.append((lx + 23, ly + 4, 16, 13, 'thatch', True))
    bl.append((lx + 48, ly + 4, 16, 13, 'police', False))
    bl.append((lx + 69, ly + 4, 16, 13, 'plaster', False))

    # ---- market street east of the close-up (shops both sides of the avenue)
    for i, x in enumerate(range(146, 172, 13)):
        bl.append((x, 48, 11, 11, ['thatch', 'tile', 'teal'][i % 3], True))
    for i, x in enumerate(range(179, 212, 11)):
        bl.append((x, 48, 9, 11, ['tile', 'thatch', 'plaster'][i % 3], True))
    for i, x in enumerate(range(108, 145, 12)):
        pass
    for i, x in enumerate(range(179, 236, 12)):
        bl.append((x, 71, 10, 10, ['teal', 'thatch', 'tile', 'plaster', 'thatch'][i % 5], True))
    bl.append((216, 48, 16, 11, 'plaster', True))

    # ---- residential blocks
    def row_of_houses(x0, x1, y, w=10, h=10, gap=3, kinds=('thatch', 'plaster', 'tile', 'teal', 'thatch')):
        x = x0
        i = 0
        while True:
            ww = int(w + rng.integers(-2, 3))
            hh = int(h + rng.integers(-1, 2))
            if x + ww > x1:
                break
            if rng.random() < 0.10 and i > 0:      # garden plot instead of a house
                x += ww + gap
                i += 1
                continue
            bl.append((x, y + (h - hh), ww, hh, kinds[int(rng.integers(0, len(kinds)))], False))
            x += ww + gap + int(rng.integers(0, 2))
            i += 1
    row_of_houses(34, 96, 14, w=10, h=10)
    row_of_houses(2, 24, 14, w=9, h=10)
    row_of_houses(2, 24, 47, w=9, h=11)
    row_of_houses(34, 50, 47, w=12, h=11)
    row_of_houses(108, 128, 14, w=9, h=10)
    row_of_houses(136, 170, 14, w=9, h=10)
    row_of_houses(180, 210, 14, w=9, h=10)
    row_of_houses(218, 232, 14, w=12, h=10)
    row_of_houses(2, 24, 80, w=9, h=11)
    row_of_houses(34, 60, 108, w=10, h=11)
    row_of_houses(108, 170, 108, w=10, h=11)
    row_of_houses(180, 234, 108, w=10, h=11)
    row_of_houses(34, 96, 140, w=10, h=11)
    row_of_houses(108, 170, 140, w=10, h=11)
    row_of_houses(2, 24, 140, w=9, h=11)
    row_of_houses(258, 280, 14, w=9, h=10)
    row_of_houses(258, 280, 44, w=9, h=11)
    row_of_houses(258, 280, 104, w=9, h=11)
    row_of_houses(288, 318, 132, w=12, h=11)
    row_of_houses(147, 170, 33, w=10, h=10)
    row_of_houses(33, 58, 72, w=11, h=11)
    row_of_houses(2, 24, 108, w=9, h=11)
    row_of_houses(258, 280, 74, w=9, h=11)
    # second police station (north-east) + town hall-ish teal building
    bl.append((180, 140, 18, 13, 'police', False))
    bl.append((222, 158, 12, 10, 'teal', False))

    occ = np.zeros((H, W), bool)
    for (x, y, w, h, k, shop) in bl:
        occ[max(0, y - 2):y + h + 2, max(0, x - 2):x + w + 2] = True

    # trees: park SW, edges, gaps (avoid paths/buildings/water)
    avoid = blocked | occ
    forest(a, 106, 146, 170, 178, density=0.0)
    forest(a, 0, 160, 24, 180, density=0.9, avoid=avoid)
    forest(a, 32, 156, 96, 180, density=0.7, avoid=avoid)
    forest(a, 106, 154, 170, 180, density=0.6, avoid=avoid)
    forest(a, 0, 0, W, 12, density=0.9, avoid=avoid)
    forest(a, 30, 98, 96, 106, density=0.5, avoid=avoid)
    forest(a, 196, 152, 236, 180, density=0.6, avoid=avoid)
    forest(a, 258, 120, 286, 136, density=0.5, avoid=avoid)
    forest(a, 288, 58, 320, 74, density=0.6, avoid=avoid)
    forest(a, 214, 128, 236, 150, density=0.5, avoid=avoid)
    for x in range(LAB[0] - 2, LAB[0] + 84, 4):
        tree(a, x + int(rng.integers(0, 2)), LAB[1] - 6 + int(rng.integers(0, 2)), pine=rng.random() < 0.45)
    for x in range(LAB[0], LAB[0] + 82, 5):
        tree(a, x + int(rng.integers(0, 2)), LAB[1] - 2, pine=rng.random() < 0.45)
    # pond in the park
    for y in range(162, 172):
        for x in range(140, 160):
            if ((x - 150) / 10) ** 2 + ((y - 167) / 5) ** 2 <= 1:
                put(a, x, y, C['water'] if (x * 3 + y) % 7 else C['water_l'])
    for (fx, fy) in [(158, 74), (191, 34)]:
        for (dx, dy, c) in [(0, -1, OUTLINE[:3]), (-1, 0, OUTLINE[:3]), (1, 0, OUTLINE[:3]), (0, 1, OUTLINE[:3]),
                            (-1, -1, OUTLINE[:3]), (1, -1, OUTLINE[:3]), (-1, 1, OUTLINE[:3]), (1, 1, OUTLINE[:3]),
                            (0, 0, C['water_l'])]:
            put(a, fx + dx, fy + dy, c)
    # buildings last (drawn over grass), sorted top to bottom
    for (x, y, w, h, k, shop) in sorted(bl, key=lambda b: b[1] + b[3]):
        building(a, x, y, w, h, k, shop=shop)
    # the close-up's details at 1/4 scale: tree line behind the buildings, trees on the plaza, well, fence
    tree(a, lx + 1, ly + 27)
    tree(a, lx + 27, ly + 27)
    put(a, lx + 17, ly + 32, C['wood_d'])
    put(a, lx + 17, ly + 31, C['thatch_l'])
    for x in range(lx + 66, lx + 82):
        put(a, x, ly + 29, C['tile_d'])
    tree(a, lx + 71, ly + 22, pine=True)
    tree(a, lx + 46, ly + 38)
    tree(a, lx + 56, ly + 39, pine=True)
    return a, roads, plaza, occ


# ---------------------------------------------------------------------------------------- agents
def heat_field(points, sig):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    f = np.zeros((H, W), np.float32)
    for (x, y, w) in points:
        f += w * np.exp(-(((xx - x) ** 2) + ((yy - y) ** 2)) / (2 * sig * sig))
    return f


TRUE_HOT = [(152, 66, 1.0), (170, 72, 0.9), (190, 62, 0.75), (138, 64, 0.55), (205, 76, 0.45),
            (85, 60, 0.35), (88, 128, 0.42)]
REC_HOT = [(116, 60, 1.0), (126, 64, 0.5), (189, 148, 0.75)]

BANDS = [  # threshold, colour, alpha
    (0.16, (255, 242, 176), 0.40),
    (0.34, (255, 198, 84), 0.50),
    (0.54, (250, 136, 50), 0.58),
    (0.74, (232, 64, 44), 0.64),
    (0.90, (190, 24, 56), 0.70),
]


def heat_overlay(img):
    f = heat_field(TRUE_HOT, 11.0)
    f /= f.max()
    a = np.array(img).astype(np.float32)
    # 2x2 ordered dither on band boundaries for a pixel-art look
    bayer = np.array([[0.0, 0.5], [0.75, 0.25]], np.float32)
    dith = np.tile(bayer, (H // 2 + 1, W // 2 + 1))[:H, :W] * 0.06
    g = f + dith - 0.03
    level = np.zeros((H, W), int)
    for i, (t, c, al) in enumerate(BANDS):
        level[g >= t] = i + 1
    for i, (t, c, al) in enumerate(BANDS):
        m = level == i + 1
        a[m, :3] = a[m, :3] * (1 - al) + np.array(c, np.float32) * al
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8)).copy()
    return out, f


def recorded_contour(img, thresh=0.42, color=(130, 196, 255)):
    """Dashed outline of where thefts get *recorded* (near police), vs the true heat."""
    f = heat_field(REC_HOT, 8.5)
    f /= f.max()
    m = f >= thresh
    edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    px = img.load()
    ys, xs = np.nonzero(edge)
    for y, x in zip(ys, xs):
        if (int(x) // 2 + int(y) // 2) % 2 == 0:
            px[int(x), int(y)] = color + (255,)
            if y + 1 < H and not edge[y + 1, x]:
                r, g, b, _ = px[int(x), int(y) + 1]
                px[int(x), int(y) + 1] = (r // 2, g // 2, b // 2, 255)
    return img


def place_agents(roads, plaza, occ, true_f):
    walk = (roads | plaza)
    ys, xs = np.nonzero(walk)
    weights = 0.25 + 1.6 * true_f[ys, xs] ** 0.8
    weights /= weights.sum()
    taken = np.zeros((H, W), bool)
    agents = []

    def free(x, y, r=2):
        return not taken[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].any()

    def mark(x, y, r=1):
        taken[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1] = True

    idx = rng.choice(len(xs), size=1200, p=weights)
    for i in idx:
        x, y = int(xs[i]), int(ys[i])
        if len([a for a in agents if a[2] == 'citizen']) >= 190:
            break
        if 10 <= y < 156 and free(x, y):
            agents.append((x, y, 'citizen'))
            mark(x, y)
    # merchants: at shop fronts (just below each shop door)
    return agents, taken, free, mark


def draw_agent(img, x, y, kind):
    px = img.load()
    dark = (20, 16, 24, 255)

    def P(xx, yy, c):
        if 0 <= xx < W and 0 <= yy < H:
            px[xx, yy] = c
    if kind == 'citizen':
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            P(x + dx, y + dy, dark)
        P(x, y, (252, 250, 240, 255))
    elif kind == 'merchant':
        for dy in range(-1, 3):
            for dx in range(-1, 3):
                P(x + dx, y + dy, dark)
        for dy in range(0, 2):
            for dx in range(0, 2):
                P(x + dx, y + dy, (255, 204, 40, 255))
    elif kind == 'police':
        # 2x2 blue core with a pointed (diamond) outline
        for (dx, dy) in ((0, -1), (1, -1), (-1, 0), (2, 0), (-1, 1), (2, 1), (0, 2), (1, 2)):
            P(x + dx, y + dy, dark)
        for dy in range(0, 2):
            for dx in range(0, 2):
                P(x + dx, y + dy, (70, 120, 236, 255))
        P(x, y, (150, 190, 255, 255))
    elif kind == 'stealing':
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if abs(dx) == 2 or abs(dy) == 2:
                    if not (abs(dx) == 2 and abs(dy) == 2):
                        P(x + dx, y + dy, dark)
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                P(x + dx, y + dy, (232, 40, 48, 255))
        P(x, y, (252, 250, 240, 255))


def legend(img):
    x0, y0 = 4, H - 21
    w, h = 214, 18
    blend_rect(img, (x0, y0, x0 + w, y0 + h), (16, 18, 30), 0.78)
    px = img.load()
    white = (246, 244, 236, 255)
    dim = (170, 176, 196, 255)
    x = x0 + 5
    y = y0 + 3
    draw_agent(img, x, y + 2, 'citizen')
    x = draw_text(img, x + 4, y, 'CITIZEN', white) + 6
    draw_agent(img, x + 1, y + 2, 'merchant')
    x = draw_text(img, x + 5, y, 'MERCHANT', white) + 6
    draw_agent(img, x + 1, y + 2, 'police')
    x = draw_text(img, x + 5, y, 'POLICE', white) + 7
    draw_agent(img, x + 2, y + 2, 'stealing')
    x = draw_text(img, x + 6, y, 'STEALING (STATE)', white)
    # line 2: heat key
    x = x0 + 4
    y = y0 + 11
    for i, (t, c, al) in enumerate(BANDS):
        for yy in range(y, y + 5):
            for xx in range(x + i * 4, x + i * 4 + 4):
                px[xx, yy] = c + (255,)
    x = draw_text(img, x + 23, y, 'TRUE THEFTS, 7 DAYS', white) + 7
    for i in range(0, 9):
        if i % 4 < 2:
            px[x + i, y + 2] = (120, 186, 255, 255)
    x = draw_text(img, x + 12, y, 'RECORDED HOTSPOT', white) + 2
    return img


def lab_frame(img, chip_text='LAB MODE'):
    lx, ly = LAB
    px = img.load()
    c = (255, 255, 255, 255)
    w, h = 80, 45
    for i in range(w):
        if i % 4 < 2:
            px[lx + i, ly] = c
            px[lx + i, ly + h - 1] = c
    for j in range(h):
        if j % 4 < 2:
            px[lx, ly + j] = c
            px[lx + w - 1, ly + j] = c
    town.chip(img, lx, ly - 8, chip_text)
    return img


def build(chip_text='LAB MODE'):
    a, roads, plaza, occ = build_map()
    img = Image.fromarray(a).copy()
    img, true_f = heat_overlay(img)
    recorded_contour(img)
    agents, taken, free, mark = place_agents(roads, plaza, occ, true_f)
    # merchants at the shop fronts
    merchants_in, police_in, stealing_in = [], [], []
    merchants = [(150, 60), (163, 60), (183, 60), (194, 60), (205, 60), (222, 60),
                 (183, 82), (195, 82), (207, 82), (219, 82), (231, 82)]
    # police: around both stations + patrols
    police = [(186, 155), (196, 156),
              (28, 50), (101, 112), (174, 40), (284, 100), (60, 126), (214, 104)]
    stealing = [(156, 68), (171, 64), (190, 66), (166, 76), (88, 126)]
    keep = []
    special = merchants + police + stealing
    lx, ly = LAB
    for (x, y, k) in agents:
        inside = lx - 1 <= x <= lx + 80 and ly - 1 <= y <= ly + 45
        if not inside and all(abs(x - sx) > 2 or abs(y - sy) > 2 for (sx, sy) in special):
            keep.append((x, y, k))
    # inside the frame: exactly the people of the close-up, at 1/4 scale
    town.build()
    for (role, fx, fy) in town.PEOPLE:
        cx_, cy_ = lx + int(round(fx / 4)), ly + int(round(fy / 4)) - 1
        if role == 'merchant':
            merchants_in.append((cx_, cy_))
        elif role == 'police':
            police_in.append((cx_, cy_))
        elif role == 'stealing':
            stealing_in.append((cx_, cy_))
        else:
            keep.append((cx_, cy_, 'citizen'))
    for (x, y, k) in keep:
        draw_agent(img, x, y, k)
    merchants += merchants_in
    police += police_in
    stealing += stealing_in
    for (x, y) in merchants:
        draw_agent(img, x, y, 'merchant')
    for (x, y) in police:
        draw_agent(img, x, y, 'police')
    for (x, y) in stealing:
        draw_agent(img, x, y, 'stealing')
    lab_frame(img, chip_text)
    pop = len(keep) + len(merchants) + len(police) + len(stealing)
    town.hud(img, mode='CITY MODE')
    legend(img)
    return img


if __name__ == '__main__':
    native = build()
    native.save('/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/city_native.png')
    upscale(native.convert('RGB'), 3).save(sys.argv[1] if len(sys.argv) > 1 else
                                           '/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/view/city_3x.png')
