"""Build every sprite sheet, then rewrite assets/LICENSES.md with each file's SHA-256."""
import importlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

from licenses import LICENSES, write_licenses  # noqa: E402

CATEGORIES = ['animals', 'houses', 'buildings', 'nature', 'icons', 'characters', 'map', 'culture', 'landmarks', 'scenery', 'wonders', 'military', 'seasons']


def main(names=None):
    for name in names or CATEGORIES:
        sheet, frames = importlib.import_module(name).build().save()
        print(f'{name}: {len(frames)} sprites, sheet {sheet.width}x{sheet.height}')
    print(f'{write_licenses()} files listed in {LICENSES.name}')


if __name__ == '__main__':
    main(sys.argv[1:])
