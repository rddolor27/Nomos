# M7.3 Flows and villages: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Flows between settlements are planned, then applied (R4):**
  - **trade:** margin-driven per good, with losses and stock in transit;
  - **migration:** monthly, by expected wage over a gravity or radiation kernel;
  - **commuting:** cross-settlement wages within about 50–100 km;
  - **movers carry their cents,** so every flow is a ledger transfer.

  Plans read a day-boundary snapshot, and apply as integer additions in a fixed order.
- **Sparse graphs (R5):**
  - flows run on CSR graphs with at most 24 neighbours per settlement;
  - settlements update round-robin across a day's ticks;
  - dense matrices appear only between regions.

  Dense all-pairs flows at 10k settlements cost 376–564 ms a day and 400 MB (R5).
- **Village rules (R4):**
  - own production outside the cent ledger;
  - a market every 2–10 days, by density;
  - seasonal harvests into stores;
  - a rural youth migration hazard, which reads the age bands if M7.1 carries them;
  - a region tier for unlisted hamlets.
- **The country CI suite** collects every country check in one job:
  - daily identities and the integer-cent SIM known answer;
  - the five scaling tests, Zipf and spacing;
  - the trade band and gravity;
  - migration and commuting decay;
  - crime ratios, police staffing and response times.

## Packages and files

- `packages/sim-country`:
  - `src/graph.ts`: the CSR graph and round-robin scheduling;
  - `src/trade.ts`, `src/migration.ts` and `src/commuting.ts`;
  - `src/villages.ts`: markets, harvests and own production;
  - `src/regions.ts`: the region tier and dense region matrices.
- `packages/sim-country/test/country-suite/`: one test file per family of checks.
- `.github/workflows/country.yml`: the country suite. The 50-year runs are nightly.

## Interfaces and data

- **Flow plan:** fixed-size arrays per flow type of `(from, to, amount)`, filled from the snapshot and applied in index order.
- **Kernels:** gravity, `pop_i^a × pop_j^b / d^γ`, through integer tables; or radiation, from intervening population. The choice is a scenario setting, defaulting to the one that docks.
- **Region matrix:** dense `Float64Array` region × region flows, at most a few dozen regions.

## Method and sources

- **Trade, migration, commuting, villages, scaling, Zipf, crime by size and police:** [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), parts 1–6.
- **Sparse graphs, round-robin updates and the country budgets:** [R5 compute notes](../../../../research/round-5-performance/notes/compute.md), and the Performance budget in the [implementation plan](../../../implementation-plan.md#performance-budget).
- **Prototypes:** [R4 world map prototypes](../../../../research/round-4-multi-scale/prototypes/worldmaps/) and [R4 analysis](../../../../research/round-4-multi-scale/prototypes/analysis/). They are research code, never imported.

## Tests for the exit checks

- `country day within budget`: 10,000 settlements advance one day within 12 ms RM, and 1,000 within 1.5 ms. M0.6's budget gate has the country rows.
- `identities hold for 50 years`: every identity holds exactly every day over 20 seeds × 50 years. This runs nightly.
- `scaling`: on at least 30 settlements spanning three orders of magnitude:
  - the GDP-like exponent's interval overlaps 1.08–1.15 and rejects 1;
  - homicide-like and household exponents do not reject 1.
- `distributions and decay`:
  - Zipf's ζ stays within 0.9–1.2 for 50 years;
  - trade distance elasticity is −0.9 ± 0.2;
  - commuting decays at about −2;
  - migration runs at 3.6–5.5% a year.
- `crime and fiscal checks`:
  - urban-to-rural property victimisation is 3.4 ± 30%;
  - officers per 1,000 peak in towns under 10,000;
  - an export shock to one region is partly offset by its net fiscal inflow within the year.

## Risks and unknowns

- **Verify first:** FBI tables 16 and 70–74, BJS reporting by location, and Bettencourt 2007 with intervals. They set the crime, police and scaling bands.
- **12 ms at 10,000 settlements** was met only with WASM in some prototypes: 5.1–10.4 ms in JS and 4.7 ms in WASM. M7.5 ports the settlement model, and JS may need to fit at 1,000 first.
- **Kernel choice** changes migration patterns. Pick by docking, never by eye.
