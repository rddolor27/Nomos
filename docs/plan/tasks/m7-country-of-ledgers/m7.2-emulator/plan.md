# M7.2 Emulator: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Build the docking test first.** Round 4 names the emulator the largest risk. The test comes before the emulator, so every fitting change is judged at once.
- **What the emulator is:** for each daily flow (hires, separations, repricing, offences, arrests, migration and so on), a hazard as a function of the settlement's state. It is fitted from M2's, M4's and M5's agent runs and their daily flow logs.
- **Two allowed forms,** both integer at run time:
  - a binned lookup table over a few state variables;
  - a fixed-point GLM, with coefficients in Q16 and the link function through a build-time table.

  Fitting runs offline in Python. The sim only reads the resulting tables.
- **Docking:** compare ledger trajectories with agent fold-ups on held-out runs. Pass means each flow's mean, variance and lag-1 autocorrelation sit inside the 5–95% seed band of the fold-ups. Concentration is compared too, where logged (R4).

## Packages and files

- `tools/emulator/`, new:
  - `fit.py`: reads M2.3's columnar logs and writes `tables/<flow>.json`;
  - `dock.py`: runs held-out agent runs and the ledger model on the same records, then compares;
  - `report.py`: a Markdown docking report per flow.
- `packages/sim-country/src/emulator/`: the table and GLM readers, and the hazards per flow.
- `packages/sim-country/scripts/emulator-tables.ts`: turns the fitted JSON into typed-array data at build time.

## Interfaces and data

- **Flow table:** `{ flow, form: 'binned' | 'glm', inputs: string[], bins?: number[][], coefQ16?: number[], linkTable?: string }`.
- **Hazard call:** `hazard(flow, settlement): number`, returning a ppm rate; M7.1's integer draws turn it into counts.
- **Docking report:** per flow, the agent band (5th and 95th percentile across seeds) and the ledger's value, for mean, variance and lag-1 autocorrelation, with pass or fail.

## Method and sources

- **Emulator design, docking and the alignment trade-off:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 4.
  - Dock by comparing ledger trajectories with agent fold-ups on means, variances, autocorrelations and concentration.
  - Accept a fit when it lies within the seed-to-seed spread of the agent model.
- **The logs:** M2.3's design runner, M4.3's crime logs and M5.6's size sweeps.
- **Calibration methods:** [R2 validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), part 3.

## Tests for the exit checks

- `every flow docks`: for each logged flow, the ledger's mean, variance and lag-1 autocorrelation fall inside the 5–95% seed band of agent fold-ups, on held-out runs at every logged city size.
- `tables are integer at run time`: the sim's emulator code passes the sim lint profile, with no floats in hazards.
- `fit is reproducible`: refitting from the same logs writes byte-identical tables.

## Risks and unknowns

- **Verify first:** the size of the alignment nudges with the real emulator. It decides whether shadow-canonical stays the default or pinned live cities are needed. The docking test gives a first reading here, and M9's divergence meter the final one.
- **Some flows may not dock** with a small binned table. Add inputs one at a time, judged by the docking test, and never add terms the logs can't support.
- **Logs must already exist.** M2.3, M4.3 and M5.6 must have kept their flow logs, in the shared columnar format.
