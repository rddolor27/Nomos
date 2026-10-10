import { SUPPLIERS } from '../agents/store.ts';
import { TIER_AGENTS, TIER_FIRMS, type Tier } from '../memory/tiers.ts';
import { PPM, mulPpm, mulPpmUp } from '../money/ppm.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';

// Lengnick's Table 1 as the replication transcribes it (R2 Key Question 6), and the start, in whole numbers: ppm for rates
// and cents for money. The paper's symbols: psi_price priceSearchPpm, xi cheaperPpm, psi_quant stockoutSearchPpm, beta
// jobSearches, pi onJobSearchPpm, alpha consumptionPowerPpm, gamma wageCutMonths, delta wageStepPpm, phi stockLowPpm and
// stockHighPpm, phi_p - 1 markupLowPpm and markupHighPpm, vartheta priceStepPpm, theta priceChancePpm, lambda
// unitsPerWorkerDay and chi bufferPpm. The city mechanisms (M2.3) have no symbol: slowSearcherPpm, slowJobSearches,
// shortPayExitPpm and markupClamp, which LENGNICK leaves off.
export interface EconomyParams {
  readonly households: number;
  readonly firms: number;
  readonly priceSearchPpm: number;
  readonly cheaperPpm: number;
  readonly stockoutSearchPpm: number;
  readonly jobSearches: number;
  // The share of people, fixed for life and drawn from the person alone (labour/search.ts), who visit only slowJobSearches
  // firms a month while unemployed, where everyone else visits jobSearches. 0 makes nobody slow.
  readonly slowSearcherPpm: number;
  readonly slowJobSearches: number;
  readonly onJobSearchPpm: number;
  readonly consumptionPowerPpm: number;
  readonly reservationCutPpm: number;
  readonly wageCutMonths: number;
  readonly wageStepPpm: number;
  readonly stockLowPpm: number;
  // The excess over a month's demand, like the markups, because mulPpm takes 0 to 1,000,000 ppm.
  readonly stockHighPpm: number;
  // The excess over 1, for the same reason.
  readonly markupLowPpm: number;
  readonly markupHighPpm: number;
  // 1 stops a price step at the edge of the markup band, 0 (Lengnick's rule) lets the band only gate a step.
  readonly markupClamp: number;
  readonly priceStepPpm: number;
  readonly priceChancePpm: number;
  readonly unitsPerWorkerDay: number;
  readonly bufferPpm: number;
  // Units; 0 turns the floor off, as it does exit below.
  readonly demandFloor: number;
  readonly idleMonthsToExit: number;
  // A firm with workers that paid them under this share of its wage at a month's end exits; 0 turns it off (A15).
  readonly shortPayExitPpm: number;
  // A month's issue as a share of the money stock; 0 is closed money.
  readonly fiatIssuePpm: number;
  readonly openingCash: number;
  readonly openingWage: number;
  readonly openingPrice: number;
  // Days to discard before measuring a run (Ruling 9); the sim never reads it.
  readonly burnInDays: number;
}

export const LENGNICK = Object.freeze<EconomyParams>({
  households: 1_000,
  firms: 100,
  priceSearchPpm: 250_000,
  cheaperPpm: 10_000,
  stockoutSearchPpm: 250_000,
  jobSearches: 5,
  slowSearcherPpm: 0,
  slowJobSearches: 5,
  onJobSearchPpm: 100_000,
  consumptionPowerPpm: 900_000,
  reservationCutPpm: 100_000,
  wageCutMonths: 24,
  wageStepPpm: 19_000,
  stockLowPpm: 250_000,
  stockHighPpm: 0,
  markupLowPpm: 25_000,
  markupHighPpm: 150_000,
  markupClamp: 0,
  priceStepPpm: 20_000,
  priceChancePpm: 750_000,
  unitsPerWorkerDay: 3,
  bufferPpm: 100_000,
  demandFloor: 63,
  idleMonthsToExit: 3,
  shortPayExitPpm: 0,
  fiatIssuePpm: 0,
  openingCash: 310_000,
  openingWage: 142_800,
  openingPrice: 2_500,
  // Measured here (`economy --burn-in --seeds 5 --days 20000`: seeds 42-46, Node 24.18.0, 10 October 2026): MSER-5 cut
  // 5,775 days of the mean price and 6,595 of the unemployment share, and 1.5 x 6,595 rounds up to 9,893.
  burnInDays: 9_893,
});

const FIELDS = Object.keys(LENGNICK) as (keyof EconomyParams)[];
// R1 caps a month's fiat issue at 1% of the money stock.
const MAX_FIAT_ISSUE_PPM = 10_000;
// A firm's monthsFull and idleMonths are Uint8Array counters.
const MAX_MONTH_COUNT = 255;

export function checkParams(params: EconomyParams, tier: Tier): void {
  for (let f = 0; f < FIELDS.length; f++) checkField(FIELDS[f], params[FIELDS[f]]);
  requireBetween('households', params.households, 1, TIER_AGENTS[tier]);
  requireBetween('firms', params.firms, SUPPLIERS, TIER_FIRMS[tier]);
  requireBetween('fiatIssuePpm', params.fiatIssuePpm, 0, MAX_FIAT_ISSUE_PPM);
  requireBetween('wageCutMonths', params.wageCutMonths, 0, MAX_MONTH_COUNT);
  requireBetween('idleMonthsToExit', params.idleMonthsToExit, 0, MAX_MONTH_COUNT);
  // Nobody reads slowJobSearches at a share of 0, so a grid may lower jobSearches under LENGNICK's unused 5.
  if (params.slowSearcherPpm > 0) requireBetween('slowJobSearches', params.slowJobSearches, 1, params.jobSearches);
  requireBetween('markupClamp', params.markupClamp, 0, 1);
  checkOpeningPrice(params);
}

// A rate is named for its unit, so a new ppm field is range-checked as soon as it is added.
function checkField(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a whole number of 0 or more, not ${value}`);
  }
  if (field.endsWith('Ppm')) requireBetween(field, value, 0, PPM);
}

function requireBetween(field: string, value: number, low: number, high: number): void {
  if (value < low || value > high) throw new RangeError(`${field} must be ${low} to ${high}, not ${value}`);
}

// A price sits markupLow to markupHigh above marginal cost, which is the wage over a worker's month of output (A3). The
// bounds round inward, so a whole price is inside only if it is inside the real band.
function checkOpeningPrice(params: EconomyParams): void {
  const wage = params.openingWage;
  const monthPrice = params.openingPrice * DAYS_PER_MONTH * params.unitsPerWorkerDay;
  const low = wage + mulPpmUp(wage, params.markupLowPpm);
  const high = wage + mulPpm(wage, params.markupHighPpm);
  if (monthPrice < low || monthPrice > high) {
    throw new RangeError(`openingPrice prices a month's output at ${monthPrice} cents, outside the band ${low} to ${high}`);
  }
}
