"""Writes the places render-gl's place pass is checked against: python tools/worldgen/place_fixtures.py [--check]

Each fixture is a place.py layout in the shape of sim-protocol's PlaceLayout (packages/sim-protocol/src/place/
place-layout.ts), with the SHA-256 of the RGBA pixels placedraw.draw makes from it at 1x, top row first. The browser
must draw the same picture. --check compares a fresh run with the committed file instead of writing it.
"""
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from model import PlaceContext  # noqa: E402
from place import build  # noqa: E402
from placedraw import draw  # noqa: E402

FIXTURE = HERE.parents[1] / 'packages' / 'render-gl' / 'test' / 'fixtures' / 'places-v1.json'
# Pinned here, not read from place.DEMOS, so editing a demo cannot change the fixtures.
PLACES = (
    ('coastal-town', PlaceContext(seed=0x5EA51DE, name='Saltmere', biome='grassland', temperature=165, moisture=120,
                                  tier='town', population=1800, sea='s', coast='beach', roads='nw',
                                  landmarks=('lighthouse', 'fountain'))),
    ('capital', PlaceContext(seed=0xC0FFEE42, name='Highcourt', biome='grassland', temperature=140, moisture=140,
                             tier='capital', population=52000, river='ns', roads='new',
                             landmarks=('clock-tower', 'library', 'fountain'))),
    ('mountain-waterfall', PlaceContext(seed=0xFA115EED, name='Silverfall', biome='mountain', temperature=105,
                                        moisture=170, river='ns', roads='w', wonder='waterfall')),
)
# place-layout.ts's code lists, in the same order.
POSES = ('stand', 'walk', 'sit')
FACINGS = ('down', 'up', 'left', 'right')
EXPRESSIONS = ('neutral', 'happy', 'blink')
JOBS = ('police', 'clinic', 'merchant', 'farmer', 'builder')
EMOTES = ('heart', 'coin', 'food', 'question', 'sweat', 'sleep')
NO_CODE = 255
PEOPLE = ('look', 'pose', 'facing', 'step', 'expression', 'job', 'emote', 'x', 'y', 'lift')


def person_codes(p):
    pose, facing, *step = p.stem.split('_')
    assert facing == p.facing, p
    return {'look': p.look, 'pose': POSES.index(pose), 'facing': FACINGS.index(facing),
            'step': int(step[0]) if step else 0, 'expression': EXPRESSIONS.index(p.expression),
            'job': JOBS.index(p.job) if p.job else NO_CODE, 'emote': EMOTES.index(p.emote) if p.emote else NO_CODE,
            'x': p.x, 'y': p.y, 'lift': p.lift}


def context_fields(ctx):
    return {k: list(v) if isinstance(v, tuple) else v for k, v in vars(ctx).items()}


def layout_codes(layout):
    """A layout in PlaceLayout's shape: frames in order of first use, and frame codes for the tiles and sprites."""
    frames, index = [], {}

    def code(category, frame):
        key = f'{category}/{frame}'
        if key not in index:
            index[key] = len(frames)
            frames.append(key)
        return index[key]

    tiles = [code(category, frame) for row in layout.tiles for category, frame in row]
    ground = [v for s in layout.ground for v in (code(s.category, s.name), s.x, s.y)]
    standing = [v for s in layout.standing for v in (code(s.category, s.name), s.x, s.y)]
    codes = [person_codes(p) for p in layout.people]
    return {'width': layout.width, 'height': layout.height, 'frames': frames, 'tiles': tiles, 'ground': ground,
            'standing': standing, 'people': {field: [c[field] for c in codes] for field in PEOPLE}}


def fixture(name, ctx):
    layout = build(ctx)
    image = draw(layout)
    return {'name': name, 'context': context_fields(ctx), **layout_codes(layout),
            'pixels': {'width': image.width, 'height': image.height,
                       'sha256': hashlib.sha256(image.tobytes()).hexdigest()}}


def text():
    places = [json.dumps(fixture(name, ctx), separators=(',', ':')) for name, ctx in PLACES]
    return '{"version":1,"places":[\n' + ',\n'.join(places) + '\n]}\n'


def main():
    fresh = text()
    if '--check' in sys.argv:
        # core.autocrlf may check the file out with CRLF line ends.
        if FIXTURE.read_text(encoding='utf-8').replace('\r\n', '\n') != fresh:
            sys.exit(f'{FIXTURE} differs from a fresh run of place.py and placedraw.py')
        print(f'{FIXTURE.name} matches')
        return
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(fresh, encoding='utf-8', newline='\n')
    print(f'wrote {FIXTURE} ({len(fresh):,} bytes)')


if __name__ == '__main__':
    main()
