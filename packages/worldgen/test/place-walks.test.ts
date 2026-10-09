import { readFileSync } from 'node:fs';
import { PLACE_TILE_PX, type PlaceWalks } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { generateWorld, placeContexts, type PlaceContext } from '../src/index.ts';
import { buildSite } from '../src/place/build.ts';
import type { Site } from '../src/place/site.ts';
import { placeWalks } from '../src/place/walks.ts';

const FIXTURE = new URL('../../render-gl/test/fixtures/places-v1.json', import.meta.url);
const fixtures: { name: string; context: PlaceContext }[] = JSON.parse(readFileSync(FIXTURE, 'utf8')).places;
const LOOP_CELLS = 4096;
const WORLDS = 20;
const FIRST_SEED = 0x5eed0001;

// M3.1's plan, Task 3: people walk on a road, or on a tile they may stand on, never through what stands there.
function walkable(site: Site, cell: number): boolean {
  const x = cell % site.w;
  const y = (cell - x) / site.w;
  return site.solid[cell] === null && (site.road[cell] === 1 || site.standable(x, y));
}

function adjacent(site: Site, a: number, b: number): boolean {
  const dx = Math.abs((a % site.w) - (b % site.w));
  const dy = Math.abs(Math.floor(a / site.w) - Math.floor(b / site.w));
  return dx + dy === 1;
}

function tileOf(site: Site, person: number): number {
  const p = site.people[person];
  return Math.floor(p.y / PLACE_TILE_PX) * site.w + Math.floor(p.x / PLACE_TILE_PX);
}

function loopProblems(label: string, site: Site, walks: PlaceWalks): string[] {
  const { person, offsets, cells } = walks;
  const problems: string[] = [];
  if (offsets.length !== person.length + 1 || offsets[0] !== 0 || offsets[person.length] !== cells.length) {
    problems.push(`${label}: offsets do not index the cells`);
  }
  if (cells.length > LOOP_CELLS) problems.push(`${label}: ${cells.length} loop cells`);
  for (let r = 0; r < person.length; r++) {
    const loop = cells.subarray(offsets[r], offsets[r + 1]);
    problems.push(...oneLoopProblems(`${label} loop ${r} (person ${person[r]})`, site, person[r], loop));
  }
  return problems;
}

// A loop starts on its person's tile, steps to a 4-adjacent walkable tile each time, and steps back to its start.
function oneLoopProblems(who: string, site: Site, person: number, loop: Int32Array): string[] {
  const p = site.people[person];
  const problems: string[] = [];
  if (p.pose === 'sit' || p.job !== null) problems.push(`${who}: not a walker or a stander with no job`);
  if (loop.length < 2) problems.push(`${who}: ${loop.length} cells`);
  if (loop[0] !== tileOf(site, person)) problems.push(`${who}: starts off the person's tile`);
  for (let k = 0; k < loop.length; k++) {
    if (!walkable(site, loop[k])) problems.push(`${who}: cell ${loop[k]} is not walkable`);
    if (!adjacent(site, loop[k], loop[(k + 1) % loop.length])) problems.push(`${who}: step ${k} is no step`);
  }
  return problems;
}

// The loops, checked, and a second run's loops compared with them: on a fresh build of the place, or, where the place
// goldens already show each place rebuilds the same, on the same site.
function check(label: string, ctx: PlaceContext, rebuild: boolean): { problems: string[]; loops: number } {
  const site = buildSite(ctx);
  const walks = placeWalks(site);
  const again = placeWalks(rebuild ? buildSite(ctx) : site);
  const problems = loopProblems(label, site, walks);
  if (JSON.stringify(walks) !== JSON.stringify(again)) problems.push(`${label}: a second run walks other loops`);
  return { problems, loops: walks.person.length };
}

describe('the walk loops of a place', { timeout: 300_000 }, () => {
  it.each(fixtures.map((f) => [f.name, f.context] as const))('closes every loop of %s on walkable tiles', (name, ctx) => {
    const { problems, loops } = check(name, ctx, true);
    expect(problems).toEqual([]);
    expect(loops).toBeGreaterThan(0);
  });

  it(`closes every loop of every place of the first ${WORLDS} standard worlds`, () => {
    const problems: string[] = [];
    let loops = 0;
    for (let k = 0; k < WORLDS; k++) {
      const seed = FIRST_SEED + k;
      placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
        const result = check(`${seed.toString(16)} place ${i}`, ctx, false);
        problems.push(...result.problems);
        loops += result.loops;
      });
    }
    expect(problems.slice(0, 20)).toEqual([]);
    expect(loops).toBeGreaterThan(1000);
  });
});
