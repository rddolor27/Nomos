import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkStages, type Goldens } from './engines/checks.ts';

const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens-v1.json', import.meta.url), 'utf8'));

// A sample on every run. scripts/engines.ts runs all 200 worlds in Node and Bun, and the browser spec in three browsers.
describe('the port against the Python goldens', { timeout: 120_000 }, () => {
  it('matches every stage ported so far on the first 10 standard and 2 large worlds', () => {
    const report = checkStages(goldens, null, { standard: 10, large: 2 });
    expect(report.failures).toEqual([]);
    expect(report.cases).toBeGreaterThan(0);
  });
});
