"""Rewrite assets/LICENSES.md with every asset file's source and SHA-256, or check that it is current and complete.

tools/sprites/build_all.py, tools/sounds/build_all.py and tools/worldgen/export_map.py all call write_licenses, so
the list never goes stale whichever one ran last. `python tools/licenses.py --check` exits 1 when the ledger is stale
or a file lies outside the licence families (plan: M0.5 Task 1).
"""
import hashlib
import json
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
LICENSES = ASSETS / 'LICENSES.md'
# The original families: each folder and the code that builds its files; {stem} is a file's name without its extension.
SOURCES = {
    'sprites': '`tools/sprites/{stem}.py`, built by `tools/sprites/build_all.py`',
    'sounds': '`tools/sounds/{stem}.py`, built by `tools/sounds/build_all.py`',
    'maps': '`tools/worldgen/export_map.py`',
}
# Files whose builder is not named after them.
SOURCE_OVERRIDES = {
    'sprites/season_map.json': '`tools/sprites/seasons.py`, built by `tools/sprites/build_all.py`',
}
FAMILIES = 'sprites/, sounds/, maps/, cc0/<pack>/ and the git-ignored paid/'
CC0 = 'cc0'
SOURCE_FILE = 'SOURCE.json'
PACK_FIELDS = ('author', 'url', 'licence', 'edits')
# Git-ignored folders, left out of the ledger.
IGNORED = (('paid',), ('sprites', 'previews'))
# Git stores these with LF line ends, and a Windows checkout turns them into CRLF.
TEXT_SUFFIXES = {'.json', '.md', '.txt'}

HEADER = """# Asset licences

Every asset file in this folder, with its author, source, licence and SHA-256. `python tools/licenses.py` rewrites this file, and `python tools/licenses.py --check` fails when it is stale or a file lies outside the families below.

## Families

| Folder | What it holds | Licence |
|---|---|---|
| `sprites/`, `sounds/`, `maps/` | Originals, drawn, composed and generated as code for Nomos by the tools each row names. No third-party art or audio was copied, traced, sampled or recoloured. | The repository's licence once one is chosen (none yet; the plan assumes MIT for code) |
| `cc0/<pack>/` | A CC0 pack, kept only as a placeholder, with its licence file and a `SOURCE.json` (`author`, `url` pinned to a commit, `licence`, `edits`) that fills its rows. | CC0 1.0 |
| `paid/` | Paid packs, for local use only. The folder is git-ignored: nothing in it is committed or listed here. | The seller's terms |

Each SHA-256 is of the bytes git stores. Git stores `.json`, `.md` and `.txt` files with LF line ends, so the CRLF copies a Windows checkout writes hash as LF.

## Pack licences read on 8 October 2026

| Pack | Page read | What it says | Decision |
|---|---|---|---|
| Ninja Adventure (Pixel-boy and AAA) | https://pixel-boy.itch.io/ninja-adventure-asset-pack | The assets are "released under the Creative Commons Zero (CC0) license", the page lists the asset licence as Creative Commons Zero v1.0 Universal, and attribution is "not required but appreciated". The pack's own licence file is inside the download, which needs a browser, so it was not read; round 3 read a mirror's copy. | Commit only as a placeholder, with its licence file beside it. Nothing committed now. |
| Kenney | https://kenney.nl/support and the asset pages for Tiny Town, RPG Urban Pack, Roguelike Modern City and Emotes Pack, under https://kenney.nl/assets/ | "all game assets on the asset pages are public domain licensed (CC0)", credit is optional, and "Do not use our logo". Each of the four asset pages lists the licence as Creative Commons CC0. | Commit only as a placeholder, with its licence file beside it, and never use the Kenney logo. Nothing committed now. |
| LimeZu Modern Exteriors | https://limezu.itch.io/modernexteriors | You can edit and use it in any commercial or non-commercial project. You can't resell or distribute it to others, or edit and resell it. Credit is required. $5.00 list price. Tagged "No generative AI was used". The page states no AI-training clause, which round 3 had from a search summary; the licence .txt in the download was not read. | Not bought. If bought, it stays in the git-ignored `paid/` folder, with credit to LimeZu. |
| LimeZu Modern Interiors | https://limezu.itch.io/moderninteriors | The same terms for the complete version, which costs at least $1.50. | Not bought; as above. |
| Mana Seed (Seliel the Shaper) | https://seliel-the-shaper.itch.io/character-base | The page links its User License at https://selieltheshaper.weebly.com/user-license.html, which did not answer (the connection timed out twice), so the AI clause is still round 3's search summary. | Drop. Nomos excludes it. |

## Files

| File | Author | Source | Licence | SHA-256 | Edits |
|---|---|---|---|---|---|
"""


def sha256(path):
    data = path.read_bytes()
    if path.suffix in TEXT_SUFFIXES:
        data = data.replace(b'\r\n', b'\n')
    return hashlib.sha256(data).hexdigest()


def asset_files(assets):
    """Every file's path parts, sorted the same on Windows and Linux; the ledger and git-ignored folders are left out."""
    found = []
    for path in assets.rglob('*'):
        parts = path.relative_to(assets).parts
        ignored = any(parts[:len(folder)] == folder for folder in IGNORED)
        if path.is_file() and parts != (LICENSES.name,) and not ignored:
            found.append(parts)
    return sorted(found)


def row(assets, parts, author, source, licence, edits):
    return f'| `{"/".join(parts)}` | {author} | {source} | {licence} | `{sha256(assets.joinpath(*parts))}` | {edits} |'


def original_row(assets, parts):
    source = SOURCE_OVERRIDES.get('/'.join(parts)) or SOURCES[parts[0]].format(stem=Path(parts[-1]).stem)
    return row(assets, parts, 'Nomos contributors', source, 'Original; repository licence', 'None')


def pack_source(assets, name):
    """A pack's SOURCE.json, or None, and the problems with it."""
    label = f'{CC0}/{name}/{SOURCE_FILE}'
    path = assets / CC0 / name / SOURCE_FILE
    if not path.is_file():
        return None, [f'{CC0}/{name}: no {SOURCE_FILE}']
    try:
        source = json.loads(path.read_text(encoding='utf-8'))
    except ValueError:
        return None, [f'{label}: not valid JSON']
    problems = [f'{label}: lacks {field}' for field in PACK_FIELDS if not source.get(field)]
    if source.get('licence') and not str(source['licence']).startswith('CC0'):
        problems.append(f'{label}: licence {source["licence"]} is not CC0')
    return (None if problems else source), problems


def survey_pack(assets, name, files):
    problems = []
    if not any(len(parts) == 3 and parts[2].lower().startswith('licen') for parts in files):
        problems.append(f'{CC0}/{name}: no licence file beside the pack')
    source, source_problems = pack_source(assets, name)
    rows = []
    if source:
        rows = [(parts, row(assets, parts, source['author'], source['url'], source['licence'], source['edits']))
                for parts in files if parts != (CC0, name, SOURCE_FILE)]
    return rows, problems + source_problems


def survey(assets):
    """(rows, problems): a ledger row for every file in a family, and a problem for every file outside them."""
    rows, problems, packs = [], [], {}
    for parts in asset_files(assets):
        if parts[0] in SOURCES:
            rows.append((parts, original_row(assets, parts)))
        elif parts[0] == CC0 and len(parts) > 2:
            packs.setdefault(parts[1], []).append(parts)
        else:
            problems.append(f'{"/".join(parts)}: outside the licence families ({FAMILIES})')
    for name, files in packs.items():
        pack_rows, pack_problems = survey_pack(assets, name, files)
        rows += pack_rows
        problems += pack_problems
    return [text for _, text in sorted(rows)], problems


def render(rows):
    return HEADER + '\n'.join(rows) + '\n'


def ledger_text(assets=ASSETS):
    return render(survey(assets)[0])


def write_licenses(assets=ASSETS):
    rows, _ = survey(assets)
    (assets / LICENSES.name).write_text(render(rows), encoding='utf-8')
    return len(rows)


def check(assets=ASSETS):
    """Everything wrong with the assets folder: files outside the families, broken packs and a stale ledger."""
    rows, problems = survey(assets)
    ledger = assets / LICENSES.name
    if not ledger.is_file() or ledger.read_text(encoding='utf-8') != render(rows):
        problems.append(f'{LICENSES.name} is stale: run python tools/licenses.py')
    return problems


def main(argv):
    if '--check' not in argv:
        print(f'{write_licenses()} files listed in {LICENSES.name}')
        return 0
    problems = check()
    for problem in problems:
        print(problem)
    print(f'{len(problems)} problem(s)' if problems else f'{LICENSES.name} is current')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
