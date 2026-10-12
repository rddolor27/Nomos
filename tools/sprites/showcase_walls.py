"""Draw the town walls in one scene: a small walled ring with a front gate and a side gate, with
the weatherboard and rubble houses and the town props inside it and beside it.

Writes docs/mockups/town_walls_preview.png at 2x.

`python tools/sprites/showcase_walls.py varied` draws M3.1 part 4's preview for the owner instead (12 October
2026): an octagon corner in stone and in palisade, and a stepped ring street with and without the 16 optional
corner tiles. The owner picked the diagonal runs and the palisade's two-sided post, which are walls.py's pieces
now; the corner tiles are still drafts drawn here. Writes
docs/mockups/m3.1-varied-walls/01-octagon-corners-and-ring-streets.png at 3x.
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from showcase import Sheets, tile_name  # noqa: E402
from showcase_buildings import INK, PLATE, label, text  # noqa: E402
from spritekit import ASSETS, TILE  # noqa: E402

OUT = ASSETS.parents[1] / 'docs' / 'mockups' / 'town_walls_preview.png'
COLS, ROWS, SCALE = 28, 19, 2
RING = (1, 3, 14, 16)          # the ring's outer tiles: x0, y0, x1, y1
FRONT_GATE_X = 7               # left tile of the front gate in the south run
SIDE_GATE_Y = 9                # top tile of the side gate's 2-tile gap in the east run
PLACES = [                     # (category, name, tile x, tile y), houses by their footprint's top-left tile
    ('houses', 'house_board_detached_roof-terracotta', 3, 5),
    ('houses', 'house_rubble_detached_roof-slate', 10, 5),
    ('houses', 'house_board_hut_roof-green', 3, 11),
    ('houses', 'house_rubble_hut_roof-plum', 11, 12),
    ('nature', 'prop_notice-board', 5, 9),
    ('nature', 'prop_planter', 9, 8),
    ('nature', 'prop_woodpile', 3, 13),
    ('nature', 'prop_trough', 4, 13),
    ('nature', 'prop_pump', 5, 13),
    ('nature', 'prop_sacks', 10, 13),
    ('houses', 'house_board_row-left_roof-thatch', 16, 3),
    ('houses', 'house_board_row-middle_roof-thatch', 18, 3),
    ('houses', 'house_board_row-right_roof-thatch', 20, 3),
    ('houses', 'house_rubble_farmhouse_roof-green', 23, 3),
    ('nature', 'prop_planter', 17, 8),
    ('nature', 'prop_trough', 20, 8),
    ('nature', 'prop_sacks', 25, 8),
    ('houses', 'house_rubble_row-left_roof-terracotta', 16, 12),
    ('houses', 'house_rubble_row-middle_roof-terracotta', 18, 12),
    ('houses', 'house_rubble_row-right_roof-terracotta', 20, 12),
    ('houses', 'house_board_apartment_roof-slate', 23, 12),
]


def roads():
    cells = {(x, y) for x in (FRONT_GATE_X, FRONT_GATE_X + 1) for y in range(SIDE_GATE_Y, ROWS)}
    return cells | {(x, y) for x in range(FRONT_GATE_X, COLS) for y in (SIDE_GATE_Y, SIDE_GATE_Y + 1)}


def ring():
    x0, y0, x1, y1 = RING
    out = [('walls', 'wall_tower', x, y) for x in (x0, x1 - 1) for y in (y0, y1 - 1)]
    for x in range(x0 + 2, x1 - 1):
        out.append(('walls', 'wall_horizontal', x, y0))
        if x not in (FRONT_GATE_X, FRONT_GATE_X + 1):
            out.append(('walls', 'wall_horizontal', x, y1))
    out.append(('walls', 'wall_gate_front', FRONT_GATE_X, y1))
    gap = range(SIDE_GATE_Y - 1, SIDE_GATE_Y + 3)
    for y in range(y0 + 2, y1 - 1):
        out.append(('walls', 'wall_vertical', x0, y))
        if y not in gap:
            out.append(('walls', 'wall_vertical', x1, y))
    out.append(('walls', 'wall_gate_side-north', x1, gap[0]))
    out.append(('walls', 'wall_gate_side-south', x1, gap[-1]))
    return out


def build_scene():
    sheets = Sheets()
    scene = Image.new('RGBA', (COLS * TILE, ROWS * TILE))
    road = roads()
    for y in range(ROWS):
        for x in range(COLS):
            name = 'terrain_dirt-path' if (x, y) in road else tile_name(x, y)
            scene.alpha_composite(sheets.get('nature', name)[0], (x * TILE, y * TILE))
    placed = []
    for category, name, tx, ty in ring() + PLACES:
        fw, fh = sheets.frame(category, name).get('footprint', [1, 1])
        placed.append(((ty + fh) * TILE - 1, tx, category, name, tx * TILE + fw * TILE // 2))
    for ground, _, category, name, cx in sorted(placed):
        im, (ax, ay) = sheets.get(category, name)
        scene.alpha_composite(im, (cx - ax, ground - ay))
    return scene


# ------------------------------------------------------------------ the varied walls preview
# M3.1 part 4: octagon corners and stepped ring streets, drawn as drafts for the owner's pick.
VARIED_OUT = ASSETS.parents[1] / 'docs' / 'mockups' / 'm3.1-varied-walls' / '01-octagon-corners-and-ring-streets.png'
VARIED_SCALE = 3
SHEET_WIDTH = 640
PAPER, BAND = (226, 230, 214, 255), (52, 58, 70, 255)
CORNER_RADIUS = 8              # a half tile: the corner tiles cut the corner in a quarter circle this big
SWATCH = 2 * TILE              # the corner tiles are shown at twice their size
SWATCH_GAP = 6
CORNER_NAMES = ('nw', 'ne', 'se', 'sw')
CORNERS = {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}      # tiles.ts's order: the first match wins
# A material's pieces: its runs, its cut, and the pieces on the vertices at a north line's ends and below the cuts.
STONE_PIECES = dict(run='wall_horizontal', side='wall_vertical', cut='wall_diagonal', size=2,
                    north=('wall_tower', 'wall_tower'), below=('wall_tower', 'wall_tower'))
PALISADE_PIECES = dict(run='palisade_horizontal', side='palisade_vertical', cut='palisade_diagonal', size=1,
                       north=('palisade_corner_both', 'palisade_corner_both'),
                       below=('palisade_corner_left', 'palisade_corner_right'))
INSIDE = [('houses', 'house_brick_detached_roof-terracotta', 5, 7), ('houses', 'house_timber_cabin_roof-thatch', 9, 5),
          ('houses', 'house_rubble_hut_roof-slate', 13, 7)]
TREES = [('tree_deciduous_young', 2, 3), ('tree_deciduous_young', 0, 6), ('tree_deciduous_mature', 16, 3),
         ('tree_deciduous_young', 18, 5), ('tree_fruit', 0, 11), ('tree_deciduous_young', 18, 11)]
PEOPLE = [('sun', 'down', 8, 4), ('ice', 'left', 12, 6), ('rose', 'right', 4, 6), ('mint', 'down', 9, 9)]


class RoundedCorner:
    """A fill tile with one outer corner cut off in a quarter circle, so the ground under it shows through."""

    def __init__(self, corner, radius):
        self.north, self.west, self.radius = corner[0] == 'n', corner[1] == 'w', radius

    def cuts(self, x, y):
        r = self.radius
        in_x = x if self.west else TILE - 1 - x          # pixels in from the corner's two sides
        in_y = y if self.north else TILE - 1 - y
        if in_x >= r or in_y >= r:
            return False
        return (2 * (r - in_x) - 1) ** 2 + (2 * (r - in_y) - 1) ** 2 > 4 * r * r

    def image(self, base):
        out = base.copy()
        pixels = out.load()
        for y in range(TILE):
            for x in range(TILE):
                if self.cuts(x, y):
                    pixels[x, y] = (0, 0, 0, 0)
        return out


class Surface:
    """One road surface: how its plain fill tile is named at a cell, and the names of its corner tiles."""

    def __init__(self, title, frame, variants, width):
        self.title, self.frame, self.variants, self.width = title, frame, variants, width

    def fill(self, x, y):
        return f'{self.frame}_{(x * 7 + y * 13) % 5 % self.variants}' if self.variants else self.frame

    def corner(self, corner):
        return f'{self.frame}_{corner}-outer'

    def base(self):
        return self.fill(0, 0)


CUT_STONE = Surface('CUT STONE', 'terrain_cut-stone', variants=0, width=3)
COBBLES = Surface('COBBLES', 'terrain_cobbles', variants=2, width=2)
GRAVEL = Surface('GRAVEL', 'terrain_gravel', variants=2, width=2)
DIRT = Surface('DIRT', 'terrain_dirt-path', variants=0, width=1)
SURFACES = [CUT_STONE, COBBLES, GRAVEL, DIRT]


class Drafts(Sheets):
    """The sprite sheets with draft frames added by name, whatever their category. Drafts are one tile."""

    def __init__(self):
        super().__init__()
        self.drafts = {}

    def add(self, name, image, anchor):
        self.drafts[name] = (image, anchor)

    def frame(self, category, name):
        return {} if name in self.drafts else super().frame(category, name)

    def get(self, category, name):
        return self.drafts[name] if name in self.drafts else super().get(category, name)


def draft_sheets():
    sheets = Drafts()
    for surface in SURFACES:
        base = sheets.get('nature', surface.base())[0]
        for corner in CORNERS:
            sheets.add(surface.corner(corner), RoundedCorner(corner, CORNER_RADIUS).image(base), (TILE // 2, TILE - 1))
    return sheets


class Scene:
    """A piece of ground on grass, with sprites that stand on their tiles and are drawn back to front."""

    def __init__(self, sheets, cols, rows):
        self.sheets, self.cols, self.rows = sheets, cols, rows
        self.tiles = {}                  # (x, y) -> (category, name), laid over the grass
        self.sprites = []                # (ground y, centre x, order, category, name)

    def lay(self, x, y, category, name):
        self.tiles[(x, y)] = (category, name)

    def place(self, category, name, tx, ty):
        """A sprite by its footprint's top-left tile, anchored at the footprint's bottom centre."""
        fw, fh = self.sheets.frame(category, name).get('footprint', [1, 1])
        self.stand(category, name, tx * TILE + fw * TILE // 2, (ty + fh) * TILE - 1)

    def stand(self, category, name, gx, gy):
        self.sprites.append((gy, gx, len(self.sprites), category, name))

    def person(self, hue, facing, tx, ty):
        gx, gy = tx * TILE + TILE // 2, ty * TILE + 14
        self.stand('characters', f'blob_{hue}_stand_{facing}', gx, gy)
        if facing != 'up':
            self.stand('characters', f'face_neutral_{facing}', gx, gy)

    def render(self):
        image = Image.new('RGBA', (self.cols * TILE, self.rows * TILE))
        for y in range(self.rows):
            for x in range(self.cols):
                image.alpha_composite(self.sheets.get('nature', tile_name(x, y))[0], (x * TILE, y * TILE))
                if (x, y) in self.tiles:
                    image.alpha_composite(self.sheets.get(*self.tiles[(x, y)])[0], (x * TILE, y * TILE))
        for ground, cx, _, category, name in sorted(self.sprites):
            im, (ax, ay) = self.sheets.get(category, name)
            image.alpha_composite(im, (cx - ax, ground - ay))
        return image


class Octagon:
    """The top half of an octagon's ring line in one material: the north line, a cut at each end that steps
    down to the side lines, and a tower or post on every vertex (ruling 5). `x0` is the west line's column,
    `y0` the north line's row, `cut` how far each cut runs along each axis and `length` the north line's tiles."""

    def __init__(self, material, x0, y0, cut, length):
        self.material, self.x0, self.y0, self.cut, self.length = material, x0, y0, cut, length

    def build(self, scene):
        m, c, size = self.material, self.cut, self.material['size']
        west = self.x0 + c
        east = west + self.length - 1
        below = self.y0 + c
        scene.place('walls', m['north'][0], west, self.y0)
        scene.place('walls', m['north'][1], east - size + 1, self.y0)
        for x in range(west + size, east - size + 1):
            scene.place('walls', m['run'], x, self.y0)
        for k in range(1, c):
            scene.place('walls', f"{m['cut']}-up", west - k, self.y0 + k)
            scene.place('walls', f"{m['cut']}-down", east + k, self.y0 + k)
        scene.place('walls', m['below'][0], self.x0, below)
        scene.place('walls', m['below'][1], east + c - size + 1, below)
        for y in range(below + size, scene.rows):
            scene.place('walls', m['side'], self.x0, y)
            scene.place('walls', m['side'], east + c, y)


def corner_scene(sheets, material):
    scene = Scene(sheets, 19, 13)
    Octagon(material, x0=1, y0=3, cut=5, length=7).build(scene)
    for category, name, tx, ty in INSIDE:
        scene.place(category, name, tx, ty)
    for name, tx, ty in TREES:
        scene.place('nature', name, tx, ty)
    for hue, facing, tx, ty in PEOPLE:
        scene.person(hue, facing, tx, ty)
    image = scene.render()
    label(image, 4, 4, 'NW AND SE CUTS - DIAGONAL-UP')
    east_label = 'NE AND SW CUTS - DIAGONAL-DOWN'
    label(image, image.width - 4 - (4 * len(east_label) + 3), 4, east_label)
    return image


def inside(a, b, x, y):
    """Whether the point (x, y), in half tiles from the centre, lies in an ellipse of semi-axes (a, b) half tiles."""
    return x * x * b * b + y * y * a * a <= a * a * b * b


def ellipse_band(a, b, width):
    """The cells of a street `width` tiles wide round an ellipse that reaches `a` and `b` tiles out from its
    centre tile, from (0, 0) at the top left of its box: inside the outer ellipse and not inside the inner."""
    outer, inner = (2 * a + 1, 2 * b + 1), (2 * a + 1 - 2 * width, 2 * b + 1 - 2 * width)
    cells = set()
    for dy in range(-b, b + 1):
        for dx in range(-a, a + 1):
            if inside(*outer, 2 * dx, 2 * dy) and not inside(*inner, 2 * dx, 2 * dy):
                cells.add((dx + a, dy + b))
    return cells


def link(cells):
    """Add the cell below wherever two cells touch only at a corner, so a thin band stays 4-connected."""
    out = set(cells)
    for x, y in cells:
        for dx in (-1, 1):
            if (x + dx, y + 1) in cells and (x + dx, y) not in cells and (x, y + 1) not in cells:
                out.add((x, y + 1))
    return out


class Street:
    """A street of one surface on a set of cells, laid as plain fill tiles or with each outer corner rounded."""

    def __init__(self, surface, cells):
        self.surface, self.cells = surface, cells

    def outer_corner(self, x, y):
        for corner, (dx, dy) in CORNERS.items():
            if (x + dx, y) not in self.cells and (x, y + dy) not in self.cells:
                return corner
        return None

    def lay(self, scene, rounded, ox=0, oy=0):
        """Lay the street's cells onto the scene, whose tile (0, 0) is the street's cell (ox, oy)."""
        for y in range(scene.rows):
            for x in range(scene.cols):
                cell = (x + ox, y + oy)
                if cell in self.cells:
                    corner = self.outer_corner(*cell) if rounded else None
                    scene.lay(x, y, 'nature', self.surface.corner(corner) if corner else self.surface.fill(*cell))


def ring_scene(sheets, rounded):
    scene = Scene(sheets, 19, 13)
    Street(COBBLES, link(ellipse_band(8, 5, COBBLES.width))).lay(scene, rounded, ox=-1, oy=-1)
    for x in range(8, 11):
        for y in range(5, 8):
            scene.lay(x, y, 'nature', 'terrain_paving')
    scene.place('nature', 'prop_well', 9, 6)
    for tx, ty in ((2, 2), (16, 2), (2, 10), (16, 10)):
        scene.place('nature', 'tree_deciduous_young', tx, ty)
    for hue, facing, tx, ty in (('sun', 'right', 9, 1), ('lilac', 'down', 16, 6), ('mint', 'left', 8, 11)):
        scene.person(hue, facing, tx, ty)
    return scene.render()


def bend_scene(sheets, surface, rounded, a=7, b=5):
    """A quarter of a ring in one surface: a street turning from running east to running south."""
    scene = Scene(sheets, a + 1, b + 1)
    Street(surface, link(ellipse_band(a, b, surface.width))).lay(scene, rounded, ox=a)
    image = scene.render()
    label(image, 4, image.height - 13, 'WITH' if rounded else 'WITHOUT')
    return image


def corner_swatch(sheets, surface, corner):
    """One corner tile on grass, at twice its size."""
    scene = Scene(sheets, 1, 1)
    scene.lay(0, 0, 'nature', surface.corner(corner))
    return scene.render().resize((SWATCH, SWATCH), Image.NEAREST)


class Board:
    """The preview sheet at its native size, built downward: headings, framed scenes and their captions."""

    GAP = 16

    def __init__(self, width, height):
        self.image = Image.new('RGBA', (width, height), PAPER)
        self.y = 8

    def heading(self, s):
        self.image.paste(BAND, (0, self.y, self.image.width, self.y + 11))
        text(self.image, 6, self.y + 3, s, PLATE)
        self.y += 15

    def framed(self, scene, x, y):
        self.image.paste(INK, (x - 1, y - 1, x + scene.width + 1, y + scene.height + 1))
        self.image.paste(scene, (x, y))

    def pair(self, left, right, captions):
        """Two scenes side by side, centred, each with its caption lines under it."""
        x = (self.image.width - left.width - right.width - self.GAP) // 2
        for scene, lines in zip((left, right), captions):
            self.framed(scene, x, self.y)
            for i, line in enumerate(lines):
                label(self.image, x, self.y + scene.height + 3 + 10 * i, line)
            x += scene.width + self.GAP
        self.y += left.height + 3 + 10 * len(captions[0]) + 6

    def surface(self, sheets, surface, x, y):
        """A surface's column: its four corner tiles at twice their size, then a stepped bend without them and
        with. Returns the y below it."""
        label(self.image, x, y, surface.title)
        y += 13
        for i, corner in enumerate(CORNER_NAMES):
            swatch_x = x + i * (SWATCH + SWATCH_GAP)
            self.framed(corner_swatch(sheets, surface, corner), swatch_x, y)
            text(self.image, swatch_x + SWATCH // 2 - 3, y + SWATCH + 3, corner, INK)
        y += SWATCH + 13
        for rounded in (False, True):
            bend = bend_scene(sheets, surface, rounded)
            self.framed(bend, x, y)
            y += bend.height + 6
        return y

    def surfaces(self, sheets):
        """The surfaces' columns across the sheet, each as wide as its four corner tiles."""
        width = 4 * SWATCH + 3 * SWATCH_GAP
        column = width + 10
        left = (self.image.width - column * len(SURFACES) + 10) // 2
        bottoms = [self.surface(sheets, s, left + i * column, self.y) for i, s in enumerate(SURFACES)]
        self.y = max(bottoms) + 2

    def save(self, path, scale):
        im = self.image.crop((0, 0, self.image.width, self.y))
        path.parent.mkdir(parents=True, exist_ok=True)
        im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(path, optimize=True)
        return im.width * scale, im.height * scale


def varied_preview():
    sheets = draft_sheets()
    board = Board(SHEET_WIDTH, 1000)
    board.heading('1 AN OCTAGON CORNER IN STONE AND IN PALISADE - '
                  'THE NEW DIAGONAL RUNS AND A TOWER OR POST ON EVERY VERTEX')
    board.pair(corner_scene(sheets, STONE_PIECES), corner_scene(sheets, PALISADE_PIECES),
               (('STONE - WALL_DIAGONAL-UP AND WALL_DIAGONAL-DOWN',
                 'A 2X2 TOWER ON EVERY VERTEX - TODAYS TOWERS AND RUNS'),
                ('PALISADE - PALISADE_DIAGONAL-UP AND PALISADE_DIAGONAL-DOWN',
                 'A 1X1 POST ON EVERY VERTEX - THE TWO ON THE NORTH LINE ARE NEW')))
    board.heading('2 A STEPPED RING STREET - TODAYS PLAIN FILL TILES THEN WITH THE 16 OPTIONAL CORNER TILES')
    board.pair(ring_scene(sheets, False), ring_scene(sheets, True),
               (('WITHOUT - PLAIN COBBLES',), ('WITH - THE OUTER CORNERS ROUNDED BY THE CORNER TILES',)))
    board.heading('THE 16 CORNER TILES AT TWICE THE SIZE - AND A STEPPED BEND IN EACH SURFACE WITHOUT THEN WITH THEM')
    board.surfaces(sheets)
    width, height = board.save(VARIED_OUT, VARIED_SCALE)
    print(f'wrote {VARIED_OUT} ({width}x{height})')


def main():
    if 'varied' in sys.argv[1:]:
        varied_preview()
        return
    scene = build_scene()
    scene.resize((scene.width * SCALE, scene.height * SCALE), Image.NEAREST).save(OUT)
    print(f'wrote {OUT} ({scene.width * SCALE}x{scene.height * SCALE})')


if __name__ == '__main__':
    main()
