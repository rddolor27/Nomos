"""Compose one town scene from every sprite category, as a visual check and a preview.

Writes docs/mockups/sprites_showcase.png: drawn at 320x180 like the mockups, scaled 3x.
"""
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from spritekit import ASSETS, TILE  # noqa: E402

OUT = ASSETS.parents[1] / 'docs' / 'mockups' / 'sprites_showcase.png'
W, H, SCALE = 320, 180, 3


class Sheets:
    def __init__(self):
        self.cache = {}

    def load(self, category):
        if category not in self.cache:
            manifest = json.loads((ASSETS / f'{category}.json').read_text(encoding='utf-8'))
            self.cache[category] = (Image.open(ASSETS / manifest['image']).convert('RGBA'), manifest['frames'])
        return self.cache[category]

    def frame(self, category, name):
        return self.load(category)[1][name]

    def get(self, category, name):
        sheet, frames = self.load(category)
        f = frames[name]
        return sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])), tuple(f['anchor'])


def tile_name(x, y):
    return f'terrain_grass_{(x * 7 + y * 13) % 5 % 3}'


def build_scene():
    sheets = Sheets()
    scene = Image.new('RGBA', (W, H), (0, 0, 0, 255))

    def tile(category, name, tx, ty):
        im, _ = sheets.get(category, name)
        scene.alpha_composite(im, (tx * TILE, ty * TILE))

    def put(category, name, gx, gy):
        im, (ax, ay) = sheets.get(category, name)
        scene.alpha_composite(im, (gx - ax, gy - ay))

    def person(job, facing, gx, gy, emote=None, hue='sun', face='neutral'):
        put('characters', f'blob_{hue}_stand_{facing}', gx, gy)      # body, face and job item share one anchor
        if facing != 'up':
            put('characters', f'face_{face}_{facing}', gx, gy)
        if job:
            put('characters', f'job_{job}_stand_{facing}', gx, gy)
        if emote:
            put('icons', f'emote_{emote}', gx + 7, gy - 15)

    for ty in range(H // TILE + 1):
        for tx in range(W // TILE):
            tile('nature', tile_name(tx, ty), tx, ty)
    for tx in range(W // TILE):
        tile('nature', 'terrain_dirt-path', tx, 6)
    for tx in range(8, 12):
        for ty in (5, 7):
            tile('nature', 'terrain_paving', tx, ty)
    for tx in range(7, 12):
        for ty in range(8, 11):
            tile('nature', 'crop_grain_ripe' if tx < 10 else 'crop_veg_ripe', tx, ty)

    put('houses', 'house_brick_detached_roof-terracotta', 28, 84)
    put('buildings', 'shop_general', 88, 84)
    put('buildings', 'civic_clinic', 156, 84)
    put('houses', 'house_timber_detached_roof-slate', 216, 84)
    put('buildings', 'civic_police-station', 276, 84)

    for tx in range(0, 6):
        put('nature', 'prop_fence_horizontal', tx * TILE + 8, 8 * TILE + 15)
    put('animals', 'cow_graze_left', 30, 160)
    put('animals', 'sheep_idle_right', 60, 150)
    put('animals', 'chicken_peck_left', 82, 166)
    put('animals', 'horse_idle_left', 226, 120)
    put('nature', 'prop_cart_grain_left', 252, 120)
    put('buildings', 'shop_market-stall', 208, 176)
    put('nature', 'tree_fruit', 280, 176)
    put('nature', 'tree_conifer', 308, 176)
    put('nature', 'prop_bench', 140, 120)
    put('nature', 'prop_lamp-post', 128, 116)

    person('merchant', 'down', 242, 170, hue='ice')
    person(None, 'right', 178, 172, emote='coin', hue='rose', face='happy')
    person('police', 'down', 296, 112, hue='lilac')
    person('clinic', 'down', 156, 112, hue='silver')
    person('farmer', 'down', 136, 158, hue='mint')
    person('builder', 'left', 104, 112)
    person(None, 'down', 60, 112, emote='heart', hue='mint', face='happy')
    person(None, 'right', 190, 112, emote='food')

    for i, good in enumerate(['grain', 'fresh-food', 'timber', 'stone', 'metal', 'fuel', 'wares', 'services']):
        im, _ = sheets.get('icons', f'good_{good}_8')
        scene.alpha_composite(im, (4 + i * 10, 2))
    return scene


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    build_scene().resize((W * SCALE, H * SCALE), Image.NEAREST).save(OUT, optimize=True)
    print(OUT)


if __name__ == '__main__':
    main()
