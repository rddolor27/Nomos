"""Access to the CC0 'Superpowers Ninja Adventure' tileset (Pixel-boy / Sparklin Labs) plus small
derived pieces (recolours, wall stretch) and a few original props drawn for this mockup."""
from PIL import Image
import numpy as np
from pix import from_ascii, OUTLINE

BASE = '/tmp/claude-0/-home-user/35ba81c6-3dea-5b8e-ba6b-ebc48a230ba6/scratchpad/mockup/sap/ninja-adventure/'
TS = Image.open(BASE + 'background-elements/tileset.png').convert('RGBA')


def tile(c, r, w=1, h=1):
    return TS.crop((c * 16, r * 16, (c + w) * 16, (r + h) * 16))


def item(name):
    return Image.open(BASE + 'items/' + name).convert('RGBA')


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def recolor_region(im, mapping, box=None):
    a = np.array(im)
    out = a.copy()
    if box is None:
        box = (0, 0, im.width, im.height)
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1]
    osub = out[y0:y1, x0:x1]
    for src, dst in mapping.items():
        s = hexc(src) if isinstance(src, str) else src
        d = hexc(dst) if isinstance(dst, str) else dst
        m = (sub[:, :, 0] == s[0]) & (sub[:, :, 1] == s[1]) & (sub[:, :, 2] == s[2]) & (sub[:, :, 3] > 0)
        osub[m, 0], osub[m, 1], osub[m, 2] = d
    return Image.fromarray(out)


def stretch_rows(im, row, n):
    """Insert n copies of pixel row `row` (taller walls so 20px characters fit the doors)."""
    a = np.array(im)
    rep = np.repeat(a[row:row + 1], n, axis=0)
    return Image.fromarray(np.concatenate([a[:row], rep, a[row:]], axis=0))


# ------------------------------------------------------------------ buildings (CC0 sprites, lightly modified)
def house_thatch():
    return stretch_rows(tile(0, 0, 4, 3), 38, 4)


def house_thatch2():
    return stretch_rows(tile(8, 0, 4, 3), 38, 4)


def house_plaster():
    return stretch_rows(tile(4, 0, 4, 3), 38, 4)


def police_station():
    """CC0 tiled-roof hall, roof recoloured to charcoal slate and timber to police navy."""
    im = tile(12, 0, 4, 3)
    roof = {'#db3024': '#5d6578', '#f55f2a': '#7d8699', '#ff8b62': '#a3abbd', '#e38967': '#8e97aa',
            '#862b26': '#353a49'}
    walls = {'#db3024': '#34477e', '#f55f2a': '#4b62a3', '#ff8b62': '#6f86c4', '#e38967': '#8e9fcf',
             '#862b26': '#202a4d'}
    im = recolor_region(im, roof, (0, 0, 64, 30))
    im = recolor_region(im, walls, (0, 30, 64, 48))
    return stretch_rows(im, 38, 4)


# ------------------------------------------------------------------ original props
def awning(width=66, c1=(70, 158, 92), c2=(246, 238, 214)):
    """Scalloped striped shop awning (original)."""
    h = 8
    im = Image.new('RGBA', (width, h), (0, 0, 0, 0))
    px = im.load()
    d1 = tuple(int(v * 0.78) for v in c1)
    d2 = tuple(int(v * 0.86) for v in c2)
    for x in range(width):
        stripe = ((x - 1) // 4) % 2
        base, shade = (c1, d1) if stripe == 0 else (c2, d2)
        px[x, 0] = OUTLINE
        for y in range(1, 5):
            px[x, y] = base + (255,) if y < 4 else shade + (255,)
        k = (x - 1) % 4
        if k in (1, 2):
            px[x, 5] = shade + (255,)
            px[x, 6] = OUTLINE
        else:
            px[x, 5] = OUTLINE
    for y in range(0, 6):
        px[0, y] = OUTLINE
        px[width - 1, y] = OUTLINE
    return im


def plate(text, fg, bg, border=OUTLINE, padx=2, pady=1):
    from pix import text_width, draw_text
    w = text_width(text) + 2 * padx + 2
    h = 5 + 2 * pady + 2
    im = Image.new('RGBA', (w, h), border)
    px = im.load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            px[x, y] = bg + (255,)
    # top highlight
    hl = tuple(min(255, int(v * 1.25) + 10) for v in bg)
    for x in range(1, w - 1):
        px[x, 1] = hl + (255,)
    draw_text(im, 1 + padx, 1 + pady + 0, text, fg + (255,))
    return im


BENCH = [
    "OOOOOOOOOOOOOOOO",
    "OwwwwwwwwwwwwwwO",
    "OWWWWWWWWWWWWWWO",
    "OOOOOOOOOOOOOOOO",
    "OwwwwwwwwwwwwwwO",
    "OWWWWWWWWWWWWWWO",
    "OddddddddddddddO",
    "OOOOOOOOOOOOOOOO",
    ".OdO........OdO.",
    ".OdO........OdO.",
    ".OOO........OOO.",
]


def bench():
    return from_ascii(BENCH, {'O': OUTLINE, 'W': (189, 121, 89), 'w': (226, 160, 112), 'd': (125, 62, 36)})


COUNTER = [
    "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
    "OttttttttttttttttttttttttttttttttttttttttO",
    "OTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTO",
    "OTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTO",
    "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
    "OwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwO",
    "OWWWWWWWWWWWWdWWWWWWWWWWWWWWdWWWWWWWWWWWWO",
    "OWWWWWWWWWWWWdWWWWWWWWWWWWWWdWWWWWWWWWWWWO",
    "OWWWWWWWWWWWWdWWWWWWWWWWWWWWdWWWWWWWWWWWWO",
    "OddddddddddddddddddddddddddddddddddddddddO",
    "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
]


def counter(width=42):
    rows = []
    for r in COUNTER:
        mid = r[1:-1]
        # stretch by repeating the central column pattern; keep plank seams every 15 px
        body = (mid[0] * (width - 2))
        if r.startswith('OW') and 'd' in r:
            body = ''.join('d' if (i % 15 == 12) else 'W' for i in range(width - 2))
        rows.append(r[0] + body + r[-1])
    return from_ascii(rows, {'O': OUTLINE, 'T': (210, 179, 125), 't': (238, 207, 155),
                                'W': (189, 121, 89), 'w': (214, 150, 108), 'd': (125, 62, 36)})


LAMP = [
    ".OOOO.",
    "OwBBwO",
    "OBbbBO",
    "OBbbBO",
    "OwBBwO",
    ".OOOO.",
    "..Od..",
    "..Od..",
    "..Od..",
    "..Od..",
    "..Od..",
    ".OddO.",
    ".OOOO.",
]


def police_lamp():
    return from_ascii(LAMP, {'O': OUTLINE, 'B': (90, 150, 240), 'b': (190, 225, 255), 'w': (60, 100, 190),
                             'd': (60, 64, 80)})


def badge_emblem():
    rows = [
        "..OOO..",
        ".OGGGO.",
        "OGGwGGO",
        "OGwGwGO",
        "OGGwGGO",
        ".OGGGO.",
        "..OOO..",
    ]
    return from_ascii(rows, {'O': OUTLINE, 'G': (255, 204, 64), 'w': (200, 140, 30)})
