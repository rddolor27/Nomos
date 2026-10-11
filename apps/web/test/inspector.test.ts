import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_EAT,
  ACTIVITY_FETCH,
  ACTIVITY_GREEN,
  ACTIVITY_PLAZA,
  ACTIVITY_SLEEP,
  ACTIVITY_STAY,
  ACTIVITY_WORK,
  NEED_COMPANY,
  NEED_FUN,
  NEED_HUNGER,
  NEED_REST,
  PHASE_ASLEEP,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_GOING,
  PHASE_KEEPING,
  PHASE_LEAVING,
  PHASE_STAYING,
  PHASE_WORKING,
} from '@nomos/sim-core';
import { personName } from '@nomos/sim-culture';
import { ACTION_IDLE, ACTION_WALK, type WorkerMessage } from '@nomos/sim-protocol';
import { describe, expect, it } from 'vitest';
import { blobCard, formatCents } from '../src/panels/inspector.ts';
import { isClick } from '../src/view/camera-input.ts';

type Inspected = Extract<WorkerMessage, { type: 'inspected' }>;

const NAME_KEY = 7;
const NAME = personName(NAME_KEY);
const HOUSEMATES = [21, 22];
// A town that wanders has no street life to report.
const NO_LIFE = { activity: -1, phase: 0, reason: 0, partner: -1, partnerKey: 0, needs: [], traits: [] };
// Firm row 11, a bakery, pays 1,428.00 a month and the blob holds 3,100.00. It walks, lives in home row 6 with two
// others, and wears look 77: hue 77 % 6 = 5, eyes floor(77 / 6) % 4 = 0 and pattern floor(77 / 24) = 3. Today it bought
// bread (good 1) from firm row 3 and cloth (good 5) from firm row 40.
const IN_WORK: Inspected = {
  type: 'inspected',
  tick: 0,
  agent: 3,
  nameKey: NAME_KEY,
  cents: 310_000,
  employer: 11,
  employerGood: 1,
  wage: 142_800,
  look: 77,
  action: ACTION_WALK,
  home: 6,
  members: HOUSEMATES,
  bought: [
    { good: 1, firm: 3 },
    { good: 5, firm: 40 },
  ],
  ...NO_LIFE,
};
// The same blob in a town with streets, sitting on the plaza for company: fun 69% and company 92% of the way to their top, a
// sociable blob with a settled nature.
const AT_PLAZA: Inspected = {
  ...IN_WORK,
  activity: ACTIVITY_PLAZA,
  phase: PHASE_STAYING,
  reason: NEED_COMPANY + 1,
  needs: [10_000, 20_000, 45_000, 60_000],
  traits: [200, 128, 40],
};

function rowsOf(reply: Inspected): Record<string, string> {
  return Object.fromEntries(blobCard(reply).rows);
}

function doingOf(reply: Partial<Inspected>): string {
  return rowsOf({ ...AT_PLAZA, ...reply }).Doing;
}

describe('the blob card', () => {
  it('words a blob in work: its shop, pay, wallet, home, housemates, doing, purchases and look', () => {
    expect(blobCard(IN_WORK)).toEqual({
      name: NAME,
      look: 77,
      rows: [
        ['Job', 'Works at Bakery 12'],
        ['Pay', '1,428.00 a month'],
        ['Wallet', '3,100.00'],
        ['Home', 'House 7'],
        ['Lives with', `${personName(21)}, ${personName(22)}`],
        ['Doing', 'Walking'],
        ['Bought today', 'Bread at Bakery 4, cloth at Draper 41'],
        ['Look', 'Silver body, round eyes, patch pattern'],
      ],
    });
    expect(rowsOf({ ...IN_WORK, employer: 0, employerGood: 3 }).Job).toBe('Works at Fishmonger 1');
  });

  it('words one purchase by its good and shop, and says so when nothing is bought yet today', () => {
    expect(rowsOf({ ...IN_WORK, bought: [{ good: 3, firm: 0 }] })['Bought today']).toBe('Fish at Fishmonger 1');
    expect(rowsOf({ ...IN_WORK, bought: [] })['Bought today']).toBe('Nothing yet');
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

describe('the blob card in a town with streets', () => {
  it('adds its feeling, needs and personality after what it is doing, and keeps the other rows', () => {
    expect(blobCard(AT_PLAZA).rows.map(([label]) => label)).toEqual([
      'Job',
      'Pay',
      'Wallet',
      'Home',
      'Lives with',
      'Doing',
      'Feeling',
      'Needs',
      'Personality',
      'Bought today',
      'Look',
    ]);
    const rows = rowsOf(AT_PLAZA);
    expect([rows.Doing, rows.Feeling, rows.Needs, rows.Personality]).toEqual([
      'At the plaza: wants company',
      'Lonely',
      'Hunger 15%, rest 31%, fun 69%, company 92%',
      'Sociable, settled',
    ]);
    // A town that wanders has none of the three.
    expect(blobCard(IN_WORK).rows.map(([label]) => label)).not.toContain('Feeling');
  });

  it('words each activity as where the blob is and why, and gives a free-time stay the need that sent it', () => {
    const words: [string, Partial<Inspected>][] = [
      ['Asleep', { activity: ACTIVITY_SLEEP, phase: PHASE_ASLEEP }],
      ['About to go to work', { activity: ACTIVITY_WORK, phase: PHASE_LEAVING }],
      ['Walking to work', { activity: ACTIVITY_WORK, phase: PHASE_GOING }],
      ['At work', { activity: ACTIVITY_WORK, phase: PHASE_WORKING }],
      ['At work', { activity: ACTIVITY_WORK, phase: PHASE_KEEPING }],
      ['Walking home from work', { activity: ACTIVITY_WORK, phase: PHASE_COMING }],
      ['Walking to the shops', { activity: ACTIVITY_FETCH, phase: PHASE_GOING }],
      ['Buying at the shops', { activity: ACTIVITY_FETCH, phase: PHASE_BUYING }],
      ['Walking home from the shops', { activity: ACTIVITY_FETCH, phase: PHASE_COMING }],
      ['Eating on the doorstep', { activity: ACTIVITY_EAT, phase: PHASE_EATING }],
      ['Staying in: wants rest', { activity: ACTIVITY_STAY, phase: PHASE_ASLEEP, reason: NEED_REST + 1 }],
      ['Staying in', { activity: ACTIVITY_STAY, phase: PHASE_ASLEEP, reason: 0 }],
      ['On the doorstep: wants fun', { activity: ACTIVITY_DOORSTEP, phase: PHASE_STAYING, reason: NEED_FUN + 1 }],
      ['Walking to the plaza', { activity: ACTIVITY_PLAZA, phase: PHASE_GOING }],
      ['At the plaza: wants company', { activity: ACTIVITY_PLAZA, phase: PHASE_STAYING }],
      ['Walking home from the plaza', { activity: ACTIVITY_PLAZA, phase: PHASE_COMING }],
      ['Walking to the green', { activity: ACTIVITY_GREEN, phase: PHASE_GOING }],
      ['On the green: wants food', { activity: ACTIVITY_GREEN, phase: PHASE_STAYING, reason: NEED_HUNGER + 1 }],
      // A reason is the life system's and goes stale once the blob turns to work, so it shows for free time alone.
      ['At work', { activity: ACTIVITY_WORK, phase: PHASE_WORKING, reason: NEED_COMPANY + 1 }],
    ];
    expect(words.map(([, reply]) => doingOf(reply))).toEqual(words.map(([text]) => text));
  });

  it('names the chat partner, and shows no name for a chat whose partner has left', () => {
    const partner = 12;
    expect(doingOf({ partner, partnerKey: partner })).toBe(`Chatting with ${personName(partner)}`);
    // The worker answers no partner once the chat is over or the partner is gone, whatever key was there, and the card falls back to
    // what the blob is doing.
    expect(doingOf({ partner: -1, partnerKey: partner })).toBe('At the plaza: wants company');
  });

  it('feels the strongest need past three fifths of its range, and is content under that', () => {
    const feelingOf = (needs: number[]): string => rowsOf({ ...AT_PLAZA, needs }).Feeling;
    expect(feelingOf([45_000, 20_000, 10_000, 60_000])).toBe('Lonely');
    expect(feelingOf([50_000, 20_000, 10_000, 30_000])).toBe('Hungry');
    expect(feelingOf([0, 50_000, 0, 0])).toBe('Tired');
    expect(feelingOf([0, 0, 40_000, 0])).toBe('Bored');
    // 60% of 65,535 is 39,321, and a need on it is not yet past.
    expect(feelingOf([39_321, 39_321, 39_321, 39_321])).toBe('Content');
    expect(feelingOf([39_321, 39_322, 39_321, 39_321])).toBe('Tired');
  });

  it('words the needs as whole percents of their range', () => {
    expect(rowsOf({ ...AT_PLAZA, needs: [0, 32_768, 65_535, 13_107] }).Needs).toBe('Hunger 0%, rest 50%, fun 100%, company 20%');
  });

  it("words each trait only when it is in the byte's low or high third, and a blob with none as easygoing", () => {
    const personalityOf = (traits: number[]): string => rowsOf({ ...AT_PLAZA, traits }).Personality;
    expect(personalityOf([200, 128, 40])).toBe('Sociable, settled');
    expect(personalityOf([10, 255, 171])).toBe('Reserved, a homebody, restless');
    expect(personalityOf([128, 128, 128])).toBe('Easygoing');
    // 86 and 170 are the middle's ends.
    expect(personalityOf([85, 86, 170])).toBe('Reserved');
    expect(personalityOf([170, 86, 171])).toBe('Restless');
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
