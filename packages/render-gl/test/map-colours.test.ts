import { describe, expect, it } from 'vitest';
import { COUNTRY_COLOURS, LINE_COLOURS } from '../src/map.ts';

describe('the map colours', () => {
  it('holds five distinct country colours, none of them a line colour', () => {
    expect(COUNTRY_COLOURS).toHaveLength(5);
    expect(new Set(COUNTRY_COLOURS).size).toBe(5);
    for (const colour of COUNTRY_COLOURS) expect(Object.values(LINE_COLOURS)).not.toContain(colour);
  });
});
