// Free of Node imports, like stages.ts. tools/worldgen/place_goldens.py's folds, line for line: a place's context, its
// site after each stage group of build_settlement, and its layout, checked against the committed prints.
import {
  NO_CODE,
  PLACE_EMOTES,
  PLACE_EXPRESSIONS,
  PLACE_FACINGS,
  PLACE_JOBS,
  PLACE_POSES,
  type PlaceLayout,
} from '@nomos/sim-protocol/place';
import { buildPlace, SETTLEMENT_STAGES, siteFor } from '../../src/place/build.ts';
import type { PlaceContext } from '../../src/place/context.ts';
import { placeContexts } from '../../src/place/contexts.ts';
import { layoutOf } from '../../src/place/layout.ts';
import type { Person, Site, Sprite } from '../../src/place/site.ts';
import { layGround } from '../../src/place/terrain.ts';
import { buildVista } from '../../src/place/vista.ts';
import { generateWorld } from '../../src/world/generate.ts';
import { fold } from './fold.ts';

export interface PlaceGoldens {
  version: number;
  stages: { settlement: string[]; vista: string[] };
  kinds: string[];
  worlds: { seed: number; settlements: number; places: string[] }[];
}

export interface PlaceReport {
  places: number;
  failures: string[];
}

// The engine harness's share of the place goldens: two worlds, 102 places, about 2 s in Node, so Bun's job and each
// browser's add only a few seconds. Vitest checks all 20 worlds in Node.
export const ENGINE_WORLDS = 2;

const CONTEXT_FIELDS = [
  'seed',
  'name',
  'biome',
  'temperature',
  'moisture',
  'tier',
  'population',
  'sea',
  'coast',
  'river',
  'roads',
  'farmland',
  'landmarks',
  'wonder',
] as const;
function text(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

// json.dumps of the context with compact separators, as Python writes it.
export function foldContext(ctx: PlaceContext): number {
  return fold(text(JSON.stringify(Object.fromEntries(CONTEXT_FIELDS.map((field) => [field, ctx[field]])))));
}

function sprites(items: readonly Sprite[]): number[] {
  return items.flatMap((s) => [s.category.length + 1 + s.name.length, ...text(`${s.category}/${s.name}`), s.x, s.y]);
}

function code(list: readonly string[], value: string | null): number {
  return value === null ? NO_CODE : list.indexOf(value);
}

function personCodes(p: Person): number[] {
  return [
    p.look,
    code(PLACE_POSES, p.pose),
    code(PLACE_FACINGS, p.facing),
    p.step,
    code(PLACE_EXPRESSIONS, p.expression),
    code(PLACE_JOBS, p.job),
    code(PLACE_EMOTES, p.emote),
    p.x,
    p.y,
    p.lift,
  ];
}

export function foldSite(site: Site, kinds: readonly string[]): number {
  const n = site.w * site.h;
  const kind = new Array<number>(n);
  const flags = new Array<number>(n);
  for (let c = 0; c < n; c++) {
    kind[c] = kinds.indexOf(site.kind[c]);
    flags[c] =
      site.sea[c] |
      (site.road[c] << 1) |
      ((site.solid[c] === null ? 0 : 1) << 2) |
      (site.big[c] << 3) |
      (site.shade[c] << 4) |
      (site.crown[c] << 5) |
      (site.keep[c] << 6);
  }
  const doors = site.doors.flatMap((d) => [d.x, d.y]);
  const people = site.people.flatMap(personCodes);
  return fold(kind, flags, sprites(site.ground), sprites(site.standing), doors, [site.cx, site.cy], people);
}

export function foldLayout(layout: PlaceLayout): number {
  const p = layout.people;
  return fold(
    [layout.width, layout.height],
    text(layout.frames.join('\n')),
    layout.tiles,
    layout.ground,
    layout.standing,
    p.look,
    p.pose,
    p.facing,
    p.step,
    p.expression,
    p.job,
    p.emote,
    p.x,
    p.y,
    p.lift,
  );
}

// The context, the ground, each settlement stage group, then the layout.
export function placePrints(ctx: PlaceContext, kinds: readonly string[]): number[] {
  const site = siteFor(ctx);
  layGround(site);
  const prints = [foldContext(ctx), foldSite(site, kinds)];
  if (ctx.wonder) buildVista(site);
  else {
    for (const stage of SETTLEMENT_STAGES) {
      stage(site);
      prints.push(foldSite(site, kinds));
    }
  }
  prints.push(foldLayout(layoutOf(site)));
  return prints;
}

function checkPlace(report: PlaceReport, goldens: PlaceGoldens, label: string, ctx: PlaceContext, want: string): void {
  const stages = ctx.wonder ? goldens.stages.vista : goldens.stages.settlement;
  const got = placePrints(ctx, goldens.kinds).map(hex);
  const wanted = want.split(' ');
  const stage = got.findIndex((print, k) => print !== wanted[k]);
  if (stage >= 0) report.failures.push(`${label} ${stages[stage]}: got ${got[stage]}, want ${wanted[stage]}`);
}

// Every place of the first `worlds` worlds against the goldens, each stopping at its first stage that differs. On the
// first world the mirror's layout must match buildPlace's too, as place_goldens.py checks its own mirror.
export function checkPlaces(goldens: PlaceGoldens, worlds: number): PlaceReport {
  const report: PlaceReport = { places: 0, failures: [] };
  goldens.worlds.slice(0, worlds).forEach((world, w) => {
    const contexts = placeContexts(generateWorld(world.seed, 'standard'));
    if (contexts.length !== world.places.length) {
      report.failures.push(`${hex(world.seed)}: ${contexts.length} places, want ${world.places.length}`);
      return;
    }
    contexts.forEach((ctx, i) => {
      report.places++;
      const label = `${hex(world.seed)} place ${i} (${ctx.name})`;
      checkPlace(report, goldens, label, ctx, world.places[i]);
      const mirrored = world.places[i].split(' ').at(-1);
      if (w === 0 && hex(foldLayout(buildPlace(ctx).layout)) !== mirrored) report.failures.push(`${label}: the mirror drifts`);
    });
  });
  return report;
}
