import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../memory/tiers.ts';
import { mix } from '../random/draw.ts';
import type { Ground } from './ground.ts';
import { GOODS, layoutWorld, type World } from './world.ts';

const NO_SKIP: readonly ArrayBufferView[] = [];

export function stateHash(world: World): number {
  return stateHashExcept(world, NO_SKIP);
}

// Skips each canonical region that starts where a given view does; the relabel test skips the culture regions (R8).
// The goods store is the last region and counts only while globals[GOODS] is 1, so a world without goods hashes as it
// did before the store existed (M2.4).
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
  return h;
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
