"""Checks the atlas build against the sprite manifests. Run: python tools/atlas/test_atlas.py

Every manifest frame must be packed once and no two may overlap, every 37th frame must keep its pixels in both the WebP
and the PNG, no side may pass 2,048 px, and a pack too big for 2,048 x 2,048 must fail."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from build_atlas import ATLAS_WIDTH, MAP_PAGE_WIDTH, MAP_PREFIXES, MAX_HEIGHT, pack  # noqa: E402

SPRITES = HERE.parents[1] / 'assets' / 'sprites'
# Pinned here, apart from build_atlas's MAP_PREFIXES, so a wrong prefix list can't pass on both sides (M8.3 Task 1).
MAP_FRAMES = 81
NOT_A_MANIFEST = 'season_map.json'
SAMPLE_EVERY = 37
IMAGES = ('atlas.webp', 'atlas.png')


def load_rgba(path):
    with Image.open(path) as image:
        return image.convert('RGBA')


def manifest_frames():
    """key -> (sheet, x, y, w, h, anchor) for every frame of every manifest, read without the build's help."""
    frames = {}
    for path in sorted(SPRITES.glob('*.json')):
        if path.name == NOT_A_MANIFEST:
            continue
        manifest = json.loads(path.read_text(encoding='utf-8'))
        for name, f in manifest['frames'].items():
            frames[f'{path.stem}/{name}'] = (SPRITES / manifest['image'], f['x'], f['y'], f['w'], f['h'], f['anchor'])
    return frames


def same_pixels(source, decoded):
    """Fully transparent pixels compare by alpha alone: lossless WebP without `exact` and oxipng's --alpha may rewrite
    their hidden RGB."""
    a, b = np.asarray(source), np.asarray(decoded)
    if a.shape != b.shape or not (a[:, :, 3] == b[:, :, 3]).all():
        return False
    seen = a[:, :, 3] > 0
    return bool((a[seen] == b[seen]).all())


def too_big_problems():
    problems = []
    for label, sizes in (('three 800 px shelves', {f'a/{i}': (ATLAS_WIDTH, 800) for i in range(3)}),
                         ('a 2,049 px frame', {'a/wide': (ATLAS_WIDTH + 1, 1)})):
        try:
            pack(sizes)
        except ValueError:
            continue
        problems.append(f'pack accepted {label}, which does not fit {ATLAS_WIDTH} x {MAX_HEIGHT}')
    return problems


def index_problems(index, expected, out):
    problems = []
    packed = index['frames']
    width, height = index['size']
    problems += [f'{key}: missing from atlas.json' for key in expected if key not in packed]
    problems += [f'{key}: in atlas.json but in no manifest' for key in packed if key not in expected]
    for name in IMAGES:
        with Image.open(out / name) as image:
            if image.size != (width, height):
                problems.append(f'{name} is {image.size}, atlas.json says {(width, height)}')
    if width > ATLAS_WIDTH or height > MAX_HEIGHT:
        problems.append(f'atlas is {width} x {height}, over {ATLAS_WIDTH} x {MAX_HEIGHT}')
    return problems


def placement_problems(index, expected):
    problems = []
    width, height = index['size']
    cover = np.zeros((height, width), np.uint8)
    for key, p in index['frames'].items():
        if key not in expected:
            continue
        _, _, _, w, h, anchor = expected[key]
        if (p['w'], p['h'], p['anchor']) != (w, h, anchor):
            problems.append(f'{key}: size or anchor differs from its manifest')
        elif p['x'] < 0 or p['y'] < 0 or p['x'] + w > width or p['y'] + h > height:
            problems.append(f'{key}: lies outside the atlas')
        else:
            cover[p['y']:p['y'] + h, p['x']:p['x'] + w] += 1
    if (cover > 1).any():
        problems.append(f'{int((cover > 1).sum())} atlas pixels belong to more than one frame')
    return problems


def pixel_problems(index, expected, out, images=IMAGES, every=SAMPLE_EVERY):
    problems = []
    sheets = {}
    atlases = {name: load_rgba(out / name) for name in images}
    for key in sorted(expected)[::every]:
        sheet_path, x, y, w, h, _ = expected[key]
        if sheet_path not in sheets:
            sheets[sheet_path] = load_rgba(sheet_path)
        source = sheets[sheet_path].crop((x, y, x + w, y + h))
        p = index['frames'][key]
        for name, atlas in atlases.items():
            if not same_pixels(source, atlas.crop((p['x'], p['y'], p['x'] + w, p['y'] + h))):
                problems.append(f'{key}: pixels differ in {name}')
    return problems


def built_problems(out):
    expected = manifest_frames()
    index = json.loads((out / 'atlas.json').read_text(encoding='utf-8'))
    problems = index_problems(index, expected, out)
    if not problems:
        problems = placement_problems(index, expected) + pixel_problems(index, expected, out)
    sampled = len(sorted(expected)[::SAMPLE_EVERY])
    print(f'{len(expected)} manifest frames, {len(index["frames"])} in atlas.json, {sampled} compared pixel by pixel')
    return problems


def map_page_problems(out):
    """The map page holds exactly the map-scale frames, within MAP_PAGE_WIDTH, each pixel for pixel."""
    expected = {key: frame for key, frame in manifest_frames().items() if key.startswith(MAP_PREFIXES)}
    index = json.loads((out / 'map.json').read_text(encoding='utf-8'))
    width, height = index['size']
    problems = [f'{key}: in map.json but no map frame' for key in index['frames'] if key not in expected]
    problems += [f'{key}: missing from map.json' for key in expected if key not in index['frames']]
    if len(expected) != MAP_FRAMES:
        problems.append(f'{len(expected)} map frames, not {MAP_FRAMES}: a map sprite changed or MAP_PREFIXES drifted')
    if width > MAP_PAGE_WIDTH:
        problems.append(f'the map page is {width} px wide, over {MAP_PAGE_WIDTH}')
    if not problems:
        problems = placement_problems(index, expected) + pixel_problems(index, expected, out, ('map.webp', 'map.png'), 1)
    print(f'{len(expected)} map frames on a {width} x {height} page')
    return problems


def main():
    problems = too_big_problems()
    with tempfile.TemporaryDirectory() as tmp:
        run = subprocess.run([sys.executable, str(HERE / 'build_atlas.py'), '--out', tmp], capture_output=True, text=True)
        print(run.stdout.strip())
        if run.returncode:
            problems.append(f'build_atlas.py exited {run.returncode}: {run.stderr.strip()}')
        else:
            problems += built_problems(Path(tmp)) + map_page_problems(Path(tmp))
    for problem in problems[:20]:
        print('  ' + problem)
    print('ok' if not problems else f'{len(problems)} problem(s)')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
