"""M2.7 Part 1 mockups: the three market stalls, the Draper's and the Fuel Store's fronts, and the stock pips.

Drawn with tools/sprites's own building kit (buildings.py: Canvas, Building, awning, sign_board, the roof helpers and
snowfall()), in spritekit.PALETTE colours only, so a pick can move into tools/sprites unchanged. Signs are
pictograms, never words; nothing shows wealth; a stall or shop is the same quality whatever it sells.
"""
import sys
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools' / 'sprites'))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import buildings as bd  # noqa: E402
import spritekit as sk  # noqa: E402
from street_art import GOOD, KEY  # noqa: E402

# buildings.SYM plus the lilac, ice and rose tones that cloth, canopies and pips need.
SYM = {**bd.SYM, **sk.cmap(Q='LILAC_L', Z='LILAC', z='LILAC_S', q='LILAC_D', e='ICE_S', E='ICE_D',
                           F='ROSE', f='ROSE_S', H='ROSE_L', M='MINT', m='MINT_S')}


class StreetCanvas(bd.Canvas):
    """A buildings.Canvas that draws with this module's wider symbol set."""

    def image(self):
        return sk.add_outline(sk.from_ascii(self.rows(), SYM))


# ---------------------------------------------------------------------------- props for the stalls
CRATE_CARROTS = [
    '.OgOGOgO.',
    'OGRRGRRGO',
    'ORRrRRrrO',
    'OOOOOOOOO',
    'OLwwwwwdO',
    'OOOOOOOOO',
]
CRATE_BEETS = [
    '.OgOgOgO.',
    'OUPUUPUUO',
    'OUUpUUpUO',
    'OOOOOOOOO',
    'OLwwwwwdO',
    'OOOOOOOOO',
]
ONIONS = ['.OO.', 'OSCO', 'OSsO', '.OO.', 'OSCO', 'OSsO', '.OO.']
FISH_TRAY = [                    # fish laid on ice in a shallow tray
    '.OOOOOOOOOOOOOOOOO.',
    'OIWIKKkIWIKKkIWIKIO',
    'OIKKWkAIKKWkAIKKWIO',
    'OKKKKkaKKKKkaKKKKkO',
    'OOOOOOOOOOOOOOOOOOO',
    'OLwwwwwwwwwwwwwwwdO',
    'OOOOOOOOOOOOOOOOOOO',
]
JUG = [
    '.OaaO.',
    '.OWcO.',
    'OWWWcO',
    'OWaWcO',
    'OWWWcO',
    'OcccCO',
    '.OOOO.',
]
CHURN = [                        # a steel milk can with a lid and a handle at each shoulder
    '..OOOO..',
    '.OKKKkO.',
    'OOkkkkOO',
    'OKOWkxOx',
    'OKOWkxOx',
    'OKKWkkxO',
    'OKWWkkxO',
    'OKKWkkxO',
    'OxxxxxxO',
    'OkkkkkxO',
    'OOOOOOOO',
]


# ---------------------------------------------------------------------------- the market stalls
# The teal canopy's letters swapped for another colour: stripe, valance fold and the lit top rows.
CANOPIES = {
    'teal': {},
    'green': {'T': 'G', 't': 'l'},
    'blue': {'T': 'a', 't': 'N', 'g': 'A'},
    'lilac': {'T': 'Z', 't': 'q', 'g': 'Q'},
}
BY_GOOD = {'vegetables': 'green', 'fish': 'blue', 'milk': 'lilac'}


class MarketStall:
    """A 48x48 (3x2 tile) open stall in the house style of buildings.market_stall: front posts, a canopy with its
    valance, a brick counter and a coin sign on a chain. Only what lies on the counter, and the colours of the
    canopy and the sign, change with the good."""
    W, H = 48, 48
    GOODS = ('vegetables', 'fish', 'milk')
    HANG = ((6, 17), (13, 19))             # where the fish stall hangs two fish from the rail

    def __init__(self, good, canopy='teal', icon_sign=False):
        """`icon_sign` hangs the good's 8x8 carried icon where the coin sign hangs, instead of the coin."""
        if good not in self.GOODS:
            raise ValueError(f'a stall sells one of {self.GOODS}, not {good!r}')
        self.good, self.swap, self.icon_sign = good, CANOPIES[canopy], icon_sign

    def canvas(self):
        c = StreetCanvas(self.W, self.H)
        g = self.H - 2
        ct = g - 12                                              # counter top row
        c.rect(2, ct, self.W - 3, ct + 2, 'L')
        c.hline(2, self.W - 3, ct, 'S')
        c.hline(2, self.W - 3, ct + 3, 'O')
        c.tile(2, ct + 4, self.W - 3, g, ['wwwwwwwwwwwd', 'wwwwwwwwwwwd', 'dddddddddddd'], stagger=4)
        c.vline(2, ct + 4, g, 'L')
        c.vline(self.W - 3, ct + 4, g, 'd')
        for px in (3, self.W - 6):
            c.prop(px - 1, 14, ['OLdO'] * (ct - 14))
        c.tile(2, 1, self.W - 3, 10, ['TTTTCCCC'], ox=2)
        c.swap(2, 1, self.W - 3, 3, {'T': 'g', 'C': 'W'})
        c.swap(2, 1, self.W - 3, 1, {'g': 'T', 'W': 'C'})
        c.prop(1, 7, bd.awning(self.W - 2, h=7))
        c.tile(2, 7, self.W - 3, 7, ['TTTTCCCC'], ox=2)
        if self.swap:
            c.swap(0, 0, self.W - 1, 13, self.swap)
        self._sign(c)
        getattr(self, f'_{self.good}')(c, ct)
        return c

    def _sign(self, c):
        c.vline(self.W // 2, 14, 15, 'x')
        if not self.icon_sign:
            c.prop(self.W // 2 - 2, 16, bd.COIN_SMALL)

    def _vegetables(self, c, ct):
        for x, crate in ((5, CRATE_CARROTS), (16, bd.CRATE_GREENS), (27, CRATE_BEETS)):
            c.prop(x, ct - 5, crate)
        c.vline(38, 14, 15, 'w')
        c.prop(36, 16, ONIONS)

    def _fish(self, c, ct):
        c.prop(5, ct - 6, FISH_TRAY)
        c.prop(25, ct - 5, bd.CRATE_FISH)
        c.prop(36, ct - 5, bd.BUCKET)
        for x, y in self.HANG:
            c.vline(x + 3, 14, y - 1, 'w')

    def _milk(self, c, ct):
        for x in (7, 15, 23):
            c.prop(x, ct - 6, JUG)
        c.prop(32, ct - 10, CHURN)

    def image(self):
        """The stall, with the carried icons that sit over its canvas: the sign, and the hung fish."""
        im = self.canvas().image()
        icon = GOOD[self.good].image()
        if self.icon_sign:
            im.alpha_composite(icon, (self.W // 2 - 4, 16))
        if self.good == 'fish':
            for x, y in self.HANG:
                im.alpha_composite(icon, (x, y))
        return im


# ---------------------------------------------------------------------------- pictograms for the shop signs
CLOTH = [                        # a bolt folded over twice: lilac on ice
    '..QQQQQQQ..',
    '.QZZZZZZZz.',
    '.qqqqqqqqq.',
    '.IiiiiiiiE.',
    '.eeeeeeeeE.',
]
LOGS = [                         # a pile of log ends: three below, two above
    '..wSw.wSw..',
    '..SsS.SsS..',
    '..wSw.wSw..',
    'wSw.wSw.wSw',
    'SsS.SsS.SsS',
    'wSw.wSw.wSw',
]
FOLD_TONES = {                   # a fold's top, front and shade symbols
    'lilac': 'QZz', 'ice': 'Iie', 'rose': 'HFf', 'cream': 'WCc', 'plum': 'ZUq',
}


def fold_stack(c, x, y, tone, w=4):
    """A stack of folded cloth, 3 rows high: lit top, front, shaded foot."""
    for dy, ch in enumerate(FOLD_TONES[tone]):
        c.hline(x, x + w - 1, y + dy, ch)


def banner(tone):
    """A length of cloth hung from a rail: 6 wide with its outline, a lit left edge, a shaded right edge, a notched hem."""
    top, mid, low = FOLD_TONES[tone]
    return ['OOOOOO', *[f'O{top}{mid}{mid}{low}O'] * 14, f'O{low * 4}O', f'O{top}O{mid}O{low}', '.O.O.O']


# ---------------------------------------------------------------------------- the shop fronts
class ShopFront(ABC):
    """A 64x48 (4x2 tile) shop on the standard building shell of buildings.py, in two looks. `image(snow=True)`
    draws it under buildings.snowfall(), as the sprite sheet's `_snow` overlay is made."""
    NAME = ''
    LOOKS = {}

    def __init__(self, look):
        if look not in self.LOOKS:
            raise ValueError(f'{self.NAME} has looks {tuple(self.LOOKS)}, not {look!r}')
        self.look = look

    def building(self):
        b = bd.Building(4)
        b.c = StreetCanvas(b.W, b.H)
        return b

    @abstractmethod
    def draw(self, b):
        """Draw this look on the building b."""

    def image(self, snow=False):
        b = self.building()
        if snow:
            with bd.snowfall():
                self.draw(b)
        else:
            self.draw(b)
        return b.c.image()


class Draper(ShopFront):
    """Cloth: a lilac and cream awning and a folded-bolt sign over a cream wall under a clay roof."""
    NAME = 'Draper'
    LOOKS = {'1': 'bolts in the window', '2': 'cloth hung out on a rail'}

    def draw(self, b):
        c, E = b.c, b.E
        b.roof('terracotta', 'tile')
        b.wall('cream')
        b.doorway(b.wx1 - 21)
        getattr(self, f'_look{self.look}')(b)
        c.prop(b.wx0 - 2, E, bd.awning(b.wx1 - b.wx0 + 5, 'Z', 'q', 'C', 'c'))
        c.swap(b.wx0, E + 7, b.wx1, E + 7, bd.SHADE)             # awning shadow on the wall
        c.prop(b.W // 2 - 7, E - 11, bd.sign_board(CLOTH))

    def _look1(self, b):
        c, wx, wy = b.c, b.wx0 + 3, b.E + 8
        c.stamp(wx, wy, bd.window('w', w=22, h=11))
        for row, tones in ((wy + 2, ('lilac', 'ice', 'rose', 'cream')), (wy + 6, ('rose', 'lilac', 'cream', 'ice'))):
            for i, tone in enumerate(tones):                     # two shelves of folded cloth, a stack to a pane half
                fold_stack(c, wx + 2 + i * 4 + (i >= 2), row, tone)
        c.prop(wx + 23, b.E + 9, bd.LANTERN)

    def _look2(self, b):
        c, E = b.c, b.E
        x0 = b.wx0 + 3
        c.hline(x0, x0 + 22, E + 8, 'O')
        c.hline(x0, x0 + 22, E + 9, 'L')
        c.hline(x0, x0 + 22, E + 10, 'w')
        c.hline(x0, x0 + 22, E + 11, 'O')
        for i, tone in enumerate(('lilac', 'ice', 'rose', 'plum')):
            c.prop(x0 + 1 + i * 5, E + 11, banner(tone))
        c.prop(x0 + 24, E + 9, bd.LANTERN)


class FuelStore(ShopFront):
    """Firewood: a log pictogram sign, a woodpile and logs under cover, on a plain timber building."""
    NAME = 'Fuel Store'
    LOOKS = {'1': 'an open log shed', '2': 'a long stack under a lean-to'}

    def draw(self, b):
        getattr(self, f'_look{self.look}')(b)

    def _look1(self, b):
        c, g = b.c, b.g
        b.roof('shingle', 'shingle')
        b.wall('wood', 'log', plinth=None)
        ox0, ox1 = b.wx0 + 3, b.wx0 + 30
        c.rect(ox0, g - bd.DOOR_H + 1, ox1, g, 'O')              # an open front on the logs inside
        c.rect(ox0 + 1, g - bd.DOOR_H + 2, ox1 - 1, g, 'd')
        c.hline(ox0 + 1, ox1 - 1, g - bd.DOOR_H + 2, 'n')
        c.ground(ox0 + 1, bd.log_pile([6, 5, 4]))
        c.ground(b.wx1 - 22, bd.log_pile([5, 4, 3]))             # the woodpile out front
        c.prop(b.W // 2 - 7, b.E - 11, bd.sign_board(LOGS))

    def _look2(self, b):
        c, E = b.c, b.E
        b.roof('thatch', 'thatch')
        b.wall('wood', 'vboard', plinth=None)
        b.doorway(b.wx1 - 21)
        c.prop(b.wx0 - 2, E, bd.awning(b.wx1 - b.wx0 + 5, 'L', 'w', 'S', 's'))
        c.swap(b.wx0, E + 7, b.wx1, E + 7, bd.SHADE)
        c.ground(b.wx0 + 1, bd.log_pile([8, 7, 6]))              # a long stack along the front
        c.prop(b.W // 2 - 7, E - 11, bd.sign_board(LOGS))


# ---------------------------------------------------------------------------- stock pips
def _grid(*parts):
    """An 8x8 grid with each (x, y, rows) part painted in."""
    g = [['.'] * 8 for _ in range(8)]
    for x, y, rows in parts:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                g[y + dy][x + dx] = ch
    return [''.join(r) for r in g]


BEADS = ((1, 5), (5, 5), (3, 1))        # bottom left, bottom right, top: the pile grows left, right, up
CRATES = ((1, 4), (4, 4), (2, 1))


def _beads(level):
    return _grid(*((x, y, ('WC', 'Cc') if i < level else ('12', '23')) for i, (x, y) in enumerate(BEADS)))


def _crates(level):
    if level == 0:
        return _grid((1, 6, ['ttttt', 'uuuuu']))                 # an empty pallet
    return _grid(*((x, y, ('SSs', 'Ttt', 'tuu')) for x, y in CRATES[:level]))


def _jar(level):
    filled = (0, 1, 3, 5)[level]
    rows = ['..TTTT..'] + [f'.A{"SSSS" if row > 6 - filled else "IIII"}A.' for row in range(2, 7)]
    return _grid((0, 1, rows))


@dataclass(frozen=True)
class StockPips:
    """A premises's stock against a day's demand, in 8x8: 0 to 3, drawn by `rows(level)`."""
    key: str
    name: str
    rows: Callable

    def image(self, level):
        return sk.add_outline(sk.from_ascii(self.rows(level), KEY))


PIPS = (
    StockPips('1', 'beads', _beads),
    StockPips('2', 'crates', _crates),
    StockPips('3', 'a jar filling', _jar),
)
