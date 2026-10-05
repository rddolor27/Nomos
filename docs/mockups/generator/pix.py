"""Shared pixel-art helpers: palette, ASCII sprite rendering, auto-outline, 3x5 font.
All art in this module is original, drawn for this mockup."""
from PIL import Image
import numpy as np

OUTLINE = (2, 2, 2, 255)          # matches the near-black outline used by the CC0 tileset


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


def from_ascii(rows, cmap):
    """Render an ASCII grid to an RGBA image. '.' and ' ' are transparent."""
    h = len(rows)
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in '. ':
                continue
            if ch not in cmap:
                raise KeyError(f'symbol {ch!r} not in cmap')
            c = cmap[ch]
            if c is None:
                continue
            px[x, y] = c if len(c) == 4 else rgba(c)
    return im


def add_outline(im, color=OUTLINE, diagonal=False):
    """Add a 1px outline around all opaque pixels (in place on an enlarged-safe canvas)."""
    a = np.array(im)
    filled = a[:, :, 3] > 0
    nb = np.zeros_like(filled)
    nb[1:, :] |= filled[:-1, :]
    nb[:-1, :] |= filled[1:, :]
    nb[:, 1:] |= filled[:, :-1]
    nb[:, :-1] |= filled[:, 1:]
    if diagonal:
        nb[1:, 1:] |= filled[:-1, :-1]
        nb[1:, :-1] |= filled[:-1, 1:]
        nb[:-1, 1:] |= filled[1:, :-1]
        nb[:-1, :-1] |= filled[1:, 1:]
    ring = nb & ~filled
    a[ring] = color
    return Image.fromarray(a).copy()


def pad(im, l=1, t=1, r=1, b=1):
    out = Image.new('RGBA', (im.width + l + r, im.height + t + b), (0, 0, 0, 0))
    out.paste(im, (l, t))
    return out


def recolor(im, mapping):
    """mapping: {(r,g,b): (r,g,b)} exact-colour replacement, alpha kept."""
    a = np.array(im)
    out = a.copy()
    for src, dst in mapping.items():
        m = (a[:, :, 0] == src[0]) & (a[:, :, 1] == src[1]) & (a[:, :, 2] == src[2]) & (a[:, :, 3] > 0)
        out[m, 0], out[m, 1], out[m, 2] = dst[0], dst[1], dst[2]
    return Image.fromarray(out)


# ---------------------------------------------------------------------------
# 3x5 pixel font (original). Each glyph: 5 rows of 3 chars, '#' = ink.
# ---------------------------------------------------------------------------
FONT3x5 = {
    'A': ['.#.', '#.#', '###', '#.#', '#.#'],
    'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'],
    'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'],
    'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'],
    'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'],
    'J': ['..#', '..#', '..#', '#.#', '.#.'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'],
    'L': ['#..', '#..', '#..', '#..', '###'],
    'M': ['#.#', '###', '###', '#.#', '#.#'],
    'N': ['##.', '#.#', '#.#', '#.#', '#.#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
    'P': ['##.', '#.#', '##.', '#..', '#..'],
    'Q': ['.#.', '#.#', '#.#', '##.', '.##'],
    'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'],
    'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '.##'],
    'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
    'W': ['#.#', '#.#', '###', '###', '#.#'],
    'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    'Z': ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'],
    '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '##.'],
    ':': ['...', '.#.', '...', '.#.', '...'],
    '.': ['...', '...', '...', '...', '.#.'],
    ',': ['...', '...', '...', '.#.', '#..'],
    '-': ['...', '...', '###', '...', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    '#': ['#.#', '###', '#.#', '###', '#.#'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'],
    '(': ['.#.', '#..', '#..', '#..', '.#.'],
    ')': ['.#.', '..#', '..#', '..#', '.#.'],
    '=': ['...', '###', '...', '###', '...'],
    '>': ['#..', '.#.', '..#', '.#.', '#..'],
    '<': ['..#', '.#.', '#..', '.#.', '..#'],
    "'": ['.#.', '.#.', '...', '...', '...'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    '?': ['##.', '..#', '.#.', '...', '.#.'],
    '*': ['...', '#.#', '.#.', '#.#', '...'],
    '$': ['.#.', '###', '##.', '.##', '###'],
    '|': ['.#.', '.#.', '.#.', '.#.', '.#.'],
    ' ': ['...', '...', '...', '...', '...'],
    '·': ['...', '...', '.#.', '...', '...'],   # middle dot
}


def text_width(s, spacing=1):
    w = 0
    for ch in s:
        g = FONT3x5.get(ch.upper(), FONT3x5['?'])
        w += len(g[0]) + spacing
    return max(0, w - spacing)


def draw_text(img, x, y, s, color, shadow=None, spacing=1):
    """Draw 3x5 text onto img (RGBA) at native resolution. Returns end x."""
    px = img.load()
    cx = x
    for ch in s:
        g = FONT3x5.get(ch.upper(), FONT3x5['?'])
        for gy, row in enumerate(g):
            for gx, c in enumerate(row):
                if c == '#':
                    if shadow is not None:
                        sx, sy = cx + gx + 1, y + gy + 1
                        if 0 <= sx < img.width and 0 <= sy < img.height:
                            px[sx, sy] = shadow
                    X, Y = cx + gx, y + gy
                    if 0 <= X < img.width and 0 <= Y < img.height:
                        px[X, Y] = color
        cx += len(g[0]) + spacing
    return cx - spacing


def blend_rect(img, box, color, alpha):
    """Alpha-blend a solid rectangle over img (in place). box = (x0,y0,x1,y1) exclusive."""
    a = np.array(img).astype(np.float32)
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(img.width, x1), min(img.height, y1)
    region = a[y0:y1, x0:x1, :3]
    region[:] = region * (1 - alpha) + np.array(color[:3], np.float32) * alpha
    a[y0:y1, x0:x1, :3] = region
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    img.paste(out)
    return img


def upscale(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)
