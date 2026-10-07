"""Draws a place Layout from the sprite sheets, with the pipeline of tools/sprites/showcase_wonders.py.

Terrain tiles come first (frame 0 of animated tiles), then 'ground' sprites, then standing sprites
and people together, sorted by anchor y, and the picture is saved at 2x with nearest scaling.
People are drawn from looks.layers(): body, pattern and face, then their job item and emote.

A Season redraws the same place at another time of year from assets/sprites/season_map.json:
sprite swaps, the vegetation palette, and in winter snow on the ground, on trees and on roofs.
"""
import json
import sys
from fnmatch import fnmatch
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'sprites'))

from looks import layers  # noqa: E402
from showcase import Sheets  # noqa: E402
from spritekit import ASSETS, PALETTE, TILE, recolor  # noqa: E402

SEASONS = ('spring', 'summer', 'autumn', 'winter')
GAP = 4


def person_layers(person, frames):
    """(category, name, dx, dy) for each sprite of a person, in drawing order; faces sit at the body's face offset."""
    body, *overlays = layers(person.look, person.stem, person.facing, person.expression)
    fdx, fdy = frames[body].get('face', (0, 0))
    out = [('characters', body, 0, 0)]
    out += [('characters', name, 0, 0) if name.startswith('pattern_') else ('characters', name, fdx, fdy)
            for name in overlays]
    if person.job:
        out.append(('characters', f'job_{person.job}_{person.stem}', 0, 0))
    if person.emote:
        out.append(('icons', f'emote_{person.emote}', 7, fdy - 15))
    return out


def matches(key, patterns):
    return any(fnmatch(key, p) for p in patterns)


class Season:
    """What one season changes in a place: sprite swaps, the vegetation palette, and snow."""

    def __init__(self, name, day=14, temperature=0):
        rules = json.loads((ASSETS / 'season_map.json').read_text(encoding='utf-8'))
        self.swaps = dict(rules['sprites'][name])
        self.palette, self.recolour = rules['palette'][name], rules['recolour']
        self.snow, self.cover = rules['snow'], None
        if name == 'winter' and temperature <= self.snow['max_temperature']:
            self.cover = next(c for first, last, c in self.snow['schedule'] if first <= day <= last)
            self.swaps.update(self.snow['sprites'])

    def sprite(self, category, name):
        """The sprite drawn for (category, name) this season, and its palette swap or None."""
        key = self.swaps.get(f'{category}/{name}', f'{category}/{name}')
        group = next((g for g, patterns in self.recolour.items() if matches(key, patterns)), None)
        category, name = key.split('/')
        return category, name, self.palette.get(group)

    def ground_snow(self, category, name, tx, ty):
        """The snow tile laid over a terrain tile, as (category, name), or None."""
        if not self.cover:
            return None
        key = f'{category}/{name}'
        if matches(key, self.snow['on_ground']):
            tiles = self.snow['ground'][self.cover]
        elif matches(key, self.snow['on_road']):
            tiles = self.snow['road'].get(self.cover)
        else:
            return None
        return tuple(tiles[(tx * 7 + ty * 13) % len(tiles)].split('/')) if tiles else None


def draw(layout, season=None):
    sheets = Sheets()
    frames = json.loads((ASSETS / 'characters.json').read_text(encoding='utf-8'))['frames']
    image = Image.new('RGBA', (layout.width * TILE, layout.height * TILE), (*PALETTE['OUTLINE'], 255))
    recoloured = {}

    def stamp(category, name, x, y):
        swap = None
        if season:
            category, name, swap = season.sprite(category, name)
        im, (ax, ay) = sheets.get(category, name)
        if swap:
            if (category, name) not in recoloured:
                recoloured[category, name] = recolor(im, swap)
            im = recoloured[category, name]
        image.alpha_composite(im, (x - ax, y - ay))
        snow = season and season.cover and sheets.frame(category, name).get(season.snow['overlay'])
        if snow:
            im, (ax, ay) = sheets.get(category, snow)
            image.alpha_composite(im, (x - ax, y - ay))

    for ty, row in enumerate(layout.tiles):
        for tx, (category, name) in enumerate(row):
            x, y = tx * TILE + TILE // 2, ty * TILE + TILE - 1
            stamp(category, name, x, y)
            snow = season and season.ground_snow(category, name, tx, ty)
            if snow:
                stamp(*snow, x, y)
    for s in sorted(layout.ground, key=lambda s: s.y):
        stamp(s.category, s.name, s.x, s.y)
    queue = [(s.y, i, [(s.category, s.name, s.x, s.y)]) for i, s in enumerate(layout.standing)]
    for i, p in enumerate(layout.people):
        sprites = [(c, n, p.x + dx, p.y - p.lift + dy) for c, n, dx, dy in person_layers(p, frames)]
        queue.append((p.y, len(layout.standing) + i, sprites))
    for _, _, sprites in sorted(queue, key=lambda q: (q[0], q[1])):
        for category, name, x, y in sprites:
            stamp(category, name, x, y)
    return image


def save(image, path, scale):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((image.width * scale, image.height * scale), Image.NEAREST).save(path, optimize=True)
    return path


def render(layout, path, scale=2, season=None):
    return save(draw(layout, season), path, scale)


def seasons(layout, path, temperature, day=14, scale=1):
    """The same place in spring, summer, autumn and winter, in a 2x2 grid."""
    panels = [draw(layout, Season(name, day, temperature)) for name in SEASONS]
    w, h = panels[0].size
    grid = Image.new('RGBA', (2 * w + GAP, 2 * h + GAP), (*PALETTE['OUTLINE'], 255))
    for i, panel in enumerate(panels):
        grid.paste(panel, ((i % 2) * (w + GAP), (i // 2) * (h + GAP)))
    return save(grid, path, scale)
