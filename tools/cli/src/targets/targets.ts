// M2.3's targets table. A band target holds when the 90% interval of its mean over seeds lies inside [low, high]
// (Ruling 10); an every-seed target holds when it is true on every seed; a reported measure has no claim. Tier 1 is the
// calibration filter, tier 2 ranks the points that pass it, and tier 3 is held back for corroboration (Ruling 12).
export type Target =
  | {
      readonly id: string;
      readonly tier: 1 | 2 | 3;
      readonly rule: 'band';
      readonly low: number;
      readonly high: number;
      readonly source: string;
    }
  | { readonly id: string; readonly tier: 3; readonly rule: 'every seed'; readonly source: string }
  | { readonly id: string; readonly tier: 'reported'; readonly rule: 'reported'; readonly source: string };

export const TARGETS = [
  { id: 'price_change_share', tier: 1, rule: 'band', low: 0.09, high: 0.12, source: 'R2 KQ1' },
  { id: 'job_finding', tier: 1, rule: 'band', low: 0.208, high: 0.312, source: 'R2 KQ2: 26%, +-20%' },
  { id: 'unemployment_mean', tier: 1, rule: 'band', low: 0.04, high: 0.09, source: 'BAM (R2 KQ5)' },
  { id: 'markup', tier: 1, rule: 'band', low: 1.36, high: 1.5, source: 'R2 KQ3' },
  { id: 'stock_months', tier: 1, rule: 'band', low: 0.8, high: 1.6, source: 'R2 KQ3' },
  { id: 'price_ratio', tier: 1, rule: 'band', low: 0.25, high: 4, source: 'R1' },
  { id: 'hires_rate', tier: 2, rule: 'band', low: 0.0264, high: 0.0396, source: 'R2 KQ2: 3.3%, +-20%' },
  { id: 'layoff_rate', tier: 2, rule: 'band', low: 0.008, high: 0.012, source: 'R2 KQ2: 1.0%, +-20%' },
  { id: 'job_to_job', tier: 2, rule: 'band', low: 0.01, high: 0.02, source: 'R2 KQ2 (inference)' },
  { id: 'exit_rate', tier: 2, rule: 'band', low: 0.0145, high: 0.0165, source: "R2 KQ3 at Ruling 2's year (computed)" },
  { id: 'long_spell_share', tier: 2, rule: 'band', low: 0.216, high: 0.324, source: 'R2 KQ2: 27% out 27+ weeks, +-20%' },
  { id: 'mean_spell_months', tier: 2, rule: 'band', low: 4.6, high: 6.9, source: 'R2 KQ2: 24.8 weeks is 5.7 months (computed), +-20%' },
  // Tier 2, a documented gap: under closed money cuts must balance raises, and R2's 2% comes from wages that grow (Ruling 12).
  { id: 'stayer_cut_share', tier: 2, rule: 'band', low: 0.016, high: 0.024, source: 'R2 KQ1: 2%, +-20%' },
  { id: 'unemployment_sd', tier: 3, rule: 'band', low: 0.01, high: 0.03, source: 'BAM; under 0.010 trips Ruling 14' },
  { id: 'phillips', tier: 3, rule: 'band', low: -0.5, high: -0.05, source: 'BAM' },
  { id: 'okun', tier: 3, rule: 'band', low: -0.98, high: -0.7, source: 'BAM' },
  { id: 'beveridge', tier: 3, rule: 'band', low: -0.65, high: -0.1, source: 'BAM' },
  { id: 'size_skew', tier: 3, rule: 'band', low: 1, high: 10, source: 'BAM; Lengnick reports 1.88 (R2 KQ1)' },
  { id: 'no_crisis', tier: 3, rule: 'every seed', source: 'Mark-0 at Theta = 0 (Ruling 14)' },
  { id: 'price_change_size', tier: 'reported', rule: 'reported', source: 'Rulings 13 and 15: mean ppm per change' },
  { id: 'above_markup_share', tier: 'reported', rule: 'reported', source: 'Ruling 15' },
  { id: 'visit_success', tier: 'reported', rule: 'reported', source: 'Ruling 13: the share of an unemployed searcher\'s visits that end in a hire' },
  { id: 'food_share', tier: 'reported', rule: 'reported', source: "M2.4: food's share of spending, against ICP 2021's upper-middle 18.6% (opened)" },
  { id: 'spoil_share', tier: 'reported', rule: 'reported', source: 'M2.4: the share of the portions made that spoiled' },
  { id: 'unmet_share', tier: 'reported', rule: 'reported', source: 'M2.4: the share of the portions wanted that went short' },
] as const satisfies readonly Target[];

export type TargetId = (typeof TARGETS)[number]['id'];
export type BandTarget = Extract<(typeof TARGETS)[number], { readonly rule: 'band' }>;
