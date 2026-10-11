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
  // R2 KQ2 needs a mix of hazards for long spells. M2.3's sweep point 232 makes 23% slow, holding job finding at 25% a
  // month (seeds 1-20); more raise unemployment, already near 9%, and spells stay shorter than R2's (a documented gap).
  slowSearcherPpm: 227_437,
  slowJobSearches: 1,
  // Sweep point 232's pi. Job-to-job moves run 2.7% a month against R2's 1-2% (a gap): at this gamma cuts leave many
  // paid under their reservation wage, and they search every month whatever pi is (inference).
  onJobSearchPpm: 127_732,
  consumptionPowerPpm: 900_000,
  reservationCutPpm: 100_000,
  // Closed money makes cuts balance raises, so gamma trades pay cuts against unemployment: 25 holds unemployment near 8.5%,
  // under BAM's 9%, while 15% of stayers see a cut a year against R2's 2% (M2.3 Ruling 12's documented gap).
  wageCutMonths: 25,
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
  // Prices change in about 10.6% of firm-months (R2 KQ1's 9-12%, seeds 1-20); a lower theta pins the markup at its 1.50
  // ceiling, and a higher one overshoots 12%.
  priceChancePpm: 220_000,
  unitsPerWorkerDay: 3,
  bufferPpm: 100_000,
  demandFloor: 63,
  idleMonthsToExit: 3,
  // Off until entry is designed (M2.3 Ruling 19): a re-entered row has no workers, so shop search never links a household
  // to it, and it pays under the exit line and exits again every month.
  shortPayExitPpm: 0,
  fiatIssuePpm: 0,
  // M2.4: the seven goods and food. { ...CITY, goods: 0 } is M2.3's city.
  goods: 1,
  openingCash: 310_000,
  openingWage: 142_800,
  // 3,200 x 63 is 1.41 x the 142,800 wage, inside the band.
  openingPrice: 3_200,
  // Measured here (`economy --preset city --burn-in --seeds 5 --seed 1 --days 40000`: seeds 1-5, 40,000 days, Node 24.18.0,
  // 11 October 2026, exits off, goods on): MSER-5 cut 19,910 days of the mean price and 11,445 of the unemployment share,
  // and 1.5 x 19,910 is 29,865 (M2.3 Ruling 18). M2.3's city, without goods, cut 12,285 and 10,900.
  burnInDays: 29_865,
});
