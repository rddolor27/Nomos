import {
  CUSTOM_FESTIVAL,
  CUSTOM_FOOD,
  CUSTOM_MUSIC,
  CUSTOM_NAMING,
  DAYS_PER_YEAR,
  HOUSEHOLDS,
  MAX_CULTURES,
  SUBPIXELS,
  TILE_PX,
  WARM_AGENTS,
  WARM_MEMORY_BYTES,
  customOf,
  draw2,
  festivalShoppers,
  issue,
  layoutWorld,
  populate,
  sectorAccount,
  withCustom,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { relabelCultures } from '../src/index.ts';
import { relabelRun, type Daily } from './relabel-harness.ts';

const PERM = new Uint8Array([2, 0, 3, 1]);
const INVERSE = new Uint8Array([1, 3, 0, 2]);
const DOMAINS = [CUSTOM_FOOD, CUSTOM_FESTIVAL, CUSTOM_MUSIC, CUSTOM_NAMING];
const SEEDS = [1, 42, 0x80000000];
const LEAK_STREAM = 0x1f1;
const LEAK_DAYS = 10;
const MOVED_AGENTS = 100;
const MOVE_Q8 = 256;

function warmWorld(seed: number): World {
  const world = layoutWorld(seed, 'phone', WARM_AGENTS, WARM_MEMORY_BYTES);
  populate(world);
  return world;
}

function arenaBytes(world: World): Uint8Array {
  return new Uint8Array(world.arena.memory.buffer, 0, world.arena.top).slice();
}

function payHouseholds(world: World, cents: number): void {
  issue(world.cash, sectorAccount(0, HOUSEHOLDS), cents);
}

function membersOf(world: World, c: number): number {
  const { count, culture } = world.agents;
  let members = 0;
  for (let i = 0; i < count[0]; i++) if (culture[i] === c) members++;
  return members;
}

// A cent to each member of every culture whose draw, keyed by keyOf, comes up odd.
function payDrawnCultures(world: World, day: number, keyOf: (world: World, c: number) => number): void {
  for (let c = 0; c < MAX_CULTURES; c++) {
    if (draw2(world.seed, LEAK_STREAM, keyOf(world, c), day) % 2 === 1) payHouseholds(world, membersOf(world, c));
  }
}

function moveFirstInCultureOrder(world: World): void {
  const { count, culture, x } = world.agents;
  const extentMask = world.ground.width * TILE_PX * SUBPIXELS - 1;
  let moved = 0;
  for (let c = 0; c < MAX_CULTURES; c++) {
    for (let i = 0; i < count[0] && moved < MOVED_AGENTS; i++) {
      if (culture[i] !== c) continue;
      x[i] = (x[i] + MOVE_Q8) & extentMask;
      moved++;
    }
  }
}

function relabelled(values: ArrayLike<number>): number[] {
  return Array.from(values, (c) => PERM[c]);
}

describe('relabelling cultures', () => {
  it('relabels columns, nibbles and uids together', () => {
    const world = warmWorld(42);
    const { count, culture, birthCulture, customs } = world.agents;
    // Mixed customs, so each nibble has to move on its own.
    for (let i = 0; i < count[0]; i++) {
      for (const domain of DOMAINS) customs[i] = withCustom(customs[i], domain, (i + domain) % 4);
    }
    const bytes = arenaBytes(world);
    const old = { culture: culture.slice(), birthCulture: birthCulture.slice(), customs: customs.slice() };

    relabelCultures(world, PERM);
    expect(Array.from(culture)).toEqual(relabelled(old.culture));
    expect(Array.from(birthCulture)).toEqual(relabelled(old.birthCulture));
    for (const domain of DOMAINS) {
      const nibbles = (values: Uint16Array) => Array.from(values, (v) => customOf(v, domain));
      expect(nibbles(customs), `domain ${domain}`).toEqual(relabelled(nibbles(old.customs)));
    }
    expect([...world.cultureUid]).toEqual([2, 4, 1, 3, 0, 0, 0, 0]);

    relabelCultures(world, INVERSE);
    expect(arenaBytes(world)).toEqual(bytes);
  });

  it('refuses a non-permutation', () => {
    const world = warmWorld(42);
    const bytes = arenaBytes(world);
    for (const perm of [[0, 0, 1, 2], [2, 0, 1], [1, 2, 3, 4]]) {
      expect(() => relabelCultures(world, new Uint8Array(perm)), `[${perm}]`).toThrow(RangeError);
    }
    expect(arenaBytes(world)).toEqual(bytes);
  });

  // R8's exit check: no culture-ordered loop that matters, and no indexing by culture outside custom tables.
  it('keeps every non-culture hash for 3 seeds × 1 year', { timeout: 120_000 }, () => {
    let spentCents = 0;
    const spendAtFestivals: Daily = (world, day) => {
      const cents = festivalShoppers(world, day);
      spentCents += cents;
      payHouseholds(world, cents);
    };
    for (const seed of SEEDS) {
      const plain = relabelRun(seed, null, DAYS_PER_YEAR, spendAtFestivals);
      expect(plain).toHaveLength(DAYS_PER_YEAR);
      expect(relabelRun(seed, PERM, DAYS_PER_YEAR, spendAtFestivals), `seed ${seed}`).toEqual(plain);
    }
    expect(spentCents).toBeGreaterThan(0);
  });

  it('catches culture read by index', { timeout: 60_000 }, () => {
    const leaks: Record<string, Daily> = {
      'a cent per member of culture 1': (world) => payHouseholds(world, membersOf(world, 1)),
      'a draw keyed by culture index': (world, day) => payDrawnCultures(world, day, (_, c) => c),
      'a move in culture-index order': moveFirstInCultureOrder,
    };
    for (const [leak, daily] of Object.entries(leaks)) {
      expect(relabelRun(42, PERM, LEAK_DAYS, daily), leak).not.toEqual(relabelRun(42, null, LEAK_DAYS, daily));
    }
    const keyedByUid: Daily = (world, day) => payDrawnCultures(world, day, (w, c) => w.cultureUid[c]);
    expect(relabelRun(42, PERM, LEAK_DAYS, keyedByUid)).toEqual(relabelRun(42, null, LEAK_DAYS, keyedByUid));
  });
});
