import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../memory/tiers.ts';
import { mix } from '../random/draw.ts';
import { LEDGER_FIELDS, populationAt } from '../spawn/record.ts';
import type { Ground } from './ground.ts';
import { GOODS, MAX_TOWNS, STREETS, TOWN, layoutWorld, type World } from './world.ts';

const NO_SKIP: readonly ArrayBufferView[] = [];
const ROW_BYTES = LEDGER_FIELDS * Float64Array.BYTES_PER_ELEMENT;

export function stateHash(world: World): number {
  return stateHashExcept(world, NO_SKIP);
}

// Skips each canonical region that starts where a given view does; the relabel test skips the culture regions (R8).
// The goods store comes next and counts only while globals[GOODS] is 1, so a world without goods hashes as it did before
// the store existed (M2.4). Then the errand store, only while globals[STREETS] is 1, so a town that wanders hashes as it did
// before the streets (M2.7). A town's ledger table is last (M2.2c).
// The one view this makes is fine here: the hash runs between ticks, never inside step.
export function stateHashExcept(world: World, skip: readonly ArrayBufferView[]): number {
  const words = new Uint32Array(world.arena.memory.buffer);
  const regions = world.arena.canonical;
  let h = 0;
  for (let r = 0; r < regions.length; r += 2) {
    if (startsAView(regions[r], skip)) continue;
    h = mixRegion(words, h, regions[r], regions[r + 1]);
  }
  const goods = world.goods;
  if (world.globals[GOODS] === 1 && !startsAView(goods.byteOffset, skip)) {
    h = mixRegion(words, h, goods.byteOffset, goods.byteLength);
  }
  const errands = world.errands;
  if (world.globals[STREETS] === 1 && !startsAView(errands.byteOffset, skip)) {
    h = mixRegion(words, h, errands.byteOffset, errands.byteLength);
  }
  if (world.globals[TOWN] === 1 && !startsAView(world.townRecords.byteOffset, skip)) h = mixTowns(world, words, h);
  return h;
}

// Each visited row, in row order after its index, then the live town, once a row is held. A row with no people is
// unvisited and adds nothing, so a town that has never switched hashes as it did before the table, and the live town is
// covered from the first switch on: only then does it say which row the next fold writes.
function mixTowns(world: World, words: Uint32Array, from: number): number {
  const rows = world.townRecords;
  let h = from;
  let visited = 0;
  for (let town = 0; town < MAX_TOWNS; town++) {
    const first = town * LEDGER_FIELDS;
    if (populationAt(rows, first) === 0) continue;
    h = mixRegion(words, mix(h ^ town), rows.byteOffset + first * Float64Array.BYTES_PER_ELEMENT, ROW_BYTES);
    visited++;
  }
  return visited === 0 ? from : mix(h ^ world.focus[0]);
}

function mixRegion(words: Uint32Array, from: number, byteOffset: number, byteLength: number): number {
  let h = from;
  const end = (byteOffset + byteLength) / 4;
  for (let word = byteOffset / 4; word < end; word++) h = mix(h ^ words[word]);
  return h;
}

function startsAView(byteOffset: number, views: readonly ArrayBufferView[]): boolean {
  for (let v = 0; v < views.length; v++) if (views[v].byteOffset === byteOffset) return true;
  return false;
}

export function checkpoint(world: World): ArrayBuffer {
  return world.arena.memory.buffer.slice(0, world.arena.top);
}

export function restoreWorld(seed: number, tier: Tier, state: ArrayBuffer, ground?: Ground): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  if (state.byteLength !== world.arena.top) {
    throw new RangeError(`a ${tier} checkpoint holds ${world.arena.top} bytes, not ${state.byteLength}`);
  }
  new Uint8Array(world.arena.memory.buffer).set(new Uint8Array(state));
  return world;
}
