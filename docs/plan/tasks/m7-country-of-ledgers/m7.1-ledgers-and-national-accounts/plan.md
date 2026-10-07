# M7.1 Ledgers and national accounts: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The country runs as ledgers, not agents.** Each settlement is a record in a typed-array store, stepped once a day. Only a focused settlement spawns agents, through M2.2's spawn and fold.
- **The settlement store (R4):**
  - people by state: employed, unemployed, merchants and owners, police and jailed;
  - optionally, three age and three wealth bands (owner decision below);
  - integer-cent accounts by sector, on M0.2's reserved ranges, under the same Σ = 0 invariant;
  - price and wage indices, inventory, vacancies and firm counts;
  - true and recorded crime over a 21-day window, with arrests, a top-5% concentration share and the police mode.
- **Daily flows are integer stochastic draws (R4):**
  - below a mean of 8, use stochastic rounding;
  - otherwise, a 4,096-entry inverse-normal table plus `Math.sqrt`, which the sim rules allow;
  - price revisions are the share of firms repricing.
- **The national layer follows Godley–Lavoie Model REG (R4):**
  - one treasury, and a central bank as the only issuer;
  - a uniform national tax;
  - services and police paid per settlement, by Hamilton apportionment;
  - an optional equalisation grant;
  - local police, with an optional national force.
- **A terrain-free generator for tests (R4):**
  - Zipf sizes;
  - hexagonal or Poisson-disc spacing by level;
  - Gibrat growth with a reflecting floor;
  - a Delaunay → spanning tree → spanner route graph.

  This lets M7 run and be tested before M8's map exists. It is test code only: M8's country map replaces it, and `tools/worldgen` has no Delaunay step.

## Packages and files

- `packages/sim-country` (`@nomos/sim-country`), new, under the sim rules and lints:
  - `src/store.ts`: the settlement store and its column layout, documented in `sim-protocol`;
  - `src/flows.ts`: stochastic rounding and the inverse-normal path;
  - `src/national.ts`: treasury, central bank, tax, grants and police funding;
  - `src/known-answers.ts`: integer-cent SIM and REG.
- `packages/sim-country/scripts/inverse-normal.ts`: the 4,096-entry table, built at build time.
- `packages/sim-country/test/support/terrain-free.ts`: the test generator.

## Interfaces and data

- **Settlement columns:** `Int32Array` per people state, `Float64Array` integer-valued cents per sector account, `Int32Array` indices in ppm, and crime counters in a 21-slot ring.
- **`stepCountryDay(country): void`:** a fixed system order, allocating nothing.
- **Route graph:** CSR arrays (`offsets`, `targets` and `lengths`), with at most 24 neighbours per settlement (M7.3).

## Method and sources

- **Settlement records, daily flows, Model REG and the test generator:** the [R4 report](../../../../research/round-4-multi-scale/report.md), and [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), parts 4–5.
- **Prototypes:** [`sim_sfc.mjs`](../../../../research/round-4-multi-scale/prototypes/lod/sim_sfc.mjs) and [`bench_agg.mjs`](../../../../research/round-4-multi-scale/prototypes/lod/bench_agg.mjs). They are research code, never imported.
- **Zipf, spacing and Gibrat:** [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 2.
- **National accounts:** the same notes, part 7.

## Tests for the exit checks

- `integer-cent SIM reaches exactly Y = 10,000 = G/θ`: the steady state is exact in cents, with no tolerance.
- `REG balances`: the national and regional accounts sum to zero every day, and Hamilton apportionment of the services budget is exact.
- `flows are integer and keyed`: the same (seed, day) gives the same flows in any settlement visiting order.
- `inverse-normal table matches its generator`: the shipped table equals the build script's output.

## Risks and unknowns

- **Owner decision first:** whether people by state carry the optional three age and three wealth bands. M7.3's rural youth migration hazard and the calendar's age-based hazards would read an age split. Default: carry the age bands and skip the wealth bands until M7.5.
- **Model REG's parameters** need choosing for a fictional country. Start from the textbook values and record each choice.
- **This could start as soon as M0 lands,** so it may run in parallel with M1–M6, if the owner wants to.
