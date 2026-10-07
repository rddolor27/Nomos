# M4.5 Culture audit: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The audit is the fourth guard layer.** The package wall, the relabel test and the flip test catch code that reads culture. The audit catches what emerges anyway: differences caused by place, time and exposure (R8).
- **It runs headless in CI over 50 paired seeds × 20 simulated years,** in agent-level units, through M2.3's design runner.
  - At 1,440 ticks a day, 20 years is about 3.2 million ticks per seed (computed).
  - It is a nightly job, sharded across runners. One full run per day is enough.
- **Raw outcomes:** each culture's rates of true offending, victimisation, stops, wrongful stops, arrests and records, and its mean wealth decile, sit within 0.9–1.1 of the population rate. Each check uses the 90% interval of the ratio.
- **Treatment:** Mantel–Haenszel ratios on strata of place × time × visible cue stay within |ln ratio| ≤ 0.05, overall and by period.
  - Report by period, because a planted 1.25× evening stop bias read 1.075 over all periods but 1.269 within evening and night strata (R8).
  - Reporting and trust are logged by culture too.
- **Twins on the same seeds:**
  - a single-culture world;
  - a culture-blind twin, with preference shifts set to zero;
  - customs counterfactuals, such as all festivals moved to daytime.

  The twins attribute any raw gap to customs and exposure.
- **A failure means a bug or a missing stratum, never a quota to rebalance.** An exception passes only when a named place-time mechanism explains it, recorded in the audit report.

## Packages and files

- `tools/audit/`, new:
  - `run.ts`: drives the design runner over the paired seeds and twins;
  - `strata.ts`: exposure and event counters by culture × place × time × visible cue;
  - `mh.ts`: Mantel–Haenszel ratios with seed-level intervals;
  - `report.ts`: writes the audit report as Markdown into the CI artifacts.
- `packages/sim-core/src/audit/exposure.ts`:
  - counters written at the day boundary, and read only by the audit;
  - culture-blind code never reads them;
  - the counters live outside guarded folders, and the audit build alone enables them.
- `.github/workflows/nightly.yml`: the audit job.

## Interfaces and data

- **Stratum key:** (cell, period, visible cue), where the visible cue is "carrying goods" or not.
- **Exposure:** agent-ticks outdoors per stratum per culture.
- **Events per stratum per culture:** victimisation, stops, wrongful stops, arrests and reports.
- **Report:** per culture, each raw ratio with its 90% interval; the MH ratio overall and by period; twin comparisons; and every exception with its mechanism.

## Method and sources

- **Bands, strata, period reporting and the twins:**
  - the [R8 report](../../../../research/round-8-cultures/report.md), "Four test layers", layer 4;
  - [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part d: "Emergent-disparity audit".
- **Agent-level units:** a person-day chi-square flagged clean code falsely, because offending clusters within low-income agents (R8, measured there).
- **Kitagawa decomposition** for explaining gaps by exposure: the same notes and prototype [`guard_demo.mjs`](../../../../research/round-8-cultures/prototypes/customs/guard_demo.mjs).

## Tests for the exit checks

- `audit passes both bands`: the nightly report shows every raw ratio within 0.9–1.1 and every MH ratio within |ln| ≤ 0.05, or names the mechanism for each exception.
- `audit detects a planted bias`: with M4.1's planted 1.25× evening stop leak switched on, the evening-and-night MH ratio leaves the band. This proves the audit has power.
- `twins run on the same seeds`: each twin's paired seeds produce the same agents, jobs and homes as the main run, checked by spawn hashes.

## Risks and unknowns

- **Verify first:** the band (0.9–1.1), the equivalence margin (0.05) and the power over 50 paired seeds. All are proposals; power was shown only for one planted bias (R8).
- **Cost:** 50 seeds × 20 years × 4 worlds is heavy. If the nightly job overruns, audit 10 years and rotate seeds across nights, and record that in the report.
- **Emergent differences are shown, never hidden or "fixed"** by making police culture-aware. That would put culture into policing (R8).
