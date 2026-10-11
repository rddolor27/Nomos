import { BREAD, FUEL, GOOD_NAMES } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ITEM_GOODS } from '../src/place/item-goods.ts';

describe('the goods a blob carries', () => {
  it("run in the order of the visual word's item field, BREAD 1 to FUEL 7, as sim-core names the goods", () => {
    expect(ITEM_GOODS).toEqual(GOOD_NAMES.slice(BREAD, FUEL + 1).map((name) => name.toLowerCase()));
    expect(ITEM_GOODS.length).toBe(FUEL - BREAD + 1);
  });
});
