"""Draw the edge of a walled city and a palisaded town in one scene: roads by role, stone bridges,
suburbs thinning into a farm belt, and greens inside the walls (owner, 10 October 2026).

The city keeps its 3-wide cut-stone main road to the gate, where a gravel country road takes
over; cobbled streets and dirt lanes run inside. A country road leaves by the side gate, crosses
a stream and enters the town's palisade. Fields, a pasture, an orchard, a vineyard and paddies
fill the outskirts, and rivers are crossed on the stone bridges.

Writes docs/mockups/town_edge_preview.png at 2x.
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from showcase import Sheets, tile_name  # noqa: E402
from spritekit import ASSETS, TILE  # noqa: E402

OUT = ASSETS.parents[1] / 'docs' / 'mockups' / 'town_edge_preview.png'
COLS, ROWS, SCALE = 56, 36, 2
SIDES = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}
CORNERS = {'ne': (1, -1), 'se': (1, 1), 'sw': (-1, 1), 'nw': (-1, -1)}
TERRAIN = {     # kind -> (sheet, frame) for tile (x, y)
    'stone': lambda x, y: ('nature', 'terrain_cut-stone'),
    'cobbles': lambda x, y: ('nature', f'terrain_cobbles_{(x * 7 + y * 13) % 5 % 2}'),
    'gravel': lambda x, y: ('nature', f'terrain_gravel_{(x * 7 + y * 13) % 5 % 2}'),
    'lane': lambda x, y: ('nature', 'terrain_dirt-path'),
    'track': lambda x, y: ('nature', 'terrain_farm-track_horizontal'),
    'track-down': lambda x, y: ('nature', 'terrain_farm-track_vertical'),
    'flowers': lambda x, y: ('nature', 'terrain_flower-bed'),
}


class Scene:
    """A grid of terrain kinds and the sprites placed on it, drawn back to front."""

    def __init__(self):
        self.sheets = Sheets()
        self.kind = [['grass'] * COLS for _ in range(ROWS)]
        self.sprites = []          # (layer, ground y, x, category, name)

    def fill(self, kind, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.kind[y][x] = kind

    def water(self, x, y):
        return 0 <= x < COLS and 0 <= y < ROWS and self.kind[y][x] == 'water'

    def tile(self, x, y):
        kind = self.kind[y][x]
        if kind == 'water':
            return 'nature', 'terrain_water_0'
        if kind != 'grass':
            return TERRAIN[kind](x, y) if kind in TERRAIN else ('nature', kind)
        wet = {side for side, (dx, dy) in SIDES.items() if self.water(x + dx, y + dy)}
        for corner in CORNERS:
            if set(corner) <= wet:
                return 'scenery', f'shore_grass_{corner}-outer_0'
        for side in 'nesw':
            if side in wet:
                return 'scenery', f'shore_grass_{side}_0'
        for corner, (dx, dy) in CORNERS.items():
            if self.water(x + dx, y + dy):
                return 'scenery', f'shore_grass_{corner}-inner_0'
        return 'nature', tile_name(x, y)

    def place(self, category, name, tx, ty):
        """A sprite by the top-left tile of its footprint, anchored at the footprint's bottom centre."""
        frame = self.sheets.frame(category, name)
        fw, fh = frame.get('footprint', [1, 1])
        layer = 0 if frame.get('layer') == 'ground' else 1
        self.sprites.append((layer, (ty + fh) * TILE - 1, tx * TILE + fw * TILE // 2, category, name))

    def stand(self, category, name, gx, gy):
        """A sprite by its ground point in pixels."""
        self.sprites.append((1, gy, gx, category, name))

    def person(self, hue, facing, gx, gy):
        self.stand('characters', f'blob_{hue}_stand_{facing}', gx, gy)
        if facing != 'up':
            self.stand('characters', f'face_neutral_{facing}', gx, gy)

    def render(self):
        image = Image.new('RGBA', (COLS * TILE, ROWS * TILE))
        for y in range(ROWS):
            for x in range(COLS):
                im, _ = self.sheets.get(*self.tile(x, y))
                image.alpha_composite(im, (x * TILE, y * TILE))
        for _, gy, gx, category, name in sorted(self.sprites, key=lambda s: (s[0], s[1])):
            im, (ax, ay) = self.sheets.get(category, name)
            image.alpha_composite(im, (gx - ax, gy - ay))
        return image


# ------------------------------------------------------------------------------ pieces
# The stone wall and the palisade share one plan, so `wall` is either name's prefix.
def run_across(scene, wall, y, x0, x1, gate):
    """A horizontal run with a 2-tile front gate whose left tile is `gate`."""
    for x in range(x0, x1 + 1):
        if x not in (gate, gate + 1):
            scene.place('walls', f'{wall}_horizontal', x, y)
    scene.place('walls', f'{wall}_gate_front', gate, y)


def run_down(scene, wall, x, y0, y1, gap):
    """A vertical run with a side gate: a 2-tile gap from `gap`, a gate piece either end."""
    for y in range(y0, y1 + 1):
        if not gap - 1 <= y <= gap + 2:
            scene.place('walls', f'{wall}_vertical', x, y)
    scene.place('walls', f'{wall}_gate_side-north', x, gap - 1)
    scene.place('walls', f'{wall}_gate_side-south', x, gap + 2)


def bridge_across(scene, road, y, x_bank, x_far):
    """A bridge whose deck runs across, from the bank tile x_bank to the bank tile x_far."""
    scene.place('scenery', f'bridge_{road}_horizontal_end-left', x_bank, y)
    for x in range(x_bank + 1, x_far):
        scene.place('scenery', f'bridge_{road}_horizontal_span', x, y)
    scene.place('scenery', f'bridge_{road}_horizontal_end-right', x_far, y)


def bridge_down(scene, road, x, y_bank, y_far):
    scene.place('scenery', f'bridge_{road}_vertical_end-top', x, y_bank)
    for y in range(y_bank + 1, y_far):
        scene.place('scenery', f'bridge_{road}_vertical_span', x, y)
    scene.place('scenery', f'bridge_{road}_vertical_end-bottom', x, y_far)


def fence(scene, x0, y0, x1, y1, gate):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if y in (y0, y1):
                if x in (x0, x1):
                    name = f'prop_fence_corner_{"top" if y == y0 else "bottom"}-{"left" if x == x0 else "right"}'
                elif y == y1 and x == gate:
                    continue
                else:
                    name = 'prop_fence_horizontal'
            elif x in (x0, x1):
                name = 'prop_fence_vertical'
            else:
                continue
            scene.place('nature', name, x, y)


def hedge_ring(scene, x0, y0, x1, y1, gaps=()):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x in (x0, x1) or y in (y0, y1)) and (x, y) not in gaps:
                scene.place('nature', 'prop_hedge', x, y)


def trees(scene, name, spots):
    for tx, ty in spots:
        scene.place('nature', name, tx, ty)


# ------------------------------------------------------------------------------ the scene
def city(s):
    """The walled city: main road to the gate over a river, streets, lanes, houses and a green."""
    s.fill('water', 0, 3, 19, 4)                        # a river through the city, bending north
    s.fill('water', 18, 0, 19, 2)
    s.fill('stone', 12, 0, 14, 15)                      # the main road, through the front gate
    s.fill('water', 12, 3, 14, 4)
    bridge_down(s, 'main', 12, 2, 5)
    s.fill('cobbles', 0, 9, 29, 10)                     # streets, out by the side gate
    s.fill('stone', 12, 9, 14, 10)
    s.fill('cobbles', 23, 0, 24, 8)
    s.fill('lane', 25, 5, 27, 5)                        # lanes to doors
    s.fill('lane', 0, 13, 11, 13)
    s.fill('lane', 15, 13, 27, 13)
    s.fill('crop_veg_growing', 7, 11, 10, 12)           # gardens near the wall, where the city thins
    s.fill('crop_veg_ripe', 16, 11, 19, 12)
    s.fill('flowers', 18, 7, 20, 7)                     # a green between the main road and a street
    hedge_ring(s, 16, 6, 22, 8, gaps=((19, 8),))
    for shape, x in (('row-left', 0), ('row-middle', 2), ('row-middle', 4), ('row-right', 6)):
        s.place('houses', f'house_brick_{shape}_roof-terracotta', x, 6)
    s.place('houses', 'house_cottage_detached_roof-thatch', 8, 6)
    s.place('houses', 'house_plaster_detached_roof-slate', 25, 6)
    s.place('houses', 'house_timber_townhouse-left_roof-green', 25, 1)
    s.place('houses', 'house_timber_townhouse-right_roof-green', 27, 1)
    s.place('houses', 'house_rubble_hut_roof-plum', 1, 11)
    s.place('houses', 'house_board_hut_roof-thatch', 4, 11)
    s.place('houses', 'house_stone_hut_roof-terracotta', 22, 11)
    trees(s, 'tree_deciduous_young', [(11, 1), (15, 1), (11, 11), (15, 11), (21, 1), (15, 7)])
    trees(s, 'tree_deciduous_mature', [(2, 1), (8, 1)])
    s.place('nature', 'tree_fruit', 16, 1)
    s.place('nature', 'prop_bench', 5, 1)
    s.place('nature', 'prop_lamp-post', 11, 8)
    s.place('nature', 'prop_lamp-post', 15, 8)
    run_across(s, 'wall', 15, 0, 27, gate=13)
    s.place('walls', 'wall_tower', 28, 14)
    run_down(s, 'wall', 29, 0, 13, gap=9)


def town(s):
    """A town behind a palisade: its side gate takes the road from the city, its front gate the farms."""
    s.fill('cobbles', 37, 9, 55, 10)
    s.fill('cobbles', 45, 0, 46, 15)
    s.fill('lane', 39, 4, 44, 4)
    s.fill('lane', 47, 4, 52, 4)
    s.fill('flowers', 49, 12, 51, 13)
    s.fill('crop_veg_ripe', 38, 12, 41, 13)
    s.place('houses', 'house_timber_cabin_roof-thatch', 39, 6)
    s.place('houses', 'house_board_detached_roof-terracotta', 41, 6)
    s.place('houses', 'house_rubble_detached_roof-green', 48, 6)
    s.place('houses', 'house_stone_cabin_roof-slate', 52, 6)
    s.place('houses', 'house_plaster_farmhouse_roof-terracotta', 40, 1)
    s.place('houses', 'house_cottage_detached_roof-plum', 48, 1)
    trees(s, 'tree_deciduous_young', [(54, 2), (43, 12)])
    s.place('nature', 'prop_well', 47, 12)
    s.place('nature', 'prop_notice-board', 44, 8)
    run_down(s, 'palisade', 37, 0, 14, gap=9)
    s.place('walls', 'palisade_corner_left', 37, 15)
    run_across(s, 'palisade', 15, 38, 55, gate=45)


def countryside(s):
    """Outside the walls: country roads and bridges, suburbs thinning out, then the farm belt."""
    s.fill('water', 0, 26, 55, 28)                      # the river
    s.fill('water', 32, 0, 33, 25)                      # a stream between city and town
    s.fill('gravel', 13, 16, 14, 35)                    # the country road from the gate, over the river
    s.fill('water', 13, 26, 14, 28)
    bridge_down(s, 'country', 13, 25, 29)
    s.fill('gravel', 30, 9, 36, 10)                     # the road from the side gate to the town
    s.fill('water', 32, 9, 33, 10)
    bridge_across(s, 'country', 9, 31, 34)
    s.fill('gravel', 45, 16, 46, 24)                    # out of the town's front gate
    s.fill('track', 35, 24, 55, 24)
    s.fill('lane', 45, 24, 46, 24)
    # suburbs by the gate, thinning out
    s.place('houses', 'house_timber_detached_roof-slate', 9, 16)
    s.fill('lane', 10, 19, 12, 19)
    s.place('houses', 'house_board_cabin_roof-terracotta', 5, 17)
    s.fill('lane', 5, 20, 12, 20)
    s.place('houses', 'house_brick_detached_roof-thatch', 16, 16)
    s.fill('lane', 15, 19, 17, 19)
    s.place('houses', 'house_cottage_hut_roof-green', 20, 18)
    s.fill('lane', 15, 20, 21, 20)
    # grain and vegetable strips west of the road, a farm track between them
    s.fill('crop_grain_ripe', 0, 21, 11, 21)
    s.fill('track', 0, 22, 11, 22)
    s.fill('lane', 12, 22, 12, 22)
    s.fill('crop_veg_growing', 0, 23, 11, 24)
    s.place('buildings', 'farm_granary', 1, 18)
    # a pasture with its herd, and an orchard in rows
    s.fill('crop_pasture', 24, 17, 30, 22)
    fence(s, 23, 16, 31, 23, gate=27)
    for kind, facing, tx, ty in (('cow', 'graze_left', 26, 18), ('cow', 'idle_right', 29, 20),
                                  ('sheep', 'graze_right', 25, 21), ('sheep', 'idle_left', 28, 18),
                                  ('sheep', 'graze_left', 27, 22)):
        s.stand('animals', f'{kind}_{facing}', tx * TILE + 8, ty * TILE + 15)
    trees(s, 'tree_orchard', [(x, y) for y in (22, 24) for x in range(16, 22, 2)])
    s.place('houses', 'house_rubble_farmhouse_roof-thatch', 36, 17)
    trees(s, 'tree_orchard', [(x, y) for y in (21, 23) for x in range(36, 44, 2)])
    # a vineyard on the warm slope east of the town road
    s.fill('crop_vine_ripe', 48, 17, 55, 19)
    s.fill('crop_vine_growing', 48, 20, 55, 22)
    s.fill('track-down', 47, 17, 47, 23)
    # paddies on the wet land south of the river, and fields beside them
    s.fill('crop_rice_growing', 0, 30, 5, 32)
    s.fill('crop_rice_seedling', 6, 30, 11, 32)
    s.fill('crop_rice_ripe', 0, 34, 11, 35)
    s.fill('track', 0, 33, 12, 33)
    s.fill('crop_grain_growing', 16, 31, 31, 32)
    s.fill('track', 15, 33, 31, 33)
    s.fill('crop_veg_seedling', 16, 34, 31, 35)
    s.fill('crop_grain_stubble', 35, 31, 55, 32)
    s.fill('track', 35, 33, 55, 33)
    s.fill('crop_vine_stubble', 35, 34, 55, 35)
    trees(s, 'tree_deciduous_mature', [(41, 30)])
    trees(s, 'tree_deciduous_young', [(12, 17), (15, 17), (12, 21), (15, 21)])


def people(s):
    for hue, facing, tx, ty in (('sun', 'down', 13, 7), ('ice', 'up', 14, 12), ('rose', 'down', 13, 17),
                                ('mint', 'left', 33, 10), ('lilac', 'down', 14, 27), ('silver', 'right', 45, 12),
                                ('sun', 'left', 21, 10), ('ice', 'down', 46, 20)):
        s.person(hue, facing, tx * TILE + 8, ty * TILE + 14)


def build_scene():
    scene = Scene()
    city(scene)
    town(scene)
    countryside(scene)
    people(scene)
    return scene.render()


def main():
    scene = build_scene()
    scene.resize((scene.width * SCALE, scene.height * SCALE), Image.NEAREST).save(OUT, optimize=True)
    print(f'wrote {OUT} ({scene.width * SCALE}x{scene.height * SCALE})')


if __name__ == '__main__':
    main()
