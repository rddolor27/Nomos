"""Draw the M2.7 Part 1 street scene for the owner, at the town's real scale, into
docs/mockups/m2.7-street/07-street-scene.png:

    python docs/mockups/generator/street_scene.py

A street of shops and a house, and a market plaza under it, with the looks the sheets recommend. Blobs carry what
they bought, one eats on its doorstep, a keeper stands behind a stall with a buyer at the counter under the coin
bubble, and stock pips float over each premises. Existing sprites come from the atlas in assets/sprites/ (never
changed here); the new art is drawn in street_art.py and street_buildings.py. Drawn with 16-px tiles and scaled 3x
with nearest-neighbour.
"""
import sys
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from street_art import ANCHOR, CHEW, GOOD, HOLD, Carrier  # noqa: E402
from street_buildings import BY_GOOD, PIPS, Draper, FuelStore, MarketStall  # noqa: E402
from showcase import Sheets, tile_name  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / 'm2.7-street' / '07-street-scene.png'
W, H, TILE, SCALE = 384, 224, 16, 3
SHOPS, STALLS = 87, 170            # the ground lines of the street of shops and of the market stalls
SHOP_ANCHOR, STALL_ANCHOR = (32, 47), (24, 47)
DOORSTEP = 7                       # a blob on its doorstep stands this far below its house's ground line


class Scene:
    """Terrain first, then sprites painted back to front by their ground line, then the bubbles and pips on top."""

    def __init__(self, pips):
        self.atlas = Sheets()
        self.pips = pips
        self.image = Image.new('RGBA', (W, H))
        self.sprites = []           # (ground y, order, image, top-left)
        self.over = []              # drawn last: bubbles and pips

    def tiles(self, name, x0, y0, x1, y1):
        """Tile `name` over the cells x0..x1, y0..y1 (in tiles); None picks a grass tile by cell."""
        for ty in range(y0, y1 + 1):
            for tx in range(x0, x1 + 1):
                im, _ = self.atlas.get('nature', name or tile_name(tx, ty))
                self.image.alpha_composite(im, (tx * TILE, ty * TILE))

    def put(self, im, gx, gy, anchor, stock=None):
        """Queue an image whose ground point `anchor` lands on (gx, gy), with `stock` pips over it if given."""
        self.sprites.append((gy, len(self.sprites), im, (gx - anchor[0], gy - anchor[1])))
        if stock is not None:
            self.over.append((self.pips.image(stock), (gx - 4, gy - anchor[1] - 9)))

    def sprite(self, category, name, gx, gy, stock=None):
        im, anchor = self.atlas.get(category, name)
        self.put(im, gx, gy, anchor, stock)

    def blob(self, im, gx, gy):
        self.put(im, gx, gy, ANCHOR)

    def coin(self, gx, gy):
        im, anchor = self.atlas.get('icons', 'emote_coin')
        self.over.append((im, (gx + 7 - anchor[0], gy - 15 - anchor[1])))

    def render(self):
        for _, _, im, at in sorted(self.sprites, key=lambda s: s[:2]):
            self.image.alpha_composite(im, at)
        for im, at in self.over:
            self.image.alpha_composite(im, at)
        return self.image


PROPS = (
    ('tree_fruit', 12, 30), ('tree_conifer', 366, 34), ('tree_deciduous_mature', 346, 80),
    ('tree_deciduous_mature', 24, 150), ('tree_fruit', 362, 190), ('tree_conifer', 22, 214),
    ('prop_lamp-post', 156, 94), ('prop_lamp-post', 236, 94), ('prop_lamp-post', 62, 128),
    ('prop_lamp-post', 322, 128), ('prop_woodpile', 318, 90), ('prop_well', 200, 207),
    ('prop_planter', 74, 196), ('prop_planter', 310, 196), ('prop_bench', 130, 206), ('prop_bench', 254, 206),
    ('prop_barrel', 148, 168), ('prop_crate', 228, 168),
)


def build():
    s = Scene(PIPS[0])
    hold = HOLD['1']
    s.tiles(None, 0, 0, W // TILE - 1, H // TILE)                        # grass
    s.tiles('terrain_dirt-path', 0, 6, W // TILE - 1, 6)                 # the street
    s.tiles('terrain_paving', 3, 7, 20, 12)                              # the market plaza
    for name, gx, gy in PROPS:
        s.sprite('nature', name, gx, gy)

    s.sprite('houses', 'house_brick_detached_roof-terracotta', 40, SHOPS)
    s.sprite('buildings', 'shop_bakery', 120, SHOPS, stock=3)
    s.put(Draper('2').image(), 200, SHOPS, SHOP_ANCHOR, stock=1)
    s.put(FuelStore('1').image(), 280, SHOPS, SHOP_ANCHOR, stock=2)

    # the market: three stalls, a keeper behind the first with a buyer at its counter under the coin bubble
    for good, gx, stock in (('vegetables', 108, 3), ('fish', 192, 2), ('milk', 276, 1)):
        s.put(MarketStall(good, BY_GOOD[good]).image(), gx, STALLS, STALL_ANCHOR, stock)
    s.blob(Carrier('rose', job='merchant').frame('down', 'stand'), 98, STALLS - 16)
    s.blob(Carrier('sun').frame('up', 'stand'), 100, STALLS + 16)
    s.coin(100, STALLS + 16)
    s.blob(Carrier('ice').frame('down', 'walk_0', GOOD['fish'], hold), 176, STALLS + 18)
    s.blob(Carrier('mint').frame('left', 'walk_0', GOOD['milk'], hold), 284, STALLS + 20)

    # the street: bread out of the bakery, and cloth, firewood and vegetables on their way home
    s.blob(Carrier('ice').frame('down', 'walk_0', GOOD['bread'], hold), 120, SHOPS + 12)
    s.blob(Carrier('lilac').frame('down', 'walk_1', GOOD['cloth'], hold), 206, SHOPS + 14)
    s.blob(Carrier('mint').frame('right', 'walk_0', GOOD['fuel'], hold), 258, 107)
    s.blob(Carrier('silver').frame('left', 'walk_1', GOOD['vegetables'], hold), 84, 106)

    # a blob on its doorstep, eating its bread
    s.blob(Carrier('sun').eating('down', 1, GOOD['bread'], hold, CHEW['1']), 40, SHOPS + DOORSTEP)
    return s.render()


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    im = build()
    im.resize((W * SCALE, H * SCALE), Image.NEAREST).convert('RGB').save(OUT, optimize=True)
    print(f'{OUT}  {W * SCALE}x{H * SCALE}  (native {W}x{H}, x{SCALE})')


if __name__ == '__main__':
    main()
