import {
  NO_CODE,
  PLACE_FACINGS,
  PLACE_POSES,
  PLACE_TILE_PX as TILE,
  type PlaceCrowd,
  type PlaceLayout,
  type PlacePeople,
  type PlaceWalks,
} from '@nomos/sim-protocol/place';

// A calm stroll: 20 art px a second, a tile in 0.8 s.
export const WALK_PX_PER_S = 20;
// Walkers walk a little faster or slower by turns, so no two keep step.
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

function grown<T extends Uint8Array | Int32Array>(column: T, total: number): T {
  const out = new (column.constructor as new (length: number) => T)(total);
  out.set(column);
  return out;
}

// The layout with the street crowd's first n walkers appended to its people, where Walkers then stands them. Made once
// a place, never a frame.
export function withCrowd(layout: PlaceLayout, crowd: PlaceCrowd, n: number): PlaceLayout {
  const p = layout.people;
  const first = p.look.length;
  const total = first + n;
  const people: PlacePeople = {
    look: grown(p.look, total),
    pose: grown(p.pose, total).fill(WALK, first),
    facing: grown(p.facing, total),
    step: grown(p.step, total),
    expression: grown(p.expression, total),
    job: grown(p.job, total).fill(NO_CODE, first),
    emote: grown(p.emote, total).fill(NO_CODE, first),
    x: grown(p.x, total),
    y: grown(p.y, total),
    lift: grown(p.lift, total),
  };
  people.look.set(crowd.look.subarray(0, n), first);
  people.expression.set(crowd.expression.subarray(0, n), first);
  return { ...layout, people };
}

// The place's look-only walkers: each loop's owner, then any street crowd withCrowd appended, who share the loops from
// their phases. Each walks its loop tile by tile at its own pace, keeping its loop owner's spot in the tile, so every lap
// of an owner starts and ends where place.py put it. Its pose is walk while it moves, even for a stander that strolls,
// and its walk frame steps with the distance walked. Everything is made once a place, so walk() allocates nothing.
export class Walkers {
  private readonly people: PlacePeople;
  private readonly walks: PlaceWalks;
  private readonly width: number;
  // Each walker's person, loop and phase in art px along it.
  private readonly persons: Uint16Array;
  private readonly loops: Uint16Array;
  private readonly phases: Uint16Array;
  // Each loop's spot within its tile, from where its owner stands, and each walker's pace in art px a second.
  private readonly inTileX: Int32Array;
  private readonly inTileY: Int32Array;
  private readonly pace: Float64Array;
  // Where each walker starts, KEPT values a walker, to stand it back there.
  private readonly start: Int32Array;

  // crowd and n as withCrowd took them, whose walkers are the layout's last n people.
  constructor(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd | null = null, n = 0) {
    const owners = walks.person.length;
    const count = owners + n;
    const first = layout.people.look.length - n;
    this.people = layout.people;
    this.walks = walks;
    this.width = layout.width;
    this.persons = new Uint16Array(count);
    this.loops = new Uint16Array(count);
    this.phases = new Uint16Array(count);
    this.inTileX = new Int32Array(owners);
    this.inTileY = new Int32Array(owners);
    this.pace = new Float64Array(count);
    this.start = new Int32Array(KEPT * count);
    for (let r = 0; r < owners; r++) this.setOwner(r);
    for (let k = 0; k < n && crowd; k++) this.setCrowd(owners + k, first + k, crowd.loop[k], crowd.phase[k]);
    for (let w = 0; w < count; w++) this.keep(w);
  }

  get count(): number {
    return this.persons.length;
  }

  // The person walker w moves.
  person(w: number): number {
    return this.persons[w];
  }

  // Puts every walker where it is after walking ms milliseconds from its start.
  walk(ms: number): void {
    for (let w = 0; w < this.persons.length; w++) this.walkLoop(w, ms);
  }

  standStill(): void {
    const { x, y, pose, facing, step } = this.people;
    for (let w = 0; w < this.persons.length; w++) {
      const p = this.persons[w];
      const at = KEPT * w;
      x[p] = this.start[at];
      y[p] = this.start[at + 1];
      pose[p] = this.start[at + 2];
      facing[p] = this.start[at + 3];
      step[p] = this.start[at + 4];
    }
  }

  private setOwner(r: number): void {
    const p = this.walks.person[r];
    const { x, y } = this.people;
    this.persons[r] = p;
    this.loops[r] = r;
    this.inTileX[r] = x[p] - TILE * Math.floor(x[p] / TILE);
    this.inTileY[r] = y[p] - TILE * Math.floor(y[p] / TILE);
    this.pace[r] = WALK_PX_PER_S + PACE_SPREAD[r % PACE_SPREAD.length];
  }

  // A crowd walker starts at its phase along its loop.
  private setCrowd(w: number, p: number, loop: number, phase: number): void {
    this.persons[w] = p;
    this.loops[w] = loop;
    this.phases[w] = phase;
    this.pace[w] = WALK_PX_PER_S + PACE_SPREAD[w % PACE_SPREAD.length];
    this.walkLoop(w, 0);
  }

  private keep(w: number): void {
    const p = this.persons[w];
    const { x, y, pose, facing, step } = this.people;
    this.start.set([x[p], y[p], pose[p], facing[p], step[p]], KEPT * w);
  }

  private walkLoop(w: number, ms: number): void {
    const { cells, offsets } = this.walks;
    const r = this.loops[w];
    const first = offsets[r];
    const length = offsets[r + 1] - first;
    const walked = this.phases[w] + (ms * this.pace[w]) / 1000;
    const along = walked % (length * TILE);
    const leg = Math.floor(along / TILE);
    const into = Math.floor(along - leg * TILE);
    const from = cells[first + leg];
    const to = cells[first + ((leg + 1) % length)];
    const fromX = from % this.width;
    const fromY = Math.floor(from / this.width);
    const dx = (to % this.width) - fromX;
    const dy = Math.floor(to / this.width) - fromY;
    const p = this.persons[w];
    this.people.x[p] = fromX * TILE + this.inTileX[r] + dx * into;
    this.people.y[p] = fromY * TILE + this.inTileY[r] + dy * into;
    this.people.pose[p] = WALK;
    this.people.facing[p] = facingOf(dx, dy);
    this.people.step[p] = Math.floor(walked / STRIDE_PX) % 2;
  }
}
