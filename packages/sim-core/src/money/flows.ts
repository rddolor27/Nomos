import { take, type Arena } from '../memory/arena.ts';

export interface FlowPlan {
  readonly slots: number;
  readonly from: Int32Array;
  readonly to: Int32Array;
  readonly amount: Float64Array;
}

export function createFlowPlan(arena: Arena, slots: number): FlowPlan {
  return {
    slots,
    from: take(arena, Int32Array, slots, false),
    to: take(arena, Int32Array, slots, false),
    amount: take(arena, Float64Array, slots, false),
  };
}

// The slot comes from the entity (entity * flows per entity + k), never from the order the planner visits it (R4).
export function planFlow(plan: FlowPlan, slot: number, from: number, to: number, amount: number): void {
  plan.from[slot] = from;
  plan.to[slot] = to;
  plan.amount[slot] = amount;
}

// Applying in slot order, after planning has read every balance, keeps the result independent of the visiting order.
export function applyFlows(plan: FlowPlan, target: Float64Array): void {
  for (let slot = 0; slot < plan.slots; slot++) {
    const amount = plan.amount[slot];
    target[plan.from[slot]] -= amount;
    target[plan.to[slot]] += amount;
    plan.amount[slot] = 0;
  }
}
