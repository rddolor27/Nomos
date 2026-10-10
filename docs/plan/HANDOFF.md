# Nomos hand-off (living file, 10 October 2026)

A living summary for the next session, appended as work lands. Start with `CLAUDE.md`, then the highest-numbered checkpoint (0032), then the progress log at the end of this file.

## Done in the session of 9–10 October 2026

1. **The town view.** Zooming into a settlement or wonder on the map opens its town, with houses, a plaza, a river and walking blobs.
   - `place.py` is ported to TypeScript, bit for bit against Python on 1,040 places.
   - The browser draws a place pixel for pixel as Python does, in Chromium, Firefox and WebKit.
   - A town opens by zooming in, by a tap on the place in focus, or by "Enter <name>".
2. **Rules:** game objects are classes, while blobs stay typed arrays (`code.md`); QA runs only once an implementation is finished (`models.md`).
3. **Skills:** `typescript-oop` and `impeccable`. **Agents:** `ui-designer` and `asset-designer`. Every agent lists "Skills to reach for".
4. **UI look, first pass (M0.8):** one-row toolbars, a −/+/Fit group, an orange accent, a More menu on phones, and labelled chart axes.
5. **Sprites:** stone walls, towers and gates; the `board` and `rubble` house styles; six props; `docs/mockups/town_walls_preview.png`.
6. **Plans:** the bigger world comes first. The map already opens the large 192×128 world (`map-view.ts` since d5b6642).

## Next, in order

1. **M3.1 part 2, steps 1–3: bigger towns.**
   - Places get 4× the area: 96×56 for a capital or city, 80×48 for a town, 64×40 for a village and 40×24 for a hamlet.
   - The town view fills the screen.
   - Crowds follow population: about 150–300 for a capital or city, 60–120 for a town, 25–50 for a village and 10–20 for a hamlet.
2. **Step 4:** the starting town, Highcourt, grows to 96×56, with more blobs.
3. **Steps 5–6:** walls with gates and the new houses go into `place.py`. Follow the side-gate layout in checkpoint 0031.
4. **M8.1 Task 36,** checks only: settlement counts, generation time, the Region view's 2 ms bar, and an optional `?world=standard`.
5. **M0.8's leftovers:** lil-gui behind `?dev=1`, the town's Fit, Home and pinch, and `toolbar.ts` in `interfaces.md`.
6. **At the end only:** one `senior-qa` pass and one `code-reviewer` pass.
7. **Later:**
   - M8.1 Tasks 33, 34, 31 and 35;
   - QA's low bugs 2 and 3;
   - syncing the shared plan doc;
   - checking the reference links.

## Agents, at most three at a time

1. **`sim-engineer`:** `place.py` and the port, for steps 1, 2 and 4 and the layout part of step 5.
2. **`render-engineer`:** the town view filling the screen, and the 2 ms bar with the bigger crowds.
3. **`asset-designer`:** tuning the bigger towns so they fill with streets and houses, and the walls' layout.

## Rules to remember

- Commit straight to `main` by path, under the no-reply address. Push only when the owner says.
- Never build into `apps/web/dist`.
- Run browser specs with `--workers=1` and `?tier=phone`.
- The scope guard blocks `..` in shell commands.
- The owner's preview is http://127.0.0.1:4180, over `dist/owner-preview`.

## Progress log

- 10 Oct: handoff written. Next: the town view fills the screen (`openPlaceCamera`).
- 10 Oct: **the town view opens filling the screen,** done.
  - `openPlaceCamera` takes the smallest step at which the place covers the view, and never less than 2 CSS px an art px. Fit still shows the whole place.
  - Proof: `place-camera.test.ts`, 5 of 5, plus lint and typecheck. The browser specs weren't rerun, so rerun `town-view.spec.ts` next session.
  - Next: M3.1 part 2, step 1, bigger places, with `sim-engineer`.
- 10 Oct: **started M3.1 part 2, steps 1 and 2** (bigger places and crowds), with `sim-engineer` on Sonnet. If the session ended before its report:
  - check `git log` for a commit whose body reads "Part 2: Bigger places and crowds", and `git status` for its uncommitted work in `tools/worldgen/place.py` and `packages/worldgen/src/place/`;
  - finish only when `place_goldens.py --check` and the worldgen Vitest suite pass, and the TypeScript port matches.
- 10 Oct: **the owner wants far more blobs per settlement,** since the sim aims at 100k and later a million.
  - Planned as M3.1 part 2, step 2b, the street crowd: TypeScript-only walkers on the walk loops, about one per 100–200 residents, up to 3,000 on desktop and 600 on phones.
  - It runs after steps 1 and 2, with `render-engineer`.
- 10 Oct: the owner asked for **bigger settlements still,** and for the street crowd now.
  - The sim engineer was asked for capital and city 128×80, town 112×64, village 80×48 and hamlet 56×32, as long as a capital builds in about 150 ms warm or less; otherwise the largest that fits.
  - The render engineer started the street crowd: `packages/worldgen/src/place/street-crowd.ts`, `place-builder.ts`, `walkers.ts` and the place pass's buffers. Up to 3,000 walkers on desktop and 600 on phones.
  - If the session ended: check `git log` for "Bigger places and crowds" and "The street crowd", and `git status` for unfinished work. Commit only green work, then push.
- 10 Oct: **the street crowd landed** (06d6713 and 8c18e75): one walker per 150 residents, up to 3,000.
  - A new `PlaceCrowd` contract, with `placeBuffers(layout, walks, crowd)`.
  - 3,008 walkers draw in 0.59 ms median in WebGL2; 600 under Canvas2D take 0.25 ms.
  - **The bug:** walkers pile into lines, because a capital has only about 8 people loops. The render engineer is giving the crowd its own loops, about one per 10 walkers, spread over every street, capped near one walker per two loop cells.
  - When the sizes land, `apps/web/test/map-worker.test.ts`'s width-48 assertion must change with them.
- 10 Oct: **the piling is fixed** (86437eb). The crowd has its own loops over every street, and each cell's room is split among the loops through it.
  - The coordinator then raised the density from one walker per two loop cells to one per cell (`CELLS_PER_WALKER = 1`), so the crowd roughly doubles: seed 14's capital had 755 at two cells a walker.
  - The street-crowd and walkers tests pass, 10 of 10. The browser specs weren't rerun.
  - Building the crowd adds 9–12 ms to a capital in Node.
  - Optional: export `walkableGrid` from `walks.ts`, so `street-crowd.ts` stops restating the rule.
- 10 Oct: **bigger places and crowds landed,** in M3.1 part 2, steps 1 and 2 (81ac739, d1210d0 and 4932aef).
  - Places: capital and city 128×80, town 112×64, village 80×48, hamlet 56×32.
  - Houses: 380–520 in a capital or city, 240–340 in a town.
  - `place.py`'s own crowds: 150–300 in a capital or city, by population, plus the street crowd.
  - A warm capital builds in 78 ms. The goldens, the fixtures and the TypeScript port all match.
  - The coordinator fixed the dependency rule broken by the M0.8 toolbar (42f509e): `map-view-takes-only-types-from-the-town` now allows `panels/toolbar.ts`.
- **CI is red on purpose until step 4.** `python tools/worldgen/export_map.py --check` fails, because Highcourt now builds at 128×80 while `assets/maps/town.nmap` is still 48×28. Next session, do step 4 first:
  - re-export `town.nmap` with `python tools/worldgen/export_map.py`;
  - record the new replay hash, and update the sim tests that pin the old map;
  - re-measure the 2 ms bar with about 520 houses and 3,000 or more walkers (step 3);
  - check `engines.spec.ts`'s timeouts, since its places are about 7× larger.
- The plan's "Part 2" text still says 96×56; the real sizes are above.
- 10 Oct, **the owner's report on the first screen** (screenshot on :4173, desktop tier): 100,000 yellow dots cover the old 48×28 Highcourt, drawn as flat colour boxes. Town-view walkers turn only at right angles. The owner asked why the town view's art isn't on the first screen.

## Top priority next session (owner, 10 October 2026)

1. **Step 4: the starting town grows.** Re-export Highcourt at 128×80 (`python tools/worldgen/export_map.py`), update the replay hash and the sim tests, and so turn CI green again.
2. **A sensible blob count on the first screen.** Scale the default agents to the town: about one per two walkable tiles, so roughly 3,000–4,000 on desktop.
   - Keep the 10k, 25k and 100k budget runs, but only behind a query parameter or the bench, never as the default look.
   - 100k agents need M6.1's big cities.
3. **The first screen in the town view's art.** Draw Highcourt with the place pass: tiles, houses and props from its `place.py` layout, as the "Town" skin.
   - Draw the sim's agents as blob sprites: looks from the visual word, facing from velocity, and walk frames. That is M1.3's sprite pass.
   - Make it the default skin at town zoom, with Dots kept for zoomed out.
4. **Walking in any direction in the town view.** Smooth each loop:
   - walk straight between waypoints wherever the line stays on walkable tiles;
   - otherwise cut corners diagonally;
   - and face the true direction, as the sim's blobs already do.
5. Then step 3, the 2 ms bar with the bigger places, and steps 5–6, walls and houses in towns.

- 10 Oct: the owner said "go ahead and implement, use what you need". Three agents started, at most three at a time:
  1. `sim-engineer` (Sonnet): items 1 and 2, the starting town at 128×80 and a sensible blob count.
  2. `senior-game-engineer` (Sonnet): item 4, walking in any direction, in `walkers.ts`.
  3. `render-engineer`: item 3, the first screen in the town view's art. That is a "Town" skin, with Highcourt's layout from the map worker and the sim's agents as blob sprites.

  If the session ended: check `git log` for those Task lines, and `git status` for unfinished work. Commit only green work, then push.
- 10 Oct, the latest: **all three agents stopped at once on the account's weekly usage limit,** which resets on 15 October 2026 at 8:00 Asia/Manila.
  - None of them changed a file: the tree is clean at 0733217, and everything is pushed.
  - **Resume with "Top priority next session", items 1–4, above.** Give each agent its brief again; the work is unchanged.

## The walled-town round (owner, 10 October 2026)

The owner asked for walls, a bell-curve town, farms, wider roads of several kinds and better building art. They answered two rounds of questions, and every answer below is final:

1. **Bell curve means town density.** Each capital, city and town is packed round the plaza and thins toward the edge. Today a capital is as dense at its edge as in its middle.
2. **Walls:** stone walls with towers for capitals and cities, a wooden palisade for towns, and none for villages and hamlets. Each wall rings the dense core, with a gate wherever a road enters.
3. **Roads by role:**
   - main road: 3 tiles of cut stone, gate to plaza;
   - street: 2 tiles of cobbles, inside the walls;
   - lane: 1 tile of dirt;
   - country road: 2 tiles of gravel, outside the walls;
   - farm track: 1 tile of dirt.
4. **Order:** CI goes green first (Highcourt re-exported at 128×80). Then this round, with walking in any direction (item 4 above) alongside. The first-screen art and blob count (items 2 and 3) wait until the new layout settles, and Highcourt is re-exported again then.
5. **Farms on the outskirts:** grain and vegetable strips, pastures with herds, orchards, and vineyards or rice paddies by climate.
6. **Buildings:** corner houses, townhouses and cottages; an inn, bakery, smithy, stable, barn, granary and watermill; a grander civic set for capitals and cities; and a polish of today's art.
7. **Extras:** suburbs along the roads beyond the gates, stone bridges on main roads, trees along main roads, greens inside the walls, and on the country map, two road classes and walled city icons.
8. **Size:** places grow so the walled core keeps about 380–520 houses: capitals and cities about 160×100, and towns in proportion.
9. The owner also said: spawn design agents and a planner as needed, and once the assets are made, add them to the plans.

**Five agents started,** within the owner's limit of five:
1. `sim-engineer` (Sonnet): CI green, re-exporting Highcourt. Task line "M3.1 Town generator, part 2, step 4: The starting town".
2. `asset-designer`: road surfaces, stone bridges, the palisade, orchard, vineyard and paddy crops, and greens, in the nature, scenery, walls and seasons sheets. Preview: `docs/mockups/town_edge_preview.png`.
3. `asset-designer`: the new house shapes and a polish, in the houses sheet. Preview: `docs/mockups/houses_preview.png`.
4. `asset-designer`: trades, farm buildings, the grand civic set, a polish, and walled map icons, in the buildings, landmarks and map sheets. Previews: `docs/mockups/buildings_preview.png` and `map_icons_preview.png`.
5. `sim-architect`: the step plan, as a new part of M3.1's `plan.md` after Part 2, plus `task.md`, `interfaces.md` and the country-map pieces. Frame names stay placeholders until the designers report.

The designers' Task lines read "owner request, walled towns with roads by role and farms" or "owner request, new and improved building art".

**Once they land, the coordinator:**
- regenerates `assets/LICENSES.md` and `packages/render-gl/test/fixtures/places-v1.json`, since the polish changes pixels, and commits them;
- fills the plan's frame-name placeholders from the designers' reports;
- applies the planner's `interfaces.md` changes in a docs commit of its own, after the other session's edit there lands;
- then dispatches the plan's steps.

If the session ended: check `git log` for those Task lines, and `git status` for unfinished work. Commit only green work.

**Two sessions share this tree** (10 October 2026). The other session, `nomos-bd`, runs the first-screen round, and then M2. The two sessions agreed which files each owns, by message:
- **`nomos-bd`** owns:
  - Highcourt and the blob count: `packages/sim-core` (memory, world), sim-protocol messages, sim-worker, `apps/web/src/app/*` and `main.ts`;
  - walking in any direction: `walkers.ts`;
  - the first screen's "Town" skin: `packages/render-gl/**`, `apps/web/src/{app,view,panels}`, `apps/web/src/map/{map-worker,generate,place-builder}.ts`, `place-layout.ts` and `.size-limit.json`;
  - `interfaces.md`, until its render-engineer's edit lands.
- **This round** owns `tools/sprites/**`, the `assets/sprites` sheets, `docs/mockups/`, `tools/worldgen/place.py`, `packages/worldgen/src/place/**`, M3.1's `plan.md` and `task.md`, `places-v1.json` and `assets/LICENSES.md`.
- **Waiting on `nomos-bd`:** the country map's two road styles and the 2 ms re-measure need render-gl. They start only after `nomos-bd` says its Town skin has landed.
- **Agent 1 above stopped,** since `nomos-bd`'s sim-engineer made the Highcourt commit (217980a), and changed no files. Its gate run, with the other session's edits in the tree:
  - every Python and Node gate passed, and `pnpm test` passed 632 of 634; the 2 failures were load timeouts in `day.test.ts`, which pass alone;
  - the replay hash stays `b3b2c251`, because the CLI runs on the stand-in ground;
  - `town.nmap` is 5.4 kB brotli;
  - the build, size and browser gates weren't run. They belong to `nomos-bd`'s step 4.

**10 Oct: all the art landed, and the plan is written.**
- **Art,** every frame name now in the plan's "The art contract":
  - houses: 9272f2f, 1b34c9d, 454b80b and 35a5add;
  - trades, farm buildings, the large civic set, the polish and the walled map icons: 6422411, f8201a3, 1434809, 3722777, 798f4f4, 7647598 and 7e59786;
  - roads, crops, greens, the palisade and stone bridges: 88478c6, 8099986, fd04bcd, e298e55, be12d20, c06a4d0 and 95f41ed.
  - The four previews in `docs/mockups/` went to the owner.
- **Designers' calls for the owner to overturn:**
  - houses: the corner houses' L-shaped wing, the cream doors, and handed pieces drawn at random rather than in pairs;
  - terrain: the bridges' snow overlays, which cost 13 px of atlas; the palisade side gate as tall posts only; gates 2 wide, so a main road's third lane ends at the wall; and no watchtower on the palisade;
  - buildings: `_large` rather than "grand"; the workshop is now a joiner's shop; a stone threshing barn; the capital icon shows a civic clock tower rather than a keep; and the watermill stands on an east bank only, with no wheel animation.
- **Plan:** M3.1 Part 3, Tasks 9–21 (197f74e and f6f0239).
- **The coordinator's rulings:**
  - 176×112 for capitals and cities, and 152×96 for towns, for a deeper farm belt (72f0ea6), falling back to 160×100 and 140×80 if builds break Task 9's budget;
  - the walls' look stands as drawn, at the owner's word.
- **Clean-up commits:** b02c835 (`MAP_FRAMES` 93), a477031 (`LICENSES.md`), 2b69ec8 (`places-v1.json`, pixel hashes only).
- **`interfaces.md`:** the planner's appendix is kept in Task 21 (f6ef4bc) and applied (16d4ef5).
- **Running:**
  - Task 9, the timing script (`sim-engineer`, Sonnet);
  - Task 17, road classes (`sim-engineer`, Opus);
  - Task 10, the atlas trim (`render-engineer`, Sonnet).
- **Next:**
  - Task 11 once Task 9 reports, then Tasks 12–16 in turn;
  - Task 18 after Task 17;
  - Task 19 after Tasks 11–16;
  - then Task 20, and Task 21 with the single QA and review pass.
- **Agreed with `nomos-bd`:**
  - its Town skin landed, so render-gl is free for Tasks 18 and 19;
  - Tasks 11–15 may edit `town-map.test.ts`, `map-worker.test.ts` and `tiers.test.ts`;
  - every `place.py` change re-exports `town.nmap` in the same commit and keeps `town.test.ts` green;
  - **don't touch `town-map.test.ts` until `nomos-bd`'s economy Task 1 lands** (it will message). After that, whoever commits second re-pins from the current tree, and nobody edits that file while it's dirty from the other session.

**10 Oct, 09:45: resumed after the session limit,** which stopped Tasks 9, 10 and 17 at 04:5x before they changed a file.
- `nomos-bd`'s economy Task 1 has landed (23e9fa2 and f47f06c), so `town-map.test.ts` is free. The CLI hash is now `3c786124`, moved by the economy, and Task 20 expects whatever is on `main`.
- **Task 9 is done** (2664baa). The coordinator finished the agent's draft, and recorded the baseline in the plan (b035a86): capital median 118 ms and worst 129 ms, so the budgets are 236 ms and 321 ms.
- **Running:**
  - Task 11, roads by role, sizes and the town plan (`sim-engineer`, Opus);
  - Task 17, road classes (`sim-engineer`, Opus);
  - Task 10, the atlas trim (`render-engineer`, Sonnet).
  Tasks 11 and 17 share `packages/worldgen` but not files, and each was told how to tell the other's half-finished state from its own.
- **If the session ends:** check `git log` for "task 11", "task 17" and "task 10" commits, and `git status` for unfinished work in those files. Restart only the tasks that have no commit.

**10 Oct, 10:30:**
- **Task 10 is done** (25d318c). The town atlas page is 2048×1161 px with 182,550 B of WebP, and its 169 snow and night frames stay on the map page only.
  - It also found "Initial JS" over its 17 kB limit, from the other session's economy. `nomos-bd` raised the entry to 20 kB (49f432d).
- **Task 17 is done** (b05bccc):
  - over 100 worlds of each size, 5,570 roads are major and 38,523 minor;
  - classing them adds under 2 ms to a large world;
  - the world fingerprints moved, to `0x4a765ce2` in `map-worker.test.ts`.
  - The coordinator gave render-gl's tiny test world its `roadClass` (f84a9e2), which turned typecheck green again.
- **Running:**
  - Task 11 (`sim-engineer`, Opus);
  - Task 18, highways, tracks and walled icons on the map (`render-engineer`, Opus). Its browser runs use a scratch build under `dist/` through `NOMOS_WEB`, never `apps/web/dist`.

**Owner, 10 October 2026: this round is plans only.**
- Tasks already started run to the end: Task 11 and Task 18.
- No other task starts. Tasks 12–16 and 19–21 stay as plans in M3.1's Part 3, and a later round implements them when the owner says.
- Once Tasks 11 and 18 land, the coordinator writes checkpoint 0033 with the summary.

**10 Oct, 11:10: the round's started tasks are all in.**
- **Task 18** (19ef31a): the country map draws major roads solid in `highway` (#9AA2B4) and minor roads dotted, with walled and palisaded icons in both views.
  - 60 of 60 map browser specs pass in Chromium, Firefox and WebKit.
  - The Countries golden came out byte-identical, since its flat view hides roads and icons.
  - A capital's landmarks in the Region view moved from 2 cells out to 3, to clear the 52-px walled icon.
- **Task 11** (d68ff59), at the planned 176×112 and 152×96, with no fallback:
  - two runs: capital median 178 and 200 ms, worst 215 and 235 ms, against budgets of 236 and 321 ms; city median 171 and 177 ms against 214 ms;
  - three changes in the port alone brought it within budget, with output unchanged;
  - Highcourt is 176×112, with 15,862 walkable tiles and 387 homes. Its pins are phone `dd30b5fd` and desktop `39f5b5ea`, and the start counts 3,965, 5,287 and 7,931.
  - Its ledger is the gitignored `.superpowers/sdd/plan-m3.1-town-generator/task11-ledger.md`. Checkpoint 0033 copies the rulings that matter.
- **The coordinator's fix** (c4b8bc1): cut-stone main roads drew as light water on the dots map (WATER_L), so road kinds now pick a dry ground colour, and stone takes SAND_D. The pins don't move.
- **The tree:** `nomos-bd`'s steering refactor (a530047) broke `tools/bench/test/alloc.test.ts`, and its agent is fixing it.
- Plans only from here: Tasks 12–16 and 19–21 wait for the owner. Checkpoint 0033 holds the summary.

## The town view session (nomos-bd), continued

- 10 Oct: **step 4 and the blob counts are done and pushed** (217980a, d5dfdff, d999ab7, dea6b06 and d6e3bdc).
  - Highcourt is re-exported at 128×80, with 6,763 walkable tiles.
  - The first screen starts with 3,381 blobs on desktop (one per 2 tiles), 2,254 on phone-plus (one per 3) and 1,690 on phone (one per 4), set by `TIER_TILES_PER_AGENT`.
  - A `?tier=` URL still runs the whole tier, 100k, 25k or 10k, for perf.
  - The CLI hash stays `b3b2c251`. The first screen pins seed 42 at 1,000 ticks: phone `83e5b191`, desktop `4099e61d`.
  - `pnpm test` passes 636 tests, and the bench budget passes all 9 rows.
  - Initial JS is at 16,950 of 17,000 B.
  - The blob count is now a run input, so M6's share links must record it.
  - Stale 48×28 text remains in:
    - `place-camera.test.ts:11`;
    - `interfaces.md`, in the Places sizes;
    - `countries.md:46`;
    - the M3.1 plan at line 41, and the M0.4 plan at line 83.
  - Still running: the game engineer, on walking in any direction, and the render engineer, on the Town skin. Then the economy (M2), with up to 5 agents.
- 10 Oct: **town walkers walk in any direction** (3cc98f0, in `walkers.ts` only).
  - Each loop is cut twice, Chaikin style, within 6 px of its spots, so walkers stay on their own tiles.
  - Facing follows the dominant axis. An owner's home cell stays an uncut point.
  - `walk()` costs 0.07 ms a frame for 1,469 walkers.
  - Follow-ups for the final test pass:
    - the Town view chunk is at 7,692 of 8,000 B;
    - `town-view-qa.spec.ts` should check a walker's tile against its loop's cells, rather than axis-aligned spots.
- 10 Oct: **the first screen draws in the town view's art** (b012157 to b2d3b9e, nine commits).
  - The Town skin draws Highcourt's layout, built in the map worker, with the sim's blobs as sprites.
  - Frame times: 0.49 ms with 3,381 blobs on desktop, and 1.25 ms with 10,000.
  - The coordinator raised auto-skin's town cap from 425 to 4,000 blobs in view, and from 575 to 4,600 to stay, so Auto opens the first screen as Town. The perf tiers' 10k and more stay Dots, and so does a phone fitted to the whole town, until the user zooms in.
- **Flagged broken since the 128×80 map,** for the final minor test pass:
  - the render-gl goldens at three DPRs;
  - the minimap colours;
  - "caps Canvas2D at 5,000";
  - the inspector's "no blob within a tile".
  - In SwiftShader the town renders at about 4.5 fps.
- **The economy, M2.1** (plan 1067f77): Tasks 2 (25d584c), 3 (ab081c9) and 4 (fb7d0f2) are done. Task 1, the state layout, is running. Wave 2 (Tasks 5–7), then Task 8, then one economy-review, determinism-review and QA pass.
- 10 Oct: **M2.1 wave 1 is done.** Task 1, the state layout, landed in 6b1778e, 23e9fa2 and f47f06c.
  - **New replay hashes** at seed 42, 1,000 ticks:
    - CLI phone `3c786124`, which was `b3b2c251`;
    - phone-plus `c12f0de5`, desktop `9ff63cde`;
    - Highcourt phone `c0d9809e`, desktop `a0bf1ebe`.
  - Only the hash moved: the old and new columns and accounts are identical.
  - The desktop arena uses 11.87 of 64 MiB.
  - Docs still showing `b3b2c251`, to fix in the final docs pass:
    - `HANDOFF.md`;
    - `interfaces.md:163`;
    - the M8.1 plan at line 300;
    - the M8.3 plan at lines 85 and 1844.
  - Wave 2 started: Tasks 5 (firms, profits and fiat money), 6 (labour and wages) and 7 (consumption), on `sim-engineer` with Sonnet.
- 10 Oct: **M2.1's code is complete** (Tasks 1–8, 6b1778e to f6ab86c).
  - The economy runs from the Lengnick start: `economyDay`, `startEconomy`, and the CLI's `economy` command.
  - `burnInDays` is 9,893.
  - The step doesn't call the economy yet, so the CLI hash stays `3c786124`.
  - Money and goods balance exactly in every check.
  - R1's bands hold: mean price 1.19–1.21× the start, unemployment averaging 2.6%.
  - Speed: about 7,000 sim days a second.
- **For M2.3's calibration,** measured, not bugs:
  - price changes on 18.9% of firm-months, against a 9–12% target;
  - firm exits about 200× rarer than the target;
  - 66% of firm-months above the 1.15 markup ceiling, which a step can overshoot;
  - wage cuts by about 17% of firms a year, against a 10% warning line;
  - a firm-size skew of 0.50, against 1.9;
  - an exiting firm's unsold stock vanishes, with no write-off stat;
  - `economyDay` allocates at most 0.6 KB a sim day.
- The first-load JS stand-in is set to 18 kB; it measures 17.14 kB.
- **Running:** a shared steering rule, so town-view walkers wander in any direction like the sim's blobs, with one copy of the logic.
- **Next:**
  - one QA pass over M2.1 and the steering: economy-review, determinism-review and the bench gates;
  - a minor re-test of the flagged items;
  - the economy sections of `interfaces.md` (the coordinator's docs commit);
  - the docs that still show `b3b2c251`.
- 10 Oct: **the round's one test pass and its fixes are done.**
  - **QA:** the gates are green. QA updated 15 outdated specs in 8 test-only commits (2a7c791 to 8fbbf45). The determinism review is clean, and money is exact.
  - **Fixed after QA:**
    - the shared `app-*.js` chunk is gated (4c42d45's parent); the first load is 17.47 kB of the 18 kB stand-in;
    - the Town skin cap is 9,000 in, 10,350 to stay, since 176×112 Highcourt starts 7,931 on desktop;
    - profit sharing scales its weights for big pools (585d695);
    - A11 clears a switched link's stocked-out bit (312b9f5);
    - the economy has a cross-engine vector, `b4bd023b`, 63 days with fiat (827fe54).
  - **Gaps left:**
    - `names-only-in-the-inspector` isn't `reachable`;
    - the Town skin and the town view fetch the atlas separately;
    - `fallback.spec` centres on the old 48×28 map;
    - M2.1's plan, lines 220–221 and 258, is stale;
    - docs still show `b3b2c251`;
    - M2.3's calibration flags, as above.
- **Next:** M2.2, Spawn and fold. Expand its brief into a short step plan with `sim-architect`, then build it with up to 5 agents, testing last.
- 10 Oct: **M2.2 Spawn and fold is closed** (821984a to e83512b).
  - A household is 1–6 blobs sharing a home.
  - Spawn builds a city from its 14-field record. 100k agents take about 31–34 ms; the bench row is 35 ms, the coordinator's ruling, since M9 spawns only the districts in view.
  - Fold reads the city back exactly.
  - 20 spawn goldens replay in Node, Chromium, Firefox and WebKit.
  - The burn-in comparison passes, judged by the median of 40 paired seeds: spawned 5,240 against 6,395 days, and 4,095 against 6,680 on seeds 41–80.
  - **One QA pass:** gates green, the determinism review clean, money exact. Its gap fix is e83512b.
  - **Risk:** the 35 ms row has about 14% headroom; CI's ubuntu runner may be slower.
  - **Docs updated:** M2.1 and M2.2 marked done (3c2f5c2 to 72de9ab), plus M3.1, M3.3, M0.8 and M8.1 (cee105a to 87fff65).
  - **CLI hash:** `746a06a3`.
- **Next: M2.3 Calibration and design runner.** First a step plan from `sim-architect`, then building, with testing last.
- 10 Oct: **M2.3 Calibration and design runner, Tasks 1–4 under way** (d2cf7bf to 6933f02, pushed).
  - **Built:**
    - the flow log, `STAT_NAMES` schema 1;
    - the target suite in `tools/cli/src/targets`;
    - the city preset's exits, markup clamp and slow searchers;
    - the design runner on `worker_threads`, as the `design` and `targets` commands.
  - **Sweep:** none of the 300 hypercube points passed tier 1. The pay-cut target can't be reached while the city's money is closed. The coordinator moved it to tier 2 as a documented gap (c4313d4, db49825), to revisit when M5's treasury brings inflation.
  - **`CITY` frozen** at sweep point 232, refined on seeds 1–20:
    - knobs: γ 25, π 127,732, β 5, slow searchers 227,437 ppm with 1 visit, θ 220,000, `shortPayExitPpm` 300,000;
    - all six tier-1 targets hold;
    - seven tier-2 targets are gaps: hires, layoffs, job-to-job, long spells, mean spell, pay cuts at 15.4%, and Okun's sign.
  - **Burn-in:** the plan's 20,000-day run put the price truncation in its second half. The coordinator accepted 17,295 days from a 40,000-day run, where both truncations fall in the first half.
  - **Test edits outside the file list:**
    - `economy-layout.test.ts` follows the new preset;
    - `flow-log.test.ts` sets the exit line to the full wage, so seed 1 sees exits.
  - **Money** balanced exactly after every one of about 27 million sim days.
  - **Shared doc:** still names the 2% pay-cut target. Update it at the next sync, with the owner.
- **Next:**
  - the confirmation on seeds 1001–1050, the long test and the results in `task.md`;
  - then one test pass (`economy-review`, `senior-qa`), a minor re-test of flagged items, and M2.3's `interfaces.md` changes;
  - after that, M2.2b, the economy on screen.
