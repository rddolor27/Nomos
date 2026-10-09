"""Draw the town walls in one scene: a small walled ring with a front gate and a side gate, with
the weatherboard and rubble houses and the town props inside it and beside it.

Writes docs/mockups/town_walls_preview.png at 2x.
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from showcase import Sheets, tile_name  # noqa: E402
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


def main():
    scene = build_scene()
    scene.resize((scene.width * SCALE, scene.height * SCALE), Image.NEAREST).save(OUT)
    print(f'wrote {OUT} ({scene.width * SCALE}x{scene.height * SCALE})')


if __name__ == '__main__':
    main()
