# M0.4 Renderer and Skin A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One WebGL2 `WorldRenderer` drawing 10,000 agents as Skin A's shape-coded dots over the town's zone colours, with an integer-zoom camera, a skin switch, context-loss recovery and a pixel-identical Canvas2D fallback, fed by one binary map the worker loads too.

**Architecture:** A Python exporter turns a fixed seed of the place generator into map v1, which `sim-protocol` parses for worker and renderer alike. `render-gl` uploads each 12-byte snapshot as it arrives and draws zone colours in one full-screen pass and agents as instanced signed-distance dots, snapped to texels and device pixels. Playwright drives a Vite harness page in `render-gl`, since `apps/web` arrives in M0.5.

**Tech Stack:** TypeScript, WebGL2, Canvas2D, Vite 8, Vitest, Playwright (Chromium with SwiftShader, Firefox, WebKit), Python 3.12 with numpy, Pillow and colorspacious 1.1.2.

**Spec:** [task.md](task.md), [interfaces.md](../interfaces.md), and the [M0 Pipeline][m0] and [Performance budget][perf] sections.

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, no body, no co-author.
- One custom WebGL2 renderer, no PixiJS or Phaser; every skin reads the same 12-byte snapshot (web rules, R3).
- Integer device-pixel zoom, texel and camera snapping, no CSS scaling, and a working Canvas2D fallback (web rules).
- The recorded view never shows a true-only cue. Skin A in M0 draws no cue at all, so the render-filter test waits for M4 (web rules).
- Palette: body #F7C948, police #283A7C, merchant #2A9D8F, a 1-px dark outline by day; red and orange only for crime and alerts (web rules, R3).
- One blob body: Skin A codes role only, never look, culture, wealth or record. No role wears black, so `OUTLINE` (#020202) is an edge, never a fill. Police stay neutral (content rules 1, 6, 7).
- No "Pokémon", "Poké-" or "-mon" names; generic building names (content rules).
- One binary map for generated and hand-made maps, naming frames, never atlas indices, served with a compressible content type (web rules, R5, R9).
- Dots at 10k: median ≤ 1 ms and p95 ≤ 4 ms of main-thread draw per frame; the town map ≤ 40 KB brotli (Performance budget).
- `render-gl/src` imports only `sim-protocol`; only the test harness may start `sim-worker` (interfaces).
- Relative imports carry `.ts`; never import `docs/research/*/prototypes/`; keep it simple and comment only the why (code rules).

## Review Focus

1. **A corrupt or truncated map**, such as an HTML 404 page, throws `MapError` naming the problem, never a `RangeError` or half a map (Task 1).
2. **A hidden tab** stops animation frames while snapshots arrive, so buffers return on push, not on draw, or the worker's pool runs dry (Task 5).
3. **0 agents, or more than ever** (births): the map alone, then grown GPU buffers, with no throw (Task 5).
4. **Agents off the map**, at negative or huge coordinates: nothing drawn, nothing thrown (Task 5).
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
- Produces from `sim-protocol`: `TerrainKind { name: string; rgb: number }`; `MapEntity { kind: 1 | 2 | 3 | 4; x, y, w, h, doorX, doorY, frame, capacity, opens, closes: number }`; `MapV1 { version: 1; width, height: number; kinds: TerrainKind[]; frames: string[]; terrain: Uint8Array; walk: Uint8Array; tiles: Uint16Array; entities: MapEntity[] }`; `MapError`, named `'MapError'`; `parseMap(buffer: ArrayBuffer): MapV1`, copying every array; `MAP_EXTENSION = '.nmap'`; and `MAP_CONTENT_TYPE = 'application/x-protobuf'`, a type Cloudflare's docs list as compressed, unlike `application/octet-stream` ([load-memory.md §4][lm]).
- Produces in Python `write_map(width, height, kinds, frames, terrain, walk, tiles, entities) -> bytes` with `Entity(kind, x, y, w, h, door_x, door_y, frame, a=0, b=0)`, raising `ValueError` on any rule `parseMap` checks.

- [ ] **Step 1: Write the fixture.** `mapfile.py` writes a 3×2 `tiny.nmap` with four kinds, every walk value, one `NO_FRAME` tile, a home of capacity 3 and a shop open 480–1200, naming real frames such as `nature/terrain_grass_0`; `--check` compares with the committed file and exits 1 on a difference. Run `python tools/worldgen/mapfile.py && python tools/worldgen/mapfile.py --check`. Expected: exit 0.
- [ ] **Step 2: Write the failing tests:** `reads the Python fixture`, every value `mapfile.py` wrote; `copies its arrays`, zeroing the input afterwards changes nothing; `rejects broken maps with MapError` for `<!doctype html>`, version 2, every truncation, a trailing byte, an out-of-range terrain index, walk value, tile index or entity kind, a footprint or door outside the map, capacity 0 and closing before opening. Run `pnpm test -- map`. Expected: FAIL, no `map.ts`.
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
- **Cells:** terrain is `site.kind`, but footprints take the built kinds `home`, `workplace`, `shop`, `civic` or `landmark`; tiles name `tile_for`'s frame. Walk, first match: blocked on a footprint (`site.big`) or on a solid that is not an animal (cow, sheep, goat, horse, chicken, duck, dog, cat); door on a `site.doors` tile; road where `site.road` (paths, paving, bridges); blocked on water and cliffs; open otherwise.
- **Entities:** homes are `houses/house_*`, with capacity by form: hut 2, detached 4, row unit 4, farmhouse 6, apartment 24. Shops: `shop_general` 480–1200 and `shop_market-stall` 360–840. Workplaces: `shop_warehouse` and `work_*`. Civic: `civic_*`. Landmarks block walking but are not entities.
- **Colours:** a ground kind takes the mean opaque colour of its first non-shore tile, snapped to the nearest of `GRASS_L`, `GRASS`, `LEAF_D`, `SAND`, `SAND_D`, `CREAM`, `WOOD_L`, `WOOD_D`, `WATER_L` and `WATER`; built kinds take `PLUM` (home), `STONE` (workplace), `CREAM_D` (shop), `STONE_L` (civic) and `WOOD` (landmark). That keeps role, alert, edge, background and body-hue colours off the ground.

- [ ] **Step 1: Write the failing tests** on the committed map: `is the 48×28 capital`, its kinds including grass, water, path, paving, home, shop, civic and workplace; `blocks every footprint and opens every door`: footprint cells have walk 0 and their entity's kind, and each door has walk 3, just below its footprint; `houses and opens the town`: ≥ 20 homes of capacity ≥ 2, ≥ 1 shop with `opens < closes`, and civic frames including `buildings/civic_police-station` and `buildings/civic_town-hall`; `fits the map budget`: ≤ 40,000 bytes after `brotliCompressSync` at quality 11. Run `pnpm test -- town-map`. Expected: FAIL, no map.
- [ ] **Step 2: Add `build_site`.** Run `python tools/worldgen/place.py --demo`. Expected: the same counts as before.
- [ ] **Step 3: Write the exporter** and `tools/requirements.txt` (`numpy>=2.1,<3`, `pillow>=11,<13`). It writes the map, prints its kinds and entities, and calls `write_licenses()`, which lists `maps/` with the exporter as source; `--check` compares instead. Run `pip install -r tools/requirements.txt && python tools/worldgen/export_map.py --check && pnpm test` after a first plain run. Expected: PASS, and `assets/LICENSES.md` lists `maps/town.nmap`.
- [ ] **Step 4: Add to CI** after `actions/setup-python`: the pip install and both `--check` runs. Commit:

```bash
git add tools assets packages/sim-protocol/test/town-map.test.ts .github/workflows/ci.yml
git commit -m "feat(worldgen): export the default town as a binary map"
```

### Task 3: render-gl, its harness and the minimap (R3)

**Files:**
- Create: `packages/render-gl/{package.json, tsconfig.json}`, `src/{index.ts, types.ts, renderer.ts, webgl.ts, colour.ts, minimap.ts, skin-a.json}`, `harness/{index.html, main.ts, vite.config.ts}`; root `playwright.config.ts`
- Modify: root `package.json`, `.gitignore`, `.github/workflows/ci.yml`
- Test: `packages/render-gl/test/minimap.test.ts`, `test/browser/minimap.spec.ts`

**Interfaces:**
- Produces `skin-a.json`, the one home of Skin A's colours, each `{ "name": <spritekit name>, "rgb": "#RRGGBB" }`: citizen `BODY` #F7C948, merchant `TEAL` #2A9D8F, police `NAVY` #283A7C, outline `OUTLINE` #020202, rim `CREAM` #F6F0DE, background `STONE_D` #464C5E ([report][r3r]).
- Produces `contrastRatio(a: number, b: number): number` (WCAG 2); `edgeFor(rgb: number): 'outline' | 'rim'`, the edge with more contrast; `minimapPixels(map: MapV1): Uint8Array`, an RGBA texel per tile in its kind's colour, alpha 0 for outline and 255 for rim.
- Produces `type Backend = 'webgl2' | 'canvas2d'`; `Camera { x: number; y: number; zoom: number }`, world px at the view's top-left and device px per texel; `RendererOptions { release(buffer: ArrayBuffer): void }`; and `createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer` with `init(): Backend`, `resize(deviceWidth: number, deviceHeight: number, dpr: number): void`, `setMap(map: MapV1): void`, `draw(camera: Camera, alpha: number): void`, `dispose(): void` and `readonly backend: Backend`. Later tasks add the rest.
- Produces `window.harness`: `boot({ css?: [w, h] })` with the town map set, `view(camera)`, `draw(alpha = 1): FrameStats` (`{ backend, width, height, counts: Record<'#rrggbb', number> }`, read back in the drawing task) and `pixel(x, y)` from that frame.

- [ ] **Step 1: Scaffold.** `@nomos/render-gl` depends on `@nomos/sim-protocol: workspace:*`, adds DOM and `resolveJsonModule` to its tsconfig, and has the script `"harness": "vite harness --port 5174 --strictPort"`; the harness serves `.nmap` as `MAP_CONTENT_TYPE`. The root `playwright.config.ts` runs `**/test/browser/**/*.spec.ts` in chromium (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`), firefox and webkit against the harness; the root gains `@playwright/test`, `"test:browser": "playwright test"` and ignores `test-results/`. CI gains a `browser` job: `pnpm exec playwright install --with-deps chromium firefox webkit`, then `pnpm test:browser`.
- [ ] **Step 2: Write the failing tests:** `colours each tile by its kind` (`minimapPixels` of the fixture); `chooses the edge with more contrast`: `edgeFor(0x4CAA3C)` is `'outline'` (7.0:1 against 2.6:1) and `edgeFor(0x464C5E)` is `'rim'` (7.5:1 against 2.4:1). In all engines: `draws each tile in its zone colour`: at camera `{ x: 0, y: 0, zoom: 2 }` every tile in view shows its kind's colour at `pixel((tx·16 + 8)·2, (ty·16 + 8)·2)`; `fills outside the map with the background`: #464C5E at (10, 10) for camera `{ x: -64, y: -64, zoom: 1 }`; `sizes the frame from resize`: 640×360 after `resize(640, 360, 2)`. Run `pnpm test -- minimap && pnpm test:browser minimap`. Expected: FAIL.
- [ ] **Step 3: Implement.** `init` asks for `webgl2` with `alpha`, `antialias`, `depth`, `stencil` and `preserveDrawingBuffer` false; `setMap` uploads `minimapPixels` as RGBA8; `draw` clears to the background and runs one full-screen triangle that maps each device pixel to texel `floor((pixel + camDev) / zoom)`, with `camDev = round(camera.x·zoom)` (likewise y), fetched by `texelFetch` so no colour is ever interpolated ([rendering-tooling.md §4][rt]); `dispose` deletes every GL object and calls `WEBGL_lose_context.loseContext()`. Run `pnpm test && pnpm test:browser && pnpm lint && pnpm typecheck`. Expected: PASS in all three projects.
- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore playwright.config.ts .github/workflows/ci.yml packages/render-gl/package.json packages/render-gl/tsconfig.json
git commit -m "build(render-gl): add the package and Playwright"
git add packages/render-gl
git commit -m "feat(render-gl): draw the map's zone colours"
```

### Task 4: The worker loads the map (R3, R9)

**Files:**
- Modify: `packages/sim-worker/src/worker.ts` (M0.3's module-worker entry), `packages/render-gl/package.json` (devDependency `@nomos/sim-worker`)
- Create: `packages/render-gl/harness/{worker.html, worker.ts}`
- Test: `packages/render-gl/test/browser/worker-map.spec.ts`

**Interfaces:**
- Consumes: the worker messages, and `createWorld(seed, tier, ground?)` with `Ground = { width: number; height: number; walk: Uint8Array }` in `sim-core` (interfaces.md, The world step).
- Produces: `init` calls `createWorld(seed, tier, parseMap(map))`, a `MapV1` being a `Ground`, so agents spawn on walkable tiles. A bad map throws `MapError` out of the handler, which the page sees as the Worker's `error` event.

- [ ] **Step 1: Write the failing tests** (Chromium; the harness returns every snapshot buffer): `spawns every agent on a walkable tile`, where seed 42, tier `phone` and the town map give `ready.agents` 10,000 and every agent of the first snapshot has `walk[floor(y/16)·48 + floor(x/16)] !== 0`; `serves the map with its content type`, `MAP_CONTENT_TYPE`; `fails loudly on a bad map`, where `<!doctype html>` fires the Worker's `error` within 2 s with `MapError` in its message. Run `pnpm test:browser worker-map --project=chromium`. Expected: FAIL on the first.
- [ ] **Step 2: Parse the map in `init`** and rerun. Expected: PASS. Commit:

```bash
git add packages/sim-worker/src/worker.ts packages/render-gl pnpm-lock.yaml
git commit -m "feat(sim-worker): spawn agents on the map's walkable tiles"
```

### Task 5: Skin A dots and their palette (R2, R3)

**Files:**
- Create: `packages/render-gl/src/dots.ts`, `test/replay.ts`, `tools/sprites/test_skin_a.py`
- Modify: `packages/render-gl/src/{types.ts, renderer.ts, webgl.ts, index.ts}`, `harness/main.ts`; `tools/requirements.txt` (add `colorspacious==1.1.2`), `.github/workflows/ci.yml`
- Test: `packages/render-gl/test/{dots.test.ts, palette.test.ts}`, `test/browser/dots.spec.ts`

**Interfaces:**
- Consumes: `packVisual`, `jobOf` and `JOB_ITEMS` (id = index + 1) from `sim-protocol` (M0.3).
- Produces: `type Role = 'citizen' | 'merchant' | 'police'`; `roleOfJob(job: number): Role`, every job but police and merchant, soldier included, being a citizen; `ROLE_SHAPE = { citizen: 'circle', merchant: 'square', police: 'diamond' }` (implementation plan, Visual styles); `dotFill(zoom: number): number`, `min(11, 3 + 2·zoom)`, so no dot is under 5 px ([report][r3r]); `dotMask(shape, fill): Uint8Array` of (fill + 2)² cells, 0 ground, 1 fill, 2 edge. With h = (fill − 1)/2, (dx, dy) is fill for a circle when dx² + dy² ≤ h² + h, for a square always, and for a diamond when |dx| + |dy| ≤ h; it is edge when not fill but 8-adjacent to fill. `dotCentre(world, camDev, zoom): number` is `floor(world)·zoom + (zoom >> 1) − camDev`.
- Produces on `WorldRenderer`: `pushSnapshot(frame: { tick: number; count: number; buffer: ArrayBuffer }): void`, which keeps copies of the last two snapshots, uploads the new one and hands the same buffer to `options.release` before returning; and `readonly drawnAgents: number`.
- Produces `fillReplayFrame(map: MapV1, frame: number, count: number, out: ArrayBuffer): void`, an integer-only synthetic replay: agent i stands on a walkable cell picked by a hash of i, moves 1 px a frame along a hashed axis, and is police for 2%, merchant for 5% and jobless otherwise. The harness gains `boot({ agents })`, `push(frame)`, `place(agents: { x: number; y: number; job: number }[])` and `released: number`.

Instanced quads read the snapshot buffers directly, positions as float `vec2` at stride 12 and the word through `vertexAttribIPointer`, with the previous and current snapshots in ping-pong buffers ([rendering-tooling.md §3][rt]). A dot stands at `mix(prev, cur, alpha)`, or at `cur` after a jump of over 16 px, since the word has no teleport bit. Its edge comes from the minimap alpha under its centre, a rim off the map. The fragment shader evaluates `dotMask` in integers from `gl_FragCoord` and discards ground cells.

- [ ] **Step 1: Write the failing tests:**
  - `draws three distinct shapes`: at fill 5, 21 fill cells for a circle, 25 for a square and 13 for a diamond; `dotFill` of 1, 2, 3, 4 and 8 is 5, 7, 9, 11 and 11;
  - `maps jobs to roles`: police and merchant ids give their roles; 0 and soldier give citizen;
  - `codes roles by shape and colour` (all engines): at zoom 1, a citizen, a merchant and a police agent, each centred on a tile whose 3×3 neighbourhood is grass. At these offsets from the centre, F is the fill (#F7C948, #2A9D8F, #283A7C), E is #020202 and G is grass:

    | Offset | Citizen | Merchant | Police |
    | --- | --- | --- | --- |
    | (0, 0) | F | F | F |
    | (2, 1) | F | F | E |
    | (2, 2) | E | F | E |
    | (3, 3) | G | E | G |

  - `rims dots on dark ground`: camera `{ x: -64, y: -64, zoom: 1 }` and a citizen at (−30, −30) give #F6F0DE at `pixel(36, 36)`;
  - `returns each buffer as it is pushed`: 10 pushes and no draw give `released` 10, each the pushed buffer, still 120,000 bytes long;
  - `draws the map alone for 0 agents and grows for 20,000`: after a push of 0 every colour is a minimap or background colour, and a push of 20,000 then draws without a throw;
  - `ignores agents off the canvas`: agents at (−1,000,000, −1,000,000) and (1,000,000, 1,000,000) leave the empty frame unchanged;
  - `gives every ground an edge of at least 3:1`: for each kind colour of the town map and the background, `edgeFor`'s edge has `contrastRatio` ≥ 3; it is ≥ 4.26:1 by construction, since #020202 and #F6F0DE bracket every luminance (computed; [art-direction.md §6][ad]);
  - `test_skin_a.py`, in `test_sprites.py`'s style: each `skin-a.json` `rgb` equals `spritekit.PALETTE[name]`, and the least pairwise colorspacious `deltaE` (CAM02-UCS) among citizen, merchant and police is ≥ 20 with no deficiency and in the `sRGB1+CVD` protanomaly, deuteranomaly and tritanomaly spaces at severity 100, round 3's method and threshold ([report][r3r]). It prints the four minima and exits 1 on a failure.

  Run `pnpm test -- dots palette && pnpm test:browser dots`. Expected: FAIL.
- [ ] **Step 2: Implement** the dot program, `pushSnapshot` and the replay; growth uses `bufferData` and other uploads `bufferSubData`. Run `pnpm test && pnpm test:browser && pnpm lint && pnpm typecheck`. Expected: PASS.
- [ ] **Step 3: Check the palette.** Run `pip install -r tools/requirements.txt && python tools/sprites/test_skin_a.py`. Expected: `normal 43, protan 34, deutan 39, tritan 33`, round 3's figures within 1, then `ok`. If colorspacious 1.1.2 fails under numpy 2, pin `numpy<2`. Add the script to CI after the pip install.
- [ ] **Step 4: Commit**

```bash
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
- Produces `MIN_ZOOM = 1` and `MAX_ZOOM = 16` device px per texel; `fitCamera(mapWidth, mapHeight, deviceWidth, deviceHeight): Camera`, the largest whole zoom ≥ 1 that shows the whole map, centred, with map sizes in tiles; `zoomAt(camera, zoom, deviceX, deviceY): Camera`, clamped, keeping the texel under the pixel; `panBy(camera, dxDevice, dyDevice): Camera`; `snapCamera(camera): Camera`, making `x·zoom` and `y·zoom` whole; `cssPxPerTile(zoom, dpr): number`, `16·zoom / dpr`.
- Produces `observeDeviceSize(element: Element, onSize: (deviceWidth: number, deviceHeight: number, dpr: number) => void, forceFallback?: boolean): () => void`, a ResizeObserver on `device-pixel-content-box`. Without `devicePixelContentBoxSize` (Safari), or with `forceFallback`, it takes `round(contentRect × devicePixelRatio)` and measures again when a `(resolution: …dppx)` query changes ([rendering-tooling.md §4][rt]). It returns the disconnect.
- `resize` sets the backing store to the device size and the canvas's CSS size to device ÷ dpr, so a fallback-rounded canvas is never rescaled; at 0×0, `draw` skips.

- [ ] **Step 1: Write the failing tests:** `fits the town`, `fitCamera(48, 28, 1280, 720)` being `{ x: -256, y: -136, zoom: 1 }` and `fitCamera(48, 28, 3072, 1792)` having zoom 4; `zooms about the pointer and back`, `zoomAt({ x: 0, y: 0, zoom: 1 }, 2, 100, 50)` being `{ x: 50, y: 25, zoom: 2 }` and zoom 1 at (100, 50) returning to the start; `clamps zoom`, 0 to 1 and 40 to 16; `snaps to device pixels`, `snapCamera({ x: 10.3, y: 0.6, zoom: 3 })` having `x·3` 31 and `y·3` 2, and `cssPxPerTile(2, 1.5)` 21.33. In all engines at `deviceScaleFactor` 1, 1.5 and 2: `sizes the canvas in device pixels`, a 320×180 CSS element reporting (320·d, 180·d, d) natively and with `forceFallback`; `never rescales the canvas`, a 321×181 element at DPR 1.5 whose `getBoundingClientRect().width × 1.5` is within 0.01 of `canvas.width` after `resize`; `skips a zero-size canvas`, `resize(0, 0, 1)` then `draw` throwing nothing. Run `pnpm test -- camera && pnpm test:browser dpr`. Expected: FAIL.
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
- Produces: `RendererOptions` gains `backend?: 'auto' | 'canvas2d'`, which M0.5's `?canvas` sets, and `restoreTimeoutMs?: number`, default 3,000; `WorldRenderer` gains `readonly canvas: HTMLCanvasElement`, which changes when the fallback replaces it; the harness's `boot` takes both options.
- Produces `CANVAS2D_AGENT_CAP = 5000`. Canvas2D draws `minimapPixels` from an offscreen canvas with `drawImage` at a whole scale and `imageSmoothingEnabled = false`, then pre-baked `dotMask` images per role and edge at whole device pixels, for visible agents in index order up to the cap, so its frames match WebGL2's pixel for pixel.
- Canvas2D runs when WebGL2 is missing, when `backend` is `'canvas2d'`, or when a lost context is not restored within `restoreTimeoutMs`. The renderer then swaps in a new canvas with the same id, class and ARIA attributes and draws from its retained map and snapshots ([rendering-tooling.md §8][rt]). `webglcontextlost` gets `preventDefault()` and draws skip; `webglcontextrestored` rebuilds programs, buffers and textures from the retained data.

- [ ] **Step 1: Write the failing tests** (all engines; 4,000 agents, under the cap): `recovers a lost context`, where after `WEBGL_lose_context.loseContext()` `draw` throws nothing and after `restoreContext()` and `webglcontextrestored` the stats equal those before; `falls back when the context stays lost`, where with `restoreTimeoutMs: 100`, 300 ms after a loss, `backend` is `'canvas2d'`, the old canvas is detached, the new one has its id and the stats equal WebGL2's; `matches WebGL2 pixel for pixel`, replay frame 0 at zooms 1–4 giving the same stats under `boot({ backend: 'canvas2d' })`; `caps Canvas2D at 5,000 agents`, 10,000 agents in view giving `drawnAgents` 5,000. Run `pnpm test:browser fallback`. Expected: FAIL.
- [ ] **Step 2: Implement** `canvas2d.ts` and the swap, with both backends behind one internal interface. Run `pnpm test:browser && pnpm typecheck`. Expected: PASS. Commit:

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
- Produces `SKINS = ['dots', 'blobs', 'town'] as const` and `type Skin`; `BUILT_SKINS: readonly Skin[] = ['dots']`; `skinFromQuery(search: string): Skin | null`; `builtSkin(skin: Skin): Skin`, dots for anything unbuilt; and `autoSkin(current: Skin, cssPxPerTile: number, visibleAgents: number): 'dots' | 'town'`: dots below 6 CSS px a tile or above 500 agents in view, town otherwise, with 15% hysteresis, so dots turn to town at ≥ 6.9 px and ≤ 425 agents, and town to dots below 5.1 px or above 575 ([summary][r3s], [rendering-tooling.md §5][rt]).
- Produces on `WorldRenderer`: `setSkin(skin: Skin): Skin`, returning what it will draw; `setLod(policy: 'auto' | 'fixed'): void`; `readonly drawnSkin: Skin`. `auto` runs `autoSkin` each draw on `cssPxPerTile(zoom, dpr)` and the agent count times the share of the map in view; `fixed` draws the set skin; both pass through `builtSkin`. The 150 ms cross-fade waits for a second built skin.
- Produces `mountSkinToggle(parent: HTMLElement, renderer: WorldRenderer, initial: Skin | 'auto'): HTMLFieldSetElement`, vanilla DOM: a fieldset with the legend "Skin", radios Auto, Dots, Blobs and Town, and an `<output>` reading "Town is not built yet: showing dots" while an unbuilt skin is chosen. M0.5 mounts it in the HUD.

- [ ] **Step 1: Write the failing tests:** `reads the skin parameter`, `?skin=town` giving town and `?skin=xyz`, `?skin=` and `''` null; `falls back to dots`, `builtSkin` of blobs and of town; `switches with hysteresis`, `autoSkin` giving dots for (dots, 6.0, 100), town for (dots, 6.9, 100), town for (town, 5.2, 100), dots for (town, 5.0, 100), dots for (dots, 20, 426), town for (dots, 20, 425), town for (town, 20, 575) and dots for (town, 20, 576); `follows the parameter and the toggle` (Chromium), where the harness at `?skin=town` checks Town, shows the output and draws dots, Dots empties the output, Auto still draws dots, and arrow keys move between radios. Run `pnpm test -- skin && pnpm test:browser skin`. Expected: FAIL.
- [ ] **Step 2: Implement**, then run `pnpm test && pnpm test:browser`. Expected: PASS. Commit:

```bash
git add packages/render-gl
git commit -m "feat(render-gl): add the skin switch"
```

### Task 9: Golden frames and the frame budget (R3)

**Files:**
- Create: `packages/render-gl/test/browser/{golden.spec.ts, perf.spec.ts}`, `test/golden/skin-a.json`
- Modify: `packages/render-gl/package.json` (script `"golden": "UPDATE_GOLDEN=1 playwright test golden --project=chromium"`)

**Interfaces:**
- Produces `test/golden/skin-a.json`: `FrameStats` keyed `z<zoom>-d<dpr>`, such as `z2-d1.5`. The statistics are a per-colour pixel histogram: every drawn colour is a palette colour, so it catches shape, colour and snapping errors yet tolerates an engine's stray pixel ([report][r3r]).

- [ ] **Step 1: Write the golden test** (all engines): for zoom 1–4 and `deviceScaleFactor` 1, 1.5 and 2, a 320×180 CSS harness draws replay frame 0 of 10,000 agents with the camera on the map's centre (`x = 384 − deviceWidth/(2·zoom)`, likewise y, then `snapCamera`). The frame is (320·d) × (180·d), its colour set equals the golden's, and each count is within max(8, 0.5%). Chromium must report `webgl2`; Firefox and WebKit annotate their backend, and a Canvas2D frame must match as well.
- [ ] **Step 2: Write the goldens.** Run `pnpm --filter @nomos/render-gl golden`. Expected: 12 cases, each colour set being Skin A's colours plus the zone colours in view.
- [ ] **Step 3: Write the frame-budget test** (Chromium): 1280×720 CSS at DPR 1, `fitCamera` (zoom 1, the whole map), 10,000 agents and 10 replay frames pre-filled into pooled buffers. Over 300 animation frames it pushes the next replay frame every sixth frame (10 ticks a second at 60 fps) and times push plus draw with `performance.now()`: median ≤ 1.0 ms and p95 ≤ 4.0 ms, with `os.loadavg()` and the browser version annotated.
- [ ] **Step 4: Run** `pnpm test:browser golden perf`. Expected: PASS everywhere, with a median well under 1 ms; round 3 measured 0.3 ms. Commit:

```bash
git add packages/render-gl
git commit -m "test(render-gl): add golden frames and the frame budget"
```

### Task 10: Close M0.4

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Confirm CI passes on `main`.** Run `gh run list --limit 1`. Expected: success, the `browser` job included.
- [ ] **Step 2: Record the pace:** M0.4's Started, Done and Actual cells against its 4–6-day estimate; rescale the rest.
- [ ] **Step 3: Tick what landed** in the shared doc's M0 section: the `WorldRenderer`, Skin A, the town map in the worker with its minimap, the camera, the skin switch and the binary map (R2, R3, R5, R9); the Skin A exit check; and context loss, contrast and ΔE in the CI check (R2, R3). Export with `/sync-plan-doc`.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git commit -m "docs(plan): record the M0.4 pace"
git add docs/plan/implementation-plan.md
git commit -m "docs(plan): sync the implementation plan from the doc"
```

[m0]: ../../../implementation-plan.md#m0-pipeline
[perf]: ../../../implementation-plan.md#performance-budget
[r3s]: ../../../../research/round-3-2d-look/summary.md
[r3r]: ../../../../research/round-3-2d-look/report.md
[rt]: ../../../../research/round-3-2d-look/notes/rendering-tooling.md
[ad]: ../../../../research/round-3-2d-look/notes/art-direction.md
[lm]: ../../../../research/round-5-performance/notes/load-memory.md
[r9s]: ../../../../research/round-9-maps-and-world-builder/summary.md
[mp]: ../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md
[et]: ../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md
