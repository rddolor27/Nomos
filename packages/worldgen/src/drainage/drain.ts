import { type Adjacency, adjacency, parts, union } from '../grid/grid.ts';
import { EROSION_PASSES, RAIN_UNIT, RIVER_CELLS, accumulate, erode, flood } from './flood.ts';
import { lakes } from './lakes.ts';

export interface Drained {
  elevation: Int32Array;
  lake: Uint8Array;
  receiver: Int32Array;
  flow: Int32Array;
  river: Uint8Array;
}

function sizeOf(flow: number): number {
  const unit = RIVER_CELLS * RAIN_UNIT;
  if (flow >= 12 * unit) return 3;
  if (flow >= 4 * unit) return 2;
  return flow >= unit ? 1 : 0;
}

// Each river cell and its receiver are linked both ways, when the receiver is a river cell too.
function linksOf(river: Uint8Array, receiver: Int32Array): Adjacency {
  const lists: number[][] = [];
  for (let i = 0; i < river.length; i++) lists.push([]);
  for (let i = 0; i < river.length; i++) {
    const r = receiver[i];
    if (river[i] !== 0 && r >= 0 && river[r] !== 0) {
      lists[i].push(r);
      lists[r].push(i);
    }
  }
  return adjacency(lists);
}

// Size 1-3 where flow passes 1x, 4x and 12x the threshold; stubs under 3 cells are dropped.
export function rivers(
  width: number,
  height: number,
  flow: Int32Array,
  receiver: Int32Array,
  lake: Uint8Array,
  ocean: Uint8Array,
): Uint8Array {
  const river = new Uint8Array(flow.length);
  for (let i = 0; i < river.length; i++) {
    if (ocean[i] === 0 && lake[i] === 0) river[i] = sizeOf(flow[i]);
  }
  const { label, sizes } = parts(linksOf(river, receiver), river);
  const kept = new Uint8Array(river.length);
  for (let i = 0; i < kept.length; i++) {
    if (river[i] !== 0 && sizes[label[i]] >= 3) kept[i] = river[i];
  }
  return kept;
}

function erodedElevation(
  seed: number,
  width: number,
  height: number,
  elevation: Int32Array,
  ocean: Uint8Array,
  rain: Int32Array,
): Int32Array {
  let eroded = elevation;
  for (let pass = 0; pass < EROSION_PASSES; pass++) {
    const flooded = flood(seed, width, height, eroded, ocean);
    const flow = accumulate(flooded.order, flooded.receiver, rain, ocean);
    eroded = erode(eroded, flooded.filled, flooded.receiver, flow, ocean);
  }
  return eroded;
}

function raisedToFill(level: Int32Array, filled: Int32Array, lake: Uint8Array): Int32Array {
  const out = level.slice();
  for (let i = 0; i < out.length; i++) {
    if (filled[i] > level[i] && lake[i] === 0) out[i] = filled[i];
  }
  return out;
}

// Erosion-lite for EROSION_PASSES, then lakes, then the final drainage. Terminal lakes are flooded as sinks beside the
// ocean, so the water that reaches one stays there.
export function drain(
  seed: number,
  width: number,
  height: number,
  elevation: Int32Array,
  ocean: Uint8Array,
  rain: Int32Array,
): Drained {
  const eroded = erodedElevation(seed, width, height, elevation, ocean, rain);
  let flooded = flood(seed, width, height, eroded, ocean);
  const pools = lakes(width, height, eroded, flooded.filled, ocean);
  let finalElevation = pools.level;
  if (pools.terminal.includes(1)) {
    flooded = flood(seed, width, height, pools.level, union(ocean, pools.terminal));
    finalElevation = raisedToFill(pools.level, flooded.filled, pools.lake);
  }
  const flow = accumulate(flooded.order, flooded.receiver, rain, ocean);
  const river = rivers(width, height, flow, flooded.receiver, pools.lake, ocean);
  return { elevation: finalElevation, lake: pools.lake, receiver: flooded.receiver, flow, river };
}
