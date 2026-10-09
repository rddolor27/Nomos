# M8.3 Country and Region views: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status:** step plan (9 October 2026), expanded from the brief while M8.1's port runs, as the owner asked for the map now. Tasks 1–6 need only M8.1's Task 9, the world-map codes, and can run beside M8.1's ports. Task 10 and later need M8.1's whole `WorldMap` and its map worker. Tasks 16–19, the map crowd, were added the same day at the owner's request.

**Task:** [task.md](task.md)

**Goal:** a Map control, pressed after the town has loaded, opens the world of 3–5 countries as Country and Region views: pixel-art tiles, rivers, roads, sea lanes, bridges, borders with colour bands, icons, labels and a legend, with pan and zoom. From the Region view in, each settlement's look-only crowd walks near home. A flat Countries view draws without the atlas. Nothing of it reaches the town's first load, and a frame takes ≤ 2 ms of main-thread time.

**Architecture:**
- **A renderer of its own.** `@nomos/render-gl/map` holds `MapRenderer`, with its own canvas, its own WebGL2 context and its own Canvas2D fallback. `WorldRenderer` and the renderer chunk stay as they are.
- **Two GL passes a frame.**
  - The base pass is one triangle over the viewport. Each device pixel finds its cell and art pixel, and reads three textures with `texelFetch`: the cell's tile, the overlay of lines, borders and bands, and the atlas page.
  - The icons pass then draws every peak, settlement, wonder and landmark as one instanced draw, in row order.
- **The overlay is built once per view on the CPU.** It holds each art pixel's palette index, at 8 px a cell for the Country view and 16 for the Region view. `overlay.ts` ports `mapdraw.py`'s line drawing, so the views draw what the previews draw.
- **One camera over cells.** Zoom steps along a ladder of device pixels per cell, so every texel lands on whole device pixels. The Country view gives way to the Region view at 16 CSS px a cell, with 15% hysteresis.
- **The page.** Labels and the legend are DOM in `apps/web`'s lazy map view. The view starts the map worker once, keeps its world, and pauses the town while the map shows.

**Tech stack:** TypeScript 6, WebGL2 (GLSL ES 3.00), Canvas2D, Vitest 5, Playwright with SwiftShader Chromium, Vite 8 and size-limit; Python 3.12 or later with Pillow for the atlas page.

**Spec:** [task.md](task.md); [interfaces.md, The map scene](../../m0-pipeline/interfaces.md#the-map-scene-owner-m83) and The world map; `tools/worldgen/mapdraw.py` for what each view draws; R4's world-map notes for label bands; R3's rendering notes for the tile pass.

### Who does what

"Junior" tasks run from this plan alone: type the code given exactly, run the steps, and stop before the commit for the coordinator's check. "Senior" tasks need judgment; the plan gives their design and done-checks.

| Task | What | Who | Needs |
| --- | --- | --- | --- |
| 1 | The map atlas page | Junior, exact code | — |
| 2 | The `./map` export: camera, colours and dependency rules | Junior, exact code | — |
| 3 | Frame names and the atlas page loader | Junior, exact code | 1, 2, M8.1 Task 9 |
| 4 | The overlay: rivers, routes, bridges, borders and bands | Junior, exact code | 2, M8.1 Task 9 |
| 5 | Label placement | Junior, exact code | 2, M8.1 Task 9 |
| 6 | The legend and map input | Junior, exact code | 2, M8.1 Task 9 |
| 7 | The base pass: tiles, flat fills and the overlay | Senior | 3, 4 |
| 8 | The icons pass | Senior | 7 |
| 9 | `MapRenderer`: views, context loss and the Canvas2D fallback | Senior | 8 |
| 10 | The Map control and the lazy map view | Senior | 5, 6, 9, M8.1 Task 30 |
| 11 | Size limits and the first-load check | Junior, exact steps | 10 |
| 12 | The exit tests: tiles complete, labels by band, the town's pause | Junior, exact code | 10, M8.1 Task 29 |
| 13 | The 2 ms bar | Senior | 10 |
| 14 | The colour check, then the Countries golden frame | Senior | 9; the golden frame also 10 and M8.1 Task 29 |
| 16 | The crowd's homes and stops | Junior, exact code | — |
| 17 | The crowd pass | Senior | 9 |
| 18 | The crowd in the map view | Senior | 10, 16, 17, M8.1 Task 30 |
| 19 | The crowd on real worlds, and the owner's screenshots | Junior, exact code | 16, M8.1 Task 29; the screenshots also 18 |
| 15 | Close M8.3 | Senior | 11–14, 16–19 |

### The owner's decisions

- **The five country colours, decided on 9 October 2026.** The owner picked the swatch sheet's suggested five. In colour-index order they are:
  - A, `#42F6FC` cyan;
  - C, `#0000E4` blue;
  - G, `#600090` deep violet;
  - I, `#CC36D8` orchid;
  - K, `#FC66FC` pink-violet.

  Task 2 writes them into `map-colours.json`, the one table that `render-gl` and `mapdraw.py` read. They replace M8.1's provisional five, which failed the palette bar twice: `#AABB00` lies 8.3 from `AUTUMN_L` and `#44BBCC` 12.3 from `WATER_L` (swatch sheet, computed). No test hard-codes a country colour: each reads the table. Task 14 adds the colour check and the golden frame.
- **The 2 ms bar, still open.** Task 13's spec holds it as `MAP_FRAME_MS = 2`, marked proposed. If the owner sets another bar, only that constant changes, and no earlier task waits on it.
- **The map crowd, decided on 9 October 2026.** The owner asked to see each country's people on the map, and chose:
  - **a look-only crowd:** a dot per 100 people, about 10,000 on a large world (computed from `settle`'s population rule: 5,000–16,000). It comes from the seed, with no names, money or sim, so the town's replay never moves;
  - **dots that appear on zoom:** none in the Country view; from the Region view in, growing with zoom until each one can be followed;
  - **random body hues:** sun, lilac, rose, ice, mint and silver. The five country colours still never go on a person;
  - **dots that wander near home,** on their own country's land.

  The page still opens on the town, with the map a click away.

### Global constraints

- **Nothing of the map reaches the first load** (owner, 9 October 2026):
  - the entry, sim worker and renderer chunks keep their bytes;
  - `render-gl/src/map/` imports nothing from `render-gl`'s other folders, and `apps/web/src/map/` takes only types from the town's modules. Dependency-cruiser enforces both from Task 2;
  - every task that changes `apps/web` or `render-gl` ends with Task 11's byte check.
- **Web rules:** whole device-pixel zoom steps, a snapped camera and no CSS scaling; the Canvas2D fallback keeps working; the map's chunks load only when the Map control is pressed.
- **`code.md` and the lints:** concern folders, complexity ≤ 10 and depth ≤ 4, and comments only for a why.
- **Other agents share this tree:**
  - stage with `git add <paths>` and commit with `git commit -- <paths>`, checking `git diff` of every shared file first;
  - never `git add -A`, `git stash`, `git push` or `--no-verify`;
  - commit under `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`, with each body starting `Task: M8.3 Country and Region views, task N: <title>`;
  - a junior stops before its commit step, and the coordinator checks the diff and commits with the message given.
- **Gates before every commit:** `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names`. A browser task adds `pnpm test:browser`, and a Python task its own script.
- **The sim never moves:** `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.

### Rulings (agent, 9 October 2026; the owner can overturn them)

1. **The map has its own renderer.** The brief proposed drawing the map through `WorldRenderer` as a second scene. With 234 B left under the town's stand-in, any change there could cost first-load bytes. So the map gets a renderer of its own, in the lazy chunk, with a canvas and a context of its own. The town's renderer keeps its context while the map shows; the map's renderer frees its own on close.
2. **The camera's ladder** is 8, 16, 32, 48, 64, 96 and 128 device pixels per cell. Every step past 8 is a multiple of 16, so either view draws at a whole scale. The views switch at 16 CSS px a cell, where Region art first shows each art pixel at one CSS pixel or more, with `autoSkin`'s 15% hysteresis.
3. **One overlay texture a view.** Lines, bridges, borders and bands are painted into a byte per art pixel. That is 1.5 MB for the Country view and 6.3 MB for the Region view of a large world (computed), each built and uploaded once, when its view first draws. A device whose textures stop below 3,072 px draws the map in Canvas2D. WebGL2 only promises 2,048 px, though desktop and recent phone GPUs offer 4,096 or more (inference).
4. **The atlas page is a build product,** like the town atlas.
   - `tools/atlas` writes `map.webp`, `map.png` and `map.json` beside it: 81 frames on a 256 × 91 px page, with the WebP at 3,860 bytes (measured here).
   - The app fetches the page when the map opens. Until it arrives, or if it is missing, the flat Countries view draws.
   - Local runs build it with `python tools/atlas/build_atlas.py --out apps/web/dist/atlas` after `pnpm --filter @nomos/web build`, as CI already does.
5. **Colours in one JSON file,** `packages/render-gl/src/map/map-colours.json`. It holds the owner's five country colours and the water and line colours, and `mapdraw.py` reads its country colours from it.
6. **Labels are DOM,** as the brief suggested:
   - a fixed pool of spans, measured once and moved by transforms only when the camera moves;
   - bands follow R4: the Country view labels countries, capitals and cities, and the Region view labels every settlement;
   - a greedy pass in that order drops any label that would overlap one already placed;
   - **colour is never the only cue:** each country's name is written on the map at Country zoom, and the legend names every country beside its swatch.
7. **The Map control mounts from the lazy controls chunk,** as a lil-gui button, so the entry chunk gains no byte.
8. **The town pauses while the map shows,** through `app.setPaused(true)`, and resumes on close only if the map paused it. The town's view and HUD go `inert` under the map, so the HUD's stale Play label is never seen or read. The map section covers both.
9. **One world per page.** The map worker answers once and is then terminated. The map view keeps the `WorldMap` and names for every later opening, since the seed never changes within a page.
10. **The Canvas2D fallback** draws the flat fills, from a one-pixel-per-cell image scaled without smoothing, then the settlement icons and the labels. Borders show as colour edges, as the brief allowed.

### Rulings on the colour check (coordinator, 9 October 2026)

11. **"Families" means colour-wheel hue sectors,** as the swatch sheet reads it. The red–orange and body-hue families are sectors of hue, not single colours.
12. **The pair bar is 12, not the brief's 20.**
    - An exact search found at most four colours in the free hues that keep 20 apart, so five can't.
    - The owner's five keep about 12.0 apart for every viewer: normal, protan, deutan and tritan, simulated with Machado 2009 at full severity (swatch sheet, computed).
    - The palette bar stays 15: each of the five lies at least 15.25 from all 61 palette colours (swatch sheet, computed).
    - **The check uses 11.95** (agent, 9 October 2026), the sheet's 12.0 to one decimal. Blue `#0000E4` and deep violet `#600090` lie 11.96 apart for deutan vision, so a bar of exactly 12 would refuse the owner's picks (computed: Task 14's port matches colorspacious 1.1.2 exactly). The other closest pairs are 12.46 for normal vision, 12.49 for protan and 12.57 for tritan (computed).
13. **Distances use D65 Lab,** as the sheet computes them. A D50-adapted Lab, as CSS `lab()` uses, moves the margins by −2.5 to +0.9 and would drop some below 15, so the check must use the same D65 conversion.

### Files

- `tools/atlas/build_atlas.py` and `test_atlas.py` (Task 1).
- `tools/worldgen/mapdraw.py` and `test_worldgen.py` (Task 2).
- `packages/render-gl/`:
  - `package.json`, gaining the `./map` export;
  - `src/map.ts`, the entry;
  - `src/map/`: `camera.ts`, `colours.ts`, `map-colours.json`, `frames.ts`, `overlay.ts`, `gl.ts`, `base-pass.ts`, `icons.ts`, `canvas2d.ts` and `renderer.ts`;
  - tests in `test/`, and harness hooks in `harness/`.
- `apps/web/`:
  - `src/map/map-view.ts`, `map-input.ts`, `labels.ts`, `legend.ts` and `crowd-motion.ts`;
  - `src/panels/controls.ts`, `vite.config.ts` and `.size-limit.json`;
  - tests in `test/` and `test/browser/`.
- Root: `eslint.config.js` and `.dependency-cruiser.cjs` (Task 2).
- The crowd:
  - `packages/sim-protocol/src/world-map/world-map.ts`, which holds `MapCrowd` (committed in 9f4f9e1);
  - `packages/worldgen/src/crowd/crowd.ts`, with `test/crowd.test.ts` and `test/crowd-sweep.test.ts`;
  - `packages/render-gl/src/map/crowd.ts`.

### Task 1: The map atlas page (junior, exact code)

**Files:** modify `tools/atlas/build_atlas.py`, `tools/atlas/test_atlas.py` and `apps/web/.size-limit.json` (shared).

- [ ] **Step 1: The failing check.** In `tools/atlas/test_atlas.py`:
  - change the import to `from build_atlas import ATLAS_WIDTH, MAP_PAGE_WIDTH, MAP_PREFIXES, MAX_HEIGHT, pack  # noqa: E402`;
  - give `pixel_problems` two parameters: `def pixel_problems(index, expected, out, images=IMAGES, every=SAMPLE_EVERY):`. In its body, `IMAGES` becomes `images`, and `sorted(expected)[::SAMPLE_EVERY]` becomes `sorted(expected)[::every]`;
  - add this function after `built_problems`:

    ```python
    def map_page_problems(out):
        """The map page holds exactly the map-scale frames, within MAP_PAGE_WIDTH, each pixel for pixel."""
        expected = {key: frame for key, frame in manifest_frames().items() if key.startswith(MAP_PREFIXES)}
        index = json.loads((out / 'map.json').read_text(encoding='utf-8'))
        width, height = index['size']
        problems = [f'{key}: in map.json but no map frame' for key in index['frames'] if key not in expected]
        problems += [f'{key}: missing from map.json' for key in expected if key not in index['frames']]
        if width > MAP_PAGE_WIDTH:
            problems.append(f'the map page is {width} px wide, over {MAP_PAGE_WIDTH}')
        if not problems:
            problems = placement_problems(index, expected) + pixel_problems(index, expected, out, ('map.webp', 'map.png'), 1)
        print(f'{len(expected)} map frames on a {width} x {height} page')
        return problems
    ```

  - in `main`, change `problems += built_problems(Path(tmp))` to `problems += built_problems(Path(tmp)) + map_page_problems(Path(tmp))`.
- [ ] **Step 2: Run** `python tools/atlas/test_atlas.py`. Expected: an `ImportError` on `MAP_PAGE_WIDTH`.
- [ ] **Step 3: The page.** In `tools/atlas/build_atlas.py`:
  - add after `GAP = 1`:

    ```python
    # The map scene's own page (M8.3): terrain tiles, wonders and landmarks at both map scales, and the settlement icons,
    # so the map never waits for the whole atlas.
    MAP_PAGE_WIDTH = 256
    MAP_PREFIXES = ('map/map8_', 'map/map16_', 'map/settlement_', 'wonders/map8_', 'wonders/map16_', 'landmarks/map8_',
                    'landmarks/map16_')
    ```

  - give `pack` a `width=ATLAS_WIDTH` parameter and use it in place of `ATLAS_WIDTH` in its body: in both checks and both error messages, as in `f'atlas would be {width} x {height} px, over {MAX_HEIGHT} px tall'`. Its docstring says "into `width` px";
  - make `compose(frames, places, width, height)`, with `Image.new('RGBA', (width, height), (0, 0, 0, 0))`;
  - give `write_atlas` a last parameter, `name='atlas'`, and name its three files `f'{name}.webp'`, `f'{name}.png'` and `f'{name}.json'`;
  - add before `main`:

    ```python
    def build_page(frames, width, out, name):
        places, height = pack({f.key: (f.w, f.h) for f in frames}, width)
        optimised = write_atlas(compose(frames, places, width, height), frames, places, out, name)
        print(f'{name}: {len(frames)} frames packed into {width} x {height} px in {out}')
        for suffix in ('webp', 'png'):
            print(f'{name}.{suffix}: {(out / f"{name}.{suffix}").stat().st_size:,} bytes')
        return optimised
    ```

  - replace `main`'s body after `frames = read_frames()` with:

    ```python
        try:
            optimised = build_page(frames, ATLAS_WIDTH, out, 'atlas')
            build_page([f for f in frames if f.key.startswith(MAP_PREFIXES)], MAP_PAGE_WIDTH, out, 'map')
        except ValueError as error:
            sys.exit(f'atlas: {error}')
        print('the PNGs went through oxipng' if optimised else 'oxipng is not installed: the PNGs are as Pillow wrote them')
    ```

  - add to the module docstring: "It also writes the map scene's page, map.webp, map.png and map.json (M8.3)."
- [ ] **Step 4: Gate the page.** CI builds the atlas into `apps/web/dist/atlas`, and `tools/bench/src/chunks.ts` fails on any WebP without a size-limit entry. So add, after the `Atlas` entry in `apps/web/.size-limit.json`:

  ```json
  {
    "name": "Map atlas page",
    "path": ["dist/atlas/map.webp"],
    "brotli": false,
    "limit": "8 kB"
  }
  ```

- [ ] **Step 5: Run** `python tools/atlas/test_atlas.py`. Expected: `map: 81 frames packed into 256 x 91 px`, `81 map frames on a 256 x 91 page` and `ok`. Then:
  1. `pnpm --filter @nomos/web build`;
  2. `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`;
  3. `pnpm --filter @nomos/web size` passes, with the map page near 3.9 kB;
  4. `node tools/bench/src/chunks.ts` prints `0 ungated chunks`.
- [ ] **Step 6: Commit** `feat(atlas): pack the map scene's own atlas page`, with the three files.

### Task 2: The `./map` export: camera, colours and dependency rules (junior, exact code)

**Files:** modify `packages/render-gl/package.json`, `tools/worldgen/mapdraw.py`, `tools/worldgen/test_worldgen.py`, `eslint.config.js` and `.dependency-cruiser.cjs` (both shared); create `packages/render-gl/src/map.ts`, `src/map/camera.ts`, `src/map/colours.ts`, `src/map/map-colours.json`, `test/map-camera.test.ts` and `test/map-colours.test.ts`.

- [ ] **Step 1: Write the failing tests.** `packages/render-gl/test/map-camera.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { MAP_CELL_PX, cameraDevice, fitMapCamera, mapViewFor, panMapBy, zoomMapAt } from '../src/map.ts';

  describe('the map camera', () => {
    it('fits the largest step that shows every cell, centred', () => {
      expect(fitMapCamera(192, 128, 1600, 1100)).toEqual({ x: -4, y: -4.75, cellPx: 8 });
      expect(fitMapCamera(192, 128, 3200, 2100).cellPx).toBe(16);
      expect(fitMapCamera(192, 128, 800, 600).cellPx).toBe(8);
    });

    it('zooms along the ladder about a point, and stops at its ends', () => {
      expect(zoomMapAt({ x: 10, y: 20, cellPx: 16 }, 1, 320, 160)).toEqual({ x: 20, y: 25, cellPx: 32 });
      expect(zoomMapAt({ x: 10, y: 20, cellPx: 16 }, -5, 0, 0).cellPx).toBe(8);
      expect(zoomMapAt({ x: 0, y: 0, cellPx: 128 }, 3, 0, 0).cellPx).toBe(128);
    });

    it('pans and snaps in device pixels', () => {
      expect(panMapBy({ x: 1, y: 2, cellPx: 32 }, 64, -32)).toEqual({ x: 3, y: 1, cellPx: 32 });
      expect(cameraDevice({ x: 1.26, y: -0.5, cellPx: 16 })).toEqual([20, -8]);
    });

    it('gives way to the Region view at 16 CSS px a cell, with 15% hysteresis', () => {
      expect(mapViewFor('country', 16, 1)).toBe('country');
      expect(mapViewFor('region', 16, 1)).toBe('region');
      expect(mapViewFor('country', 32, 1)).toBe('region');
      expect(mapViewFor('region', 8, 1)).toBe('country');
      expect(mapViewFor('country', 32, 2)).toBe('country');
      expect(mapViewFor('region', 32, 2)).toBe('region');
      expect(mapViewFor('region', 16, 2)).toBe('country');
      expect(mapViewFor('country', 48, 2)).toBe('region');
    });

    it('draws either view at a whole scale on every step', () => {
      for (const cellPx of MAP_CELL_PX) {
        for (const current of ['country', 'region'] as const) {
          for (const dpr of [1, 1.5, 2, 3]) {
            const art = mapViewFor(current, cellPx, dpr) === 'region' ? 16 : 8;
            expect(cellPx % art, `${cellPx} px at dpr ${dpr} from ${current}`).toBe(0);
          }
        }
      }
    });
  });
  ```

  `packages/render-gl/test/map-colours.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { COUNTRY_COLOURS, LINE_COLOURS } from '../src/map.ts';

  describe('the map colours', () => {
    it('holds five distinct country colours, none of them a line colour', () => {
      expect(COUNTRY_COLOURS).toHaveLength(5);
      expect(new Set(COUNTRY_COLOURS).size).toBe(5);
      for (const colour of COUNTRY_COLOURS) expect(Object.values(LINE_COLOURS)).not.toContain(colour);
    });
  });
  ```

  In `tools/worldgen/test_worldgen.py`, add this check and put it in `CHECKS` after `borders_draw_on_cell_edges`:

  ```python
  def map_colours_match_the_palette():
      """map-colours.json, which render-gl's map scene shares, holds the palette's water and line colours."""
      from mapdraw import MAP_COLOURS
      from spritekit import PALETTE
      names = {'water': 'WATER', 'river': 'WATER', 'lane': 'WATER_L', 'road': 'WOOD', 'deck': 'WOOD_L', 'rail': 'WOOD_D',
               'border': 'OUTLINE'}
      wanted = {key: '#' + bytes(PALETTE[name]).hex().upper() for key, name in names.items()}
      return [f'{key} is {MAP_COLOURS[key]}, but the palette gives {colour}' for key, colour in wanted.items()
              if MAP_COLOURS[key] != colour]
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/render-gl/test/map-camera.test.ts packages/render-gl/test/map-colours.test.ts`, and `python tools/worldgen/test_worldgen.py`. Expected: failures, since nothing exists yet.
- [ ] **Step 3: The colours.** `packages/render-gl/src/map/map-colours.json`, holding the owner's five country colours of 9 October 2026, in colour-index order, and `spritekit`'s palette colours for the rest:

  ```json
  {
    "countries": ["#42F6FC", "#0000E4", "#600090", "#CC36D8", "#FC66FC"],
    "water": "#3C7CD0",
    "river": "#3C7CD0",
    "lane": "#7CC4F0",
    "road": "#784C2C",
    "deck": "#A86C3C",
    "rail": "#4C2E1C",
    "border": "#020202"
  }
  ```

  `packages/render-gl/src/map/colours.ts`:

  ```ts
  import table from './map-colours.json';

  // One table with tools/worldgen/mapdraw.py's previews. The country colours are the owner's five (9 October 2026), and
  // map-only: no body, building, soldier or police officer ever wears one (Countries rule 5).
  export const COUNTRY_COLOURS: readonly number[] = table.countries.map(rgbOf);

  export const LINE_COLOURS = {
    water: rgbOf(table.water),
    river: rgbOf(table.river),
    lane: rgbOf(table.lane),
    road: rgbOf(table.road),
    deck: rgbOf(table.deck),
    rail: rgbOf(table.rail),
    border: rgbOf(table.border),
  };

  function rgbOf(hex: string): number {
    return Number.parseInt(hex.slice(1), 16);
  }
  ```

  In `tools/worldgen/mapdraw.py`, add `import json` beside `import sys`, and replace the comment and `COUNTRY_COLOURS` lines with:

  ```python
  ROOT = HERE.parents[1]
  # One table with render-gl's map scene (M8.3). Countries.Country.colour indexes its five country colours, the owner's
  # picks of 9 October 2026, which stay outside the sprite palette.
  MAP_COLOURS = json.loads((ROOT / 'packages' / 'render-gl' / 'src' / 'map' / 'map-colours.json').read_text(encoding='utf-8'))
  COUNTRY_COLOURS = tuple(tuple(int(colour[k:k + 2], 16) for k in (1, 3, 5)) for colour in MAP_COLOURS['countries'])
  ```

- [ ] **Step 4: The camera.** `packages/render-gl/src/map/camera.ts`:

  ```ts
  // x and y are the cell at the view's top-left, fractional; cellPx is whole device pixels per cell, from MAP_CELL_PX.
  export interface MapCamera {
    x: number;
    y: number;
    cellPx: number;
  }

  export type MapView = 'country' | 'region';

  // Every step past the first is a multiple of 16, so both views draw their art at whole scales: the Country view's 8-px
  // tiles at cellPx / 8 and the Region view's 16-px tiles at cellPx / 16.
  export const MAP_CELL_PX: readonly number[] = [8, 16, 32, 48, 64, 96, 128];

  // Region art shows each art pixel at one CSS pixel or more from 16 CSS px a cell. As autoSkin does, a switch needs 15%
  // past that, so a camera resting on the limit never flickers (R4).
  const REGION_ENTER_CSS_PX = 18.4;
  const REGION_STAY_CSS_PX = 13.6;

  export function mapViewFor(current: MapView, cellPx: number, dpr: number): MapView {
    if (cellPx < 16) return 'country';
    const limit = current === 'region' ? REGION_STAY_CSS_PX : REGION_ENTER_CSS_PX;
    return cellPx / dpr >= limit ? 'region' : 'country';
  }

  // The largest step that shows every cell, centred; a view too small for any still gets the smallest.
  export function fitMapCamera(width: number, height: number, deviceWidth: number, deviceHeight: number): MapCamera {
    let cellPx = MAP_CELL_PX[0];
    for (const step of MAP_CELL_PX) {
      if (step * width <= deviceWidth && step * height <= deviceHeight) cellPx = step;
    }
    return { x: (width - deviceWidth / cellPx) / 2, y: (height - deviceHeight / cellPx) / 2, cellPx };
  }

  // Moves steps along MAP_CELL_PX, keeping the cell under the device point where it was.
  export function zoomMapAt(camera: MapCamera, steps: number, deviceX: number, deviceY: number): MapCamera {
    const at = Math.max(0, MAP_CELL_PX.indexOf(camera.cellPx));
    const next = MAP_CELL_PX[Math.min(MAP_CELL_PX.length - 1, Math.max(0, at + steps))];
    const pointX = camera.x + deviceX / camera.cellPx;
    const pointY = camera.y + deviceY / camera.cellPx;
    return { x: pointX - deviceX / next, y: pointY - deviceY / next, cellPx: next };
  }

  // A positive delta moves the view right or down, as the town's panBy does.
  export function panMapBy(camera: MapCamera, dxDevice: number, dyDevice: number): MapCamera {
    return { x: camera.x + dxDevice / camera.cellPx, y: camera.y + dyDevice / camera.cellPx, cellPx: camera.cellPx };
  }

  // The view's top-left in whole device pixels, which every draw snaps to, so each texel lands on whole pixels.
  export function cameraDevice(camera: MapCamera): [number, number] {
    return [Math.round(camera.x * camera.cellPx), Math.round(camera.y * camera.cellPx)];
  }
  ```

  `packages/render-gl/src/map.ts`, the entry; later tasks add a line each:

  ```ts
  export * from './map/camera.ts';
  export * from './map/colours.ts';
  ```

  In `packages/render-gl/package.json`, add `"./map": "./src/map.ts"` to `exports`, after `"."`.
- [ ] **Step 5: The rules.**
  - In `eslint.config.js`, add `'packages/render-gl/src/map.ts',` to `ENTRY_FILES`, after `'packages/sim-core/src/kernels.ts',`.
  - In `.dependency-cruiser.cjs`, add before `no-cycles`:

    ```js
    {
      name: 'map-scene-stands-alone',
      comment:
        "M8.3: the lazy map scene imports nothing from render-gl's town folders, so the renderer chunk never gains an export for it.",
      severity: 'error',
      from: { path: '^packages/render-gl/src/map(\\.ts$|/)' },
      to: { path: '^packages/render-gl/src/', pathNot: '^packages/render-gl/src/map(\\.ts$|/)' },
    },
    {
      name: 'map-view-takes-only-types-from-the-town',
      comment: 'M8.3: the map view reaches the town only through `import type`, so the entry chunk never gains an export for it.',
      severity: 'error',
      from: { path: '^apps/web/src/map/' },
      to: { path: '^apps/web/src/', pathNot: '^apps/web/src/map/' },
    },
    ```

- [ ] **Step 6: Run** the Step 2 commands, then the gates. Expected: all pass. The previews now draw countries in the owner's colours, but no world fingerprint moves, since a country holds only a colour index until it is drawn: `test_worldgen.py`'s pinned fingerprints still pass. Then plant `import '../dots/colour.ts';` at the top of `src/map/camera.ts`, and run `pnpm depcruise`. Expected: one `map-scene-stands-alone` error. Remove the line.
- [ ] **Step 7: Commit** `feat(render-gl): add the map export with its camera and colours`, with every file above.

### Task 3: Frame names and the atlas page loader (junior, exact code)

**Files:** create `packages/render-gl/src/map/frames.ts` and `test/map-frames.test.ts`; modify `src/map.ts`.

- [ ] **Step 1: Write the failing test,** `packages/render-gl/test/map-frames.test.ts`:

  ```ts
  import { readFileSync } from 'node:fs';
  import { BIOME_NAMES, LANDMARK_NAMES, TIER_NAMES, WONDER_NAMES } from '@nomos/sim-protocol/world-map';
  import { describe, expect, it } from 'vitest';
  import { landmarkFrame, peakFrame, settlementFrame, tileFrame, wonderFrame, type MapView } from '../src/map.ts';

  const known = new Set(
    ['map', 'wonders', 'landmarks'].flatMap((sheet) => {
      const manifest = JSON.parse(readFileSync(new URL(`../../../assets/sprites/${sheet}.json`, import.meta.url), 'utf8'));
      return Object.keys(manifest.frames).map((name) => `${sheet}/${name}`);
    }),
  );
  const VIEWS: MapView[] = ['country', 'region'];

  function everyName(): string[] {
    const names = TIER_NAMES.map((_, tier) => settlementFrame(tier));
    for (const view of VIEWS) {
      for (let biome = 0; biome < BIOME_NAMES.length; biome++) {
        for (let variant = 0; variant < 4; variant++) {
          names.push(tileFrame(biome, variant, view));
          names.push(peakFrame(biome, variant, view) ?? tileFrame(biome, variant, view));
        }
      }
      WONDER_NAMES.forEach((_, kind) => names.push(wonderFrame(kind, view)));
      LANDMARK_NAMES.forEach((_, kind) => names.push(landmarkFrame(kind, view)));
    }
    return names;
  }

  describe('the map frames', () => {
    it('names a frame the sprite manifests hold, for every code in both views', () => {
      expect(everyName().filter((name) => !known.has(name))).toEqual([]);
    });

    it('picks tiles and peaks as mapdraw.py does', () => {
      expect(tileFrame(BIOME_NAMES.indexOf('lake'), 3, 'region')).toBe('map/map16_water_0');
      expect(tileFrame(BIOME_NAMES.indexOf('grassland'), 3, 'country')).toBe('map/map8_grassland_1');
      expect(tileFrame(BIOME_NAMES.indexOf('peak'), 0, 'country')).toBe('map/map8_mountain');
      expect(peakFrame(BIOME_NAMES.indexOf('peak'), 0, 'country')).toBe('map/map8_peak');
      expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 2, 'country')).toBeNull();
      expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 2, 'region')).toBe('map/map16_peak-low');
      expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 1, 'region')).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/render-gl/test/map-frames.test.ts`. Expected: fails, since `frames.ts` doesn't exist.
- [ ] **Step 3: Write `packages/render-gl/src/map/frames.ts`:**

  ```ts
  import { BIOME_NAMES, LANDMARK_NAMES, TIER_NAMES, WONDER_NAMES } from '@nomos/sim-protocol/world-map';
  import type { MapView } from './camera.ts';

  export interface AtlasFrame {
    x: number;
    y: number;
    w: number;
    h: number;
    anchor: [number, number];
  }

  // Frames are keyed "<sheet>/<frame>" and found by name, never by atlas index (R9).
  export interface AtlasPage {
    image: ImageBitmap;
    frames: Readonly<Record<string, AtlasFrame>>;
  }

  function artPx(view: MapView): number {
    return view === 'region' ? 16 : 8;
  }

  // mapdraw.py's _tile: both waters draw as water, a peak's cell as mountain under its peak, and grassland and farmland
  // take the variant's bit 0.
  export function tileFrame(biome: number, variant: number, view: MapView): string {
    const name = BIOME_NAMES[biome];
    const px = artPx(view);
    if (name === 'ocean' || name === 'lake') return `map/map${px}_water_0`;
    if (name === 'peak') return `map/map${px}_mountain`;
    if (name === 'grassland' || name === 'farmland') return `map/map${px}_${name}_${variant & 1}`;
    return `map/map${px}_${name}`;
  }

  // mapdraw.py's _overlays: every peak rises over its tile, and in the Region view a low peak rises over each mountain
  // whose variant has bit 1.
  export function peakFrame(biome: number, variant: number, view: MapView): string | null {
    const name = BIOME_NAMES[biome];
    if (name === 'peak') return `map/map${artPx(view)}_peak`;
    return name === 'mountain' && view === 'region' && (variant & 2) !== 0 ? 'map/map16_peak-low' : null;
  }

  export function settlementFrame(tier: number): string {
    return `map/settlement_${TIER_NAMES[tier]}`;
  }

  export function wonderFrame(kind: number, view: MapView): string {
    return `wonders/map${artPx(view)}_wonder_${WONDER_NAMES[kind]}`;
  }

  export function landmarkFrame(kind: number, view: MapView): string {
    return `landmarks/map${artPx(view)}_landmark_${LANDMARK_NAMES[kind]}`;
  }

  async function fetchOk(url: string): Promise<Response> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response;
  }

  // The page tools/atlas writes beside the town atlas: map.json holds the frame table and map.webp the pixels.
  export async function loadAtlasPage(jsonUrl: string, imageUrl: string): Promise<AtlasPage> {
    const [index, pixels] = await Promise.all([
      fetchOk(jsonUrl).then((response) => response.json() as Promise<{ frames: Record<string, AtlasFrame> }>),
      fetchOk(imageUrl).then((response) => response.blob()),
    ]);
    return { image: await createImageBitmap(pixels), frames: index.frames };
  }
  ```

  Add `export * from './map/frames.ts';` to `src/map.ts`.
- [ ] **Step 4: Run** the Step 2 command, then the gates. Expected: all pass. `loadAtlasPage` is proved in a browser by Task 10.
- [ ] **Step 5: Commit** `feat(render-gl): name the map's frames and load its atlas page`.

### Task 4: The overlay: rivers, routes, bridges, borders and bands (junior, exact code)

**Files:** create `packages/render-gl/src/map/overlay.ts`, `test/tiny-world.ts` and `test/map-overlay.test.ts`; modify `src/map.ts`.

The overlay ports `mapdraw.py`'s `_rivers`, `_routes`, `_dots`, `_bridges`, `_edges`, `_strip` and `_borders` to one byte per art pixel. It draws in their order, so later marks cover earlier ones. Rivers step as `_dots` does rather than as Pillow's wide lines, since no golden ties the two. This code was run against the expected pixels below (measured here).

- [ ] **Step 1: A world for tests,** `packages/render-gl/test/tiny-world.ts`, which Tasks 5, 6 and 12 reuse:

  ```ts
  import type { WorldMap } from '@nomos/sim-protocol/world-map';

  // A grassland world of one country, with nothing on it; a test patches in what it needs.
  export function tinyWorld(width: number, height: number, patch: Partial<WorldMap> = {}): WorldMap {
    const cells = width * height;
    const none = (): WorldMap['roads'] => ({ offsets: new Int32Array([0]), cells: new Int32Array(0) });
    return {
      version: 1,
      seed: 1,
      width,
      height,
      template: 0,
      wind: 0,
      cold: 0,
      elevation: new Int16Array(cells).fill(100),
      biome: new Uint8Array(cells).fill(2),
      temperature: new Uint8Array(cells).fill(120),
      moisture: new Uint8Array(cells).fill(120),
      river: new Uint8Array(cells),
      receiver: new Int32Array(cells).fill(-1),
      coast: new Uint8Array(cells),
      variant: new Uint8Array(cells),
      country: new Uint8Array(cells).fill(1),
      region: new Uint16Array(cells).fill(1),
      market: new Uint16Array(cells).fill(1),
      settlements: {
        cell: new Int32Array(0),
        tier: new Uint8Array(0),
        population: new Int32Array(0),
        country: new Uint8Array(0),
        region: new Uint16Array(0),
        landmarks: new Uint8Array(0),
      },
      countries: { capital: new Int32Array([0]), colour: new Uint8Array([0]) },
      regions: { seat: new Int32Array([0]), country: new Uint8Array([1]) },
      roads: none(),
      lanes: none(),
      bridges: new Int32Array(0),
      wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
      landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
      ...patch,
    };
  }
  ```

- [ ] **Step 2: Write the failing test,** `packages/render-gl/test/map-overlay.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { BAND, BORDER, DECK, RAIL, RIVER, ROAD, buildOverlay, type Overlay } from '../src/map.ts';
  import { tinyWorld } from './tiny-world.ts';

  function row(o: Overlay, y: number, x0: number, x1: number): number[] {
    return [...o.pixels.subarray(y * o.width + x0, y * o.width + x1 + 1)];
  }

  function column(o: Overlay, x: number, y0: number, y1: number): number[] {
    const out: number[] = [];
    for (let y = y0; y <= y1; y++) out.push(o.pixels[y * o.width + x]);
    return out;
  }

  const TWO = { country: new Uint8Array([1, 2]), countries: { capital: new Int32Array([0, 1]), colour: new Uint8Array([0, 1]) } };
  const FLOW = { river: new Uint8Array([1, 0, 0]), receiver: new Int32Array([1, -1, -1]) };
  const ROAD_0_1 = { roads: { offsets: new Int32Array([0, 2]), cells: new Int32Array([0, 1]) } };
  const BRIDGED = { roads: { offsets: new Int32Array([0, 3]), cells: new Int32Array([0, 1, 2]) }, bridges: new Int32Array([1]) };

  describe('the map overlay', () => {
    it("draws borders on cell edges, as test_worldgen.py checks the previews'", () => {
      const narrow = buildOverlay(tinyWorld(2, 1, TWO), 'country');
      for (let y = 0; y < 8; y++) expect(row(narrow, y, 5, 9)).toEqual([0, BAND, BORDER, BAND + 1, 0]);
      const wide = buildOverlay(tinyWorld(2, 1, TWO), 'region');
      for (let y = 0; y < 16; y++) expect(row(wide, y, 12, 19)).toEqual([0, BAND, BAND, BORDER, BORDER, BAND + 1, BAND + 1, 0]);
      const stacked = buildOverlay(tinyWorld(1, 2, TWO), 'country');
      for (let x = 0; x < 8; x++) expect(column(stacked, x, 5, 9)).toEqual([0, BAND, BORDER, BAND + 1, 0]);
      const coast = buildOverlay(tinyWorld(3, 1, { ...TWO, country: new Uint8Array([1, 0, 2]) }), 'country');
      expect(coast.pixels.every((value) => value === 0)).toBe(true);
    });

    it('draws a river from centre to centre, a pixel wider at size 3', () => {
      const thin = buildOverlay(tinyWorld(3, 1, FLOW), 'country');
      expect(row(thin, 4, 3, 13)).toEqual([0, ...Array<number>(9).fill(RIVER), 0]);
      expect(thin.pixels.filter((value) => value === RIVER)).toHaveLength(9);
      const broad = buildOverlay(tinyWorld(3, 1, { ...FLOW, river: new Uint8Array([3, 0, 0]) }), 'region');
      expect(row(broad, 8, 7, 27)).toEqual([0, ...Array<number>(19).fill(RIVER), 0]);
      expect(broad.pixels.filter((value) => value === RIVER)).toHaveLength(57);
    });

    it('dashes roads, and draws them over sea lanes', () => {
      const dotted = [ROAD, 0, ROAD, 0, ROAD, 0, ROAD, 0, ROAD];
      expect(row(buildOverlay(tinyWorld(2, 1, ROAD_0_1), 'country'), 4, 4, 12)).toEqual(dotted);
      const both = { ...ROAD_0_1, lanes: ROAD_0_1.roads };
      expect(row(buildOverlay(tinyWorld(2, 1, both), 'country'), 4, 4, 12)).toEqual(dotted);
      const region = row(buildOverlay(tinyWorld(2, 1, ROAD_0_1), 'region'), 8, 7, 26);
      expect(region).toEqual([0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 0].map((v) => (v ? ROAD : 0)));
    });

    it('lays a bridge deck along its road, with a rail round it', () => {
      const level = buildOverlay(tinyWorld(3, 1, BRIDGED), 'country');
      expect(row(level, 3, 10, 13)).toEqual([RAIL, RAIL, RAIL, RAIL]);
      expect(row(level, 4, 10, 13)).toEqual([RAIL, DECK, DECK, RAIL]);
      expect(row(level, 5, 10, 13)).toEqual([RAIL, RAIL, RAIL, RAIL]);
      const upright = buildOverlay(tinyWorld(1, 3, BRIDGED), 'country');
      expect(column(upright, 4, 10, 13)).toEqual([RAIL, DECK, DECK, RAIL]);
      expect(row(upright, 10, 3, 5)).toEqual([RAIL, RAIL, RAIL]);
    });
  });
  ```

- [ ] **Step 3: Run** `pnpm exec vitest run packages/render-gl/test/map-overlay.test.ts`. Expected: fails, since `overlay.ts` doesn't exist.
- [ ] **Step 4: Write `packages/render-gl/src/map/overlay.ts`:**

  ```ts
  import { BIOME_NAMES, type PathTable, type WorldMap } from '@nomos/sim-protocol/world-map';
  import type { MapView } from './camera.ts';

  // Palette indices, in mapdraw.py's drawing order; 0 is none. Country colour c's band is BAND + c. The flat Countries
  // view hides RIVER to RAIL, as countries.png draws neither water nor routes over its fills.
  export const RIVER = 1;
  export const LANE = 2;
  export const ROAD = 3;
  export const DECK = 4;
  export const RAIL = 5;
  export const BORDER = 6;
  export const BAND = 7;

  // One view's overlay in art pixels: 8 a cell in the Country view and 16 in the Region view.
  export interface Overlay {
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8Array;
  }

  const LAKE = BIOME_NAMES.indexOf('lake');

  // mapdraw.py's sizes in each view: the river's width, the routes' dash, gap and thickness, the bridge deck along and
  // across its road, and the border's line and bands.
  const MARKS = {
    country: { tilePx: 8, river: 1, dash: 1, gap: 1, thick: 1, along: 4, across: 3, line: 1, band: 1 },
    region: { tilePx: 16, river: 2, dash: 2, gap: 2, thick: 2, along: 8, across: 5, line: 2, band: 2 },
  } as const;

  type Marks = (typeof MARKS)[MapView];

  interface Pen {
    readonly map: WorldMap;
    readonly marks: Marks;
    readonly out: Overlay;
  }

  function fill(pen: Pen, x0: number, y0: number, x1: number, y1: number, value: number): void {
    const { width, height, pixels } = pen.out;
    for (let y = Math.max(0, y0); y <= Math.min(height - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(width - 1, x1); x++) pixels[y * width + x] = value;
    }
  }

  function centre(pen: Pen, cell: number): [number, number] {
    const { tilePx } = pen.marks;
    const x = cell % pen.map.width;
    return [x * tilePx + (tilePx >> 1), ((cell - x) / pen.map.width) * tilePx + (tilePx >> 1)];
  }

  // mapdraw.py's _dots: a size-px square at each step from centre to centre, kept where k % period < dash. A river is
  // dash 1 of period 1: every step.
  function stroke(pen: Pen, a: number, b: number, size: number, dash: number, period: number, value: number): void {
    const [ax, ay] = centre(pen, a);
    const [bx, by] = centre(pen, b);
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= steps; k++) {
      if (k % period >= dash) continue;
      const x = ax + Math.floor(((bx - ax) * k) / steps);
      const y = ay + Math.floor(((by - ay) * k) / steps);
      fill(pen, x, y, x + size - 1, y + size - 1, value);
    }
  }

  // mapdraw.py's _rivers: each river cell to its receiver, and a lake to a river it feeds; size-3 rivers a pixel wider.
  function drawRivers(pen: Pen): void {
    const { river, receiver, biome } = pen.map;
    for (let cell = 0; cell < receiver.length; cell++) {
      const to = receiver[cell];
      if (to < 0 || !(river[cell] || (biome[cell] === LAKE && river[to]))) continue;
      stroke(pen, cell, to, pen.marks.river + Number(river[cell] === 3), 1, 1, RIVER);
    }
  }

  function drawRoutes(pen: Pen, table: PathTable, value: number): void {
    const { thick, dash, gap } = pen.marks;
    for (let p = 0; p + 1 < table.offsets.length; p++) {
      for (let k = table.offsets[p]; k + 1 < table.offsets[p + 1]; k++) {
        stroke(pen, table.cells[k], table.cells[k + 1], thick, dash, dash + gap, value);
      }
    }
  }

  // mapdraw.py's _bridges: a road runs flat at a cell when, at the cell's first visit, its neighbours along the road lie
  // further apart across than down.
  function flatRoads(map: WorldMap): Map<number, boolean> {
    const { offsets, cells } = map.roads;
    const flat = new Map<number, boolean>();
    for (let p = 0; p + 1 < offsets.length; p++) {
      const first = offsets[p];
      const last = offsets[p + 1] - 1;
      for (let k = first; k <= last; k++) {
        if (flat.has(cells[k])) continue;
        const a = cells[Math.max(first, k - 1)];
        const b = cells[Math.min(last, k + 1)];
        const across = Math.abs((b % map.width) - (a % map.width));
        flat.set(cells[k], across >= Math.abs(Math.floor(b / map.width) - Math.floor(a / map.width)));
      }
    }
    return flat;
  }

  // A deck laid along its road, with a rail round its edge.
  function drawBridges(pen: Pen): void {
    const flat = flatRoads(pen.map);
    const { along, across } = pen.marks;
    for (const cell of pen.map.bridges) {
      const [x, y] = centre(pen, cell);
      const [dx, dy] = flat.get(cell) ? [along, across] : [across, along];
      const x0 = x - (dx >> 1);
      const y0 = y - (dy >> 1);
      const x1 = x + ((dx - 1) >> 1);
      const y1 = y + ((dy - 1) >> 1);
      fill(pen, x0, y0, x1, y1, RAIL);
      fill(pen, x0 + 1, y0 + 1, x1 - 1, y1 - 1, DECK);
    }
  }

  // mapdraw.py's _strip: width px across, from start px past the edge east of the cell (vertical) or south of it.
  function strip(pen: Pen, cell: number, vertical: boolean, start: number, width: number, value: number): void {
    const { tilePx } = pen.marks;
    const x = (cell % pen.map.width) * tilePx;
    const y = Math.floor(cell / pen.map.width) * tilePx;
    if (vertical) fill(pen, x + tilePx + start, y, x + tilePx + start + width - 1, y + tilePx - 1, value);
    else fill(pen, x, y + tilePx + start, x + tilePx - 1, y + tilePx + start + width - 1, value);
  }

  // mapdraw.py's _edges: [cell, neighbour, vertical] for each land edge between two countries, looking east and south.
  function borderEdges(map: WorldMap): [number, number, boolean][] {
    const { width, height, country } = map;
    const out: [number, number, boolean][] = [];
    for (let cell = 0; cell < country.length; cell++) {
      const k = country[cell];
      if (k === 0) continue;
      const east = country[cell + 1];
      if ((cell % width) + 1 < width && east !== 0 && east !== k) out.push([cell, cell + 1, true]);
      const south = country[cell + width];
      if (Math.floor(cell / width) + 1 < height && south !== 0 && south !== k) out.push([cell, cell + width, false]);
    }
    return out;
  }

  // mapdraw.py's _borders: a band of each side's colour, then a neutral line over every edge, so lines run unbroken
  // over the corners.
  function drawBorders(pen: Pen): void {
    const { line, band } = pen.marks;
    const { country, countries } = pen.map;
    const bandOf = (cell: number): number => BAND + countries.colour[country[cell] - 1];
    const edges = borderEdges(pen.map);
    const near = -((line + 1) >> 1);
    for (const [cell, other, vertical] of edges) {
      strip(pen, cell, vertical, near - band, band, bandOf(cell));
      strip(pen, cell, vertical, line >> 1, band, bandOf(other));
    }
    for (const [cell, , vertical] of edges) strip(pen, cell, vertical, near, line, BORDER);
  }

  export function buildOverlay(map: WorldMap, view: MapView): Overlay {
    const marks = MARKS[view];
    const width = map.width * marks.tilePx;
    const height = map.height * marks.tilePx;
    const pen: Pen = { map, marks, out: { width, height, pixels: new Uint8Array(width * height) } };
    drawRivers(pen);
    drawRoutes(pen, map.lanes, LANE);
    drawRoutes(pen, map.roads, ROAD);
    drawBridges(pen);
    drawBorders(pen);
    return pen.out;
  }
  ```

  Add `export * from './map/overlay.ts';` to `src/map.ts`.
- [ ] **Step 5: Run** the Step 3 command, then the gates. Expected: all pass.
- [ ] **Step 6: Commit** `feat(render-gl): paint the map's lines and borders into an overlay`.

### Task 5: Label placement (junior, exact code)

**Files:** create `apps/web/src/map/labels.ts` and `apps/web/test/map-labels.test.ts`.

Labels are DOM, so only their placement runs in Node. Task 10 mounts them, and Task 12 checks them in a browser. The placement was run against the test below (measured here).

- [ ] **Step 1: Write the failing test,** `apps/web/test/map-labels.test.ts`. A 10 × 10 world has country 1 west of x 5 and country 2 east of it, a capital at (2, 2), a city at (7, 2), a village at (3, 2) and a hamlet at (7, 7):

  ```ts
  import { describe, expect, it } from 'vitest';
  import { tinyWorld } from '../../../packages/render-gl/test/tiny-world.ts';
  import { labelSet, placeLabels } from '../src/map/labels.ts';

  function twoCountries(): ReturnType<typeof tinyWorld> {
    const country = new Uint8Array(100).map((_, cell) => (cell % 10 < 5 ? 1 : 2));
    return tinyWorld(10, 10, {
      country,
      countries: { capital: new Int32Array([0, 1]), colour: new Uint8Array([0, 1]) },
      settlements: {
        cell: new Int32Array([22, 27, 23, 77]),
        tier: new Uint8Array([0, 1, 3, 4]),
        population: new Int32Array([90_000, 60_000, 900, 100]),
        country: new Uint8Array([1, 2, 1, 2]),
        region: new Uint16Array(4),
        landmarks: new Uint8Array(12).fill(255),
      },
    });
  }

  describe('label placement', () => {
    const set = labelSet(twoCountries());
    set.width.fill(40);
    set.height.fill(12);
    const x = new Float64Array(set.count);
    const y = new Float64Array(set.count);

    it('takes countries first, then settlements by tier and id', () => {
      expect([...set.name]).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('labels countries, capitals and cities in the Country view', () => {
      expect(placeLabels(set, 'country', { x: 0, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(4);
      expect([...x]).toEqual([20, 100, 20, 100, Number.NaN, Number.NaN]);
      expect([...y]).toEqual([74, 74, 48, 48, Number.NaN, Number.NaN]);
    });

    it('labels every settlement in the Region view, dropping one that would overlap', () => {
      expect(placeLabels(set, 'region', { x: 0, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(3);
      expect([...x]).toEqual([Number.NaN, Number.NaN, 20, 100, Number.NaN, 100]);
      expect([...y]).toEqual([Number.NaN, Number.NaN, 48, 48, Number.NaN, 128]);
    });

    it('hides labels off the view', () => {
      expect(placeLabels(set, 'region', { x: 20, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/map-labels.test.ts`. Expected: fails, since `labels.ts` doesn't exist.
- [ ] **Step 3: Write `apps/web/src/map/labels.ts`:**

  ```ts
  import type { MapCamera, MapView } from '@nomos/render-gl/map';
  import { TIER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';

  const CITY = TIER_NAMES.indexOf('city');

  // Every candidate label in R4's priority order: the countries, then settlements by tier and then id. name indexes
  // placeNames' list; anchors are in cells; width and height are CSS px, measured once by mountLabels.
  export interface LabelSet {
    readonly count: number;
    readonly name: Int32Array;
    readonly anchorX: Float64Array;
    readonly anchorY: Float64Array;
    // 1 for a country's name, centred on its land; 0 for a settlement's, hung below its cell.
    readonly centred: Uint8Array;
    readonly inCountry: Uint8Array;
    readonly inRegion: Uint8Array;
    readonly width: Float64Array;
    readonly height: Float64Array;
    // The boxes a pass has placed, four numbers each, so a pass allocates nothing.
    readonly placed: Float64Array;
  }

  export interface Labels {
    update(camera: MapCamera, view: MapView, cssWidth: number, cssHeight: number, dpr: number): void;
  }

  function emptySet(count: number): LabelSet {
    return {
      count,
      name: new Int32Array(count),
      anchorX: new Float64Array(count),
      anchorY: new Float64Array(count),
      centred: new Uint8Array(count),
      inCountry: new Uint8Array(count),
      inRegion: new Uint8Array(count),
      width: new Float64Array(count),
      height: new Float64Array(count),
      placed: new Float64Array(4 * count),
    };
  }

  // A country's name sits at the mean of its land cells' centres.
  function addCountries(set: LabelSet, map: WorldMap): void {
    const countries = map.countries.capital.length;
    const sumX = new Float64Array(countries + 1);
    const sumY = new Float64Array(countries + 1);
    const cells = new Float64Array(countries + 1);
    for (let cell = 0; cell < map.country.length; cell++) {
      const k = map.country[cell];
      if (k === 0) continue;
      sumX[k] += (cell % map.width) + 0.5;
      sumY[k] += Math.floor(cell / map.width) + 0.5;
      cells[k]++;
    }
    for (let k = 1; k <= countries; k++) {
      set.name[k - 1] = k - 1;
      set.anchorX[k - 1] = sumX[k] / cells[k];
      set.anchorY[k - 1] = sumY[k] / cells[k];
      set.centred[k - 1] = 1;
      set.inCountry[k - 1] = 1;
    }
  }

  function addSettlements(set: LabelSet, map: WorldMap): void {
    const { cell, tier } = map.settlements;
    const countries = map.countries.capital.length;
    const order = Array.from(tier, (_, id) => id).sort((a, b) => tier[a] - tier[b] || a - b);
    order.forEach((id, rank) => {
      const i = countries + rank;
      set.name[i] = countries + id;
      set.anchorX[i] = (cell[id] % map.width) + 0.5;
      set.anchorY[i] = Math.floor(cell[id] / map.width) + 1;
      set.inCountry[i] = tier[id] <= CITY ? 1 : 0;
      set.inRegion[i] = 1;
    });
  }

  export function labelSet(map: WorldMap): LabelSet {
    const set = emptySet(map.countries.capital.length + map.settlements.tier.length);
    addCountries(set, map);
    addSettlements(set, map);
    return set;
  }

  function overlaps(boxes: Float64Array, count: number, left: number, top: number, right: number, bottom: number): boolean {
    for (let b = 0; b < count; b++) {
      const at = 4 * b;
      if (left < boxes[at + 2] && boxes[at] < right && top < boxes[at + 3] && boxes[at + 1] < bottom) return true;
    }
    return false;
  }

  // Writes each label's top-left in whole CSS px into x and y, or NaN when it hides, and returns how many show. Labels go
  // in priority order, and one is dropped when it would overlap a label already placed.
  export function placeLabels(
    set: LabelSet,
    view: MapView,
    camera: MapCamera,
    dpr: number,
    cssWidth: number,
    cssHeight: number,
    x: Float64Array,
    y: Float64Array,
  ): number {
    const cssPerCell = camera.cellPx / dpr;
    const shown = view === 'country' ? set.inCountry : set.inRegion;
    let placed = 0;
    for (let i = 0; i < set.count; i++) {
      x[i] = Number.NaN;
      y[i] = Number.NaN;
      if (!shown[i]) continue;
      const left = Math.round((set.anchorX[i] - camera.x) * cssPerCell - set.width[i] / 2);
      const top = Math.round((set.anchorY[i] - camera.y) * cssPerCell - (set.centred[i] ? set.height[i] / 2 : 0));
      const right = left + set.width[i];
      const bottom = top + set.height[i];
      if (right <= 0 || bottom <= 0 || left >= cssWidth || top >= cssHeight) continue;
      if (overlaps(set.placed, placed, left, top, right, bottom)) continue;
      set.placed[4 * placed] = left;
      set.placed[4 * placed + 1] = top;
      set.placed[4 * placed + 2] = right;
      set.placed[4 * placed + 3] = bottom;
      x[i] = left;
      y[i] = top;
      placed++;
    }
    return placed;
  }

  function moveLabel(span: HTMLSpanElement, i: number, x: number, y: number, shown: Float64Array): void {
    if (Number.isNaN(x)) {
      if (!Number.isNaN(shown[2 * i])) span.style.visibility = 'hidden';
      shown[2 * i] = Number.NaN;
      return;
    }
    if (x === shown[2 * i] && y === shown[2 * i + 1]) return;
    if (Number.isNaN(shown[2 * i])) span.style.visibility = 'visible';
    span.style.transform = `translate(${x}px, ${y}px)`;
    shown[2 * i] = x;
    shown[2 * i + 1] = y;
  }

  // One span per candidate, measured once while the map shows; a span's style is written only when its place changes.
  export function mountLabels(layer: HTMLElement, map: WorldMap, names: readonly string[]): Labels {
    const set = labelSet(map);
    const spans: HTMLSpanElement[] = [];
    for (let i = 0; i < set.count; i++) {
      const span = layer.ownerDocument.createElement('span');
      span.className = set.centred[i] ? 'map-label map-country' : 'map-label';
      span.textContent = names[set.name[i]];
      span.style.visibility = 'hidden';
      spans.push(span);
    }
    layer.replaceChildren(...spans);
    spans.forEach((span, i) => {
      set.width[i] = span.offsetWidth;
      set.height[i] = span.offsetHeight;
    });
    const x = new Float64Array(set.count);
    const y = new Float64Array(set.count);
    const shown = new Float64Array(2 * set.count).fill(Number.NaN);
    return {
      update(camera, view, cssWidth, cssHeight, dpr) {
        placeLabels(set, view, camera, dpr, cssWidth, cssHeight, x, y);
        for (let i = 0; i < set.count; i++) moveLabel(spans[i], i, x[i], y[i], shown);
      },
    };
  }
  ```

- [ ] **Step 4: Run** the Step 2 command, then the gates. Expected: all pass.
- [ ] **Step 5: Commit** `feat(web): place the map's labels by band without overlaps`.

### Task 6: The legend and map input (junior, exact code)

**Files:** create `apps/web/src/map/legend.ts`, `apps/web/src/map/map-input.ts` and `apps/web/test/map-legend.test.ts`.

- [ ] **Step 1: Write the failing test,** `apps/web/test/map-legend.test.ts`. The names are `placeNames`' stand-ins, which pass the name lint:

  ```ts
  import { COUNTRY_COLOURS } from '@nomos/render-gl/map';
  import { describe, expect, it } from 'vitest';
  import { tinyWorld } from '../../../packages/render-gl/test/tiny-world.ts';
  import { legendRows } from '../src/map/legend.ts';

  describe('the map legend', () => {
    it("lists each country's colour, name, capital and settlement count", () => {
      const map = tinyWorld(4, 1, {
        country: new Uint8Array([1, 1, 2, 2]),
        countries: { capital: new Int32Array([1, 0]), colour: new Uint8Array([3, 0]) },
        settlements: {
          cell: new Int32Array([2, 0, 1]),
          tier: new Uint8Array([0, 0, 3]),
          population: new Int32Array([90_000, 60_000, 900]),
          country: new Uint8Array([2, 1, 1]),
          region: new Uint16Array(3),
          landmarks: new Uint8Array(9).fill(255),
        },
      });
      const names = ['country-1', 'country-2', 'capital-0', 'capital-1', 'village-2'];
      expect(legendRows(map, names)).toEqual([
        { name: 'country-1', colour: COUNTRY_COLOURS[3], capital: 'capital-1', settlements: 2 },
        { name: 'country-2', colour: COUNTRY_COLOURS[0], capital: 'capital-0', settlements: 1 },
      ]);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/map-legend.test.ts`. Expected: fails, since `legend.ts` doesn't exist.
- [ ] **Step 3: Write `apps/web/src/map/legend.ts`:**

  ```ts
  import { COUNTRY_COLOURS } from '@nomos/render-gl/map';
  import type { WorldMap } from '@nomos/sim-protocol/world-map';

  export interface LegendRow {
    name: string;
    colour: number;
    capital: string;
    settlements: number;
  }

  // names is placeNames' list: the countries, then the settlements in id order.
  export function legendRows(map: WorldMap, names: readonly string[]): LegendRow[] {
    const countries = map.countries.capital.length;
    const held = new Int32Array(countries + 1);
    for (const k of map.settlements.country) held[k]++;
    const rows: LegendRow[] = [];
    for (let k = 1; k <= countries; k++) {
      rows.push({
        name: names[k - 1],
        colour: COUNTRY_COLOURS[map.countries.colour[k - 1]],
        capital: names[countries + map.countries.capital[k - 1]],
        settlements: held[k],
      });
    }
    return rows;
  }

  // The map's text alternative too: a screen reader hears each country with its capital and count.
  export function mountLegend(root: HTMLElement, rows: readonly LegendRow[]): void {
    const doc = root.ownerDocument;
    const list = doc.createElement('ul');
    list.className = 'map-legend';
    for (const row of rows) {
      const swatch = doc.createElement('span');
      swatch.className = 'map-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = `#${row.colour.toString(16).padStart(6, '0')}`;
      const item = doc.createElement('li');
      item.append(swatch, `${row.name}: capital ${row.capital}, ${row.settlements} settlements`);
      list.append(item);
    }
    root.replaceChildren(list);
  }
  ```

- [ ] **Step 4: Write `apps/web/src/map/map-input.ts`.** It has no Node test; Task 12 drives it in a browser.

  ```ts
  import { panMapBy, zoomMapAt, type MapCamera } from '@nomos/render-gl/map';

  export interface MapInputTarget {
    camera(): MapCamera;
    setCamera(camera: MapCamera): void;
    fit(): void;
    close(): void;
  }

  // An arrow press moves four cells, so a large world takes about 50 presses to cross.
  const PAN_CELLS = 4;
  // As the town's input: a mouse notch is 100 px in Chromium and 3 lines in Firefox, and a trackpad sends many small
  // deltas, so the wheel steps once per 40 px gathered in one gesture, a gesture being deltas under 250 ms apart.
  const WHEEL_STEP_PX = 40;
  const WHEEL_GESTURE_MS = 250;
  const WHEEL_UNIT_PX = [1, 16, 400];
  // Two pointers step the zoom whenever they spread or close by a quarter.
  const PINCH_STEP = 1.25;
  const PAN_KEYS = new Map<string, [number, number]>([
    ['ArrowLeft', [-1, 0]],
    ['ArrowRight', [1, 0]],
    ['ArrowUp', [0, -1]],
    ['ArrowDown', [0, 1]],
  ]);
  const ZOOM_KEYS = new Map<string, number>([
    ['+', 1],
    ['=', 1],
    ['-', -1],
  ]);

  function devicePoint(view: HTMLElement, clientX: number, clientY: number): [number, number] {
    const box = view.getBoundingClientRect();
    return [(clientX - box.left) * devicePixelRatio, (clientY - box.top) * devicePixelRatio];
  }

  // The two pointers' distance, and their midpoint in client px.
  function spread(pointers: Map<number, [number, number]>): [number, number, number] {
    const [a, b] = [...pointers.values()];
    return [Math.hypot(a[0] - b[0], a[1] - b[1]), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }

  function onKey(view: HTMLElement, target: MapInputTarget, event: KeyboardEvent): void {
    // Ctrl or Cmd with plus and minus zooms the browser, which stays the browser's.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const camera = target.camera();
    const pan = PAN_KEYS.get(event.key);
    const zoom = ZOOM_KEYS.get(event.key);
    const step = PAN_CELLS * camera.cellPx;
    if (pan) target.setCamera(panMapBy(camera, pan[0] * step, pan[1] * step));
    else if (zoom) target.setCamera(zoomMapAt(camera, zoom, (view.clientWidth * devicePixelRatio) / 2, (view.clientHeight * devicePixelRatio) / 2));
    else if (event.key === 'Home') target.fit();
    else if (event.key === 'Escape') target.close();
    else return;
    event.preventDefault();
  }

  // Drag, wheel, pinch and keys, bound once when the map view is first made.
  export function bindMapInput(view: HTMLElement, target: MapInputTarget): void {
    const pointers = new Map<number, [number, number]>();
    let pinchAt = 0;
    let wheelPx = 0;
    let wheelAtMs = 0;

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const px = event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
      const sameGesture = event.timeStamp - wheelAtMs < WHEEL_GESTURE_MS && Math.sign(px) === Math.sign(wheelPx);
      wheelPx = sameGesture ? wheelPx + px : px;
      wheelAtMs = event.timeStamp;
      if (Math.abs(wheelPx) < WHEEL_STEP_PX) return;
      const [x, y] = devicePoint(view, event.clientX, event.clientY);
      target.setCamera(zoomMapAt(target.camera(), -Math.sign(wheelPx), x, y));
      wheelPx = 0;
    };
    const onPinch = (): void => {
      const [distance, midX, midY] = spread(pointers);
      const ratio = distance / pinchAt;
      if (ratio < PINCH_STEP && ratio > 1 / PINCH_STEP) return;
      const [x, y] = devicePoint(view, midX, midY);
      target.setCamera(zoomMapAt(target.camera(), ratio > 1 ? 1 : -1, x, y));
      pinchAt = distance;
    };
    const onDown = (event: PointerEvent): void => {
      if (event.button !== 0 || pointers.size === 2) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      view.setPointerCapture(event.pointerId);
      if (pointers.size === 2) pinchAt = spread(pointers)[0];
    };
    // One pointer drags the map, so the camera moves the other way; two pointers pinch instead.
    const onMove = (event: PointerEvent): void => {
      const last = pointers.get(event.pointerId);
      if (!last) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pointers.size === 2) {
        onPinch();
        return;
      }
      const dpr = devicePixelRatio;
      target.setCamera(panMapBy(target.camera(), (last[0] - event.clientX) * dpr, (last[1] - event.clientY) * dpr));
    };
    const onEnd = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
    };

    view.addEventListener('wheel', onWheel, { passive: false });
    view.addEventListener('pointerdown', onDown);
    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerup', onEnd);
    view.addEventListener('pointercancel', onEnd);
    view.addEventListener('keydown', (event) => onKey(view, target, event));
  }
  ```

- [ ] **Step 5: Run** the Step 2 command, then the gates. Expected: all pass.
- [ ] **Step 6: Commit** `feat(web): list the countries in a legend and bind the map's input`.

### Task 7: The base pass: tiles, flat fills and the overlay (senior)

**Files:** create `packages/render-gl/src/map/gl.ts`, `src/map/base-pass.ts`, `harness/map.html`, `harness/map.ts` and `test/browser/map-base.spec.ts`.

- **`gl.ts`** holds the map's own `compile`, `link` and nearest-filtered texture helpers. It is a second copy of `backends/webgl.ts`'s, kept apart so the renderer chunk never exports them (Ruling 1).
- **Textures, made by `base-pass.ts`:**
  - `cells`, RGBA16UI, one texel per cell: the atlas origin of the cell's 8-px tile in R and G, and of its 16-px tile in B and A, from `tileFrame` and the page's frame table;
  - `flat`, RGBA8, one texel per cell: the country's colour on land, and `LINE_COLOURS.water` on water;
  - `overlay`, R8UI at art resolution: the current view's `buildOverlay`;
  - `atlas`, RGBA8: the page's bitmap.
- **The fragment shader,** on one triangle over the viewport, as the town's minimap pass draws:
  - each device pixel's art pixel is `floorDiv(pixel + camDev, scale)`, with `scale = cellPx / tilePx`, and its cell is that over `tilePx`;
  - off the map it shows the water colour;
  - a non-zero overlay index shows its palette colour: 1–5 the line colours, 6 the border and 7–11 the country colours. In flat mode it skips indices 1–5;
  - otherwise it shows the flat colour in flat mode, or else the atlas texel at the tile's origin plus the art pixel's place in its cell.
- **`createBasePass(gl)`** returns `{ setWorld(map), setAtlas(page), setView(view, overlay), draw(camera, flat, deviceWidth, deviceHeight), dispose() }`. It allocates nothing per draw.
- **The harness page,** `harness/map.html` with `harness/map.ts`:
  - it boots a canvas at a CSS size and exposes `window.mapHarness` with `boot`, `world(map)`, `atlas(page)`, `draw(camera, flat)` and `pixel(x, y)`;
  - `pixel` reads one device pixel through `readPixels` straight after a draw, so the drawing buffer needs no preserving;
  - its test atlas is built in the page: one 16 × 16 block of a known colour per frame name, so every check can predict each pixel.
- **Checks,** in `map-base.spec.ts`, on `tinyWorld`s, in all three browsers:
  - a cell's pixels in both views show its tile's colour, at scales 1 and 2;
  - a river's, a road's, a band's and a border's pixels show their palette colours;
  - flat mode shows country colours and water, and hides rivers and roads;
  - a fractional camera still puts whole texels on whole device pixels.
- **Commit** `feat(render-gl): draw the map's tiles, fills and lines in one pass`.

### Task 8: The icons pass (senior)

**Files:** create `packages/render-gl/src/map/icons.ts` and `test/browser/map-icons.spec.ts`; modify `src/map/base-pass.ts` only if they must share a buffer.

- **Instances per view,** built once a view and a page are both there, as `mapdraw.py`'s `_overlays`, `_beside` and `_place` draw them:
  - the peaks from `peakFrame`, though the flat view draws none, as `countries.png` doesn't;
  - wonders and own-cell landmarks, at their cells;
  - settlements, at their tiers' frames;
  - in the Region view, each settlement's in-place landmarks, lighthouses aside, in free land cells beside it, by `_beside`'s rule.
- **Sorted** by (row, layer, column, frame name), so equal rows draw peaks, then icons, then towns, as `_place` does.
- **Placed** with each frame's anchor on the cell's bottom-centre: art x `gx · tilePx + tilePx / 2 − ax`, and art y `gy · tilePx + tilePx − 1 − ay`.
- **One instanced draw:** each instance carries its art-pixel corner and its atlas rectangle. The fragment shader reads the atlas with `texelFetch` and discards alpha 0, so the pass needs no blending.
- **Checks:** an icon's pixels land where the anchor rule says, and a lower row's icon covers a higher row's.
- **Commit** `feat(render-gl): draw the map's peaks and icons in one instanced pass`.

### Task 9: `MapRenderer`: views, context loss and the Canvas2D fallback (senior)

**Files:** create `packages/render-gl/src/map/renderer.ts`, `src/map/canvas2d.ts` and `test/browser/map-renderer.spec.ts`; modify `src/map.ts`.

- **`createMapRenderer(canvas, options)`,** as interfaces.md's The map scene has it:
  - `draw` picks the view with `mapViewFor` against the last view drawn, builds that view's overlay and instances on first use, and draws the base pass, then the icons;
  - a view's overlay is uploaded once and then dropped on the CPU side, and rebuilt from the world after a context loss.
- **Canvas2D,** when:
  - WebGL2 is missing, or a shader fails to link;
  - `MAX_TEXTURE_SIZE` is below 3,072, too small for the Region overlay of a large world (Ruling 3);
  - a lost context stays lost for `restoreTimeoutMs`, 3,000 ms by default, as `WorldRenderer` falls back.
- **The Canvas2D painter** draws:
  - the flat fills, from a one-pixel-per-cell image drawn at `cellPx` with smoothing off;
  - settlement icons from the page's bitmap, once it is there;
  - the water colour off the map.
- **`dispose`** deletes every GL object and loses the context, since the town's renderer keeps its own.
- **Checks:**
  - `backend: 'canvas2d'` draws flat colours where a WebGL draw would;
  - `WEBGL_lose_context` then restore gives the same pixels as before;
  - a loss left unrestored falls back after the timeout, as `fallback.spec.ts` does for the town.
- **Commit** `feat(render-gl): add the MapRenderer with its Canvas2D fallback`.

### Task 10: The Map control and the lazy map view (senior)

**Files:** create `apps/web/src/map/map-view.ts`; modify `apps/web/src/panels/controls.ts` and `apps/web/vite.config.ts`.

- **First, record the first-load bytes.** Run `pnpm --filter @nomos/web build` before any edit, and note the byte sizes of `apps/web/dist/assets/index-*.js`, `render-gl-*.js` and `worker-*.js`.
- **The control.** `mountControls` gains a lil-gui button named "Map". It runs `import('../map/map-view.ts').then(({ openMap }) => openMap(app, button))`, where `button` is that control's element, which gets focus back on close.
- **`vite.config.ts`:** the `render-gl` chunk group's test becomes `/[\\/]packages[\\/]render-gl[\\/](?!src[\\/]map)/`, so the map scene joins the map view's lazy chunk instead.
- **`openMap(app, returnFocus)`:**
  - **The section.** On the first call, it builds the section once and keeps it: `<section id="map" aria-label="Map of the world" tabindex="0">`, in `#view`'s grid area above the HUD. It holds:
    - a toolbar of "Close map", "Fit", and a "Countries" toggle with `aria-pressed`;
    - a status line with `role="status"`;
    - the canvas, with `role="img"` and an `aria-label` that points to the legend;
    - an `aria-hidden` labels layer, and the legend.

    Its CSS is a `<style>` element it adds once: the labels' outlined text and the swatches, with `touch-action: none` on the section.
  - **The pause.** It notes whether the town was playing and calls `app.setPaused(true)`. It sets `inert` on `#view` and `#hud`, shows the section and focuses it.
  - **The world.** Unless it already has one, it starts the worker with `new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' })`. It posts `{ type: 'generate', seed: app.seed, size: 'large' }` and shows "Making the map…" until the answer. On the answer it:
    - terminates the worker and keeps the world and its names (Ruling 9);
    - hands the world to the renderer, and mounts the labels, now that they can be measured, and the legend;
    - fits the camera, and draws.
  - **The atlas page.** It calls `loadAtlasPage(new URL('atlas/map.json', document.baseURI).href, new URL('atlas/map.webp', document.baseURI).href)` beside the worker. On success it calls `setAtlas` and draws again. On failure it says in the status line that the map shows flat colours.
  - **Drawing.** It draws on demand. A camera change, a resize or a toggle asks for one animation frame, in which it calls `renderer.draw(camera)` and then `labels.update(camera, renderer.view, ...)`. `observeDeviceSize`, from `@nomos/render-gl`, sizes the canvas; the entry chunk already imports it, so the renderer chunk gains no export.
  - **Input.** `bindMapInput` on the section, with `fit` and `close`.
  - **Closing,** by the button or Escape: hide the section, drop `inert`, call `app.setPaused(false)` only if the town was playing, and focus `returnFocus`.
  - **Testing hook.** It sets `window.__map` to `{ open, view, frameMs }` for Tasks 12 and 13, as `window.__app` exposes the town.
- **The bytes after.** Build again. The three first-load chunks must have the byte sizes noted above, exactly: a lazy chunk's new hash has the same length, so only real code can change them. If one changed and no other commit explains it, find the import that pulled code in.
- **Commit** `feat(web): open the map from a button, in a lazy view of its own`.

### Task 11: Size limits and the first-load check (junior, exact steps)

**Files:** modify `apps/web/.size-limit.json` (shared).

- [ ] **Step 1: Build and measure.** Run `pnpm --filter @nomos/web build`, then `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`, then `node tools/bench/src/chunks.ts`. Expected: two ungated chunks, `dist/assets/map-view-*.js` and `dist/assets/map-worker-*.js`.
- [ ] **Step 2: Gate them.** Add two entries after `Inspector chunk`, `"Map view chunk"` with path `["dist/assets/map-view-*.js"]` and `"Map worker chunk"` with path `["dist/assets/map-worker-*.js"]`. Set each limit to its brotli size from `pnpm --filter @nomos/web size` plus 25%, rounded up to the next 0.5 kB, as M0.5 set its stand-ins.
- [ ] **Step 3: Run** `pnpm --filter @nomos/web size` and `node tools/bench/src/chunks.ts`. Expected: every limit passes, `Initial JS, M0 stand-in` included, and `0 ungated chunks`.
- [ ] **Step 4: The startup gate.** `node tools/bench/src/calibrate.ts`, then `pnpm --filter @nomos/web startup`. Expected: first frame and interactive within their limits, as before Task 10. Record the medians beside the CPU rate in the report.
- [ ] **Step 5: Commit** `build(web): gate the map view and map worker chunks`.

### Task 12: The exit tests: tiles complete, labels by band, the town's pause (junior, exact code)

**Files:** create `apps/web/test/map-exits.test.ts` and `apps/web/test/browser/map.spec.ts`.

- [ ] **Step 1: `apps/web/test/map-exits.test.ts`,** in Node:

  ```ts
  import { readFileSync } from 'node:fs';
  import { landmarkFrame, peakFrame, settlementFrame, tileFrame, wonderFrame, type MapView } from '@nomos/render-gl/map';
  import { NO_LANDMARK, type WorldMap } from '@nomos/sim-protocol/world-map';
  import { generateWorld } from '@nomos/worldgen';
  import { describe, expect, it } from 'vitest';
  import { labelSet, placeLabels } from '../src/map/labels.ts';

  // The map page holds every map-scale frame (tools/atlas/test_atlas.py), so the manifests stand in for it here.
  const known = new Set(
    ['map', 'wonders', 'landmarks'].flatMap((sheet) => {
      const manifest = JSON.parse(readFileSync(new URL(`../../../assets/sprites/${sheet}.json`, import.meta.url), 'utf8'));
      return Object.keys(manifest.frames).map((name) => `${sheet}/${name}`);
    }),
  );
  const VIEWS: MapView[] = ['country', 'region'];
  const WORLDS: [number, 'standard' | 'large'][] = [
    ...Array.from({ length: 10 }, (_, k): [number, 'standard'] => [0x5eed0001 + k, 'standard']),
    [0x5eed0001, 'large'],
    [0x5eed0002, 'large'],
  ];

  function framesOf(map: WorldMap, view: MapView): string[] {
    const names: string[] = [];
    for (let cell = 0; cell < map.biome.length; cell++) {
      names.push(tileFrame(map.biome[cell], map.variant[cell], view));
      const peak = peakFrame(map.biome[cell], map.variant[cell], view);
      if (peak) names.push(peak);
    }
    map.settlements.tier.forEach((tier) => names.push(settlementFrame(tier)));
    map.wonders.kind.forEach((kind) => names.push(wonderFrame(kind, view)));
    map.landmarks.kind.forEach((kind) => names.push(landmarkFrame(kind, view)));
    for (const kind of map.settlements.landmarks) {
      if (kind !== NO_LANDMARK) names.push(landmarkFrame(kind, view));
    }
    return names;
  }

  describe('the map exit checks', { timeout: 120_000 }, () => {
    it('has a frame for every tile, icon and landmark the generator makes', () => {
      for (const [seed, size] of WORLDS) {
        const map = generateWorld(seed, size);
        for (const view of VIEWS) expect(framesOf(map, view).filter((name) => !known.has(name)), `${size} ${seed}`).toEqual([]);
      }
    });

    it('labels by band, with no two labels overlapping', () => {
      for (const [seed, size] of WORLDS) {
        const map = generateWorld(seed, size);
        const set = labelSet(map);
        set.width.fill(60);
        set.height.fill(14);
        const x = new Float64Array(set.count);
        const y = new Float64Array(set.count);
        const countries = map.countries.capital.length;
        for (const [view, cellPx] of [['country', 8], ['region', 32]] as const) {
          placeLabels(set, view, { x: 0, y: 0, cellPx }, 1, map.width * cellPx, map.height * cellPx, x, y);
          for (let i = 0; i < set.count; i++) {
            if (Number.isNaN(x[i])) continue;
            const settlement = set.name[i] - countries;
            if (view === 'region') expect(settlement, `${size} ${seed}: a country in the Region view`).toBeGreaterThanOrEqual(0);
            else expect(settlement < 0 || map.settlements.tier[settlement] <= 1, `${size} ${seed}: label ${i}`).toBe(true);
            for (let j = 0; j < i; j++) {
              if (Number.isNaN(x[j])) continue;
              const apart = x[i] >= x[j] + 60 || x[j] >= x[i] + 60 || y[i] >= y[j] + 14 || y[j] >= y[i] + 14;
              expect(apart, `${size} ${seed}: labels ${j} and ${i} overlap`).toBe(true);
            }
          }
        }
      }
    });
  });
  ```

- [ ] **Step 2: `apps/web/test/browser/map.spec.ts`,** on the built app, in Chromium:

  ```ts
  import { expect, test, type Page } from 'playwright/test';
  import { WEB } from './web.ts';

  test.use({ baseURL: WEB });

  const MAP_CHUNK = /\/(map-view|map-worker)-[^/]+\.js$|\/atlas\/map\.(json|webp)$/;

  async function playing(page: Page): Promise<boolean> {
    return page.evaluate(() => window.__app?.paused === false);
  }

  test('opens the map on demand, pauses the town, and resumes it on close', async ({ page }) => {
    test.setTimeout(60_000);
    const fetched: string[] = [];
    page.on('request', (request) => {
      if (MAP_CHUNK.test(request.url())) fetched.push(request.url());
    });
    await page.goto('/?seed=42');
    await page.getByRole('button', { name: 'Map', exact: true }).waitFor();
    expect(fetched).toEqual([]);
    expect(await playing(page)).toBe(true);
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    const map = page.locator('#map');
    await expect(map).toBeVisible();
    await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
    expect(await playing(page)).toBe(false);
    expect(fetched.some((url) => url.includes('map-view-'))).toBe(true);
    await expect(page.locator('#view')).toHaveAttribute('inert', '');
    await map.press('Escape');
    await expect(map).toBeHidden();
    expect(await playing(page)).toBe(true);
    await expect(page.locator('#view')).not.toHaveAttribute('inert', '');
  });

  test('keeps the town paused on close when it was paused before', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.getByRole('button', { name: 'Close map' }).click();
    expect(await playing(page)).toBe(false);
  });
  ```

  The legend can only fill once M8.1's worker answers. Without the atlas page, which the Playwright web server's build doesn't make, the map shows the flat view and says so in its status line. These tests depend on neither.
- [ ] **Step 3: Run** `pnpm exec vitest run apps/web/test/map-exits.test.ts`, then `pnpm exec playwright test apps/web/test/browser/map.spec.ts --project=chromium`. Expected: all pass. A failure points at Task 10's wiring: report it to the senior.
- [ ] **Step 4: Commit** `test(web): check the map's frames, label bands and the town's pause`.

### Task 13: The 2 ms bar (senior)

**Files:** create `apps/web/test/browser/perf.spec.ts`; modify `playwright.config.ts` and `.github/workflows/ci.yml` (both shared).

- **The spec** runs in Playwright's `perf` project: Chromium on SwiftShader, after every other project, as `perf.spec.ts` names it.
- **What it times.** It opens the map at seed 42 and waits for the atlas page. It then pans by script one device pixel a frame for 240 frames, half in each view, with labels on. Each frame's main-thread time is `renderer.draw` plus `labels.update`, read from `window.__map.frameMs`. In the Region half, that time also covers moving the crowd and drawing it (Task 18).
- **The bar:** `const MAP_FRAME_MS = 2;`, with the comment `// Proposed (M8.3 task.md); the owner's answer replaces it.` The spec checks the median against it, and records the median, p95 and largest as annotations.
- **The atlas page.** The Playwright web server's build has no atlas page. For this spec, its `webServer` command for the app builds it first: `pnpm --filter @nomos/web build && python tools/atlas/build_atlas.py --out apps/web/dist/atlas && pnpm --filter @nomos/web preview`. CI's `browser` job then needs Python with Pillow: add `actions/setup-python` and `pip install -r tools/requirements.txt` to it.
- **If the bar fails,** profile it. Labels and the overlay upload are the likely costs, so write label styles only on change and build each overlay once. Report the measured figures with the engine and the load average (docs rules).
- **Commit** `test(web): time the map's frames against the proposed 2 ms bar`.

### Task 14: The colour check and the Countries golden frame (senior)

The owner's step is done: the owner picked the five on 9 October 2026, and Task 2 writes them into `map-colours.json`.

- **The colour check,** in `tools/worldgen/test_worldgen.py`, as `country_colours_keep_apart`. It reads `MAP_COLOURS['countries']` and needs only NumPy, which `tools/requirements.txt` already pins.
  - **Conversion:** sRGB to CIE Lab with the D65 white, as the swatch sheet computes it (Ruling 13). Never use D50-adapted Lab.
  - **Distance:** CIEDE2000. Port or mirror the sheet's NumPy version from the gitignored `dist/colours/swatches.py`, with its check against Sharma's 34 test pairs. Copy those pairs into the test, so the check never depends on `dist/`.
  - **The palette bar:** every country colour lies ≥ 15 from each of the 61 palette colours in `spritekit.PALETTE`. The owner's five pass, the nearest at 15.25 (swatch sheet, computed).
  - **The pair bar:** every two country colours lie ≥ 11.95 apart, the sheet's 12.0 to one decimal, for normal vision, and for protan, deutan and tritan vision simulated with Machado 2009 at full severity (Ruling 12). The owner's five keep 11.96 or more.
  - **Families:** no country colour falls in the red–orange or body-hue hue sectors, as the sheet defines them (Ruling 11).
  - **Simulation:** Machado 2009's full-severity matrices, ported from the sheet with the conversion.
  - **Proof that the check bites:** run it once against M8.1's provisional table, and see it fail on `#AABB00`, 8.3 from `AUTUMN_L`, and `#44BBCC`, 12.3 from `WATER_L`.
- **A golden frame** of seed 42's flat Countries view, at a fixed 1,280 × 800 CSS size, in `apps/web/test/browser/map-golden.spec.ts`:
  - it compares a hash of the canvas pixels with `apps/web/test/golden/map-countries.json`;
  - `UPDATE_GOLDEN=1` rewrites the hash, as `render-gl`'s golden spec does;
  - it also checks that every land edge between two countries draws its border colour, and that the legend lists every country with its name and capital.
- **Commits:** `test(worldgen): keep the country colours apart from the palette`, then `test(web): pin the Countries view of seed 42`.

### Task 15: Close M8.3 (senior)

- **Prove every exit check** with `verification-before-completion`, through `senior-qa`:
  - the 2 ms bar (Task 13);
  - the first frame and bytes (Tasks 10 and 11);
  - complete tiles, labels by band and the town's pause (Task 12);
  - the countries drawn (Task 14);
  - the crowd (Tasks 16–19).
- **Review:** `code-reviewer` over the whole part, and `web-accessibility` over the map section: focus order, the legend as text alternative, Escape, and the reduced-motion start.
- **Docs,** in a separate docs commit:
  - interfaces.md for anything the code refined;
  - the Started, Done and Actual cells in `milestone.md`;
  - `tools/worldgen/README.md`'s note that `country.png` and the map scene share `map-colours.json`.
- **Checkpoint:** the next one, committed alone.

### Task 16: The crowd's homes and stops (junior, exact code)

**Files:** create `packages/worldgen/src/crowd/crowd.ts` and `packages/worldgen/test/crowd.test.ts`. The `MapCrowd` type is in `@nomos/sim-protocol/world-map` already (9f4f9e1).

**What it makes.** `crowdOf(map: WorldMap): MapCrowd` places the owner's look-only crowd, settlement by settlement in id order:
- a dot per 100 people, and at least one;
- each dot's home is a cell of its settlement's country within a reach that grows with its dots. It takes the nearer of two draws, so the crowd thins toward its edge;
- three more stops in the 3 × 3 block around the home, on the same country's land;
- each stop lies in the middle three quarters of its cell, in cells times `CROWD_Q`;
- each dot gets a random body hue, a leg of 2.5–6 s and a start somewhere in its loop.

Every draw is `draw(map.seed, CROWD, …)`, with first keys from 0x100, clear of `place.py`'s 1–6. `map.country` is 0 on water, so matching the country keeps every stop ashore. `index.ts` gains `crowdOf` in Task 18, since M8.1 Task 29 creates it.

- [ ] **Step 1: Write the failing test,** `packages/worldgen/test/crowd.test.ts`:

  ```ts
  import { CROWD_HUES, CROWD_Q, CROWD_STOPS, type WorldMap } from '@nomos/sim-protocol/world-map';
  import { describe, expect, it } from 'vitest';
  import { crowdOf } from '../src/crowd/crowd.ts';

  const WIDTH = 12;
  const HEIGHT = 8;
  // Settlements in id order, as [x, y, population, country]: 90 dots, then 9, then a hamlet's one.
  const PLACES = [
    [5, 2, 9000, 1],
    [8, 4, 999, 2],
    [1, 6, 40, 1],
  ] as const;
  // The furthest, in cells either way, a stop may stand from its settlement: its reach, plus the block around its home.
  const FARTHEST = [3, 2, 2];
  const OWNERS = [...Array<number>(90).fill(0), ...Array<number>(9).fill(1), 2];

  // Two countries inside a ring of sea, country 1 west of x = 6, with a lake at (4, 3). crowdOf reads only the seed,
  // the size, the countries and the settlements.
  function tinyWorld(seed: number): WorldMap {
    const n = WIDTH * HEIGHT;
    const country = new Uint8Array(n);
    for (let y = 1; y < HEIGHT - 1; y++) {
      for (let x = 1; x < WIDTH - 1; x++) country[y * WIDTH + x] = x < 6 ? 1 : 2;
    }
    country[3 * WIDTH + 4] = 0;
    const count = PLACES.length;
    return {
      version: 1,
      seed,
      width: WIDTH,
      height: HEIGHT,
      template: 0,
      wind: 0,
      cold: 0,
      elevation: new Int16Array(n),
      biome: new Uint8Array(n),
      temperature: new Uint8Array(n),
      moisture: new Uint8Array(n),
      river: new Uint8Array(n),
      receiver: new Int32Array(n),
      coast: new Uint8Array(n),
      variant: new Uint8Array(n),
      country,
      region: new Uint16Array(n),
      market: new Uint16Array(n),
      settlements: {
        cell: Int32Array.from(PLACES, ([x, y]) => y * WIDTH + x),
        tier: new Uint8Array(count),
        population: Int32Array.from(PLACES, (place) => place[2]),
        country: Uint8Array.from(PLACES, (place) => place[3]),
        region: new Uint16Array(count),
        landmarks: new Uint8Array(count * 3),
      },
      countries: { capital: Int32Array.from([0, 1]), colour: Uint8Array.from([0, 1]) },
      regions: { seat: new Int32Array(0), country: new Uint8Array(0) },
      roads: { offsets: new Int32Array(1), cells: new Int32Array(0) },
      lanes: { offsets: new Int32Array(1), cells: new Int32Array(0) },
      bridges: new Int32Array(0),
      wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
      landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
    };
  }

  function stopCell(stops: Uint16Array, dot: number, stop: number): [number, number] {
    const at = 2 * (dot * CROWD_STOPS + stop);
    return [Math.floor(stops[at] / CROWD_Q), Math.floor(stops[at + 1] / CROWD_Q)];
  }

  function apart(ax: number, ay: number, bx: number, by: number): number {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  }

  describe('the map crowd', () => {
    const world = tinyWorld(0x5eed0001);
    const crowd = crowdOf(world);

    it('gives each settlement a dot per 100 people, and a hamlet at least one', () => {
      expect(crowd.hue.length).toBe(OWNERS.length);
      expect(crowd.stops.length).toBe(OWNERS.length * CROWD_STOPS * 2);
      expect(crowd.legMs.length).toBe(OWNERS.length);
      expect(crowd.startMs.length).toBe(OWNERS.length);
    });

    it("keeps every stop on its own country's land, near its settlement", () => {
      OWNERS.forEach((s, dot) => {
        const [px, py, , country] = PLACES[s];
        for (let stop = 0; stop < CROWD_STOPS; stop++) {
          const [x, y] = stopCell(crowd.stops, dot, stop);
          expect(world.country[y * WIDTH + x], `dot ${dot} stop ${stop}`).toBe(country);
          expect(apart(x, y, px, py), `dot ${dot} stop ${stop}`).toBeLessThanOrEqual(FARTHEST[s]);
        }
      });
    });

    it("puts a dot's later stops beside its first", () => {
      OWNERS.forEach((_, dot) => {
        const [hx, hy] = stopCell(crowd.stops, dot, 0);
        for (let stop = 1; stop < CROWD_STOPS; stop++) {
          const [x, y] = stopCell(crowd.stops, dot, stop);
          expect(apart(x, y, hx, hy), `dot ${dot} stop ${stop}`).toBeLessThanOrEqual(1);
        }
      });
    });

    it('keeps stops off cell edges, and legs between 2.5 and 6 s', () => {
      for (const q of crowd.stops) {
        expect(q % CROWD_Q).toBeGreaterThanOrEqual(32);
        expect(q % CROWD_Q).toBeLessThan(224);
      }
      crowd.legMs.forEach((leg, dot) => {
        expect(leg).toBeGreaterThanOrEqual(2500);
        expect(leg).toBeLessThanOrEqual(6000);
        expect(crowd.startMs[dot]).toBeLessThan(CROWD_STOPS * leg);
      });
    });

    it('draws all six body hues', () => {
      expect(new Set(crowd.hue).size).toBe(CROWD_HUES.length);
    });

    it('makes the same crowd from the same seed, and another from another', () => {
      expect(crowdOf(tinyWorld(0x5eed0001))).toEqual(crowd);
      expect(crowdOf(tinyWorld(0x5eed0002)).stops).not.toEqual(crowd.stops);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/worldgen/test/crowd.test.ts`. Expected: fails, since `crowd.ts` doesn't exist.
- [ ] **Step 3: Write** `packages/worldgen/src/crowd/crowd.ts`:

  ```ts
  import { below, floorDiv, isqrt } from '@nomos/sim-core/kernels';
  import { CROWD_HUES, CROWD_Q, CROWD_STOPS, type MapCrowd, type WorldMap } from '@nomos/sim-protocol/world-map';
  import { dist2, xOf, yOf } from '../grid/grid.ts';
  import { CROWD } from '../random/streams.ts';

  // The map's look-only crowd (owner, 9 October 2026). map.country is 0 on water, so matching a settlement's country
  // keeps its dots ashore and at home.
  const PEOPLE_PER_DOT = 100;
  // A yard holds about this many dots a cell, so a capital's spreads some nine cells and a hamlet's keeps to its own.
  const DOTS_PER_CELL = 24;
  // Legs take 2.5 to 6 s, so neighbours fall out of step.
  const LEG_MS = 2500;
  const LEG_SPAN_MS = 3501;
  // Stops keep to the middle three quarters of a cell, never its edge.
  const EDGE = 32;
  const INNER = 192;

  // First keys of the crowd's CROWD draws on the world seed, clear of place.py's 1-6, as variant keys SHAPE on 0x200.
  const HOME = 0x100;
  const NEAR = 0x101;
  const STOP = 0x102;
  const OFFSET = 0x103;
  const HUE = 0x104;
  const LEG = 0x105;
  const START = 0x106;

  function dotsOf(population: number): number {
    return Math.max(1, floorDiv(population, PEOPLE_PER_DOT));
  }

  // A disc of dots / DOTS_PER_CELL cells has a radius of the root of dots / (DOTS_PER_CELL * pi); 3 stands in for pi.
  function reachOf(dots: number): number {
    return 1 + isqrt(floorDiv(dots, DOTS_PER_CELL * 3));
  }

  // The settlement's own land within reach, nearest first, ties to the lower cell.
  function yardOf(map: WorldMap, settlement: number, reach: number): number[] {
    const { width, height } = map;
    const home = map.settlements.cell[settlement];
    const country = map.settlements.country[settlement];
    const hx = xOf(home, width);
    const hy = yOf(home, width);
    const yard: number[] = [];
    for (let y = Math.max(0, hy - reach); y <= Math.min(height - 1, hy + reach); y++) {
      for (let x = Math.max(0, hx - reach); x <= Math.min(width - 1, hx + reach); x++) {
        if (map.country[y * width + x] === country && dist2(x, y, hx, hy) <= reach * reach) yard.push(y * width + x);
      }
    }
    const away = (cell: number): number => dist2(xOf(cell, width), yOf(cell, width), hx, hy);
    return yard.sort((a, b) => away(a) - away(b) || a - b);
  }

  // The country's cells in the 3 x 3 block around a cell, the cell included: where a dot's later stops fall.
  function blockOf(map: WorldMap, cell: number, country: number, out: Int32Array): number {
    const { width, height } = map;
    const cx = xOf(cell, width);
    const cy = yOf(cell, width);
    let count = 0;
    for (let y = Math.max(0, cy - 1); y <= Math.min(height - 1, cy + 1); y++) {
      for (let x = Math.max(0, cx - 1); x <= Math.min(width - 1, cx + 1); x++) {
        if (map.country[y * width + x] === country) out[count++] = y * width + x;
      }
    }
    return count;
  }

  // Dot k of a settlement: a home in its yard, the nearer of two draws, then three more stops beside it.
  function placeDot(
    map: WorldMap,
    crowd: MapCrowd,
    dot: number,
    settlement: number,
    yard: readonly number[],
    k: number,
    block: Int32Array,
  ): void {
    const { seed, width } = map;
    const uid = map.settlements.cell[settlement];
    const first = below(yard.length, seed, CROWD, HOME, uid, k);
    const home = yard[Math.min(first, below(yard.length, seed, CROWD, NEAR, uid, k))];
    const near = blockOf(map, home, map.settlements.country[settlement], block);
    for (let stop = 0; stop < CROWD_STOPS; stop++) {
      const cell = stop === 0 ? home : block[below(near, seed, CROWD, STOP, uid, k, stop)];
      const at = 2 * (dot * CROWD_STOPS + stop);
      crowd.stops[at] = xOf(cell, width) * CROWD_Q + EDGE + below(INNER, seed, CROWD, OFFSET, uid, k, 2 * stop);
      crowd.stops[at + 1] = yOf(cell, width) * CROWD_Q + EDGE + below(INNER, seed, CROWD, OFFSET, uid, k, 2 * stop + 1);
    }
    crowd.hue[dot] = below(CROWD_HUES.length, seed, CROWD, HUE, uid, k);
    crowd.legMs[dot] = LEG_MS + below(LEG_SPAN_MS, seed, CROWD, LEG, uid, k);
    crowd.startMs[dot] = below(CROWD_STOPS * crowd.legMs[dot], seed, CROWD, START, uid, k);
  }

  // Settlement by settlement in id order, so each settlement's dots sit together.
  export function crowdOf(map: WorldMap): MapCrowd {
    const { population } = map.settlements;
    let total = 0;
    for (let s = 0; s < population.length; s++) total += dotsOf(population[s]);
    const crowd: MapCrowd = {
      hue: new Uint8Array(total),
      stops: new Uint16Array(total * CROWD_STOPS * 2),
      legMs: new Uint16Array(total),
      startMs: new Uint16Array(total),
    };
    const block = new Int32Array(9);
    let dot = 0;
    for (let s = 0; s < population.length; s++) {
      const dots = dotsOf(population[s]);
      const yard = yardOf(map, s, reachOf(dots));
      for (let k = 0; k < dots; k++) placeDot(map, crowd, dot++, s, yard, k, block);
    }
    return crowd;
  }
  ```

- [ ] **Step 4: Run** Step 2's command. Expected: all six pass. Then check that each test bites. Make each change below alone, see a test fail, and undo it:
  1. drop `map.country[y * width + x] === country &&` in `yardOf`;
  2. call `yardOf(map, s, 99)` in `crowdOf`;
  3. take later stops from `yard` instead of `block`;
  4. make `dotsOf` return `floorDiv(population, PEOPLE_PER_DOT)`;
  5. set `EDGE` to 0.
- [ ] **Step 5: The gates:** `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names`, and `hash=b3b2c251` from the CLI.
- [ ] **Step 6: Commit** `feat(worldgen): place a look-only crowd around each settlement`, with both files.

### Task 17: The crowd pass (senior)

**Files:**
- create `packages/render-gl/src/map/crowd.ts` and `test/browser/map-crowd.spec.ts`;
- modify `src/map/renderer.ts`, `src/map/canvas2d.ts`, `src/map/map-colours.json`, `src/map/colours.ts`, `src/map.ts` and `harness/map.ts`;
- modify `tools/worldgen/test_worldgen.py`, for the colour check.

- **API:** `MapRenderer.setCrowd(hue: Uint8Array, xy: Float32Array): void`.
  - `hue` holds each dot's `CROWD_HUES` index. `xy` holds each dot's position, x then y, in cells, fractional.
  - The caller rewrites `xy` in place before each `draw`. The renderer uploads it on every draw that shows the crowd, and keeps both arrays for a restored context or the fallback.
- **When:** only in the Region view, after the base pass and before the icons, so settlement icons and labels stay on top. The Country view never draws it (the owner's decision).
- **Look:**
  - each dot is a filled disc in its body hue. The six are `spritekit.py`'s `BODY_HUES` base colours, kept in `map-colours.json` beside the country colours;
  - sizes are whole device pixels, snapped as the camera is: at least 2 px at the Region view's first step, growing with `cellPx` to about a tenth of a cell;
  - from 4 px up, a dot has a 1-px dark outline, as characters have by day (web rules).
- **GL:** one instanced draw of a unit quad, with a dynamic `xy` buffer and a static hue buffer, and no allocation per frame.
- **Canvas2D:** the same dots as filled squares with the outline, skipping any dot off the canvas.
- **The colour check:** `test_worldgen.py` checks that `map-colours.json`'s six body hues equal `spritekit.PALETTE`'s `BODY`, `LILAC`, `ROSE`, `ICE`, `MINT` and `SILVER`, in `CROWD_HUES` order.
- **Checks,** in `map-crowd.spec.ts` on the harness:
  - at a Region step, body-hue pixels show at the dots' places; at a Country step, none do;
  - Canvas2D draws the same;
  - after `WEBGL_lose_context` and a restore, the dots draw again;
  - moving `xy` moves them.
- **Commit** `feat(render-gl): draw the map crowd from the Region view in`.

### Task 18: The crowd in the map view (senior)

**Needs:** Task 10, M8.1 Task 30, and Tasks 16 and 17.

**Files:**
- create `apps/web/src/map/crowd-motion.ts` and `apps/web/test/crowd-motion.test.ts`;
- modify `apps/web/src/map/generate.ts`, `apps/web/test/map-worker.test.ts` and `apps/web/src/map/map-view.ts`;
- modify `packages/sim-protocol/src/world-map/world-map.ts` and `packages/worldgen/src/index.ts`;
- add a case to `apps/web/test/browser/map.spec.ts`.

- **The worker answers with the crowd too:**
  - `MapWorkerMessage` gains `crowd: MapCrowd`;
  - `answerGenerate` calls `crowdOf(map)` after the names, and laps it as `crowd`;
  - it transfers `crowdBuffers(crowd)` with the world's buffers;
  - `worldgen`'s `index.ts` exports `crowdOf`.
- **Motion:** `crowdAt(crowd: MapCrowd, nowMs: number, xy: Float32Array): void`, with no allocation.
  - Dot d's loop takes `CROWD_STOPS × legMs[d]`, and at `nowMs` it is `nowMs + startMs[d]` into the loop.
  - In each leg the dot stands for the first 40%, then walks straight to the next stop; the last leg returns to stop 0.
  - It writes each position in cells: the stop values divided by `CROWD_Q`.
- **The view:**
  - when the world arrives, make `xy` once, fill it with `crowdAt(crowd, 0, xy)`, and hand both arrays to `renderer.setCrowd`;
  - while the map shows and the renderer's view is the Region view, each frame calls `crowdAt` with the frame's time before `renderer.draw`, then asks for the next frame. In the Country view, drawing stays on demand, as Task 10 has it;
  - under `prefers-reduced-motion: reduce`, dots stand at their time-0 places and no loop runs;
  - closing the map stops the loop;
  - `window.__map` reports the crowd's dot count and whether the last frame drew it, for the tests.
- **Checks:**
  - `crowd-motion.test.ts` checks exact positions at chosen times for a hand-made crowd of two dots: standing, walking, and the wrap back to stop 0;
  - `map-worker.test.ts`: the stage list gains `crowd`, and every buffer, the crowd's included, is listed once;
  - `map.spec.ts`: the Country view draws no crowd. At a Region step it draws one, and a dot moves within a second. Under reduced motion, no dot moves.
- **The bytes after:** Task 10's first-load chunks keep their exact sizes.
- **Commits:** `feat(web): walk the map crowd near home from the Region view in`, then the tests.

### Task 19: The crowd on real worlds, and the owner's screenshots (junior, exact code)

**Needs:** Task 16 and M8.1 Task 29 for the sweep, and Task 18 for the screenshots.

**Files:** create `packages/worldgen/test/crowd-sweep.test.ts`.

- [ ] **Step 1: The sweep,** `packages/worldgen/test/crowd-sweep.test.ts`:

  ```ts
  import {
    BIOME_NAMES,
    CROWD_HUES,
    CROWD_Q,
    CROWD_STOPS,
    type MapCrowd,
    type WorldMap,
  } from '@nomos/sim-protocol/world-map';
  import { describe, expect, it } from 'vitest';
  import { crowdOf } from '../src/crowd/crowd.ts';
  import { generateWorld } from '../src/index.ts';

  const WATER = new Set([BIOME_NAMES.indexOf('ocean'), BIOME_NAMES.indexOf('lake')]);
  const WORLDS: [number, 'standard' | 'large'][] = [
    ...Array.from({ length: 10 }, (_, k): [number, 'standard'] => [0x5eed0001 + k, 'standard']),
    [0x5eed0001, 'large'],
    [0x5eed0002, 'large'],
  ];

  // Each dot's settlement: dots come settlement by settlement, a dot per 100 people and at least one.
  function owners(map: WorldMap): number[] {
    const dotsOf = (people: number): number => Math.max(1, Math.floor(people / 100));
    return Array.from(map.settlements.population, (people, s) => Array<number>(dotsOf(people)).fill(s)).flat();
  }

  // Every stop off its settlement's country or on water.
  function strays(map: WorldMap, crowd: MapCrowd, owner: readonly number[]): string[] {
    const out: string[] = [];
    owner.forEach((s, dot) => {
      for (let stop = 0; stop < CROWD_STOPS; stop++) {
        const at = 2 * (dot * CROWD_STOPS + stop);
        const cell = Math.floor(crowd.stops[at + 1] / CROWD_Q) * map.width + Math.floor(crowd.stops[at] / CROWD_Q);
        const home = map.country[cell] === map.settlements.country[s];
        if (!home || WATER.has(map.biome[cell])) out.push(`dot ${dot} stop ${stop}`);
      }
    });
    return out;
  }

  describe('the map crowd on real worlds', { timeout: 120_000 }, () => {
    it("puts a dot per 100 people on its own country's land, in every hue", () => {
      for (const [seed, size] of WORLDS) {
        const map = generateWorld(seed, size);
        const crowd = crowdOf(map);
        const owner = owners(map);
        expect(crowd.hue.length, `${size} ${seed}`).toBe(owner.length);
        expect(strays(map, crowd, owner), `${size} ${seed}`).toEqual([]);
        expect(new Set(crowd.hue).size, `${size} ${seed}`).toBe(CROWD_HUES.length);
      }
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/worldgen/test/crowd-sweep.test.ts`. Expected: passes. Report the dot counts of the two large worlds.
- [ ] **Step 3: Commit** `test(worldgen): keep the crowd ashore in its own country on real worlds`.
- [ ] **Step 4: Screenshots for the owner,** by `junior-qa` after Task 18.
  - Build: `pnpm --filter @nomos/web build`, then `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`, then `pnpm --filter @nomos/web preview`.
  - Take each at seed 42 and 1,280 × 800:
    - the town with its Map control;
    - the whole map;
    - the Region view on the capital;
    - the closest step on the capital;
    - the Countries toggle at a Region step.
  - Save them to `dist/qa/map-crowd/`, and report each file.

### Exit checks, and the tasks that prove them

| Exit check (task.md and brief) | Proved by |
| --- | --- |
| Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar | Task 13 |
| The bytes before the first frame and the startup gate stay within limits, and no map chunk loads before the Map control is pressed | Tasks 10, 11 and 12 |
| Every biome, settlement tier, wonder and landmark the generator emits has a frame on the map page | Tasks 1, 3 and 12 |
| Seed 42's Countries view matches its golden frame; every border edge draws; the legend lists every country with its name and capital | Task 14 |
| The Country view labels only countries, capitals and cities, the Region view every settlement, and no two labels overlap | Tasks 5 and 12 |
| Opening the map pauses the town; closing it resumes the town only if it was playing | Task 12 |
| The crowd: a dot per 100 people, every stop on its own country's land; drawn only from the Region view in, and still under reduced motion; the first load and the town's hash unchanged | Tasks 16–19 |

### Risks

- **Labels are the hard part of 2 ms.** They are measured once, and a frame writes a style only when a label moves. If panning still passes 2 ms, the next step is moving labels by one transform on their layer, between steps of the camera.
- **The Region overlay is 6.3 MB of texture.** A device that can't hold it draws the map in Canvas2D (Ruling 3). M9's larger worlds will need tiled overlays.
- **The chunk group.** If Vite's group regex ever stops excluding `src/map`, the scene lands in the renderer chunk. Task 10's byte check and the renderer chunk's 10 kB limit both catch that.
- **Two WebGL contexts** live while the map shows, the town's and the map's. Browsers allow many more, and the map frees its own on dispose.
- **The crowd costs every Region frame:** about 10,000 dots moved, and two floats each uploaded. If it breaks Task 13's bar, move and upload only the dots in view, or step the motion at 10 Hz.
