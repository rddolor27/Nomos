"""Draw the M2.7 Part 1 (life on the street) mockup sheets for the owner's pick, at 4x, into docs/mockups/m2.7-street/.

    python docs/mockups/generator/street_sheets.py            # every sheet
    python docs/mockups/generator/street_sheets.py 01 03      # only the sheets whose names start with these

Each sheet is built at native pixel size and scaled up by a whole number with nearest-neighbour. The art itself is
in street_art.py (goods, holds, faces) and street_buildings.py (stalls, shop fronts, stock pips).
"""
import sys
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from street_art import CANVAS, CHEWS, GOOD, GOODS, HOLD, HOLDS, HUES, MARGIN, Carrier  # noqa: E402
from street_board import GUIDE, Board  # noqa: E402
from street_buildings import BY_GOOD, PIPS, Draper, FuelStore, MarketStall  # noqa: E402
import buildings as bd  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / 'm2.7-street'
CW, CH = CANVAS
SCALE = 4


# ---------------------------------------------------------------------------- 01: the carried goods
def goods_sheet():
    """The seven goods enlarged, then each held at hold 1 by a blob of every hue: one frame whatever the hue."""
    board = Board(238)
    board.heading('CARRIED GOODS: SEVEN 8X8 ICONS, ONE FRAME FOR EVERY HUE')
    x0 = 74
    for i, hue in enumerate(HUES):
        board.label(0, board.y, hue.upper(), centre_on=x0 + i * CW + CW // 2)
    board.y += 11
    for good in GOODS:
        icon = good.image()
        board.put(icon.resize((icon.width * 2, icon.height * 2), Image.NEAREST), 4, board.y + (CH - 16) // 2)
        board.label(24, board.y + (CH - 9) // 2, good.name)
        for i, hue in enumerate(HUES):
            board.put(Carrier(hue).frame('down', 'stand', good, HOLD['1']), x0 + i * CW, board.y)
        board.y += CH
    board.y += 4
    board.note(4, board.y, 'LEFT: ICON AT X8. RIGHT: HOLD 1, STANDING, FACING DOWN.')
    board.y += 9
    return board


# ---------------------------------------------------------------------------- 02: how a blob holds a good
LOOKS = (('sun', 'bread'), ('mint', 'vegetables'), ('ice', 'fish'))
SHORT = {'vegetables': 'veg'}
GROUP = 3 * CW + 8


def hold_group_x(index, left=30):
    return left + index * GROUP


def group_headings(board, with_poses=True):
    for h, hold in enumerate(HOLDS):
        board.label(0, board.y, f'HOLD {hold.key} {hold.name.upper()}', centre_on=hold_group_x(h) + 3 * CW // 2)
    board.y += 11
    if with_poses:
        for h in range(len(HOLDS)):
            for p, name in enumerate(('STAND', 'WALK 0', 'WALK 1')):
                board.note(hold_group_x(h) + p * CW + (CW - 4 * len(name) + 1) // 2, board.y, name)
        board.y += 8


def hold_view(board, facing):
    board.heading(f'FACING {facing.upper()}: STANDING AND THE TWO WALK FRAMES')
    group_headings(board)
    for hue, good_name in LOOKS:
        board.label(2, board.y + CH // 2 - 9, hue.upper())
        board.label(2, board.y + CH // 2, SHORT.get(good_name, good_name))
        for h, hold in enumerate(HOLDS):
            for p, pose in enumerate(('stand', 'walk_0', 'walk_1')):
                board.put(Carrier(hue).frame(facing, pose, GOOD[good_name], hold), hold_group_x(h) + p * CW, board.y)
        board.y += CH
    board.y += 3


def hold_eating(board):
    board.heading('EATING: THE GOOD MOVES FROM ITS HOLD TO THE MOUTH (FACE 1)')
    group_headings(board, with_poses=False)
    for h in range(len(HOLDS)):
        for k in range(3):
            board.note(hold_group_x(h) + k * CW + (CW - 7) // 2, board.y, f'EAT {k}')
    board.y += 8
    for facing in ('down', 'left'):
        board.label(2, board.y + CH // 2 - 4, facing.upper())
        for h, hold in enumerate(HOLDS):
            for k in range(3):
                im = Carrier('sun').eating(facing, k, GOOD['bread'], hold, CHEWS[0])
                board.put(im, hold_group_x(h) + k * CW, board.y)
        board.y += CH
    board.y += 3


def guide_box(im, cell):
    """The item's 8x8 cell outlined in the review colour, with its top-left pixel marked solid."""
    px = im.load()
    x0, y0 = MARGIN[0] + cell[0], MARGIN[1] + cell[1]
    for d in range(8):
        for x, y in ((x0 + d, y0), (x0 + d, y0 + 7), (x0, y0 + d), (x0 + 7, y0 + d)):
            if 0 <= x < im.width and 0 <= y < im.height and d % 2 == 0:
                px[x, y] = GUIDE
    return im


def hold_points(board):
    board.heading('HOLD POINT: PINK CORNERS = ITEM CELL, SOLID DOT = ITS TOP LEFT')
    for h, hold in enumerate(HOLDS):
        board.label(2, board.y + CH // 2 - 4, f'HOLD {hold.key}')
        x = 30
        for facing in ('down', 'left', 'right'):
            for pose in ('stand', 'walk_0', 'walk_1'):
                im = Carrier('sun').frame(facing, pose)
                cell = hold.cell(facing, pose)
                guide_box(im, cell)
                im.putpixel((MARGIN[0] + cell[0], MARGIN[1] + cell[1]), GUIDE)
                board.put(im, x, board.y)
                x += CW
            x += 8
        board.y += CH
    board.y += 3


def hold_sheet():
    board = Board(294)
    for facing in ('down', 'left', 'right'):
        hold_view(board, facing)
    board.heading('FACING UP: THE GOOD IS HIDDEN, FOR EVERY HOLD')
    for i, hue in enumerate(('sun', 'mint', 'ice')):
        for p, pose in enumerate(('stand', 'walk_0', 'walk_1')):
            board.put(Carrier(hue).frame('up', pose, GOOD['bread'], HOLD['1']), 30 + (i * 3 + p) * CW, board.y)
    board.y += CH + 3
    hold_eating(board)
    hold_points(board)
    return board


# ---------------------------------------------------------------------------- 03: the chewing faces
def faces_sheet():
    board = Board(294)
    board.heading('CHEWING FACES: THREE LOOKS, EACH IN TWO FRAMES')
    x0, first, group = 30, 70, 2 * CW + 16
    board.label(0, board.y, 'RESTING', centre_on=x0 + CW // 2)
    for c, chew in enumerate(CHEWS):
        board.label(0, board.y, f'FACE {chew.key}', centre_on=first + c * group + CW)
    board.y += 11
    for facing in ('down', 'left', 'right'):
        for hue in ('sun', 'rose', 'ice'):
            board.label(2, board.y + CH // 2 - 4, facing.upper() if hue == 'sun' else hue.upper())
            board.put(Carrier(hue).frame(facing), x0, board.y)
            for c, chew in enumerate(CHEWS):
                for frame in (0, 1):
                    board.put(Carrier(hue).frame(facing, 'stand', face=chew.image(facing, frame)),
                              first + c * group + frame * CW, board.y)
            board.y += CH
        board.y += 3
    board.note(4, board.y, '  '.join(f'FACE {c.key}: {c.name.upper()}.' for c in CHEWS))
    board.y += 12
    board.heading('EATING WITH HOLD 1: THREE STEPS, FACE FRAMES 0, 1, 0')
    for c, chew in enumerate(CHEWS):
        board.label(0, board.y, f'FACE {chew.key}', centre_on=x0 + c * (3 * CW + 8) + 3 * CW // 2)
    board.y += 11
    for facing in ('down', 'left'):
        board.label(2, board.y + CH // 2 - 4, facing.upper())
        for c, chew in enumerate(CHEWS):
            for k in range(3):
                im = Carrier('sun').eating(facing, k, GOOD['bread'], HOLD['1'], chew)
                board.put(im, x0 + c * (3 * CW + 8) + k * CW, board.y)
        board.y += CH
    board.y += 2
    board.note(4, board.y, 'THE LOOP RUNS EAT 0, 1, 2, 1 WITH FACE FRAMES 0, 1, 0, 1.')
    board.y += 9
    return board


# ---------------------------------------------------------------------------- 04: the market stalls
STALL_LOOKS = (
    ('1', 'ONE TEAL CANOPY, THE GOODS TELL THEM APART', lambda good: MarketStall(good)),
    ('2', 'CANOPY COLOUR BY GOOD: GREEN, BLUE, LILAC', lambda good: MarketStall(good, BY_GOOD[good])),
    ('3', 'ONE TEAL CANOPY, THE GOOD HANGS WHERE THE COIN DID',
     lambda good: MarketStall(good, icon_sign=True)),
)


def stall_sheet():
    board = Board(294)
    for key, title, make in STALL_LOOKS:
        board.heading(f'STALLS {key}: {title}')
        for i, good in enumerate(MarketStall.GOODS):
            x = 24 + i * 90
            board.put(make(good).image(), x, board.y)
            board.label(x, board.y + 49, good, centre_on=x + 24)
        board.y += 64
    board.heading('FOR REFERENCE: THE STALL TODAY, OPEN AND CLOSED')
    for i, open_ in enumerate((True, False)):
        x = 24 + i * 90
        board.put(bd.market_stall(open_).c.image(), x, board.y)
        board.label(x, board.y + 49, 'open' if open_ else 'closed', centre_on=x + 24)
    board.y += 64
    return board


# ---------------------------------------------------------------------------- 05: the shop fronts
def front_sheet():
    board = Board(294)
    for shop in (Draper, FuelStore):
        looks = '  '.join(f'LOOK {k}: {v.upper()}.' for k, v in shop.LOOKS.items())
        board.heading(f'THE {shop.NAME.upper()}')
        board.note(4, board.y - 2, looks)
        board.y += 8
        for i, look in enumerate(shop.LOOKS):
            for j, snow in enumerate((False, True)):
                x = 6 + (i * 2 + j) * 72
                board.put(shop(look).image(snow=snow), x, board.y)
                board.label(x, board.y + 49, f'LOOK {look}{" IN SNOW" if snow else ""}', centre_on=x + 32)
        board.y += 64
    board.heading('FOR REFERENCE: THE BAKERY, THE SMITHY AND THE GENERAL STORE TODAY')
    ground = board.y + 58
    for i, (name, sprite) in enumerate((('bakery', bd.bakery), ('smithy', bd.smithy), ('general store', bd.shop))):
        slot = 6 + i * 96 + 48                                    # the middle of a 96-px slot
        im = sprite().c.image()
        board.put(im, slot - im.width // 2, ground - im.height)
        board.label(0, ground + 2, name, centre_on=slot)
    board.y = ground + 14
    return board


# ---------------------------------------------------------------------------- 06: the stock pips
def pip_sheet():
    board = Board(294)
    board.heading('STOCK PIPS: THREE DESIGNS, 8X8, STOCK 0 TO 3 OF A DAY OF DEMAND')
    for pip in PIPS:
        board.label(4, board.y + 12, f'DESIGN {pip.key}')
        board.label(4, board.y + 23, pip.name)
        for level in range(4):
            x = 70 + level * 54
            icon = pip.image(level)
            board.put(icon.resize((16, 16), Image.NEAREST), x, board.y + 8)
            board.put(icon, x + 20, board.y + 12)
            board.label(x, board.y + 27, f'STOCK {level}', centre_on=x + 14)
        board.y += 40
    board.heading('OVER A PREMISES: STOCK 3 AT THE BAKERY, 2 AT A STALL, 1 AT THE DRAPER')
    scenes = ((bd.bakery().c.image(), 3), (MarketStall('vegetables').image(), 2), (Draper('1').image(), 1))
    top = board.y + 11
    for pip in PIPS:
        ground = top + 58
        x = 6
        for im, level in scenes:
            board.put(im, x, ground - im.height)
            board.put(pip.image(level), x + (im.width - 8) // 2, ground - im.height - 8)
            x += im.width + 12
        board.label(x + 4, ground - 20, f'DESIGN {pip.key}')
        top = ground + 12
    board.y = top
    return board


SHEETS = (
    ('01-carried-goods', goods_sheet),
    ('02-hold-variants', hold_sheet),
    ('03-eating-faces', faces_sheet),
    ('04-market-stalls', stall_sheet),
    ('05-shop-fronts', front_sheet),
    ('06-stock-pips', pip_sheet),
)


def main(argv):
    wanted = argv[1:]
    for name, build in SHEETS:
        if not wanted or any(name.startswith(w) for w in wanted):
            build().save(OUT / f'{name}.png', SCALE)


if __name__ == '__main__':
    main(sys.argv)
