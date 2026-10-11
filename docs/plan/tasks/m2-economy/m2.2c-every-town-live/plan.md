# M2.2c Every town runs the sim: brief

> **Status:** brief (11 October 2026). Ask the owner for a go before Task 1, as the ask-first ruling says. Open questions are at the end.

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
   - **Away towns stay frozen** in this cut. M9's ledgers can advance the same rows later.
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

## Tasks

The order: 1 beside 2, then 3 beside 5, then 4, then 6, then 7, then 8. Each task records its names in `interfaces.md` in its own docs commit.

1. **The ground port** (`sim-engineer`, Sonnet). Worldgen's `place/ground.ts` and `build.ts`, `sim-protocol`'s `map/map.ts`, and `worldgen/scripts/town-map.ts`. `TOWN` moves from `apps/web/src/map/town.ts` to worldgen's `place/town.ts`, for the script and the map worker. Check: `town-map.test.ts`, where `writeMap(buildPlace(TOWN).map)` equals `town.nmap` byte for byte; edge: every door in every place of 2 worlds touches a walkable cell. Print the most beds found.
2. **One blob per bed** (`sim-engineer`, Sonnet). `spawn/record.ts` gains `HOUSEHOLD_MIX` and `townRecord`, `spawn/town.ts` takes homes, and `sim-worker/src/worker.ts` reads them from the map. One web line: `app/tiers.ts` sends `agents` only under `?tier=`. Re-pin Highcourt and the `town` golden. Check: `spawn-town.test.ts`, where Highcourt spawns 2,688 blobs in 387 homes, every bed full, in Ruling 3's households, and folds back exactly; edge: a town whose largest home has 4 beds has no household of 5 or 6.
3. **The ledger table and the switch** (`sim-engineer`, Sonnet; Opus if a twin test fails for an unknown cause). `world/world.ts` gains the table and a writable ground and homes, and `spawnTown` sets `focus[0]` to 0. `spawn/switch.ts` holds `requestTown(world, place, ground, homes)` and `switchTown(world)`, which `day/day.ts`'s focus case calls. `goldens.json` gains `switch`: place 0 to place 1 on the stand-in ground at tick 500, back at 2,000, hashed at 3,000. Check: `switch.test.ts`, where a town left and re-entered spawns its folded row exactly, and money plus MINT stays zero; edge: a switch logged at a day's tick 5 lands at the next tick 0, and a logged twin matches at tick 3,000. `apps/web/test/towns.test.ts` spawns and folds every settlement of 2 worlds exactly.
4. **The worker's switch** (`sim-engineer`, Sonnet). `sim-protocol`'s `messages/messages.ts` gains `open` and `opened { place, agents, width, height, tick }`. `sim-worker/src/loop/loop.ts` handles `open` in one turn, and `sim-protocol`'s `economy/feed.ts` restarts at the switch. Check: `loop.test.ts`, where an `open` at tick 700 posts `opened` at tick 1,440 with the new town's beds; edge: an `open` while paused switches and stays paused. Measure a switch in Node.
5. **The Town skin's swap** (`render-engineer`, Sonnet). `render-gl/src/town/town-skin.ts` gains `setLayout(layout)`. Check: its test, where a swap to a smaller place draws that place's people; edge: swapping back draws the first place.
6. **Live towns in the app** (`senior-game-engineer`, Sonnet). `map/generate.ts` gives place 0 Highcourt, and `map/place-builder.ts` adds `map` to `PlaceReply`. Enter sends `open`, closes the map, swaps the Town skin and the renderer's map, and fits the camera. `map/place-view.ts` keeps wonders, and `map/walkers.ts` goes. Check: `towns.spec.ts`, where entering a village shows its beds' count in the Town skin, the panel restarts, Back to Highcourt shows its crowd, and axe passes; edge: entering the live town just closes the map.
7. **The clean-up** (`sim-engineer`, Sonnet). Delete `walks.ts`, `street-crowd.ts`, `PlaceWalks` and `PlaceCrowd`, and their buffers in `placeBuffers`. Check: the typecheck and the place tests it touched.
8. **Close** (the coordinator). Push, so CI runs `pnpm check` and the browser specs, and the owner starts perf.yml once. Then one `determinism-review` on Opus, since the switch moves money and replays.

## Open questions

1. **For the owner:** R4 recommended shadow-canonical history, where watching writes nothing canonical. Fold and spawn is R4's "consequential focus", so the order of visits shapes history, and unwatched towns stand still. This brief follows the owner's ruling; M9 can move to R4's default on the same rows.
2. The household mix is an unsourced estimate. Check it against UN DESA's household size and composition database before M2.5.
3. The most beds in a place and `MAX_TOWNS` wait on Tasks 1 and 3.
4. A restored checkpoint needs its live town's ground. The app restores nothing yet, so M6's saves must carry the live place.
5. Whether a switch day fits the allocation allowance waits on perf.yml.
