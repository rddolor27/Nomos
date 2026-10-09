"""Per-stage golden fingerprints of place.py for the TypeScript port: python tools/worldgen/place_goldens.py [--worlds N] [--check]

Builds every place of the first WORLDS standard worlds, in world.place_contexts' order, settlements then wonders. Each
place folds its context, its site after each of place.SETTLEMENT_STAGES, and its layout in the shape of sim-protocol's
PlaceLayout, so a port that drifts names the stage where it starts. A vista folds only its context, its ground and its
layout. The folding run must match place.build: on the first CHECKED worlds it compares each layout's fold with
place.build's, and stops on a difference. Writes packages/worldgen/test/fixtures/place-goldens-v1.json. --check
compares the committed file's first N worlds with a fresh run instead.
"""
import argparse
import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import place as P  # noqa: E402
from goldens import FIRST, fold  # noqa: E402
from place_fixtures import PEOPLE, context_fields, layout_codes, person_codes  # noqa: E402
from world import generate, place_contexts  # noqa: E402

ROOT = HERE.parents[1]
FIXTURE = ROOT / 'packages' / 'worldgen' / 'test' / 'fixtures' / 'place-goldens-v1.json'
VERSION = 1
WORLDS = 20
CHECKED = 1
# Terrain kinds by code, for the site folds. The kind of any tile is one of these.
KINDS = ('grass', 'meadow', 'sand', 'water', 'path', 'paving', *P.CLIFFS, *P.CROPS, 'crop_pasture')
STAGES = {'settlement': ('context', 'ground', 'water', 'centre', 'buildings', 'decor', 'nature', 'people', 'layout'),
          'vista': ('context', 'ground', 'layout')}


def text(s):
    return [ord(c) for c in s]


def fold_context(ctx):
    return fold(text(json.dumps(context_fields(ctx), separators=(',', ':'))))


def sprites(items):
    return [v for s in items for v in (len(s.category) + 1 + len(s.name), *text(f'{s.category}/{s.name}'), s.x, s.y)]


def fold_site(site):
    """The terrain, the flags of every tile, the sprites, the doors, the centre and the people placed so far."""
    cells = site.cells()
    flags = [site.sea[y][x] | site.road[y][x] << 1 | bool(site.solid[y][x]) << 2 | site.big[y][x] << 3
             | site.shade[y][x] << 4 | site.crown[y][x] << 5 | site.keep[y][x] << 6 for x, y in cells]
    people = [person_codes(p) for p in getattr(site, 'people', [])]
    return fold([KINDS.index(site.kind[y][x]) for x, y in cells], flags, sprites(site.ground), sprites(site.standing),
                [v for _, (x, y) in site.doors for v in (x, y)], [site.cx, site.cy],
                [c[field] for c in people for field in PEOPLE])


def fold_layout(layout):
    c = layout_codes(layout)
    return fold([c['width'], c['height']], text('\n'.join(c['frames'])), c['tiles'], c['ground'], c['standing'],
                *(c['people'][field] for field in PEOPLE))


def settlement(ctx):
    """place.build_site with a fold after the ground and after each of build_settlement's stage groups."""
    site = P.Site(ctx, *P.SIZES[ctx.tier])
    P.lay_ground(site)
    prints = [fold_site(site)]
    for stage in P.SETTLEMENT_STAGES:
        stage(site)
        prints.append(fold_site(site))
    return prints, site.layout()


def vista(ctx):
    site = P.Site(ctx, *P.VISTA_SIZE)
    P.lay_ground(site)
    prints = [fold_site(site)]
    P.build_vista(site)
    return prints, site.layout()


def place_prints(ctx, checked):
    prints, layout = vista(ctx) if ctx.wonder else settlement(ctx)
    last = fold_layout(layout)
    if checked and last != fold_layout(P.build(ctx)):
        raise SystemExit(f'place_goldens.py no longer mirrors place.build: {ctx.name} of seed {ctx.seed:08x} differs')
    return ' '.join(f'{v:08x}' for v in (fold_context(ctx), *prints, last))


def world_prints(job):
    seed, checked = job
    world = generate(seed)
    return {'seed': seed, 'settlements': len(world.settlements),
            'places': [place_prints(ctx, checked) for ctx in place_contexts(world)]}


def build(worlds):
    jobs = [(FIRST + k, k < CHECKED) for k in range(worlds)]
    with ProcessPoolExecutor() as pool:
        made = list(pool.map(world_prints, jobs))
    return {'version': VERSION, 'stages': {kind: list(names) for kind, names in STAGES.items()}, 'kinds': list(KINDS),
            'worlds': made}


def check(worlds):
    """The committed file's first `worlds` worlds against a fresh run, so CI can check a few quickly."""
    if not FIXTURE.exists():
        return False
    committed = json.loads(FIXTURE.read_text(encoding='utf-8'))
    fresh = build(worlds)
    heads = [{k: v for k, v in data.items() if k != 'worlds'} for data in (committed, fresh)]
    return heads[0] == heads[1] and committed['worlds'][:worlds] == fresh['worlds']


def main():
    parser = argparse.ArgumentParser(description='Write the per-stage place goldens for the TypeScript place port.')
    parser.add_argument('--worlds', type=int, default=WORLDS, help=f'standard worlds, from seed {FIRST:08x}')
    parser.add_argument('--check', action='store_true', help='compare with the committed file instead of writing it')
    args = parser.parse_args()
    name = FIXTURE.relative_to(ROOT).as_posix()
    if args.check:
        if check(args.worlds):
            print(f'{name} matches on {args.worlds} worlds')
            return 0
        print(f'{name} is out of date: run python tools/worldgen/place_goldens.py and commit the result', file=sys.stderr)
        return 1
    data = build(args.worlds)
    text_ = json.dumps(data, indent=1) + '\n'
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(text_, encoding='utf-8', newline='\n')
    places = sum(len(w['places']) for w in data['worlds'])
    print(f'wrote {name}: {args.worlds} worlds, {places} places ({len(text_):,} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
