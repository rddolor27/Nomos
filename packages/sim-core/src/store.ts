import { draw1 } from './draw.ts';
import { take, type Arena } from './memory.ts';
import { CULTURE, LOOK } from './streams.ts';

export const LOOKS = 96;
export const MAX_CULTURES = 8;

export const CUSTOM_FOOD = 0;
export const CUSTOM_FESTIVAL = 1;
export const CUSTOM_MUSIC = 2;
export const CUSTOM_NAMING = 3;

export interface AgentStore {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly x: Int32Array;
  readonly y: Int32Array;
  // Q8 sub-pixels per tick.
  readonly vx: Int16Array;
  readonly vy: Int16Array;
  readonly action: Uint8Array;
  readonly facing: Uint8Array;
  // One of 256 headings, clockwise on screen from down; vx, vy and facing follow it (walk.ts).
  readonly heading: Uint8Array;
  readonly look: Uint8Array;
  readonly culture: Uint8Array;
  readonly birthCulture: Uint8Array;
  readonly customs: Uint16Array;
  readonly homeRegion: Uint16Array;
}

// Every per-agent column, checked against the 256-bytes-per-agent budget (Performance budget).
export const AGENT_COLUMNS: readonly { name: string; bytes: number }[] = [
  { name: 'x', bytes: 4 },
  { name: 'y', bytes: 4 },
  { name: 'vx', bytes: 2 },
  { name: 'vy', bytes: 2 },
  { name: 'action', bytes: 1 },
  { name: 'facing', bytes: 1 },
  { name: 'heading', bytes: 1 },
  { name: 'look', bytes: 1 },
  { name: 'culture', bytes: 1 },
  { name: 'birthCulture', bytes: 1 },
  { name: 'customs', bytes: 2 },
  { name: 'homeRegion', bytes: 2 },
];

export function createAgentStore(arena: Arena, capacity: number): AgentStore {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    x: take(arena, Int32Array, capacity, true),
    y: take(arena, Int32Array, capacity, true),
    vx: take(arena, Int16Array, capacity, true),
    vy: take(arena, Int16Array, capacity, true),
    action: take(arena, Uint8Array, capacity, true),
    facing: take(arena, Uint8Array, capacity, true),
    heading: take(arena, Uint8Array, capacity, true),
    look: take(arena, Uint8Array, capacity, true),
    culture: take(arena, Uint8Array, capacity, true),
    birthCulture: take(arena, Uint8Array, capacity, true),
    customs: take(arena, Uint16Array, capacity, true),
    homeRegion: take(arena, Uint16Array, capacity, true),
  };
}

// The look depends on (seed, id) alone, as in looks.py's look_for, and culture comes from its own stream, so neither
// can mark a family or a group (content rules 1 and 8).
export function addAgent(store: AgentStore, seed: number, id: number, cultures: number, homeRegion: number): number {
  const slot = store.count[0];
  if (cultures < 1 || cultures > MAX_CULTURES) throw new RangeError(`cultures must be 1-${MAX_CULTURES}, not ${cultures}`);
  if (slot >= store.capacity) throw new RangeError(`the store is full at ${store.capacity} agents`);
  const culture = draw1(seed, CULTURE, id) % cultures;
  store.look[slot] = draw1(seed, LOOK, id) % LOOKS;
  store.culture[slot] = culture;
  store.birthCulture[slot] = culture;
  store.customs[slot] = culture * 0x1111; // someone raised in one culture holds its four customs
  store.homeRegion[slot] = homeRegion;
  store.count[0] = slot + 1;
  return slot;
}

// customs holds one culture per 4-bit nibble, a nibble per CUSTOM_* domain.
export function customOf(customs: number, domain: number): number {
  return (customs >>> (domain * 4)) & 0xf;
}

export function withCustom(customs: number, domain: number, culture: number): number {
  const shift = domain * 4;
  return (customs & ~(0xf << shift)) | (culture << shift);
}
