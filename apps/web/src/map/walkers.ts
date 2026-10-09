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

// A corner of a loop after two rounds of Chaikin corner cutting: each pair is the art px to go back along the leg in,
// then on along the leg out, from the tile's spot. A bend stays within 6 px of its spot, so it keeps to the loop's own
// tiles and never meets the next corner's, a tile (16 px) on. A U-turn runs out and back along its one leg.
const BEND = [
  [6, 0],
  [3, 1],
  [1, 3],
  [0, 6],
] as const;

// The way a walker moving dx, dy faces: along the dominant axis of its move, upright when they tie.
function facingOf(dx: number, dy: number): number {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RIGHT : LEFT;
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

// Where a crowd walker stands within a tile, as place.py stands people: the tile's middle across, 14 px down.
const CROWD_SPOT_X = 8;
const CROWD_SPOT_Y = 14;

// Every loop's smoothed path, in one set of columns: loop q's points run from spans[q] to spans[q + 1] - 1, the last of
// them its first again. Each has its art px x and y, and along, the art px walked to it from the loop's first point.
interface Paths {
  x: Int32Array;
  y: Int32Array;
  along: Float64Array;
  spans: Int32Array;
}

// The points of the loops cut so far, before they go into typed arrays.
interface Cut {
  xs: number[];
  ys: number[];
  spans: number[];
}

function addPoint(cut: Cut, x: number, y: number): void {
  cut.xs.push(x);
  cut.ys.push(y);
}

function columnPx(cell: number, width: number, spot: number): number {
  return (cell % width) * TILE + spot;
}

function rowPx(cell: number, width: number, spot: number): number {
  return Math.floor(cell / width) * TILE + spot;
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

// Cuts the corner of a loop at cell, reached from back and left for next. A straight run, whose steps cancel, has none.
function cutCorner(cut: Cut, cell: number, back: number, next: number, width: number, spotX: number, spotY: number): void {
  const toBack = back - cell;
  const toNext = next - cell;
  if (toBack + toNext === 0) return;
  const x = columnPx(cell, width, spotX);
  const y = rowPx(cell, width, spotY);
  const backX = across(toBack);
  const backY = down(toBack, width);
  const nextX = across(toNext);
  const nextY = down(toNext, width);
  for (const [a, b] of BEND) addPoint(cut, x + a * backX + b * nextX, y + a * backY + b * nextY);
}

// Appends a loop's path, each tile's spot at spotX, spotY. Every corner is cut but a home's, the loop's first cell, which
// stays a point so an owner's lap starts and ends where place.py put it.
function cutLoop(cut: Cut, loop: Int32Array, width: number, spotX: number, spotY: number, home: boolean): void {
  const n = loop.length;
  const first = cut.xs.length;
  if (home) addPoint(cut, columnPx(loop[0], width, spotX), rowPx(loop[0], width, spotY));
  for (let i = home ? 1 : 0; i < n; i++) {
    cutCorner(cut, loop[i], loop[(i + n - 1) % n], loop[(i + 1) % n], width, spotX, spotY);
  }
  addPoint(cut, cut.xs[first], cut.ys[first]);
  cut.spans.push(cut.xs.length);
}

function pathsOf(cut: Cut): Paths {
  const x = Int32Array.from(cut.xs);
  const y = Int32Array.from(cut.ys);
  const spans = Int32Array.from(cut.spans);
  const along = new Float64Array(x.length);
  for (let q = 0; q < spans.length - 1; q++) {
    for (let i = spans[q] + 1; i < spans[q + 1]; i++) {
      const dx = x[i] - x[i - 1];
      const dy = y[i] - y[i - 1];
      along[i] = along[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }
  }
  return { x, y, along, spans };
}

// The owners' loops, then the crowd's, each cut once.
function cutPaths(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd | null): Paths {
  const { x, y } = layout.people;
  const cut: Cut = { xs: [], ys: [], spans: [0] };
  walks.person.forEach((p, r) => {
    const loop = walks.cells.subarray(walks.offsets[r], walks.offsets[r + 1]);
    cutLoop(cut, loop, layout.width, x[p] % TILE, y[p] % TILE, true);
  });
  for (let r = 0; crowd && r < crowd.offsets.length - 1; r++) {
    const loop = crowd.cells.subarray(crowd.offsets[r], crowd.offsets[r + 1]);
    cutLoop(cut, loop, layout.width, CROWD_SPOT_X, CROWD_SPOT_Y, false);
  }
  return pathsOf(cut);
}

// The place's look-only walkers: each walk loop's owner, then any street crowd withCrowd appended, on the crowd's own
// loops from their phases. Each glides round its loop's path, which cuts the loop's corners, at its own pace, an owner
// starting and ending each lap where place.py put it. Its pose is walk while it moves, even for a stander that strolls,
// and it faces the dominant axis of its move, its walk frame stepping with the distance walked. Everything is made once
// a place, so walk() allocates nothing.
export class Walkers {
  private readonly people: PlacePeople;
  private readonly paths: Paths;
  // Each walker's person, its loop in paths, its phase in art px along the path and its pace in art px a second.
  private readonly persons: Uint16Array;
  private readonly loops: Int32Array;
  private readonly phases: Float64Array;
  private readonly pace: Float64Array;
  // Where each walker starts, KEPT values a walker, to stand it back there.
  private readonly start: Int32Array;

  // crowd and n as withCrowd took them, whose walkers are the layout's last n people.
  constructor(layout: PlaceLayout, walks: PlaceWalks, crowd: PlaceCrowd | null = null, n = 0) {
    const owners = walks.person.length;
    const count = owners + n;
    const first = layout.people.look.length - n;
    this.people = layout.people;
    this.paths = cutPaths(layout, walks, crowd);
    this.persons = new Uint16Array(count);
    this.loops = new Int32Array(count);
    this.phases = new Float64Array(count);
    this.pace = new Float64Array(count);
    this.start = new Int32Array(KEPT * count);
    for (let r = 0; r < owners; r++) this.setOwner(r, walks);
    for (let k = 0; k < n && crowd; k++) this.setCrowd(owners + k, first + k, crowd, k, owners);
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

  // An owner walks its own loop from its first point, where place.py put it.
  private setOwner(r: number, walks: PlaceWalks): void {
    this.persons[r] = walks.person[r];
    this.loops[r] = r;
    this.pace[r] = WALK_PX_PER_S + PACE_SPREAD[r % PACE_SPREAD.length];
  }

  // A crowd walker starts at its phase along its loop, whose path follows the owners' in paths. The phase is in px along
  // the loop tile by tile, which the cut corners shorten, so it scales to the same share of the path.
  private setCrowd(w: number, p: number, crowd: PlaceCrowd, k: number, owners: number): void {
    const loop = crowd.loop[k];
    const px = (crowd.offsets[loop + 1] - crowd.offsets[loop]) * TILE;
    this.persons[w] = p;
    this.loops[w] = owners + loop;
    this.phases[w] = (crowd.phase[k] * this.lap(owners + loop)) / px;
    this.pace[w] = WALK_PX_PER_S + PACE_SPREAD[w % PACE_SPREAD.length];
    this.walkLoop(w, 0);
  }

  private keep(w: number): void {
    const p = this.persons[w];
    const { x, y, pose, facing, step } = this.people;
    this.start.set([x[p], y[p], pose[p], facing[p], step[p]], KEPT * w);
  }

  // The art px round loop q's path.
  private lap(q: number): number {
    return this.paths.along[this.paths.spans[q + 1] - 1];
  }

  private walkLoop(w: number, ms: number): void {
    const { x, y, along, spans } = this.paths;
    const q = this.loops[w];
    const last = spans[q + 1] - 1;
    const walked = this.phases[w] + (ms * this.pace[w]) / 1000;
    const at = walked % along[last];
    // The edge of the path that holds at: along[lo] <= at < along[hi].
    let lo = spans[q];
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (along[mid] <= at) lo = mid;
      else hi = mid;
    }
    const dx = x[hi] - x[lo];
    const dy = y[hi] - y[lo];
    const into = at - along[lo];
    const edge = along[hi] - along[lo];
    const p = this.persons[w];
    this.people.x[p] = x[lo] + Math.trunc((dx * into) / edge);
    this.people.y[p] = y[lo] + Math.trunc((dy * into) / edge);
    this.people.pose[p] = WALK;
    this.people.facing[p] = facingOf(dx, dy);
    this.people.step[p] = Math.floor(walked / STRIDE_PX) % 2;
  }
}
