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
| `@nomos/cli` | `tools/cli` | Headless runs and replay hashes in Node, through sim-core's world step | M0.3 |
| `@nomos/bench` | `tools/bench` | The CI budget, allocation and startup gates | M0.6 |
| `@nomos/sim-culture` | `packages/sim-culture` | Culture code, walled off from crime, police, labour, wage, wealth, money, ability, housing and migration code; it also turns name keys into names | M0.6, names in M0.7 |
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
- `worldgen` imports values only from `@nomos/sim-core/kernels`, `@nomos/sim-protocol/world-map` and, from M3.1, `@nomos/sim-protocol/place`. In `web`, only the map worker's modules reach it, and `render-gl`'s `./map` and `./place` exports draw its output (M8.1 and M3.1, below).

The world step lives in `sim-core`, so headless runs and the worker run the same code.

## Layout (owner: M0.7)

The owner decided on 9 October 2026 that every package groups its source into module folders by concern. The rules:
- **Entry files only at `src/`:** `index.ts`, a subpath export such as `kernels.ts`, and any file that a package script, CI or a test runs or bundles by path. Every other source file sits in a concern folder directly under `src/`, and a lint reports any that doesn't.
- **One level of concern folders.** The culture wall matches `packages/sim-*/src/<concern>/`, so `crime`, `police`, `labour`, `wages`, `wealth`, `money`, `ability`, `housing` and `migration` are each a top-level folder when they arrive, never nested in another folder. `money/` is guarded as wealth, since every wallet lives there (M0.7 review).
- **Named for the concern,** never for a kind of code such as `utils/`. A concern may start with one file and grows in place, so paths and lint globs stay stable.
- **Imports by path inside a package.** A source module imports another folder's module by its path; only other packages and tests use `index.ts`.
- **The barrel caveat:** `sim-core`'s `index.ts` re-exports `consumption/stand-in.ts`, which imports `sim-culture`, so the barrel reaches `sim-culture`. In `sim-core`, only `consumption/` and `index.ts` may reach `sim-culture`, which dependency-cruiser enforces; M2.6 adds `step/` when the step first calls consumption. Guarded code elsewhere imports `@nomos/sim-core/kernels` or module paths, never the barrel.

The tables give the layout M0.7 builds, including the files it adds. A renamed file says what it was; every other file keeps its name.

**`packages/sim-core/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts`, `kernels.ts` | The barrel, and the `./kernels` subpath that `sim-culture` imports |
| `random/` | `draw.ts`, `noise.ts`, `streams.ts` | The keyed draw, value noise and the stream ids |
| `maths/` | `int.ts`, `log2.ts`, `tables.ts` (generated), `apportion.ts`, `split.ts` | Exact integer maths and apportionment |
| `time/` | `calendar.ts`, `day-length.ts` (generated) | The calendar and the sunrise table |
| `memory/` | `arena.ts` (was `memory.ts`), `tiers.ts` | The one reserved memory, and the device tiers |
| `agents/` | `store.ts`, `actions.ts`, `blob.ts` (new), `nearest.ts` (new) | Agent columns, action and facing codes, the `Blob` handle, and the nearest-blob query |
| `money/` | `ledger.ts`, `ppm.ts` (was `money.ts`), `claims.ts`, `registry.ts`, `invariants.ts`, `flows.ts`, `histogram.ts` | Cents, accounts, wallets, loans, holdings and the money invariants |
| `world/` | `world.ts`, `checkpoint.ts` (split from `world.ts`), `ground.ts`, `inputs.ts`, `space.ts` | The `World`, its creation and population; the hash, checkpoints and restore; the ground, the input log and the Q8 space |
| `day/` | `day.ts`, `slices.ts`, `stride.ts` | The day boundary, day slices and the stride scheduler |
| `movement/` | `wander.ts`, `walk.ts` | `move`, and the walking step on each heading |
| `step/` | `step.ts`, `warm.ts` | The world step and its warm-up |
| `consumption/` | `stand-in.ts` | Consumption's stand-in, the one `sim-core` folder that reads culture |

`world/checkpoint.ts` takes `stateHash`, `stateHashExcept`, `checkpoint` and `restoreWorld`; `world/world.ts` keeps the `World`, its global slots, `layoutWorld`, `populate`, `createWorld`, `currentTick` and `committed`.

**`packages/sim-protocol/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `index.ts` | The barrel |
| `snapshot/` | `snapshot.ts`, `visual.ts`, `jobs.ts` | Snapshot v1, the visual word and job ids |
| `messages/` | `messages.ts`, `lifecycle.ts` | Worker messages and the page lifecycle |
| `map/` | `map.ts` | The binary map |
| `sprites/` | `sprite-manifest.ts` (generated) | The sprite-manifest types |
| `shared/` | `calendar.ts`, `columns.ts` | Constants re-exported from `sim-core`, so `render-gl` and the app never import it |
| `world-map/` | `world-map.ts` | The world map, its crowd and the map worker's messages, behind the `./world-map` export (M8.1) |
| `place/` | `place-layout.ts` | A place's layout, its walk loops and the map worker's place messages, behind the `./place` export (M3.1) |

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

Skin B and Skin C arrive as `blobs/` and `town/` beside `dots/` (M1.3, M3.3). M8.3 adds `map/`, the map scene, behind the `./map` export whose entry file is `src/map.ts`. M3.1 adds `place/`, the place pass, behind the `./place` export whose entry file is `src/place.ts`, and `map/lifecycle.ts`, the context-loss lifecycle the map and place renderers share. The Town skin brings `town/` early, with `people.ts` and `town-skin.ts`, behind the `./town` export whose entry file is `src/town.ts` (The Town skin, below).

**`apps/web/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `main.ts` | The entry `index.html` loads |
| `app/` | `app.ts`, `boot.ts`, `lifecycle.ts`, `query.ts`, `tiers.ts` | The app shell: boot hand-off, worker link, query, tiers and the page lifecycle |
| `view/` | `camera-input.ts`; `town-skin.ts` (the Town skin) | Pointer and keyboard input on the view, and the click that inspects; it loads after the first frame, as the charts do (M0.7). `camera-input.ts` also imports the Town skin's loader, `town-skin.ts`, once the page is interactive |
| `panels/` | `hud.ts`, `charts.ts`, `controls.ts`, `inspector.ts` (new) | The HUD, the lazy charts and controls, and the on-demand inspector |
| `map/` | `generate.ts` and `map-worker.ts` (M8.1); `map-view.ts`, `map-input.ts`, `labels.ts`, `legend.ts`, `crowd-motion.ts` and `goto.ts` (M8.3); `place-builder.ts`, `place-view.ts` and `walkers.ts` (M3.1); `town.ts` (the Town skin) | The map: its worker and the worker's lazy place builder, the lazy view the Map control opens, and the town view a place opens into. `town.ts` pins Highcourt's place context for the builder |

`apps/web/vite/` keeps the build plugins. Vite names a lazy chunk after its file, so the size-limit globs `charts-*.js` and `controls-*.js` hold after the move, and the view input's and the inspector's chunks need entries of their own.

**`tools/cli/src`:** `main.ts` only, the entry CI runs.

**`tools/bench/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `alloc.ts`, `assert-startup.ts`, `browser-entry.ts`, `budget.ts`, `calibrate.ts`, `chunks.ts` | Entries that package scripts, CI and the budget spec run or bundle by path |
| `compute/` | `allocation.ts`, `budgets.ts`, `judge.ts`, `sample.ts`, `serve-isolated.ts` | The compute gates' sampling, budget table and verdicts |
| `machine/` | `benchmark-index.ts`, `LICENSE-lighthouse.txt`, `loadavg.ts` | The machine measured on: its speed index and its load |

**`tools/names/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `cli.ts` | The entry `pnpm names` runs |
| `text/` | `fold.ts`, `edit.ts` | Folding, tokens and edit distance |
| `filters/` | `franchise.ts`, `real-world.ts`, `name-filter.ts` (new) | The franchise ban, the real-world fixture and the person-name filter |
| `sound-set/` | `sound-set.ts` (new) | The one shared mixed sound set: Greek-like sounds mixed with other languages', learned from Fantasy Map Generator's name bases, and its candidate words |
| `lints/` | `culture-text.ts`, `scan.ts` | The culture text lint and the repo scan |

`tools/names/scripts/` gains `words.ts`, which writes the person-name table into `sim-culture` and checks it with `--check`, and `build-avoid.ts` and `build-name-bases.ts`, which rebuild the new fixtures from the network and are run by hand. M8.1's place-name table comes from the same `sound-set/`, as a second output of `words.ts`.

## The world step (owner: M0.3)

- **Creation:** `createWorld(seed: number, tier: Tier, ground?: Ground, agents?: number): World`, and `restoreWorld(seed, tier, state: ArrayBuffer, ground?: Ground): World` for checkpoints. A `World` holds the agent store, the ledgers, the tick counter, `world.ground`, and `world.blob`, the world's `Blob` handle, made once in `layoutWorld` (M0.7).
  - `agents` is how many blobs spawn, a whole number from 1 to the tier's count, which is the default. The layout always holds the tier's whole count, so a smaller town moves no offset and `restoreWorld` needs no count. `populate(world, people?)` throws `RangeError` outside that range. Blob `id` keys every spawn draw, so a smaller town is the first `agents` blobs of the full one.
  - `townAgents(tier, ground): number` is how many a town holds: its walkable tiles divided by `TIER_TILES_PER_AGENT` (phone 4, phone-plus 3, desktop 2), rounded down, at least 1 and at most the tier's count. `walkableTiles(ground)` counts the open tiles. The owner asked on 10 October 2026 for a first screen of about one blob to two walkable tiles on desktop, and fewer on phones.
- **Checks:** while `world.checks` is true, the default, `step` runs `checkInvariants` after every tick. Tests and the CLI keep the default. The worker sets it from `init.checks`, which the app sends as true only from development builds, because wallets make the check cost grow with population. `warmUp`'s throwaway world runs with checks off, as production does (M0.7).
- **Ground (M0.4):** `{ width, height, walk: Uint8Array }` in `sim-core`, tiles row-major from the top-left, where nonzero means walkable. A `MapV1` is a `Ground`, so `sim-core` never imports `sim-protocol`.
  - The ground is an unhashed input: it stays out of the arena and the hash, and a restore must pass the same ground.
  - Without one, `standInGround()` gives a 256 × 256 all-open square, as in the CLI.
  - `layoutWorld` throws `RangeError` when `walk.length` isn't `width × height`, and `populate` when no tile is open.
- **Stepping:** `step(world: World, timer?: SystemTimer): void`, one tick per call.
  - `SystemTimer` is `{ lap(system: number): void }`, called after each system, so the worker and the benches time systems without clocks in `sim-core`.
  - `SYSTEM_NAMES` is `['day', 'move']` in M0.3, and later systems append to it.
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
  - **Facing:** `facingFor(heading)` is ((heading + 32) >> 6) & 3, the facing nearest the heading and so its step's dominant axis. At the four exact diagonals it takes the facing clockwise.
    - `populate` and `move` write `facing` with every heading change, through `setHeading`, so snapshot v1 and its 2 facing bits are unchanged.
  - **Spawns:** `populate` puts each blob at a keyed point in its open tile, so blobs sharing a tile don't stack. With d = `draw2(seed, SPAWN, id, 1)`, x is the tile's left edge plus d & 4095 and y its top edge plus (d >>> 12) & 4095, in Q8.
    - Three in four blobs start walking. With s = `draw2(seed, SPAWN, id, 2)`, a blob where s & 3 isn't 0 starts on the heading s >>> 24, with the `vx`, `vy` and `facing` that follow it. The rest start idle on heading 0, facing down.
    - Three in four is the long-run share of the turns above, so the walking share holds near 75% from the first tick instead of climbing from none: 74.8%, 75.1% and 75.4% at ticks 0, 16 and 64 (measured, seed 42, phone tier).
- `stateHash(world: World): number`: a 32-bit hash over every replay-relevant column and ledger, the value the determinism checks compare. M0.6 adds `stateHashExcept(world, skip: readonly ArrayBufferView[]): number`, of which `stateHash` is the case with nothing skipped, so no golden moves; the relabel test skips the culture columns.
- `World.cultureUid`: a canonical `Uint8Array(MAX_CULTURES)` of stable culture uids, c + 1 per culture and 0 when unused. Culture-level draws key on it, never on the index (M0.6, R8).
- Seed 42's replay hashes at tick 1,000, one per tier, live in `packages/sim-core/test/fixtures/goldens.json`, keyed `"<seed>/<tier>"`; the Node, Bun and browser checks all read it. A commit that moves the sim on purpose regenerates it with `node packages/sim-core/scripts/goldens.ts` (M0.6).
- `Tier` is `'phone' | 'phone-plus' | 'desktop'`, with agent caps of 10,000, 25,000 and 100,000. `sim-protocol` re-exports `Tier`, `TIER_AGENTS` and `townAgents` from its `messages.ts` (M0.3).
- Highcourt's replay hashes at tick 1,000, seed 42, on `town.nmap` at the town's own crowd, are pinned in `packages/sim-protocol/test/town-map.test.ts`: `83e5b191` for phone (1,690 blobs) and `4099e61d` for desktop (3,381). The goldens above run on the stand-in ground, so a new map moves only these.

## Agents and the Blob handle (owner: M0.7)

- **Rows, not objects.** Each blob is one row of `world.agents`' typed columns. The owner decided on 9 October 2026 that code reads and writes a row through a handle object that is made once and re-pointed, never through an object per blob.
- **The new column:** `nameKey`, a `Uint32Array`, 4 bytes, appended to `AGENT_COLUMNS`. `addAgent` draws it at birth as `draw1(seed, PERSON_NAME, id)`, with the new agent stream `PERSON_NAME` = `AGENT_SALT + 6` (0x106), named apart from the world stream `NAME` that M8.1 adds to `rng.py`. Its low 16 bits pick the given name and its high 16 bits the family name. No sim rule reads it, and the culture lint already bans it from guarded folders.
- **`Blob`,** in `agents/blob.ts`:
  - `new Blob(agents: AgentStore, cash: Ledger)` copies the column references it needs. `layoutWorld` makes `world.blob`, and code that needs two rows at once makes its own second handle at world creation, the only other time a `Blob` is made;
  - `at(index: number): void` re-points it. It returns nothing, so a handle is never held under two names;
  - `index` (read-only) is the current row;
  - `x` and `y` (Q8 sub-pixels), `vx` and `vy` (Q8 a tick), `heading`, `action` and `facing` read and write their columns, and code that sets `heading` also sets `vx`, `vy` and `facing`, which follow it;
  - `nameKey` (read-only), `wallet` (read-only, the row's account in `world.cash`) and `cash` (read-only, that account's balance in cents). Money moves only through `transfer`, `issue` and `retire`.
- Column accessors carry their column's exact name, so the look and culture lints see every read. `Blob` has no `look` accessor, since no sim rule reads a look, and no culture accessors until a consumption system needs one.
- **Per-tick loops** use the accessors or plain columns, and call no method per blob. A method per blob made the four-way `move` 2.0–2.8× slower, while accessors cost 7% (M0.7's brief, measured here in Node 24.18.0, V8 only).
  - M0.7's A/B check found accessors 1.05–1.20× slower on the free-heading `move` and up to 3.6× slower on the day slice's walker count (measured there, Node 24.18.0).
  - Both loops therefore keep their columns, under the owner's 10% rule. The handle serves code that touches a few blobs a tick.
- `nearestAgent(agents: AgentStore, xQ8: number, yQ8: number, radiusQ8: number): number`, in `agents/nearest.ts`: the nearest blob by squared distance within the radius, ties to the lower index, or −1. It serves the inspector between ticks.

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
| 7 | reserved | 0 |
| 8–10 | `action` | 0 idle, 1 walk, 2 sit, 3 sleep, 4 work, 5 talk, 6 sneak, 7 carry (R1, R3) |
| 11–15 | `emote` | 0 none, then emote ids up to 31 |
| 16–23 | `job` | 0 none, then job-item ids up to 255 |
| 24–25 | `facing` | 0 down, 1 left, 2 up, 3 right |
| 26 | `trueOnly` | 1 for a cue the recorded view must never draw; the render-filter test checks it |
| 27–31 | reserved | 0 |

- There is no "wanted" bit (R1, R3).
- Helpers: `packVisual(look, action, emote, job, facing, trueOnly): number`, and `lookOf`, `actionOf`, `emoteOf`, `jobOf`, `facingOf` and `isTrueOnly`, each taking `(word: number): number`.
- `ACTION_NAMES` lists the eight actions in bit order.
- `JOB_ITEMS` is `['builder', 'clinic', 'farmer', 'merchant', 'police', 'soldier']`, with job id = index + 1 and 0 for none. `JobItem` is one of its names, and `jobId(item: JobItem): number` gives the id. M0.4 owns them and tests them against the sprite manifests; new items are appended, so no id shifts.

## Worker messages (owner: M0.3)

- App to worker:
  - `{ type: 'init', seed, tier, map: ArrayBuffer, checks: boolean, agents?: number }`; `checks` sets `world.checks`, and the app sends true only from development builds (M0.7). `agents` is passed to `createWorld`; leaving it out spawns the tier's whole count, as the bench and the harness do. The app sends `townAgents(tier, map)`, or the tier's whole count when the URL names the tier with `?tier=`, which is how the perf specs keep their 10,000, 25,000 and 100,000.
  - `{ type: 'pause' }` and `{ type: 'resume' }`
  - `{ type: 'return', buffer: ArrayBuffer }`
  - `{ type: 'checkpoint' }`, which the app sends on `pagehide`
  - `{ type: 'inspect', x, y }`, in world pixels, which the worker rounds to Q8: a read-only query, answered at any time, even while a run plays (M0.7)
- Worker to app:
  - `{ type: 'ready', agents }`. A tick-0 snapshot follows (M0.4), then the worker warms up (R6) and waits for `resume`. Messages sent during the warm-up wait until it ends. Under reduced motion the app withholds `resume` (M0.5).
  - `{ type: 'snapshot', tick, count, buffer: ArrayBuffer }`
  - `{ type: 'stats', tick, systemMs: Record<string, number> }`, keyed by `SYSTEM_NAMES` plus `snapshot`, the mean milliseconds per snapshot (M0.3)
  - `{ type: 'checkpoint', tick, state: ArrayBuffer }`, the answer to the app's `checkpoint`
  - `{ type: 'inspected', tick, agent, nameKey, cents }`, the answer to `inspect`: the nearest blob within one tile (16 world pixels), or `agent` −1 with `nameKey` and `cents` 0 (M0.7)
- `sim-protocol`'s `bindPageLifecycle(doc, win, post): void` sends `pause` and `resume` on `visibilitychange`, and `checkpoint` on `pagehide`. M0.5 wraps it.
- `sim-worker`'s `createSimLoop(host: LoopHost, cpuSlowdown = 1): { handle(msg: AppMessage): void }` runs the loop. A `cpuSlowdown` above 1 makes the worker wait before each reply, and after its warm-up, as a CPU that many times slower would, since CDP's CPU throttling skips workers. Only the startup gate sets it, through a `__nomosCpuSlowdown` global that its server prefixes to the worker chunk (M0.6, R5).
- The startup gate's server, `startServer(options: ServeOptions): Promise<Served>` in `apps/web/test/serve.ts`, serves a build over an emulated Fast 4G link, with `latencyMs` 165, `bytesPerSecond` 1,012,500 and `setupRtts` 3 by default. Its `workerSlowdown`, 1 by default, is the `cpuSlowdown` it prefixes to the worker chunk (M0.6, R5).
- Speed controls and skip arrive in M1 (Calendar); the worker refuses settings messages while a run plays.

## The binary map, version 1 (owner: M0.4)

- One format for generated and hand-made maps (R9): terrain kinds, IntGrid walkability, and entities (homes with capacity, workplaces, shops with hours, civic buildings).
- It lives in `sim-protocol` as `parseMap(buffer: ArrayBuffer): MapV1`, which throws `MapError` on a bad or short buffer, such as a 404 page, never a `RangeError` or half a map. Files start with `MAP_MAGIC` ("NMAP"), end in `MAP_EXTENSION` (`.nmap`) and are served as `MAP_CONTENT_TYPE` (`application/x-protobuf`), a compressible type (R5).
- `MapV1` is `{ version: 1, width, height, kinds: TerrainKind[], frames: string[], terrain: Uint8Array, walk: Uint8Array, tiles: Uint16Array, entities: MapEntity[] }`:
  - `TerrainKind` is `{ name, rgb }`;
  - `walk` holds `WALK_BLOCKED`, `WALK_OPEN`, `WALK_ROAD` or `WALK_DOOR` (0–3);
  - `tiles` index `frames`, with `NO_FRAME` (0xffff) for none;
  - `MapEntity` is `{ kind, x, y, w, h, doorX, doorY, frame, capacity, opens, closes }`, with `kind` one of `ENTITY_HOME`, `ENTITY_WORKPLACE`, `ENTITY_SHOP` and `ENTITY_CIVIC` (1–4). `capacity` is a home's, and `opens` and `closes` are a shop's minutes.
- Tiles name sprite frames, never atlas indices (R9).
- The worker loads it in `init`; the renderer reads the same `MapV1` for Skin A's minimap colours.

## Sprite manifests (owner: M0.5)

- `sim-protocol` publishes `schema/sprite-manifest.schema.json` (JSON Schema 2020-12, `$id` `urn:nomos:sprite-manifest:1`) and the types generated from it, `SpriteManifest` and `SpriteFrame`. `pnpm --filter @nomos/sim-protocol types` regenerates them.
- A manifest names its frames and never holds an atlas index; the atlas build places them (R9).

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
| `src/` | `index.ts` | The barrel: `generateWorld`, `worldFingerprint`, `placeNames`, `crowdOf` and `StageTimer`, and from M3.1 `placeContexts`, `buildPlace` and `PlaceContext` |
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
| `names/` | `place-names.ts`, `words.ts` (generated) | Place and country names |
| `world/` | `draft.ts`, `generate.ts`, `fingerprint.ts` | The world being built, the pipeline, and `world.fingerprint` |
| `crowd/` | `crowd.ts` | The map's look-only crowd, which Python lacks (M8.3) |
| `place/` | `site.ts`, `build.ts`, the stage files (among them `walls.ts` and `farms.ts`, from M3.1's Part 3), `looks.ts`, `contexts.ts`, `layout.ts`, `walks.ts`, `street-crowd.ts` and `frames.ts` (generated) | `place.py`, `looks.py`'s `look_for` and `world.py`'s place contexts, plus the walk loops and the street crowd Python lacks (M3.1, Places below) |

- **Imports:** values only from `@nomos/sim-core/kernels`, `@nomos/sim-protocol/world-map` and `@nomos/sim-protocol/place`.
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
- **Names:** `placeNames(map: WorldMap): string[]` gives the K country names, then the n settlement names in id order. They are display text, outside the map and the fingerprint. Until the place-name table lands, they are stand-ins: `country-1`, and `capital-0` or `town-12` as Python names settlements.

### The map crowd (owner: M8.3)

The owner asked on 9 October 2026 to see each country's people on the map, as a look-only crowd. It is made beside the world, not in it, so `worldFingerprint` and `worldMapBuffers` leave it out, and no sim rule reads it.

- `crowdOf(map: WorldMap): MapCrowd`, in `worldgen`'s `crowd/`, places a dot per 100 people, and at least one per settlement, settlement by settlement in id order.
  - A dot's home is a cell of its settlement's country, within a reach that grows with the settlement's dots: the nearer of two random yard cells, so the crowd thins toward its edge evenly on every side.
  - Its stops 0 and 2 stand in the home cell, and its stops 1 and 3 in the home cell or the same country's cell north, east, south or west of it. So every straight leg stays on that country's land.
  - Every draw is `draw(seed, CROWD, …)`, with first keys from 0x100, clear of `place.py`'s.
- **In `world-map.ts`:**
  - `CROWD_HUES`: sun, lilac, rose, ice, mint and silver, `spritekit.py`'s `BODY_HUES` order;
  - `CROWD_STOPS` is 4, and `CROWD_Q` is 256;
  - `crowdBuffers(crowd)` lists its four buffers once each.

| Field | Type | Holds |
| --- | --- | --- |
| `hue` | `Uint8Array` | Each dot's `CROWD_HUES` index |
| `stops` | `Uint16Array` | `CROWD_STOPS` stops per dot, x then y, in cells times `CROWD_Q`: dot d's stop k is at `2 × (d × CROWD_STOPS + k)` |
| `legMs` | `Uint16Array` | How long each leg of its loop takes, 2,500–6,000 ms |
| `startMs` | `Uint16Array` | How far into its loop it starts, below `CROWD_STOPS × legMs` |

### Map worker messages

- Page to map worker, `MapAppMessage`: `{ type: 'generate', seed: number, size: WorldSize }`.
- Map worker to page, `MapWorkerMessage`: `{ type: 'world', map: WorldMap, names: string[], crowd: MapCrowd, stageMs: Record<string, number> }`, with every buffer transferred, the crowd's included. `stageMs` holds each `StageTimer` stage's milliseconds, plus `names`, `crowd` and, from M3.1, `contexts`, the place contexts kept for place requests.
- A throw in the world generator reaches the page as the Worker's `error` event, as the sim worker's do.
- Both types live in `world-map.ts`.
- From M3.1, the worker also answers a `PlaceRequest` with a `PlaceReply` or a `PlaceError`, whose types live in `place-layout.ts` (Places, below). A place that can't be built never throws.

### Who imports what

- `worldgen` imports values only from `@nomos/sim-core/kernels` and `@nomos/sim-protocol/world-map`, and nothing imports it but the map worker and tests. Dependency-cruiser enforces both.
- **In `web`,** only `src/map/generate.ts`, which answers a `generate` message, `src/map/map-worker.ts`, which binds it to the worker's messages, and `src/map/place-builder.ts`, the worker's lazy part that builds places (M3.1), may reach `@nomos/worldgen`.
  - The page starts the worker with `new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' })`.
  - So Vite builds it as its own chunk, `map-worker-*.js`, whose name never matches the sim worker's `worker-*.js` glob.
- **`render-gl`** gains a `./map` export, the lazy map scene, with its entry file at `src/map.ts`. It imports only `sim-protocol`, and its API is The map scene, below.
- **Nothing of the map reaches the first load** (owner, 9 October 2026). The entry, sim worker and renderer chunks keep their bytes, and the Map control mounts from a chunk that already loads after the first frame.

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
  - It holds the five country colours, the line colours, with `highway`, the palette's `STONE_L` (M3.1's Part 3), and the crowd's six body hues keyed by `CROWD_HUES` name with their dark `outline`. `tools/worldgen/mapdraw.py` reads the same file.
  - `COUNTRY_COLOURS` holds the five as `0xRRGGBB`, indexed by `WorldMap.countries.colour`. They appear only on map overlays and the legend (Countries rule 5).
  - `CROWD_COLOURS` holds the six body hues as `0xRRGGBB` by `CROWD_HUES` index, and `CROWD_OUTLINE` the outline, which equals `OUTLINE`, the palette's outline that a place is drawn on (M3.1). `test_worldgen.py` holds them to `spritekit.py`'s `BODY_HUES` bases and `OUTLINE` (M8.3, Task 17).
  - The owner picked the five on 9 October 2026. In index order they are `#42F6FC` cyan, `#0000E4` blue, `#600090` deep violet, `#CC36D8` orchid and `#FC66FC` pink-violet.
  - A test keeps them, in D65 Lab and CIEDE2000, ≥ 15 from every palette colour, and ≥ 11.95 apart for normal, protan, deutan and tritan vision (M8.3, Task 14).
- **Atlas page:** `tools/atlas` writes `map.webp`, `map.png` and `map.json` beside the town atlas. The page holds the 93 map-scale frames: terrain tiles, wonders and landmarks at both scales, and the settlement icons, walled ones and their highlight rings included (M3.1's Part 3).
  - `AtlasPage` is `{ image: ImageBitmap, frames: Record<string, AtlasFrame> }`, keyed `"<sheet>/<frame>"`.
  - `AtlasFrame` is `{ x, y, w, h, anchor: [x, y], face?: [x, y] }`. From M3.1, body frames carry `face`, the offset their face overlays draw at, from `characters.json`.
  - `loadAtlasPage(jsonUrl, imageUrl): Promise<AtlasPage>` fetches the page.
  - Frames are found by name, never by atlas index (R9).
- **`createMapRenderer(canvas: HTMLCanvasElement, options?: MapRendererOptions): MapRenderer`.**
  - `MapRendererOptions` is `{ backend?: 'auto' | 'canvas2d', restoreTimeoutMs?: number }`, as `RendererOptions` has them. From M3.1 it is an alias of `LifecycleOptions`, in `map/lifecycle.ts`, whose `createLifecycle` runs init, the lost and restored events, the fallback, the canvas swap, resize and dispose for both the map and place renderers. `WorldRenderer` keeps its own, so first-load bytes don't change.
  - `MapRenderer` reads `backend`, `canvas` and `view`: the view the last draw showed.
  - Its methods are `init()`, `resize(deviceWidth, deviceHeight, dpr)`, `setWorld(map: WorldMap)`, `setAtlas(page: AtlasPage)`, `setFlat(flat: boolean)`, `setCrowd(hue: Uint8Array, xy: Float32Array)`, `draw(camera: MapCamera)` and `dispose()`.
  - `setCrowd` takes each dot's `CROWD_HUES` index and its position, x then y, in fractional cells. The caller rewrites `xy` in place before each draw.
  - It falls back to Canvas2D when WebGL2 is missing, when a texture can't reach 3,072 px, or when a lost context stays lost for `restoreTimeoutMs`.
- **What draws:**
  - **Before the atlas page,** and whenever `setFlat(true)`, it draws the flat Countries view: each country's land in its colour, with borders and icons.
  - **After the page:** each cell's tile, then rivers, sea lanes, minor roads dotted and major roads solid in `highway`, bridges, colour bands and border lines as pixel lines, then peaks, settlements, wonders and landmarks in row order, as `mapdraw.py` draws them.
  - **Settlement icons** (M3.1's Part 3): a capital's or city's icon is `map8_settlement_<tier>-walled` in the Country view and `map16_settlement_<tier>-walled` in the Region view. A town's is `…_town-palisade`, and a village's or hamlet's stays `settlement_<tier>`.
  - **The crowd,** in the Region view only, flat or not, after the tiles and lines and before the icons. Each dot is a disc in its body hue, with a 1-px dark outline from 4 px up. Its size is a tenth of a cell in whole device pixels, rounded up: 2, 4, 5, 7, 10 and 13 px at 16, 32, 48, 64, 96 and 128 px a cell, so the dots are outlined wherever the Region view opens.
  - **The Canvas2D fallback** draws the flat fills, the crowd, settlement icons and labels only.
- **Imports:** the map scene imports nothing from `render-gl`'s other folders, so no town module gains an export for it. Dependency-cruiser enforces this.

### In `web`

- **The Map control** sits in the lazy controls chunk, so the entry chunk gains no byte. It imports `map/map-view.ts`, whose chunk holds the map scene, labels, legend and input.
- **Opening the map:**
  - it pauses the town if it was playing, and makes the town's view and HUD inert under the map;
  - it starts the map worker once per page, and keeps the world it answers for the rest of the page;
  - it fetches the atlas page beside it.
- **Closing the map** resumes the town only if the map paused it, and gives focus back to the Map control. Escape closes it too.
- **The toolbar** holds Close map, Fit, Zoom in and Zoom out, Countries, Pause dots, and a "Go to a settlement" list (owner, 9 October 2026). From M3.1 it adds "Enter <name>" while a place is in focus (Places, below).
  - **Going to a settlement:** choose it from the list, grouped by country with the capital first, or click or tap it on the map. Either way, the view jumps there, centred, at the step nearest 64 CSS px a cell.
    - `map/goto.ts` holds `goToGroups`, `mountGoTo` and `cameraOn`. From M3.1, `placeUnder` replaces `settlementUnder`: it finds a settlement or wonder within 1.5 cells or 12 CSS px of a tap. `cameraOn` takes a place, and `placeInFocus`, `placeInfo` and `placeCount` serve the town view.
    - `MapInputTarget` gains `tap(deviceX, deviceY)`, called for a press that lifts having moved less than 5 CSS px. From M3.1 it is `{ zoom, pan, arrowPx, fit, close, tap }`.
    - The list reads "Go to…" again after every jump.
  - **Pause dots** stands the crowd still, as reduced motion does.
  - **The status line** is the map's live region. It says when the map is ready, and focusing the map reads it, through `aria-describedby`.
- **Labels** are a fixed pool of DOM elements, moved by transforms whenever the camera moves:
  - the Country view labels countries, capitals and cities;
  - the Region view labels every settlement;
  - a greedy pass, in that priority order, drops any label that would overlap one already shown.
- **The legend** lists each country's colour, name, capital and settlement count. It is also the map's text alternative. Colour is never the only cue: each country's name is written on the map at Country zoom, and the legend names it beside its swatch.
- **The crowd moves** through `map/crowd-motion.ts`'s `crowdAt(crowd, nowMs, xy)`.
  - A dot stands for the first 40% of each leg, then walks straight to its next stop.
  - The view runs a frame loop only while the Region view shows. Under `prefers-reduced-motion`, the dots stand at their time-0 places.
- **Chunks:**
  - `map-view-*.js`, `map-worker-*.js` and `dist/atlas/map.webp` each get a size-limit entry;
  - `vite.config.ts`'s `render-gl` chunk group leaves out `src/map`, so the scene never joins the renderer chunk. From M3.1 it leaves out `src/place` too.

## Places (owner: M3.1)

The owner asked on 9 October 2026 to zoom into a settlement on the map and see that town and its people. A place is what `tools/worldgen/place.py` lays out for one settlement or wonder: a district of 176 × 112 tiles for a capital or city, 152 × 96 for a town, 80 × 48 for a village and 56 × 32 for a hamlet, or a wonder's vista of 30 × 18. These are M3.1's Part 3 sizes, or 160 × 100 and 140 × 80 if its Task 11 takes Ruling 1's fallback. M3.1's step plan builds it, ahead of the rest of M3.1.

### The contract

`@nomos/sim-protocol/place`, in `place/place-layout.ts`:
- **`PlaceLayout`:** `width` and `height` in tiles, of `PLACE_TILE_PX` (16) art px each, and:
  - `frames`: each sprite's name once, `"<sheet>/<frame>"` as `tools/atlas` keys it, in order of first use: tiles row by row, then ground, then standing;
  - `tiles`: a `Uint16Array` of frame indices, row-major; an animated tile shows its frame 0;
  - `ground` and `standing`: `Int32Array`s of three numbers a sprite: its frame, then its anchor's x and y in art px from the place's top-left;
  - `people`: a `PlacePeople`.
- **`PlacePeople`:** one column a field of `place.py`'s `Person`:
  - `look`, one of `looks.py`'s 96: hue `look % 6` in `LOOK_HUES` (`CROWD_HUES`), eyes `⌊look / 6⌋ % 4` in `LOOK_EYES` and pattern `⌊look / 24⌋` in `LOOK_PATTERNS`;
  - `pose`, `facing`, `expression`, `job` and `emote`, as indices into `PLACE_POSES`, `PLACE_FACINGS`, `PLACE_EXPRESSIONS`, `PLACE_JOBS` and `PLACE_EMOTES`, with `NO_CODE` (255) for no job or emote;
  - `step`, a walker's frame, 0 or 1;
  - `x` and `y`, the anchor in art px, and `lift`, which raises a sitter onto a bench.
- **`PlaceWalks`:** the loops look-only walkers follow, which `place.py` lacks. Loop r belongs to `person[r]` and steps through `cells[offsets[r]]` to `cells[offsets[r + 1] − 1]`, as y × width + x, then back to its first cell, the person's own tile.
- **`PlaceCrowd`:** the street crowd (M3.1's Part 2), look-only walkers, one per 150 residents and at most 3,000. Crowd loop r steps through `cells[offsets[r]]` to `cells[offsets[r + 1] − 1]` and back. Walker k has `look[k]` and `expression[k]`, follows loop `loop[k]`, and starts `phase[k]` art px along it.
- **Messages:**
  - `PlaceRequest` is `{ type: 'place', place }`. Place p is settlement p, or wonder p minus the settlement count, in `world.py`'s `place_contexts` order.
  - `PlaceReply` is `{ type: 'place', place, layout, walks, crowd, ms }`, with every buffer transferred, as `placeBuffers(layout, walks, crowd)` lists them.
  - `PlaceError` is `{ type: 'place-error', place, message }`, sent instead for an unknown place, a request before any world, or a failed build.
  - **The starting town (owner request, 10 October 2026):** `TownRequest` is `{ type: 'town' }`, which needs no world. The answer is `TownReply`, `{ type: 'town', layout, ms }`, with the layout's buffers transferred as `layoutBuffers(layout)` lists them, or `TownError`, `{ type: 'town-error', message }`, when the build fails. `placeBuffers` lists `layoutBuffers` first.

### Building a place

- **`placeContexts(map: WorldMap): PlaceContext[]`** ports `world.py`'s `_context` and `place_contexts`.
  - Settlements come first in id order, seeded `draw(world seed, PLACE, 0, cell)`; then wonders in placement order, seeded `draw(world seed, PLACE, 1, kind)`.
  - `PlaceContext` holds `model.py`'s fields, in its order.
- **`buildPlace(ctx): { layout: PlaceLayout, walks: PlaceWalks }`** ports `place.py` one function to one function, in `worldgen`'s `place/`.
  - Its frame table, `place/frames.ts`, is generated by `scripts/place-frames.ts`. It holds only the fields `place.py` reads: w, the anchor, the footprint and the door.
  - Looks are `look_for(place seed, person index)` on the `LOOK` stream. `worldgen`'s `streams.ts` holds `PLACE` 10, `LOOK` 11 and `CROWD` 12, as `rng.py` does.
- **Walk loops,** in TypeScript only:
  - A tile is walkable if it is a road, or a standable tile with nothing standing on it.
  - `place.py`'s walkers, and 350 per mille of the standers with no job, each get a loop: 3–6 waypoints within 10 steps of their tile, joined by shortest paths inside that reach.
  - Sitters and people with a job stay put.
  - A place's loops hold at most 16,384 cells.
  - Every draw is `draw(place seed, CROWD, …)`, with first keys 0x110–0x112, clear of `place.py`'s 1–6.
- **The street crowd** keeps to at most 300 loops of at most 4,000 cells, 131,072 cells in all. From M3.1's Part 3, its hubs lie on roads that aren't farm tracks, and each hub's search order is keyed by `LANE` (0x125) on `CROWD`, so loops spread across wide roads.
- **Stages:** `place.py`'s `SETTLEMENT_STAGES`, mirrored by `build.ts`, list `build_settlement`'s stage groups in order: water, centre, walls, buildings, farms, decor, nature and people. Walls and farms join in M3.1's Part 3.
- **The walled town** (M3.1's Part 3):
  - **New tile kinds:** `stone` (main road, 3 wide), `cobble` (street, 2), `gravel` (country road, 2), `track` (farm track, 1), `flower-bed`, and `crop_vine_<stage>` and `crop_rice_<stage>`. `path` stays the lane and `paving` the plaza. A road tile keeps the highest-ranked kind laid on it, in the order paving, stone, cobble, gravel, track, path.
  - **Wall rings:** half-sizes of 64 × 40 for capitals and cities, in stone, and 56 × 30 for towns, as a palisade. Each is centred on the plaza's centre and kept 6 tiles inside the place's edge.
  - **Gates** are 2 tiles wide. A front gate is a standing sprite over road that marks nothing solid; a side gate is a solid pier and cap beside a 2-tile gap.
  - **Bridges:** main and country roads cross rivers on ground-layer bridge pieces. The water tiles stay water and become road.
  - **`town.nmap`** gains the built kind `wall`, and `farm_` buildings count as workplaces.

### Goldens

- `tools/worldgen/place_goldens.py` writes `packages/worldgen/test/fixtures/place-goldens-v1.json`. It holds a fingerprint after each stage for:
  - every place of the first 20 standard worlds, 1,033 of them;
  - seven pinned places that reach what those worlds miss: a viaduct, landmarks off the plaza, rocky ground, east and west sea arches, and a cliffed cove.
  A vista has its context, ground and layout fingerprinted.
- `tools/worldgen/place_fixtures.py` writes `packages/render-gl/test/fixtures/places-v1.json`: three whole layouts, with the SHA-256 of `placedraw.py`'s picture of each, which the place pass must match.
- **CI** runs both with `--check`; the goldens check covers the first world and the pinned places.
- **Engines:** `scripts/engines.ts` and the browser engine spec check the places of the first two worlds plus the pinned ones, 109 places in all, in Node, Bun, Chromium, Firefox and WebKit.

### In the map worker

- After a world, `generate.ts` keeps its place contexts, made before the world's buffers are transferred away, and times them as the `contexts` stage.
- The first `PlaceRequest` imports `place-builder.ts`, which builds as its own chunk, `place-builder-*.js`, so opening the map pays nothing for places. `ms` times the build alone.
- A `TownRequest` goes through the same lazy builder: `buildTownAnswer` answers with `buildPlace(TOWN).layout`, where `TOWN`, in `map/town.ts`, is Highcourt's context as `tools/worldgen/export_map.py` pins it. `apps/web/test/town.test.ts` holds it to Python's field by field, and its layout to `assets/maps/town.nmap` tile for tile, so the art the Town skin draws is the ground the sim walks.
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
  - `PlaceRenderer` reads `backend` and `canvas`. Its methods are `init()`, `resize(deviceWidth, deviceHeight, dpr)`, `setAtlas(page: AtlasPage)`, `setPlace(layout: PlaceLayout)`, `draw(camera: PlaceCamera)` and `dispose()`.
  - Callers move people by rewriting the layout's `x`, `y`, `pose`, `facing` and `step` before each draw. A camera is re-read only when a new camera object is passed.
  - `draw` throws for a scale that isn't a whole number of 1 or more, and packing throws for a sitter facing up, which has no sprite, as `placedraw.py` would.
- **What draws,** in `placedraw.py`'s order:
  1. the `OUTLINE` background;
  2. the tiles;
  3. the ground sprites, sorted by y;
  4. standing sprites and people together, sorted by y and then by order, standing sprites first.

  A person's layers are the body, the pattern, the face at the body frame's `face` offset, the job item, and the emote at (7, face y − 15). People move every frame, so the pass re-sorts them in place, stably, with no allocation.
- **Backends:** WebGL2 draws the whole place in one instanced draw, reading texels with `texelFetch`. Canvas2D caches the tiles and ground on an offscreen canvas.
- **The pixel check:** at 1×, both backends match the SHA-256 of `placedraw.py`'s picture of each fixture, in Chromium, Firefox and WebKit. At 2×, a frame equals the 1× picture scaled up by nearest neighbour.
- **Imports:** only `src/map`'s `frames.ts`, `gl.ts`, `colours.ts` and `lifecycle.ts`, and `sim-protocol`.

### The town view in `web`

- **Entering,** from the map's Region view:
  - a place is in focus when it is the nearest to the view's centre within a tap's reach. "Enter <name>" shows while one is;
  - at the map's closest step, zooming in again near a place opens it. The zoom point is the cursor, the pinch centre or the view's centre;
  - a tap on the place in focus opens it, and a tap on any other place jumps there.
- **The view:** `map/place-view.ts` mounts a `#place` section over the map, which goes inert beneath it and draws nothing while covered.
  - It opens at `openPlaceCamera`'s scale.
  - Its bar holds Back to map, Fit, + and −, and Pause people, which shares the map's Pause dots state, with the place's name, tier, population and country. A wonder is named by its kind, such as "Sea arch".
- **Walkers:** `map/walkers.ts`'s `Walkers` move people round their loops at about 20 art px a second, with no allocation per frame.
  - The walk frame changes every 8 px, and facing follows the way they go.
  - A stander with a loop takes the walk pose while it moves.
  - Pause people stops them, and reduced motion keeps everyone where `place.py` put them.
- **Leaving:** Back to map, Escape, or zooming out past the smallest scale returns to the map as it was, with focus back where it was.
- **Loading:**
  - `place-view-*.js`, `place-builder-*.js` and the atlas load on the first entry only, and each chunk has a size-limit entry.
  - The view sends one place request at a time, waits at most 15 s, and fails only the place a `PlaceError` names.
  - A failed load of the art or the place shows Try again, and every later entry tries again.
- **Accessibility:**
  - the picture's `img` role and name sit on a wrapper that the canvas swaps keep;
  - focus moves to Back to map on entry, and returns on exit;
  - the status line reads the place: "<name>, a <tier> of N people in <country>: X people are out, Y of them walking."
- **Test hooks:** `window.__map` gains `camera` and `map`, and `window.__place` is the town view's.

## The Town skin (owner request, 10 October 2026)

The owner asked on 10 October 2026 for the town view's art on the first screen. The Town skin draws Highcourt, the town `town.nmap` is exported from, with the place pass, and the sim's agents as its people. It is an early first cut of Skin C (M3.3).

### `@nomos/render-gl/town`

- **`TownPainter`,** in `renderer/types.ts`: `draw(camera: Camera, alpha: number, view: TownView): number | undefined`. `TownView` is what the renderer lends each draw: `drawnSkin`, `retained` (the two latest snapshots), `canvas` and `dpr`.
  - When `drawnSkin` is the town, it draws and returns the agents drawn. Otherwise it hides its canvas and returns undefined, and the renderer draws the dots.
  - The first-load renderer chunk gains only this hook, `setTown`, `BUILT_SKINS`, the town check in the skin choice, and the word readers the people use, `lookOf`, `actionOf` and `facingOf`, since `sim-protocol`'s `visual.ts` sits in that chunk.
- **`TownSkin`,** the `./town` export, is a `TownPainter`: `new TownSkin(canvas: HTMLCanvasElement, layout: PlaceLayout, page: AtlasPage, options?: LifecycleOptions)`.
  - It draws through a `createPlaceRenderer` of its own, on its own canvas over the dots' canvas, at `{ x: camera.x, y: camera.y, scale: camera.zoom }`, since a world px is an art px. Its canvas takes the dots' canvas's device size and dpr whenever they change.
  - While it shows, the dots' canvas is hidden, so assistive tech meets one picture.
  - It reads `canvas`, which its Canvas2D fallback replaces, and `dispose()` disposes its place renderer.
- **People,** `town/people.ts`'s `TownPeople`: one person per agent in the layout's `people` columns, rewritten every draw from the snapshots.
  - **x and y:** eased by alpha as the dots are, `prev × (1 − alpha) + cur × alpha`, or the current place after a jump of more than 16 px, rounded to whole art px. A snapshot's world px are art px, tile × 16 plus the offset in the tile, and the anchor is the blob's ground point.
  - **look:** `lookOf(word)`, one of the same 96 looks as `looks.py`'s.
  - **pose:** walk when `actionOf(word)` is walk, else stand. Expression is neutral, with no job or emote yet.
  - **facing:** from the move between the two snapshots, along its larger axis, or `facingOf(word)` for a blob that stood still or jumped.
  - **step:** `(along >> 3) & 1`, where `along` is the drawn x of a blob facing left or right and the drawn y of any other, so the walk frame changes every 8 art px walked; 0 for a stander.
  - The columns regrow to the agent count when it changes, the one time the place is set again; a frame allocates nothing.
- **Imports:** `src/place`, `src/map`'s `frames.ts` for its types, the renderer's types, and `sim-protocol`.

### In `web`

- **Loading:** after `app:interactive`, `main.ts` calls `loadTownSkin(app)` from the camera input's chunk, which imports `view/town-skin.ts`, so the entry chunk holds no import of its own. `town-skin.ts` builds as its own chunk, `town-skin-*.js`. Its `mountTownSkin(app)`:
  - adds `<canvas id="town">` to `#view` after `#world`, hidden, as an image named for the town;
  - in idle time, through `requestIdleCallback` or a timeout where Safari lacks it, starts a map worker, sends a `TownRequest`, and terminates the worker once it answers;
  - loads `atlas/atlas.json` and `atlas/atlas.webp` at the same time, as the town view does;
  - once both are in, makes a `TownSkin` on the app renderer's backend, so `?canvas` draws it in Canvas2D, lends it with `app.renderer.setTown` and redraws.
  - A failed load keeps the dots and logs why.
- **Skins:** the HUD's toggle is unchanged.
  - Auto shows the town at `autoSkin`'s town level: from 6.9 CSS px a tile with at most 425 agents in view, kept down to 5.1 px and 575 agents.
  - Dots and Town fix the skin, and Blobs still shows dots.
  - Until the town is lent, Town and Auto draw dots.
- **Chunks:** `vite.config.ts`'s `render-gl` chunk group leaves out `src/town` too, so the town never joins the renderer chunk.
  - The town view, the map view and the Town skin share the place renderer and the scenes' common modules, which so build as shared chunks, `renderer-*.js` and `lifecycle-*.js`.
  - size-limit gates `town-skin-*.js` and those two shared chunks, each with an entry.
- **Test hooks:** none new. `window.__app.renderer.drawnSkin` reads `town` once the town draws.
