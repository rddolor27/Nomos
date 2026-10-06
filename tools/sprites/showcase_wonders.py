"""Compose two landscapes from the wonders, landmarks and scenery sheets, as a visual check and a preview.

Writes docs/mockups/wonders_showcase.png (natural wonders) and docs/mockups/landmarks_showcase.png
(built landmarks), each drawn at 480x270 and scaled 2x. Terrain rows use g grass, m meadow, s sand,
w water and p paving; shores are picked from each land cell's water neighbours.
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from showcase import Sheets  # noqa: E402
from spritekit import ASSETS, TILE  # noqa: E402

MOCKUPS = ASSETS.parents[1] / 'docs' / 'mockups'
W, H, SCALE = 480, 270, 2
SIDES = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
CORNERS = {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}

WONDERS_MAP = [
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggssssswwwwww',
    'gggggggggggggggggggsssssswwwww',
    'gggggggggggggggggggsssssswwwww',
    'ggggggggggggggggggssssssswwwww',
    'ggggggggggggggggggsssssssswwww',
    'ggggggggggggggggggssssssssswww',
    'gggggggggggggggggsssssssssssss',
    'mmmmmmmgggggggggggssssssssssss',
    'mmmmmmmgggggggggggssssssssssss',
    'mmmmmmmggggggggmmmssssssssssss',
    'mmmmmmmggggggggmmmssssssssssss',
    'mmmmmmmggggggggmmmssssssssssss',
]

LANDMARKS_MAP = [
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwggggpppppgggggsswwwww',
    'gggggggwwggggpppppgggggsswwwww',
    'gggggggwwggggpppppggmmmsswwwww',
    'gggggggwwggggpppppggmmmsswwwww',
    'gggggggwwgggggggggggmmmsswwwww',
    'gggggggwwgggggggggggmmmsswwwww',
    'gggggggwwggggggggggggggsswwwww',
    'gggggggwwggggggggggggggsswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
    'gggggggwwgggggggggggggssswwwww',
]


class Scene:
    def __init__(self, rows):
        self.rows = rows
        self.sheets = Sheets()
        self.image = Image.new('RGBA', (W, H), (0, 0, 0, 255))
        self.ground, self.standing = [], []

    def is_water(self, x, y):
        inside = 0 <= y < len(self.rows) and 0 <= x < len(self.rows[0])
        return inside and self.rows[y][x] == 'w'

    def tile_for(self, x, y):
        cell = self.rows[y][x]
        if cell == 'w':
            return 'nature', 'terrain_water_0'
        kind = 'sand' if cell == 's' else 'grass'
        wet = {side for side, (dx, dy) in SIDES.items() if self.is_water(x + dx, y + dy)}
        for corner in CORNERS:
            if set(corner) <= wet:
                return 'scenery', f'shore_{kind}_{corner}-outer_0'
        for side in 'nesw':
            if side in wet:
                return 'scenery', f'shore_{kind}_{side}_0'
        for corner, (dx, dy) in CORNERS.items():
            if self.is_water(x + dx, y + dy):
                return 'scenery', f'shore_{kind}_{corner}-inner_0'
        if cell == 'm':
            return 'scenery', f'terrain_meadow_{(x * 5 + y * 3) % 3}'
        return 'nature', {'g': f'terrain_grass_{(x * 7 + y * 13) % 5 % 3}', 's': 'terrain_sand',
                          'p': 'terrain_paving'}[cell]

    def put(self, category, name, gx, gy, ground=False):
        (self.ground if ground else self.standing).append((gy, category, name, gx))

    def person(self, gx, gy, hue, facing='down', face='neutral', emote=None):
        self.put('characters', f'blob_{hue}_stand_{facing}', gx, gy)
        if facing != 'up':
            self.put('characters', f'face_{face}_{facing}', gx, gy + 0.01)
        if emote:
            self.put('icons', f'emote_{emote}', gx + 7, gy - 15 + 0.02)

    def boxes(self):
        for gy, category, name, gx in self.standing:
            if category in ('wonders', 'landmarks'):
                im, (ax, ay) = self.sheets.get(category, name)
                yield name, (gx - ax, gy - ay, gx - ax + im.width, gy - ay + im.height)

    def warn_overlaps(self):
        placed = list(self.boxes())
        for i, (a, (ax0, ay0, ax1, ay1)) in enumerate(placed):
            for b, (bx0, by0, bx1, by1) in placed[i + 1:]:
                if ax0 < bx1 and bx0 < ax1 and ay0 < by1 and by0 < ay1:
                    print(f'  overlap: {a} and {b}')

    def render(self, out):
        for ty, row in enumerate(self.rows):
            for tx in range(len(row)):
                im, _ = self.sheets.get(*self.tile_for(tx, ty))
                self.image.alpha_composite(im, (tx * TILE, ty * TILE))
        for gy, category, name, gx in sorted(self.ground) + sorted(self.standing):
            im, (ax, ay) = self.sheets.get(category, name)
            self.image.alpha_composite(im, (round(gx - ax), round(gy - ay)))
        self.warn_overlaps()
        out.parent.mkdir(parents=True, exist_ok=True)
        self.image.resize((W * SCALE, H * SCALE), Image.NEAREST).save(out, optimize=True)
        print(out)


def wonders_scene():
    scene = Scene(WONDERS_MAP)
    for name, gx, gy in [('wonder_glacier', 46, 82), ('wonder_caldera-lake', 150, 70),
                         ('wonder_waterfall_0', 242, 86), ('wonder_sea-arch_0', 432, 74),
                         ('wonder_giant-tree', 56, 190), ('wonder_hot-springs_0', 150, 162),
                         ('wonder_geyser_2', 216, 162), ('wonder_crystal-cave_1', 280, 156),
                         ('wonder_stone-arch', 352, 172), ('wonder_canyon-view', 170, 266),
                         ('wonder_dune', 428, 254)]:
        scene.put('wonders', name, gx, gy)
    for category, name, gx, gy in [('scenery', 'tree_blossom', 20, 236), ('scenery', 'tree_blossom', 92, 262),
                                   ('scenery', 'tree_palm', 330, 64), ('scenery', 'tree_palm', 300, 236),
                                   ('scenery', 'tree_autumn', 266, 250), ('scenery', 'prop_picnic-table', 64, 252),
                                   ('scenery', 'prop_viewer', 300, 92), ('scenery', 'prop_beach-rocks', 372, 214)]:
        scene.put(category, name, gx, gy)
    for gx, gy, hue, facing, face, emote in [(42, 222, 'rose', 'right', 'happy', 'heart'),
                                             (286, 96, 'ice', 'up', 'neutral', None),
                                             (240, 268, 'mint', 'up', 'neutral', None),
                                             (360, 204, 'sun', 'left', 'happy', None),
                                             (192, 184, 'lilac', 'right', 'happy', 'heart')]:
        scene.person(gx, gy, hue, facing, face, emote)
    scene.render(MOCKUPS / 'wonders_showcase.png')


def landmarks_scene():
    scene = Scene(LANDMARKS_MAP)
    for name, gx, gy in [('landmark_glasshouse', 56, 74), ('landmark_library', 212, 82),
                         ('landmark_clock-tower', 290, 100), ('landmark_observatory', 360, 78),
                         ('landmark_lighthouse_0', 448, 122), ('landmark_viaduct_end-left', 80, 160),
                         ('landmark_viaduct_span', 128, 160), ('landmark_viaduct_end-right', 176, 160),
                         ('landmark_fountain_0', 248, 150), ('landmark_windmill_0', 350, 202),
                         ('landmark_amphitheatre', 60, 254), ('landmark_garden-terraces', 250, 266)]:
        scene.put('landmarks', name, gx, gy)
    for category, name, gx, gy in [('scenery', 'tree_blossom', 316, 154), ('scenery', 'tree_autumn', 160, 240),
                                   ('scenery', 'tree_palm', 384, 250), ('scenery', 'prop_reeds', 104, 200),
                                   ('scenery', 'prop_picnic-table', 340, 252)]:
        scene.put(category, name, gx, gy)
    for gx, gy, hue, facing, face, emote in [(224, 132, 'sun', 'right', 'happy', None),
                                             (276, 138, 'lilac', 'left', 'neutral', None),
                                             (212, 106, 'mint', 'down', 'happy', 'heart'),
                                             (300, 180, 'rose', 'right', 'neutral', None),
                                             (172, 190, 'ice', 'down', 'happy', None),
                                             (366, 228, 'silver', 'left', 'neutral', None)]:
        scene.person(gx, gy, hue, facing, face, emote)
    scene.render(MOCKUPS / 'landmarks_showcase.png')


if __name__ == '__main__':
    wonders_scene()
    landmarks_scene()
