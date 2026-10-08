# M5.2 Ageing and social ties: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Ageing (Calendar):**
  - one year of age per 112-day year, with real lifespans of decades;
  - a birthday is the day of the year a person was born, drawn for the starting population, so nobody ages all at once on Spring 1;
  - birth, death, marriage and migration hazards by age convert exactly as 1 − (1 − p)^(1/112) into build-time tables of 32-bit thresholds, each tested with one keyed draw;
  - children grow up in 18 years, about 2,000 days.
- **Births, partners and households.** Partner candidates are weighted by how many customs they share, and never by hue (R8).
  - The weight is an own-culture preference of 0.2, plus 0.1 per own custom kept.
  - It is calibrated to the prototype's exogamy bands.
  - M3.7's transmission harness is retired here: births now call `sim-culture`'s transmission for real.
- **The friend network (R1):**
  - a fixed-degree network per agent, with ties formed at work, home and school;
  - rumours and fear spread along it, contagion runs through it, and Schelling moves follow it;
  - fear rumours come from M4's crimes.
- **Culture-blind housing (R8):**
  - housing and Schelling moves never read culture;
  - any kin placement is a labelled knob, off by default, shown with the dissimilarity index and the place-driven disparity monitor;
  - round 1's Schelling known-answer test stays on neutral colours;
  - culture dissimilarity above 0.2 raises a flag.
- **Adoption sources:**
  - the friend network is an optional source for M3.7's adult adoption, with district counts the default;
  - festival contact stays transient and builds no lasting ties, unless an employment-by-culture audit also runs (R8).
- **M4.4's stand-in contacts** are replaced by this network. Re-run M4.4's LS and trust checks.

## Packages and files

- `packages/sim-core`:
  - `src/demography/ageing.ts`, `src/demography/births.ts`, `src/demography/deaths.ts` and `src/demography/partners.ts`;
  - `src/social/network.ts`, `src/social/rumours.ts` and `src/social/contagion.ts`;
  - `src/housing/schelling.ts`, guarded.
- `packages/sim-core/scripts/hazards.ts`: the age-hazard tables on the 112-day year.
- `packages/sim-culture/src/partner-weight.ts`: shared-customs weighting, called only by partner matching, which is not a guarded decision.
- `apps/web`: the dissimilarity index and the disparity monitor in the developer panel.

## Interfaces and data

- **Agent columns:**
  - `birthDay` (Int32 tick of birth) and `birthdayOfYear` (Uint8, 0–111);
  - `partner` (Int32, −1 for none);
  - `friends` (a fixed block of `Int32` per agent, degree to set in the step plan, about 8).
- **Hazard tables:** `Uint32Array` thresholds per age year per hazard.
- **Branch replay:** M5.1's fork identity, unchanged.

## Method and sources

- **Ageing and hazards:** [calendar.md](../../../calendar.md), "Rescaling rules".
- **Friend network, rumours, contagion and Schelling:** [R1 full report](../../../../research/round-1-baseline/full-report.md).
- **Partner weights, exogamy bands, culture-blind housing and the 0.2 flag:** [R8 transmission notes](../../../../research/round-8-cultures/notes/transmission.md), and the [R8 summary](../../../../research/round-8-cultures/summary.md)'s settled decisions: no residential clustering, and partners weighted by shared customs.

## Tests for the exit checks

- `age pyramid in band`: over 20 seeds × 100 years, each age band's share stays within its preset's band, set in the step plan from the calibrated demography.
- `festivals spread across the seasons`: for every culture over 20 seeds, no season holds more than half of its festival days.
- `branch replays identically`: as in M5.1, now with births, deaths and moves on.
- `Schelling known answer on neutral colours`: round 1's test reproduces its segregation level with neutral colours.
- `exogamy in band`: exogamy rises from the first generation to the second, and lands in the prototype's bands with the 0.2 + 0.1 weighting.

## Risks and unknowns

- **Real lifespans need long runs** to show generations: 18 years is about 2,000 days. Use skip-ahead for demographic checks.
- **Network memory:** 8 friends × 4 bytes × 100k agents is 3.2 MB. Measure it against the 256-bytes-per-agent budget.
- **Schelling moves can cluster by culture through place** even when blind. The dissimilarity flag and disparity monitor report it; never fix it by making moves culture-aware.

## Open questions

- **Measure:** How many of the 256 bytes per agent remain after M4 and M5? Round 8 counted about 176 B with culture, and 8 friends add 32 B, with partner and birth columns 9 B more (computed). Suggested: a test that sums every agent column and fails above 256 B. Needed before: the step plan.
- **Measure:** Can 20 seeds × 100 years run nightly? A century is about 16.1 million ticks per seed, or 24 hours at the 5.3 ms budget for 10k agents (computed). Suggested: if deaths read only age hazards, run the pyramid on the day-boundary demography alone, 11,200 steps a century. Needed before: the step plan.
- **Research:** Do the prototype's exogamy bands hold with similar culture shares, not one 60% culture? M5.5 re-runs round 8's transmission bands for that reason, and these bands come from the same runs (inference). Suggested: re-run the prototype with equal shares before fixing the band. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** ageing and the hazard tables first, so the pyramid check runs alone. Then births with real transmission, partners, the friend network, rumours and fear, and Schelling moves last.
- **Reuse:** M5.1's fork identity, M3.7's transmission, M4's crime events as rumour sources, and M4.4's LS and trust checks, re-run on the real network.
- **Keep it simple:** no tie strengths, weights or decay until a check needs them; a tie exists or it does not.
- **Pitfalls:** form ties and partners plan-then-apply, proposing from a snapshot and settling clashes in keyed order, so results match for 1–4 workers. Commit the generated hazard tables with a hash test. The household move after a match stays culture-blind; only the candidate weight reads customs.
- **Hard and easy parts:** order-free tie formation under a fixed degree needs the most care. Ageing and the tables are mechanical.
