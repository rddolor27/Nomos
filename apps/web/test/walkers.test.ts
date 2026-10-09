import { NO_CODE, PLACE_FACINGS, PLACE_POSES, PLACE_TILE_PX, type PlaceLayout, type PlaceWalks } from '@nomos/sim-protocol/place';
import { buildSite, generateWorld, layoutOf, placeContexts, placeWalks } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { WALK_PX_PER_S, Walkers } from '../src/map/walkers.ts';

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

  it('walks each step of the loop in turn, facing the way it goes, and comes home', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    const legs: [number, number, number][] = [];
    for (const px of [5, 16 + 5, 32 + 5, 48 + 5, 64]) {
      walkers.walk(msFor(px));
      legs.push([layout.people.x[0], layout.people.y[0], layout.people.facing[0]]);
    }
    expect(legs).toEqual([
      [27, 29, RIGHT],
      [38, 34, DOWN],
      [33, 45, LEFT],
      [22, 40, UP],
      [22, 29, RIGHT],
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

  it('stands every walker back where place.py put it', () => {
    const { layout, walks } = square();
    const walkers = new Walkers(layout, walks);
    walkers.walk(msFor(37));
    walkers.standStill();
    expect(at(layout)).toEqual([22, 29, STAND, UP, 0]);
  });
});

function facingOf(dx: number, dy: number): number {
  return [DOWN, UP, LEFT, RIGHT][[dy > 0, dy < 0, dx < 0, dx > 0].indexOf(true)];
}

function inside(layout: PlaceLayout, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < layout.width * PLACE_TILE_PX && y < layout.height * PLACE_TILE_PX;
}

// A frame's move of dx, dy art px, ending at a tile's spot or not, judged with the facing it ends with.
function fairStep(dx: number, dy: number, onSpot: boolean, facing: number): boolean {
  if (Math.abs(dx) + Math.abs(dy) > 1) return false;
  return (dx === 0 && dy === 0) || onSpot || facing === facingOf(dx, dy);
}

// Each frame of 60 a second, every walker moves at most an art pixel along one axis and stays in the place. It faces
// the way it moved, but for the frame it lands on a tile's spot, where it already faces its next leg. True of every loop
// in a world's first capital and first wonder.
describe("walkers in a world's places", () => {
  const map = generateWorld(42, 'standard');
  const contexts = placeContexts(map);
  const places = [0, map.settlements.cell.length];

  it.each(places)('keep to their loops in place %i', (place) => {
    const site = buildSite(contexts[place]);
    const layout = layoutOf(site);
    const walks = placeWalks(site);
    const walkers = new Walkers(layout, walks);
    const { x, y, facing } = layout.people;
    const startX = Int32Array.from(walks.person, (p) => x[p]);
    const startY = Int32Array.from(walks.person, (p) => y[p]);
    const bad: string[] = [];
    walkers.walk(0);
    for (let frame = 1; frame <= 3000 && bad.length < 5; frame++) {
      const lastX = Int32Array.from(walks.person, (p) => x[p]);
      const lastY = Int32Array.from(walks.person, (p) => y[p]);
      walkers.walk((frame * 1000) / 60);
      walks.person.forEach((p, r) => {
        const dx = x[p] - lastX[r];
        const dy = y[p] - lastY[r];
        const onSpot = (x[p] - startX[r]) % PLACE_TILE_PX === 0 && (y[p] - startY[r]) % PLACE_TILE_PX === 0;
        if (!inside(layout, x[p], y[p]) || !fairStep(dx, dy, onSpot, facing[p])) bad.push(`frame ${frame}, person ${p}: ${dx}, ${dy}`);
      });
    }
    expect(walks.person.length).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});
