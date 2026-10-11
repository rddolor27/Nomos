# M2.2c Every town runs the sim: brief

> **Status:** brief (11 October 2026). Ask the owner for a go before Task 1, as the ask-first ruling says. Open questions are at the end.
>
> **The owner's answers (11 October 2026, 09:31):**
> - **Go:** build M2.2c right after M2.4 Part 1 closes.
> - **Highcourt:** it is each world's capital, as Ruling 1 has it.
> - **Away towns:** they keep living while away, in a summary form. This replaces Ruling 2's frozen towns and adds about 1–2 days.
>
> **Away towns, settled** (architect, 11 October 2026): Ruling 8 advances each away town by a summary month of its row, and Task 2b builds it before Task 3's switch.

**Task:** [task.md](task.md). Each task writes its code, then its tests: the main case and one edge. It runs only those, at `nice -n 19`, with a typecheck of the packages it touched, then commits. Bare paths are in `packages/sim-core/src/` for sim tasks and `apps/web/src/` for web tasks.

## Rulings

The architect's, from 11 October 2026, built on the owner's rulings of that day. The owner can overturn any of them.

1. **One kind of town.** Every town is a place that `buildPlace(ctx)` lays out, Highcourt included.
   - **The ground:** worldgen's `place/ground.ts` ports `export_map.py`'s `town_map`: the walk grid by `walk_at`, and the buildings with their doors. `buildPlace` returns it as `map`, a `MapV1`, beside `layout`, so a place builds once. `sim-protocol`'s `map/map.ts` gains `writeMap(map): ArrayBuffer`, the format's one encoder.
   - **Kind colours:** `export_map.py` takes each ground kind's minimap colour from its tile's mean colour. The port reads them from a table of every ground kind, cut once from the sheets by a small asset script, since Python builds assets.
   - **Highcourt is place 0.** Settlement 0 is each world's capital (`settle.ts`). The map worker gives place 0 Highcourt's pinned context and name, so the first screen's town is on every map.
   - **`town.nmap` stays** as place 0's prebuilt ground, so the first frame waits for no world generator. `worldgen/scripts/town-map.ts` writes it from the port, and its `--check` joins `test:headless`. Python no longer makes it.
   - **One renderer:** the Town skin draws every live town, with the place pass as its engine, and `TownSkin.setLayout(layout)` swaps towns. The place view keeps only wonders, as still vistas.
   - **Cost if wrong:** Highcourt's biome and river needn't match its map cell. A first town generated per world would need the world generator before the first frame, which took 0.6 s in R4's Node prototype (measured there).
2. **Switching.** Entering settlement p sends the sim worker `{ type: 'open', place: p, map }`, with the place's `.nmap` bytes from the map worker.
   - **When:** the worker keeps the parsed ground and homes as pending, and logs `INPUT_FOCUS` with the existing `logFocus`. A focus change that writes canonical state waits for a day boundary ([R4 report](../../../../research/round-4-multi-scale/report.md), its fourth replay rule). So the worker runs the rest of the day at once, posting no snapshots.
   - **What:** at that boundary, before the day's window opens, `switchTown(world)` folds the live town (`world.focus[0]`) into its row with `foldToLedger`. It moves that town's money back to MINT and empties its agents, households and firms. It spawns row p on the pending ground, keyed on (p, day), and starts three in four walking. A spawn off a month's first day makes the month's consumption plans at once.
   - **The culture wall:** the emptying keeps the stand-in culture column `layoutWorld` wrote, since guarded `spawn/` may not write culture.
   - **Atomic:** the worker handles `open` in one turn, so no checkpoint or inspect falls between the log and the switch.
   - **Old worlds:** a focus on the live town switches nothing. In a world that isn't a town, a focus only sets `focus[0]`, as now, so `day.test.ts`'s focus tests hold.
   - **Away towns keep living** as summary rows (Ruling 8), so a switch spawns a town from its advanced row.
   - **Determinism:** a replay rebuilds a switch from its log entry (tick, place). The place's ground comes from the world seed through worldgen, whose place goldens already replay in Node and Chromium.
   - **Watch-only holds:** a switch chooses the view and steers no blob, as speed does.
   - **The panel** restarts at a switch, showing only the live town's days. The spawn transient in `HANDOFF.md` (unemployment 8.3% to 4.8% by day 21) repeats after each switch.
3. **Each town's record.**
   - **Rows:** the arena gains a ledger table, `MAX_TOWNS` rows of 14 fields, at its end so no offset moves. A row with no people is unvisited. It is canonical, so checkpoints carry it and a town's hash covers it. 1,024 rows take 112 KiB (computed); Task 3 sizes it to the most settlements in the 20 golden worlds.
   - **A first visit:** `townRecord(beds, largestHome, out)` runs `scaleRecord(CITY_RECORD, beds, out)` for jobs, firms, cash, price, wage and stock. Then `HOUSEHOLD_MIX` sets the household fields, so people equal beds. It reads no look or culture.
   - **The mix,** per mille of households of 1–6: 220, 280, 200, 170, 80 and 50, a mean of 2.76 people (unsourced estimate). Households of s, for s from 2 to 6, number ⌊beds × mix(s) ÷ 2,760⌋, and one-person households take the rest exactly. Sizes above the town's largest home get none. Highcourt gets 229, 272, 194, 165, 77 and 48 households, 985 in all (computed).
   - **The economy:** a household is the people who share a home. Each member stays Lengnick's one-person household (M2.2): its own job search, wage and wallet, and its own 3 portions a day (M2.4). No member is a child, since bodies carry no age.
   - **M2.3's calibration:** no cost now (inference), since scaling keeps every ratio a head and the economy reads no household. `CITY`'s goldens hold. M2.5's pooled money re-runs it.
   - **The map's population** (52,000 for Highcourt) stays the settlement's figure, and the sim holds the drawn district's beds. M9's districts reconcile the two.
4. **Beds and homes.**
   - **Beds** are the home entities' capacities by house form, from `export_map.py`: hut 2, detached and row 4, farmhouse 6, apartment 24. M3.1 Task 11's cabin 3, townhouse and corner 6 join them, with handed pieces as their plain one. An unknown form throws.
   - **Seating:** `createTown(seed, tier, ground, homes)` and `spawnTown(world, homes)` spawn one blob per bed. `seatHouseholds` seats households largest first, by keyed first fit, and the ones fill every gap. Flats share an apartment, and a small household may share a house.
   - **"House N":** home row r is the r-th home entity, so the card's "House r + 1" is a drawn house.
   - **Stand-in homes** stay only for `?tier=`, the bench and the CLI. `townAgents` and `TIER_TILES_PER_AGENT` go.
5. **The decorative walkers go:** `walkers.ts`, Pause people, `PlaceWalks`, `PlaceCrowd`, `walks.ts` and `street-crowd.ts`. The Town skin already draws only the sim's blobs. A wonder's people stand where `place.py` put them.
6. **Performance and bytes.**
   - **Tick:** Highcourt's 2,688 blobs are 27% of the phone tier's 10,000 (computed), within the 5.3 ms budget. Task 1 finds the most beds in any place of 2 worlds. Past 10,000, the spawn caps people at the tier's rows, and the brief returns to the owner.
   - **The worker's start** shrinks, as phones drop from 3,965 blobs to 2,688. `createTown` took 18–21 ms at 3,965 (measured here, Node 24.18.0 on Windows, load not recorded).
   - **A switch** costs the place build, 27–32 ms warm for a capital before Part 3's walls (M3.1's plan), at most 1,439 ticks run at once, and the fold and spawn. That is under 0.5 s on a desktop (inference). Task 4 measures it, and the view says "Opening <name>…" meanwhile.
   - **First load:** `town.nmap` keeps its bytes, and the port and `writeMap` load only in the map worker's lazy chunks. The sim worker gains about 1–2 KB brotli (inference), and its size-limit entry rises to one build's measure plus 1 kB. Nothing new runs before the first frame, whose gate took 1.49 s of 1.5 s on GitHub (9 October).
   - **Allocation:** a switch allocates only in the `open` handler. The switch day takes the month days' interim allowance if it needs one.
7. **The order.** Highcourt in real homes shows first, after Task 2, with no switching. Then the switch, then live towns in the app, then the clean-up. One or two agents build at a time.
8. **Away towns keep living** (architect, 11 October 2026, decided on the owner's ruling). The options were a summary model of each away row, a fast-forward re-running the real economy on return, or both.
   - **The model: a summary month.** Once each 21-day month, every visited town but the live one advances its row by `stepAwayTown`, in `spawn/away.ts`. The real economy never re-runs.
     - People, households, firms and the cash total stay to the cent: this cut has no births, deaths or migration, and `CITY` issues no money (`fiatIssuePpm` 0).
     - Employed, price and wage each move a share of the way back to the town's first record, `scaleRecord(CITY_RECORD, people)`, plus zero-mean keyed noise. Task 2b fits the shares and noise to a live town. Noise, as a share of the record's level, scales by √(1,000 ÷ people), since it sums many small choices (inference).
     - Stock and the cash split return to the first record's, since stock targets and month-end pay reset both within a month.
     - Every field stays whole and within `checkRecord`, so a stepped row always spawns.
     - On a first visit, the new record lives every month begun before the switch day, then spawns. So a town first seen on day d has lived since day 0.
   - **Why:** a summary costs microseconds a town and keeps every row current, which is M7's shape: M7.2's fitted emulator replaces it on the same rows. A fast-forward costs 0.25 ms a simulated day per 1,000 people (computed from M2.4's 4,077 `CITY` days a second, Node 24.18.0 on Windows). Highcourt back from a year away would take about 74 ms, growing with time away. The economy's draws key on day and row, never town, so a fast-forward would reuse the live town's. A hybrid runs two models of one town.
   - **What the player sees:** a returning town's unemployment, prices and wages have moved within the live town's monthly spread, and its visit's disturbance has mostly healed. Ruling 2's spawn transient still follows each switch.
   - **Cost if wrong:** a summary unlike the live model shows as a bigger transient after a switch. The fast-forward needs only `spawnFromLedger` and `economyDay` as they stand.
   - **Determinism:** draws key on (town, month, field) on `AWAY_DRAW`, the first ledger stream (`LEDGER_SALT + 1`), apart from every agent draw (R4's first replay rule). A row reads only itself, so town order can't matter.
     - Nothing new is logged. Like the economy, the step is a function of canonical state and the day, so a replay recomputes it from the same `INPUT_FOCUS` log. Checkpoints and the hash carry the table (Ruling 3).
     - It reads no input, look or culture and steers no blob, so watch-only holds. A town's history depends only on (seed, town, beds) until its first visit, and on the focus log after.
   - **Schedule and cost:** at each month's first-day boundary, after any switch, `stepAwayTowns` steps every row with people but `focus[0]`'s, in one pass.
     - 200 towns take about 0.1 ms of that tick, 2% of the phone tier's 5.3 ms. That is computed from R4's 0.5 µs a settlement-day, measured in Node; this code's cost is inference.
     - A full table of 1,024 rows takes about 0.5 ms, and a first visit's catch-up about 27 µs in a ten-year world (computed). It allocates nothing, and slicing waits for M7's country (R4's fifth rule).
   - **Money between towns:** none moves in this cut, by trade, migration, commuting, taxes or transfers. A row's cash sits outside the ledger. MINT issues it at each spawn and retires it at each fold, so all accounts plus MINT sum to zero every tick. M7.1's national accounts and M7.3's trade, migration and commuting bring flows, planned from a snapshot and applied in a fixed order.

## Tasks

The order: 1 beside 2, then 2b beside 5, then 3, then 4, then 6, then 7, then 8. Each task records its names in `interfaces.md` in its own docs commit.

1. **The ground port** (`sim-engineer`, Sonnet). Worldgen's `place/ground.ts` and `build.ts`, `sim-protocol`'s `map/map.ts`, and `worldgen/scripts/town-map.ts`. `TOWN` moves from `apps/web/src/map/town.ts` to worldgen's `place/town.ts`, for the script and the map worker. Check: `town-map.test.ts`, where `writeMap(buildPlace(TOWN).map)` equals `town.nmap` byte for byte; edge: every door in every place of 2 worlds touches a walkable cell. Print the most beds found.
2. **One blob per bed** (`sim-engineer`, Sonnet). `spawn/record.ts` gains `HOUSEHOLD_MIX` and `townRecord`, `spawn/town.ts` takes homes, and `sim-worker/src/worker.ts` reads them from the map. One web line: `app/tiers.ts` sends `agents` only under `?tier=`. Re-pin Highcourt and the `town` golden. Check: `spawn-town.test.ts`, where Highcourt spawns 2,688 blobs in 387 homes, every bed full, in Ruling 3's households, and folds back exactly; edge: a town whose largest home has 4 beds has no household of 5 or 6.
2b. **The summary month** (`sim-engineer`, Sonnet). `spawn/away.ts` holds `stepAwayTown(rows, town, seed, month, anchor)`, which steps one row of a bare 14-field table in place. `stepAwayTowns(rows, live, seed, month, anchor)` steps every row with people but `live`. `anchor` is a scratch row the caller owns, and `random/streams.ts` gains `AWAY_DRAW`.
   - **The fit:** `scripts/away-rates.ts` prints each field's share, 1 − φ, and noise, s√(1 − φ²). Here φ is the lag-1 autocorrelation of the field's month-start level about the record, and s its standard deviation. It runs a 1,000-person `CITY` town spawned from `CITY_RECORD`, months 2–241 on seeds 1 and 2 (about 2.5 s in Node, computed). `away.ts` holds the results, citing the run. A share stays at least 1% a month (unsourced estimate), so nothing drifts without bound.
   - **Check:** `away.test.ts`, where 120 months keep a row's people, households, firms and cash to the cent and within `checkRecord`, and a row at three times its record's unemployment ends nearer it after 12 months; edge: a town of 7 people and 7 firms stays within bounds for 1,000 months.
3. **The ledger table and the switch** (`sim-engineer`, Sonnet; Opus if a twin test fails for an unknown cause). `world/world.ts` gains the table, an anchor scratch row, and a writable ground and homes, and `spawnTown` sets `focus[0]` to 0. `spawn/switch.ts` holds `requestTown(world, place, ground, homes)` and `switchTown(world)`, which `day/day.ts`'s focus case calls. It wires Ruling 8. `switchTown` steps a first visit's record through the months begun before its day. The boundary calls `stepAwayTowns` on a month's first day, after its inputs. `goldens.json` gains `switch`: place 0 to place 1 on the stand-in ground at tick 500, back at 2,000, hashed at 3,000. Check: `switch.test.ts`, where a town left and re-entered within a month spawns its folded row exactly, one away over a month start spawns after one summary month, and money plus MINT stays zero; edge: a switch logged at a day's tick 5 lands at the next tick 0, and a logged twin matches at tick 3,000. `apps/web/test/towns.test.ts` spawns and folds every settlement of 2 worlds exactly.
4. **The worker's switch** (`sim-engineer`, Sonnet). `sim-protocol`'s `messages/messages.ts` gains `open` and `opened { place, agents, width, height, tick }`. `sim-worker/src/loop/loop.ts` handles `open` in one turn, and `sim-protocol`'s `economy/feed.ts` restarts at the switch. Check: `loop.test.ts`, where an `open` at tick 700 posts `opened` at tick 1,440 with the new town's beds; edge: an `open` while paused switches and stays paused. Measure a switch in Node.
5. **The Town skin's swap** (`render-engineer`, Sonnet). `render-gl/src/town/town-skin.ts` gains `setLayout(layout)`. Check: its test, where a swap to a smaller place draws that place's people; edge: swapping back draws the first place.
6. **Live towns in the app** (`senior-game-engineer`, Sonnet). `map/generate.ts` gives place 0 Highcourt, and `map/place-builder.ts` adds `map` to `PlaceReply`. Enter sends `open`, closes the map, swaps the Town skin and the renderer's map, and fits the camera. `map/place-view.ts` keeps wonders, and `map/walkers.ts` goes. Check: `towns.spec.ts`, where entering a village shows its beds' count in the Town skin, the panel restarts, Back to Highcourt shows its crowd, and axe passes; edge: entering the live town just closes the map.
7. **The clean-up** (`sim-engineer`, Sonnet). Delete `walks.ts`, `street-crowd.ts`, `PlaceWalks` and `PlaceCrowd`, and their buffers in `placeBuffers`. Check: the typecheck and the place tests it touched.
8. **Close** (the coordinator). Push, so CI runs `pnpm check` and the browser specs, and the owner starts perf.yml once. Then one `determinism-review` on Opus, since the switch and the summary month move money and replay.

## Open questions

1. **Decided** (owner and architect, 11 October 2026): R4 recommended shadow-canonical history, where watching writes nothing canonical. Fold and spawn is R4's "consequential focus", so the order of visits still shapes history. Unwatched towns no longer stand still, since Ruling 8 advances them. M7–M9 can move to R4's default on the same rows.
2. The household mix is an unsourced estimate. Check it against UN DESA's household size and composition database before M2.5.
3. The most beds in a place and `MAX_TOWNS` wait on Tasks 1 and 3.
4. A restored checkpoint needs its live town's ground. The app restores nothing yet, so M6's saves must carry the live place.
5. Whether a switch day fits the allocation allowance waits on perf.yml.
6. **For the owner:** should the map show an away town's row, labelled "estimated" as R4 advises? Nothing reads a row in this cut, so a town's summary months show only on return.
