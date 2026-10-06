"""Draws a place Layout from the sprite sheets, with the pipeline of tools/sprites/showcase_wonders.py.

Terrain tiles come first (frame 0 of animated tiles), then 'ground' sprites, then standing sprites
and people together, sorted by anchor y, and the picture is saved at 2x with nearest scaling.
People are drawn from looks.layers(): body, pattern and face, then their job item and emote.
"""
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'sprites'))

from looks import layers  # noqa: E402
from showcase import Sheets  # noqa: E402
from spritekit import ASSETS, PALETTE, TILE  # noqa: E402

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


def render(layout, path, scale=2):
    sheets = Sheets()
    frames = json.loads((ASSETS / 'characters.json').read_text(encoding='utf-8'))['frames']
    image = Image.new('RGBA', (layout.width * TILE, layout.height * TILE), (*PALETTE['OUTLINE'], 255))

    def stamp(category, name, x, y):
        im, (ax, ay) = sheets.get(category, name)
        image.alpha_composite(im, (x - ax, y - ay))

    for ty, row in enumerate(layout.tiles):
        for tx, (category, name) in enumerate(row):
            stamp(category, name, tx * TILE + TILE // 2, ty * TILE + TILE - 1)
    for s in sorted(layout.ground, key=lambda s: s.y):
        stamp(s.category, s.name, s.x, s.y)
    queue = [(s.y, i, [(s.category, s.name, s.x, s.y)]) for i, s in enumerate(layout.standing)]
    for i, p in enumerate(layout.people):
        sprites = [(c, n, p.x + dx, p.y - p.lift + dy) for c, n, dx, dy in person_layers(p, frames)]
        queue.append((p.y, len(layout.standing) + i, sprites))
    for _, _, sprites in sorted(queue, key=lambda q: (q[0], q[1])):
        for category, name, x, y in sprites:
            stamp(category, name, x, y)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((image.width * scale, image.height * scale), Image.NEAREST).save(path, optimize=True)
    return path
