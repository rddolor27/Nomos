import { describe, expect, it } from 'vitest';
import { draw1, draw2 } from '../src/random/draw.ts';
import { applyFlows, createFlowPlan, planFlow, type FlowPlan } from '../src/money/flows.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { createLedger, issue } from '../src/money/ledger.ts';
import { reserveArena } from '../src/memory/arena.ts';

const STREAM = 0x7f5;
const ENTITIES = 10_000;
const DAYS = 30;
const SETTLEMENTS = 2_496; // 16 national accounts + 4 sectors x 2,496 settlements = 10,000 accounts

function startingBalance(i: number): number {
  return draw1(42, STREAM, i) % 1_000_000;
}

// Entity i sends floor(b[i] / 8) to (7i + 3) mod n and floor(b[i] / 16) to (13i + 5) mod n, in its own two slots.
function planDay(plan: FlowPlan, balances: Float64Array, n: number, order: Int32Array): void {
  for (let v = 0; v < order.length; v++) {
    const i = order[v];
    planFlow(plan, 2 * i, i, (7 * i + 3) % n, Math.floor(balances[i] / 8));
    planFlow(plan, 2 * i + 1, i, (13 * i + 5) % n, Math.floor(balances[i] / 16));
  }
}

function writeDuringVisit(balances: Float64Array, n: number, order: Int32Array): void {
  for (let v = 0; v < order.length; v++) {
    const i = order[v];
    move(balances, i, (7 * i + 3) % n, Math.floor(balances[i] / 8));
    move(balances, i, (13 * i + 5) % n, Math.floor(balances[i] / 16));
  }
}

function move(balances: Float64Array, from: number, to: number, amount: number): void {
  balances[from] -= amount;
  balances[to] += amount;
}

function keyedFisherYates(n: number): Int32Array {
  const order = Int32Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = draw2(42, STREAM, i, 1) % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}

describe('plan, then apply', () => {
  it('gives the same balances in any planning order', () => {
    const arena = reserveArena(4_194_304);
    const forward = Int32Array.from({ length: ENTITIES }, (_, i) => i);
    const runs = [forward, forward.slice().reverse(), keyedFisherYates(ENTITIES)].map((order) => ({
      order,
      balances: Float64Array.from({ length: ENTITIES }, (_, i) => startingBalance(i)),
      plan: createFlowPlan(arena, 2 * ENTITIES),
    }));
    for (let day = 0; day < DAYS; day++) {
      for (const run of runs) {
        planDay(run.plan, run.balances, ENTITIES, run.order);
        applyFlows(run.plan, run.balances);
      }
      expect(runs[1].balances, `reverse, day ${day}`).toEqual(runs[0].balances);
      expect(runs[2].balances, `keyed, day ${day}`).toEqual(runs[0].balances);
    }

    const visitedForward = Float64Array.from({ length: ENTITIES }, (_, i) => startingBalance(i));
    const visitedBackward = visitedForward.slice();
    for (let day = 0; day < DAYS; day++) {
      writeDuringVisit(visitedForward, ENTITIES, runs[0].order);
      writeDuringVisit(visitedBackward, ENTITIES, runs[1].order);
    }
    expect(visitedBackward).not.toEqual(visitedForward);

    const ledger = createLedger(arena, SETTLEMENTS);
    for (let account = 1; account < ledger.accounts; account++) issue(ledger, account, startingBalance(account));
    const plan = createFlowPlan(arena, 2 * ledger.accounts);
    for (let day = 0; day < DAYS; day++) {
      planDay(plan, ledger.balance, ledger.accounts, forward);
      applyFlows(plan, ledger.balance);
      expect(checkCash(ledger), `ledger, day ${day}`).toBe(OK);
    }
  });
});
