import os
import subprocess
import sys

CHECKS = [
    'tools/worldgen/vectors.py --check',
    'tools/worldgen/mapfile.py --check',
    'tools/worldgen/export_map.py --check',
    'tools/sprites/test_skin_a.py',
    'tools/licenses.py --check',
    'tools/test_licenses.py',
    'tools/atlas/test_atlas.py',
    'tools/worldgen/goldens.py --check --seeds 3',
    'tools/worldgen/place_goldens.py --check --worlds 1',
    'tools/worldgen/place_fixtures.py --check',
]


def main() -> int:
    # Some checks print non-ASCII text, which a Windows console rejects unless Python writes UTF-8.
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    for check in CHECKS:
        print(f'> python {check}', flush=True)
        if subprocess.run([sys.executable, *check.split()], env=env).returncode != 0:
            return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
