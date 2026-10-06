# Editor tech: building the world builder in the browser

Round 9, question 4: how to build a browser world builder within the plan's budgets, covering renderer reuse, tools, undo, autotiling, performance and interop. Researcher notes, 6 October 2026.

**Machine.** One Windows 10 Pro desktop (10.0.19045): AMD Ryzen 5 3600 (6 cores, 12 threads, 3.6 GHz), 15.9 GiB. Engines: Node 24.18.0 (V8 13.6.233.17), CPython 3.14.6, and headless Chromium 153.0.8010.12 with SwiftShader WebGL, driven by Playwright 1.63.0. Windows has no load average, and the MSYS `/proc/loadavg` reads a fixed 0.25. Each run instead quotes total CPU load from PowerShell's `\Processor(_Total)\% Processor Time`, as two 1-s samples before and after. Other research agents ran at the same time. **No figure here is a phone or tablet timing.**

**Labels:** "opened" (source read in full), "opened (lines)" (only the relevant lines read), "search summary", "measured here", "computed", "inference", "unsourced estimate".

**Prototypes:** [`../prototypes/editor/`](../prototypes/editor/), plain JavaScript and Python with no third-party code. The browser run loads Playwright from round 7's existing local install by path; nothing is copied. The scripts regenerate their intermediate dumps (`parity.json`, `country.json`, `noise.json`), which are not kept.

## The answer in brief

- **Architecture:** build a lazily loaded Build mode inside `apps/web` that reuses `WorldRenderer`, adding one chunk-patch method. The main thread owns the map document while the sim is paused, and Play hands a copy to the worker.
- **Autotile and undo:** keep `place.py`'s shore rule, which is ported exactly, but tidy once per edit and plan-then-apply. Undo is a stack of per-edit commands holding cell diffs, as in Tiled.
- **Speed:** on a 1,024² map, brush events cost ≤ 0.07 ms at p99, and whole strokes 0.06–3.0 ms (desktop Node). Map-wide edits take 35–46 ms and belong in a worker.
- **LDtk:** keep it for hand-made kits until the builder can author them, and import only IntGrid kinds and entities. The sprite manifest is the shared vocabulary.
- **Effort:** a first usable builder takes about 16–24 full-time days with an AI assistant, and a minimal one 8–12 days (unsourced estimates).

## 1. Architecture

### Takeaway

- **Make it a Build mode inside the app, not a separate page.** It reuses the one `WorldRenderer`, atlas and skins, so the editor shows exactly what players see. The renderer contract gains one method that patches 32×32 tile chunks.
- **The editor edits the map, then hands it to the worker.** Build mode pauses the sim. The main thread holds the map document, because each brush event must appear in the same frame; events cost ≤ 0.07 ms at p99. Play copies the walkability grid, zones and blocking cells to the worker, which re-derives homes and jobs and restarts the run.
- **The editor stays off the first frame.** It loads by dynamic `import()` when Build is chosen, prefetched on hover. The first frame keeps its 8 KB of JS and 33 KB map. The editor core measured 4.8 KB brotli; the first builder is estimated at 10–20 KB brotli, plus lil-gui's 7 KB, which already loads after the first frame.
- **Map-wide work runs in a worker.** A 216k-cell replace took 35–46 ms, a whole-map re-autotile 20–41 ms, and a country re-run an estimated 17–87 ms. The paused sim worker can host these jobs, while brushes, fills and stamps stay on the main thread.

### Cited Findings

- The plan specifies one WebGL2 `WorldRenderer` (`init`, `resize`, `setMap`, `pushSnapshot`, `draw`, `setSkin`, `setLod`, `dispose`), with no PixiJS. It draws on the main thread with a 1 ms median budget at 10k dots. ([implementation-plan.md](../../../plan/implementation-plan.md), opened)
- The plan's first frame needs only the dots skin, the HUD and the worker (about 8 KB of JS) plus a 33 KB binary map. lil-gui loads after the first frame; country mode, the inspector and WebGPU load on demand. ([implementation-plan.md](../../../plan/implementation-plan.md), opened)
- Round 5 measured the lazy chunks of its stand-in build: lil-gui 7.0 KB brotli, country mode 0.8 KB, inspector 0.2 KB. Putting raw LDtk JSON on the critical path added 717 ms. ([load-memory.md](../../round-5-performance/notes/load-memory.md), opened)
- Round 5 measured UI bytes for an equivalent app: vanilla 1.7 KB, Solid 5.9 KB (3.6 KB floor), Preact with signals 8.6 KB and React 59.5 KB brotli. ([load-memory.md](../../round-5-performance/notes/load-memory.md), opened)
- Skin C's tile map is a texture of tile indices read with `texelFetch`. A 256² town costs 512 KB with four layers per texel. ([round 3 report](../../round-3-2d-look/report.md), opened) At 1,024², the same four 16-bit layers take 8 MiB. (computed)
- WebGL2 adds `UNPACK_ROW_LENGTH`, `UNPACK_SKIP_PIXELS` and `UNPACK_SKIP_ROWS` from OpenGL ES 3.0. A sub-rectangle can therefore be uploaded straight from the whole-map array. ([MDN pixelStorei](https://github.com/mdn/content/blob/384b5a2cd42f6ed77add9a1bd96321468456a3cb/files/en-us/web/api/webglrenderingcontext/pixelstorei/index.md), opened)
- A 1,024² R16UI texture was patched chunk by chunk from the full `Uint16Array` with those parameters. Six chunks read back with 0 mismatches and GL error 0, in Chromium 153 on ANGLE over SwiftShader Vulkan. ([browser.mjs](../prototypes/editor/browser.mjs), measured here)
- LDtk re-renders only the changed area after a tool runs (`invalidateLayerArea`), and saves one history state per stroke at pointer-up. ([Tool.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/Tool.hx), opened)
- The plan puts canonical writes in a day-boundary phase and records focus changes as tick-stamped inputs. ([implementation-plan.md](../../../plan/implementation-plan.md) M0, opened)
- The prototype's `map.mjs` and `tools.mjs` together are 23.2 KB raw and 6.1 KB brotli-11. With comments and indentation stripped they are 18.8 KB raw, 4.8 KB brotli and 5.3 KB gzip. ([prototypes](../prototypes/editor/), measured here with Node's zlib)
- In Node, the 1,024² document plus editor scratch held 30–34 MiB of ArrayBuffers, and process RSS was 47 MiB after setup. ([results-diff-sync-stroke.json](../prototypes/editor/results-diff-sync-stroke.json), measured here)

### Inferences

- **Renderer contract change:** add `patchTiles(layer, x, y, w, h)`, which reads the shared tile array through the unpack parameters, and an overlay pass for the brush cursor, selection and ghost sprites. `setMap` stays for whole-map loads.
- **Why not a separate page:** a `builder.html` entry could import `render-gl` too, so renderer reuse is not the difference. It would duplicate boot code and service-worker routes and lose one-click play-testing. Vite code-splitting plus a size-limit row protect the main bundle equally well.
- **Hand-off:** copy then transfer on Play; never share live arrays through `SharedArrayBuffer`. The sim must see a complete snapshot, as the ACID "isolated" rule requires. Copying 1–9 MiB takes a few milliseconds. (inference)
- **Live edits of a running world** should arrive as day-boundary inputs, logged like player commands; question 3 designs that log. A first builder can simply restart the run on Play.
- **Start the mode behind a developer flag.** It can author kits first, then open to players once question 2 settles who the builder is for.
- **Phones:** limit editing to 256² maps there; the document and scratch shrink 16-fold, to about 2 MiB. (inference)

### Gaps

- `WorldRenderer` does not exist yet, so the patch path was checked on a standalone texture only.
- SwiftShader is not a GPU. Nothing ran on a phone, a tablet, Safari or Firefox.
- The 10–20 KB bundle figure extrapolates from the measured core; no UI code was written.

## 2. Tools and data structures

### Takeaway

- **Use five layers, each with one source of truth:**
  - the terrain kind grid (u8), which is what the user paints;
  - terrain tiles (u16), always derived by autotile;
  - ground sprites;
  - standing sprites, stored struct-of-arrays with pixel anchors, plus an occupancy grid filled from footprints;
  - zones with typed fields, like LDtk entities.
- **Keep `place.py`'s shore rule, but change when tidy runs.** The JS port matches `place.py` exactly. Tidy must run once per edit, at pointer-up, as plan-then-apply passes. Tidying on every pointer event gave a different map from a whole-map rebuild of the same painted cells in 1–4 of 10 strokes.
- **One-tile land brushes fail over water.** Tidy floods 22 of 24 painted cells (92%) at pointer-up, while a 3-tile brush loses none. Set the minimum land brush to 3 tiles, or draw the 2 missing saddle tiles.
- **Undo is a stack of per-edit commands holding cell diffs, as in Tiled.** A small or medium stroke records 0.6–3.9 KB, and 100 strokes 0.27 MB; undo takes ≤ 0.07 ms. LDtk-style whole-layer snapshots would cost at least 4 MiB per step at 1,024², as typed arrays. (computed)
- **Copy the tool set of Tiled and LDtk:**
  - a stamp brush with Bresenham-interpolated strokes;
  - rectangle fill, span flood fill, an eraser and an eyedropper;
  - stamps and prefabs;
  - rectangle select, magic wand and select-same, with Shift and Ctrl modifiers.

### Cited Findings

- `place.py` builds a `Layout` of a terrain grid, its tiles, ground and standing sprites anchored in pixels, and people. ([place.py](../../../../tools/worldgen/place.py), opened)
- `tile_for` draws water as water. In priority order, open land takes an outer corner where two orthogonal neighbours are water, then a side tile, then an inner corner. ([place.py](../../../../tools/worldgen/place.py), opened)
- `tidy_water` floods land with water on two opposite sides, or only on two opposite diagonals. It repeats raster passes until nothing changes, flipping cells in place. ([place.py](../../../../tools/worldgen/place.py), opened)
- The manifest's `corners` key orders the corners nw, ne, sw, se, with 1 for land and 0 for water. Examples: `shore_grass_n` is `0011`, `ne-outer` is `0010` and `ne-inner` is `1011`.
  - `scenery.json` holds 48 shore frames: 2 shores × 12 keys × 2 variants.
  - The 12 keys plus plain land and water cover 14 of the 16 corner keys. Only the saddles `1001` and `0110` are missing.
  - ([scenery.json](../../../../assets/sprites/scenery.json), opened; [sprites README](../../../../tools/sprites/README.md), opened)
- The sprites README defines `footprint`, a bottom-centre `anchor`, `layer: ground`, `overlay`, `door`, `joins` and `corners`. It also puts light at the top left. ([README](../../../../tools/sprites/README.md), opened)
- Tiled's terrain sets: a 2-terrain corner set has 16 tiles, an edge set 16 and a mixed set 256. The 47-tile blob is a reduced mixed set, cut to 15 with rotation. The terrain brush also adjusts neighbouring tiles. ([terrain.rst](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/manual/terrain.rst), opened)
- Tiled's tile tools and shortcuts:
  - Stamp Brush `B`: Shift draws a line, right-click captures a stamp. Terrain Brush `T`.
  - Bucket Fill `F`: Shift fills the selection. Shape Fill `P`. Eraser `E`.
  - Rectangular Select `R`, Magic Wand `W`, Select Same Tile `S`: Shift adds, Ctrl subtracts, both intersect.
  - `X` and `Y` flip, `Z` rotates, and `Ctrl+1–9` stores stamps.
  - ([editing-tile-layers.rst](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/manual/editing-tile-layers.rst), opened)
- Tiled's `PaintTileLayer` is a `QUndoCommand` storing the painted cells and the erased old cells of the painted region. Consecutive paints merge, keeping each cell's first old value. ([painttilelayer.cpp](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/src/tiled/painttilelayer.cpp), opened; GPL, studied only)
- Tiled stores tile layers in 16×16 chunks (`CHUNK_SIZE = 16`). ([tiled.h](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/src/libtiled/tiled.h), opened (lines))
- LDtk's undo keeps a per-level ring of 30 + 10 states, each holding whole layer-instance JSON.
  - Unchanged layers share the previous state's JSON.
  - An IntGrid edit also saves its dependent auto-layers.
  - Definition changes clear the history.
  - ([LevelTimeline.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/LevelTimeline.hx), opened)
- LDtk's tools: left button adds and right button removes; Shift draws a rectangle.
  - A Shift-click within 0.22 s flood-fills, 4-connected, with a stack and a visited map.
  - Strokes interpolate with Bresenham between pointer positions.
  - ([Tool.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/Tool.hx), opened)
- LDtk re-applies auto-layer rules in the changed rectangle grown by 4 cells, since `MAX_AUTO_PATTERN_SIZE` is 9. ([LayerInstance.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/data/inst/LayerInstance.hx), opened (lines); [Const.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/Const.hx), opened (lines))
- Boris the Brave classifies tilesets:
  - marching squares, the 2-corner set, has 16 tiles, or 6 with rotation;
  - 2-edge Wang has 16;
  - the blob is 47 of the 256 mixed tiles.
  - Most autotilers infer corners from painted cells. ([Classification of Tilesets](https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/), opened)
- The dual grid draws tiles at a half-cell offset and picks each by marching squares on the four cells at its corners. Its drawbacks are that it is hard to grasp and has ambiguous tiles. Quarter-tiles need 5 half-size tiles with rotation, or 14–20 without. ([Quarter-Tile Autotiling](https://www.boristhebrave.com/2023/05/31/quarter-tile-autotiling/), opened)
- Excalibur's dual tilemap offsets the graphics map by half a tile and makes it one tile wider and taller. It needs 5 tiles plus a base, using rotation. ([Excalibur blog](https://excaliburjs.com/blog/Dual%20Tilemap%20Autotiling%20Technique/), opened)
- **Parity:** the JS port of `tile_for` and `tidy_water` matched `place.py` on 200 random grids. That covered 191,840 cells and 12,262 tidy floods, with 0 kind and 0 tile mismatches. ([parity.py](../prototypes/editor/parity.py), [parity.mjs](../prototypes/editor/parity.mjs), measured here)
- **Tidy timing:** with raster tidy per pointer event, the result differed from a whole-map rebuild. It differed in 1 of 10 strokes for the 1-, 5- and 17-tile water brushes and the 3-tile land brush. It differed in 4 of 10 for the 33-tile brush, by up to 8 cells. Plan-then-apply tidy per event gave the same counts on the four water brushes.
  - Tidying once at pointer-up differed in 0 of 80 strokes with plan-then-apply, and 0 of 70 with raster.
  - ([bench.mjs](../prototypes/editor/bench.mjs), [results-diff-raster-event.json](../prototypes/editor/results-diff-raster-event.json), [results-diff-sync-stroke.json](../prototypes/editor/results-diff-sync-stroke.json), measured here)
- **Plan-then-apply against raster:** on the 200 random grids, plan-then-apply tidy differed from `place.py`'s raster tidy in 446 of 12,262 flooded cells, in 145 grids. ([parity.mjs](../prototypes/editor/parity.mjs), measured here)
- **One-tile land brush, median stroke of 30:** with per-event tidy, 80 of 81 paint operations were flooded back. With pointer-up tidy, 22 of 24 cells were; a 3-tile brush lost 0 of 80. ([results JSON](../prototypes/editor/), measured here)
- **Corner consistency:** on the generated-style map, 25,763 of 25,766 shore cells use the tile whose `corners` key matches their neighbours. After 200 random strokes, 32,225 of 32,261 do; 36 mismatch, 7 of them with all four corners wet. ([corners.mjs](../prototypes/editor/corners.mjs), measured here)

### Inferences

- **Why tidy at pointer-up:** the diagonal clause is non-monotone, since an orthogonal water neighbour cancels it. Interleaving paint and tidy therefore changes outcomes. Tidied once, the result depends only on the edit's painted cells, which keeps edit logs replayable. The stroke preview shows unflooded cells for the length of one stroke.
- **Why plan-then-apply:** the result then no longer depends on visiting order, which matches the plan's "plan, then apply" rule. Incremental and whole-map tidy agree by construction. Switch `place.py` to it now, before saves pin generator output.
- **Saddle tiles:** drawing `1001` and `0110` for both shores (4 frames, 8 with variants) completes the 16-key corner set. Then tidy can drop its diagonal clause, and a lookup by `corners` key can replace the priority rule.
- **Not the dual grid or the blob:** the dual grid would mean re-cutting all shore art at a half-tile offset, and top-left lighting forbids rotating tiles. The 47-tile blob adds much art for little gain at 16 px.
- **Undo design:** one stack, one command per user action, with each stroke's pointer events merged as Tiled's `mergeWith` does.
  - **Terrain edit:** a cell index (u32) plus old kind, sea flag and tile, 8 B per cell, swapped on undo and redo. Derived tiles sit in the diff, so undo recomputes nothing.
  - **Sprite add, remove and move:** ids and records.
  - **Zone edit:** field diffs.
  - Cap the stack in bytes, say 32 MB, which holds about 12,000 medium strokes. (computed)
- **Chunk snapshots instead:** copying 32×32 chunks on first touch is a fine alternative where code simplicity matters most. It needs 4 KB of scratch against 4 MiB for a per-cell touch array, or 128 KB as a bitset.
- **Selection** is a 1-bit-per-cell mask (128 KB at 1,024²) or a rectangle list that clips brushes and fills. Copy builds a stamp of kinds plus the sprites inside, the same structure as a prefab.
- **Occupancy** as u16 sprite ids per cell (2 MiB at 1,024²) makes footprint checks O(footprint), as `place.py`'s `fits` does on Python lists.

### Gaps

- Zones with fields and sprite moves were barely prototyped; the prefab test placed 4 buildings and checked only occupancy.
- Nobody has tested the snap at pointer-up or the 3-tile minimum.
- The saddle tiles are not drawn, so the corner-key lookup was not checked visually.
- Cliff bands, bridges and roads were not ported to the editor prototype.

## 3. Performance

### Takeaway

- **Brushes cost a tiny fraction of a frame on desktop.** On 1,024², pointer events took 0.3–21 µs median and ≤ 0.07 ms at p99, with outliers up to 1 ms. Whole strokes took 0.06–3.0 ms of CPU, and the pointer-up tidy 0.01–0.4 ms.
- **Big one-shot edits fit a frame, but map-wide ones need a worker:**
  - a 128×128 rectangle: 2.1–2.5 ms;
  - a 32,351-cell lake fill: 5.0 ms;
  - a 64×64 paste: 0.5 ms;
  - a 16×12 prefab: 0.05 ms;
  - replacing 215,653 cells: 37 ms.
- **Undo is cheap either way.** Cell-diff undo took ≤ 0.07 ms for brushes and 1.8 ms for the map-wide replace. A history of 100 medium strokes held 0.27 MB as diffs, and 1.3 MB as 32×32 chunk snapshots.
- **GPU upload is small.** A brush frame dirties at most 4 chunks, 8 KB of 16-bit tiles. Chunk patches took ≤ 0.02 ms at p99 per frame in Chromium's software GL, and the 796-chunk replace took 1.1–1.8 ms.
- **Country re-runs become interactive once ported.** CPython takes about 1.4 s for the 96×64 world, 726 ms after an elevation edit and 103 ms after moving a settlement. Measured kernel ratios of 16–206× put a TypeScript port at about 17–45 ms and 6 ms. (computed estimates, desktop)

### Cited Findings

All measured here on the machine above, unless labelled otherwise.

- **Setup:** a synthetic 1,024² place with 23.7% water, 24 roads and sand shores ([map.mjs](../prototypes/editor/map.mjs)). Each scenario ran 10 warm-up and 30 timed samples, each sample being edit, commit, undo, redo and undo. Dirty chunks were flushed after every pointer event, as one event per 60 Hz frame. Configuration: cell-diff undo, plan-then-apply tidy at pointer-up. CPU load was 34/25% before and 18/13% after. The table's chunk-record column comes from the separate chunk-snapshot run below. ([bench.mjs](../prototypes/editor/bench.mjs), [results-diff-sync-stroke.json](../prototypes/editor/results-diff-sync-stroke.json))
- **Edit costs (Node 24, median [min–max] over 30 samples):**

  | Edit on 1,024² | Edit CPU, ms | Event p99, ms | Pointer-up tidy, ms | Undo, ms | Undo record, KB (diff / chunk) | Cells painted | Chunks per frame, max |
  |---|---|---|---|---|---|---|---|
  | 1-tile water brush, 60 events over 20 tiles | 0.114 [0.035–0.160] | 0.014 | 0.021 | 0.002 | 0.6 / 8.0 | 25 | 2 |
  | 1-tile land brush, same path length | 0.084 [0.038–0.291] | 0.007 | 0.017 | 0.001 | 0.0 / 8.0 | 24 (22 flooded back) | 1 |
  | 3-tile land brush | 0.062 [0.040–0.284] | 0.005 | 0.012 | 0.001 | 0.6 / 8.0 | 80 | 2 |
  | 5-tile water brush, 120 events over 60 tiles | 0.193 [0.072–0.369] | 0.008 | 0.045 | 0.004 | 3.9 / 16.0 | 347 | 2 |
  | 5-tile land brush | 0.134 [0.083–1.010] | 0.005 | 0.030 | 0.003 | 2.5 / 12.0 | 308 | 2 |
  | 17-tile water brush, 180 events over 180 tiles | 0.952 [0.520–2.259] | 0.011 | 0.172 | 0.025 | 23.7 / 44.0 | 2,673 | 4 |
  | 17-tile land brush | 0.931 [0.461–1.827] | 0.011 | 0.174 | 0.017 | 14.5 / 36.0 | 1,861 | 4 |
  | 33-tile water brush, 120 events over 240 tiles | 3.027 [1.351–5.258] | 0.068 | 0.394 | 0.065 | 59.2 / 76.1 | 7,022 | 4 |
  | 128×128 rectangle, water | 2.503 [1.524–5.610] | one event | 1.070 | 0.163 | 102.2 / 100.1 | 12,709 | 25 |
  | 128×128 rectangle, paving | 2.072 [1.846–4.295] | one event | 0.818 | 0.118 | 126.5 / 100.1 | 16,184 | 25 |
  | Flood fill of a grass region with water | 0.688 [0.058–2.793] | one event | 0.285 | 0.041 | 45.8 / 60.1 | 5,407 | 15 |
  | Fill the largest lake with grass | 4.974 [4.620–9.630] | one event | 2.082 | 0.262 | 271.4 / 260.3 | 32,351 | 65 |
  | Replace every meadow cell with grass | 36.783 [35.092–69.125] | one event | 14.986 | 1.769 | 1,684.8 / 3,187.1 | 215,653 | 796 |
  | 16×12 prefab with 4 footprinted buildings | 0.051 [0.033–0.143] | one event | 0.012 | 0.002 | 1.5 / 4.0 | 192 | 1 |
  | 64×64 copy and paste | 0.492 [0.326–0.825] | one event | 0.193 | 0.021 | 22.1 / 36.0 | 2,751 | 9 |

- **Event medians:** 0.3 µs for the 1-tile brush, 0.7 µs at 5 tiles, 4.2 µs at 17 tiles and 21 µs at 33 tiles. The slowest single brush event of all runs took 1.41 ms (33-tile brush, chunk mode).
- **Chunk-snapshot undo:** the same edits cost about the same. Undo took 0.03–0.39 ms for brushes and 6.7 ms for the replace-all; 100 strokes held 1.3 MB and undid in 4.1 ms. Load was 11/24% before and 25/37% after. ([results-chunk-sync-stroke.json](../prototypes/editor/results-chunk-sync-stroke.json))
- **Per-event raster tidy**, which is `place.py`'s exact behaviour, cost within ±17% of the recommended setup on every edit but one. The 5-tile water brush took 0.180 ms [0.066–0.990]. The exception, the 128×128 water rectangle, took 1.345 ms against 2.503 ms. Load was 32/26% before and 37/38% after. ([results-diff-raster-event.json](../prototypes/editor/results-diff-raster-event.json))
- **Whole-map rebuilds:** tidy plus autotile of all 1,048,576 cells took 31–75 ms median per scenario in the equivalence checks. Autotile alone took 23.3 ms [21.0–40.1] over 7 runs, and a tidy pass with nothing to flood 17–27 ms.
- **Memory in Node at 1,024²:**
  - map layers 4 MiB: kind, sea flag and tile;
  - map scratch 9 MiB, and editor scratch 21–23 MiB, unoptimised;
  - ArrayBuffers 30–34 MiB after setup, 40–46 MiB after 100 strokes of history;
  - process RSS 47 MiB after setup, 74–76 MiB at the end.
- **Same kernel in Chromium 153:** a cross-origin-isolated page had a 5 µs timer step. Chromium ran within 2–22% of Node, and slightly faster on the larger edits. Load was 31/20% before and 30/19% after. ([kernel-bench.mjs](../prototypes/editor/kernel-bench.mjs), [results-browser.json](../prototypes/editor/results-browser.json))

  | Edit (diff undo, pointer-up tidy) | Node 24, ms | Chromium 153, ms | Chromium with GL patch, ms | GL patch per frame, p99 ms |
  |---|---|---|---|---|
  | 5-tile water brush | 0.276 [0.080–0.661] | 0.235 [0.080–0.580] | 0.300 [0.110–0.670] | 0.015 |
  | 17-tile water brush | 0.980 [0.508–1.567] | 0.935 [0.545–1.115] | 1.045 [0.595–1.715] | 0.020 |
  | 33-tile water brush | 2.412 [1.109–3.592] | 2.360 [1.195–3.420] | 2.570 [1.190–4.230] | 0.020 |
  | 128×128 rectangle | 1.524 [1.189–2.511] | 1.315 [0.950–1.695] | 1.315 [0.970–1.765] | 0.155 |
  | Largest lake fill | 4.867 [4.531–7.572] | 4.495 [4.165–8.215] | 4.360 [4.120–8.270] | 0.120 |
  | Replace all meadow | 40.267 [34.881–61.499] | 31.600 [29.825–55.005] | 35.310 [30.465–55.480] | 1.780 |

- **Country stages in CPython 3.14.6:** 12 seeds × 3 repeats after 1 warm-up. The staged run reproduced `world.generate`'s fingerprint for all 12 seeds. Load was 19/12% before and 16/13% after. ([country_stages.py](../prototypes/editor/country_stages.py))
  - **Noise stages:** shape 667.6 ms [614.8–919.6], temperature 194.1 [178.7–240.1] and moisture 292.6 [272.1–409.8].
  - **Drainage and roads:** drain 98.3 [85.4–125.5] and roads 51.3 [35.1–73.1].
  - **Placement:** survey 15.8, wonders 29.0 and settle 9.6.
  - **The other seven stages:** under 8 ms each.
  - **Whole world:** a median total of 1,422 ms [1,292–1,610].
- **Kernel ratios:** the JS priority flood was bit-identical to `drainage.flood`, comparing filled, receiver and order.
  - Flood: JS took 1.46 ms [1.29–3.36] plus 0.17 ms of keyed ties, against CPython's 26.3 ms [24.1–32.3], so 16×.
  - Value-noise fbm on 96×64 with 5 octaves: JS took 2.63 ms [2.57–3.11], also bit-identical, against 541 ms [473–753], so 206×.
  - JS ran 20 warm-up and 50 samples, CPython 1 warm-up and 9 samples. Load afterwards was 52/50% and 26/25%.
  - ([drain_port.mjs](../prototypes/editor/drain_port.mjs), [noise_port.mjs](../prototypes/editor/noise_port.mjs), [noise_ratio.py](../prototypes/editor/noise_ratio.py))
- **Place generation in CPython:** settlements took 417–546 ms (32×20 to 48×28 cells), and wonder views 47–66 ms (30×18). Each ran 1 warm-up and 5 repeats; load afterwards was 20/31%. ([place_timing.py](../prototypes/editor/place_timing.py))
- **Re-running dependent stages after a country edit** (computed from the stage medians above):

  | Edit | Stages re-run | CPython, ms (sum of stage medians) | TypeScript estimate, ms |
  |---|---|---|---|
  | New seed | all 15 | 1,393 | 21–87 |
  | Elevation or coastline | rain to landmarks | 726 | 17–45 |
  | Biome or land-use override | habitability to landmarks | 119 | 7 |
  | Add, move or remove a settlement | farm to landmarks | 103 | 6 |
  | Road edit | survey to landmarks | 48 | 3 |

  The estimate divides the noise stages (shape, temperature, moisture) by 206 for the low end and 16 for the high end, and every other stage by 16.

### Inferences

- **Frame budget:** a 60 Hz frame lasts 16.7 ms, and brushes use under 0.5% of it on desktop. A phone 5× slower would still keep brush events under 0.5 ms (assumption, not measured).
- **Worker threshold:** rectangle, fill and paste, at ≤ 5 ms, fit one desktop frame but may drop one on phones. Map-wide replaces, rebuilds and country re-runs should run in a worker or in slices.
- **Chunk size:** 32×32 chunks suit 1,024² maps, giving 1,024 chunks and at most 4 per brush frame. Tiled's 16×16 would multiply upload calls by 4 for large edits. 64×64 would upload 32 KB per brush frame instead of 8 KB. (computed)
- **Country editing** is interactive only after the TypeScript port; in CPython an elevation edit takes about 0.7 s. Settlement and road edits, at an estimated 3–6 ms, could even run live.

### Gaps

- Nothing ran on a phone, tablet, Safari or Firefox. SwiftShader is not a GPU, and Node's RSS is not a browser tab's memory.
- The synthetic map stands in for a generated 1,024² city; real shore density may differ from 23.7% water.
- TypeScript country times are estimates from two kernels. The non-noise parts of shape, and the road A*, may port at other ratios.
- Other agents shared the machine, with load at 11–52% across the reported runs. Medians drifted between runs; whole-map autotile ranged from 23 to 36 ms.

## 4. Interop and formats

### Takeaway

- **Keep LDtk for hand-made kits for now, importing only meaning.** Kits author IntGrid kinds and entities (manifest names, zone fields) in LDtk 1.5.3. A build step converts them, and Nomos's own autotiler derives the tiles. LDtk's auto-layer rules are internal to the editor, so they cannot be the shared rule.
- **Replace LDtk only when the builder can author kits.** The player-facing builder must exist anyway, because LDtk is a desktop app. Once the builder edits zones and saves prefabs, move kits to Nomos's format and convert the old LDtk kits once.
- **Use JSON for kits in the repo and one versioned binary container for everything else.** Runtime maps keep round 5's compact binary. Saves and builder documents use a chunked container (magic, format version, tagged sections), gzipped with `CompressionStream`. Store kinds and sprites, and derive tiles on load; that takes 20–41 ms at 1,024².
- **Version three things separately:**
  - the container's integer format version, with forward-only migrations and unknown sections skipped;
  - the generator version, already part of place seeds;
  - the manifest hash.

  Tiled and LDtk do the same with `version`, `tiledversion` and `jsonVersion`.
- **Yes, the sprite manifest should be the shared vocabulary.** The generator, builder and renderer already speak `footprint`, `anchor`, `layer`, `overlay`, `door`, `joins` and `corners`. Make it a versioned JSON Schema with generated TypeScript types, reference frames by name, and fail CI on unknown names.

### Cited Findings

- LDtk is MIT-licensed. Its latest release is v1.5.3 of 15 January 2024, and its master branch still gets CI fixes, the last on 6 October 2026. (GitHub API for [deepnight/ldtk](https://github.com/deepnight/ldtk), opened)
- **LDtk's JSON format** ([JSON_DOC.md](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/docs/JSON_DOC.md), opened):
  - IntGrid layers export `intGridCsv`, where 0 means empty and values start at 1.
  - Auto-layers export resolved `autoLayerTiles`.
  - Entities carry `fieldInstances` of type Int, Float, String, Bool, Color, Enum, Point, Tile or EntityRef, or arrays of them.
  - The rule section says its rules "are completely resolved internally by the editor before any saving", so game developers should ignore it.
  - Rules have pattern sizes of 1, 3, 5 or 7, plus chance, Perlin and modulo filters and a per-layer seed. The editor's constant allows 9.
- LDtk clamps a level to 4,096 px per side, which is 256 tiles at 16 px. Round 4 recommended LDtk for prefab blocks, village kits and hero settlements, and keeping the country out of it. ([world-maps.md](../../round-4-multi-scale/notes/world-maps.md), opened)
- Round 3 chose LDtk 1.5.3: the worker reads only the IntGrid and entities, through a 340-byte gzip reader. Tiled 1.12.2 was the alternative, with a GPL editor. ([round 3 report](../../round-3-2d-look/report.md), opened)
- Round 5 converts LDtk JSON at build time.
  - Its compact binary is a 16-byte header, a u8 IntGrid, four u16 tile layers and 7-byte entity records.
  - The 256² town came to 33 KB against 271 KB brotli, and parsed in 0.4 ms against 58 ms.
  - Cloudflare does not compress `application/octet-stream`.
  - ([load-memory.md](../../round-5-performance/notes/load-memory.md), opened)
- The plan's M6 gzips save sections with `CompressionStream` into OPFS or IndexedDB. Share URLs carry the world seed and generator versions. ([implementation-plan.md](../../../plan/implementation-plan.md), opened)
- **Tiled's TMX format** ([tmx-map-format.rst](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/reference/tmx-map-format.rst), opened (lines)):
  - `<map>` carries `version`, the format version, and `tiledversion`, the writer.
  - Layer data is CSV or base64, optionally gzip, zlib or zstd.
  - Infinite maps store their data in chunks, 16×16 by default.
- Tiled's editor is GPL and libtiled is BSD-2. ([COPYING](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/COPYING), opened) Its latest release is v1.12.2 of 27 May 2026. (GitHub API, opened)
- **The sprite manifest** ([sprites README](../../../../tools/sprites/README.md), opened; [scenery.json](../../../../assets/sprites/scenery.json), opened):
  - Each file holds `image`, `size`, `tile` and `frames`.
  - Every frame has `x`, `y`, `w`, `h` and `anchor`.
  - Some add `footprint`, `door`, `joins`, `layer`, `night`, `overlay`, `corners`, `target`, `view`, `colour`, `cord_row`, `hitch` and `review_only`.
- `place.py` reads `footprint` and `anchor` through `frame()`, `rise()`, `build()`, `prop()` and `tree()`. Its shore names carry `corners` keys that match its rule. ([place.py](../../../../tools/worldgen/place.py), opened)
- A runtime map at 1,024² holds 9 bytes per cell, so 9 MiB raw. (computed)

### Inferences

- **The LDtk import contract:**
  - one IntGrid layer whose values map one-to-one to Nomos kinds;
  - one Entities layer with an Enum of manifest frame names, whose footprints come from the manifest, never from LDtk sizes;
  - zones as resizable entities with fields;
  - auto-layers optional and ignored on import.

  The import then runs Nomos's autotile and tidy, and validates footprints on free land and doors on roads.
- **Why one rule must own the tiles:** kits meet generated terrain at their edges. Only a rule shared by the generator, the builder and the importer re-tiles that seam consistently.
- **Kits in the repo stay diffable JSON:** dimensions, run-length kinds, sprites by name and zones. The binary is generated at build time.
- **The container:** a 4-byte magic, a u16 format version, then sections of a 4-byte tag, a u32 length and a payload.
  - Example tags: `META` (JSON), `KIND`, `SPRT`, `ZONE`, `TILE` (runtime only) and `EDIT` (question 3's log).
  - **Durability:** write to a temporary OPFS file, then rename it, so a save that reports success is complete (ACID "durable").
- **Frame names are the stable IDs.** The loader resolves atlas indices, so repacking the atlas never breaks a map.
- **No new manifest field is needed for blocking.** Footprinted sprites block movement, and `layer: ground` sprites such as bridges and steps do not.
- **Brotli size at 1,024²:** if its entropy matched the 256² town, a 1,024² map would compress to about 0.5 MB. (inference)

### Gaps

- No LDtk round trip was run: a kit authored in LDtk, imported, autotiled and validated.
- The brotli size of a 1,024² runtime map was not measured.
- The container layout is a proposal and was not prototyped.

## 5. UI and effort

### Takeaway

- **Use vanilla DOM for the fixed chrome, lil-gui for options, and Solid only if panels grow.** The chrome is a toolbar (role `toolbar`, roving tabindex), a palette of manifest frames as buttons showing atlas crops, and a layer list. lil-gui holds brush size and toggles, using native inputs, buttons and selects with labels.
- **Put the keyboard first, with Tiled's shortcuts:**
  - `B` brush, `F` fill, `P` rectangle, `E` eraser and `I` eyedropper;
  - `R` select, `W` wand and `S` select same;
  - `Ctrl+Z` and `Ctrl+Shift+Z`, `Ctrl+C` and `Ctrl+V`;
  - `[` and `]` for brush size;
  - arrows plus Space for painting cell by cell.
- **Give every drag a click alternative,** as WCAG 2.2 SC 2.5.7 requires: click-click rectangles and lines, click-per-cell painting, and buttons for pan and zoom. Make targets at least 24×24 CSS px (SC 2.5.8).
- **On tablets, use Pointer Events with `touch-action: none` on the canvas only.** One finger or a pen paints using coalesced events. Two fingers pan and pinch in integer zoom steps. Undo and redo are on-screen buttons.
- **Effort: about 16–24 full-time days for a first usable builder** with an AI assistant, and 8–12 days for a terrain-and-prefab minimum. (unsourced estimates)

### Cited Findings

- The plan loads lil-gui and uPlot after the first frame. It writes the HUD in vanilla TypeScript and richer UI in Solid or Preact with signals, never React. M3 sets aside 3–5 days for authoring the town in LDtk. ([implementation-plan.md](../../../plan/implementation-plan.md), opened)
- Round 5 found every framework took 1.0–1.3 ms per update at 4–10 Hz, so bytes decide. ([load-memory.md](../../round-5-performance/notes/load-memory.md), opened)
- lil-gui 0.21.0 is MIT-licensed (npm registry, opened).
  - Its controllers create native `<input>`, `<button>` and `<select>` elements with `aria-labelledby`.
  - Number fields step with ArrowUp and ArrowDown, and folder titles are buttons with `aria-expanded`.
  - The slider is a div beside the number input, and the keyboard handler sits on the input.
  - ([lil-gui src](https://github.com/georgealways/lil-gui/tree/fbd4c363c5c1b158525b111d2716e37e4e10d9b8/src), opened (lines) of five controller files)
- The APG toolbar pattern takes one tab stop, with arrow keys moving focus by roving tabindex.
  - It uses role `toolbar` with `aria-label`, and `aria-orientation="vertical"` for vertical toolbars.
  - Use it only for 3 or more controls.
  - ([toolbar-pattern.html](https://github.com/w3c/aria-practices/blob/0f765e4dc33e966026114ac12a8380db1de3b787/content/patterns/toolbar/toolbar-pattern.html), opened)
- WCAG 2.2 SC 2.5.7, Dragging Movements, requires a single-pointer alternative to every drag. It gives the example of a selection rectangle set by clicking two corners, and says keyboard equivalence alone does not satisfy it. ([dragging-movements.html](https://github.com/w3c/wcag/blob/23bad5904949904275a08f1c6e395b78a02aa6f3/understanding/22/dragging-movements.html), opened)
- WCAG 2.2 SC 2.5.8, Target Size (Minimum), asks for targets of at least 24×24 CSS px, with spacing and equivalence exceptions. ([target-size-minimum.html](https://github.com/w3c/wcag/blob/23bad5904949904275a08f1c6e395b78a02aa6f3/understanding/22/target-size-minimum.html), opened (lines))
- `getCoalescedEvents()` returns the un-coalesced `pointermove` events, which MDN recommends for drawing apps; it needs a secure context. ([MDN](https://github.com/mdn/content/blob/384b5a2cd42f6ed77add9a1bd96321468456a3cb/files/en-us/web/api/pointerevent/getcoalescedevents/index.md), opened)
- Browsers handle panning and pinching by default and send `pointercancel` when they take over; `touch-action: none` stops that. MDN warns that `touch-action: none` can block zoom for low-vision users. ([MDN touch-action](https://github.com/mdn/content/blob/384b5a2cd42f6ed77add9a1bd96321468456a3cb/files/en-us/web/css/reference/properties/touch-action/index.md), opened)
- Tiled's tools and modifiers are listed in section 2. ([editing-tile-layers.rst](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/manual/editing-tile-layers.rst), opened)

### Inferences

- **The palette** is a grid of `<button>`s labelled with manifest names, showing atlas crops through `background-position`. Arrow keys move within it, and frames marked `review_only` stay hidden. One shared atlas serves the canvas and the palette.
- **Keyboard painting:** a cell cursor moves with the arrows and paints with Space. That gives keyboard access (SC 2.1.1) without a second editing model.
- **Touch:** apply `touch-action: none` only to the canvas, so page zoom still works elsewhere, and provide in-app zoom buttons.
  - Capture the pointer with `setPointerCapture`.
  - Prefer the pen when one is active; a long press acts as the eyedropper.
- **Accessibility basics:** visible focus, no colour-only state in the palette, and a text readout of the cell under the cursor (kind, sprite, zone).
- **Effort for the first usable builder** (unsourced estimates, full-time days for one developer with an AI coding assistant):

  | Component | Days |
  |---|---|
  | Build-mode shell, lazy chunk, renderer chunk patch and overlay (cursor, selection, ghosts) | 2–3 |
  | Map document, TypeScript port of the shore rule and plan-then-apply tidy, manifest-driven autotile, dirty chunks (prototype exists) | 1.5–2 |
  | Tools: brush, rectangle, flood fill, eraser, eyedropper, line | 1.5–2 |
  | Undo and redo: cell-diff and object commands, byte cap | 1 |
  | Sprites and prefabs: manifest palette, footprint and occupancy checks, stamps, copy and paste | 2–3 |
  | Zones with fields (homes, shops, workplaces) | 1.5–2 |
  | Save and load: versioned container, migrations, kit export, LDtk import | 1.5–2 |
  | Play-test hand-off to the worker, and validation of doors, roads and capacity | 1.5–2 |
  | UI: toolbar, palette, layers, lil-gui options, shortcuts, accessibility, touch gestures | 2–3 |
  | Tests: Playwright tool tests, edit-replay determinism, size-limit row | 1.5–2 |
  | **Total** | **16–24 (about 3–5 weeks)** |

- **A minimum builder** covering terrain brush, rectangle, fill, prefab stamps, undo, save and load, and Play takes about 8–12 days. (unsourced estimate)
- **Country-level editing** first needs the TypeScript port of the world generator, which is separate work not estimated here.
- **LDtk is cheaper for the developer's own M3 town,** at 3–5 days of authoring, than building the editor first. The builder pays off once players or many kits need it, which is question 2's call.

### Gaps

- No usability, screen-reader or tablet testing was done.
- The effort figures are guesses, and AI help is likely to shorten code more than art.
- iPadOS Safari's pointer and pen behaviour, and `getCoalescedEvents` support, were not checked; the MDN compatibility tables were not opened.

## Prototype files

Run from the repo root with `node` or `python -B`:

- **`map.mjs`:** the typed-array map, an exact port of `tile_for` and `tidy_water`, plan-then-apply tidy, incremental tidy, autotile and dirty chunks.
- **`tools.mjs`:** brush, rectangle, flood fill, replace-all and prefab tools, with cell-diff and chunk-snapshot undo.
- **`bench.mjs`:** the full Node benchmark. Flags: `--mode=diff|chunk`, `--tidy=raster|sync`, `--tidyAt=event|stroke`, `--warm`, `--samples`, `--equiv`.
- **`kernel-bench.mjs` and `browser.mjs`:** the same kernel in Node and in Chromium, with the GL chunk-patch check. Pass `--pw=<folder whose node_modules has playwright>`.
- **`parity.py` and `parity.mjs`:** the check against `place.py`.
- **`corners.mjs`:** corner-key consistency before and after random edits.
- **`country_stages.py`, `drain_port.mjs`, `noise_ratio.py`, `noise_port.mjs` and `place_timing.py`:** the CPython stage timings and the JS kernel ratios.
