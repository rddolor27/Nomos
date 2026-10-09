"""Town walls: grey stone runs, square corner towers and gates for the walled capitals and cities
of M3.1 part 2. They are drawn look-only: no sim rule reads them.

GBA-era top-down pixel art in three-quarter view, lit from the top left, in the fort's coursed
stone (military.py) and finished with the shared 1-px OUTLINE ring. Every top is drawn at full
depth and raised by its height, so the pieces chain on the tile grid: a wall's walkway stands
24 px up, over the 22-px blob, and the towers, gatehouse and gate piers stand 32 px up. Merlons
repeat every 8 px, so a run of any length tiles.

- A horizontal run tiles side by side (`joins` lr). In a vertical run each walkway covers the
  face of the piece above it (`joins` u, as the fences do).
- Corner towers are 2x2 tiles, flush with the outside of both runs.
- The front gate is a 2-tile gatehouse in a horizontal run: a stone arch with its doors open
  against the passage. A side gate is a 2-tile gap in a vertical run between two piers, with the
  open door on the north pier's face, because an arch over a sideways passage would hide the
  road in this view.
- No flags, banners or heraldry (content rule 6).

Build: python tools/sprites/walls.py
"""
from abc import ABC, abstractmethod

from buildings import Canvas, add_with_snow, snowing
from military import tops
from spritekit import TILE, Sheet

WALL_RISE = 24
TALL_RISE = 32
COURSE = ['Kkkkkkkx', 'kkkkkkkx', 'kkkkkkkx', 'xxxxxxxx']
RIM = (4, 3, 3, 3, 4, 3, 3, 3, 4)       # merlon and crenel widths along a 30-px rim, corners first
PIER_RIM = (3, 2, 4, 2, 3)              # the same along a 14-px pier
ARCH = (5, 3, 2, 1, 1)                  # how far each row under the crown of the gate's arch is inset
SLIT = ['.OO.', 'OxxO', 'OxxO', 'OxxO', 'OxxO', 'OxxO', 'OOOO']
HATCH = ['OOOOOO', 'OLwwdO', 'OwwwdO', 'OOOOOO']


def run_merlon(i):
    """Merlons straddle the tile edges, 4 px on and 4 off, so neighbouring pieces join."""
    return i % 8 in (6, 7, 0, 1)


def rim(widths):
    cols, x = set(), 0
    for i, w in enumerate(widths):
        if i % 2 == 0:
            cols.update(range(x, x + w))
        x += w
    return cols.__contains__


def parapet(c, x0, y, width, is_merlon, far):
    """Three rows of parapet seen from the front. The far side's crenels open on the sky and the
    near side's show the walkway."""
    lit = tops()[0]
    for i in range(width):
        if is_merlon(i):
            face = 'k' if is_merlon(i + 1) else 'x'
            column = (lit, face, face)
        else:
            column = ('.', '.', lit) if far else ('O', 'x', lit)
        for dy, ch in enumerate(column):
            c.put(x0 + i, y + dy, ch)


def side_parapet(c, x, y0, y1, west):
    """A parapet seen from above along a run's side: 2-px merlons every 8 px, south faces in shade."""
    lit, plain, shade = tops()
    for y in range(y0, y1 + 1):
        k = (y - y0) % 8
        if k >= 3:
            ch = shade
        else:
            ch = lit if west else plain
        c.hline(x, x + 1, y, ch)


def deck(c, x0, y0, x1, y1):
    """Flagstones open to the sky, a step paler than the faces; snow when snowing."""
    if snowing():
        c.rect(x0, y0, x1, y1, 'W')
    else:
        c.tile(x0, y0, x1, y1, ['KKKKKKKk'] * 3 + ['k' * 8], stagger=4)


def face(c, x0, y0, x1, y1, edges=True):
    c.tile(x0, y0, x1, y1, COURSE, stagger=4)
    if edges:
        c.vline(x0, y0, y1, 'K')
        c.vline(x1, y0, y1, 'x')


def arch(c, x0, x1, crown, ground, ch):
    for y in range(crown, ground + 1):
        inset = ARCH[y - crown] if y - crown < len(ARCH) else 0
        c.hline(x0 + inset, x1 - inset, y, ch)


class WallPiece(ABC):
    """A piece of town wall: its footprint in tiles, how high its top stands, and the edges it joins."""

    def __init__(self, name, tiles, rise, joins):
        self.name = name
        self.tiles = tiles
        self.rise = rise
        self.joins = joins

    @abstractmethod
    def draw(self, c):
        """Draw onto a canvas of the footprint plus the rise; the last row stays clear for the ground outline."""

    def image(self):
        w, h = self.tiles
        c = Canvas(w * TILE, h * TILE + self.rise)
        self.draw(c)
        return c.image()

    def add_to(self, sheet):
        meta = {'footprint': list(self.tiles)}
        if self.joins is not None:
            meta['joins'] = self.joins
        add_with_snow(sheet, self.name, self.image(), self.image, **meta)


class Wall(WallPiece):
    """One tile of a run, across the view or down it."""

    def __init__(self, axis):
        super().__init__(f'wall_{axis}', (1, 1), WALL_RISE, 'lr' if axis == 'horizontal' else 'u')
        self.axis = axis

    def draw(self, c):
        shade = tops()[2]
        if self.axis == 'horizontal':
            parapet(c, 0, 1, TILE, run_merlon, far=True)
            deck(c, 0, 4, TILE - 1, 12)
            c.hline(0, TILE - 1, 4, shade)
            parapet(c, 0, 13, TILE, run_merlon, far=False)
            face(c, 0, TILE, TILE - 1, c.h - 2, edges=False)
            return
        side_parapet(c, 1, 0, TILE - 1, west=True)
        deck(c, 3, 0, 12, TILE - 1)
        c.vline(3, 0, TILE - 1, shade)
        side_parapet(c, 13, 0, TILE - 1, west=False)
        face(c, 1, TILE, TILE - 2, c.h - 2)


class Tower(WallPiece):
    """A square corner tower of 2x2 tiles, standing 8 px over the walkway."""

    def __init__(self):
        super().__init__('wall_tower', (2, 2), TALL_RISE, None)

    def draw(self, c):
        right, near = c.w - 2, c.h - 1 - self.rise
        shade = tops()[2]
        parapet(c, 1, 1, right, rim(RIM), far=True)
        side_parapet(c, 1, 4, near - 3, west=True)
        deck(c, 3, 4, right - 2, near - 3)
        c.hline(3, right - 2, 4, shade)
        c.vline(3, 4, near - 3, shade)
        side_parapet(c, right - 1, 4, near - 3, west=False)
        parapet(c, 1, near - 2, right, rim(RIM), far=False)
        face(c, 1, near + 1, right, c.h - 2)
        c.stamp(c.w // 2 - 2, near + 8, SLIT)
        if not snowing():
            c.stamp(c.w // 2 - 3, 12, HATCH)


class Gate(WallPiece):
    """The front gate: a 2-tile gatehouse with a stone arch over the road and its doors open."""

    def __init__(self):
        super().__init__('wall_gate_front', (2, 1), TALL_RISE, 'lr')

    def draw(self, c):
        right, near, ground = c.w - 2, c.h - 1 - self.rise, c.h - 2
        parapet(c, 1, 1, right, rim(RIM), far=True)
        deck(c, 1, 4, right, near - 3)
        c.hline(1, right, 4, tops()[2])
        parapet(c, 1, near - 2, right, rim(RIM), far=False)
        face(c, 1, near + 1, right, ground)
        arch(c, 3, c.w - 4, ground - 24, ground, 'K')            # the ring of arch stones
        for y in (ground - 12, ground - 6):
            c.hline(3, 4, y, 'x')
            c.hline(c.w - 5, c.w - 4, y, 'x')
        arch(c, 5, c.w - 6, ground - 22, ground, '_')            # the opening, where the road shows
        c.rect(c.w // 2 - 2, ground - 25, c.w // 2 + 1, ground - 22, 'K')
        c.vline(c.w // 2 + 1, ground - 25, ground - 22, 'x')     # keystone
        for y in range(ground - 18, ground + 1):                 # the leaves, folded back
            band = y in (ground - 15, ground - 5)
            c.hline(6, 7, y, 'x' if band else 'w')
            c.hline(c.w - 8, c.w - 7, y, 'x' if band else 'w')
            if not band:
                c.put(7, y, 'd')
                c.put(c.w - 8, y, 'L')


class GatePier(WallPiece):
    """A pier at one end of a side gate's 2-tile gap. The north pier's face carries the open door,
    folded back against the passage."""

    def __init__(self, end):
        super().__init__(f'wall_gate_side-{end}', (1, 1), TALL_RISE, 'u' if end == 'north' else '')
        self.door = end == 'north'

    def draw(self, c):
        right, near, ground = c.w - 2, c.h - 1 - self.rise, c.h - 2
        parapet(c, 1, 1, right, rim(PIER_RIM), far=True)
        deck(c, 1, 4, right, near - 3)
        c.hline(1, right, 4, tops()[2])
        parapet(c, 1, near - 2, right, rim(PIER_RIM), far=False)
        face(c, 1, near + 1, right, ground)
        if self.door:
            top = ground - 17
            c.rect(2, top, c.w - 3, ground, 'O')
            c.rect(3, top + 1, c.w - 4, ground, 'w')
            c.vline(3, top + 1, ground, 'L')
            for x in (6, 9):
                c.vline(x, top + 1, ground, 'd')
            for y in (top + 4, ground - 4):
                c.hline(3, c.w - 4, y, 'x')


PIECES = (Wall('horizontal'), Wall('vertical'), Tower(), Gate(), GatePier('north'), GatePier('south'))


def build():
    sheet = Sheet('walls')
    for piece in PIECES:
        piece.add_to(sheet)
    return sheet


if __name__ == '__main__':
    build().save()
