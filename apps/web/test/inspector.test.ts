import { personName } from '@nomos/sim-culture';
import { describe, expect, it } from 'vitest';
import { formatCents, inspectorLine } from '../src/panels/inspector.ts';
import { isClick } from '../src/view/camera-input.ts';

const NAME_KEY = 7;
const NAME = personName(NAME_KEY);
// Firm row 11 pays 1,428.00 a month and the blob holds 3,100.00.
const IN_WORK = {
  type: 'inspected',
  tick: 0,
  agent: 3,
  nameKey: NAME_KEY,
  cents: 310_000,
  employer: 11,
  wage: 142_800,
} as const;

describe('the inspector', () => {
  it('names the shop, its monthly pay and the wallet of a blob in work, counting shops from 1', () => {
    expect(inspectorLine(IN_WORK)).toBe(`${NAME}, works at Shop 12 for 1,428.00 a month, wallet 3,100.00`);
    expect(inspectorLine({ ...IN_WORK, employer: 0 })).toContain(', works at Shop 1 for ');
  });

  it('says a blob with no employer is out of work, with no pay', () => {
    expect(inspectorLine({ ...IN_WORK, employer: -1, wage: 0 })).toBe(`${NAME}, out of work, wallet 3,100.00`);
  });

  it('shows wallets as exact money, digits grouped without Intl', () => {
    expect(formatCents(100_000)).toBe('1,000.00');
    expect(formatCents(5)).toBe('0.05');
    expect(formatCents(-250)).toBe('-2.50');
    expect(formatCents(123_456_789)).toBe('1,234,567.89');
    expect(formatCents(0)).toBe('0.00');
  });

  it('takes a press and release under 4 CSS px apart as a click, and anything further as a drag', () => {
    expect(isClick(3, 0)).toBe(true);
    expect(isClick(2, -2)).toBe(true);
    expect(isClick(4, 0)).toBe(false);
    expect(isClick(0, 5)).toBe(false);
  });
});
