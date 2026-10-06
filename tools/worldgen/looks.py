"""Blob looks: body hue, eye shape and body pattern, drawn once per person.

A look depends only on (world seed, person id): never on parents, culture, place, job or wealth,
so no look can mark a family or a group, and no sim rule reads it (content rules 1 and 8). The 96
looks fit one byte per person, in place of round 8's hue column.
"""
from rng import LOOK, draw

HUES = ('sun', 'lilac', 'rose', 'ice', 'mint', 'silver')
EYES = ('round', 'dot', 'tall', 'wide')
PATTERNS = ('plain', 'speckle', 'spots', 'patch')
LOOKS = len(HUES) * len(EYES) * len(PATTERNS)


def look_for(seed, person_id):
    return draw(seed, LOOK, person_id) % LOOKS


def decode(look):
    return HUES[look % len(HUES)], EYES[look // len(HUES) % len(EYES)], PATTERNS[look // (len(HUES) * len(EYES))]


def layers(look, stem, facing, expression='neutral'):
    """Character sprite names for one frame, in drawing order: body, pattern, face.

    `stem` is a body frame such as 'stand_down' or 'walk_left_0'. Faces are drawn at the body
    frame's `face` offset; the back view has none. Only the resting faces vary with eye shape;
    event faces are the same for everyone.
    """
    hue, eyes, pattern = decode(look)
    names = [f'blob_{hue}_{stem}']
    if pattern != 'plain':
        names.append(f'pattern_{pattern}_{hue}_{stem}')
    if facing != 'up' and expression:
        style = f'-{eyes}' if expression in ('neutral', 'blink') and eyes != 'round' else ''
        names.append(f'face_{expression}{style}_{facing}')
    return names
