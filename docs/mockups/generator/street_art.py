"""M2.7 Part 1, life on the street: original mockup art for the owner's pick.

Carried goods, the points where a blob holds them, the chewing faces and the blob that carries them. They are
drawn here, with tools/sprites's own blob (characters.py), its palette and its outline, so a pick can move into
tools/sprites unchanged. Nothing here is traced from or recoloured from anyone's art.

The rules this art keeps (.claude/rules/content.md):
- one shared blob body: an item is a separate 8x8 sprite that sits at a hold point, never a part of a body;
- every good draws the same frame for every blob, so no item says what its carrier earns;
- no sack (rule 3), no black fills, and event faces are the same for everyone, whatever the eye shape.
"""
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools' / 'sprites'))

import characters as ch  # noqa: E402
import icons  # noqa: E402
import spritekit as sk  # noqa: E402

KEY = {**icons.KEY, **sk.cmap(I='ICE_L', i='ICE', j='ICE_S', J='ICE_D', K='LILAC_L', k='LILAC', m='LILAC_S',
                               q='LILAC_D')}
HUES = tuple(sk.BODY_HUES)
CELL = 8                                   # an item's cell, outline ring included
MARGIN = (4, 2)                            # canvas around the 18x22 body, so a good held out to the side or low fits
CANVAS = (ch.W + 2 * MARGIN[0], ch.H + 2 * MARGIN[1])
ANCHOR = (MARGIN[0] + ch.ANCHOR[0], MARGIN[1] + ch.ANCHOR[1])      # the ground point of a blob on that canvas


# ---------------------------------------------------------------------------- carried goods
@dataclass(frozen=True)
class CarriedGood:
    """An 8x8 icon with a clear 1-px border for the outline ring, as icons.icon draws them."""
    name: str
    rows: tuple

    def image(self):
        if len(self.rows) != CELL or any(len(r) != CELL for r in self.rows):
            raise ValueError(f'{self.name}: grid must be {CELL}x{CELL}')
        if self.rows[0].strip('.') or self.rows[-1].strip('.') or any(r[0] != '.' or r[-1] != '.' for r in self.rows):
            raise ValueError(f'{self.name}: keep a clear 1-px border for the outline')
        return sk.add_outline(sk.from_ascii(self.rows, KEY))


GOODS = (
    CarriedGood('bread', (          # a scored loaf
        "........",
        "..SSSS..",
        ".STCTCt.",
        ".TTSTSt.",
        ".TTTTTt.",
        "..tttu..",
        "........",
        "........")),
    CarriedGood('vegetables', (     # a bunch of greens tied with twine, two carrots below
        "........",
        ".G.Gg.g.",
        ".GgGgGf.",
        "..gGgf..",
        "..SSSs..",
        ".RR.RRr.",
        "..R..Rr.",
        "........")),
    CarriedGood('fish', (           # a silver fish with a blue tail
        "........",
        "........",
        "..111.a.",
        ".1O11aa.",
        ".W111aa.",
        "..WWW.a.",
        "........",
        "........")),
    CarriedGood('milk', (           # a jug with a blue stopper and a handle
        "........",
        "..aa....",
        "..Wc....",
        ".WWWc.c.",
        ".WWWc.c.",
        ".WaWcc..",
        ".WWWc...",
        "........")),
    CarriedGood('cloth', (          # a bolt folded over twice: lilac on ice
        "........",
        ".KKKKm..",
        ".kkkkmM.",
        ".qqqqqM.",
        ".IiiiiJ.",
        ".jjjjjJ.",
        "........",
        "........")),
    CarriedGood('tools', (          # a hammer and a saw
        "........",
        ".111.t..",
        ".232.t..",
        "..t.11..",
        "..t.11..",
        "..t.23..",
        "..u.3...",
        "........")),
    CarriedGood('fuel', (           # firewood: a pile of three log ends, as the Fuel Store's sign and woodpile show it
        "........",
        "..tTt...",
        "..TST...",
        "..tTt...",
        ".tTttTt.",
        ".TSTTST.",
        ".tTttTt.",
        "........")),
)
GOOD = {g.name: g for g in GOODS}


# ---------------------------------------------------------------------------- where a blob holds a good
@dataclass(frozen=True)
class Hold:
    """The top-left pixel of an item's 8x8 cell on the body's 18x22 canvas, per pose, for the down and left views.

    Right mirrors left about the canvas, so an item's left edge x becomes 10 - x. Facing up hides the item.
    `eat` is the item's step from its hold on the three eating frames; the first is always (0, 0)."""
    key: str
    name: str
    cells: dict
    eat: dict

    def cell(self, facing, pose):
        if facing == 'up':
            return None
        view = 'left' if facing == 'right' else facing
        x, y = self.cells[view][pose]
        return (ch.W - CELL - x if facing == 'right' else x, y)

    def step(self, facing, frame):
        view = 'left' if facing == 'right' else facing
        dx, dy = self.eat[view][frame]
        return (-dx if facing == 'right' else dx, dy)


def _walk(x, y):
    """The item bobs with the body: one pixel lower on the squashed frame, one higher on the hop."""
    return {'stand': (x, y), 'walk_0': (x - 1, y + 1), 'walk_1': (x, y - 1)}


HOLDS = (
    Hold('1', 'front hip', {'down': _walk(0, 15), 'left': _walk(0, 15)},
         {'down': ((0, 0), (2, -1), (5, -1)), 'left': ((0, 0), (1, -1), (2, -1))}),
    Hold('2', 'rear hip', {'down': _walk(10, 15), 'left': _walk(8, 15)},
         {'down': ((0, 0), (-2, -1), (-5, -1)), 'left': ((0, 0), (-3, -1), (-6, -1))}),
    Hold('3', "arm's length", {'down': _walk(-3, 15), 'left': _walk(-3, 15)},
         {'down': ((0, 0), (3, -1), (8, -1)), 'left': ((0, 0), (2, -1), (5, -1))}),
)
HOLD = {h.key: h for h in HOLDS}


# ---------------------------------------------------------------------------- chewing faces
def _stamped(stamps):
    """A blank blob canvas with (row, x, text) strings stamped in, then clipped to the standing body."""
    rows = [['.'] * ch.W for _ in range(ch.H)]
    for y, x, text in stamps:
        for i, c in enumerate(text):
            if c != '.':
                rows[y][x + i] = c
    a = np.array(sk.from_ascii([''.join(r) for r in rows], ch.KEY))
    a[~(np.array(ch.body_fill('stand', 'left'))[:, :, 3] > 0)] = 0
    return Image.fromarray(a)


_ROUND = {'down': [(11, 4, 'WWWW'), (12, 4, 'WWWW'), (13, 4, 'WOOW'), (14, 4, 'WOOW'),
                   (11, 10, 'WWWW'), (12, 10, 'WWWW'), (13, 10, 'WOOW'), (14, 10, 'WOOW')],
          'left': [(11, 2, 'WWWW'), (12, 2, 'WWWW'), (13, 2, 'OOWW'), (14, 2, 'OOWW'),
                   (11, 8, 'WWWW'), (12, 8, 'WWWW'), (13, 8, 'OOWW'), (14, 8, 'OOWW')]}


def _face(mouths):
    """Calm open round eyes, as the resting face, over each frame's mouth marks: {view: (frame 0, frame 1)}."""
    return {view: tuple(_ROUND[view] + marks for marks in frames) for view, frames in mouths.items()}


@dataclass(frozen=True)
class ChewFace:
    """Two frames of an event face for eating, the same for every blob whatever its eye shape. Faces show an
    event, never a mood: calm open eyes, and a mouth that moves."""
    key: str
    name: str
    stamps: dict

    def image(self, facing, frame):
        view = 'left' if facing == 'right' else facing
        im = _stamped(self.stamps[view][frame])
        return sk.mirror(im) if facing == 'right' else im


CHEWS = (
    ChewFace('1', 'open and shut', _face({            # the jaw: a dash, then a small round mouth
        'down': ([(16, 8, 'OO')], [(15, 8, 'OO'), (16, 7, 'OppO'), (17, 8, 'OO')]),
        'left': ([(16, 3, 'OO')], [(15, 4, 'OO'), (16, 3, 'OppO'), (17, 4, 'OO')])})),
    ChewFace('2', 'side to side', _face({             # the jaw grinding: a dash that slides, a mark on its cheek
        'down': ([(16, 7, 'OOO'), (15, 3, 'O'), (16, 3, 'O')], [(16, 9, 'OOO'), (15, 14, 'O'), (16, 14, 'O')]),
        'left': ([(16, 2, 'OOO')], [(16, 5, 'OOO')])})),
    ChewFace('3', 'wide munch', _face({               # a wide mouth: a flat line, then wide open
        'down': ([(16, 7, 'OOOO')], [(15, 7, 'OOOO'), (16, 6, 'OppppO'), (17, 7, 'OOOO')]),
        'left': ([(16, 3, 'OOOO')], [(15, 3, 'OOOO'), (16, 2, 'OppppO'), (17, 3, 'OOOO')])})),
)
CHEW = {c.key: c for c in CHEWS}


# ---------------------------------------------------------------------------- the blob that carries
def _shifted(im, dx, dy):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.alpha_composite(im, (max(dx, 0), max(dy, 0)), (max(-dx, 0), max(-dy, 0)))
    return out


class Carrier:
    """One blob on the shared canvas, drawn as the renderer stacks it (body, face, job item) and then its carried
    good. Frames come on a canvas with a margin, so a good held out to the side or low fits."""

    def __init__(self, hue='sun', job=None):
        self.hue, self.job = hue, job

    def frame(self, facing='down', pose='stand', good=None, hold=None, face='neutral', step=(0, 0)):
        """`face` is an expression name from characters.py, or a ready 18x22 overlay such as ChewFace.image."""
        body = sk.body_hue(ch.body(pose, facing), self.hue)
        if facing != 'up' and face is not None:
            overlay = ch.face(face, facing) if isinstance(face, str) else face
            body.alpha_composite(_shifted(overlay, *ch.face_offset(pose, facing)))
        if self.job:
            body.alpha_composite(ch.job_item(self.job, pose, facing))
        out = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
        out.alpha_composite(body, MARGIN)
        cell = hold.cell(facing, pose) if good and hold else None
        if cell:
            out.alpha_composite(good.image(), (MARGIN[0] + cell[0] + step[0], MARGIN[1] + cell[1] + step[1]))
        return out

    def eating(self, facing, k, good, hold, chew):
        """Eating frame k of 0, 1, 2: the good at its step from the hold and the chewing face, which alternates
        closed and open (frame 0, 1, 0)."""
        return self.frame(facing, 'stand', good, hold, chew.image(facing, (0, 1, 0)[k]), hold.step(facing, k))
