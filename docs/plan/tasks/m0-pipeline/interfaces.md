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
| `@nomos/sim-culture` | `packages/sim-culture` | Culture code, walled off from crime, police, labour, wage, wealth, ability, housing and migration code; it also turns name keys into names | M0.6, names in M0.7 |
| `@nomos/names` | `tools/names` | The name lint, its real-world fixture, the shared mixed sound set, the person-name filter and the culture text lint; M3.7 extends it | M0.6, sound set and person-name filter in M0.7 |

Dependencies point one way:
- `sim-core` ← `sim-protocol` ← `sim-worker`;
- `render-gl` imports only `sim-protocol`;
- `web` imports `sim-protocol` and `render-gl`, and `sim-worker` only for its `./worker` export, which it starts;
- `cli` imports `sim-core` and `sim-protocol`;
- `sim-culture` imports values only from the `@nomos/sim-core/kernels` subpath (the draws, `DAYS_PER_YEAR`, the stream ids `CULTURE` and `FESTIVAL`, and the culture column helpers), whose modules never import it. `sim-core`'s `consumption/` and its orchestration call `sim-culture`, and dependency-cruiser keeps modules acyclic (M0.6);
- `web` imports `sim-culture` only in `src/panels/inspector.ts`, which loads on demand, for `personName` (M0.7);
- `tools/names` writes `sim-culture`'s generated `naming/words.ts` and checks it; no package imports `tools/names` at run time. `names` imports `@nomos/sim-core/kernels`, for the keyed draw that picks its sounds (M0.7).

The world step lives in `sim-core`, so headless runs and the worker run the same code.

## Layout (owner: M0.7)

The owner decided on 9 October 2026 that every package groups its source into module folders by concern. The rules:
- **Entry files only at `src/`:** `index.ts`, a subpath export such as `kernels.ts`, and any file that a package script, CI or a test runs or bundles by path. Every other source file sits in a concern folder directly under `src/`, and a lint reports any that doesn't.
- **One level of concern folders.** The culture wall matches `packages/sim-*/src/<concern>/`, so `crime`, `police`, `labour`, `wages`, `wealth`, `ability`, `housing` and `migration` are each a top-level folder when they arrive, never nested in another folder.
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

Skin B and Skin C arrive as `blobs/` and `town/` beside `dots/` (M1.3, M3.3).

**`apps/web/src`**

| Folder | Files | Concern |
| --- | --- | --- |
| `src/` | `main.ts` | The entry `index.html` loads |
| `app/` | `app.ts`, `boot.ts`, `lifecycle.ts`, `query.ts`, `tiers.ts` | The app shell: boot hand-off, worker link, query, tiers and the page lifecycle |
| `view/` | `camera-input.ts` | Pointer and keyboard input on the view, and the click that inspects; it loads after the first frame, as the charts do (M0.7) |
| `panels/` | `hud.ts`, `charts.ts`, `controls.ts`, `inspector.ts` (new) | The HUD, the lazy charts and controls, and the on-demand inspector |

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

- **Creation:** `createWorld(seed: number, tier: Tier, ground?: Ground): World`, and `restoreWorld(seed, tier, state: ArrayBuffer, ground?: Ground): World` for checkpoints. A `World` holds the agent store, the ledgers, the tick counter, `world.ground`, and `world.blob`, the world's `Blob` handle, made once in `layoutWorld` (M0.7).
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
- `Tier` is `'phone' | 'phone-plus' | 'desktop'`, with agent caps of 10,000, 25,000 and 100,000. `sim-protocol` re-exports `Tier` and `TIER_AGENTS` from its `messages.ts` (M0.3).

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
- **Per-tick loops** use the accessors or plain columns, and call no method per blob. A method per blob made the four-way `move` 2.0–2.8× slower, while accessors cost 7% (M0.7's brief, measured here in Node 24.18.0, V8 only); M0.7's A/B check re-measures on the free-heading `move`.
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
  - `{ type: 'init', seed, tier, map: ArrayBuffer, checks: boolean }`; `checks` sets `world.checks`, and the app sends true only from development builds (M0.7)
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

- In `render-gl`: `createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer`.
  - `RendererOptions` is `{ release(buffer: ArrayBuffer): void; backend?: 'auto' | 'canvas2d'; restoreTimeoutMs?: number }`. `'canvas2d'` skips WebGL2, as `?canvas` asks. A lost WebGL2 context falls back to Canvas2D after `restoreTimeoutMs`, 3,000 ms by default.
  - `WorldRenderer` reads `backend` (`Backend`, `'webgl2' | 'canvas2d'`), `canvas` (the fallback replaces it), `drawnAgents` and `drawnSkin`.
  - Its methods are `init(): Backend`, `resize(deviceWidth, deviceHeight, dpr)`, `setMap(map: MapV1)`, `pushSnapshot(frame)`, `draw(camera: Camera, alpha: number)`, `setSkin(skin: Skin): Skin`, `setLod(policy: 'auto' | 'fixed')` and `dispose()`. `init` falls back to Canvas2D when WebGL2 is missing or a shader fails to link.
- `pushSnapshot` takes `{ tick, count, buffer }`, exactly as the worker sends it. It copies the snapshot and hands the buffer to `options.release` on every push, even when nothing draws, so the worker's pool never runs dry.
- `Skin` is `'dots' | 'blobs' | 'town'` (`SKINS`), and `BUILT_SKINS` is `['dots']`. `setSkin` returns the skin it will really draw, dots until the others are built (R3). Under `setLod('auto')`, the default, `autoSkin` picks dots or town each draw from the tile's CSS size and the agents in view.
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
  - `profanity`: LDNOOBW's 21 Latin-script lists (CC BY 4.0), exact for 3-letter entries and by substring for 4 or more.

  M3.7 adds real festival names and runs it over places and festivals.
