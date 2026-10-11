# Nomos hand-off

The rulings in force and a short log, a few lines per step. The latest checkpoint holds the state and the next task. The log before the restructure of 10 October 2026 is in git: `git show 6736fb6:docs/plan/HANDOFF.md`.

## Rulings in force

The owner can overturn any of these.

**Owner, 10 October 2026:**
- **Proof of concept.** Tests run in Node and in Chromium, which covers Chrome and Brave. Bun and Deno are dropped for good, and Firefox and WebKit return before launch. Where an older plan names them, or the deleted `scripts/engines.ts` and `stdlib.yml`, run the pnpm checks in Node and Chromium instead.
- **Testing.** Each task's code comes first, then its tests, covering the main behaviour and one edge case. Engineers run only those tests and a typecheck of the touched packages, and nothing slow runs on each edit. Lint, `pnpm check` and the one review run once the whole feature is built, with `pnpm test:browser` when the page changed and the review only for money, economy or determinism changes. The perf workflow runs by hand, after a tick or frame path changes.
- **Models.** Engineer agents default to Sonnet; Opus is for design calls, plans, reviews and bugs of unknown cause.
- **TypeScript only.** The program runs in TypeScript, the map and town generators included. Python builds only assets: sprites, sounds, the atlas, mockups and licences. `tools/worldgen` is frozen, and its saved outputs still check the TypeScript for the parts they cover; a deliberate change to one of them first moves its regeneration to TypeScript, as `packages/worldgen/scripts/frozen.ts` does.
- **The owner's computer stays responsive.** Heavy runs (the whole unit suite, `pnpm check`, the headless runs, the browser suite and the bench) run in CI on GitHub, never on the owner's machine. Locally, run only the test files a task added or changed, one command at a time, at idle priority (`nice -n 19`); a task that changes no test runs none. Playwright runs one worker, and Vitest two outside CI.
- **Names.** The owner approves the generated place names without a review, so M8.1's Task 34 freezes version 1 without asking.
- **Parallel agents.** Up to four agents build at once, each on its own files, because one at a time was too slow. Each runs only its own test files at `nice -n 19`, and only one runs Playwright at a time.
- **Pushes.** The coordinator pushes `main` after each finished feature, with the owner's standing OK, so CI runs the full checks; agents never push.
- **Git only.** There is no `gh` CLI: Claude uses git alone, never asks the owner for `gh` or CI results, and skips any plan step that needs `gh`.
- **No dots on the world map.** The map's walking crowd is gone; the people and walkers in places stay, and Pause people keeps its own state.
- **Decisions.** Claude settles open owner decisions itself, and records each here as a ruling.
- **Walled towns,** the final answers for M3.1 Part 3: density peaks at the plaza; stone walls with towers for capitals and cities, a palisade for towns, and none for villages and hamlets; roads by role; farms on the outskirts; the new buildings; suburbs, bridges, avenues and greens. Tasks 12–16 and 19–21 wait for the owner's go.

**Owner, 11 October 2026,** after seeing M2.2b's flat monthly charts:
- **Ask first:** Claude asks the owner before starting each new step or feature, with a short plan, and waits for a go.
- **Every town runs the sim:** the town in view is live; leaving it folds it into its record, and the next spawns from its own. The first screen becomes one town among them.
- **Crowds:** a town holds one blob per bed in its houses, so Highcourt drops to about 2,688.
- **The blob modal:** a click shows the blob's picture, name, job and pay, home and household, what it is doing, and its look.
- **The order:** first food and goods (M2.4 Part 1) beside the modal; then every town running the sim; then trips to work and shops. Ask again before each step.
- **Life on the street** (about 10:00): blobs must be seen buying at shops and a market, trading, carrying what they bought, and eating. Plan it first as M2.7 Part 1, then make its assets, with mockups shown to the owner first.
- **M2.2c's go** (09:31): build it right after M2.4 Part 1. Highcourt is each world's capital. Away towns keep living in summary form, not frozen, so an Opus pass settles how before Task 3.

**The designers' calls, 10 October 2026:**
- houses: the corner houses' L-shaped wing, cream doors, and handed pieces drawn at random rather than in pairs;
- terrain: snow overlays on bridges (13 px of atlas), the palisade side gate as tall posts only, gates 2 tiles wide, and no palisade watchtower;
- buildings: `_large` rather than "grand", a joiner's shop, a stone threshing barn, a civic clock tower on the capital icon, and a watermill on east banks only, with no wheel animation.

**The coordinator's rulings:**
- **Places:** 176×112 for capitals and cities, 152×96 for towns, and the walls' look as drawn.
- **The first screen:** one blob per bed in Highcourt's homes, 2,688 on every tier, by the owner's ruling of 11 October 2026 (218b1d2). The old rule of one blob per 2–4 walkable tiles is gone. A `?tier=` URL still runs a whole tier in stand-in homes for perf. The Town skin holds up to 9,000 blobs in view, and stays up to 10,350.
- **Spawn:** the bench row for 100,000 agents is 35 ms, since M9 spawns only the districts in view.
- **The economy (M2.3):**
  - the pay-cut target is a tier-2 gap until M5's treasury brings inflation;
  - `burnInDays` is 31,883 since M2.4 Part 1's goods: MSER-5 over 80,000 days, because a 40,000-day run's cut hit MSER-5's limit. It was 18,428 with exits off (Ruling 18);
  - no credit line, since Ruling 14's trigger didn't trip (s.d. 0.0110 on seeds 2001–2050); recheck at M2.2b and M5;
  - exits off in `CITY` (`shortPayExitPpm` 0) until entry is designed (Ruling 19), so the exit target is a tier-2 gap meanwhile.
- **The economy on screen (M2.2b):**
  - M1.2's 1×, 4× and 16× buttons came forward (Ruling 6). Each turn still posts one snapshot, and keys 1–3 work only while the view or the HUD has focus.
  - lil-gui and the per-system timings load only with `?dev=1`, and the Map button is in the HUD.
  - A plain day keeps the 16 KiB allocation limit. A month's last and first days get an interim allowance until M6.
  - A town's crowd starts three in four walking.
  - One inspect quirk is accepted: at a month's last day, between ticks 12 and 13, an inspect can show the wrong wage.

## Open

Beyond the checkpoint's Open list:
- **Browser specs.** `hud.spec.ts`'s "zooms and pans", `town-skin.spec.ts`'s 2560×1440 case and `map-goto.spec.ts` are fixed by pausing the sim or crowding the scene (9d4c402, 25a084b, c44c526, fa9f56f). `map-crowd.spec.ts` went with the map crowd (75e2652); its one zoom-bar test moved to `map-goto.spec.ts`. CI passed its check and browser jobs on 3476e70 (run 81, read before the git-only ruling); later runs weren't read.
- **Stale docs:**
  - the 48×28 town in `place-camera.test.ts:11`, `interfaces.md`'s Places sizes, `countries.md:46`, the M3.1 plan (line 41) and the M0.4 plan (line 83);
  - the old hash `b3b2c251` in `interfaces.md:163`, the M8.1 plan (line 300) and the M8.3 plan (lines 85 and 1844).
- **The shared plan doc** still names five engines, Deno and the 2% pay cut. It also lacks M3.1 Part 3, whose suggested tag is "(Towns)". Update it at the next sync, with the owner, along with the deferred items in `git show 6736fb6:docs/plan/HANDOFF.md`.
- **Local specs:** a stray `vite preview` on port 4173 serves the last build of `apps/web/dist`, and Playwright reuses it outside CI. Build before a local spec run.
- **Perf to check:** the economy's month-start `searchShops` (1.78 ms at 10k), and `createTown`'s extra 11 ms at the worker's start. `pnpm budget`'s sampled days miss a month's start. perf.yml, which the owner starts by hand, measures them.
- **perf.yml:** it hasn't run since the economy joined the step. The owner starts it from the Actions page. Watch the startup gate, the tick budget at 10k, and the allocation allowance on a month's last day, whose readings swing 0.24–0.92 MB.
- **Speed at 100k:** at 16× the desktop tier saturates the worker, so M1.2's per-tier caps are still needed.
- **A spawn transient:** a spawned town matches the record's totals, but every shop starts at one wage. So unemployment falls from 8.3% to 4.8% at day 21 before it settles.
- **Small follow-ups for `junior-game-engineer`:**
  - fold the segmented-button CSS, now in `toolbar.ts`, `zoom-bar.ts` and `speed-bar.ts`, into one rule;
  - drop `#side`'s 72 px top padding without `?dev=1`;
  - show the phone's inspector line without a scroll;
  - move `SystemRows` into the controls chunk;
  - the charts chunk has only 0.08 kB spare.
- **Names:** re-running `build-real-world.ts` would overwrite the 42 hand-added religion words. A test catches that, and a merge file would make them last.
- **The owner's go:** M3.1 Part 3's Tasks 12–16 and 19–21 (walls, towers, gates and farms). M0.5 waits only on the owner's device timings.
- **Backlog from before the restructure** (checkpoint 0034 and the nomos-bd hand-off):
  - **Unbuilt tasks:** M0.8's leftovers (lil-gui behind `?dev=1`, the town's Fit, Home and pinch, and `toolbar.ts` in the Layout table), and M8.1's Tasks 31 and 33–35.
  - **Checks:** the `names-only-in-the-inspector` dependency rule isn't `reachable`, and `fallback.spec` centres on the old 48×28 map.
  - **The app:** the Town skin and the town view fetch the atlas separately. The town view's reduced motion doesn't switch live in Chromium (low).
  - **The economy:** the slow-searcher trait keys on the row index, which M5's births must fix. M2.6's brief puts `spawn/culture.ts` in a guarded folder.
  - **Budgets:** the 35 ms spawn row for 100,000 agents has about 14% headroom, and CI's runner may be slower.
  - **Docs:**
    - `interfaces.md`'s desktop memory total, about 11.9 of 64 MiB, leaves out M2.2's and M2.3's roughly 1.1 MB;
    - M2.1's plan lines 220–221 and 258 are stale;
    - `tools/sprites/README.md` lacks the designers' edits;
    - `design` writes its columns in the machine's byte order, which `interfaces.md` records as little-endian on x64 and arm64.

## Log

- 11–12 Oct: **M2.7 Part 1 implemented; it pauses before its Opus review**, as the owner asked.
  - **Built:**
    - the 07:00 opening, so a town first shows its morning rush with 1,793 of 2,600 out (9f4e1a5);
    - the coin bubble over a buyer at the counter (fc16716);
    - the card's "Bought today" line (c2c4df5);
    - the first snapshot re-pinned at tick 420 (d80a6b8).
  - **Checks:** worker-map, towns, inspector, economy and HUD specs pass. No hash moved.
  - **Two stale tests fixed:** render-gl's dots golden, `skin-a.json`, failed since `town.nmap`'s premises regeneration (adf18aa). `map-golden.spec.ts` expected the generator's capital name, not Highcourt, since M2.2c Task 6 (55e2aee). CI's browser job was likely red from about 16:30 to this push.
  - **Bytes:** initial JS is 32.98 of 35 kB, and the worker chunk 21 of 22 kB.
  - **Watch perf.yml:** the opening run is 9–10 ms warm and 33–39 ms cold.
- 11 Oct: **M2.7 Part 1, Tasks 4–5 and fast nights** (ce26e1e..78d6adc). Blobs walk to work and shops, carry goods and eat in the running app.
  - **Premises:** they gain `stall`.
  - **The worker wiring:** `createShops(premisesOf(map))` runs at init and in `readTown`. The night run happens only after init and after a real switch.
  - **Tests:** `errands.test.ts` has 4 Highcourt cases.
  - **The snapshot:** its street bits are a second pass, gated on `STREETS`, so the 100k snapshot is 0.39 ms.
  - **Fast nights** run only in a town with streets.
  - **The feed:** day 0's feed is posted by the first turn after Play.
  - **`nearestAgent`** skips indoors blobs while `STREETS` is 1.
  - **Pins:** Highcourt on the shops path is `cca95710` and `a9f09068`; the other goldens held.
  - **Timings** (Node): the step at 10k averages 0.078 ms, the economy window peaks at 1.73 ms, and a night takes 19–20 ms at Highcourt and 48–54 ms at 10k. Worker `init` grew from 71 to 100 ms, because `createTown` went from 12 to 33 ms, so watch perf.yml's startup gate.
- 11 Oct: **M2.7 Part 1, Task 8: stock pips** (a962ced..70d3965).
  - **The rule:** `stockLevel` is 0 with no stock, 1 under a day's sales, 2 under 3 days', and 3 otherwise, per good, from the feed's newest day.
  - **What it draws:** a stall at 0 shows the closed stall. Pips stay hidden until a town's first feed.
  - **Bytes:** initial JS is 32.87 of 35 kB, and the worker chunk 21 of 22 kB.
- 11 Oct: **the coordinator's ruling:** a town opens at 07:00, not 06:00. At 06:00 everyone is indoors, while 1,793 of Highcourt's 2,600 are out by 07:00. That change is being built, with the coin bubble at `PHASE_BUYING`, the card's "Bought" line and the pins the opening moves. An Opus determinism review of the M2.7 sim runs alongside.
- 11 Oct: **M2.7 Part 1, Task 6: drawing** (43b39bc, 52850e2, ed4542f, 5c6fdde).
  - **The sprite fields:** `hold` and `eat` are in the manifest schema, the atlas and `characters.build()`, and the `holds` flag is gone.
  - **What blobs show:** the carried good unmirrored at `hold`, after the job layer. Eating swaps in `face_chew_` and moves the item through `eat` 0, 1, 2, 1. Blobs facing up, sitting or sneaking carry nothing. An indoors blob is drawn by no skin.
  - **Checks:** `town-street.spec.ts` gives equal hashes on WebGL2 and Canvas2D, and `dots`, `place` and `town-skin` specs pass. It costs 0.30 ms a frame at 2,600, up from 0.24.
  - **Bytes:** initial JS is 32.97 of 35 kB.
  - **Found:** render-gl's `golden.spec.ts` has failed since `town.nmap` was regenerated (9d9d673, 17:26), because `skin-a.json` predates it. It needs `pnpm --filter @nomos/render-gl golden` after the errands land. CI's browser job has likely been red since 4066620.
  - **Also open:** `nearestAgent` must skip indoors blobs (sent to the errands agent), and the buyer's coin bubble at `PHASE_BUYING` is in no task yet, so it joins the card's "Bought" line.
  - **`interfaces.md` lines still to write:**
    - the sprite manifests' `hold?` and `eat?`;
    - `AtlasFrame`'s `hold?` and `eat?`, and the layer order;
    - `PlacePeople`'s optional `item`, `eat` and `indoors`, with `ITEM_GOODS`;
    - `Retained.tick`;
    - the Town skin people's item, indoors and eat;
    - the visual-word table's bits 7 and 27–30.
- 11 Oct, 22:15: **M2.7 Part 1 resumed** after the owner's GPU change. Three Sonnet agents run on separate files:
  - **Errands:** Task 4's last steps, then Task 5's wiring and fast nights. Its files: `sim-core`, `sim-worker`, `sim-protocol`'s `map/premises.ts` and `snapshot/street.ts`.
  - **Drawing:** Task 6, the `hold` and `eat` sprite fields, then the carried item, eating and the indoors skip. Its files: `render-gl`'s `place/`, `town/people.ts`, the painters and the harness, plus the sprite schema, `tools/sprites` and `tools/atlas`. It's the only Playwright runner.
  - **Pips:** Task 8, in `render-gl`'s `town/pips.ts` and `town-skin.ts`, plus `apps/web` and `.size-limit.json`.
  - **If a session ends mid-run:** each agent commits finished pieces only. Check `git log` after 9af85c6 for what landed, and `git status` for half-done edits; stash those by path before resuming.
- 11 Oct: **M2.7 Part 1, Task 4: errands, paused partway** for the owner's GPU change (093cd98, 1ae12d6).
  - **Committed:**
    - the errand store, hashed only while `globals[STREETS]` is 1, with `STREET_DRAW`;
    - `dayFood` and `dayGoods` recorded in `buyFood` and `shopDay`;
    - the `street/` motion, timetable, walk and open;
    - the `step`, spawn, switch and `requestTown` wiring. A town without shops still wanders.
    - Every hash held, Highcourt's pins included, since no test hands shops yet.
  - **Measured** (Highcourt, 2,600 blobs, 3 days): 8,220 trips, none off open ground, every arrival at the right door and every return home. Movement costs 0.018 ms a tick on average and 0.16 ms at worst. At 10:00, blobs are carrying food, buying and eating, and all six stalls have a keeper.
  - **The timetable as built:**
    - plans are made at 04:00–05:59;
    - a worker commutes on a workday if the way is 300 ticks or less (1,538 of 2,402), leaving 06:00–06:59 and working until 15:00–15:59;
    - everyone else makes one food trip from 06:00, and a rest day adds goods if they fit;
    - every trip must be home by 22:00, buying takes 10 ticks and eating 24;
    - a stall's first worker stands at (doorX, doorY − 1);
    - cut-off homes stay indoors.
  - **Left, in order:**
    1. `map/premises.ts` gains `stall: boolean`, and the village `toEqual` in `premises.test.ts` is fixed.
    2. The worker wiring: `createShops(premisesOf(map))` into `createTown` and `requestTown`, `TownSite.shops?`, and `while (streetsAsleep(world)) step(world)` after `init` and after a real switch in `loop.ts`.
    3. `errands.test.ts` on Highcourt, then a re-pin of `town-map.test.ts` on the shops path.
    4. Timing at 10,000 blobs.
    5. The docs and plan.md's Ruling 3 amendment.
    6. Task 5's wiring: `indoorsIn(phase)`, `carriedIn(phase, good)`, `phase === PHASE_EATING`, and the coin bubble at `PHASE_BUYING`.
- 11 Oct: **M2.7 Part 1, Tasks 5–6, paused at their start** (483176d).
  - **Committed:** the visual word gains `indoors` (bit 7), `item` (bits 27–29, BREAD 1 to FUEL 7) and `eating` (bit 30), with `indoorsOf`, `itemOf` and `eatingOf`. `packVisual`'s new arguments default to 0.
  - **The seam:** `sim-protocol`'s `snapshot/street.ts` holds `indoorsAt()`, `itemAt()` and `eatingAt()`, each returning 0. They gain `(world, blob)` and read the errand store.
  - **Left:**
    1. Add the `hold` and `eat` sprite fields (HANDOFF's Task 7 recipe), and drop `characters.build`'s `holds` flag.
    2. Drawing: `tick` in `Retained`; wider `RECORD_SHORTS` and `AtlasFrame`; optional `item`, `eat` and `indoors` columns in `PlacePeople`; an `ITEM_GOODS` list; the item drawn at `hold` after the job layer; eating at `eat` 0, 1, 2, 1 under `face_chew_` 0, 1, 0, 1; `indoors` skipped in both painters.
    3. A harness hook for the spec.
- 11 Oct: **paused** for the owner's GPU change (checkpoint 0042). Fast nights and stock pips weren't started; their agent was stopped before any edit.
- 11 Oct: **M2.7 Part 1, Task 3: fields and runs** (699a361, 68b72ad, dcddefa).
  - **Built:** `street/` sits behind the culture wall, with one field per premises (433,664 B at Highcourt, outside the hash, at the arena's end of a tier's layout). Building all 22 takes about 9.7 ms warm.
  - **Routes:** `pathRuns` turns a field into at most 16 straight runs. At Highcourt the worst way takes 15 and the mean is 4.9. A diagonal costs two, since unit cost needed up to 28 runs, so ways walk about 11% further.
  - **Walk length:** a way takes 259 ticks on average, 632 at most, so Task 4 fits the timetable to it.
  - **Backlog:** in 2 of 6 sampled towns, 44–45 homes are cut off from every premises behind a river with no walk-grid crossing. That's a layout bug.
- 11 Oct: **M2.7 Part 1, Task 2: premises in the layout, with Task 7's sprite swap** (5aa6991..4066620).
  - **Built:** `placeTrades` gives each market good 2 stalls on the plaza, and each shop trade 4 shops in a capital or city and 3 in a town, spread round the plaza in rounds. Doors use the sprite's own `door`, and a village's one shop sells all seven goods. Highcourt has 22 premises.
  - **The coordinator's ruling:** the premises take street frontage, so Highcourt holds 375 homes and 2,600 blobs, down from 387 and 2,688. Placing them after the houses kept 2,688 but scattered shops to the map's edge.
  - **Pins:** Highcourt's are `498f12cb` and `4bf399fa`, and 317 of 1,033 place goldens moved; nothing in `goldens.json` moved. `scripts/place-goldens.ts` now writes the place goldens.
  - **The phone tunnel:** stopped at the owner's word, with port 4175 freed. `cloudflared.exe` stays in `dist/cloudflared/`.
- 11 Oct: **M2.2c done:** every town runs the sim (1f9c645..ffb41e8).
  - **Task 7:** it removed 555 lines of walk loops and street crowd, so `buildPlace(ctx)` returns `{ layout, map }`.
  - **Hashes:** Highcourt's pins `ff861cb3` and `da92906e` and `town.nmap` held. The goldens are `switch` `cc4584e8`, `visit` `a7bd4005` and the away row.
  - **Flake:** `towns.spec.ts` failed twice under CPU load and passed alone.
  - **Backlog:** `sim-protocol/src/shared/steering.ts` is orphaned. No test checks that a generated place's `map.walk` keeps off drawn water, cliffs and sprites; only Highcourt is checked tile for tile.
  - **The owner's phone:** it reaches the app through a Cloudflare quick tunnel to a frozen copy of the build (`dist/phone-preview` on port 4175, `dist/cloudflared/`), at the owner's request. Stop both when the owner is done.
- 11 Oct: **M2.2c Task 6, live towns in the app** (5d9ca58..d9625f0, 80901c1).
  - **Opening a town:** Enter on any map town shows "Opening <name>…", then swaps the Town skin to that town, which runs live with one blob per bed. The camera fits it, and the HUD and the economy panel restart.
  - **Getting back:** "Back to Highcourt" returns the folded 2,688. Place 0 is Highcourt in every world.
  - **Gone:** the decorative walkers, Pause people and `town-view-qa.spec.ts`. The town view now opens wonders only.
  - **The blob card:** it refreshes every second by `inspectAgent`.
  - **Checks:** towns, town-view, inspector, map-goto, map, economy, a11y, after-first-frame, town-zoom and town-skin specs pass. One HUD timing test timed out once under load and passed alone.
  - **Bytes:** initial JS is 29.74 of 35 kB, and the inspector chunk got 1 kB of room (80901c1).
  - **Known:** the HUD wraps to two rows below about 1,500 px while away from Highcourt. A `?tier=` session can't go back to Highcourt.
- 11 Oct: **M2.2c's review fixes** (a4064fe..41635ff).
  - **The refusal:** a switch whose homes can't seat the town is refused before any fold (`homesSeat`).
  - **A mid-month spawn** floors the firms' cash at the month so far's payroll and starts demand at the month so far. A day-15 spawn reads 6.3% unemployed at first and 3.7% after its first month end, against 7.6% and 3.0% for a day-0 spawn.
  - **The pending switch** is `focus[1]` (`FOCUS_PENDING`), with `attachTown`.
  - **New goldens:** `visit` `a7bd4005` and the away row. `switch` is now `cc4584e8`.
  - **The away fit:** bias-corrected φ, so employed 4.93%, price 1.00% (the floor) and wage 1.95% a month.
  - **A known limit:** under `?tier=` the way back to Highcourt is refused, since 10,000 can't fit its 2,688 beds. That mode is for perf only.
- 11 Oct: **M2.2c's Opus determinism review.** Nothing is critical: on the default path a switch replays exactly, keeps money exact and allocates nothing per tick.
  - **Important, being fixed:**
    - a re-entry with fewer beds than people threw after the fold and lost a row's cash, reachable via `?tier=`, so the request is now refused first;
    - a mid-month spawn gave firms month-start cash, so unemployment hit about 15% against 3.5%, and the firms now get the month so far's share.
  - **Minor, being fixed:**
    - the pending switch moves into the arena;
    - Chromium golden cases for the summary month;
    - the away fit's φ is bias-corrected;
    - one doc and comment note.
- 11 Oct: **M2.2c Task 4, the worker's switch** (4b71ce3..4442610).
  - **The messages:** `open { place, map }` runs out the day with no snapshots and switches at the boundary. `opened { place, agents, width, height, tick }` replies, and a snapshot of the new town follows. A refused or same-town `open` replies with the live town.
  - **The live card:** `inspectAgent { agent }` re-inspects a row, answering −1 past the count.
  - **Speed:** one switch in `warmUp()` compiles the path. A switch takes 4–5 ms, and the run-up up to about 35 ms (Node).
  - **Bytes:** the worker chunk is 17,700 B, so its limit is 18.7 kB. The M0 stand-in went to 30.5 kB, and initial JS holds within 35 kB.
- 11 Oct: **M2.2c's sim side is under its Opus determinism review,** while Task 6 wires live towns into the app.
- 11 Oct: **M2.2c Task 3, the ledger table and the switch** (32b6dac, 5da0886, 9495705, da09a8c).
  - **Away towns:** they aim at a live town's mean (`AWAY_LEVEL_PPM`: employed 1,003,359, price 1,006,192, wage 1,019,599). The gap they fix was smaller than first thought: 0.3%, 0.6% and 2.0%.
  - **The table:** a 512-town ledger (`MAX_TOWNS`, 56 KiB) at the arena's end.
  - **The switch:** `requestTown` sits in `day/day.ts` beside `logFocus`, to avoid an import cycle. `switchTown` folds, empties and spawns at the boundary, and a first visit lives the months already passed.
  - **Checks:** the `switch` golden is `ce41f094`, and no other hash moved. All 91 settlements of 2 worlds spawn and fold back exactly.
  - **Fixed alongside:** a stale `economy-layout.test.ts` pin of `CITY`, which had failed since M2.4's goods (da09a8c).
  - **Risk:** a pending request isn't in the arena, so a restore drops it until M6's saves carry it.
- 11 Oct: **M2.4 Part 1 done**, with the review's fixes (71efe64..6a06128).
  - **The fixes:** small towns spawn the food workers they eat, and `buyFood` gates on goods being 1. A test pins goods 0 to M2.3's record, and Okun counts food output, now −0.81 and holding.
  - **The burn-in:** re-measured over 80,000 days at 31,883.
  - **Current values:** `CITY_RECORD` is `[1000,0,0,0,0,0,924,76,100,297173974,12826026,3360,141863,43635]`. `town` is `8f1f75bb`, and Highcourt's pins are `ff861cb3` and `da92906e`; `746a06a3` and `6a652730` held. These supersede the older log lines below.
  - **Re-confirmed on seeds 3001–3050:** all six tier-1 targets hold. Food is 17.4% of spending, spoilage 2.2% and unmet 3.1%.
- 11 Oct: **M2.2c, Task 2b, the summary month** (2e3b3c9).
  - **Built:** `stepAwayTown` and `stepAwayTowns` in `spawn/away.ts`, `AWAY_DRAW` 0x201, and the generated `away-rates.ts`, fitted from 240 months of a live 1,000-person `CITY` town.
  - **Checks:** people, households, firms and cash stay exact. It costs 0.4 µs a town, and every hash held.
  - **The coordinator's ruling:** the drift target moves from the first record to the live town's long-run mean, a mean-over-record ratio in `away-rates.ts`. That way an away town returns looking like a live one, not 3.3% lower-paid and 1.4% cheaper. Task 3 makes the change first.
- 11 Oct: **M2.2c, Task 5, the Town skin's swap** (787cfe9): `setLayout` swaps the town drawn, and back is pixel-identical. Highcourt's first frame is unchanged.
- 11 Oct: **M2.4 Part 1's review** (Opus, pinned to c520ca7). Nothing is critical: money, the food identity, goods-0 replay, the hash rule, the draws and the hot paths hold.
  - **Being fixed:**
    - the burn-in, re-measured at 80,000 days, since the 40,000-day cut sat 18 batches inside MSER-5's limit;
    - small towns' food jobs;
    - `buyFood`'s gate;
    - a goods-0 pin to M2.3;
    - a stale test note;
    - Okun counting all output.
  - **The coordinator's rulings:**
    - food firms' prices sticking above the markup ceiling is a Part 2 gap, since it thins `price_change_share` to 9.4%, which still holds;
    - Ruling 6's goods table shows spoilage as the four foods' total, with no per-food column, so the ruling is amended rather than the feed grown.
- 11 Oct: **M2.2c, Tasks 1 and 2.**
  - **Task 1, the ground port** (62103c0..2e6471a): it rebuilds `town.nmap` byte for byte, and 12 other places match the frozen Python too. The most beds in a place of 2 worlds is 3,176.
  - **Task 2, one blob per bed** (369f3ee):
    - Highcourt seats 2,688 blobs in 387 homes, as 985 households of sizes 1–6 (229, 272, 194, 165, 77, 48), and folds back exactly.
    - `town` is now `1043e0ad`, and Highcourt's pins are `9ca2ad77` and `4cd678eb`; `746a06a3` and `6a652730` held.
    - Plan defect, fixed by the engineer: households that don't fit a place's homes become one-person households (`fitHouseholds`). Task 3's `switchTown` must call it on a folded row too.
    - The app's half, sending `agents` only under `?tier=`, is being built.
- 11 Oct: **M2.4 Part 1 confirmed** (2a0950b, 4b1b32b), on seeds 2001–2050.
  - **Tier 1:** all six targets hold. Price changes are 9.4%, the thinnest margin over its 9% floor.
  - **Tiers 2 and 3:** all seven tier-2 targets still miss, as in M2.3. Unemployment's s.d. is 0.0107, only 0.0007 over Ruling 14's floor.
  - **Shares:** food is 17.4% of spending, spoilage 2.2% (every seed inside R6's band) and unmet meals 3.0%.
  - **The Okun ruling** (coordinator, 11 October 2026): Okun missed at −0.62 because `produced` counts cloth, tools and fuel only. Counting food at 6 portions a unit gives −0.82, inside the band, on the same seeds. That is a definition fix, like M2.3's move from units sold to units produced, not a re-tune. It lands with the review's fixes, and `CITY` stays unchanged.
- 11 Oct: **M2.2c Ruling 8, away towns** (9baec40).
  - **The summary month:** a town not in view takes one a month (`spawn/away.ts`, `AWAY_DRAW` 0x201). Its unemployment, prices and wages drift back toward its first record, with keyed noise fitted to a live town, while people, households, firms and cash stay exact.
  - **First visits** catch up on the months already passed.
  - **Replays:** nothing new is logged, since a replay recomputes the step from the `INPUT_FOCUS` log.
  - **Cost:** about 0.1 ms a month for 200 towns.
  - **The task:** 2b builds it after Tasks 1–2, and Task 3 wires it in. Owner question 6, whether the map shows an away town's figures as "estimated", is open.
- 11 Oct: **the owner's integration answers:**
  - every town live (all of M2.2c) comes before the street code;
  - nights pass at 8×;
  - the blob card updates live;
  - the fish stall's navy fold becomes a darker stall blue.
- 11 Oct: **M2.7 Part 1, Task 7's sprites** (bc8659b, 2c8e79e, 819295c).
  - **Drawn:** the chewing faces and hold code, the seven carried goods (`icons/carry_*`), the stock pips (`icons/pip_stock_0..3`), the three stalls (`buildings/shop_market-stall_{vegetables,fish,milk}`), and the Draper and Fuel Store fronts in both looks, with snow.
  - **Checks:** `test_sprites.py` and `pnpm test:py` pass. The atlas is a build product (184,354 B of 300 kB), and the place goldens and `town.nmap` hold.
  - **Held back for Task 6:** the `hold` and `eat` frame fields, which the sprite manifest's schema forbids. To enable them:
    1. add both to `sprite-manifest.schema.json` and regenerate `src/sprites/sprite-manifest.ts`;
    2. copy them in `build_atlas.py` and `test_atlas.py`, as `face` is copied;
    3. add a slot in render-gl's frame record;
    4. flip `characters.build(holds=…)` to true.
  - **Doors:** the new premises' `door` points sit off `settle()`'s centre column, so Task 2 must read `door`.
- 11 Oct: **M2.7 Part 1's mockups and picks** (3ec6b1e, d1d8be4).
  - **The mockups:** six sheets and a street scene in `docs/mockups/m2.7-street/`.
  - **The owner's picks:** the front-hip hold, the open-and-shut eating face, stall canopies coloured by good, and bead stock pips.
  - **The coordinator's call:** both looks of each new shop front ship.
  - **Task 7:** its final sprites are being drawn.
- 11 Oct: **M2.7 Part 1 briefed** (ce0f198): life on the street.
  - **Money:** it moves at the economy tick, as now, and blobs act out the day's purchases afterwards on one flow field per shop. So `economyDay`, `6a652730` and `CITY_RECORD` hold.
  - **Shops:** the market's stalls sell vegetables, fish and milk. The Bakery, Draper, Smithy and Fuel Store sell bread, cloth, tools and fuel.
  - **The day:** nights are spent indoors, and they pass faster (owner).
  - **Drawing:** snapshot bits carry `indoors`, the good carried and `eating`.
  - **Workplaces:** several buildings per trade (owner).
  - **Household stalls:** they wait for M3.5 (owner).
  - **Next:** the mockups (Task 1) started now. The code follows M2.2c's homes.
- 11 Oct: **M2.4 Part 1, Tasks 5–6** (9a10e94..dba1b48, 181ac5f).
  - **The feed:** it carries 112 days of sold, stock and price paid for the seven goods, food eaten, spoiled and unmet, and each trade's good.
  - **The panel:** a goods table, a food chart, sales by good, the wage and unemployment charts, and trades such as "2 cloth at Draper 217, 66.70". The card reads "Works at Bakery 12".
  - **Checks:** economy and inspector specs pass.
  - **Bytes:** initial JS is 28.1 of 35 kB. The worker's limit went to 17 kB and the stand-in's to 29.2 kB, and the charts and economy chunks got about 1 kB of room each.
  - **Not yet in `interfaces.md`:**
    - `shopName(good, firm)`, and `economy.ts`'s `tradeLines` and `goodsRows`;
    - `DayChart`'s several series, with `DaySpec`'s `labels` and `colours`;
    - `inspected.employerGood`;
    - the message's `soldUnits`, `stockUnits` and `paidCents` (7 series each), `eaten`, `spoiled`, `unmet` and `tradeGood`, with no `meanPriceCents`. Food trades come first, then goods;
    - `FEED_GOODS` (7), with `BREAD`, `FUEL`, `GOOD_NAMES` and `SHOP_NAMES` re-exported from `feed.ts`.
- 11 Oct: **M2.4 Part 1, Tasks 3–4** (603c1a0..63027e9).
  - **Built:** blobs buy food before goods, in a 20-system economy day, and `CITY` runs the seven goods and food.
  - **Hashes:** `746a06a3`, `6a652730` and the spawn hashes held. `town` is now `1621b72b`, and Highcourt's pins are `4b1a37d3` and `49f7323c`.
  - **The burn-in:** 29,865 days, from MSER-5 on seeds 1–5.
  - **A 10-seed probe** (2001–2010, not the confirmation): all six tier-1 medians are in band. Food is 17.4% of spending against ICP's 18.6%, 2.3% of food spoils (inside R6's 0.5–3%), and 2.8% of meals go unmet. Okun (−0.61) and size skew (0.97) miss their bands.
  - **Cost at 10k** (desktop, measured): `buyFood` takes 1.04 ms, and the worst tick is `searchShops` at 2.43 ms. At 100k, `buyFood` takes 11.3 ms, so perf.yml decides.
  - **Closed since** (2a0950b, 4b1b32b): `design.json` follows the burn-in, and the 50-seed confirmation holds all six tier-1 targets.
- 11 Oct: **M2.2c briefed** (1f9c645): every town runs the sim. It waits for the owner's go.
  - **One kind of town:** a place's layout plus a TypeScript port of its ground, with Highcourt as place 0, each world's capital.
  - **Switching:** entering a town logs `INPUT_FOCUS`. The worker runs out the day, then folds the old town and spawns the new at the boundary. Away towns stay frozen, as the owner's fold-and-spawn ruling means ("consequential focus" in R4's terms).
  - **Records:** a 14-field ledger row per settlement. A first visit scales `CITY_RECORD` to the town's beds, with a household mix of 22/28/20/17/8/5% for sizes 1–6 (an unsourced estimate, to check against UN DESA before M2.5).
  - **Homes:** one blob per bed in the drawn houses, as "House N".
  - **Walkers:** the decorative walkers go, and the Town skin draws every live town.
  - **First slice:** Highcourt's 2,688 blobs in its own houses, with the card's "Lives with" filled.
- 11 Oct: **M2.4 Part 1, Tasks 1–2** (24981a8..6072558).
  - **Built:** the seven goods, start and spawn by good, the dated food ring that spoils, and flow log schema 2.
  - **Hashes:** `CITY.goods` stays 0 until Task 4, so no hash moved.
  - **An interruption:** the agent hit the old account's usage limit right after its docs commit, and only two comment edits were left (committed).
- 11 Oct: **the blob modal** (5b6e505..b8bb600, owner request).
  - **What a click shows:** a card with the blob's own sprite drawn large, its name, job, pay, wallet, house, household, what it is doing, and its look. On phones it is a bottom sheet.
  - **How it behaves:** it is a non-modal dialog, so the town stays live, and Escape closes it from any focus.
  - **Checks:** inspector 19/19, with the portrait equal pixel for pixel to the atlas, and axe at desktop and 390×844. No hash moved.
  - **Known:** every card says "Lives with: No one" until households of 1–6 fill real homes (Step 2), and "Doing" is a snapshot from the click.
- 11 Oct: **M2.4 Part 1 briefed** (a38fc16): goods and food on screen.
  - **The goods:** seven, one per supplier link: bread, vegetables, fish and milk as food, and cloth, tools and fuel.
  - **Eating:** every blob eats 3 portions a day, and food spoils from a 16-day ring per shop.
  - **The hash:** the goods state is hashed only in goods worlds, so `LENGNICK` and its goldens can't move. The city's food share is ICP's upper-middle 18.6% (decided).
  - **The coordinator's calls:** milk is the seventh good, since the owner named none, and Part 1's shop waste of about 5% (inference) is a gap against R6's 0.5–3% until Part 2.
  - **The modal:** its worker side landed in 5b6e505.
- 11 Oct: **M2.2b done** (Tasks 5 and 8, the review, the allocation fix; 8e4a120..c20ce6e, b7eb873..1339b2c).
  - **The panel:** it charts mean price, mean wage and unemployment by day, each with a data table, above the day's last 16 trades, which name no buyer.
  - **The HUD:** Pause, 1×, 4×, 16× and Map sit on one row at 1280 px, with the developer panel behind `?dev=1`.
  - **The review** (Opus) found nothing serious, and its seven fixes landed.
  - **The allocation test:** it had failed since Task 3, which turned CI red. It passes again: a plain day allocates 2.9 KB, down from 83 KB.
  - **Checks:** twelve browser specs pass locally, and initial JS is 25.78 of 35 kB.
- 11 Oct: **M0.8 done:** lil-gui is behind `?dev=1`, and the town has Fit, Home and pinch.
- 10 Oct: **M2.2b Tasks 1–4 and 6 built** (1d8e5f0..ba0b44a).
  - **The town:** every app world is a town spawned settled from `CITY_RECORD`, and its crowd starts three in four walking.
  - **The economy:** it runs one system a tick. The inspector shows job, employer and wage, the worker posts a daily `economy` feed, and logged layoffs fire at the next day's start.
  - **Hashes:** the new `town` golden is `b76fca4c`, and Highcourt's pins are `d11bb532` and `8eb639aa`. `746a06a3` and `6a652730` held.
  - **Cost:** the economy's worst tick is 0.77 ms at 3,965 people and 1.78 ms at 10,000, a month's first-day shop search (measured here, Node, one run).
  - **Bytes:** initial JS is 24.42 kB of 35 kB, so the M0 stand-in rose to 25.5 kB (a8bd24d).
- 10 Oct: **place names, and world generator version 1 frozen** (M8.1 Tasks 33–34, 9f78552..fb5890b).
  - **The names:** the map names countries and settlements from a 1,024-word table, keyed on cells.
  - **Before the freeze:** the owner waived the review, and the coordinator dropped 17 crude-sounding words. The religion list gained 42 core faith words that the Wikidata extract missed, which replaced 4 person words and 7 place words.
  - **The freeze:** version 1 is frozen, with the road classes.
- 10 Oct: **the town's zoom** (M0.8, b44ed12): −, +, Fit, Home and pinch on the first screen's town.
- 10 Oct: **M2.3 closed** (41febe1..9a1bbff), with the review's fixes. Exits are off in `CITY` (Ruling 19). A hire resets the spell count, the slow-search bound applies only when someone is slow, and `design --out` must be new or empty. Okun is measured on units produced, and `design` runs 2 threads off CI. With exits off, the burn-in is 18,428 days. On seeds 2001–2050 all six tier-1 targets hold, Okun holds at −0.81, and `unemployment_sd` is 0.0110. The long test passed 13/13 in 74 s, and the goldens held (`6a652730`, `746a06a3`).
- 10 Oct: **the world map's walking dots removed** (owner; 75e2652, f1f9341, 1090702). The app, the map renderer, the protocol and worldgen lose the map crowd, and `interfaces.md` follows. No world or replay hash moves, since the crowd was never in the world. The M8.1, M8.3 and M3.1 plans say so too, and M8.3's Tasks 16–19 point to git for their old steps.
- 10 Oct: **git only, no `gh`** (owner). The M0 and M1.6 plans no longer name `gh`: their CI steps now just push `main`, and the owner starts `release.yml` from the Actions page.
- 10 Oct: **testing and rules restructured** (owner). `pnpm check` runs every check but the browser specs, and CI's check job runs only it. The stdlib workflow and the engine scripts are gone, perf runs by hand, and the place tests check 2 worlds. `pnpm check` passed locally in 349 s, with the unit tests at 65 s, down from 175 s.
- 10 Oct: **engineers default to Sonnet,** and lint and the determinism and economy reviews wait for the end of a feature (owner). The check after each edit keeps only quick guards, about 0.13 s, where linting took about 3 s.
- 10 Oct: **TypeScript only** (owner). `pnpm test:py` runs only the asset checks, the sprite test among them; the frozen generator's checks are gone, and `town.test.ts` no longer starts Python. M3.1 Part 3 builds its layouts in TypeScript.
- 10 Oct: **heavy test runs move to CI** (owner), since test runs had pinned the owner's CPU at 100%. Playwright runs one browser at a time and reports CI failures as annotations, and Vitest uses two workers locally (bd8ee04). Two of the three fixer agents were stopped mid-run.
