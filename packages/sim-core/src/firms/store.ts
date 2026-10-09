import { take, type Arena } from '../memory/arena.ts';

// One row per firm, every column canonical. Cents are in price and wage, units in the Int32Arrays.
export interface FirmStore {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly price: Float64Array;
  readonly wage: Float64Array;
  readonly stock: Int32Array;
  readonly employees: Int32Array;
  readonly demand: Int32Array;
  readonly lastDemand: Int32Array;
  readonly vacancy: Uint8Array;
  readonly notice: Uint8Array;
  readonly monthsFull: Uint8Array;
  readonly idleMonths: Uint8Array;
}

export function createFirmStore(arena: Arena, capacity: number): FirmStore {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    price: take(arena, Float64Array, capacity, true),
    wage: take(arena, Float64Array, capacity, true),
    stock: take(arena, Int32Array, capacity, true),
    employees: take(arena, Int32Array, capacity, true),
    demand: take(arena, Int32Array, capacity, true),
    lastDemand: take(arena, Int32Array, capacity, true),
    vacancy: take(arena, Uint8Array, capacity, true),
    notice: take(arena, Uint8Array, capacity, true),
    monthsFull: take(arena, Uint8Array, capacity, true),
    idleMonths: take(arena, Uint8Array, capacity, true),
  };
}
