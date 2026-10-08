# M5.6 Calibration sweeps: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Screen, then decompose (R2).**
  1. Run Morris screening over every policy and calibration parameter, to find the few that matter.
  2. Run Sobol indices on those few.

  Never vary one factor at a time, which misleads in interacting models.
- **SALib does the sampling and analysis, in Python.** Nomos exchanges plain text files with it:
  - SALib writes a sample matrix;
  - M2.3's design runner reads it and runs each row;
  - a script hands the per-run metrics back to SALib's analysers.
- **Calibrate against patterns, holding one or two out.** Fit to the stylised facts from M2.3 and M4.3, then check the held-out patterns as a test of the fit (pattern-oriented modelling).
- **City size is a factor (R4).**
  - Sweeps include at least four sizes from 1,000 to 100,000 agents.
  - Every run keeps its daily flow logs, so the same runs train M7.2's country emulator without re-running.

## Packages and files

- `tools/sweeps/`, new:
  - `sample.py`: SALib Morris or Saltelli sampling → `samples.txt`;
  - `analyse.py`: SALib analysis of `metrics.txt` → indices as JSON and Markdown;
  - `problem.json`: parameters, ranges and the size factor.
- `tools/cli`: `design --samples samples.txt`, which runs each row with M2.3's columnar logs plus a `metrics.txt` row per run.
- `tools/requirements.txt`, from M0.4: SALib, pinned.

## Interfaces and data

- **`samples.txt`:** one row per run, with one column per parameter in `problem.json`'s order, as plain decimal text.
- **`metrics.txt`:** one row per run, with fixed metric columns: Gini, unemployment, prices, theft, clearance, LS and so on.
- **Flow logs:** M2.3's columnar format, unchanged, so M7.2 reads them directly.

## Method and sources

- **Morris, Sobol, LHS and why one-at-a-time misleads; tools; calibration methods:** [R2 validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), parts 2 and 3.
- **City size as a factor, and logs that train the emulator:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 4.

## Tests for the exit checks

- `emulator fitter reads the sweep logs without conversion`: M7.2's fitter, or its schema test if M7.2 is not built yet, loads a sweep's logs directly and finds every column it needs.
- `sweeps are reproducible`: the same `samples.txt` gives byte-identical `metrics.txt` on 1 and 4 threads.
- `held-out patterns hold`: after calibration, the one or two held-out patterns pass as estimate claims.

## Risks and unknowns

- **Cost.** Sobol needs N × (2k + 2) runs. Screening with Morris first keeps k small, and the step plan sets N from measured runs per second.
- **Python in CI:** the sweeps run in the nightly job or by hand, never per push.
- **The size factor multiplies cost.** Use the smallest sizes for screening, and all four only for the final Sobol run.

## Open questions

- **Owner:** Which one or two patterns are held out of the fit? Choosing them after seeing results would bias the check. Suggested: fix them in `problem.json` before the first sweep, such as M4.3's 10-year re-arrest rate. Needed before: the step plan.
- **Measure:** How many design-runner runs per hour does a CI runner manage at each city size? Sobol needs N × (2k + 2) runs, so N, k and the sizes used in screening follow from it. Suggested: time one run per size before writing `problem.json`. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the samples, runs and metrics loop on two parameters first. Then Morris over all, Sobol on the few that matter, and the size factor last.
- **Reuse:** M2.3's design runner and columnar logs, M1.1's claims for the held-out checks, and M0.4's `tools/requirements.txt` for pinning SALib.
- **Keep it simple:** no Python bindings into the sim and no sweep service; the CLI command and two scripts are the whole tool.
- **Pitfalls:** convert each sampled decimal to the sim's integer units with one rounding rule. Log the integer used, so each run records what actually ran. Parameter order lives in `problem.json` only.
- **Hard and easy parts:** choosing parameter ranges for Morris needs judgement; the file plumbing is mechanical.
