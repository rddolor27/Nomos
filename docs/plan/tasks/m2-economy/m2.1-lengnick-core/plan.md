# M2.1 Lengnick core: step plan

> **For agentic workers:** use executing-plans, one task per agent, with test-driven-development inside each task. Steps use checkbox (`- [ ]`) syntax.

> **Status:** done on 10 October 2026. Each task's **Done** line names its commits. [task.md](task.md) gives each exit check's evidence and M2.3's calibration flags.

**Goal:** Lengnick's households and firms run headless in Node, in closed and fiat money, exact to the cent, and the known-answer tests pass.

**Architecture:** the economy lives in every world's arena. Five household columns join `AgentStore`, firms are rows of a new `FirmStore`, and each firm's cash is a ledger account after the wallets. In M2.1 a household is one blob, and its cash is that blob's wallet. Plain functions, one concern folder each, run Lengnick's month start, day and month end, and `economyDay(world, params, day)` calls them in one fixed order. Tests and a CLI command call it once per sim day; `step` doesn't call it yet.

**Spec:** [task.md](task.md), and [interfaces.md](../../m0-pipeline/interfaces.md): "Layout", "The world step", "Agents and the Blob handle" and "Wallets". This plan replaces the brief. Figures come from the [R1 report](../../../../research/round-1-baseline/full-report.md) and [R2's economy notes](../../../../research/round-2-follow-up/notes/economy-calibration.md), Key Questions 4 and 6, unless marked (computed).

## Rulings

The owner decided on 10 October 2026 that a month is 21 days, and that crowds stay typed arrays while game objects are classes. The owner let the coordinator settle every other open decision. These rulings are the coordinator's, and the owner can overturn any of them.

1. **Rows, classes and functions.**
   - Households are rows of `AgentStore`, one blob each: thousands of them, touched every day.
   - Firms are rows of `FirmStore`: up to 10,000 a world, touched by every purchase. Loops read columns (sim-core rules, "Layout and handles"). No `Firm` handle yet: nothing in M2.1 touches a few firms at a time, so it comes with the first view that does.
   - Markets: the wholesale auction is a class, `CallAuction`, because it owns an order book made once and reused at every clearing. Retail has no market object: Lengnick's firms post prices, and shopping is a plain function.
   - Every other economy system is a plain function over `World`, like `move`, and its working arrays are made once in `layoutWorld`.
2. **One home for the state: the world's arena, always laid out.** `layoutWorld` takes the household columns, firm rows, firm accounts and scratch in every world. `stateHash`, checkpoints and `restoreWorld` then cover them unchanged, and every golden moves once, in Task 1. A separate economy arena would give money two homes, wallets and economy accounts, and M2.2 would have to merge them.
3. **A household's cash is its blob's wallet.** Lengnick's household is one worker, so M2.1 has one blob per household and no household account. [M2.2](../m2.2-spawn-and-fold/task.md) first spawns several members per household and rules how they spend. This plan recommends the sum of members' wallets, never a second account; the supplier columns may then move to a household store.
4. **Stone–Geary moves to M2.4.** With one good, the split is the whole budget, so M2.1 builds only Lengnick's α rule, the total that a split later divides. [M2.4's task](../m2.4-goods-and-food/task.md) already lists Stone–Geary baskets per good. Cost if wrong: about 20 lines in M2.4.
5. **The call auction is built and tested, not wired.** Lengnick has no producer-to-shop trade (R1), so the `lengnick` preset never calls it. [M2.3's](../m2.3-calibration-and-design-runner/task.md) city preset, with shop markups over wholesale, wires it first, and M2.4's brief reuses it.
6. **Fiat money is one rate.** At each month end, MINT issues `fiatIssuePpm` of the money stock, split evenly across households. The rate is capped at 10,000 ppm, 1% a month (R1), and 0 means closed money. M2.1 sets no saving-rate target: R2's 4% fits only a fiat preset, which M2.3 calibrates.
7. **Exit and entry move no money.** A firm with no workers and no demand for 3 months running exits (R1). An entrant takes its row with the mean price and wage, no stock and no workers, and keeps the row's cash, which profits have left at zero. R1's BAM entrant, at half the average size with a 1.20 markup, isn't used: a Lengnick firm has no capital to halve, and 1.20 over the mean price sits above the 1.15 band.
8. **The start is the replication's** (R2 Key Question 6), at 100 cents a unit.
   - Households hold 310,000 cents each, 2.2 months of wages (R2 Key Question 4). Wages are 142,800 and prices 2,500, a markup of 1.103 inside the band.
   - Everyone starts employed, 10 to a firm in a keyed shuffle, with 7 distinct uniform links and a reservation wage equal to the wage.
   - Each firm starts with one day's output in stock, a month's output as last month's demand, and no cash, so all money starts with households.
9. **Burn-in is per preset.** As R2's [validation notes](../../../../research/round-2-follow-up/notes/validation-methodology.md) advise in part 5, average 5 seeds' daily mean price and unemployment, then run MSER-5 on each. Store the larger truncation × 1.5 as `LENGNICK.burnInDays`. If either has no minimum inside the first half of 20,000 days, stop and report: the owner then picks longer runs or a spun-up snapshot.
10. **The saving check is an identity plus a rate.**
    - In closed money, MINT never moves after the start, and at each month end the household and firm sectors' changes cancel to the cent.
    - After burn-in, household saving averages zero within ±0.1% of household income.
    - The brief's bound of one cent per household-month is dropped. Firm buffers follow the wage bill, so a 10% buffer move over 952 months would read as 1.5 cents with no leak (computed).
11. **The velocity chart is a series column.** M2.1 has no UI, so the CLI writes velocity per 112-day year each day. The drawn chart joins the page when the economy does.
12. **Lengnick's own figures:** the paper stays unopened (R2's gap). M2.1 reports its price-change share against the replication-derived median of 9% and asserts nothing; M2.3 tests the presets.
13. **The long run is opt-in.** The per-push suite runs 5 seeds × 2,000 days. The 50 seeds × 20,000 days run sits behind `ECONOMY_LONG=1`, run once by QA at close, until CI has a nightly job.

### Lengnick's gaps, settled

R2 lists about 20 gaps in the specification. Each ruling below goes into `params.ts` or the code as a one-line "why" comment.

| # | Gap | Ruling |
| --- | --- | --- |
| A1 | Month-start order | Firms first: wage, stock band, price. Then households: shop searches, job search, the month's plan (R2) |
| A2 | Day order | Households shop, then firms produce, so a purchase takes earlier output (R2) |
| A3 | Marginal cost | wage ÷ (21 × λ), so `63 × price` compares with the wage (R2) |
| A4 | The wage an unemployed household accepts | At least its reservation wage (R2, footnote 25) |
| A5 | The price a household plans with | The mean of its 7 suppliers' prices, rounded down |
| A6 | Whole units | The month's plan is floor(min((m/P)^α, m/P)). Day j of the month buys floor((j+1) × plan ÷ 21) − floor(j × plan ÷ 21), so no unit is lost |
| A7 | A firm's demand | The units asked of it, capped by what the asker can pay; units it couldn't supply count too |
| A8 | Rationing order | Shoppers go in a keyed permutation per day and job seekers per month, never in index order |
| A9 | Visit order | A keyed start and step through the 7 links, one of 42 orders, until 20 × unmet ≤ wanted (95% met) or all are visited |
| A10 | A stocked-out supplier | One that supplies fewer units than asked for lack of stock, not for lack of the buyer's cash |
| A11 | Cheaper-shop search (ψ\_price, ξ) | Compare one random link with one firm drawn by its share of workers. Switch when new + floor(ξ × old) ≤ old; a firm already linked is a miss. A switch clears the link's stock-out bit (312b9f5) |
| A12 | Stock-out search (ψ\_quant) | Replace one random stocked-out link with a firm drawn by workers; the bits clear each month |
| A13 | Job search | The unemployed draw β = 5 firms with replacement and take the first vacancy paying at least their reservation wage. The employed draw one firm, always if paid below their reservation wage, else with chance π, and move only for a strictly higher wage |
| A14 | Vacancies and notices | At most one vacancy per firm a month. A notice set at month start lays off one keyed-random worker at that month end, after wages: a one-month lag (R2) |
| A15 | A firm short of cash | Each worker gets floor(cash ÷ workers), and the firm keeps the remainder |
| A16 | Profits | After wages, a firm keeps χ × its posted wage bill, rounded up, and pools the rest in `PROFITS`. The pool goes to households by their cash after wages (R2, footnote 22) |
| A17 | Reservation wage | Rises to the pay received, and falls by a floored 10% for each month unemployed (R2) |
| A18 | Price and wage steps | Floored through `mulPpm`, so a step under a cent does nothing. A price never falls below ceil(wage ÷ 63) or 1 cent |
| A19 | Zombie firms | A demand floor of 63 units, one worker's month (R1), plus Ruling 7's exit after 3 idle months |
| A20 | Start values | Ruling 8 |

## Global Constraints

- **Git:** commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit -- <paths>`, staging by path, since agents share the index. The body's first line is `Task: M2.1 Lengnick core, task N: <title>`. Never push.
- **Checks while agents share the tree:** each task proves itself with its own Vitest files and `pnpm eslint` on its own paths. The coordinator runs `pnpm test && pnpm lint && pnpm typecheck` once each wave has committed.
- **Determinism:**
  - draw only through `draw1`–`draw4`, on the task's own stream, keyed `(time, entity, purpose)` or `(time, entity, index, purpose)`, where time is the day or the month;
  - no `Math.random`, transcendental `Math`, `**`, clocks or `sort`;
  - money moves only through `transfer`, `issue` and `retire`, and rates only through `mulPpm` or `mulPpmUp`;
  - `mulPpm` takes 0–1,000,000 ppm, so markups are stored as the excess over 1.
- **Hot paths:** every new `sim-core` folder is linted as per-tick code, so the day's functions allocate nothing. `random/` is exempt from that lint, so keep `shuffle.ts` allocation-free by hand.
- **Culture wall:** `labour/`, `wages/`, `wealth/` and `money/` are guarded top-level folders. Guarded code imports `economy/params.ts`, `economy/stats.ts`, `economy/scratch.ts` and other module paths, never `economy/economy.ts`, `consumption/` or the barrel.
- **TypeScript:** erasable syntax only, so no enums, namespaces or parameter properties. Classes inherit nothing.

## Files and waves

Paths are under `packages/sim-core/` unless given in full.

| Task | Agent | Files |
| --- | --- | --- |
| 1 The state layout | `sim-engineer`, Sonnet | `src/agents/store.ts`, `src/firms/store.ts`, `src/money/ledger.ts`, `src/memory/tiers.ts`, `src/time/calendar.ts`, `src/random/streams.ts`, `src/economy/{params,stats,scratch}.ts`, `src/world/world.ts`; `test/{store,ledger,economy-layout}.test.ts`, `test/fixtures/goldens.json`, `packages/sim-protocol/test/town-map.test.ts` |
| 2 Maths kernels | `sim-engineer`, Sonnet | `src/maths/log2.ts`, `scripts/tables.ts`, `src/maths/tables.ts` (generated), `src/random/shuffle.ts`, `src/money/ppm.ts`, `src/economy/mser5.ts`; `test/{exp2,shuffle,mser5,money}.test.ts` |
| 3 Known answers | `sim-engineer`, Opus | `src/money/histogram.ts`; `test/{histogram,known-answers}.test.ts` |
| 4 The call auction | `sim-engineer`, Sonnet | `src/market/wholesale.ts`; `test/wholesale.test.ts` |
| 5 Firms, profits and fiat money | `sim-engineer`, Sonnet | `src/firms/{decide,produce,renew}.ts`, `src/wealth/profits.ts`, `src/money/fiat.ts`; `test/{firms,profits,fiat}.test.ts` |
| 6 Labour and wages | `sim-engineer`, Sonnet | `src/wages/{wage-step,payroll}.ts`, `src/labour/{search,notice,reservation}.ts`; `test/{wages,labour}.test.ts` |
| 7 Consumption | `sim-engineer`, Sonnet | `src/consumption/{search,plan,shop}.ts`; `test/shopping.test.ts` |
| 8 The economy day and the runs | `sim-engineer`, Opus | `src/economy/{economy,start}.ts`, edits to `src/economy/{params,stats}.ts`, `src/index.ts`; `test/{economy,month-end}.test.ts`; `tools/cli/src/main.ts`, `tools/cli/src/economy/run.ts` |

No two tasks in a wave share a file:
- **Wave 1:** Tasks 1–4, four agents. Tasks 3 and 4 use nothing that Task 1 changes, since `createLedger`'s new parameter is optional.
- **Wave 2:** Tasks 5, 6 and 7, three agents, once Tasks 1 and 2 have committed. Tasks 3 and 4 may still be running, which makes five.
- **Wave 3:** Task 8 alone, after Tasks 5–7.
- **Then testing,** below.

## Task 1: The state layout (`sim-engineer`, Sonnet)

**Goal:** every world holds the economy's columns, firm rows and firm accounts, zeroed until `startEconomy` fills them.

**Done:** 6b1778e, 23e9fa2 and f47f06c.

- [x] **Constants and parameters.** Commit `feat(sim-core): add the economy's month, streams and parameters`.
  - `time/calendar.ts`: `DAYS_PER_MONTH = 21`, `monthOf(day)` and `dayOfMonth(day)`.
  - `random/streams.ts`: one stream per drawing folder, `FIRM_DRAW`, `WAGE_DRAW`, `LABOUR_DRAW`, `SHOP_DRAW`, `WEALTH_DRAW` and `START_DRAW`, at `AGENT_SALT + 7` to `+ 12` (0x107–0x10C).
  - `economy/params.ts`: `EconomyParams`, every field a whole number; `LENGNICK`, frozen; and `checkParams(params, tier)`. It throws a `RangeError` naming the field when households exceed `TIER_AGENTS`, firms fall outside `SUPPLIERS`–`TIER_FIRMS`, a ppm field leaves 0–1,000,000, `fiatIssuePpm` exceeds 10,000, a month count exceeds 255 (its `Uint8Array` counter), or the opening price leaves the band.
  - `economy/stats.ts`: slot constants for a `Float64Array(STATS)` outside the hash:
    - set from state at each day end: `STAT_UNEMPLOYED`, `STAT_VACANCIES`, `STAT_PRICE_MEAN`, `STAT_WAGE_MEAN`, `STAT_HOUSEHOLD_CASH` and `STAT_FIRM_CASH`;
    - summed over the day: `STAT_SALES_UNITS` and `STAT_SALES_CENTS`;
    - summed over the month: `STAT_PRICE_CHANGES`, `STAT_PRICE_CHANGE_PPM` (the changes' sizes), `STAT_HIRES`, `STAT_SWITCHES`, `STAT_FIRINGS`, `STAT_WAGE_BILL`, `STAT_PROFITS_PAID`, `STAT_EXITS` and `STAT_ISSUED`.

  `LENGNICK` holds R2's Table 1, as the replication transcribes it, and Ruling 8's start:

  | Field | Value | Lengnick |
  | --- | --- | --- |
  | `households`, `firms` | 1,000, 100 | H, F |
  | `priceSearchPpm`, `cheaperPpm`, `stockoutSearchPpm` | 250,000, 10,000, 250,000 | ψ\_price, ξ, ψ\_quant |
  | `jobSearches`, `onJobSearchPpm` | 5, 100,000 | β, π |
  | `consumptionPowerPpm` | 900,000 | α |
  | `reservationCutPpm` | 100,000 | 10% a month unemployed |
  | `wageCutMonths`, `wageStepPpm` | 24, 19,000 | γ, δ |
  | `stockLowPpm`, `stockHighPpm` | 250,000, 1,000,000 | φ̲, φ̄ |
  | `markupLowPpm`, `markupHighPpm` | 25,000, 150,000 | φ̲\_p − 1, φ̄\_p − 1 |
  | `priceStepPpm`, `priceChancePpm` | 20,000, 750,000 | ϑ, θ |
  | `unitsPerWorkerDay` | 3 | λ |
  | `bufferPpm` | 100,000 | χ |
  | `demandFloor`, `idleMonthsToExit` | 63 units, 3 | R1's floor and exit; 0 turns either off |
  | `fiatIssuePpm` | 0 | closed money |
  | `openingCash`, `openingWage`, `openingPrice` | 310,000, 142,800, 2,500 cents | the replication's 3,100, 1,428 and 25 |

- [x] **The layout.** Commit `feat(sim-core): lay out households, firms and firm accounts`.
  - `agents/store.ts`: `SUPPLIERS = 7`, and five columns appended to `AgentStore` and `AGENT_COLUMNS`:
    - `employer`, `Int32Array`, 4 bytes, −1 when unemployed;
    - `reservationWage`, `Float64Array` cents, 8 bytes;
    - `suppliers`, `Int32Array`, 7 per agent at `i × SUPPLIERS + k`, −1 when empty, 28 bytes;
    - `stockedOut`, `Uint8Array`, bit k set when supplier k ran short this month, 1 byte;
    - `plannedUnits`, `Int32Array`, this month's units, 4 bytes.

    `addAgent` writes −1 to `employer` and to the agent's 7 suppliers.
  - `firms/store.ts`: `FirmStore`, made by `createFirmStore(arena, capacity)`, all canonical. It holds `capacity` and `count`, and per firm: `price` and `wage` (`Float64Array` cents); `stock`, `employees`, `demand` and `lastDemand` (`Int32Array` units); and `vacancy`, `notice`, `monthsFull` and `idleMonths` (`Uint8Array`).
  - `money/ledger.ts`: `PROFITS = 3`, the month's pooled profits, zero outside the month end. `createLedger(arena, settlements, wallets, firms = 0)` puts firm accounts after the wallets, with `Ledger.firstFirm` and `firmAccount(ledger, firm)`.
  - `memory/tiers.ts`: `TIER_FIRMS` of 1,000 for phone, 2,500 for phone-plus and 10,000 for desktop, one firm to 10 agent slots, as in Lengnick.
  - `economy/scratch.ts`: `EconomyScratch`, made by `createEconomyScratch(arena, agents, firms)`, outside the hash. Each array has one owner:
    - `order`, `Int32Array` per agent slot: refilled by `keyedShuffle` just before each use;
    - `weights` and `shares`, `Float64Array` per agent slot: `wealth/` and `money/fiat.ts`;
    - `firmPrefix`, `Int32Array` per firm slot: `consumption/`;
    - `firmTally`, `Int32Array` per firm slot: `labour/`;
    - `pay`, `Float64Array` per firm slot: `wages/`;
    - `stats`: Task 8 sets the day-end slots, and each system adds to its own.
  - `world/world.ts`: `World` gains `firms` and `economyScratch`. `layoutWorld` makes them, and a ledger with `TIER_FIRMS[tier]` firm accounts, after its existing takes.
- [x] **Check:**
  - `test/store.test.ts`: the byte map counts `suppliers` as 28 bytes, and `nameKey` is no longer the last column;
  - `test/ledger.test.ts`: `createLedger(reserveArena(65_536), 3, 5, 2)` gives `accounts` 35, `firstWallet` 28, `firstFirm` 33 and `firmAccount(cash, 1)` 34;
  - `test/economy-layout.test.ts`: a phone world has 1,000 firm slots; every agent's `employer` and suppliers are −1; `checkParams(LENGNICK, 'phone')` passes; and 63 × 2,500 = 157,500 lies inside [146,370, 164,220], the band at 142,800 (computed);
  - regenerate the goldens with `node packages/sim-core/scripts/goldens.ts`, update Highcourt's two pins in `town-map.test.ts`, and grep the repo for any other pin of the old hashes;
  - `pnpm vitest run packages/sim-core packages/sim-protocol` passes.

## Task 2: Maths kernels (`sim-engineer`, Sonnet)

**Goal:** the exact kernels that Tasks 5–8 need.

**Done:** 25d584c.

- [x] `maths/log2.ts` gains two functions:
  - `log2Q16Wide(x)`: 65,536 × log2 x for whole x from 1 to 2^53 − 1. It halves x into `log2Q16`'s range and adds 65,536 per halving.
  - `exp2Floor(q16)`: floor(2^(q16 ÷ 65,536)) for 0 ≤ q16 < 53 × 65,536. It reads a generated 65-entry Q30 table of 2^(k/64) and interpolates linearly on the low 10 bits, which errs by at most 1.5 × 10⁻⁵ (computed). `scripts/tables.ts` writes the table into `maths/tables.ts` with `/* @__PURE__ */`, like the others, and the table test's fixtures follow.
- [x] `random/shuffle.ts`: `keyedShuffle(out: Int32Array, n, seed, stream, time, purpose)`, a Fisher–Yates shuffle of 0..n−1 with `draw3(seed, stream, time, i, purpose) % (i + 1)`.
- [x] `money/ppm.ts`: `mulPpmUp(cents, ppm)`, the ceiling twin of `mulPpm`, written as `0 - mulPpm(-cents, ppm)` so it never returns −0, which would change the hash.
- [x] `economy/mser5.ts`: `mser5(series: Float64Array, length): number`. It takes batch means of 5 and, for a truncation of k batches, g\_k = Σ(Y\_i − Ȳ\_k)² ÷ (B − k)², from running sums taken backwards so nothing is allocated. It searches k up to ⌊B/2⌋ and returns 5k\*, or −1 when the minimum falls on the last k searched: the run is too short (R2's first-half rule).
- [x] **Check:**
  - `test/exp2.test.ts`: `log2Q16Wide` equals `log2Q16` below 2^32 and adds 65,536 per doubling above it; `exp2Floor(q)` never decreases, and over a sweep it differs from floor(2^(q ÷ 65,536)) by at most 1 + 2 × 10⁻⁵ of that value;
  - `test/shuffle.test.ts`: the result is a permutation, the same for the same keys and different for another time;
  - `test/money.test.ts`: `mulPpmUp` is the ceiling, and `Object.is(mulPpmUp(0, 5), 0)`;
  - `test/mser5.test.ts`: a 500-point ramp followed by keyed noise truncates within 10% of 500, a flat series at 0, and a series still trending returns −1.
- [x] Commit `feat(sim-core): add exp2, a keyed shuffle, ceiling ppm and mser-5`.

## Task 3: Known answers (`sim-engineer`, Opus)

**Goal:** the ledger and a Gini reproduce three economies with known outcomes, without Lengnick (R1).

**Done:** ab081c9.

- [x] `money/histogram.ts`: `giniPpm(h: Histogram): number`, 1 − 2 × the Lorenz area, walking the bins upward and treating each bin's members as equal. An empty or all-zero histogram gives 0.
- [x] `test/known-answers.test.ts`, on `createLedger(reserveArena(…), 0, 10_000)` with 100,000 cents issued to each wallet:
  - **random exchange:** a keyed pair pools its cash and splits it at a keyed ppm fraction, through one `transfer` between them. After 200 exchanges per wallet, `giniPpm` is 500,000 ± 20,000;
  - **saving half:** the same, but each keeps `mulPpm(cash, 500_000)` and pools the rest; the Gini is 270,000 ± 20,000;
  - **Godley–Lavoie SIM,** at 10,000 cents a unit, on two wallets standing for households and firms: G = 20 is issued from MINT to the firms' wallet, and taxes at θ = 0.2 are retired to MINT. Households consume α₁ = 0.6 of disposable income and α₂ = 0.4 of last period's money. Y comes from the closed form, and wages equal C + G, so the firm nets zero. Y₁ and Y₂ lie within 0.1 of 38.44 and 47.9, and Y and household money within 0.1 of 100 and 80 after 200 periods;
  - `checkCash` returns `OK` after every batch of exchanges and every period.
- [x] **Why these margins:** 10,000 wallets keep the Gini's sampling spread near 0.003 (computed: 0.0027 over 300 samples), so ±0.02 is about 7 spreads. A Python check gave 0.499 and 0.275 at 200 exchanges per agent, and SIM's closed form gives 38.46 and 47.93 (computed).
- [x] **Check:** `pnpm vitest run packages/sim-core/test/known-answers.test.ts packages/sim-core/test/histogram.test.ts`. The histogram tests add that equal holdings give 0 and one holder among N gives (N − 1) ÷ N.
- [x] Commit `feat(sim-core): add the gini and the economy's known-answer tests`.

## Task 4: The call auction (`sim-engineer`, Sonnet)

**Goal:** a uniform-price call auction for M2.3 and M2.4's wholesale trade (R1).

**Done:** fb7d0f2.

- [x] `market/wholesale.ts`: `class CallAuction`.
  - `constructor(arena, capacity)` takes its book from the arena, outside the hash. Per side it holds trader, units, limit, rank and filled, plus a heap of order indices.
  - `reset()`, `bid(trader, units, limitCents, cashCents)` and `ask(trader, units, limitCents)`. A bid keeps min(units, floor(cash ÷ limit)) units. Either throws `RangeError` when its side is full.
  - `clear(seed, stream, key): number` ranks every order with `draw3(seed, stream, key, side, index)`. Binary heaps, not a sort, order bids by limit down and asks by limit up, with ties by rank. It matches while the best bid is at least the best ask, and returns floor((last matched bid + last matched ask) ÷ 2), or 0 when nothing matched. `bidFilled` and `askFilled` then hold each order's units.
  - The caller settles at that one price, so no buyer pays above its limit and no seller gets below its ask (R1).
- [x] **Check, in `test/wholesale.test.ts`:**
  - bids of 10 @ 120, 5 @ 100 and 5 @ 80 against asks of 8 @ 90 and 10 @ 110 clear 10 units at 115: the first bid fills 10, and the asks fill 8 and 2;
  - over 1,000 keyed random books, filled bids equal filled asks; no filled bid's limit is below the price, and no filled ask's limit above it; no unfilled bid meets an unfilled ask; and no buyer's filled units × price exceed its cash;
  - equal limits fill by rank, the same for the same key and different for another;
  - a full side throws, and `clear` allocates nothing (the hot-path lint).
- [x] Commit `feat(sim-core): add the wholesale call auction`.

## Task 5: Firms, profits and fiat money (`sim-engineer`, Sonnet)

**Goal:** firms decide, produce, pay out profits and turn over, and fiat money enters.

**Done:** 1f7c791, and 585d695 from the test pass.

- [x] `firms/decide.ts`: `decideFirms(world, params, month)`, per firm, after `stepWages` has read last month's `vacancy`:
  - D = max(`lastDemand`, `demandFloor`); low = `mulPpmUp(D, stockLowPpm)` and high = `mulPpmUp(D, stockHighPpm)`;
  - `vacancy` clears; then stock below low sets it, and stock above high, with workers, sets `notice`;
  - with c = `DAYS_PER_MONTH × unitsPerWorkerDay`: below low, if c × price < wage + `mulPpm(wage, markupHighPpm)`, then with chance θ the price rises by `mulPpm(price, η)`, with η uniform over 0–ϑ ppm. Above high, if c × price > wage + `mulPpm(wage, markupLowPpm)`, it falls by the same rule. Chance and size use separate draws;
  - the price ends at least ceil(wage ÷ c) and 1 cent;
  - each change adds 1 to `STAT_PRICE_CHANGES` and its size in ppm to `STAT_PRICE_CHANGE_PPM`.
- [x] `firms/produce.ts`: `produce(world, params)` adds λ × `employees` to `stock`.
- [x] `firms/renew.ts`: `closeFirmMonth(world, params)` copies `demand` to `lastDemand` and zeroes `demand`. `idleMonths` counts months running with no workers and no demand. At `idleMonthsToExit`, the row re-enters as Ruling 7 says: the mean price and wage of all firms, rounded down, no stock, `lastDemand` of `demandFloor`, and flags and counters at 0. Each exit adds to `STAT_EXITS`.
- [x] `wealth/profits.ts`: `distributeProfits(world, params, month)`.
  - Each firm keeps a buffer of `mulPpmUp(wage × employees, bufferPpm)` and moves any cash above it to `PROFITS`.
  - Weights are household cash divided by the smallest power of two that brings the largest under a limit, rounded down, or 1 each if all are 0.
  - The limit is 2^20, or 2^53 ÷ the pool when that is less, so pool × weight stays under 2^53 as `apportionByStride` needs. A pool of up to 2^52 cents shares exactly, and a larger one throws `RangeError` before any cent moves (585d695).
  - `apportionByStride(pool, weights, H, shares, draw2(seed, WEALTH_DRAW, month, PROFIT))` sets the shares, and one transfer per household pays them. The total adds to `STAT_PROFITS_PAID`.
- [x] `money/fiat.ts`: `issueFiat(world, params, month)` does nothing at 0 ppm. Otherwise it issues `mulPpm(−balance[MINT], fiatIssuePpm)` from MINT, split evenly by `apportionByStride` over unit weights, and adds it to `STAT_ISSUED`.
- [x] **Check,** in `test/{firms,profits,fiat}.test.ts` on small worlds, such as `createWorld(42, 'phone', undefined, 40)` with firms set by hand:
  - the band opens a vacancy below low and a notice above high, and neither inside;
  - a price rises only from below the band's top and falls only from above its bottom, never ends below the cost floor, and moves in 75% ± 5 points of 1,000 eligible firms;
  - `produce` adds λ × workers;
  - an idle firm re-enters on exactly its third idle month, with the mean price and wage and no stock;
  - after `distributeProfits`, `PROFITS` is 0, every firm holds at most its buffer, `checkCash` returns `OK`, and shares follow cash;
  - `issueFiat` moves MINT by exactly the issue, and 0 ppm moves nothing.
- [x] Commit `feat(sim-core): add firm decisions, profits and fiat money`.

## Task 6: Labour and wages (`sim-engineer`, Sonnet)

**Goal:** firms set and pay wages, and households find, change and lose jobs.

**Done:** fb7984c.

- [x] `wages/wage-step.ts`: `stepWages(world, params, month)`, per firm (R1):
  - a `vacancy` still set means last month's went unfilled: the wage rises by `mulPpm(wage, μ)`, μ uniform over 0–δ ppm, and `monthsFull` resets to 0;
  - otherwise `monthsFull` rises by 1, and at γ the wage falls by `mulPpm(wage, μ)` and `monthsFull` resets;
  - a wage never falls below 1 cent.
- [x] `wages/payroll.ts`: `payWages(world)` sets `pay[f]` to the wage if the firm's cash covers wage × employees, else to floor(cash ÷ employees). One pass over households then pays `pay[employer]` from the firm account into the wallet, and the total adds to `STAT_WAGE_BILL`.
- [x] `labour/search.ts`: `searchJobs(world, params, month)` shuffles households with `keyedShuffle` on `LABOUR_DRAW`, then applies A13. A hire sets `employer`, adds a worker to the hiring firm, takes one from the old firm on a move, and clears the hiring firm's `vacancy`. Hires and moves add to `STAT_HIRES` and `STAT_SWITCHES`.
- [x] `labour/reservation.ts`: `updateReservationWages(world, params)` applies A17, reading `pay`.
- [x] `labour/notice.ts`: `fireOnNotice(world, month)`. Each firm with a notice and workers sets `firmTally[f]` to 1 + a keyed draw mod `employees`. One pass over households counts down per firm and lays off the worker that reaches 0. Notices clear, and layoffs add to `STAT_FIRINGS`.
- [x] **Check,** in `test/{wages,labour}.test.ts`:
  - an unfilled vacancy raises the wage by at most 1.9%, and 24 full months cut it once;
  - payroll moves exactly Σ pay, a short firm pays floor(cash ÷ workers) and keeps the rest, and `checkCash` returns `OK`;
  - an unemployed household takes the first sampled vacancy at or above its reservation wage, no firm fills two vacancies a month, and an employed household moves only for a higher wage;
  - the reservation wage rises to pay and falls 10%, floored, per month unemployed;
  - a notice lays off exactly one worker, the same one for the same keys;
  - Σ `employees` equals the employed households after every call.
- [x] Commit `feat(sim-core): add labour search, payroll and wage steps`.

## Task 7: Consumption (`sim-engineer`, Sonnet)

**Goal:** households choose shops, plan the month and buy each day.

**Done:** a938e2b, and 312b9f5 from the test pass.

- [x] `consumption/search.ts`: `searchShops(world, params, month)` fills `firmPrefix` with the running sum of `employees`. Each household then runs A11 with chance ψ\_price and A12 with chance ψ\_quant, drawing firms by a binary search on `firmPrefix`, or uniformly when no firm has workers. An A11 switch clears that link's `stockedOut` bit, so A12 can't replace the firm just found (312b9f5). Then it clears `stockedOut`.
- [x] `consumption/plan.ts`: `planConsumption(world, params)`, with P from A5:
  - `plannedUnits` is floor(cash ÷ P) when cash ≤ P, which also keeps a zero balance out of `log2Q16Wide`;
  - otherwise, with L = max(0, `log2Q16Wide(cash) − log2Q16Wide(P)`), it is min(`exp2Floor(mulPpm(L, consumptionPowerPpm))`, floor(cash ÷ P));
  - `log2Q16`'s 8-bit table lets the plan err by up to 0.35% (computed). It replays exactly, so it stays.
- [x] `consumption/shop.ts`: `shopDay(world, params, day)` shuffles households with `keyedShuffle` on `SHOP_DRAW`. Each buys A6's units for the day, visiting links in A9's order. At each firm it:
  - asks min(unmet, floor(cash ÷ price)) and adds that to the firm's `demand`;
  - buys min(ask, stock) and pays units × price by `transfer`;
  - sets the A10 bit when stock fell short.

  Purchases add to `STAT_SALES_UNITS` and `STAT_SALES_CENTS`.
- [x] **Check,** in `test/shopping.test.ts`:
  - a household's daily units over a month sum to exactly its plan;
  - no purchase exceeds the buyer's cash or the firm's stock, a stock-out sets the right bit, and a cash shortfall sets none;
  - with one unit in stock and two shoppers, the buyer changes with the day's key, so the lower index doesn't always win;
  - the cheaper-shop search switches only at 1% cheaper or more, and never duplicates a link;
  - the plan matches floor(min((m/P)^0.9, m/P)) from `Math.pow` within 0.4%; the test may call `Math.pow`, but sim code may not;
  - `checkCash` returns `OK` after a day.
- [x] Commit `feat(sim-core): add household budgets, shop search and shopping`.

## Task 8: The economy day and the runs (`sim-engineer`, Opus)

**Goal:** one call runs a sim day, and the start, CLI and runs prove the exit checks and measure the burn-in.

**Done:** 919f001, 5bf346e, 8e7cb9c and f6ab86c, with 49f432d and 4a3ca7c setting the first-load JS stand-in to 18 kB. MSER-5 over seeds 42–46 cut 5,775 days of the mean price and 6,595 of unemployment, so `burnInDays` is 9,893 (measured here).

- [x] `economy/start.ts`: `startEconomy(world, params)` runs `checkParams` and throws unless the world holds exactly `params.households` blobs. Then it sets `firms.count` to F and builds Ruling 8's start:
  - jobs: a `keyedShuffle` on `START_DRAW`, sending the i-th household to firm i mod F;
  - links: 7 uniform draws per household, stepping to the next firm on a repeat;
  - wallets: `issue` or `retire` takes each from `populate`'s 100,000 cents to `openingCash`.
- [x] `economy/economy.ts`: `economyDay(world, params, day)`, with `startMonth` and `endMonth` exported for tests. Each day it:
  1. zeroes the day's sums, and on a month's day 0 the month's sums;
  2. on day 0, runs `stepWages`, `decideFirms`, `searchShops`, `searchJobs` and `planConsumption`;
  3. runs `shopDay`, then `produce`;
  4. on day 20, runs `payWages`, `updateReservationWages`, `fireOnNotice`, `distributeProfits`, `closeFirmMonth` and `issueFiat`;
  5. sets the day-end slots through `recordDay`, added to `stats.ts`;
  6. runs `checkInvariants` while `world.checks` is on, as `step` does.
- [x] `src/index.ts` exports what the CLI uses.
- [x] CLI: `node tools/cli/src/main.ts economy --seed 42 --days 20000 [--fiat-ppm N] [--out dist/economy/42.csv]`.
  - It writes one CSV row a day: the stats, plus velocity per 112-day year, the last 21 days' sales × 112 ÷ 21 ÷ the cash of households and firms.
  - `--burn-in --seeds 5` runs Ruling 9 and prints each series' truncation.
  - Both print sim days per second to stderr.
- [x] **Check,** in `test/economy.test.ts`:
  - `starts every firm inside the price band` (exit check);
  - `runs 5 seeds × 2,000 days cleanly`: the invariants hold every day. At each month end, no `Float64Array` column or balance holds NaN or ±∞, MINT hasn't moved since the start, and `PROFITS` is 0. The household and firm changes cancel to the cent, and Σ `employees` equals the employed households;
  - `replays`: seed 42, run twice, gives one `stateHash`;
  - `issues fiat money exactly`: at 5,000 ppm, MINT falls by exactly Σ `STAT_ISSUED`;
  - with `ECONOMY_LONG=1`: 50 seeds × 20,000 days with the same checks, and Ruling 10's saving rate after `burnInDays`.
- [x] **Check,** in `test/month-end.test.ts`, `10,000 random month-ends conserve cents exactly`. Keyed random small worlds get up to 40 households and 8 firms, with random cash, wages, prices, workers and notices. After `endMonth`, `checkCash` returns `OK`, households and firms hold the same total, `PROFITS` is 0, and no balance is negative.
- [x] **Burn-in:** run `--burn-in --seeds 5 --days 20000`. Write `burnInDays` into `LENGNICK` with a "measured here" comment giving the seeds, the Node version and the date. Stop and report if a truncation lands in the second half.
- [x] **Report without asserting** (task.md's "Verify first"):
  - sim days per second, with the Node version and the machine;
  - the share of firm-months with a price change, against R2's 9%, and the mean size of a change;
  - job-to-job moves per employed household-month;
  - whether the mean price stays within ¼–4× and unemployment within 1–40% after burn-in, R1's bands, which M2.3 checks.
- [x] Commits:
  - `feat(sim-core): run the economy day from the lengnick start`;
  - `feat(cli): add the economy command`;
  - `feat(sim-core): record the measured lengnick burn-in`.

## Testing last

After Task 8 commits, three reviews run once:
1. `economy-review` over Tasks 3 and 5–8: stock-flow consistency, rules A6–A18, the fiat issue and the saving identity.
2. `/determinism-review` over `packages/sim-core`: keyed draws and orders, no index-order bias, day functions that allocate nothing, no −0, and the culture wall's imports.
3. `senior-qa` proves every exit check by running it. That includes `ECONOMY_LONG=1`, the CLI, and `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise`. It also runs `pnpm --filter @nomos/bench budget` and `alloc`, to show the larger arena moved no tick budget.

Then the task's own agent re-tests only what the three flag. The coordinator fills in `milestone.md` and writes the checkpoint.

**Done:** one pass, shared with the steering. QA ran every check, `ECONOMY_LONG=1` included; the determinism review was clean, and money was exact. Its fixes: 955d2fb, 585d695, 312b9f5, and 827fe54's cross-engine economy vector.

## `interfaces.md` changes

The coordinator applied these in c3b72fa, and the economy golden in e548c88.

1. **Layout, `sim-core`:** new rows for `firms/` (`store.ts`, `decide.ts`, `produce.ts`, `renew.ts`), `labour/` (`search.ts`, `notice.ts`, `reservation.ts`), `wages/` (`wage-step.ts`, `payroll.ts`), `wealth/` (`profits.ts`), `market/` (`wholesale.ts`) and `economy/` (`params.ts`, `stats.ts`, `scratch.ts`, `start.ts`, `economy.ts`, `mser5.ts`). `consumption/` gains `search.ts`, `plan.ts` and `shop.ts`, `money/` gains `fiat.ts`, and `random/` gains `shuffle.ts`. `tools/cli/src` gains `economy/run.ts`.
2. **Layout, rules:** guarded code imports `economy/params.ts`, `economy/stats.ts` and `economy/scratch.ts`, never `economy/economy.ts`, which reaches `consumption/`. M2.6 adds `economy/` beside `step/` to the folders that may reach `sim-culture`.
3. **The world step:** `World` gains `firms` (`FirmStore`) and `economyScratch`. `startEconomy(world, params)` and `economyDay(world, params, day)` join `sim-core`, outside `SYSTEM_NAMES` until the economy joins the step. `DAYS_PER_MONTH = 21`, `monthOf` and `dayOfMonth` join the calendar. Seed 42's goldens and Highcourt's pins take Task 1's new values.
4. **Agents:** `SUPPLIERS = 7` and the columns `employer`, `reservationWage`, `suppliers`, `stockedOut` and `plannedUnits`, with `addAgent` writing −1 to `employer` and the suppliers. `Blob` gains no accessor.
5. **Wallets, renamed "Wallets and firm accounts":**
   - `createLedger(arena, settlements, wallets, firms = 0)`, `Ledger.firstFirm` and `firmAccount(ledger, firm)`;
   - accounts run national, then sectors, then wallets, then firms;
   - `PROFITS = 3`, zero outside the month end, and `TIER_FIRMS` of 1,000, 2,500 and 10,000;
   - a household's cash is its blob's wallet, with one blob per household until M2.2.
6. **Bytes (computed):** each agent adds 45 bytes in the hash and 20 of scratch. Each firm adds 60 bytes in the hash (36 of columns, 8 of account and 16 of claims rows) and 16 of scratch. A desktop arena grows from about 5.19 MB to about 12.5 MB of its 64 MiB, and a phone arena by about 0.73 MB. `TIER_MEMORY_BYTES` and snapshot v1 don't change.
7. **Streams:** `FIRM_DRAW`, `WAGE_DRAW`, `LABOUR_DRAW`, `SHOP_DRAW`, `WEALTH_DRAW` and `START_DRAW`, agent-layer streams 0x107–0x10C.
