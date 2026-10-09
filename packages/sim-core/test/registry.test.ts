import { describe, expect, it } from 'vitest';
import { draw3 } from '../src/random/draw.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, NATIONAL_ACCOUNTS, createLedger, issue } from '../src/money/ledger.ts';
import { reserveArena } from '../src/memory/arena.ts';
import { mulPpm } from '../src/money/ppm.ts';
import { addHolding, createRegistry, holdingValue, revalue, transferHolding, type Registry } from '../src/money/registry.ts';

const GROUPS = 3;

function groupValue(reg: Registry, group: number): number {
  let value = 0;
  for (let holding = 0; holding < reg.count[0]; holding++) {
    if (reg.group[holding] === group) value += holdingValue(reg, holding);
  }
  return value;
}

describe('the registry', () => {
  it('logs revaluations without moving a cent or MINT', () => {
    const arena = reserveArena(131_072);
    const cash = createLedger(arena, 10, 0);
    const reg = createRegistry(arena, 300, GROUPS);
    for (let account = NATIONAL_ACCOUNTS; account < cash.accounts; account++) issue(cash, account, 1_000_000 + account);

    // Group 0 holds homes and group 1 titles, one unit each; group 2 holds blocks of shares.
    for (let holding = 0; holding < 300; holding++) {
      const group = holding % GROUPS;
      const units = group === 2 ? 1 + (draw3(5, 1, holding, 0, 0) % 1_000) : 1;
      addHolding(reg, NATIONAL_ACCOUNTS + (holding % 40), group, units);
    }
    reg.price.set([25_000_000, 4_000_000, 12_500]);

    const balances = Array.from(cash.balance);
    const startValue = [0, 1, 2].map((group) => groupValue(reg, group));
    const lines = [0, 0, 0];
    for (let day = 0; day < 400; day++) {
      for (let group = 0; group < GROUPS; group++) {
        const old = reg.price[group];
        const move = mulPpm(old, draw3(5, 2, day, group, 0) % 50_001);
        const price = draw3(5, 2, day, group, 1) % 2 === 0 ? old + move : old - move;
        lines[group] += revalue(reg, group, price);
      }
    }

    expect(Array.from(cash.balance)).toEqual(balances);
    expect(cash.balance[MINT]).toBe(balances[MINT]);
    expect(checkCash(cash)).toBe(OK);
    for (let group = 0; group < GROUPS; group++) {
      expect(lines[group], `group ${group}`).toBe(groupValue(reg, group) - startValue[group]);
    }
    expect(lines.every((line) => line !== 0)).toBe(true);
  });

  it('moves a holding to a new owner and values it at its group price', () => {
    const reg = createRegistry(reserveArena(65_536), 4, 2);
    reg.price.set([1_000_000, 250]);
    const home = addHolding(reg, 16, 0, 1);
    const shares = addHolding(reg, 17, 1, 40);
    expect([home, shares, reg.count[0]]).toEqual([0, 1, 2]);
    expect(Array.from(reg.groupUnits)).toEqual([1, 40]);
    expect([holdingValue(reg, home), holdingValue(reg, shares)]).toEqual([1_000_000, 10_000]);

    transferHolding(reg, home, 18);
    expect([reg.owner[home], reg.group[home], reg.units[home]]).toEqual([18, 0, 1]);
    expect(Array.from(reg.groupUnits)).toEqual([1, 40]);

    expect(revalue(reg, 1, 300)).toBe(2_000);
    expect(revalue(reg, 1, 290)).toBe(-400);
    expect([reg.price[1], reg.revaluation[1]]).toEqual([290, -400]);
  });

  it('refuses full structures', () => {
    const reg = createRegistry(reserveArena(65_536), 2, 1);
    addHolding(reg, 16, 0, 5);
    addHolding(reg, 17, 0, 7);

    expect(() => addHolding(reg, 18, 0, 11)).toThrow(RangeError);
    expect([reg.count[0], reg.groupUnits[0]]).toEqual([2, 12]);
  });

  it('lists every column, the count included, as canonical', () => {
    const arena = reserveArena(65_536);
    const reg = createRegistry(arena, 10, 2);
    const canonicalOffsets = arena.canonical.filter((_, i) => i % 2 === 0);
    for (const [name, column] of Object.entries(reg)) {
      if (ArrayBuffer.isView(column)) expect(canonicalOffsets, name).toContain(column.byteOffset);
    }
  });
});
