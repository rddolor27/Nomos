"""Shared kit for Nomos's original pixel-art sprites: one master palette (at most 64 colours),
ASCII-grid drawing, outlines, sheet packing with a JSON manifest, and labelled previews.

Every sprite module draws only with PALETTE colours so the whole set stays coherent and can
be re-indexed into the renderer's palette later.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

PALETTE = {
    'OUTLINE': (2, 2, 2),
    'WHITE': (255, 255, 255),
    'CREAM': (246, 240, 222),
    'CREAM_D': (204, 196, 176),
    'SAND': (232, 202, 132),
    'SAND_D': (190, 156, 92),
    'WOOD_L': (168, 108, 60),
    'WOOD': (120, 76, 44),
    'WOOD_D': (76, 46, 28),
    'GRASS_L': (140, 214, 80),
    'GRASS': (76, 170, 60),
    'LEAF_D': (44, 110, 52),
    'TEAL': (42, 157, 143),
    'TEAL_D': (28, 110, 102),
    'WATER_L': (124, 196, 240),
    'WATER': (60, 124, 208),
    'NAVY': (40, 58, 124),
    'NAVY_D': (24, 36, 84),
    'STONE_L': (154, 162, 180),
    'STONE': (106, 114, 134),
    'STONE_D': (70, 76, 94),
    'ROOF': (208, 106, 58),
    'ROOF_D': (154, 68, 38),
    'VERMILLION': (227, 66, 52),
    'GOLD': (255, 204, 64),
    'BODY': (247, 201, 72),
    'BODY_S': (217, 158, 48),
    'BODY_D': (184, 124, 38),
    'BODY_L': (255, 232, 150),
    'PINK': (240, 160, 160),
    'PINK_D': (200, 110, 120),
    'PLUM': (122, 74, 134),
    'LILAC': (190, 160, 234),
    'LILAC_S': (158, 124, 206),
    'LILAC_D': (122, 92, 170),
    'LILAC_L': (226, 210, 250),
    'ROSE': (246, 150, 196),
    'ROSE_S': (216, 112, 164),
    'ROSE_D': (176, 80, 132),
    'ROSE_L': (252, 196, 224),
    'ICE': (170, 212, 248),
    'ICE_S': (128, 176, 222),
    'ICE_D': (92, 140, 190),
    'ICE_L': (214, 236, 252),
    'MINT': (150, 226, 196),
    'MINT_S': (110, 196, 166),
    'MINT_D': (78, 160, 136),
    'MINT_L': (206, 246, 228),
    'SILVER': (206, 210, 226),
    'SILVER_S': (170, 174, 194),
    'SILVER_D': (132, 136, 158),
    'SILVER_L': (236, 238, 246),
    # Seasonal stand-ins for GRASS_L, GRASS and LEAF_D: the renderer swaps them in on vegetation
    # (assets/sprites/season_map.json), so no sprite is redrawn per season.
    'SPRING_L': (186, 232, 114),
    'SPRING': (122, 196, 78),
    'SPRING_D': (66, 138, 64),
    'AUTUMN_L': (200, 206, 100),
    'AUTUMN': (160, 164, 70),
    'AUTUMN_D': (104, 112, 52),
    'WINTER_L': (208, 218, 198),
    'WINTER': (162, 178, 158),
    'WINTER_D': (110, 126, 114),
}
assert len(PALETTE) <= 64 and len(set(PALETTE.values())) == len(PALETTE)
PALETTE_RGB = set(PALETTE.values())

# Body hues are cosmetic: assigned at random at birth and never read by any sim rule.
# They are abstract colours, deliberately not skin tones, and avoid the role and alert colours.
BODY_HUES = {
    'sun': ('BODY', 'BODY_S', 'BODY_D', 'BODY_L'),
    'lilac': ('LILAC', 'LILAC_S', 'LILAC_D', 'LILAC_L'),
    'rose': ('ROSE', 'ROSE_S', 'ROSE_D', 'ROSE_L'),
    'ice': ('ICE', 'ICE_S', 'ICE_D', 'ICE_L'),
    'mint': ('MINT', 'MINT_S', 'MINT_D', 'MINT_L'),
    'silver': ('SILVER', 'SILVER_S', 'SILVER_D', 'SILVER_L'),
}


def body_hue(im, hue):
    """Recolour a sun-yellow body to another body hue."""
    return recolor(im, dict(zip(BODY_HUES['sun'], BODY_HUES[hue]))) if hue != 'sun' else im

TILE = 16
ASSETS = Path(__file__).resolve().parents[2] / 'assets' / 'sprites'


def cmap(**symbols):
    """Map single-character symbols to palette names, e.g. cmap(O='OUTLINE', w='WHITE')."""
    return {ch: PALETTE[name] for ch, name in symbols.items()}


def from_ascii(rows, symbols):
    """Render an ASCII grid to RGBA. '.' and ' ' are transparent; every other symbol must be mapped."""
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in '. ':
                continue
            if ch not in symbols:
                raise KeyError(f'symbol {ch!r} at ({x},{y}) is not mapped')
            px[x, y] = (*symbols[ch], 255)
    return im


def add_outline(im, color=PALETTE['OUTLINE'], diagonal=False):
    """Ring every opaque region with a 1-px outline. Pad first if the sprite touches its edge."""
    a = np.array(im)
    filled = a[:, :, 3] > 0
    near = np.zeros_like(filled)
    near[1:, :] |= filled[:-1, :]
    near[:-1, :] |= filled[1:, :]
    near[:, 1:] |= filled[:, :-1]
    near[:, :-1] |= filled[:, 1:]
    if diagonal:
        near[1:, 1:] |= filled[:-1, :-1]
        near[1:, :-1] |= filled[:-1, 1:]
        near[:-1, 1:] |= filled[1:, :-1]
        near[:-1, :-1] |= filled[1:, 1:]
    a[near & ~filled] = (*color, 255)
    return Image.fromarray(a)


def pad(im, l=1, t=1, r=1, b=1):
    out = Image.new('RGBA', (im.width + l + r, im.height + t + b), (0, 0, 0, 0))
    out.paste(im, (l, t))
    return out


def mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def recolor(im, mapping):
    """Swap palette colours by name, e.g. recolor(house, {'ROOF': 'STONE', 'ROOF_D': 'STONE_D'})."""
    a = np.array(im)
    out = a.copy()
    for src, dst in mapping.items():
        s, d = PALETTE[src], PALETTE[dst]
        hit = (a[:, :, 0] == s[0]) & (a[:, :, 1] == s[1]) & (a[:, :, 2] == s[2]) & (a[:, :, 3] > 0)
        out[hit, :3] = d
    return Image.fromarray(out)


def overlay(base, changed):
    """The pixels where `changed` differs from `base`, on transparency, or None if none differ."""
    a, b = np.array(base), np.array(changed)
    diff = (a != b).any(axis=2)
    if not diff.any():
        return None
    out = np.zeros_like(b)
    out[diff] = b[diff]
    return Image.fromarray(out)


def off_palette(im):
    """Return the set of opaque colours not in PALETTE, plus a flag for any partial alpha."""
    a = np.array(im.convert('RGBA'))
    alpha = a[:, :, 3]
    partial = bool(((alpha > 0) & (alpha < 255)).any())
    colours = {tuple(int(v) for v in c) for c in a[alpha > 0][:, :3]}
    return colours - PALETTE_RGB, partial


class Sheet:
    """Collects named sprites, packs them into one PNG with a JSON manifest.

    Anchors are the pixel the renderer places on the ground point (default bottom centre),
    which y-sorting and tile placement need.
    """

    def __init__(self, name, width=256, gap=1):
        self.name, self.width, self.gap = name, width, gap
        self.frames = []

    def add(self, name, im, anchor=None, **meta):
        if any(f[0] == name for f in self.frames):
            raise ValueError(f'duplicate sprite name {name!r}')
        bad, partial = off_palette(im)
        if bad or partial:
            raise ValueError(f'{name}: off-palette colours {sorted(bad)[:4]} partial_alpha={partial}')
        ax, ay = anchor if anchor else (im.width // 2, im.height - 1)
        self.frames.append((name, im, (ax, ay), meta))

    def build(self):
        order = sorted(self.frames, key=lambda f: (-f[1].height, f[0]))
        x = y = shelf = 0
        placed = []
        for name, im, anchor, meta in order:
            if im.width > self.width:
                raise ValueError(f'{name} is wider than the sheet')
            if x + im.width > self.width:
                x, y, shelf = 0, y + shelf + self.gap, 0
            placed.append((name, im, anchor, meta, x, y))
            x += im.width + self.gap
            shelf = max(shelf, im.height)
        height = y + shelf
        sheet = Image.new('RGBA', (self.width, height), (0, 0, 0, 0))
        frames = {}
        for name, im, (ax, ay), meta, px, py in sorted(placed, key=lambda p: p[0]):
            sheet.paste(im, (px, py))
            frames[name] = {'x': px, 'y': py, 'w': im.width, 'h': im.height, 'anchor': [ax, ay], **meta}
        return sheet, frames

    def save(self, out_dir=ASSETS):
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        sheet, frames = self.build()
        sheet.save(out_dir / f'{self.name}.png', optimize=True)
        manifest = {'image': f'{self.name}.png', 'size': [sheet.width, sheet.height], 'tile': TILE, 'frames': frames}
        (out_dir / f'{self.name}.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        preview(self.frames, out_dir / 'previews' / f'{self.name}_preview.png')
        return sheet, frames


FONT3x5 = {
    'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '.#.'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'],
    'M': ['#.#', '###', '###', '#.#', '#.#'], 'N': ['##.', '#.#', '#.#', '#.#', '#.#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
    'Q': ['.#.', '#.#', '#.#', '##.', '.##'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '.##'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
    'W': ['#.#', '#.#', '###', '###', '#.#'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'Z': ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
    '_': ['...', '...', '...', '...', '###'], '-': ['...', '...', '###', '...', '...'],
    ' ': ['...', '...', '...', '...', '...'],
}


def _draw_text(img, x, y, s, color):
    px = img.load()
    for ch in s.upper():
        glyph = FONT3x5.get(ch, FONT3x5['-'])
        for gy, row in enumerate(glyph):
            for gx, c in enumerate(row):
                if c == '#' and 0 <= x + gx < img.width and 0 <= y + gy < img.height:
                    px[x + gx, y + gy] = color
        x += 4


def preview(frames, path, scale=4, columns=6):
    """A labelled contact sheet on a light background, for reviewing sprites at a glance."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    cell_w = max(max(im.width for _, im, _, _ in frames), max(len(n) for n, _, _, _ in frames) * 4) + 4
    cell_h = max(im.height for _, im, _, _ in frames) + 10
    rows = -(-len(frames) // columns)
    canvas = Image.new('RGBA', (cell_w * columns, cell_h * rows), (226, 230, 214, 255))
    for i, (name, im, _, _) in enumerate(frames):
        cx, cy = (i % columns) * cell_w, (i // columns) * cell_h
        canvas.alpha_composite(im, (cx + (cell_w - im.width) // 2, cy + 2))
        _draw_text(canvas, cx + 2, cy + cell_h - 7, name, (40, 40, 48, 255))
    canvas.resize((canvas.width * scale, canvas.height * scale), Image.NEAREST).save(path)
