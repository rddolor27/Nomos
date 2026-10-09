"""Town walls: grey stone runs, square corner towers and gates for the walled capitals and cities
of M3.1 part 2, and a log palisade for towns. They are drawn look-only: no sim rule reads them.

GBA-era top-down pixel art in three-quarter view, lit from the top left, in the fort's coursed
stone (military.py) and finished with the shared 1-px OUTLINE ring. Tops are drawn at full depth
and raised by their height: a horizontal run's walkway stands 24 px up, over the 22-px blob, and
the towers, gatehouse and side-gate pier stand 32 px up. Merlons repeat every 8 px, so a run of
any length tiles.

- A horizontal run tiles side by side (`joins` lr) and shows its face. A vertical run is drawn
  flat, its walkway over its own tiles (`joins` u, as the fences do): a raised top would hide a
  side gate's road, as it hides whatever lies behind it.
- Corner towers are 2x2 tiles, flush with the outside of both runs.
- The front gate is a 2-tile gatehouse in a horizontal run: a stone arch with its doors open
  against the passage. A side gate is a 2-tile gap in a vertical run: a tall pier at its north
  end carries the open door on its face, and a flat end cap closes the walkway at its south end.
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


def walkway_down(c):
    """A vertical run's walkway seen from above, over its own tile, with cols 0 and 15 left for the outline."""
    side_parapet(c, 1, 0, TILE - 1, west=True)
    deck(c, 3, 0, 12, TILE - 1)
    c.vline(3, 0, TILE - 1, tops()[2])
    side_parapet(c, 13, 0, TILE - 1, west=False)


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
    """One tile of a run: across the view with its face, or down it, flat."""

    def __init__(self, axis):
        across = axis == 'horizontal'
        super().__init__(f'wall_{axis}', (1, 1), WALL_RISE if across else 0, 'lr' if across else 'u')
        self.axis = axis

    def draw(self, c):
        if self.axis != 'horizontal':
            walkway_down(c)
            return
        parapet(c, 0, 1, TILE, run_merlon, far=True)
        deck(c, 0, 4, TILE - 1, 12)
        c.hline(0, TILE - 1, 4, tops()[2])
        parapet(c, 0, 13, TILE, run_merlon, far=False)
        face(c, 0, TILE, TILE - 1, c.h - 2, edges=False)


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
    """One end of a side gate's 2-tile gap. The north end is a tall pier whose face carries the open
    door, folded back against the passage; the south end caps the flat walkway with a parapet."""

    def __init__(self, end):
        north = end == 'north'
        super().__init__(f'wall_gate_side-{end}', (1, 1), TALL_RISE if north else 0, 'u' if north else '')
        self.north = north

    def draw(self, c):
        if not self.north:
            walkway_down(c)
            c.rect(1, 0, TILE - 2, 3, '_')
            parapet(c, 1, 1, TILE - 2, rim(PIER_RIM), far=True)
            return
        right, near, ground = c.w - 2, c.h - 1 - self.rise, c.h - 2
        parapet(c, 1, 1, right, rim(PIER_RIM), far=True)
        deck(c, 1, 4, right, near - 3)
        c.hline(1, right, 4, tops()[2])
        parapet(c, 1, near - 2, right, rim(PIER_RIM), far=False)
        face(c, 1, near + 1, right, ground)
        top = ground - 17                                        # the open door
        c.rect(2, top, c.w - 3, ground, 'O')
        c.rect(3, top + 1, c.w - 4, ground, 'w')
        c.vline(3, top + 1, ground, 'L')
        for x in (6, 9):
            c.vline(x, top + 1, ground, 'd')
        for y in (top + 4, ground - 4):
            c.hline(3, c.w - 4, y, 'x')


# ------------------------------------------------------------------ the palisade
# Towns get a wall of sharpened logs (owner, 10 October 2026), laid out like the stone wall: a
# horizontal run shows its face and a vertical run is drawn flat, as two staggered lines of points
# seen from above. A thick post closes a run's end, the front gate is a 2-tile timber gateway in a
# horizontal run, and a side gate is a 2-tile gap in a vertical run between a tall gatepost and
# an end post; its door folds flat against the run, edge-on to the view.

PALISADE_RISE = 10      # logs stand 24 px, lower than the stone wall
POST_RISE = 14          # corner posts stand 4 px over the logs
GATE_RISE = 22          # gateposts stand 36 px, giving the gateway 25 px of headroom
DROP = (0, 1, 0, 2)     # how far each 4-px log's point sits under the tallest, repeating every tile
LINE = 4                # left column of a vertical run's points; posts stand on the same 8 px


def log(c, x, top, ground, width=4):
    """An upright log sharpened to a point, lit on its left; under snowfall its point is capped."""
    for y in range(top, ground + 1):
        k = y - top
        inset = max(0, (width - 2 - 2 * k) // 2)
        x0, x1 = x + inset, x + width - 1 - inset
        if snowing() and k < 2:
            c.hline(x0, x1, y, 'W')
            c.put(x1, y, 'I' if k else 'W')
            continue
        c.put(x0, y, 'L')
        c.hline(x0 + 1, x1 - 1, y, 'w')
        c.put(x1, y, 'd')


def logs(c, x0, x1, top, ground):
    for x in range(x0, x1, 4):
        log(c, x, top + DROP[x // 4 % 4], ground)


def beam(c, x0, x1, y):
    """A binding beam across the logs, lit on top, with its shadow on the logs under it."""
    c.hline(x0, x1, y, 'W' if snowing() else 'L')
    c.hline(x0, x1, y + 1, 'w')
    c.hline(x0, x1, y + 2, 'd')


def points(c, y0, y1):
    """A vertical run seen from above: each log's point shows over the one in front of it. The
    second line is staggered 2 px and starts above y0, so its points join the tile above."""
    for y in range(y0, y1, 4):
        log(c, LINE, y, y + 3)
    for y in range(y0 - 2, y1, 4):
        log(c, LINE + 4, y, y + 3)


def post(c, top, ground):
    log(c, LINE, top, ground, width=8)


def gatepost(c, x, width, ground):
    """A post as tall as the gateway, lashed in two places."""
    log(c, x, ground - 35, ground, width)
    for y in (ground - 22, ground - 9):
        c.hline(x + 1, x + width - 2, y, 'd')


class Palisade(WallPiece):
    """One tile of a run: across the view with its face, or down it, flat."""

    def __init__(self, axis):
        across = axis == 'horizontal'
        super().__init__(f'palisade_{axis}', (1, 1), PALISADE_RISE if across else 0, 'lr' if across else 'u')
        self.axis = axis

    def draw(self, c):
        if self.axis != 'horizontal':
            points(c, 0, TILE)
            return
        ground = c.h - 2
        logs(c, 0, TILE, ground - 23, ground)
        beam(c, 0, TILE - 1, ground - 15)


class PalisadeCorner(WallPiece):
    """A thick post on a vertical run's line, closing the end of a horizontal run beside it."""

    def __init__(self, side):
        super().__init__(f'palisade_corner_{side}', (1, 1), POST_RISE, 'ur' if side == 'left' else 'ul')
        self.side = side

    def draw(self, c):
        ground = c.h - 2
        x0, x1 = (8, TILE) if self.side == 'left' else (0, 8)
        logs(c, x0, x1, ground - 23, ground)
        beam(c, x0, x1 - 1, ground - 15)
        post(c, ground - 27, ground)


class PalisadeGate(WallPiece):
    """The front gate: gateposts and a lintel carrying a row of points, its leaves folded back."""

    def __init__(self):
        super().__init__('palisade_gate_front', (2, 1), GATE_RISE, 'lr')

    def draw(self, c):
        ground, right = c.h - 2, c.w - 6
        lintel = ground - 27
        logs(c, 6, right, lintel - 6, lintel - 1)
        beam(c, 0, c.w - 1, lintel)
        for x in (0, right):
            gatepost(c, x, 6, ground)
        for y in range(lintel + 3, ground + 1):                  # the leaves, folded back
            band = y in (lintel + 7, ground - 5)
            c.hline(6, 7, y, 'd' if band else 'w')
            c.hline(right - 2, right - 1, y, 'd' if band else 'w')
            if not band:
                c.put(7, y, 'd')
                c.put(right - 2, y, 'L')


class PalisadeGatePost(WallPiece):
    """One end of a side gate's 2-tile gap: a gatepost as tall as the front gate's at the north end,
    and at the south end the flat run's last point, a thick end post."""

    def __init__(self, end):
        north = end == 'north'
        super().__init__(f'palisade_gate_side-{end}', (1, 1), GATE_RISE if north else 0, 'u' if north else '')
        self.north = north

    def draw(self, c):
        if self.north:
            gatepost(c, LINE, 8, c.h - 2)
            return
        points(c, 8, TILE)
        post(c, 1, 8)


PIECES = (Wall('horizontal'), Wall('vertical'), Tower(), Gate(), GatePier('north'), GatePier('south'),
          Palisade('horizontal'), Palisade('vertical'), PalisadeCorner('left'), PalisadeCorner('right'),
          PalisadeGate(), PalisadeGatePost('north'), PalisadeGatePost('south'))


def build():
    sheet = Sheet('walls')
    for piece in PIECES:
        piece.add_to(sheet)
    return sheet


if __name__ == '__main__':
    build().save()
