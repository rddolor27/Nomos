# M0 interfaces: the contract between sub-milestones

M0's sub-milestones are planned in parallel, so the names and layouts they share are fixed here first. Each item has one owner, the sub-milestone that builds it, and plans that consume an item use it exactly as written. A plan that refines an item updates this file in the same commit. If code later changes an interface, a separate docs commit next to the code commit updates it, since code and docs never share a commit.

## Packages

| Package | Path | Role | Built in |
| --- | --- | --- | --- |
| `@nomos/sim-core` | `packages/sim-core` | Pure TypeScript sim with no DOM: draws, noise, calendar, agent store, ledgers, exact maths, and the world step | M0.1–M0.3 |
| `@nomos/sim-protocol` | `packages/sim-protocol` | Constants, the snapshot layout, the binary map format, the sprite-manifest schema and the worker messages, shared by every side | M0.3, map in M0.4, sprite manifest in M0.5 |
| `@nomos/sim-worker` | `packages/sim-worker` | The Web Worker: timing, pause and checkpoints around sim-core's world step | M0.3 |
| `@nomos/render-gl` | `packages/render-gl` | `WorldRenderer` on WebGL2, with the Canvas2D fallback | M0.4 |
| `@nomos/web` | `apps/web` | The page: load path, HUD, charts, tiers and accessibility | M0.5 |
| `@nomos/cli` | `tools/cli` | Headless runs and replay hashes in Node, through sim-core's world step | M0.3 |
| `@nomos/bench` | `tools/bench` | The CI budget, allocation and startup gates | M0.6 |
| `@nomos/sim-culture` | `packages/sim-culture` | Culture code, walled off from crime, police, labour, wage, wealth, ability, housing and migration code | M0.6 |
| `@nomos/names` | `tools/names` | The name lint, its real-world fixture and the culture text lint; M3.7 extends it | M0.6 |

Dependencies point one way:
- `sim-core` ← `sim-protocol` ← `sim-worker`;
- `render-gl` imports only `sim-protocol`;
- `web` imports `sim-protocol` and `render-gl`, and `sim-worker` only for its `./worker` export, which it starts;
- `cli` imports `sim-core` and `sim-protocol`;
- `sim-culture` imports values only from the `@nomos/sim-core/kernels` subpath (the draws, `DAYS_PER_YEAR`, the stream ids `CULTURE` and `FESTIVAL`, and the culture column helpers), whose modules never import it. `sim-core`'s `consumption/` and its orchestration call `sim-culture`, and dependency-cruiser keeps modules acyclic (M0.6).

The world step lives in `sim-core`, so headless runs and the worker run the same code.

## The world step (owner: M0.3)

- **Creation:** `createWorld(seed: number, tier: Tier, ground?: Ground): World`, and `restoreWorld(seed, tier, state: ArrayBuffer, ground?: Ground): World` for checkpoints. A `World` holds the agent store, the ledgers, the tick counter and `world.ground`.
- **Ground (M0.4):** `{ width, height, walk: Uint8Array }` in `sim-core`, tiles row-major from the top-left, where nonzero means walkable. A `MapV1` is a `Ground`, so `sim-core` never imports `sim-protocol`.
  - The ground is an unhashed input: it stays out of the arena and the hash, and a restore must pass the same ground.
  - Without one, `standInGround()` gives a 256 × 256 all-open square, as in the CLI.
  - `layoutWorld` throws `RangeError` when `walk.length` isn't `width × height`, and `populate` when no tile is open.
- **Stepping:** `step(world: World, timer?: SystemTimer): void`, one tick per call.
  - `SystemTimer` is `{ lap(system: number): void }`, called after each system, so the worker and the benches time systems without clocks in `sim-core`.
  - `SYSTEM_NAMES` is `['day', 'move']` in M0.3, and later systems append to it.
- `stateHash(world: World): number`: a 32-bit hash over every replay-relevant column and ledger, the value the determinism checks compare. M0.6 adds `stateHashExcept(world, skip: readonly ArrayBufferView[]): number`, of which `stateHash` is the case with nothing skipped, so no golden moves; the relabel test skips the culture columns.
- `World.cultureUid`: a canonical `Uint8Array(MAX_CULTURES)` of stable culture uids, c + 1 per culture and 0 when unused. Culture-level draws key on it, never on the index (M0.6, R8).
- Seed 42's replay hashes at tick 1,000, one per tier, live in `packages/sim-core/test/fixtures/goldens.json`, keyed `"<seed>/<tier>"`; the Node, Bun and browser checks all read it. A commit that moves the sim on purpose regenerates it with `node packages/sim-core/scripts/goldens.ts` (M0.6).
- `Tier` is `'phone' | 'phone-plus' | 'desktop'`, with agent caps of 10,000, 25,000 and 100,000. `sim-protocol` re-exports `Tier` and `TIER_AGENTS` from its `messages.ts` (M0.3).

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
  - `{ type: 'init', seed, tier, map: ArrayBuffer }`
  - `{ type: 'pause' }` and `{ type: 'resume' }`
  - `{ type: 'return', buffer: ArrayBuffer }`
  - `{ type: 'checkpoint' }`, which the app sends on `pagehide`
- Worker to app:
  - `{ type: 'ready', agents }`. A tick-0 snapshot follows (M0.4), then the worker waits for `resume`. Under reduced motion the app withholds `resume` (M0.5).
  - `{ type: 'snapshot', tick, count, buffer: ArrayBuffer }`
  - `{ type: 'stats', tick, systemMs: Record<string, number> }`, keyed by `SYSTEM_NAMES` plus `snapshot`, the mean milliseconds per snapshot (M0.3)
  - `{ type: 'checkpoint', tick, state: ArrayBuffer }`, the answer to the app's `checkpoint`
- `sim-protocol`'s `bindPageLifecycle(doc, win, post): void` sends `pause` and `resume` on `visibilitychange`, and `checkpoint` on `pagehide`. M0.5 wraps it.
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
  - `observeDeviceSize(element, onSize, forceFallback?)` calls `onSize(deviceWidth, deviceHeight, dpr)` as the element resizes and returns an unsubscribe function;
  - `skinFromQuery`, `builtSkin`, `autoSkin`, and `mountSkinToggle(parent, renderer: SkinRenderer, initial: Skin | 'auto')`;
  - `CANVAS2D_AGENT_CAP` = 5,000, the most agents in view that Canvas2D draws (R2);
  - `contrastRatio`, `edgeFor` and `minimapPixels`.

## Culture (owner: M0.6)

- `@nomos/sim-core/kernels` exports `draw1`–`draw4`, `DAYS_PER_YEAR`, the stream ids `CULTURE` (0x101) and `FESTIVAL` (0x105), `customOf`, `withCustom`, `CUSTOM_FOOD`, `CUSTOM_FESTIVAL`, `CUSTOM_MUSIC`, `CUSTOM_NAMING` and `MAX_CULTURES` (8). Later code adds more.
- `sim-culture` exports `STAND_IN_FESTIVAL_DAYS` (10) and `festivalToday(seed, uid, day): boolean`, true when `draw2(seed, FESTIVAL, uid, day) % DAYS_PER_YEAR < STAND_IN_FESTIVAL_DAYS`. Callers pass a uid from `World.cultureUid`, never a culture's index, and M3.7's festival table replaces it.
- `sim-core`'s `festivalShoppers(world, day): number`, in `consumption/stand-in.ts` and exported from its index, counts the agents whose festival custom's culture holds a festival that day. It stands in for consumption until M2.6, and the step never calls it.
