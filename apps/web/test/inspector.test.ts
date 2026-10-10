import { personName } from '@nomos/sim-culture';
import { ACTION_IDLE, ACTION_WALK, type WorkerMessage } from '@nomos/sim-protocol';
import { describe, expect, it } from 'vitest';
import { blobCard, formatCents } from '../src/panels/inspector.ts';
import { isClick } from '../src/view/camera-input.ts';

type Inspected = Extract<WorkerMessage, { type: 'inspected' }>;

const NAME_KEY = 7;
const NAME = personName(NAME_KEY);
const HOUSEMATES = [21, 22];
// Firm row 11 pays 1,428.00 a month and the blob holds 3,100.00. It walks, lives in home row 6 with two others, and wears
// look 77: hue 77 % 6 = 5, eyes floor(77 / 6) % 4 = 0 and pattern floor(77 / 24) = 3.
const IN_WORK: Inspected = {
  type: 'inspected',
  tick: 0,
  agent: 3,
  nameKey: NAME_KEY,
  cents: 310_000,
  employer: 11,
  wage: 142_800,
  look: 77,
  action: ACTION_WALK,
  home: 6,
  members: HOUSEMATES,
};

function rowsOf(reply: Inspected): Record<string, string> {
  return Object.fromEntries(blobCard(reply).rows);
}

describe('the blob card', () => {
  it('words a blob in work: its shop, pay, wallet, home, housemates, doing and look', () => {
    expect(blobCard(IN_WORK)).toEqual({
      name: NAME,
      look: 77,
      rows: [
        ['Job', 'Works at Shop 12'],
        ['Pay', '1,428.00 a month'],
        ['Wallet', '3,100.00'],
        ['Home', 'House 7'],
        ['Lives with', `${personName(21)}, ${personName(22)}`],
        ['Doing', 'Walking'],
        ['Look', 'Silver body, round eyes, patch pattern'],
      ],
    });
    expect(rowsOf({ ...IN_WORK, employer: 0 }).Job).toBe('Works at Shop 1');
  });

  it('says a blob with no employer is out of work, with no pay', () => {
    const rows = rowsOf({ ...IN_WORK, employer: -1, wage: 0 });
    expect([rows.Job, rows.Pay, rows.Wallet]).toEqual(['Out of work', 'None', '3,100.00']);
  });

  it('says a one-person household lives with no one, counting homes from 1', () => {
    const rows = rowsOf({ ...IN_WORK, members: [], home: 0, action: ACTION_IDLE });
    expect([rows['Lives with'], rows.Home, rows.Doing]).toEqual(['No one', 'House 1', 'Idle']);
    expect(rowsOf({ ...IN_WORK, home: -1 }).Home).toBe('No home');
  });

  it("names the first and last looks as the sprite tools do, and an action with no words by the sim's name", () => {
    expect(rowsOf({ ...IN_WORK, look: 0 }).Look).toBe('Sun body, round eyes, plain pattern');
    expect(rowsOf({ ...IN_WORK, look: 95 }).Look).toBe('Silver body, wide eyes, patch pattern');
    expect(rowsOf({ ...IN_WORK, action: 3 }).Doing).toBe('Sleep');
  });
});

describe('the inspector', () => {
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
