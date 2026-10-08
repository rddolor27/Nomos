"""Packs every sprite frame of every manifest into one atlas (plan: M0.5 Task 3).

Run `python tools/atlas/build_atlas.py [--out DIR]`, default dist/atlas/. It writes atlas.webp (lossless), atlas.png
(shrunk by oxipng when that is installed) and atlas.json, each frame's place keyed "<category>/<name>". Frames are packed,
not sheets, because houses.png alone is 2,316 px tall. The output is a build product and is never committed.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPRITES = ROOT / 'assets' / 'sprites'
NOT_A_MANIFEST = 'season_map.json'
ATLAS_WIDTH = 2048
MAX_HEIGHT = 2048
GAP = 1


class Frame(NamedTuple):
    key: str
    sheet: Path
    x: int
    y: int
    w: int
    h: int
    anchor: list


def read_frames():
    frames = []
    for path in sorted(SPRITES.glob('*.json')):
        if path.name == NOT_A_MANIFEST:
            continue
        manifest = json.loads(path.read_text(encoding='utf-8'))
        sheet = SPRITES / manifest['image']
        for name, f in manifest['frames'].items():
            frames.append(Frame(f'{path.stem}/{name}', sheet, f['x'], f['y'], f['w'], f['h'], f['anchor']))
    return frames


def pack(sizes):
    """Shelf-packs {key: (w, h)}, tallest first with GAP px between frames, into ATLAS_WIDTH px.
    Returns ({key: (x, y)}, height); raises ValueError when the atlas would pass MAX_HEIGHT or a frame is too wide."""
    places = {}
    x = y = shelf = 0
    for key, (w, h) in sorted(sizes.items(), key=lambda item: (-item[1][1], -item[1][0], item[0])):
        if w > ATLAS_WIDTH:
            raise ValueError(f'{key} is {w} px wide, over the {ATLAS_WIDTH} px atlas')
        if x + w > ATLAS_WIDTH:
            x, y, shelf = 0, y + shelf + GAP, 0
        places[key] = (x, y)
        x += w + GAP
        shelf = max(shelf, h)
    height = y + shelf
    if height > MAX_HEIGHT:
        raise ValueError(f'atlas would be {ATLAS_WIDTH} x {height} px, over {MAX_HEIGHT} px tall')
    return places, height


def compose(frames, places, height):
    atlas = Image.new('RGBA', (ATLAS_WIDTH, height), (0, 0, 0, 0))
    sheets = {}
    for f in frames:
        if f.sheet not in sheets:
            with Image.open(f.sheet) as image:
                sheets[f.sheet] = image.convert('RGBA')
        atlas.paste(sheets[f.sheet].crop((f.x, f.y, f.x + f.w, f.y + f.h)), places[f.key])
    return atlas


def write_atlas(atlas, frames, places, out):
    out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / 'atlas.webp', lossless=True, quality=100, method=6)
    png = out / 'atlas.png'
    atlas.save(png)
    oxipng = shutil.which('oxipng')
    if oxipng:
        subprocess.run([oxipng, '-o', 'max', '--strip', 'safe', '--alpha', str(png)], check=True)
    index = {
        'size': [atlas.width, atlas.height],
        'frames': {f.key: {'x': places[f.key][0], 'y': places[f.key][1], 'w': f.w, 'h': f.h, 'anchor': f.anchor}
                   for f in sorted(frames)},
    }
    (out / 'atlas.json').write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    return bool(oxipng)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Pack every sprite frame into one atlas.')
    parser.add_argument('--out', type=Path, default=ROOT / 'dist' / 'atlas', help='output folder, default dist/atlas')
    out = parser.parse_args(argv).out
    frames = read_frames()
    try:
        places, height = pack({f.key: (f.w, f.h) for f in frames})
    except ValueError as error:
        sys.exit(f'atlas: {error}')
    optimised = write_atlas(compose(frames, places, height), frames, places, out)
    print(f'{len(frames)} frames packed into {ATLAS_WIDTH} x {height} px in {out}')
    for name in ('atlas.webp', 'atlas.png'):
        print(f'{name}: {(out / name).stat().st_size:,} bytes')
    print('atlas.png went through oxipng' if optimised else 'oxipng is not installed: atlas.png is as Pillow wrote it')


if __name__ == '__main__':
    main()
