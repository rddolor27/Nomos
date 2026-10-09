"""Seasons: snow on the ground, bare and snowy trees, HUD season icons, and the season map.

The calendar (docs/plan/calendar.md) gives every year four 28-day seasons. Nothing is redrawn per
season. Instead assets/sprites/season_map.json tells the renderer, for each season:
- which palette swap to lay on vegetation: spring green, summer green, autumn gold (olive on the
  ground, so roads keep their contrast, and the autumn tree's gold on foliage), winter pale;
- which sprites stand in for others, such as bare trees in winter and blossom only in spring;
- in winter, which snow tiles to lay over the ground on each day, which trees carry snow, and
  that every sprite with a `snow` overlay draws it.

Snow tiles are unoutlined overlays that keep every detail inside the tile, so they mix in any
order. Full and patchy snow cover the tile edge to edge (patchy melts holes inside it); light
snow is scattered clumps on transparency, and roads only ever get light snow, so the street plan
stays readable. The season icons are one tree through the year, so none can be mistaken for a
culture emblem (leaf, sunburst, flower, mountain and the rest).

Build: python tools/sprites/seasons.py
"""
import json
from pathlib import Path

import nature
from spritekit import ASSETS, TILE, Sheet, add_outline, cmap, from_ascii, pad

SYM = cmap(
    O='OUTLINE', W='WHITE', I='ICE_L', i='ICE',
    L='WOOD_L', w='WOOD', d='WOOD_D',
    G='GRASS_L', g='GRASS', k='LEAF_D', t='TEAL_D',
    E='SPRING_L', e='SPRING', f='SPRING_D',
    A='GOLD', a='SAND_D', b='WOOD_L',        # autumn foliage, as on tree_autumn
    P='PINK',
)
SEASONS = ('spring', 'summer', 'autumn', 'winter')
COVERS = ('light', 'full', 'patchy')
VARIANTS = 2


def _hash(x, y, seed):
    return ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) & 0xFFFF


# ------------------------------------------------------------------ snow on the ground
def drifts(seed):
    """Edge-to-edge snow with soft ripples and a few ice specks, all inside the tile."""
    g = [['W'] * TILE for _ in range(TILE)]
    for y in range(1, TILE - 1):
        for x in range(1, TILE - 4):
            v = _hash(x, y, seed)
            if v % 19 == 0:
                for dx in range(3):
                    g[y][x + dx] = 'I'
            elif v % 53 == 1:
                g[y][x] = 'i'
    return g


def melt(g, seed, holes, size):
    """Melt holes inside the tile; the snow wall on each hole's far side is shaded."""
    for n in range(holes):
        v = _hash(n, holes, seed)
        cx, cy = 3 + v % (TILE - 6), 3 + (v >> 5) % (TILE - 6)
        rx, ry = size + (v >> 9) % 2, max(1, size - 1)
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                if 1 <= x < TILE - 1 and 1 <= y < TILE - 1 and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    g[y][x] = '.'
    for y in range(1, TILE):
        for x in range(TILE):
            if g[y][x] == '.' and g[y - 1][x] != '.':
                g[y - 1][x] = 'I'
    return g


def clumps(seed, count=7):
    """Scattered clumps of fresh snow on transparency, each with a shaded underside."""
    g = [['.'] * TILE for _ in range(TILE)]
    for n in range(count):
        v = _hash(n, count, seed)
        x, y, w = 1 + v % (TILE - 5), 1 + (v >> 4) % (TILE - 3), 2 + (v >> 8) % 2
        for dx in range(w):
            g[y][x + dx] = 'W'
            g[y + 1][x + dx] = 'I'
        g[y + 1][x] = 'W'
    return g


def snow_tile(cover, seed):
    if cover == 'full':
        g = drifts(seed)
    elif cover == 'patchy':
        g = melt(drifts(seed), seed, holes=3, size=2)
    else:
        g = clumps(seed)
    return from_ascii([''.join(r) for r in g], SYM)


# ------------------------------------------------------------------ trees
def limbs(w, h, parts):
    """Draw wooden limbs lit from the left. Each part is (x0, y0, x1, y1, width at start, at tip)."""
    filled = [[False] * w for _ in range(h)]
    for x0, y0, x1, y1, w0, w1 in parts:
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            t = i / n
            width = max(1, round(w0 + (w1 - w0) * t))
            x, y = round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)
            for dx in range(width):
                if 0 <= x - width // 2 + dx < w and 0 <= y < h:
                    filled[y][x - width // 2 + dx] = True
    rows = []
    for y in range(h):
        row = ''
        for x in range(w):
            left = x > 0 and filled[y][x - 1]
            right = x < w - 1 and filled[y][x + 1]
            row += '.' if not filled[y][x] else 'L' if right and not left else 'd' if left and not right else 'w'
        rows.append(row)
    return rows


# Fill grids the size of the leafy trees they stand in for (outlining adds 2 px each way).
BARE_MATURE = (30, 30, [
    (15, 29, 15, 18, 6, 4),                                  # trunk
    (13, 29, 10, 29, 2, 1), (17, 29, 20, 29, 2, 1),          # root flare
    (14, 20, 6, 9, 3, 1), (16, 20, 24, 8, 3, 1), (15, 18, 15, 2, 3, 1),
    (10, 14, 3, 10, 2, 1), (9, 13, 8, 3, 2, 1), (20, 14, 27, 11, 2, 1), (21, 12, 21, 3, 2, 1),
    (15, 10, 11, 3, 1, 1), (15, 9, 19, 2, 1, 1),
    (6, 9, 4, 4, 1, 1), (24, 8, 26, 3, 1, 1), (3, 10, 1, 7, 1, 1), (27, 11, 29, 8, 1, 1),
    (8, 3, 6, 0, 1, 1), (21, 3, 23, 0, 1, 1), (15, 2, 14, 0, 1, 1),
])
BARE_YOUNG = (18, 19, [
    (9, 18, 9, 11, 3, 2),
    (8, 18, 6, 18, 1, 1), (10, 18, 12, 18, 1, 1),
    (9, 12, 3, 5, 2, 1), (9, 12, 15, 4, 2, 1), (9, 11, 9, 1, 2, 1),
    (5, 8, 2, 6, 1, 1), (13, 8, 16, 6, 1, 1), (9, 6, 6, 2, 1, 1), (9, 5, 12, 1, 1, 1),
])
BARE_FRUIT = (30, 26, [
    (15, 25, 15, 17, 4, 3),
    (14, 25, 11, 25, 1, 1), (16, 25, 19, 25, 1, 1),
    (14, 18, 4, 9, 3, 1), (16, 18, 26, 9, 3, 1), (15, 17, 12, 3, 2, 1), (15, 17, 18, 3, 2, 1),
    (8, 13, 2, 10, 1, 1), (22, 13, 28, 10, 1, 1), (11, 11, 7, 5, 1, 1), (19, 11, 23, 5, 1, 1),
    (6, 11, 5, 6, 1, 1), (24, 11, 25, 6, 1, 1),
])


def bare(spec):
    w, h, parts = spec
    return add_outline(pad(from_ascii(limbs(w, h, parts), SYM)))


def snowy_conifer():
    """The conifer with a two-row cap of snow on every needle open to the sky, and lit slopes."""
    rows = nature.TREE_CONIFER
    out = []
    for y, row in enumerate(rows):
        line = ''
        for x, ch in enumerate(row):
            above = rows[y - 1][x] if y else '.'
            higher = rows[y - 2][x] if y > 1 else '.'
            if ch in 'Ggkt' and (above == '.' or ch == 'G'):
                ch = 'W'
            elif ch in 'Ggkt' and higher == '.':
                ch = 'I'
            line += ch
        out.append(line)
    return add_outline(pad(from_ascii(out, SYM)))


# ------------------------------------------------------------------ season icons
TRUNK_16 = ['......Lwd.....', '......Lwd.....', '......Lwd.....', '.....LLwdd....']
ICON16 = {
    'spring': [
        '....EEEee.....',
        '..EEPEEeePe...',
        '.EEEEeeeeeeef.',
        '.EPeeeePeeeef.',
        'EEeeeeeeeePeff',
        'EeePeeeeeeefff',
        'eeeeeePeeeefff',
        '.eePeeeeefPff.',
        '.feeeeeffffff.',
        '..ffffffffff..',
    ] + TRUNK_16,
    'summer': [
        '....GGGgg.....',
        '..GGGGGgggg...',
        '.GGGGgggggggk.',
        '.GGgggggggggk.',
        'GGggggggggggkk',
        'Gggggggggggkkk',
        'gggggggggggkkk',
        '.ggggggggkkkk.',
        '.kgggggkkkkkk.',
        '..kkkkkkkkkk..',
    ] + TRUNK_16,
    'autumn': [
        '....AAAaa.....',
        '..AAAAAaaab...',
        '.AAAAaaaaaab..',
        '.AAaaaaaaaabb.',
        'AAaaaaaaaaabbb',
        'Aaaaaaaaaabbbb',
        '.aaaaaaaabbbb.',
        '.baaaaabbbbbb.',
        '..bbbabbbbbb..',
        '....bbbbbb....',
        'Aa....Lwd.....',
        '......Lwd.....',
        '......Lwd..aA.',
        '.....LLwdd....',
    ],
    'winter': [
        '..W...WW...W..',
        '..w...wd...d..',
        'W..w..wd..d..W',
        'w..ww.wd.dd..d',
        '.w..wwwddd..d.',
        '..ww.wwdd..d..',
        '....wwwddd....',
        '......wd......',
        '......wd......',
        '......wd......',
        '......wd......',
        '......wd......',
        '.IWWWWwdWWWWI.',
        'IWWWWWWWWWWWWI',
    ],
}
ICON8 = {
    'spring': ['.EPee.', 'EEePef', 'ePeeff', '.ffff.', '..wd..', '..wd..'],
    'summer': ['.GGgg.', 'GGgggk', 'Ggggkk', '.kkkk.', '..wd..', '..wd..'],
    'autumn': ['.AA.a.', 'AAaaab', '.aab.b', '..bb..', '..wd..', '..wd..'],
    'winter': ['W.WW.W', 'w.wd.d', '.wwdd.', '..wd..', '..wd..', 'IWWWWI'],
}


def icon(rows, size, name):
    if len(rows) != size - 2 or any(len(r) != size - 2 for r in rows):
        raise ValueError(f'season_{name}_{size}: rows must be {size - 2}x{size - 2}')
    return add_outline(pad(from_ascii(rows, SYM)))


# ------------------------------------------------------------------ the season map
RECOLOUR = {
    'ground': ['nature/terrain_grass_*', 'scenery/terrain_meadow_*', 'nature/crop_pasture',
               'scenery/shore_*', 'scenery/cliff_*', 'nature/terrain_farm-track_*'],
    'foliage': ['nature/tree_deciduous_*', 'nature/tree_fruit', 'nature/prop_bush'],
}
SPRING = {'GRASS_L': 'SPRING_L', 'GRASS': 'SPRING', 'LEAF_D': 'SPRING_D'}
WINTER = {'GRASS_L': 'WINTER_L', 'GRASS': 'WINTER', 'LEAF_D': 'WINTER_D'}
PALETTES = {
    'spring': {'ground': SPRING, 'foliage': SPRING},
    'summer': {},
    'autumn': {'ground': {'GRASS_L': 'AUTUMN_L', 'GRASS': 'AUTUMN', 'LEAF_D': 'AUTUMN_D'},
               'foliage': {'GRASS_L': 'GOLD', 'GRASS': 'SAND_D', 'LEAF_D': 'WOOD_L'}},
    'winter': {'ground': WINTER, 'foliage': WINTER},
}
BARE_TREE = 'seasons/tree_deciduous_mature_bare'
SWAPS = {     # worldgen plants blossom and autumn trees as species; they show their colour in season only
    'spring': {'scenery/tree_autumn': 'nature/tree_deciduous_mature'},
    'summer': {'scenery/tree_blossom': 'nature/tree_deciduous_mature',
               'scenery/tree_autumn': 'nature/tree_deciduous_mature'},
    'autumn': {'scenery/tree_blossom': 'scenery/tree_autumn'},
    'winter': {'nature/tree_deciduous_mature': BARE_TREE, 'scenery/tree_blossom': BARE_TREE,
               'scenery/tree_autumn': BARE_TREE,
               'nature/tree_deciduous_young': 'seasons/tree_deciduous_young_bare',
               'nature/tree_fruit': 'seasons/tree_fruit_bare'},
}


def season_map():
    return {
        'seasons': list(SEASONS),
        'days': 28,
        'recolour': RECOLOUR,
        'palette': PALETTES,
        'sprites': SWAPS,
        'snow': {
            'max_temperature': 140,           # worldgen's 0-255 scale; warmer places never get snow
            'schedule': [[1, 6, 'light'], [7, 22, 'full'], [23, 28, 'patchy']],
            'ground': {c: [f'seasons/snow_{c}_{v}' for v in range(VARIANTS)] for c in COVERS},
            'road': {c: [f'seasons/snow_light_{v}' for v in range(VARIANTS)] for c in ('full', 'patchy')},
            'on_ground': ['nature/terrain_grass_*', 'scenery/terrain_meadow_*', 'nature/terrain_sand',
                          'nature/terrain_soil-tilled', 'nature/crop_*'],
            'on_road': ['nature/terrain_dirt-path', 'nature/terrain_paving', 'nature/terrain_cut-stone',
                        'nature/terrain_cobbles_*', 'nature/terrain_gravel_*', 'nature/terrain_farm-track_*'],
            'sprites': {'nature/tree_conifer': 'seasons/tree_conifer_snow'},
            'overlay': 'snow',
        },
    }


class SeasonSheet(Sheet):
    """The seasons sheet, saved with the season map beside it."""

    def save(self, out_dir=ASSETS):
        result = super().save(out_dir)
        text = json.dumps(season_map(), indent=2) + '\n'
        (Path(out_dir) / 'season_map.json').write_text(text, encoding='utf-8')
        return result


def build():
    sheet = SeasonSheet('seasons')
    for cover in COVERS:
        for v in range(VARIANTS):
            sheet.add(f'snow_{cover}_{v}', snow_tile(cover, 11 * v + COVERS.index(cover)), layer='ground')
    sheet.add('tree_deciduous_mature_bare', bare(BARE_MATURE))
    sheet.add('tree_deciduous_young_bare', bare(BARE_YOUNG))
    sheet.add('tree_fruit_bare', bare(BARE_FRUIT))
    sheet.add('tree_conifer_snow', snowy_conifer())
    for size, icons in ((16, ICON16), (8, ICON8)):
        for name in SEASONS:
            sheet.add(f'season_{name}_{size}', icon(icons[name], size, name))
    return sheet


if __name__ == '__main__':
    build().save()
