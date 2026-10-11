"""Writes packages/worldgen/src/place/kind-colours.ts, the colour each terrain kind takes in a place's ground map
(plan: M2.2c Task 1, the ground port).

A building's kind takes its palette colour. A ground kind takes the palette colour nearest the mean colour of its tile,
as the frozen tools/worldgen/export_map.py chose it for town.nmap, whose rule this script calls so there is one. The
TypeScript port cannot read the sheets' pixels, so it reads this table instead. Every tile of a kind must agree on a
colour, so the table holds one a kind.
Run `python tools/sprites/kind_colours.py` to write the table, or with --check to compare it with the committed file.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / 'worldgen'))

import export_map  # noqa: E402
from place import CLIFFS, CROPS, OPEN, RANK, tile_for  # noqa: E402
from showcase import Sheets  # noqa: E402
from spritekit import ASSETS  # noqa: E402

TABLE = ASSETS.parents[1] / 'packages' / 'worldgen' / 'src' / 'place' / 'kind-colours.ts'
# place.py lays no 'track' road, and the sheets draw no tile for one.
GROUND_KINDS = (*OPEN, 'water', *CLIFFS, *(kind for kind in RANK if kind != 'track'), *CROPS, 'crop_pasture')
# More than a period of tile_for's variants in each direction.
SPAN = 16


class Flat:
    """The two things tile_for reads of a site: a grid of one kind, with no water beside it."""

    def __init__(self, kind):
        self.kind = [[kind] * SPAN for _ in range(SPAN)]

    def water(self, x, y):
        return False


def tiles_of(kind):
    """Every tile tile_for picks for the kind, one a variant."""
    flat = Flat(kind)
    return list(dict.fromkeys(tile_for(flat, x, y) for y in range(SPAN) for x in range(SPAN)))


def kind_colours():
    sheets = Sheets()
    colours = {kind: export_map.kind_colour(kind, {}, sheets) for kind in export_map.BUILT_COLOURS}
    for kind in GROUND_KINDS:
        found = {export_map.kind_colour(kind, {kind: tile}, sheets) for tile in tiles_of(kind)}
        if len(found) != 1:
            raise ValueError(f'the tiles of {kind} take {len(found)} colours, and a kind needs one: {sorted(found)}')
        colours[kind] = found.pop()
    return colours


def table_source(colours):
    lines = [
        '// Generated from assets/sprites/*.png by python tools/sprites/kind_colours.py; do not edit.',
        "// Per terrain kind, its colour in a place's ground map as 0xRRGGBB: a building's kind takes its palette colour,",
        "// and a ground kind the palette colour nearest the mean colour of its tile.",
        'export const KIND_RGB: Readonly<Record<string, number>> = {',
    ]
    for kind, (r, g, b) in colours.items():
        key = kind if kind.isidentifier() else f"'{kind}'"
        lines.append(f'  {key}: 0x{r:02x}{g:02x}{b:02x},')
    return '\n'.join([*lines, '};', ''])


def main(check):
    colours = kind_colours()
    text = table_source(colours)
    if check:
        current = TABLE.read_text(encoding='utf-8').replace('\r\n', '\n') if TABLE.exists() else None
        print(f'{TABLE.name} ' + ('matches the sheets' if current == text else 'differs from the sheets: rerun without --check'))
        return 0 if current == text else 1
    TABLE.write_text(text, encoding='utf-8', newline='\n')
    print(f'{TABLE.name}: {len(colours)} kinds')
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
