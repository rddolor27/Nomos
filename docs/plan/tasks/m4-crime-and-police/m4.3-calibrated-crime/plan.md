# M4.3 Calibrated crime: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Log first, then calibrate.** Every district logs per day:
  - true and recorded offences, arrests and releases;
  - the top-5% concentration share.

  The logs extend M2.3's district flow logs and feed the design runner's sweeps over seeds, city sizes, police shares and unemployment shocks (R4).
- **Hotspot export and import.** The field is exported and imported as a 32×32 `Uint16` grid (2 KB), so a district that folds to the aggregate tier keeps its hotspots. M9 upsamples it on revisits (R4).
- **Capture and clearance (R2):**
  - tune realised arrests so clearances per true theft land near 3–7%, and robbery near 20%;
  - consider damping Epstein's perceived risk if offending over-reacts to single arrests.
- **Trip lengths and displacement (R2):**
  - offenders travel exp(−d/λ) per cell, with λ drawn per offender;
  - about 25% of deterred offenders move nearby, and the rest desist.
- **Reporting and legitimacy (R2):**
  - reporting rates vary by crime type within a 2.5× band between districts;
  - legitimacy falls with arbitrary arrests and lowers reporting;
  - separate switches for reporting bias and patrol feedback let each feedback be turned off and studied alone.
- **Scale effects (R4):**
  - targets per offender grow with density, and detection falls with anonymity;
  - each channel's share of offending is logged;
  - a police reaction-delay parameter serves M9's district tier.
- **Food theft (R6):**
  - one offend option whose gain rises with unmet food need, measured by M3.5's missed meals and tally;
  - it sits inside the opportunity-based utility;
  - LS never enters the offend utility, and no agent ever becomes a criminal type.

## Packages and files

- `packages/sim-core`:
  - `src/crime/logs.ts`: district counters and the concentration share from a histogram;
  - `src/crime/field-io.ts`: the 32×32 `Uint16` export and import;
  - `src/crime/trips.ts` and `src/crime/displacement.ts`;
  - `src/police/reporting.ts` and `src/police/legitimacy.ts`;
  - `src/crime/food-theft.ts`.
- `src/economy/presets/city.ts` gains the calibrated crime parameters.
- `tools/analysis/crime_targets.py` reads the design runner's logs and prints each target and band.

## Interfaces and data

- **District crime row:** per district per day, `trueOffences`, `recordedOffences`, `arrests`, `releases` and `top5Share` (ppm), plus each channel's share: density, anonymity and food.
- **Field grid:** `Uint16Array(32 * 32)`, scaled so the district's maximum maps to 65,535, with the scale stored beside it.
- **Switches:** `reportingBias: boolean` and `patrolFeedback: boolean` in the scenario settings, logged in each run's `meta.json`.

## Method and sources

- **Police elasticities, clearance rates, reporting, concentration, journeys, displacement, feedback and validation targets:** [R2 crime notes](../../../../research/round-2-follow-up/notes/crime-policing-calibration.md), Q1–Q10, where Q10 confirms the re-arrest figures.
- **Crime by settlement size, and Glaeser and Sacerdote's bound:** [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 5.
- **Crime fields across detail levels:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 4.
- **Food theft and opportunity, never a criminal type:** the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md) and [R6 Norland notes](../../../../research/round-6-goods-and-wellbeing/notes/norland-prior-art.md), part g and the recommendation.

## Tests for the exit checks

- `tripling police cuts theft by about 15%`: a comparison claim on 50 paired seeds. True theft falls by 15% ± 5%, and the claim Holds.
- `tipping test`: sweeping police from 0.05% to 0.75% of the population, theft's slope near the default is under a third of its slope at the lowest staffing.
- `concentration`: 50% of crime falls in 2–6% of cells. Recorded crime is more concentrated than true crime when patrols follow records.
- `re-arrest`: cumulative re-arrest runs about 43%, 66% and 82% at 1, 3 and 10 years, each ± 5 points.
- `district logs sum to city totals`: exactly, every day. Recorded never exceeds true on any district-day.
- `field survives export and import`: after a round trip, the top-5% share is within 0.05.
- `size sweep`: across 1,000–100,000 agents, loot and detection explain at most about 45% of the per-capita theft gradient (Glaeser and Sacerdote's bound).
- `theft persists at full employment`: true theft stays above zero on paired seeds with unemployment at zero.

## Risks and unknowns

- **Verify first (from M4.2):** NCVS 2024 reporting and FBI 2025 clearance by crime type. They set the capture and reporting constants here.
- **Targets interact.** Clearance, displacement and concentration share parameters. Tune them in a design-runner sweep with Morris screening first (M2.3), never one at a time.
- **Long horizons:** re-arrest at 10 years needs 1,120 days per seed of history. Run it in the nightly job.

## Open questions

- **Owner:** Add a peer-effect channel, so loot and detection stay under about 45% of the size gradient? Round 4 puts the rest on composition and social multipliers, but density and anonymity are the only size channels listed here (R4 economy notes, part 5). Suggested: measure the shares in the size sweep first, and add an Epstein-style peer term only if composition cannot carry the rest. Needed before: the step plan.
- **Measure:** How many seeds and agents can the 10-year re-arrest check afford? Each seed's 1,120 days are about 1.6 million ticks, or 2.4 hours at the 5.3 ms budget for 10k agents (computed). Suggested: size it from measured ticks per second, so each cohort holds a few hundred releases (unsourced estimate). Needed before: the step plan.
- **Research:** Do NCVS 2024 reporting, FBI 2025 clearance by crime type, and Glaeser and Sacerdote's 1/4 and 1/5 shares hold when opened? They set constants and the 45% bound, and the last is snippet-only (R4). Suggested: open all three before tuning. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the district logs first, since every target reads them, with the field export beside them; then trips and displacement, reporting and legitimacy, then food theft. Tune last, in one sweep.
- **Reuse:** M2.3's design runner, Morris screening and district flow logs, M3.5's missed meals, and M4.1's registry for the new thresholds.
- **Keep it simple:** measure the 45% bound with paired runs that freeze loot and detection at the smallest size's values. The share of the gradient that vanishes is theirs; logged channel shares alone cannot decompose it.
- **Pitfalls:** date each recorded event by its offence's day and district, or a late report makes recorded exceed true on a district-day. At 1,000 agents, 0.05% is half an officer (computed), so run the tipping sweep at 10k or more and log the realised count.
- **Hard and easy parts:** tuning clearance, displacement and concentration together is the hard part. The logs, the 2 KB field round trip and the district sums are mechanical.
