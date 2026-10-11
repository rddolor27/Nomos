import { describe, expect, it } from 'vitest';
import {
  BREAD,
  FUEL,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_GOING,
  PHASE_WORKING,
  SUBPIXELS,
  createShops,
  createStandInTownHomes,
  createTown,
  createWorld,
  step,
  type Ground,
  type World,
} from '@nomos/sim-core';
import {
  ACTION_WALK,
  EMOTE_COIN,
  TIER_AGENTS,
  createSnapshotPool,
  eatingOf,
  emoteOf,
  giveBack,
  indoorsOf,
  itemOf,
  packVisual,
  takeView,
  writeSnapshot,
  type SnapshotPool,
} from '../src/index.ts';

function mustTake(pool: SnapshotPool): Uint32Array<ArrayBuffer> {
  const view = takeView(pool);
  if (view === null) throw new Error('the pool has no free view');
  return view;
}

describe('the snapshot pool', () => {
  it('circulates three buffers', () => {
    const pool = createSnapshotPool(10_000);
    const views = [mustTake(pool), mustTake(pool), mustTake(pool)];
    expect(views.map((view) => view.byteLength)).toEqual([120_000, 120_000, 120_000]);
    expect(takeView(pool)).toBeNull();

    // The app's side of the trip: transferring detaches the worker's copy, and a fresh buffer comes back.
    const returned = structuredClone(views[0].buffer, { transfer: [views[0].buffer] });
    expect(views[0].byteLength).toBe(0);
    giveBack(pool, returned);
    expect(mustTake(pool).buffer).toBe(returned);
    expect(takeView(pool)).toBeNull();

    expect(() => giveBack(pool, new ArrayBuffer(8))).toThrow(RangeError);
  });

  it('refuses a buffer when every slot is already home', () => {
    const pool = createSnapshotPool(10_000);
    expect(() => giveBack(pool, new ArrayBuffer(120_000))).toThrow(RangeError);
  });
});

describe('writeSnapshot', () => {
  it('writes 12 little-endian bytes per agent', () => {
    const world = createWorld(42, 'phone');
    for (let tick = 0; tick < 100; tick++) step(world);
    const view = mustTake(createSnapshotPool(TIER_AGENTS.phone));

    const count = writeSnapshot(world, view);

    const bytes = new DataView(view.buffer);
    const { x, y, look, action, facing } = world.agents;
    const broken: number[] = [];
    for (let i = 0; i < count; i++) {
      const at = 12 * i;
      const word = packVisual(look[i], action[i], 0, 0, facing[i], 0);
      const same =
        bytes.getFloat32(at, true) === x[i] / SUBPIXELS &&
        bytes.getFloat32(at + 4, true) === y[i] / SUBPIXELS &&
        bytes.getUint32(at + 8, true) === word;
      if (!same) broken.push(i);
    }
    expect(count).toBe(10_000);
    expect(broken).toEqual([]);
    expect(action.some((code) => code === ACTION_WALK)).toBe(true);
  });
});

const SMALL_GROUND: Ground = { width: 64, height: 64, walk: new Uint8Array(64 * 64).fill(1) };
const PEOPLE = 120;

// A town on the small ground. One general shop selling every good gives it streets, and none leaves its blobs wandering.
function townOf(streets: boolean): World {
  const shops = createShops(streets ? [{ doorX: 32, doorY: 32, goods: 0xfe, stall: false }] : []);
  return createTown(42, 'phone', SMALL_GROUND, createStandInTownHomes(SMALL_GROUND, PEOPLE), shops);
}

// Each blob's visual word, at 3 * blob + 2.
function wordsOf(world: World): number[] {
  const view = mustTake(createSnapshotPool(world.agents.capacity));
  writeSnapshot(world, view);
  return Array.from({ length: world.agents.count[0] }, (_, blob) => view[3 * blob + 2]);
}

describe('the street in the snapshot', () => {
  it('shows what a blob carries and whether it eats or is indoors, from its errand row', () => {
    const world = townOf(true);
    const { phase, good } = world.errands;
    // Blob 0 walks home with bread, 1 eats it on the doorstep, 2 is at work, 3 walks out for bread with none yet, 4 buys at a
    // counter and 5 carries fuel home.
    const errands = [
      [PHASE_COMING, BREAD],
      [PHASE_EATING, BREAD],
      [PHASE_WORKING, 0],
      [PHASE_GOING, BREAD],
      [PHASE_BUYING, BREAD],
      [PHASE_COMING, FUEL],
    ];
    errands.forEach(([phaseOf, goodOf], blob) => {
      phase[blob] = phaseOf;
      good[blob] = goodOf;
    });

    const words = wordsOf(world);

    expect(errands.map((_, blob) => [indoorsOf(words[blob]), itemOf(words[blob]), eatingOf(words[blob])])).toEqual([
      [0, BREAD, 0],
      [0, BREAD, 1],
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, FUEL, 0],
    ]);
    // Only the blob buying at a counter wears the coin bubble.
    expect(errands.map((_, blob) => emoteOf(words[blob]))).toEqual([0, 0, 0, 0, EMOTE_COIN, 0]);
    // The rest of a word is the blob's own, and a blob no errand has woken is asleep indoors with nothing in its hands.
    const { look, action, facing } = world.agents;
    expect(words[0]).toBe(packVisual(look[0], action[0], 0, 0, facing[0], 0, 0, BREAD, 0));
    expect(words[PEOPLE - 1]).toBe(packVisual(look[PEOPLE - 1], action[PEOPLE - 1], 0, 0, facing[PEOPLE - 1], 0, 1, 0, 0));
  });

  it('puts no one indoors in a town without streets, whose empty store reads as asleep', () => {
    const wandering = wordsOf(townOf(false));
    const onStreets = wordsOf(townOf(true));

    expect(wandering.map(indoorsOf)).toEqual(new Array<number>(PEOPLE).fill(0));
    expect(onStreets.map(indoorsOf)).toEqual(new Array<number>(PEOPLE).fill(1));
    // Neither has a buyer yet, and a town without streets never asks the store, so no word carries a bubble.
    expect([...wandering, ...onStreets].map(emoteOf)).toEqual(new Array<number>(2 * PEOPLE).fill(0));
  });
});
