# Rendering and tooling for a Pokémon-style pixel-art town with thousands of animated agents (status 5 October 2026)

## 1. Rendering options and their October 2026 status (PixiJS v8, @pixi/tilemap, Phaser 3/4, custom WebGL2, Canvas2D)

### Takeaway
All four options work in October 2026. PixiJS 8.22.0 (published 2026-10-01) and Phaser 4.2.1 are current. Phaser 4.0.0 shipped as a stable release on 2026-04-10 and has had three releases since. PixiJS's ParticleContainer **can** animate per particle: set the `uvs` dynamic property and assign each particle a different frame of one shared texture source. It cannot y-sort particles or give them children. @pixi/tilemap 5.0.2 supports v8, but it is low-level and fails silently above 16,384 tiles per tilemap with default settings. Phaser 4 adds `TilemapGPULayer`, a tile-index-texture shader of exactly the kind a custom renderer would use, plus `SpriteGPULayer`, which is built for static or tweened quads rather than sim-driven motion. A custom WebGL2 renderer with the full feature set came to **178 lines and 3.6 KB gzip** in this session (measured).

### Cited Findings

**How sources were accessed (legend).** Most documentation sites (pixijs.com, phaser.io, ldtk.io, mapeditor.org, aseprite.org, codeandweb.com, web3dsurvey.com, MDN) were egress-blocked. Primary material was read from GitHub repositories (raw.githubusercontent.com), from installed npm packages and from the npm registry JSON. "(opened)" means I read the document or source. "(snippet only)" means I saw only a search-result snippet. "(measured locally)" means I ran it in this session. The scripts are in `../prototypes/renderer`: `size/` holds the bundle entries and `build.mjs`, `bench/` holds the browser benchmark (`common.js`, `bench_*.js`, `run.mjs`, results `*.jsonl`, screenshots), and `src/townRenderer.js` is the prototype renderer.

**PixiJS v8**
- Version and date: `pixi.js` latest is **8.22.0**, published 2026-10-01, MIT licence. The runtime deps are earcut, tiny-lru, gifuct-js, ismobilejs, @pixi/colord, eventemitter3, @xmldom/xmldom and parse-svg-path. — [npm registry pixi.js](https://registry.npmjs.org/pixi.js) (opened)
- The v8.22.0 release notes list accessibility (Tab activation), a federated `contextmenu` event, a WebGPU "transient" option, 3D/storage textures, and fixes for nested-filter crashes and array-uniform sync. They mention nothing about context loss, iOS, particles or batching. The fetched page rendered the date as "October 1, 2024", which conflicts with the npm publish date of 2026-10-01; npm is used here. — [PixiJS v8.22.0 release](https://github.com/pixijs/pixijs/releases/tag/v8.22.0) (opened)
- **iOS issue #12224 is still open** (checked 2026-10-05). It is titled "PIXI 8 Application Crash Multiple Tabs" and was opened 2026-09-23. It affects PixiJS 8.21.0 on iOS 26.7 and 27.0 (iPhone 12, iPhone 14 Plus). Multiple tabs cause WebGL context loss and a black screen or crash, and "the same scenario does not reproduce with PixiJS 6". No maintainer response or linked fix was visible. — [pixijs/pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) (opened)
- **ParticleContainer can animate frames per particle:**
  - `dynamicProperties` has `vertex`, `position`, `rotation`, `uvs` and `color`. `uvs`: "When true, texture coordinates are updated each frame. Required for texture animation."
  - Only `position` is dynamic by default.
  - "All particles must share the same texture source (using something like a sprite sheet works well here)."
  - Particles cannot have children, filters or masks.
  - There is a `roundPixels` option.
  - — [PixiJS 8.22.0 package source, `lib/scene/particle-container/shared/ParticleContainer.d.ts`](https://github.com/pixijs/pixijs) (opened)
- **Particle data layout:** particles are drawn as 4 vertices each from an index buffer (`createIndicesForQuads`), not instanced. Each attribute is written 4 times per particle:
  - `aVertex` float32x2
  - `aPosition` float32x2
  - `aRotation` float32
  - `aUV` float32x2 (from `p.texture.uvs`)
  - `aColor` unorm8x4
  - — [PixiJS 8.22.0 `particleData.mjs`, `ParticleBuffer.mjs`](https://github.com/pixijs/pixijs) (opened). Implication (computed): with position and uvs dynamic, 64 B per particle is re-uploaded every frame, or 6.4 MB per frame at 100k.
- **Vendor numbers, on a MacBook Pro M3:** "Sprites + Container: 200,000 at 60fps. Particles + ParticleContainer: 1,000,000 at 60fps!" — [PixiJS blog source, 2024-10-03 "pixi-v8-particle-container"](https://github.com/pixijs/pixijs.com/blob/main/blog/2024-10-03-pixi-v8-particle-container.md) (opened)
- **v8 launch bunnymark, device not stated:**

  | Scenario | v7 CPU | v8 CPU | v7 GPU | v8 GPU |
  |---|---:|---:|---:|---:|
  | 100k sprites, all moving | ~50 ms | ~15 ms | ~9 ms | ~2 ms |
  | 100k sprites, not moving | — | 0.12 ms | — | ~0.5 ms |

  The post also says "render groups" put a container's transform on the GPU, and that tints and blend modes are inherited by children. A whole-scene day/night tint can therefore be set on the stage. — [PixiJS blog source, 2024-03-05 "pixi-v8-launches"](https://github.com/pixijs/pixijs.com/blob/main/blog/2024-03-05-pixi-v8-launches.md) (opened)
- **PixiJS v8 now has an experimental Canvas renderer, added in v8.16.0.** It "welcomes back the Canvas 2D renderer… If a device doesn't support WebGL or WebGPU, PixiJS falls back to Canvas automatically", and it "handles core use cases: sprites, graphics, text, and basic filters". In 8.22.0, `autoDetectRenderer` priority is `["webgl","webgpu","canvas"]`, and ParticleContainer ships a `canvas` pipe. — [PixiJS blog source, 2026-02-04 v8.16.0](https://github.com/pixijs/pixijs.com/blob/main/blog/2026-02-04-pixi-v8.16.0.mdx) (opened); [8.22.0 `lib/rendering/renderers/autoDetectRenderer.mjs`](https://github.com/pixijs/pixijs) (opened)
- The June 2026 update (v8.18/8.19) says `ParticleContainer` now respects inherited blend modes. — [PixiJS blog source, 2026-06-12](https://github.com/pixijs/pixijs.com/blob/main/blog/2026-06-12-pixi-june-update.mdx) (opened)
- **Spritesheet JSON:**
  - The `Spritesheet` parser iterates `Object.keys(data.frames)`, so it accepts both a hash and an array.
  - It reads `animations`, `meta.scale`, `meta.image` and `meta.related_multi_packs`, and handles `trimmed`/`spriteSourceSize`, `rotated`, `anchor` and `borders`.
  - It processes frames in batches of `BATCH_SIZE = 1000`.
  - The asset loader recognises a `.json` file containing `frames`.
  - No PixiJS code references Aseprite's `frameTags` (grep found none), so Aseprite tags need converting to an `animations` map.
  - — [8.22.0 `lib/spritesheet/Spritesheet.mjs`, `spritesheetAsset.mjs`](https://github.com/pixijs/pixijs) (opened; grep measured locally)
- **AnimatedSprite cost:** connecting 4,096 sprites individually to the ticker (PixiJS `autoUpdate`) "cost more than creating them, about 55ms of the 64ms" of building an animated 64×64 layer. Measured on an RTX 3080, 16,384 animated `AnimatedSprite`s cost **1.513 ms/frame**, against **0.181 ms** for packed quads; 4,096 cost 0.245 vs 0.071 ms. — [pixi-tiledmap docs/BENCHMARKS.md](https://github.com/riebel/pixi-tiledmap/blob/master/docs/BENCHMARKS.md) (opened)
- **Why moving sprites cost CPU in v8:** "PixiJS v8 batches a packed mesh by copying its vertices, already multiplied by the mesh's transform, into the batcher's buffer. When that transform changes, the mesh is packed again on the CPU." Panning a 256×256 map with 4 layers (131,072 quads) cost **4.361 ms/frame without render groups and 0.012 ms with them** (RTX 5060 Ti, 2026-09-25). — [pixi-tiledmap docs/BENCHMARKS.md](https://github.com/riebel/pixi-tiledmap/blob/master/docs/BENCHMARKS.md) (opened)

**@pixi/tilemap (pixijs-userland/tilemap)**
- npm `@pixi/tilemap` **5.0.2**, published 2025-07-14, MIT, peer `pixi.js >=8.5.0`. Previous releases: 5.0.0 (2024-03-24) and 5.0.1 (2024-04-14). — [npm registry @pixi/tilemap](https://registry.npmjs.org/@pixi/tilemap) (opened)
- The README's compatibility table maps PixiJS v8.x to tilemap v5.x. It warns: "There's also a limitation on 16k tiles per one tilemap. If you want to lift it, please use… `settings.use32bitIndex = true`". The `TEXTURES_PER_TILEMAP` and `TEXTILE_UNITS` settings are "Temporarily switched off". At the time of reading the repo had 50 open issues, 1 open PR and 331 stars. — [pixijs-userland/tilemap](https://github.com/pixijs-userland/tilemap) (opened)
- In source, `use32bitIndex` defaults to `false`. A vertex is 13 floats (52 B) and a tile is 4 vertices, so **208 B of vertex data per tile**, or about 13.6 MB for one 256×256 layer (computed). `tileAnimX/Y/Divisor` support frame-strip tile animation. — [@pixi/tilemap 5.0.2 `lib/settings.mjs`, `TilemapGeometry.mjs`, `Tilemap.mjs`](https://github.com/pixijs-userland/tilemap) (opened)
- **Measured locally:** a single `CompositeTilemap` holding a 256×256 ground layer (65,536+ tiles, one atlas) **rendered blank** with default settings. Splitting it into 64 `CompositeTilemap` chunks of 32×32 tiles rendered correctly (screenshots `bench/shot_pixi_*`).
- **pixi-tiledmap** (alternative Tiled runtime for PixiJS v8): **2.11.0**, published 2026-09-25, MIT, peer `pixi.js >=8.10.0`, 91 versions.
  - It supports TMJ/TMX, every layer type and orientation including "Tiled 1.12 oblique", animated tiles, infinite maps, runtime `setTile`, procedural generation and export back to TMJ.
  - "`parseMap`, export, procedural-map, lookup, and map-geometry APIs bundle without PixiJS". However, XML (TMX) parsing uses PixiJS's `DOMAdapter`.
  - — [npm registry pixi-tiledmap](https://registry.npmjs.org/pixi-tiledmap) (opened); [pixi-tiledmap README](https://github.com/riebel/pixi-tiledmap) (opened)

**Phaser 3 and 4**
- **Phaser 4 is released and stable.** npm `latest` = **4.2.1** (2026-07-09). Releases: 4.0.0 on 2026-04-10, 4.1.0 on 2026-04-30 and 4.2.0 on 2026-06-19. The `beta` dist-tag still points at 4.0.0-rc.7. The last v3 is **3.90.0** (2025-05-23). Phaser 4's only runtime dependency is eventemitter3. — [npm registry phaser](https://registry.npmjs.org/phaser) (opened)
- About Phaser 4.0.0 "Caladan", 10 April 2026:
  - It is "built on a brand-new, highly efficient WebGL renderer… manages WebGL state, supports context restoration".
  - "The Canvas renderer is still available but should be considered deprecated."
  - "Standard Phaser rendering can handle tens of thousands of sprites with good performance; SpriteGPULayer can handle a million or more."
  - v4 draws quads with index buffers, so each quad uploads 4 vertices instead of 6.
  - — [Phaser CHANGELOG-v4.0.0.md (in the phaser 4.2.1 npm package)](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
- **TilemapGPULayer** (new in 4.0):
  - Limits: "a single Tileset, with a single texture image"; "Maximum tilemap size of 4096x4096 tiles"; "Maximum of 2^23 (8388608) unique tile IDs"; flip and animation supported; "Orthographic tilemaps only"; WebGL only.
  - How it works: it "uses a texture containing the layer tile data… renders the tiles as a single quad". It "has a fixed cost per pixel on screen", and a texel is a 32-bit value: flipX, flipY, animated, unused, 28-bit index.
  - Edits need `generateLayerDataTexture()`. You create the layer with `Tilemap.createLayer(id, tileset, x, y, true)`.
  - — [Phaser 4.2.1 `src/tilemaps/TilemapGPULayer.js`](https://github.com/phaserjs/phaser/blob/master/src/tilemaps/TilemapGPULayer.js) (opened). Per the 4.2.0 changelog, "TilemapGPULayer does not support tinting on tiles". — [CHANGELOG-v4.2.0.md](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.2/CHANGELOG-v4.2.0.md) (opened)
- **TilemapGPULayer quirk (measured locally; cause read in source):** in 4.2.1, empty cells (index −1) in a GPU layer drew an opaque colour, namely the tileset's corner texel. The fragment shader's `getTileTexelCoord` returns `vec2(0.0)` for `tile.empty` instead of discarding. Clearing that one texel to transparent fixed the render (screenshots `bench/grid_phaser.png`, `bench/grid2.png`). — [Phaser 4.2.1 `src/renderer/webgl/shaders/TilemapGPULayer-frag.js`](https://github.com/phaserjs/phaser/blob/master/src/renderer/webgl/shaders/TilemapGPULayer-frag.js) (opened)
- **SpriteGPULayer** (new in 4.0):
  - It is "optimized for rendering very large numbers of quads following simple tween animations" and "can generally perform well with a million small quads".
  - "Avoid changing the contents of the SpriteGPULayer frequently, as this requires the whole buffer to be updated". It uses one single-image texture ("multi atlas will not work"), the buffer is split into 24 update segments, and memory is "168 bytes per member on both CPU and GPU".
  - Guidance: "Avoid drawing more than a few million pixels per frame."
  - — [Phaser 4.2.1 `src/gameobjects/spritegpulayer/SpriteGPULayer.js`](https://github.com/phaserjs/phaser/blob/master/src/gameobjects/spritegpulayer/SpriteGPULayer.js) (opened); [CHANGELOG-v4.0.0.md](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
- **Pixel-art mode:** `pixelArt: true` "tells the WebGL renderer to automatically create textures using a nearest-neighbor filter mode" and sets `antialias=false`, `antialiasGL=false` and `roundPixels=true`. — [Phaser 4.2.1 `src/core/Config.js`](https://github.com/phaserjs/phaser/blob/master/src/core/Config.js) (opened)
  - In v4, `roundPixels` defaults to `false` (it was `true` in v3). It "only operates when objects are axis-aligned and unscaled", and per-object `vertexRoundMode` was added. — [MIGRATION-GUIDE.md](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md) (opened)
  - The new `smoothPixelArt` option "supports antialiasing while preserving sharp texels when scaled up". — [CHANGELOG-v4.0.0.md](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
- **Loaders:**
  - Phaser 4 ships `AsepriteFile` and `AnimationManager.createFromAseprite`, a Tiled parser (`src/tilemaps/parsers/tiled`), `AtlasJSONFile`, `MultiAtlasFile` and a new `PCTAtlasFile` ("Phaser Compact Texture Atlas").
  - **There is no LDtk parser in Phaser's source** (grep, measured locally).
  - — [Phaser 4.2.1 `src/loader/filetypes`, `src/animations/AnimationManager.js`](https://github.com/phaserjs/phaser) (opened)

**Other engines (context only):** Excalibur 0.32.0 (2025-12-23; BSD-2-Clause) has `@excaliburjs/plugin-tiled` 0.32.0 and `@excaliburjs/plugin-ldtk` 0.32.1 (2026-07-13). melonJS 20.7.0 (2026-09-22, MIT) has built-in Tiled support. KAPLAY stable 3001.0.19 (2025-06-15) and 4000.0.0-alpha.27.1 (2026-05-12). — [npm registry: excalibur](https://registry.npmjs.org/excalibur), [plugin-ldtk](https://registry.npmjs.org/@excaliburjs/plugin-ldtk), [plugin-tiled](https://registry.npmjs.org/@excaliburjs/plugin-tiled), [melonjs](https://registry.npmjs.org/melonjs), [kaplay](https://registry.npmjs.org/kaplay) (opened)

**Custom WebGL2 renderer, prototype written and tested in this session (measured locally)**
- `src/townRenderer.js` is **178 lines** of JS. Built with esbuild 0.28.2 it is **9,320 B minified, 3,560 B gzip-9 and 3,224 B brotli-11**. The previous round's dot renderer was 1,083 B gzip. It has four passes per frame:
  1. A tilemap pass: one full-screen triangle reads an `RGBA16UI` tile-index texture (ground, detail and "above" layers per texel) and fetches atlas texels with `texelFetch`. Animated tiles cycle 4 frames, and a per-tile average-colour texture serves the zoomed-out LOD.
  2. Characters as instanced quads. Per-instance data is previous position (f32×2), current position (f32×2) and a packed `uint` word (outfit | facing << 8 | emote << 11). The vertex shader interpolates between ticks, derives facing and the 3-frame walk cycle from velocity, and snaps positions to whole texels and device pixels.
  3. The "above" tile layer (roofs, tree tops) drawn over people.
  4. Emote bubbles.

  **Y-sorting is done by the depth test**, with depth computed from y and alpha-tested 1-bit pixel art, so there is no CPU sort. Zoomed out, agents become 3-pixel dots coloured from a palette texture. Day/night is an ambient multiply. It handles context loss by re-initialising on `webglcontextrestored`, and `dispose()` calls `WEBGL_lose_context`.
- It rendered correctly in headless Chromium (SwiftShader), and its screenshot matched an independent Canvas2D reference implementation (`bench/grid.png`). Draw order between overlapping characters was not separately checked.

**Canvas2D**
- Measured locally: a reference Canvas2D renderer pre-bakes 32×32-tile chunk canvases and draws only viewport-visible agents with `drawImage`, y-sorted, with `imageSmoothingEnabled=false` (see §2 for numbers).
- Phaser 4 deprecates its Canvas renderer (above). PixiJS 8.16+ has an experimental Canvas renderer (above).

### Inferences
- PixiJS's ParticleContainer meets the "switch frames per particle" requirement, but a Pokémon-style town also needs y-sorted overlap (feet lower on screen drawn on top), emote bubbles attached to agents, and roofs over people. With particles, y-sort means reordering `particleChildren` and calling `update()` every tick, which re-uploads static attributes. Sprites can sort, but cost several times more CPU (§2).
- `SpriteGPULayer` is a poor fit. Sim agents change position every tick, which triggers whole-buffer updates of 168 B per member (16.8 MB per tick at 100k).
- Phaser 4's `TilemapGPULayer` shows the tile-index-texture approach is mainstream. A custom renderer can use the same idea without the 273–371 KB engine (§2), and without the empty-tile and no-tint limitations.
- PixiJS's new Canvas fallback means a PixiJS build would cover "no WebGL" automatically. For this project the custom path still needs its own small Canvas2D fallback (§2 shows it is cheap when culled).

### Gaps
- No maintainer response to #12224 was visible, and whether PR #12226 (noted in the previous round) has merged was not re-checked.
- AnimatedSprite's own source was not opened; its cost comes from pixi-tiledmap's measurements.
- Whether @pixi/tilemap 5.0.2 works with PixiJS's new Canvas renderer was not checked.
- Phaser 4's behaviour under iOS multi-tab context loss was not found in any issue tracker.

## 2. Performance: sprites, tilemaps, texture limits, memory, overdraw, bundle size

### Takeaway
The deciding cost is **main-thread CPU per frame**, which is where the uPlot charts also run. In the same harness and the same scene, the custom instanced renderer used **0.3 ms per frame at 10k agents and 2.3 ms at 100k**. PixiJS Sprites with y-sort used 18.8 ms at 10k (8.7 ms unsorted), PixiJS ParticleContainer 2.9 ms (no sort), and Phaser 4 Sprites 17.2 ms (7.3 ms unsorted). These are measured locally with software GL, so treat them as relative. Tilemaps should be a tile-index texture: about 0.5 MB for 256×256, a fixed cost per pixel, no seams. Pre-baked chunk textures cost 64 MB per layer at that size. Bundles: custom 3.6 KB gzip, PixiJS 107–215 KB, Phaser 4 273–371 KB.

### Cited Findings

**Measured locally, browser benchmark.** Chromium 141.0.7390.37 headless shell (Playwright 1.56.1), WebGL2 via `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`, on an Intel Xeon @ 2.80 GHz with 4 vCPUs, Linux.

Every engine did the same work: a 256×256 map of 16-px tiles (4096×4096 px) with ground, detail and roof-over-people layers; a 1280×720 canvas at zoom 3 with a static camera at the map centre; agents spread uniformly, about 0.6% visible; 30 Hz sim ticks and 60 Hz frames; interpolation between two snapshots; per-agent frame choice among 96 frames (8 outfits × 4 directions × 3 walk frames); and emote bubbles on about 5% of agents. The "sim" is a stub on the main thread and is excluded from timings; the render-side per-tick work (packing, uploading, zIndex) is included. Values are the median main-thread ms per frame, with p95 in brackets; 10k rows from a second run are shown after a slash. Scripts are `bench/*.js` and results are `bench/results_matrix_final.jsonl` and `bench/results_extra.jsonl`.

| Agents | Custom WebGL2 (instanced, GPU interpolation, depth y-sort) | PixiJS 8.22 Sprite, y-sorted (`sortableChildren` + zIndex) | PixiJS Sprite, unsorted | PixiJS ParticleContainer (position+uvs dynamic, unsorted) | Phaser 4.2.1 Sprite, depth-sorted + TilemapGPULayer | Phaser 4 Sprite, unsorted | Canvas2D (viewport-culled `drawImage`) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | 0.1 (0.3) | 2.5 (5.0) | — | 1.5 (3.3) | 1.7 (3.8) | — | 0.1 (0.2) |
| 10,000 | **0.3** (0.6) | **18.8** (34.7) / 19.9 | **8.7** (14.6) | **2.9** (5.3) / 3.1 | **17.2** (27.8) / 17.9 | **7.3** (11.4) | 0.4 (0.7) |
| 25,000 | 0.6 (1.3) | 45.9 (89.9) | — | 4.9 (9.4) | 42.2 (63.8) | — | 0.9 (2.2) |
| 100,000 | **2.3** (6.6) | 298 (413) | 276 (477) | 142.5 (197.9) / 132.8 | 231.1 (294.4) | — | 3.8 (4.4) |

- **Where the time goes (measured locally, 10k agents, second run):**

  | Configuration | JS property updates | render() / game.step() |
  |---|---:|---:|
  | PixiJS Sprite, y-sorted | 1.5 ms | 17.6 ms |
  | PixiJS Sprite, unsorted | 1.5 ms | 6.9 ms |
  | PixiJS ParticleContainer | 0.4 ms | 2.3 ms |
  | Phaser 4, sorted | 1.9 ms | 14.3 ms |
  | Phaser 4, unsorted | 0.7 ms | 6.1 ms |

  At 100k: PixiJS particles 2.8 + 126.0 ms; PixiJS sprites unsorted 18.3 + 252.4 ms.
- **Other measurements (measured locally):**
  - Render-side work per tick, median: custom 0.3 ms at 10k and 2.4 ms at 100k (JS word packing plus a 1.2 MB upload: 0.8 MB of positions and 0.4 MB of words); PixiJS Sprites 0.8 / 9.8 ms; Phaser 1.9 / 11.1 ms.
  - The custom renderer at zoom 1 took 0.2 ms (10k) and 2.3 ms (100k); at zoom 0.25 (dot LOD), 2.3 ms at 100k.
  - Phaser with the CPU `TilemapLayer` instead of the GPU layer: 15.1 ms at 10k (update 1.7 + step 12.3).
- **Setup time (measured locally):** custom 29–56 ms; PixiJS 0.12–0.39 s; Phaser 0.59 s (1k) to **2.42 s (100k)**.
- **JS heap growth (measured locally, rough, GC noise):** custom about 1–3 MB in total. PixiJS Sprite went from 40.9 to 179.5 MB between 1k and 100k agents (≈1.4 KB per agent); ParticleContainer 39.2 → 88.5 MB (≈0.5 KB per agent); Phaser Sprite 70.4 → 163.2 MB (≈0.9 KB per agent); Canvas2D about 1 MB.
- **Caveats on these numbers (measured locally):**
  - Frame-to-frame intervals were dominated by SwiftShader's software rasterisation. They varied erratically, from 16.7 to 366 ms for the same renderer, and are **not** reported.
  - SwiftShader threads share the 4 vCPUs with the page's main thread.
  - Large per-frame buffer uploads cost far more under software GL. The pixi-tiledmap authors note the same: "Without `MEASURE_GPU` Chrome rasterises in software, where a buffer upload costs orders of magnitude more than on a GPU". The 100k PixiJS and Phaser rows (several MB uploaded per frame) are therefore pessimistic. — [pixi-tiledmap docs/BENCHMARKS.md](https://github.com/riebel/pixi-tiledmap/blob/master/docs/BENCHMARKS.md) (opened)
- **Published GPU-backed numbers:**
  - PixiJS v8 bunnymark, 100k moving sprites: ~15 ms CPU and ~2 ms GPU (device not stated). — [PixiJS v8 launch post source](https://github.com/pixijs/pixijs.com/blob/main/blog/2024-03-05-pixi-v8-launches.md) (opened)
  - On a MacBook Pro M3: 200k Sprites and 1M particles at 60 fps. — [ParticleContainer post source](https://github.com/pixijs/pixijs.com/blob/main/blog/2024-10-03-pixi-v8-particle-container.md) (opened)
  - On an RTX 3080: 16,384 AnimatedSprites at 1.513 ms/frame. — [pixi-tiledmap BENCHMARKS](https://github.com/riebel/pixi-tiledmap/blob/master/docs/BENCHMARKS.md) (opened)
  - Phaser: "tens of thousands of sprites with good performance". — [Phaser CHANGELOG-v4.0.0](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
  - **No published mobile numbers with a stated method were found.**
- **Tilemap cost by approach:**
  - **Tile-index texture plus shader** (custom; Phaser `TilemapGPULayer`): a fixed per-pixel cost regardless of map size. Phaser can draw "the entire layer just as quickly if the camera zooms out to see all 16 million tiles… particularly on mobile platforms." Memory for a 256×256 map is 256×256×8 B = 512 KB (RGBA16UI, 4 layers per texel); for 128×128 it is 128 KB (computed). — [CHANGELOG-v4.0.0](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
  - **Quad per tile** (@pixi/tilemap): 208 B per tile, so 13.6 MB per 256×256 layer, with a 16,384-tile default limit per Tilemap (§1).
  - **Packed meshes** (pixi-tiledmap): 16,000 quads per mesh. Panning costs 4.361 ms without render groups and 0.012 ms with them (RTX 5060 Ti). — [BENCHMARKS](https://github.com/riebel/pixi-tiledmap/blob/master/docs/BENCHMARKS.md) (opened)
  - **Pre-baked chunk textures:** 4096×4096 px × 4 B = **64 MB per layer** at 256×256, and 1 GB at 1024×1024 (computed).
- **Texture size limits:**
  - ANGLE's Metal backend, which Safari uses for WebGL, sets `max2DTextureSize = 16384` when `supportsAppleGPUFamily(3)` and 8192 otherwise (16384 on macOS, 8192 in the iOS simulator). — [ANGLE `src/libANGLE/renderer/metal/DisplayMtl.mm`](https://github.com/google/angle/blob/main/src/libANGLE/renderer/metal/DisplayMtl.mm) (opened)
  - WebGL2 `MAX_TEXTURE_SIZE` in the field: **Android 4096 = 100%, 8192 = 73%, 16384 = 2%; iOS 8192 = 100%, 16384 = 98%**; overall 16384 = 71%. — [web3dsurvey MAX_TEXTURE_SIZE (WebGL2)](https://web3dsurvey.com/webgl2/parameters/MAX_TEXTURE_SIZE) (snippet only; site blocked)
- **Overdraw guidance:** Phaser's SpriteGPULayer docs say "If the quads are large, the layer will be fill-rate limited. Avoid drawing more than a few million pixels per frame." — [SpriteGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/gameobjects/spritegpulayer/SpriteGPULayer.js) (opened)

**Bundle sizes (measured locally).** Built with esbuild 0.28.2: `--bundle --minify --format=esm --target=es2022`, single file, gzip level 9 and brotli quality 11 via Node zlib, same method as the previous round. Entries are in `size/` and the build script is `size/build.mjs`. Packages: pixi.js 8.22.0, @pixi/tilemap 5.0.2, pixi-tiledmap 2.11.0, phaser 4.2.1, phaser 3.90.0.

| Entry (realistic import set) | min (B) | gzip-9 (B) | brotli-11 (B) |
|---|---:|---:|---:|
| Previous round: raw WebGL2 dot renderer | 2,338 | **1,083** | 960 |
| Custom WebGL2 town renderer prototype (tilemap + sprites + emotes + LOD dots + day/night + context loss) | 9,320 | **3,560** | 3,224 |
| PixiJS: `WebGLRenderer` + `Container` + `Sprite` + `Spritesheet` + `Texture` | 375,429 | **106,530** | 89,472 |
| PixiJS: above + `AnimatedSprite` + `ParticleContainer`/`Particle` + `@pixi/tilemap` `CompositeTilemap` | 415,318 | **117,369** | 98,118 |
| PixiJS: `Application` (auto-detect) + `Assets` + `AnimatedSprite` + `ParticleContainer` + `@pixi/tilemap` | 628,855 | **184,030** | 151,059 |
| PixiJS: `Application` + `Assets` + `pixi-tiledmap` loader | 746,420 | **214,592** | 175,768 |
| Phaser 4.2.1 full (`import Phaser from 'phaser'`, dist ESM, not tree-shakable) | 1,394,777 | **370,844** | 297,078 |
| Phaser 4.2.1 custom build from `src/phaser-core.js` + `Tilemaps` (WebGL only, `CANVAS_RENDERER=false`, `FEATURE_SOUND=false`) | 1,014,095 | **272,757** | 217,996 |
| Phaser 3.90.0 full (dist ESM) | 1,215,684 | **332,065** | 265,799 |
| Worker: `pixi-tiledmap` `parseMap` only (TMJ, no renderer) | 12,254 | **4,383** | 3,979 |
| Worker: hand-written LDtk reader (IntGrid → walk grid, Entities → zones) | 523 | **340** | 299 |

- The shipped files, compressed directly: phaser 4.2.1 `dist/phaser.min.js` is 1,375,976 B, or 354,010 B gzip; phaser 3.90.0 `dist/phaser.min.js` is 1,196,122 B, or 316,203 B gzip. (measured locally)

### Inferences
- **Main-thread budget:** at 60 fps the main thread has 16.7 ms and must also run uPlot and input.
  - With y-sorting, PixiJS Sprites (~19 ms) and Phaser Sprites (~17 ms) already exceed the budget at 10k agents in this environment, even with only about 60 agents on screen. Their cost is per object, not per visible object; culling helps the GPU, not the transform and batch work.
  - Faster real CPUs might cut these numbers by 2–4×, but phones are often slower than this Xeon core, so the 25k phone tier is not credible with scene-graph sprites.
  - The custom renderer's cost is dominated by a per-tick typed-array upload. It stays at or below about 2.5 ms per frame at 100k because interpolation, facing and walk frame run on the GPU.
- **Y-sort is the hidden cost for scene graphs:** about +10 ms at 10k in both engines. The depth-test trick removes it but needs binary alpha, so drop shadows go in a separate non-depth pass.
- **GPU side** (not measured; reasoning): the custom renderer submits 8 vertices per agent per frame (body and emote pass), 800k at 100k, plus 2 full-screen tile passes. At street zoom only about 0.6% of agents produce fragments. If vertex load matters on low-end phones, compact visible indices on the CPU per tick with a spatial grid; this is an O(N) loop.
- **Atlas sizing:** keep one atlas at **2048×2048**. That is 16 MB RGBA, safe everywhere: Android supports 4096 universally, 8192 at only 73% and 16384 at 2%. 2048² holds 4,096 tiles plus 1,024 character frames of 16×32 — for example 85 outfits × 12 frames — plus emotes. Use 4096² only after checking `MAX_TEXTURE_SIZE`; use a second atlas or texture array if needed.
- **Memory at 100k:** about 2.0 MB of GPU instance data (previous and current f32 x,y plus a u32 word = 20 B per agent), against 90–180 MB of extra JS heap for PixiJS or Phaser objects. This matters on iOS tabs, given the open multi-tab context-loss issue.

### Gaps
- No real-GPU or phone measurements were possible (no GPU browser or device was available). Every frame-time number above is CPU-side, under software GL.
- No published, method-stated benchmark of thousands of *animated, moving, y-sorted* sprites on mobile was found.
- The web3dsurvey numbers are a snippet (the site is blocked); no sample size or date was seen.
- Vite/Rolldown output may differ by a few percent from esbuild. Tree-shaking of PixiJS's WebGPU path under `Application` was not tested.

## 3. Snapshot protocol: minimum extra per-agent data and bytes per tick

### Takeaway
Add **one 32-bit "visual word" per agent**: outfit/role, emote, action state, facing hint and flags. Derive facing and walk frame on the render side from interpolated velocity, and keep the sim deterministic. With f32 x,y plus the word, the snapshot is **12 B per agent: 120 KB per tick at 10k (3.6 MB/s at 30 Hz) and 1.2 MB per tick at 100k (36 MB/s)**. Quantising x,y to u16 cuts this to 8 B per agent.

### Cited Findings
- **Implemented and measured locally:** the prototype's vertex shader computes `vel = aCur − aPrev`, and treats an agent as moving when `dot(vel,vel) > 0.0025` (0.05 px per tick). Facing is the dominant axis (0 down, 1 left, 2 right, 3 up). The walk frame cycles stand, left step, stand, right step from `uTime*6 + per-instance phase`. Idle agents use the 2-bit facing carried in the word. A render-side `packWords()` keeps last-facing per agent; it costs 0.3 ms per tick at 10k and 2.4 ms at 100k including the GPU upload (SwiftShader, Xeon). — `src/townRenderer.js`; `bench/results_matrix_final.jsonl`
- Per-instance GPU data in the prototype: previous position f32×2, current position f32×2 (ping-pong buffers, so only the new snapshot is uploaded each tick), and a u32 word read with `vertexAttribIPointer`. — `src/townRenderer.js` (measured locally)
- WebGL2 is supported in Chrome 56, Chrome Android 58, Firefox 51 and Safari/iOS 15; `transferControlToOffscreen` in Chrome 69, Firefox 105 and Safari/iOS 16.4. — [MDN browser-compat-data 8.1.4 (installed package)](https://github.com/mdn/browser-compat-data) (opened)

**Bytes per agent per tick (computed; 1 KB = 1,000 B; transfer is zero-copy, so the real cost is the GPU upload):**

| Layout | B/agent | 10k per tick | 10k at 30 Hz | 25k per tick | 100k per tick | 100k at 30 Hz |
|---|---:|---:|---:|---:|---:|---:|
| f32 x,y + u32 visual word (recommended; role colour for dots comes from a palette by role id) | 12 | 120 KB | 3.6 MB/s | 300 KB | 1.2 MB | 36 MB/s |
| f32 x,y + RGBA colour + u32 word (keep the current colour channel) | 16 | 160 KB | 4.8 MB/s | 400 KB | 1.6 MB | 48 MB/s |
| u16 x,y in 1/16 px + u32 word (fits 4096 px = 256 tiles exactly; 1/8 px for 512 tiles) | 8 | 80 KB | 2.4 MB/s | 200 KB | 0.8 MB | 24 MB/s |

**Suggested visual-word bit layout (design proposal):**

| Bits | Field | Notes |
|---|---|---|
| 0–7 | sprite/outfit id | Role × variant, 256 values. |
| 8–9 | facing hint | The sim's last move direction; free for the sim to emit, and spares render-side state. |
| 10–12 | action state | idle, walk, run, work/sit, sleep, fight, arrested, down. |
| 13–17 | emote id | 0 = none, up to 31 emotes. |
| 18 | indoors/hidden | Agents inside homes, shops or jail are not drawn on the town map. |
| 19 | teleported | Snap; do not interpolate. |
| 20–23 | status flags | Carrying goods, injured, wanted, selected. |
| 24–31 | palette/tint variant, or reserved | |

### Inferences
- **Facing and walk frame can be derived on the render side.** The pieces the renderer cannot infer are:
  - facing while idle (use the hint bits, or keep render-side state);
  - teleports such as entering or leaving buildings, wrap-around or respawn (use a flag);
  - "intended but blocked" movement (accept showing idle).
- Use hysteresis on the dominant axis so diagonal movement does not flicker between left/right and up/down. Movement on the tile grid is axis-aligned, so this rarely triggers.
- A stateless alternative for the walk frame is `floor((x + y) / 8) & 3` while moving. It advances one frame every half-tile travelled (two frames per 16-px step, as in GBA overworlds) and needs no clock or per-agent phase.
- Emote ids and action states are sim facts ("thief spotted", "arrested", "trading"), so the worker must send them. Outfit ids are static per agent and could instead go once in a separate "roster" message. That saves one byte per agent per tick, but the word is already 4 B, so it is simpler to keep it.
- Rendering quantisation (u16 positions) and render-side derivations never feed back into the sim, so seeded determinism is unaffected.

### Gaps
- The snapshot's current exact layout (how colour is stored) was not available, so the "current" baseline is assumed to be 12 B (x, y, packed colour).

## 4. Pixel-perfect rendering: integer zoom, nearest sampling, camera snapping, DPR, seams

### Takeaway
Zoom by **whole device pixels per texel**, not CSS pixels. Size the backing store from the device-pixel content box, sample with nearest/`texelFetch`, snap sprites to whole texels and the camera to whole device pixels, and fetch tiles with integer texel coordinates so seams cannot occur. On phones, render the world at 1 px per texel into a small framebuffer and blit it with an integer scale. Fractional zoom gives uneven texel widths and shimmer while panning, and with UV sampling it also gives bleeding seams unless the atlas is extruded.

### Cited Findings
- **Browser support:**
  - `image-rendering: pixelated`: Chrome 41, Chrome Android 41, Firefox 93, Safari 10, iOS 10. `crisp-edges`: Firefox 65, Safari 7, Chrome 148.
  - `ResizeObserverEntry.devicePixelContentBoxSize`: Chrome 84, Firefox 108, **not Safari/iOS**.
  - `CanvasRenderingContext2D.imageSmoothingEnabled`: Chrome 30, Firefox 51, Safari 9.1.
  - — [MDN browser-compat-data 8.1.4](https://github.com/mdn/browser-compat-data) (opened, installed package)
- Phaser `pixelArt: true` turns on nearest filtering and `roundPixels`. v4 rounds only for axis-aligned, unscaled objects (to prevent flicker) and offers `smoothPixelArt` for antialiased scaling that keeps texels sharp. — [Phaser Config.js](https://github.com/phaserjs/phaser/blob/master/src/core/Config.js), [MIGRATION-GUIDE.md](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md), [CHANGELOG-v4.0.0](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
- Phaser on seams: "if the texture is not a power of two in size, some texture seaming may occur if you line up sprites exactly… This can be avoided by adding/extruding a pixel of padding around each frame… If you are using pixel art mode or round pixels, you should aim to use a power of two texture." — [SpriteGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/gameobjects/spritegpulayer/SpriteGPULayer.js) (opened)
- Phaser `TilemapGPULayer`: "If the tileset image uses NEAREST minfiltering, the shader will render sharp edged pixels… in LINEAR mode, with no seams or bleeding", whereas "A regular TilemapLayer cannot render smooth borders like this, creating sharp seams between tiles." — [TilemapGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/tilemaps/TilemapGPULayer.js) (opened)
- PixiJS: the ParticleContainer vertex shader has `roundPixels()`, which snaps clip-space positions to the target resolution when `uRound == 1`. Renderer `roundPixels` and `TextureStyle` `scaleMode: 'nearest'` exist. — [PixiJS 8.22.0 `particles.vert.mjs`, `TextureStyle.d.ts`](https://github.com/pixijs/pixijs) (opened)
- **Atlas padding tools:**
  - The Aseprite CLI has `--extrude` ("duplicating all edges one pixel"), `--shape-padding N` (gap between frames), `--border-padding N` and `--inner-padding N`, all applying to `--sheet`. — [aseprite/docs cli.md](https://github.com/aseprite/docs/blob/main/cli.md) (opened)
  - TexturePacker advertises "edge extrude" and padding. — [codeandweb TexturePacker](https://www.codeandweb.com/store/texturepacker-single) (snippet only)
- **Prototype (measured locally):** both shaders sample with `texelFetch(ivec2(floor(texCoord)))`. Sprites are placed at `floor(pos) − anchor` (whole texels) and then `floor((world − cam) * zoom + 0.5)` (whole device pixels). The tile pass computes `ivec2 w = floor(world); tile = w >> 4; inTile = w & 15`, so no UV is ever interpolated across a tile boundary. — `src/townRenderer.js`

### Inferences
- **DPR recipe:**
  1. Backing store = `devicePixelContentBoxSize`, with a fallback of `round(cssW × devicePixelRatio)` on Safari.
  2. Choose `zoom = max(1, floor(deviceWidth / targetTexelsWide))`. Example: an iPhone at DPR 3 is 390 CSS px, or 1170 device px, wide. 1170 / 240 GBA texels = 4.875 → zoom 4, showing 292 texels (18 tiles); or zoom 5, showing 234 texels (14.6 tiles).
  3. Offer "zoom in/out" as integer steps.
  4. Never scale the canvas with CSS (or set `image-rendering: pixelated` in case the browser rounds).
- **Fill cost on phones:** at native DPR 3 (1170×2532 ≈ 2.96 Mpx), two full-screen tile passes are about 6 Mpx per frame, above Phaser's "few million pixels" guidance. Instead, render to an FBO of `ceil(device/zoom)` (e.g. 293×633, 0.19 Mpx) and blit with integer scale and `NEAREST`. This makes the frame pixel-perfect by construction and cuts fragment work by zoom², 16× at zoom 4. The cost is that camera and sprites snap to whole texels. That is authentic for GBA but slightly jerkier; it can be offset by shifting the blit by the fractional camera remainder in device pixels.
- **What breaks at fractional zoom:**
  - Uneven texel widths: at 2.5×, texels alternate 2 and 3 px.
  - Shimmer and "wobble" as the camera pans, because texel boundaries move relative to screen pixels.
  - With UV-based sampling (PixiJS Sprite and tilemap, Phaser TilemapLayer): bleeding seams between adjacent atlas frames and tiles, unless frames are extruded by at least 1 px or `texelFetch`-style shaders are used.
  - With mipmaps or LINEAR filtering: blur.
- Phaser's `smoothPixelArt` is a reasonable choice if continuous (pinch) zoom is wanted between integer steps. Otherwise snap the pinch zoom to integers.

### Gaps
- No device testing of DPR edge cases (Android DPR 2.625/2.75, Safari's rounding of the canvas size) was possible.

## 5. Semantic zoom and level of detail

### Takeaway
Pick representations by **on-screen size of a tile**:

| On-screen tile size | Tiles | Agents |
|---|---|---|
| ≳16–24 CSS px | Full tilemap | Sprites, emotes |
| ~4–16 CSS px | Per-tile average-colour "minimap" texture | Role-coloured 2–3 px dots |
| ≲4 CSS px | Minimap texture | Density heatmap, optionally with highlighted roles (police, thieves) |

Add hysteresis and a short cross-fade. OpenTTD and Factorio both switch representation by zoom level. The prototype already implements the first two levels in about 10 shader lines.

### Cited Findings
- OpenTTD's zoom levels include `Detail = Out2x, ///< All zoom levels below or equal to this will result in details on the screen, like road-work, ...` and `TextEffect = Out2x` ("All zoom levels above this will not show text effects"). Detail sprites and text are suppressed past a zoom threshold. — [OpenTTD `src/zoom_type.h`](https://github.com/OpenTTD/OpenTTD/blob/master/src/zoom_type.h) (opened)
- Factorio switches between "map view" and an interactive "world view" at a zoom threshold (0.4 is described as the "zoom-to-world" threshold). Version 0.15.11 moved the switch point because it interfered with reading map tags. — [Factorio forums: "Can't zoom into world view on map anymore"](https://forums.factorio.com/viewtopic.php?f=18&t=48108); [Zooming Reinvented mod discussion](https://mods.factorio.com/mod/ZoomingReinvented/discussion/5ca98a184dc373000cfd28a5) (snippet only)
- Phaser's `TilemapGPULayer` renders "all 16 million tiles" at the same cost when zoomed out, so the tile layer itself does not need LOD for performance. With NEAREST minification it does alias. — [CHANGELOG-v4.0.0](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/CHANGELOG-v4.0.0.md) (opened)
- **Prototype LOD (measured locally):**
  - When `zoom < 0.5` device px per texel (8 px per tile), the tile pass samples a LINEAR per-tile average-colour texture (`uTileAvg`, 256 KB at 256×256).
  - When `zoom < 1`, agents become 3-device-pixel dots coloured from a palette texture indexed by outfit/role.
  - At zoom 0.25 with 100k agents it used 2.3 ms of main-thread CPU (screenshot `bench/shot_custom_x_1000_0.25.png`). — `src/townRenderer.js`, `bench/results_matrix_final.jsonl`

### Inferences
- **Threshold proposal**, using s = CSS px per 16-px tile = 16 × zoom / DPR:

  | s | Tiles | Agents | Extras |
  |---|---|---|---|
  | ≥ 16 | Full | Sprites | Emotes. A GBA-width view on a 390-px phone is s ≈ 26. |
  | 6–16 | Full, or minimap if aliasing shows | Sprites without emotes | Shadows off |
  | 2.5–6 | Average-colour minimap | Dots | |
  | < 2.5 | Minimap | Heatmap | |

  The heatmap is binned on the render side from the snapshot, e.g. into 128×128 bins, a 64 KB R16 texture uploaded per tick, with a colour ramp and log scale.
  Switch with about 15% hysteresis and cross-fade over about 150 ms.
- **Readability:** sprites stop being legible well before they stop being affordable. At 100k, the whole-city view is a data visualisation (heatmap), not a game view, and dots at 100k cost the same as sprites in the custom renderer, which is the same instanced draw.
- **Picking/selection** at any zoom should use the sim's spatial index (in the worker), not the renderer.

### Gaps
- No primary design writing on semantic-zoom thresholds for agent sims was found. The Factorio material is snippet-only, and the thresholds above are proposals to be tuned in user testing.

## 6. Tooling and data pipeline: map editors, sprite editors, atlas packing, one map file for sim and renderer

### Takeaway
Use **LDtk** for the town. It is MIT-licensed, version 1.5.3, with a documented JSON format and an official JSON Schema that quicktype turns into TypeScript types. Its **IntGrid** layer is a ready-made walkability and zoning grid for the sim worker, which a 0.34 KB-gzip hand-written reader can parse. Its **auto-layer rules** generate the visual tiles that the renderer bakes into a tile-index texture. The same `.ldtk` file therefore feeds both. Tiled 1.12.2 is the alternative (editor GPL; libtiled BSD; maps are your data). Its best PixiJS runtime is pixi-tiledmap, whose data-only parser runs in a worker at 4.4 KB gzip. For sprites, **Aseprite** (proprietary EULA, source-available) has the best CLI for atlas export. LibreSprite (GPLv2), Pixelorama (MIT) and Piskel (Apache-2.0) are free alternatives. Pack with the Aseprite CLI or free-tex-packer (MIT core). TexturePacker is commercial.

### Cited Findings

**LDtk**
- MIT licence, "Copyright (c) 2020, Sébastien Benard - Deepnight Games". The README calls it "a modern, efficient and open-source 2D level editor". It is built with Haxe. — [deepnight/ldtk LICENSE](https://github.com/deepnight/ldtk/blob/master/LICENSE), [README](https://github.com/deepnight/ldtk/blob/master/README.md) (opened)
- The latest tag is **v1.5.3**. Its changelog includes crash fixes and "Added `ne`,`nw`,`se`,`sw` corners directions for `Level.__neighbours` in JSON". The release date was not visible in the repo files. — [git tags](https://github.com/deepnight/ldtk) (opened via `git ls-remote`); [docs/CHANGELOG.md](https://github.com/deepnight/ldtk/blob/master/docs/CHANGELOG.md) (opened)
- **JSON format** "(version 1.5.3)":
  - The root has `levels`, `defs`, `externalLevels` ("one file… for each level"), `toc` (entities flagged `exportToToc`) and `worlds`. `simplifiedExport` is described as "a very simplified will be generated on saving, for quicker & easier engine integration".
  - Layer instances carry `__cWid`/`__cHei`, `intGridCsv` ("`0` means 'empty cell' and IntGrid values start at 1… size is `__cWid` x `__cHei`", row-major), `autoLayerTiles` ("all tiles generated by Auto-layer rules"), `gridTiles`, and `entityInstances` with `fieldInstances`.
  - Tile instances have `px` (layer pixel coordinates) and `src` (tileset pixel coordinates).
  - — [docs/JSON_DOC.md](https://github.com/deepnight/ldtk/blob/master/docs/JSON_DOC.md) (opened)
- An official JSON Schema exists: "LDtk 1.5.3 JSON schema", draft-07. — [docs/JSON_SCHEMA.json](https://github.com/deepnight/ldtk/blob/master/docs/JSON_SCHEMA.json) (opened)
- **Measured locally:** quicktype 23.3.25 (`quicktype -s schema JSON_SCHEMA.json -l ts --just-types`) produced **1,760 lines and 30 TypeScript interfaces**, including `LayerInstance.intGridCsv`, `autoLayerTiles` and `entityInstances`. json-schema-to-typescript 15 failed on the schema's top-level `$ref` layout.
- The npm `ldtk` package (jprochazk/ldtk-ts) is **0.8.7 from 2021-01-28** and predates LDtk 1.0, so it is stale. — [npm registry ldtk](https://registry.npmjs.org/ldtk) (opened). Per the snippet, LDtk's site recommends a QuickType-generated loader that "is always guaranteed to work with the latest version of LDtk". — [ldtk.io/api](https://ldtk.io/api/) (snippet only)
- Phaser has no LDtk loader (§1). Excalibur has `@excaliburjs/plugin-ldtk` 0.32.1. — [npm](https://registry.npmjs.org/@excaliburjs/plugin-ldtk) (opened)

**Tiled**
- COPYING: Tiled (`src/tiled`) and its plugins are **GPL**. libtiled, libtiled-java, tmxrasterizer, tmxviewer and tmxviewer-java are **BSD 2-clause**; qtpropertybrowser is BSD 3-clause. — [mapeditor/tiled COPYING](https://github.com/mapeditor/tiled/blob/master/COPYING) (opened)
- Releases:
  - **Tiled 1.12.2 (27 May 2026)**; 1.12.1 (25 March 2026).
  - 1.12.0 (13 March 2026) added list custom properties, capsule objects, an "Oblique map orientation", per-object opacity and a Terrain Brush full-tile mode.
  - "Unreleased" work drops Qt 5 and adds `.tmj`/`.tsj` file associations on Linux.
  - — [NEWS.md](https://github.com/mapeditor/tiled/blob/master/NEWS.md) (opened)
- Tiled's support list includes pixi-tiledmap ("A Tiled map runtime for PixiJS v8+, written in TypeScript… export back to Tiled JSON"), Phaser, Excalibur (plugin), melonJS and glazeJS. — [docs/reference/support-for-tmx-maps.rst](https://github.com/mapeditor/tiled/blob/master/docs/reference/support-for-tmx-maps.rst) (opened)
- TypeScript types: pixi-tiledmap ships "comprehensive Tiled types". There are also `@kayahr/tiled` 0.0.1 (2024-01-28; types plus JSON schema) and `tiled-types` 1.3.0 (2021). — [pixi-tiledmap README](https://github.com/riebel/pixi-tiledmap) (opened); [npm @kayahr/tiled](https://registry.npmjs.org/@kayahr/tiled), [npm tiled-types](https://registry.npmjs.org/tiled-types) (opened)
- **Measured locally:** `import { parseMap } from 'pixi-tiledmap'` bundles to 12,254 B minified (**4,383 B gzip**) with no pixi.js code, so it is usable in the sim worker for `.tmj`. TMX needs PixiJS's DOMAdapter (README).

**Sprite editors**
- **Aseprite:**
  - Licence: "Source code and official releases/binaries are distributed under our End-User License Agreement for Aseprite (EULA)". Some modules (laf, clip, undo, observable…) are MIT. Steam releases fall under the Steam Subscriber Agreement.
  - EULA terms: "You may not distribute copies of the SOFTWARE PRODUCT to third parties"; "You may only compile and modify the source code… for your own personal purpose or to propose a contribution". On content: "All title and intellectual property rights in and to the content which may be accessed through use of the SOFTWARE PRODUCT is the property of the respective content owner."
  - The latest tag is v1.3.18.6; its date was not verified.
  - — [aseprite/aseprite README](https://github.com/aseprite/aseprite/blob/main/README.md), [EULA.txt](https://github.com/aseprite/aseprite/blob/main/EULA.txt) (opened)
- **Aseprite CLI:** `--sheet`, `--data`, `--format json-hash|json-array`, `--sheet-type … packed` / `--sheet-pack`, `--split-layers`, `--split-tags`, `--split-grid`, `--tag`, `--list-tags`, `--trim`, `--extrude`, `--shape-padding`, `--border-padding`, `--inner-padding`, `--filename-format`, `--tagname-format`. — [aseprite/docs cli.md](https://github.com/aseprite/docs/blob/main/cli.md) (opened)
- **LibreSprite:** "originated as a fork of Aseprite… Aseprite used to be distributed under the GNU General Public License version 2, but was moved to a proprietary license on August 26th, 2016". It is distributed under GPLv2. The latest tag is v1.3; its date was not verified. — [LibreSprite README](https://github.com/LibreSprite/LibreSprite/blob/master/README.md) (opened)
- **Pixelorama:** MIT licence, "Copyright (c) 2019-present Orama Interactive". **v1.2.3 dated 2026-09-15** (v1.2 on 2026-07-29). — [Pixelorama LICENSE](https://github.com/Orama-Interactive/Pixelorama/blob/master/LICENSE), [CHANGELOG.md](https://github.com/Orama-Interactive/Pixelorama/blob/master/CHANGELOG.md) (opened)
- **Piskel:** Apache License 2.0, with offline builds available. The latest tag is v0.15.0; its date was not verified. — [piskelapp/piskel](https://github.com/piskelapp/piskel) (opened LICENSE/README)

**Atlas packers**
- **free-tex-packer:** "Rotation, trimming, multipacking, various export formats (json, xml, css, pixi.js, godot, phaser, cocos2d)", with web, desktop, CLI and webpack/gulp/grunt plugins. — [odrick/free-tex-packer README](https://github.com/odrick/free-tex-packer) (opened). The core is `free-tex-packer-core` **0.3.9 (2026-07-24), MIT**; its deps are maxrects-packer, jimp, sharp and tinify. — [npm registry](https://registry.npmjs.org/free-tex-packer-core) (opened)
- **TexturePacker:**
  - Pro costs $49.99 as a perpetual licence with 1 year of updates.
  - The free "Essential" licence covers 1 installation and "does not allow use in commercial projects".
  - Exporters for Phaser, PixiJS and MelonJS are in the free version.
  - It has edge extrude, padding, trim and power-of-two options.
  - — [codeandweb store](https://www.codeandweb.com/store/texturepacker-single), [licence comparison](https://www.codeandweb.com/texturepacker/licenses-comparison) (snippet only; site blocked)
- PixiJS consumes TexturePacker-style JSON (`frames` + `animations`) but not Aseprite `frameTags` (§1). Phaser consumes Aseprite JSON natively via `load.aseprite` and `anims.createFromAseprite` (§1).

### Inferences
- **"Same map file" design with LDtk:**
  - Author an IntGrid layer "Ground" with values such as 1 = wall/blocked, 2 = water, 3 = road, 4 = sidewalk, 5 = grass, 6 = door. Auto-layer rules on it produce the visual tiles.
  - Author an Entities layer "Zones" with rectangles such as Home, Shop, Market, PoliceStation, Jail and Bank. Fields carry capacity, owner, opening hours and so on.
  - Add an optional IntGrid "Zoning" layer for per-cell zone ids.
  - The **sim worker** reads only `intGridCsv` and `entityInstances` (the 0.34 KB reader was measured), builds `Uint8Array walkable` and zone tables, and never touches tiles, which keeps it deterministic and independent of the art.
  - The **renderer** reads `autoLayerTiles`/`gridTiles` (`px`, `src`, flip bits `f`) and writes tile ids into the RGBA16UI index texture: ground, detail, "above" from a separate layer, and flags.
  - One file, two consumers, no conversion step needed. A build-time conversion to a compact binary (`town.bin`: three u16 tile layers + u8 walk + zones JSON) is optional and helps cold start.
- **Tiled equivalent:** a dedicated collision tile layer, or per-tile `walkable` properties in the tileset, plus object layers of class `Zone` for zones. The worker uses pixi-tiledmap's `parseMap` on TMJ (4.4 KB) or its own GID decoder: the top bits are flip flags.
- **Licences:** nothing in either editor's licence constrains shipping the map files. The GPL covers the Tiled program, not the user's maps. This is my reading; there is no FAQ quote because mapeditor.org was blocked. The Aseprite EULA explicitly leaves content rights with the content owner.
- **Recommended sprite pipeline:**
  1. Aseprite (or LibreSprite/Pixelorama) with one file per outfit. Each file has tags `walk_down`, `walk_left`, `walk_right` and `walk_up`, each with 3 frames on a 16×32 canvas, which gives a fixed 12-frame layout.
  2. Run `aseprite -b outfit_*.aseprite --sheet chars.png --data chars.json --format json-array --sheet-type rows --list-tags --shape-padding 0`. A grid layout without trimming lets the shader compute UVs arithmetically from `outfitId*12 + dir*3 + frame`, with no frame table. Packing and trimming need a frame-table texture instead.
  3. A small Node build script merges `tiles.png`, `chars.png` and `emotes.png` into one 2048² atlas at fixed origins and emits `atlas.json` with the origins and grid sizes.
  4. If PixiJS or Phaser is ever adopted, export TexturePacker/free-tex-packer "pixi.js" or "phaser" JSON, or use Phaser's Aseprite loader.

### Gaps
- Release dates for LDtk 1.5.3, Aseprite 1.3.18.6, LibreSprite v1.3 and Piskel v0.15.0 were not visible (GitHub release pages and the API were blocked for unattached repos).
- Aseprite's price could not be checked (aseprite.org was blocked).
- LDtk's site text on QuickType is snippet-only. The local quicktype generation succeeded.

## 7. Town size: hand-authored versus procedural, and tile counts for 10k agents

### Takeaway
GBA Pokémon towns are tiny: Emerald towns are **20×20** blocks, and its largest cities **80×40 or 60×60** (≤3,600 tiles). A town that plausibly holds 10k agents is about **256×256 tiles (65,536)**, roughly 18 Sootopolis Cities, and only works with apartment blocks. 25k needs about 384²–512². 100k needs about 1024² (1M tiles). At those sizes the tile-index shader and procedural layout of hand-made prefab blocks are needed. Hand-painting is realistic up to about 256² with LDtk auto-layers.

### Cited Findings
- Pokémon Emerald map layouts, in blocks (metatiles):

  | Map(s) | Size | Blocks |
  |---|---|---:|
  | Sootopolis City | 60×60 | 3,600 |
  | Lilycove, Mossdeep City | 80×40 | 3,200 each |
  | Ever Grande City | 40×80 | 3,200 |
  | Slateport, Rustboro City | 40×60 | 2,400 each |
  | Petalburg City | 30×30 | 900 |
  | Mauville, Fortree City | 40×20 | 800 each |
  | Littleroot, Oldale, Dewford, Lavaridge, Fallarbor, Verdanturf Town | 20×20 | 400 each |

  The file lists 441 layouts. — [pret/pokeemerald `data/layouts/layouts.json`](https://github.com/pret/pokeemerald/blob/master/data/layouts/layouts.json) (opened)
- WaveFunctionCollapse (original, mxgmn) "supports constraints. Therefore, it can be easily combined with other generative algorithms or with manual creation". Its ports list includes Kevin Chapelier's JavaScript port and a TypeScript/WebGL 3D port. — [mxgmn/WaveFunctionCollapse README](https://github.com/mxgmn/WaveFunctionCollapse) (opened)
- The JS port `wavefunctioncollapse` has `OverlappingModel(data, w, h, N, outW, outH, periodicIn, periodicOut, symmetry, ground)` and `SimpleTiledModel(data, subset, w, h, periodic)`. — [kchapelier/wavefunctioncollapse README](https://github.com/kchapelier/wavefunctioncollapse) (opened). On npm it is 2.1.0, last published 2021-03-27, MIT. — [npm registry](https://registry.npmjs.org/wavefunctioncollapse) (opened)
- pixi-tiledmap includes "procedural map tools" and runtime `setTile` (about 10k `setTile` calls per second in its showcase). — [pixi-tiledmap README](https://github.com/riebel/pixi-tiledmap) (opened)
- Tiled 1.12 added a Terrain Brush full-tile mode, and Tiled has terrain/Wang sets. — [Tiled NEWS.md](https://github.com/mapeditor/tiled/blob/master/NEWS.md) (opened). LDtk auto-layer tiles are "generated by Auto-layer rules". — [LDtk JSON_DOC](https://github.com/deepnight/ldtk/blob/master/docs/JSON_DOC.md) (opened)

### Inferences
- **Sizing arithmetic** (assumptions stated; computed):
  - Households: 10k agents at about 3 per household is about 3,300 households. Detached Pokémon-style houses of about 5×4 tiles plus a yard (about 30 tiles) would need about 100k tiles of housing alone, too much for 256². Apartment blocks of about 8×6 tiles with about 20 households (about 2.4 tiles per household) need about 8,000 tiles.
  - Shops and market: a few hundred tiles. Roads and plazas: about 35–40% of the area.
  - Outdoor crowding: if half the agents are outdoors at peak, 5,000 agents on about 26k walkable tiles (40% of 65,536) is about 0.19 agents per walkable tile. That is busy but readable; about 60 agents in a GBA-sized view.
  - So: **10k → 256×256 (4096 px square)**; **25k → about 400×400**; **100k → about 800²–1024²**.
- **Rendering consequences:**
  - The tile-index shader cost is independent of map size: 8 MB of index texture at 1024² (RGBA16UI). It is the only option that scales to 1024²: @pixi/tilemap would need about 210 MB of vertex data per layer, pre-baked textures about 1 GB.
  - Phaser's TilemapGPULayer allows up to 4096² tiles.
- **Authoring strategy:**
  - **Hand-author** a 256² default town in LDtk: an IntGrid painted coarsely, auto-layers for visuals, and entities for zones. This is feasible because the IntGrid is painted at the semantic level.
  - For the 25k/100k tiers, **generate** layouts from a seeded road grid and lots, stamping hand-authored **prefab blocks** (16×16 or 32×32 tiles, made as small LDtk levels: apartment, house row, shop row, market square, police station, jail, park).
  - Use WFC only for decorative filler such as yards and park paths, where contradictions are tolerable. The JS port has not been updated since 2021, and its performance at 256²+ is unverified.
  - Generate in the worker with the sim's seeded RNG, or offline at build time, which is simpler for a static site, so that `seed → identical map`.

### Gaps
- Total Hoenn overworld area and NPC counts per Pokémon town were not computed.
- No benchmark of the JS WFC port at 256² was found or run.
- The density thresholds are judgement calls to be checked with the art.

## 8. Recommendation: renderer per tier, and changes to milestone M0

### Takeaway
**Build a custom WebGL2 `TownRenderer`** and keep PixiJS and Phaser out. It extends the planned `DotRenderer` into one zero-dependency module (prototype 3.6 KB gzip): a tile-index tilemap pass, instanced sprites interpolated and depth-sorted on the GPU, emote and "above" passes, and dot and heatmap LOD. One code path covers every tier: 10k default, 25k phones (render at texel resolution and upscale by an integer), 100k desktop (sprites only when zoomed in). Add a small **Canvas2D fallback** (culled `drawImage` plus a chunk LRU). **M0** should fix the data contracts now: a 32-bit visual word in the snapshot, the LDtk map loaded in the worker, and the integer-zoom DPR camera. It ships the dot and minimap LOD, so the sprite art can land in M1 without protocol changes.

### Cited Findings
- **Main-thread CPU at 10k (measured locally, §2):**

  | Renderer | ms per frame |
  |---|---:|
  | Custom | 0.3 |
  | PixiJS Sprite, sorted | 18.8 |
  | PixiJS ParticleContainer, unsorted | 2.9 |
  | Phaser 4 Sprite, sorted | 17.2 |
  | Canvas2D, culled | 0.4 |

  At 100k: custom 2.3, PixiJS 132–298, Phaser 231, Canvas2D 3.8.
- **Bundle (measured locally, §2):** custom 3.6 KB gzip; PixiJS 106.5–214.6 KB; Phaser 4 272.8–370.8 KB.
- PixiJS iOS multi-tab context-loss issue #12224 is still open. — [pixijs/pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) (opened)
- Phaser's GPU layers need a single texture each, and SpriteGPULayer suits static or tweened content (§1). — [SpriteGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/gameobjects/spritegpulayer/SpriteGPULayer.js), [TilemapGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/tilemaps/TilemapGPULayer.js) (opened)

### Inferences
- **Per-tier plan:**

  | Tier | Plan |
  |---|---|
  | All tiers | Custom WebGL2 TownRenderer, one context (shared with the dot LOD), with the context-loss contract from the previous round. |
  | 10k default | Native-DPR rendering at integer zoom; full sprites at s ≥ 16 CSS px per tile. |
  | 25k phones | Same renderer, rendering the world to an FBO at 1 px per texel with an integer blit (cuts fill by zoom²). Atlas ≤ 2048². Compact visible-instance index lists per tick if vertex-bound. |
  | 100k desktop | Same renderer; sprites only at street zoom (compacting the visible set is recommended); dots at mid zoom; heatmap at whole-city zoom. Consider u16 positions (0.8 MB per tick). |
  | Fallback | Canvas2D: no WebGL2, repeated context loss, or `?canvas`. Tiles via an LRU of about 16 chunk canvases (512×512 px each, about 1 MB, so about 16 MB); agents culled through the worker's spatial grid or a render-side bucket grid; dots via `fillRect` or `ImageData` when zoomed out. Measured 0.4 ms at 10k and 3.8 ms at 100k (street view, culled). |
  | Not recommended | PixiJS v8 (+107–184 KB, sprites are CPU-bound with y-sort, ParticleContainer cannot sort, open iOS issue). Phaser 4 (+273–371 KB, full game framework, SpriteGPULayer unsuited to per-tick motion, TilemapGPULayer empty-cell quirk). |

  Revisit PixiJS only if rich UI-in-canvas (text, filters, hit-testing) becomes a requirement.
- **Estimated size of the production renderer:** the prototype is 178 lines. Production TypeScript would add:
  - types and module structure;
  - ResizeObserver/DPR handling and the integer-zoom camera with pinch/wheel;
  - an LDtk-to-index-texture loader;
  - atlas JSON loading;
  - the FBO and integer-blit path;
  - the heatmap LOD (binning plus ramp shader);
  - a shadow pre-pass;
  - visible-set compaction;
  - golden-image tests (headless Chromium with SwiftShader, as used here) and a perf smoke test.

  Estimate **800–1,200 lines of TS including tests, about 6–10 KB gzip**: one to two developer-weeks.
- **Changes to M0 (proposal):**
  1. **Snapshot v1:** f32 x,y + u32 visual word (layout in §3); render colour comes from the role palette. Document the bits. Make teleport and indoors flags part of the sim contract.
  2. **Map contract:** the worker loads `town.ldtk` (IntGrid → walkability, Entities → zones) through a tiny reader. Generate TS types from the LDtk schema with quicktype at build time. The sim's pathing and zones use this from day one.
  3. **Renderer interface:** generalise `DotRenderer` to `WorldRenderer { init, resize(cssW, cssH, dpr), setMap(mapGpuData), pushSnapshot(view, tick), draw(camera, alpha, timeSec), setLod(policy), dispose }`. M0 implements the dot LOD and the tile-colour minimap (it needs only the map, no art), so the M1 sprite pass drops in.
  4. **Camera:** integer device-pixel zoom steps, device-pixel snapping, and `devicePixelContentBoxSize` with a Safari fallback, from the start.
  5. **Asset build script stub:** Aseprite CLI → `chars.png/json`, tiles and emotes merged into a 2048² atlas. A placeholder atlas (coloured silhouettes, like the benchmark's procedural atlas) unblocks M1.
  6. **CI:** the headless-Chromium golden-image test and a bundle-size budget (for example ≤ 40 KB gzip of libraries in total, against the previous round's ≈34 KB estimate with dots).
- **Risks to track:**
  - Shader portability on old Mali/Adreno (`highp int`, `usampler2D`, `texelFetch` are core WebGL2 but deserve device tests).
  - The depth-test y-sort needs strictly binary-alpha sprites.
  - The SwiftShader-based perf numbers must be re-measured on a mid-range Android phone and an iPhone before the 25k tier is promised.

### Gaps
- There is no on-device validation of any renderer. The 25k phone tier remains an estimate until measured on real hardware.
- The production LOC and effort figures are estimates extrapolated from the prototype.
