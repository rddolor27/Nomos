# M0.4 Renderer and Skin A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One WebGL2 `WorldRenderer` drawing 10,000 agents as Skin A's shape-coded dots over the town's zone colours, with an integer-zoom camera, a skin switch, context-loss recovery and a pixel-identical Canvas2D fallback, fed by one binary map the worker loads too.

**Architecture:** A Python exporter turns a fixed seed of the place generator into map v1, which `sim-protocol` parses for worker and renderer alike. `render-gl` uploads each 12-byte snapshot as it arrives, then draws zone colours in one full-screen pass and agents as instanced dots cut by integer shape masks, snapped to texels and device pixels. Playwright drives a Vite harness page in `render-gl`, since `apps/web` arrives in M0.5.

**Tech Stack:** TypeScript, WebGL2, Canvas2D, Vite 8, Vitest, Playwright (Chromium with SwiftShader, Firefox, WebKit), Python 3.12 with numpy, Pillow and colorspacious 1.1.2.

**Spec:** [task.md](task.md), [interfaces.md](../interfaces.md), and the [M0 Pipeline][m0] and [Performance budget][perf] sections.

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, then a body whose `Task:` line names the task by ID and title, such as `Task: M0.4 Renderer and Skin A, task 1: The binary map format`, and no co-author.
- One custom WebGL2 renderer, no PixiJS or Phaser; every skin reads the same 12-byte snapshot (web rules, R3).
- Integer device-pixel zoom, texel and camera snapping, no CSS scaling, and a working Canvas2D fallback (web rules).
- The recorded view never shows a true-only cue. Skin A draws no cue, so its render-filter test checks that the `trueOnly` bit changes no pixel; M4 extends it to the recorded view (web rules).
- Palette: body #F7C948, police #283A7C, merchant #2A9D8F, a 1-px dark outline by day; red and orange only for crime and alerts (web rules, R3).
- One blob body: Skin A codes role only, never look, culture, wealth or record. No role wears black, so `OUTLINE` (#020202) is an edge, never a fill. Police stay neutral (content rules 1, 6, 7).
- No "Pokémon", "Poké-" or "-mon" names; generic building names (content rules).
- One binary map for generated and hand-made maps, naming frames, never atlas indices, served with a compressible content type (web rules, R5, R9).
- Dots at 10k: median ≤ 1 ms and p95 ≤ 4 ms of main-thread upload and draw per frame at 4× CPU; the town map ≤ 40 KB brotli (Performance budget).
- `render-gl/src` imports only `sim-protocol`; only the test harness may start `sim-worker` (interfaces).
- Relative imports carry `.ts`; never import `docs/research/*/prototypes/`; keep it simple and comment only the why (code rules).

## Review Focus

1. **A corrupt or truncated map**, such as an HTML 404 page, throws `MapError` naming the problem, never a `RangeError` or half a map (Task 1).
2. **A hidden tab** stops animation frames while snapshots arrive, so buffers return on push, not on draw, or the worker's pool runs dry (Task 5).
3. **0 agents, or more than ever** (births): the map alone, then grown GPU buffers, with no throw (Task 5).
4. **Agents far off the canvas**, at ±1,000,000 px: nothing drawn, nothing thrown. An agent just off the map but in view is drawn, with a rim (Task 5).
5. **A zero-size canvas** while the layout collapses: `resize(0, 0, dpr)` and `draw` throw nothing (Task 6).

---

### Task 1: The binary map format (R5, R9)

**Files:**
- Create: `tools/worldgen/mapfile.py` (writes `packages/sim-protocol/test/fixtures/tiny.nmap`), `packages/sim-protocol/src/map.ts`
- Modify: `packages/sim-protocol/src/index.ts`
- Test: `packages/sim-protocol/test/map.test.ts`

**Interfaces:**
- Produces map v1, little-endian (owner M0.4):

  | Part | Layout |
  | --- | --- |
  | Header, 16 B | u32 `MAP_MAGIC = 0x50414D4E` ("NMAP"), u16 version 1, u16 width and u16 height in tiles (1–1024), u16 kinds (1–255), u16 frames, u16 entities |
  | Kinds | u8 r, g, b, u8 name length, ASCII name |
  | Frames | u8 name length, ASCII `category/name` |
  | `terrain` | u8 kind index per cell, row-major from the top-left |
  | `walk` | u8 per cell: `WALK_BLOCKED = 0`, `WALK_OPEN = 1`, `WALK_ROAD = 2`, `WALK_DOOR = 3` |
  | `tiles` | u16 frame index per cell, `NO_FRAME = 0xFFFF` |
  | Entities, 18 B | u8 kind (`ENTITY_HOME = 1`, `ENTITY_WORKPLACE = 2`, `ENTITY_SHOP = 3`, `ENTITY_CIVIC = 4`), u8 w, u8 h, u8 0, u16 x, y (footprint top-left), u16 doorX, doorY, u16 frame, u16 a, b |

  `a` is a home's capacity (≥ 1) or a shop's opening minute (0–1439), `b` its closing minute (after opening, ≤ 1440); otherwise both are 0. Nothing follows. Frame names are the stable ids ([editor-tech.md §4][et]).
- Produces from `sim-protocol`: `TerrainKind { name: string; rgb: number }`; `MapEntity { kind: 1 | 2 | 3 | 4; x, y, w, h, doorX, doorY, frame, capacity, opens, closes: number }`; `MapV1 { version: 1; width, height: number; kinds: TerrainKind[]; frames: string[]; terrain: Uint8Array; walk: Uint8Array; tiles: Uint16Array; entities: MapEntity[] }`; `MapError`, named `'MapError'`; `parseMap(buffer: ArrayBuffer): MapV1`, copying every array; `MAP_EXTENSION = '.nmap'`; and `MAP_CONTENT_TYPE = 'application/x-protobuf'`, which Cloudflare's docs list as compressed, unlike `application/octet-stream`; whether Cloudflare honours a type set through `_headers` is unverified ([load-memory.md §4][lm]).
- Produces in Python `write_map(width, height, kinds, frames, terrain, walk, tiles, entities) -> bytes` with `Entity(kind, x, y, w, h, door_x, door_y, frame, a=0, b=0)`, raising `ValueError` on any rule `parseMap` checks.

- [ ] **Step 1: Write the fixture.** `mapfile.py` writes a 3×2 `tiny.nmap` with four kinds, every walk value, one `NO_FRAME` tile, a home of capacity 3 and a shop open 480–1200, naming real frames such as `nature/terrain_grass_0`; `--check` compares with the committed file and exits 1 on a difference. Run `python tools/worldgen/mapfile.py && python tools/worldgen/mapfile.py --check`. Expected: exit 0.
- [ ] **Step 2: Write the failing tests:** `reads the Python fixture`, every value `mapfile.py` wrote; `copies its arrays`, zeroing the input afterwards changes nothing; `rejects broken maps with MapError` for `<!doctype html>`, version 2, every truncation, a trailing byte, an out-of-range terrain index, walk value, tile index or entity kind, a footprint or door outside the map, capacity 0 and closing before opening. Run `pnpm test map`. Expected: FAIL, no `map.ts`.
- [ ] **Step 3: Implement** with one `DataView` cursor that checks the remaining length before each read, so a short buffer is a `MapError`. Run `pnpm test && pnpm lint && pnpm typecheck`. Expected: PASS.
- [ ] **Step 4: Commit**

```bash
git add tools/worldgen/mapfile.py packages/sim-protocol
git commit -m "feat(sim-protocol): add the binary map v1"
```

### Task 2: The town map (R3, R5, R9)

**Files:**
- Create: `tools/worldgen/export_map.py` (writes `assets/maps/town.nmap`), `tools/requirements.txt`
- Modify: `tools/worldgen/place.py`, `tools/licenses.py`, `assets/LICENSES.md`, `.github/workflows/ci.yml`
- Test: `packages/sim-protocol/test/town-map.test.ts`

**Interfaces:**
- Consumes: `write_map`; `place.Site`, `lay_ground`, `build_settlement`, `tile_for`; `showcase.Sheets`; `spritekit.PALETTE`.
- Produces `place.build_site(ctx) -> Site`, with `build(ctx)` now `build_site(ctx).layout()`; `export_map.export(ctx) -> bytes`; and the committed `assets/maps/town.nmap`.

The exporter's rules:
- **Town:** `PlaceContext(seed=0xC0FFEE42, name='Highcourt', biome='grassland', temperature=140, moisture=140, tier='capital', population=52000, river='ns', roads='new', landmarks=('clock-tower', 'library', 'fountain'))`, 48×28 tiles. Round 9's default town is a fixed generator seed, with LDtk only as a fallback ([summary][r9s], [map-pipeline.md][mp]); no `town.ldtk` exists, so M0 has no LDtk importer.
- **Cells:** terrain is `site.kind`, but footprints take the built kinds `home`, `workplace`, `shop`, `civic` or `landmark`; tiles name `tile_for`'s frame. Walk, first match: door on an entity's door tile; blocked on a footprint (`site.big`) or on a solid that is not an animal (cow, sheep, goat, horse, chicken, duck, dog, cat); road where `site.road` (paths, paving, bridges); blocked on water and cliffs; open otherwise.
- **Entities:** homes are `houses/house_*`, with capacity by form: hut 2, detached 4, row unit 4, farmhouse 6, apartment 24 (plan values). Shops: `shop_general` 480–1200 and `shop_market-stall` 360–840. Workplaces: `shop_warehouse` and `work_*`. Civic: `civic_*`. Landmarks block walking but are not entities. A door comes from `site.doors`, matched to a footprint by name and by lying on the row just below it, since names repeat; a stall that `plaza_piece` built has none there, so it takes `Site.settle`'s door, the tile below its footprint's middle. A door on a footprint or off the map raises `ValueError`.
- **Colours:** a ground kind takes the mean opaque colour of its first non-shore tile, snapped by squared RGB distance to the nearest of `GRASS_L`, `GRASS`, `LEAF_D`, `SAND`, `SAND_D`, `WOOD_L`, `WOOD_D`, `WATER_L` and `WATER`; built kinds take `PLUM` (home), `STONE` (workplace), `CREAM_D` (shop), `STONE_L` (civic) and `WOOD` (landmark). No role, alert, edge, background or body-hue colour reaches the ground.

- [ ] **Step 1: Write the failing tests** on the committed map: `is the 48×28 capital`, whose kinds include grass, water, path, paving, home, shop, civic and workplace; `blocks every footprint and opens every door`: footprints have walk 0 and their entity's kind, each door walk 3 just below; `houses and opens the town`: ≥ 20 homes of capacity ≥ 2, ≥ 1 shop with `opens < closes`, and the frames `buildings/civic_police-station` and `buildings/civic_town-hall`; `fits the map budget`: ≤ 40,000 bytes after `brotliCompressSync` at quality 11. Run `pnpm test town-map`. Expected: FAIL.
- [ ] **Step 2: Add `build_site`, then the exporter** and `tools/requirements.txt` (`numpy>=2.1,<3`, `pillow>=11,<13`). The exporter prints its kinds and entities and calls `write_licenses()`, which lists `maps/` with the exporter as source; `--check` compares instead. Run `python tools/worldgen/place.py --demo`. Expected: the same houses, people and trees counts as before the change. Then run `python tools/worldgen/export_map.py && python tools/worldgen/export_map.py --check && pnpm test`. Expected: PASS, with `maps/town.nmap` in `assets/LICENSES.md`. A probe of these rules found 25 homes (all row units), 6 civic buildings, 4 shops and 3 workplaces, every door on a road, one walkable area of 958 cells, and about 1.4 KB after brotli (computed).
- [ ] **Step 3: Add to CI** after `actions/setup-python`: `pip install -r tools/requirements.txt` and both `--check` runs. Commit:

```bash
git add tools/worldgen/place.py tools/worldgen/export_map.py tools/requirements.txt tools/licenses.py assets/maps assets/LICENSES.md packages/sim-protocol/test/town-map.test.ts .github/workflows/ci.yml
git commit -m "feat(worldgen): export the default town as a binary map"
```

### Task 3: render-gl, its harness and the minimap (R3)

**Files:**
- Create: `packages/render-gl/{package.json, tsconfig.json}`, `src/{index.ts, types.ts, renderer.ts, webgl.ts, colour.ts, minimap.ts, skin-a.json}`, `harness/{index.html, main.ts, vite.config.ts}`; root `playwright.config.ts` and `.npmrc`
- Modify: root `package.json`, `.gitignore`, `.github/workflows/ci.yml`
- Test: `packages/render-gl/test/minimap.test.ts`, `test/browser/minimap.spec.ts`

**Interfaces:**
- Produces `skin-a.json`, the one home of Skin A's colours, each `{ "name": <spritekit name>, "rgb": "#RRGGBB" }`: citizen `BODY` #F7C948, merchant `TEAL` #2A9D8F, police `NAVY` #283A7C, outline `OUTLINE` #020202, rim `CREAM` #F6F0DE, background `STONE_D` #464C5E ([report][r3r]).
- Produces `contrastRatio(a: number, b: number): number` (WCAG 2); `edgeFor(rgb: number): 'outline' | 'rim'`, the edge with more contrast; `minimapPixels(map: MapV1): Uint8Array`, an RGBA texel per tile in its kind's colour, alpha 0 for outline and 255 for rim.
- Produces `type Backend = 'webgl2' | 'canvas2d'`; `Camera { x: number; y: number; zoom: number }`, world px at the view's top-left and device px per texel; `RendererOptions { release(buffer: ArrayBuffer): void }`; and `createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer` with `init(): Backend`, `resize(deviceWidth: number, deviceHeight: number, dpr: number): void`, `setMap(map: MapV1): void`, `draw(camera: Camera, alpha: number): void`, `dispose(): void` and `readonly backend: Backend`.
- Produces `window.harness` with `boot({ css?: [w, h] })` (town map set; 320×180 by default), `view(camera)`, `draw(alpha = 1): FrameStats` and `pixel(x, y)`. `FrameStats` is `{ backend: Backend; width: number; height: number; counts: Record<string, number> }`, a count per lowercase `#rrggbb`, read back with `readPixels` in the same task as the draw.

- [ ] **Step 1: Scaffold.** `@nomos/render-gl` depends on `@nomos/sim-protocol: workspace:*`, with `vite` ^8 as a devDependency (today it arrives only as vitest's peer), adds DOM and `resolveJsonModule` to its tsconfig, and runs the harness with `"harness": "vite harness --port 5174 --strictPort"`, which serves `.nmap` as `MAP_CONTENT_TYPE`. A root `playwright.config.ts` runs `**/test/browser/**/*.spec.ts` against it in chromium (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`), firefox and webkit, through `"test:browser": "playwright test"`; `test-results/` is ignored. The root `playwright` package already carries the runner, so specs import `playwright/test` and no `@playwright/test` is added. A root `.npmrc` sets `shell-emulator=true`, so scripts that set a variable, such as Task 9's `golden`, run on Windows too. A CI `browser` job installs the three browsers with `--with-deps` and runs `pnpm test:browser`. Run `pnpm install && pnpm exec playwright install chromium firefox webkit`. Expected: both succeed.
- [ ] **Step 2: Write the failing tests:** `colours each tile by its kind` on the fixture, alpha as `edgeFor` picks; `chooses the edge with more contrast`: `edgeFor(0x4CAA3C)` is `'outline'`, `edgeFor(0x464C5E)` is `'rim'`. In all engines: `draws each tile in its zone colour` at `pixel((tx·16 + 8)·2, (ty·16 + 8)·2)` under camera `{ x: 0, y: 0, zoom: 2 }`, after `boot({ css: [1536, 896] })`, which holds the whole map; `fills outside the map with the background`, #464C5E at (10, 10) under `{ x: -64, y: -64, zoom: 1 }`; `sizes the frame from resize`, 640×360 after `resize(640, 360, 2)`. Run `pnpm test minimap && pnpm test:browser minimap`. Expected: FAIL.
- [ ] **Step 3: Implement.** `init` asks for `webgl2` with `alpha`, `antialias`, `depth`, `stencil` and `preserveDrawingBuffer` false. `draw` clears to the background, then one full-screen triangle maps each device pixel, counted from the top-left, to world pixel `floor((pixel + camDev) / zoom)`, with `camDev = round(camera.x·zoom)` and likewise y. It fetches that pixel's tile, world pixel `>> 4`, with `texelFetch`, so no colour is interpolated ([rendering-tooling.md §4][rt]). `dispose` deletes every GL object and calls `WEBGL_lose_context.loseContext()`. Run `pnpm test && pnpm test:browser && pnpm lint && pnpm typecheck`. Expected: PASS in all three projects.
- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .npmrc .gitignore playwright.config.ts .github/workflows/ci.yml packages/render-gl/package.json packages/render-gl/tsconfig.json
git commit -m "build(render-gl): add the package and Playwright"
git add packages/render-gl
git commit -m "feat(render-gl): draw the map's zone colours"
```

### Task 4: The worker loads the map (R3, R9)

**Files:**
- Modify: `packages/sim-core/src/{world,wander,index}.ts` (M0.3's world step); `packages/sim-worker/src/{loop,worker}.ts`; `packages/render-gl/package.json` (devDependency `@nomos/sim-worker`)
- Create: `packages/render-gl/harness/{worker.html, worker.ts}`
- Test: `packages/sim-core/test/ground.test.ts`, `packages/sim-worker/test/loop.test.ts`, `packages/render-gl/test/browser/worker-map.spec.ts`

**Interfaces:**
- Consumes: the worker messages; M0.3's `createWorld`, `restoreWorld`, `populate`, `move`, `SPAWN`, `createSimLoop` and `LoopHost.makeWorld`; M0.1's `below`; Task 1's `parseMap`.
- Produces in `sim-core`, **refining interfaces.md's world step**, which M0.3 built before any map existed:
  - `interface Ground { width: number; height: number; walk: Uint8Array }`, in tiles, a cell being walkable when its walk value is nonzero; a `MapV1` is a `Ground`, and `sim-core` never imports `sim-protocol`;
  - `createWorld(seed, tier, ground?: Ground)` and `restoreWorld(seed, tier, state, ground?: Ground)`, defaulting to a 256 × 256 all-open ground, so the CLI and M0.3's tests keep one code path; `World` gains `readonly ground: Ground`, which replaces the square `extent`. `layoutWorld(seed, tier, agents, memoryBytes, ground?: Ground)` takes the same default, since M0.3's warm-up and stride test and M0.6's relabel harness call it with four arguments;
  - `populate` puts agent i at the centre of walkable cell `below(open, seed, SPAWN, i, 0)`, counting the `open` walkable cells in row-major order, in Q8 `(cx·16 + 8)·256`. It lists the open cells once per call: a scan per agent would take 6.5 billion steps for 100,000 agents on the default ground. `move` bounds by the ground's size and turns back from a step onto walk 0 as from a step off the map.
- Produces in `sim-worker`, **refining interfaces.md's worker messages**: `worker.ts` binds `makeWorld` to `createWorld(seed, tier, parseMap(map))`, and a bad map throws `MapError` out of the handler, which the page sees as the Worker's `error` event. In `loop.ts`, right after `ready`, the loop posts a snapshot of tick 0 from a free view, so a page that starts paused still draws its agents (M0.5). M0.3's `"./worker": "./src/worker.ts"` export is the entry the harness and M0.5 import through Vite's `?worker` suffix.

- [ ] **Step 1: Write the failing tests:**
  - `keeps agents on walkable cells` (Node): on a 32 × 32 ground open only in the 12 × 6 cells from (4, 10), `createWorld(42, 'phone', ground)` puts every agent inside, and after each of 1,000 steps every agent is still inside;
  - `keeps the stand-in world`: without a ground, `world.ground` is 256 × 256 and all open;
  - `restores onto the same ground`: a checkpoint at tick 500 restored with the ground reaches tick 1,000 with the original's hash;
  - `posts the spawn after ready` (`loop.test.ts`, M0.3's fake host): after `init`, the posts are `ready`, then a `snapshot` of tick 0 with `count` equal to `agents`, and nothing more until `resume`. M0.3's `posts ready and waits` now expects those two posts, and `posts snapshots only while a buffer is free` counts the tick-0 snapshot as the first of its three;
  - in Chromium, where the harness returns every snapshot buffer: `spawns every agent on a walkable tile`: seed 42, tier `phone` and the town map give `ready.agents` 10,000, then a tick-0 snapshot in which every agent has `walk[floor(y/16)·48 + floor(x/16)] !== 0`; `serves the map with its content type`, `MAP_CONTENT_TYPE`; `fails loudly on a bad map`: `<!doctype html>` fires the Worker's `error` within 2 s, with `MapError` in its message.

  Run `pnpm test ground loop && pnpm test:browser worker-map --project=chromium`. Expected: FAIL.
- [ ] **Step 2: Implement the ground** in `sim-core`. Run `pnpm test ground world && pnpm lint && pnpm typecheck && node tools/cli/src/main.ts --seed 42`. Expected: PASS, then one hash line.
- [ ] **Step 3: Bind `makeWorld` to the map** and post the tick-0 snapshot. Run `pnpm install && pnpm test && pnpm test:browser worker-map --project=chromium`. Expected: PASS. Commit:

```bash
git add packages/sim-core/src packages/sim-core/test/ground.test.ts
git commit -m "feat(sim-core): spawn and walk agents on a map's open cells"
git add packages/sim-worker packages/render-gl pnpm-lock.yaml
git commit -m "feat(sim-worker): load the map in init and post the spawn snapshot"
```

### Task 5: Skin A dots and their palette (R2, R3)

**Files:**
- Create: `packages/sim-protocol/src/jobs.ts`; `packages/render-gl/src/dots.ts`, `test/replay.ts`; `tools/sprites/test_skin_a.py`
- Modify: `packages/sim-protocol/src/index.ts`; `packages/render-gl/src/{types.ts, renderer.ts, webgl.ts, index.ts}`, `harness/main.ts`; `tools/requirements.txt` (`colorspacious==1.1.2`), `.github/workflows/ci.yml`
- Test: `packages/sim-protocol/test/jobs.test.ts`; `packages/render-gl/test/{dots.test.ts, palette.test.ts}`, `test/browser/dots.spec.ts`

**Interfaces:**
- Consumes: `packVisual` and `jobOf` from `sim-protocol` (M0.3).
- Produces `JOB_ITEMS = ['builder', 'clinic', 'farmer', 'merchant', 'police', 'soldier'] as const` in `sim-protocol`, the `job` values the sprite manifests draw: job-item id = index + 1, 0 none, and new items append so no id shifts. **A new interfaces.md item, owned by M0.4:** M0.3's visual word fixes the `job` field but names no ids.
- Produces: `roleOfJob(job: number): 'citizen' | 'merchant' | 'police'`, every other job, soldier included, being a citizen; `ROLE_SHAPE = { citizen: 'circle', merchant: 'square', police: 'diamond' }` (implementation plan, Visual styles); `dotFill(zoom) = min(11, 3 + 2·zoom)` device px, never under 5 ([report][r3r]); `dotMask(shape, fill): Uint8Array` of (fill + 2)² cells, 0 ground, 1 fill, 2 edge. With h = (fill − 1)/2, a circle fills dx² + dy² ≤ h² + h, a square every cell and a diamond |dx| + |dy| ≤ h; edge cells touch fill in one of 8 directions. `dotCentre(world, camDev, zoom) = floor(world)·zoom + (zoom >> 1) − camDev`.
- Produces `pushSnapshot(frame: { tick: number; count: number; buffer: ArrayBuffer }): void`, which keeps copies of the last two snapshots, uploads the new one and passes the same buffer to `options.release` before returning, and `readonly drawnAgents: number`. This is interfaces.md's rule, release before returning, never on draw: a hidden tab draws nothing, so returning on draw would starve the worker's three-buffer pool.
- Produces `fillReplayFrame(map, frame, count, out: ArrayBuffer): void`, integer-only: agent i stands on a walkable cell hashed from i and moves 1 px a frame on a hashed axis; 2% are police and 5% merchants. The harness gains `boot({ agents })`, `push(frame)`, `place(agents: { x, y, job }[])` and `released`.

Quads are instanced straight from two ping-pong snapshot buffers, the word read through `vertexAttribIPointer` ([rendering-tooling.md §3][rt]). A dot stands at `mix(prev, cur, alpha)`, or at `cur` after a jump of over 16 px, since the word has no teleport bit. Its edge follows the minimap alpha under it, a rim off the map, and the fragment shader evaluates `dotMask` in integers and discards ground.

- [ ] **Step 1: Write the failing tests:**
  - `names the job items the manifests draw` (`jobs.test.ts`): `JOB_ITEMS` holds exactly the distinct `job` values in the `frames` of `assets/sprites/*.json`, skipping `season_map.json`, which has none;
  - `draws three distinct shapes`: fill 5 gives 21 circle, 25 square and 13 diamond cells; `dotFill` of 1, 2, 3, 4 and 8 is 5, 7, 9, 11 and 11; `maps jobs to roles`: 0 and soldier are citizens, merchant and police their own roles;
  - `codes roles by shape and colour` (all engines): at zoom 1, one agent of each role centred on a tile ringed by grass, where F is the role's fill (#F7C948, #2A9D8F, #283A7C), E is #020202 and G is grass:

    | Offset from centre | Citizen | Merchant | Police |
    | --- | --- | --- | --- |
    | (0, 0) | F | F | F |
    | (2, 1) | F | F | E |
    | (2, 2) | E | F | E |
    | (3, 3) | G | E | G |

  - `rims dots on dark ground`: under camera `{ x: -64, y: -64, zoom: 1 }` a citizen at (−30, −30) shows #F6F0DE at (36, 36);
  - `returns each buffer as it is pushed`: 10 pushes and no draw give `released` 10, each the pushed buffer, still attached;
  - `draws the map alone for 0 agents and grows for 20,000`; `ignores agents off the canvas` at ±1,000,000;
  - `draws no true-only cue`: a replay frame with every word's `trueOnly` bit set gives the same `FrameStats` as without it;
  - `gives every ground an edge of at least 3:1`, over the town map's kind colours and the background; by construction it is ≥ 4.26:1, as #020202 and #F6F0DE bracket every luminance (computed; [art-direction.md §6][ad]);
  - `test_skin_a.py`, like `test_sprites.py`: each `skin-a.json` colour equals its `spritekit.PALETTE` entry, and the three role colours differ by a colorspacious `deltaE` (CAM02-UCS) of at least 20 with no deficiency and in `sRGB1+CVD` protanomaly, deuteranomaly and tritanomaly at severity 100, round 3's method ([report][r3r]).

  Run `pnpm test jobs dots palette && pnpm test:browser dots`. Expected: FAIL.
- [ ] **Step 2: Implement**, growing buffers with `bufferData` and uploading with `bufferSubData`. Run `pnpm test && pnpm test:browser && pnpm lint && pnpm typecheck`. Expected: PASS.
- [ ] **Step 3: Check the palette.** Run `pip install -r tools/requirements.txt && python tools/sprites/test_skin_a.py`. Expected: minima of 43, 34, 39 and 33 (round 3's figures, ±1) and `ok`; if colorspacious fails under numpy 2, pin `numpy<2`. Add the script to CI.
- [ ] **Step 4: Commit**

```bash
git add packages/sim-protocol/src/jobs.ts packages/sim-protocol/src/index.ts packages/sim-protocol/test/jobs.test.ts
git commit -m "feat(sim-protocol): name the job items the visual word carries"
git add packages/render-gl
git commit -m "feat(render-gl): draw Skin A's shape-coded dots"
git add tools/sprites/test_skin_a.py tools/requirements.txt .github/workflows/ci.yml
git commit -m "test(sprites): check Skin A's role colours under colour blindness"
```

### Task 6: The camera (R3)

**Files:**
- Create: `packages/render-gl/src/{camera.ts, device-size.ts}`
- Modify: `src/renderer.ts`, `src/index.ts`
- Test: `test/camera.test.ts`, `test/browser/dpr.spec.ts`

**Interfaces:**
- Produces `MIN_ZOOM = 1`, `MAX_ZOOM = 16` device px per texel; `fitCamera(mapWidth, mapHeight, deviceWidth, deviceHeight): Camera`, the largest whole zoom ≥ 1 that shows the whole map (sizes in tiles), centred; `zoomAt(camera, zoom, deviceX, deviceY): Camera`, clamped, keeping the texel under the pixel; `panBy(camera, dxDevice, dyDevice): Camera`; `snapCamera(camera): Camera`, making `x·zoom` and `y·zoom` whole; `cssPxPerTile(zoom, dpr) = 16·zoom / dpr`.
- Produces `observeDeviceSize(element: Element, onSize: (deviceWidth: number, deviceHeight: number, dpr: number) => void, forceFallback?: boolean): () => void`, a ResizeObserver on `device-pixel-content-box`; without `devicePixelContentBoxSize` (Safari) or with `forceFallback` it takes `round(contentRect × devicePixelRatio)`, remeasuring when a `(resolution: …dppx)` query changes ([rendering-tooling.md §4][rt]).
- `resize` sets the backing store to the device size and the canvas's CSS size to device ÷ dpr, so a fallback-rounded canvas is never rescaled; at 0×0, `draw` skips.

- [ ] **Step 1: Write the failing tests:** `fits the town`: `fitCamera(48, 28, 1280, 720)` is `{ x: -256, y: -136, zoom: 1 }`, and at 3072×1792 zoom is 4; `zooms about the pointer and back`: `zoomAt({ x: 0, y: 0, zoom: 1 }, 2, 100, 50)` is `{ x: 50, y: 25, zoom: 2 }`, and zoom 1 at (100, 50) returns; `clamps zoom` 0 to 1 and 40 to 16; `snaps to device pixels`: `snapCamera({ x: 10.3, y: 0.6, zoom: 3 })` has `x·3` 31 and `y·3` 2. Each DPR case launches its own browser at that scale, Chromium with `--force-device-scale-factor=<d>` beside the SwiftShader flags and Firefox with the pref `layout.css.devPixelsPerPx`, then opens a context with the same `deviceScaleFactor`. The context alone moves `devicePixelRatio` but leaves `devicePixelContentBoxSize` in CSS px (measured here, Chromium 153 and Firefox 157 on Windows). WebKit has no `devicePixelContentBoxSize`, so its context alone suffices. In all engines at DPR 1, 1.5 and 2: `sizes the canvas in device pixels`, 320×180 CSS reporting (320·d, 180·d, d) natively and with `forceFallback`; `never rescales the canvas`: at DPR 1.5 a 321×181 element's displayed width × 1.5 is within 0.01 of `canvas.width`; `skips a zero-size canvas`. Run `pnpm test camera && pnpm test:browser dpr`. Expected: FAIL.
- [ ] **Step 2: Implement**, then run `pnpm test && pnpm test:browser`. Expected: PASS. Commit:

```bash
git add packages/render-gl
git commit -m "feat(render-gl): add the integer-zoom camera"
```

### Task 7: Context loss and the Canvas2D fallback (R2, R3)

**Files:**
- Create: `packages/render-gl/src/canvas2d.ts`
- Modify: `src/{types.ts, renderer.ts, webgl.ts}`, `harness/main.ts`
- Test: `test/browser/fallback.spec.ts`

**Interfaces:**
- Produces: `RendererOptions` gains `backend?: 'auto' | 'canvas2d'` (M0.5's `?canvas`) and `restoreTimeoutMs?: number`, default 3,000; `WorldRenderer` gains `readonly canvas: HTMLCanvasElement`, which changes when the fallback replaces it; the harness's `boot` passes both options through.
- Produces `CANVAS2D_AGENT_CAP = 5000`. Canvas2D draws an opaque copy of `minimapPixels`, whose alpha only flags the edge, from an offscreen canvas with `drawImage` at a whole scale and `imageSmoothingEnabled = false`, then pre-baked `dotMask` images per role and edge at whole device pixels, for visible agents in index order up to the cap, so its frames match WebGL2's pixel for pixel.
- Canvas2D runs when WebGL2 is missing, when `backend` is `'canvas2d'`, or when a lost context is not restored within `restoreTimeoutMs`; the renderer then swaps in a new canvas with the same id, class and ARIA attributes and draws from its retained map and snapshots ([rendering-tooling.md §8][rt]). On `webglcontextlost` it calls `preventDefault()` and skips draws; on `webglcontextrestored` it rebuilds every GL object from the retained data.

- [ ] **Step 1: Write the failing tests** (all engines, 4,000 agents): `recovers a lost context`: `draw` throws nothing after `WEBGL_lose_context.loseContext()`, and after `restoreContext()` the stats equal those before; `falls back when the context stays lost`: with `restoreTimeoutMs: 100`, 300 ms after a loss the backend is `'canvas2d'` on a new canvas with the old id, the old one detached, stats unchanged; `matches WebGL2 pixel for pixel` at zooms 1–4 under `boot({ backend: 'canvas2d' })`; `caps Canvas2D at 5,000 agents` with 10,000 in view. Run `pnpm test:browser fallback`. Expected: FAIL.
- [ ] **Step 2: Implement** `canvas2d.ts` and the swap, both backends behind one internal interface. Run `pnpm test:browser && pnpm typecheck`. Expected: PASS. Commit:

```bash
git add packages/render-gl
git commit -m "feat(render-gl): recover lost contexts and fall back to Canvas2D"
```

### Task 8: The skin switch (R3)

**Files:**
- Create: `packages/render-gl/src/{skin.ts, skin-toggle.ts}`
- Modify: `src/{types.ts, renderer.ts, index.ts}`, `harness/main.ts`
- Test: `test/skin.test.ts`, `test/browser/skin.spec.ts`

**Interfaces:**
- Produces `SKINS = ['dots', 'blobs', 'town'] as const` and `type Skin`; `BUILT_SKINS: readonly Skin[] = ['dots']`; `skinFromQuery(search: string): Skin | null`; `builtSkin(skin: Skin): Skin`, dots for anything unbuilt; `autoSkin(current: Skin, cssPxPerTile: number, visibleAgents: number): 'dots' | 'town'`: dots below 6 CSS px a tile or above 500 agents in view, else town, with 15% hysteresis, so dots become town at ≥ 6.9 px and ≤ 425 agents and town becomes dots below 5.1 px or above 575. The coarser of the two levels wins ([report][r3r], semantic zoom; [rendering-tooling.md §5][rt]).
- Produces on `WorldRenderer`: `setSkin(skin: Skin): Skin`, returning what it will draw; `setLod(policy: 'auto' | 'fixed'): void`; `readonly drawnSkin: Skin`. `auto` runs `autoSkin` each draw on `cssPxPerTile(zoom, dpr)` and the agent count times the share of the map in view; `fixed` draws the set skin; both pass through `builtSkin`. The 150 ms cross-fade waits for a second built skin.
- Produces `mountSkinToggle(parent: HTMLElement, renderer: WorldRenderer, initial: Skin | 'auto'): HTMLFieldSetElement`, vanilla DOM: a fieldset with legend "Skin", radios Auto, Dots, Blobs and Town, and an `<output>` reading "Town is not built yet: showing dots" (or "Blobs …") while an unbuilt skin is chosen. Auto calls `setLod('auto')`; the others call `setLod('fixed')` and `setSkin`. M0.5 mounts it in the HUD.

- [ ] **Step 1: Write the failing tests:** `reads the skin parameter`: `?skin=town` is town; `?skin=xyz`, `?skin=` and `''` are null; `falls back to dots` for blobs and town; `switches with hysteresis`: `autoSkin` gives dots for (dots, 6.0, 100), town for (dots, 6.9, 100) and (town, 5.2, 100), dots for (town, 5.0, 100) and (dots, 20, 426), town for (dots, 20, 425) and (town, 20, 575), and dots for (town, 20, 576); `follows the parameter and the toggle` (Chromium): at `?skin=town`, Town is checked, the output shows and dots are drawn; Dots empties the output; Auto still draws dots; arrow keys move between radios. Run `pnpm test skin && pnpm test:browser skin`. Expected: FAIL.
- [ ] **Step 2: Implement**, then run `pnpm test && pnpm test:browser`. Expected: PASS. Commit:

```bash
git add packages/render-gl
git commit -m "feat(render-gl): add the skin switch"
```

### Task 9: Golden frames and the frame budget (R3)

**Files:**
- Create: `packages/render-gl/test/browser/{golden.spec.ts, perf.spec.ts}`, `test/golden/skin-a.json`
- Modify: `packages/render-gl/package.json` (script `"golden": "UPDATE_GOLDEN=1 playwright test -c ../../playwright.config.ts golden --project=chromium"`)

**Interfaces:**
- Produces `test/golden/skin-a.json`: `FrameStats` keyed `z<zoom>-d<dpr>`, such as `z2-d1.5`. A per-colour histogram suits frames drawn only in palette colours: it catches shape, colour and snapping errors and tolerates a stray pixel ([report][r3r]).

- [ ] **Step 1: Write the golden test** (all engines): for zooms 1–4 at DPR 1, 1.5 and 2, each DPR launched as in Task 6, a 320×180 CSS harness draws replay frame 0 of 10,000 agents, the camera on the map's centre (`x = 384 − deviceWidth/(2·zoom)`, likewise y, snapped). The frame is (320·d) × (180·d), its colour set equals the golden's, and each count is within max(8, 0.5%). Chromium must report `webgl2`; the others annotate their backend, and a Canvas2D frame must match too wherever at most `CANVAS2D_AGENT_CAP` agents are in view. z1-d2 shows about 6,000 (computed from the town's walkable cells), so there Canvas2D must draw exactly 5,000 instead.
- [ ] **Step 2: Write the goldens** with `pnpm --filter @nomos/render-gl golden`. Expected: 12 cases, each holding Skin A's colours and the zone colours in view.
- [ ] **Step 3: Write the frame-budget test** (Chromium): 1280×720 CSS at DPR 1, `fitCamera`, 10,000 agents, 10 replay frames pre-filled into pooled buffers, and the main thread slowed by CDP `Emulation.setCPUThrottlingRate(4)`, the Performance budget's phone proxy. Over 300 animation frames, push a replay frame every sixth (10 ticks a second at 60 fps) and time push plus draw: median ≤ 1.0 ms, p95 ≤ 4.0 ms, with `os.loadavg()` and the browser version annotated.
- [ ] **Step 4: Run** `pnpm test:browser golden perf`. Expected: PASS everywhere; round 5's stand-in measured 0.17 ms median and 1.99 ms p95 at 4× ([load-memory.md §7][lm]). Commit:

```bash
git add packages/render-gl
git commit -m "test(render-gl): add golden frames and the frame budget"
```

### Task 10: Close M0.4

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Push `main`** so CI runs on GitHub, `browser` job included.
- [ ] **Step 2: Record the pace** against the 4–6-day estimate and rescale the rest, as M0.1 did.
- [ ] **Step 3: Tick** M0.4's build items and exit checks in the shared doc's M0 section (R2, R3, R5, R9), then export with `/sync-plan-doc`.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git commit -m "docs(plan): record the M0.4 pace"
git add docs/plan/implementation-plan.md
git commit -m "docs(plan): sync the implementation plan from the doc"
```

[m0]: ../../../implementation-plan.md#m0-pipeline
[perf]: ../../../implementation-plan.md#performance-budget
[r3r]: ../../../../research/round-3-2d-look/report.md
[rt]: ../../../../research/round-3-2d-look/notes/rendering-tooling.md
[ad]: ../../../../research/round-3-2d-look/notes/art-direction.md
[lm]: ../../../../research/round-5-performance/notes/load-memory.md
[r9s]: ../../../../research/round-9-maps-and-world-builder/summary.md
[mp]: ../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md
[et]: ../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md
