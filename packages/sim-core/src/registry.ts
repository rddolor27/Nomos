import { take, type Arena } from './memory.ts';

// Whole-unit holdings of homes, titles and firm shares. Revaluing a group changes its price, never a cash balance.
export interface Registry {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly owner: Int32Array;
  readonly group: Int32Array;
  readonly units: Int32Array;
  readonly price: Float64Array;
  readonly groupUnits: Float64Array;
  readonly revaluation: Float64Array;
}

export function createRegistry(arena: Arena, capacity: number, groups: number): Registry {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    owner: take(arena, Int32Array, capacity, true),
    group: take(arena, Int32Array, capacity, true),
    units: take(arena, Int32Array, capacity, true),
    price: take(arena, Float64Array, groups, true),
    groupUnits: take(arena, Float64Array, groups, true),
    revaluation: take(arena, Float64Array, groups, true),
  };
}

// Holdings are append-only until M2 needs slot reuse. A full registry throws before anything is written.
export function addHolding(reg: Registry, owner: number, group: number, units: number): number {
  const holding = reg.count[0];
  if (holding >= reg.capacity) throw new RangeError('the registry is full');
  reg.owner[holding] = owner;
  reg.group[holding] = group;
  reg.units[holding] = units;
  reg.groupUnits[group] += units;
  reg.count[0] = holding + 1;
  return holding;
}

export function transferHolding(reg: Registry, holding: number, owner: number): void {
  reg.owner[holding] = owner;
}

export function holdingValue(reg: Registry, holding: number): number {
  return reg.units[holding] * reg.price[reg.group[holding]];
}

export function revalue(reg: Registry, group: number, newPrice: number): number {
  const line = (newPrice - reg.price[group]) * reg.groupUnits[group];
  reg.price[group] = newPrice;
  reg.revaluation[group] = line;
  return line;
}
