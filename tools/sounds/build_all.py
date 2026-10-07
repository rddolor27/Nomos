"""Build every sound bank: python tools/sounds/build_all.py [category ...]"""
import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from soundkit import PREVIEWS  # noqa: E402

CATEGORIES = ['ui', 'events', 'justice', 'military', 'ambience', 'wonders', 'music']


def main(names=None):
    for name in names or CATEGORIES:
        try:
            module = importlib.import_module(name)
        except ModuleNotFoundError:
            print(f'{name}: not written yet')
            continue
        bank = module.build()
        path = bank.save()
        seconds = sum(s['seconds'] for s in bank.sounds.values())
        print(f'{name}: {len(bank.sounds)} sounds, {seconds:.1f} s, {path.name}')
    print(f'previews in {PREVIEWS}')


if __name__ == '__main__':
    main(sys.argv[1:])
