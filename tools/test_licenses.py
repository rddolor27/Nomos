"""Checks tools/licenses.py: the ledger is current and complete, refuses files outside the licence families, hashes the
bytes git stores, and builds CC0 pack rows from SOURCE.json. Run: python tools/test_licenses.py"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

import licenses  # noqa: E402

PACK = {'author': 'Demo Author', 'url': 'https://example.com/demo/tree/0123456789abcdef0123456789abcdef01234567',
        'licence': 'CC0 1.0', 'edits': 'Recoloured roofs'}


def copy_assets(tmp):
    """A copy of assets/ without its git-ignored folders, with the ledger rewritten for it."""
    copy = Path(tmp) / 'assets'
    shutil.copytree(licenses.ASSETS, copy, ignore=shutil.ignore_patterns('previews', 'paid'))
    licenses.write_licenses(copy)
    return copy


def add_file(copy, name, data=b'x'):
    path = copy / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def add_pack(copy, name, source=PACK, licence_file='LICENSE.txt'):
    add_file(copy, f'cc0/{name}/tile.png', b'\x89PNG tile')
    if licence_file:
        add_file(copy, f'cc0/{name}/{licence_file}', b'CC0 1.0 Universal')
    if source is not None:
        add_file(copy, f'cc0/{name}/SOURCE.json', json.dumps(source).encode())


def row_for(ledger, name):
    return next((line for line in ledger.splitlines() if line.startswith(f'| `{name}` |')), '')


def ledger_is_current():
    run = subprocess.run([sys.executable, str(HERE / 'licenses.py'), '--check'], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0 or 'is current' not in run.stdout:
        return [f'licenses.py --check exited {run.returncode}: {run.stdout.strip()} {run.stderr.strip()}']
    return []


def strays_fail_and_ignored_folders_pass():
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        copy = copy_assets(tmp)
        add_file(copy, 'stray.txt')
        found = licenses.check(copy)
        if not any('stray.txt' in problem for problem in found):
            problems.append(f'a stray file was not named: {found}')
        (copy / 'stray.txt').unlink()
        add_file(copy, 'paid/x.png')
        add_file(copy, 'sprites/previews/x.png')
        found = licenses.check(copy)
        if found:
            problems.append(f'paid/ and sprites/previews/ should be skipped: {found}')
    return problems


def paid_folder_is_git_ignored():
    run = subprocess.run(['git', 'check-ignore', '-q', 'assets/paid/x.png'], cwd=ROOT)
    return [] if run.returncode == 0 else [f'git check-ignore says assets/paid/x.png is not ignored ({run.returncode})']


def generators_exist():
    ledger = licenses.ledger_text()
    problems = [f'{path} is named in the ledger but does not exist'
                for path in sorted(set(re.findall(r'`(tools/[\w/.-]+\.py)`', ledger))) if not (ROOT / path).is_file()]
    if 'tools/sprites/seasons.py' not in row_for(ledger, 'sprites/season_map.json'):
        problems.append('sprites/season_map.json does not name tools/sprites/seasons.py')
    return problems


def line_ends_do_not_change_hashes():
    problems = []
    raw = (licenses.ASSETS / 'sprites' / 'animals.json').read_bytes()
    lf = raw.replace(b'\r\n', b'\n')
    png = (licenses.ASSETS / 'sprites' / 'animals.png').read_bytes()
    with tempfile.TemporaryDirectory() as tmp:
        copy = copy_assets(tmp)
        add_file(copy, 'sprites/animals.json', lf)
        as_lf = licenses.ledger_text(copy)
        add_file(copy, 'sprites/animals.json', lf.replace(b'\n', b'\r\n'))
        as_crlf = licenses.ledger_text(copy)
    if as_lf != as_crlf:
        problems.append('a CRLF copy of animals.json gives a different ledger from the LF copy')
    if hashlib.sha256(lf).hexdigest() not in row_for(as_lf, 'sprites/animals.json'):
        problems.append('animals.json is not hashed as LF')
    if hashlib.sha256(png).hexdigest() not in row_for(as_lf, 'sprites/animals.png'):
        problems.append('animals.png is not hashed byte for byte')
    return problems


def cc0_rows_come_from_source_json():
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        copy = copy_assets(tmp)
        add_pack(copy, 'demo')
        licenses.write_licenses(copy)
        ledger = (copy / 'LICENSES.md').read_text(encoding='utf-8')
        found = licenses.check(copy)
        if found:
            problems.append(f'a good pack should pass once the ledger is rewritten: {found}')
        wanted = [PACK['author'], PACK['url'], PACK['licence'], PACK['edits'], hashlib.sha256(b'\x89PNG tile').hexdigest()]
        problems += [f'cc0/demo/tile.png: its row lacks {text}' for text in wanted if text not in row_for(ledger, 'cc0/demo/tile.png')]
        if not row_for(ledger, 'cc0/demo/LICENSE.txt'):
            problems.append("cc0/demo/LICENSE.txt: the pack's licence file has no row")
        if row_for(ledger, 'cc0/demo/SOURCE.json'):
            problems.append('cc0/demo/SOURCE.json feeds the rows and should not have one')
    return problems


def broken_packs_are_named():
    problems = []
    cases = {
        'cc0/nosource': ('SOURCE.json', dict(source=None)),
        'cc0/nolicence': ('licence file', dict(licence_file=None)),
        'cc0/nourl': ('url', dict(source={k: v for k, v in PACK.items() if k != 'url'})),
        'cc0/notcc0': ('not CC0', dict(source=PACK | {'licence': 'CC BY 4.0'})),
    }
    with tempfile.TemporaryDirectory() as tmp:
        copy = copy_assets(tmp)
        for folder, (_, options) in cases.items():
            add_pack(copy, folder.split('/')[1], **options)
        add_file(copy, 'cc0/loose.txt')
        found = licenses.check(copy)
        for folder, (wanted, _) in cases.items():
            if not any(folder in problem and wanted in problem for problem in found):
                problems.append(f'{folder}: no problem names {wanted}: {found}')
        if not any('cc0/loose.txt' in problem for problem in found):
            problems.append(f'cc0/loose.txt, outside any pack, was not named: {found}')
    return problems


CHECKS = [ledger_is_current, strays_fail_and_ignored_folders_pass, paid_folder_is_git_ignored, generators_exist,
          line_ends_do_not_change_hashes, cc0_rows_come_from_source_json, broken_packs_are_named]


def main():
    failed = False
    for check in CHECKS:
        problems = check()
        print(f'{check.__name__}: {"ok" if not problems else f"{len(problems)} problem(s)"}')
        for problem in problems[:20]:
            print('  ' + problem)
        failed |= bool(problems)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
