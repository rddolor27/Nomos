"""Draw the house art for review: each new shape in a few styles and roofs, with snow and lit
windows, and today's shapes before and after their polish.

The before frames come from the houses sheet at BEFORE, the last commit before the polish, through
git. Writes docs/mockups/houses_preview.png at 2x.
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
from spritekit import ASSETS, FONT3x5, TILE  # noqa: E402

ROOT = ASSETS.parents[1]
OUT = ROOT / 'docs' / 'mockups' / 'houses_preview.png'
BEFORE = 'edb2589'
WIDTH, SCALE = 33, 2                       # canvas width in tiles
PAPER, INK = (226, 230, 214, 255), (40, 40, 48, 255)
STREET = 'street'                          # a 2-tile side street between groups

SECTIONS = [
    ('NEW TOWNHOUSES - TALL GABLED TERRACE PIECES FOR A DENSE CORE - LEFT MIDDLE RIGHT AND HANDED', [
        [[('townhouse-left', 'brick', 'terracotta'), ('townhouse-middle-handed', 'plaster', 'slate'),
          ('townhouse-middle', 'cottage', 'thatch'), ('townhouse-middle-handed', 'stone', 'plum'),
          ('townhouse-right', 'timber', 'green')],
         [('townhouse-left-handed', 'board', 'slate'), ('townhouse-middle', 'rubble', 'green'),
          ('townhouse-right-handed', 'brick', 'thatch')]],
    ]),
    ('NEW CORNER HOUSES - THEY END A TERRACE AT A SIDE STREET WITH A WING RUNNING BACK ALONG IT', [
        [STREET, [('corner-left', 'plaster', 'terracotta'), ('townhouse-middle', 'brick', 'slate'),
                  ('townhouse-middle-handed', 'stone', 'green'), ('corner-right', 'timber', 'plum')],
         STREET, [('corner-left', 'rubble', 'slate'), ('corner-right', 'board', 'thatch')], STREET,
         [('corner-left', 'cottage', 'green'), ('townhouse-right-handed', 'plaster', 'plum')]],
    ]),
    ('NEW CABINS - SMALL GABLED COTTAGES FOR THE OUTSKIRTS - ONE PER STYLE - THEN A HUT AND A DETACHED HOUSE', [
        [[('cabin', 'cottage', 'thatch')], [('cabin', 'timber', 'slate')], [('cabin', 'brick', 'green')],
         [('cabin', 'stone', 'terracotta')], [('cabin', 'plaster', 'plum')], [('cabin', 'board', 'green')],
         [('cabin', 'rubble', 'slate')], [('hut', 'brick', 'thatch')], [('detached', 'stone', 'plum')]],
    ]),
    ('NEW HANDED ROW PIECES - THE DOOR ON THE OTHER SIDE SO NEIGHBOURS CAN PAIR THEIR DOORS', [
        [[('row-left', 'brick', 'slate'), ('row-middle-handed', 'plaster', 'terracotta'),
          ('row-middle', 'cottage', 'green'), ('row-middle-handed', 'stone', 'thatch'),
          ('row-right', 'timber', 'plum')],
         [('row-left-handed', 'board', 'green'), ('row-middle', 'rubble', 'plum'),
          ('row-right-handed', 'brick', 'terracotta')]],
    ]),
    ('SNOW ON EVERY ROOF AND LIT WINDOWS AFTER DARK', [
        [[('townhouse-left', 'stone', 'slate', 'snow'), ('townhouse-middle-handed', 'cottage', 'thatch', 'snow'),
          ('townhouse-right', 'brick', 'plum', 'snow')],
         [('corner-left', 'timber', 'green', 'snow'), ('corner-right', 'plaster', 'terracotta', 'snow')],
         [('cabin', 'board', 'slate', 'snow')],
         [('townhouse-left-handed', 'rubble', 'terracotta', 'night'), ('townhouse-right', 'plaster', 'green', 'night')],
         [('cabin', 'brick', 'plum', 'night')]],
    ]),
]
POLISH = [[('row-left', 'brick', 'slate'), ('row-middle', 'plaster', 'terracotta'), ('row-middle', 'cottage', 'green'),
           ('row-middle', 'stone', 'thatch'), ('row-right', 'timber', 'plum')],
          [('detached', 'timber', 'plum')], [('hut', 'rubble', 'green')], [('hut', 'board', 'terracotta')],
          [('apartment', 'brick', 'slate')], [('farmhouse', 'plaster', 'thatch')]]


class Before(Sheets):
    """The houses sheet as it was at BEFORE, read from git."""

    def load(self, category):
        if category not in self.cache:
            image, manifest = (git_show(f'assets/sprites/{category}.{ext}') for ext in ('png', 'json'))
            self.cache[category] = (Image.open(io.BytesIO(image)).convert('RGBA'), json.loads(manifest)['frames'])
        return self.cache[category]


def git_show(path):
    return subprocess.run(['git', 'show', f'{BEFORE}:{path}'], cwd=ROOT, capture_output=True, check=True).stdout


class Board:
    """The preview canvas, filled top to bottom with titles and rows of houses on today's ground."""

    def __init__(self, ground):
        self.ground, self.parts = ground, []

    def title(self, text):
        im = Image.new('RGBA', (WIDTH * TILE, 12), PAPER)
        x = 4
        for ch in text:
            for gy, line in enumerate(FONT3x5.get(ch, FONT3x5['-'])):
                for gx, c in enumerate(line):
                    if c == '#':
                        im.putpixel((x + gx, 4 + gy), INK)
            x += 4
        self.parts.append(im)

    def row(self, sheets, items):
        """Groups of houses drawn edge to edge in front of a street, a tile apart; STREET items are
        side streets running up between them, which the groups beside them abut."""
        rows = max(sheets.frame('houses', name(spec))['footprint'][1] for g in items if g != STREET for spec in g)
        im = Image.new('RGBA', (WIDTH * TILE, (rows + 1) * TILE))
        streets, placed, x, gap = set(), [], 1, 0
        for group in items:
            if group == STREET:
                streets |= {x, x + 1}
                x, gap = x + 2, 0
                continue
            x += gap
            for spec in group:
                f = sheets.frame('houses', name(spec))
                placed.append((x, rows - f['footprint'][1], spec))
                x += f['footprint'][0]
            gap = 1
        for ty in range(rows + 1):
            for tx in range(WIDTH):
                ground = 'terrain_paving' if ty == rows or tx in streets else tile_name(tx, ty)
                im.alpha_composite(self.ground.get('nature', ground)[0], (tx * TILE, ty * TILE))
        for tx, ty, spec in placed:
            im.alpha_composite(house(sheets, spec), (tx * TILE, ty * TILE))
        self.parts.append(im)

    def image(self):
        out = Image.new('RGBA', (WIDTH * TILE, sum(p.height for p in self.parts)), PAPER)
        y = 0
        for part in self.parts:
            out.alpha_composite(part, (0, y))
            y += part.height
        return out


def name(spec):
    shape, style, roof = spec[:3]
    return f'house_{style}_{shape}_roof-{roof}'


def house(sheets, spec):
    """A house frame, with its snow or night overlay over it when the spec's fourth item names one."""
    frame = name(spec)
    im = sheets.get('houses', frame)[0].copy()
    for extra in spec[3:]:
        im.alpha_composite(sheets.get('houses', sheets.frame('houses', frame)[extra])[0])
    return im


def main():
    now = Sheets()
    board = Board(now)
    for text, rows in SECTIONS:
        board.title(text)
        for items in rows:
            board.row(now, items)
    board.title(f'TODAYS SHAPES BEFORE THE POLISH - AS AT {BEFORE.upper()}')
    board.row(Before(), POLISH)
    board.title('AND AFTER - DOOR PAINT AND DESIGN - MATCHING BOXES - CURTAINS - CHIMNEY POTS AND PLACES')
    board.row(now, POLISH)
    im = board.image()
    im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST).save(OUT)
    print(f'wrote {OUT} ({im.width * SCALE}x{im.height * SCALE})')


if __name__ == '__main__':
    main()
