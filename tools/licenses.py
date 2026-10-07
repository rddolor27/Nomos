"""Rewrite assets/LICENSES.md with every sprite and sound file's source and SHA-256.

Both tools/sprites/build_all.py and tools/sounds/build_all.py call it, so the list never goes stale
whichever one ran last.
"""
import hashlib
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
LICENSES = ASSETS / 'LICENSES.md'
# Each asset folder is built by the tool folder of the same name.
FOLDERS = ('sprites', 'sounds')

HEADER = """# Asset licences

Every asset file in this folder, with its author, source, licence and SHA-256. The sprites and sounds are original, drawn and composed as code for Nomos; no third-party art or audio was copied, traced, sampled or recoloured. They share the repository's licence once one is chosen (none yet; the plan assumes MIT for code).

| File | Author | Source | Licence | SHA-256 | Edits |
|---|---|---|---|---|---|
"""


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_licenses():
    rows = []
    for path in sorted(ASSETS.rglob('*')):
        parts = path.relative_to(ASSETS).parts
        if path.is_file() and parts[0] in FOLDERS and 'previews' not in parts:
            source = f'`tools/{parts[0]}/{path.stem}.py`, built by `tools/{parts[0]}/build_all.py`'
            rows.append(f'| `{"/".join(parts)}` | Nomos contributors | {source} | Original; repository licence '
                        f'| `{sha256(path)}` | None |')
    LICENSES.write_text(HEADER + '\n'.join(rows) + '\n', encoding='utf-8')
    return len(rows)
