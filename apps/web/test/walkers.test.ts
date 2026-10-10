import { ACTION_WALK, TICK, layoutWorld, move, populate, setHeading, type Ground } from '@nomos/sim-core';
import {
  NO_CODE,
  PLACE_FACINGS,
  PLACE_POSES,
  PLACE_TILE_PX,
  type PlaceCrowd,
  type PlaceLayout,
  type PlacePeople,
  type PlaceWalks,
} from '@nomos/sim-protocol/place';
import { crowdedPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { WALK_PX_PER_S, WALK_SEED, WALK_TICK_MS, Walkers, withCrowd } from '../src/map/walkers.ts';

const STAND = PLACE_POSES.indexOf('stand');
const WALK = PLACE_POSES.indexOf('walk');
const [DOWN, UP, LEFT, RIGHT] = ['down', 'up', 'left', 'right'].map((facing) => PLACE_FACINGS.indexOf(facing as 'down'));
const WIDTH = 4;

// A 4 x 4 place whose person 0 stands at (1, 1), anchored 2 px left of its tile's middle and 13 px down, and walks the
// square (1, 1), (2, 1), (2, 2), (1, 2); person 1 sits still.
function square(): { layout: PlaceLayout; walks: PlaceWalks } {
  const layout: PlaceLayout = {
    width: WIDTH,
    height: 4,
    frames: [],
    tiles: new Uint16Array(16),
    ground: new Int32Array(0),
    standing: new Int32Array(0),
    people: {
      look: Uint8Array.of(0, 1),
      pose: Uint8Array.of(STAND, PLACE_POSES.indexOf('sit')),
      facing: Uint8Array.of(UP, DOWN),
      step: Uint8Array.of(0, 0),
      expression: Uint8Array.of(0, 0),
      job: Uint8Array.of(NO_CODE, NO_CODE),
      emote: Uint8Array.of(NO_CODE, NO_CODE),
      x: Int32Array.of(16 + 6, 40),
      y: Int32Array.of(16 + 13, 40),
      lift: Uint8Array.of(0, 5),
    },
  };
  const cell = (x: number, y: number): number => y * WIDTH + x;
  const walks: PlaceWalks = {
    person: Uint16Array.of(0),
    offsets: Int32Array.of(0, 4),
    cells: Int32Array.of(cell(1, 1), cell(2, 1), cell(2, 2), cell(1, 2)),
  };
  return { layout, walks };
}

function at(layout: PlaceLayout): [number, number, number, number, number] {
  const p = layout.people;
  return [p.x[0], p.y[0], p.pose[0], p.facing[0], p.step[0]];
}

describe('walkers', () => {
  it("take the sim's 4 px step once a tick, so a tick lasts 200 ms at the stroll's 20 px a second", () => {
    expect(WALK_TICK_MS).toBe((4 * 1000) / WALK_PX_PER_S);
  });

  it('start from where place.py put the owner, walking along its loop', () => {
    const { layout, walks } = square();
    new Walkers(layout, walks).walk(0);
    expect(at(layout)).toEqual([22, 29, WALK, RIGHT, 0]);
  });

  // Walker 0 redraws on tick 0, which turns it from 192 to 187: a step of 1,016 and -125 in Q8.
  it('ease between ticks, a tick ahead of the clock', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    walkers.walk(WALK_TICK_MS / 2);
    expect(at(layout).slice(0, 2)).toEqual([23, 28]);
    walkers.walk(WALK_TICK_MS);
    expect(at(layout).slice(0, 2)).toEqual([25, 28]);
  });

  it("keep an owner near home, within its own loop's box", () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    const outside: [number, number][] = [];
    for (let ms = 0; ms < 600_000; ms += 50) {
      walkers.walk(ms);
      const [x, y] = at(layout);
      if (x < 16 || x >= 48 || y < 16 || y >= 48) outside.push([x, y]);
    }
    expect(outside).toEqual([]);
  });

  it('move only the people with a loop', () => {
    const { layout, walks } = square();
    new Walkers(layout, walks).walk(30_000);
    const p = layout.people;
    expect([p.x[1], p.y[1], p.pose[1], p.facing[1], p.step[1]]).toEqual([40, 40, PLACE_POSES.indexOf('sit'), DOWN, 0]);
  });

  it('start the street crowd at its phases along its own loop, in walk pose, facing on along it', () => {
    const { layout, walks } = square();
    // One crowd loop round the same square, (1, 1), (2, 1), (2, 2) and (1, 2): 20 px along is 4 px down from (2, 1)'s
    // spot, and 40 px along is 8 px left of (2, 2)'s.
    const crowd: PlaceCrowd = {
      look: Uint8Array.of(3, 4),
      expression: Uint8Array.of(1, 2),
      loop: Uint16Array.of(0, 0),
      phase: Uint16Array.of(20, 40),
      offsets: Int32Array.of(0, 4),
      cells: Int32Array.of(5, 6, 10, 9),
    };
    const placed = withCrowd(layout, crowd, 2);
    const walkers = new Walkers(placed, walks, crowd, 2);
    const p = placed.people;
    expect(walkers.count).toBe(3);
    expect([2, 3].map((j) => [p.x[j], p.y[j], p.pose[j], p.facing[j], p.look[j], p.job[j]])).toEqual([
      [40, 34, WALK, DOWN, 3, NO_CODE],
      [32, 46, WALK, LEFT, 4, NO_CODE],
    ]);
  });

  it('stand every walker back where place.py put it, to walk the same way again from there', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    walkers.walk(37_000);
    const walked = at(layout);
    walkers.standStill();
    expect(at(layout)).toEqual([22, 29, STAND, UP, 0]);
    walkers.walk(0);
    expect(at(layout)).toEqual([22, 29, WALK, RIGHT, 0]);
    walkers.walk(37_000);
    expect(at(layout)).toEqual(walked);
  });
});

const OPEN_WIDTH = 12;
const OPEN_HEIGHT = 10;
const CLOSED = [
  [4, 3],
  [5, 3],
  [5, 4],
  [8, 6],
  [2, 7],
  [9, 2],
  [10, 8],
];

function noPeople(): PlacePeople {
  return {
    look: new Uint8Array(0),
    pose: new Uint8Array(0),
    facing: new Uint8Array(0),
    step: new Uint8Array(0),
    expression: new Uint8Array(0),
    job: new Uint8Array(0),
    emote: new Uint8Array(0),
    x: new Int32Array(0),
    y: new Int32Array(0),
    lift: new Uint8Array(0),
  };
}

// A 12 x 10 place, open but for a few tiles, with no owners and three crowd walkers on one loop through every open tile,
// row by row. They start at tiles 0, 37 and 74 along it, (0, 0), (2, 3) and (6, 6), each stepping right.
function openPlace(): { placed: PlaceLayout; walks: PlaceWalks; crowd: PlaceCrowd; ground: Ground } {
  const walk = new Uint8Array(OPEN_WIDTH * OPEN_HEIGHT).fill(1);
  for (const [tx, ty] of CLOSED) walk[ty * OPEN_WIDTH + tx] = 0;
  const cells = Int32Array.from(Array.from(walk.keys()).filter((cell) => walk[cell] === 1));
  const layout: PlaceLayout = {
    width: OPEN_WIDTH,
    height: OPEN_HEIGHT,
    frames: [],
    tiles: new Uint16Array(walk.length),
    ground: new Int32Array(0),
    standing: new Int32Array(0),
    people: noPeople(),
  };
  const walks: PlaceWalks = { person: new Uint16Array(0), offsets: Int32Array.of(0), cells: new Int32Array(0) };
  const crowd: PlaceCrowd = {
    look: new Uint8Array(3),
    expression: new Uint8Array(3),
    loop: new Uint16Array(3),
    phase: Uint16Array.of(0, 37 * PLACE_TILE_PX, 74 * PLACE_TILE_PX),
    offsets: Int32Array.of(0, cells.length),
    cells,
  };
  return { placed: withCrowd(layout, crowd, 3), walks, crowd, ground: { width: OPEN_WIDTH, height: OPEN_HEIGHT, walk } };
}

describe("walkers and the sim's blobs", () => {
  it('walk the same way, tick by tick, by the one wander rule and draw', () => {
    const { placed, walks, crowd, ground } = openPlace();
    const walkers = new Walkers(placed, walks, crowd, 3);
    const people = placed.people;
    expect(Array.from(people.x)).toEqual([8, 40, 104]);
    expect(Array.from(people.y)).toEqual([14, 62, 110]);
    const world = layoutWorld(WALK_SEED, 'phone', 3, 1_048_576, ground);
    populate(world);
    const agents = world.agents;
    for (let i = 0; i < 3; i++) {
      agents.x[i] = people.x[i] * 256;
      agents.y[i] = people.y[i] * 256;
      agents.action[i] = ACTION_WALK;
      setHeading(agents, i, 192);
    }
    const apart: string[] = [];
    let stands = 0;
    for (let tick = 0; tick < 2_000 && apart.length < 5; tick++) {
      const blobs = [0, 1, 2].map((i) => [agents.x[i] >> 8, agents.y[i] >> 8]);
      move(world);
      world.globals[TICK]++;
      walkers.walk(tick * WALK_TICK_MS);
      for (let i = 0; i < 3; i++) {
        const pose = agents.action[i] === ACTION_WALK ? WALK : STAND;
        if (pose === STAND) stands++;
        const blob = [...blobs[i], pose].join();
        const walker = [people.x[i], people.y[i], people.pose[i]].join();
        if (walker !== blob) apart.push(`tick ${tick}, walker ${i}: ${walker}, blob ${blob}`);
      }
    }
    expect(apart).toEqual([]);
    expect(stands).toBeGreaterThan(0);
  });

  it('step the walk frame every 8 art px along the way they face, and stand on frame 0', () => {
    const { placed, walks, crowd } = openPlace();
    const walkers = new Walkers(placed, walks, crowd, 3);
    const { x, y, pose, facing, step } = placed.people;
    const wrong: string[] = [];
    for (let ms = 0; ms < 120_000; ms += 10) {
      walkers.walk(ms);
      for (let i = 0; i < 3; i++) {
        const along = facing[i] === LEFT || facing[i] === RIGHT ? x[i] : y[i];
        const want = pose[i] === WALK ? Math.floor(along / 8) % 2 : 0;
        if (step[i] !== want) wrong.push(`${ms} ms, walker ${i}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

// The tiles of each walker's own loop, in walker order: the owners', then the crowd's first n.
function loopTiles(walks: PlaceWalks, crowd: PlaceCrowd, n: number): Set<number>[] {
  const loops = (cells: Int32Array, offsets: Int32Array): Set<number>[] =>
    Array.from({ length: offsets.length - 1 }, (_, r) => new Set(cells.subarray(offsets[r], offsets[r + 1])));
  const crowded = loops(crowd.cells, crowd.offsets);
  return [...loops(walks.cells, walks.offsets), ...Array.from(crowd.loop.subarray(0, n), (loop) => crowded[loop])];
}

// A loop's box: its tiles' least x and y, then their most.
function boxOf(tiles: Set<number>, width: number): number[] {
  const xs = Array.from(tiles, (cell) => cell % width);
  const ys = Array.from(tiles, (cell) => Math.floor(cell / width));
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// What a place's walkers may do: keep to its street network, an owner within its own loop's box.
interface Streets {
  width: number;
  owners: number;
  network: Set<number>;
  tiles: Set<number>[];
  boxes: number[][];
  // The crowd walkers seen off their own loop's tiles.
  strayed: Set<number>;
}

function outsideBox([minX, minY, maxX, maxY]: number[], tx: number, ty: number): boolean {
  return tx < minX || ty < minY || tx > maxX || ty > maxY;
}

// A frame on a tick draws each walker where its last tick put it.
function misstep(streets: Streets, w: number, x: number, y: number, lastX: number, lastY: number, onTick: boolean): string {
  const tx = Math.floor(x / PLACE_TILE_PX);
  const ty = Math.floor(y / PLACE_TILE_PX);
  const tile = ty * streets.width + tx;
  const owner = w < streets.owners;
  if (!owner && !streets.tiles[w].has(tile)) streets.strayed.add(w);
  const far = Math.abs(x - lastX) > 1 || Math.abs(y - lastY) > 1;
  const outside = (owner && outsideBox(streets.boxes[w], tx, ty)) || (onTick && !streets.network.has(tile));
  return far || outside ? `walker ${w} at ${x}, ${y} from ${lastX}, ${lastY}` : '';
}

// Each frame of 60 a second, every walker in a world's first capital and first wonder moves at most an art pixel along
// each axis. Every tick it stands on the place's street network, the tiles of all its loops: an owner within its own
// loop's box, and the street crowd anywhere on it, most of the crowd leaving its own loop's tiles. Between ticks, a
// diagonal step may cut a closed tile's corner, as the sim's blobs do.
describe("walkers in a world's places", () => {
  const map = generateWorld(42, 'standard');
  const contexts = placeContexts(map);
  const places = [0, map.settlements.cell.length];

  it.each(places)('wander the streets of place %i', (place) => {
    const { layout, walks, crowd } = crowdedPlace(contexts[place]);
    const n = crowd.look.length;
    const placed = withCrowd(layout, crowd, n);
    const walkers = new Walkers(placed, walks, crowd, n);
    const tiles = loopTiles(walks, crowd, n);
    const streets: Streets = {
      width: layout.width,
      owners: walks.person.length,
      network: new Set([...walks.cells, ...crowd.cells]),
      tiles,
      boxes: tiles.map((loop) => boxOf(loop, layout.width)),
      strayed: new Set(),
    };
    const { x, y } = placed.people;
    const lastX = new Int32Array(walkers.count);
    const lastY = new Int32Array(walkers.count);
    const bad: string[] = [];
    walkers.walk(0);
    for (let frame = 1; frame <= 3000 && bad.length < 5; frame++) {
      for (let w = 0; w < walkers.count; w++) {
        lastX[w] = x[walkers.person(w)];
        lastY[w] = y[walkers.person(w)];
      }
      const ms = (frame * 1000) / 60;
      walkers.walk(ms);
      for (let w = 0; w < walkers.count; w++) {
        const p = walkers.person(w);
        const wrong = misstep(streets, w, x[p], y[p], lastX[w], lastY[w], ms % WALK_TICK_MS === 0);
        if (wrong) bad.push(`frame ${frame}, ${wrong}`);
      }
    }
    expect(streets.owners).toBeGreaterThan(0);
    expect(bad).toEqual([]);
    expect(2 * streets.strayed.size).toBeGreaterThanOrEqual(n);
  });
});
