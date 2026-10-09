import { draw2 } from '../random/draw.ts';
import { floorDiv, floorMod } from '../maths/int.ts';
import { take, type Arena } from '../memory/arena.ts';

export const STRIDE_DAYS = 30;

export interface Stride {
  readonly period: number;
  readonly stream: number;
  readonly offset: Int32Array;
  readonly changed: Uint8Array;
  readonly value: Int32Array;
}

// The offset is state, re-keyed yearly. The change list is scratch: the hash skips it, but checkpoints carry it,
// pending changes included.
export function createStride(arena: Arena, capacity: number, period: number, stream: number): Stride {
  const slots = floorDiv(capacity + period - 1, period); // ceil(capacity / period)
  return {
    period,
    stream,
    offset: take(arena, Int32Array, 1, true),
    changed: take(arena, Uint8Array, slots, false),
    value: take(arena, Int32Array, slots, false),
  };
}

export function rekeyStride(stride: Stride, seed: number, year: number): void {
  stride.offset[0] = draw2(seed, stride.stream, year, stride.period) % stride.period;
}

// Agent i is due on day d when i is congruent to d - offset, modulo the period. The difference is negative early in
// year 1, and % would keep that sign.
export function firstDue(stride: Stride, day: number): number {
  return floorMod(day - stride.offset[0], stride.period);
}

export function setChange(stride: Stride, slot: number, value: number): void {
  stride.changed[slot] = 1;
  stride.value[slot] = value;
}

// Slot k belongs to agent first + k * period, so the writes land in agent order whatever order queued them.
export function applyChanges(
  stride: Stride,
  day: number,
  n: number,
  column: Int32Array | Uint16Array | Uint8Array,
): void {
  const { period, changed, value } = stride;
  let slot = 0;
  for (let agent = firstDue(stride, day); agent < n; agent += period) {
    if (changed[slot] === 1) {
      column[agent] = value[slot];
      changed[slot] = 0;
    }
    slot++;
  }
}
