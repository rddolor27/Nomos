import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CLI = fileURLToPath(new URL('../src/main.ts', import.meta.url));
const HEADER = [
  'day', 'unemployed', 'vacancies', 'price_mean', 'wage_mean', 'household_cash', 'firm_cash', 'sales_units',
  'sales_cents', 'price_changes', 'price_change_ppm', 'hires', 'switches', 'firings', 'wage_bill', 'profits_paid',
  'exits', 'issued', 'velocity',
];
const OPENING_MONEY_CENTS = 310_000_000;

function economy(...args: string[]): string {
  return execFileSync(process.execPath, [CLI, 'economy', ...args], { encoding: 'utf8', stdio: 'pipe' });
}

function rowsOf(csv: string): number[][] {
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(',').map(Number));
}

describe('the economy command', { timeout: 60_000 }, () => {
  it('writes a CSV row a day, the same for the same seed', () => {
    const csv = economy('--seed', '42', '--days', '63');
    const lines = csv.trim().split('\n');
    expect(lines[0].split(',')).toEqual(HEADER);
    expect(rowsOf(csv).map((row) => row[0])).toEqual(Array.from({ length: 63 }, (_, day) => day));
    expect(economy('--seed', '42', '--days', '63')).toBe(csv);
    expect(economy('--seed', '43', '--days', '63')).not.toBe(csv);
  });

  it('keeps all the money with households and firms in closed money, and turns it over', () => {
    const household = HEADER.indexOf('household_cash');
    const firm = HEADER.indexOf('firm_cash');
    const velocity = HEADER.indexOf('velocity');
    for (const row of rowsOf(economy('--days', '63'))) {
      expect(row[household] + row[firm], `day ${row[0]}`).toBe(OPENING_MONEY_CENTS);
      expect(row[velocity], `day ${row[0]}`).toBeGreaterThan(0);
    }
  });

  it('issues fiat money at --fiat-ppm, and refuses a rate above 1% a month', () => {
    const issued = HEADER.indexOf('issued');
    const rows = rowsOf(economy('--days', '21', '--fiat-ppm', '5000'));
    expect(rows[20][issued]).toBe(1_550_000);
    const refused = spawnSync(process.execPath, [CLI, 'economy', '--days', '21', '--fiat-ppm', '10001'], { encoding: 'utf8' });
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain('fiatIssuePpm must be 0 to 10000');
  });

  it('writes to --out, making its folder, and prints sim days per second to stderr', () => {
    const folder = mkdtempSync(join(tmpdir(), 'nomos-economy-'));
    try {
      const out = join(folder, 'deep', '42.csv');
      const run = spawnSync(process.execPath, [CLI, 'economy', '--days', '21', '--out', out], { encoding: 'utf8' });
      expect(run.status).toBe(0);
      expect(run.stdout).toBe('');
      expect(run.stderr).toMatch(/^sim days per second: \d+/);
      expect(readFileSync(out, 'utf8')).toBe(economy('--days', '21'));
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("prints each series' truncation and the burn-in, half again the larger", () => {
    const run = spawnSync(process.execPath, [CLI, 'economy', '--burn-in', '--seeds', '2', '--days', '420'], {
      encoding: 'utf8',
    });
    const price = Number(/^price_mean truncation=(-?\d+)$/m.exec(run.stdout)?.[1]);
    const unemployment = Number(/^unemployment truncation=(-?\d+)$/m.exec(run.stdout)?.[1]);
    expect(Number.isInteger(price) && Number.isInteger(unemployment), run.stdout).toBe(true);
    if (price < 0 || unemployment < 0) {
      expect(run.status).toBe(1);
      expect(run.stdout).toContain('no MSER-5 minimum in the first half');
    } else {
      expect(run.status).toBe(0);
      expect(run.stdout).toContain(`burnInDays=${Math.ceil(1.5 * Math.max(price, unemployment))}`);
    }
    expect(run.stderr).toMatch(/^sim days per second: \d+/);
  });
});
