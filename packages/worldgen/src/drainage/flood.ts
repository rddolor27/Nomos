import { draw2, floorDiv, isqrt } from '@nomos/sim-core/kernels';
import { neighbours, xOf, yOf } from '../grid/grid.ts';
import { MinHeap } from '../grid/heap.ts';
import { ELEVATION } from '../random/streams.ts';

export const LAKE_DEPTH = 24;
export const MAX_LAKE = 80;
export const RAIN_UNIT = 128;
export const RIVER_CELLS = 36;
export const EROSION_PASSES = 2;
// Shares the ELEVATION stream with terrain, whose keys are the fbm octaves and 0x100-0x109.
export const FLAT = 0x107;

export interface Flood {
  filled: Int32Array;
  receiver: Int32Array;
  order: Int32Array;
}

function onBorder(cell: number, width: number, height: number): boolean {
  const x = xOf(cell, width);
  const y = yOf(cell, width);
  return x === 0 || x === width - 1 || y === 0 || y === height - 1;
}

// Priority-flood from the sinks (ocean, terminal lakes) and the map edges. Equal heights leave in a keyed order, so water
// wanders across a flat to its outlet instead of running in straight rays. Every cell is pushed once, so order ends full.
export function flood(seed: number, width: number, height: number, elevation: Int32Array, sinks: Uint8Array): Flood {
  const nbrs = neighbours(width, height);
  const n = elevation.length;
  const filled = elevation.slice();
  const receiver = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const order = new Int32Array(n);
  const heap = new MinHeap(n);
  for (let i = 0; i < n; i++) {
    if (sinks[i] !== 0 || onBorder(i, width, height)) {
      heap.push(elevation[i], draw2(seed, ELEVATION, FLAT, i), i);
      done[i] = 1;
    }
  }
  let count = 0;
  while (heap.size > 0) {
    heap.pop();
    const level = heap.a;
    const c = heap.c;
    order[count++] = c;
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      if (done[m] === 0) {
        done[m] = 1;
        filled[m] = Math.max(elevation[m], level);
        receiver[m] = c;
        heap.push(filled[m], draw2(seed, ELEVATION, FLAT, m), m);
      }
    }
  }
  return { filled, receiver, order };
}

export function accumulate(order: Int32Array, receiver: Int32Array, rain: Int32Array, ocean: Uint8Array): Int32Array {
  const flow = new Int32Array(order.length);
  for (let k = order.length - 1; k >= 0; k--) {
    const c = order[k];
    if (ocean[c] !== 0) continue;
    flow[c] += floorDiv(RAIN_UNIT, 4) + rain[c];
    const r = receiver[c];
    if (r >= 0 && ocean[r] === 0) flow[r] += flow[c];
  }
  return flow;
}

// Stream-power incision: cut a share of the drop to the receiver that grows with sqrt(flow).
export function erode(
  elevation: Int32Array,
  filled: Int32Array,
  receiver: Int32Array,
  flow: Int32Array,
  ocean: Uint8Array,
): Int32Array {
  const out = elevation.slice();
  for (let i = 0; i < receiver.length; i++) {
    const r = receiver[i];
    if (ocean[i] !== 0 || r < 0) continue;
    const drop = filled[i] - filled[r];
    if (drop > 0) {
      const cut = floorDiv(drop * Math.min(isqrt(floorDiv(flow[i], RAIN_UNIT)), 12), 24);
      out[i] = Math.max(elevation[i] - cut, filled[r] + 1, 1);
    }
  }
  return out;
}
