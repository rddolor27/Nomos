"""Packs the sprite frames of every manifest into one atlas (plan: M0.5 Task 3).

Run `python tools/atlas/build_atlas.py [--out DIR]`, default dist/atlas/. It writes atlas.webp (lossless), atlas.png
(shrunk by oxipng when that is installed) and atlas.json, each frame's place keyed "<category>/<name>", with the body
frames' face offsets that the place pass needs (M3.1). That town page leaves out the frames ending in _snow or _night
(M3.1's Part 3, Ruling 14). It also writes the map scene's page, map.webp, map.png and map.json (M8.3), which keeps
every map frame. Frames are packed, not sheets, because houses.png alone is 2,316 px tall. The output is a build
product and is never committed.
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
# Places draw summer days only, and these variants take 16% of a town page that is near its cap (Ruling 14). They get a
# second page when seasons or the light periods draw them. Two map tiles end in _snow, and the map page keeps both.
LEFT_OFF_TOWN_PAGE = ('_snow', '_night')
# The map scene's own page (M8.3): terrain tiles, wonders and landmarks at both map scales, and the settlement icons,
# so the map never waits for the whole atlas.
MAP_PAGE_WIDTH = 256
MAP_PREFIXES = ('map/map8_', 'map/map16_', 'map/settlement_', 'wonders/map8_', 'wonders/map16_', 'landmarks/map8_',
                'landmarks/map16_')


class Frame(NamedTuple):
    key: str
    sheet: Path
    x: int
    y: int
    w: int
    h: int
    anchor: list
    # A body frame's face offset, where tools/worldgen/placedraw.py draws its face and emote; None for other frames.
    face: list | None


def read_frames():
    frames = []
    for path in sorted(SPRITES.glob('*.json')):
        if path.name == NOT_A_MANIFEST:
            continue
        manifest = json.loads(path.read_text(encoding='utf-8'))
        sheet = SPRITES / manifest['image']
        for name, f in manifest['frames'].items():
            frames.append(Frame(f'{path.stem}/{name}', sheet, f['x'], f['y'], f['w'], f['h'], f['anchor'], f.get('face')))
    return frames


def pack(sizes, width=ATLAS_WIDTH):
    """Shelf-packs {key: (w, h)}, tallest first with GAP px between frames, into `width` px.
    Returns ({key: (x, y)}, height); raises ValueError when the atlas would pass MAX_HEIGHT or a frame is too wide."""
    places = {}
    x = y = shelf = 0
    for key, (w, h) in sorted(sizes.items(), key=lambda item: (-item[1][1], -item[1][0], item[0])):
        if w > width:
            raise ValueError(f'{key} is {w} px wide, over the {width} px atlas')
        if x + w > width:
            x, y, shelf = 0, y + shelf + GAP, 0
        places[key] = (x, y)
        x += w + GAP
        shelf = max(shelf, h)
    height = y + shelf
    if height > MAX_HEIGHT:
        raise ValueError(f'atlas would be {width} x {height} px, over {MAX_HEIGHT} px tall')
    return places, height


def compose(frames, places, width, height):
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    sheets = {}
    for f in frames:
        if f.sheet not in sheets:
            with Image.open(f.sheet) as image:
                sheets[f.sheet] = image.convert('RGBA')
        atlas.paste(sheets[f.sheet].crop((f.x, f.y, f.x + f.w, f.y + f.h)), places[f.key])
    return atlas


def frame_entry(f, place):
    entry = {'x': place[0], 'y': place[1], 'w': f.w, 'h': f.h, 'anchor': f.anchor}
    if f.face is not None:
        entry['face'] = f.face
    return entry


def write_atlas(atlas, frames, places, out, name='atlas'):
    out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / f'{name}.webp', lossless=True, quality=100, method=6)
    png = out / f'{name}.png'
    atlas.save(png)
    oxipng = shutil.which('oxipng')
    if oxipng:
        subprocess.run([oxipng, '-o', 'max', '--strip', 'safe', '--alpha', str(png)], check=True)
    index = {
        'size': [atlas.width, atlas.height],
        'frames': {f.key: frame_entry(f, places[f.key]) for f in sorted(frames)},
    }
    (out / f'{name}.json').write_text(json.dumps(index, separators=(',', ':')), encoding='utf-8')
    return bool(oxipng)


def build_page(frames, width, out, name):
    places, height = pack({f.key: (f.w, f.h) for f in frames}, width)
    optimised = write_atlas(compose(frames, places, width, height), frames, places, out, name)
    print(f'{name}: {len(frames)} frames packed into {width} x {height} px in {out}')
    for suffix in ('webp', 'png'):
        print(f'{name}.{suffix}: {(out / f"{name}.{suffix}").stat().st_size:,} bytes')
    return optimised


def main(argv=None):
    parser = argparse.ArgumentParser(description='Pack every sprite frame into one atlas.')
    parser.add_argument('--out', type=Path, default=ROOT / 'dist' / 'atlas', help='output folder, default dist/atlas')
    out = parser.parse_args(argv).out
    frames = read_frames()
    try:
        town = [f for f in frames if not f.key.endswith(LEFT_OFF_TOWN_PAGE)]
        optimised = build_page(town, ATLAS_WIDTH, out, 'atlas')
        build_page([f for f in frames if f.key.startswith(MAP_PREFIXES)], MAP_PAGE_WIDTH, out, 'map')
    except ValueError as error:
        sys.exit(f'atlas: {error}')
    print('the PNGs went through oxipng' if optimised else 'oxipng is not installed: the PNGs are as Pillow wrote them')


if __name__ == '__main__':
    main()
