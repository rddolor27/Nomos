"""Build every sprite sheet, then rewrite assets/LICENSES.md with each file's SHA-256."""
import hashlib
import importlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from spritekit import ASSETS  # noqa: E402

CATEGORIES = ['animals', 'houses', 'buildings', 'nature', 'icons', 'characters', 'map', 'culture']
LICENSES = ASSETS.parent / 'LICENSES.md'

HEADER = """# Asset licences

Every asset file in this folder, with its author, source, licence and SHA-256. The sprites are original art drawn as code for Nomos; no third-party art was copied, traced or recoloured. They share the repository's licence once one is chosen (none yet; the plan assumes MIT for code).

| File | Author | Source | Licence | SHA-256 | Edits |
|---|---|---|---|---|---|
"""


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_licenses():
    rows = []
    for path in sorted(ASSETS.rglob('*')):
        if path.is_file() and 'previews' not in path.relative_to(ASSETS).parts:
            rel = path.relative_to(ASSETS.parent).as_posix()
            category = path.stem.replace('_preview', '')
            source = f'`tools/sprites/{category}.py`, built by `tools/sprites/build_all.py`'
            rows.append(f'| `{rel}` | Nomos contributors | {source} | Original; repository licence | `{sha256(path)}` | None |')
    LICENSES.write_text(HEADER + '\n'.join(rows) + '\n', encoding='utf-8')
    return len(rows)


def main(names=None):
    for name in names or CATEGORIES:
        sheet, frames = importlib.import_module(name).build().save()
        print(f'{name}: {len(frames)} sprites, sheet {sheet.width}x{sheet.height}')
    print(f'{write_licenses()} files listed in {LICENSES.relative_to(ASSETS.parents[1]).as_posix()}')


if __name__ == '__main__':
    main(sys.argv[1:])
