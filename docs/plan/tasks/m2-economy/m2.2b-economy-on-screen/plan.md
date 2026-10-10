# M2.2b The economy on screen: brief

> **Status:** done (11 October 2026). Tasks 1–6 and 8 landed from 1d8e5f0 to c20ce6e. The Opus review's fixes and the allocation fix followed (b7eb873..1339b2c), and `HANDOFF.md`'s log holds the results. The owner still starts perf.yml once.

**Task:** [task.md](task.md). Each task writes its code, then its tests: the main case and one edge. It runs only those, at `nice -n 19`, with a typecheck of the packages it touched, then commits. CI runs the rest after the push.

## Rulings

These are the coordinator's, from 10 October 2026, and the owner can overturn any of them.

1. **The world.** Every app world is `createTown(seed, tier, ground, people)`. It lays out an empty world, fills it through `spawnFromLedger` from `CITY_RECORD` scaled to `people`, and marks it to run `CITY`. The crowd stays as ruled: 3,965, 5,287 or 7,931 by tier, or a whole tier under `?tier=`.
   - `CITY_RECORD` is R*: the design runner's fold of `CITY`'s hand-built city after `CITY.burnInDays` (M2.2 Ruling 12). Making it takes about 2.4 s (computed from M2.3's measured 7,774 sim days a second), so a script writes it ahead of time.
   - Homes are stand-ins, one to every 3 people, as in the design runner. Highcourt's 387 homes hold only 2,688 beds (`town-homes.test.ts`).
2. **The schedule.** Each system `economyDay` calls (18 today) gets its own tick: system k runs on tick k of every day, in `economyDay`'s order. The step times them as a new `economy` system. `economyDay` loops over the same systems, so headless runs and the economy golden don't move.
   - **Cost:** M2.1 measured 11,000 sim days a second at 1,000 households with checks off, about 91 ns per household-day (computed), mostly shopping (inference). A month-start day in one tick at 10k adds three more household passes, about 2 ms RM, past the tick's 1.25 ms slack (inference). R6 put one-pass day work at 10k at 95% of that slack.
   - One system a tick caps the worst tick at shopping, about 1.1 ms RM at 10k (inference). That fits the 5.3 ms tick and the plan's 1.2 ms row for other agent systems. perf.yml then measures it.
   - **At 100k,** shopping alone is about 11 ms RM (inference), past that row's 1.4 ms. Slicing it into 1,024-household chunks waits for M6, and no budget row is added now (owner).
   - **Determinism:** the schedule is a pure function of the tick, and only the day's window writes economy state. Global slots hold the town mark and a day's logged layoffs, so checkpoints carry both.
   - **Allocation:** the hot-path lint covers every economy folder. With a town as the bench world, perf.yml's allocation gate measures the economy too.
3. **The worker boundary.** `inspected` gains `employer` (−1 for none) and `wage` (cents a month). One new message, `economy`, follows each day's economy:
   - the last 112 days of mean price, mean wage and unemployment;
   - the day's last 16 purchases (shop, units, cents).

   The app keeps the latest, so a panel that mounts late draws at once.
4. **The UI** is vanilla TypeScript. Three charts and a table don't need Solid's bytes.
   - The inspector reads "Name, works at Shop 12 for 1,428.00 a month, wallet 3,100.00", or "Name, out of work, wallet 3,100.00".
   - A panel loads with the charts after the first frame. It draws three uPlot charts by day, each with its data table, and a table of recent trades.
   - **Fairness:** trades name no buyer, and the panel reads no name, look or culture. Wages show only in the inspector, which loads on demand.
5. **Bytes.** The worker grows by about 8–12 KB brotli (inference). First-load JS stays within 35 KB. The worker's and the M0 stand-in's size-limit entries rise to one build's measure plus 1 kB. If 35 KB can't hold, the worker loads the economy after its first snapshot.
6. **Pace.** At 1×, the panel gains a point every 144 s. Spawned firms all pay R*'s wage, so wages first differ on day 21, about 50 min in.
   - So M1.2's 1×, 4× and 16× buttons come forward as Task 8 (coordinator, 10 October 2026). At 16×, a month takes about 3 min 9 s (computed).
   - Skipping, per-tier speed caps and keys past 3 stay in M1.2.
   - A turn that can't fit its ticks runs fewer and never catches up later, so a slow device plays slower instead of stalling.
7. **Ruling 14** was rechecked by M2.3's re-confirmation (s.d. 0.0110), so the next check is M5's.

## Tasks

Two agents build it, and the tasks run in the order 1, then 2 beside 3, then 4, then 5 beside 6, then 8, then 7. Each task records the names it adds in `interfaces.md`, in its own docs commit. No two tasks share a file, and only one agent runs tests at a time. Bare paths are in `packages/sim-core/src/` for sim tasks and `apps/web/src/` for web tasks.

1. **The town start** (`sim-engineer`, Sonnet), in two commits: the record, then the town.
   - `settledRecord` moves from `tools/cli/src/design/cell.ts` to `sim-core/src/economy/settled.ts`. `sim-core/scripts/city-record.ts` writes the generated `economy/city-record.ts`, and `test:headless` runs its `--check`.
   - `spawn/record.ts`: `scaleRecord(record, people, out)` scales each count and total, rounding down. It adds one-person households to reach `people` exactly, keeps at least 7 firms, and leaves price and wage. The design runner switches to it, with the same output at its sizes.
   - `spawn/town.ts`: `spawnTown(world, people)` and `createTown`, which `sim-worker/src/worker.ts` and the pins in `sim-protocol/test/town-map.test.ts` use.
   - `Blob` gains a read-only `employer`, and the loop's `inspected` reply fills in `employer` and `wage`.
   - Check: `spawn-town.test.ts`, where a town of 3,965 folds back exactly; edge: 69 people keep 7 firms.
2. **The inspector** (`senior-game-engineer`, Sonnet), the first thing on screen. `panels/inspector.ts` writes Ruling 4's line. Check: `inspector.test.ts`, one employed line and one out-of-work line. `inspector.spec.ts`'s twin world becomes `createTown`.
3. **The economy in the step** (`sim-engineer`, Sonnet; Opus if the twin test fails for an unknown cause).
   - `economy/economy.ts`: `runEconomySystem(world, params, day, system, layoffs)` and `ECONOMY_TICKS`. `step/step.ts` calls it on a town's first `ECONOMY_TICKS` ticks of each day, after the day work, and `SYSTEM_NAMES` appends `economy`.
   - `step/warm.ts` runs a throwaway town's economy days. The bench's `createBenchWorld` makes a town, and `budget.ts` prints the economy's worst tick per tier without judging it. `goldens.json` gains `town` (1,000 people, 1,000 ticks), and the Highcourt pins and `loop.test.ts`'s system list follow.
   - Check: `economy-step.test.ts`, where a ticked town matches `economyDay` on a twin after 21 days in employers, wallets, firms and stats. Edge: a checkpoint restored on a day's 5th tick reaches the same hash at tick 3,000.
4. **The economy feed** (`sim-engineer`, Sonnet).
   - `economy/scratch.ts` gains a ring of the last 16 purchases, which `consumption/shop.ts` writes, outside the hash.
   - `sim-protocol/src/economy/feed.ts` holds `createEconomyFeed()` and `writeEconomyFeed(world, feed)`, and `messages.ts` gains the message. The loop writes the feed after a day's last economy tick and posts it after the turn.
   - Check: `feed.test.ts`, where a day's point matches the stats row; edge: after 113 days the ring keeps the last 112, oldest first.
5. **The economy panel** (`senior-game-engineer`, Sonnet).
   - `app/app.ts` gains `onEconomy(listener)`, which hands a new listener the latest message. `index.html` gains `<section id="economy">` before `#charts`.
   - `panels/economy.ts` takes its chart view from `charts.ts`, so uPlot stays in that chunk, and `main.ts` mounts it after the first frame. `.size-limit.json` gains an economy chunk entry and Ruling 5's raises.
   - Check: `economy.test.ts`, the rows a feed gives; edge: no days yet. In `economy.spec.ts`, day 0's figures and trades show after Play, and axe passes.
6. **The layoffs input** (`sim-engineer`, Sonnet). `world/inputs.ts` gains `INPUT_LAYOFFS`. `day/day.ts` adds up a day's logged layoffs in a global slot, and the economy's first system spends them. Runs are watch-only, so the app has no control for it. Check: `day.test.ts`, where a logged 50 fires 50 the next day; edge: one logged mid-day waits for the next day.
7. **Close** (the coordinator, with an Opus reviewer). Push, so CI runs `pnpm check` and the browser specs. The owner starts perf.yml once from the Actions page, since a tick path changed. Then run one `determinism-review` on Opus, because the schedule and replay carry the risk.
8. **Speed** (`senior-game-engineer`, Sonnet), M1.2's buttons brought forward (Ruling 6).
   - **The buttons:** 1×, 4× and 16× beside Play and Pause, with keys 1–3 and `aria-pressed` on the one in force.
   - **The worker:** a `speed` message that `sim-worker`'s loop obeys by running that many ticks a turn. Speed changes no state, so watch-only runs still accept it.
   - **Check:** the loop's test, where 1,000 ticks at 16× reach the same hash as at 1×. Edge: a speed sent while paused takes effect at Play. In the HUD spec, key 3 presses the 16× button.

**Risks:** the first frame took 1.49 s of its 1.5 s on GitHub's runner (9 October). The spawn adds about 1 ms to the worker's start on a desktop (inference), so watch the startup gate. The coordinator writes this brief's names into `interfaces.md`, which another session holds now.
