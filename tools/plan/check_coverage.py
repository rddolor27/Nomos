"""Flag plan items that a milestone's tasks seem to have dropped: python tools/plan/check_coverage.py [N ...]

Every build task and exit check in a milestone of docs/plan/implementation-plan.md should appear in
that milestone's folder under docs/plan/tasks/, in its milestone.md or one of its task.md files.
Items are matched by word overlap, so a weak match is a lead to read, not proof of a gap: merged or
reworded items can score low.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / 'docs' / 'plan' / 'implementation-plan.md'
TASKS = ROOT / 'docs' / 'plan' / 'tasks'
THRESHOLD = 0.4
STOP = set('that this with from into their them they when then than each every have will must only also more less '
           'over under about after before which while where there these those would could should'.split())


def words(text):
    return {w for w in re.findall(r'[a-z][a-z0-9-]{3,}', text.lower()) if w not in STOP}


def plan_items(plan, n):
    section = re.search(rf'^## M{n} .*?(?=^## )', plan, re.S | re.M).group(0)
    return [line[6:] for line in section.splitlines() if re.match(r'- \[[ x]\] ', line)]


def folder(n):
    found = [p for p in TASKS.iterdir() if p.is_dir() and re.match(rf'm{n}-[a-z]', p.name)]
    return found[0] if found else None


def bullets(path):
    files = [path / 'milestone.md', *sorted(path.glob('*/task.md'))]
    return [line.strip() for f in files if f.exists()
            for line in f.read_text(encoding='utf-8').splitlines() if line.lstrip().startswith('-')]


def main(numbers):
    plan = PLAN.read_text(encoding='utf-8')
    for n in numbers:
        path = folder(n)
        if path is None:
            print(f'M{n}: no milestone folder')
            continue
        lines = bullets(path)
        items = plan_items(plan, n)
        weak = []
        for item in items:
            need = words(item)
            score, best = max((len(need & words(b)) / max(1, len(need)), b) for b in lines)
            if score < THRESHOLD:
                weak.append((score, item, best))
        print(f'M{n}: {len(items)} plan items, {len(weak)} weak matches ({path.name})')
        for score, item, best in weak:
            print(f'  {score:.2f} plan: {item[:110]}\n       best: {best[:110]}')


if __name__ == '__main__':
    main(sys.argv[1:] or [str(n) for n in range(10)])
