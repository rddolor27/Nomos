import {
  REDRAW_TICKS,
  STAND,
  WALK_X_Q8,
  WALK_Y_Q8,
  WANDER,
  draw2,
  firstRedraw,
  offWall,
  wanderTo,
} from '@nomos/sim-protocol';
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
const Q8 = 256;
// A walker takes the sim's step once a tick, the 4 px heading 0 walks straight down, so a tick at the stroll's pace
// lasts 200 ms.
export const WALK_TICK_MS = (1000 * WALK_Y_Q8[0]) / (Q8 * WALK_PX_PER_S);
// Look-only walkers need no world's seed: a fixed one walks a place the same way on every entry.
export const WALK_SEED = 0;
const TILE_Q8 = TILE * Q8;
// The walk frame changes every 8 art px.
const STRIDE_PX = 8;
// x, y, pose, facing and step.
const KEPT = 5;
// A walker's tiles: the least x and y, then the most.
const BOX = 4;
const STANDING = PLACE_POSES.indexOf('stand');
const WALK = PLACE_POSES.indexOf('walk');
const DOWN = PLACE_FACINGS.indexOf('down');
const UP = PLACE_FACINGS.indexOf('up');
const LEFT = PLACE_FACINGS.indexOf('left');
const RIGHT = PLACE_FACINGS.indexOf('right');
// Where a crowd walker stands within a tile, as place.py stands people: the tile's middle across, 14 px down.
const CROWD_SPOT_X = 8;
const CROWD_SPOT_Y = 14;

// The way a walker moving dx, dy faces: along the dominant axis of its move, upright when they tie.
function facingOf(dx: number, dy: number): number {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RIGHT : LEFT;
  return dy < 0 ? UP : DOWN;
}

// The sim's heading for a step of dx, dy tiles: headings run clockwise from down, a quarter turn of 64 apart.
function headingOf(dx: number, dy: number): number {
  if (dx > 0) return 192;
  if (dx < 0) return 64;
  return dy < 0 ? 128 : 0;
}

// The walk frame steps every STRIDE_PX art px along the way the walker faces, as the first screen's blobs step.
function strideOf(facing: number, x: number, y: number): number {
  const along = facing === LEFT || facing === RIGHT ? x : y;
  return Math.floor(along / STRIDE_PX) % 2;
}

function tileOf(q8: number): number {
  return Math.floor(q8 / TILE_Q8);
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

// A loop moves between neighbouring cells, so a step of delta cells is one column across (1 or -1) or one row down
// (width or -width), and any other delta moves neither.
function across(delta: number): number {
  if (delta === 1) return 1;
  return delta === -1 ? -1 : 0;
}

function down(delta: number, width: number): number {
  if (delta === width) return 1;
  return delta === -width ? -1 : 0;
}

// The place's street network: every tile of every loop, the owners' and the whole crowd's.
function streetsOf(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd | null): Uint8Array {
  const streets = new Uint8Array(layout.width * layout.height);
  for (const cell of walks.cells) streets[cell] = 1;
  for (const cell of crowd?.cells ?? []) streets[cell] = 1;
  return streets;
}

// The place's look-only walkers: each walk loop's owner, then any street crowd withCrowd appended. They wander the
// place's street network by the sim's own rule, tick by tick, as its blobs do: an owner within its loop's box, near
// home, and the crowd all over. A frame draws each walker eased between its last two ticks, as the first screen draws
// its blobs: in the walk pose while it walks and the stand pose while it stands, facing the dominant axis of its move.
// Everything is made once a place, so walk() allocates nothing.
export class Walkers {
  private readonly people: PlacePeople;
  private readonly width: number;
  private readonly streets: Uint8Array;
  private readonly persons: Uint16Array;
  // Each walker's tiles, BOX values a walker.
  private readonly boxes: Int32Array;
  // Where each walker starts, KEPT values a walker, and its heading there.
  private readonly start: Int32Array;
  private readonly startHeading: Uint8Array;
  // Each walker's point in Q8 art px after the last tick and the one before it, its heading, and 1 while it walks.
  private readonly xQ8: Int32Array;
  private readonly yQ8: Int32Array;
  private readonly lastXQ8: Int32Array;
  private readonly lastYQ8: Int32Array;
  private readonly heading: Uint8Array;
  private readonly walking: Uint8Array;
  private ticks: number;

  // crowd and n as withCrowd took them, whose walkers are the layout's last n people.
  constructor(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd | null = null, n = 0) {
    const owners = walks.person.length;
    const count = owners + n;
    const first = layout.people.look.length - n;
    this.people = layout.people;
    this.width = layout.width;
    this.streets = streetsOf(layout, walks, crowd);
    this.persons = new Uint16Array(count);
    this.boxes = new Int32Array(BOX * count);
    this.start = new Int32Array(KEPT * count);
    this.startHeading = new Uint8Array(count);
    this.xQ8 = new Int32Array(count);
    this.yQ8 = new Int32Array(count);
    this.lastXQ8 = new Int32Array(count);
    this.lastYQ8 = new Int32Array(count);
    this.heading = new Uint8Array(count);
    this.walking = new Uint8Array(count);
    this.ticks = 0;
    for (let r = 0; r < owners; r++) this.setOwner(r, walks);
    for (let k = 0; k < n && crowd; k++) this.setCrowd(owners + k, first + k, crowd, k, layout.height);
    for (let w = 0; w < count; w++) this.keep(w);
    this.restart();
  }

  get count(): number {
    return this.persons.length;
  }

  // The person walker w moves.
  person(w: number): number {
    return this.persons[w];
  }

  // Puts every walker where it is ms milliseconds after its start, a tick ahead so it eases towards where it goes next.
  // ms only grows, but after standStill, which starts every walk again from 0.
  walk(ms: number): void {
    const due = Math.floor(ms / WALK_TICK_MS) + 1;
    while (this.ticks < due) this.tick();
    for (let w = 0; w < this.persons.length; w++) this.show(w, ms);
  }

  // Stands every walker back where place.py put it, to walk again from there.
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
    this.restart();
  }

  // An owner walks from where place.py put it, along its loop's first step, within its loop's box.
  private setOwner(r: number, walks: PlaceWalks): void {
    const from = walks.offsets[r];
    const to = walks.offsets[r + 1];
    const home = walks.cells[from];
    const delta = walks.cells[from + (1 % (to - from))] - home;
    this.persons[r] = walks.person[r];
    this.startHeading[r] = headingOf(across(delta), down(delta, this.width));
    const at = BOX * r;
    const homeX = home % this.width;
    const homeY = Math.floor(home / this.width);
    this.boxes.set([homeX, homeY, homeX, homeY], at);
    for (let i = from + 1; i < to; i++) this.widenBox(at, walks.cells[i]);
  }

  private widenBox(at: number, cell: number): void {
    const tx = cell % this.width;
    const ty = Math.floor(cell / this.width);
    const box = this.boxes;
    box[at] = Math.min(box[at], tx);
    box[at + 1] = Math.min(box[at + 1], ty);
    box[at + 2] = Math.max(box[at + 2], tx);
    box[at + 3] = Math.max(box[at + 3], ty);
  }

  // A crowd walker starts its phase along its loop, in art px tile by tile from its first tile's spot, heading on along
  // the loop, and may walk the whole place.
  private setCrowd(w: number, p: number, crowd: PlaceCrowd, k: number, height: number): void {
    const loop = crowd.loop[k];
    const from = crowd.offsets[loop];
    const length = crowd.offsets[loop + 1] - from;
    const i = Math.floor(crowd.phase[k] / TILE) % length;
    const cell = crowd.cells[from + i];
    const delta = crowd.cells[from + ((i + 1) % length)] - cell;
    const dx = across(delta);
    const dy = down(delta, this.width);
    const into = crowd.phase[k] % TILE;
    this.people.x[p] = (cell % this.width) * TILE + CROWD_SPOT_X + dx * into;
    this.people.y[p] = Math.floor(cell / this.width) * TILE + CROWD_SPOT_Y + dy * into;
    this.people.facing[p] = facingOf(dx, dy);
    this.persons[w] = p;
    this.startHeading[w] = headingOf(dx, dy);
    this.boxes.set([0, 0, this.width - 1, height - 1], BOX * w);
  }

  private keep(w: number): void {
    const p = this.persons[w];
    const { x, y, pose, facing, step } = this.people;
    this.start.set([x[p], y[p], pose[p], facing[p], step[p]], KEPT * w);
  }

  // Every walker at its start, walking on its first heading, before its first tick.
  private restart(): void {
    for (let w = 0; w < this.persons.length; w++) {
      this.xQ8[w] = this.start[KEPT * w] * Q8;
      this.yQ8[w] = this.start[KEPT * w + 1] * Q8;
    }
    this.lastXQ8.set(this.xQ8);
    this.lastYQ8.set(this.yQ8);
    this.heading.set(this.startHeading);
    this.walking.fill(1);
    this.ticks = 0;
  }

  // The sim's move: the walkers due redraw by the wander rule, then every walker takes a step. Both loops stay inline,
  // as in move, so the keyed draw inlines whole and never boxes its word.
  private tick(): void {
    const count = this.persons.length;
    const { heading, walking, ticks, xQ8, yQ8 } = this;
    for (let w = firstRedraw(ticks); w < count; w += REDRAW_TICKS) {
      const next = wanderTo(heading[w], walking[w] === 1, draw2(WALK_SEED, WANDER, w, ticks));
      walking[w] = next === STAND ? 0 : 1;
      if (next !== STAND) heading[w] = next;
    }
    this.lastXQ8.set(xQ8);
    this.lastYQ8.set(yQ8);
    for (let w = 0; w < count; w++) {
      if (walking[w] === 0) continue;
      const nextX = xQ8[w] + WALK_X_Q8[heading[w]];
      const nextY = yQ8[w] + WALK_Y_Q8[heading[w]];
      if (this.open(w, nextX, nextY)) {
        xQ8[w] = nextX;
        yQ8[w] = nextY;
      } else {
        this.meetWall(w, nextX, nextY);
      }
    }
    this.ticks++;
  }

  // A step onto a closed tile slides within the walker's own tile along the wall it met, or stays put at a corner, and
  // turns off the wall, as the sim's blobs do.
  private meetWall(w: number, nextX: number, nextY: number): void {
    const wallAlongX = tileOf(nextX) === tileOf(this.xQ8[w]);
    if (wallAlongX) this.xQ8[w] = nextX;
    else if (tileOf(nextY) === tileOf(this.yQ8[w])) this.yQ8[w] = nextY;
    this.heading[w] = offWall(this.heading[w], wallAlongX);
  }

  // A tile of the street network within the walker's box.
  private open(w: number, xQ8: number, yQ8: number): boolean {
    const tx = tileOf(xQ8);
    const ty = tileOf(yQ8);
    const at = BOX * w;
    const box = this.boxes;
    const inBox = tx >= box[at] && ty >= box[at + 1] && tx <= box[at + 2] && ty <= box[at + 3];
    return inBox && this.streets[ty * this.width + tx] === 1;
  }

  // Takes the frame's whole ms, not its fraction of a tick, which would box into a heap number on any call left uninlined.
  private show(w: number, ms: number): void {
    const eased = ms / WALK_TICK_MS - (this.ticks - 1);
    const lastX = this.lastXQ8[w];
    const lastY = this.lastYQ8[w];
    const dx = this.xQ8[w] - lastX;
    const dy = this.yQ8[w] - lastY;
    const x = Math.floor((lastX + dx * eased) / Q8);
    const y = Math.floor((lastY + dy * eased) / Q8);
    const p = this.persons[w];
    const people = this.people;
    people.x[p] = x;
    people.y[p] = y;
    if (dx !== 0 || dy !== 0) people.facing[p] = facingOf(dx, dy);
    const walking = this.walking[w] === 1;
    people.pose[p] = walking ? WALK : STANDING;
    people.step[p] = walking ? strideOf(people.facing[p], x, y) : 0;
  }
}
