"""Per-stage golden fingerprints of place.py for the TypeScript port: python tools/worldgen/place_goldens.py [--worlds N] [--check]

Builds every place of the first WORLDS standard worlds, in world.place_contexts' order, settlements then wonders. Each
place folds its context, its site after each of place.SETTLEMENT_STAGES, and its layout in the shape of sim-protocol's
PlaceLayout, so a port that drifts names the stage where it starts. A vista folds only its context, its ground and its
layout. The folding run must match place.build: on the first CHECKED worlds and the PINNED places it compares each
layout's fold with place.build's, and stops on a difference. Writes packages/worldgen/test/fixtures/place-goldens-v1.json.
--check compares the committed file's PINNED places and first N worlds with a fresh run instead.
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
from model import PlaceContext  # noqa: E402
from place_fixtures import PEOPLE, context_fields, layout_codes, person_codes  # noqa: E402
from world import generate, place_contexts  # noqa: E402

ROOT = HERE.parents[1]
FIXTURE = ROOT / 'packages' / 'worldgen' / 'test' / 'fixtures' / 'place-goldens-v1.json'
VERSION = 1
WORLDS = 20
CHECKED = 1
# Terrain kinds by code, for the site folds. The kind of any tile is one of these.
KINDS = ('grass', 'meadow', 'sand', 'water', 'path', 'paving', *P.CLIFFS, *P.CROPS, 'crop_pasture', 'stone', 'cobble',
         'gravel', 'track')
STAGES = {'settlement': ('context', 'ground', 'water', 'centre', 'buildings', 'decor', 'nature', 'people', 'layout'),
          'vista': ('context', 'ground', 'layout')}
# Hand-made places that reach what no place of the golden worlds does, pinned as place_fixtures.py pins its three, so
# --check covers them on every run: a viaduct; a village's clock tower and fountain; ridges, a quarry or mine and goats
# on hills, and ridges on a mountain; sea arches facing east and west; and a cliffed cove whose one river side runs to
# the sea and leaves short cliff runs. cross's crossing with no extra tile is out of reach: a road never turns on,
# into or out of water, and no path starts in water, so every crossing has a tile in line beyond it.
PINNED = (
    ('viaduct-town', PlaceContext(seed=1, name='Archway', biome='grassland', temperature=150, moisture=130,
                                  tier='town', population=9000, river='ns', roads='ew', landmarks=('viaduct',))),
    ('landmark-village', PlaceContext(seed=1, name='Belltop', biome='grassland', temperature=140, moisture=140,
                                      tier='village', population=700, roads='ew', landmarks=('clock-tower', 'fountain'))),
    ('hill-village', PlaceContext(seed=1, name='Goatfold', biome='hills', temperature=120, moisture=130,
                                  tier='village', population=600, roads='ns', farmland='w')),
    ('mountain-town', PlaceContext(seed=1, name='Scree', biome='mountain', temperature=90, moisture=140, tier='town',
                                   population=6000, roads='ew')),
    ('east-sea-arch', PlaceContext(seed=0x5EA7, name='Eastgate', biome='grassland', temperature=140, moisture=140,
                                   sea='e', coast='cliffs', roads='w', wonder='sea-arch')),
    ('west-sea-arch', PlaceContext(seed=0x5EA8, name='Westgate', biome='grassland', temperature=140, moisture=140,
                                   sea='w', coast='beach', roads='e', wonder='sea-arch')),
    ('cliff-cove', PlaceContext(seed=790928260, name='Cove', biome='grassland', temperature=140, moisture=150,
                                tier='village', population=900, sea='sw', coast='cliffs', river='n', roads='n')),
)


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


def world_contexts(seed):
    world = generate(seed)
    return len(world.settlements), place_contexts(world)


def place_job(job):
    ctx, checked = job
    return place_prints(ctx, checked)


def pinned_prints(job):
    name, ctx = job
    return {'name': name, 'context': context_fields(ctx), 'prints': place_prints(ctx, True)}


def build(worlds):
    seeds = [FIRST + k for k in range(worlds)]
    with ProcessPoolExecutor() as pool:
        pinned = list(pool.map(pinned_prints, PINNED))
        found = list(pool.map(world_contexts, seeds))
        # One place to a job, so that a world's capital and cities build beside its hamlets, not one after another.
        jobs = [(ctx, k < CHECKED) for k, (_, contexts) in enumerate(found) for ctx in contexts]
        prints = iter(pool.map(place_job, jobs))
        made = [{'seed': seed, 'settlements': settlements, 'places': [next(prints) for _ in contexts]}
                for seed, (settlements, contexts) in zip(seeds, found)]
    return {'version': VERSION, 'stages': {kind: list(names) for kind, names in STAGES.items()}, 'kinds': list(KINDS),
            'pinned': pinned, 'worlds': made}


def check(worlds):
    """The committed file's pinned places and first `worlds` worlds against a fresh run, so CI can check quickly."""
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
            print(f'{name} matches on its {len(PINNED)} pinned places and {args.worlds} worlds')
            return 0
        print(f'{name} is out of date: run python tools/worldgen/place_goldens.py and commit the result', file=sys.stderr)
        return 1
    data = build(args.worlds)
    text_ = json.dumps(data, indent=1) + '\n'
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(text_, encoding='utf-8', newline='\n')
    places = sum(len(w['places']) for w in data['worlds'])
    print(f'wrote {name}: {len(PINNED)} pinned places, {args.worlds} worlds of {places} places ({len(text_):,} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
