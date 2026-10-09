import { below, floorDiv, isqrt } from '@nomos/sim-core/kernels';
import { CROWD_HUES, CROWD_Q, CROWD_STOPS, type MapCrowd, type WorldMap } from '@nomos/sim-protocol/world-map';
import { dist2, xOf, yOf } from '../grid/grid.ts';
import { CROWD } from '../random/streams.ts';

// The map's look-only crowd (owner, 9 October 2026). map.country is 0 on water, so matching a settlement's country
// keeps its dots ashore and at home.
const PEOPLE_PER_DOT = 100;
// A yard holds about this many dots a cell, so a capital's spreads some nine cells and a hamlet's keeps to its own.
const DOTS_PER_CELL = 24;
// Legs take 2.5 to 6 s, so neighbours fall out of step.
const LEG_MS = 2500;
const LEG_SPAN_MS = 3501;
// Stops keep to the middle three quarters of a cell, never its edge.
const EDGE = 32;
const INNER = 192;

// First keys of the crowd's CROWD draws on the world seed, clear of place.py's 1-6, as variant keys SHAPE on 0x200.
const HOME = 0x100;
const NEAR = 0x101;
const STOP = 0x102;
const OFFSET = 0x103;
const HUE = 0x104;
const LEG = 0x105;
const START = 0x106;

function dotsOf(population: number): number {
  return Math.max(1, floorDiv(population, PEOPLE_PER_DOT));
}

// A disc of dots / DOTS_PER_CELL cells has a radius of the root of dots / (DOTS_PER_CELL * pi); 3 stands in for pi.
function reachOf(dots: number): number {
  return 1 + isqrt(floorDiv(dots, DOTS_PER_CELL * 3));
}

// The settlement's own land within reach, nearest first, ties to the lower cell.
function yardOf(map: WorldMap, settlement: number, reach: number): number[] {
  const { width, height } = map;
  const home = map.settlements.cell[settlement];
  const country = map.settlements.country[settlement];
  const hx = xOf(home, width);
  const hy = yOf(home, width);
  const yard: number[] = [];
  for (let y = Math.max(0, hy - reach); y <= Math.min(height - 1, hy + reach); y++) {
    for (let x = Math.max(0, hx - reach); x <= Math.min(width - 1, hx + reach); x++) {
      if (map.country[y * width + x] === country && dist2(x, y, hx, hy) <= reach * reach) yard.push(y * width + x);
    }
  }
  const away = (cell: number): number => dist2(xOf(cell, width), yOf(cell, width), hx, hy);
  return yard.sort((a, b) => away(a) - away(b) || a - b);
}

// The country's cells in the 3 x 3 block around a cell, the cell included: where a dot's later stops fall.
function blockOf(map: WorldMap, cell: number, country: number, out: Int32Array): number {
  const { width, height } = map;
  const cx = xOf(cell, width);
  const cy = yOf(cell, width);
  let count = 0;
  for (let y = Math.max(0, cy - 1); y <= Math.min(height - 1, cy + 1); y++) {
    for (let x = Math.max(0, cx - 1); x <= Math.min(width - 1, cx + 1); x++) {
      if (map.country[y * width + x] === country) out[count++] = y * width + x;
    }
  }
  return count;
}

// Dot k of a settlement: a home in its yard, the nearer of two draws, then three more stops beside it.
function placeDot(
  map: WorldMap,
  crowd: MapCrowd,
  dot: number,
  settlement: number,
  yard: readonly number[],
  k: number,
  block: Int32Array,
): void {
  const { seed, width } = map;
  const uid = map.settlements.cell[settlement];
  const first = below(yard.length, seed, CROWD, HOME, uid, k);
  const home = yard[Math.min(first, below(yard.length, seed, CROWD, NEAR, uid, k))];
  const near = blockOf(map, home, map.settlements.country[settlement], block);
  for (let stop = 0; stop < CROWD_STOPS; stop++) {
    const cell = stop === 0 ? home : block[below(near, seed, CROWD, STOP, uid, k, stop)];
    const at = 2 * (dot * CROWD_STOPS + stop);
    crowd.stops[at] = xOf(cell, width) * CROWD_Q + EDGE + below(INNER, seed, CROWD, OFFSET, uid, k, 2 * stop);
    crowd.stops[at + 1] = yOf(cell, width) * CROWD_Q + EDGE + below(INNER, seed, CROWD, OFFSET, uid, k, 2 * stop + 1);
  }
  crowd.hue[dot] = below(CROWD_HUES.length, seed, CROWD, HUE, uid, k);
  crowd.legMs[dot] = LEG_MS + below(LEG_SPAN_MS, seed, CROWD, LEG, uid, k);
  crowd.startMs[dot] = below(CROWD_STOPS * crowd.legMs[dot], seed, CROWD, START, uid, k);
}

// Settlement by settlement in id order, so each settlement's dots sit together.
export function crowdOf(map: WorldMap): MapCrowd {
  const { population } = map.settlements;
  let total = 0;
  for (let s = 0; s < population.length; s++) total += dotsOf(population[s]);
  const crowd: MapCrowd = {
    hue: new Uint8Array(total),
    stops: new Uint16Array(total * CROWD_STOPS * 2),
    legMs: new Uint16Array(total),
    startMs: new Uint16Array(total),
  };
  const block = new Int32Array(9);
  let dot = 0;
  for (let s = 0; s < population.length; s++) {
    const dots = dotsOf(population[s]);
    const yard = yardOf(map, s, reachOf(dots));
    for (let k = 0; k < dots; k++) placeDot(map, crowd, dot++, s, yard, k, block);
  }
  return crowd;
}
