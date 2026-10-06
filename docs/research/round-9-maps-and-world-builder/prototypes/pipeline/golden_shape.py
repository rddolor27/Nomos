"""Terrain-stage golden fingerprints for many seeds and grid sizes: python golden_shape.py OUT.json [--seeds N]"""
import argparse
import json
from collections import Counter
from pathlib import Path

from stages import fold, mix, terrain

SIZES = ((96, 64), (64, 48), (160, 96))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('out')
    parser.add_argument('--seeds', type=int, default=300)
    args = parser.parse_args()
    golden, templates = [], Counter()
    for k in range(args.seeds):
        seed = mix(0xB0B0 + k)
        width, height = SIZES[k % len(SIZES)]
        template, elevation, ocean = terrain.shape(seed, width, height)
        templates[template] += 1
        golden.append({'seed': seed, 'width': width, 'height': height,
                       'stages': {'shape': f'{fold(terrain.TEMPLATES.index(template), elevation, ocean):08x}'}})
    Path(args.out).write_text(json.dumps(golden), encoding='utf-8')
    print(f'{len(golden)} seeds, templates {dict(templates)}')


if __name__ == '__main__':
    main()
