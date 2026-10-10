import type { EconomyParams } from './params.ts';

// The city preset (M2.3): LENGNICK's fields written out, with the mechanisms round 2's targets need switched on. A field
// that differs carries its source; the rest are Lengnick's Table 1 and the replication's start.
export const CITY = Object.freeze<EconomyParams>({
  households: 1_000,
  firms: 100,
  priceSearchPpm: 250_000,
  cheaperPpm: 10_000,
  stockoutSearchPpm: 250_000,
  jobSearches: 5,
  // R2 KQ2: one 26% hazard leaves 15% of the unemployed out 27+ weeks against 27% observed, so some people search less.
  slowSearcherPpm: 100_000,
  slowJobSearches: 1,
  onJobSearchPpm: 100_000,
  consumptionPowerPpm: 900_000,
  reservationCutPpm: 100_000,
  wageCutMonths: 24,
  wageStepPpm: 19_000,
  // R2 KQ3: 0.8 to 1.6 months of stock, where retail holds 1.27.
  stockLowPpm: 800_000,
  stockHighPpm: 600_000,
  // R2 KQ3: retail gross margins of 26 to 33% put prices 1.36 to 1.50 over unit labour cost.
  markupLowPpm: 360_000,
  markupHighPpm: 500_000,
  // M2.3 Ruling 6: the band binds, so a step stops at its edge.
  markupClamp: 1,
  priceStepPpm: 20_000,
  priceChancePpm: 750_000,
  unitsPerWorkerDay: 3,
  bufferPpm: 100_000,
  demandFloor: 63,
  idleMonthsToExit: 3,
  // M2.3 Ruling 5: Mark-0's zero debt limit, where a firm that cannot pay its wage bill exits.
  shortPayExitPpm: 1_000_000,
  fiatIssuePpm: 0,
  openingCash: 310_000,
  openingWage: 142_800,
  // 3,200 x 63 is 1.41 x the 142,800 wage, inside the band.
  openingPrice: 3_200,
  burnInDays: 9_893,
});
