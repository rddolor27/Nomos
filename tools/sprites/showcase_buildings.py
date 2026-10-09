"""Preview the building art of October 2026 for the owner, and the walled map icons with two road classes.

Writes, at 2x:
- docs/mockups/buildings_preview.png: the trades and farm buildings, the large civic set beside
  today's, the polish of today's buildings before and after, and a few of them in snow;
- docs/mockups/map_icons_preview.png: the walled and palisaded icons on a piece of the Region view
  (16 px a cell) and the Country view (8 px a cell), with stone highways and dirt tracks drawn as a
  proposal only: tools/worldgen/mapdraw.py still draws one road class.

The "before" pictures come from the buildings sheet at BEFORE, the commit just ahead of the polish.
"""
import io
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from showcase import Sheets, tile_name  # noqa: E402
from spritekit import ASSETS, FONT3x5, PALETTE, TILE  # noqa: E402

ROOT = ASSETS.parents[1]
MOCKUPS = ROOT / 'docs' / 'mockups'
SCALE = 2
BEFORE = '1434809'
INK, PLATE = (40, 40, 48, 255), (236, 238, 230, 255)
TRADES = ['shop_inn', 'shop_bakery', 'work_smithy', 'work_stable']
FARM = ['farm_barn', 'farm_granary', 'farm_shed']
CIVIC = [('buildings', 'civic_town-hall'), ('buildings', 'civic_courthouse'), ('landmarks', 'landmark_library'),
         ('buildings', 'civic_school'), ('buildings', 'civic_clinic')]
LARGE = {'civic_town-hall': 'civic_town-hall_large', 'civic_courthouse': 'civic_courthouse_large',
         'landmark_library': 'civic_library_large', 'civic_school': 'civic_school_large',
         'civic_clinic': 'civic_clinic_large'}
POLISHED = ['civic_clinic', 'civic_police-station', 'civic_school', 'civic_town-hall', 'civic_records-office',
            'civic_courthouse', 'civic_jail', 'shop_general', 'shop_market-stall', 'shop_market-stall_closed',
            'shop_warehouse', 'work_farm', 'work_pasture', 'work_dock', 'work_lumber-camp', 'work_quarry',
            'work_mine', 'work_fuel-works', 'work_workshop']
IN_SNOW = ['shop_inn', 'farm_barn', 'civic_town-hall_large', 'work_watermill', 'shop_warehouse']


def text(img, x, y, s, colour=INK):
    px = img.load()
    for ch in s.upper():
        for gy, row in enumerate(FONT3x5.get(ch, FONT3x5['-'])):
            for gx, bit in enumerate(row):
                if bit == '#' and 0 <= x + gx < img.width and 0 <= y + gy < img.height:
                    px[x + gx, y + gy] = colour
        x += 4


def label(img, x, y, s):
    """A light plate with dark letters, its top-left at (x, y)."""
    img.paste(PLATE, (x, y, x + 4 * len(s) + 3, y + 9))
    text(img, x + 2, y + 2, s)


def span(im, caption):
    """Width a captioned sprite takes in a row."""
    return max(im.width, 4 * len(caption) + 3)


class GitSheet:
    """One sprite sheet as it was at a commit, read from git rather than from the working tree."""

    def __init__(self, category, rev):
        def blob(path):
            return subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=ROOT, capture_output=True, check=True).stdout
        self.frames = json.loads(blob(f'assets/sprites/{category}.json'))['frames']
        self.image = Image.open(io.BytesIO(blob(f'assets/sprites/{category}.png'))).convert('RGBA')

    def get(self, name):
        f = self.frames[name]
        return self.image.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])), tuple(f['anchor'])


class Board:
    """A tall picture on grass that lays sprites out in captioned rows, each sprite over its name."""

    def __init__(self, width, height):
        self.sheets = Sheets()
        self.image = Image.new('RGBA', (width, height))
        for ty in range(height // TILE + 1):
            for tx in range(width // TILE + 1):
                im, _ = self.sheets.get('nature', tile_name(tx, ty))
                self.image.alpha_composite(im, (tx * TILE, ty * TILE))
        self.y = 8

    def heading(self, s):
        self.image.paste((52, 58, 70, 255), (0, self.y, self.image.width, self.y + 11))
        text(self.image, 6, self.y + 3, s, PLATE)
        self.y += 19

    def street(self, y, name):
        im, _ = self.sheets.get('nature', name)
        for x in range(0, self.image.width, TILE):
            self.image.alpha_composite(im, (x, y))

    def row(self, items, gap=12, street=None):
        """items: (image, caption) left to right, all standing on one ground line."""
        ground = self.y + max(im.height for im, _ in items)
        if street:
            self.street(ground + 1, street)
        x = gap
        for im, caption in items:
            self.image.alpha_composite(im, (x, ground - im.height))
            label(self.image, x, ground + 3, caption)
            x += span(im, caption) + gap
        self.y = ground + 18

    def save(self, path):
        im = self.image.crop((0, 0, self.image.width, self.y))
        im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST).save(path, optimize=True)


def with_snow(sheets, name):
    im, _ = sheets.get('buildings', name)
    snow, _ = sheets.get('buildings', f'{name}_snow')
    out = im.copy()
    out.alpha_composite(snow)
    return out


def river_scene(sheets):
    """The watermill beside a river two tiles wide, its wheel on the water; shores on both banks."""
    w, h = 10 * TILE, 5 * TILE
    scene = Image.new('RGBA', (w, h))
    river = (6, 7)
    for ty in range(h // TILE):
        for tx in range(w // TILE):
            if tx in river:
                name = ('nature', f'terrain_water_{(tx + ty) % 2}')
            elif tx == river[0] - 1:
                name = ('scenery', f'shore_grass_e_{ty % 2}')
            elif tx == river[1] + 1:
                name = ('scenery', f'shore_grass_w_{ty % 2}')
            else:
                name = ('nature', tile_name(tx, ty))
            im, _ = sheets.get(*name)
            scene.alpha_composite(im, (tx * TILE, ty * TILE))
    mill, (ax, ay) = sheets.get('buildings', 'work_watermill')
    fx, fy = 2 * TILE, 3 * TILE                               # footprint's top-left: 4 x 2 cells beside the river
    scene.alpha_composite(mill, (fx + 2 * TILE - ax, fy + 2 * TILE - 1 - ay))
    return scene


def buildings_preview(path):
    board = Board(672, 1500)
    s = board.sheets
    before = GitSheet('buildings', BEFORE)

    def own(name, category='buildings'):
        return s.get(category, name)[0], name

    board.heading('Trades - inn  bakery  smithy  stable')
    board.row([own(n) for n in TRADES], gap=20, street='terrain_cobbles_0')
    board.heading('Farm buildings - barn  granary  shed  and the watermill with its wheel on the river east of it')
    board.row([own(n) for n in FARM] + [(river_scene(s), 'work_watermill')], gap=20,
              street='terrain_farm-track_horizontal')
    board.heading('The large civic set for capitals and cities - each beside the town building it grows from')
    for pairs in (CIVIC[:3], CIVIC[3:]):
        board.row([item for category, name in pairs for item in (own(name, category), own(LARGE[name]))], gap=10,
                  street='terrain_cut-stone')
    board.heading('The buildings of today polished - before then after')
    line, width = [], 0
    for name in POLISHED:
        pair = [(before.get(name)[0], 'before'), own(name)]
        wide = sum(span(im, caption) + 10 for im, caption in pair) + 12
        if line and width + wide > board.image.width:
            board.row(line, gap=10)
            line, width = [], 0
        line += pair
        width += wide
    board.row(line, gap=10)
    board.heading('In snow')
    board.row([(with_snow(s, n), f'{n} snow') for n in IN_SNOW], gap=14)
    board.save(path)


# ------------------------------------------------------------------ map icons and road classes
class MapPatch:
    """A piece of map at one cell size: terrain tiles, a river, roads as two classes and icons."""

    def __init__(self, size, cols, rows, fields, forest):
        self.size = size
        self.sheets = Sheets()
        self.image = Image.new('RGBA', (cols * size, rows * size))
        for y in range(rows):
            for x in range(cols):
                if (x, y) in forest:
                    name = f'map{size}_forest-deciduous'
                elif (x, y) in fields:
                    name = f'map{size}_farmland_{(x + y) % 2}'
                else:
                    name = f'map{size}_grassland_{(x * 3 + y) % 2}'
                im, _ = self.sheets.get('map', name)
                self.image.alpha_composite(im, (x * size, y * size))

    def centre(self, cell):
        return cell[0] * self.size + self.size // 2, cell[1] * self.size + self.size // 2

    def brush(self, a, b, width, colour, dash=0, gap=0):
        """Square dabs along the straight line from cell a's centre to cell b's, optionally dashed."""
        (ax, ay), (bx, by) = self.centre(a), self.centre(b)
        steps = max(abs(bx - ax), abs(by - ay), 1)
        px = self.image.load()
        for k in range(steps + 1):
            if dash and k % (dash + gap) >= dash:
                continue
            x, y = ax + (bx - ax) * k // steps - width // 2, ay + (by - ay) * k // steps - width // 2
            for dy in range(width):
                for dx in range(width):
                    if 0 <= x + dx < self.image.width and 0 <= y + dy < self.image.height:
                        px[x + dx, y + dy] = (*PALETTE[colour], 255)

    def path(self, cells, strokes):
        for width, colour, dash, gap in strokes:
            for a, b in zip(cells, cells[1:]):
                self.brush(a, b, width, colour, dash, gap)

    def bridge(self, x, y, along, across):
        """A stone deck centred on pixel (x, y): parapets in dark stone along each side of the road."""
        x0, y0 = x - along // 2, y - across // 2
        self.image.paste((*PALETTE['STONE_L'], 255), (x0, y0, x0 + along, y0 + across))
        for yy in (y0, y0 + across - 1):
            self.image.paste((*PALETTE['STONE_D'], 255), (x0, yy, x0 + along, yy + 1))

    def place(self, category, name, cell):
        """Stand a sprite on a cell as mapdraw.py does: its anchor on the cell's bottom middle."""
        im, (ax, ay) = self.sheets.get(category, name)
        self.image.alpha_composite(im, (cell[0] * self.size + self.size // 2 - ax,
                                        cell[1] * self.size + self.size - 1 - ay))


# A stone highway is grey paving with dark kerbs; a dirt track is a broken brown line, as today's roads.
# Each stroke is (width, colour, dash, gap), drawn in order.
HIGHWAY = {
    16: [(4, 'STONE_D', 0, 0), (2, 'STONE_L', 0, 0), (1, 'STONE', 2, 2)],
    8: [(2, 'STONE_D', 0, 0), (1, 'STONE_L', 0, 0)],
}
TRACK = {16: [(2, 'WOOD', 4, 1)], 8: [(1, 'WOOD', 2, 1)]}
RIVER = {16: 2, 8: 1}

PATCH = {          # cells, at either scale: the same piece of country
    'capital': (3, 4), 'city': (12, 3), 'town': (10, 9), 'village': (17, 8),
    'highway': [(3, 4), (5, 4), (8, 3), (12, 3)],
    'track': [(12, 3), (12, 5), (11, 7), (10, 9), (13, 9), (17, 8)],
    'river': [(7, 0), (7, 3), (6, 6), (7, 9), (8, 12)],
    'crossing': (118, 62),         # where the highway meets the river, in Region view pixels
}


def map_piece(size):
    cols, rows = 20, 12
    fields = {(x, y) for x in range(cols) for y in range(rows) if (x * 5 + y * 3) % 7 < 2}
    forest = {(x, y) for x in range(14, 20) for y in range(0, 3)} | {(0, y) for y in range(8, 12)}
    patch = MapPatch(size, cols, rows, fields, forest)
    for a, b in zip(PATCH['river'], PATCH['river'][1:]):
        patch.brush(a, b, RIVER[size], 'WATER')
    patch.path(PATCH['highway'], HIGHWAY[size])
    bx, by = PATCH['crossing']
    patch.bridge(bx * size // 16, by * size // 16, 10 * size // 16 + 2, 6 * size // 16 + 1)
    patch.path(PATCH['track'], TRACK[size])
    for kind, name in (('capital', 'capital-walled'), ('city', 'city-walled'), ('town', 'town-palisade')):
        if kind == 'capital':
            patch.place('map', f'map{size}_settlement_highlight_{name}', PATCH[kind])
        patch.place('map', f'map{size}_settlement_{name}', PATCH[kind])
    patch.place('map', 'settlement_village', PATCH['village'])
    return patch.image


def legend(image, x, y, size):
    """Swatches of the two road classes at one cell size."""
    for i, (strokes, name) in enumerate(((HIGHWAY[size], 'stone highway'), (TRACK[size], 'dirt track'))):
        sw = MapPatch(size, 3, 1, set(), set())
        sw.path([(0, 0), (2, 0)], strokes)
        image.alpha_composite(sw.image, (x, y + i * (size + 4)))
        label(image, x + 3 * size + 4, y + i * (size + 4) + (size - 9) // 2, name)


def map_icons_preview(path):
    region, country = map_piece(16), map_piece(8)
    sheets = Sheets()
    w = region.width + 16
    out = Image.new('RGBA', (w, region.height + country.height + 100), (52, 58, 70, 255))
    text(out, 8, 5, 'Region view 16 px a cell - walled capital  walled city  palisaded town  village', PLATE)
    out.alpha_composite(region, (8, 16))
    y = 16 + region.height + 8
    text(out, 8, y + 2, 'Country view 8 px a cell - the same piece of country', PLATE)
    out.alpha_composite(country, (8, y + 12))
    legend(out, 8 + country.width + 16, y + 16, 16)
    legend(out, 8 + country.width + 16, y + 64, 8)
    y += 12 + country.height + 12
    text(out, 8, y, 'The icons of today then the walled ones - at the size of the Country view', PLATE)
    x = 8
    for name in ('settlement_capital', 'settlement_city', 'settlement_town', 'map8_settlement_capital-walled',
                 'map8_settlement_city-walled', 'map8_settlement_town-palisade'):
        im, _ = sheets.get('map', name)
        out.alpha_composite(im, (x, y + 10 + 32 - im.height))
        x += im.width + 12
    out = out.crop((0, 0, w, y + 50))
    out.resize((out.width * SCALE, out.height * SCALE), Image.NEAREST).save(path, optimize=True)


if __name__ == '__main__':
    MOCKUPS.mkdir(parents=True, exist_ok=True)
    buildings_preview(MOCKUPS / 'buildings_preview.png')
    map_icons_preview(MOCKUPS / 'map_icons_preview.png')
    print(f'wrote {MOCKUPS / "buildings_preview.png"} and {MOCKUPS / "map_icons_preview.png"}')
