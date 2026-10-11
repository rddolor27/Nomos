import { MAX_FIELD_CELLS, cellStepOf } from './fields.ts';
import { MAX_RUNS, NO_PATH, RUN_BYTES, TOO_FAR, pathRuns } from './runs.ts';

// A leg is the way from any cell to any other, written as the runs pathRuns writes (M3.2 Ruling 5). Only the sites have flow fields,
// so a leg runs through a hub, one of the sites: forward on its field from the first cell, then backward along the second cell's own
// way to it. A leg to a site, or from one, is the degenerate leg that takes the site itself as the hub.
//
// The walk does not go all the way to the hub and back out: the two ways follow the same field, so they meet at the first cell of
// the first that the second also passes, and the leg switches there. A cell on both ways is as far from the hub for each, so the first
// one along the first way is the one with the fewest steps in all.
export const NO_HUB = -1;
const HEADING_SHIFT = 5;
const HALF_TURN = 128;
const HEADING_MASK = 255;
const MAX_RUN_LENGTH = 255;
// A meeting is the steps along the first way and the steps along the second in one number: neither passes the 8,160 steps of 32
// runs of 255 cells.
const STEPS_SHIFT = 16;
const STEPS_MASK = 0xffff;

// One leg at a time, and every byte written before it is read, so these hold no state between legs. The stamps are 0 outside a
// leg: the second way's cells take their step number + 1 while the first is searched, and are cleared again.
const wayFrom = new Uint8Array(RUN_BYTES);
const wayTo = new Uint8Array(RUN_BYTES);
const stamp = new Uint16Array(MAX_FIELD_CELLS);

function turned(heading: number): number {
  return (heading + HALF_TURN) & HEADING_MASK;
}

// The site with the least Manhattan sum from `from` to it and on to `to`, the lowest at a tie, among those not in the bit set
// `excluded`. A site that is an end of the leg wins a tie, since the leg then needs no detour at all, or NO_HUB if none is left.
export function nearestHub(
  siteX: Int32Array,
  siteY: Int32Array,
  sites: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  excluded: number,
): number {
  let best = NO_HUB;
  let bestScore = 0x7fffffff;
  for (let s = 0; s < sites; s++) {
    if (((excluded >> s) & 1) === 1) continue;
    const x = siteX[s];
    const y = siteY[s];
    const sum = Math.abs(fromX - x) + Math.abs(fromY - y) + Math.abs(toX - x) + Math.abs(toY - y);
    const onEnd = (x === fromX && y === fromY) || (x === toX && y === toY);
    const score = 2 * sum + (onEnd ? 0 : 1);
    if (score < bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

// Adds a run to the list in out at `at` that holds `count`, joined to the last when they go the same way, and returns the new
// count, or TOO_FAR when there is no room for it.
function appendRun(out: Uint8Array, at: number, count: number, heading: number, length: number): number {
  if (length === 0) return count;
  const last = at + 2 * (count - 1);
  if (count > 0 && out[last] === heading && out[last + 1] + length <= MAX_RUN_LENGTH) {
    out[last + 1] += length;
    return count;
  }
  if (count === MAX_RUNS) return TOO_FAR;
  out[at + 2 * count] = heading;
  out[at + 2 * count + 1] = length;
  return count + 1;
}

// The first `steps` cells of a way, walked forward from its start.
function appendForward(out: Uint8Array, at: number, count: number, way: Uint8Array, steps: number): number {
  let left = steps;
  let next = count;
  for (let r = 0; left > 0 && next >= 0; r++) {
    const length = Math.min(way[2 * r + 1], left);
    next = appendRun(out, at, next, way[2 * r], length);
    left -= length;
  }
  return next;
}

// The first `steps` cells of a way, walked backward from where they end to where the way starts.
function appendBackward(out: Uint8Array, at: number, count: number, way: Uint8Array, steps: number): number {
  let touched = 0;
  let covered = 0;
  while (covered < steps) covered += way[2 * touched++ + 1];
  let next = count;
  for (let r = touched - 1; r >= 0 && next >= 0; r--) {
    const length = r === touched - 1 ? way[2 * r + 1] - (covered - steps) : way[2 * r + 1];
    next = appendRun(out, at, next, turned(way[2 * r]), length);
  }
  return next;
}

// Stamps the cells of wayTo from `start`, the start with 1 and each cell on with one more, or clears them.
function markWay(width: number, start: number, runs: number, mark: boolean): void {
  let cell = start;
  let steps = 1;
  stamp[cell] = mark ? steps : 0;
  for (let r = 0; r < runs; r++) {
    const step = cellStepOf(wayTo[2 * r] >> HEADING_SHIFT, width);
    for (let n = wayTo[2 * r + 1]; n > 0; n--) {
      cell += step;
      stamp[cell] = mark ? ++steps : 0;
    }
  }
}

// The first cell along wayFrom from `from` that the stamps mark, as the steps to it along wayFrom and along wayTo, or -1 if
// none is. Both ways end at the hub, so one always is.
function firstMeeting(width: number, from: number, runs: number): number {
  let cell = from;
  if (stamp[cell] !== 0) return stamp[cell] - 1;
  let steps = 0;
  for (let r = 0; r < runs; r++) {
    const step = cellStepOf(wayFrom[2 * r] >> HEADING_SHIFT, width);
    for (let n = wayFrom[2 * r + 1]; n > 0; n--) {
      cell += step;
      steps++;
      if (stamp[cell] !== 0) return (steps << STEPS_SHIFT) | (stamp[cell] - 1);
    }
  }
  return -1;
}

// The first way to the hub as far as it meets the second, then the second backward from there to its own start.
function joinAtMeeting(width: number, from: number, to: number, fromRuns: number, toRuns: number, out: Uint8Array, at: number): number {
  markWay(width, to, toRuns, true);
  const meeting = firstMeeting(width, from, fromRuns);
  markWay(width, to, toRuns, false);
  if (meeting < 0) return NO_PATH;
  const count = appendForward(out, at, 0, wayFrom, meeting >> STEPS_SHIFT);
  return count < 0 ? count : appendBackward(out, at, count, wayTo, meeting & STEPS_MASK);
}

// The whole first way to the hub, then the whole second backward from it: the leg passes the hub's door.
function joinThrough(fromRuns: number, toRuns: number, out: Uint8Array, at: number): number {
  let count = 0;
  for (let r = 0; r < fromRuns && count >= 0; r++) count = appendRun(out, at, count, wayFrom[2 * r], wayFrom[2 * r + 1]);
  for (let r = toRuns - 1; r >= 0 && count >= 0; r--) count = appendRun(out, at, count, turned(wayTo[2 * r]), wayTo[2 * r + 1]);
  return count;
}

// The leg through the hub whose field starts at `first`, or why it cannot be had: NO_PATH when either cell is cut off from the
// hub, TOO_FAR when a way, or the two of them joined, takes more than MAX_RUNS runs.
function legThrough(
  fields: Uint8Array,
  first: number,
  width: number,
  from: number,
  to: number,
  through: boolean,
  out: Uint8Array,
  at: number,
): number {
  const fromRuns = pathRuns(fields, first, width, from, wayFrom, 0);
  if (fromRuns < 0) return fromRuns;
  const toRuns = pathRuns(fields, first, width, to, wayTo, 0);
  if (toRuns < 0) return toRuns;
  return through ? joinThrough(fromRuns, toRuns, out, at) : joinAtMeeting(width, from, to, fromRuns, toRuns, out, at);
}

// Writes into out at `at` the runs of a leg from the cell `from` to the cell `to`, and returns how many, 0 when they are the
// same cell. Walked forward they lead from `from` to `to`, and backward from `to` to `from`. out holds 0s unless it is a count.
//
// `via` is a site the leg must pass the door of, such as the premises of a purchase not yet fetched, or NO_HUB to take the site that
// leaves the least detour. A hub that cannot serve, because a cell is cut off from it or the leg would need over MAX_RUNS runs, is
// left and the next best tried, so the answer is NO_PATH only if every site cut a cell off, and TOO_FAR if some site was reached
// but its leg was too winding. A forced hub is tried alone.
export function planLeg(
  fields: Uint8Array,
  width: number,
  height: number,
  siteX: Int32Array,
  siteY: Int32Array,
  sites: number,
  from: number,
  to: number,
  via: number,
  out: Uint8Array,
  at: number,
): number {
  out.fill(0, at, at + RUN_BYTES);
  if (from === to) return 0;
  const fromX = from % width;
  const toX = to % width;
  const forced = via !== NO_HUB;
  let excluded = 0;
  let failure = NO_PATH;
  for (let tries = forced ? 1 : sites; tries > 0; tries--) {
    const hub = forced ? via : nearestHub(siteX, siteY, sites, fromX, (from - fromX) / width, toX, (to - toX) / width, excluded);
    if (hub === NO_HUB) break;
    const count = legThrough(fields, hub * width * height, width, from, to, forced, out, at);
    if (count >= 0) return count;
    if (count === TOO_FAR) failure = TOO_FAR;
    out.fill(0, at, at + RUN_BYTES);
    excluded |= 1 << hub;
  }
  return failure;
}
