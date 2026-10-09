import { take, type Arena } from '../memory/arena.ts';

export const INPUT_FOCUS = 1;
export const INPUT_CAPACITY = 4096;

// Each input is stamped with the tick it was logged in; cursor holds the logged and applied counts.
export interface InputLog {
  readonly tick: Int32Array;
  readonly kind: Uint8Array;
  readonly a: Int32Array;
  readonly b: Int32Array;
  readonly cursor: Int32Array;
}

// Replay input, not state: the hash skips the log, but checkpoints carry it, pending inputs included.
export function createInputLog(arena: Arena): InputLog {
  return {
    tick: take(arena, Int32Array, INPUT_CAPACITY, false),
    kind: take(arena, Uint8Array, INPUT_CAPACITY, false),
    a: take(arena, Int32Array, INPUT_CAPACITY, false),
    b: take(arena, Int32Array, INPUT_CAPACITY, false),
    cursor: take(arena, Int32Array, 2, false),
  };
}
