"""Checks the world generator: the snow biome, the countries stage and the previews. Run:
python tools/worldgen/test_worldgen.py [--seeds N --size standard|large]

Each check returns a list of problems. World checks take one world each, and the runner feeds the
sample through them a world at a time, so a sweep of 100 large worlds never holds them all.
"""
import argparse
import itertools
import sys
import tempfile
from collections import Counter
from dataclasses import replace
from functools import lru_cache
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import export_map  # noqa: E402
import place  # noqa: E402
import settle  # noqa: E402
from climate import GRASSLAND, HILLS, HILLS_AT, LAKE, MOUNTAIN, OCEAN, SNOW, SNOW_BELOW, biomes  # noqa: E402
from colours import VIEWERS, ciede2000, rgb_of, seen_by, to_lab, wheel_hue  # noqa: E402
from countries import Country, capitals, count, found, grow  # noqa: E402
from grid import neighbours  # noqa: E402
from mapdraw import BORDER, COUNTRY_COLOURS, View, _borders, countries_png, country_png, region_png  # noqa: E402
from mapfile import WALK_ROAD  # noqa: E402
from model import PlaceContext  # noqa: E402
from settle import Settlement, habitability  # noqa: E402
from world import SIZES, fingerprint, generate  # noqa: E402

FIRST = 0x5EED0001
SNOWY = ('standard', 0x5EED000A)
SAMPLE = [('standard', FIRST), ('standard', FIRST + 1), ('standard', FIRST + 2), SNOWY, ('large', FIRST)]
# Pinned after the M8.1 preview tuning; a deliberate change to any stage updates them, and goldens.py
# replaces them when version 1 freezes.
PINNED = {('standard', FIRST): 0x1EC8F880, ('large', FIRST): 0x867CD479}


@lru_cache(maxsize=8)
def world(size, seed):
    return generate(seed, *SIZES[size])


def lowland(temperature, hill=-1):
    """climate.biomes on a 5x3 all-land grid at elevation 200 and moisture 100, with hills at cell `hill`."""
    n = 15
    dry = bytearray(n)
    elevation = [400 if i == hill else 200 for i in range(n)]
    return list(biomes(1, 5, 3, elevation, bytearray(temperature), bytearray([100] * n), dry, dry, dry, dry))


def snow_on_cold_lowland():
    problems = []
    for t, cover in ((39, SNOW), (40, GRASSLAND)):
        want = [HILLS if i == 7 else cover for i in range(15)]
        got = lowland([t] * 15, hill=7)
        if got != want:
            problems.append(f'at temperature {t}: {got}, want {want}')
    return problems


def lone_snow_melts():
    got = lowland([30 if i == 7 else 100 for i in range(15)])
    return [f'a lone cold cell stayed snow: {got}'] if SNOW in got else []


def snow_is_uninhabitable():
    n = 81

    def scores(cover):
        return habitability(9, 9, bytearray([cover] * n), [200] * n, bytearray(n), bytearray(n), bytearray([30] * n),
                            bytearray([100] * n), [0] * n)
    problems = [f'snow scores {max(scores(SNOW))}'] if any(scores(SNOW)) else []
    if not any(scores(GRASSLAND)):
        problems.append('grassland scores 0 too, so this check proves nothing')
    return problems


def snow_places_build():
    ctx = PlaceContext(seed=1, name='snow', biome='snow', temperature=20, moisture=100, wonder='geyser')
    layout = place.build(ctx)
    return [] if isinstance(layout, place.Layout) else [f'place.build returned {type(layout).__name__}']


def snow_falls_on_a_cold_world():
    return [] if SNOW in world(*SNOWY).biome else [f'no snow on {SNOWY[0]} {SNOWY[1]:08x}']


def count_is_three_to_five():
    counts = {count(seed) for seed in range(1000)}
    return [] if counts == {3, 4, 5} else [f'counts {sorted(counts)}, want 3, 4 and 5']


def capitals_spaced_in_population_order():
    towns = [Settlement(0, 0, 0, 'capital', 90_000), Settlement(1, 1, 0, 'city', 60_000),
             Settlement(2, 10, 0, 'town', 9_000), Settlement(3, 20, 0, 'village', 900),
             Settlement(4, 0, 10, 'town', 6_000)]
    cases = (((3, 300), [0, 2, 4]), ((3, 900), [0, 2, 4]), ((5, 300), [0, 1, 2, 4]))
    return [f'capitals(k={k}, land={land}) = {got}, want {want}'
            for (k, land), want in cases if (got := capitals(towns, k, land)) != want]


def grow_on(width, height, biome, sources, river=None, receiver=None):
    n = width * height
    return grow(width, height, bytearray(biome), river or bytearray(n), receiver or [-1] * n, sources)


def grow_breaks_ties_by_cost_then_cell():
    got = grow_on(7, 1, [GRASSLAND] * 7, [0, 6])
    return [] if got == [1, 1, 1, 1, 2, 2, 2] else [f'labels {got}, want [1, 1, 1, 1, 2, 2, 2]']


def grow_bends_to_mountains():
    biome = [GRASSLAND] * 7
    biome[2] = MOUNTAIN
    got = grow_on(7, 1, biome, [0, 6])
    return [] if got == [1, 1, 1, 2, 2, 2, 2] else [f'labels {got}, want [1, 1, 1, 2, 2, 2, 2]']


def island_joins_the_cheaper_crossing():
    g, o = GRASSLAND, OCEAN
    got = grow_on(9, 1, [g, g, g, o, g, o, o, g, g], [0, 8])
    return [] if got[4] == 1 else [f'the island at cell 4 joins {got[4]} across two cells of sea, not 1 across one']


def diagonal_never_slips():
    river, receiver = bytearray(9), [-1] * 9
    river[1] = river[3] = 1
    receiver[1] = 3
    strait = [GRASSLAND] * 9
    strait[1] = strait[3] = OCEAN
    cases = (('open ground', grow_on(3, 3, [GRASSLAND] * 9, [0, 8]), 1),
             ('a river between', grow_on(3, 3, [GRASSLAND] * 9, [0, 8], river, receiver), 2),
             ('a strait between', grow_on(3, 3, strait, [0, 8]), 2))
    return [f'{name}: cell 4 joins {labels[4]}, want {want}' for name, labels, want in cases if labels[4] != want]


def small_countries_pass_their_capital_on():
    """A strip G*7 O O G O O G*7: town 2 on the one-cell island would hold only itself, so town 3 at x 4
    takes its place, and each country then holds three settlements. Seed 4 draws three countries."""
    g, o = GRASSLAND, OCEAN
    biome = bytearray([g] * 7 + [o, o, g, o, o] + [g] * 7)
    places = [(0, 'capital', 100_000), (18, 'city', 60_000), (9, 'town', 9_000), (4, 'town', 8_000),
              (1, 'village', 900), (2, 'village', 850), (6, 'village', 800), (16, 'village', 700), (13, 'village', 600)]
    towns = [Settlement(i, x, 0, tier, people, uid=x) for i, (x, tier, people) in enumerate(places)]
    _, made = found(4, 19, 1, biome, bytearray(19), [-1] * 19, towns, 15)
    problems = [] if [c.capital for c in made] == [0, 1, 3] else [f'capitals {[c.capital for c in made]}, want [0, 1, 3]']
    if (towns[2].tier, towns[3].tier) != ('town', 'capital'):
        problems.append(f'tiers of 2 and 3: {towns[2].tier}, {towns[3].tier}')
    return problems


def fingerprint_covers_countries():
    w = world('standard', FIRST)
    first = fingerprint(w)
    problems = [] if fingerprint(generate(FIRST, *SIZES['standard'])) == first else ['one seed, two fingerprints']
    moved = bytearray(w.country)
    cell = next(i for i, c in enumerate(moved) if c)
    moved[cell] = moved[cell] % len(w.countries) + 1
    if fingerprint(replace(w, country=moved)) == first:
        problems.append('moving a cell to another country keeps the fingerprint')
    recoloured = [replace(c, colour=(c.colour + 1) % 5) if c.id == 1 else c for c in w.countries]
    if fingerprint(replace(w, countries=recoloured)) == first:
        problems.append('recolouring a country keeps the fingerprint')
    return problems


def fingerprints_are_pinned():
    return [f'{size} {seed:08x}: fingerprint {got:08x}, pinned {want:08x}'
            for (size, seed), want in PINNED.items() if (got := fingerprint(world(size, seed))) != want]


BLANK = (1, 2, 3)


def drawn_borders(width, height, country, size, line, band):
    """_borders for a stand-in world of countries 1 (colour 0) and 2 (colour 1), on a blank image."""
    w = SimpleNamespace(width=width, height=height, country=bytearray(country),
                        countries=[Country(1, 0, 0), Country(2, 1, 1)])
    image = Image.new('RGB', (width * size, height * size), BLANK)
    _borders(View(w, size, 0, 0, width, height), ImageDraw.Draw(image), line, band)
    return image


def borders_draw_on_cell_edges():
    c0, c1 = COUNTRY_COLOURS[0], COUNTRY_COLOURS[1]
    narrow = [BLANK, c0, BORDER, c1, BLANK]
    problems = []
    for name, size, line, band, first, want in (('8 px', 8, 1, 1, 5, narrow),
                                                 ('16 px', 16, 2, 2, 12, [BLANK, c0, c0, BORDER, BORDER, c1, c1, BLANK])):
        image = drawn_borders(2, 1, [1, 2], size, line, band)
        problems += [f'{name}, row {y}: {got}' for y in range(size)
                     if (got := [image.getpixel((x, y)) for x in range(first, first + len(want))]) != want]
    image = drawn_borders(1, 2, [1, 2], 8, 1, 1)
    problems += [f'stacked, column {x}: {got}' for x in range(8)
                 if (got := [image.getpixel((x, y)) for y in range(5, 10)]) != narrow]
    if [colour for _, colour in drawn_borders(3, 1, [1, 0, 2], 8, 1, 1).getcolors()] != [BLANK]:
        problems.append('water between two countries drew a border')
    return problems[:6]


def map_colours_match_the_palette():
    """map-colours.json, which render-gl's map scene shares, holds the palette's water and line colours."""
    from mapdraw import MAP_COLOURS
    from spritekit import PALETTE
    names = {'water': 'WATER', 'river': 'WATER', 'lane': 'WATER_L', 'road': 'WOOD', 'deck': 'WOOD_L', 'rail': 'WOOD_D',
             'border': 'OUTLINE'}
    wanted = {key: '#' + bytes(PALETTE[name]).hex().upper() for key, name in names.items()}
    return [f'{key} is {MAP_COLOURS[key]}, but the palette gives {colour}' for key, colour in wanted.items()
            if MAP_COLOURS[key] != colour]


# The country colours' bars (M8.3 plan, Rulings 11-13), in CIEDE2000 on D65 Lab. The pair bar is the swatch sheet's
# 12.0 to one decimal: the owner's blue and deep violet lie 11.96 apart for deutan vision (computed).
PALETTE_BAR, PAIR_BAR = 15, 11.95
FAMILY_MARGIN_DEG, NEUTRAL_CHROMA = 12, 15
PROVISIONAL_COUNTRY_COLOURS = ('#0000DD', '#AABB00', '#334422', '#EE00DD', '#44BBCC')
# Sharma, Wu and Dalal 2005, table 1: (Lab 1, Lab 2, CIEDE2000). Rows 9 to 15 test the hue wrap near the a axis.
SHARMA = [
    ((50, 2.6772, -79.7751), (50, 0, -82.7485), 2.0425), ((50, 3.1571, -77.2803), (50, 0, -82.7485), 2.8615),
    ((50, 2.8361, -74.0200), (50, 0, -82.7485), 3.4412), ((50, -1.3802, -84.2814), (50, 0, -82.7485), 1.0000),
    ((50, -1.1848, -84.8006), (50, 0, -82.7485), 1.0000), ((50, -0.9009, -85.5211), (50, 0, -82.7485), 1.0000),
    ((50, 0, 0), (50, -1, 2), 2.3669), ((50, -1, 2), (50, 0, 0), 2.3669),
    ((50, 2.49, -0.001), (50, -2.49, 0.0009), 7.1792), ((50, 2.49, -0.001), (50, -2.49, 0.0010), 7.1792),
    ((50, 2.49, -0.001), (50, -2.49, 0.0011), 7.2195), ((50, 2.49, -0.001), (50, -2.49, 0.0012), 7.2195),
    ((50, -0.001, 2.49), (50, 0.0009, -2.49), 4.8045), ((50, -0.001, 2.49), (50, 0.0010, -2.49), 4.8045),
    ((50, -0.001, 2.49), (50, 0.0011, -2.49), 4.7461), ((50, 2.5, 0), (50, 0, -2.5), 4.3065),
    ((50, 2.5, 0), (73, 25, -18), 27.1492), ((50, 2.5, 0), (61, -5, 29), 22.8977),
    ((50, 2.5, 0), (56, -27, -3), 31.9030), ((50, 2.5, 0), (58, 24, 15), 19.4535),
    ((50, 2.5, 0), (50, 3.1736, 0.5854), 1.0000), ((50, 2.5, 0), (50, 3.2972, 0), 1.0000),
    ((50, 2.5, 0), (50, 1.8634, 0.5757), 1.0000), ((50, 2.5, 0), (50, 3.2592, 0.3350), 1.0000),
    ((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387), 1.2644),
    ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630),
    ((61.2901, 3.7196, -5.3901), (61.4292, 2.2480, -4.9620), 1.8731),
    ((35.0831, -44.1164, 3.7933), (35.0232, -40.0716, 1.5901), 1.8645),
    ((22.7233, 20.0904, -46.6940), (23.0331, 14.9730, -42.5619), 2.0373),
    ((36.4612, 47.8580, 18.3852), (36.2715, 50.5065, 21.2231), 1.4146),
    ((90.8027, -2.0831, 1.4410), (91.1528, -1.6435, 0.0447), 1.4441),
    ((90.9257, -0.5406, -0.9208), (88.6381, -0.8985, -0.7239), 1.5381),
    ((6.7747, -0.2908, -2.4247), (5.8714, -0.0985, -2.2286), 0.6377),
    ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
]


def ciede2000_matches_sharma():
    got = np.array([ciede2000(np.array(a, float), np.array(b, float)) for a, b, _ in SHARMA])
    worst = float(np.abs(got - np.array([want for *_, want in SHARMA])).max())
    return [] if worst < 5e-4 else [f'CIEDE2000 is off Sharma et al. 2005 by up to {worst:.5f}']


def family_sectors():
    """The swatch sheet's colour-wheel sector of each reserved family: its tones' hues, 12 degrees wider each side."""
    from spritekit import BODY_HUES, PALETTE
    tones = {'crime red-orange': ['VERMILLION', 'ROOF', 'ROOF_D', 'PINK', 'PINK_D']}
    tones.update({hue: list(names) for hue, names in BODY_HUES.items() if hue != 'silver'})
    sectors = {}
    for family, names in tones.items():
        hues = wheel_hue(np.array([PALETTE[name] for name in names]))
        centre = np.degrees(np.arctan2(np.sin(np.radians(hues)).mean(), np.cos(np.radians(hues)).mean())) % 360
        spread = (hues - centre + 180) % 360 - 180
        sectors[family] = ((centre + spread.min() - FAMILY_MARGIN_DEG) % 360, (centre + spread.max() + FAMILY_MARGIN_DEG) % 360)
    return sectors


def colour_problems(hexes):
    """Country colours against every palette colour, each other for four kinds of viewer, and the reserved families."""
    from spritekit import PALETTE
    rgb = np.array([rgb_of(h) for h in hexes], float)
    names = list(PALETTE)
    near = ciede2000(to_lab(rgb)[:, None], to_lab(np.array([PALETTE[name] for name in names], float))[None])
    problems = [f'{h} is {near[i].min():.2f} from palette {names[int(near[i].argmin())]}, under {PALETTE_BAR}'
                for i, h in enumerate(hexes) if near[i].min() < PALETTE_BAR]
    for viewer in VIEWERS:
        seen = to_lab(seen_by(rgb, viewer))
        apart = ciede2000(seen[:, None], seen[None])
        problems += [f'{hexes[a]} and {hexes[b]} are {apart[a, b]:.2f} apart for {viewer} vision, under {PAIR_BAR}'
                     for a, b in itertools.combinations(range(len(hexes)), 2) if apart[a, b] < PAIR_BAR]
    hues = wheel_hue(rgb)
    for family, (lo, hi) in family_sectors().items():
        problems += [f'{h} lies in the {family} family' for h, hue in zip(hexes, hues) if (hue - lo) % 360 <= (hi - lo) % 360]
    lab = to_lab(rgb)
    return problems + [f'{h} reads as grey' for h, chroma in zip(hexes, np.hypot(lab[:, 1], lab[:, 2]))
                       if chroma < NEUTRAL_CHROMA]


def country_colours_keep_apart():
    from mapdraw import MAP_COLOURS
    return colour_problems(MAP_COLOURS['countries'])


def colour_check_bites():
    """M8.1's provisional five sit too close to the palette twice, so the check must refuse them."""
    found = ' '.join(colour_problems(PROVISIONAL_COUNTRY_COLOURS))
    misses = [h for h in ('#AABB00 is 8.27 from palette AUTUMN_L', '#44BBCC is 12.27 from palette WATER_L') if h not in found]
    return [f'the provisional table drew no "{miss}"' for miss in misses]


def previews_write():
    w = world('standard', FIRST)
    sizes = {}
    with tempfile.TemporaryDirectory() as tmp:
        for draw in (country_png, region_png, countries_png):
            path = Path(tmp) / f'{draw.__name__}.png'
            draw(w, path)
            with Image.open(path) as image:
                sizes[draw.__name__] = image.size
    want = {'country_png': (1536, 1024), 'region_png': (960, 544), 'countries_png': (1536, 1024)}
    return [] if sizes == want else [f'image sizes {sizes}, want {want}']


def town_roads_never_draw_as_water():
    """Blobs walk the default town's footbridges, so those cells must not draw as river in either layer."""
    town = export_map.town_map(export_map.TOWN)
    names = [name for name, _ in town['kinds']]
    wet = [f'{i % town["width"]},{i // town["width"]}: {names[kind]}, {town["frames"][tile]}'
           for i, (kind, walk, tile) in enumerate(zip(town['terrain'], town['walk'], town['tiles']))
           if walk == WALK_ROAD and (names[kind] == 'water' or 'water' in town['frames'][tile])]
    return [f'{len(wet)} road cells draw as water, the first at {wet[0]}'] if wet else []


def countries_cover_the_land(w):
    k = len(w.countries)
    problems = [] if 3 <= k <= 5 and [c.id for c in w.countries] == list(range(1, k + 1)) else [
        f'country ids {[c.id for c in w.countries]}']
    stray = [i for i, (b, c) in enumerate(zip(w.biome, w.country))
             if (c != 0 if b in (OCEAN, LAKE) else not 1 <= c <= k)]
    if stray:
        problems.append(f'{len(stray)} cells hold the wrong country, the first at {stray[0]}')
    firsts = [c.capital for c in w.countries]
    if firsts[:1] != [0] or len(set(firsts)) != k:
        problems.append(f'capitals {firsts}')
    for c in w.countries:
        s = w.settlements[c.capital]
        if w.country[s.uid] != c.id or s.tier != 'capital' or s.population < 5_000:
            problems.append(f'capital {s.id} of country {c.id}: in {w.country[s.uid]}, {s.tier}, {s.population:,}')
    held = Counter(w.country[s.uid] for s in w.settlements)
    small = {c.id: held[c.id] for c in w.countries if held[c.id] < 3}
    if small or held[0]:
        problems.append(f'settlements by country {dict(held)}')
    colours = [c.colour for c in w.countries]
    if len(set(colours)) != k or not set(colours) <= set(range(5)):
        problems.append(f'colours {colours}')
    return problems


def stage_only_retiers_capitals(w):
    chosen = {c.capital for c in w.countries}
    people = [s.population for s in w.settlements]
    problems = [] if [s.id for s in w.settlements] == list(range(len(people))) else ['settlement ids out of order']
    if people != sorted(people, reverse=True):
        problems.append('populations rise with id')
    for s in w.settlements:
        if s.id not in chosen and s.tier != settle._tier(s.id, s.population):
            problems.append(f'settlement {s.id} turned {s.tier}')
    return problems


def snow_lies_on_cold_lowland(w):
    """Snow is lowland, and it or a neighbour is colder than SNOW_BELOW, since despeckling lets a lone
    cell a little warmer join the snow around it."""
    nbrs = neighbours(w.width, w.height)
    return [f'snow at {i % w.width},{i // w.width}: elevation {w.elevation[i]}, '
            f'coldest nearby {min(w.temperature[k] for k in (i, *nbrs[i]))}'
            for i, b in enumerate(w.biome) if b == SNOW
            and (w.elevation[i] >= HILLS_AT or min(w.temperature[k] for k in (i, *nbrs[i])) >= SNOW_BELOW)]


CHECKS = [snow_on_cold_lowland, lone_snow_melts, snow_is_uninhabitable, snow_places_build, snow_falls_on_a_cold_world,
          count_is_three_to_five, capitals_spaced_in_population_order, grow_breaks_ties_by_cost_then_cell,
          grow_bends_to_mountains, island_joins_the_cheaper_crossing, diagonal_never_slips,
          small_countries_pass_their_capital_on, fingerprint_covers_countries, fingerprints_are_pinned,
          borders_draw_on_cell_edges, map_colours_match_the_palette, ciede2000_matches_sharma, country_colours_keep_apart,
          colour_check_bites, previews_write, town_roads_never_draw_as_water]
WORLD_CHECKS = [snow_lies_on_cold_lowland, countries_cover_the_land, stage_only_retiers_capitals]


def main():
    parser = argparse.ArgumentParser(description='Check the world generator.')
    parser.add_argument('--seeds', type=int, help=f'check seeds {FIRST:08x} onward instead of the default sample')
    parser.add_argument('--size', choices=SIZES, default='standard', help='world size for --seeds')
    args = parser.parse_args()
    sample = [(args.size, FIRST + k) for k in range(args.seeds)] if args.seeds else SAMPLE
    results = [(check.__name__, check()) for check in CHECKS]
    found = {check.__name__: [] for check in WORLD_CHECKS}
    for size, seed in sample:
        w = world(size, seed)
        for check in WORLD_CHECKS:
            found[check.__name__] += [f'{size} {seed:08x}: {problem}' for problem in check(w)]
    failed = False
    for name, problems in results + list(found.items()):
        print(f'{name}: {"ok" if not problems else f"{len(problems)} problem(s)"}')
        for problem in problems[:20]:
            print('  ' + problem)
        failed |= bool(problems)
    print(f'{len(sample)} worlds checked')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
