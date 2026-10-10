import os
import subprocess
import sys

# The asset checks only. The program is TypeScript; the frozen generator in tools/worldgen no longer runs.
CHECKS = [
    'tools/sprites/test_sprites.py',
    'tools/sprites/test_skin_a.py',
    'tools/atlas/test_atlas.py',
    'tools/licenses.py --check',
    'tools/test_licenses.py',
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
