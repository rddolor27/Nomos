"""Check that every relative Markdown link under docs/ points at an existing file.

Usage: python3 .claude/skills/sync-plan-doc/check_links.py [root]
Exits 1 and lists the broken links if any are found.
"""
import glob
import os
import re
import sys
import urllib.parse

root = sys.argv[1] if len(sys.argv) > 1 else 'docs'
link = re.compile(r'\]\(([^)\s]+)\)')
checked, broken = 0, []
for path in glob.glob(os.path.join(root, '**', '*.md'), recursive=True):
    with open(path, encoding='utf-8') as fh:
        text = fh.read()
    for m in link.finditer(text):
        url = m.group(1)
        if re.match(r'^(https?:|mailto:|#)', url):
            continue
        checked += 1
        target = os.path.normpath(os.path.join(os.path.dirname(path), urllib.parse.unquote(url.split('#')[0])))
        if not os.path.exists(target):
            broken.append(f'{path}: {url}')

print(f'{checked} relative links checked, {len(broken)} broken')
for b in broken:
    print('  ' + b)
sys.exit(1 if broken else 0)
