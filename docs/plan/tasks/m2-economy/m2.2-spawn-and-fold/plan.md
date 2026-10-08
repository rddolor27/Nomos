# M2.2 Spawn and fold: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **A city starts from a ledger record and folds back into it exactly.** Spawn and fold are both pure functions of their inputs. Every agent transaction is a transfer, so the ledger stays exact across zoom-in and zoom-out ([R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), 3.5 and 3.6).
- **`spawnFromLedger(record, seed, time)`** fills the stores in this order:
  1. **Exact role counts** from the record: households by size, workers, unemployed and firm owners.
  2. **A keyed Fisher–Yates shuffle,** keyed by (seed, settlement, entry day, purpose), so the same day gives the same people in any run.
  3. **Households one at a time,** so members sit next to each other in agent index (R6).
  4. **Homes** from round 9's binary map (`MapV1` homes with capacity), filled in a keyed order up to capacity, rather than from LDtk (R9).
  5. **Jobs** matched to firm sizes from the record.
  6. **Cash apportioned exactly** from sector balances, with 12-bit lognormal weights (1–4,095) from a build-time table and M0.2's largest-remainder apportionment.
     - `floor(H·w/W)` is exact while H × 4,095 < 2^53.
     - Leftover cents go +1 along a keyed stride.
  7. **Posted prices** drawn around the record's price index from a build-time lognormal table.
- **`foldToLedger(state)`** returns exact sums by compartment and account, plus recent rates (hires, separations and price changes over the last month) for the aggregate tier.
- **No floats in the path.** Weights are integers and sums are exact. The only float is the price-index multiply, done through `mulPpm`.

## Packages and files

- `packages/sim-core`:
  - `src/spawn/spawn.ts` and `src/spawn/fold.ts`;
  - `src/spawn/tables.ts`, generated at build time by `scripts/spawn-tables.ts`: the 12-bit lognormal weight table and the price-dispersion table;
  - `src/spawn/record.ts`: the `SettlementRecord` type.
- `packages/sim-protocol`: the `SettlementRecord` layout, which M7's country tier reuses.
- `tools/cli`: a `spawn` command that times spawning and writes byte hashes, for the cross-runtime check.

## Interfaces and data

- `SettlementRecord`:
  - `population`, `households` by size (1–6+), `workers`, `unemployed`, and firms by sector and size;
  - sector balances in cents: households, firms, local government and police budget;
  - `priceIndex` in ppm.
  - The fields match M0.2's reserved account ranges.
- `spawnFromLedger(record: SettlementRecord, seed: number, time: number, map: MapV1, world: World): void` writes into the preallocated stores. It returns nothing and allocates nothing per agent.
- `foldToLedger(world: World): SettlementRecord`, with the recent rates attached.
- The draw purposes are constants in `src/spawn/streams.ts`: roles, shuffle, homes, jobs, cash and prices.

## Method and sources

- **Spawn and fold, keyed draws, exactness and timings:**
  - [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), part 3: "Own measurement: zoom-in and zoom-out", and 3.3–3.7 on zoom-in, fold, conservation and determinism;
  - prototype: [bench_spawn.mjs](../../../../research/round-4-multi-scale/prototypes/lod/bench_spawn.mjs). Its spawn took about 7 ms at 100k agents (measured there), and it is research code that must not be imported.
- **Households adjacent in index:** [R6 integration-cost notes](../../../../research/round-6-goods-and-wellbeing/notes/integration-cost.md), part 2.
- **Homes from the binary map:** [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md) and M0.4's `MapV1`.
- **MSER-5 for the burn-in comparison:** M2.1.

## Tests for the exit checks

- `spawn then fold is the identity`: for 1,000 random records (keyed), `foldToLedger(spawnFromLedger(r))` equals `r` in every people count and every cent.
- `same inputs, same city`:
  - the byte hash of every store after spawning matches in Node, Bun and Deno for 20 fixed (seed, record, time) cases;
  - CI runs the CLI under each runtime.
- `spawns fast`:
  - 100,000 agents spawn in ≤ 10 ms in Node, excluding map lookups;
  - the measurement is the fastest of 9 samples, in M0.6's budget gate.
- `spawned burn-in is no longer`: over 20 seeds, MSER-5's truncation point for a spawned city is no later than for M2.1's hand-built start.
- `households stay adjacent`: every household's members occupy one contiguous index range.

## Risks and unknowns

- **Deno is new to CI.** It needs its own setup step. If it cannot run the workspace's TypeScript as-is, run the CLI's bundled output.
- **Round 4's timing excluded map lookups and job matching,** but the 10 ms budget excludes only map lookups. Job matching by firm size may need a counting sort to stay inside it.
- **Records from M7's country tier** must use the same layout. Keep `SettlementRecord` in `sim-protocol` and version it.

## Open questions

- **Design:** M0.7 gives every blob a wallet, a ledger account opened with 100,000 cents. How does household cash relate to its members' wallets: a household account beside them, or their sum? Needed before: the step plan.
- **Owner:** Keep Deno in the cross-runtime check, or use M0.6's engine harness instead? Deno embeds V8, the engine Node already covers, so it adds a CI setup step but no new engine. Suggested: M0.6's five engines through its harness, with Deno dropped. Needed before: the step plan.
- **Measure:** Does job matching fit inside the 10 ms spawn budget? The exit check excludes only map lookups, while round 4's roughly 7 ms (measured there) left matching out too. Suggested: count it in, using a counting sort by firm size, and report it on its own line if it still misses. Needed before: building.
- **Measure:** What cash and price spreads keep a spawned city's burn-in no longer than the hand-built start's? The exit check compares the two, and neither spread is stated. Suggested: start narrow, with prices inside M2.1's band of 1.025–1.15 × w/63 and cash at M2.1's starting multiple, and widen only while the check holds. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** fold first, on M2.1's hand-built city, since it is a pure sum. Then spawn from a trivial record, the identity test over 1,000 keyed records, and the timing and cross-runtime hashes last.
- **Reuse:** M0.2's `apportion` and `apportionByStride`, which already give each entry 0 or 1 leftover cent; M0.4's `parseMap` for homes; M2.1's MSER-5.
- **Keep it simple:** fold keeps only what the record holds; anything else, such as supplier links and reservation wages, is drawn afresh on the next spawn.
- **Pitfalls:**
  - The 6+ household bucket hides its people count, so derive it from `population` minus the smaller households, and split it by a fixed rule.
  - Spawn must also draw each household's 7 supplier links, which the fill order above omits; key them like jobs.
  - Spawn and fold are tier switches, so they run only at the day boundary, after every planned flow has applied.
- **Hard and easy parts:** the 10 ms budget with matching inside is the hard part. Fold, the record type and the adjacency test are mechanical.
