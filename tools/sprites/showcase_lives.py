"""Draw M3.2 Task 1's mockups for the owner's pick: blobs with lives of their own.

Three new 12x12 emote bubbles, speech, music and ball, each in two variants on icons.py's bubble base and set beside
today's heart, question and coin; then five town scenes that show them in place. The A variants ship from icons.py
(M3.2 Task 9) until the owner picks. The drafts stay here as the owner saw them: PICKS sets the variant each scene
shows, and shipping a B means copying its grid over the one in icons.EMOTES.

Everything is drawn from the sprites in assets/sprites/ and the blob in characters.py. The town's own placing rules
carry over: a person anchors 14 px down its tile, a prop 12 px, a sitter on a bench is lifted 5 px onto the seat, and
an emote hangs 7 px right of its blob and 15 px above the face (packages/render-gl/src/place/sprites.ts).

Writes docs/mockups/m3.2-lives/: the bubble sheet at 8x, 4x, 2x and 1x, the scenes at 4x.
"""
import sys
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import characters as ch  # noqa: E402
import icons  # noqa: E402
import spritekit as sk  # noqa: E402
from showcase import Sheets, tile_name  # noqa: E402
from showcase_buildings import label  # noqa: E402
from spritekit import ASSETS, TILE  # noqa: E402

OUT = ASSETS.parents[1] / 'docs' / 'mockups' / 'm3.2-lives'
SCALE = 4
PAPER = (226, 230, 214, 255)
# The variant each scene shows, until the owner picks.
PICKS = {'speech': 'a', 'music': 'a', 'ball': 'a'}

# ---------------------------------------------------------------------------- the new bubbles
# Drawn like icons.EMOTES: 12x12 over icons.BUBBLE, '.' keeps the bubble underneath. Every pixel sits on the white of
# the bubble's body, rows 1 to 8, so the ring and the tail stay clear. Colours keep clear of the police navy, the
# merchant teal and the reds and oranges of crime, and the ball is a plain toy, never a split red and white one.
NEW = {
    'speech': {
        'a': [  # three dots
            "............",
            "............",
            "............",
            "............",
            "..23.23.23..",
            "..33.33.33..",
            "............",
            "............",
            "............",
            "............",
            "............",
            "............",
        ],
        'b': [  # three lines of talk
            "............",
            "............",
            "..33333333..",
            "............",
            "..333333....",
            "............",
            "..33333.....",
            "............",
            "............",
            "............",
            "............",
            "............",
        ],
    },
    'music': {
        'a': [  # two notes under one beam
            "............",
            "............",
            ".....MMMMM..",
            "....QMMMMM..",
            "....M....M..",
            "....M....M..",
            "..QMM..QMM..",
            "..MM...MM...",
            "............",
            "............",
            "............",
            "............",
        ],
        'b': [  # one eighth note
            "............",
            "............",
            ".....MM.....",
            ".....M.MM...",
            ".....M..M...",
            "..QMMM......",
            "..MMMM......",
            "...MM.......",
            "............",
            "............",
            "............",
            "............",
        ],
    },
    'ball': {
        'a': [  # a blue toy ball with a shine
            "............",
            "............",
            ".....333....",
            "....3AWa3...",
            "...3AAaaa3..",
            "...3Aaaaa3..",
            "...3aaaaj3..",
            "....3aaj3...",
            ".....333....",
            "............",
            "............",
            "............",
        ],
        'b': [  # a green ball with a white seam
            "............",
            "............",
            ".....fff....",
            "....fGWgf...",
            "...fGWgggf..",
            "...fWggggf..",
            "...fGWgggf..",
            "....fGWgf...",
            ".....fff....",
            "............",
            "............",
            "............",
        ],
    },
}
WORDS = {'speech_a': 'THREE DOTS', 'speech_b': 'THREE LINES', 'music_a': 'TWO NOTES', 'music_b': 'ONE NOTE',
         'ball_a': 'BLUE BALL', 'ball_b': 'GREEN BALL'}
TODAY = ('heart', 'question', 'coin')
BODY_ROWS = 9           # the bubble's tail starts on row 9


class Emote:
    """A bubble: a glyph grid on icons.py's base, anchored at the tail tip."""

    def __init__(self, name, rows):
        self.name, self.rows = name, rows
        stray = self.strays()
        if stray:
            raise ValueError(f'emote {name}: glyph pixels off the bubble body at {stray}')
        self.picture = self.draw()

    def strays(self):
        """Glyph pixels that are not on the white of the bubble's body."""
        return [(x, y) for y, (glyph, base) in enumerate(zip(self.rows, icons.BUBBLE))
                for x, (g, b) in enumerate(zip(glyph, base)) if g != '.' and (b != 'W' or y >= BODY_ROWS)]

    def draw(self):
        rows = [''.join(g if g != '.' else b for g, b in zip(glyph, base))
                for glyph, base in zip(self.rows, icons.BUBBLE)]
        return sk.from_ascii(rows, icons.KEY)


def emotes():
    """Every bubble by name: today's, then the new ones as speech_a, speech_b and so on."""
    out = {name: Emote(name, icons.EMOTES[name]) for name in TODAY}
    for kind, variants in NEW.items():
        out.update({f'{kind}_{v}': Emote(f'{kind}_{v}', rows) for v, rows in variants.items()})
    return out


BUBBLES = emotes()


def picked(kind):
    """The picked variant of a new bubble."""
    return BUBBLES[f'{kind}_{PICKS[kind]}']


def mix(i, salt):
    """A fixed shuffle of small integers, so a crowd's looks are mixed the same way on every run."""
    x = (i * 0x9E3779B1 + salt * 0x85EBCA6B + 0x27D4EB2F) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x2C1B3C6D) & 0xFFFFFFFF
    return x ^ (x >> 12)


class Look:
    """A blob's random look as drawn at birth: hue, eye shape and pattern, none of it read by any rule."""

    HUES, EYES, PATTERNS = tuple(sk.BODY_HUES), ch.EYES, ('plain', 'speckle', 'spots', 'patch')

    def __init__(self, hue, eyes='round', pattern='plain'):
        self.hue, self.eyes, self.pattern = hue, eyes, pattern

    @classmethod
    def nth(cls, i):
        """The i-th look of the shuffle: hue, eyes and pattern each drawn on their own."""
        return cls(cls.HUES[mix(i, 1) % 6], cls.EYES[mix(i, 2) % 4], cls.PATTERNS[mix(i, 3) % 4])

    def blob(self, pose, facing):
        return ch.character(pose, facing, None, 'neutral', self.hue, self.eyes, self.pattern)


# ---------------------------------------------------------------------------- scenes
GROUND = {
    'paving': lambda x, y: ('nature', 'terrain_paving'),
    'cobbles': lambda x, y: ('nature', f'terrain_cobbles_{(x * 7 + y * 13) % 5 % 2}'),
    'lane': lambda x, y: ('nature', 'terrain_dirt-path'),
    'meadow': lambda x, y: ('scenery', f'terrain_meadow_{(x * 7 + y * 13) % 5 % 3}'),
    'water': lambda x, y: ('nature', 'terrain_water_0'),
}
SIDES = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
CORNERS = {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}
PERSON_Y, PROP_Y, LIFT = 14, 12, 5      # the town's anchor rows in a tile, and a bench sitter's lift
EMOTE_X, EMOTE_Y = 7, -15
DUSK, DUSK_STRENGTH = (58, 64, 140), 0.28


class Scene:
    """A grid of terrain and the sprites on it, drawn back to front, with bubbles over them all."""

    def __init__(self, cols, rows):
        self.atlas = Sheets()
        self.cols, self.rows = cols, rows
        self.kind = [['grass'] * cols for _ in range(rows)]
        self.sprites = []       # (sort y, order, image, top-left)
        self.lights = []        # lit windows, drawn only after dusk
        self.signs = []         # bubbles, drawn last
        self.dusk = 0.0

    def fill(self, kind, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.kind[y][x] = kind

    def wet(self, x, y):
        return 0 <= x < self.cols and 0 <= y < self.rows and self.kind[y][x] == 'water'

    def tile(self, x, y):
        kind = self.kind[y][x]
        if kind in GROUND and kind != 'meadow':
            return GROUND[kind](x, y)
        wet = {side for side, (dx, dy) in SIDES.items() if self.wet(x + dx, y + dy)}
        for corner in CORNERS:
            if set(corner) <= wet:
                return 'scenery', f'shore_grass_{corner}-outer_0'
        for side in 'nesw':
            if side in wet:
                return 'scenery', f'shore_grass_{side}_0'
        for corner, (dx, dy) in CORNERS.items():
            if self.wet(x + dx, y + dy):
                return 'scenery', f'shore_grass_{corner}-inner_0'
        return GROUND[kind](x, y) if kind in GROUND else ('nature', tile_name(x, y))

    def put(self, image, gx, gy, anchor, sort=None):
        self.sprites.append((gy if sort is None else sort, len(self.sprites), image, (gx - anchor[0], gy - anchor[1])))

    def sprite(self, category, name, gx, gy):
        image, anchor = self.atlas.get(category, name)
        ground = self.atlas.frame(category, name).get('layer') == 'ground'
        self.put(image, gx, gy, anchor, -1 if ground else None)

    def building(self, category, name, tx, ty):
        """A building by the top-left tile of its footprint, anchored at the footprint's bottom centre. Returns its
        door tile's point: where a person at the door stands."""
        frame = self.atlas.frame(category, name)
        fw, fh = frame['footprint']
        gx, gy = tx * TILE + fw * TILE // 2, (ty + fh) * TILE - 1
        self.sprite(category, name, gx, gy)
        if 'night' in frame:
            image, anchor = self.atlas.get(category, frame['night'])
            self.lights.append((image, (gx - anchor[0], gy - anchor[1])))
        door_x = gx - frame['anchor'][0] + frame['door'][0] if 'door' in frame else gx
        return door_x, (ty + fh) * TILE + PERSON_Y

    def house(self, shape, style, roof, tx, ty):
        return self.building('houses', f'house_{style}_{shape}_roof-{roof}', tx, ty)

    def lane(self, door, street, garden=None):
        """A dirt spur from a door's tile down to the street's first row, two tiles wide under a door that sits on a
        tile edge, with `garden` props either side of it."""
        tx, ty = door[0] // TILE, door[1] // TILE
        first = tx - 1 if door[0] % TILE == 0 else tx
        self.fill('lane', first, ty, tx, street - 1)
        for x in ((first - 1, tx + 1) if garden else ()):
            self.prop('nature', garden, x, ty)

    def prop(self, category, name, tx, ty, wide=1):
        """A prop centred in its tile, on the town's prop row."""
        frame = self.atlas.frame(category, name)
        gx = tx * TILE + (wide * TILE - frame['w']) // 2 + frame['anchor'][0]
        self.sprite(category, name, gx, ty * TILE + PROP_Y)

    def tree(self, name, tx, ty):
        self.sprite('scenery' if name == 'tree_blossom' else 'nature', name, tx * TILE + 8, ty * TILE + PERSON_Y)

    def blob(self, look, pose, facing, gx, gy, sign=None, lift=0, sort=None):
        """A person with its feet at (gx, gy); `sign` hangs a bubble the way the town does."""
        self.put(look.blob(pose, facing), gx, gy - lift, ch.ANCHOR, gy if sort is None else sort)
        if sign:
            face_y = ch.face_offset(pose, facing)[1]
            tip = (gx + EMOTE_X, gy - lift + face_y + EMOTE_Y)
            self.signs.append((sign.picture, (tip[0] - icons.BUBBLE_TIP[0], tip[1] - icons.BUBBLE_TIP[1])))

    def sit_on_bench(self, look, tx, ty, sign=None, facing='down'):
        """A bench on a tile, and a blob lifted onto its seat, drawn over it."""
        self.prop('nature', 'prop_bench', tx, ty)
        seat = ty * TILE + PROP_Y + 1
        self.blob(look, 'sit', facing, tx * TILE + 8, seat, sign, lift=LIFT, sort=seat)

    def render(self):
        image = Image.new('RGBA', (self.cols * TILE, self.rows * TILE))
        for y in range(self.rows):
            for x in range(self.cols):
                image.alpha_composite(self.atlas.get(*self.tile(x, y))[0], (x * TILE, y * TILE))
        for _, _, sprite, at in sorted(self.sprites, key=lambda s: s[:2]):
            image.alpha_composite(sprite, at)
        if self.dusk:
            image = Image.blend(image, Image.new('RGBA', image.size, DUSK + (255,)), self.dusk)
        for sprite, at in (self.lights if self.dusk else []) + self.signs:
            image.alpha_composite(sprite, at)
        return image


def scaled(image, k):
    return image.resize((image.width * k, image.height * k), Image.NEAREST)


def save(image, name, k=SCALE):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    scaled(image, k).convert('RGB').save(path, optimize=True)
    print(f'{path}  {image.width * k}x{image.height * k}')


# ---------------------------------------------------------------------------- the five scenes
def chat():
    """Two free walkers stop face to face in the street, each under the same speech bubble."""
    s = Scene(16, 8)
    s.fill('cobbles', 0, 5, 15, 6)
    s.lane(s.house('detached', 'cottage', 'thatch', 1, 1), 5, 'prop_flower-patch')
    s.lane(s.house('cabin', 'brick', 'slate', 11, 1), 5, 'prop_flower-patch')
    for tx, ty in ((0, 7), (14, 7)):
        s.tree('tree_deciduous_mature', tx, ty)
    s.prop('nature', 'prop_well', 6, 4)
    s.prop('nature', 'prop_bench', 4, 7)
    s.prop('nature', 'prop_planter', 9, 7)
    s.blob(Look('rose', 'wide', 'spots'), 'stand', 'right', 116, 100, picked('speech'))
    s.blob(Look('mint', 'round'), 'stand', 'left', 136, 100, picked('speech'))
    return s


def doorstep():
    """Evening on a street of homes: blobs sit at their doors, and one walker stops to talk with a neighbour."""
    s = Scene(20, 10)
    s.dusk = DUSK_STRENGTH
    s.fill('cobbles', 0, 7, 19, 8)
    homes = (('detached', 'timber', 'thatch', 1, 3), ('detached', 'brick', 'slate', 5, 3),
             ('hut', 'plaster', 'terracotta', 9, 4), ('detached', 'cottage', 'plum', 12, 3),
             ('cabin', 'stone', 'green', 16, 3))
    doors = [s.house(shape, style, roof, tx, ty) for shape, style, roof, tx, ty in homes]
    for door in doors:
        s.lane(door, 7)
    for tx, ty, name in ((0, 1, 'tree_deciduous_mature'), (8, 1, 'tree_fruit'), (11, 1, 'tree_conifer'),
                         (19, 2, 'tree_deciduous_young'), (4, 9, 'tree_deciduous_mature'), (16, 9, 'tree_fruit')):
        s.tree(name, tx, ty)
    for tx, ty in ((4, 5), (8, 5), (11, 5), (15, 5)):
        s.prop('nature', 'prop_bush', tx, ty)
    s.blob(Look('sun', 'wide'), 'sit', 'down', *doors[0])
    s.blob(Look('lilac', 'dot', 'patch'), 'sit', 'right', *doors[1], picked('speech'))
    s.blob(Look('mint', 'round'), 'stand', 'left', doors[1][0] + 22, doors[1][1] + 3, picked('speech'))
    s.blob(Look('rose', 'tall', 'speckle'), 'sit', 'down', *doors[3])
    s.blob(Look('silver', 'round', 'spots'), 'walk_0', 'right', 214, 8 * TILE + 8)
    return s


def plaza():
    """Five o'clock on the plaza: the after-work crowd, a chatting pair, and three blobs under the ball bubble."""
    s = Scene(19, 12)
    s.fill('cobbles', 0, 4, 18, 4)
    s.fill('paving', 1, 5, 17, 10)
    for name, tx in (('shop_bakery', 1), ('shop_general', 6), ('shop_draper_rail', 11)):
        s.building('buildings', name, tx, 2)
    s.house('townhouse-left', 'brick', 'terracotta', 16, 0)
    s.sprite('landmarks', 'landmark_fountain_0', 8 * TILE + 24, 8 * TILE - 1)
    for tx, ty in ((2, 5), (16, 5), (2, 10), (16, 10)):
        s.prop('nature', 'prop_lamp-post', tx, ty)
    for tx in (6, 12):
        s.prop('nature', 'prop_planter', tx, 5)
    s.prop('nature', 'prop_notice-board', 15, 5)
    for tx, ty in ((0, 6), (0, 9), (18, 6), (18, 9)):
        s.tree('tree_deciduous_mature', tx, ty)
    for tx in (5, 13):
        s.prop('nature', 'prop_bench', tx, 9)
    s.sit_on_bench(Look.nth(4), 4, 9)
    s.sit_on_bench(Look.nth(9), 14, 9)
    s.blob(Look('rose', 'wide', 'spots'), 'stand', 'right', 84, 124, picked('speech'))
    s.blob(Look('ice', 'tall', 'speckle'), 'stand', 'left', 104, 124, picked('speech'))
    for look, facing, gx, gy in ((Look('mint', 'round'), 'down', 214, 116), (Look('sun', 'wide'), 'left', 250, 130),
                                 (Look('lilac', 'dot', 'patch'), 'right', 186, 170)):
        s.blob(look, 'stand', facing, gx, gy, picked('ball'))
    # Backs show no face, so the ones turned to the fountain and the shop wear patterns that read on a back.
    for look, pose, facing, gx, gy in ((Look('lilac', 'wide', 'speckle'), 'stand', 'up', 142, 150),
                                       (Look('rose', 'dot', 'patch'), 'stand', 'up', 168, 152),
                                       (Look('sun', 'round', 'spots'), 'stand', 'up', 128, 81)):
        s.blob(look, pose, facing, gx, gy)
    for i, (pose, facing, gx, gy) in enumerate((('stand', 'down', 118, 168), ('walk_0', 'left', 70, 104),
                                                 ('walk_1', 'right', 50, 140))):
        s.blob(Look.nth(20 + i), pose, facing, gx, gy)
    return s


def water():
    """A pond's north shore: a blob on a bench at the water with a heart, and one on the green with music."""
    s = Scene(18, 10)
    s.fill('meadow', 0, 0, 5, 9)
    for row, (x0, x1) in enumerate(((7, 16), (6, 17), (5, 17), (5, 17), (6, 17), (8, 16)), start=4):
        s.fill('water', x0, row, x1, row)
    for tx, ty in ((9, 6), (13, 7), (10, 8)):
        s.prop('scenery', 'prop_lily-pads_0', tx, ty)
    for tx, ty in ((7, 4), (16, 4), (5, 6), (17, 9)):
        s.prop('scenery', 'prop_reeds', tx, ty)
    s.prop('scenery', 'prop_beach-rocks', 15, 4)
    for tx, ty, name in ((3, 1, 'tree_blossom'), (9, 1, 'tree_deciduous_mature'), (15, 1, 'tree_deciduous_young'),
                         (1, 7, 'tree_deciduous_mature')):
        s.tree(name, tx, ty)
    s.prop('nature', 'prop_lamp-post', 10, 2)
    for tx in (4, 12):
        s.prop('nature', 'prop_bench', tx, 3)
    s.sit_on_bench(Look('lilac', 'dot', 'patch'), 3, 3, picked('music'))
    s.sit_on_bench(Look('ice', 'tall', 'speckle'), 13, 3, BUBBLES['heart'])
    return s


def visit():
    """A visit turned back: the friend is out, and the visitor waits at its door under a question."""
    s = Scene(16, 9)
    s.fill('cobbles', 0, 6, 15, 7)
    door = s.house('detached', 'brick', 'terracotta', 3, 2)
    s.lane(door, 6, 'prop_flower-patch')
    s.lane(s.house('cabin', 'plaster', 'green', 10, 2), 6, 'prop_flower-patch')
    for tx, ty, name in ((0, 2, 'tree_deciduous_mature'), (8, 1, 'tree_fruit'), (15, 3, 'tree_conifer'),
                         (1, 8, 'tree_deciduous_young'), (13, 8, 'tree_deciduous_mature')):
        s.tree(name, tx, ty)
    s.prop('nature', 'prop_lamp-post', 7, 5)
    s.blob(Look('sun', 'wide', 'spots'), 'stand', 'up', door[0], door[1] + 1, BUBBLES['question'])
    return s


SCENES = (('02-chatting-pair.png', chat), ('03-doorstep-evening.png', doorstep), ('04-plaza-at-17.png', plaza),
          ('05-bench-by-water.png', water), ('06-visit-turned-back.png', visit))


# ---------------------------------------------------------------------------- the bubble sheet
GAP, MARGIN, BIG, LABELS = 12, 16, 8, 90
CELL, PAIR_CELL = TILE * BIG, 3 * TILE * 4      # a bubble's grass tile at 8x, and its blob's 3x2 tiles at 4x
ROW = CELL + 30                                 # a row of the sheet with its caption
STRIPS = ((2, 'AT 2X'), (1, 'AT 1X'))
GROUPS = (TODAY, ('speech_a', 'speech_b'), ('music_a', 'music_b'), ('ball_a', 'ball_b'))


def caption(text, k=2):
    plate = Image.new('RGBA', (4 * len(text) + 3, 9))
    label(plate, 0, 0, text)
    return scaled(plate, k)


def on_grass(emote, k):
    """The bubble alone on one grass tile, scaled k times."""
    tile = Scene(1, 1).render()
    tile.alpha_composite(emote.picture, (2, 2))
    return scaled(tile, k)


def in_place(emote, pair):
    """A blob under the bubble, or two facing each other for speech, on 3x2 grass tiles at 4x."""
    scene = Scene(3, 2)
    if pair:
        scene.blob(Look('rose', 'wide', 'spots'), 'stand', 'right', 15, 30, emote)
        scene.blob(Look('mint', 'round'), 'stand', 'left', 34, 30, emote)
    else:
        scene.blob(Look('lilac', 'dot', 'patch'), 'stand', 'down', 18, 30, emote)
    return scaled(scene.render(), 4)


def sheet_rows():
    """(title, cells) for today's bubbles and each new kind; a cell is (bubble, caption, blobs in place), the last
    None where the bubble has no blob beside it."""
    rows = [('TODAY', [(name, name.upper(), None) for name in TODAY])]
    for kind, variants in NEW.items():
        cells = []
        for v in variants:
            name = f'{kind}_{v}'
            cells.append((name, f'{v.upper()} {WORDS[name]}', 'pair' if kind == 'speech' else 'one'))
        rows.append((kind.upper(), cells))
    return rows


def sheet_row(canvas, y, title, cells):
    canvas.alpha_composite(caption(title, 3), (MARGIN, y + CELL // 2 - 13))
    wide = CELL if cells[0][2] is None else CELL + GAP + PAIR_CELL
    for j, (name, words, blobs) in enumerate(cells):
        x = MARGIN + LABELS + j * (wide + GAP)
        canvas.alpha_composite(on_grass(BUBBLES[name], BIG), (x, y))
        if blobs:
            canvas.alpha_composite(in_place(BUBBLES[name], blobs == 'pair'), (x + CELL + GAP, y))
        canvas.alpha_composite(caption(words), (x, y + CELL + 4))


def sheet_notes(canvas, y):
    picks = '  '.join(f'{kind.upper()} {v.upper()}' for kind, v in PICKS.items())
    for i, line in enumerate(('PICK A OR B IN EACH ROW', 'THE SCENES SHOW MY PICKS', picks)):
        canvas.alpha_composite(caption(line), (MARGIN + LABELS + 3 * (CELL + GAP) + GAP, y + 8 + i * 26))


def sheet_strip(canvas, y, k, title):
    """Every bubble on its own grass tile at the game's scale k, grouped as above."""
    canvas.alpha_composite(caption(title, 3), (MARGIN, y + TILE * k // 2 - 9))
    x = MARGIN + LABELS
    for group in GROUPS:
        for name in group:
            canvas.alpha_composite(on_grass(BUBBLES[name], k), (x, y))
            x += TILE * k + 2
        x += 8


def bubble_sheet():
    """Today's bubbles, then each new one in two variants: at 8x, over a blob at 4x, and at the game's own 2x and 1x."""
    rows = sheet_rows()
    width = MARGIN * 2 + LABELS + 2 * (CELL + GAP + PAIR_CELL + GAP)
    height = MARGIN + len(rows) * ROW + sum(TILE * k + 14 for k, _ in STRIPS)
    canvas = Image.new('RGBA', (width, height), PAPER)
    y = MARGIN
    sheet_notes(canvas, y)
    for title, cells in rows:
        sheet_row(canvas, y, title, cells)
        y += ROW
    for k, title in STRIPS:
        sheet_strip(canvas, y, k, title)
        y += TILE * k + 14
    return canvas


def main():
    print(f'{len(BUBBLES)} bubbles, every glyph inside its bubble')
    save(bubble_sheet(), '01-bubbles.png', 1)
    for name, scene in SCENES:
        save(scene().render(), name)


if __name__ == '__main__':
    main()
