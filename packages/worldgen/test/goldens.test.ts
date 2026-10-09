import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkStages, type Goldens } from './engines/checks.ts';

function readFixture(name: string): Goldens {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

const goldens = readFixture('goldens-v1.json');
const frozen = readFixture('frozen-v1.json');

// A sample on every run. scripts/engines.ts runs all 200 worlds in Node and Bun, and the browser spec in three browsers.
describe('the port against the Python goldens and the frozen TypeScript stages', { timeout: 120_000 }, () => {
  it('matches every stage ported so far on the first 10 standard and 2 large worlds', () => {
    const report = checkStages(goldens, frozen, { standard: 10, large: 2 });
    expect(report.failures).toEqual([]);
    expect(report.cases).toBeGreaterThan(0);
  });
});
