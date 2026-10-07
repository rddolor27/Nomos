# M2.1 Lengnick core: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Port Lengnick (2013)** as integer-cent systems in `sim-core`:
  - households hold cash, search for jobs and shop;
  - firms post prices and wages, hire and fire, produce, and enter and exit as in BAM;
  - a wholesale call auction clears trade between firms.

  Every payment is a ledger transfer, so Σ = 0 holds by construction.
- **Two money regimes:**
  - **closed:** a fixed money stock, under which household saving must average zero;
  - **fiat:** money issued through MINT at a rate set by the scenario, which is the only case with a saving-rate target.
- **Guarded folders (R8).** The code sits in `sim-core` folders, and labour, wages and wealth are among the folders round 8's guard covers. M0.6's dependency-cruiser and lint rules then keep culture out of them from the first line:
  - `labour/`, `wages/` and `wealth/` are guarded;
  - `firms/`, `market/` and `consumption/` are not, and only `consumption/` may read culture (M2.6).
- **Missing parameters (R2):**
  - ξ = 0.01: switch to a cheaper firm only if it is at least 1% cheaper;
  - ψ\_quant = 0.25: the chance of replacing a supplier that could not meet demand.
- **Integer-cent rounding rules,** written down and tested:
  - round buffers up and purchases down;
  - a price floor of 1 cent;
  - wages paid first;
  - liquidity shares computed once for the profit distribution;
  - every multiply by a rate through `mulPpm`.
- **Start prices inside 1.025–1.15 × w/63** (w ÷ (21 × λ) with λ = 3), so the rules don't drag prices at the start (R2).
- **Burn-in is measured, not assumed.** MSER-5 on the price index and unemployment picks the truncation point per run, instead of a fixed 1,000 months (R2).
- **Household cash holdings** start at a stated multiple of monthly wages. A money-velocity chart (consumption ÷ money stock) makes the choice visible (R2).
- **Month length is one constant.** It waits for the owner's decision, below. Known-answer tests count in the paper's months, whatever the calendar uses.

## Packages and files

- `packages/sim-core`, new folders:
  - `src/labour/` (search, hiring and firing) and `src/wages/` (wage setting), both guarded;
  - `src/firms/`: posted prices, inventory, production, and BAM entry and exit;
  - `src/consumption/`: Stone–Geary budgets and shop choice with ξ and ψ\_quant;
  - `src/market/wholesale.ts`: the call auction;
  - `src/economy/params.ts`: Lengnick's Table 1 plus ξ and ψ\_quant, and the regime;
  - `src/economy/mser5.ts`: MSER-5;
  - `src/economy/known-answers.ts`: the random-exchange, saving-half and Godley–Lavoie SIM models, run as tests.
- `tools/cli`: an `economy` command for headless runs, writing daily series.
- Agent and firm columns join `AgentStore` and a new `FirmStore`, preallocated like M0.2's store and documented in `sim-protocol`'s column layouts.

## Interfaces and data

- `FirmStore` columns:
  - `price`, `wage` and `cash` (cents, `Float64Array`);
  - `stock`, `employees`, `vacancies` and `demandLastMonth` (`Int32Array`);
  - `alive` (`Uint8Array`).
- Household columns in `AgentStore`: `employer` (`Int32Array`, −1 when unemployed), `reservationWage` (cents), and up to 7 suppliers in a fixed-size `Int32Array` block per household. Lengnick uses 7 trading links.
- `economyMonth(world)` runs at the month boundary, and `economyDay(world)` within M0.3's day slices.
- `params`: a frozen object of integers (ppm and cents). Rates never enter the sim as floats.

## Method and sources

- **Model, parameters and initial conditions:** [R2 economy calibration](../../../../research/round-2-follow-up/notes/economy-calibration.md), Key Question 6. It lists the replication's 3,100 / 25 / 1,428 starting values as its own choices, and about 20 specification ambiguities.
- **Benchmarks:** the same notes, Key Question 5:
  - Mark-0's phase table (R = η₊/η₋ against Θ), from MIT reference code;
  - BAM's validation targets (bam-engine, MIT);
  - Godley–Lavoie SIM.
- **MSER-5:** [R2 validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md), part 5.
- **Known answers:** random exchange gives Gini ≈ 0.5, saving half gives ≈ 0.27, and SIM goes 38.44 → 47.9 ([R1 full report](../../../../research/round-1-baseline/full-report.md)).

## Tests for the exit checks

- `runs 50 seeds × 20,000 days cleanly`:
  - no NaN or Infinity in any column;
  - Σ = 0 on every day;
  - under fixed money, mean household saving over the run is zero within one cent per household-month.

  The long run lives in a nightly job; the per-push suite runs 5 seeds × 2,000 days.
- `known answers`:
  - random exchange settles at Gini 0.50 ± 0.02;
  - saving half settles at 0.27 ± 0.02;
  - SIM's output goes from 38.44 to 47.9 within 0.1 after the government-spending step.
- `rounding rules`: unit tests for each rule, and a property test that 10,000 random month-ends conserve cents exactly.
- `start prices inside the band`: every firm's p₀ lies within 1.025–1.15 × w₀/63.

## Risks and unknowns

- **Owner decision first:** what a month is on the 112-day year. A 21-day month, as in the paper, gives 5⅓ months a year; a 28-day season gives 4.
- **Verify first:**
  - Lengnick's own figures and starting values;
  - the size of price changes;
  - a direct job-to-job rate;
  - headless runs per second.

  These decide the presets and the sensitivity budget.
- **Specification ambiguities.** Settle about 20 of them while porting, then record each ruling in the step plan and in `params.ts` comments, as "why" notes.
- **Burn-in may be long.** If MSER-5 truncates after more than about 1,000 months, the browser starts from a precomputed snapshot or a hidden fast-forward (R2).
