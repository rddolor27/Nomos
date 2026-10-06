"""Natural wonders for Nomos: set pieces for City view, with icons for the Region and Country maps.

GBA-era top-down pixel art in three-quarter view, lit from the top left, drawn fresh in the shared
palette. Large masses (cliff faces, canopies, pools) are filled on a symbol canvas from shaped
profiles, then hand-drawn ASCII parts are stamped over them, as in buildings.py and culture.py.

- Every wonder is an original, fictional landform, never a copy of a real landmark, and holds no
  shrine, statue, flag, sign or text. No people or animals: blobs are drawn separately.
- Rock is grey stone, sandstone keeps to sand and wood tones, and nothing uses the reds and
  oranges kept for crime. There is no lava.
- ICE and MINT carry water, ice, snow, mist and steam; LILAC appears only in the cave's crystals.
- OUTLINE only rings the outside. Surf and steam are thin unringed layers, as in culture.py, and
  the geyser's water is ringed in ice-blue so it reads as spray, not a solid pillar.

Build: python tools/sprites/wonders.py
"""
import math

import spritekit as sk

# Upper case is the lighter tone of a pair; the four-tone ramps run lightest first.
KEY = sk.cmap(
    O='OUTLINE', W='WHITE', C='CREAM', c='CREAM_D', S='SAND', s='SAND_D',
    L='WOOD_L', w='WOOD', d='WOOD_D', G='GRASS_L', g='GRASS', k='LEAF_D',
    T='TEAL', t='TEAL_D', A='WATER_L', a='WATER', N='NAVY', n='NAVY_D',
    H='STONE_L', h='STONE', x='STONE_D', M='PLUM',
    E='LILAC_L', e='LILAC', f='LILAC_S', F='LILAC_D',
    **{'1': 'ICE_L', '2': 'ICE', '3': 'ICE_S', '4': 'ICE_D', '5': 'MINT_L', '6': 'MINT', '7': 'MINT_S'},
)


def _hash(x, y):
    """A fixed pseudo-random value for (x, y), for scattered texture without randomness."""
    return ((x * 73856093) ^ (y * 19349663)) & 0xFFFF


def profile(points, x):
    """Piecewise-linear height through hand-placed (x, y) points."""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            return y0 if x1 == x0 else round(y0 + (y1 - y0) * (x - x0) / (x1 - x0))
    raise ValueError(f'x={x} is outside the profile')


def ellipse(cx, cy, rx, ry):
    return [(x, y) for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1)
            for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1)
            if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1]


class Canvas:
    """A grid of KEY symbols ('.' is transparent) that shapes and hand-drawn parts are put on."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = [['.'] * w for _ in range(h)]

    def put(self, x, y, ch):
        if ch not in '. ' and 0 <= x < self.w and 0 <= y < self.h:
            self.a[y][x] = ch

    def erase(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y][x] = '.'

    def get(self, x, y):
        return self.a[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def stamp(self, x, y, rows):
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                self.put(x + dx, y + dy, ch)

    def rows(self):
        return [''.join(r) for r in self.a]

    def image(self):
        return sk.add_outline(sk.from_ascii(self.rows(), KEY))


def region(x0, x1, top, bottom):
    """Every pixel between two profiles, column by column."""
    return [(x, y) for x in range(x0, x1 + 1) for y in range(top(x), bottom(x) + 1)]


def boulder(c, cx, cy, rx, ry, ramp='Hhx'):
    """A rounded rock: a lit cap on the upper left, shade and a dark rim on the lower right."""
    hi, mid, lo = ramp
    pts = ellipse(cx, cy, rx, ry)
    inside = set(pts)
    for x, y in pts:
        u, v = (x - cx) / (rx + 0.5), (y - cy) / (ry + 0.5)
        edge = any(n not in inside for n in ((x + 1, y), (x, y + 1)))
        if edge and u + v > -0.3:
            ch = lo
        elif v < -0.3 and u < 0.45 or u + v < -0.75:
            ch = hi
        elif u + v > 0.55:
            ch = lo
        else:
            ch = mid
        c.put(x, y, ch)


def rockface(c, pts, ramp='Hhx', crevice=None, size=(10, 7, 5, 8, 3, 5), salt=0):
    """Rugged rock: overlapping lumps in staggered tiers, each lit on its upper left and shaded
    on its lower right, with dark crevices where they part. size is the tier spacing (sx, sy)
    and the lump radii ranges (rx, ry); flat lumps read as layered rock."""
    hi, mid, lo = ramp
    crevice = crevice or lo
    area = set(pts)
    if not area:
        return
    for x, y in area:
        c.put(x, y, crevice)
    sx, sy, rx0, rx1, ry0, ry1 = size
    xs, ys = [p[0] for p in area], [p[1] for p in area]
    for j, ty in enumerate(range(min(ys) - sy // 2, max(ys) + sy, sy)):
        for tx in range(min(xs) - sx // 2 - (sx // 2) * (j % 2), max(xs) + sx, sx):
            hv = _hash(tx + salt, ty + 7 * salt)
            cx, cy = tx + hv % 5 - 2, ty + (hv >> 3) % 3 - 1
            a = rx0 + (hv >> 5) % (rx1 - rx0 + 1)
            b = ry0 + (hv >> 7) % (ry1 - ry0 + 1)
            lump = set(ellipse(cx, cy, a, b))
            for px, py in lump & area:
                u, v = (px - cx) / (a + 0.5), (py - cy) / (b + 0.5)
                rim = (px + 1, py) not in lump or (px, py + 1) not in lump
                if rim and u + v > -0.2:
                    ch = lo
                elif v < -0.35 and u < 0.4 or u + v < -0.8:
                    ch = hi
                elif u + v > 0.6:
                    ch = lo
                else:
                    ch = mid
                c.put(px, py, ch)


def puff(c, cx, cy, r, ramp='W12'):
    """A round puff of spray or steam: lit on top, ice-blue underneath."""
    hi, mid, lo = ramp
    for x, y in ellipse(cx, cy, r * 1.15, r * 0.85):
        dy, dx = y - cy, x - cx
        c.put(x, y, hi if dy + 0.4 * dx < -r * 0.2 else lo if dy > r * 0.45 else mid)


def vine(c, x, y, length):
    """A leafy strand hanging from a lip, lit leaves on its left."""
    for i in range(length):
        c.put(x, y + i, 'k' if i == length - 1 else 'g')
        if i % 2 == 0 and i < length - 1:
            c.put(x - 1, y + i, 'G')
        elif i < length - 2:
            c.put(x + 1, y + i, 'k')


# Hand-drawn plants for ledges and the tops of cliffs.
CONIFER = [
    '.....gk.....',
    '....Ggk.....',
    '....Ggkt....',
    '...GGgkkt...',
    '....ggkt....',
    '...Gggkkt...',
    '..GGggkkkt..',
    '...gggkkt...',
    '..Ggggkkkt..',
    '.GGgggkkkkt.',
    '..ggggkkkt..',
    '.Gggggkkkkt.',
    'GGgggggkkktt',
    '.gggggkkkkt.',
    '...kkkkttt..',
    '.....dw.....',
    '.....dd.....',
]
ROUND_TREE = [
    '....GGGg....',
    '..GGGGgggk..',
    '.GGGgggggkk.',
    'GGGggggggkkt',
    'GGgggggkkkkt',
    '.ggggkkkkkt.',
    '..kkkkkttt..',
    '.....dw.....',
]
BUSH = [
    '..GGg...',
    '.GGggk..',
    'GGgggkk.',
    'Ggggkkkt',
    '.gkkkkt.',
]
FERN = [
    'G.g.G',
    '.Ggk.',
    'gGgkk',
]
SCRUB = [
    '.gkg.',
    'gkkkt',
    '.dkd.',
]


# =========================================================================== waterfall
# A ribbon fall at the back of a gorge cut into a grassy hill. The gorge's left wall faces away
# from the light and its right wall into it, which gives the recess its depth. Water streaks
# scroll down 4 px a frame over a 12-px period, so three frames loop; ripples widen and spray
# puffs rise in three staggered generations.
WF_W, WF_H = 64, 80
WF_TOP = [(1, 17), (3, 12), (6, 9), (11, 7), (17, 6), (23, 7), (29, 5), (35, 5), (41, 7),
          (47, 6), (53, 7), (58, 9), (61, 12), (62, 17)]
WF_LEFT = [(0, 8), (12, 6), (22, 5), (32, 4), (44, 3), (56, 2), (64, 1), (79, 1)]   # y -> edge
BACK_X0, BACK_X1, BACK_BROW, BACK_BASE = 20, 44, 13, 58
FRONT_BROW, FRONT_BASE = 21, 70
FALL_X0, FALL_X1 = 27, 37
FALL_PHASE = [0, 7, 3, 10, 5, 1, 8, 4, 11, 2, 6]
FALL_LEN = [4, 5, 3, 6, 4, 5, 3, 6, 4, 3, 4]


def _wf_brow(x):
    if x <= 13 or x >= 51:
        return FRONT_BROW + (1 if x in (4, 5, 9, 54, 58, 59) else 0)
    if x < BACK_X0:
        return round(FRONT_BROW - (FRONT_BROW - BACK_BROW) * (x - 13) / (BACK_X0 - 13))
    if x <= BACK_X1:
        return BACK_BROW
    return round(BACK_BROW + (FRONT_BROW - BACK_BROW) * (x - BACK_X1) / (51 - BACK_X1))


def _wf_base(x):
    if x <= 13 or x >= 51:
        return FRONT_BASE
    if x < BACK_X0:
        return round(FRONT_BASE - (FRONT_BASE - BACK_BASE) * (x - 13) / (BACK_X0 - 13))
    if x <= BACK_X1:
        return BACK_BASE
    return round(BACK_BASE + (FRONT_BASE - BACK_BASE) * (x - BACK_X1) / (51 - BACK_X1))


def _flow(phase, y, frame, length):
    return (y - 4 * frame + phase) % 12 < length


def waterfall(frame):
    c = Canvas(WF_W, WF_H)
    top = lambda x: profile(WF_TOP, x)

    # grassy hilltop, then the gorge: back wall, shaded left wall, lit right wall, two fronts
    for x, y in region(1, 62, top, lambda x: _wf_brow(x) - 1):
        hv = _hash(x, y)
        c.put(x, y, 'G' if y == top(x) or hv % 9 == 0 else 'k' if hv % 11 == 0 else 'g')
    rockface(c, region(BACK_X0, BACK_X1, lambda x: BACK_BROW, lambda x: BACK_BASE + 2), salt=1)
    rockface(c, region(1, 13, _wf_brow, lambda x: FRONT_BASE), salt=2)
    rockface(c, region(51, 62, _wf_brow, lambda x: FRONT_BASE), salt=3)
    rockface(c, region(14, BACK_X0 - 1, _wf_brow, _wf_base), ramp='xxn', crevice='n',
             size=(6, 6, 3, 5, 3, 4), salt=4)
    rockface(c, region(BACK_X1 + 1, 50, _wf_brow, _wf_base), ramp='HHh', size=(6, 6, 3, 5, 3, 4),
             salt=5)
    for x in range(BACK_X0, BACK_X1 + 1):                      # the left wall's shadow and the
        for y in range(BACK_BROW, BACK_BASE + 3):              # wet foot darken the back wall
            ch = c.get(x, y)
            if x < BACK_X0 + 4 + (y - BACK_BROW) // 6 or y > BACK_BASE - 5:
                c.put(x, y, {'H': 'h', 'h': 'x', 'x': 'n' if _hash(x, y) % 3 == 0 else 'x'}[ch])
    for x in range(1, 63):                                     # grass lip and the shade under it
        b = _wf_brow(x)
        c.put(x, b - 1, 'k')
        c.put(x, b, 'k' if _hash(x, 1) % 3 == 0 else 'x')
    for tx, ty in ((3, 38), (8, 52), (55, 44), (59, 31), (21, 30)):
        c.stamp(tx, ty, ['.G.', 'Ggk'])

    # the stream crossing the hilltop, widening toward the brink
    t0 = top(32)
    for y in range(t0, BACK_BROW):
        k = (y - t0) / max(1, BACK_BROW - 1 - t0)
        xl, xr = round(30 - 3 * k), round(34 + 3 * k)
        c.put(xl - 1, y, 'k')
        c.put(xr + 1, y, 'k')
        for x in range(xl, xr + 1):
            ch = 'A' if _flow(FALL_PHASE[x % 11], y, frame, 3) and xl < x < xr else 'a'
            c.put(x, y, '1' if y == BACK_BROW - 1 else ch)

    # the fall: a lit left edge, long bright streaks down the core, a shaded right edge
    last = FALL_X1 - FALL_X0
    for i, x in enumerate(range(FALL_X0, FALL_X1 + 1)):
        for y in range(BACK_BROW + 1, BACK_BASE + 2):
            on = _flow(FALL_PHASE[i], y, frame, FALL_LEN[i])
            if i == 0:
                ch = 'W' if on else '1'
            elif i == last:
                ch = '2' if on else '3'
            elif i == last - 1:
                ch = '1' if on else 'A'
            else:
                ch = ('W' if i % 3 == 1 else '1') if on else 'A'
            c.put(x, y, ch)
        c.put(x, BACK_BROW, 'W')

    # trim the hill's flanks so it tapers toward the top
    for y in range(WF_H):
        edge = profile(WF_LEFT, y)
        for x in range(edge):
            c.erase(x, y)
            c.erase(WF_W - 1 - x, y)

    # the gorge floor and the plunge pool, with ripples widening from the fall
    for x, y in ellipse(32, 67, 20, 8):
        if y > _wf_base(x):
            c.put(x, y, 'x' if _hash(x, y) % 3 else 'h')
    for x, y in ellipse(32, 66, 16, 6):
        c.put(x, y, 'a')
    for k in range(3):
        r = 4 + 3 * k + frame
        for deg in range(180, 361, 5):
            if (deg // 5 + k) % 4 == 0:
                continue
            x = round(32 + r * 1.7 * math.cos(math.radians(deg)))
            y = round(61 - r * 0.5 * math.sin(math.radians(deg)))
            if c.get(x, y) == 'a':
                c.put(x, y, 'A')

    # rocks at the feet of the walls and round the pool, ferns between them
    for cx, cy, rx, ry in ((3, 67, 3, 4), (10, 70, 4, 4), (60, 67, 3, 4), (54, 70, 4, 4),
                           (5, 75, 5, 3), (59, 75, 4, 3), (15, 77, 4, 2), (50, 76, 5, 3),
                           (24, 77, 3, 1), (42, 77, 3, 1), (34, 78, 2, 1)):
        boulder(c, cx, cy, rx, ry)
    for fx, fy in ((16, 72), (44, 72), (27, 75), (1, 62), (59, 62)):
        c.stamp(fx, fy, FERN)

    # where the fall lands: a churning bank of spray, its puffs rising in three generations
    for x, y in ellipse(32, 61, 10, 2):
        c.put(x, y, '1' if y > 61 else 'W')
    for i in range(7):
        phase = (i + frame) % 3
        px = 32 + (i - 3) * 3 + (phase if i > 3 else -phase if i < 3 else 0)
        py = 59 - (2 if i in (2, 3, 4) else 0) - phase
        puff(c, px, py, (2.2, 2.8, 1.8)[phase] - (0.6 if i in (0, 6) else 0))

    # vines hanging from the lips, and trees on the hilltop
    for vx, vy, n in ((9, 22, 9), (53, 22, 7), (23, 13, 5), (42, 13, 6)):
        vine(c, vx, vy, n)
    c.stamp(3, 0, CONIFER)
    c.stamp(48, 1, ROUND_TREE)
    c.stamp(14, 3, BUSH)
    return c.image()


# =========================================================================== giant tree
# An ancient broadleaf: a vast scalloped crown of leaf clumps, each lit along its top and dark
# where it tucks under the next, over a fissured trunk and buttress roots that run out along the
# ground like fins, with grass showing between them.
GT_W, GT_H = 80, 96
CROWN = [   # (cx, cy, rx, ry): a few big masses with smaller clumps round them, back to front
    (30, 8, 7, 5), (51, 8, 7, 5), (40, 12, 14, 9), (21, 19, 13, 9), (59, 19, 13, 9),
    (11, 31, 10, 8), (69, 31, 10, 8), (40, 28, 15, 10), (5, 41, 4, 5), (75, 41, 4, 5),
    (24, 40, 13, 7), (56, 40, 13, 7), (17, 47, 6, 3), (63, 47, 6, 3), (40, 46, 9, 4),
]
GT_ROOTS = [   # (start, bend, tip, height at the trunk), drawn back to front
    ((26, 79), (16, 80), (8, 86), 9),
    ((54, 79), (64, 80), (72, 86), 9),
    ((30, 84), (23, 88), (15, 93), 9),
    ((50, 84), (57, 88), (65, 93), 9),
]


def scalloped(cx, cy, rx, ry, lobes=7, depth=0.09, turn=0.0):
    """An ellipse with a leafy, lobed rim."""
    out = []
    for y in range(math.floor(cy - ry * 1.1), math.ceil(cy + ry * 1.1) + 1):
        for x in range(math.floor(cx - rx * 1.1), math.ceil(cx + rx * 1.1) + 1):
            dx, dy = (x - cx) / (rx + 0.5), (y - cy) / (ry + 0.5)
            lobe = 1 + depth * math.sin(lobes * math.atan2(dy, dx) + turn)
            if dx * dx + dy * dy <= lobe * lobe:
                out.append((x, y))
    return out


def _clump_pts(cx, cy, rx, ry, salt):
    return scalloped(cx, cy, rx, ry, lobes=9, depth=0.12, turn=salt)


def leaf_clump(c, cx, cy, rx, ry, salt, under=False):
    """One clump of a crown: a lit band along its top, plain leaf in the middle, a dark rim
    where it tucks under the clump in front, teal shade under the lowest tier."""
    pts = _clump_pts(cx, cy, rx, ry, salt)
    inside = set(pts)
    for x, y in pts:                     # a dark seam where this clump overlaps the ones behind
        for nx, ny in ((x, y - 1), (x - 1, y)):
            if (nx, ny) not in inside and c.get(nx, ny) in 'Gg':
                c.put(nx, ny, 'k')
    for x, y in pts:
        u, v = (x - cx) / (rx + 0.5), (y - cy) / (ry + 0.5)
        if (x, y + 1) not in inside or (x + 1, y) not in inside and v > -0.2 or u + v > 1.0:
            ch = 't' if under and v > 0.2 else 'k'
        elif u + 1.3 * v < -0.5:
            ch = 'g' if _leaf_mark(x, y, salt) and u + 1.3 * v > -0.9 else 'G'
        elif _leaf_mark(x, y, salt) and rx > 8:
            ch = 'k'
        else:
            ch = 'g'
        c.put(x, y, ch)


def _leaf_mark(x, y, salt):
    """Small arcs scattered through a big clump, so it reads as many leaf clusters."""
    row, col = divmod(y + salt, 4)
    return (col, (x + 3 * (row % 2) + salt) % 7) in ((0, 0), (1, 1), (1, 2), (0, 3))


def _bezier(p0, p1, p2, t):
    return tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * e for a, b, e in zip(p0, p1, p2))


def _bark(x, y, x0, x1):
    """Ridged bark: a lit left flank, a shaded right flank, and dark cracks that wander."""
    u = (x - x0) / max(1, x1 - x0)
    ch = 'L' if u < 0.22 else 'w' if u < 0.66 else 'd'
    for f in (0.12, 0.34, 0.55, 0.8):
        wobble = round(1.2 * math.sin(y * 0.33 + f * 17))
        if x == round(x0 + f * (x1 - x0)) + wobble:
            ch = 'w' if ch == 'L' else 'd' if ch == 'w' else 'k'
    return ch


def giant_tree():
    c = Canvas(GT_W, GT_H)

    # limbs reaching up into the crown
    for (x0, y0), (x1, y1), w in (((33, 60), (16, 40), 3), ((47, 60), (63, 40), 3),
                                  ((38, 56), (33, 34), 2), ((43, 56), (49, 34), 2)):
        for i in range(31):
            t = i / 30
            x, y = round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)
            for dx in range(-w, w + 1):
                c.put(x + dx, y, 'w' if dx < 0 else 'd')

    # the trunk: broad and ridged, swelling into the roots at its foot
    for y in range(48, 90):
        hw = 11 + max(0, (y - 66)) // 3 + (1 if 54 < y < 60 else 0)
        x0, x1 = 40 - hw, 40 + hw
        for x in range(x0, x1 + 1):
            ch = _bark(x, y, x0, x1)
            if y < 52 + 10 * (x - x0) // (x1 - x0):            # in the crown's shade
                ch = {'L': 'w', 'w': 'd', 'd': 'd', 'k': 'k'}[ch]
            c.put(x, y, ch)
    for x, y in ellipse(33, 70, 2, 3):                           # a burl on the lit flank
        c.put(x, y, 'L' if x < 33 or y < 69 else 'd')
    for x, y in ((46, 74), (47, 75), (48, 74), (47, 76), (49, 77), (46, 79), (48, 80), (45, 66),
                 (46, 67), (50, 83), (49, 84)):
        c.put(x, y, 'g' if (x + y) % 3 else 'G')                # moss on the shaded flank

    # buttress roots: fins standing on the ground, tall at the trunk and tapering outward
    for p0, p1, p2, height in GT_ROOTS:
        shaded = p2[0] > p0[0] + 4
        fin = set()
        for i in range(61):
            t = i / 60
            x, y = _bezier(p0, p1, p2, t)
            h = max(2, round(height * (1 - t) ** 1.2))
            for yy in range(round(y) - h, round(y) + 1):
                fin.add((round(x), yy))
        for x, y in fin:
            if (x, y - 1) not in fin:
                ch = 'w' if shaded else 'L'
            elif (x, y + 1) not in fin:
                ch = 'd'
            elif (x, y - 2) not in fin and not shaded:
                ch = 'L'
            else:
                ch = 'd' if shaded else 'w'
            c.put(x, y, ch)

    # the crown over a dark core that fills the gaps between clumps, then hanging strands
    spans = {}
    for i, clump in enumerate(CROWN):
        for x, y in _clump_pts(*clump, salt=i * 3):
            lo, hi = spans.get(y, (x, x))
            spans[y] = (min(lo, x), max(hi, x))
    for y, (lo, hi) in spans.items():
        if y < 44:
            for x in range(lo + 1, hi):
                c.put(x, y, 'k')
    for i, clump in enumerate(CROWN):
        leaf_clump(c, *clump, salt=i * 3, under=clump[1] > 40)
    for vx, vy, n in ((20, 47, 6), (26, 46, 9), (55, 46, 7), (61, 47, 4)):
        vine(c, vx, vy, n)
    return c.image()


# =========================================================================== sea arch
# A grass-capped arch of layered grey rock with a tall stack behind it and a squat one in front,
# all standing in the sea. The sea is the water tiles underneath: only the water seen through
# the arch is painted, and the foam and wave crests are an unringed layer, so no outline lands on
# open water. The surf alternates between two frames.
SA_W, SA_H = 80, 64
SA_ROCKS = [   # top profile (x, y), left and right edges (y, x), waterline row; back to front
    dict(top=[(51, 12), (53, 8), (56, 6), (59, 7), (62, 10), (64, 14)],
         left=[(6, 53), (14, 52), (22, 53), (30, 51), (40, 52), (50, 50)],
         right=[(6, 61), (13, 63), (24, 62), (33, 64), (42, 63), (50, 65)], base=50, cap=3),
    dict(top=[(2, 24), (4, 15), (7, 10), (12, 8), (17, 9), (23, 12), (30, 13), (36, 13),
              (41, 15), (45, 19), (47, 26)],
         left=[(8, 6), (14, 4), (22, 3), (32, 4), (40, 2), (48, 1), (55, 2)],
         right=[(8, 42), (16, 45), (26, 47), (34, 46), (44, 47), (55, 48)], base=55, cap=4),
    dict(top=[(63, 40), (65, 36), (68, 33), (72, 33), (75, 36), (77, 41)],
         left=[(32, 66), (40, 64), (48, 65), (60, 63)],
         right=[(32, 74), (38, 76), (48, 77), (60, 78)], base=60, cap=0),
]
SA_OPENING = [(17, 55), (18, 40), (20, 31), (23, 26), (28, 23), (33, 24), (37, 28), (39, 34),
              (40, 41), (41, 55)]          # the underside of the span, x -> row
SA_CRESTS = [(22, 34), (31, 30), (26, 41), (35, 45), (21, 49), (30, 51)]
SA_BOULDERS = [(4, 54, 3, 2), (46, 55, 3, 2), (61, 59, 2, 2), (49, 50, 2, 2)]
SA_FOAM = [(1, 20, 56), (37, 49, 56), (49, 66, 51), (60, 79, 61)]   # (x0, x1, row)


def _clamped(points, x):
    return profile(points, min(max(x, points[0][0]), points[-1][0]))


def _sea_rock(c, rock, salt):
    top = lambda x: _clamped(rock['top'], x)
    base = rock['base']
    pts = [(x, y) for y in range(rock['left'][0][0], base + 1)
           for x in range(_clamped(rock['left'], y), _clamped(rock['right'], y) + 1)
           if y >= top(x)]
    rockface(c, pts, size=(12, 5, 6, 10, 2, 3), salt=salt)
    area = set(pts)
    for x, y in pts:
        if (x + 1, y) not in area or (x + 2, y) not in area:    # the side turning from the light
            c.put(x, y, 'x' if c.get(x, y) != 'x' or (x + 1, y) in area else 'n')
        elif (x - 1, y) not in area and c.get(x, y) == 'h':
            c.put(x, y, 'H')
        if y > base - 3:                                        # wet, weedy foot
            c.put(x, y, 't' if (x + y) % 3 else 'x')
    for x in range(rock['top'][0][0], rock['top'][-1][0] + 1):
        t = top(x)
        if (x, t) not in area:
            continue
        for y in range(t, t + rock['cap']):                     # grass cap, dark at its lip
            c.put(x, y, 'G' if y == t else 'k' if y == t + rock['cap'] - 1 else 'g')
        if rock['cap'] and _hash(x, t) % 4 == 0:
            c.put(x, t + rock['cap'], 'k')
        if not rock['cap']:
            c.put(x, t, 'H')


def _surf(frame):
    """Foam along each waterline, splashes against the rock and crests on the open water, as an
    unringed layer."""
    c = Canvas(SA_W, SA_H)
    for x0, x1, y in SA_FOAM:                   # half-period shifts, so the pair rocks evenly
        for x in range(x0, x1 + 1):
            k = (x + 3 * frame) % 6
            c.put(x, y, 'W' if k < 3 else '1' if k < 5 else '.')
            if (x + 3 * frame + 2) % 6 < 3:
                c.put(x, y + 1, '1' if (x + frame) % 3 else 'A')
            if (x + 5 * frame) % 10 == 0:
                c.put(x, y - 1, 'W')                            # spray thrown up the rock
                c.put(x + 1, y - 2, '1')
    for x, y in ((6, 60), (25, 62), (44, 61), (55, 56), (70, 63), (13, 63)):
        dx = 2 * frame
        c.put(x + dx, y, 'W')
        c.put(x + dx + 1, y, 'A')
        c.put(x + dx - 1, y + 1, 'A')
        c.put(x + dx + 2, y + 1, 'A')
    return c


def sea_arch(frame):
    c = Canvas(SA_W, SA_H)
    for i, rock in enumerate(SA_ROCKS):
        _sea_rock(c, rock, salt=11 + i)
        if i != 1:
            continue
        opening = lambda x: profile(SA_OPENING, x)              # the sea seen through the arch
        x0, x1 = SA_OPENING[0][0], SA_OPENING[-1][0]
        for x in range(x0, x1 + 1):
            for y in range(opening(x), rock['base'] + 1):
                if x == x0 or x == x0 + 1:
                    ch = 'x'                                    # the left leg's shaded inner face
                elif x == x1:
                    ch = 'H'                                    # the right leg's lit inner face
                elif y < opening(x) + 2:
                    ch = 'n'                                    # shade under the span
                elif y >= rock['base'] - 1:
                    ch = 'W' if (x + 2 * frame) % 4 else '1'
                else:
                    ch = 'a'
                c.put(x, y, ch)
        for cx, cy in SA_CRESTS:                                # crests drifting through
            for dx in range(3):
                if c.get(cx + dx + frame, cy) == 'a':
                    c.put(cx + dx + frame, cy, 'A')
    for b in SA_BOULDERS:
        boulder(c, *b)
    im = c.image()
    im.alpha_composite(sk.from_ascii(_surf(frame).rows(), KEY))
    return im


# =========================================================================== stone arch
# A sandstone fin with a broad window worn through it, on a ledge of bare slickrock with scrub.
# Banded in cream, sand and wood tones, never red; the window shows whatever lies behind.
ST_W, ST_H = 64, 56
ST_FOOT = 46                       # the fin's last row, where it stands on the sandy apron
ST_PARTS = [   # (top profile x -> row, left edge row -> x, right edge row -> x), back to front
    ([(4, 22), (6, 14), (9, 10), (14, 8), (19, 9), (24, 12), (30, 13), (36, 12), (41, 10),
      (46, 10), (50, 13), (52, 18)],
     [(10, 9), (14, 6), (20, 5), (28, 4), (36, 3), (46, 3)],
     [(10, 50), (16, 52), (22, 51), (28, 50), (34, 50), (40, 51), (46, 52)]),
    ([(54, 34), (55, 30), (57, 28), (59, 29), (61, 33)],
     [(28, 57), (34, 55), (40, 55), (46, 54)],
     [(28, 59), (34, 61), (40, 61), (46, 61)]),
]
ST_WINDOW = [(15, 46), (16, 37), (18, 30), (21, 25), (25, 22), (30, 20), (35, 20), (39, 22),
             (42, 26), (44, 32), (45, 39), (45, 46)]          # x -> row of the window's top edge
ST_BANDS = [   # (rows, (lit top, face, dark foot)) from the top of the fin down
    (3, 'SsL'), (5, 'CSs'), (4, 'SsL'), (6, 'CSs'), (3, 'Css'), (5, 'SsL'), (6, 'CSs'),
    (4, 'SsL'), (6, 'CSs'), (6, 'SsL'),
]
DARKER = {'W': 'C', 'C': 'S', 'c': 's', 'S': 's', 's': 'L', 'L': 'w', 'w': 'd', 'd': 'd'}
LIGHTER = {'d': 'w', 'w': 'L', 'L': 's', 's': 'S', 'S': 'C', 'c': 'C', 'C': 'C'}


def strata(c, pts, y0):
    """Layered sandstone: each band lit along its top and dark at its foot, lit down the left
    flank of the rock and shaded down the right; band ends step in and out along the edge."""
    area = set(pts)
    bands = []
    for rows, ramp in ST_BANDS:
        bands += [(ramp, r, rows) for r in range(rows)]
    for x, y in pts:
        ramp, r, rows = bands[min(len(bands) - 1, max(0, y - y0))]
        ch = ramp[0] if r == 0 else ramp[2] if r == rows - 1 else ramp[1]
        if (x + 1, y) not in area or (x + 2, y) not in area:
            ch = DARKER[DARKER[ch]] if (x + 1, y) not in area else DARKER[ch]
        elif (x - 1, y) not in area:
            ch = LIGHTER[ch]
        elif _hash(x, y) % 23 == 0:
            ch = DARKER[ch]                                     # pits worn by the wind
        c.put(x, y, ch)


def stone_arch():
    c = Canvas(ST_W, ST_H)

    # the sandy apron: a lit top, a low front face, drifts against the foot
    for x, y in ellipse(32, 48, 31, 6):
        c.put(x, y, 'S' if _hash(x, y) % 7 else 's')
    for x in range(2, 62):
        bottom = 52 + (1 if _hash(x, 5) % 3 == 0 else 0) - (1 if x < 7 or x > 56 else 0)
        for y in range(50, bottom + 1):
            c.put(x, y, 's' if y < bottom else 'L')

    # the fin and a pinnacle beside it, both banded
    for top_pts, left, right in ST_PARTS:
        top = lambda x, t=top_pts: _clamped(t, x)
        pts = [(x, y) for y in range(left[0][0], ST_FOOT + 1)
               for x in range(_clamped(left, y), _clamped(right, y) + 1) if y >= top(x)]
        strata(c, pts, min(top(x) for x, _ in pts))
        area = set(pts)
        for x, y in pts:                                        # caprock lit along its crown
            if (x, y - 1) not in area:
                c.put(x, y, 'C')

    # the window: the left jamb in shade, the right jamb catching light, the dark soffit,
    # open air above the apron and the apron's far edge seen through it
    window = lambda x: profile(ST_WINDOW, x)
    x0, x1 = ST_WINDOW[0][0], ST_WINDOW[-1][0]
    for x in range(x0, x1 + 1):
        for y in range(window(x), ST_FOOT + 1):
            if x <= x0 + 1:
                c.put(x, y, 'L' if x == x0 else 's')
            elif x >= x1 - 1:
                c.put(x, y, 'C' if x == x1 - 1 else 'S')
            elif y <= window(x) + 1:
                c.put(x, y, 'w' if y == window(x) else 'L')
            elif y >= 44:
                c.put(x, y, 'S' if y == 44 else 's')
            else:
                c.erase(x, y)

    # scrub and stones on the apron
    for sx, sy in ((3, 42), (52, 45), (14, 48), (44, 49)):
        c.stamp(sx, sy, SCRUB)
    for b in ((36, 51, 2, 1), (8, 51, 2, 1), (60, 49, 2, 1), (25, 50, 1, 1)):
        boulder(c, *b, ramp='CSs')
    return c.image()


# =========================================================================== hot springs
# Terraced mineral pools on a cream sinter mound: each basin has a lit rim and a curtain of drip
# columns hanging from its front lip onto the basin below. Water is pale ice, with two pools
# tinted mint by their minerals. Steam is an unringed layer that drifts across two frames.
HS_W, HS_H = 80, 64
HS_MOUND = [(2, 61), (3, 53), (7, 44), (12, 36), (17, 28), (23, 19), (29, 13), (35, 10),
            (44, 9), (51, 12), (57, 18), (63, 27), (69, 36), (74, 45), (77, 53), (78, 61)]
HS_BASINS = [   # (cx, cy, rx, ry, water ramp light..dark), back to front
    (40, 15, 11, 3, '123'), (25, 25, 10, 3, '567'), (55, 26, 11, 3, '123'),
    (40, 36, 13, 4, '123'), (19, 45, 10, 3, '123'), (54, 46, 12, 3, '567'),
    (36, 55, 14, 3, '123'),
]
HS_PLUMES = [(39, 14), (42, 35), (22, 24)]          # where steam rises


def _basin(c, cx, cy, rx, ry, water, salt):
    hi, mid, lo = water
    rim = scalloped(cx, cy, rx + 1.5, ry + 1, lobes=5, depth=0.08, turn=salt)
    lips = {}
    for x, y in rim:
        lips[x] = max(lips.get(x, y), y)
    for x, lip in lips.items():                                 # curtain from the front lip
        n = 5 + round(1.3 * math.sin(x * 0.8 + salt)) - (2 if abs(x - cx) > rx - 1 else 0)
        shade = x > cx + rx // 3
        for i in range(1, n + 1):
            ch = 'WCCc'[(x + salt) % 4] if i < n else 'c'
            if shade:
                ch = DARKER[ch] if ch != 'W' else 'C'
            c.put(x, lip + i, ch)
    for x, y in rim:                                            # rim, lit on the far side
        c.put(x, y, 'W' if y < cy and x < cx + rx // 2 else 'C' if y <= cy + 1 else 'c')
    inside = set(scalloped(cx, cy, rx, ry, lobes=5, depth=0.08, turn=salt))
    for x, y in inside:
        c.put(x, y, lo if (x, y - 1) not in inside else mid)   # shade under the far rim
    for gx, gy in ((cx - rx // 2, cy), (cx + 1, cy + 1)):       # two glints
        for dx in range(2):
            if (gx + dx, gy) in inside:
                c.put(gx + dx, gy, hi)


def _steam(frame):
    """Puffs that thin out and drift right as they rise; frame 1 lifts each puff halfway to
    the next one's place, so the pair loops."""
    c = Canvas(HS_W, HS_H)
    for j, (px, py) in enumerate(HS_PLUMES):
        for i in range(4 if j == 0 else 3):
            k = i + frame / 2
            r = 2.4 - 0.4 * k - 0.4 * (j > 0)
            x, y = px + round(2 * k), py - 3 - round(4 * k)
            puff(c, x, y, r, ramp='W11')
    return c


def hot_springs(frame):
    c = Canvas(HS_W, HS_H)
    top = lambda x: profile(HS_MOUND, x)
    for x in range(2, 79):                                      # the sinter mound
        for y in range(top(x), 62):
            shade = x > 44 + (y - 9) * 0.55
            ch = 'c' if shade or _hash(x, y) % 6 == 0 else 'C'
            if x % 9 == 4 and _hash(x, y // 5) % 3 == 0 and y > top(x) + 2:
                ch = 's' if shade else 'S'                      # mineral stains running down
            if y == top(x):
                ch = 'C' if shade else 'W'
            if y == 61:
                ch = 's'
            c.put(x, y, ch)
    for i, basin in enumerate(HS_BASINS):
        _basin(c, *basin, salt=i * 5)
    for x, y in ((40, 15), (37, 16), (43, 15)):                 # the source bubbling
        c.put(x + (frame if x != 40 else -frame), y, 'W')
    for bx, by in ((3, 56), (72, 55), (7, 48), (68, 46)):
        c.stamp(bx, by, FERN)
    for b in ((13, 59, 3, 2), (64, 59, 3, 2), (3, 59, 2, 2), (77, 58, 1, 2)):
        boulder(c, *b)
    im = c.image()
    im.alpha_composite(sk.from_ascii(_steam(frame).rows(), KEY))
    return im


# =========================================================================== geyser
# A vent in a low sinter mound, through four frames: calm with a wisp of steam, a column rising,
# the full plume with its spray crown and falling curtains, and the collapse. The water and spray
# are ringed in ice-blue rather than black, so the plume reads as water, not a solid pillar.
GY_W, GY_H = 32, 64
GY_VENT = (16, 53)
GY_PLUMES = [   # (column top row, half-width at the vent and at the top, puffs, droplets)
    (None, (0, 0), [], []),
    (34, (1, 2), [(16, 32, 3.4), (13, 35, 2.0), (19, 34, 2.2)],
     [(10, 36), (22, 35), (11, 41), (21, 42), (9, 45)]),
    (13, (1, 4), [(16, 9, 4.6), (10, 11, 3.4), (22, 10, 3.4), (5, 15, 2.2), (27, 14, 2.2),
                  (13, 5, 2.4), (20, 4, 2.2)],
     [(4, 20), (28, 19), (3, 26), (29, 25), (4, 33), (28, 32), (6, 40), (26, 39), (7, 23),
      (25, 28)]),
    (36, (1, 1), [(10, 22, 3.2), (22, 20, 3.4), (16, 15, 2.4), (6, 30, 2.0), (26, 28, 2.2)],
     [(5, 38), (27, 37), (6, 44), (26, 45), (16, 26), (14, 30), (18, 31), (9, 27), (23, 26)]),
]
GY_STEAM = [   # unringed steam puffs per frame (x, y, r)
    [(16, 48, 1.6), (17, 44, 2.1), (19, 39, 1.7), (20, 35, 1.2)],
    [(11, 49, 1.8), (21, 49, 1.6)],
    [(9, 48, 2.6), (23, 47, 2.6), (6, 44, 1.6), (26, 43, 1.8)],
    [(16, 40, 3.0), (12, 45, 2.2), (20, 44, 2.4), (18, 35, 1.8)],
]


def _geyser_mound(c, frame):
    vx, vy = GY_VENT
    dome = set(ellipse(16, 61, 14, 9))
    for x, y in dome:                                           # sinter mound with terraces
        if y > 61:
            continue
        u, v = (x - 16) / 14.5, (y - 61) / 9.5
        ch = 'C' if u + v < -0.5 else 'H' if u - v * 0.3 > 0.55 else 'c'
        if (x, y - 1) not in dome:
            ch = 'C' if x < 19 else 'c'
        elif round(math.hypot(u, v * 1.7) * 10) in (6, 9):
            ch = {'C': 'c', 'c': 'H', 'H': 'h'}[ch]             # the lips of two terrace steps
        c.put(x, y, ch)
    for x in range(3, 30):
        c.put(x, 61, 'h' if x > 16 else 'H')
    for x, y in ((9, 57), (10, 58), (11, 59), (22, 57), (23, 58), (23, 59), (24, 60)):
        c.put(x, y, '2' if (x + y) % 2 else 'T')                # runoff and algae mats
    for x, y in ellipse(vx, vy + 1, 6, 2):
        c.put(x, y, 'C' if y < vy + 1 else 'c')
    for x, y in ellipse(vx, vy + 1, 4.5, 1.2):
        c.put(x, y, '3' if y <= vy else '2')
    if frame == 0:
        c.put(vx - 1, vy + 1, 'x')
        c.put(vx, vy + 1, 'n')
        c.put(vx + 1, vy + 1, 'x')
        c.put(vx - 3, vy + 1, '1')
        c.put(vx + 3, vy + 2, '1')


def _plume(frame):
    top, (w0, w1), puffs, drops = GY_PLUMES[frame]
    c = Canvas(GY_W, GY_H)
    vx, vy = GY_VENT
    if top is not None:
        for y in range(top, vy + 2):
            w = round(w0 + (w1 - w0) * (vy - y) / (vy - top))
            if frame == 3 and y % 7 in (0, 1):
                continue                                        # the column breaking up
            for x in range(vx - w, vx + w + 1):
                ch = '1' if x == vx - w else '3' if x == vx + w and w > 1 else 'W'
                if ch == 'W' and x in (vx - 1, vx + 2) and (y + 2 * x) % 7 < 3:
                    ch = '1'                                    # streaks in the rush
                c.put(x, y, ch)
    for x, y, r in puffs:
        puff(c, x, y, r, ramp='W12')
    for x, y in drops:
        c.put(x, y, '1')
        c.put(x, y + 1, '2')
    return c


def geyser(frame):
    c = Canvas(GY_W, GY_H)
    _geyser_mound(c, frame)
    im = c.image()
    plume = sk.add_outline(sk.from_ascii(_plume(frame).rows(), KEY), sk.PALETTE['ICE_D'])
    im.alpha_composite(plume)
    steam = Canvas(GY_W, GY_H)
    for x, y, r in GY_STEAM[frame]:
        puff(steam, x, y, r, ramp='W11')
    im.alpha_composite(sk.from_ascii(steam.rows(), KEY))
    return im


# =========================================================================== crystal cave
# A cave mouth in a grass-browed rock face, with crystal clusters growing at its jambs and
# glowing in the dark inside. Lilac is kept to the crystals; the blue crystals use the base
# palette. The second frame is a glimmer: sparkles at the tips and brighter facets.
CC_W, CC_H = 64, 56
CC_TOP = [(1, 46), (2, 36), (4, 28), (7, 23), (10, 20), (13, 17), (15, 12), (19, 9), (23, 8),
          (27, 5), (33, 4), (38, 6), (42, 5), (47, 8), (51, 13), (54, 15), (57, 19), (60, 27),
          (62, 36), (62, 52)]
CC_MOUTH = [(19, 52), (20, 44), (21, 38), (23, 35), (24, 31), (27, 28), (29, 25), (32, 24),
            (35, 25), (37, 24), (40, 27), (42, 31), (43, 36), (45, 40), (45, 46), (46, 52)]
CC_BASE = 52
LILAC_GEM = 'EefF'                       # highlight, lit facet, shaded facet, dark edge
BLUE_GEM = 'WAan'
CC_CRYSTALS = [   # (base x, base row, height, half-width, lean, ramp), back to front
    (29, 46, 7, 1, -1, BLUE_GEM), (35, 47, 9, 1, 1, LILAC_GEM), (32, 48, 5, 1, 0, LILAC_GEM),
    (39, 46, 6, 1, 2, BLUE_GEM),
    (12, 51, 13, 2, -3, LILAC_GEM), (17, 52, 17, 2, -1, LILAC_GEM), (21, 52, 9, 1, 1, LILAC_GEM),
    (8, 52, 7, 1, -2, LILAC_GEM),
    (47, 51, 11, 2, 2, BLUE_GEM), (52, 52, 14, 2, 3, BLUE_GEM), (56, 52, 7, 1, 3, BLUE_GEM),
    (25, 8, 6, 1, -1, LILAC_GEM), (29, 7, 8, 1, 1, LILAC_GEM),
]
CC_SPARKS = [(17, 34), (52, 37), (12, 37), (35, 37), (29, 0)]


def crystal(c, bx, by, h, half, lean, ramp, glimmer=False):
    """A pointed crystal prism leaning by `lean` px over its height: a bright edge down its lit
    facet, a shaded facet on the right and a white tip."""
    hi, lit, shade, edge = ramp
    if glimmer:
        shade = lit
    for i in range(h):
        cx = bx + round(lean * i / h)
        w = half if i < h - half else max(0, h - 1 - i)
        for dx in range(-w, w + 1):
            ch = hi if dx == -w and w > 0 else lit if dx <= 0 else shade
            if dx == w and w > 0:
                ch = edge
            c.put(cx + dx, by - i, ch)
    c.put(bx + lean, by - h + 1, 'W')


def crystal_cave(frame):
    c = Canvas(CC_W, CC_H)
    top = lambda x: profile(CC_TOP, x)
    rock = region(1, 62, top, lambda x: CC_BASE)
    rockface(c, rock, salt=31)
    area = set(rock)
    for x, y in rock:                                           # shaded right flank, grass brow
        if x > 56 and c.get(x, y) in 'Hh':
            c.put(x, y, 'x' if c.get(x, y) == 'h' else 'h')
    for x in range(1, 63):
        t = top(x)
        for y in range(t, t + 3):
            if (x, y) in area:
                c.put(x, y, 'G' if y == t else 'g' if y == t + 1 else 'k')
        if _hash(x, t) % 3 == 0 and (x, t + 3) in area:
            c.put(x, t + 3, 'k')

    # the mouth: a dark rim, then the depths, faintly lit around the crystals inside
    mouth = lambda x: profile(CC_MOUTH, x)
    x0, x1 = CC_MOUTH[0][0], CC_MOUTH[-1][0]
    for x in range(x0, x1 + 1):
        for y in range(mouth(x), CC_BASE + 1):
            edge = min(x - x0, x1 - x, y - mouth(x))
            c.put(x, y, 'x' if edge == 0 else 'M' if edge == 1 or y > CC_BASE - 2 else 'n')
    for (gx, gy, rx, ry), ch in (((33, 45, 8, 4), 'M'), ((33, 46, 5, 2), 'F')):
        for x, y in scalloped(gx, gy, rx, ry, lobes=6, depth=0.15):
            if c.get(x, y) in 'nM':
                c.put(x, y, ch)                                 # glow on the back wall
    for x in range(x0 - 3, x1 + 4):                             # light spilling onto the ground
        if c.get(x, CC_BASE) in 'hxH':
            c.put(x, CC_BASE, 'H')

    # crystals, and their glow on the nearby rock
    for gx, gy, r in ((15, 45, 5), (51, 46, 5), (28, 3, 3)):
        for x, y in scalloped(gx, gy, r, r * 0.8, lobes=5, depth=0.2):
            ch = c.get(x, y)
            if ch in 'hx':
                c.put(x, y, 'H' if ch == 'h' else 'h')
    for spec in CC_CRYSTALS:
        crystal(c, *spec, glimmer=frame == 1 and spec[2] > 10)
    if frame == 1:
        for sx, sy in CC_SPARKS:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                c.put(sx + dx, sy + dy, 'W' if (dx, dy) == (0, 0) else '1')
    return c.image()


# =========================================================================== caldera lake
# The broken rim of an old, long-cold volcano round a still lake. Peaks of uneven height stand on
# the far rim with snow on the tallest; the rim's inner walls are shaded on the left and lit on
# the right; a low grassy rim in front lets the lake show over it. No cone, island or lava.
CL_W, CL_H = 96, 64
CL_PEAKS = [(20, 7, 0.75), (44, 2, 0.8), (66, 5, 0.85), (83, 12, 0.9)]   # apex x, row, slope
CL_LAKE = (48, 35, 31, 10)
CL_CREST = [(0, 45), (8, 43), (16, 43), (26, 46), (36, 48), (48, 49), (60, 48), (70, 46),
            (80, 43), (88, 43), (95, 45)]
CL_SNOW = {1: 9, 2: 7, 0: 4}           # peak index -> depth of its snowcap
CL_TREES = [(9, 33), (79, 32), (20, 37), (66, 38), (4, 40), (88, 39)]


def _caldera_peak(x):
    """The far rim's skyline: whichever peak stands highest over column x, and its row."""
    best = None
    for i, (px, py, slope) in enumerate(CL_PEAKS):
        y = py + abs(x - px) * slope + (2 if (x // 3) % 2 and abs(x - px) > 4 else 0)
        if best is None or y < best[1]:
            best = (i, round(y))
    return best


def caldera_lake():
    c = Canvas(CL_W, CL_H)
    lx, ly, lrx, lry = CL_LAKE
    sky = {x: min(_caldera_peak(x)[1], 44) for x in range(1, CL_W - 1)}
    flank = [(1, 46), (4, 34), (8, 26), (12, 20)]
    for x in range(1, 13):
        sky[x] = max(sky[x], profile(flank, x))
    for x in range(CL_W - 13, CL_W - 1):
        sky[x] = max(sky[x], profile(flank, CL_W - 1 - x))

    # the rim: rugged rock, the left inner wall turned from the light and the right one into it
    rim = [(x, y) for x in range(1, CL_W - 1) for y in range(sky[x], 50)]
    rockface(c, rim, salt=41)
    for x, y in rim:
        ch = c.get(x, y)
        if x < lx - lrx + 8 and y > 18:
            c.put(x, y, {'H': 'h', 'h': 'x', 'x': 'n'}[ch])
        elif x > lx + lrx - 8 and y > 18:
            c.put(x, y, {'H': 'H', 'h': 'H', 'x': 'h'}[ch])

    # peaks: a lit face left of each apex and a shaded face right of it, with ridges running
    # parallel to the skyline, and snow on the tallest
    for x in range(1, CL_W - 1):
        i, _ = _caldera_peak(x)
        px = CL_PEAKS[i][0]
        lit = x < px
        for d in range(0, 12):
            y = sky[x] + d
            if y >= 50:
                break
            ch = 'H' if lit else 'x'
            if d in (4, 8) and x % 4:
                ch = 'h' if lit else 'n'
            snow = CL_SNOW.get(i, 0) - _hash(x, i) % 3
            if d < snow:
                ch = ('W' if lit else '2') if d < snow - 1 else ('1' if lit else '3')
            if d > 9 and c.get(x, y) not in 'Hhxn':
                continue
            c.put(x, y, ch)

    # the lake: still, with the snow and the dark walls mirrored near the far shore
    for x, y in ellipse(lx, ly, lrx, lry):
        ch = 'a'
        top = ly - lry
        if y <= top + 1:
            ch = 'N'                                            # the far wall's reflection
        else:
            for i in (1, 2):
                px = CL_PEAKS[i][0]
                if top + 1 < y <= top + 5 and abs(x - px) <= top + 5 - y:
                    ch = '2' if x < px else '3'                 # snow mirrored upside down
        c.put(x, y, ch)
    for gx, gy in ((30, 33), (58, 31), (44, 38), (68, 36), (24, 40), (52, 42)):
        for dx in range(3):
            if c.get(gx + dx, gy) == 'a':
                c.put(gx + dx, gy, 'A')

    # the low rim in front: grass falling to an uneven foot, a dark lip along the water
    crest = lambda x: profile(CL_CREST, x)
    for x in range(1, CL_W - 1):
        foot = 61 - round(7 * (abs(x - 47.5) / 47.5) ** 3) - (_hash(x // 3, 61) % 3 == 0)
        for y in range(crest(x), foot + 1):
            hv = _hash(x, y)
            ch = 'G' if y == crest(x) or hv % 13 == 0 else 'k' if hv % 11 == 0 else 'g'
            if y == foot:
                ch = 'k'
            c.put(x, y, ch)
        c.put(x, crest(x) + 1, 'k' if _hash(x, 3) % 2 else 'g')
    for b in ((9, 56, 4, 3), (24, 60, 3, 2), (39, 61, 3, 1), (63, 61, 4, 1), (78, 59, 3, 2),
              (88, 55, 4, 3), (52, 61, 2, 1)):
        boulder(c, *b)
    for tx, ty in CL_TREES:
        c.stamp(tx, ty, CONIFER)
    return c.image()


# =========================================================================== canyon view
# A long gorge seen from its south rim. Beyond it the far rim is grass with a few trees; the far
# wall faces us in stepped bands of cream, sand, wood and grey rock that sink into shadow toward a
# thin river; the near wall drops away out of sight under the lip, where a railing guards a paved
# lookout. At both ends the gorge trails off behind fallen rock, so it never closes in an oval.
CV_W, CV_H = 112, 64
CV_RIM = [(1, 19), (3, 15), (7, 12), (14, 11), (22, 9), (31, 11), (40, 10), (50, 12), (58, 10),
          (68, 9), (78, 11), (88, 10), (98, 11), (104, 13), (108, 15), (110, 19)]  # far rim top
CV_FAR = [(1, 21), (10, 20), (26, 19), (38, 20), (50, 19), (62, 20), (74, 19), (86, 20),
          (98, 20), (110, 21)]                                  # the far lip
CV_NEAR = [(1, 50), (12, 51), (30, 51), (56, 52), (80, 51), (98, 51), (110, 50)]   # near lip
CV_FOOT = [(1, 52), (4, 56), (9, 58), (16, 59), (26, 61), (40, 60), (58, 62), (74, 60),
           (88, 61), (98, 59), (104, 58), (107, 56), (110, 52)]  # bottom edge of the near rim
CV_BANDS = [   # (rows, (lit top, face, dark foot), cliff?) from the far lip down
    (3, 'CCS', True), (3, 'ssL', False), (4, 'CSs', True), (2, 'hhx', False), (4, 'HHh', True),
    (3, 'ssL', False), (4, 'SSs', True), (3, 'hxx', False), (4, 'CSs', True), (8, 'ssL', False),
]
CV_GULLIES = [21, 33, 47, 67, 81, 92]                           # columns cut by gullies
CV_BUTTRESSES = [   # rock the gorge runs behind at each end: (top x -> row, inner edge row -> x,
    # the side the inner edge faces, ramp)
    ([(1, 14), (3, 10), (5, 8), (7, 9), (9, 13), (11, 17)],
     [(9, 6), (13, 8), (18, 10), (26, 11), (34, 12), (42, 14), (53, 16)], 1, 'CSs'),
    ([(101, 32), (104, 28), (107, 27), (110, 29)],
     [(28, 104), (34, 102), (42, 101), (48, 99), (53, 98)], -1, 'SsL'),
]
CV_ROCKFALL = [(16, 48, 3, 2, 'CSs'), (20, 50, 2, 1, 'Hhx'), (94, 47, 3, 3, 'SsL'),
               (98, 43, 2, 2, 'CSs'), (89, 49, 2, 2, 'Hhx'), (102, 30, 2, 2, 'Hhx'),
               (91, 44, 2, 1, 'SsL')]                           # boulders at their feet
CV_TREES = [(17, 16, CONIFER), (27, 15, CONIFER), (60, 15, ROUND_TREE), (86, 16, CONIFER),
            (101, 17, CONIFER)]                                 # (trunk x, trunk foot row, tree)
CV_LOOKOUT = (58, 10)                    # centre x and half-width of the paved lookout
SHADE_STONE = {'H': 'h', 'h': 'x', 'x': 'x', 'n': 'n'}   # stops short of navy, which reads as water


def _shade(ch, steps=1):
    for _ in range(steps):
        ch = DARKER.get(ch) or SHADE_STONE[ch]
    return ch


def _canyon_wall(x, y, top, floor):
    """The banded far wall. Each band's top edge steps up or down a pixel every few columns,
    like eroded ledges; cliff bands are split by joints; the wall sinks into shadow toward the
    floor."""
    edge = top
    for k, (rows, ramp, cliff) in enumerate(CV_BANDS):
        start = edge + (_hash((x + 5 * k) // (4 + k % 3), k) % 3 - 1 if k else 0)
        edge += rows
        nxt = edge + _hash((x + 5 * (k + 1)) // (4 + (k + 1) % 3), k + 1) % 3 - 1
        if y < nxt or k == len(CV_BANDS) - 1:
            r = y - start
            ch = ramp[0] if r <= 0 else ramp[2] if r >= rows - 1 else ramp[1]
            if cliff and r > 0 and (x * 7 + k * 3) % 11 == 0:
                ch = ramp[2]                                    # a joint down the cliff
            break
    depth = (y - top) / max(1, floor - top)
    return _shade(ch, 3 if depth > 0.7 else 2 if depth > 0.45 else 1 if depth > 0.22 else 0)


def canyon_view():
    c = Canvas(CV_W, CV_H)
    rim = lambda x: profile(CV_RIM, x)
    far = lambda x: profile(CV_FAR, x) + (1 if (x // 5) % 3 == 1 else 0)   # notches in the lip
    near = lambda x: profile(CV_NEAR, x)
    foot = lambda x: _clamped(CV_FOOT, x)

    # the far rim: grass to the lip, shaded where it hangs over, tufts along its top
    for x in range(1, CV_W - 1):
        if _hash(x, 1) % 5 == 0:
            c.put(x, rim(x) - 1, 'G')
        for y in range(rim(x), far(x)):
            hv = _hash(x, y)
            ch = 'G' if y == rim(x) or hv % 11 == 0 else 'k' if hv % 13 == 0 else 'g'
            c.put(x, y, 'k' if y == far(x) - 1 else ch)
    for tx, ty, tree in CV_TREES:
        trunk = len(tree[-1]) - len(tree[-1].lstrip('.'))       # column of the trunk's foot
        c.stamp(tx - trunk, ty - len(tree) + 1, tree)
    for sx in (24, 46, 64, 86):
        c.stamp(sx, rim(sx + 2) + 1, SCRUB)

    # the far wall, then the floor in deep shade with a thin river glinting along it
    for x in range(1, CV_W - 1):
        top, lip = far(x), near(x)
        floor = lip - 6
        river = floor + 3 + round(1.2 * math.sin(x * 0.11 + 1))
        for y in range(top, lip):
            if y < floor:
                ch = _canyon_wall(x, y, top, floor)
            elif y == river:
                ch = 'A' if (x + 3) % 9 < 2 else 'a'
            else:
                ch = 'w' if abs(y - river) == 1 else 'd'
            c.put(x, y, ch)
    for gx in CV_GULLIES:                                       # gullies: shaded left, lit right
        for y in range(far(gx) + 2, near(gx) - 6):
            x = gx + round(math.sin(y * 0.45 + gx))
            c.put(x, y, _shade(c.get(x, y)))
            right = c.get(x + 1, y)
            c.put(x + 1, y, LIGHTER.get(right) or {'n': 'x', 'x': 'h', 'h': 'H'}.get(right, right))
    for x in range(1, CV_W - 1):
        if _hash(x, 2) % 4 == 0:
            c.put(x, far(x), 'g')                               # grass tufts over the lip

    # the near rim: a lit lip of bare rock, then grass down to a ragged foot
    for x in range(1, CV_W - 1):
        for y in range(near(x), foot(x) + 1):
            hv = _hash(x, y)
            if y == near(x):
                ch = 'C' if hv % 5 else 'S'
            elif y == near(x) + 1:
                ch = 's' if hv % 3 else 'k'
            else:
                ch = 'G' if hv % 11 == 0 else 'k' if hv % 13 == 0 or y == foot(x) else 'g'
            c.put(x, y, ch)
    for sx, sy in ((14, 54), (32, 56), (82, 56), (96, 55)):
        c.stamp(sx, sy, SCRUB)
    for b in ((24, 59, 2, 1), (90, 58, 2, 1)):
        boulder(c, *b, ramp='CSs')                              # stones breaking the rim's edge

    # at each end the gorge runs on behind a buttress of banded rock, so it never closes
    for top_pts, inner, facing, ramp in CV_BUTTRESSES:
        top = lambda x, t=top_pts: _clamped(t, x)
        edge = lambda y, e=inner: _clamped(e, y)
        y0, y1 = inner[0][0], inner[-1][0]
        if facing > 0:
            pts = [(x, y) for y in range(y0, y1 + 1) for x in range(1, edge(y) + 1) if y >= top(x)]
        else:
            pts = [(x, y) for y in range(y0, y1 + 1) for x in range(edge(y), CV_W - 1) if y >= top(x)]
        rockface(c, pts, ramp=ramp, crevice='L' if ramp == 'CSs' else 'w',
                 size=(8, 4, 4, 6, 1, 2), salt=71 + facing)
        area = set(pts)
        for x, y in pts:
            if (x, y - 1) not in area:
                c.put(x, y, 'C' if facing > 0 else 'S')         # lit crown
            elif facing > 0 and ((x + 1, y) not in area or (x + 2, y) not in area):
                c.put(x, y, 's' if (x + 1, y) in area else 'L')  # flank turned toward the gorge
            elif facing < 0 and (x - 1, y) not in area:
                c.put(x, y, 'S')                                # flank catching the light
    for cx, cy, rx, ry, ramp in CV_ROCKFALL:
        boulder(c, cx, cy, rx, ry, ramp=ramp)

    # the lookout: flagstones on the rim, a wooden railing along the lip
    lx, half = CV_LOOKOUT
    for x in range(lx - half, lx + half + 1):
        lip = near(x)
        depth = 7 - abs(x - lx) // 3
        for y in range(lip + 1, lip + depth):
            joint = (y - lip) % 3 == 0 or (x + 2 * ((y - lip) // 3)) % 5 == 0
            c.put(x, y, 'x' if y == lip + depth - 1 else 'h' if joint else 'H')
        c.put(x, lip - 4, 'C')                                  # top rail
        c.put(x, lip - 2, 'L')                                  # lower rail
        if (x - lx) % 5 == 0:
            for dy in range(0, 5):
                c.put(x, lip - dy, 'C' if dy == 4 else 'L')     # posts
            c.put(x + 1, lip - 1, 'w')
    return c.image()


# =========================================================================== glacier
# A tongue of ice flowing out of a snowy cirque under three uneven peaks, banded with ogives that
# bow downstream and split by a dark medial moraine, ending in a blue ice cliff over a meltwater
# lake with floes. Ice and snow use the ice ramp; the valley walls are shaded left, lit right.
GL_W, GL_H = 80, 80
GL_SKY = [(1, 52), (3, 40), (8, 24), (13, 12), (18, 3), (23, 10), (28, 14), (33, 12), (38, 7),
          (42, 6), (46, 9), (51, 13), (56, 12), (61, 9), (65, 11), (70, 18), (74, 28), (77, 40),
          (78, 50)]
GL_PEAKS = [18, 41, 61]
GL_LEFT = [(12, 32), (22, 29), (32, 25), (42, 21), (52, 18), (60, 17)]   # glacier edges, y -> x
GL_RIGHT = [(12, 46), (22, 50), (32, 55), (42, 59), (52, 61), (60, 62)]
GL_SNOUT = 60                          # first row of the ice cliff
GL_FLOES = [(28, 68, 2), (47, 70, 3), (36, 72, 1), (55, 67, 1)]


def glacier():
    c = Canvas(GL_W, GL_H)
    sky = lambda x: profile(GL_SKY, x)
    left = lambda y: _clamped(GL_LEFT, y)
    right = lambda y: _clamped(GL_RIGHT, y)

    # peaks and valley walls: rugged rock, snow on the heights
    walls = [(x, y) for x in range(1, GL_W - 1) for y in range(sky(x), 66)]
    rockface(c, walls, salt=51)
    for x, y in walls:
        ch = c.get(x, y)
        apex = min(GL_PEAKS, key=lambda p: abs(p - x))
        if y - sky(x) < 8 - _hash(x, 2) % 3 and y < 30:
            lit = x < apex
            c.put(x, y, ('W' if lit else '2') if y - sky(x) < 6 else ('1' if lit else '3'))
        elif x < 40 and y > 12:
            c.put(x, y, {'H': 'h', 'h': 'x', 'x': 'x'}[ch])      # the west wall, facing away
        elif x >= 40 and y > 12:
            c.put(x, y, {'H': 'H', 'h': 'H', 'x': 'h'}[ch])

    # the ice: ogives bowed downstream, crevasses at the margins, a medial moraine that bends
    for y in range(14, GL_SNOUT):
        x0, x1 = left(y), right(y)
        bend = round(1.5 * math.sin((y - 14) / 46 * math.pi))
        mid, half = (x0 + x1) / 2 + bend, (x1 - x0) / 2
        for x in range(x0, x1 + 1):
            u = max(-1.0, min(1.0, (x - mid) / half))
            bow = round(5 * (1 - u * u))
            ch = 'W' if u < -0.4 else '1' if u < 0.5 else '2'
            if (y - bow) % 7 == 0:
                ch = '2' if u < 0.5 else '3'                    # ogive band
            if abs(u) > 0.75 and (x + 2 * y) % 5 == 0:
                ch = '3'                                        # marginal crevasses
            if abs(x - (mid + 1)) < 1.2:
                ch = 'x' if (y // 2) % 3 else 'h'               # medial moraine
            if x - x0 < 2 or x1 - x < 2:
                ch = 'h' if x - x0 < 2 else 'x'                 # lateral moraines
            c.put(x, y, ch)
    for x in range(left(14), right(14) + 1):                    # the cirque's snowfield
        for y in range(sky(x), 14):
            c.put(x, y, 'W' if x < 40 else '1')

    # the snout: a blue ice cliff, streaked, over the meltwater lake
    for x in range(left(GL_SNOUT) + 1, right(GL_SNOUT)):
        for y in range(GL_SNOUT, GL_SNOUT + 7):
            k = (x * 5 + y // 3) % 7
            ch = '1' if y == GL_SNOUT else '3' if k < 2 else '4' if k == 2 else '2'
            if y == GL_SNOUT + 6:
                ch = '4'
            c.put(x, y, ch)
    for x, y in ellipse(40, 71, 25, 5):
        if y > GL_SNOUT + 6:
            c.put(x, y, 'A' if (x * 3 + y * 7) % 19 == 0 else 'a')
    for fx, fy, r in GL_FLOES:
        for x in range(fx - r, fx + r + 1):
            c.put(x, fy, 'W' if x < fx + r else '2')
            c.put(x, fy + 1, '2' if x < fx + r else '3')

    # moraine boulders and a little grass round the lake
    for b in ((8, 70, 5, 4), (71, 70, 5, 4), (16, 75, 4, 3), (63, 76, 4, 2), (4, 64, 3, 3),
              (76, 63, 3, 3), (30, 77, 3, 1), (50, 77, 3, 1)):
        boulder(c, *b)
    for fx, fy in ((22, 73), (55, 73), (1, 72), (74, 75), (40, 76)):
        c.stamp(fx, fy, FERN)
    return c.image()


# =========================================================================== great dune
# A great dune with a smaller one before it: a lit windward slope rippled by the wind, a sharp
# crest that bends as it falls, and a steep slip face in shade. Scrub at the foot; sand and wood
# tones only.
DN_W, DN_H = 80, 48
DN_DUNES = [   # (top profile x -> row, crest row -> column, foot row), back to front
    ([(8, 44), (13, 36), (19, 26), (25, 17), (31, 10), (36, 6), (41, 5), (46, 7), (52, 11),
      (58, 16), (64, 22), (70, 29), (75, 36), (78, 43)],
     [(5, 41), (9, 44), (13, 46), (17, 47), (21, 47), (25, 49), (29, 52), (33, 56), (37, 61),
      (41, 66), (45, 72)], 44),
    ([(1, 45), (4, 40), (8, 35), (12, 32), (16, 31), (20, 33), (24, 37), (28, 42), (31, 45)],
     [(31, 16), (34, 18), (38, 20), (42, 23), (46, 27)], 45),
]


def _dune(c, top_pts, crest_pts, foot):
    top = lambda x: profile(top_pts, x)
    crest = lambda y: _clamped(crest_pts, y)
    for x in range(top_pts[0][0], top_pts[-1][0] + 1):
        for y in range(top(x), foot + 1):
            k = crest(y) - x                                    # columns left of the crest
            if k > 0:                                           # windward slope, in the light
                ch = 'C' if k < 3 or y == top(x) else 'S'
                if (y + round(2.5 * math.sin(x * 0.3))) % 5 == 0 and k > 3 and y > top(x) + 1:
                    ch = 's' if (x // 4 + y) % 3 else 'S'       # wind ripples
            elif k > -3:
                ch = 'L'                                        # just under the crest: the darkest
            else:
                ch = 's' if (x + 2 * y) % 11 else 'L'           # the slip face, in shade
            c.put(x, y, 's' if y == foot and ch in 'CS' else ch)


def dune():
    c = Canvas(DN_W, DN_H)
    for top_pts, crest_pts, foot in DN_DUNES:
        _dune(c, top_pts, crest_pts, foot)
    for sx, sy in ((6, 39), (66, 38), (28, 40), (50, 39), (74, 42)):
        c.stamp(sx, sy, SCRUB)
    for b in ((16, 43, 2, 1), (58, 43, 2, 1)):
        boulder(c, *b, ramp='CSs')
    return c.image()


# =========================================================================== map icons
# Region (16 px) and Country (8 px) icons in map.py's manner: fills drawn by hand, then ringed.
# Each is a silhouette of its own: a cliff with a white stripe, a crown on a thick trunk, a grey
# arch in surf beside a stack, a sand arch beside a pinnacle, stepped pools under steam, a white
# plume, a dark mouth with crystals, a ring of peaks round blue water, a banded mesa split by a
# gorge, a white tongue between peaks, a pair of dunes. Arches open onto the ground below, so
# they never read as doors. Tall icons rise into the tile above, as map16_peak does.
ICON16 = {
    'waterfall': [
        'GGGGGAAggggggk',
        'kkkkkWWkkkkkkk',
        'HhhhhW1Ahhhhhx',
        'HhxhhW1Ahhxhhx',
        'HhhhhW1Ahhhhxx',
        'HxhhhW1Ahxhhhx',
        'HhhhhW1Ahhhhhx',
        'HhhxhW1Ahhhxxx',
        'HhhhW1WW1Ahhxx',
        'hhh1WWWWW1hxxx',
        'xh1aaAaaaa1hxx',
        'xxaaaaaAaaaaxx',
        '.xxaaaaaaaaxx.',
        '..HhHxxxHhHx..',
    ],
    'giant-tree': [
        '....GGGGg.....',
        '..GGGGGGggg...',
        '.GGGGGgggggk..',
        '.GGGGggggggkk.',
        'GGGkkkgggkkkGg',
        'GGGGGGkkkGGGgg',
        'GGGGgggggGGggk',
        'GGgggggggggggk',
        'Ggggggggggkgkk',
        'gggkggggggkkkk',
        '.gkkkgggkkkkt.',
        '..kkktttkkkt..',
        '....tLwwdt....',
        '....kLwwd.....',
        '.....Lwwd.....',
        '.....LwLd.....',
        '.....Lwwd.....',
        '....LLwwdd....',
        '...LLwwwwdd...',
        '..LLw.ww.ddd..',
    ],
    'sea-arch': [
        '..GGGGgk......',
        '.GGggggkk...Gk',
        'HHhhhhhhhx..Hx',
        'Hhhxxxxxhhx.Hx',
        'Hhx.....xhx.Hx',
        'Hhx.....Hhx.Hx',
        'Hhx.....Hhx.Hx',
        'Hhx.....Hhx.Hx',
        'thx.....thx.tx',
        'WWW.....WWW.WW',
    ],
    'stone-arch': [
        '..CCCCCC......',
        '.CSSSSSSCc....',
        'CSSssssssSc...',
        'SSssLLLLssS...',
        'CSsL....LsSs..',
        'SsL......LsL..',
        'CSs......sSL..',
        'SsL......LSL.C',
        'CSs......sSLCs',
        'SsL......LSLSs',
        'SSs......sSsSs',
        'sss......sssss',
    ],
    'hot-springs': [
        '.....W1.......',
        '......1W......',
        '.....W1.......',
        '...CCCCCCCc...',
        '..CAAAAcAAAc..',
        '.CcWcWcCcWcCc.',
        'CAAAAAAcA666Ac',
        'CcWcCcWcCcWcCc',
        'ccsscssccsscss',
    ],
    'geyser': [
        '...1WW1.......',
        '.1WWWWWW1.....',
        '1WWW11WWW1....',
        '.1W1WW1W12....',
        '..1.WW12.1....',
        '....WW1.......',
        '.1..WW1..1....',
        '....WW1.......',
        '....WW1.......',
        '.1..WW1.......',
        '....WW1..1....',
        '....WW1.......',
        '....WW1.......',
        '....1W12......',
        '...CCWW1CC....',
        '..CCC2222Cc...',
        '.CCCCccccCCc..',
        'cCCcccccccccc.',
    ],
    'crystal-cave': [
        '...G..........',
        '..GGGGggg.....',
        '.GGgggggggk...',
        'HHhhhhhhhhhx..',
        'Hhhhhhhhhhhxx.',
        'Hhhhxnnnxhhhx.',
        'Hhhxnnnnnxhhhx',
        'HhEnnnFnnnAhhx',
        'HEenFnEnFnAAhx',
        'EEeffnnfnAAaAx',
        'Eefffnnnnaaaax',
        'hhxxxxxxxxxxhx',
    ],
    'caldera-lake': [
        '..............',
        '...W.....W....',
        '..WW2...W12...',
        '.HW12h.HH12x..',
        'HHHhhhhhhhhhx.',
        'HhhNNNNNNNNhxx',
        'Hhaaaaaaaaaahx',
        'HhaaAaaaaAaahx',
        'Hhaaaaaaaaaahx',
        'GGgaaaaaaaaggk',
        'GGgggaaaagggkk',
        '.Gggggggggggk.',
        '..kkkkkkkkkk..',
    ],
    'canyon-view': [
        '.CCCC....CCCC.',
        'CCSSSC..CSSSsC',
        'SSSSSL..LSSSss',
        'sssssL..Lsssss',
        'LLLLsL..LsLLLL',
        'SSSSSw..wSSSss',
        'CSSSSdaadSSSss',
        'LLLLLLaaLLLLLL',
        'SSSSSSAaSSSSss',
        'ssssssssssssss',
        'wwwwwwwwwwwwww',
    ],
    'glacier': [
        '....W.....W...',
        '...WW2...W12..',
        '..HW12h.HH12x.',
        '.HHhhW11Whhxx.',
        'HHhh1WWW21hxxx',
        'Hhh1WWWx221hxx',
        'Hhh1WWWx221hxx',
        'Hh1WWWWx2221hx',
        'Hh1WWWWx2221xx',
        'hx3232332323xx',
        '.aaaaAaaaaAaa.',
        '..HhxaaaaaHhx.',
        '...HhHhhHhx...',
    ],
    'dune': [
        '...CL.........',
        '..CSCL....CL..',
        '.CSSSCL..CSCL.',
        'CSsSSSCLCSsSCL',
        'SSSsSSSCSSSsSC',
        'SsSSSSsSSSSSSL',
        'ssssssssssssss',
    ],
}
ICON8 = {
    'waterfall': [
        'GGAAgk',
        'HhW1hx',
        'HhW1hx',
        'h1WW1x',
        'xaaaax',
        '.HhHx.',
    ],
    'giant-tree': [
        '.GGgg.',
        'GGgggk',
        'Gggkgk',
        'gkkkkt',
        '.kLwt.',
        '..Lw..',
        '.LLwd.',
        'LL.wdd',
    ],
    'sea-arch': [
        '.GGgk.',
        'Hhhhhx',
        'Hx..hx',
        'Hx..hx',
        'tx..tx',
        'WW..WW',
    ],
    'stone-arch': [
        '.CCCC.',
        'CSssSs',
        'SLwwLs',
        'CL..Ls',
        'SL..Ls',
        'CL..Ls',
        'sL..Ls',
    ],
    'hot-springs': [
        '.W..W.',
        '.1W.1W',
        'CCCCCc',
        'CAA66c',
        'cAA66c',
        '.cccc.',
    ],
    'geyser': [
        '.1WW1.',
        '1W1WW1',
        '..W1..',
        '..W1..',
        '..W1..',
        '..W1..',
        '.CW1C.',
        'CCcccc',
    ],
    'crystal-cave': [
        '.GGgg.',
        'HHhhhx',
        'Hhnnhx',
        'Ennnnx',
        'EenAax',
        'hxxxxx',
    ],
    'caldera-lake': [
        '.W..W.',
        'HW2HW2',
        'Haaaax',
        'Haaaax',
        'Ggaagk',
        '.gggk.',
    ],
    'canyon-view': [
        'CC..CC',
        'SL..Ls',
        'LL..LL',
        'SSaaSs',
        'LLaaLL',
        'wwwwww',
    ],
    'glacier': [
        '.W..W.',
        'HW1W2x',
        'H1Wx1x',
        'h1Wx2x',
        'x3232x',
        '.aaaa.',
    ],
    'dune': [
        '.CL...',
        'CSCLCL',
        'SsSCSC',
        'SSSsSL',
        'ssssss',
    ],
}


def icon(rows, size, name):
    """Ring a hand-drawn fill; a short icon is padded on top to a full tile, so its base sits on
    the tile's bottom edge."""
    if any(len(r) != size - 2 for r in rows):
        raise ValueError(f'map{size}_wonder_{name}: rows must be {size - 2} wide')
    im = sk.add_outline(sk.pad(sk.from_ascii(rows, KEY)))
    if im.height < size:
        im = sk.pad(im, 0, size - im.height, 0, 0)
    if im.height > size * 3 // 2:
        raise ValueError(f'map{size}_wonder_{name} rises too far: {im.height} rows')
    return im


# =========================================================================== sheet
SET_PIECES = [   # (name, drawing, animation frames or 0 for a still, footprint in tiles)
    ('waterfall', waterfall, 3, [4, 3]),
    ('giant-tree', giant_tree, 0, [5, 3]),
    ('sea-arch', sea_arch, 2, [5, 3]),
    ('stone-arch', stone_arch, 0, [4, 2]),
    ('hot-springs', hot_springs, 2, [5, 3]),
    ('geyser', geyser, 4, [2, 1]),
    ('crystal-cave', crystal_cave, 2, [4, 2]),
    ('caldera-lake', caldera_lake, 0, [6, 3]),
    ('canyon-view', canyon_view, 0, [7, 4]),
    ('glacier', glacier, 0, [5, 3]),
    ('dune', dune, 0, [5, 2]),
]


def build():
    sheet = sk.Sheet('wonders')
    # set pieces anchor at the bottom centre of their footprint, which is the sprite's
    for name, draw, frames, footprint in SET_PIECES:
        if frames:
            for f in range(frames):
                sheet.add(f'wonder_{name}_{f}', draw(f), footprint=footprint)
        else:
            sheet.add(f'wonder_{name}', draw(), footprint=footprint)
    for size, icons in ((16, ICON16), (8, ICON8)):
        for name, rows in icons.items():
            sheet.add(f'map{size}_wonder_{name}', icon(rows, size, name), overlay=True)
    return sheet


if __name__ == '__main__':
    build().save()
