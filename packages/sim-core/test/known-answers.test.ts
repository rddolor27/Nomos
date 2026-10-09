import { describe, expect, it } from 'vitest';
import { draw2 } from '../src/random/draw.ts';
import { addValue, createHistogram, giniPpm } from '../src/money/histogram.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { createLedger, issue, retire, transfer, walletAccount, type Ledger } from '../src/money/ledger.ts';
import { PPM, mulPpm } from '../src/money/ppm.ts';
import { reserveArena } from '../src/memory/arena.ts';

// Economies with known outcomes and no Lengnick in them (R1), so a fault here lies in the ledger or the Gini.
const SEED = 42;
const PARTNER_STREAM = 1;
const SHARE_STREAM = 2;
const WALLETS = 10_000;
const START_CENTS = 100_000;
const ROUNDS = 200;
const SAVE_HALF_PPM = 500_000;
// 10,000 wallets keep the Gini's sampling spread near 3,000 ppm, so this is about 7 spreads (computed).
const GINI_MARGIN_PPM = 20_000;

const CENTS_PER_UNIT = 10_000;
const G_CENTS = 20 * CENTS_PER_UNIT;
const THETA_PPM = 200_000;
const ALPHA1_PPM = 600_000;
const ALPHA2_PPM = 400_000;
const PERIODS = 200;
const SIM_MARGIN_CENTS = CENTS_PER_UNIT / 10;

function expectWithin(actual: number, expected: number, margin: number): void {
  expect(Math.abs(actual - expected), `${actual} against ${expected}`).toBeLessThanOrEqual(margin);
}

// Each keeps savingPpm of its cash and a takes sharePpm of the pooled rest. The one transfer from a to b is negative
// when b pays a.
function exchange(cash: Ledger, a: number, b: number, sharePpm: number, savingPpm: number): void {
  const keptA = mulPpm(cash.balance[a], savingPpm);
  const keptB = mulPpm(cash.balance[b], savingPpm);
  const pool = cash.balance[a] - keptA + (cash.balance[b] - keptB);
  transfer(cash, a, b, cash.balance[a] - (keptA + mulPpm(pool, sharePpm)));
}

// Each round, every wallet starts one exchange with a keyed partner other than itself.
function giniAfterExchanges(savingPpm: number): number {
  const arena = reserveArena(131_072);
  const cash = createLedger(arena, 0, WALLETS);
  for (let i = 0; i < WALLETS; i++) issue(cash, walletAccount(cash, i), START_CENTS);
  for (let round = 0; round < ROUNDS; round++) {
    for (let a = 0; a < WALLETS; a++) {
      const b = (a + 1 + (draw2(SEED, PARTNER_STREAM, round, a) % (WALLETS - 1))) % WALLETS;
      const sharePpm = draw2(SEED, SHARE_STREAM, round, a) % (PPM + 1);
      exchange(cash, walletAccount(cash, a), walletAccount(cash, b), sharePpm, savingPpm);
    }
    expect(checkCash(cash), `round ${round}`).toBe(OK);
  }
  const histogram = createHistogram(arena);
  for (let i = 0; i < WALLETS; i++) addValue(histogram, cash.balance[walletAccount(cash, i)]);
  return giniPpm(histogram);
}

// Y = C + G with C = α₁(1 - θ)Y + α₂H₋₁ solves to Y = (G + α₂H₋₁) / (1 - α₁(1 - θ)).
function outputCents(householdsCents: number): number {
  const leakagePpm = PPM - mulPpm(ALPHA1_PPM, PPM - THETA_PPM);
  return Math.floor(((G_CENTS + mulPpm(householdsCents, ALPHA2_PPM)) * PPM) / leakagePpm);
}

// Wages are C + G, so the firm nets zero. SIM's flows are simultaneous, so the firm pays wages before its sales land.
function simPeriod(cash: Ledger, households: number, firms: number): number {
  const yCents = outputCents(cash.balance[households]);
  const taxesCents = mulPpm(yCents, THETA_PPM);
  const consumptionCents = mulPpm(yCents - taxesCents, ALPHA1_PPM) + mulPpm(cash.balance[households], ALPHA2_PPM);
  issue(cash, firms, G_CENTS);
  transfer(cash, firms, households, consumptionCents + G_CENTS);
  retire(cash, households, taxesCents);
  transfer(cash, households, firms, consumptionCents);
  return yCents;
}

describe('the known-answer economies', () => {
  it('random exchange spreads equal cash to a Gini of 0.5', () => {
    expectWithin(giniAfterExchanges(0), 500_000, GINI_MARGIN_PPM);
  });

  it('saving half before each exchange holds the Gini near 0.27', () => {
    expectWithin(giniAfterExchanges(SAVE_HALF_PPM), 270_000, GINI_MARGIN_PPM);
  });

  it('Godley-Lavoie SIM follows its closed form to Y = 100 and household money of 80', () => {
    const cash = createLedger(reserveArena(65_536), 0, 2);
    const households = walletAccount(cash, 0);
    const firms = walletAccount(cash, 1);
    const yCents: number[] = [];
    for (let period = 0; period < PERIODS; period++) {
      yCents.push(simPeriod(cash, households, firms));
      expect(cash.balance[firms], `period ${period}`).toBe(0);
      expect(checkCash(cash), `period ${period}`).toBe(OK);
    }
    expectWithin(yCents[0], 38.46 * CENTS_PER_UNIT, SIM_MARGIN_CENTS);
    expectWithin(yCents[1], 47.93 * CENTS_PER_UNIT, SIM_MARGIN_CENTS);
    expectWithin(yCents[PERIODS - 1], 100 * CENTS_PER_UNIT, SIM_MARGIN_CENTS);
    expectWithin(cash.balance[households], 80 * CENTS_PER_UNIT, SIM_MARGIN_CENTS);
  });
});
