# M2.4 Goods and food: brief

> **Status:** two parts. Part 1, the visible cut, is a brief to build from once the owner says go (owner, 11 October 2026: ask before each step). Part 2 becomes a step plan after Part 1 lands.

**Task:** [task.md](task.md). Each task writes its code, then its tests (the main case and one edge), runs only those and a typecheck at `nice -n 19`, then commits. CI runs the rest after the push.

## Part 1: goods and food on screen

### Rulings

The architect's, 11 October 2026, after the owner found M2.2b's panel lifeless. The owner can overturn any of them.

1. **Seven goods, one per supplier link,** in `goods/goods.ts`. Good 0 stays today's generic good, so zeroed memory and `LENGNICK` run as before.

   | Id | Good | Shop | On sale | Made a worker-day | Firms and jobs |
   | --- | --- | --- | --- | --- | --- |
   | 1–4 | bread, vegetables, fish, milk | Bakery, Greengrocer, Fishmonger, Dairy | 4, 7, 3, 14 days | 18 portions | 4.5% each |
   | 5–7 | cloth, tools, fuel | Draper, Smithy, Fuel Store | kept | 3 units | 27.33, 27.33, 27.34% |

   - Milk joins the owner's six, so a blob's link k always sells good k + 1 (`SUPPLIERS` is 7). A search replaces link k only with a firm of that good, drawn by workers.
   - Days on sale are R6's use-by days ([R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), opened), ambient for bread and vegetables and cool for fish and milk (inference).
   - 3 portions a day take a sixth of a job, so at `CITY`'s 92.3% employed (M2.3, measured) food holds 18.1% of jobs and of spending (computed). That is near ICP 2021's upper-middle 18.6% (opened), which settles the city's preset.
   - Start and spawn give each good its exact share of firm rows, at least one each, in table order. Spawn splits the employed the same way, then by the size table within each good. A keyed draw per firm would leave small towns short of goods and size food firms at random. Food firms open at the preset's or record's price over 6, floored.

2. **Food.**
   - **Eating:** every blob eats 3 portions a day, one a meal (inference). The new `buyFood` runs before `shopDay` and visits food links in A9's keyed order, each shop selling what it can (A7, A10). Food is eaten the day it is bought; pantries are M3.5's.
   - **Food first:** a month's `planConsumption` sets aside 63 portions at the food links' mean price, then plans goods from the rest by Lengnick's rule. `shopDay` skips food links.
   - **Short:** a portion a blob can't afford or find adds to the day's `unmet`, for M3's needs system, and nothing else follows yet.
   - **Dated stock:** each firm row has a 16-slot ring of portions by the day made, slot day & 15. Output enters today's slot after shopping, and sales take the oldest first. At the day's start, the new `spoilFood` empties the slot made L + 1 days ago, so a batch sells for L days. `firms.stock` stays the total.
   - **Hiring:** food can't pile up, so Lengnick's band can't see a glut. A food firm is short under a day's demand in stock, and long once it has wasted a worker-month (378 portions) since it last decided. Short opens a vacancy and may raise the price; long gives notice and may cut it. Goods firms keep `CITY`'s 0.8–1.6-month band, and an exiting food firm's stock spoils.

3. **Prices.** Each firm keeps Lengnick's price rule over its own good's output, so posted prices still move on a month's first day. Sales, stock, price paid, spoilage, eaten and short move daily. The price paid is a good's sales cents over its units, or its posted mean on a day nothing sells.

4. **Money and determinism.**
   - A purchase is one `transfer` of whole cents, and spoilage moves no money, so all accounts plus MINT still sum to zero.
   - **The goods store** holds `good` (Uint8), the ring (16 Int32) and `wasted` (Int32) per firm row, 69 bytes a firm. It is canonical but off the canonical list: `stateHash` mixes it in last while global slot `GOODS` (6) is 1, which start and spawn copy from the new `EconomyParams.goods`, 0 in `LENGNICK` and 1 in `CITY`.
   - So `6a652730`, `746a06a3`, the other tick goldens and the 20 spawn hashes hold, while `town` and Highcourt's pins move. `{ ...CITY, goods: 0 }` replays M2.3's `CITY` byte for byte.
   - `buyFood` draws on `SHOP_DRAW` purposes 8 (its order of blobs) and 9 (its visit order). Goods need no draw, `goods/` reaches no culture, and every array is in the arena, so no tick allocates.
   - **The record** keeps its 14 fields. In a goods world its price and stock are the goods firms', so fold stays exact, and each spawn starts food fresh: a day's output, made the day before.
   - **M2.3's targets** still apply, since schema 2's unit columns count goods only: stock months, the price ratio and Okun read goods firms. Task 4 re-measures the burn-in and reruns the 50-seed confirmation once. A tier-1 miss is recorded as a gap, untuned until Part 2 changes demand again.

5. **The schedule.** `ECONOMY_TICKS` becomes 20: 0 opens the day and now empties the trade rings, 1 `spoilFood`, 2–6 the month's first-day systems, 7 `buyFood`, 8 `shopDay`, 9 `produce`, 10–16 the month's last-day systems and 17–19 the records. Both new systems do nothing in `LENGNICK`, and the hash's month-end skip moves with the numbers, so compare from tick 20. **Cost at 10k** ([M2.2b's table](../../m0-pipeline/interfaces.md#the-economy-on-screen-owner-m22b), desktop, measured): the worst tick stays a month's first-day `searchShops`, 1.78 ms. `buyFood` adds a daily tick near `shopDay`'s 1.17 ms, and `spoilFood` reads a slot per food firm (inference).

6. **The feed and panel.**
   - **Flow log schema 2** adds per good `sold`, `sold_cents`, `made`, `stock`, `spoiled` and posted mean `price`, plus `eaten` and `unmet`: 79 slots. The unit columns and `price_mean` cover goods only; `sales_cents` stays all revenue.
   - **`EconomyMessage`** drops `meanPriceCents`. It gains 112 days of sold, stock and price paid for each town good and of food eaten, spoiled and short, about 23.6 KB a day (computed), and trades hold the day's last 8 food and last 8 goods purchases, each with its good.
   - **The panel:** a table of the day's goods (sold, in stock, price paid, spoiled), a food chart (eaten, spoiled, short), a chart of each good's sales, and the wage and unemployment charts. A trade reads "2 bread at Bakery 12, 10.66": a shop takes its trade's name and row + 1 until buildings name it, and the inspector says "works at Bakery 12".
   - **Bytes:** only the lazy economy chunk and the worker grow. Raise each size-limit entry to a build's measure + 1 kB, as M2.2b did. Initial JS has about 9 kB left under its 35 kB (computed: the stand-in's 26.8 kB limit is its measure + 1 kB).

7. **Part 2 keeps** the sectors, recipes and producer layer, wholesale call auctions, Stone–Geary baskets, R6's lot words with grain and preserved food, storage tiers, grades, freshness pricing, and the full portion identity with shop spoilage of 0.5–3%.

### Tasks

One `sim-engineer` builds Tasks 1–4 in order beside the blob modal, with one agent running tests at a time. Tasks 5 and 6 wait for the modal to land, since it holds `messages.ts`, the worker loop, `households/store.ts` and the inspector. Each task records its names in `interfaces.md` in a docs commit. Bare paths are in `packages/sim-core/src/`.

1. **The goods** (`sim-engineer`, Sonnet), in two commits: `goods/goods.ts`, `goods/store.ts`, `World.goods`, the `GOODS` slot, the hash rule (`world/world.ts`, `world/checkpoint.ts`) and `EconomyParams.goods`; then goods, output, prices, stock and links by good in `economy/start.ts` and `spawn/spawn.ts`, and the record rule in `spawn/fold.ts`. `CITY.goods` stays 0 until Task 4.
   - Check: `goods.test.ts`, where link k sells good k + 1 after start and spawn on `{ ...CITY, goods: 1 }` and fold returns the record exactly; edge: 7 firms hold one of each. `goldens.test.ts` and `city-record.ts --check` pass unchanged.
2. **Food on the shelf** (`sim-engineer`, Sonnet): `goods/food.ts` (add, take oldest first, spoil) with `spoilFood`; output into the ring (`firms/produce.ts`); the food signals (`firms/decide.ts`); food exits (`firms/renew.ts`); schema 2 (`economy/stats.ts`).
   - Check: `food.test.ts`, where a fish batch sells oldest first and its rest spoils on its 4th morning; edge: a firm that wasted 378 portions gives notice.
3. **Eating** (`sim-engineer`, Sonnet): `buyFood` in `consumption/food.ts`, `shopDay` on goods links, the set-aside (`consumption/plan.ts`), the search by good (`consumption/search.ts`), the split rings (`economy/scratch.ts`) and the 20-system schedule (`economy/economy.ts`).
   - Check: `food-day.test.ts`, 63 days of `economyDay` on a goods world, where each food's made = sold + spoiled + Δstock exactly every day and eaten = food sold; edge: an empty wallet logs 3 unmet portions. `flow-log.test.ts` follows, and the goldens and `--check` pass.
4. **`CITY` gains goods** (`sim-engineer`, Sonnet; Opus if the twin fails for an unknown cause). `CITY.goods` is 1, and `burnInDays` comes from MSER-5 on 5 seeds of 40,000 days, about 30 s at M2.3's 7,774 days a second (computed). Regenerate `city-record.ts`, `goldens.json`'s `town`, Highcourt's pins and `confirm-city.json`; `targets.ts` reports `food_share`, `spoil_share` and `unmet_share`.
   - Check: `economy-step.test.ts`'s twin, then one `ECONOMY_LONG=1` run of `city-targets.test.ts` on 2 threads (74 s in M2.3), its table written into `task.md`.
5. **The feed** (`sim-engineer`, Sonnet), after the modal: `sim-protocol`'s `economy/feed.ts` and `messages.ts`, the goods' names re-exported for the app, and `employerGood` in `inspected`, which the loop's reply fills.
   - Check: `feed.test.ts`, where a day's per-good point matches the stats row; edge: after 20 food and 20 goods purchases, the feed holds the last 8 of each.
6. **The panel** (`senior-game-engineer`, Sonnet), after Task 5: `panels/economy.ts`, several series to a chart in `panels/charts.ts`, `panels/shop-name.ts` by trade, the inspector's employer line and `.size-limit.json`.
   - Check: `economy.test.ts`, the goods table from a feed; edge: a good with nothing sold shows 0 at its posted price. In `economy.spec.ts`, the table and food chart show after Play, and axe passes.
7. **Close** (the coordinator): push, so CI runs `pnpm check` and the browser specs; the owner starts perf.yml once; then one `economy-review` on Opus, which also checks the hash rule.

**Risks.** The set-aside and food hiring change demand and labour, so tier-1 targets may move; `{ ...CITY, goods: 0 }` stays an exact baseline. Staffing moves in whole workers, so a food shop can waste up to 1/(n + 1) of its output, about 5% in Highcourt's 9-worker food shops (inference), above R6's 0.5–3% until Part 2 lets shops buy to demand.

## Part 2: the rest of M2.4 (later)

Part 2 builds `task.md`'s Part 2 list on Part 1's goods, from a step plan written against the code as it then stands.
- **Sources:** the [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), parts a and d; the [R6 food notes](../../../../research/round-6-goods-and-wellbeing/notes/food-quality-spoilage.md), parts a, b and e; and the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md) for ICP shares and Stone–Geary.
- **Kept from the first brief:** R6's lot word, `exp:16 | cat:3 | grade:2 | storage:2 | qty:9`, at most 32 a shelf, replaces Part 1's ring, and `stateHash` reads lots by decoded field. Price floors after grade, then after freshness. Auctions clear in the recipe table's order. An absolute `exp` wraps after 65,536 days, about 585 years of 112 days (computed).
- **Mapping:** bread comes from the grain sector, vegetables, fish and milk from fresh food, cloth and tools from wares, and fuel from fuel.
- **Tests:** the full identity on 20 seeds × 400 days, shop spoilage on 50 paired city seeds, and identical hashes on 10 seeds × 400 days when a test-only flag swaps the lot layout.
- **Open:** which sector makes grain and preserved food, and how full the busiest shelves get; measure peak lots a shelf at 10k agents first.
- **Decided:** `skip-expired` stays M0.3's late-spoilage rule (owner, 8 October 2026), and the city's food share is ICP's upper-middle 18.6% (Ruling 1).
