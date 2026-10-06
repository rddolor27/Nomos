"""Renders places that expose art gaps: python render_gaps.py OUT_DIR

Cold ground, cliff coasts not facing south and mountain views, built by the reference place
generator from hand-written records. Images go to OUT_DIR, which should be outside the repo.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / 'tools' / 'worldgen'))
sys.path.insert(0, str(ROOT / 'tools' / 'sprites'))

import place  # noqa: E402
import placedraw  # noqa: E402
from model import PlaceContext  # noqa: E402

CASES = [
    ('cold-town-north-cliffs', PlaceContext(seed=0xC01D7, name='a', biome='forest-conifer', temperature=30, moisture=150,
                                            tier='town', population=8000, sea='n', coast='cliffs', roads='sw')),
    ('glacier', PlaceContext(seed=0x61AC1E55, name='b', biome='peak', temperature=25, moisture=120, roads='s',
                             wonder='glacier')),
    ('hills-village-river', PlaceContext(seed=0x4111, name='c', biome='hills', temperature=120, moisture=120,
                                         tier='village', population=900, river='we', roads='ns')),
    ('east-cliff-capital', PlaceContext(seed=0xCA9, name='d', biome='grassland', temperature=140, moisture=130,
                                        tier='capital', population=200000, sea='e', coast='cliffs', roads='nws',
                                        river='w', landmarks=('clock-tower', 'library'))),
    ('caldera', PlaceContext(seed=0xCA1D, name='e', biome='mountain', temperature=90, moisture=110, roads='w',
                             wonder='caldera-lake')),
]


def main():
    out = Path(sys.argv[1])
    for name, ctx in CASES:
        layout = place.build(ctx)
        kinds = sorted({k for row in layout.terrain for k in row})
        placedraw.render(layout, out / f'{name}.png', scale=1)
        print(name, layout.width, 'x', layout.height, 'terrain kinds:', ', '.join(kinds))


if __name__ == '__main__':
    main()
