"""Original 'blob body' characters (drawn for this mockup), in the spirit of Primer's blobs.

Every agent shares ONE non-human body: a warm-yellow gumdrop blob with simple white eyes and dark
pupils, and a 1px dark outline. There is no skin, hair or face shape that could correlate with role.
  police   -> navy peaked cap with a gold badge (the only role accessory)
  merchant -> vermillion headband with a knot + vermillion/cream striped apron (the only role accessories)
  citizen  -> no role accessory; some carry a small neutral item (cream scarf, brown bag,
              straw hat, grey beanie) that is unrelated to role
  stealing -> not a costume: the same blob, crouched and leaning forward, carrying a loot sack
Canvas is 18x22 like the human sprites, with the blob's bottom on the same ground row (20).
"""
from PIL import Image
from pix import from_ascii, add_outline, OUTLINE

W, H = 18, 22

BODY = (247, 201, 72)        # warm yellow, shared by every agent
BODY_S = (217, 158, 48)
BODY_D = (184, 124, 38)
BODY_L = (255, 232, 150)
EYE_W = (255, 255, 255)
PUPIL = (28, 22, 36)
MOUTH = (150, 84, 36)

NAVY = (40, 58, 124)
NAVY_D = (24, 36, 84)
VISOR = (14, 14, 20)
GOLD = (255, 204, 64)
VERM = (227, 66, 52)          # vermillion
VERM_D = (170, 40, 34)
CREAM = (246, 240, 222)
CREAM_D = (204, 196, 176)
BAG = (112, 114, 128)        # charcoal canvas satchel (kept unlike the tan loot sack)
BAG_D = (70, 72, 86)
STRAW = (232, 202, 132)
STRAW_D = (190, 156, 92)
STRAW_K = (120, 80, 44)
KNIT = (198, 200, 212)
KNIT_D = (156, 158, 174)
POM = (244, 244, 250)

CMAP = {
    'Y': BODY, 's': BODY_S, 'd': BODY_D, 'L': BODY_L,
    'W': EYE_W, 'P': PUPIL, 'm': MOUTH, 'e': PUPIL,
    'C': NAVY, 'c': NAVY_D, 'k': (18, 18, 26), 'V': VISOR, 'G': GOLD,
    'R': VERM, 'r': VERM_D,
    'Q': CREAM, 'q': CREAM_D,
    'B': BAG, 'b': BAG_D,
    'A': STRAW, 'a': STRAW_D, 'K': STRAW_K,
    'N': KNIT, 'n': KNIT_D, 'w': POM,
    'O': OUTLINE[:3],
}


def _sym(widths, bottom=20, cx2=17):
    """Symmetric interior spans centred on x = 8.5; bottom row on the ground line."""
    top = bottom - len(widths) + 1
    spans = {}
    for i, w in enumerate(widths):
        x0 = (cx2 - w + 1) // 2
        spans[top + i] = (x0, x0 + w - 1)
    return spans


SHAPES = {
    'stand': _sym([4, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 14, 12, 10]),
    'squash': _sym([6, 10, 12, 14, 16, 16, 16, 16, 16, 16, 16, 14, 12]),     # walk frame
    'sit': _sym([6, 10, 12, 14, 16, 16, 16, 16, 16, 16, 14, 12]),
    # crouched and leaning forward (facing left): hunched back on the right, long low front
    'sneak': {11: (9, 13), 12: (6, 14), 13: (4, 15), 14: (3, 16), 15: (2, 16), 16: (1, 16),
              17: (1, 16), 18: (1, 16), 19: (1, 16), 20: (2, 15)},
}


def _span(spans, y):
    ys = sorted(spans)
    return spans[min(max(y, ys[0]), ys[-1])]


def _grid():
    return [['.'] * W for _ in range(H)]


def _set(g, x, y, ch):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = ch


def _stamp(g, rows, x0, y0):
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch != '.':
                _set(g, x0 + dx, y0 + dy, ch)


def _body(g, spans):
    ys = sorted(spans)
    top, bot = ys[0], ys[-1]
    for y in ys:
        x0, x1 = spans[y]
        for x in range(x0, x1 + 1):
            ch = 'Y'
            if x == x1 or (x == x1 - 1 and y > top + 3):
                ch = 's'
            if y == bot - 1:
                ch = 's'
            if y == bot:
                ch = 'd' if (x <= x0 + 1 or x >= x1 - 1) else 's'
            g[y][x] = ch
    # specular highlight on the upper left of the dome
    a, b = spans[top + 1]
    _set(g, a + 1, top + 1, 'L')
    a, b = spans[top + 2]
    _set(g, a + 1, top + 2, 'L')
    _set(g, a + 2, top + 2, 'L')
    a, b = spans[top + 3]
    _set(g, a + 1, top + 3, 'L')
    return top, bot


def _eyes(g, lx, y, look=0, closed=False, squint=False, gap=2):
    """Two 4x4 Primer-style eyes: white with a 2x2 dark pupil. look: -1 left, 0 front, +1 right."""
    for k, ex in enumerate((lx, lx + 4 + gap)):
        if closed:                               # sleeping: little downward arcs
            _stamp(g, ["e..e", ".ee."], ex, y + 2)
            continue
        y0 = y
        if squint:                               # heavy lids: top row in body shade
            for dx in range(4):
                _set(g, ex + dx, y, 's')
            y0 = y + 1
        for dy in range(y0, y + 4):
            for dx in range(4):
                _set(g, ex + dx, dy, 'W')
        px = ex + (1 if look == 0 else (0 if look < 0 else 2))
        for dy in (y + 2, y + 3):
            _set(g, px, dy, 'P')
            _set(g, px + 1, dy, 'P')


# ---------------------------------------------------------------------------- accessories
CAP = {   # police: navy peaked cap with a gold badge (front), visor protrudes past the body
    'down': ["...CCCCCCCC...",
             "..CCCCGGCCCC..",
             "..cCCCGGCCCc..",
             "..kkkkkkkkkk..",
             "VVVVVVVVVVVVVV"],
    'up':   ["...CCCCCCCC...",
             "..CCCCCCCCCC..",
             "..cCCCCCCCCc..",
             "..kkkkkkkkkk..",
             "..cccccccccc.."],
    'left': ["....CCCCCCCC..",
             "...CGGCCCCCCC.",
             "...CGGCCCCCCc.",
             "...kkkkkkkkkk.",
             "VVVVVVcccccc.."],
}
HAT = ["....AAAAAAAA....",       # straw sun hat: round crown + wide brim on both sides
       "....AAAAAAAA....",
       "....KKKKKKKK....",
       "AAAAAAAAAAAAAAAA",
       ".aaaaaaaaaaaaaa."]
BEANIE = [".......ww.......",
          "......NNNN......",
          ".....NNNNNN.....",
          "....NNNNNNNN....",
          "...NnNnNnNnNn..."]


class Blob:
    def __init__(self, role='citizen', item=None):
        self.role, self.item = role, item

    @staticmethod
    def _shape(direction, pose):
        if pose == 'sneak':
            return 'sneak'
        if pose == 'sit':
            return 'sit'
        if pose == 'walk':
            return 'squash'
        return 'stand'

    def sprite(self, direction='down', pose='', loot=False):
        if direction == 'right':
            return self.sprite('left', pose, loot=loot).transpose(Image.FLIP_LEFT_RIGHT)
        shape = self._shape(direction, pose)
        spans = SHAPES[shape]
        g = _grid()
        top, bot = _body(g, spans)
        a, b = _span(spans, top + 5)
        mid = (a + b) / 2.0
        lx = int(round(mid + 0.5 - 5))           # left eye x for a centred face
        # ------------------------------------------------ face
        if shape == 'sneak':
            _eyes(g, 3, 15, look=-1, squint=True, gap=2)
        elif direction == 'down':
            _eyes(g, lx, top + 4, look=0, closed=(pose in ('sit', 'sleep')))
            _set(g, int(mid), top + 8, 'm')
            _set(g, int(mid) + 1, top + 8, 'm')
        elif direction == 'left':
            _eyes(g, lx - 2, top + 4, look=-1)
            _set(g, lx + 1, top + 8, 'm')
            _set(g, lx + 2, top + 8, 'm')
        # 'up' = back view: no face
        # ------------------------------------------------ role accessories
        if self.role == 'police':
            d = direction
            rows = CAP[d]
            x0 = 1 if d == 'left' else (W - len(rows[0])) // 2
            _stamp(g, rows, x0, top - 1)
        if self.role == 'merchant':
            for yy, ch in ((top + 2, 'R'), (top + 3, 'r')):        # headband
                p, q = _span(spans, yy)
                for xx in range(p, q + 1):
                    _set(g, xx, yy, ch)
            if direction in ('down', 'left'):                       # knot tails out at the side
                q = _span(spans, top + 3)[1]
                _stamp(g, ["RR", ".r"], q + 1, top + 3)
            else:
                _stamp(g, ["RR", "rr"], int(mid), top + 4)
            # waist apron: vermillion across the lower third of the body, cream waistband, pocket
            for yy in range(top + 9, bot):
                p, q = _span(spans, yy)
                for xx in range(p, q + 1):
                    _set(g, xx, yy, 'r' if (yy == bot - 1 or xx == q) else 'R')
            p, q = _span(spans, top + 9)
            for xx in range(p, q + 1):
                _set(g, xx, top + 9, 'Q')
            if direction == 'down':
                _stamp(g, ["rr"], int(mid), top + 11)        # pocket seam
            elif direction == 'left':
                _stamp(g, ["rr"], p + 2, top + 11)
            else:
                _stamp(g, ["R.R", ".R.", "R.R"], int(mid) - 1, top + 8)    # apron bow at the back
        # ------------------------------------------------ neutral citizen items (unrelated to role)
        if self.item == 'scarf':
            for yy, ch in ((top + 9, 'Q'), (top + 10, 'q')):
                p, q = _span(spans, yy)
                for xx in range(p, q + 1):
                    _set(g, xx, yy, ch if (xx + yy) % 3 else 'q')
            p, q = _span(spans, top + 11)
            tx = q if direction == 'left' else p - 1        # tails hang outside the body edge
            for yy in range(top + 10, top + 13):
                _set(g, tx, yy, 'Q')
                _set(g, tx + (1 if direction == 'left' else 1), yy, 'q')
            _set(g, tx, top + 13, 'q')
        if self.item == 'bag':
            p, q = _span(spans, top + 8)
            if direction == 'left':
                sx, ex, bx = p + 3, q - 2, q - 2
            else:
                sx, ex, bx = q - 1, p + 2, p - 1
            for i in range(4):
                xx = round(sx + (ex - sx) * i / 3)
                _set(g, xx, top + 7 + i, 'b')
            _stamp(g, ["bbbbb", "BBBBB", "BBbBB", "BBBBB", "bBBBb"], bx - (1 if direction != 'left' else 0), top + 9)
        if self.item == 'hat':
            _stamp(g, HAT, (W - 16) // 2 + (0 if direction != 'left' else 0), top - 3)
        if self.item == 'beanie':
            _stamp(g, BEANIE, (W - 16) // 2 + 1, top - 2)
        # ------------------------------------------------ render
        rows = [''.join(r) for r in g]
        im = add_outline(from_ascii(rows, CMAP))
        if loot:
            im = _add_loot(im)
        return im


SACK = [
    "..OOO..",
    ".OkkkO.",
    "..OBO..",
    ".OBBBO.",
    "OBBGBBO",
    "OBBBBbO",
    ".OOOOO.",
]


def _add_loot(im):
    """Loot sack carried on the back of the crouched blob (left-facing sprite)."""
    sack = from_ascii(SACK, {'O': OUTLINE, 'k': (110, 74, 44), 'B': (204, 160, 100), 'b': (150, 108, 64),
                             'G': GOLD})
    out = Image.new('RGBA', (W + 3, H), (0, 0, 0, 0))
    out.alpha_composite(sack, (13, 6))
    out.alpha_composite(im, (0, 0))
    return out
