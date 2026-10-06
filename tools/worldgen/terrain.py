"""Country terrain: a keyed land template, noise relief, keyed mountain chains and a sea level
cut to a keyed land fraction, with the coast tidied so no confetti of tiny islands or ponds.

Integer arithmetic only, on flat per-cell lists, so a TypeScript port can match it exactly.
Land elevation runs 1..1000 above sea level; the ocean is 0 or below.
"""
from math import isqrt

from grid import dist2, neighbours, parts
from noise import fbm, value
from rng import ELEVATION, RIDGES, SHAPE, below, draw

TEMPLATES = ('continent', 'peninsula', 'coast', 'archipelago', 'twin-isles')
LAND_PERMILLE = {'continent': (440, 540), 'peninsula': (420, 560), 'coast': (450, 600),
                 'archipelago': (400, 460), 'twin-isles': (400, 500)}
ONE = 1 << 14
PLATEAU = ONE * 2 // 5
RAMP = ONE // 4
STRAIT = ONE
RELIEF = 5
SCALE = 520
GRAIN_RAW = 6 * ONE // SCALE
TOP = 1000
MIN_ISLAND = 10
MIN_POND = 4

# Sixteen compass bearings as integer vectors about 16 long, so lobes and chains need no trigonometry.
BEARINGS = ((16, 0), (15, 6), (11, 11), (6, 15), (0, 16), (-6, 15), (-11, 11), (-15, 6),
            (-16, 0), (-15, -6), (-11, -11), (-6, -15), (0, -16), (6, -15), (11, -11), (15, -6))
JOINTS = 3

# Sub-purposes: the template's inside SHAPE, the rest past the octave numbers noise.py uses
# (0x107 is drainage.FLAT, which shares the ELEVATION stream with GRAIN).
PICK, LAND, CENTRE, RADIUS, LOBE, SIDE, ISLAND = range(7)
CHAINS, CENTRE_AT, BEARING, LENGTH, TURN, WIDTH, LIFT = range(0x100, 0x107)
WIGGLE, GRAIN = 0x108, 0x109


def _blob(width, height, cx, cy, rx, ry):
    return [ONE - (x - cx) * (x - cx) * ONE // (rx * rx) - (y - cy) * (y - cy) * ONE // (ry * ry)
            for y in range(height) for x in range(width)]


def _continent(seed, width, height, land):
    """One body with two lobes on keyed bearings and a bay bitten out of its rim."""
    def k(n, *key):
        return below(n, seed, SHAPE, *key)

    def around(j, reach, size):
        bx, by = BEARINGS[k(16, LOBE, j)]
        return _blob(width, height, cx + bx * rx * reach // 1600, cy + by * ry * reach // 1600,
                     max(2, rx * size // 100), max(2, ry * size // 100))
    cx = width // 2 + k(width // 5 + 1, CENTRE, 0) - width // 10
    cy = height // 2 + k(height // 5 + 1, CENTRE, 1) - height // 10
    rx = width * (30 + k(8, RADIUS, 0)) // 100
    ry = height * (30 + k(8, RADIUS, 1)) // 100
    out = _blob(width, height, cx, cy, rx, ry)
    for j in (0, 1):
        out = [max(a, b) for a, b in zip(out, around(j, 55 + k(30, LOBE, j, 0), 40 + k(25, LOBE, j, 1)))]
    bay = around(2, 95 + k(20, LOBE, 2, 0), 22 + k(18, LOBE, 2, 1))
    return [a - 2 * max(0, b) for a, b in zip(out, bay)]


def _peninsula(seed, width, height, land):
    def k(n, *key):
        return below(n, seed, SHAPE, *key)
    root = k(4, SIDE)
    along, across = (height, width) if root in (0, 2) else (width, height)
    length = along * (68 + k(18, RADIUS, 0)) // 100
    base = across * (28 + k(10, RADIUS, 1)) // 100
    tip = max(3, base * (30 + k(20, RADIUS, 2)) // 100)
    mid = across // 2 + k(across // 4 + 1, CENTRE, 0) - across // 8
    slant = k(across // 3 + 1, CENTRE, 1) - across // 6
    out = []
    for y in range(height):
        for x in range(width):
            a, c = ((y, x), (width - 1 - x, y), (height - 1 - y, x), (x, y))[root]
            t = min(a, length)
            half = base - (base - tip) * t // length
            off = c - mid - slant * t // length
            over = max(0, a - length)
            out.append(ONE - off * off * ONE // (half * half) - over * over * ONE // (tip * tip))
    return out


def _coast(seed, width, height, land):
    mode, first = below(3, seed, SHAPE, SIDE, 0), below(4, seed, SHAPE, SIDE, 1)
    seas = (first,) if mode == 0 else (first, (first + 1 + mode % 2) % 4)
    out = []
    for y in range(height):
        for x in range(width):
            f = 3 * ONE
            for s in seas:
                inland = (y, width - 1 - x, height - 1 - y, x)[s]
                span = height if s in (0, 2) else width
                f = min(f, (inland * 2 - span) * ONE // span)
            out.append(f)
    return out


def _islands(width, height, spots):
    """The highest island blob at each cell, cut down along the line where two blobs meet so
    neighbouring islands keep a strait between them."""
    first = [-4 * ONE] * (width * height)
    second = list(first)
    for cx, cy, rx, ry in spots:
        for i, f in enumerate(_blob(width, height, cx, cy, rx, ry)):
            if f > first[i]:
                first[i], second[i] = f, first[i]
            elif f > second[i]:
                second[i] = f
    return [a - max(0, STRAIT - (a - b)) for a, b in zip(first, second)]


def _archipelago(seed, width, height, land):
    def k(n, *key):
        return below(n, seed, SHAPE, *key)
    count = 3 + k(4, ISLAND)
    area = width * height * land * 5 // 4000 // count
    spots = []
    for j in range(count):
        r = isqrt(area * 113 // 355) * (85 + k(31, RADIUS, j)) // 100
        rx = max(3, r * (85 + k(31, LOBE, j)) // 100)
        ry = max(3, min(height // 2 - 3, r * r // rx))
        best, best_gap = None, None
        for t in range(16):
            x = rx + 2 + k(max(1, width - 2 * rx - 4), ISLAND, j, t, 0)
            y = ry + 2 + k(max(1, height - 2 * ry - 4), ISLAND, j, t, 1)
            gap = min((isqrt(dist2(x, y, sx, sy)) - (rx + ry + sr + sq) // 2
                       for sx, sy, sr, sq in spots), default=0)
            if best_gap is None or gap > best_gap:
                best, best_gap = (x, y, rx, ry), gap
        spots.append(best)
    return _islands(width, height, spots)


def _twin_isles(seed, width, height, land):
    def k(n, *key):
        return below(n, seed, SHAPE, *key)
    r = isqrt(width * height * land * 5 // 8000 * 113 // 355)
    big = 90 + k(21, RADIUS)
    layout = k(3, CENTRE)
    ends = (((26, 50), (74, 50)), ((28, 36), (72, 64)), ((28, 64), (72, 36)))[layout]
    spots = []
    for j, ((px, py), size) in enumerate(zip(ends, (big, 200 - big))):
        rr = r * size // 100
        x = width * px // 100 + k(7, CENTRE, j, 0) - 3
        y = height * py // 100 + k(7, CENTRE, j, 1) - 3
        spots.append((x, y, rr * 6 // 5, min(height // 2 - 3, rr * 5 // 6)))
    return _islands(width, height, spots)


SHAPES = {'continent': _continent, 'peninsula': _peninsula, 'coast': _coast,
          'archipelago': _archipelago, 'twin-isles': _twin_isles}


def _edges(seed, width, height, template):
    """Coast wiggle from one octave of value noise, and sea along the map edges a template
    keeps clear: all of them for islands, all but the root for a peninsula."""
    root = below(4, seed, SHAPE, SIDE) if template == 'peninsula' else -1
    out = []
    for y in range(height):
        for x in range(width):
            wiggle = (value(seed, SHAPE, x, y, 7, WIGGLE) - 32768) * ONE * 3 // 32768 // 8
            if template == 'coast':
                out.append(wiggle)
                continue
            reach = min(d for s, d in enumerate((y, width - 1 - x, height - 1 - y, x)) if s != root)
            out.append(wiggle + min(0, (reach - 4) * ONE // 2))
    return out


def _chain(seed, j, cx, cy):
    """A bent polyline in 1/16 cells, walked both ways from an inland centre."""
    bearing = below(16, seed, RIDGES, BEARING, j)
    step = (16 + below(26, seed, RIDGES, LENGTH, j)) * 16 // (2 * JOINTS)
    centre = (cx * 16 + 8, cy * 16 + 8)
    halves = []
    for half in (0, 1):
        b, (x, y), points = (bearing + 8 * half) % 16, centre, []
        for k in range(JOINTS):
            b = (b + below(3, seed, RIDGES, TURN, j, half, k) - 1) % 16
            x, y = x + BEARINGS[b][0] * step // 16, y + BEARINGS[b][1] * step // 16
            points.append((x, y))
        halves.append(points)
    return halves[1][::-1] + [centre] + halves[0]


def _near_chain(points, px, py):
    """(squared distance in 1/256 cells, position along the chain 0..ONE)."""
    best = None
    last = len(points) - 1
    for k, ((ax, ay), (bx, by)) in enumerate(zip(points, points[1:])):
        ux, uy, wx, wy = bx - ax, by - ay, px - ax, py - ay
        den = ux * ux + uy * uy
        dot = wx * ux + wy * uy
        if dot <= 0:
            d2, t = wx * wx + wy * wy, 0
        elif dot >= den:
            d2, t = dist2(px, py, bx, by), ONE
        else:
            cross = wx * uy - wy * ux
            d2, t = cross * cross // den, dot * ONE // den
        if best is None or d2 < best[0]:
            best = (d2, (k * ONE + t) // last)
    return best


def _chains(seed, width, height, falloff):
    """Mountain chains: 1-3 keyed ranges with a tent-shaped cross-section, tapered at both ends
    and broken into peaks and passes by noise. Open lines, so they never ring a basin."""
    centres, ranges = [], []
    for j in range(1 + below(3, seed, RIDGES, CHAINS)):
        best, best_score = 0, None
        for t in range(16):
            i = below(width * height, seed, RIDGES, CENTRE_AT, j, t)
            x, y = i % width, i // width
            room = min((isqrt(dist2(x, y, cx, cy)) for cx, cy in centres), default=24)
            inset = min(x, y, width - 1 - x, height - 1 - y, 12)
            score = min(falloff[i], ONE) + min(room, 24) * ONE // 24 + inset * ONE // 12
            if best_score is None or score > best_score:
                best, best_score = i, score
        centres.append((best % width, best // width))
        reach = (3 + below(4, seed, RIDGES, WIDTH, j)) * 16
        lift = (85 + below(51, seed, RIDGES, LIFT, j)) * ONE // 100
        ranges.append((_chain(seed, j, *centres[-1]), reach, lift))
    out = [0] * (width * height)
    for y in range(height):
        for x in range(width):
            i = y * width + x
            land = min(ONE, max(0, (falloff[i] + ONE // 4) * 2))
            if not land:
                continue
            h = 0
            for points, reach, lift in ranges:
                d2, s = _near_chain(points, x * 16 + 8, y * 16 + 8)
                d = isqrt(d2)
                if d < reach:
                    taper = min(ONE, 8 * s * (ONE - s) // ONE)
                    h = max(h, lift * (reach - d) // reach * taper // ONE)
            if h:
                crest = ONE * 4 // 5 + (fbm(seed, RIDGES, x, y, 8, 3) - 32768) * 4 // 3
                out[i] = h * min(ONE, max(ONE * 9 // 20, crest)) // ONE * land // ONE
    return out


def _smooth(land, nbrs):
    out = bytearray(land)
    for i, own in enumerate(land):
        count = sum(land[m] for m in nbrs[i]) + (8 - len(nbrs[i])) * own
        if count >= 5:
            out[i] = 1
        elif count <= 3:
            out[i] = 0
    return out


def _tidy(land, width, height):
    """No confetti: majority-smooth the coast, sink tiny islands and fill tiny enclosed ponds."""
    nbrs8 = neighbours(width, height)
    land = _smooth(_smooth(land, nbrs8), nbrs8)
    label, sizes = parts(neighbours(width, height, False), land)
    land = bytearray(1 if land[i] and sizes[label[i]] >= MIN_ISLAND else 0 for i in range(len(land)))
    water = bytearray(1 - v for v in land)
    label, sizes = parts(nbrs8, water)
    edge = set(label[i] for i in _border(width, height) if water[i])
    return bytearray(1 if land[i] or (label[i] not in edge and sizes[label[i]] < MIN_POND) else 0
                     for i in range(len(land)))


def _border(width, height):
    return [y * width + x for y in range(height) for x in range(width)
            if x in (0, width - 1) or y in (0, height - 1)]


def shape(seed, width, height):
    """Returns (template, elevation, ocean) with every world part land and part sea."""
    template = TEMPLATES[below(len(TEMPLATES), seed, SHAPE, PICK)]
    lo, hi = LAND_PERMILLE[template]
    land_target = lo + below(hi - lo + 1, seed, SHAPE, LAND)
    n = width * height
    falloff = [max(-4 * ONE, min(3 * ONE, f + e)) for f, e in
               zip(SHAPES[template](seed, width, height, land_target), _edges(seed, width, height, template))]
    relief = [(fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * RELIEF // 16 for y in range(height) for x in range(width)]
    coast = sorted(f + r for f, r in zip(falloff, relief))[n - n * land_target // 1000]
    rise = [f - coast for f in falloff]
    chains = _chains(seed, width, height, rise)
    # A short ramp up from the coast, then only a gentle rise, so inland relief comes from noise
    # and chains (valleys for rivers to follow) while the land still drains towards the sea. A
    # keyed grain per cell keeps steepest descent from running dead straight down smooth slopes.
    raw = [PLATEAU * min(u, RAMP) // RAMP + max(0, u - RAMP) // 16 + r + c if u > 0 else u + r + c
           for u, r, c in zip(rise, relief, chains)]
    raw = [v + draw(seed, ELEVATION, GRAIN, i) % (2 * GRAIN_RAW + 1) - GRAIN_RAW for i, v in enumerate(raw)]
    sea = sorted(raw)[n - n * land_target // 1000]
    land = _tidy(bytearray(1 if v > sea else 0 for v in raw), width, height)
    elevation = [min(TOP, max(1, 1 + (v - sea) * SCALE // ONE)) if land[i]
                 else max(-TOP, min(0, (v - sea) * SCALE // ONE)) for i, v in enumerate(raw)]
    water = bytearray(1 - v for v in land)
    label, _ = parts(neighbours(width, height), water)
    edge = set(label[i] for i in _border(width, height) if water[i])
    ocean = bytearray(1 if water[i] and label[i] in edge else 0 for i in range(n))
    return template, elevation, ocean
