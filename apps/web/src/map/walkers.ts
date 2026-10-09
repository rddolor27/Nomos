import {
  PLACE_FACINGS,
  PLACE_POSES,
  PLACE_TILE_PX as TILE,
  type PlaceLayout,
  type PlacePeople,
  type PlaceWalks,
} from '@nomos/sim-protocol/place';

// A calm stroll: 20 art px a second, a tile in 0.8 s.
export const WALK_PX_PER_S = 20;
// Loops walk a little faster or slower by turns, so no two walkers keep step.
const PACE_SPREAD = [0, 2, -2, 1, -1];
// The walk frame changes every 8 art px, two steps a tile.
const STRIDE_PX = 8;
// x, y, pose, facing and step.
const KEPT = 5;
const WALK = PLACE_POSES.indexOf('walk');
const DOWN = PLACE_FACINGS.indexOf('down');
const UP = PLACE_FACINGS.indexOf('up');
const LEFT = PLACE_FACINGS.indexOf('left');
const RIGHT = PLACE_FACINGS.indexOf('right');

function facingOf(dx: number, dy: number): number {
  if (dx > 0) return RIGHT;
  if (dx < 0) return LEFT;
  return dy < 0 ? UP : DOWN;
}

// The place's look-only walkers. Each walks its loop tile by tile at its own pace, keeping the spot in the tile where
// place.py put it, so every lap starts and ends there. Its pose is walk while it moves, even for a stander that strolls,
// and its walk frame steps with the distance walked. Everything is made once a place, so walk() allocates nothing.
export class Walkers {
  private readonly people: PlacePeople;
  private readonly walks: PlaceWalks;
  private readonly width: number;
  // Each loop's walker's anchor within its tile, and its pace in art px a second.
  private readonly inTileX: Int32Array;
  private readonly inTileY: Int32Array;
  private readonly pace: Float64Array;
  // Where place.py put each loop's walker, KEPT values a loop, to stand it back there.
  private readonly start: Int32Array;

  constructor(layout: PlaceLayout, walks: PlaceWalks) {
    const loops = walks.person.length;
    const { x, y, pose, facing, step } = layout.people;
    this.people = layout.people;
    this.walks = walks;
    this.width = layout.width;
    this.inTileX = new Int32Array(loops);
    this.inTileY = new Int32Array(loops);
    this.pace = new Float64Array(loops);
    this.start = new Int32Array(KEPT * loops);
    for (let r = 0; r < loops; r++) {
      const p = walks.person[r];
      this.inTileX[r] = x[p] - TILE * Math.floor(x[p] / TILE);
      this.inTileY[r] = y[p] - TILE * Math.floor(y[p] / TILE);
      this.pace[r] = WALK_PX_PER_S + PACE_SPREAD[r % PACE_SPREAD.length];
      this.start.set([x[p], y[p], pose[p], facing[p], step[p]], KEPT * r);
    }
  }

  get count(): number {
    return this.walks.person.length;
  }

  // The person who walks loop r.
  person(r: number): number {
    return this.walks.person[r];
  }

  // Puts every walker where it is after walking ms milliseconds from its own spot.
  walk(ms: number): void {
    for (let r = 0; r < this.walks.person.length; r++) this.walkLoop(r, ms);
  }

  standStill(): void {
    const { x, y, pose, facing, step } = this.people;
    for (let r = 0; r < this.walks.person.length; r++) {
      const p = this.walks.person[r];
      const at = KEPT * r;
      x[p] = this.start[at];
      y[p] = this.start[at + 1];
      pose[p] = this.start[at + 2];
      facing[p] = this.start[at + 3];
      step[p] = this.start[at + 4];
    }
  }

  private walkLoop(r: number, ms: number): void {
    const { cells, offsets } = this.walks;
    const first = offsets[r];
    const length = offsets[r + 1] - first;
    const walked = (ms * this.pace[r]) / 1000;
    const along = walked % (length * TILE);
    const leg = Math.floor(along / TILE);
    const into = Math.floor(along - leg * TILE);
    const from = cells[first + leg];
    const to = cells[first + ((leg + 1) % length)];
    const fromX = from % this.width;
    const fromY = Math.floor(from / this.width);
    const dx = (to % this.width) - fromX;
    const dy = Math.floor(to / this.width) - fromY;
    const p = this.walks.person[r];
    this.people.x[p] = fromX * TILE + this.inTileX[r] + dx * into;
    this.people.y[p] = fromY * TILE + this.inTileY[r] + dy * into;
    this.people.pose[p] = WALK;
    this.people.facing[p] = facingOf(dx, dy);
    this.people.step[p] = Math.floor(walked / STRIDE_PX) % 2;
  }
}
