"""Checks every sound bank against the rules in README.md. Run: python tools/sounds/test_sounds.py"""
import importlib
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_all import CATEGORIES  # noqa: E402
from soundkit import RATE, render  # noqa: E402

# Upper bounds on length, so a short cue never turns into a drone.
MAX_SECONDS = {'effect': 3.0, 'loop': 30.0, 'music': 120.0}
# The README's level table, per bank: (peak ceiling, RMS floor, RMS ceiling) in dBFS.
LEVELS = {'ui': (-8, -30, -22), 'events': (-6, -28, -18), 'justice': (-6, -28, -18), 'military': (-6, -28, -18),
          'ambience': (-6, -36, -24), 'wonders': (-6, -36, -24), 'music': (-3, -24, -16)}


def seam(x):
    """How far a loop's last sample sits from its first, against the loop's typical step."""
    step = float(np.median(np.abs(np.diff(x)))) + 1e-9
    return abs(float(x[-1] - x[0])) / step


def check(name):
    bank = importlib.import_module(name).build()
    peak, floor, ceiling = LEVELS[name]
    problems = []
    for sound, entry in bank.sounds.items():
        kind, x = entry['kind'], bank.audio[sound]
        if entry['peak_db'] > peak or not floor <= entry['rms_db'] <= ceiling:
            problems.append(f'{sound}: peak {entry["peak_db"]} / RMS {entry["rms_db"]} dBFS outside the {name} '
                            f'targets (peak ≤ {peak}, RMS {floor} to {ceiling})')
        if entry['seconds'] > MAX_SECONDS[kind]:
            problems.append(f'{sound}: {entry["seconds"]} s is longer than {MAX_SECONDS[kind]} s for a {kind}')
        again = render(kind, json.loads(json.dumps(entry['def'])), entry['seed'])
        if not np.array_equal(again, x):
            problems.append(f'{sound}: renders differently from its saved definition')
        if kind != 'effect' and seam(x) > 40:
            problems.append(f'{sound}: the loop clicks where it wraps ({seam(x):.0f}x a typical step)')
        if kind == 'effect' and abs(x[-1]) > 0.02:
            problems.append(f'{sound}: ends abruptly at {x[-1]:.3f}, which clicks')
    return len(bank.sounds), problems


def main():
    failed = False
    for name in CATEGORIES:
        try:
            count, problems = check(name)
        except ModuleNotFoundError:
            print(f'{name}: not written yet')
            continue
        print(f'{name}: {count} sounds, {"ok" if not problems else f"{len(problems)} problem(s)"}')
        for p in problems[:20]:
            print('  ' + p)
        failed |= bool(problems)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
