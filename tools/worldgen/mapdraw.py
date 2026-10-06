"""Draw a World as the Country view (whole grid, 8-px tiles) and the Region view (a window of
16-px tiles), from the map, wonders and landmarks sprite sheets. Lines and marks drawn here use
spritekit.PALETTE colours only; images are saved at 2x with nearest scaling.
"""
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'sprites'))

from climate import FARMLAND, GRASSLAND, LAKE, MOUNTAIN, OCEAN, PEAK  # noqa: E402
from model import BIOMES  # noqa: E402
from rng import SHAPE, draw  # noqa: E402
from showcase import Sheets  # noqa: E402
from spritekit import PALETTE  # noqa: E402

SCALE = 2
VARIANT = 0x200
RIVER, ROAD, DECK, RAIL = PALETTE['WATER'], PALETTE['WOOD'], PALETTE['WOOD_L'], PALETTE['WOOD_D']
PEAKS, ICONS, TOWNS = range(3)


@dataclass
class View:
    """A window of the world, in cells, drawn at one tile size."""
    world: object
    size: int
    x0: int
    y0: int
    cols: int
    rows: int


def _sprites():
    sheets, cache = Sheets(), {}

    def get(category, name):
        if (category, name) not in cache:
            cache[category, name] = sheets.get(category, name)
        return cache[category, name]
    return get


def _centre(view, i):
    w, size = view.world, view.size
    return (i % w.width - view.x0) * size + size // 2, (i // w.width - view.y0) * size + size // 2


def _near(view, x, y, margin=2):
    """Inside the window, or close enough below or beside it that a sprite reaches in."""
    return view.x0 - margin <= x < view.x0 + view.cols + margin and view.y0 <= y < view.y0 + view.rows + margin


def _tile(world, i, size):
    b = world.biome[i]
    if b in (OCEAN, LAKE):
        return f'map{size}_water_0'
    if b == PEAK:
        return f'map{size}_mountain'
    if b in (GRASSLAND, FARMLAND):
        return f'map{size}_{BIOMES[b]}_{draw(world.seed, SHAPE, VARIANT, i) & 1}'
    return f'map{size}_{BIOMES[b]}'


def _terrain(view, sprite):
    w, size = view.world, view.size
    image = Image.new('RGBA', (view.cols * size, view.rows * size), PALETTE['WATER'] + (255,))
    for y in range(view.rows):
        for x in range(view.cols):
            im, _ = sprite('map', _tile(w, (view.y0 + y) * w.width + view.x0 + x, size))
            image.alpha_composite(im, (x * size, y * size))
    return image


def _rivers(view, pen, width):
    w = view.world
    for i, r in enumerate(w.receiver):
        if r >= 0 and (w.river[i] or (w.biome[i] == LAKE and w.river[r])):
            pen.line([_centre(view, i), _centre(view, r)], fill=RIVER, width=width + (w.river[i] == 3))


def _dots(pen, a, b, dash, gap, thick):
    (ax, ay), (bx, by) = a, b
    steps = max(abs(bx - ax), abs(by - ay))
    for k in range(steps + 1):
        if k % (dash + gap) < dash:
            x, y = ax + (bx - ax) * k // steps, ay + (by - ay) * k // steps
            pen.rectangle([x, y, x + thick - 1, y + thick - 1], fill=ROAD)


def _roads(view, pen, dash, gap, thick):
    for path in view.world.roads:
        for a, b in zip(path, path[1:]):
            _dots(pen, _centre(view, a), _centre(view, b), dash, gap, thick)


def _bridges(view, pen, along, across):
    """A plank deck laid along the road where it crosses the river."""
    w = view.world
    flat = {}
    for path in w.roads:
        for k, c in enumerate(path):
            if c not in flat:
                a, b = path[max(0, k - 1)], path[min(len(path) - 1, k + 1)]
                flat[c] = abs(b % w.width - a % w.width) >= abs(b // w.width - a // w.width)
    for c in w.bridges:
        x, y = _centre(view, c)
        dx, dy = (along, across) if flat[c] else (across, along)
        pen.rectangle([x - dx // 2, y - dy // 2, x + (dx - 1) // 2, y + (dy - 1) // 2], fill=DECK, outline=RAIL)


def _overlays(view):
    """(row, layer, column, category, sprite) for everything that rises over the terrain."""
    w, size = view.world, view.size
    out = []
    for i, b in enumerate(w.biome):
        x, y = i % w.width, i // w.width
        if _near(view, x, y, 1):
            if b == PEAK:
                out.append((y, PEAKS, x, 'map', f'map{size}_peak'))
            elif b == MOUNTAIN and size == 16 and draw(w.seed, SHAPE, VARIANT, i) & 2:
                out.append((y, PEAKS, x, 'map', 'map16_peak-low'))
    out += [(f.y, ICONS, f.x, 'wonders', f'map{size}_wonder_{f.kind}') for f in w.wonders if _near(view, f.x, f.y)]
    out += [(f.y, ICONS, f.x, 'landmarks', f'map{size}_landmark_{f.kind}') for f in w.landmarks
            if _near(view, f.x, f.y)]
    out += [(s.y, TOWNS, s.x, 'map', f'settlement_{s.tier}') for s in w.settlements if _near(view, s.x, s.y, 3)]
    return out


def _beside(view, sprite, taken):
    """In-place landmark icons in free land cells either side of their settlement; lighthouses
    already have an icon of their own on the coast."""
    w = view.world
    out = []
    for s in w.settlements:
        kinds = [k for k in s.landmarks if k != 'lighthouse']
        if not kinds or not _near(view, s.x, s.y, 0):
            continue
        im, _ = sprite('map', f'settlement_{s.tier}')
        reach = (im.width // 2 + view.size // 2) // view.size + 1
        spots = [(s.x + reach, s.y), (s.x - reach, s.y), (s.x + reach, s.y + 1), (s.x - reach, s.y + 1)]
        free = [(x, y) for x, y in spots if _near(view, x, y, 0) and (x, y) not in taken
                and w.biome[y * w.width + x] not in (OCEAN, LAKE)]
        for kind, (x, y) in zip(kinds, free):
            taken.add((x, y))
            out.append((y, ICONS, x, 'landmarks', f'map{view.size}_landmark_{kind}'))
    return out


def _place(image, sprite, view, overlays):
    for gy, _, gx, category, name in sorted(overlays):
        im, (ax, ay) = sprite(category, name)
        image.alpha_composite(im, ((gx - view.x0) * view.size + view.size // 2 - ax,
                                   (gy - view.y0) * view.size + view.size - 1 - ay))


def _save(image, path):
    image.resize((image.width * SCALE, image.height * SCALE), Image.NEAREST).save(path, optimize=True)


def country_png(world, path):
    sprite = _sprites()
    view = View(world, 8, 0, 0, world.width, world.height)
    image = _terrain(view, sprite)
    pen = ImageDraw.Draw(image)
    _rivers(view, pen, 1)
    _roads(view, pen, 1, 1, 1)
    _bridges(view, pen, 4, 3)
    _place(image, sprite, view, _overlays(view))
    _save(image, path)


def region_png(world, path, centre=None, cols=30, rows=17):
    sprite = _sprites()
    cx, cy = centre or (world.settlements[0].x, world.settlements[0].y)
    x0 = max(0, min(world.width - cols, cx - cols // 2))
    y0 = max(0, min(world.height - rows, cy - rows // 2))
    view = View(world, 16, x0, y0, cols, rows)
    image = _terrain(view, sprite)
    pen = ImageDraw.Draw(image)
    _rivers(view, pen, 2)
    _roads(view, pen, 2, 2, 2)
    _bridges(view, pen, 8, 5)
    overlays = _overlays(view)
    taken = {(gx, gy) for gy, layer, gx, _, _ in overlays if layer != PEAKS}
    _place(image, sprite, view, overlays + _beside(view, sprite, taken))
    _save(image, path)
