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

- `packages/sim-country` (`@nomos/sim-country`), new, under the sim rules and lints, with crime, police, labour, wages, wealth and migration code in folders of those names, which M0.6's culture wall guards:
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

## Open questions

- **Owner:** Do people by state carry the three age bands, the three wealth bands, both or neither? Each band set triples the people columns. Suggested: age bands only, since M7.3's youth hazard reads age and M7.5's wealth block holds the wealth groups. Needed before: the step plan.
- **Owner:** Does the national layer keep REG's government bills and interest, or only cash, as Model SIM does? Bills add a portfolio rule per settlement (λ₀–λ₂, R = 2.5%) that no exit check needs (R4 economy notes, part 7). Suggested: cash only, with M0.2's MINT as the one issuer. Needed before: the step plan.
- **Owner:** Do the optional equalisation grant and national police force ship now? R4 expects the uniform tax alone to move money toward a region in trouble, and could not source equalisation sizes. Suggested: defer both until a scenario uses them. Needed before: the step plan.
- **Owner:** How many kilometres does a map cell span? Spacing, route lengths, M7.3's 50–100 km commuting and M7.4's 290 km grain check need a scale; R4 assumed a country about 200 km across. Suggested: about 5 km (inference), so a 96-cell world spans 480 km (computed). Needed before: the step plan.
- **Design:** should the culture wall guard all of `packages/sim-country/src/**`? M7.2's hazards for offences, arrests, hires and migration, M7.7's `routes/patrols.ts`, M9.4's `villages/own-farm.ts` and this brief's police funding sit outside M0.6's named folders. Suggested: yes, guard the whole package except the culture block. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** integer SIM with no settlements, then two-region REG, then the store and daily flows, then the test generator at 1,000 settlements.
- **Reuse:** M0.2's ledger, account ranges, exact sum and stochastic rounding; M0.1's keyed draw; M0.6's lint profile and budget gate.
- **Keep it simple:** if the levels nest on one hexagonal lattice, its Delaunay graph is each site's six neighbours, so test support needs no triangulation code (inference). Skip Poisson-disc spacing unless a test needs it.
- **Pitfalls:** every rounded cent goes through an explicit rounding account, or Σ = 0 breaks (R4 economy notes, part 7). R4's integer SIM reached exactly 10,000 only from period 60, so the test runs to convergence. Reserve the store at start for the tier's settlement cap, since memory never grows.
- **Hard and easy parts:** order-independent flows and the rounding account need care; the table script, CSR arrays, Zipf sizes and Hamilton apportionment are mechanical.
