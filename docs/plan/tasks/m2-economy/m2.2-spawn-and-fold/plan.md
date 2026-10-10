# M2.2 Spawn and fold: step plan

> **For agentic workers:** use executing-plans, one task per agent, with test-driven-development inside each task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a city spawns from a ledger record and folds back into it exactly, in people and cents. It replays byte for byte in five engines, spawns 100,000 agents within 10 ms, and burns in no slower than M2.1's hand-built start.

**Architecture:**
- `spawn/`, a new guarded folder in `sim-core`, holds the record, homes, spawn and fold.
- A household is a row of the new `households/` folder: 1–6 blobs at adjacent indices that share a home. Each blob stays Lengnick's one-person household, so M2.1's day systems don't change.
- `spawnFromLedger` fills an empty world and rebuilds the economy's stationary structure, and `foldToLedger` sums it back.
- Tests, the engine harness, the budget gate and a long burn-in run call them. The worker doesn't yet.

**Spec:** [task.md](task.md); [interfaces.md](../../m0-pipeline/interfaces.md), "The world step", "Wallets" and "The economy"; and [M2.1's rulings](../m2.1-lengnick-core/plan.md#rulings), which stand. The method is [R4's architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), 3.3–3.7. This plan replaces the brief.

## Rulings

The owner let the coordinator settle M2.2's open questions. These rulings are the coordinator's, and the owner can overturn any of them.

1. **A household groups blobs, and each blob stays Lengnick's household.** This is how M2.2 changes M2.1's one blob per household.
   - A household is 1–6 blobs at adjacent indices that share a home.
   - Every blob still works or seeks work, shops and saves from its own wallet, so M2.1's day systems are unchanged.
   - A household's cash is the sum of its members' wallets, computed when needed and never stored, as M2.1's Ruling 3 recommended.
   - `startEconomy` keeps one blob per household, and now writes household rows with no home.
   - M2.4 and M2.5 decide how members pool, since budgets per adult and balance sheets need it. Until then, "household" in the economy code means a blob.
   - Cost if wrong: M2.5 moves consumption onto household rows, which its balance sheets need anyway.
2. **Household rows hold only `size` and `home`.** Household h's members follow household h − 1's, so no first-member column or per-blob index exists until M2.5 or M3 needs one. A household has at most 6 people, so the record has no "6+" bucket hiding its people.
3. **`spawn/` is guarded.** Spawn decides homes, jobs and cash, so `spawn` joins the culture wall's folders.
   - M2.6's brief puts culture spawning in `spawn/culture.ts`. It must move to a folder that may read culture, and run after spawn. That keeps culture independent of home, job and cash by construction.
   - M2.5's `spawn/wealth.ts` fits as briefed.
4. **The ledger record is a 14-field `Float64Array`** (Task 1): households of 1–6 people, employed, unemployed, firms, household and firm cash, mean posted price and wage, and firm stock.
   - Every field round-trips exactly, so the price index is a mean in cents rather than a ppm index.
   - Left out until something reads them: firm sectors (M2.4), local government and police balances (M4–M5), and recent rates (M7).
   - So are a version field and a `sim-protocol` layout, until a record is saved or crosses a worker (M7, M9).
   - Its `LEDGER_*` names keep it apart from `world.record`, M0.3's day record.
5. **Spawn fills an empty, laid-out world, and MINT issues the record's cash. Fold only reads.** Moving money between tiers is M9's.
6. **Draws:** a new stream, `SPAWN_DRAW` = `AGENT_SALT + 13` (0x10D), apart from `populate`'s `SPAWN`. Every draw keys on key = `draw2(seed, SPAWN_DRAW, settlement, day)`, then (index, purpose). The same place on the same day so gives the same people in any run (R4 3.3).
7. **Spawn rebuilds the economy's stationary structure, because the burn-in check fails without it** (the probe below).
   - Firm sizes come from a lognormal table with σ 0.5. Each blob's 7 links are drawn by a firm's workers + 1, since a stationary firm's links follow its size.
   - Stock and firm cash split by workers + 1.
   - Prices spread around the mean with σ 0.025, every wage is the mean, and cash spreads per blob with σ 0.07.
   - Round 4's σ 0.9 cash weights gave a Gini of 0.47 (measured there), against 0.03–0.05 in Lengnick's stationary state. M2.5's wealth tables replace the cash table.
8. **The tables:** three 256-entry tables of 12-bit weights (1–4,095) join the existing generator, `scripts/tables.ts`, rather than a second script.
9. **Homes** (Task 3):
   - `createHomes` takes any `{ doorX, doorY, capacity }` list. A `MapV1`'s home entities fit it, so `sim-core` never imports `sim-protocol`.
   - Seating fills the largest households first, each into the first home with room in a keyed order.
   - Blobs spawn idle at their home's door, which hides the pop-in (R4 3.3).
10. **Five engines replace Deno.** M0.6's harness replays spawn goldens in Node, Bun, Chromium, Firefox and WebKit. Deno embeds V8, which Node covers.
    - The CLI `spawn` command existed only for the Deno run, so it is dropped.
    - The shared doc's exit check still names Deno, and changing it needs the owner.
11. **The 10 ms check** joins the budget gate as a desktop-only row: the fastest of 9 spawns of 100,000 agents, with homes built beforehand. A keyed `draw3` costs 2.5 ns (measured here), so about 13 draws a blob cost 3–4 ms at 100,000 (computed).
12. **The burn-in check** compares two arms on seeds 1–20, each run for 20,000 days. The hand-built start faces a spawn of R*, the fold of seed 42's hand-built city after 471 months.
    - Each arm's burn-in follows M2.1's Ruling 9: the larger MSER-5 truncation of its seeds' mean daily price and unemployment.
    - It passes when both are found and the spawned one is no longer. It runs under `ECONOMY_LONG=1`.
    - On a fail, report it, and never re-roll the seeds. The probe's margins of 2,055–4,010 days leave about a 4% chance of a false fail (computed: a predictive t with 3 degrees of freedom).
13. **Spawn stays out of the worker.** It starts economy cities in tests, the bench and, next, M2.3's runner. The town view keeps `populate` until the economy joins the step. Highcourt's homes hold 2,688 people (measured here), fewer than the first screen's 3,965–7,931 blobs.
14. **`layoutWorld` seats the four stand-in cultures and the uncommitted day,** moved from `populate`, because guarded spawn may not write `cultureUid`. M2.6 seats real cultures from the record.

### The probe behind Rulings 7, 11 and 12

A throwaway probe ran M2.1's economy in Node 24.18.0 on 10 October 2026, on the planner's desktop, with the load not recorded. Its last row is a close copy of this plan's spawn. Each burn-in follows Ruling 12, over 20,000 days.

| Start | Seeds | Burn-in (days) |
| --- | --- | --- |
| Hand-built (M2.1) | 1–20, 21–40, 41–60, 61–80 | 8,505, 8,065, 6,910, 7,455 |
| Spawned, even firm sizes and uniform links | 1–10 | 9,620, against 7,390 hand-built |
| Spawned, sizes and links copied from the source city | 1–10 | 3,465 |
| Spawned as this plan does | 1–20, 21–40, 41–60, 61–80 | 4,495, 4,600, 4,765, 5,400 |

The stationary state, seeds 42–46 at months 471–940 (measured here):
- household cash has a Gini of 0.03–0.05;
- prices vary with a CV of 0.018–0.030, and wages with 0.006–0.008;
- firms have 0–38 workers, with a CV of 0.49–0.70;
- a firm's links number about 7 + 6.5 × its workers, a correlation of 0.94–0.96.

## Global Constraints

- **Git:** commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -- <paths>`, staging by path, since agents share the index. The body's first line is `Task: M2.2 Spawn and fold, task N: <title>`. Never push.
- **Checks while agents share the tree:** each task proves itself with its own Vitest files and `pnpm eslint` on its own paths. The coordinator runs `pnpm test && pnpm lint && pnpm typecheck` once each wave has committed.
- **Determinism:**
  - spawn draws only through `draw1`–`draw4` and `keyedShuffle` on `SPAWN_DRAW`, keyed as Ruling 6 says, with one purpose per use;
  - no `Math.random`, transcendental `Math`, `**`, clocks or `sort`;
  - money moves only through `issue`, and every exact split goes through `apportionByStride`.
- **Hot paths:** `spawn/` and `households/` are linted as per-tick code, so only `create*` functions allocate.
- **Culture wall:** from Task 1, spawn code reads no culture column and never imports the barrel or `consumption/`.
- **TypeScript:** erasable syntax only.

## Files and waves

Paths are under `packages/sim-core/` unless given in full.

| Task | Agent | Files |
| --- | --- | --- |
| 1 Household rows, the record and fold | `sim-engineer`, Sonnet | `src/households/store.ts`, `src/world/world.ts`, `src/economy/start.ts`, `src/spawn/{record,fold}.ts`; `eslint.config.js`, `.dependency-cruiser.cjs`; `test/{households,fold,culture-wall}.test.ts`, `test/fixtures/goldens.json`, `packages/sim-protocol/test/town-map.test.ts` |
| 2 The weight tables | `sim-engineer`, Sonnet | `scripts/tables.ts`, `src/maths/tables.ts` (generated), `test/tables.test.ts` |
| 3 Homes and seating | `sim-engineer`, Sonnet | `src/random/streams.ts`, `src/spawn/homes.ts`, `src/index.ts`; `test/homes.test.ts`, `packages/sim-protocol/test/town-homes.test.ts` |
| 4 Spawn | `sim-engineer`, Opus | `src/spawn/spawn.ts`, plus `people.ts` and `firms.ts` if the lint's limits call for them, `src/economy/scratch.ts`, `src/index.ts`; `test/spawn.test.ts`, `test/engines/records.ts` |
| 5 Every engine, and the 10 ms gate | `sim-engineer`, Sonnet | `test/engines/checks.ts`, `scripts/goldens.ts`, `test/fixtures/goldens.json`; `tools/bench/src/budget.ts`, `tools/bench/src/compute/{budgets,spawn}.ts`, `tools/bench/test/spawn.test.ts` |
| 6 The burn-in comparison | `sim-engineer`, Sonnet | `test/spawn-burn-in.test.ts` |

No two tasks in a wave share a file:
- **Wave 1:** Tasks 1, 2 and 3, three agents.
- **Wave 2:** Task 4 alone, once wave 1 has committed. It is the hard part, so it runs on Opus.
- **Wave 3:** Tasks 5 and 6, two agents, once Task 4 has committed.
- **Then testing,** below.

## Task 1: Household rows, the record and fold (`sim-engineer`, Sonnet)

**Goal:** every world holds household rows, and a hand-built city folds into an exact ledger record.

- [ ] **The wall:** `spawn` joins the guarded folders in `eslint.config.js` (`GUARDED`), `.dependency-cruiser.cjs` (`culture-wall`) and `test/culture-wall.test.ts` (`GUARDED_FOLDERS`, where "nine folders" becomes "ten"). Commit `chore(lint): guard spawn behind the culture wall`.
- [ ] **The rows.** Commit `feat(sim-core): lay out household rows in every world`, with the goldens and pins below.
  - `households/store.ts`: `MAX_HOUSEHOLD = 6`, `NO_HOME = -1`, and `HouseholdStore`, made by `createHouseholdStore(arena, capacity)`. All of it is canonical: `capacity`, `count` (`Int32Array(1)`), `size` (`Uint8Array`) and `home` (`Int32Array`).
  - `world/world.ts`: `World` gains `households`, which `layoutWorld` takes last, at the agent capacity. `layoutWorld` now seats the four stand-in cultures and writes −1 to the front record's day, both moved from `populate`. `CULTURES` becomes the exported `STAND_IN_CULTURES`.
  - `economy/start.ts`: `startEconomy` writes one household per blob, with `count` H, each `size` 1 and each `home` `NO_HOME`.
- [ ] **The record and fold.** Commit `feat(sim-core): fold a city into its ledger record`.
  - `spawn/record.ts`: the ledger record, a `Float64Array(LEDGER_FIELDS)` of 14 whole-number fields:

    | Field | Holds |
    | --- | --- |
    | `LEDGER_HOUSEHOLDS` + s − 1, for s = 1–6 | households of s people |
    | `LEDGER_EMPLOYED`, `LEDGER_UNEMPLOYED` | blobs with and without an employer |
    | `LEDGER_FIRMS` | firm rows |
    | `LEDGER_HOUSEHOLD_CASH`, `LEDGER_FIRM_CASH` | cents in wallets, and in firm accounts |
    | `LEDGER_PRICE`, `LEDGER_WAGE` | the mean posted price and wage over firms, in cents, rounded down |
    | `LEDGER_STOCK` | units in firm stock |

  - `populationOf(record)` is the sum of s × the households of s.
  - `checkRecord(record, world)` throws a `RangeError` naming the field when:
    - a field isn't a whole number of 0 or more;
    - the population is 0 or above `agents.capacity`, or employed + unemployed isn't the population;
    - firms are below `SUPPLIERS`, or above the population or `firms.capacity`;
    - the price or wage is below 100 cents, which keeps every drawn price above 0;
    - stock is above 2^31 − 1, or a cash field above 2^53 − 1.
  - `spawn/fold.ts`: `foldToLedger(world, out)` writes the 14 fields from household rows, `employer`, wallets, firm accounts, `price`, `wage` and `stock`. With no firms, price and wage are 0. It allocates nothing.
- [ ] **Check:**
  - `test/households.test.ts`: a phone world has 10,000 household rows and `count` 0; changing a `size` changes `stateHash`; and `layoutWorld` alone gives `cultureUid` 1, 2, 3, 4 and a front record day of −1;
  - `test/fold.test.ts`: the `LENGNICK` start folds to exactly 1,000 households of 1, 1,000 employed, 0 unemployed, 100 firms, 310,000,000 and 0 cents, price 2,500, wage 142,800 and stock 3,000;
  - after 63 days of `economyDay` in closed money, the two cash fields still sum to 310,000,000, and employed + unemployed is still 1,000;
  - `checkRecord` passes that fold and throws for each rule above;
  - regenerate the goldens with `node packages/sim-core/scripts/goldens.ts`, update Highcourt's two pins in `town-map.test.ts`, and grep the repo for other pins of the old hashes;
  - `pnpm vitest run packages/sim-core packages/sim-protocol`, `pnpm depcruise` and `pnpm eslint` on the touched paths pass.

## Task 2: The weight tables (`sim-engineer`, Sonnet)

**Goal:** the three build-time tables behind spawn's spreads (Ruling 7).

- [ ] `scripts/tables.ts` gains `lognormalWeights(sigma)`:
  - entry i is round(K × exp(σ × z_i)), where z_i is @stdlib's standard normal quantile at (i + 0.5) ÷ 256;
  - K makes the last of the 256 entries 4,095;
  - `buildTables` adds `CASH_WEIGHTS` (σ 0.07), `PRICE_WEIGHTS` (σ 0.025) and `FIRM_SIZE_WEIGHTS` (σ 0.5) as `Uint16Array`s, each σ with a one-line "measured here" comment citing this plan.
- [ ] `pnpm --filter @nomos/sim-core tables` regenerates `src/maths/tables.ts`.
- [ ] **Check,** in `test/tables.test.ts`:
  - each table has 256 entries from 1 to 4,095, never falling and ending at 4,095;
  - the SD of ln(entry) is within 3% of its σ;
  - "matches its generator" passes;
  - `pnpm vitest run packages/sim-core/test/tables.test.ts` passes.
- [ ] **Commit:** `feat(sim-core): add the spawn weight tables`.

## Task 3: Homes and seating (`sim-engineer`, Sonnet)

**Goal:** households sit in a map's homes, never over capacity.

- [ ] `random/streams.ts`: `SPAWN_DRAW = AGENT_SALT + 13`, spawn's stream, named apart from `populate`'s `SPAWN`.
- [ ] `spawn/homes.ts`:
  - `HomeSite` is `{ doorX, doorY, capacity }`. The caller passes only home entities, and that filter is the map lookup the timing leaves out;
  - `Homes` is `{ count, doorX, doorY, capacity, order, room }`, typed arrays made by `createHomes(sites)`. `order` and `room` are its working arrays;
  - `createStandInHomes(ground, count)` makes `count` homes of 6 beds, the i-th at open cell floor(i × open ÷ count), for the CLI's ground, tests and the bench;
  - `seatHouseholds(size, count, home, homes, seed, key)` shuffles `homes.order` with `keyedShuffle` on `SPAWN_DRAW`, keyed (key, i, `HOME_ORDER`), and sets each `room` to its capacity;
  - then, for s from 6 down to 1, it walks the households of size s in index order. Each takes the first home in that order with room for s, through one cursor per size. When no home has room, it throws a `RangeError` naming the size;
  - `HOME_ORDER` is purpose 0 on `SPAWN_DRAW`, and Task 4's purposes start at 1.
- [ ] `src/index.ts` exports `spawn/homes.ts`, for `sim-protocol`'s test.
- [ ] **Check:**
  - `test/homes.test.ts`: keyed random mixes of sizes 1–6 seat in full, with no home over capacity, in stand-in homes holding twice their people. A 5-person household facing only 4-bed homes throws. The same key seats the same way, and another key differently. Stand-in doors sit on open cells;
  - `packages/sim-protocol/test/town-homes.test.ts`: Highcourt's 387 homes hold 2,688 beds, 330 of 4 and 57 of 24 (measured here). 200, 200, 150, 150, 60 and 60 households of 1–6 people (2,310 people) seat with no home over capacity. 229 households of 5 throw, since only 57 × 4 = 228 fit;
  - `pnpm vitest run packages/sim-core/test/homes.test.ts packages/sim-protocol/test/town-homes.test.ts` passes.
- [ ] **Commit:** `feat(sim-core): seat households in homes by capacity`.

## Task 4: Spawn (`sim-engineer`, Opus)

**Goal:** `spawnFromLedger` builds a runnable city from a record, and fold returns the record exactly.

- [ ] `spawn/spawn.ts`: `spawnFromLedger(world, record, homes, params, settlement, day): void`, which reads only `unitsPerWorkerDay` from `params`. In order, it:
  1. runs `checkRecord`, and throws a `RangeError` unless the world holds no agents, households or firms;
  2. takes the key from Ruling 6. Each later draw keys (key, index, purpose), with its own purpose from 1 up, and each `apportionByStride` word is `draw2(seed, SPAWN_DRAW, key, purpose)`;
  3. **households:** lists the record's households smallest first, shuffles them with `keyedShuffle`, and writes `size` and `count`;
  4. **homes:** calls `seatHouseholds`;
  5. **people:** walks the households in order. Member p gets id = `draw3(seed, SPAWN_DRAW, key, p, PERSON)` and `addAgent(agents, seed, id, STAND_IN_CULTURES, 0)`. It stands idle in its home's door tile, at `pointInTileQ8(doorX, id)` and `pointInTileQ8(doorY, id >>> 12)`;
  6. **jobs:** sets `firms.count` to F. `FIRM_SIZE_WEIGHTS[draw & 255]` per firm apportions the employed into firm sizes. A `keyedShuffle` of everyone then gives the first `employed` blobs jobs, firm by firm: firm 0 takes the first size[0], and so on;
  7. **firms:** `PRICE_WEIGHTS` apportions F × price straight into `firms.price`, and every wage is the record's. Stock and firm cash apportion by workers + 1, and MINT issues each firm's cash. `lastDemand` is `DAYS_PER_MONTH` × `unitsPerWorkerDay` × workers, as in `startEconomy`;
  8. **links:** each blob draws 7 distinct firms by workers + 1. With u = `draw4(seed, SPAWN_DRAW, key, p, k, LINK)` mod (employed + F), u below employed picks the u-th shuffled worker's firm, and otherwise firm u − employed. A repeat steps on to the next firm, as in `startEconomy`;
  9. **cash:** `CASH_WEIGHTS` per blob apportions household cash, and MINT issues each wallet. Every reservation wage is the record's wage.
  - Spawn borrows `economyScratch`'s `order`, `weights` and `shares`, which no system holds between days, and `scratch.ts`'s comment says so. Firm passes fit in them, since firms never outnumber people.
  - Everything else stays zero: demand, vacancies, notices, counters, stock-out bits and plans. After a spawn, `economyDay` runs from a month's day 0, as after `startEconomy`.
  - A spawn that throws midway leaves the world half-written, and callers drop it, as with `layoutWorld`.
- [ ] `test/engines/records.ts`: `randomRecord(seed, index, out)`, free of Node imports so the engine harness can use it. From keyed draws it gives:
  - 0–60 households of each size, with at least 7 people;
  - 0 employed up to the population, and 7 firms up to the smaller of 120 and the population;
  - household cash below 2^40 cents, firm cash below 2^34, a price of 100–100,000, a wage of 100–10,000,000 and stock below 2^24.
- [ ] `src/index.ts` exports `households/store.ts` and `spawn/`'s `record.ts`, `fold.ts` and `spawn.ts`, for the bench.
- [ ] **Check,** in `test/spawn.test.ts`:
  - **identity (exit check):** 1,000 records from `randomRecord`, each spawned into a phone world laid out for 1,500 agents in 1 MiB, fold back field for field, and `checkCash` returns `OK`;
  - **households stay adjacent:** walking the households in order, each member stands in its home's door tile, and no home holds more people than beds;
  - **firms:** prices sum to exactly F × price, and none is below 1 cent. No blob links a firm twice. On a record of 10,000 people and 1,000 firms, links per firm correlate above 0.9 with workers + 1;
  - **replays:** the same inputs give one `stateHash`, and another day or settlement gives another;
  - **guards:** an occupied world, and each bad record, throws a `RangeError`;
  - **runs:** a spawned city of 1,000 runs 2,000 days of `economyDay` with `LENGNICK`, with the invariants checked;
  - `pnpm vitest run packages/sim-core/test/spawn.test.ts` and `pnpm eslint packages/sim-core/src/spawn` pass.
- [ ] **Commit:** `feat(sim-core): spawn a city from its ledger record`.

## Task 5: Every engine, and the 10 ms gate (`sim-engineer`, Sonnet)

**Goal:** spawned cities replay byte for byte in five engines, and the budget gate times 100,000 agents (Rulings 10 and 11).

- [ ] `test/engines/checks.ts`: `spawnHash(index)` spawns `randomRecord(2026, index)` into a phone world of seed index + 1, laid out for 1,500 agents, with stand-in homes. It uses settlement index mod 4 and day 21 × index, and returns the `stateHash` in hex. `Goldens` gains `spawn: { seed, hashes }`, 20 hashes that `checkGoldens` checks.
- [ ] `scripts/goldens.ts` writes them, and `test/fixtures/goldens.json` is regenerated.
- [ ] `tools/bench`:
  - `compute/budgets.ts`: `SPAWN_ROW` is `{ system: 'spawn', reduce: 'mean', rmMs: { desktop: 10 } }`. It stays out of `BUDGET_ROWS`, which `judge` applies at every tier;
  - `compute/spawn.ts`: `benchRecord()` holds 100,000 people in 12,000, 12,000, 6,000, 6,000, 2,000 and 2,000 households of 1–6 people. It has 96,000 employed, 10,000 firms, 31,000,000,000 cents of household cash, 1,400,000,000 of firm cash, price 3,000, wage 165,000 and stock 2,700,000;
  - `sampleSpawn(samples, now)` makes 33,334 stand-in homes once, and spawns once untimed. It then times `samples` spawns, each into a freshly laid-out desktop world;
  - `budget.ts` runs `sampleSpawn(MIN_SAMPLES, …)` and judges it with `judge([SPAWN_ROW], 'desktop', …)`. It prints the verdict, adds it to the report, and fails on a fail.
- [ ] **Check:**
  - `node packages/sim-core/scripts/engines.ts` reports the spawn goldens ok, as `bun` does where installed (CI runs it);
  - `pnpm exec playwright test packages/sim-core/test/browser/engines.spec.ts --project=chromium --project=firefox --project=webkit` passes;
  - **exit check:** `pnpm --filter @nomos/bench budget` prints the desktop spawn line, the fastest of 9 within 11 ms: the 10 ms budget plus the gate's 10%;
  - `tools/bench/test/spawn.test.ts`: `benchRecord()` passes `checkRecord`, with 100,000 people and 10,000 firms;
  - if the gate misses, stop and report the timing. The first fix to try: `draw4(s, t, a, b, c, d)` equals `mix(draw3(s, t, a, b, c) ^ d)`, so a blob's shared prefix can be drawn once. A test must pin that equality.
- [ ] **Commits:** `test(sim-core): replay spawned cities in every engine`; `feat(bench): gate spawning 100,000 agents at 10 ms`.

## Task 6: The burn-in comparison (`sim-engineer`, Sonnet)

**Goal:** a spawned city burns in no slower than the hand-built start (Ruling 12, exit check).

- [ ] `test/spawn-burn-in.test.ts` runs only with `ECONOMY_LONG=1`, with a 15-minute timeout:
  - R* is `foldToLedger` of the `LENGNICK` start, seed 42, after 471 months (9,891 days);
  - the hand-built arm runs `createWorld(seed, 'phone', undefined, 1_000)` and `startEconomy`, on seeds 1–20;
  - the spawned arm spawns R* into a phone world laid out as `createWorld` lays one out, with 334 stand-in homes, at settlement 0 and day 0, on seeds 1–20;
  - each world runs 20,000 days of `economyDay` with `LENGNICK`. Each arm averages over its seeds its daily `STAT_PRICE_MEAN`, and `STAT_UNEMPLOYED` divided by the population;
  - an arm's burn-in is the larger `mser5` truncation of its two mean series;
  - the test asserts that both burn-ins are found, not −1, and that the spawned one is no longer. It logs both arms' truncations, per-seed price truncations and 1,000-day block means.
- [ ] **Check:** `ECONOMY_LONG=1 pnpm vitest run packages/sim-core/test/spawn-burn-in.test.ts` passes, and the task reports the logged numbers. The probe predicts about 6,900–8,500 days hand-built and 4,500–5,400 spawned. On a fail, stop and report. Never re-roll the seeds or retune σ without a plan edit.
- [ ] **Commit:** `test(sim-core): compare spawned and hand-built burn-in`.

## Testing last

After Tasks 5 and 6 commit, three reviews run once:
1. `economy-review` over `spawn/` and Task 6's numbers: spawn issues exactly the record's cash, fold reads it back, and the spawned structure matches the stationary facts above.
2. `/determinism-review` over `packages/sim-core`: keyed draws on `SPAWN_DRAW` with distinct purposes, no index-order bias in seating, the borrowed scratch, no allocation in spawn or fold, and the culture wall.
3. `senior-qa` proves every exit check by running it: the identity test, the engine goldens in Node, Bun and three browsers, the budget gate and `ECONOMY_LONG=1`. It also runs `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise`, and `pnpm --filter @nomos/bench alloc` for the larger arena.

Then the task's own agent re-tests only what the three flag. The coordinator fills in `milestone.md` and writes the checkpoint.

## `interfaces.md` changes

The coordinator applies these in one docs commit, with the new hashes once Task 1 lands.

1. **Packages:** `sim-culture` is walled off from `spawn` code too.
2. **Layout, rules:** the culture wall's guarded folders gain `spawn`.
3. **Layout, `sim-core`:** new rows for `households/` (`store.ts`), the household rows, and `spawn/` (`record.ts`, `homes.ts`, `spawn.ts`, `fold.ts`), the ledger record, homes, spawn and fold. `maths/tables.ts` gains the three weight tables.
4. **The world step:** `World` gains `households`. `layoutWorld` seats the four stand-in cultures and the uncommitted day, which `populate` did, and `STAND_IN_CULTURES` (4) is exported. Every golden and Highcourt pin moves with Task 1.
5. **The economy:** "one blob per household until M2.2" becomes Ruling 1.
   - A household is 1–6 blobs at adjacent indices that share a home.
   - Each blob works, shops and holds its own wallet, so a household's cash is its members' wallets summed, never stored.
   - `startEconomy` makes one household per blob, with no home.
6. **A new section, "Spawn and fold (owner: M2.2)":**
   - `HouseholdStore` (`capacity`, `count`, `size`, `home`), `MAX_HOUSEHOLD` (6) and `NO_HOME` (−1);
   - the record's 14 `LEDGER_*` fields, `LEDGER_FIELDS`, `populationOf` and `checkRecord`;
   - `spawnFromLedger(world, record, homes, params, settlement, day)` on an empty world, and `foldToLedger(world, out)`;
   - `HomeSite`, `Homes`, `createHomes`, `createStandInHomes` and `seatHouseholds`;
   - `SPAWN_DRAW` (0x10D), Ruling 6's key, and `HOME_ORDER` as purpose 0;
   - `CASH_WEIGHTS`, `PRICE_WEIGHTS` and `FIRM_SIZE_WEIGHTS`, each 256 weights of 12 bits;
   - `goldens.json`'s `spawn` hashes, replayed in Node, Bun and three browsers, and the budget gate's 10 ms desktop `spawn` row;
   - bytes: 5 per agent slot join the hash, so a desktop arena uses about 12.4 of its 64 MiB (computed from 11.87 MiB, measured here).
