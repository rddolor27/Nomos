# M0 interfaces: the contract between sub-milestones

M0's sub-milestones are planned in parallel, so the names and layouts they share are fixed here first. Each item has one owner, the sub-milestone that builds it, and plans that consume an item use it exactly as written. A plan that refines an item updates this file in the same commit. If code later changes an interface, a separate docs commit next to the code commit updates it, since code and docs never share a commit.

## Packages

| Package | Path | Role | Built in |
| --- | --- | --- | --- |
| `@nomos/sim-core` | `packages/sim-core` | Pure TypeScript sim with no DOM: draws, noise, calendar, agent store and the `Blob` handle, ledgers and wallets, exact maths, and the world step | M0.1–M0.3, handle and wallets in M0.7 |
| `@nomos/sim-protocol` | `packages/sim-protocol` | Constants, the snapshot layout, the binary map format, the sprite-manifest schema and the worker messages, shared by every side | M0.3, map in M0.4, sprite manifest in M0.5 |
| `@nomos/sim-worker` | `packages/sim-worker` | The Web Worker: timing, pause and checkpoints around sim-core's world step | M0.3 |
| `@nomos/render-gl` | `packages/render-gl` | `WorldRenderer` on WebGL2, with the Canvas2D fallback | M0.4 |
| `@nomos/web` | `apps/web` | The page: load path, HUD, charts, the inspector, tiers and accessibility | M0.5, inspector in M0.7 |
| `@nomos/cli` | `tools/cli` | Headless runs and replay hashes in Node, through sim-core's world step, and the economy's design runner and target suite | M0.3, design runner and targets in M2.3 |
| `@nomos/bench` | `tools/bench` | The CI budget, allocation and startup gates | M0.6 |
| `@nomos/sim-culture` | `packages/sim-culture` | Culture code, walled off from crime, police, labour, wage, wealth, money, ability, housing, migration and spawn code; it also turns name keys into names | M0.6, names in M0.7 |
| `@nomos/names` | `tools/names` | The name lint, its real-world fixture, the shared mixed sound set, the person-name filter and the culture text lint; M3.7 extends it | M0.6, sound set and person-name filter in M0.7 |
| `@nomos/worldgen` | `packages/worldgen` | The TypeScript port of `tools/worldgen`: a seeded world of countries as a `WorldMap`, its place names, and each place's layout as `place.py` makes it. It runs only in the map worker | M8.1, places in M3.1 |

Dependencies point one way:
- `sim-core` ← `sim-protocol` ← `sim-worker`;
- `render-gl` imports only `sim-protocol`;
- `web` imports `sim-protocol` and `render-gl`, and `sim-worker` only for its `./worker` export, which it starts;
- `cli` imports `sim-core` and `sim-protocol`;
- `sim-culture` imports values only from the `@nomos/sim-core/kernels` subpath (the draws, `DAYS_PER_YEAR`, the stream ids `CULTURE` and `FESTIVAL`, and the culture column helpers), whose modules never import it. `sim-core`'s `consumption/` and its orchestration call `sim-culture`, and dependency-cruiser keeps modules acyclic (M0.6);
- `web` imports `sim-culture` only in `src/panels/inspector.ts`, which loads on demand, for `personName` (M0.7);
- `tools/names` writes `sim-culture`'s generated `naming/words.ts` and checks it; no package imports `tools/names` at run time. `names` imports `@nomos/sim-core/kernels`, for the keyed draw that picks its sounds (M0.7);
- `worldgen` imports values only from `@nomos/sim-core/kernels`, `@nomos/sim-protocol/world-map` and, from M3.1, `@nomos/sim-protocol/place` and, from M2.2c, `@nomos/sim-protocol/map` and, from M2.7, `@nomos/sim-protocol/premises`, and `kernels` also gives it the seven good ids. In `web`, only the map worker's modules reach it, and `render-gl`'s `./map` and `./place` exports draw its output (M8.1 and M3.1, below).

The world step lives in `sim-core`, so headless runs and the worker run the same code.

## Layout (owner: M0.7)

The owner decided on 9 October 2026 that every package groups its source into module folders by concern. The rules:
- **Entry files only at `src/`:** `index.ts`, a subpath export such as `kernels.ts`, and any file that a package script, CI or a test runs or bundles by path. Every other source file sits in a concern folder directly under `src/`, and a lint reports any that doesn't.
- **One level of concern folders.** The culture wall matches `packages/sim-*/src/<concern>/`, so `crime`, `police`, `labour`, `wages`, `wealth`, `money`, `ability`, `housing` and `migration` are each a top-level folder when they arrive, never nested in another folder. `money/` is guarded as wealth, since every wallet lives there (M0.7 review), `spawn/` since it decides homes, jobs and cash (M2.2), and `street/` since it reads jobs and homes (M2.7). M3.2 plans `life/`, guarded since M4's crime will read where blobs are, and barred from importing `money/`, so no need reads a wallet.
- **Named for the concern,** never for a kind of code such as `utils/`. A concern may start with one file and grows in place, so paths and lint globs stay stable.
- **Imports by path inside a package.** A source module imports another folder's module by its path; only other packages and tests use `index.ts`.
- **The barrel caveat:** `sim-core`'s `index.ts` re-exports `consumption/stand-in.ts`, which imports `sim-culture`, so the barrel reaches `sim-culture`. In `sim-core`, only `consumption/` and `index.ts` may reach `sim-culture`, which dependency-cruiser enforces; M2.6 adds `step/` when the step first calls consumption. Guarded code elsewhere imports `@nomos/sim-core/kernels` or module paths, never the barrel.

The tables give the layout M0.7 builds, including the files it adds. A renamed file says what it was; every other file keeps its name.

**`packages/sim-core/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts`, `kernels.ts` | The barrel, and the `./kernels` subpath that `sim-culture` imports |
| `random/` | `draw.ts`, `noise.ts`, `streams.ts` | The keyed draw with `drawBelow2`–`drawBelow4` (the draw modulo n as a small integer), value noise and the stream ids |
| `maths/` | `int.ts`, `log2.ts`, `tables.ts` (generated), `apportion.ts`, `split.ts` | Exact integer maths and apportionment |
| `time/` | `calendar.ts`, `day-length.ts` (generated) | The calendar and the sunrise table |
| `memory/` | `arena.ts` (was `memory.ts`), `tiers.ts` | The one reserved memory, and the device tiers |
| `agents/` | `store.ts`, `actions.ts`, `blob.ts` (new), `nearest.ts` (new) | Agent columns, action and facing codes, the `Blob` handle, and the nearest-blob query |
| `money/` | `ledger.ts`, `ppm.ts` (was `money.ts`), `claims.ts`, `registry.ts`, `invariants.ts`, `flows.ts`, `histogram.ts` | Cents, accounts, wallets, loans, holdings and the money invariants |
| `world/` | `world.ts`, `checkpoint.ts` (split from `world.ts`), `ground.ts`, `inputs.ts`, `space.ts` | The `World`, its creation and population; the hash, checkpoints and restore; the ground, the input log and the Q8 space |
| `day/` | `day.ts`, `slices.ts`, `stride.ts` | The day boundary, day slices and the stride scheduler |
| `movement/` | `wander.ts`, `walk.ts`, `steer.ts` | `move`, the walking step on each heading, and the pure wander rule |
| `step/` | `step.ts`, `warm.ts` | The world step and its warm-up |
| `consumption/` | `stand-in.ts` | Consumption's stand-in, the one `sim-core` folder that reads culture |
| `goods/` | `goods.ts`, `store.ts`, `food.ts` (M2.4) | The seven goods and their table, the goods store a firm row holds beside `FirmStore`, and the dated food ring ([Goods and food](#goods-and-food-owner-m24)) |
| `street/` | `fields.ts`, `runs.ts`, `shops.ts`, `errands.ts`, `motion.ts`, `timetable.ts`, `walk.ts`, `open.ts` (M2.7); `legs.ts` (M3.2 Task 2); `chat.ts` (M3.2 Task 4) | The flow field to each premises and the straight runs read from it, the shops, the errand store, the day's timetable and the walk, and the opening and closing of a town's streets ([Street link](#street-link-part-1-owner-m27)); from M3.2, the leisure sites beside the premises, legs between any two cells and chats |
| `life/` | `store.ts`, `traits.ts`, `table.ts`, `needs.ts`, `choose.ts`, `activities.ts` (M3.2 Task 3); `seats.ts` (the polish); `friends.ts` (planned, M3.2) | Each blob's needs, personality, choices, seats and friends ([Lives of their own](#lives-of-their-own-owner-m32)) |

`world/checkpoint.ts` takes `stateHash`, `stateHashExcept`, `checkpoint` and `restoreWorld`; `world/world.ts` keeps the `World`, its global slots, `layoutWorld`, `populate`, `createWorld`, `currentTick` and `committed`.

**`packages/sim-protocol/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts` | The barrel |
| `snapshot/` | `snapshot.ts`, `visual.ts`, `jobs.ts`, `street.ts` (M2.7) | Snapshot v1, the visual word, job ids, and what a blob shows of its errand and, from M3.2, its free time |
| `messages/` | `messages.ts`, `lifecycle.ts` | Worker messages and the page lifecycle |
| `map/` | `map.ts`, `premises.ts`; `leisure.ts` (M3.2 Task 2) | The binary map, its parser and its encoder, behind the `./map` export (M2.2c), and the premises a map's frames name, behind the `./premises` export (M2.7); from M3.2, the leisure sites its plaza, greens and water name, behind the barrel |
| `sprites/` | `sprite-manifest.ts` (generated) | The sprite-manifest types |
| `shared/` | `calendar.ts`, `columns.ts`, `steering.ts` | Constants re-exported from `sim-core`, and the wander rule with its keyed draw and steps, so `render-gl` and the app never import it |
| `world-map/` | `world-map.ts` | The world map, the body hues and the map worker's messages, behind the `./world-map` export (M8.1) |
| `place/` | `place-layout.ts`, `item-goods.ts` (M2.7) | A place's layout and the map worker's place messages, behind the `./place` export (M3.1), and the goods a blob can carry |
| `economy/` | `feed.ts` | The economy feed: a town's last 112 days of its mean wage, unemployment, food eaten, spoiled and unmet, and each of 7 goods' sales, stock and price, and the day's last 16 trades, which the worker posts as the `economy` message (M2.2b; goods and food in M2.4 Part 1) |

**`packages/sim-worker/src`:** `index.ts` and `worker.ts` (the `./worker` export) at `src/`, and `loop/loop.ts`.

**`packages/sim-culture/src`:** `index.ts` at `src/`, `festivals/festivals.ts`, `relabel/relabel.ts`, and the new `naming/person-name.ts` and generated `naming/words.ts`, with Fantasy Map Generator's licence, `naming/LICENSE-fmg.txt`, beside it.

**`packages/render-gl/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts` | The barrel |
| `renderer/` | `renderer.ts`, `types.ts` | `createWorldRenderer` and the `WorldRenderer` contract |
| `backends/` | `webgl.ts`, `canvas2d.ts` | The WebGL2 and Canvas2D painters |
| `camera/` | `camera.ts`, `device-size.ts` | Camera maths and device-pixel sizing |
| `skins/` | `skin.ts`, `skin-toggle.ts` | Skin choice, the automatic policy and the toggle |
| `dots/` | `dots.ts`, `colour.ts`, `minimap.ts`, `skin-a.json` | Skin A: dot shapes, its palette and contrast, and the minimap |

Skin B and Skin C arrive as `blobs/` and `town/` beside `dots/` (M1.3, M3.3). M8.3 adds `map/`, the map scene, behind the `./map` export whose entry file is `src/map.ts`. M3.1 adds `place/`, the place pass, behind the `./place` export whose entry file is `src/place.ts`, and `map/lifecycle.ts`, the context-loss lifecycle the map and place renderers share. The Town skin brings `town/` early, with `people.ts` and `town-skin.ts`, and M2.7 adds `pips.ts`, behind the `./town` export whose entry file is `src/town.ts` (The Town skin, below). The blob card's `place/portrait.ts` (`BlobPortrait`, behind `./place`) draws a blob with the place pass's own `putPerson`, which `sprites.ts` exports (the blob modal).

**`apps/web/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `main.ts` | The entry `index.html` loads |
| `app/` | `app.ts`, `boot.ts`, `lifecycle.ts`, `query.ts`, `tiers.ts` | The app shell: boot hand-off, worker link, query, tiers and the page lifecycle |
| `view/` | `camera-input.ts`; `atlas.ts` (`townAtlas()`, one atlas fetch that the Town skin and the blob card share); `pinch.ts` (`Pinch`, two-pointer zoom in whole steps); `zoom-bar.ts` (`ZoomBar`, the town's −, + and Fit); `town-skin.ts` (`mountTownSkin` and `TownSkinMount`, which lends the Town skin and swaps its town, M2.2c); `stock-pips.ts` (`stockLevel` and `StockPips`, the beads over the town's shops, M2.7) | Pointer and keyboard input on the view: the click that inspects, wheel, keys, pinch, Home to fit through `App.fit()` (M0.8, b44ed12), and keys 1–3 for speed (M2.2b). It loads after the first frame, as the charts do (M0.7). `camera-input.ts` also imports the Town skin's loader, `town-skin.ts`, once the page is interactive |
| `panels/` | `hud.ts` (the row, its Map button and `SystemRows`), `charts.ts` (also `DayChart`, which takes several series, `DaySpec`, whose `labels` and `colours` name and colour them, `dataTable`, `setRows`, `el` and `levelRange`), `controls.ts` (the `?dev=1` Zoom slider), `inspector.ts` (`blobCard(reply)`, `Inspector` and `mountInspector(hud, view, app)`; `#inspector` only says "No blob here" or "That blob is gone"), `blob-modal.ts` and `blob-modal.css` (`BlobModal`, the blob card, a non-modal dialog), `toolbar.ts` (the compact bar the map and the town view share, M0.8); `shop-name.ts` (`shopName(good, firm)`: the good's `SHOP_NAMES` entry and N, so firm row N − 1 is "Bakery N" when it sells bread), `economy.ts` and `economy.css` (`EconomyPanel`, `mountEconomy`, `MEASURES`, `fillSeries`, `goodsRows` and `tradeLines`) and `speed-bar.ts` (`SpeedBar`, `speedForKey`), all M2.2b, and M2.4 Part 1 reworked `shop-name.ts`, `economy.ts` and `DayChart` for goods (9a10e94..dba1b48) | The HUD, the lazy charts, the economy panel, the developer controls, the on-demand inspector, and the map's toolbar |
| `map/` | `generate.ts` and `map-worker.ts` (M8.1); `map-view.ts`, `map-input.ts`, `labels.ts`, `legend.ts` and `goto.ts` (M8.3); `place-builder.ts` and `place-view.ts` (M3.1); `live-town.ts` (`LiveTown`, `HOME_PLACE`, `TownEntry` and `TownParts`, M2.2c) | The map: its worker and the worker's lazy place builder, the lazy view the Map control opens, the town view a wonder opens into, and the live town that a settlement opens as. Highcourt's place context, `TOWN`, lives in worldgen's `place/town.ts` (M2.2c) |

`apps/web/vite/` keeps the build plugins. Vite names a lazy chunk after its file, so the size-limit globs `charts-*.js` and `controls-*.js` hold after the move, and the view input's and the inspector's chunks need entries of their own. So do the economy panel's chunk and the shop-name chunk that the inspector and the panel share (M2.2b), and the goods names chunk, `goods-*.js`, that the panel and the shop names share (M2.7, The Town skin, below).

**`tools/cli/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `main.ts` | The entry CI runs: replay hashes, and the `economy`, `design` and `targets` commands |
| `economy/` | `run.ts`, `presets.ts` | The `economy` command (M2.1), and `PRESETS`, which a grid's `preset` and `--preset` pick by name (M2.3) |
| `design/` | `grid.ts`, `cell.ts`, `pool.ts`, `worker.ts`, `run.ts` | The design runner: a grid and its cells, one cell's run and folder, and the worker threads (M2.3) |
| `targets/` | `targets.ts`, `summarize.ts`, `judge.ts`, `run.ts` | The targets table, one seed's summary, the judge over seeds, and the `targets` command (M2.3) |

Grids live in `tools/cli/grids/`, outside `src/`.

**`tools/bench/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `alloc.ts`, `assert-startup.ts`, `browser-entry.ts`, `budget.ts`, `calibrate.ts`, `chunks.ts` | Entries that package scripts, CI and the budget spec run or bundle by path |
| `compute/` | `allocation.ts`, `budgets.ts`, `judge.ts`, `sample.ts`, `serve-isolated.ts` | The compute gates' sampling, budget table and verdicts. `budgets.ts` holds `ALLOCATION_DAYS` (1, 20 and 21) and `allocationLimit(day)`: 16 KiB and no scavenge on a plain day, and an interim allowance on a month's last and first days until M6 (M2.2b) |
| `machine/` | `benchmark-index.ts`, `LICENSE-lighthouse.txt`, `loadavg.ts` | The machine measured on: its speed index and its load |

**`tools/names/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `cli.ts` | The entry `pnpm names` runs |
| `text/` | `fold.ts`, `edit.ts` | Folding, tokens and edit distance |
| `filters/` | `franchise.ts`, `real-world.ts`, `name-filter.ts` (new) | The franchise ban, the real-world fixture and the person-name filter |
| `sound-set/` | `sound-set.ts` (new) | The one shared mixed sound set: Greek-like sounds mixed with other languages', learned from Fantasy Map Generator's name bases, and its candidate words |
| `lints/` | `culture-text.ts`, `scan.ts` | The culture text lint and the repo scan |

`tools/names/scripts/` gains `words.ts`, which writes the person-name table into `sim-culture` and checks it with `--check`, and `build-avoid.ts` and `build-name-bases.ts`, which rebuild the new fixtures from the network and are run by hand. M8.1's place-name table comes from the same `sound-set/`, as a second output of `words.ts`: `PLACE_WORDS`, 1,024 words on build seed `PLACE_SEED` (2), written to `packages/worldgen/src/names/words.ts` with Fantasy Map Generator's licence beside it. `words.ts` exports `PERSON_TABLE`, `PLACE_TABLE`, `TABLES` and `tableSource(words, constant)`.

## The world step (owner: M0.3)

- **Creation:** `createWorld(seed: number, tier: Tier, ground?: Ground, agents?: number): World`, and `restoreWorld(seed, tier, state: ArrayBuffer, ground?: Ground): World` for checkpoints. A `World` holds the agent store, the ledgers, the tick counter, `world.ground`, and `world.blob`, the world's `Blob` handle, made once in `layoutWorld` (M0.7). From M2.2c it also holds a ledger row for each settlement and the town it will switch to next, and `world.ground` is writable (Every town runs the sim, below).
  - `agents` is how many blobs spawn, a whole number from 1 to the tier's count, which is the default. The layout always holds the tier's whole count, so a smaller town moves no offset and `restoreWorld` needs no count. `populate(world, people?)` throws `RangeError` outside that range. Blob `id` keys every spawn draw, so a smaller town is the first `agents` blobs of the full one.
- **Checks:** while `world.checks` is true, the default, `step` runs `checkInvariants` after every tick. Tests and the CLI keep the default. The worker sets it from `init.checks`, which the app sends as true only from development builds, because wallets make the check cost grow with population. `warmUp`'s throwaway world runs with checks off, as production does (M0.7).
- **Ground (M0.4):** `{ width, height, walk: Uint8Array }` in `sim-core`, tiles row-major from the top-left, where nonzero means walkable. A `MapV1` is a `Ground`, so `sim-core` never imports `sim-protocol`.
  - The ground is an unhashed input: it stays out of the arena and the hash, and a restore must pass the same ground.
  - Without one, `standInGround()` gives a 256 × 256 all-open square, as in the CLI.
  - `layoutWorld` throws `RangeError` when `walk.length` isn't `width × height`, and `populate` when no tile is open.
- **Stepping:** `step(world: World, timer?: SystemTimer): void`, one tick per call.
  - `SystemTimer` is `{ lap(system: number): void }`, called after each system, so the worker and the benches time systems without clocks in `sim-core`.
  - `SYSTEM_NAMES` is `['day', 'move']` in M0.3, and later systems append to it. M2.2b appends `economy`, so it is `['day', 'move', 'economy']`, and `step` laps all three on every tick. A town with streets (the `STREETS` slot is 1) runs `walkStreets` in `move`'s slot, under the same name (M2.7, below). M3.2 appends `life` (built, Task 3) and `chat` (built, Task 4) after `economy`, so it is `['day', 'move', 'economy', 'life', 'chat']` and `step` laps five systems on every tick, `life` and `chat` doing nothing in a world without streets.
- **Movement:** the owner asked on 9 October 2026 that blobs walk in any direction, and the design below is the sim engineer's. `move`, in `wander.ts`, walks blobs on any of 256 headings, so paths curve instead of running along lines.
  - **Headings:** the new column `heading`, a 1-byte `Uint8Array` after `facing` in `AGENT_COLUMNS`, runs clockwise on screen from down: 0 walks down (+y), 64 left, 128 up and 192 right. It is needed because `vx` and `vy` can't give a heading back without trigonometry.
  - **Steps:** `walk.ts` exports `WALK_X_Q8` and `WALK_Y_Q8`, two `Int16Array`s of 256. They hold the step per tick on each heading in Q8 sub-pixels, −1,024 sin and 1,024 cos of 2πh / 256, rounded.
    - `walk.ts` is a leaf module, because `populate` in `world.ts` needs the steps and `wander.ts` already imports `world.ts`. It also holds `facingFor` and `setHeading(agents, i, heading)`, which writes a heading with the `vx`, `vy` and `facing` that follow it.
    - It builds them at load from the generated `WALK_SINE_Q8` in `tables.ts`: 1,024 sin(2πk / 256) for k = 0–64, from stdlib's `sin`, mirrored by integer symmetry. The worker so ships 65 numbers, not 512, for the byte budget.
    - Every step is 1,024 Q8 (4 px, today's walking speed) long to within 0.58 Q8, and mirrored or quarter-turned headings have exactly mirrored or turned steps (computed). A test matches every heading to stdlib's `sin` and `cos`.
    - A walker's `vx` and `vy` are its heading's step, and an idler's are 0.
  - **Turns:** each blob redraws every 16 ticks, staggered by index, so a 16th of them draw in any tick. Blob i redraws when (tick + i) mod 16 is 0, from w = `draw2(seed, WANDER, i, tick)`.
    - A walker stops with chance 1/16, when w & 15 is 0. Otherwise it turns by ((w >>> 4) & 15) − ((w >>> 8) & 15) headings, a triangular −15 to +15 (up to 21°).
    - An idler starts walking with chance 3/16, when w & 15 is below 3, on the fresh heading w >>> 24: the bigger turn. Otherwise it stays idle.
    - So a quarter of blobs idle in the long run, in pauses of 85 ticks against walks of 256 on average, as before.
  - **Walls:** a step onto a blocked tile or off the map has left the blob's own tile, which is open, through a row edge, a column edge or a corner.
    - Through a row edge, the blob slides by its step's x part; through a column edge, by its y part. At a corner it stays put and treats the wall as running along y.
    - It then turns off the wall: its heading is mirrored across the wall, and its angle to the wall is halved, rounded up so it still points away.
    - A blob so leaves a wall at half the angle it met it and never zigzags down a narrow lane. No extra ground lookup is needed.
  - **The shared rule** (owner request, 10 October 2026): `steer.ts` holds the turns and walls above as pure functions on plain numbers.
    - They are `firstRedraw(tick)` with `REDRAW_TICKS`, `wanderTo(heading, walking, w)`, which gives the next heading or `STAND` (−1), and `offWall(heading, wallAlongX)`.
    - `move` calls them, and `sim-protocol`'s `shared/steering.ts` re-exports them with `draw2`, `WANDER` and the steps (Steering, below).
    - `move` keeps its redraw loop inline. A redraw function of its own spent TurboFan's inlining budget for `move`, so the keyed draw's inner call went uninlined and boxed a heap number per redraw.
  - **Facing:** `facingFor(heading)` is ((heading + 32) >> 6) & 3, the facing nearest the heading and so its step's dominant axis. At the four exact diagonals it takes the facing clockwise.
    - `populate` and `move` write `facing` with every heading change, through `setHeading`, so snapshot v1 and its 2 facing bits are unchanged.
  - **Spawns:** `populate` puts each blob at a keyed point in its open tile, so blobs sharing a tile don't stack. With d = `draw2(seed, SPAWN, id, 1)`, x is the tile's left edge plus d & 4095 and y its top edge plus (d >>> 12) & 4095, in Q8.
    - Three in four blobs start walking. With s = `draw2(seed, SPAWN, id, 2)`, a blob where s & 3 isn't 0 starts on the heading s >>> 24, with the `vx`, `vy` and `facing` that follow it. The rest start idle on heading 0, facing down.
    - Three in four is the long-run share of the turns above, so the walking share holds near 75% from the first tick instead of climbing from none: 74.8%, 75.1% and 75.4% at ticks 0, 16 and 64 (measured, seed 42, phone tier).
- `stateHash(world: World): number`: a 32-bit hash over every replay-relevant column and ledger, the value the determinism checks compare. M0.6 adds `stateHashExcept(world, skip: readonly ArrayBufferView[]): number`, of which `stateHash` is the case with nothing skipped, so no golden moves; the relabel test skips the culture columns. M2.4 adds the goods store, which it mixes in next while the `GOODS` slot is 1 (Goods and food, below), M2.7 Task 4 the errand store after it while the `STREETS` slot is 1 (Street link, below), and M2.2c Task 3 adds a town's visited ledger rows and its live place, last, while the `TOWN` slot is 1 (Every town runs the sim, below).
- `World.cultureUid`: a canonical `Uint8Array(MAX_CULTURES)` of stable culture uids, c + 1 per culture and 0 when unused. Culture-level draws key on it, never on the index (M0.6, R8).
- Seed 42's replay hashes at tick 1,000, one per tier, live in `packages/sim-core/test/fixtures/goldens.json`, keyed `"<seed>/<tier>"`; the Node and browser checks both read it. A commit that moves the sim on purpose regenerates it with `node packages/sim-core/scripts/goldens.ts` (M0.6). Since M2.2's household rows, they are `746a06a3` on phone, `7560155c` on phone-plus and `10699866` on desktop. `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints the phone hash. M2.2c Task 3 adds the `switch` golden beside them (Every town runs the sim, below).
- `Tier` is `'phone' | 'phone-plus' | 'desktop'`, with agent caps of 10,000, 25,000 and 100,000. `sim-protocol` re-exports only `Tier` and `TIER_AGENTS` from its `messages.ts` (M0.3).
- Highcourt's replay hashes at tick 1,000, seed 42, on `town.nmap` at the town's own crowd, are pinned in `packages/sim-protocol/test/town-map.test.ts`: `4db351f9` for phone and `ba53250f` for desktop, on the 176 × 112 town, where both tiers spawn 1,720 blobs in its 387 homes and 632 households, one to a bed, and the test builds the town as the worker does, with the map's shops, so its blobs walk their errands (M2.7 Task 4). M2.2b builds that world with `createTown` instead of `createWorld`, which moved both from `e5be40f9` and `d0a2c4ea`, then adds the town's walking start (to `7693e501` and `22dae2ca`) and the economy in the step (to `d11bb532` and `8eb639aa`). M2.4 Task 4 turned `CITY`'s goods on (to `4b1a37d3` and `49f7323c`), M2.2c Task 2's one blob to a bed moved them to `9ca2ad77` and `4cd678eb`, and the M2.4 review's longer burn-in and new `CITY_RECORD` moved them to `ff861cb3` and `da92906e`. M2.7 Task 2's premises took street frontage from 12 homes (387 became 375, and 2,688 beds 2,600) and moved them to `498f12cb` and `4bf399fa`, which a Highcourt with no shops, whose blobs wander, still hashes to; Task 4's streets and their errand store moved them to `cca95710` and `a9f09068`. M3.1 Part 4's ring town moved them to `26c91a01` and `636e4015`, its bell-curve town to `3795465f` and `8b3b7ca0`, and its 32 runs with the M2.7 review's finding 2 to `051f68bc` and `bcced27a`; M3.2 Task 2's activity column moved those to `624cfb6e` and `87e11b4e`, Task 3's leisure sites and life store to `28396a06` and `4682f885`, and Task 4's chats to the pins above. M2.2c Task 3 moved neither, since a town that has never switched hashes as before. The goldens above run on the stand-in ground with `createWorld`, so a new map or a change to the town moves only these.

## Agents and the Blob handle (owner: M0.7)

- **Rows, not objects.** Each blob is one row of `world.agents`' typed columns. The owner decided on 9 October 2026 that code reads and writes a row through a handle object that is made once and re-pointed, never through an object per blob.
- **The new column:** `nameKey`, a `Uint32Array`, 4 bytes, appended to `AGENT_COLUMNS`. `addAgent` draws it at birth as `draw1(seed, PERSON_NAME, id)`, with the new agent stream `PERSON_NAME` = `AGENT_SALT + 6` (0x106), named apart from the world stream `NAME` that M8.1 adds to `rng.py`. Its low 16 bits pick the given name and its high 16 bits the family name. No sim rule reads it, and the culture lint already bans it from guarded folders.
- **`Blob`,** in `agents/blob.ts`:
  - `new Blob(agents: AgentStore, cash: Ledger)` copies the column references it needs. `layoutWorld` makes `world.blob`, and code that needs two rows at once makes its own second handle at world creation, the only other time a `Blob` is made;
  - `at(index: number): void` re-points it. It returns nothing, so a handle is never held under two names;
  - `index` (read-only) is the current row;
  - `x` and `y` (Q8 sub-pixels), `vx` and `vy` (Q8 a tick), `heading`, `action` and `facing` read and write their columns, and code that sets `heading` also sets `vx`, `vy` and `facing`, which follow it;
  - `nameKey` (read-only), `wallet` (read-only, the row's account in `world.cash`) and `cash` (read-only, that account's balance in cents). Money moves only through `transfer`, `issue` and `retire`;
  - `employer` (read-only, M2.2b): the employing firm's row, or −1.
- Column accessors carry their column's exact name, so the look and culture lints see every read. `Blob` has no `look` accessor, since no sim rule reads a look, and no culture accessors until a consumption system needs one.
- **Per-tick loops** use the accessors or plain columns, and call no method per blob. A method per blob made the four-way `move` 2.0–2.8× slower, while accessors cost 7% (M0.7's brief, measured here in Node 24.18.0, V8 only).
  - M0.7's A/B check found accessors 1.05–1.20× slower on the free-heading `move` and up to 3.6× slower on the day slice's walker count (measured there, Node 24.18.0).
  - Both loops therefore keep their columns, under the owner's 10% rule. The handle serves code that touches a few blobs a tick.
- `nearestAgent(agents: AgentStore, xQ8: number, yQ8: number, radiusQ8: number, phase?: Uint8Array): number`, in `agents/nearest.ts`: the nearest blob by squared distance within the radius, ties to the lower index, or −1. It serves the inspector between ticks. Given the errand phases (`world.errands.phase`), it skips a blob whose phase is indoors (`indoorsIn`), which no painter draws (M2.7). The worker passes them only while `STREETS` is 1, since a world with no streets has an empty store, whose zeroes read as asleep and so as indoors.

## Wallets (owner: M0.7)

- **One cash account per blob** in `world.cash`, after the settlement accounts: national accounts 0–15, then 4 sector accounts per settlement, then one wallet per agent slot.
- `createLedger(arena, settlements: number, wallets: number): Ledger`. `Ledger` gains `firstWallet`, and `walletAccount(ledger: Ledger, slot: number): number` returns `firstWallet + slot`. `layoutWorld` passes the tier's agent cap.
- **Opening balance:** `populate` issues `OPENING_CENTS`, exported from `world/world.ts`, from MINT into each new blob's wallet, and no longer funds the households sector account. The owner set it on 9 October 2026 to 100,000 cents (1,000.00), today's per-agent issue.
- **Invariants:** wallets are ledger accounts, so `checkCash` covers them, and all accounts plus MINT still sum to zero. The claims rows `debt` and `lent` are sized by `cash.accounts`, so they cover wallets too.
- **Bytes:** 4 for `nameKey`, 8 for the wallet and 16 for its claims rows, so 28 bytes per agent; at 100k agents the arena grows from 2.39 MB, with the movement column `heading`, to about 5.19 MB of its 64 MiB (computed). `TIER_MEMORY_BYTES` and snapshot v1 are unchanged; neither fact is drawn.

## Snapshot v1 (owner: M0.3)

- 12 bytes per agent (`SNAPSHOT_BYTES`), little-endian. Bytes 0–3 are x and 4–7 are y, as float32 in world pixels (`TILE_PX` = 16 per tile, origin top-left; `sim-protocol` re-exports `TILE_PX`). Bytes 8–11 are the visual word, a uint32.
- Snapshots travel in pooled, transferable `ArrayBuffer`s; the app hands each one back, so `SNAPSHOT_BUFFERS` = 3 circulate and none is allocated per tick. The worker's pool, in `sim-protocol`: `createSnapshotPool(capacity)`, `takeView(pool)` (null while the app holds every buffer), `giveBack(pool, buffer)` and `writeSnapshot(world, view: Uint32Array): number`, which returns the agent count.
- The visual word, read and written only through `sim-protocol`'s helpers:

| Bits | Field | Values |
| --- | --- | --- |
| 0–6 | `look` | 0–95, one of the 96 looks; no sim rule reads it (R8, R9) |
| 7 | `indoors` | 1 for a blob indoors at home or at work, which no painter draws (M2.7) |
| 8–10 | `action` | 0 idle, 1 walk, 2 sit, 3 sleep, 4 work, 5 talk, 6 sneak, 7 carry (R1, R3); from M3.2 a blob standing out at a spot reads 2, in a chat too, and a chatter on its feet 5 |
| 11–15 | `emote` | 0 none, 1 coin, 2 speech, 3 music, 4 ball, 5 heart, 6 question, then ids up to 31 |
| 16–23 | `job` | 0 none, then job-item ids up to 255 |
| 24–25 | `facing` | 0 down, 1 left, 2 up, 3 right |
| 26 | `trueOnly` | 1 for a cue the recorded view must never draw; the render-filter test checks it |
| 27–29 | `item` | 0 for nothing carried, else the good carried: `BREAD` 1 to `FUEL` 7 (M2.7) |
| 30 | `eating` | 1 while the blob eats on its doorstep (M2.7) |
| 31 | reserved | 0 |

- There is no "wanted" bit (R1, R3).
- Helpers: `packVisual(look, action, emote, job, facing, trueOnly, indoors = 0, item = 0, eating = 0): number`, and `lookOf`, `actionOf`, `emoteOf`, `jobOf`, `facingOf`, `isTrueOnly`, `indoorsOf`, `itemOf` and `eatingOf`, each taking `(word: number): number`. The top bit used is 30, so a word is a non-negative int32. The street's three arguments default to 0, so a caller with no street packs the words it always did.
- **The street's bits** (M2.7 Task 5, 483176d and 00a1260; M3.2 Task 4) come from the errand and life stores, through `snapshot/street.ts`'s `addStreet(world, view, agents)`, which ORs them into the words the base loop wrote. It was `indoorsAt`, `itemAt`, `eatingAt` and `emoteAt`, four calls a blob; it is now one loop with a word for each phase (Street link, below): a blob indoors reads the `indoors` bit alone, a buyer the coin, an eater its meal and the good, a blob out at a free-time spot a seat or a chat, and a walker coming home the good it carries, by `carriedIn(phase, good)`.
  - `writeSnapshot` writes the six old fields in its one loop and then, only while `globals[STREETS]` is 1, ORs the street's in from a second pass. A town without streets never writes the stores, whose zeroes read as asleep and so as indoors, so it must not be asked: its words stay as before.
  - Read in the one loop for every blob of every world, the three fields more than doubled the 100k snapshot, from 0.38 to 0.83 ms against its 0.6 ms row, and the second pass leaves it at 0.39 ms (measured here, Node 24.18.0 on Windows, load not recorded). A town at 100k with streets would pay the second pass, which a snapshot budget must then count.
  - **The pass costs** 0.13 to 0.20 ms at 10,000 blobs and 0.41 to 0.64 at 25,000 across a day on the street bench world, where the four calls a blob took 0.21 to 0.24 and 0.54 to 0.60: M3.2's seats, chats and signs came with a faster pass (measured here, Node 24.18.0 on Windows, load not recorded).
  - **`emote`** ids are in `visual.ts`. `EMOTE_COIN` (1) is the buyer at a counter while its phase is `PHASE_BUYING`, drawn as the place's `coin` emote (M2.7, fc16716). M3.2 Task 4 adds `EMOTE_SPEECH` (2) over each blob of a chatting pair, the signs of an outing, `EMOTE_MUSIC` (3), `EMOTE_BALL` (4) and `EMOTE_HEART` (5), and `EMOTE_QUESTION` (6), which nothing shows yet: Task 7's visitor whose friend is out. A coin wins over speech and speech over a sign, and the render side maps an id it has no bubble for to none (the Town skin draws all six, since Task 5 added `speech`, `music` and `ball` to the place's emotes, which Task 9 drew).
  - **A chat** shows while the world, which waits to run a tick, has that tick at most the blob's `chatUntil` and the blob has a partner (`chatWith` not 0). A chat stops a walker for the ticks before `chatUntil` and sets it off again in the step of that tick, so the world still shows the chat as it waits to run it, and `chatWith` tells a chat's last tick from the world's first, when `chatUntil` is 0. Between ticks, in a chat is `chatWith[blob] !== 0 && tick <= chatUntil[blob]`.
  - **`action`:** the street pass writes `ACTION_SIT` for a blob in `PHASE_STAYING`, on its doorstep or in a site, and `ACTION_TALK` for a walker a chat has stopped. The sim halts both with its own action at idle, so the street's bits OR in to nothing. No bit of the word is new, and bit 31 stays free.
  - **A sitter who chats keeps sitting** (the polish, Lives of their own below): it reads `ACTION_SIT` with `EMOTE_SPEECH`, the pose being the action's and the bubble the emote's, as with an outing's sign. A word with no new bit says it, so none of bit 31 is spent, and the renderer, which draws a pose from the action and a bubble from the emote, needed no change. Before this a chatting sitter read `ACTION_TALK` and stood up.
  - **An outing's sign** shows over a blob in `PHASE_STAYING` whose activity is `ACTIVITY_PLAZA` or later, by the kind of the site in its row: `SITE_PLAZA` the ball, `SITE_GREEN` music, `SITE_WATER` the heart. It shows when `((tick >>> 5) + blob) & 3` is 0, a quarter of the time in windows of 32 ticks, staggered by blob, so one of four neighbours at a plaza is lit at any tick. No blob goes to water yet (Task 8), and a heart shows the day one does. A doorstep has no sign.
- `ACTION_NAMES` lists the eight actions in bit order.
- `JOB_ITEMS` is `['builder', 'clinic', 'farmer', 'merchant', 'police', 'soldier']`, with job id = index + 1 and 0 for none. `JobItem` is one of its names, and `jobId(item: JobItem): number` gives the id. M0.4 owns them and tests them against the sprite manifests; new items are appended, so no id shifts.

## Worker messages (owner: M0.3)

- App to worker:
  - `{ type: 'init', seed, tier, map: ArrayBuffer, checks: boolean, agents?: number }`; `checks` sets `world.checks`, and the app sends true only from development builds (M0.7). The app sends `agents` only when the URL names the tier with `?tier=`, from `startAgents(tier, tierNamed)`: the tier's whole count, which is how the perf specs keep their 10,000, 25,000 and 100,000. The worker then calls `createStandInTown`, which seats that many in stand-in homes. Left out, as on every other start, it calls `createTown` and seats one blob to a bed of the map's homes (M2.2c Task 2).
  - `{ type: 'pause' }` and `{ type: 'resume' }`
  - `{ type: 'return', buffer: ArrayBuffer }`
  - `{ type: 'checkpoint' }`, which the app sends on `pagehide`
  - `{ type: 'speed', speed: Speed }`, with `SPEEDS` = [1, 4, 16] and `Speed` in sim-protocol (M2.2b Task 8).
    - It changes no state, so a watch-only run accepts it. The worker takes it while paused and keeps it for Play, and `init` resets it to 1×.
    - The loop then runs `speed` ticks per 100 ms slot, so a turn still posts one snapshot. A turn spends at most `MAX_TURN_MS` (10) × `speed` ms, drops the ticks it can't fit and never makes them up, and `MAX_GAP_MS` caps the debt at two slots.
    - **Fast nights** (owner, 11 October 2026; M2.7): in a town with streets, a slot that starts from 22:00 to 06:00 (`tick % 1440` at least 1,320 or under 360) holds `NIGHT_SPEEDUP` (8) × `speed` ticks, and ends at 06:00 when that comes first. The cap and the loss are as above, whatever the hour. A world without streets, whose blobs are about all night, keeps `speed` ticks a slot. The speed is pacing only: two days at 1× with fast nights reach the hash that plain stepping does.
  - `{ type: 'inspect', x, y }`, in world pixels, which the worker rounds to Q8: a read-only query, answered at any time, even while a run plays (M0.7)
  - `{ type: 'inspectAgent', agent }`, a blob's row (M2.2c Task 4): the same query by row, for an open blob card that refreshes about once a second. It is read-only, answered at any time with the same `inspected`, and a row that is not below the town's blob count answers `agent` −1.
  - `{ type: 'open', place, map: ArrayBuffer }`, to switch to settlement `place`, whose ground is the `.nmap` bytes in `map` (M2.2c Task 4). The switch lands at the next day boundary, and the worker answers with `opened`, paused or not (Every town runs the sim, below).
- Worker to app:
  - `{ type: 'ready', agents }`. A tick-0 snapshot follows (M0.4); in a town with streets it is the snapshot of 07:00, tick 420, which the worker ran up to before `ready` (Street link, below). Then the worker warms up (R6) and waits for `resume`. Messages sent during the warm-up wait until it ends. Under reduced motion the app withholds `resume` (M0.5).
  - `{ type: 'snapshot', tick, count, buffer: ArrayBuffer }`
  - `{ type: 'stats', tick, systemMs: Record<string, number> }`, keyed by `SYSTEM_NAMES` plus `snapshot`, the mean milliseconds per snapshot (M0.3)
  - `{ type: 'checkpoint', tick, state: ArrayBuffer }`, the answer to the app's `checkpoint`
  - `{ type: 'inspected', tick, agent, nameKey, cents, employer, employerGood, wage, look, action, home, members, bought, activity, phase, reason, partner, partnerKey, needs, traits }`, the answer to `inspect` and to `inspectAgent`: the nearest blob within one tile (16 world pixels), or the blob in the asked row, or `agent` −1 with `nameKey` and `cents` 0 (M0.7). `employer` is the blob's firm row, `employerGood` that firm's good (an index into `GOOD_NAMES`) and `wage` its pay in cents a month, or −1, 0 (`GENERIC`) and 0 for someone out of work, and for `agent` −1 (M2.2b; `employerGood` in M2.4 Task 5). `look` is one of 96 (hue `look % 6`, eyes `floor(look / 6) % 4`, pattern `floor(look / 24)`), `action` an `ACTION_*` code, `home` the row of its household's home or −1, and `members` the name keys of the others in its household, in household order, at most 5; for `agent` −1 they are 0, 0, −1 and [] (the blob modal, 5b6e505). The last seven fields are the blob's life (M3.2 Task 6, Lives of their own below): `activity` (`ACTIVITY_*`) and `phase` (`PHASE_*`), `reason` (0, or the need + 1), `partner` (the row of the blob it is chatting with, or −1) and `partnerKey` (that blob's name key, or 0), `needs` (the four levels from 0 to `MAX_LEVEL`: hunger, rest, fun and company) and `traits` (sociable, homebody and restless, 0 to 255 each). For `agent` −1, and in a town without streets, they are `NO_ACTIVITY` (−1), 0, 0, −1, 0, [] and []
  - `{ type: 'opened', place, agents, width, height, tick }`, the answer to `open` (M2.2c Task 4): the town live once the switch has landed. `place` is the settlement asked for, or the one that stays live when the request names the live town or the sim refuses it. `agents` is its blob count, `width` and `height` its ground in tiles, and `tick` the world's tick after the step that ran the boundary, so a request at tick 700 answers at 1,441. A snapshot of the town follows it, buffer permitting, and every snapshot before it is of the old town.
  - `{ type: 'economy', day, days, meanWageCents, unemploymentPpm, soldUnits, stockUnits, paidCents, eaten, spoiled, unmet, trades, tradeShop, tradeGood, tradeUnits, tradeCents }`, a town's feed after each day's last economy tick, and from a town only (M2.2b, The economy on screen, below; goods and food from M2.4 Part 1)
- `sim-protocol`'s `bindPageLifecycle(doc, win, post): void` sends `pause` and `resume` on `visibilitychange`, and `checkpoint` on `pagehide`. M0.5 wraps it.
- `sim-worker`'s `createSimLoop(host: LoopHost, cpuSlowdown = 1): { handle(msg: AppMessage): void }` runs the loop. A `cpuSlowdown` above 1 makes the worker wait before each reply, and after its warm-up, as a CPU that many times slower would, since CDP's CPU throttling skips workers. Only the startup gate sets it, through a `__nomosCpuSlowdown` global that its server prefixes to the worker chunk (M0.6, R5). `LoopHost` has `readTown(map: ArrayBuffer): TownSite` beside `makeWorld`, which reads an `open` message's map into `{ ground, homes, shops? }`; `worker.ts` binds it to `parseMap`, the map's home entities and `createShops(premisesOf(map))`, as `makeWorld` reads `init`'s (M2.2c Task 4; the shops are M2.7 Task 4's).
- The startup gate's server, `startServer(options: ServeOptions): Promise<Served>` in `apps/web/test/serve.ts`, serves a build over an emulated Fast 4G link, with `latencyMs` 165, `bytesPerSecond` 1,012,500 and `setupRtts` 3 by default. Its `workerSlowdown`, 1 by default, is the `cpuSlowdown` it prefixes to the worker chunk (M0.6, R5).
- Speed comes from M2.2b's `speed` message (App to worker, above). Skip and the per-tier speed caps arrive in M1.2 (Calendar); the worker refuses settings messages while a run plays.

## The binary map, version 1 (owner: M0.4)

- One format for generated and hand-made maps (R9): terrain kinds, IntGrid walkability, and entities (homes with capacity, workplaces, shops with hours, civic buildings).
- It lives in `sim-protocol` as `parseMap(buffer: ArrayBuffer): MapV1`, which throws `MapError` on a bad or short buffer, such as a 404 page, never a `RangeError` or half a map. `writeMap(map: MapV1): ArrayBuffer` is the format's one encoder (M2.2c Task 1, 62103c0): it writes the bytes `parseMap` reads, and trusts its map, whose one maker is worldgen's ground, so a script or test that writes a file parses it back. Both sit behind the `@nomos/sim-protocol/map` export, which also gives worldgen the format's codes. Files start with `MAP_MAGIC` ("NMAP"), end in `MAP_EXTENSION` (`.nmap`) and are served as `MAP_CONTENT_TYPE` (`application/x-protobuf`), a compressible type (R5).
- `MapV1` is `{ version: 1, width, height, kinds: TerrainKind[], frames: string[], terrain: Uint8Array, walk: Uint8Array, tiles: Uint16Array, entities: MapEntity[] }`:
  - `TerrainKind` is `{ name, rgb }`;
  - `walk` holds `WALK_BLOCKED`, `WALK_OPEN`, `WALK_ROAD` or `WALK_DOOR` (0–3);
  - `tiles` index `frames`, with `NO_FRAME` (0xffff) for none;
  - `MapEntity` is `{ kind, x, y, w, h, doorX, doorY, frame, capacity, opens, closes }`, with `kind` one of `ENTITY_HOME`, `ENTITY_WORKPLACE`, `ENTITY_SHOP` and `ENTITY_CIVIC` (1–4), and from M3.2 `ENTITY_PLAZA` and `ENTITY_GREEN` (5 and 6). `capacity` is a home's, and `opens` and `closes` are a shop's minutes.
  - **Leisure places (M3.2 Task 2):** a plaza or a green is no building, so it is listed after every building, which keeps each premises' index, and its `capacity`, `opens` and `closes` are 0. Its `x`, `y`, `w` and `h` are the ground it covers, its door is a tile of it, in front of a town's fountain, below a village's well, or at a green's middle, and its `frame` is the ground tile there. Its door is no `WALK_DOOR` tile, since nobody enters it. The parser accepts kinds 1–6, and an older map with none has no leisure sites.
- Tiles name sprite frames, never atlas indices (R9).
- A premises, a shop or stall where blobs buy, is an entity whose frame names its trade, so the format holds nothing more: `premisesOf` reads them (Street link, below).
- The worker loads it in `init`; the renderer reads the same `MapV1` for Skin A's minimap colours.

## Sprite manifests (owner: M0.5)

- `sim-protocol` publishes `schema/sprite-manifest.schema.json` (JSON Schema 2020-12, `$id` `urn:nomos:sprite-manifest:1`) and the types generated from it, `SpriteManifest` and `SpriteFrame`. `pnpm --filter @nomos/sim-protocol types` regenerates them.
- A manifest names its frames and never holds an atlas index; the atlas build places them (R9).
- **Carried goods** (M2.7 Task 6, 43b39bc): `SpriteFrame` gains `hold?: [x, y]` and `eat?`.
  - `hold` is the carried item's top-left pixel on a body frame, in the frame's own pixels from its top-left. A body frame that shows no item has none: facing up, sitting and sneaking.
  - `eat` is three `[x, y]`, the item's top-left on each step of eating, and only a standing frame has it. A walking frame has `hold` alone.
  - `characters.build()` writes them on every hue's body frames, and its `holds` flag is gone. `tools/atlas` copies them into `atlas.json` beside `face`.

## WorldRenderer (owner: M0.4)

The map doesn't draw through `WorldRenderer`. M8.3's `MapRenderer` has a canvas and a context of its own, behind the lazy `./map` export, so the renderer chunk keeps its bytes (see The map scene).

- In `render-gl`: `createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer`.
  - `RendererOptions` is `{ release(buffer: ArrayBuffer): void; backend?: 'auto' | 'canvas2d'; restoreTimeoutMs?: number }`. `'canvas2d'` skips WebGL2, as `?canvas` asks. A lost WebGL2 context falls back to Canvas2D after `restoreTimeoutMs`, 3,000 ms by default.
  - `WorldRenderer` reads `backend` (`Backend`, `'webgl2' | 'canvas2d'`), `canvas` (the fallback replaces it), `drawnAgents` and `drawnSkin`.
  - Its methods are `init(): Backend`, `resize(deviceWidth, deviceHeight, dpr)`, `setMap(map: MapV1)`, `pushSnapshot(frame)`, `draw(camera: Camera, alpha: number)`, `setSkin(skin: Skin): Skin`, `setLod(policy: 'auto' | 'fixed')`, `setTown(town: TownPainter)` and `dispose()`. `init` falls back to Canvas2D when WebGL2 is missing or a shader fails to link.
  - `setTown` lends the Town skin, which loads after the first frame (The Town skin, below). The renderer never disposes it; its maker does.
- `pushSnapshot` takes `{ tick, count, buffer }`, exactly as the worker sends it. It copies the snapshot and hands the buffer to `options.release` on every push, even when nothing draws, so the worker's pool never runs dry.
- `Skin` is `'dots' | 'blobs' | 'town'` (`SKINS`), and `BUILT_SKINS` is `['dots', 'town']` (owner request, 10 October 2026; `['dots']` before). `setSkin` returns the skin it will really draw, dots for blobs until they are built (R3). Under `setLod('auto')`, the default, `autoSkin` picks dots or town each draw from the tile's CSS size and the agents in view.
  - Until a town is lent, a draw that picks the town draws dots, and `drawnSkin` says dots.
- Other exports:
  - `Camera` is `{ x, y, zoom }`: the world pixel at the view's top-left, and whole device pixels per texel, from `MIN_ZOOM` 1 to `MAX_ZOOM` 16;
  - `fitCamera(mapWidth, mapHeight, deviceWidth, deviceHeight)`, with the map in tiles; `zoomAt(camera, zoom, deviceX, deviceY)`; `panBy(camera, dxDevice, dyDevice)`, where a positive delta moves the view right or down; `snapCamera(camera)`; and `cssPxPerTile(zoom, dpr)`. The first four return a new `Camera`;
  - `worldAt(camera, deviceX, deviceY): [number, number]`, the world pixel under a device pixel, which `zoomAt` also uses (M0.7);
  - `observeDeviceSize(element, onSize, forceFallback?)` calls `onSize(deviceWidth, deviceHeight, dpr)` as the element resizes and returns an unsubscribe function;
  - `skinFromQuery`, `builtSkin`, `autoSkin`, and `mountSkinToggle(parent, renderer: SkinRenderer, initial: Skin | 'auto')`;
  - `CANVAS2D_AGENT_CAP` = 5,000, the most agents in view that Canvas2D draws (R2);
  - `contrastRatio`, `edgeFor` and `minimapPixels`.

## Culture (owner: M0.6)

- `@nomos/sim-core/kernels` exports `draw1`–`draw4`, `DAYS_PER_YEAR`, the stream ids `CULTURE` (0x101) and `FESTIVAL` (0x105), `customOf`, `withCustom`, `CUSTOM_FOOD`, `CUSTOM_FESTIVAL`, `CUSTOM_MUSIC`, `CUSTOM_NAMING` and `MAX_CULTURES` (8). Later code adds more.
- `sim-culture` exports `STAND_IN_FESTIVAL_DAYS` (10) and `festivalToday(seed, uid, day): boolean`, true when `draw2(seed, FESTIVAL, uid, day) % DAYS_PER_YEAR < STAND_IN_FESTIVAL_DAYS`. Callers pass a uid from `World.cultureUid`, never a culture's index, and M3.7's festival table replaces it.
- `sim-core`'s `festivalShoppers(world, day): number`, in `consumption/stand-in.ts` and exported from its index, counts the agents whose festival custom's culture holds a festival that day. It stands in for consumption until M2.6, and the step never calls it.
- `sim-culture`'s `cultureViews(world): readonly ArrayBufferView[]` lists the regions that hold culture: the `culture`, `birthCulture` and `customs` columns and `World.cultureUid`. `relabelCultures(world, perm: Uint8Array): void` renumbers culture c as `perm[c]` in every column and custom and moves its uid along, and throws `RangeError` unless `perm` reorders exactly the cultures in use. R8's relabel test checks that `stateHashExcept(world, cultureViews(world))` doesn't change (M0.6).
- **Names (M0.7, R8):**
  - `sim-culture` exports `personName(nameKey: number): string`, "Given Family" with each word capitalised. The given word is `NAME_WORDS[(nameKey & 0xffff) % NAME_WORDS.length]` and the family word the same over `nameKey >>> 16`, moved to the next word when the two would match.
  - `NAME_WORDS`, in the generated `naming/words.ts`, holds 1,024 words of the shared sound set in `tools/names/src/sound-set/`, each 4–10 letters and each passing `tools/names`' person-name filter. `node tools/names/scripts/words.ts` rebuilds it and copies Fantasy Map Generator's licence beside it, and `--check` fails when either is stale.
  - Names are text only on screen: the sim stores the key, and only the app's inspector calls `personName`. M3.7 adds the naming custom's structure, such as given and parent's given name, as a second argument.
- **The mixed sound set (M0.7, owner, 9 October 2026):** one style for everyone, people now and towns and countries in M8.1, so no culture owns a sound. Each word mixes Greek-like sounds with those of two other real-world languages, picked at random per word. It is learned from Fantasy Map Generator's name bases at commit `546c41d`, kept in `tools/names/fixtures/name-bases.json` with that project's MIT licence beside it, and round 8's trigram screen is dropped.
  - `loadSoundSet(): SoundSet` reads the bases and learns each as letter chains, order 2.
  - `drawWord(sounds: SoundSet, seed: number, n: number): string` is candidate n of the table built on `seed`, drawn with `draw2`. M8.1's place table uses its own seed.
- **The person-name filter (M0.7, R3, R8):** `tools/names`' `rejectName(word: string): string | null` returns the rule a word breaks, or null. Its rules, in order:
  - `franchise`: M0.6's franchise ban, and creature-style words ending in "mon";
  - `real-world`: M0.6's real-world fixture;
  - `place` and `species`: the franchise's distinctive town and city names and its species names, from Wikidata (CC0), at edit distance 1 up to 5 letters and 2 above;
  - `profanity`: LDNOOBW's 21 Latin-script lists (CC BY 4.0), exact for 3-letter entries and by substring for 4 or more;
  - `denied`: words a reviewer read in the table that the lists miss, matched exactly, from `tools/names/fixtures/denied.txt` (M0.7 review). They are common words in major Latin-script languages, slang or rude words in any language, brand, product and franchise names, faith terms and famous people. Real place names stay, because a place name as a person's name is ordinary.

  M3.7 adds real festival names and runs it over places and festivals.

## The world map (owner: M8.1)

M8.1 ports `tools/worldgen` to TypeScript, and M8.3 draws what it makes. The owner decided on 9 October 2026 that the map opens from a button, loads on demand and runs in a worker of its own, so the town stays the first view.

### The package

`@nomos/worldgen` is pure TypeScript with no DOM. Its concern folders mirror `tools/worldgen`'s modules, so each Python function has one obvious home:

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts` | The barrel: `generateWorld`, `worldFingerprint`, `placeNames` and `StageTimer`, and from M3.1 `placeContexts`, `buildPlace` and `PlaceContext`, and from M2.2c `TOWN` |
| `random/` | `streams.ts`, `keyed.ts` | `rng.py`'s world streams, and its `chance` and `shuffled` |
| `grid/` | `grid.ts`, `heap.ts` | `grid.py`'s neighbours, distances and parts, cell coordinates, and the binary heap behind every Dijkstra and A\* |
| `terrain/` | `templates.ts`, `chains.ts`, `shape.ts` | `terrain.py` |
| `climate/` | `rain.ts`, `climate.ts`, `biomes.ts` | `climate.py` |
| `drainage/` | `flood.ts`, `lakes.ts`, `drain.ts` | `drainage.py` |
| `settle/` | `habitability.ts`, `settle.ts`, `farm.ts` | `settle.py` |
| `countries/` | `countries.ts`, `grow.ts` | `countries.py`; `grow` serves regions too |
| `regions/` | `regions.ts` | Regions inside countries, and market territories across them; Python has neither |
| `routes/` | `costs.ts`, `graph.ts`, `roads.ts`, `lanes.ts`, `classes.ts` (M3.1's Part 3) | `roads.py`, whose step costs countries share, and its road classes |
| `features/` | `survey.ts`, `wonders.ts`, `landmarks.ts` | `features.py` |
| `names/` | `place-names.ts`, `words.ts` (generated), `LICENSE-fmg.txt` | Place and country names |
| `world/` | `draft.ts`, `generate.ts`, `fingerprint.ts` | The world being built, the pipeline, and `world.fingerprint` |
| `place/` | `site.ts`, `build.ts`, the stage files (among them `walls.ts` and `farms.ts`, from M3.1's Part 3, and `plan.ts`, `rings.ts`, `grid.ts` and `connect.ts`, built in its Part 4, and `winding.ts`, planned), `looks.ts`, `contexts.ts`, `layout.ts`, `ground.ts`, `town.ts`, `frames.ts` (generated) and `kind-colours.ts` (generated) | `place.py`, `looks.py`'s `look_for` and `world.py`'s place contexts (M3.1, Places below). From M2.2c, `export_map.py`'s `town_map` is `ground.ts`, its map colours are `kind-colours.ts`, and Highcourt's context is `town.ts` |

- **Imports:** values only from `@nomos/sim-core/kernels`, `@nomos/sim-protocol/world-map`, `@nomos/sim-protocol/place` and, from M2.2c, `@nomos/sim-protocol/map`, for the map format's codes.
  - `kernels` gives the keyed draw, value noise and integer maths. M8.1 adds `mix`, `draw`, `below`, `value`, `fbm`, `floorDiv`, `floorMod` and a new `isqrt` to its exports.
  - `world-map` is a leaf module holding the codes and the `WorldMap` type, so each code has one home.
- **Lints:** M0.6's generator profile covers `packages/worldgen/src`:
  - no transcendental `Math`, `Math.random`, `**` or `BigInt`, and none of `Math.sqrt`, `trunc`, `round` or `ceil`, since Python's integer maths has no rounding;
  - no bare `/` or `%`: `floorDiv`, `floorMod`, or `(x >>> 0) % n` on an unsigned draw;
  - `sort` only with a comparator, which must be a total order with ties broken by cell index.
- **Version:** `WORLDGEN_VERSION` is 1. Version 1 freezes after the owner hears 100 sample place names; after that, any change to the output takes a new version and new goldens.

### Generating

- `generateWorld(seed: number, size: WorldSize, timer?: StageTimer): WorldMap` makes the world `tools/worldgen`'s `world.generate(seed, *SIZES[size])` makes. The seed is read as uint32.
- `worldFingerprint(map: WorldMap): number` equals Python's `world.fingerprint` for the same world. From M3.1's Part 3 it folds `roadClass` after the roads and lanes.
- `StageTimer` is `{ lap(stage: string): void }`, called as each stage ends: `shape`, `rain`, `drain`, `climate`, `biomes`, `settle`, `countries`, `regions`, `farm`, `roads`, `lanes` and `features`. The package reads no clock itself.
- **Goldens:**
  - `tools/worldgen/goldens.py` writes one fingerprint per stage for 100 seeds of each size into `packages/worldgen/test/fixtures/goldens-v1.json`. The file defines the stages and their fold. From M3.1's Part 3, a `classes` stage follows `roads`.
  - Regions and names, which Python lacks, are frozen from TypeScript in `frozen-v1.json`.

### `WorldMap`

In `sim-protocol`'s `world-map/world-map.ts`, exported as `@nomos/sim-protocol/world-map`. Codes are indices into its name tables, which keep `tools/worldgen`'s order:
- `WORLD_SIZES`: `standard` is 96 × 64 cells and `large` 192 × 128, and `WorldSize` is either name;
- `TEMPLATE_NAMES`: continent, peninsula, coast, archipelago, twin-isles;
- `SIDE_NAMES`: n, e, s, w;
- `BIOME_NAMES`: ocean, lake, grassland, farmland, forest-deciduous, forest-conifer, marsh, sand, hills, mountain, peak, snow;
- `COAST_NAMES`: inland, beach, cliffs;
- `TIER_NAMES`: capital, city, town, village, hamlet;
- `WONDER_NAMES` and `LANDMARK_NAMES`: `model.py`'s `WONDERS` and `LANDMARKS`;
- `ROAD_CLASS_NAMES`: minor, major (M3.1's Part 3).

Per world:

| Field | Type | Holds |
| --- | --- | --- |
| `version` | `number` | `WORLDGEN_VERSION` |
| `seed` | `number` | The uint32 seed |
| `width`, `height` | `number` | Cells |
| `template` | `number` | A `TEMPLATE_NAMES` index |
| `wind` | `number` | The `SIDE_NAMES` index of the side the rain wind blows from |
| `cold` | `number` | The `SIDE_NAMES` index of the cold edge, 0 or 2 |

Per cell, row-major from the top-left, cell = y × width + x:

| Field | Type | Holds |
| --- | --- | --- |
| `elevation` | `Int16Array` | Land 1 to 1,000 above sea level; water −1,000 to 0 |
| `biome` | `Uint8Array` | A `BIOME_NAMES` index, farmland included |
| `temperature`, `moisture` | `Uint8Array` | 0–255, cold to hot and dry to wet |
| `river` | `Uint8Array` | 0, or a river's size, 1–3 |
| `receiver` | `Int32Array` | The cell its water flows to, or −1 |
| `coast` | `Uint8Array` | A `COAST_NAMES` index |
| `variant` | `Uint8Array` | `draw(seed, SHAPE, 0x200, cell) & 3`, as `mapdraw.py` draws: bit 0 picks the grassland or farmland tile, and bit 1 adds a low peak to a 16-px mountain. So `render-gl` needs no draw |
| `country` | `Uint8Array` | 0 for water, else 1–K |
| `region` | `Uint16Array` | 0 for water, else 1–R |
| `market` | `Uint16Array` | 0 for water, else the region id of the seat whose market serves the cell |

Settlements, n of them in id order: id 0 is the largest, and populations never rise with id.

| Field | Type | Holds |
| --- | --- | --- |
| `settlements.cell` | `Int32Array` | Its cell, which is also its uid |
| `settlements.tier` | `Uint8Array` | A `TIER_NAMES` index; every capital has tier 0 |
| `settlements.population` | `Int32Array` | People |
| `settlements.country`, `settlements.region` | `Uint8Array`, `Uint16Array` | Those of its cell |
| `settlements.landmarks` | `Uint8Array` | `LANDMARK_SLOTS` (3) per settlement: `LANDMARK_NAMES` indices from slot 0, then `NO_LANDMARK` (255) |

The rest:

| Field | Type | Holds |
| --- | --- | --- |
| `countries.capital`, `countries.colour` | `Int32Array`, `Uint8Array` | Country k is index k − 1, with K = 3–5: its capital's settlement id, and its colour, 0–4, an index into M8.3's five map colours |
| `regions.seat`, `regions.country` | `Int32Array`, `Uint8Array` | Region r is index r − 1: its seat's settlement id, and its country |
| `roads`, `lanes` | `PathTable` | One path of cells per road route or sea lane, as `{ offsets: Int32Array, cells: Int32Array }`: path p is `cells[offsets[p]]` up to `cells[offsets[p + 1] − 1]` |
| `roadClass` | `Uint8Array` | One per road path, in `roads`' order, a `ROAD_CLASS_NAMES` index. Major roads are the cheapest chains of routes joining the towns, cities and capitals that a spanning tree links on each landmass (M3.1's Part 3) |
| `bridges` | `Int32Array` | River cells that roads cross, ascending |
| `wonders.kind`, `wonders.cell` | `Uint8Array`, `Int32Array` | `WONDER_NAMES` indices, 4–8 a world, or 3 where the land has no fourth site, in placement order |
| `landmarks.kind`, `landmarks.cell` | `Uint8Array`, `Int32Array` | Landmarks on cells of their own (lighthouses, viaducts and observatories), as `LANDMARK_NAMES` indices |

- **Transfer:** every typed array owns its own `ArrayBuffer`, of exactly its length. So `worldMapBuffers(map): ArrayBuffer[]` lists each buffer once, and the map worker transfers them all.
- **Regions** are provisional, and M7.3 adopts or revises them:
  - every settlement of tier capital, city or town seats one region, in id order;
  - each country's regions grow from its seats by the countries' growth, over its own land and any water;
  - market territories grow from the same seats with no fence, since trade crosses borders.
- **Countries and regions are map facts:** no sim rule reads them (Countries).
- **Names:** `placeNames(map: WorldMap): string[]` gives the K country names, then the n settlement names in id order. They are display text, outside the map and the fingerprint.
  - A name is a capitalised `PLACE_WORDS` word keyed on a cell, never an id: a country keys on its capital's cell and a settlement on its own (M8.1 Task 33).
  - Countries take names first, in id order, then settlements in cell order. A word already taken in the world takes the next attempt.
  - `placeWordIndexes(map): Int32Array` gives each name's table index, which `frozen.ts`'s `names` stage folds. It isn't on the barrel.

### Body hues

`world-map.ts` holds `CROWD_HUES`: sun, lilac, rose, ice, mint and silver, in `spritekit.py`'s `BODY_HUES` order. `place-layout.ts`'s `LOOK_HUES` is the same list.

The map's look-only crowd of walking dots (M8.3, owner, 9 October 2026) was removed at the owner's request on 10 October 2026: the world map draws no people, and the places keep theirs.

### Map worker messages

- Page to map worker, `MapAppMessage`: `{ type: 'generate', seed: number, size: WorldSize }`.
- Map worker to page, `MapWorkerMessage`: `{ type: 'world', map: WorldMap, names: string[], stageMs: Record<string, number> }`, with every buffer transferred. `stageMs` holds each `StageTimer` stage's milliseconds, plus `names` and, from M3.1, `contexts`, the place contexts kept for place requests.
- A throw in the world generator reaches the page as the Worker's `error` event, as the sim worker's do.
- Both types live in `world-map.ts`.
- From M3.1, the worker also answers a `PlaceRequest` with a `PlaceReply` or a `PlaceError`, whose types live in `place-layout.ts` (Places, below). A place that can't be built never throws.

### Who imports what

- `worldgen` imports values only from `@nomos/sim-core/kernels`, `@nomos/sim-protocol/world-map`, `@nomos/sim-protocol/place` and `@nomos/sim-protocol/map`, and nothing imports it but the map worker and tests. Dependency-cruiser enforces both.
- **In `web`,** only `src/map/generate.ts`, which answers a `generate` message, `src/map/map-worker.ts`, which binds it to the worker's messages, and `src/map/place-builder.ts`, the worker's lazy part that builds places (M3.1), may reach `@nomos/worldgen`.
  - The page starts the worker with `new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' })`.
  - So Vite builds it as its own chunk, `map-worker-*.js`, whose name never matches the sim worker's `worker-*.js` glob.
- **`render-gl`** gains a `./map` export, the lazy map scene, with its entry file at `src/map.ts`. It imports only `sim-protocol`, and its API is The map scene, below.
- **Nothing of the map reaches the first load** (owner, 9 October 2026). The entry, sim worker and renderer chunks keep their bytes, and the HUD's Map button, about 0.15 kB of first-load JS since M2.2b's Task 8, imports `map/map-view.ts` only when pressed.

## The map scene (owner: M8.3)

The Country and Region views draw a `WorldMap` with a renderer of their own, which loads only when the Map control is pressed.

### `@nomos/render-gl/map`

- **Camera:** `MapCamera` is `{ x, y, cellPx }`.
  - `x` and `y` are the cell at the view's top-left, fractional.
  - `cellPx` is whole device pixels per cell, one of `MAP_CELL_PX`: 8, 16, 32, 48, 64, 96 and 128. Every step past 8 is a multiple of 16, so both views draw their art at whole scales.
  - `fitMapCamera(width, height, deviceWidth, deviceHeight)` gives the largest step that shows every cell, centred, or 8 when none does.
  - `zoomMapAt(camera, steps, deviceX, deviceY)` moves along `MAP_CELL_PX`, keeping the cell under the point where it was.
  - `panMapBy(camera, dxDevice, dyDevice)` moves the view right or down for a positive delta.
  - `cameraDevice(camera)` gives the view's top-left in whole device pixels, which every draw snaps to.
  - All four return a new camera.
- **Views:** `MapView` is `'country' | 'region'`.
  - The Country view draws the `map8_` art at `cellPx / 8`, and the Region view the `map16_` art at `cellPx / 16`.
  - `mapViewFor(current, cellPx, dpr)` switches to the Region view at 16 CSS px a cell, with `autoSkin`'s 15% hysteresis: it enters at 18.4 and stays down to 13.6. At 8 device px a cell it is always the Country view.
- **Colours:** `map/map-colours.json` is the one table of the map's colours.
  - It holds the five country colours, the line colours, with `highway`, the palette's `STONE_L` (M3.1's Part 3), and six body hues keyed by `CROWD_HUES` name with their dark `outline`, which only `test_worldgen.py` reads now. `tools/worldgen/mapdraw.py` reads the same file.
  - `COUNTRY_COLOURS` holds the five as `0xRRGGBB`, indexed by `WorldMap.countries.colour`. They appear only on map overlays and the legend (Countries rule 5).
  - The owner picked the five on 9 October 2026. In index order they are `#42F6FC` cyan, `#0000E4` blue, `#600090` deep violet, `#CC36D8` orchid and `#FC66FC` pink-violet.
  - A test keeps them, in D65 Lab and CIEDE2000, ≥ 15 from every palette colour, and ≥ 11.95 apart for normal, protan, deutan and tritan vision (M8.3, Task 14).
- **Atlas page:** `tools/atlas` writes `map.webp`, `map.png` and `map.json` beside the town atlas. The page holds the 93 map-scale frames: terrain tiles, wonders and landmarks at both scales, and the settlement icons, walled ones and their highlight rings included (M3.1's Part 3).
  - `AtlasPage` is `{ image: ImageBitmap, frames: Record<string, AtlasFrame> }`, keyed `"<sheet>/<frame>"`.
  - `AtlasFrame` is `{ x, y, w, h, anchor: [x, y], face?: [x, y], hold?: [x, y], eat?: [[x, y], [x, y], [x, y]] }`. From M3.1, body frames carry `face`, the offset their face overlays draw at, from `characters.json`. From M2.7 a body frame that can carry an item also has `hold`, and `eat` if it stands (Sprite manifests, above).
  - `loadAtlasPage(jsonUrl, imageUrl): Promise<AtlasPage>` fetches the page.
  - Frames are found by name, never by atlas index (R9).
- **`createMapRenderer(canvas: HTMLCanvasElement, options?: MapRendererOptions): MapRenderer`.**
  - `MapRendererOptions` is `{ backend?: 'auto' | 'canvas2d', restoreTimeoutMs?: number }`, as `RendererOptions` has them. From M3.1 it is an alias of `LifecycleOptions`, in `map/lifecycle.ts`, whose `createLifecycle` runs init, the lost and restored events, the fallback, the canvas swap, resize and dispose for both the map and place renderers. `WorldRenderer` keeps its own, so first-load bytes don't change.
  - `MapRenderer` reads `backend`, `canvas` and `view`: the view the last draw showed.
  - Its methods are `init()`, `resize(deviceWidth, deviceHeight, dpr)`, `setWorld(map: WorldMap)`, `setAtlas(page: AtlasPage)`, `setFlat(flat: boolean)`, `draw(camera: MapCamera)` and `dispose()`.
  - It falls back to Canvas2D when WebGL2 is missing, when a texture can't reach 3,072 px, or when a lost context stays lost for `restoreTimeoutMs`.
- **What draws:**
  - **Before the atlas page,** and whenever `setFlat(true)`, it draws the flat Countries view: each country's land in its colour, with borders and icons.
  - **After the page:** each cell's tile, then rivers, sea lanes, minor roads dotted and major roads solid in `highway`, bridges, colour bands and border lines as pixel lines, then peaks, settlements, wonders and landmarks in row order, as `mapdraw.py` draws them.
  - **Settlement icons** (M3.1's Part 3): a capital's or city's icon is `map8_settlement_<tier>-walled` in the Country view and `map16_settlement_<tier>-walled` in the Region view. A town's is `…_town-palisade`, and a village's or hamlet's stays `settlement_<tier>`.
  - **The Canvas2D fallback** draws the flat fills, settlement icons and labels only.
- **Imports:** the map scene imports nothing from `render-gl`'s other folders, so no town module gains an export for it. Dependency-cruiser enforces this.

### In `web`

- **The Map control** is the HUD's "Map" button (M2.2b Task 8), about 0.15 kB of first-load JS. It imports `map/map-view.ts`, whose chunk holds the map scene, labels, legend and input.
- **Opening the map:**
  - it pauses the town if it was playing, and makes the town's view and HUD inert under the map;
  - it starts the map worker once per page, and keeps the world it answers for the rest of the page;
  - it fetches the atlas page beside it.
- **Closing the map** resumes the town only if the map paused it, and gives focus back to the Map control. Escape closes it too.
- **The toolbar** holds Close map, Fit, Zoom in and Zoom out, Countries, and a "Go to a settlement" list (owner, 9 October 2026). From M3.1 it adds "Enter <name>" while a place is in focus (Places, below).
  - **Going to a settlement:** choose it from the list, grouped by country with the capital first, or click or tap it on the map. Either way, the view jumps there, centred, at the step nearest 64 CSS px a cell.
    - `map/goto.ts` holds `goToGroups`, `mountGoTo` and `cameraOn`. From M3.1, `placeUnder` replaces `settlementUnder`: it finds a settlement or wonder within 1.5 cells or 12 CSS px of a tap. `cameraOn` takes a place, and `placeInFocus`, `placeInfo` and `placeCount` serve the town view.
    - `MapInputTarget` gains `tap(deviceX, deviceY)`, called for a press that lifts having moved less than 5 CSS px. From M3.1 it is `{ zoom, pan, arrowPx, fit, close, tap }`.
    - The list reads "Go to…" again after every jump.
  - **The status line** is the map's live region. It says when the map is ready, and focusing the map reads it, through `aria-describedby`.
- **Labels** are a fixed pool of DOM elements, moved by transforms whenever the camera moves:
  - the Country view labels countries, capitals and cities;
  - the Region view labels every settlement;
  - a greedy pass, in that priority order, drops any label that would overlap one already shown.
- **The legend** lists each country's colour, name, capital and settlement count. It is also the map's text alternative. Colour is never the only cue: each country's name is written on the map at Country zoom, and the legend names it beside its swatch.
- **Chunks:**
  - `map-view-*.js`, `map-worker-*.js` and `dist/atlas/map.webp` each get a size-limit entry;
  - `vite.config.ts`'s `render-gl` chunk group leaves out `src/map`, so the scene never joins the renderer chunk. From M3.1 it leaves out `src/place` too.

## Places (owner: M3.1)

The owner asked on 9 October 2026 to zoom into a settlement on the map and see that town and its people. A place is what `tools/worldgen/place.py` lays out for one settlement or wonder: a district of 176 × 112 tiles for a capital or city, 152 × 96 for a town, 80 × 48 for a village and 56 × 32 for a hamlet, or a wonder's vista of 30 × 18. These are M3.1's Part 3 sizes, which its Task 11 built with no fallback (d68ff59). M3.1's step plan builds it, ahead of the rest of M3.1.

### The contract

`@nomos/sim-protocol/place`, in `place/place-layout.ts`:
- **`PlaceLayout`:** `width` and `height` in tiles, of `PLACE_TILE_PX` (16) art px each, and:
  - `frames`: each sprite's name once, `"<sheet>/<frame>"` as `tools/atlas` keys it, in order of first use: tiles row by row, then ground, then standing;
  - `tiles`: a `Uint16Array` of frame indices, row-major; an animated tile shows its frame 0;
  - `ground` and `standing`: `Int32Array`s of three numbers a sprite: its frame, then its anchor's x and y in art px from the place's top-left;
  - `people`: a `PlacePeople`.
- **`PlacePeople`:** one column a field of `place.py`'s `Person`:
  - `look`, one of `looks.py`'s 96: hue `look % 6` in `LOOK_HUES` (`CROWD_HUES`), eyes `⌊look / 6⌋ % 4` in `LOOK_EYES` and pattern `⌊look / 24⌋` in `LOOK_PATTERNS`;
  - `pose`, `facing`, `expression`, `job` and `emote`, as indices into `PLACE_POSES`, `PLACE_FACINGS`, `PLACE_EXPRESSIONS`, `PLACE_JOBS` and `PLACE_EMOTES`, with `NO_CODE` (255) for no job or emote. `PLACE_EMOTES` is `heart`, `coin`, `food`, `question`, `sweat` and `sleep`, which `place.py` draws, then `speech`, `music` and `ball` (M3.2 Task 5), appended so no saved code moves;
  - `step`, a walker's frame, 0 or 1;
  - `x` and `y`, the anchor in art px, and `lift`, which raises a sitter onto a bench;
  - **the street's three** (M2.7 Task 6, ed4542f), `item`, `eat` and `indoors`: optional `Uint8Array`s that only the Town skin's people fill. A missing column reads as 0, and `layoutBuffers` leaves them out, since a layout the map worker builds has no street life.
    - `item` is the good carried: 0 for none, else code c is `ITEM_GOODS[c − 1]`, which names the `icons/carry_<good>` frame. `ITEM_GOODS`, `['bread', 'vegetables', 'fish', 'milk', 'cloth', 'tools', 'fuel']`, is in `place/item-goods.ts` and exported from `./place`, in the order of the visual word's `item` field.
    - `eat` is 0, or 1 plus the step of the eating loop, 0 to 3.
    - `indoors` is 1 for a person inside a building, whom no pass draws.
- **Messages:**
  - `PlaceRequest` is `{ type: 'place', place }`. Place p is settlement p, or wonder p minus the settlement count, in `world.py`'s `place_contexts` order.
  - `PlaceReply` is `{ type: 'place', place, layout, map, ms }`, with every buffer transferred, as `placeBuffers(layout, map)` lists them. `map` is a settlement's ground as the `.nmap` bytes from `writeMap`, which the page hands the sim worker in an `open` message, or null for a wonder, whose vista has none.
  - `PlaceError` is `{ type: 'place-error', place, message }`, sent instead for an unknown place, a request before any world, or a failed build.
  - **The starting town (owner request, 10 October 2026):** `TownRequest` is `{ type: 'town' }`, which needs no world. The answer is `TownReply`, `{ type: 'town', layout, ms }`, with the layout's buffers transferred as `layoutBuffers(layout)` lists them, or `TownError`, `{ type: 'town-error', message }`, when the build fails. `placeBuffers` lists `layoutBuffers` first.

### Building a place

- **`placeContexts(map: WorldMap): PlaceContext[]`** ports `world.py`'s `_context` and `place_contexts`.
  - Settlements come first in id order, seeded `draw(world seed, PLACE, 0, cell)`; then wonders in placement order, seeded `draw(world seed, PLACE, 1, kind)`.
  - `PlaceContext` holds `model.py`'s fields, in its order. M3.1's Part 4 added an optional `style` (9b2c156), which only `TOWN` sets, to `rings`, so Highcourt's first screen shows rings.
- **`buildPlace(ctx): { layout: PlaceLayout, map: MapV1 | null }`** ports `place.py` one function to one function, in `worldgen`'s `place/`. `map` is the place's ground (below), or null for a wonder, whose vista has none.
  - Its frame table, `place/frames.ts`, is generated by `scripts/place-frames.ts`. It holds only the fields `place.py` reads: w, the anchor, the footprint and the door.
  - Looks are `look_for(place seed, person index)` on the `LOOK` stream. `worldgen`'s `streams.ts` holds `PLACE` 10, `LOOK` 11 and `CROWD` 12, as `rng.py` does.
- **The ground** (M2.2c Task 1, 62103c0..2e6471a): `place/ground.ts`'s `groundOf(site)` ports `export_map.py`'s `town_map`, a settlement's walk grid and its buildings with their doors as `MapV1` holds them, and `buildPlace` returns it as `map`. `writeMap` of Highcourt's ground equals `town.nmap` byte for byte.
  - A dock's door lies in the water it stands at, as `export_map.py` leaves it.
  - Kind colours come from the generated `place/kind-colours.ts`, which `tools/sprites/kind_colours.py` writes from the sheets, since TypeScript can't read their pixels.
  - Beds by house form: hut 2, cabin 3, detached and the row pieces 4, farmhouse, the townhouse pieces and the corner houses 6, apartment 24. A handed piece holds as many as its plain one. An unknown form throws.
- **Stages:** `place.py`'s `SETTLEMENT_STAGES`, mirrored by `build.ts`, list `build_settlement`'s stage groups in order: water, centre, walls, buildings, farms, decor, nature and people. Walls and farms join in M3.1's Part 3.
- **The walled town** (M3.1's Part 3):
  - **New tile kinds:** `stone` (main road, 3 wide), `cobble` (street, 2), `gravel` (country road, 2), `track` (farm track, 1), `flower-bed`, and `crop_vine_<stage>` and `crop_rice_<stage>`. `path` stays the lane and `paving` the plaza. A road tile keeps the highest-ranked kind laid on it, in the order paving, stone, cobble, gravel, track, path.
  - **Wall rings:** in stone for capitals and cities and as a palisade for towns, centred on the plaza's centre and kept 6 tiles inside the place's edge. Part 4 made each an octagon, with its own half-sizes (below).
  - **Gates** are 2 tiles wide. A front gate is a standing sprite over road that marks nothing solid; a side gate is a solid pier and cap beside a 2-tile gap.
  - **Bridges:** main and country roads cross rivers on ground-layer bridge pieces. The water tiles stay water and become road.
  - **`town.nmap`** gains no `wall` kind yet, since no wall is laid before M3.1's Part 4 Task 26 (Part 3's Task 12). Its built kinds stay `home`, `workplace`, `shop`, `civic` and `landmark`, and `groundOf` throws for a footprinted sprite of any other prefix, such as the `farm_` buildings of Part 4's Task 28 (Part 3's Task 14), until its table names that prefix.
- **The premises** (M2.7 Task 2): `place/trades.ts`'s `placeTrades` lays a town's, city's or capital's stalls and shops in `settleBuildings`, after the landmarks and works and before the houses, and `placePlaza` no longer places stalls (Street link, below). A village keeps its one general shop or 1 to 2 stalls, and a hamlet has none. Task 27's `placeInnsAndStables` follows `placeTrades`: a capital or city gets 2 inns and a stable, a town 1 inn and a stable, with lot salts from 300 and each aimed at the plaza's middle until Task 26's gates give them a side. `shop_inn` is a shop entity open from 07:00 to 23:00 and `work_stable` a workplace entity, and no trade sells from either.
- **Varied layouts** (M3.1's Part 4, by the owner's call of 12 October 2026). Task 22 built the style draw, the ring town and the grid's knobs (9b2c156, 85ff235), Task 27 the bell-curve town (436c2d3, cded844), Task 23 every door's way to the plaza and 32 runs (6465a2d, 0af0485, c4a1e15), and the rest is planned:
  - **The style:** `place/plan.ts`'s `styleOf(site)` deals a capital, city or town `rings`, `winding` or `grid` by `below(4, PLAN, 0)`, on a new first key `PLAN` (26) in `place/keys.ts`, unless `PlaceContext.style` pins one.
    - Capitals and cities weigh `rings` 2 and the others 1; towns weigh `winding` 2 and the others 1 (`WEIGHTS`).
    - Every knob is a `PLAN` draw, which reads only the seed and the tier. `planOf` deals a site's `Plan`, which `Site.plan` keeps, and `ringOf` its ring line.
    - Villages and hamlets keep their green and spur lanes.
  - **The streets:**
    - `place/rings.ts` lays the rings and radials. Its rings stand 6 apart, with east–west lanes every 5 rows through the east and west quarters, so ring capitals hold about as many houses as grid capitals with dealt knobs (inside the wall, medians of 398.5 against 393 in the first 2 standard worlds).
    - `place/grid.ts` deals the grid's knobs in Task 22, not Task 25: rows 6–8 apart, cross streets 16–32, rows shifted 0–1, and 0–10% of row segments left out (Task 27 halved Part 4's fifth).
    - `winding` lays today's tight grid inside its own octagon until Task 25's `place/winding.ts`.
    - Every style keeps the plaza and Part 3's straight main roads.
  - **The bell-curve town** (Task 27, Part 3's Task 13):
    - **Zones:** `place/zone.ts`'s `zone(site, x, y)` is `centre` where the ring line holds the point twice as far out from the plaza's middle, `rim` where it holds the tile, and `outside` beyond. A place with no wall is `open`.
    - **Targets:** in a walled place house i aims at `(cx + spread, cy + spread)`, each the sum of four `below(n + 1, SPREAD, i, axis, k)` draws less 2n, with n 1,200 per mille of the ring line's half-width or half-height (the plan's 900 left the median place with 5.4% of its houses past the wall). An open place aims at its middle. `SPREAD` (20) and `GREEN` (22) join `keys.ts`.
    - **Forms,** by the target's zone, per mille: centre townhouse terrace 650, apartment 200 and row terrace 150; rim row terrace 850 and townhouse terrace 150; outside and open detached 300, cabin 300, hut 200 and farmhouse 200. Materials are board, brick, cottage, plaster, rubble, stone and timber, drawn at random whatever the zone.
    - **Terraces** hold 2 to 5 houses: `corner-left`, `townhouse-middle` and `corner-right`, or `row-left`, `row-middle` and `row-right`. Each non-corner piece is `-handed` by its own draw. A way that fits nowhere falls to the shortest terrace, a townhouse terrace to rows, and inside the wall to a detached house and then a cabin, which fills the 2-wide gaps. A corner house stays only where a road lies beside its outer side, on the front row, and elsewhere gives way to a plain end on its two inner columns if that end's door is on a road.
    - **Lots:** inside the wall houses touch (`LotOptions.margin` 0) and a single house's door may lie 1 tile from a road. Outside it and in open places a tile stays clear and a door may lie 3 tiles away.
    - **Civic:** `civicOf(site)` gives a capital or city the large set, `civic_town-hall_large` first, then its courthouse, library, clinic and school large, and the records office, police station, general shop and warehouse, without the library where the landmarks hold one. A town keeps its 5. A building's salt is its place in its own list, and its door is its manifest door.
    - **Greens:** `place/greens.ts`'s `placeGreens` gives a capital or city 3 and a town 2, each 6 × 4 tiles aimed two thirds of the way to the ring line in a keyed one of 8 sectors. Its tiles turn `meadow` and kept, and `site.townGreens` records the rectangle, for M3.2's leisure.
    - **Works** that go to the outskirts, the farm, pasture, quarry, mine and lumber camp, stand past the ring line, aimed 4 tiles beyond it.
    - **Measured** over the walled places of the first 2 standard worlds, inside the wall: the median capital or city holds 398.5, 393 and 403 houses in rings, grid and winding, and the median town 246, 255 and 284. Land under houses is 47.6% in the centre, 47.0% in the rim and 2.4% outside, and 8.3% of the houses stand past the wall.
  - **Highcourt as rings** holds 387 homes (20 of 2 beds, 56 of 3, 249 of 4, 54 of 6 and 8 of 24) and 1,720 blobs in 632 households, and its pins are `624cfb6e` on phone and `87e11b4e` on desktop (were `3795465f` and `8b3b7ca0` until Task 23's 64-byte run rows and trip-start fix, which made them `051f68bc` and `bcced27a` until M3.2 Task 2's activity column). Of its 8,514 ways, 149 need more than 16 runs, none more than 32, and the most needs 24. The world step's pins and the first screen's crowd follow it. Later lines that cite 2,600 blobs or `cca95710` record M2.7 as built.
  - **The ring line** is an octagon, `Wall(x0, y0, x1, y1, cuts, material)`, a rectangle when `cuts` is 0, and `inset`, `contains`, `onLine` and `reserve` keep their meaning. Its half-sizes are 63 × 46 for a ring capital or city and 54 × 36 for a ring town, and 67 × 42 and 58 × 31 for the other styles, each within a tenth of Part 3's area. Towers or posts stand on every vertex. The cuts take `<material>_diagonal-up` (NW, SE) or `<material>_diagonal-down` (NE, SW), and gates stand only on the straight lines.
  - **Every door reaches the plaza** (Task 23, 0af0485): `place/connect.ts`'s `connect(site)` floods the walkable land 4 ways from the plaza, or from a village's or hamlet's green and the path round it, with the ring line shut where no road crosses it. Walkable is `ground.ts`'s `walkAt`, now exported, so the flood and the map's walk grid agree.
    - Each road tile it misses, in reading order, gets the cheapest `route` to a reached road on dry land, starting with a heading toward the middle. `pave(site, path, 'lane')` lays it as a 1-tile lane, which crosses water on `cross`'s footbridges, or on a paved ford where it runs north or south, and the flood then spreads from the new lane, so one route joins a whole cut-off piece. No new art: the footbridge and the ford are Part 3's.
    - A road no route reaches goes back to grass, with every road on the land it stands on. Water is never turned back.
    - It runs last in `settleCentre`, for every settlement, and will run again after the farm stage when Task 28 builds one. It draws nothing, so it keys no `PLACE` draw.
    - **Measured here** (Node 24.18.0 on Windows, load not recorded): in the first 2 standard worlds a flood from the plaza missed 168 doors, 167 homes and a warehouse, in 4 places, 2 capitals and 2 towns, each cut by a river. `connect` laid one crossing, 2 footbridges over a 2-wide river, in each, and after it none misses, bar a dock's door, which lies in the water by design. Over 8 worlds it laid lanes in 16 of 121 walled places, and turned no road to grass. Highcourt is unchanged, and `town.nmap` still matches the builder. In the large world of seed 42, Tucarvi reaches 426 of its 426 homes (was 347) and Jukithorch 385 of 385 (was 335). A capital builds in a median 187.9 ms and at worst 249.2, and a city in 204.0 and 267.4 (`time-places.ts`), against Task 27's 187 and 248–250, and 202–204 and 263–270.
  - The ring lines' sizes, the knobs and the budgets are in the [M3.1 plan's Part 4](../m3-city-life/m3.1-town-generator/plan.md).

### Goldens

- `packages/worldgen/scripts/place-goldens.ts [--check]` writes `packages/worldgen/test/fixtures/place-goldens-v1.json` (`tools/worldgen/place_goldens.py` did until M2.7, and its `--check` no longer holds). It holds a fingerprint after each stage for:
  - every place of the first 20 standard worlds, 1,033 of them;
  - seven pinned places that reach what those worlds miss: a viaduct, landmarks off the plaza, rocky ground, east and west sea arches, and a cliffed cove.
  A vista has its context, ground and layout fingerprinted.
- `tools/worldgen/place_fixtures.py` writes `packages/render-gl/test/fixtures/places-v1.json`: three whole layouts, with the SHA-256 of `placedraw.py`'s picture of each, which the place pass must match. Since M2.7 it holds place.py's layouts of a town and a capital, which the port no longer lays out, so `place-fixtures.test.ts` checks the port against the places without premises only, the waterfall, while render-gl keeps all three as the pictures it draws.
- **CI** no longer runs the Python checks of either; the goldens test covers the first two worlds and the pinned places.
- **Engines:** the place goldens test and the browser engine spec check the places of the first two worlds plus the pinned ones, 109 places in all, in Node and Chromium.

### In the map worker

- After a world, `generate.ts` keeps its place contexts, made before the world's buffers are transferred away, and times them as the `contexts` stage.
  - **Highcourt is place 0** (M2.2c Task 6): `generate.ts` sets `contexts[0] = TOWN` and `names[countries] = 'Highcourt'`, with `countries` the world's country count. Settlement 0 is each world's capital, so every map holds the town the sim starts in.
- The first `PlaceRequest` imports `place-builder.ts`, which builds as its own chunk, `place-builder-*.js`, so opening the map pays nothing for places. A settlement's `PlaceReply` carries its ground, written by `writeMap`, and `ms` times the build and that write.
- A `TownRequest` goes through the same lazy builder: `buildTownAnswer` answers with `buildPlace(TOWN).layout`, where `TOWN` is Highcourt's context as `tools/worldgen/export_map.py` pinned it. Since M2.2c Task 1 (6f3996b) it lives in worldgen's `place/town.ts`, because `apps/web/src/map/town.ts` is gone. `apps/web/test/town.test.ts` holds the layout to `assets/maps/town.nmap` tile for tile, so the art the Town skin draws is the ground the sim walks. `worldgen/scripts/town-map.ts` writes `town.nmap` from `buildPlace(TOWN).map`, and `test:headless` runs its `--check`.
- `map-worker.ts` installs its message handler only once. WebKit runs a module worker's script a second time when a dynamically imported module imports it back.

### The atlas in every build

`apps/web/vite/atlas.ts` runs `tools/atlas/build_atlas.py --out <outDir>/atlas` after every `vite build` of `apps/web`, into any outDir. So no preview, test server or deploy serves the page without its art.
- The build fails if Python 3 or Pillow is missing (`pip install -r tools/requirements.txt`).
- The step adds about 8 s a build, almost all of it in the lossless WebP encodes.
- The first entry into a place loads `atlas/atlas.json` and `atlas/atlas.webp`; first load never does.
- From M3.1's Part 3, the town page leaves out frames ending in `_snow` or `_night`, and `test_atlas.py` fails past 1,920 px.

### `@nomos/render-gl/place`

- **Camera:** `PlaceCamera` is `{ x, y, scale }`.
  - `x` and `y` are the art pixel at the view's top-left, and `scale` is whole device px per art px, one of `PLACE_SCALES`: 1, 2, 3, 4, 6, 8, 12 and 16. Every draw snaps the view to whole device px.
  - Sizes below are in art px:
    - `fitPlaceCamera(width, height, deviceWidth, deviceHeight)`;
    - `openPlaceCamera(width, height, deviceWidth, deviceHeight, dpr)`: the fitted view, but never under 2 CSS px per art px;
    - `zoomPlaceAt(camera, steps, deviceX, deviceY)` and `panPlaceBy(camera, dxDevice, dyDevice)`;
    - `clampPlaceCamera(camera, width, height, deviceWidth, deviceHeight)`, which keeps the view's centre over the place.
- **`createPlaceRenderer(canvas, options?: PlaceRendererOptions): PlaceRenderer`.**
  - `PlaceRendererOptions` is `LifecycleOptions`, as the map's are.
  - `PlaceRenderer` reads `backend` and `canvas`. Its methods are `init()`, `resize(deviceWidth, deviceHeight, dpr)`, `setAtlas(page: AtlasPage)`, `setPlace(layout: PlaceLayout)`, `setMarked(person: number)`, `draw(camera: PlaceCamera)` and `dispose()`.
  - Callers move people by rewriting the layout's `x`, `y`, `pose`, `facing` and `step` before each draw. A camera is re-read only when a new camera object is passed.
  - `draw` throws for a scale that isn't a whole number of 1 or more, and packing throws for a carried good whose `icons/carry_<good>` frame the atlas lacks. A sitter facing up draws `sit_up`, whose frames the atlas has had since 08dda98 (it threw before).
  - **`setMarked(person)`** (owner request, 12 October 2026) puts the selection ring under person `person` of the layout's people from the next draw, and `NO_MARK` (−1) takes it away. The renderer keeps the row through `setAtlas` and `setPlace`, so the ring survives the people's columns being made again. A row past the people has no ring, and a person whose `indoors` is 1 has none.
- **What draws,** in `placedraw.py`'s order:
  1. the `OUTLINE` background;
  2. the tiles;
  3. the ground sprites, sorted by y;
  4. standing sprites and people together, sorted by y and then by order, standing sprites first.

  A person's layers are the body, the pattern, the face at the body frame's `face` offset, the job item, the carried good at the frame's `hold` point, and the emote at (7, face y − 15). A person whose `indoors` is 1 draws no layer. People move every frame, so the pass re-sorts them in place, stably, with no allocation. A marked person's ring is packed just before its body, in the person's own place in that order, so a blob in front draws over the ring and the body covers its back.
- **Backends:** WebGL2 draws the whole place in one instanced draw, reading texels with `texelFetch`. Canvas2D caches the tiles and ground on an offscreen canvas.
- **Solid quads** (owner request, 12 October 2026), `place/solid.ts`: an instance whose atlas x is −1 (`SOLID_X`) is filled where a sprite would be sampled, with the colour its atlas y names in `SOLID_COLOURS`, the palette's `OUTLINE` (0) and `CREAM` (1).
  - WebGL2 branches early in the fragment shader, from a constant array it builds from the same table, so the one instanced draw and every sprite's texel stay as they were. Canvas2D takes one `fillRect` for it. The shader is the one change any place picture could feel, so the place goldens must still match.
  - `place/marker.ts` holds the selection ring: a flat oval of 12 one-pixel runs, 22 px wide and 9 tall, centred on the 18 px body and on the anchor's row, in cream under a dark edge that is every run grown by a pixel. It is 24 quads, the edge's first, with room for one in `PlaceSprites`' buffer, and no art. At 1×, a ring round a stander on a plain ground changes 114 pixels, since the body hides the rest (computed here, compositing the atlas's frames).
- **The pixel check:** at 1×, both backends match the SHA-256 of `placedraw.py`'s picture of each fixture, in Chromium. At 2×, a frame equals the 1× picture scaled up by nearest neighbour.
- **Imports:** only `src/map`'s `frames.ts`, `gl.ts`, `colours.ts` and `lifecycle.ts`, and `sim-protocol`.

### The town view in `web`

- **Entering,** from the map's Region view:
  - a place is in focus when it is the nearest to the view's centre within a tap's reach. "Enter <name>" shows while one is;
  - at the map's closest step, zooming in again near a place opens it. The zoom point is the cursor, the pinch centre or the view's centre;
  - a tap on the place in focus opens it, and a tap on any other place jumps there;
  - since M2.2c Task 6, a settlement opens live in the main view (Every town runs the sim, below), and this view opens for wonders only.
- **The view:** `map/place-view.ts` mounts a `#place` section over the map, which goes inert beneath it and draws nothing while covered.
  - It opens at `openPlaceCamera`'s scale.
  - Its bar holds Back to map, Fit, + and −, with the wonder's name, which is its kind such as "Sea arch", and "A wonder in <country>" beside it.
  - Its people stand where `place.py` put them: the walkers, the walk loops and Pause people are gone (M2.2c Tasks 6 and 7).
- **Leaving:** Back to map, Escape, or zooming out past the smallest scale returns to the map as it was, with focus back where it was.
- **Loading:**
  - `place-view-*.js`, `place-builder-*.js` and the atlas load on the first entry only, and each chunk has a size-limit entry.
  - The view sends one place request at a time, waits at most 15 s, and fails only the place a `PlaceError` names.
  - A failed load of the art or the place shows Try again, and every later entry tries again.
- **Accessibility:**
  - the picture's `img` role and name sit on a wrapper that the canvas swaps keep;
  - focus moves to Back to map on entry, and returns on exit;
  - the status line reads the wonder: "<name>, a wonder in <country>: N people are out."
- **Test hooks:** `window.__map` gains `camera` and `map`, and `window.__place` is the town view's: `open`, `place`, `ready`, `backend`, `scale` and `frameMs`. Its `walkers`, `walkerX` and `walkerY` are gone (M2.2c Task 6).

## The Town skin (owner request, 10 October 2026)

The owner asked on 10 October 2026 for the town view's art on the first screen. The Town skin draws Highcourt, the town `town.nmap` is exported from, with the place pass, and the sim's agents as its people. Since M2.2c it draws whichever town the sim runs. It is an early first cut of Skin C (M3.3).

### `@nomos/render-gl/town`

- **`TownPainter`,** in `renderer/types.ts`: `draw(camera: Camera, alpha: number, view: TownView): number | undefined`. `TownView` is what the renderer lends each draw: `drawnSkin`, `retained` (the two latest snapshots), `canvas` and `dpr`.
  - **`Retained`** gains `tick: number` (M2.7 Task 6), the current snapshot's tick, which the eating loop steps with. `pushSnapshot` sets it from its frame's `tick`.
  - When `drawnSkin` is the town, it draws and returns the agents drawn. Otherwise it hides its canvas and returns undefined, and the renderer draws the dots.
  - The first-load renderer chunk gains only this hook, `setTown`, `BUILT_SKINS`, the town check in the skin choice, `Retained`'s `tick`, the dots' indoors skip (below) and the word readers the people use, `lookOf`, `actionOf`, `facingOf`, `itemOf`, `eatingOf` and `indoorsOf`, since `sim-protocol`'s `visual.ts` sits in that chunk.
- **`TownSkin`,** the `./town` export, is a `TownPainter`: `new TownSkin(canvas: HTMLCanvasElement, layout: PlaceLayout, page: AtlasPage, options?: LifecycleOptions, sites?: readonly PipSite[])`. The export gives the `PipSite` type too.
  - It draws through a `createPlaceRenderer` of its own, on its own canvas over the dots' canvas, at `{ x: camera.x, y: camera.y, scale: camera.zoom }`, since a world px is an art px. Its canvas takes the dots' canvas's device size and dpr whenever they change.
  - While it shows, the dots' canvas is hidden, so assistive tech meets one picture.
  - It reads `canvas`, which its Canvas2D fallback replaces, and `dispose()` disposes its place renderer.
- **People,** `town/people.ts`'s `TownPeople`: one person per agent in the layout's `people` columns, rewritten every draw from the snapshots.
  - **x and y:** eased by alpha as the dots are, `prev × (1 − alpha) + cur × alpha`, or the current place after a jump of more than 16 px, rounded to whole art px. A snapshot's world px are art px, tile × 16 plus the offset in the tile, and the anchor is the blob's ground point.
  - **look:** `lookOf(word)`, one of the same 96 looks as `looks.py`'s.
  - **pose:** walk when `actionOf(word)` is walk, sit when it is sit, else stand (M3.2 Task 5). A sitter sits whichever way it faces, one facing up in `sit_up` (the polish below, 0a2c4e0), which it stood in until the atlas had those frames. A sitter's feet stand where a stander's do, so its `lift` stays 0. Expression is neutral, with no job.
  - **emote:** the word's emote id through one table, `town/people.ts`'s `BUBBLES`: coin, speech, music, ball, heart and question each to the place's emote of that name, and any other id to none (M3.2 Task 5).
  - **facing:** from the move between the two snapshots, along its larger axis, or `facingOf(word)` for a blob that stood still, jumped, sat or chatted. The sim chose a sitter's way and a chatter's, which looks at its partner, so a walker halted to chat does not turn to the way it walked.
  - **step:** `(along >> 3) & 1`, where `along` is the drawn x of a blob facing left or right and the drawn y of any other, so the walk frame changes every 8 art px walked; 0 for a stander.
  - **lane** (owner request, 12 October 2026, a70345e): a walker is drawn 5 px left of the sim's line, on it, or 5 px right, across the way it faces, so a stream down one run reads as three lanes. The sim walks every blob of a run down the centre line of its tiles and spaces them 4 px apart, which stacked 23 walkers in one column on the road north of Highcourt's plaza.
    - The lane is `((imul(row, 0x9E3779B1) >>> 16) × 3) >>> 16`, 0 to 2 for −5, 0 and +5. A row keeps its lane for its life, and each lane holds about a third of the rows: 570, 565 and 585 of Highcourt's 1,720 (computed here).
    - It shifts x for a blob facing up or down and y for one facing left or right, and never the way it walks, so the stride is unchanged. The centre ± 5 stays inside the road's 16 px tile.
    - Only `ACTION_WALK` takes a lane. A sitter, chatter, stander or keeper stays exactly where the sim puts it, since the sim sets their spacing.
    - A lane turns with the heading, so a walker takes a corner with a hop of up to 7 px, and one that halts to chat or sit steps back onto the line.
  - **item, eat and indoors** (M2.7 Task 6, ed4542f): `item` is `itemOf(word)` and `indoors` is `indoorsOf(word)`. `eat` is 1 + (⌊tick ÷ 3⌋ & 3) while `eatingOf(word)` is set, else 0, where `tick` is `Retained`'s, so every eater is on the same step.
    - The place pass draws the good unmirrored at the body frame's `hold`.
    - While `eat` is set, the face is `face_chew_<step & 1>` in place of the resting face, and a standing eater moves the item through the frame's `eat` points 0, 1, 2, 1, one step every 3 ticks. A walking eater keeps the item at `hold`.
    - Facing up shows no item, and neither does a frame with no `hold`, such as a sitter or a sneaker.
    - A blob indoors is drawn by no skin. The place pass draws no layer of a person whose `indoors` is 1, and the dots skip the blob too: `webgl.ts`'s vertex shader moves a word with bit 7 set outside the clip volume, and `canvas2d.ts` skips it.
  - The columns regrow to the agent count when it changes, and `setLayout` sets the place again; a frame allocates nothing.
- **`setLayout(layout: PlaceLayout, sites?: readonly PipSite[])`** (M2.2c Task 5, 787cfe9; `sites` in M2.7 Task 8) swaps the town drawn, on the same canvas, context and atlas: its ground, buildings and size, from the next draw.
  - It draws nothing itself, so the caller redraws.
  - The sim's agents stay its people, and the layout's own `people` are never drawn.
  - It makes the sprite list at once, so a frame the atlas lacks throws there and the skin keeps its old town.
  - `setPeople` became `setPlace(layout)`.
- **`setSelected(row: number)`** (owner request, 12 October 2026, 50d6839) rings the blob of snapshot row `row` from the next draw, and −1 takes the ring away. It is a passing mark of the page, held while the blob's card is open, never a mark of the blob (content rule 4).
  - It forwards to the place renderer's `setMarked`, so the ring is solid quads under the blob's feet, at its depth and in its lane (Places, above). A blob indoors has none.
  - `setLayout` leaves the row as it is, so the page clears it when a town closes the card. It makes nothing, and the page redraws.
- **Stock pips** (M2.7 Task 8, a962ced and 77622fd): three beads over each shop and stall, lit by how much of its good the premises holds, and a market stall that holds none draws closed.
  - **`PipSite`** is `{ frame, x, y, stall }`: the premises' sprite frame, its anchor in art px, which is the bottom middle of its footprint, and whether it is a market stall. `new TownSkin` and `setLayout` take `sites: readonly PipSite[]`, one per premises in `premisesOf`'s order, and none by default, for a town with no premises.
  - **`setPips(levels: ArrayLike<number>)`** lights the pip over site i to `levels[i]`, 0 to 3 beads, and closes site i's stall at 0. It rewrites sprite frames in place from the next draw and makes nothing, so the page may call it every economy day.
  - **Hidden:** every pip starts hidden, and is hidden again after each `setLayout`, until `setPips`. A level past 3, such as `NO_LEVEL` (255), hides it: the town's first day has not ended, so there is no stock to show.
  - **`town/pips.ts`'s `TownPips`** appends a standing sprite per site to a copy of the layout, or returns the layout itself when there are no sites. It uses `icons/pip_stock_0` to `icons/pip_stock_3`, and `buildings/shop_market-stall_closed` for a stall at 0. A frame the atlas lacks throws when the skin is made or `setLayout` runs, never in a draw.
  - **Sorting:** a pip sorts at its premises' anchor row, so a building standing behind the premises draws first and cannot cover it. The pass draws a sprite at its sort row less the frame's anchor, so `withPipFrames(frames)` adds each bead as `<name>@<anchor y>` for every anchor height of a `buildings/` frame, anchored to stand one clear row above that building's top. `TownSkin` draws with those frames.
- **Imports:** `src/place`, `src/map`'s `frames.ts` for its types, the renderer's types, and `sim-protocol`.

### In `web`

- **Loading:** after `app:interactive`, `main.ts` calls `loadTownSkin(app)` from the camera input's chunk, which imports `view/town-skin.ts`, so the entry chunk holds no import of its own. `town-skin.ts` builds as its own chunk, `town-skin-*.js`. Its `mountTownSkin(app)`:
  - adds `<canvas id="town">` to `#view` after `#world`, hidden, as an image named for the town;
  - in idle time, through `requestIdleCallback` or a timeout where Safari lacks it, starts a map worker, sends a `TownRequest`, and terminates the worker once it answers;
  - loads `atlas/atlas.json` and `atlas/atlas.webp` at the same time, as the town view does;
  - once both are in, makes a `TownSkin` on the app renderer's backend, with the town's pip sites, so `?canvas` draws it in Canvas2D, lends it with `app.renderer.setTown` and redraws.
  - A failed load keeps the dots and logs why.
  - **`TownSkinMount`** (M2.2c Task 6) holds the canvas and the skin, and subscribes with `app.onTown`. A town opened before the skin was lent is drawn from its own layout, not Highcourt's. Each later town goes to `TownSkin.setLayout` with its pips' sites, and the canvas's label reads "<name>, with every agent as a blob". From M2.7 it also subscribes with `app.onEconomy` (Stock pips, below).
- **Stock pips** (M2.7 Task 8, 7346a16 and 64a2552): the mount lights the pips over the town's shops from each day's economy feed.
  - **`App`** gains `readonly map: MapV1`, the ground the view fits and the renderer draws: the page's own map first, then each town shown.
  - **`stockLevel(stock, sold): number`,** in `view/stock-pips.ts`, is a pip's level from a good's units in stock and units sold on the feed's newest day: 0 with no stock, 1 under a day's sales (`stock < sold`), 2 under 3 days' (`stock < 3 × sold`), else 3. The two are compared as products, so stock that nobody bought reads as full.
  - **`StockPips(map: MapV1)`** reads `premisesOf(map)` once. It holds `sites`, the `PipSite`s in that order, and `levels`, a `Uint8Array` with one level per site. `read(feed: EconomyMessage): Uint8Array` fills `levels` from the feed's newest day, which the feed must hold, and returns them. It makes nothing.
  - **Levels are per good,** since the feed has no per-shop stock: every premises of a good shows the same pips. A premises that sells several goods, such as a village's general shop, adds their stock and sales up before it takes its level.
  - **`TownSkinMount`** keeps the town's `StockPips` and the latest feed. An `economy` message with at least one day replaces the feed and calls `skin.setPips(stock.read(feed))`, then redraws. The feed the app already holds is shown when the skin is lent.
  - **A new town** (`onTown`) gets a new `StockPips` from `app.map`, goes to `setLayout(layout, stock.sites)` and drops the feed, so its pips stay hidden until its first day.
- **The selection ring** (owner request, 12 October 2026, 50d6839): the Town skin rings the blob whose card is open.
  - **`App`** gains `selected: number`, the snapshot row of the blob whose card is open or −1, `select(row)`, which sets it and tells the listeners, and `onSelect(listener)`.
  - **`Inspector`** calls `app.select(reply.agent)` as a click opens the card or fills it for another blob. It selects −1 when the card's dialog fires `close`, which a capturing listener on `#view` hears since the event does not bubble, so the card's Close button, Escape, a blob that is gone and a new town all clear the ring with no hook in `BlobModal`. This needs the card to stay a `<dialog>`.
  - **`TownSkinMount`** subscribes with `app.onSelect`, calls `skin.setSelected(row)` and redraws, and reads `app.selected` when the skin is lent, so a card opened before the town loaded is ringed.
- **Skins:** the HUD's toggle is unchanged.
  - Auto shows the town at `autoSkin`'s town level: from 6.9 CSS px a tile with at most 9,000 agents in view, kept down to 5.1 px and 10,350 agents, since the 176 × 112 town starts 1,720 on every tier (2,600 before M3.1's Part 4, and 2,688 before M2.7's premises).
  - Dots and Town fix the skin, and Blobs still shows dots.
  - Until the town is lent, Town and Auto draw dots.
- **Chunks:** `vite.config.ts`'s `render-gl` chunk group leaves out `src/town` too, so the town never joins the renderer chunk.
  - The town view, the map view and the Town skin share the place renderer and the scenes' common modules, which so build as shared chunks, `renderer-*.js` and `lifecycle-*.js`.
  - size-limit gates `town-skin-*.js` and the scene chunks it shares with the views and the blob portrait (`renderer-*.js`, `lifecycle-*.js`, `frames-*.js`, `sprites-*.js` and `atlas-*.js`), each with an entry.
  - **M2.7:** `town-skin-*.js` also holds `premises.ts`, which `StockPips` reads. That module reaches the goods module, so the build splits the goods names out of the shop-name chunk into `goods-*.js`, which the economy panel and the shop names share. It has an entry of its own, since `tools/bench/src/chunks.ts` refuses a chunk with none (70d3965).
    - The limits are each a build's measure plus 1 kB (Vite 8.3.3 and size-limit, brotli, measured here; a3de4e1, 70d3965): the Town skin chunk 4.09 kB (3.09 measured, up from under 2), the shared scene chunks 7.2 kB (6.2 with the place pass's street layers, up from a 6 kB limit) and `goods-*.js` 1.14 kB (142 B).
- **Test hooks:** `window.__app.renderer.drawnSkin` reads `town` once the town draws, and `window.__app.selected` reads the row of the blob whose card is open, or −1 (50d6839).

## The economy (owner: M2.1)

M2.1 builds Lengnick's households and firms in `sim-core`, as its [step plan](../m2-economy/m2.1-lengnick-core/plan.md) lays out. The economy runs through `economyDay` in headless runs and, from M2.2b, in a town's world step one system a tick. M2.3 adds the city preset and the flow log, as its [step plan](../m2-economy/m2.3-calibration-and-design-runner/plan.md) lays out.

- **Layout, `sim-core`:**
  - new concern folders: `firms/` (`store.ts`, `decide.ts`, `produce.ts`, `renew.ts`), `labour/` (`search.ts`, `notice.ts`, `reservation.ts`), `wages/` (`wage-step.ts`, `payroll.ts`), `wealth/` (`profits.ts`), `market/` (`wholesale.ts`, with the `CallAuction` class) and `economy/` (`params.ts`, `stats.ts`, `scratch.ts`, `start.ts`, `economy.ts`, `mser5.ts`);
  - existing folders gain files: `consumption/` gains `search.ts`, `plan.ts` and `shop.ts`; `money/` gains `fiat.ts`; `random/` gains `shuffle.ts`; and `movement/` gains `steer.ts` (see Steering, below);
  - `tools/cli/src` gains `economy/run.ts`, the `economy` command;
  - M2.3 adds `economy/city.ts` and `labour/layoffs.ts`, and the barrel exports `random/shuffle.ts` for the design runner.
- **The culture wall:** guarded code imports `economy/params.ts`, `economy/stats.ts` and `economy/scratch.ts`, never `economy/economy.ts`, which reaches `consumption/`. M2.6 adds `economy/` beside `step/` to the folders that may reach `sim-culture`.
- **The world:**
  - `World` gains `firms` (`FirmStore`) and `economyScratch`;
  - `startEconomy(world, params)` and `economyDay(world, params, day, layoffs = 0)` join `sim-core`. The step of a hand-built world never runs them, and from M2.2b a town's step runs the same systems one a tick (below). `layoffs` employed people, or all if fewer, lose their jobs at the day's start, a scenario input for headless runs (M2.3);
  - the calendar gains `DAYS_PER_MONTH = 21` (owner, 10 October 2026), `monthOf` and `dayOfMonth`;
  - `LENGNICK.burnInDays` is 9,893 and `CITY.burnInDays` 18,428, each measured by MSER-5. M2.4 Task 4 and its review made `CITY`'s 29,865 and then 31,883 (Goods and food, below).
- **Presets (M2.3):** `CITY`, in `economy/city.ts`, joins `LENGNICK`.
  - `EconomyParams` gains four fields, and `LENGNICK`'s values turn each off (M2.4 adds a fifth, `goods`, below):
    - `slowSearcherPpm` (0) and `slowJobSearches` (5): that share of people, fixed for life, visits only `slowJobSearches` firms a month while unemployed, and the rest `jobSearches`;
    - `shortPayExitPpm` (0): a firm with workers that paid them under this share of its wage at a month's end exits, and `layOffExiting` lays its workers off;
    - `markupClamp` (0): 1 stops a price step at the markup band's edge.
  - `stockHighPpm` becomes the excess over one month's demand, like the markups, so `LENGNICK`'s is 0.
  - Every exit, idle or short of pay, writes its stock off.
  - Firms stay one layer, the city's shops, and the `CallAuction` stays unwired until M2.4 (M2.3 Ruling 3).
- **The flow log (M2.3):** the day's stats row, `economyScratch.stats`, holds levels first, then each flow as that day's sum, which `clearFlows(stats)` zeroes each morning.
  - `STAT_NAMES` names its 29 slots (`STATS`) as flow-log schema 1, `FLOW_LOG_SCHEMA`, and any column change bumps it. M2.4 bumps it to schema 2 and 79 slots, below.
  - `firings` counts every layoff: notices, exits and shocks.
  - `recordMonth(world)`, after a month's end, and `recordYear(world)`, after a year's last day, join `recordDay(world)`.
- **Agents:**
  - `SUPPLIERS = 7`;
  - new columns `employer`, `reservationWage`, `suppliers`, `stockedOut` and `plannedUnits`, with `addAgent` writing −1 to `employer` and the suppliers;
  - `Blob` gains no accessor here; M2.2b adds `employer`.
- **Wallets and firm accounts:**
  - `createLedger(arena, settlements, wallets, firms = 0)`, `Ledger.firstFirm` and `firmAccount(ledger, firm)`;
  - accounts run national, then sectors, then wallets, then firms;
  - `PROFITS = 3`, zero outside the month end;
  - `TIER_FIRMS` of 1,000, 2,500 and 10,000;
  - each blob's cash is its wallet, and a household's is its members' wallets summed (Spawn and fold, below).
- **Bytes:**
  - an agent adds 45 bytes to the hash and 20 of scratch;
  - a firm adds 60 to the hash and 16 of scratch;
  - a desktop arena uses about 11.9 of its 64 MiB;
  - `TIER_MEMORY_BYTES` and snapshot v1 don't change;
  - M2.3's scratch adds `spellMonths` and `yearEmployer` per agent, and `yearWage` and `exiting` per firm: 5 bytes an agent and 9 a firm, outside the hash.
- **Streams:** `FIRM_DRAW`, `WAGE_DRAW`, `LABOUR_DRAW`, `SHOP_DRAW`, `WEALTH_DRAW` and `START_DRAW`, the agent-layer streams 0x107–0x10C.
  - M2.3 gives `LABOUR_DRAW` purposes 4 and 5. Purpose 4 is the slow-searcher trait, `draw2(seed, LABOUR_DRAW, person, 4)`, fixed for life. Purpose 5 is a shock's order, `keyedShuffle(order, people, seed, LABOUR_DRAW, day, 5)`.
- **Hashes:** The world step, above, gives today's tick goldens and Highcourt's pins.
  - `goldens.json` also pins `economy`: seed 42 on the phone tier after 3 months, which is 63 days of `economyDay` with LENGNICK and `fiatIssuePpm` 10,000, hashing to `6a652730`.
  - The Node and browser checks replay it with the tick replays, and `node packages/sim-core/scripts/goldens.ts` regenerates it.
  - M2.3's off values keep `LENGNICK` byte-identical, so no hash moved, and `economy` stays `6a652730`. M2.2b adds a `town` golden beside it (below).

## Steering (owner, 10 October 2026)

One wander rule moves every blob.
- `movement/steer.ts` holds `wanderTo`, `offWall`, `firstRedraw`, `REDRAW_TICKS` and `STAND`. `sim-core`'s `move` calls them, with the keyed draw inlined so ticks stay allocation-free.
- `sim-protocol`'s `shared/steering.ts` re-exports them, with `draw2`, `WANDER` and the step tables, so the app never imports `sim-core`.
- The town view's walkers (`apps/web/src/map/walkers.ts`) wandered by the same rule over their place's loops, until M2.2c Task 6 removed them and Task 7 their loops. Only that module's own test imports the re-exports now.

## Spawn and fold (owner: M2.2)

M2.2 spawns a city from a ledger record and folds it back exactly, as its [step plan](../m2-economy/m2.2-spawn-and-fold/plan.md) lays out. That plan holds the API, the record's 14 fields, the weight tables and the goldens.

- **Households:**
  - a household is 1–6 adjacent blobs sharing a home;
  - each blob is still Lengnick's one-person household for work, shopping and saving, from its own wallet, so M2.1's day systems don't change;
  - a household's cash is its members' wallets summed, never stored;
  - `World` gains `households`, and `startEconomy` writes one household per blob.
  - `households/store.ts` adds `householdOf(households, agent)`, `firstMemberOf(households, household)` and `NO_HOUSEHOLD`, for a click's query only, since they add sizes from row 0 (the blob modal).
- **Layout, `sim-core`:**
  - new folders: `households/` and `spawn/`, with the three weight tables;
  - `spawn/` joins the culture wall's guarded folders, since it writes wealth and households;
  - `layoutWorld` takes over two stand-in jobs from `populate`, because guarded spawn may not write `cultureUid`;
  - `STAND_IN_CULTURES` is exported;
  - M2.6 moves `spawn/culture.ts` out of the guarded folder.
- **The record:**
  - a 14-field `Float64Array`, with a mean price in cents and no "6+" bucket;
  - `checkRecord` keeps household + firm cash, price × firms and wage × firms within `MAX_SAFE_CENTS`, so every total stays exact;
  - spawn fills an empty world, issuing cash from MINT, and fold only reads.
- **Draws:** `SPAWN_DRAW` (0x10D), keyed on (settlement, day). A goods world adds purpose 14 (Goods and food, below).
- **Speed and bytes:**
  - a desktop-only spawn row of 35 ms for 100k agents, not the plan's 10 ms: the fastest of 9 spawns takes 31.2 ms (measured here, Node 24.18.0 on Windows, load not recorded). The shared doc's 10 ms needs the owner;
  - 5 bytes per agent slot.
- **Engines:** the spawn goldens replay in Node and Chromium. Bun and Deno are dropped, and Firefox and WebKit return before launch (owner, 10 October 2026); the shared doc's wording waits for its sync.
- **Hashes:** Task 1 moved every golden and Highcourt pin, to the values The world step gives. `goldens.json`'s `spawn` holds 20 hashes of seed 2026's random records.

## The design runner (owner: M2.3)

M2.3 runs the economy headless over a grid of cells, writes each cell's flow log, and judges the runs against round 2's targets, as its [step plan](../m2-economy/m2.3-calibration-and-design-runner/plan.md) lays out. That plan holds the targets table, the rulings and the calibration's seeds.

- **Commands,** in `tools/cli`:
  - `design --grid <file> --out <dir> [--threads N]` runs a grid's cells. `--threads` defaults to `availableParallelism()` − 1, and at least 1, when `CI` is set, and to 2 elsewhere, since full runs pinned the owner's CPU (owner, 10 October 2026). `--out` must be a new or empty folder, or the run is refused before any cell starts;
  - `targets <dir> [--filter]` judges a run's folder against `TARGETS`, in `targets/targets.ts`, the one home of every target.
- **A grid** is JSON, and every error names its field. A field it doesn't know is an error too.
  - `preset` is a `PRESETS` name, `lengnick` or `city`, and `start` is `hand` or `spawn`.
  - `days`, `seeds`, `sizes`, `policeShares` and `shocks` are required. A shock is `{ day, unemploymentPoints }`, with its day inside the run, and 0 points is none.
  - `warmUpDays` defaults to the preset's `burnInDays`, and either must be below `days`.
  - `params` overrides the preset's fields, but never `households` or `firms`, which the size sets. Every cell's params must pass `checkParams`.
  - `lhs`, `{ points, seed, ranges }`, spreads a Latin hypercube of n = `points` points over the params that `ranges` maps to `[lo, hi]`. A spawn start refuses it, and a knob may not also be in `params`.
    - Knob j, in `ranges`' order, orders its n strata with `keyedShuffle(perm, n, lhs.seed, DESIGN_DRAW, j, 0)`. Point i takes lo + floor((perm[i] + u) × (hi − lo + 1) ÷ n), with u = `draw3(lhs.seed, DESIGN_DRAW, j, i, 1)` ÷ 2³².
    - `DESIGN_DRAW` is the runner's own stream, 0x300, past every sim stream.
- **A cell** is a point, a size, a police share, a shock and a seed, listed in that order. Its folder is `p<point, padded to 3 digits>-n<size>-x<police index>-k<shock index>-s<seed>`.
  - Sizes are multiples of 1,000 up to 100,000. The tier is the smallest that holds the size, `households` is the size and `firms` a tenth of it.
  - A hand start is `createWorld(seed, tier, undefined, size)`, then `startEconomy`.
  - A spawn start spawns R* into settlement 0 on day 0, with a stand-in home to every 3 people. `scaleRecord(R*, size, out)` scales it: every field but the mean price and wage is multiplied by size ÷ R*'s 1,000 people, the whole factor at these sizes (M2.2b; the runner's own `scaledRecord` before).
  - The main thread makes R* once per run with `settledRecord(preset)`, which M2.2b moved into `sim-core`: the preset's hand-built city on seed 42, run for the whole months that cover its `burnInDays`, then folded.
  - A shock lays off floor(points × size ÷ 100) people at the start of its day, through `economyDay`'s `layoffs`.
  - The police share is recorded and does nothing until M4.
- **A cell's folder** holds one `<column>.f64` per column, then `meta.json`, written last, so a folder a crash cut short has none.
  - Flow-log schema 1's columns (schema 2's from M2.4) are `day`, `district` and `STAT_NAMES`, a row a day per district. One district stands until M3.1, so `district` is all 0, and `taxes` stays 0 until M5's treasury.
  - Each column is Float64 in the host's byte order, little-endian on x64 and arm64, so `numpy.fromfile(path, '<f8')` reads it there.
  - `meta.json` holds `schema`, `commit`, `cell`, `preset`, `start`, `seed`, `size`, `tier`, `policeShare`, `shock`, `layoffs`, `point`, `params` (in full), `days`, `warmUpDays`, `districts` and `columns`. `commit` is `git rev-parse HEAD`, or "unknown".
- **Output never depends on thread count,** finish order, time or thread ids. Cells start largest first, each in a fresh worker thread, at most `--threads` at once, and each cell's sim days per second go to stderr only. `world.checks` stays on, since the CLI counts as development.
- **Judging:** `targets` refuses a folder of another schema. It groups cells by point, size, police share and shock, and gives each target's verdict over a group's seeds by M2.3's Ruling 10, or medians only under 20 seeds. `--filter` instead checks each point's tier-1 medians and ranks the passing points by their tier-2 misses (Ruling 12).
- **Grids:**
  - `smoke.json` checks the runner;
  - `sweep.json`, a 300-point hypercube on seeds 1–5, and `refine.json`, on seeds 1–20, tuned `CITY`;
  - `confirm-city.json` judges `CITY` on seeds 2001–2050, fresh after the review's re-tune, and `confirm-lengnick.json` judges `LENGNICK` on seeds 1001–1050;
  - `design.json` runs `CITY` at all five sizes, with and without a 5-point shock.

## The economy on screen (owner: M2.2b)

M2.2b spawns every app world as a town that runs `CITY`, and shows the economy on screen, as its [brief](../m2-economy/m2.2b-economy-on-screen/plan.md) lays out. Each task adds its names here, in its own docs commit.

- **Task 1, the town start:**
  - **Layout, `sim-core`:**
    - `economy/settled.ts` holds `settledRecord(preset: EconomyParams): Float64Array`, moved from the design runner's `cell.ts`;
    - `economy/city-record.ts`, generated, holds `CITY_RECORD`, which is `settledRecord(CITY)` as a 14-field `Float64Array`. Nothing writes to it;
    - `spawn/town.ts` holds `createTown`, `createStandInTown` and `spawnTown`;
    - `scripts/city-record.ts` writes `city-record.ts` in about 2.4 s, and `--check` compares a fresh `settledRecord(CITY)` with it instead. `test:headless` runs the check, and a commit that changes `CITY` or the economy day runs `node packages/sim-core/scripts/city-record.ts` and commits the result;
    - the barrel exports the three modules.
  - **The record:** `scaleRecord(record, people, out)`, in `spawn/record.ts`, replaces the design runner's `scaledRecord` and writes all 14 fields of `out`:
    - every count and total is scaled by `people` ÷ the record's population, rounded down, and price and wage stay as they are;
    - `unemployed` is filled up to `people` − `employed`, and one-person households are added until the households hold `people` exactly;
    - a town keeps at least `SUPPLIERS` (7) firms;
    - from a 1,000-person record at a multiple of 1,000, its output is the runner's, so no design cell moves.
  - **The households** (M2.2c Task 2):
    - `spawn/record.ts` gains `HOUSEHOLD_MIX`, the per mille of households of 1 to 6 people: 220, 280, 200, 170, 80 and 50, which is 22, 28, 20, 17, 8 and 5%, a mean of 2.76 people (unsourced estimate);
    - it also gains `townRecord(beds, largestHome, out)`, which scales `CITY_RECORD` to `beds` and sets the households. Those of s people, from 2 up to `largestHome`, number ⌊beds × mix(s) ÷ 2,760⌋, with mix in per mille, and one-person households take the rest, so people equal beds. It reads no look or culture;
    - `spawn/homes.ts` gains `bedCount(homes)`, `largestHome(homes)`, `createStandInTownHomes(ground, people)`, which makes homes of 6 beds and trims the last to the beds left so that they equal `people`, and `fitHouseholds(record, homes, seed, key)`;
    - `fitHouseholds` gives the households of 2 to 6 the room a place's homes have, largest first, and turns those that don't fit into one-person households, so the people stay the same, one to a bed. A record that fits is left as it is. A village of huts and a few farmhouses has no room for the mix's households of 5 and 6, which `seatHouseholds` would throw on. `key` is the one `spawnFromLedger` seats under, since the order of the homes decides what fits. `seatHouseholds` is unchanged.
  - **The town:**
    - `createTown(seed, tier, ground, homes): World` lays out an empty world of the tier's whole size with `layoutWorld`, so a smaller town moves no offset, and calls `spawnTown` (M2.2c Task 2; it took `people` before);
    - `createStandInTown(seed, tier, ground, people): World` is new in M2.2c Task 2. It calls `createTown` with `createStandInTownHomes(ground, people)`, for `?tier=`, the bench and tests, where no map draws any houses;
    - `spawnTown(world, homes)` fills an empty world with one blob to a bed of `homes`, or to the layout's agent rows if the beds outnumber them. It scales `CITY_RECORD` to those people with `townRecord`, fits the households to the homes with `fitHouseholds`, spawns the record through `spawnFromLedger` with `CITY`, settlement 0 and day 0, and marks the world a town. It stands apart from `createTown` for the warm-up, which lays out a world of its own (Task 3);
    - the mark is global slot `TOWN` = 4, in `world/world.ts` beside `TICK` (0), `RECORD_FRONT` (1), `DAY_AGENTS` (2) and `DAY_HOUSEHOLDS` (3). It is 1 for a town, whose step runs `CITY`'s economy (Task 3), and 0 for any other world. It is canonical, so checkpoints and the hash carry it;
    - blobs spawn at their home's door, as `spawnFromLedger` places them, and `spawnTown` then starts three in four walking, as `populate` does (Task 3).
  - **The worker:** `worker.ts` binds `makeWorld` to `createStandInTown(seed, tier, ground, agents)` when `init` sends `agents`, and to `createTown(seed, tier, ground, homes)` otherwise. The `ground` is `parseMap(map)` and the `homes` are the map's home entities, so home row r is the r-th home entity and the blob card's "House r + 1" is a drawn house (M2.2c Task 2; it bound `createTown(seed, tier, parseMap(map), agents ?? TIER_AGENTS[tier])` before).
    - The first screen's crowd is Highcourt's beds: 1,720 blobs on every tier since M3.1's Part 4 (2,600 before it, and 2,688 before M2.7 Task 2). A whole tier under `?tier=` sits in stand-in homes, and its firms then fill the tier's firm rows exactly (1,000, 2,500 and 10,000).
    - `inspected` gains `employer` and `wage` (Worker messages, above), and `employerGood` in M2.4 Task 5. The loop reads them from `world.blob.employer`, `world.firms.wage` and `world.goods.good`.
  - **Hashes:** Highcourt's pins moved (The world step, above). `goldens.json` did not: `42/phone` stays `746a06a3` and the economy `6a652730`.
  - **Speed:** a cold `createTown` takes 18–21 ms for 3,965 people and 23 ms for 7,931, where `createWorld` takes 6–9 ms and 11 ms. The worker's start gains about 11 ms, not the brief's 1 ms (measured here, Node 24.18.0 on Windows, fresh process, load not recorded).
- **Task 3, the economy in the step:**
  - **The schedule,** in `economy/economy.ts`: `ECONOMY_TICKS` is 20 (18 until M2.4 Task 3 added `spoilFood` and `buyFood`), and `runEconomySystem(world, params, day, system, layoffs)` runs system `system` of `day`'s economy, or nothing when it is not due that day. System k is, in `economyDay`'s order:
    - 0 opens the day: `clearFlows`, `clearPurchases` (both trade rings), then `layOff` when `layoffs` is above 0;
    - 1 is `spoilFood`, every day;
    - 2 to 6 are a month's first-day systems, `stepWages`, `decideFirms`, `searchShops`, `searchJobs` and `planConsumption`, due on a month's first day;
    - 7 is `buyFood`, 8 `shopDay` and 9 `produce`, all every day;
    - 10 to 16 are `endMonth`'s `payWages`, `updateReservationWages`, `fireOnNotice`, `distributeProfits`, `closeFirmMonth`, `layOffExiting` and `issueFiat`, and 17 is `recordMonth`, all due on a month's last day;
    - 18 is `recordDay`, every day, and 19 `recordYear`, due on a year's last day.
  - **`economyDay`** `(world, params, day, layoffs = 0)` runs the 20 in a row and then checks the invariants while `world.checks` is on, so headless runs and the economy golden `6a652730` did not move. One 20-case switch dispatches them (the M2.2b review). `endMonth` stays exported as a loop over systems 10 to 16 on a month's last day, and a system number past 19 does nothing.
  - **The step:** a town (`globals[TOWN]` = 1) runs `runEconomySystem(world, CITY, dayOf(tick), tick mod 1,440, 0)` on each tick of a day below `ECONOMY_TICKS`, after the day work and `move`. A world that is not a town runs none, and neither does any tick from the 21st of a day on, so only the day's window writes economy state. A fresh town sits at a month's day 0, which is the day its first tick runs.
    - The layoffs argument is `globals[DAY_LAYOFFS]`, which Task 6 added (below).
    - A day's row of `economyScratch.stats` is whole once the step that runs tick 19 ends, until tick 0 of the next day clears its flows.
    - **The hash:** a town's `stateHash` fingerprints its state only outside the economy's window. On a month's last day, `pay` stays live from tick 10 to 14 and `exiting` from 14 to 15, and the hash skips both, so compare hashes from a day's tick 20 on. A restore is still exact, since `checkpoint()` copies the whole arena (the M2.2b review).
    - **An accepted quirk** (coordinator, 11 October 2026): an inspect answered between ticks 14 and 15 of a month's last day shows an exiting firm's worker at the re-entered row's wage, until `layOffExiting` runs a tick later. It is display only.
    - `SYSTEM_NAMES` gains `economy`, which `step` laps on every tick, so the stats message's `economy` is the mean over all 1,440 ticks of a day, not over the 20 that run it.
  - **The warm-up:** `warmUp` spawns a town with `spawnTown` in its 1,024-agent, 1 MiB layout and runs `economyDay` with each of its 40 days of day work, so a month's start and end both compile. It grows from 27 ms to 46 ms (measured here, Node 24.18.0 on Windows, three runs each, load not recorded). It runs after the first snapshot, so the first frame never waits for it, and whatever the page sends meanwhile waits about 19 ms longer. Its throwaway town runs on `WARM_SEED` 1, whose first mix is 2^31 or more, so V8's warmed code survives a real seed (the allocation fix).
  - **The bench:** `createBenchWorld(tier)` makes `createStandInTown(BENCH_SEED, tier, standInGround(), TIER_AGENTS[tier])`, a town of the tier's whole crowd. `sampleTier` also gives `economy`, the worst tick of each day, which `ECONOMY_SYSTEM` names and `budget.ts` prints per tier as `<tier> economy: worst tick … ms on the best of 9 days, no budget`, judging nothing. The Chromium run carries the samples in its report.
    - Its 9 sampled days are days 1 to 9, after one dropped warm day, so they hold neither a month's start (day 0) nor its end (day 20), and the printed worst tick is the daily shopping tick. At the phone sizes a month's first-day `searchShops` costs more (the table below), so the printed figure understates the worst tick there.
  - **Hashes:** `goldens.json` gains `town`: `{ seed: 42, tier: 'phone', people: 1000, ticks: 1000, hash: 'b76fca4c' }`, which M2.4 Task 4 moved to `1621b72b` and M2.2c Task 2 to `1043e0ad`. `townHash(seed, tier, people, ticks)`, in `test/engines/checks.ts`, spawns a town with `createStandInTown` on the stand-in ground and steps it, and `checkGoldens` replays it with the rest, so Node and Chromium both run its case: 5 + 20 cases in all, 6 + 20 since M2.2c Task 3's `switch`, and 8 + 20 since the review's `away` and `visit`. No other golden moved: `42/phone` is still `746a06a3` and the economy `6a652730`. Highcourt's pins were `d11bb532` (phone) and `8eb639aa` (desktop), then `4b1a37d3` and `49f7323c`, then `9ca2ad77` and `4cd678eb` (M2.2c Task 2: 2,688 blobs in 387 homes and 985 households), and are now `ff861cb3` and `da92906e` (the M2.4 review). `town` is now `8f1f75bb`.
  - **The walking start** (coordinator, 10 October 2026): `spawnTown` starts three in four blobs walking after `spawnFromLedger`, so the first screen moves from its first frame.
    - For blob p, with s = `draw3(seed, SPAWN_DRAW, key, p, 13)` and key = `draw2(seed, SPAWN_DRAW, 0, 0)`, the settlement and day `spawnFromLedger` keys on, a blob where s & `WALK_START_MASK` (3, now exported from `world/world.ts`) isn't 0 starts on heading s >>> 24, with the `vx`, `vy` and `facing` that follow. The rest stay idle on heading 0, facing down.
    - Purpose 13 is the next free one on `SPAWN_DRAW`, after `spawn.ts`'s 1 to 12 (M2.4 takes 14). In seed 42's town of 3,965, 2,998 walk (75.6%).
  - **Cost** (measured here, Node 24.18.0 on Windows, a desktop, one run, load not recorded): each system timed alone over a town's second month, after `warmUp`. The worst tick of the economy, with the system that takes it:

    | Town | Worst tick | Worst system | Next worst |
    | --- | --- | --- | --- |
    | 3,965 (Highcourt, phone) | 0.77 ms | `searchShops` | `shopDay` 0.48 ms |
    | 7,931 (Highcourt, desktop) | 1.56 ms | `searchShops` | `searchJobs` 0.80 ms |
    | 10,000 (phone tier) | 1.78 ms | `searchShops` | `shopDay` 1.17 ms |
    | 25,000 (phone-plus tier) | 2.69 ms | `shopDay` | `searchShops` 2.47 ms |
    | 100,000 (desktop tier) | 14.17 ms | `shopDay` | `searchShops` 10.03 ms |

    So at 10k and below a month's first-day shop search, not the daily shopping, is the worst tick (Ruling 2 inferred shopping). At 100k shopping alone nears the 16 ms tick, as Ruling 2 said, and perf.yml measures the real figures on the reference machine.
- **Task 4, the economy feed:**
  - **The ring,** in `economy/scratch.ts`, outside the hash:
    - `PURCHASE_RING` is 16, and `EconomyScratch` gains `purchaseShop` and `purchaseUnits` (`Int32Array`, 16 long), `purchaseCents` (`Float64Array`, 16) and `purchaseCount` (`Int32Array`, 2). A purchase names the firm row that sold and never a buyer, household or person.
    - **Two rings** (split in M2.4 Task 3, one ring of 16 until then): the 16 slots are two rings of `TRADE_RING` (8), the foods' (`FOOD_TRADES`, 0) and the other goods' (`GOODS_TRADES`, 1), ring r at slots r × 8 on, and `purchaseCount[r]` counts ring r's day. Purchase n of a ring's day sits in its slot n mod 8, so a day keeps its last 8 food and last 8 goods purchases. A goods-off world logs everything to the goods ring.
    - `logPurchase(scratch, ring, shop, units, cents)` writes one: `consumption/food.ts` to the food ring and `consumption/shop.ts` to the goods ring. `clearPurchases(scratch)` empties both rings and is called by system 0, `openDay`, so every day starts empty and a day nobody shops leaves no trades.
    - `copyPurchases(scratch, shop, units, cents): number` copies the held purchases of both rings, the foods' first and each ring oldest first, into three arrays of 16, zeroes the rest and returns how many it holds.
    - The barrel exports `economy/scratch.ts`. The scratch grows by 264 bytes, none hashed, so no golden moved: `42/phone` is still `746a06a3`, `town` was `b76fca4c` (M2.4 Task 4 moved it to `1621b72b`) and the economy `6a652730`.
    - **Cost:** `logPurchase` takes 2.28 ns, and a town of 3,965 makes about 3,930 purchases in a `shopDay` of 0.443 ms, so the ring adds about 2% to shopping (measured here, Node 24.18.0 on Windows, a desktop, one run, load not recorded).
  - **The feed,** in `sim-protocol`'s new `economy/` folder, `feed.ts`:
    - `createEconomyFeed(): EconomyMessage` makes the message once, with room for `FEED_DAYS` (112, a year) days and `FEED_TRADES` (16) trades. `FEED_GOODS` (7) is how many goods it lists, `BREAD` to `FUEL`, and `feed.ts` re-exports `BREAD`, `FUEL`, `GOOD_NAMES` and `SHOP_NAMES` from `sim-core`, so the app names goods without importing it (M2.4 Task 5, 9a10e94). `writeEconomyFeed(world, feed)` fills it in place and allocates nothing.
    - `economyDayEnded(world)` is true for a town right after the step that runs a day's last economy tick. Then `globals[TICK]` mod 1,440 is `ECONOMY_TICKS`, the day's row of stats is whole (Task 3), and the loop writes the feed.
    - A write adds the day that just ended, `dayOf(tick − 1)`. Once 112 days are held, each write first shifts every series down one place, so they stay oldest first.
  - **The `economy` message,** `EconomyMessage` in `messages.ts`, is the feed itself:
    - `day` is the day that just ended, counted from 0, and `days` the points held, up to 112. Point i of every series is day `day − days + 1 + i`, oldest first, and a slot at `days` or past is 0.
    - `meanWageCents` (cents a month) is the stats row's `wage_mean`: the mean over the town's firms, unrounded and not weighted by their workers. `meanPriceCents` is gone (M2.4 Task 6, dba1b48), since the panel charts what was paid for each good instead (M2.4 Ruling 6).
    - `unemploymentPpm` is floor(1,000,000 × the row's `unemployed` ÷ all households), the share out of work. It is a rate for each day, so a later change in population leaves the old points right.
    - `soldUnits`, `stockUnits` and `paidCents` each hold a series for the `FEED_GOODS` (7) goods, and series g is good `BREAD + g` (M2.4 Task 5). They are the units sold in the day (portions for a food), the units in stock at its end, and the price paid in cents a unit: the day's sales cents over its units, unrounded, or the posted mean price on a day nothing sells.
    - `eaten`, `spoiled` and `unmet` are the day's food in portions: eaten, spoiled across the four foods, and wanted but never bought.
    - `trades` is how many of the day's last purchases are held, up to 16. Trade i, oldest first, is `tradeUnits[i]` units of the good `tradeGood[i]` bought from firm row `tradeShop[i]` for `tradeCents[i]` cents. A page names firm row r after that good, as in "Bakery r + 1", as the inspector does. Slots from `trades` on are 0. Since M2.4 Task 3 the 16 are the foods' last 8, oldest first, then the other goods' last 8. `tradeGood[i]` is `goods.good[tradeShop[i]]`, read when the feed is written (M2.4 Task 5).
    - Each array has an `ArrayBuffer` of its own, so a post copies only the 23,568 bytes of the 26 112-point series and the four 16-trade columns (computed).
  - **The loop** makes one feed for each `Session`, at `init`, so a new run starts its days over. After each `step` it calls `economyDayEnded` and writes the feed, and once the turn's ticks and snapshot are done it posts the feed, with no transfer list. A world that is not a town posts none.
    - At 1× the first post lands at tick 20, 2.0 s after Play (18 and 1.8 s until M2.4 Task 3), and one follows every 1,440 ticks, which is 144 s.
    - Nothing allocates per tick: the feed's buffers are made once, and the day's one post is the copy `postMessage` makes of every message.
- **Task 6, the layoffs input** (ba0b44a):
  - `INPUT_LAYOFFS` is 2 in `world/inputs.ts`, beside `INPUT_FOCUS` (1). Its `a` is a number of people and its `b` is 0. `logLayoffs(world, people): boolean` in `day/day.ts` logs one. It returns false for a count under 1 or over 2,147,483,647, and the boundary clamps a day's sum at 2,147,483,647 (the M2.2b review). Runs are watch-only, so the app has no control for it.
  - `DAY_LAYOFFS` is global slot 5 in `world/world.ts`, beside `TOWN` (4). It is canonical, so checkpoints and the hash carry it, and slot 6 is `GOODS` (M2.4) while slot 7 stays free. `dayBoundary` sets it at every boundary to the sum of the `a`s of the `INPUT_LAYOFFS` entries it applies, or 0, so only the boundary writes it.
  - `step` passes `globals[DAY_LAYOFFS]` as `runEconomySystem`'s `layoffs`. System 0 spends it with `layOff` on the day's tick 0, in the boundary's step. When fewer people work than it asks for, everyone employed is laid off. No later system reads the slot, so a layoff fires once.
  - An input logged on any tick of a day, the economy's window included, waits for the next boundary. A world that is not a town still sums the slot but spends nothing.
- **Task 5, the economy panel** (8e4a120, b4b7ac0):
  - `App` gains `onEconomy(listener: EconomyListener)`, where `EconomyListener = (message: EconomyMessage) => void`. The app keeps the latest message and hands it to a new listener at once.
  - `index.html`'s `<div id="side">` holds `<section id="economy">` above `<section id="charts">`. The scroll and the top padding moved from `#charts` to `#side`.
  - `main.ts`'s `mountEconomyPanel` imports the economy chunk after `app:interactive`, without awaiting it, so it loads beside the Town skin and can't block it.
- **Task 8, speed and the HUD** (da4eeff..c20ce6e):
  - `App` gains `speed: Speed`, `setSpeed(speed)` and `fit()`. `mountHud(root, app, dev)` takes the developer flag, which `devFrom(search)` in `app/query.ts` reads from `?dev=1`.
  - The HUD row holds Play, 1×, 4× and 16×, and Map. `?dev=1` also loads `controls-*.js`, the lil-gui Zoom slider, and shows the per-system timings (`#hud-systems`).
  - Keys 1–3 set the speed while the view or a HUD control has focus, never document-wide (WCAG 2.1.4).
- **The review's fixes and the allocation gate** (b7eb873..1339b2c):
  - `spawnTown` throws unless the world is at tick 0. `firmsFitTier(record, tier)` in `spawn/record.ts` checks a record's firms fit a tier, and `scripts/city-record.ts` asserts it for every tier.
  - The hot-path lint also covers `packages/sim-protocol/src/economy`.
  - **Draws below n:** per-tick code that needs a draw below n calls `drawBelow2`–`drawBelow4(…, n)`, which is exactly `drawN(…) % n`. A draw of 2^31 or more is a heap number to V8 whenever it crosses a call that isn't inlined, so the reduced value must be what crosses. `mix` is `mixBits >>> 0`, so the mixing steps are shared.
  - **A V8 trap:** a `Record<Tier, number>` literal with fractional values, in the same key order as sim-core's integer `TIER_*` tables, shares their hidden class and deoptimises warmed sim code. So the bench's tables list `desktop` first.
  - **Measured** (phone, Node 24.18.0 on Windows, load not recorded): a plain day's young-generation growth fell from about 83 KB to 2.9 KB. A month's first day fell from 943 KB to 25 KB. A month's last day still grows 0.24–0.82 MB in cold V8 tiers, which `allocationLimit` allows until M6 (coordinator, 11 October 2026).

## Goods and food (owner: M2.4)

M2.4 Part 1 gives the economy seven goods and food, as its [brief](../m2-economy/m2.4-goods-and-food/plan.md) lays out. Each task adds its names here, in its own docs commit. Tasks 1 to 3 leave `CITY.goods` at 0, so no hash moved: `42/phone` is still `746a06a3`, the economy `6a652730`, `town` `b76fca4c`, the 20 spawn hashes and Highcourt's pins `d11bb532` and `8eb639aa`. Task 4 turns it on, which moves `town` to `1621b72b` and the pins to `4b1a37d3` and `49f7323c` and leaves the rest. M2.2c Task 2's one blob to a bed then moved `town` to `1043e0ad` and the pins to `9ca2ad77` and `4cd678eb`, and left the rest. The review's burn-in and new `CITY_RECORD` (below) then moved `town` to `8f1f75bb` and the pins to `ff861cb3` and `da92906e`, and left the rest again.

- **Task 1, the goods:**
  - **Layout, `sim-core`:** the new folder `goods/`, exported by the barrel.
    - `goods.ts` holds the table. The ids are `GENERIC` (0), then `BREAD`, `VEGETABLES`, `FISH`, `MILK` (1–4, the foods) and `CLOTH`, `TOOLS`, `FUEL` (5–7). `GOOD_COUNT` is 8, with the generic good that a world with goods off holds in every row. A blob's link k sells good k + 1, as `goodOfLink(k)` says.
    - It also holds `GOOD_NAMES` and `SHOP_NAMES` (Bakery, Greengrocer, Fishmonger, Dairy, Draper, Smithy, Fuel Store, and Shop for the generic good), `DAYS_ON_SALE` (4, 7, 3 and 14 for the foods, 0 for the rest), `SHARE_PER_10K` (450 for each food, then 2,733, 2,733 and 2,734) and `PORTIONS_PER_UNIT` (6).
    - `isFood(good)`, `outputPerWorkerDay(good, unitsPerWorkerDay)` (6 portions for each unit a worker makes, so 18 against 3 at the presets), `openingPriceOf(good, unitPriceCents)` (a food opens at the unit price over 6, floored) and `splitByGood(total, least, out)`.
    - `splitByGood` shares `total` over goods 1 to 7 by `SHARE_PER_10K`, each at `least` or more, by largest remainders with ties to the lower good, and throws `RangeError` below 7 × `least`. It is exact, as 100 rows give 5, 5, 5, 4, 27, 27 and 27, and 7 rows give one each.
    - `foodWorkersFor(people, unitsPerWorkerDay)` and `splitJobs(employed, foodLeast, out)` join them in the M2.4 review (71efe64). `foodWorkersFor` is the workers whose food feeds `people`, rounded up: ceil(people × 3 ÷ 18) at the presets, since a worker makes 18 portions a day where a blob eats 3. `splitJobs` is `splitByGood(employed, 0)`'s split, unless that leaves the four foods under `foodLeast` jobs, as the shares can a town of 433 people or fewer, by rounding. Then the foods take `foodLeast`, or all the employed if fewer, over themselves by their shares, and cloth, tools and fuel share the rest by theirs. So a spawn gives the foods max(the 4.5% split, min(employed, ceil(people × 3 ÷ 18))) workers, where a town of 30 made 72 of its 90 portions before.
    - `store.ts` holds `GoodsStore`, `createGoodsStore(arena, capacity)`, `FOOD_RING` (16), `ringSlot(firm, day)` (the ring index of the batch made on `day`, whose slot is `day & 15`, so day −1 is 15) and `assignGoods(goods, firms)`, which lays the rows out good by good in table order, foods first.
  - **`World.goods`:** a `GoodsStore` of the tier's firm slots, taken last in `layoutWorld`.
    - Its canonical columns are `good` (a `Uint8Array`), `ring` (`FOOD_RING` `Int32` to a row) and `wasted` (an `Int32`, the portions spoiled at the firm since it last decided): 69 bytes a firm, so 69 KB, 172.5 KB and 690 KB by tier. They are off `arena.canonical`.
    - `byteOffset` and `byteLength` give the hash's region. Three scratch columns of `GOOD_COUNT` `Int32`s follow it, outside the hash: `firstRow` and `rowCount`, which `assignGoods` fills and nothing moves, since a row keeps its good for the life of the world, and `jobs`, which spawn fills.
  - **The `GOODS` slot and the hash rule:** `GOODS` is global slot 6 in `world/world.ts`: 1 in a world that runs goods, 0 in any other. `startEconomy` and `spawnFromLedger` copy it from `EconomyParams.goods`, and it is canonical.
    - `stateHashExcept` mixes the goods region in last, after the canonical regions, only while the slot is 1. A skip view that starts where `goods.good` does leaves it out, as it does a canonical region. A world with goods off hashes as before.
    - A checkpoint copies the whole arena, so it carries the store whether or not it is hashed.
  - **`EconomyParams.goods`:** 0 or 1, checked by `checkParams`. `LENGNICK` holds 0, and `CITY` holds 1 since Task 4. `{ ...CITY, goods: 0 }` is M2.3's `CITY`.
  - **Start and spawn,** with `goods` 1:
    - The firm rows hold the goods in `splitByGood(firms, 1)`'s shares, in table order, so the goods firms are the rows from `firstRow[CLOTH]` on, and every blob's link k is a firm of good k + 1.
    - `startEconomy` links by a draw below the good's row count on `START_DRAW`'s keys as before, and hires as before, `i mod F`, so each good's jobs follow its rows, to within a worker a firm.
    - `spawnFromLedger` splits the employed by `splitJobs(employed, foodWorkersFor(people, unitsPerWorkerDay), jobs)` (`splitByGood(employed, 0)` until the review), then each good's jobs over its rows by the size table, with `SPAWN_DRAW` purpose 14, keyed (key, good), for the stride word. The goods firms' prices spread around the record's mean and sum to exactly their count × price. The record's stock follows workers + 1 over the goods firms. A link draws among the rows of its good with odds (workers + 1) ÷ (jobs + rows).
    - A food firm opens at `openingPriceOf` of the preset's or record's price, flat, with a day of output as its stock and in `ringSlot(firm, day − 1)`, where `day` is the start's day 0 or spawn's `day`. Its `lastDemand` is a month of output, as every firm's.
    - A world with goods off replays as before: the goldens and `city-record.ts --check` prove it, and `goods.test.ts` settles `{ ...CITY, goods: 0, burnInDays: 18428 }` back to M2.3's record (e83808a).
  - **The record rule:** the record keeps its 14 fields. In a goods world `foldToLedger` reads `price` and `stock` over the goods firms alone, since a portion is not a unit, and counts every firm in `firms`, `firmCash` and the `wage` mean. So spawn on `{ ...CITY, goods: 1 }` and fold return a record exactly, and each spawn starts food fresh.
- **Task 2, food on the shelf:**
  - **`goods/food.ts`:** a batch made on day m enters slot m after that day's shopping, is on sale on the days m + 1 to m + L, and spoils at the start of day m + L + 1. `firms.stock` stays the total of a row's ring, so each function moves both.
    - `addFood(firms, goods, firm, day, portions)` adds to the slot of `day`.
    - `takeFood(firms, goods, firm, day, portions)` takes the oldest batch first and returns how many portions it took, never more than the ring holds.
    - `spoilFood(world, day)` runs at a day's start: it empties the slot made L + 1 days ago for each food firm, adds the portions to the firm's `wasted` and to `STAT_SPOILED + good`.
    - `spoilShelf(world, firm)` spoils a whole shelf, for an exit, into `STAT_SPOILED + good` and not into `wasted`.
    - Task 3 wired `spoilFood` into the schedule as system 1, and `buyFood` sells from the ring.
  - **Production:** `produce(world, params, day)` takes the day. A food firm adds its output to the ring, any other firm to stock. `STAT_MADE + good` counts every good, and `STAT_PRODUCED` the goods firms' units alone.
  - **Food hiring,** in `decideFirms` on a month's first day:
    - A food firm is short when it holds under a day's demand, `ceil(max(lastDemand, demandFloor) ÷ 21)` portions, and long once its `wasted` reaches a worker-month of its output (378 portions). It is never both, so it never hires and gives notice together.
    - Short opens a vacancy, and long gives notice if it has workers. Each may move the price by Lengnick's rule, over a worker-month of portions, so a month's output is priced at the same markup. `wasted` starts again from 0.
    - A goods firm keeps the band and never reads `wasted`.
  - **Food exits,** in `closeFirmMonth`: an exiting food firm spoils its shelf (`spoilShelf`) instead of writing it off, and every entrant takes the mean price of the firms of its kind, as they stood: the foods' mean for a food row, and every other firm's for any other. With goods off that is the city's mean, as before.
  - **Flow-log schema 2,** in `economy/stats.ts`: `FLOW_LOG_SCHEMA` is 2 and `STATS` is 79. The levels still come first, so the 20 flows moved up 16 places.
    - The levels hold slots 0–8 as before, then `STAT_GOOD_STOCK` (9–16) and `STAT_GOOD_PRICE` (17–24), each a slot to a good, the posted mean price being 0 where no firm sells the good.
    - The flows start at `STAT_SALES_UNITS` (25) and run to `STAT_TAXES` (44), as before. Then `STAT_SOLD` (45), `STAT_SOLD_CENTS` (53), `STAT_MADE` (61) and `STAT_SPOILED` (69) take a slot to a good, and `STAT_EATEN` (77) and `STAT_UNMET` (78) one each.
    - A per-good column is named for the column and the good in lower case: `stock_bread`, `sold_cents_fish`, `made_generic`.
    - In a goods world the unit columns `stock`, `sales_units`, `produced` and `write_off` and the `price_mean` level count the goods firms alone, every good but the foods. `sales_cents` stays all revenue. With goods off the generic good's columns equal them.
    - `recordFirms` writes the per-good levels, `produce` and `spoilFood` the flows `made_*` and `spoiled_*`, and `buyFood` and `shopDay` (Task 3) write `sold_*` and `sold_cents_*`, with `buyFood` writing `eaten` and `unmet`.
  - **`tools/cli`'s `targets`** reads schema 2, which keeps every column name it reads, and refuses any other.
  - **Cost** (measured here, Node 24.18.0 on Windows, a desktop-tier world of 100,000 people and 10,000 firms, goods on, median of 300 runs, load not recorded): `produce` 73 µs, `spoilFood` 28 µs, `recordDay` 0.31 ms and a month's `decideFirms` 0.83 ms. With goods off, `produce` takes 82 µs, `recordDay` 0.31 ms and `decideFirms` 0.92 ms.
- **Task 3, eating:**
  - **`consumption/food.ts`:** `buyFood(world, day)` is system 7, before `shopDay`, and does nothing while `GOODS` isn't 1, as every other goods gate reads it (the review, 13f892f; it returned only on 0). `PORTIONS_PER_DAY` (3) and `FOOD_LINKS` (4, the links that sell the foods) join `goods/goods.ts`.
    - It shuffles the households by `SHOP_DRAW` purpose `FOOD_ORDER` (8), and each blob wants 3 portions. It visits its 4 food links in one of 8 keyed orders, `SHOP_DRAW` purpose `FOOD_VISIT` (9): a start link and a step of 1 or 3, the two that reach all four.
    - A shop is asked for what the blob can pay (A7) and sells what its ring holds, oldest first (`takeFood`), and a shop that supplied less sets the link's `stockedOut` bit (A10). A purchase is one `transfer` of whole cents. It adds to `sold_*`, `sold_cents_*` and `sales_cents`, and to the food trade ring.
    - A portion bought is eaten that day, and a portion not bought is `unmet`. So `eaten` equals the day's food sold, and `eaten + unmet` equals 3 × the households. Nothing else follows a short portion yet.
  - **`shopDay`** (system 8) skips the 4 food links while `GOODS` is 1, as visits that buy nothing, so its draws and visit orders are the same as with goods off. It adds its sales to `sold_*`, `sold_cents_*` and the goods trade ring, and `sales_units` counts goods alone.
  - **`planConsumption`** sets aside `PORTIONS_PER_DAY` × 21 (63) portions at the food links' mean price, rounded down, then plans units by Lengnick's rule from the rest of the wallet, at the mean price of the 3 goods links. With goods off it reads all 7 links as before.
  - **`searchShops`** replaces link k only with a firm of good k + 1. The newcomer is drawn by workers among the good's rows (`firstRow` and `rowCount`), or uniformly among them while none works. With goods off it draws among all rows, with the same keys as before.
  - **The schedule and the rings** are under Task 3 and Task 4 of the economy on screen, above. Both new systems do nothing with goods off, and no golden moved with `CITY.goods` at 0.
- **Task 4, `CITY` gains goods:**
  - `CITY.goods` is 1 and `CITY.burnInDays` is 31,883. Task 4 set 29,865: MSER-5 on seeds 1 to 5 over 40,000 days cut 19,910 days of the mean price and 11,445 of the unemployment share, up from M2.3's 12,285 and 10,900, and 1.5 × 19,910 is 29,865 (measured here, Node 24.18.0 on Windows, 11 October 2026, 4,077 days a second against M2.3's 7,774 without goods, load not recorded). That cut sat 90 days under MSER-5's half-run limit of 20,000, so the limit had bound it. The review re-ran it over 80,000 days (`economy --preset city --burn-in --seeds 5 --seed 1 --days 80000`, goods on, exits off), which cuts 21,255 days of the price and 11,470 of the unemployment share, and 1.5 × 21,255 rounds up to 31,883 (0cf4b2f; 99 s at 4,052 days a second, measured here).
  - `CITY_RECORD` is now `[1000, 0, 0, 0, 0, 0, 924, 76, 100, 297173974, 12826026, 3360, 141863, 43635]`: 924 employed of 1,000, a goods price of 3,360 and 43,635 units of goods stock, folded at day 31,899 on seed 42. Task 4's was `[1000, 0, 0, 0, 0, 0, 944, 56, 100, 297096887, 12903113, 3337, 141233, 39861]`. `confirm-city.json` draws seeds 3001 to 3050 and runs 33,999 days after a 31,883-day warm-up. `design.json` follows it: a 31,883-day warm-up, a shock on day 33,999 and 36,099 days (bbcf2f3), and `city-targets.test.ts` pins it to `confirm-city.json`. Task 4's grids were seeds 2001 to 2050 over 31,983 days after 29,865, and a shock on day 31,983 over 34,083 days (2a0950b).
  - **Hashes:** `town` became `1621b72b` (was `b76fca4c`) and Highcourt's pins `4b1a37d3` (phone) and `49f7323c` (desktop). M2.2c Task 2 then moved them to `1043e0ad`, `9ca2ad77` and `4cd678eb`, at 2,688 blobs in 387 homes and 985 households, and the review's new record to `8f1f75bb`, `ff861cb3` and `da92906e`. `42/phone` `746a06a3`, the economy `6a652730`, the other tier goldens and the 20 spawn hashes moved in none.
  - **`tools/cli`'s `targets`** reads 14 more schema 2 columns and reports `food_share` (food's cents over `sales_cents`), `spoil_share` (food spoiled over food made) and `unmet_share` (unmet over eaten plus unmet) over the window, each as a reported measure with no band. Since the review `okun` counts all output, the goods' units plus the food made over 6 portions to the unit (c439bba; −0.622 became −0.821 on the saved seeds 2001 to 2050).
  - The 50-seed confirmation, now on seeds 3001 to 3050, holds all six tier-1 targets (bbcf2f3; M2.4's `task.md` has the table, and keeps the first run on seeds 2001 to 2050, 4b1b32b, after the 29,865-day burn-in). `ECONOMY_LONG=1 nice -n 19 pnpm vitest run tools/cli/test/city-targets.test.ts` passed in 230 s on 2 threads (measured here, Node 24.18.0, a Ryzen 5 3600 at about 1% load); the first run's 14 of 14 took 3 min 41 s.

## Every town runs the sim (owner: M2.2c)

M2.2c gives every settlement a ledger row, advances the rows of the towns off screen, and switches the live town at a day boundary, as its [brief](../m2-economy/m2.2c-every-town-live/plan.md) lays out. Tasks 1 and 2 put their names in Places and The economy on screen, above. Each later task adds its names here, in its own docs commit.

- **Task 2b, the summary month** (2e3b3c9, 32b6dac):
  - **`AWAY_DRAW`** is `LEDGER_SALT + 1` (0x201) in `random/streams.ts`, the first ledger-layer stream (`layerOf` says `'ledger'`), apart from every agent draw. A draw keys on (town, month, field, which of two draws) through `drawBelow4`.
  - **`spawn/away.ts`:**
    - `AWAY_FIELDS` is a `Uint8Array` of the three fields that drift, `LEDGER_EMPLOYED`, `LEDGER_PRICE` and `LEDGER_WAGE`, in the order of `away-rates.ts`' arrays.
    - `stepAwayTown(rows, town, seed, month, anchor): void` advances row `town` of `rows` in place. `rows` is a bare `Float64Array` of `LEDGER_FIELDS`-field rows, with no `World`, and `anchor` is the caller's scratch row, where the first record is rebuilt each call. A row with no people is unvisited and stays as it is.
    - `stepAwayTowns(rows, live, seed, month, anchor): void` steps every row but `live`, which is −1 when no town is live. A row reads only itself, so the order of towns cannot matter.
    - **The step:** employed, price and wage each close a share of their gap to a live town's mean, which is the first record, `scaleRecord(CITY_RECORD, people)`, times `AWAY_LEVEL_PPM`, and take zero-mean noise, the sum of two keyed draws below n, less n − 1. Steps work in thousandths of a person or cent, and the noise dithers the rounding, so a pull under one whole unit still acts on average. The noise is a share of the record's level and shrinks with √(`AWAY_FIT_PEOPLE` ÷ people) (inference). Stock and the cash split return to the first record's, with the firms holding its firm cash, or all the cash if the total is less. People, households, firms and the cash total never change, and every field stays whole and within `checkRecord`, so a stepped row always spawns.
    - **The level** (32b6dac): the record is one snapshot of seed 42 and sits 0.2, 2.1 and 3.9 deviations off a live town's mean employed, price and wage. A drift to it would have brought an away town back about 2.0% worse paid and 0.6% cheaper than a live one, so the step drifts to the record times the level.
  - **`spawn/away-rates.ts`,** generated: `AWAY_FIT_PEOPLE` (1,000) and, in `AWAY_FIELDS` order, `AWAY_LEVEL_PPM` (1,003,359, 1,006,192 and 1,019,599: the live mean as a share of the first record, which may pass `PPM`, and `mulPpm` stays exact just over it on levels this small), `AWAY_SHARE_PPM` (49,297, 10,000 and 19,481: the part of the gap that closes in a month, at least 1% so nothing drifts without bound, which the price's 0.5% meets) and `AWAY_NOISE_PPM` (5,510, 415 and 990: a month's deviation as a share of the record's level). The review's bias correction (below) moved them from 65,149, 21,161 and 35,701, and from 6,308, 602 and 1,335.
  - **`scripts/away-rates.ts [--check]`** fits an AR(1) to each field's month-start level in a live 1,000-person `CITY` town spawned from `CITY_RECORD`, months 2 to 241 on seeds 1 and 2, in 2.5 s: the level is the mean over the record, the share 1 − φ for φ the lag-1 autocorrelation within a run plus Marriott and Pope's correction (1 + 3φ) ÷ T for runs of T = 240 months (two such runs fit a true 0.992 as 0.979 without it), and the noise s√(1 − φ²) for s the deviation. A commit that changes `CITY`, `CITY_RECORD` or the economy day runs it and commits the result. `--check` compares a fresh fit instead, and `test:headless` runs it.
- **Task 3, the ledger table and the switch:**
  - **The table,** in `world/world.ts`:
    - `MAX_TOWNS` is 512. The first 400 large worlds from 5EED0001, the size the app makes, hold at most 269 settlements, and the 20 golden worlds at most 58 (measured here, Node 24.18.0).
    - `World.townRecords` is a `Float64Array` of `MAX_TOWNS × LEDGER_FIELDS`, row `town` at `town × LEDGER_FIELDS`, zeros at layout. `World.recordRow` is one row of scratch, the `anchor` that `stepAwayTown` takes. Both come last in `layoutWorld` but for M2.7's `fields`, off `arena.canonical`, and add 57,456 bytes, so no offset moved. A row with no people is unvisited: `populationAt(rows, first)`, which `populationOf` now calls with 0, is 0.
    - `World.ground` is writable. `World.request` is a `TownRequest { place, ground, homes }` made once at layout, outside the arena: `place` is the town the ground and homes were attached for, `NO_PLACE` (−1, which `focus[0]` also starts at) while none are. The pending place itself is `focus[1]` (`FOCUS_PENDING`), a second slot in the 8 bytes `focus` was padded to, so no offset moved and a checkpoint carries it (the review). `World.agentBytes` and `World.economyBytes` are byte views over the two arena runs a town fills: the agent columns, then the firms, the economy's scratch, the households and the goods.
  - **`requestTown(world, place, ground, homes, shops = NO_SHOPS): boolean`** (the `shops` are M2.7 Task 4's, below) is in `day/day.ts` beside `logFocus`, not in `spawn/switch.ts` as the brief had it: `dayBoundary` calls `switchTown`, so a module that `switchTown` lives in may not import `day.ts`. It logs `INPUT_FOCUS` (`a` is the place) at the current tick and, through `attachTown(world, place, ground, homes)` (new in the review), keeps the ground and homes in `World.request` and the place in `focus[1]`, in one call, and a later request of the same day replaces an earlier one. It returns false, and changes nothing, for a world that is not a town, a place outside 0 to `MAX_TOWNS` − 1, homes with fewer beds than `SUPPLIERS` (a town keeps at least that many firms, and `checkRecord` allows no more firms than people) or than the people the place's row holds (`homesSeat` in `spawn/switch.ts`; a `?tier=` start's crowd, folded into a row, cannot go back into Highcourt's fewer beds), or a full log.
  - **`switchTown(world, place): void`** is in `spawn/switch.ts` (it took no `place` before the review), and `dayBoundary` calls it with the last focus logged when a focus input applies in a town, before the day's window opens. In a world that is not a town a focus only sets `focus[0]`, as before. It spends the request, and a focus on the live town (`focus[0]`) or none ends it there. A focus for any other place with no ground and homes attached for it throws a `RangeError`, so a `logFocus` alone in a town, which once switched nothing, now throws at the boundary; so does one whose homes cannot seat the row's people. Both checks come before the fold. Otherwise:
    1. The live town folds: `foldToLedger` into `recordRow`, copied to its row of `townRecords`.
    2. It is emptied: MINT takes back every cent of the wallets and the firms with `retire`, two fills zero `agentBytes` and `economyBytes`, and `openYearEmployers` (new in `economy/scratch.ts`) refills the one column that starts at −1. The next spawn so finds a new layout. The `agentBytes` fill also zeroes each blob's look, culture, birthCulture, customs, homeRegion and nameKey: `spawn/` reads none of them and `addAgent` rewrites every spawned row, so the zeroes never show. Only the stand-in `cultureUid` table, which sits between the two runs, stays.
    3. `world.ground` becomes the request's.
    4. The new town enters. A first visit, a row with no people, writes `firstRecord(world, homes, row)` into its row and advances it by the summary month for each month that began before the day, months 1 to `monthOf(day − 1)`: a month that begins on the day steps the towns away after the switch, and not this one, and day 0 steps none. Then `seatTown` spawns the row, and off a month's first day the month so far is filled in at once, since only that day's systems start a month (below). `focus[0]` becomes the place.
    - The homes and the attachment are checked before the fold, so a throw leaves the live town and every row as they were, and nothing after the checks throws on a row this module wrote.
    - **The month so far** (the review): the row's firms hold at least `firstFirmCash(people)`, the first record's cash, plus ⌊employed × wage × k ÷ 21⌋ for day k of the month, taken from the households and capped at the total, so the first payroll finds its bill covered. A row folded earlier in the month, whose firms hold more, keeps its cash, so a re-entry within the month is exact in everything but this split. `planConsumption` makes the month's plans, and every firm's `demand` counter starts at ⌊`lastDemand` × k ÷ 21⌋, since left at 0 the month's close would hand the next decisions a demand short by k ÷ 21 and the firms would give notice. A month's first day does none of it.
  - **`dayBoundary`'s order:** the inputs in log order, the layoffs summed, then the last focus, then on a month's first day after day 0 `stepAwayTowns(townRecords, focus[0], seed, monthOf(day), recordRow)`, so the town just left steps and the one just entered does not, then the stride's rekey and the window. A layoff logged with a switch hits the town the day opens with.
  - **`spawn/town.ts`** splits `spawnTown` into `firstRecord(world, homes, out)`, which scales `CITY_RECORD` to the homes' beds, or the layout's agent rows if they outnumber them, and `seatTown(world, record, homes, place, day)`, which trims the households with `fitHouseholds`, spawns with `CITY` and starts three in four walking, all under the key `draw2(seed, SPAWN_DRAW, place, day)`. `spawnTown` now builds its record in `recordRow` and sets `focus[0]` to 0.
  - **The hash:** `stateHashExcept` mixes, after the goods store and while the `TOWN` slot is 1, each row with people after `mix(h ^ town)`, and, once any row is held, `mix(h ^ focus[0])`. A skip view that starts where `townRecords` does leaves them out. A town that has never switched holds no row, so `town`, Highcourt's pins, `42/phone`, the economy and the 20 spawn hashes did not move.
  - **A checkpoint** copies the arena, so it carries the table, the live place and, since the review, the pending place (`focus[1]`). The pending ground and homes are not in the arena, so a restored world with a request waiting must `attachTown` them before its next boundary, which throws without them. M6's saves must carry the live place's ground and rebuild the pending one, as the brief's open question 4 says.
  - **The `switch` golden:** `goldens.json` gains `{ seed: 42, tier: 'phone', people: [1000, 600], requests: [[500, 1], [2000, 0]], ticks: 3000, hash: 'cc4584e8' }` (it was `ce41f094` until the review's mid-month funding). Place p is a stand-in town of `people[p]` beds, place 0 is live at tick 0, and each `[tick, place]` of `requests` asks to enter that place at that tick. The request at 500 lands at tick 1,440, the one at 2,000 at tick 2,880, and the hash at tick 3,000 is day 2's tick 120, past the economy's window. `switchHash(seed, tier, people, requests, ticks)` in `test/engines/checks.ts` runs it, and `checkGoldens` replays it in Node and Chromium: 6 + 20 cases, and 8 + 20 with the review's `away` and `visit` (below).
  - **`apps/web/test/towns.test.ts`** switches one phone-tier world through every settlement of the first 2 standard worlds, 91 places. Each spawn folds back to its first record with the households the day-0 key seats, in people and cents, and MINT holds minus its cash.
  - **Cost:** `dayBoundary` with a switch of 2,688 people takes 5.2 ms on its first call and about 2 ms after, and 0.5 ms for 300 people (measured here, Node 24.18.0 on Windows, a stand-in town on the phone tier, one run, load not recorded). The desktop tier's first takes 7.5 ms and then about 2.2 ms, though its two fills clear 11.4 MB against the phone tier's 1.1 MB.
  - **`test:headless`** gains `node packages/sim-core/scripts/away-rates.ts --check`.
- **Task 4, the worker's switch** (4b71ce3, 2c3068c, 19fc9bd, 6be3c83):
  - **`open`** (`createSimLoop` in `sim-worker/src/loop/loop.ts`) is handled in one turn, so no checkpoint or inspect falls between the request and the switch:
    1. A `place` that is `focus[0]` ends it here. Otherwise `host.readTown(map)` reads the map first, so a bad map's `MapError` leaves the world as it was. Nothing catches it, as in `init`.
    2. `requestTown(world, place, ground, homes, shops)` logs the focus and keeps the request. A false return, for a world that is not a town, a place outside the table, too few beds, shops the layout's fields cannot hold or a full log, ends it here.
    3. `while (world.focus[FOCUS_PENDING] !== NO_PLACE) step(world)` runs the rest of the day at once: no snapshot, no economy message, no timer lap, and the same whether the run is paused or plays at any speed. The switch lands in the step at the next tick that is a multiple of 1,440, the request's own if it is one, which leaves the world one tick later. `running`, `speed` and the clock are untouched, so a playing run's next turn caps its debt at `MAX_GAP_MS`, as after any stall. A town with streets then runs its night too, up to 06:00 (M2.7 Task 4, below).
    4. `Session.feed` becomes a new `createEconomyFeed()`, so the panel's first message after the switch is the new town's first day alone (`days` 1). `feed.ts` itself is unchanged.
    5. The loop posts `opened`, then a snapshot of the new town, which lets a paused page draw it as `init`'s spawn snapshot does. A town with streets has run an economy day in its night, and its `economy` message comes with the first turn after Play.
  - **A request for the live town, or one the sim refuses,** switches nothing and logs nothing: it runs no tick, keeps the feed, and `opened` names the town still live, with the tick unchanged. So every `open` gets one `opened`, and a `place` other than the one asked for means the page stays where it was.
  - **`inspectAgent`** reads a row of the live town through the same `blobReply` as `inspect`, and a row that is not an integer below `world.agents.count[0]` answers `noBlobReply`. After a switch a row below the count is another blob, and one at or past it is nobody.
  - **What the page does** is Task 6's, below.
  - **The warm-up** (`step/warm.ts`): `warmUp()` shares one set of stand-in homes between its spawn and a `requestTown` for `WARM_SWITCH_PLACE` (1) at `WARM_SWITCH_TICK` (100) of its last 2,000 ticks. The request lands at tick 1,440, the way a player's does, and the new town runs 540 ticks. The warm-up still runs after the first snapshot, and `warm.test.ts` checks that it switches once, to place 1 with place 0 left as a row, and that the `switch` golden holds after it.
  - **Cost** (measured here, Node 24.18.0 on Windows, the phone tier with `checks` off, Highcourt's ground live and three villages of the standard world 5EED0001 as the other towns, 3 to 5 runs, load not recorded):
    - An `open` that comes on a boundary takes 4.1 to 4.9 ms for a 3,176-bed village, of which `parseMap` and the homes take 1.6 to 2.2 ms. Before the warm-up switch it took 5.5 to 5.8 ms.
    - The rest of the day costs about 0.02 ms a tick at 2,700 to 3,200 blobs, so a request just after a boundary, with 1,439 ticks to run, takes 28 to 37 ms in all, and one at mid-day about 17 ms. Ruling 6 guessed under 0.5 s on a desktop (inference).
    - The warm-up switch adds about 4 ms to `init`, from a mean 64 ms to 68 ms, and `init` runs it after the first snapshot. The first `open` with a full day to run took 42.5 to 43.7 ms before it and 35.8 to 36.5 ms after.
  - **Bytes:** the sim worker chunk measures 17,700 B brotli (55,532 B raw), up from 16,257 B, since Task 3's `spawn/away`, `away-rates` and `switch` joined it along with this task's code. Its limit rises to 18.7 kB. The M0 stand-in for initial JS sums that chunk, so its limit rises to 30.5 kB, a measure of 29,489 B plus 1 kB. Initial JS holds its 35 kB.
  - **Tests:** `loop.test.ts` gains five cases. An `open` at tick 700 leaves the world at tick 1,441 with the new town's blobs and matches a twin that requests at 700, the feed restarts (`days` 1), and no snapshot comes while the day runs. A paused `open` switches and stays paused. The live town and a refused place answer with the live town and log nothing. `inspectAgent` equals `inspect` for the same blob while the run plays, and past the count it answers −1.
- **The determinism review's fixes** (a4064fe, 62d18b7, d15528a, 365a10e, 48e1f0f, e2f04ed), each with its own test. The names and rules they change are in Task 3 and Task 4 above.
  - **A return into too few beds** (a4064fe): `requestTown` refuses it, and `switchTown` checks before it folds. A `?tier=` start spawns 10,000 blobs in stand-in homes, so a visited village and then a return to Highcourt's 2,688 beds used to throw after the fold and the empty, and the next switch folded the wreck over the village's row. In the app the refusal is the `opened` that names the live town.
  - **A mid-month spawn** (62d18b7): the firms' cash and demand are filled in for the month so far, as Task 3 describes. A day-15 spawn's first payroll paid 55.1% of its 131,081,412-cent bill (1,000 people), and with the cash funded but not the demand its unemployment reached 15.7% against a day-0 spawn's 7.7% (600 people). Now both pay in full and neither passes the first record's 7.7%, and a 1,000-person day-15 spawn is at 6.3% at first, 3.7% a month on and 2.4% two months on, against a day-0 spawn's 7.6%, 3.0% and 1.4% (measured here, Node 24.18.0 on Windows, seed 42, load not recorded). The `switch` golden moved to `cc4584e8`.
  - **The pending switch** (d15528a): `focus[1]`, `FOCUS_PENDING`, `attachTown` and `switchTown(world, place)`, as above. No hash moved, since the hash skips the slot as it does the input log.
  - **Goldens** (365a10e): `goldens.json` gains `away`, `{ seed: 42, people: 2688, largestHome: 24, months: 12, row }`, the 14 fields of Highcourt's beds left away through 12 summary months, and `visit`, `{ seed: 42, tier: 'phone', people: [1000, 600], day: 50, hash }`, place 1 entered for the first time by one step at day 50. `awayRow` and `visitHash` in `test/engines/checks.ts` run them, so Chromium reaches `stepAwayTown` for the first time. They moved with the refit below, to `229, 272, 194, 165, 77, 48, 2472, 216, 268, 798803642, 34476357, 3360, 142931, 117290` and `a7bd4005`.
  - **The refit** (48e1f0f): the away fit's lag-1 is corrected for its bias, as the script's line above says. `away.test.ts`'s Highcourt pin moved to the row above.
  - **The hashes:** `42/phone` `746a06a3`, the economy `6a652730`, `town` `8f1f75bb`, Highcourt's `ff861cb3` and `da92906e` and the 20 spawn hashes held.
- **Task 6, live towns in the app** (5d9ca58..d9625f0). Its other names sit in Layout, Places, The town view in `web` and The Town skin, above.
  - **`App`** (`app/app.ts`) gains `opening`, `showTown(map, layout, name)` and `onTown(listener)`.
    - `opening` is true from the page's `open` message to the town's arrival, while a query sent to the worker is answered for the new town.
    - `showTown` swaps the map that the view fits and the renderer draws, fits the camera to it with a camera of its own, and tells the town listeners. The new town's blobs come in its first snapshot.
    - `onTown`'s `TownListener` is `(layout, name) => void`. A new listener gets the last town shown at once, as `onEconomy` does, so a Town skin lent late draws it.
  - **`LiveTown`** (`map/live-town.ts`), which the map view makes once, runs the switch. `HOME_PLACE` is 0, a `TownEntry` is `{ place, name, layout, ground }` with the ground as `.nmap` bytes, and `TownParts` are the HUD's Map button and alert line and the town's view.
    - **Entering:** Enter asks the map worker for the place, and a reply with a ground makes `open(entry)`. It sets `app.opening`, says "Opening <name>…" in the HUD's alert line, and sends the sim worker `open` with the bytes. The map closes. Entering the town already live only closes the map, and Enter does nothing while a switch is under way.
    - **The swap** happens on the first snapshot at or past `opened.tick`, so no frame draws one town's blobs on another's ground. `app.agents` takes `opened.agents`, the alert clears, `showTown` hands over the map and layout, the Town skin calls `setLayout`, and its canvas is labelled "<name>, with every agent as a blob".
    - **A refusal** is an `opened` that names another place than the one asked for: the town stays and the alert says "<name> could not be opened." A place the map worker cannot build, or one with no ground, says "<name> could not be opened: <why>" on the map and in the alert.
    - **Away from Highcourt,** `#hud-town`, the town's name in a polite live region, and a "Back to Highcourt" button sit after Map, and hide in Highcourt. The button asks the map for place 0 and enters it as any other.
  - **The blob card:** `mountInspector(hud, view, app)` returns an `Inspector`, whose `at(x, y)` sends `inspect`. `BlobModal` gains `isOpen` and `close()`.
    - An open card sends `inspectAgent` for its row every 1,000 ms, but none while `app.opening` or while an answer is awaited. A refresh queued behind an `open` would be answered for the new town's row, and the worker answers in order. The card updates only from an answer for its own row.
    - It closes on `opened`, because its row means another blob now, and on an answer of −1, when `#inspector` says "That blob is gone".
  - **The economy panel:** `EconomyPanel.restart()` runs when an `opened` names a different place than the last. The figures of the town left give way to the note until the new town's first day ends.
  - **The town view** opens for wonders only, and `walkers.ts` is gone (The town view in `web`, above).
  - **Tests:** `towns.spec.ts` runs six cases in Chromium.
    - A village opens live in the Town skin, one blob to a bed, the panel restarts and reads "Goods on day 1" after its first day, and Back to Highcourt returns its crowd.
    - A town entered before the Town skin arrived is drawn once the skin does.
    - Entering the live town sends no `open`, and a refused `open` keeps the town.
    - A place the map worker cannot build says so, and axe passes in a village opened live.
- **Task 7, the clean-up** (67ae00e): the decorative crowd's last code is gone.
  - **Deleted:** worldgen's `place/walks.ts` (`placeWalks`) and `place/street-crowd.ts` (`crowdedPlace` and `streetCrowd`), `sim-protocol`'s `PlaceWalks` and `PlaceCrowd`, `BuiltPlace.walks`, and the tests that only covered them: `street-crowd.test.ts`, `place-walks.test.ts` and `place-walks-drawn.test.ts`. `placeBuffers` lost their buffers in Task 6.
  - **`buildPlace(ctx)`** returns `{ layout, map }`, and `crowdedPlace` leaves the barrel. The layout is unchanged, so the place goldens, `town.nmap` and Highcourt's pins `ff861cb3` and `da92906e` held.
  - `CROWD` stays for `place.py`'s people. The keys 0x110 to 0x112 and 0x120 to 0x124 that the loops and the crowd drew on are free again.
  - `scripts/time-places.ts` times `buildPlace`, the layout and the ground, so its lines no longer compare with M3.1's baseline, which also timed the loops and the crowd.
  - **Bytes:** the place builder chunk measures 19.06 kB brotli, down from 19.49 kB, against its 20.94 kB limit (measured here, Vite 8.3.3 and size-limit).

## Street link, part 1 (owner: M2.7)

M2.7 Part 1 gives blobs somewhere to buy and eat, as its [brief](../m2-economy/m2.7-street-link-and-the-112-day-year/plan.md) lays out. Each task adds its names here, in its own docs commit.

- **Task 2, premises in the layout** (5aa6991, 884064c, 2e72f8e, 6638e3b, 9d9d673, b12bb3d). Task 7's sprite swap rode with it, since the drawn frames existed, so the goldens and `town.nmap` regenerated once.
  - **`sim-protocol`'s `map/premises.ts`,** behind the new `./premises` export and the barrel. A premises is a shop or stall, or the Smithy, in a place's map, and its frame names what it sells, so the map format holds nothing more.
    - `TRADES` pairs each good (`VEGETABLES`, `FISH`, `MILK`, `BREAD`, `CLOTH`, `TOOLS`, `FUEL`) with the frames that sell it: the three `shop_market-stall_<good>` stalls, `shop_bakery`, `shop_draper_bolts` and `shop_draper_rail`, `work_smithy`, and `shop_fuel-store_shed` and `shop_fuel-store_stack`. `GENERAL_FRAMES` (`shop_general` and `shop_market-stall`) sell every good.
    - `premisesOf(map): Premises[]` gives each premises as `{ entity, goods, doorX, doorY, stall }`, in entity order, which is reading order. `stall` is true for a market stall (Task 4, below). `entity` is its index in `map.entities`, and `goods` a mask with bit g set for each good g from 1 to 7 that it sells, as `EVERY_GOOD` (0xfe) has all seven. Only shop and workplace entities count, since the Smithy is a workplace.
    - **A general shop sells only the goods that no premises of its own trade sells.** So a village's one shop or stall sells all seven, a town's civic `shop_general` sells none and is no premises, unless a trade could not be placed, and then it sells that good. A hamlet has no shop, so no premises.
    - `sellersOf(premises, good): number[]` lists the indexes in that array of the premises that sell a good. A firm row r of the good trades from the (r mod n)-th of its n.
    - `sim-core`'s `kernels.ts` now exports the seven good ids, which `premises.ts` and worldgen import. `.dependency-cruiser.cjs` lets worldgen import `map/premises.ts`.
  - **`worldgen`'s `place/trades.ts`: `placeTrades(site)`.** It runs in `settleBuildings` after the landmarks and works and before the houses, for a town, city or capital only, and its draws are the new key `TRADE` (21, which M3.1's old plan had kept for a trades stage of its own). `placePlaza` places the clock tower and fountain only, and its `STALLS` are gone, so the generic stall leaves towns. `place/frames.ts` gains the nine rows, and `settle` takes a sprite's own `door` through `doorOffset`, which is the middle of the front where the manifest has none.
    - **The several-buildings rule** (owner, 11 October 2026): each market trade (vegetables, fish and milk) gets 2 stalls, and each shop trade (bread, cloth, tools and fuel) gets 4 shops in a capital or city and 3 in a town. They are placed in rounds, round r giving every trade its r-th building first, so a place with little room gives each trade one before it gives any a second. Highcourt has 22 premises: 2, 2, 2, 4, 4, 4 and 4. The counts keep a capital's firm rows (268 at Highcourt, a tenth of its beds, shared by each trade's share) to about 6 a stall and 3 to 18 a shop (computed).
    - **Stalls** stand on the plaza near its ends, which take stalls in turn, the first at the end the clock tower isn't, or else just off it near its top middle with the door on a street. **Shops** aim for the building's sector of the eight round the plaza, half way from its middle to the wall ring: trade t starts at sector 3t mod 8 and its n shops fall 8 ÷ n sectors apart, moved by a keyed wobble of up to 4 tiles across and 2 down. A shop takes the nearest lot whose door lies within 1 step of a street, or else the nearest to the plaza's middle within 3. The Draper and the Fuel Store draw one of their two looks for each building.
    - **No door is hidden:** a lot's front row lies on the map and under no building's image, and no door lies under the image the premises raises. The premises follow the landmarks and works for this, since their images rise 1 to 4 rows. Placed after the civic set but before the landmarks, 12 of 646 premises in 2 worlds had a door under one, all of them stalls (measured here); placed after them, 0 of 2,046 in 6 worlds do, bar one village's general stall, which is the village code's as before.
    - **Over 6 worlds,** all 27 capitals, 14 cities and 53 towns get every building. All of a capital's and a city's stalls stand on the plaza; 81 of the towns' 318 stand 4 to 12 tiles off it. A village's one shop or 1 to 2 stalls sell every good, and a hamlet has none. No premises door has a prop on it, and tree crowns lie over 15 of 2,046 (measured here).
    - **`groundOf`** gives each new shop frame hours: stalls 06:00–14:00, the Bakery 06:00–18:00, the Draper and the Fuel Store 08:00–20:00, all placeholders. The Smithy has none, as a workplace.
  - **Highcourt's beds fell from 2,688 to 2,600.** The premises took street frontage, which the houses had filled, so it seats 375 homes (320 of 4 beds and 55 of 24, was 387, 330 and 57) and 946 households, and its replay pins moved to `498f12cb` on phone and `4bf399fa` on desktop (The world step, above). `town-homes.test.ts` is re-pinned, and so are `hud.spec.ts` and `worker-map.spec.ts` (2,600 agents), which both passed in Chromium on a fresh build. The `town`, `switch`, `visit` and `away` goldens, `42/phone` `746a06a3`, the economy `6a652730` and the 20 spawn hashes held, since they run on stand-in grounds. The away golden and sim-core's `away`, `spawn-town` and `goods` tests keep 2,688 as a parameter, so their word "Highcourt" is now only history.
  - **The goldens:** `place-goldens-v1.json` is written by `packages/worldgen/scripts/place-goldens.ts` (47 s for all 20 worlds, measured here), since `place.py` never laid out premises. 317 of the worlds' 1,033 places moved, all from their `centre` stage on (87 capitals, 47 cities and 183 towns), and so did the 2 pinned towns. No place's `context`, `ground` or `water` print moved, and every village, hamlet and wonder keeps `place.py`'s prints. `place-fixtures.test.ts` checks only the places without premises, and `places-v1.json` stays as it was.
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded, `scripts/time-places.ts`): a capital builds in a median 153.6 ms (was 138.5), a city 141.8 (was 140.7) and a town 92.9 (was 89.3); villages and hamlets are unchanged. The place builder chunk is 19.78 kB brotli (was 19.06) against its 20.94 kB limit, and `town.nmap` is 91,893 bytes (was 91,170), 7.88 kB brotli.
  - **For Tasks 3 and 4:**
    - Fields: one per premises of `premisesOf(map)`, 22 at Highcourt, or 434 KB at 1 byte a cell (computed, where the brief's 7 were 138 KB). A door is `(doorX, doorY)`, a `WALK_DOOR` cell directly below its footprint, never on one, with an open or road cell beside it. The Draper's and the Fuel Store's stack's door is its front's 4th tile, and the shed's its 2nd, so it is not at the middle.
    - Errands: row r of a good trades from `sellers[r mod n]`, where `sellers` is `sellersOf(premises, good)`. A capital or city has n of 2 for each food stall trade and 4 for each other, a town 2 and 3, a village 1 or 2 for every good, and a hamlet none, which keeps `move`. `sim-core` cannot import `sim-protocol`, so the worker calls `premisesOf` and hands the sim the door cells and each row's premises.
- **Task 3, fields and runs** (699a361, 68b72ad). Nothing calls them from the step yet, so every hash held: `42/phone` `746a06a3`, the economy `6a652730`, the `town`, `switch`, `visit` and `away` goldens, the 20 spawn hashes, and Highcourt's `498f12cb` and `4bf399fa`.
  - **`sim-core`'s `street/` folder** holds `fields.ts` and `runs.ts`, behind the barrel. It reads jobs and homes, so the culture wall guards it: `.dependency-cruiser.cjs`, `eslint.config.js` and `culture-wall.test.ts` list it beside `spawn/`.
  - **`buildFields(ground, doors, out): void`** floods one field for each door cell, so `sim-core` never sees the map type. `doors[p]` is premises p's door as `y * width + x`, in `premisesOf`'s order, and field p is `width × height` bytes at `out[p × width × height]`. It runs at a spawn or a switch and never in a tick, and writes nothing for no doors.
    - **It throws a `RangeError`** for a ground past 256 a side or `MAX_FIELD_CELLS` (19,712) cells, a door outside the ground, or more bytes than `out` holds. Task 4 should refuse such a town before its fold, as `homesSeat` refuses one its homes cannot seat.
    - **A field byte** has bit k set when step k closes in on the door. k is the heading ÷ 32: 0 down, then clockwise on screen through left, up and right, so 1, 3, 5 and 7 are the diagonals, and `CELL_DX`, `CELL_DY` and `cellStepOf(k, width)` give the step. 0 (`AT_DOOR`) is the door itself, and 255 (`UNREACHED`) a wall or a cell that does not reach it. A cell keeps every equally short step, not one picked in a fixed neighbour order as the brief had it, so the runs can go straight.
    - **The metric** (ruling): a step to a neighbour costs 1 and a diagonal 2, the two steps it replaces, and a diagonal is open only where both cells it passes between are, so none cuts a corner. At 1 each, the shortest way across a street grid cuts every corner it can, and 520 of Highcourt's 8,250 home-to-premises ways needed over 16 runs even at their fewest, up to 28. At 2 they tie with the straight L, and the most is 15 (measured here). The price is about 11% more walking: 259 ticks a way on average against 232 for the way that takes the fewest ticks (computed, 4 ticks a cell and 5.66 on a diagonal).
    - **Memory:** `World.fields` is a `Uint8Array` of `FIELD_BYTES`, 433,664 bytes, which is `MAX_PREMISES` (22) × `MAX_FIELD_CELLS`: a capital's or a city's 176 × 112 with 22 premises. A town needs 18 × 152 × 96 = 262,656. It is taken last in `layoutWorld`, off `arena.canonical`, so no offset moved and the hash skips it, and a checkpoint carries it. Only a tier's own layout has it: one laid out for fewer agents, such as a test's or the warm-up's, has none, and `buildFields` throws there.
    - **The arena** was 1,633,328 bytes in use on phone and is 2,066,992 of 33,554,432 (6.2%), phone-plus 3,741,856 and 4,175,520 (12.4%), desktop 14,284,328 and 14,717,992 of 67,108,864 (21.9%). So no tier needed a bigger reservation, and Task 4's errand rows (40 bytes: 0.4, 1 and 4 MB, and 48 with the two economy-day columns as built) fit. The flood's scratch, a queue, the distances and each cell's open steps, takes 98,560 bytes at module level, outside the arena, as `move`'s `blocked` list does; each flood writes every byte it reads.
  - **`pathRuns(fields, first, width, from, out, at): number`** takes the fields region, the byte where the premises' field starts (`p × width × height`), the ground's width, the home door cell `from`, and writes at `out[at]`, which may be a blob's row. The brief had `pathRuns(field, from, out)`: a view per call would allocate in a tick, and the field needs the width to step.
    - **The runs** are at most `MAX_RUNS` pairs of a heading, a multiple of 32 that `setHeading` takes, and a length in cells from 1 to 255, in `RUN_BYTES` bytes: 16 pairs and 32 bytes when built, 32 and 64 since M3.1's Part 4 (below). A path of fewer runs leaves the rest 0, and a 0 length ends the list. Walked forward they lead from `from` to the door. Walked backward, last run first and each heading plus 128, they lead from the door home, so no home needs a field.
    - **It returns** the run count, 0 when `from` is the door, or `NO_PATH` (−1) for a wall or a cell cut off from the door, or `TOO_FAR` (−2) for a way of more than `MAX_RUNS` runs. `out` holds 0s unless it is a count.
    - **From M3.1's Part 4** (Task 23, 6465a2d): `MAX_RUNS` is 32 and `RUN_BYTES` 64, with the same encoding, so `TOO_FAR` means more than 32 runs. The errand row grew from 48 to 80 bytes: 0.32, 0.8 and 3.2 MB more at 10k, 25k and 100k blobs. No tick costs more, since a walker reads one run at each run's end.
      - **The arena** fills 2,868,280 of 33,554,432 bytes on phone (8.55%), 6,178,312 on phone-plus (18.41%) and 22,728,280 of 67,108,864 on desktop (33.87%), from 7.59%, 16.03% and 29.10% (measured here, `layoutWorld`, Node 24.18.0 on Windows). Every tier's reservation still fits, and the state hash and a checkpoint carry the larger store.
      - **The ways:** Highcourt's 8,514 have 149 over 16 runs, none over 32, and the most needs 24. Of the 228,692 ways of the first 2 standard worlds' capitals, cities and towns (with `connect`, Places above), 2,534 are over 16, 1 is over 32 and none is cut off, where Task 3 found 44 and 45 homes cut off in 2 of 6 towns. `apps/web/test/town-ways.test.ts` holds those two limits: no `NO_PATH`, and at most 0.1% `TOO_FAR`.
    - **The choice** at each turn is the straight run that closes in the most, a diagonal cell counting twice, the lowest k at a tie; and a run goes on while the field still has its step. That is cheap, 0.84 µs a path, and an exact fewest-runs search leaves Highcourt's most at 15 too.
  - **Highcourt** (measured here, Node 24.18.0 on Windows, load not recorded): 22 fields of 19,712 cells take all 433,664 bytes, in about 9.7 ms once warm (1 ms of it the ground's open steps) and 19 ms the first time in a process. Of its 8,250 ways none is cut off or over 16 runs, the most is 15 and the mean 4.9. A way is 64.6 cells and 259 ticks on average, 432 at the 90th percentile and 632 at most.
  - **Elsewhere,** in 4 capitals, 4 cities, 6 towns, 4 villages and a hamlet from the first two worlds of 5EED0001 (measured here, the fields built in 0.3 to 18 ms):
    - **Runs:** the most is 16 in a capital and a city, and 73 of the 63,888 ways of the capitals and cities (0.1%) need more than 16 and are `TOO_FAR`, 69 of them in one capital. An exact search would leave 6 of those.
    - **Cut off:** 2 of the 6 towns have 44 and 45 of their 226 and 239 homes cut off from every premises (`NO_PATH`), the first behind a river with no crossing in the ground. That is the layout's, not the fields', so Task 4 must give such a home no trip and expect it.
  - **For Task 4:**
    - Build with `buildFields(world.ground, doors, world.fields)` at `spawnTown` and again in `switchTown` after `world.ground` is replaced. A switch leaves the old town's fields where they were, so a town with no premises must not read them.
    - A trip is `pathRuns(world.fields, p × width × height, width, homeDoor, runs, at)` at a departure, and `NO_PATH` and `TOO_FAR` both mean no trip. Keep the runs in the blob's row and walk them back to come home.
    - **The walk is long:** 259 ticks a way on average and 632 at most at Highcourt, where the brief guessed 120 to 240, since a firm row's premises does not lie near the homes that buy from it. So the commute and the evening trip will not all fit; the brief's count of trips skipped after 19:00 measures it.
- **Task 4, errands** (093cd98, 1ae12d6, ce26e1e, 20f0e03, 8067322, 37e9c24): blobs walk to work and to the shops they bought from, carry the good home and eat it.
  - **The errand store,** `street/errands.ts`: `createErrands(arena, agents, firms): Errands` takes a row for each blob, in columns at the arena's end after `fields`, so no offset moved. A row is 80 bytes (48 when built, before M3.1's Part 4), so the store is 0.8, 2 and 8 MB at the tiers' 10,000, 25,000 and 100,000 blobs (computed).
    - **`dayFood` and `dayGoods`** (`Int32Array`) hold the firm row + 1 of the first food firm, and of the first goods firm, the blob bought from today, or 0. `buyPortions` in `consumption/food.ts` and `buyFrom` in `consumption/shop.ts` write them as the sale is made, and `openDay` clears both for every blob on each day's first economy tick. So money still moves at the economy tick (Ruling 2): the trip is the sale's visible consequence, later the same day. Every world writes them, and only a town with streets hashes them.
    - **The trip's columns:** `phase`, `good`, `shop` (the trip's premises, an index in the town's shops) and `run` (`Uint8Array`s), `endTick` (`Int32Array`, absolute: the tick the phase ends, and for a walker the end of the run it is on) and `runs` (`RUN_BYTES` a blob, `pathRuns`' pairs from home to the premises).
    - **`keeper`** names the blob + 1 behind each of the 22 premises' counters. A name whose blob has left, or gone to another premises, is stale and ignored.
    - **The hash** covers the columns from `dayFood` to `keeper` (`byteOffset` and `byteLength`). After them, outside it, come `shopDoorX`, `shopDoorY` and `shopStall` (22 each), `firmShop` (a byte for each firm row: its premises + 1, or 0), all written when the streets open, and `bytes`, a view of the whole store that `closeStreets` zeroes.
  - **The phases.** A trip's purpose is `PURPOSE_WORK` 0, `PURPOSE_FOOD` 1 or `PURPOSE_GOODS` 2, and a phase adds it to its base where it has one.
    - Indoors: `PHASE_ASLEEP` 0 at home until `endTick`; `PHASE_LEAVING` 1 + purpose, a trip planned with its runs in the row, until the tick the blob sets out; `PHASE_WORKING` 4 inside the employer's premises.
    - In the open, still: `PHASE_KEEPING` 5 behind a stall's counter; `PHASE_BUYING` 6 at a premises' door, for `BUY_TICKS` (10); `PHASE_EATING` 7 on its own doorstep, for `EAT_TICKS` (24).
    - Walking, from `FIRST_WALKING` (8): `PHASE_GOING` 8 + purpose out along the runs, and `PHASE_COMING` 11 + purpose home along them backward.
    - `indoorsIn(phase)` is true up to `PHASE_WORKING`, and `carriedIn(phase, good)` gives `good` while the blob walks home with food or goods and while it eats, and 0 otherwise: one icon for a good, whoever carries it.
  - **The timetable as built** (`street/timetable.ts`; Ruling 3's first draft is amended to match). Ticks are minutes, and every time is a keyed draw on `STREET_DRAW` (`AGENT_SALT + 14`, 0x10E) keyed (blob, day, purpose), so no rule reads a look, culture or wallet.
    - **Planning:** a blob wakes at 04:00 + 0 to 119 and plans its day: work if it has a way to it, else a food trip, else a goods trip, else back to sleep till the next day.
    - **Work:** on a workday a worker whose way is 300 ticks or less (`COMMUTE_MAX_TICKS`: 1,538 of Highcourt's 2,402 employed) leaves at 06:00 + 0 to 59, works at its employer's premises, and leaves at 15:00 + 0 to 59. A longer way stays home and shops instead. A commuter shops once, after work, if the trip is home by 22:00, which a long way rarely is.
    - **Food and goods:** everyone else makes one food trip, to the premises of the first firm it bought food from today, from a keyed tick from 06:00 over 240 ticks, or over what the day leaves when the trip's length leaves less. A rest day adds a goods trip after the meal, if it fits. A blob that bought no food but bought goods makes that its trip.
    - **Every trip is home by 22:00:** it starts only if its way there and back, the 10 ticks at the door and the 24 of eating fit before then. The brief's 19:00 cut-off is gone, and the streets are empty from 22:00 to 06:00. A trip that does not fit is not made.
    - **At the door** the blob stands at a keyed point of the door's tile, facing up, for `BUY_TICKS`, then walks home with the good. At home it stands at a keyed point of the home door's tile, facing down, and eats for `EAT_TICKS`, then goes in.
    - **Stalls:** the first worker of a stall to arrive stands at (doorX, doorY − 1), in the open (`PHASE_KEEPING`), until it goes home; every other worker goes indoors at the door (`PHASE_WORKING`).
    - **A home with no way** to a premises, cut off or over 32 runs, makes no trip, and the blob stays indoors.
    - **Highcourt, day 0:** at 06:00, 1,538 blobs are set to work, 993 to a food trip, 59 to a goods trip and 10 stay home. 1,891 are walking at 07:30 and 1,688 at 10:00, and at 10:00 the snapshot has 885 indoors, 73 carrying a good and 3 eating (measured here).
  - **The step** (`street/walk.ts`, `street/motion.ts`): `walkStreets(world)` runs in `move`'s place while `globals[STREETS]` is 1. A blob that is not walking waits for its `endTick`, and a walker adds its heading's step and, at the end of a run, snaps to the centre of its cell and takes the next run. There is no wall check, since `pathRuns`' ways lie over open cells. `runTicks(k, length)` rounds up: a cell takes 4 ticks, and 5.66 on a diagonal. It writes only blob rows and its own columns, never money, stock or an economy row, and allocates nothing.
  - **`STREETS`** is slot 7 of `globals`: 1 for a town with premises, 0 for one that wanders. The hash mixes the errand store in after the goods store while it is 1, so the goldens held: `42/phone` `746a06a3`, the economy `6a652730`, `town` `8f1f75bb`, `switch` `cc4584e8`, `visit` `a7bd4005`, the `away` row and the 20 spawn hashes, since none runs with shops. The brief's rule, the `TOWN` slot, would have moved them, and a stand-in town or a hamlet would have hashed a store it never writes.
  - **Opening and closing:** `street/open.ts`. `createStreets(world, shops)` builds the fields (`buildFields`), copies the shops' doors and stalls, gives each firm row its premises, sets `STREETS` and puts every blob to sleep until a keyed minute of today's planning window. Row r of a good, counted from the good's first row, trades from the (r mod n)-th of the n shops that sell it, as the brief had it. A good no shop sells has none, and its rows make no trips. `closeStreets(world)` zeroes the store and clears `STREETS`, which `switchTown` calls when it empties the town. `streetsFit(world, ground, shops)` asks whether the fields fit, which `requestTown` and `switchTown` check before they fold the live town. `streetsAsleep(world)` is true while `STREETS` is 1 and the minute of the day is before 06:00.
  - **The shops** (`street/shops.ts`): `ShopSite { doorX, doorY, goods, stall }`, `createShops(sites): Shops` (parallel columns), and `NO_SHOPS`. `sim-protocol`'s `Premises` has a `stall: boolean`, true when the frame starts `buildings/shop_market-stall` (ce26e1e), so a `Premises` is a `ShopSite` and the worker hands `premisesOf(map)` straight over. `createTown(seed, tier, ground, homes, shops = NO_SHOPS)`, `spawnTown`, `seatTown`, `requestTown` and `attachTown` take the shops, and `World.request.shops` keeps them for the boundary. A town with no shops still wanders: `startWalking`, three in four blobs.
  - **The worker** (20f0e03). `worker.ts` builds `createShops(premisesOf(map))` for `createTown` at `init` and for `readTown`, whose `TownSite` has an optional `shops` that the loop hands to `requestTown`. A `?tier=` start, which sends `agents`, is a stand-in town with no shops, so the perf specs, the bench and the CLI still run `move`.
    - **The opening hour:** `init` and a real switch run the worker's `beforeFirstView` up to `FIRST_VIEW_MINUTE` (420, 07:00), with no snapshot, as a switch runs out a day (9f4e1a5). So a town first shows its morning rush, with 1,793 of Highcourt's 2,600 out, not the empty streets of 06:00. `streetsAsleep` is gone from sim-core, and the timetable's `OPENING_MINUTE` 360 stays. `init` runs it before `ready`, so the first snapshot is the morning. A request for the live town, or one the sim refuses, runs none, and neither does a world that wanders.
    - **The feed:** the night holds a day's economy window, so the loop writes that day's row into the feed as a turn would and marks the feed due, in `init` and in a switch (`feedDue` now lasts from a turn to the turn that posts it). The first turn after Play posts the `economy` message, so the panel reads "no days yet" while the page is paused, as before, and does not wait a day for its first row. A switch to another town drops the old feed's waiting row with the feed.
  - **Fast nights** (37e9c24) are in Worker messages, above.
  - **The visual word:** Snapshot v1, above (Task 5).
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded, seed 42, `checks` off). On Highcourt's ground with 10,000 blobs in stand-in homes, over 3 days after a warm-up day, the whole step takes a mean 0.078 ms a tick, and 0.064 with no shops. It takes 0.085 ms from 06:00 to 22:00 (0.062), and its worst tick outside a day's first 120 is 0.255 ms (0.131). `walkStreets` alone is a mean 0.077 ms, 0.121 in the planning window from 04:00 to 06:00, where its worst tick is 0.248. The first 120 ticks of a day, where the economy runs, peak at 1.73 ms (1.50). All of it is far inside the 5.3 ms a tick at 10,000.
    - **The opening hour:** Highcourt's `createTown` takes 32 to 34 ms with its shops, 12 ms without, the 22 fields being the difference. The 360 ticks of the night take 19 to 20 ms (24 for a wandering town), so the worker's `init` posts `ready` at 54 ms, where it posted at 15 to 16 ms, and returns from the warm-up at 100 ms, where it took 71 to 73. At 10,000 blobs the night takes 48 to 54 ms (47) and `createTown` 43 ms (23).
  - **Highcourt's pins** were `cca95710` and `a9f09068` here (The world step, above, gives today's), `town-map.test.ts` having moved to the shops path. `errands.test.ts` runs 4 cases on Highcourt: a food buyer's whole trip (leaves, reaches its premises' door, buys for 10 ticks, carries the good home and eats it for 24); a worker's day (arrives at its employer's door, or behind a stall's counter, within 300 ticks of setting out by 06:59, leaves from 15:00 to 15:59 and reaches its door); a replay from a checkpoint taken at 07:30, with over 1,000 blobs walking, which reaches the same hash; and a walled-off home, whose blobs stay asleep all day while the same home's blobs walk in the open town.
  - **A click** finds only a blob on the street: `postInspected` passes `world.errands.phase` to `nearestAgent` while `STREETS` is 1 (Ruling 6), so a blob indoors is skipped. The card's refresh by row, `inspectAgent`, is not affected, so an open card follows its blob indoors.
  - **The coin bubble and the card** (fc16716, c2c4df5): `EMOTE_COIN` marks a buyer at the counter. `inspected` gains `bought: Purchase[]`, where `Purchase = { good, firm }`, read from `errands.dayFood` and `dayGoods` with food first. The blob card shows "Bought today: Bread at Bakery 12" or "Nothing yet".
- **Task 6, the drawing** (43b39bc, ed4542f, 5c6fdde): blobs carry the good they bought and eat it on screen, and a blob indoors is drawn by no skin. The names sit with their owners: `hold` and `eat` in Sprite manifests, `AtlasFrame` in The map scene, `PlacePeople`, `ITEM_GOODS` and the draw order in Places, and `Retained`'s `tick`, the Town skin's street columns and the dots' indoors skip in The Town skin.
  - The art is `icons/carry_<good>` for the seven goods and `characters/face_chew_<0 or 1>_<down, left or right>`. The place pass's street layers took the shared scene chunks to 6.2 kB, so their limit rose to 7.2 kB (The Town skin, Chunks).
  - Unit tests hold the sprite list to the hold point, the eating loop and the indoors skip. The browser spec `town-street.spec.ts` checks a carrier, an eater and a blob indoors by pixels and hashes in WebGL2 and Canvas2D, and `dots.spec.ts` checks that neither backend draws a blob indoors.
- **Task 8, stock pips** (a962ced..70d3965): each shop and stall wears three beads for its good's stock, and a market stall that holds none draws closed. The names are in The Town skin: `PipSite`, `setPips`, `TownPips` and `withPipFrames` in `@nomos/render-gl/town`, and `App.map`, `stockLevel`, `StockPips` and the mount's feed in `web`. A level is per good, since the feed has no per-shop stock.
- **Task 9, the review's fixes** (8d03710, 01c3718, 4853eda, a1479ab): findings 1, 3 and 4 of the Opus review. No hash moved: `42/phone` is `746a06a3`, the economy `6a652730`, and Highcourt's `cca95710` and `a9f09068` hold on the town map as committed.
  - **The `streets` golden** (finding 1): `goldens.json` gains `{ seed: 42, tier: 'phone', people: 1000, saved: 450, ticks: 1000, hash: '8e96a7c7' }`.
    - `streetsHash(seed, tier, people, ticks)` steps `streetTown(seed, tier, people)`. `restoredStreetsHash(seed, tier, people, saved, ticks)` steps it to `saved`, restores a twin from its checkpoint and steps that on. `checkGoldens` checks both against the one hash, so Node and the Chromium engines spec run 2 more cases: 10 + 20 in all. Chromium matched.
    - **The town** is `test/engines/street-town.ts`: a 72 × 48 ground of 4 × 4 blocks of building 8 tiles apart, never `town.nmap`, so worldgen cannot move the hash. Its shops, in `createShops`' order, are a general shop that sells all seven goods, a shop of bread, cloth, tools and fuel, and a stall of vegetables, fish and milk. Each door lies on the street just below a block.
    - **Mid-trip:** day 0 is a workday and the run starts at tick 0, so the night comes first. At tick 450 (07:30) 824 of the 1,000 blobs are walking and the stall has its keeper, and by tick 1,000 every phase has been visited, with 743 walking home from work (measured here). A test holds the checkpoint to that.
    - **What a restore must carry:** a twin that loses the fields, the shops' doors or the firm-shop column diverges from the live town. One that loses the stall flags does not, since the keeper stands at its counter by tick 450 (measured here).
  - **The bench's street world** (finding 1): `createStreetBenchWorld(tier)` makes the tier's whole crowd a town with three shops on an open 176 × 112 ground, all selling every good and one a stall. It is in `tools/bench/src/compute/`, with `street-town.ts` beside `sample.ts`.
    - `alloc.ts` runs it after the stand-in town's days and holds day 1, `STREET_ALLOCATION_DAYS`, to the plain day's limit of no scavenge and 16 KiB. The young generation grew 4 to 8 KB at 10,000 blobs, 5 KB at 25,000 and 6 to 9 KB at 100,000, and 3 to 4 KB on the two rest days at 10,000 (measured here, Node 24.18.0 on Windows, load not recorded).
    - **The budget and perf samples** still run the stand-in town. Against the same rows, the street world's `snapshot` day mean is 0.17, 0.56 and 2.25 ms at the three tiers, where the rows' limits (+10%) are 0.11, 0.22 and 0.66, and the stand-in's is 0.04, 0.10 and 0.41. The difference is the second pass `addStreet` makes. `move`, which times `walkStreets`, passes at 0.075, 0.18 and 0.73 ms against limits of 0.11, 0.275 and 0.88 (measured here, same machine). So sampling it needs a ruling on the street snapshot, or a cheaper pass, and waits.
  - **`drawBelow3` for the spots** (finding 3): `startBuying` and `startEating` in `street/timetable.ts` draw their spot with `drawBelow3(…, 1 << 24)`, the 24 bits `placeAtSpot` reads, in place of a whole `draw3`. A draw of 2^31 or more is a heap number in a tick. A street day at 10,000 blobs took 135 KB of the young generation before and 4 to 8 KB after (measured here).
  - **`attachTown`'s shops** (finding 4) are a required argument. A restore that left them out spawned a town with `STREETS` 0 and no error. `requestTown`, `createTown`, `spawnTown` and `seatTown` keep `shops = NO_SHOPS`, since a stand-in town has none.
  - **A trip's start** (finding 2, 2ff6ad2): `startOf` in `street/timetable.ts` takes the tick after the planning tick as the earliest, `Math.max(tick + 1, …)` as `startWork` does, since `afterWork` and `afterFood` plan after `walkStreets` has passed the blob. A draw of 0 used to set a blob off a tick late, so a trip could end at 22:01. `startOf` and `NO_START` are exported for `trip-start.test.ts`. It moved the streets golden from `8e96a7c7` and Highcourt's pins, which Task 23 re-pinned together with the 64-byte run rows: the golden is `2ac77dfd`, and Highcourt's replay `051f68bc` on phone and `bcced27a` on desktop. `42/phone` `746a06a3` and the economy `6a652730` held.

## Lives of their own (owner: M3.2)

The owner asked on 12 October 2026 for blobs with lives of their own. M3.2's [brief](../m3-city-life/m3.2-daily-routines/plan.md) (8aafff7) plans these names. Task 2, sites and legs (6e4f2dd..27ec498), Task 3, the life store and free time (4bc3acc..d42ca67), Task 4, chats (989e823..d7b3597), Task 5, drawing (cc7d654), and Task 6, the card (f39be12..8932f38), build the lines marked built, and the rest is not built yet.
- **The life store (built, Task 3),** `life/store.ts`, sits at the arena's end, so no offset moves. It is hashed after the errand store and only while `STREETS` is 1, so only Highcourt's pins move. Task 3 builds 20 bytes a blob, 16 of them hashed, Task 4 adds 8 and the chat mailbox, and Tasks 7 and 8 add the rest of the plan's 72. The hashed columns are:
  - `needs`, `NEEDS` (4) `Uint16` levels a blob at `i * NEEDS + NEED_*`, from 0, met, to 65,535 (`NEED_HUNGER` 0, `NEED_REST` 1, `NEED_FUN` 2, `NEED_COMPANY` 3), and `settleTick`, the `Int32` tick they last settled;
  - the traits `sociable`, `homebody` and `restless`, a byte each, and `reason`, a byte that is `REASON_NONE` 0 or the need + 1 that drove the blob's free-time choice (the card's "wants company");
  - `crowd`, an `Int32` for each of the `MAX_SITES` sites: the blobs standing in it now, counted at the plaza and the greens;
  - (Task 4) `chatUntil` and `chatWith`, an `Int32` a blob each: the absolute tick its last chat ends and its partner + 1, which stay after the chat so nothing clears them, and the mailbox, `mailBlob` and `mailTick`, `MAIL_CELLS` (5,057) `Int32`s each (Chats, below).

  Outside the hash are each site's covered ground, `areaX`, `areaY`, `areaW` and `areaH` (an `Int32` a site, from a `ShopSite`'s optional `x`, `y`, `w` and `h` through `Shops.areaX` and the like, or the door's tile alone), `due` and `dueCount`, the blobs `walkStreets` found free this tick, which is empty between ticks, and `tally`, three `Int32`s of what the last pass of the chat system did. `bytes` is the whole store, which `closeStreets` empties with the errand store. The hashed region is 280,592 bytes at 10,000 blobs (was 160,128), and the arena fills 3,436,640 of 33,554,432 bytes on phone (10.24%), 7,241,672 on phone-plus (21.58%) and 26,266,640 of 67,108,864 on desktop (39.14%) (measured here); the polish's `seat` and `holds` (below) make them 340,304, 3,496,352 (10.42%), 7,361,384 (21.94%) and 26,686,352 (39.77%). `host`, the day's purchases and portions, and the six friend slots are not built, and the leg's end cell is the polish's `seat`.
- **Streams (built, Task 3):** `TRAIT_DRAW` (`AGENT_SALT + 15`, 0x10F), drawn at birth in `spawn/spawn.ts` as `draw1(seed, TRAIT_DRAW, id)`, one word whose three low bytes are the traits, and `LIFE_DRAW` (`AGENT_SALT + 16`, 0x110), keyed (blob, tick, purpose), for the pick among a blob's top three options, how long a stay lasts, and the spot and facing a blob stands with, and (Task 4) how long a chat lasts, purpose 6 keyed (the looker, tick), and (the polish) which tile of its home's front a blob sits on, purpose 7. A town opens with each blob's fun and company at a keyed 8,192 to 40,959, so its first day is like any other.
- **Phase and activity (built, 4bca777):** `phase` says where and how a blob is, and the new `activity` byte says why, so M2.7's purposes leave the phase.
  - **`activity`** is a column of the errand store in `street/errands.ts`, hashed with it: `ACTIVITY_SLEEP` 0, `ACTIVITY_WORK` 1, `ACTIVITY_FETCH` 2 and `ACTIVITY_EAT` 3. `sleepUntil` sets sleep, `setOffAt` work or fetch when a trip is planned, and `startEating` eat. The errand row is 73 bytes, and the store 810,088 hashed bytes at 10,000 blobs.
  - **The phases** are `PHASE_ASLEEP` 0, `PHASE_LEAVING` 1, `PHASE_WORKING` 2, `PHASE_KEEPING` 3, `PHASE_BUYING` 4, `PHASE_EATING` 5, `PHASE_GOING` 6 and `PHASE_COMING` 7, with no purpose added to a base. `indoorsIn` and `FIRST_WALKING` read as before, and `carriedIn(phase, good)` needs only the phase and the good, since a worker walking home holds none. Lines above that cite phases 8 + purpose or 11 + purpose record M2.7 as built.
  - **Task 3 adds free time** to both lists: `ACTIVITY_STAY` 4 (indoors at home), `ACTIVITY_DOORSTEP` 5 (out on its door tile), `ACTIVITY_PLAZA` 6 and `ACTIVITY_GREEN` 7 (an outing, there and home), and `PHASE_STAYING` 6, a post outdoors at the doorstep or a site, between `PHASE_EATING` and the walking phases. So `PHASE_GOING` is 7, `PHASE_COMING` 8 and `FIRST_WALKING` 7. Every user names the constants, so nothing else moved; the errand store's hashed bytes are the same size.
  - **`PURPOSE_WORK`, `PURPOSE_FOOD` and `PURPOSE_GOODS`** stay in `errands.ts` as the kinds of trip the timetable plans, for its start spreads and spot draws. A row keeps the purpose as its activity, and a fetch's good, food or not, tells a food trip from a goods trip, as `wake` already read it.
  - **Same trips at the same times:** the hash of everything but the errand store, taken at eight ticks up to 10,000 (seven days, with rest days) on the streets golden's town and on Highcourt, is the same before and after (measured here). The step takes a mean 0.081 ms a tick at 10,000 blobs on Highcourt's ground either way (Node 24.18.0 on Windows, load not recorded).
  - **Pins:** the `streets` golden moved from `2ac77dfd` to `e6bf62d6`, and Highcourt's from `051f68bc` to `624cfb6e` on phone and `bcced27a` to `87e11b4e` on desktop. `42/phone` `746a06a3` and the economy `6a652730` held.
- **Portions:** `buyPortions` writes `dayPortions` beside `dayFood`. The street reads `dayFood`, `dayGoods` and `dayPortions` and never writes them, since money moves only at the economy tick.
- **Sites (built, 6e4f2dd..fecadb8):** the plaza (its fountain, or a village's well), meadow greens and up to 3 water edges. Premises and sites together take up to `MAX_SITES` (32) fields, 631 KB at 176 × 112.
  - **The map carried none of them,** since a fountain is a landmark that makes no entity and a green is meadow like the fields round it (186 meadow patches at Highcourt). So Map v1 gains `ENTITY_PLAZA` 5 and `ENTITY_GREEN` 6 (The binary map, above), and `groundOf` lists them after the buildings. `town.nmap` was regenerated by `packages/worldgen/scripts/town-map.ts`: 99,163 bytes, 72 longer.
  - **`leisureOf(map): LeisureSite[]`** in `map/leisure.ts`, behind the barrel, lists the plaza, then the greens its door can walk to, then up to `WATER_SITES` (3) banks of water at least `WATER_APART` (12) tiles apart, nearest the plaza first. A bank is open ground, not a road or a door, beside a `water` terrain tile. A map with no plaza has no sites. A `LeisureSite` is a `ShopSite` that sells nothing, with a `kind` and the ground it covers (`x`, `y`, `w`, `h`).
  - **Highcourt's seven:** the plaza at (88, 59), in front of its fountain, and the greens at (131, 24), (41, 24) and (132, 19), whose doors lie at their middles, and banks at (44, 59), (47, 50) and (45, 70). With its 22 premises that is 29 sites of 32. `leisureOf` takes 7.5 ms there on a cold start.
  - **`street/shops.ts`** gains `SITE_SHOP` 1, `SITE_PLAZA` 2, `SITE_GREEN` 3 and `SITE_WATER` 4, with `NO_SITE` 0, which `kernels.ts` also exports. A `ShopSite` takes an optional `kind`, `Shops` gains `kind` and `premises`, and `createShops` throws if a premises follows a leisure site. `seatTown` opens streets only when `shops.premises > 0`, so a town of leisure sites alone wanders.
  - **`street/fields.ts`** gains `MAX_SITES`, and `FIELD_BYTES` is 630,784 (was 433,664). `buildFields` and `requireFields` count sites, and `MAX_PREMISES` (22) still bounds the keepers and the stall flags.
  - **The errand store** keeps `siteKind`, `siteX` and `siteY` (32 each, outside the hash; `siteX` and `siteY` were `shopDoorX` and `shopDoorY`), the hubs that legs run to. `sitesOf(errands)` counts the slots with a kind.
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded): Highcourt's 29 fields, 571,648 bytes, build in a warm median 16.5 ms (13.0 at best) and 23 to 26 ms the first time in a process. Its 22 premises' fields took 13.8 ms (10.0) and 18 ms. The arena fills 3,115,512 of 33,554,432 bytes on phone (9.28%), 6,500,544 on phone-plus (19.37%) and 23,425,512 of 67,108,864 on desktop (34.91%).
  - **Wired (Task 3):** `sim-worker`'s `shopsOf` hands `createShops` `[...premisesOf(map), ...leisureOf(map)]` wherever the worker opens a town's streets, so the running app builds a field for each site. A `ShopSite` also takes the optional `x`, `y`, `w` and `h` of the ground it covers, which `Shops` keeps as `areaX`, `areaY`, `areaW` and `areaH` and `createStreets` copies to the life store.
- **Legs (built, 010a974, 3026092):** `street/legs.ts`, behind the barrel, walks between any two cells through a hub's field.
  - **`planLeg(fields, width, height, siteX, siteY, sites, from, to, via, out, at): number`** writes at `out[at]`, as `pathRuns` does, the runs of a leg from the cell `from` to the cell `to`, and returns how many. Walked backward they lead from `to` to `from`, and 0 means the same cell. A failure is `NO_PATH` (every site cuts a cell off) or `TOO_FAR` (a leg needs over 32 runs), with `out` all 0.
  - **The hub** is the site with the least Manhattan sum from `from` to it and on to `to` (`nearestHub(siteX, siteY, sites, fromX, fromY, toX, toY, excluded)`, an end of the leg winning a tie, then the lowest index). Both cells run forward on its field. The second way's cells are stamped in a scratch grid, and the leg follows the first way to its first stamped cell and the second backward from there, so it never goes to the hub and back out. A hub that fails is left and the next best tried.
  - **`via`** forces a hub whose door the leg passes, as an unfetched purchase forces its premises, or `NO_HUB` (−1) lets the least detour choose. A leg to a site, or from one, takes that site as the hub.
  - **`homeCell`** is a column of the errand store, outside the hash, with each blob's home door tile as `y * width + x`. `createStreets(world, shops, homes)` writes it, household by household.
  - **Cost** (measured here, same machine): 1.35 µs a leg between two homes, 0.77 µs from a home to the plaza, where `pathRuns` alone is 0.30 µs. It allocates nothing.
  - **Detours at Highcourt** over the Manhattan length: a home to the plaza averages 1.023 and 1.077 at the 90th percentile (387 homes). A leg between two homes averages 1.249, with a median of 1.059, 1.651 at the 90th percentile and 10.5 at most (4,632 pairs, none cut off or over 32 runs, the most 24 runs). The town's own shortest ways are 1.097 on average and 1.273 at the 90th percentile, so legs average 1.139 times the shortest way and 1.358 at the 90th percentile. 127 legs (2.7%) are over twice the shortest, 123 of them between homes whose shortest way is 40 or less, and 30 of the 82 pairs within 10 of each other.
  - **Not adopted:** a meeting at a cell beside the other way gains nothing (1.249 to 1.242), and the best of the 3 nearest hubs by real length would average 1.081 times the shortest way (1.227 at the 90th percentile), at three times the cost. No waypoint sites are needed for the plaza, greens and water. Task 7's visits to near homes may want the second.
- **Free time (built, Task 3):** `life/`, with the guard lists, `world.life`, `walkStreets` and the timetable.
  - **Parking:** when a blob's trips are done (home from work with no shop trip that fits, home from a shop with goods, after a meal with no goods trip to follow, after an outing or a stay), or it wakes with none, `parkFree(world, blob, tick)` in `life/activities.ts` settles its needs, sets `PHASE_ASLEEP` and `ACTIVITY_STAY` with `endTick` now, and lists it in `life.due`. `walkStreets` lists the due blobs in blob order and resets the list each tick, and `life` chooses for them in the same tick, after `economy`. A tick that skipped `life` would list the blob again, since the row says it is due. `sleepUntil` is bed, and `wake` on an asleep blob plans the day only when its activity is `ACTIVITY_SLEEP`.
  - **The choice,** `decideLives(world)` in `life/choose.ts`:
    - With under `MIN_STAY_TICKS` (30) left to `LIFE_END_MINUTE` (1,290, 21:30), the blob goes to bed. Before 06:00 (`OPENING_MINUTE`) it stays in until then, so the streets stay empty to 06:00.
    - Otherwise it scores four options and a keyed draw weights the best three: staying in, the doorstep, the plaza and the nearest green its cell reaches. A score is a Q16 product `drive × attitude × way × crowd`, with `mulQ16(a, b) = (a * (b >> 1)) >> 15` so no product reaches 2^31. The **drive** is the relief the option's mode brings (`reliefOf(mode, need)`, the negative of its rate), times the square of each need's level, over 2^9, plus the option's floor (staying in has one, so it is never vetoed). The **attitude** is the option's base plus its three trait weights times the trait's distance from 128, over 128, at least 4,096. The **way** is 65,535 less the Manhattan way in ticks times the option's slope, and 0 vetoes an option that cannot be walked out, stood in for 30 ticks and walked home by 21:30, judged by the Chebyshev way at 4 ticks a tile. The **crowd** is a base plus a step for each blob at the site, up to 40.
    - `reason` is the need with the greatest relief times urgency in the chosen option.
  - **The table:** `life/table.ts` holds every rate and weight (below).
  - **The activities,** `life/activities.ts`, all by absolute ticks:
    - *Staying in* keeps the parked state and moves `endTick` on by a keyed 30 to 120 ticks, cut to what is left of the day.
    - *The doorstep* sits the blob on a tile of its home's front (Seats, spots and partners, below; it stood at a keyed point of its own tile before the polish), facing a keyed way, in `PHASE_STAYING` with `ACTIVITY_DOORSTEP`, for the same stay. The snapshot reads it as `ACTION_SIT` (Snapshot v1), which Task 5 draws.
    - *An outing* picks a spot, the tile of the part of the site's covered ground within `CLUSTER_X` (6) and `CLUSTER_Y` (5) tiles of its door (Task 4) that its field reaches and no image hides, with the fewest holders, the first free one from a keyed start (Seats, spots and partners, below; before the polish it was the first tile from the keyed start that its field reached), else its door, and plans the leg from the blob's tile with `planLeg` and `NO_HUB`. A cut-off, over-winding or already-there leg, or one that does not fit 21:30, passes the turn: the blob stays in. Otherwise it holds the spot, and is `PHASE_LEAVING` for a tick and then walks as any trip does. On arrival `startStaying` stands it in the tile it reached in `PHASE_STAYING`, counts it in `crowd`, and sets the stay to a keyed 30 to 120 ticks, cut so that it walks home by 21:30. `endStay` counts it out and walks the leg's runs backward in `PHASE_COMING`, and `arriveHome` parks it again.
  - **Needs** (`life/needs.ts`): `settleNeeds(life, errands, blob, tick)` adds the rate of the blob's mode times the ticks since `settleTick`, clamped. The mode comes from the phase and activity as they stand, so whatever changes it settles first: `sleepUntil`, `setOffAt`, `parkFree`, `startStaying` and `endStay`. `levelAt` gives a need as of a tick without writing, for the card. A meal on the doorstep relieves hunger by `MEAL_RELIEF` (6,400).
  - **The table** (`life/table.ts`). Rates are units a tick of a level of 65,535:

    | Mode | Hunger | Rest | Fun | Company |
    | --- | --- | --- | --- | --- |
    | Bed | −40 | −130 | −45 | −45 |
    | Busy (work, errands, eating) | 20 | 50 | 45 | 35 |
    | Home, staying in | 20 | −30 | 35 | 25 |
    | The doorstep | 20 | 10 | −90 | −50 |
    | The plaza | 20 | 10 | −260 | −220 |
    | A green | 20 | −40 | −260 | −100 |
    | On the way to or from leisure | 20 | 30 | 15 | 10 |

    | Option | Floor | Base | Sociable | Homebody | Restless | Slope | Crowd base | Crowd step |
    | --- | --- | --- | --- | --- | --- | --- | --- | --- |
    | Staying in | 3,000 | 32,768 | 0 | 24,000 | −16,000 | 0 | 65,535 | 0 |
    | The doorstep | 0 | 36,000 | 8,000 | 12,000 | −4,000 | 0 | 65,535 | 0 |
    | The plaza | 0 | 44,000 | 30,000 | −22,000 | 10,000 | 60 | 44,000 | 700 |
    | A green | 0 | 38,000 | 0 | −14,000 | 22,000 | 80 | 50,000 | 300 |

    The trait weights are Q16 for a trait 128 above the mean, so a sociable blob (255) likes the plaza up to 30,000 more than a blob of 128. Hunger is kept simple until Task 8: bed relieves it, standing for the household's meals.
  - **Highcourt on day 0** (a workday, seed 42, 1,720 blobs): 81 blobs stand in the plaza at some point (10 by 14:00 on 10 distinct tiles, the first at 12:04 and the last at 20:17, with up to 18 there at once, at 19:00), 84 in a green (7 by 14:00, the first at 08:48, with 34 across the greens at 19:00), and 1,304 on their doorsteps (29 by 14:00). On a workday there are 66 to 91 plaza arrivals, 89 to 101 green arrivals and about 1,480 to 1,570 doorstep sits; on a rest day 106 to 122 plaza and 116 to 126 green arrivals, the plaza's peak being 17:00 to 19:00. The free pool is small before the evening, since most workers are away until 19:00 and the food trips take 8.6 hours on average. Nobody is free after 21:31 (before Task 4's chats, which use the half hour to 22:00), everyone is in bed at home at 22:01, and nobody is out before 06:00 (measured here over 8 days at seed 42 and 6 at seed 7).
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded): on the street bench world, now with a plaza and a green, `life` takes a mean 0.0100 to 0.0104 ms a tick at 10,000 blobs (0.0165 on a cold day 0) and 0.0243 to 0.0252 ms at 25,000, with 3.6 decisions a blob a day, and `move` 0.074 and 0.186 ms. Steady state allocates 3 to 6 KB of the young generation a day, where days 1 to 3 take up to 18 KB while V8 compiles the new code (the stats call is 3 KB of any figure). The gate therefore measures the street world on day 4 (`STREET_ALLOCATION_DAYS`). `warmUp` still has no street town (M2.7 backlog), which would calm days 1 to 3. The worker bundle grows by about 7.9 kB raw and 2.9 kB brotli (esbuild, minified), against a 22 kB limit on its chunk.
  - **Pins:** the `streets` golden moved from `e6bf62d6` to `a1f32ea6`, with a plaza and a green added to its town, and Highcourt's, built with its leisure sites as the worker builds it, from `624cfb6e` to `28396a06` on phone and `87e11b4e` to `4682f885` on desktop. `42/phone` `746a06a3` and the economy `6a652730` held.
- **Chats (built, Task 4, 989e823..d7b3597):** `street/chat.ts`, behind the barrel, pairs blobs through a per-cell mailbox. `pairChats(world)` runs in `step` after `life`, while `STREETS` is 1.
  - **The mailbox** is in the life store, hashed: for each 2 × 2-tile cell of the ground, at `(tileY >> 1) * ((width + 1) >> 1) + (tileX >> 1)`, the blob + 1 that last looked there and found no one (`mailBlob`) and the tick it looked (`mailTick`). `MAIL_CELLS` holds the most cells an allowed ground has: 5,002, on 81 × 243 tiles (computed over every size `buildFields` takes).
  - **Lookers:** from 06:00 to 21:00 each tick, the blobs with `(i + tick) & 3` equal to 0 are visited by a loop that steps by 4, so a quarter of the blobs and each blob once every 4 ticks. A blob looks when it is free and out, not in a chat, and lonely: out is `PHASE_STAYING` or a walking phase with an activity of `ACTIVITY_DOORSTEP` or later, so never work, a fetch or a meal, and lonely is its company need as of now (`levelAt`) plus 94 for each point of `sociable` over 36,000 (`LOOK_STEP` and `LOOK_BASE` in `life/table.ts`). A blob of 255 looks from a need of 12,030, and one of 0 from 36,000. It reads no look, culture or wallet.
  - **Pairing:** the looker reads its cell's waiter. A waiter other than itself that looked within `WAIT_TICKS` (32) ticks and is free, out, not in a chat and within 1.5 tiles (6,144 in Q8, squared in int32) is the one exact check a look makes, so the cap `MAX_NEIGHBOURS` (16) is never near. If the evening leaves room, the two chat, and the cell is emptied. Otherwise the looker takes the cell and waits there. A waiter stays open for half an hour after it last looked: at 8 ticks Highcourt had 131 plaza chats on day 0 of ten seeds, at 32 it had 160.
  - **The chat:** its length is `CHAT_MIN_TICKS` (20) plus a keyed 0 to 40, `LIFE_DRAW` purpose 6 keyed (looker, tick), cut to what leaves both blobs home by 22:00. Both blobs settle their needs and ease their company by `length × 250` (`CHAT_RELIEF_PER_TICK`) in one lump, take `chatUntil` of `tick + length` and `chatWith` of the other + 1, halt facing each other along the longer way between them, and have `endTick` moved on by the length: a stay ends later, and a walker's run ends later, since a walker has no step while `tick < chatUntil`. `walkStreets` sets a stopped walker off again with `resumeRun` in the step of tick `chatUntil`, one comparison a walker a tick, and it arrives exactly the chat's length late. Before the pair halts, a partner that stands steps to a tile from the other, and walkers who stand too close do not chat (Seats, spots and partners, below).
  - **The evening:** no chat starts from 21:00 (`CHAT_LAST_MINUTE` 1,260). A chat is cut so that neither blob is home after 22:00 (`NIGHT_MINUTE`, exported from `timetable.ts`), and one cut under 20 ticks does not start. `dueHome` is the tick a blob is home if nothing delays it: a doorstep stay's end tick, a stay in a site its end tick and the way home, a walker home its run's end tick and the runs left, and a walker out its run's end tick, the runs left, a tick at the site (the least `startStaying` leaves it) and the way back. So a choice that ends by 21:30 may use the half hour that leaves. After 21:30 some blobs are out because a chat delayed them (570 to 600 at most on seeds 42, 7 and 3), the last go in at 22:00, and everyone is in bed at home at 22:01 (measured here over 4 days of those seeds).
  - **The tally:** `life.tally` says what the last pass did: `TALLY_LOOKED` blobs looked, `TALLY_CHECKED` the most candidates one look checked (1) and `TALLY_PAIRED` chats made.
  - **Plaza spots (aaf51f4; the free tile first since the polish, below):** a spot at a plaza or a green is a keyed tile within `CLUSTER_X` (6) tiles across and `CLUSTER_Y` (5) up or down of the site's door (`life/activities.ts`), so Highcourt's plaza, 28 tiles wide, gathers its blobs in front of the fountain. Over day 0 of ten seeds that gave 160 plaza chats where the whole plaza gave 98.
  - **Highcourt on day 0** (a workday, seed 42, 1,720 blobs): 767 chats, from 11:00 on (1, 1, 5, 5, 10, 26, 88, 145, 257 and 229 in the hours from 11:00 to 20:00) and none from 21:00. 662 are between two blobs on their doorsteps and 28 between a doorstep and a walker, 51 between two walkers, 18 between a walker and a blob on the plaza and 2 on it, and 5 between a walker and a blob on a green and 1 on one. The first plaza chats are at 13:05 and three fall before 14:00 (Task 6's spec watches for one). 1,074 blobs chat, 700 once, 297 twice and 77 more often, and the busiest talks 170 ticks in 4 chats. Over the day the quarter-of-blobs rule means at most 107 look in a tick, 15,430 looks in all.
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded, the street bench world): `chat` takes a mean 0.0165 to 0.0169 ms a tick at 10,000 blobs (the worst tick 0.065 to 0.076) and 0.0419 to 0.0435 ms at 25,000 (worst 0.17 to 0.22), beside `life` at 0.0091 to 0.0095 and 0.022 to 0.023 and `move` at 0.077 to 0.081 and 0.198 to 0.205. The street world's young generation grows 5.8 KB on day 4 at 10,000 blobs and 8.3 KB at 25,000 (3.4 to 6.7 KB on later days), with no scavenge. The worker's chunk grows to 25.10 kB brotli from 24.13, against its 22 kB limit.
  - **Pins:** the `streets` golden moved from `a1f32ea6` to `22af632a`, which a twin restored at 07:30 matches, and Highcourt's from `28396a06` to `4db351f9` on phone and `4682f885` to `ba53250f` on desktop. `42/phone` `746a06a3` and the economy `6a652730` held.
- **Seats, spots and partners (built, 12 October 2026, owner request after the lives screenshots; 56f35f7..20cfa32):** blobs spread over the ground, a chat's partners stand a tile apart, and a sitter who chats keeps sitting.
  - **The cells a blob holds** (`life/seats.ts`): `Life.holds`, a byte for each cell of the ground (`MAX_FIELD_CELLS` bytes, hashed), counts the blobs that hold the cell as their seat or spot, and is `CELL_HIDDEN` (255) for a cell a site's image hides. `Life.seat`, an `Int32` a blob (hashed), is the cell it holds plus one, or 0. A blob holds its cell from the tick it chooses it, on its way out to a site too, until `endStay` gives it up. `leastHeldCell(holds, grid, base, blocked, width, left, top, across, rows, first)` takes, from the keyed cell `first` on in reading order, wrapping, the first free cell of the rectangle that the grid lets a blob stand on (the walk grid with 0 blocked, or a site's field with `UNREACHED`), else the first of the least held, and never a hidden one. A hold count stops at `MAX_HELD` (254). Both columns sit after the mailbox, inside the hashed life region, so no offset moves.
  - **Stalls:** `Premises` gains the ground its image hides, `hiddenX`, `hiddenY`, `hiddenW` and `hiddenH`, which only a market stall has: the `STALL_RISE_ROWS` (1) row north of its footprint, across its width, its awning's, since the sprite is a row taller than its footprint (48 px on 2 rows of 16; `premises.test.ts` reads `buildings.json` to keep the constant honest). `ShopSite` takes the same four optional fields and `Shops` four columns, and `openLife(life, shops, ground, blobs, tick, seed)`, which gained the ground, marks the cells in `holds`, clipped to the ground, so no spot and no chat step lies there. `sim-worker`'s `shopsOf` passes them with no change, since it spreads `premisesOf`. Highcourt has six stalls and 18 hidden cells. On day 0, 686 of the 9,529 ticks that blobs stood in the plaza or a green (7.2%) were in those rows.
  - **Spots:** the plaza or green spot is the cell of the cluster with the fewest holders, the first free one from the keyed start (`DRAW_SPOT`), and the blob holds it from `startOuting`, when its leg is planned and fits. A blob that holds its cell alone stands at its centre (`startStaying`, `sitOnDoorstep`), so blobs on neighbouring tiles stand a tile apart, and a blob stacked on a held cell at a keyed point of the tile, as before. Holds count the blobs on their way too, and a way averages 259 ticks (4.3 game hours), so a green of 24 tiles can be full with 9 standing in it: 28 held at 18:20 on day 0, when two blobs shared a tile in it. The plaza never had two on a tile that day.
  - **Doorsteps:** `sitOnDoorstep` takes the walkable cell of the 3 × 3 round the blob's `homeCell` (`FRONT_REACH` 1, an awning's cells excepted) with the fewest holders, the first free one from a keyed start (`DRAW_SEAT`, `LIFE_DRAW` purpose 7), else the door's own, so a house with one walkable tile seats its household there, stacked. A wider reach would put a walled home's blobs outside its walls. A big household stacks when its 3 × 3 is held, on the least held tile, so a pile is its overflow. When the stay ends the blob goes back to its door tile before `parkFree`, so the next trip still starts from the tile every leg is planned to.
  - **Chat partners** (`street/chat.ts`): before the pair halts, the blob that stands steps (the looker if it stands, else the waiter if that does). It steps to the point a tile from the other on one of the other's four sides that is a tile it can walk on, that no awning hides, within `STRAY_TILES` (2) of the cell it holds, with the fewest other holders and then the nearest it. If it has none the pair does not chat. So the partners stand exactly a tile apart (4,096 in Q8) along one axis, face each other as `facingTowards` turns them, and are never on one point. A walker never steps, since a step off its way would send it down the wrong tiles, so two walkers chat only from `WALKERS_APART_Q8` (2,048, half a tile) apart, and a walker in a hidden cell, which it cannot step out from under, does not chat there (one chat of Highcourt's day 0 stood in one). The blob that stepped stays there for the rest of its stay, and `endStay` puts it back on its seat or spot, or its door, before it walks or goes in.
  - **The snapshot:** a sitter who chats reads `ACTION_SIT` with `EMOTE_SPEECH` (Snapshot v1). The brief allowed bit 31 for "seated", or the cleanest bit, and no new bit is the cleanest: bit 31 stays free.
  - **`reason`:** `parkFree` clears it. A blob that woke between 04:00 and 06:00 with no trip waited for 06:00 with the evening's reason, which its card read as a want (348 such blob-ticks on day 1, 0 now).
  - **Highcourt on day 0** (a workday, seed 42, 1,720 blobs, before and after; Euclidean distance between blobs out of doors, measured here):

    | | Before | After |
    | --- | --- | --- |
    | At 18:08, out of doors | 1,471 | 1,470 |
    | within 4 px of another | 28.1% | 29.2% |
    | within 8 px | 46.9% | 42.2% |
    | At 20:44, out of doors | 1,271 | 1,241 |
    | within 4 px of another | 32.7% | 13.4% |
    | within 8 px | 61.4% | 23.2% |
    | Doorstep sitters at 20:44 sharing a tile | 91.4% | 14.2% |
    | the most on one tile at 20:44 | 20 | 5 |
    | Chats | 767 | 586 |
    | Median distance between partners | 9.1 px | 16.0 px |
    | Partners closer than 16 px | 90.1% | 3.2% |

    At 18:08 the walkers are the overlap: 380 of the 429 blobs within 4 px of another walk the same roads, and none of these changes moves a walker. The Town skin's lanes (Street-life polish, below) draw them apart. Of the 586 chats, 474 are between two doorsteps, 55 between two walkers, 32 between a walker and a blob in a site, 21 between a walker and a doorstep and 4 more in sites, and every one with a blob that stands is exactly 16 px apart, the walkers' 8 to 24. The chats fell from 767 because sitters on different tiles are seldom within 1.5 tiles of one another, where those stacked on a tile always were. A longer reach (`NEAR_Q8`) would bring chats back. A blob steps at most 2 tiles from its seat: 92% of the seated blob-ticks are on the seat, 7.7% a tile off and 0.08% two (seed 42).
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded, the street bench world, the code before and after run alternately): `life` takes a mean 0.0093 to 0.0096 ms a tick at 10,000 blobs before and 0.0103 to 0.0105 after, and 0.0250 before and 0.0256 after at 25,000. `chat` takes 0.0174 to 0.0175 and 0.0177 to 0.0178, and 0.0456 and 0.0436 at 25,000, and `move` 0.0785 to 0.0792 and 0.0789 to 0.0791, and 0.2053 and 0.1990, which is noise. The allocation gate (`alloc.test.ts`) passes. A seat is found in at most 9 reads and a spot in at most 143, the whole cluster, when it is full; usually the first cell is free.
  - **Pins:** the `streets` golden moved from `22af632a` to `0388c8a7`, which a twin restored at 07:30 matches, and Highcourt's from `4db351f9` to `9467e0f2` on phone and `ba53250f` to `6c94faa4` on desktop. `42/phone` `746a06a3` and the economy `6a652730` held (`goldens.test.ts`).
  - **Tests:** `life.test.ts` has 7 new cases: no spot in an awning's cells, one holder to a plaza tile and every hold given up by night, a doorstep tile shared only when the front is full, the reason cleared before 06:00, and scenes for a two-tile plaza, a 3 × 3 front and a front of one tile. `chat.test.ts` has 8: partners a tile apart, a sitter stepping up to a walker, two walkers on one point, a walker under an awning, a sitter who chats still sitting, the stray limit, Highcourt's chat distances, and a replay from a checkpoint taken with a sitter off its seat. `premises.test.ts` has 2 and `street-sites.test.ts` 1. Three old expectations moved: the plaza blob whose needs settle only when its state changes now settles them at a chat's start too, a blob at 22:00 is within 3 tiles of its door and not on its door tile, and `errands.test.ts` finds a blob that sits out on a tile round its door.
- **Drawing (built, Task 5, cc7d654):** `render-gl`'s `town/people.ts` draws the street's new life, with the pose, emote and facing rules in The Town skin. Both backends draw the place pass's one sprite list, so neither needed code.
  - **Sitting:** a blob whose word is `ACTION_SIT` draws `characters/blob_<hue>_sit_<facing>` on the ground at its spot or doorstep, with `lift` 0.
    - The sit frame is the stand frame squashed on the same 18 × 22 canvas and anchor (9, 20), so its feet stand where a stander's do. The mockups' 5 px lift is for a blob on a bench, and no blob sits on one yet.
    - A sitter facing up had no frame, so it drew `stand_up`, its back, as the mockups drew backs. That was a quarter of sitters, since a keyed way is one of four. It draws `sit_up` now (the polish below).
  - **Chatting:** `ACTION_TALK` stands, facing as its word says, under `icons/emote_speech`. The facing is the word's and never the way the blob moved, so a walker halted to chat faces its partner from the first frame.
  - **Bubbles:** a bubble hangs 7 px right of the anchor and 15 px above the face, which sits 2 px lower on a sitter. A blob indoors draws none, whatever its word says.
  - **Highcourt's day 0** (seed 42, 1,720 blobs) through the real sim, `writeSnapshot`, `TownPeople` and `PlaceSprites`, every 7th tick from 06:00 to 22:00: 137 frames and none lacked a sprite. Up to 604 blobs sat and 380 chatted at once, and over the frames 4,731 of 19,199 seated blobs faced up and so stood (measured here, Node 24.18.0 on Windows).
  - **Bytes:** the `town.ts` graph, bundled and minified with esbuild 0.28.2, grew from 17,509 to 17,774 B, and from 6,601 to 6,708 B brotli: 107 B (measured here; the app's own `town-skin-*.js` chunk was not rebuilt).
  - **Pixel goldens:** none moves. The harness's agents only idle and walk, and carry no bubble, so `town-street.spec.ts`, `town-skin.spec.ts` and the place goldens draw what they drew.
- **Street-life polish (built, 12 October 2026, owner request after the screenshots; a70345e, 0a2c4e0, 50d6839):** the Town skin's drawing of the lives.
  - **Built:** walkers in lanes, sitters facing up sat in `sit_up`, and a selection ring under the blob whose card is open (The Town skin, People and `setSelected`, and Places, Solid quads, above; the `web` wiring is The selection ring).
  - **Cost** (measured here, Node 24.18.0 on Windows, load not recorded, 10,000 blobs, the old and new writers alternated, median of 3 rounds of 7 × 400 writes): `TownPeople.write` takes 0.347 to 0.349 ms before and 0.349 to 0.352 after with 5 blobs in 16 walking, and 0.296 before and 0.321 after with all 10,000 walking. `PlaceSprites.pack` takes 0.67 to 0.73 ms with or without a ring, which adds 24 of 25,002 sprites.
  - **Bytes:** the `town.ts` graph (esbuild 0.28.2, minified) grew from 17,774 to 18,963 B and from 6,708 to 7,128 B brotli, and the `place.ts` graph from 14,428 to 15,413 B and from 5,488 to 5,847 B brotli. The app's own chunks were not rebuilt, so `size-limit` has not run against them: the Town skin chunk (3.09 of 4.09 kB) takes about the 60 B that are the town's own and the shared scene chunks (6.2 of 7.2 kB) the 359 B that are the place's.
  - **Tests:** `town-people.test.ts` has 6 new cases, for the lanes, who gets none, the ring's place, size and depth, none indoors and a sitter facing up. `town-skin.test.ts` has one, for the ring through the Canvas2D painter's fills, and `place-sprites.test.ts` now draws every pose and facing, `sit_up` included. `town-street.spec.ts` has a browser case for the ring through both backends, which has not run.
  - **Pixel goldens:** none moves. No spec pins a Town skin picture with walkers: `town-skin.spec.ts` compares the backends with each other, and the place goldens draw the layouts' own people, with no ring. The one change any place picture could feel is the fragment shader's new branch (Places, Solid quads).
  - **Limits:** a click finds the blob nearest the sim's point, so a walker in a lane is found up to 5 px from where it is drawn, within the 16 px reach.
- **The card (built, Task 6, f39be12..8932f38):** `inspected` carries a blob's life, `sim-worker`'s `blobReply` reads it, and `panels/inspector.ts` words it.
  - **The fields** are in Worker messages, above. `lifeOf(world, tick, agent)` reads `activity` and `phase` from the errand store, `reason`, `sociable`, `homebody` and `restless` from the life store, and each need through `levelAt` at the reply's tick, so a card shows a need that nothing has settled for hours. `partner` is `life.chatWith[blob] - 1`, with that blob's name key, only while `chattingAt(life, blob, tick)` holds. That is the rule behind the snapshot's speech bubble, now exported from `snapshot/street.ts` and the barrel, so the card names a partner exactly while the bubble shows and `chatWith`, which a chat leaves behind, never names a past one. A town that wanders answers `NO_ACTIVITY` (−1) and empty needs and traits, and its card keeps the old rows, since a stand-in town's zeroed stores would read as asleep.
  - **The codes** the card reads are re-exported from `messages/messages.ts` beside `TIER_AGENTS`: the eight `ACTIVITY_*`, `PHASE_LEAVING`, `PHASE_GOING`, `PHASE_COMING` and `MAX_LEVEL`, with `NO_ACTIVITY` defined there.
  - **The rows,** in a town with streets: Job, Pay, Wallet, Home, Lives with, Doing, Feeling, Needs, Personality, Bought today and Look.
    - **Doing** is "Chatting with Wenda" in a chat. Else on a trip it is "About to go to", "Walking to" or "Walking home from" work, the shops, the plaza or the green, by `phase`. Else it says where the blob stands: Asleep, At work, Buying at the shops, Eating on the doorstep, Staying in, On the doorstep, At the plaza or On the green. The four free-time stays add ": wants food", "rest", "fun" or "company" from `reason`, which work, fetches and meals ignore since it goes stale once the blob turns to them. An activity with no words yet reads "Out and about".
    - **Feeling** is the strongest need past three fifths of its range (39,321 of 65,535): Hungry, Tired, Bored or Lonely, else Content. **Needs** are the four as whole percents ("Hunger 4%, rest 28%, fun 24%, company 27%"). **Personality** names a trait only in the low or high third of its byte, so 0 to 85 and 171 to 255: Reserved or sociable, out and about or a homebody, settled or restless, or Easygoing when none stands out. No row reads a look, a culture or a wallet.
  - **Real cards** (measured here, the built app on Highcourt at seed 42, day 0): a blob on its way to the plaza that stopped to chat at 12:00 (tick 720) read "Chatting with Pselgea Tris", "Content", "Hunger 4%, rest 28%, fun 24%, company 27%" and "Sociable, a homebody, restless", and its partner's card named it back. A sitter on the plaza at 11:40 (tick 700) read "At the plaza: wants company", "Content", "Hunger 5%, rest 26%, fun 31%, company 49%" and "Reserved, out and about, settled".
  - **Layout (compact, 12 October 2026, owner request after the screenshots):** the card is 300 px wide (`20rem`, the root font being 15 px) and 60% of the view's height at most, and on a phone, at 50rem and under, a bottom sheet with the same cap. It was 360 × 703 px on Highcourt at 1280 × 800, and on a 390 × 844 phone a sheet at its 506 px cap that scrolled to its last rows; a chatter's card is now 300 × 402 and 390 × 384 (measured here, the built app, seed 42 at tick 785). `BlobCard` is `{ name, look, now, needs, personality, facts, more }`. `now` is Doing and Feeling, under the name beside the portrait (3 CSS px to an art pixel, 54 × 66). `needs` are four `{ name, percent }`, drawn as labelled bars in one row with each percent printed, and `personality` is one line, so a bar row and a line replace the Needs and Personality rows; both are empty in a town that wanders. `facts` are Job, Pay, Wallet, Home and Lives with, and `more` is Bought today and Look, which fold with the looks note behind a native More disclosure. The head stays while the body scrolls, and opening More scrolls the body to its foot. The Close button is a 44 px ×, in a title bar as tall, and a wheel over the card scrolls it rather than zooming the town. Job and Pay stay two rows, since a shop and its pay do not fit one line at 300 px beside a label.
  - **Bytes:** the inspector chunk is 7.15 kB brotli (6.67), against its 7.6 kB limit, so the limit stays. The sim worker's chunk is 25.27 kB (25.10), already over its 22 kB limit, as is `Initial JS, M0 stand-in`, before this task (measured here, `size-limit` on the build). The compact card took the inspector chunk to 8.24 kB, and its limit to 9.24 kB (Layout, above).
  - **Tests:** `loop.test.ts` has 3 new cases, for a street blob's fields with its needs carried on to now, a partner while the chat is on and none after, and a wandering town, and its 3 exact-shape expectations gained the empty life. `inspector.test.ts` has 6 new cases, for the rows, every activity's words, the partner (and none for a chat whose partner has left), the feeling's threshold, the percents and the traits.
  - **The spec,** `street.spec.ts` in `apps/web`, plays Highcourt from 07:00 at 4×. A snapshot comes every 4 ticks there, so a pause sent on the first one of a chat of 20 ticks or more lands with 12 or more of them left, where at 16× a snapshot comes every 16 and a pause could miss the chat (inference). An init script puts a `Worker` subclass in the page, whose first listener reads each snapshot before the app hands its buffer back. When a pair is in speech, one of them in the plaza's ground and within 1.5 tiles of the other, it presses Pause on that snapshot. The spec opens each chatter's card by a click, checks that each names the other, that Feeling, Needs and Personality show, and runs axe on the desktop card and on the phone sheet. On seed 42 the first such pair is at tick 720, two blobs walking to the plaza, and the test takes 13 to 14 s.
    - **Blobs share a spot:** two blobs can stand on exactly one point, and a click on it finds the lower index (`nearestAgent` keeps the lower on a tie). At tick 716 blob 159, walking home from the shops, and blob 551, in a chat, both stood at (1412, 952), and a click there opened 159's card. So the spec takes a pair that each stand 2 px or more from every blob out of doors (measured here).
- **Systems:** `SYSTEM_NAMES` gains `life` (built, Task 3) and `chat` (built, Task 4) after `economy`.
- **Messages:**
  - the emote ids beside `EMOTE_COIN`, in `visual.ts` (built, Task 4): speech, music, ball, heart and question (Snapshot v1);
  - `inspected` gains the activity, the phase, its reason, the chat partner and its name key, the needs and the traits (built, Task 6, The card, above), then the friends (Task 7). The partner is `life.chatWith[blob] - 1` while `chattingAt` holds, the rule of Snapshot v1.
