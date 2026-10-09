import {
  NO_CODE,
  PLACE_FACINGS,
  PLACE_POSES,
  PLACE_TILE_PX,
  type PlaceCrowd,
  type PlaceLayout,
  type PlaceWalks,
} from '@nomos/sim-protocol/place';
import { crowdedPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { WALK_PX_PER_S, Walkers, withCrowd } from '../src/map/walkers.ts';

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

// The time loop 0's walker takes to cover px art px.
function msFor(px: number): number {
  return (px * 1000) / WALK_PX_PER_S;
}

// Person 0's lap once the square's three corners but its home are cut: four straights of 10, 4, 4 and 10 px, and three
// bends of two steps of 3.16 px (sqrt 10) round one of 2.83 px (sqrt 8).
const LAP = 28 + 3 * (2 * Math.sqrt(10) + Math.sqrt(8));

function at(layout: PlaceLayout): [number, number, number, number, number] {
  const p = layout.people;
  return [p.x[0], p.y[0], p.pose[0], p.facing[0], p.step[0]];
}

describe('walkers', () => {
  it('starts from where place.py put the walker, facing its first step', () => {
    const { layout, walks } = square();
    new Walkers(layout, walks).walk(0);
    expect(at(layout)).toEqual([22, 29, WALK, RIGHT, 0]);
  });

  it('glides along its loop at its pace, cutting each corner, facing the dominant axis of its move', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    const legs: [number, number, number][] = [];
    for (const px of [5, 11.5, 15.5, 21, 31, 41, 50, LAP + 0.5]) {
      walkers.walk(msFor(px));
      legs.push([layout.people.x[0], layout.people.y[0], layout.people.facing[0]]);
    }
    expect(legs).toEqual([
      [27, 29, RIGHT],
      [33, 29, RIGHT],
      [36, 31, DOWN],
      [38, 36, DOWN],
      [34, 44, LEFT],
      [24, 43, UP],
      [22, 35, UP],
      [22, 29, RIGHT],
    ]);
  });

  it("keeps to the loop's tiles, rounding every corner but its home's instead of touching it", () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    const trail: [number, number][] = [];
    for (let px = 0; px < LAP; px += 0.5) {
      walkers.walk(msFor(px));
      trail.push([layout.people.x[0], layout.people.y[0]]);
    }
    const corners = new Set(['38,29', '38,45', '22,45']);
    expect(trail.filter(([x, y]) => x < 16 || x >= 48 || y < 16 || y >= 48)).toEqual([]);
    expect(trail.filter(([x, y]) => corners.has(`${x},${y}`))).toEqual([]);
    expect(trail.some(([x, y], i) => i > 0 && x !== trail[i - 1][0] && y !== trail[i - 1][1])).toBe(true);
  });

  it('turns round at the end of a street that runs out', () => {
    const { layout, walks } = square();
    walks.offsets = Int32Array.of(0, 2);
    const walkers = new Walkers(layout, walks);
    const legs: [number, number, number][] = [];
    for (const px of [11, 13, 20]) {
      walkers.walk(msFor(px));
      legs.push([layout.people.x[0], layout.people.y[0], layout.people.facing[0]]);
    }
    expect(legs).toEqual([
      [33, 29, RIGHT],
      [33, 29, LEFT],
      [26, 29, LEFT],
    ]);
  });

  it('changes the walk frame every 8 art px walked', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    const steps = [0, 7, 8, 15, 16, 23, 24].map((px) => {
      walkers.walk(msFor(px));
      return layout.people.step[0];
    });
    expect(steps).toEqual([0, 0, 1, 1, 0, 0, 1]);
  });

  it('moves only the people with a loop', () => {
    const { layout, walks } = square();
    new Walkers(layout, walks).walk(msFor(30));
    const p = layout.people;
    expect([p.x[1], p.y[1], p.pose[1], p.facing[1], p.step[1]]).toEqual([40, 40, PLACE_POSES.indexOf('sit'), DOWN, 0]);
  });

  it('starts the street crowd at its phases on its own loop, in walk pose, at the middle of its tiles', () => {
    const { layout, walks } = square();
    // One crowd loop round the same square, (1, 1), (2, 1), (2, 2) and (1, 2), whose 64 px of tiles its cut corners
    // shorten to 52.6 px; the phases keep their share of it.
    const crowd = {
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
      [37, 31, WALK, DOWN, 3, NO_CODE],
      [37, 45, WALK, LEFT, 4, NO_CODE],
    ]);
    walkers.walk(msFor(4));
    expect([p.x[2], p.y[2]]).toEqual([39, 34]);
  });

  it('stands every walker back where place.py put it', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    walkers.walk(msFor(37));
    walkers.standStill();
    expect(at(layout)).toEqual([22, 29, STAND, UP, 0]);
  });
});

// The tiles of each walker's own loop, in walker order: the owners', then the crowd's first n.
function loopTiles(walks: PlaceWalks, crowd: PlaceCrowd, n: number): Set<number>[] {
  const loops = (cells: Int32Array, offsets: Int32Array): Set<number>[] =>
    Array.from({ length: offsets.length - 1 }, (_, r) => new Set(cells.subarray(offsets[r], offsets[r + 1])));
  const crowded = loops(crowd.cells, crowd.offsets);
  return [...loops(walks.cells, walks.offsets), ...Array.from(crowd.loop.subarray(0, n), (loop) => crowded[loop])];
}

// Each frame of 60 a second, every walker in a world's first capital and first wonder, owners and street crowd, moves at
// most an art pixel along each axis and stays on the tiles of its own loop.
describe("walkers in a world's places", () => {
  const map = generateWorld(42, 'standard');
  const contexts = placeContexts(map);
  const places = [0, map.settlements.cell.length];

  it.each(places)('keep to their loops in place %i', (place) => {
    const { layout, walks, crowd } = crowdedPlace(contexts[place]);
    const n = crowd.look.length;
    const placed = withCrowd(layout, crowd, n);
    const walkers = new Walkers(placed, walks, crowd, n);
    const tiles = loopTiles(walks, crowd, n);
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
      walkers.walk((frame * 1000) / 60);
      for (let w = 0; w < walkers.count; w++) {
        const p = walkers.person(w);
        const tile = Math.floor(y[p] / PLACE_TILE_PX) * layout.width + Math.floor(x[p] / PLACE_TILE_PX);
        const far = Math.abs(x[p] - lastX[w]) > 1 || Math.abs(y[p] - lastY[w]) > 1;
        if (far || !tiles[w].has(tile)) bad.push(`frame ${frame}, walker ${w}: ${x[p] - lastX[w]}, ${y[p] - lastY[w]}`);
      }
    }
    expect(walks.person.length).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});
