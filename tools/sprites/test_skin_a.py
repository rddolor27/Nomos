"""Checks Skin A's colours: each one in packages/render-gl/src/skin-a.json is the spritekit.PALETTE entry it names,
and the three role colours stay apart under colour blindness. Run: python tools/sprites/test_skin_a.py"""
import itertools
import json
import sys
from pathlib import Path

from colorspacious import deltaE

sys.path.insert(0, str(Path(__file__).resolve().parent))

from spritekit import PALETTE  # noqa: E402

SKIN_A = Path(__file__).resolve().parents[2] / 'packages' / 'render-gl' / 'src' / 'skin-a.json'
ROLES = ('citizen', 'merchant', 'police')
MIN_DELTA_E = 20
# Round 3's method: severity 100 simulates dichromacy, the hardest case for telling two colours apart.
SPACES = {'no deficiency': 'sRGB1'}
SPACES |= {kind: {'name': 'sRGB1+CVD', 'cvd_type': kind, 'severity': 100}
           for kind in ('protanomaly', 'deuteranomaly', 'tritanomaly')}


def rgb_of(hex_colour):
    return tuple(int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))


def palette_problems(skin):
    problems = [f'{role}: no colour' for role in ROLES if role not in skin]
    for key, colour in skin.items():
        name, rgb = colour['name'], rgb_of(colour['rgb'])
        if name not in PALETTE:
            problems.append(f'{key}: {name} is not in spritekit.PALETTE')
        elif PALETTE[name] != rgb:
            problems.append(f'{key}: {colour["rgb"]} is not {name}, {PALETTE[name]}')
    return problems


def smallest_delta_e(skin, space):
    colours = {role: [c / 255 for c in rgb_of(skin[role]['rgb'])] for role in ROLES}
    return float(min(deltaE(colours[a], colours[b], input_space=space, uniform_space='CAM02-UCS')
                     for a, b in itertools.combinations(ROLES, 2)))


def main():
    skin = json.loads(SKIN_A.read_text(encoding='utf-8'))
    problems = palette_problems(skin)
    print(f'{SKIN_A.name}: {len(skin)} colours checked against spritekit.PALETTE')
    if not problems:
        smallest = {label: smallest_delta_e(skin, space) for label, space in SPACES.items()}
        print('smallest role deltaE, CAM02-UCS: ' + ', '.join(f'{label} {value:.1f}' for label, value in smallest.items()))
        problems = [f'role colours differ by only {value:.1f} with {label}, under {MIN_DELTA_E}'
                    for label, value in smallest.items() if value < MIN_DELTA_E]
    for problem in problems:
        print('  ' + problem)
    print('ok' if not problems else f'{len(problems)} problem(s)')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
