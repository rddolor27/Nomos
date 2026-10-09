"""Country climate and biomes: rain carried on a keyed prevailing wind, which loses moisture
crossing high ground and regains it over water; temperature from a keyed cold edge and height;
moisture; then biomes and coast types. Climate values are integers 0..255.
"""
from grid import ORTHO, SIDES, distances, neighbours
from model import BIOMES
from noise import fbm, value
from rng import MOISTURE, TEMPERATURE, below

OCEAN, LAKE, GRASSLAND, FARMLAND, DECIDUOUS, CONIFER, MARSH, SAND, HILLS, MOUNTAIN, PEAK, SNOW = (
    BIOMES.index(b) for b in ('ocean', 'lake', 'grassland', 'farmland', 'forest-deciduous', 'forest-conifer',
                              'marsh', 'sand', 'hills', 'mountain', 'peak', 'snow'))
INLAND, BEACH, CLIFFS = range(3)
COASTS = ('', 'beach', 'cliffs')

HILLS_AT, MOUNTAIN_AT, PEAK_AT = 380, 500, 700
# Round 9's threshold for cold lowland: high cold ground stays hills, mountain or peak.
SNOW_BELOW = 40
CLIFF_AT, BEACH_BELOW, MARSH_BELOW = 100, 70, 140
WIND, WET, EDGE, COLD, SPAN, BEACHES = range(0x100, 0x106)


def rain(seed, width, height, elevation, water):
    """Humidity of air blown across the map from the keyed side. Returns (rain, wind side)."""
    side = below(4, seed, MOISTURE, WIND)
    ux, uy = ORTHO[side]
    lx, ly = -uy, ux
    incoming = 170 + below(80, seed, MOISTURE, WET)
    n = width * height
    carry, out = [0] * n, [0] * n
    for i in sorted(range(n), key=lambda i: (i % width * ux + i // width * uy, i), reverse=True):
        x, y = i % width, i // width
        px, py = x + ux, y + uy
        if 0 <= px < width and 0 <= py < height:
            up = py * width + px
            mid = carry[up]
            side_a = carry[up + ly * width + lx] if 0 <= px + lx < width and 0 <= py + ly < height else mid
            side_b = carry[up - ly * width - lx] if 0 <= px - lx < width and 0 <= py - ly < height else mid
            humid = (side_a + 2 * mid + side_b) // 4
            rise = max(0, elevation[i] - max(0, elevation[up]))
        else:
            humid, rise = incoming, 0
        if water[i]:
            carry[i] = humid + (255 - humid) // 3
            out[i] = humid
        else:
            loss = min(humid * 3 // 10, humid // 64 + rise * humid // 400)
            carry[i] = max(0, humid - loss)
            out[i] = min(255, humid * 7 // 8 + loss * 2)
    return out, SIDES[side]


def temperature(seed, width, height, elevation):
    """Warm to cold towards a keyed edge, colder with height. Returns (temperature, cold side)."""
    cold_side = 's' if below(2, seed, TEMPERATURE, EDGE) else 'n'
    cold = 40 + below(60, seed, TEMPERATURE, COLD)
    warm = min(250, cold + 90 + below(60, seed, TEMPERATURE, SPAN))
    out = bytearray(width * height)
    for y in range(height):
        reach = (height - 1 - y) if cold_side == 's' else y
        base = cold + (warm - cold) * reach // (height - 1)
        for x in range(width):
            i = y * width + x
            t = base - max(0, elevation[i]) * 110 // 1000 + (fbm(seed, TEMPERATURE, x, y, 32, 2) - 32768) // 1024
            out[i] = max(0, min(255, t))
    return out, cold_side


def moisture(seed, width, height, rain, water, river):
    nbrs = neighbours(width, height)
    near = distances(nbrs, [i for i in range(width * height) if water[i] or river[i]], limit=4)
    out = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            i = y * width + x
            m = rain[i] * 7 // 8 + (fbm(seed, MOISTURE, x, y, 16, 3) - 32768) // 150 + (4 - near[i]) * 12
            out[i] = max(0, min(255, m))
    return out


def coasts(width, height, elevation, ocean):
    """Beach or cliffs for each land cell beside the ocean: cliffs where high ground meets it."""
    nbrs = neighbours(width, height)
    return bytearray(INLAND if ocean[i] or not any(ocean[m] for m in nbrs[i])
                     else CLIFFS if elevation[i] >= CLIFF_AT else BEACH
                     for i in range(width * height))


def slopes(width, height, elevation, water):
    nbrs = neighbours(width, height)
    return [0 if water[i] else max(abs(elevation[i] - max(0, elevation[m])) for m in nbrs[i])
            for i in range(width * height)]


def _sandy(seed, width, i, ocean, nbrs4):
    """Low warm shores take sand in long stretches, not as a ring round every coast."""
    return any(ocean[j] for j in nbrs4[i]) and value(seed, MOISTURE, i % width, i // width, 10, BEACHES) >= 30000


def _crest(elevation, nbrs, i):
    """Higher than its neighbours on average: a summit or ridge line, not a flank or a plateau."""
    return len(nbrs[i]) * elevation[i] - sum(elevation[m] for m in nbrs[i]) >= 15 * len(nbrs[i])


def biomes(seed, width, height, elevation, temperature, moisture, ocean, lake, river, coast):
    nbrs4 = neighbours(width, height, False)
    nbrs8 = neighbours(width, height)
    fresh = distances(nbrs8, [i for i in range(width * height) if lake[i] or river[i]], limit=4)
    out = bytearray(width * height)
    for i, e in enumerate(elevation):
        t, m = temperature[i], moisture[i]
        if ocean[i]:
            b = OCEAN
        elif lake[i]:
            b = LAKE
        elif (e >= PEAK_AT or (e >= MOUNTAIN_AT and t < 30)) and _crest(elevation, nbrs8, i):
            b = PEAK
        elif e >= MOUNTAIN_AT:
            b = MOUNTAIN
        elif e >= HILLS_AT:
            b = HILLS
        elif t < SNOW_BELOW:
            b = SNOW
        elif t >= 165 and m < 85:
            b = SAND
        elif coast[i] == BEACH and e < BEACH_BELOW and t >= 70 and _sandy(seed, width, i, ocean, nbrs4):
            b = SAND
        elif e < MARSH_BELOW and m >= 185 and fresh[i] <= 1:
            b = MARSH
        elif m >= 130 and (t < 90 or e >= 280):
            b = CONIFER
        elif m >= 140:
            b = DECIDUOUS
        else:
            b = GRASSLAND
        out[i] = b
    return _despeckle(out, nbrs8)


def _despeckle(biome, nbrs):
    """A lone cell of a lowland cover takes its neighbours' most common cover."""
    soft = (GRASSLAND, DECIDUOUS, CONIFER, MARSH, SAND, SNOW)
    out = bytearray(biome)
    for i, b in enumerate(biome):
        if b in soft and not any(biome[m] == b for m in nbrs[i]):
            counts = [sum(1 for m in nbrs[i] if biome[m] == s) for s in soft]
            if max(counts):
                out[i] = soft[counts.index(max(counts))]
    return out
