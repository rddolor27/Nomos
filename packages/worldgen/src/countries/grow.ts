import { floorDiv } from '@nomos/sim-core/kernels';
import { LAKE, OCEAN } from '../climate/biomes.ts';
import { neighbours, xOf, yOf } from '../grid/grid.ts';
import { MinHeap } from '../grid/heap.ts';
import { COVER, DIAGONAL, STRAIGHT } from '../routes/costs.ts';

// Tuned on previews. Water costs far more than any land step, so an island without a capital joins the country with the
// cheapest crossing.
export const RIVER_STEP = 30;
export const WATER = 640;
export const FAR = 1 << 30;

// A diagonal from c to m past side cells a and b may not cut a water corner between two land cells, nor slip between
// two river cells that flow into each other, as roads may not.
export function slips(
  c: number,
  a: number,
  b: number,
  m: number,
  wet: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
): boolean {
  if (wet[c] === 0 && wet[m] === 0 && (wet[a] !== 0 || wet[b] !== 0)) return true;
  return river[a] !== 0 && river[b] !== 0 && (receiver[a] === b || receiver[b] === a);
}

function wetCells(biome: Uint8Array): Uint8Array {
  const wet = new Uint8Array(biome.length);
  for (let i = 0; i < biome.length; i++) wet[i] = biome[i] === OCEAN || biome[i] === LAKE ? 1 : 0;
  return wet;
}

function entryCosts(biome: Uint8Array, wet: Uint8Array): Int32Array {
  const enter = new Int32Array(biome.length);
  for (let i = 0; i < biome.length; i++) enter[i] = wet[i] !== 0 ? WATER : 16 + COVER[biome[i]];
  return enter;
}

// A river adds its size, 1 to 3, to every step into one of its cells.
function stepCost(diagonal: boolean, enterCost: number, riverSize: number): number {
  return floorDiv((diagonal ? DIAGONAL : STRAIGHT) * enterCost, 16) + RIVER_STEP * riverSize;
}

// Each cell's cheapest source, water included, as labels 1.. in source order. The heap key (cost, cell) is unique, so a
// tie goes to the source popped first, whatever the heap's internals.
export function grow(
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
  sources: readonly number[],
): Int32Array {
  const n = width * height;
  const nbrs = neighbours(width, height);
  const wet = wetCells(biome);
  const enter = entryCosts(biome, wet);
  const cost = new Int32Array(n).fill(FAR);
  const label = new Int32Array(n);
  const heap = new MinHeap(n);
  for (let k = 0; k < sources.length; k++) {
    cost[sources[k]] = 0;
    label[sources[k]] = k + 1;
    heap.push(0, sources[k]);
  }
  while (heap.size > 0) {
    heap.pop();
    const d = heap.a;
    const c = heap.b;
    if (d > cost[c]) continue;
    const cx = xOf(c, width);
    const cy = yOf(c, width);
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      const dx = xOf(m, width) - cx;
      const dy = yOf(m, width) - cy;
      const diagonal = dx !== 0 && dy !== 0;
      if (diagonal && slips(c, c + dx, c + dy * width, m, wet, river, receiver)) continue;
      const step = stepCost(diagonal, enter[m], river[m]);
      if (d + step < cost[m]) {
        cost[m] = d + step;
        label[m] = label[c];
        heap.push(d + step, m);
      }
    }
  }
  return label;
}
