# M8.1 World generator: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status:** Part 1, the Python countries stage, is done, and the owner approved its previews on 9 October 2026. Part 2, the TypeScript port, is a step plan of the same day: the owner asked for the map now, so it was written before M0.7 closed.

**Task:** [task.md](task.md)

## Part 1: the Python countries stage

**Goal:** Every generated world holds 3–5 countries with natural borders, and the previews draw them, so the owner can review about 10 large worlds before version 1 freezes.

**Architecture:** A new `countries.py` stage runs after `settle` and before `farm`. It draws the count, picks capitals, and grows every country from its capital with one multi-source Dijkstra over terrain costs. `world.py` stores a per-cell country column and the country records and feeds both to the fingerprint. `mapdraw.py` draws border lines, colour bands and a flat countries map. A snow biome joins `climate.biomes` first, because it changes the costs and the map.

**Tech stack:** Python 3.12 or later (3.14.6 here), Pillow, integers only. Tests are a plain script, `tools/worldgen/test_worldgen.py`, in the style of `tools/test_licenses.py`: each check returns a list of problems.

**Spec:** [task.md](task.md); the owner's [Countries tab](../../../countries.md); the border definition in [military.md](../../../military.md); snow from the [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md), Q5.

### Global constraints

- Integers only: `+ - * //`, `isqrt` and comparisons. No floats, no `math` transcendentals (README, "Randomness").
- Every random value comes from `rng.draw` or its helpers, keyed on the stage's own stream. Streams are append-only.
- Growth breaks ties by (cost, cell). Sort only with total orders, ties broken by cell index.
- Countries are map facts: no other stage reads `World.country` or `World.countries` (owner, 9 October 2026).
- 3–5 countries per world by keyed draw, on both world sizes (owner, 9 October 2026).
- Every land cell and settlement belongs to exactly one country; water belongs to none (task.md).
- Country colours are map-only, outside the sprite palette, CIEDE2000 ≥ 15 from the 47 reserved colours. They are provisional until the owner picks five at M8.3.
- No country colour, name or emblem appears on a body, building, soldier or police officer, only on map overlays (Countries rule 5).
- `code.md`: KISS, YAGNI, and comments only for a why the code can't show.
- These gates stay green: `vectors.py --check`, `mapfile.py --check`, `export_map.py --check` (so `assets/maps/town.nmap` never changes), `tools/sprites/test_skin_a.py`, `tools/licenses.py --check` and `tools/test_licenses.py`.
- Edit only `tools/worldgen/**` and this plan (Python-first boundary, 9 October 2026).

### Review focus

- Two capitals reach a cell at equal cost: the first popped by (cost, cell) wins. Tested by `grow_breaks_ties_by_cost_then_cell` (Task 2).
- A diagonal step slips between two linked river cells, or across a one-cell strait: it must not. Tested by `diagonal_never_slips` (Task 2).
- An island holds no capital: it joins the country with the cheapest sea crossing. Tested by `island_joins_the_cheaper_crossing` (Task 2).
- A world has fewer towns or larger than K: `capitals` returns all it has and its loop ends. Tested by `capitals_spaced_in_population_order`, third case (Task 2).
- A wonder lands on snow: its place still builds. Tested by `snow_places_build` (Task 1).

### Rulings (agent, 9 October 2026; the owner can overturn them)

1. **The `COUNTRY` stream lives in `countries.py` for now.** `vectors.py` records every stream in `rng.py` into `packages/sim-core/test/fixtures/kernels.json`, which this session may not touch. So `countries.py` holds `COUNTRY = 13`, and `rng.py` gains one comment reserving 13 and 14. Part 2's port moves `COUNTRY` into `rng.py`, appends `NAME = 14` and reruns `vectors.py`.
2. **The sea-cliff fix moves to M8.8.** The brief put it in `climate.py`, but `climate.coasts` has no side bias. Over 8 worlds, cliff coast cells faced north 47 times, east 55, south 36 and west 45 (measured here, seeds `5eed0001`–`5eed0008`). The gap is in `place.lay_sea`, which draws cliffs only for a southern sea, because only south-facing cliff tiles exist. M8.8's brief already draws "cliff faces for east, west and north". No golden covers `place.py`, so the fix needn't precede the freeze.
3. **Snow is uninhabitable,** like peaks: `settle.BASE` gets no snow row. Cold lowland below temperature 40 was 536 of 45,869 land cells, in 4 of 16 worlds, and held 1 of 764 settlements (measured here, standard seeds `5eed0001`–`5eed0010`).
4. **The snow tiles came from `tools/sprites`.** `map8_snow` and `map16_snow` belong in `tools/sprites/map.py`, outside this session's boundary, so Task 6 drew them apart. `mapdraw.py` filled snow cells with a flat stand-in colour until then; since ef9b801 it draws the tiles.
5. **Provisional colours:** `#0000DD`, `#AABB00`, `#334422`, `#EE00DD` and `#44BBCC`. Each is CIEDE2000 ≥ 15 from 42 palette colours taken as the reserved set: 24 body-hue tones, police navy, merchant teal, the crime reds, orange and gold, black and the 8 emblem colours. They are at least 41.5 apart from each other (computed here, a 16-step RGB grid without red–orange hues). The owner's pick at M8.3 replaces them.
6. **A capital whose country is too small is passed over.** In the first 100-seed sweep, 5 of 100 standard worlds held a country of only 1 or 2 settlements (measured here, seeds `5eed0001`–`5eed0064`). Five capitals rarely fit a standard world at the starting spacing, so it shrinks and capitals crowd. `found` now passes over a capital whose country would hold fewer than 3 settlements, the least populous first and never the largest settlement. The next town in line takes its place, and the countries regrow. K stays as drawn.

### Files

- `tools/worldgen/countries.py` (new): the count, capitals, growth and colour indices.
- `tools/worldgen/model.py`: `'snow'` appended to `BIOMES`.
- `tools/worldgen/climate.py`: the snow rule.
- `tools/worldgen/roads.py`: snow's cover cost.
- `tools/worldgen/world.py`: the stage in `generate`, `World.country` and `World.countries`, `SIZES`, the fingerprint and summary lines, and `--size`.
- `tools/worldgen/mapdraw.py`: the country colour table, borders and bands, `countries_png`, and the snow stand-in.
- `tools/worldgen/generate.py`: `--size`, `countries.png`, and a `-large` output folder.
- `tools/worldgen/rng.py`: the reservation comment only.
- `tools/worldgen/test_worldgen.py` (new): `python tools/worldgen/test_worldgen.py [--seeds N] [--size standard|large]`.
- `tools/worldgen/README.md`: countries, snow, `--size` and the tests.

### Task 1: The snow biome

**Files:** modify `model.py`, `climate.py`, `roads.py` and `mapdraw.py`; create `test_worldgen.py`.

**Interfaces:**
- Produces: `climate.SNOW` (biome index 11), `climate.SNOW_BELOW = 40`, `model.BIOMES[11] == 'snow'` and `roads.COVER[SNOW] == 12`.
- Produces: `test_worldgen.py`'s runner. `CHECKS` lists check functions, each returning a list of problems. `worlds()` yields the sampled worlds, generated once and shared by every world check. By default these are standard `5eed0001`, `5eed0002`, `5eed0003` and `5eed000a` (snowy), plus large `5eed0001`. `--seeds N --size S` samples seeds `5eed0001` onward instead.

- [ ] **Step 1: Write the failing checks** in `test_worldgen.py`:
  - `snow_on_cold_lowland`: `climate.biomes` on a 5×3 all-land grid, with elevation 200 except 400 at cell 7, moisture 100, and river and coast zero. At temperature 39 every cell is `SNOW` but cell 7, which is `HILLS`. At temperature 40 every cell is `GRASSLAND` but cell 7.
  - `lone_snow_melts`: the same grid at temperature 100, with 30 at cell 7 and elevation 200 everywhere, holds no `SNOW`.
  - `snow_is_uninhabitable`: `settle.habitability` on a 9×9 all-`SNOW` grid at temperature 30 scores 0 everywhere. The same grid as `GRASSLAND` scores above 0 somewhere.
  - `snow_places_build`: `place.build(PlaceContext(seed=1, name='snow', biome='snow', temperature=20, moisture=100, wonder='geyser'))` returns a `Layout`.
  - `snow_only_on_cold_lowland` (world check): every `SNOW` cell has temperature below 40 and elevation below `HILLS_AT`, and some sampled world has snow.
- [ ] **Step 2: Run** `python tools/worldgen/test_worldgen.py`. Expected: an `ImportError` on `SNOW`.
- [ ] **Step 3: Implement.**
  - Append `'snow'` to `BIOMES`.
  - In `climate.biomes`, add `elif t < SNOW_BELOW: b = SNOW` right after the `HILLS` branch, and add `SNOW` to `_despeckle`'s soft covers.
  - Add `SNOW: 12` to `roads.COVER`, between conifer at 10 and hills at 14 (unsourced estimate).
  - In `mapdraw._terrain`, fill a snow cell with `PALETTE['WHITE']`, with a comment that it stands in until Task 6.
- [ ] **Step 4: Run** the test script: every check prints `ok`. Run `python tools/worldgen/generate.py --seed 5eed000a` and look at `country.png` for white snow on the cold edge.
- [ ] **Step 5: Commit** `feat(worldgen): add a snow biome for cold lowland`.

### Task 2: Count, capitals and growth

**Files:** create `countries.py`; modify `rng.py` (comment) and `test_worldgen.py`.

**Interfaces:**
- Produces, in `countries.py`:
  - `COUNTRY = 13`, the world stream, and `COUNT, COLOUR = range(2)`, its sub-purposes;
  - `COLOURS = 5`, `CAPITAL_TIERS = ('capital', 'city', 'town')`;
  - `RIVER_STEP = 30`, added per river size on entering a river cell;
  - `WATER = 640`, the sixteenths of a grassland step that entering sea or lake costs;
  - `@dataclass(frozen=True) class Country: id: int; capital: int; colour: int`, where `id` runs 1–K and `capital` is a settlement id;
  - `count(seed) -> int`, which is `3 + below(3, seed, COUNTRY, COUNT)`;
  - `capitals(settlements, k, land) -> list[int]`, settlement ids in the order chosen;
  - `grow(width, height, biome, river, receiver, sources) -> list[int]`, a label per cell, 1 to `len(sources)` in source order, water included.

- [ ] **Step 1: Write the failing checks:**
  - `count_is_three_to_five`: `{count(s) for s in range(1000)} == {3, 4, 5}`.
  - `capitals_spaced_in_population_order`, with `S` as settlements (id, x, y, tier, population): (0, 0, 0, capital, 90,000), (1, 1, 0, city, 60,000), (2, 10, 0, town, 9,000), (3, 20, 0, village, 900) and (4, 0, 10, town, 6,000).
    - `capitals(S, 3, 300) == [0, 2, 4]`: spacing `isqrt(100)` is 10, 1 sits too close to 0, and 3 is a village.
    - `capitals(S, 3, 900) == [0, 2, 4]`: the spacing runs 17, 12, then 9 before three fit.
    - `capitals(S, 5, 300) == [0, 1, 2, 4]`: only four are towns or larger, so the spacing reaches 0 and the loop ends.
  - `grow_breaks_ties_by_cost_then_cell`: a 7×1 grassland strip with sources `[0, 6]` gives `[1, 1, 1, 1, 2, 2, 2]`.
  - `grow_bends_to_mountains`: the same strip with `MOUNTAIN` at cell 2 gives `[1, 1, 1, 2, 2, 2, 2]`.
  - `island_joins_the_cheaper_crossing`: the 9×1 strip `G G G O G O O G G` (`O` for ocean), with sources `[0, 8]`, gives label 1 at cell 4.
  - `diagonal_never_slips`: a 3×3 grassland grid with sources `[0, 8]` labels cell 4 as 1, a tie at cost 14. It labels it 2 when cells 1 and 3 are river size 1 with `receiver[1] == 3`. It also labels it 2 when cells 1 and 3 are ocean.
- [ ] **Step 2: Run** the test script. Expected: `ModuleNotFoundError: countries`.
- [ ] **Step 3: Implement.**
  - `capitals` keeps candidates whose tier is in `CAPITAL_TIERS`, in id order, which is population order.
  - The spacing starts at `isqrt(land // k)`. A pass takes each candidate whose squared distance to every chosen capital is at least the spacing squared, and stops at `k`.
  - After a short pass, it returns what it has if the spacing is 0; otherwise the spacing becomes `spacing * 3 // 4`.
  - `grow` is this loop. The heap key (cost, cell) is unique, so the labels never depend on heap internals or move order:

    ```python
    cost, label = [BIG] * n, [0] * n
    for k, cell in enumerate(sources, 1):
        cost[cell], label[cell] = 0, k
    heap = [(0, cell) for cell in sources]
    heapq.heapify(heap)
    while heap:
        d, c = heapq.heappop(heap)
        if d > cost[c]:
            continue
        for m in nbrs[c]:
            if _slips(c, m, width, wet, river, receiver):
                continue
            nd = d + (14 if diagonal else 10) * enter[m] // 16 + RIVER_STEP * river[m]
            if nd < cost[m]:
                cost[m], label[m] = nd, label[c]
                heapq.heappush(heap, (nd, m))
    ```

    - `enter[m]` is `WATER` for ocean or lake, else `16 + COVER[biome[m]]`.
    - `_slips` is true for a diagonal step between two land cells whose side cells `c + dx` and `c + dy * width` hold any water. It is also true for any diagonal whose side cells are river cells flowing into each other, the rule `roads._steps` applies to routes.
  - Add `# Next world streams: COUNTRY = 13 (countries.py until the port), then NAME = 14.` under the stream list in `rng.py`.
- [ ] **Step 4: Run** the test script, then `python tools/worldgen/vectors.py --check`. Expected: every check `ok`, and `kernels.json matches`.
- [ ] **Step 5: Commit** `feat(worldgen): pick capitals and grow countries over terrain`.

### Task 3: The stage in the world

**Files:** modify `countries.py`, `world.py` and `test_worldgen.py`.

**Interfaces:**
- Consumes: Task 2's functions.
- Produces:
  - `found(seed, width, height, biome, river, receiver, settlements, land) -> (bytearray, list[Country])`. It sets each capital's `tier` to `'capital'` and changes nothing else on a settlement.
  - `World.country`, a `bytearray` per cell: 0 for water, 1–K for land.
  - `World.countries`, a list of `Country` in id order.
  - `world.SIZES = {'standard': (96, 64), 'large': (192, 128)}`.

- [ ] **Step 1: Write the failing world checks:**
  - `countries_cover_the_land`, for each sampled world:
    - K is 3–5, and the ids run 1 to K;
    - every land cell holds a country from 1 to K, and every water cell 0;
    - each capital's cell holds its own country, and the capitals are distinct;
    - settlement 0 is the first capital;
    - every capital has the tier `capital` and a population of at least 5,000;
    - each country holds at least 3 settlements, counted by `world.country[s.uid]`;
    - the colours are distinct and in `range(5)`.
  - `stage_only_retiers_capitals`: settlement ids run 0 to n−1, and populations never rise with id. Every settlement that isn't a capital keeps `settle._tier(s.id, s.population)`.
  - `fingerprint_covers_countries`: a second `generate` of the same seed gives the same fingerprint. Changing one land cell's country, or one colour, changes it.
- [ ] **Step 2: Run** the test script. Expected: `AttributeError: 'World' object has no attribute 'country'`.
- [ ] **Step 3: Implement.**
  - `found` draws `count(seed)` and calls `capitals`, then `grow` with the capitals' cells. While a country other than the first holds fewer than `MIN_SETTLEMENTS = 3` settlements, it passes over that country's capital, the least populous first, and picks and grows again (Ruling 6, checked by `small_countries_pass_their_capital_on`). It zeroes the water and takes `shuffled(range(COLOURS), seed, COUNTRY, COLOUR)[k - 1]` as country k's colour.
  - In `generate`, compute `land` once and call `countries.found` between `settle.settle` and `settle.farm`.
  - `fingerprint` feeds, after the landmarks, `len(world.countries)` with each country's capital and colour, then `len(world.country)` and the column.
  - `summary` adds one line per country: `country 1: capital-0 at (101,57), colour 2, 3,012 land cells (25%), 47 settlements`.
- [ ] **Step 4: Run** the test script, then `python tools/worldgen/export_map.py --check`. Expected: every check `ok`, and `town.nmap matches its generator`.
- [ ] **Step 5: Commit** `feat(worldgen): add the countries stage to the world`.

### Task 4: Countries in the previews

**Files:** modify `mapdraw.py`, `generate.py`, `world.py` (`main`) and `test_worldgen.py`.

**Interfaces:**
- Consumes: `World.country` and `World.countries`.
- Produces:
  - `mapdraw.COUNTRY_COLOURS`, the five provisional RGB tuples of Ruling 5;
  - `mapdraw.BORDER`, a neutral palette colour, starting at `PALETTE['OUTLINE']`;
  - `mapdraw._borders(view, pen, line, band)`;
  - `mapdraw.countries_png(world, path)`;
  - `generate.py --size standard|large`, written to `dist/worldgen/<seed>/`, or to `dist/worldgen/<seed>-large/` for a large world.

- [ ] **Step 1: Write the failing checks:**
  - `borders_draw_on_cell_edges`: `_borders` draws on a blank image for a 2×1 stand-in world, `SimpleNamespace(width=2, height=1, country=bytearray([1, 2]), countries=[Country(1, 0, 0), Country(2, 1, 1)])`.
    - At 8 px with `line=1, band=1`, columns 6, 7 and 8 of every row are colour 0, `BORDER` and colour 1, and columns 5 and 9 stay blank.
    - At 16 px with `line=2, band=2`, columns 13–14 are colour 0, 15–16 `BORDER` and 17–18 colour 1.
    - A 1×2 world draws the same in rows.
    - A 3×1 world `[1, 0, 2]` draws nothing, since a coast is no border.
  - `previews_write`: `country_png`, `region_png` and `countries_png` of standard `5eed0001` write PNGs of 1536×1024, 960×544 and 1536×1024 px, at the 2× save scale.
- [ ] **Step 2: Run** the test script. Expected: `ImportError: cannot import name 'COUNTRY_COLOURS'`.
- [ ] **Step 3: Implement.**
  - `_borders` takes each land cell and its east and south neighbours, and finds the edges between two different countries. It draws every band first, then every line, so lines run unbroken over the corners.
  - Across an edge at pixel `X`, the line spans `X - (line + 1) // 2` to `X + line // 2 - 1`. Each band lies just beyond the line on its own side, `band` px wide.
  - `country_png` draws `_borders(view, pen, 1, 1)` after the bridges, and `region_png` draws `_borders(view, pen, 2, 2)`.
  - `countries_png` fills each land cell with its country's colour on a water background. It then draws `_borders(view, pen, 1, 1)` and every overlay except peaks.
  - Update `mapdraw`'s docstring: the country colours are the one exception to "palette colours only".
  - In `generate.py` and `world.py`'s `main`, add `--size` (default `standard`) and write `countries.png`.
- [ ] **Step 4: Run** the test script, then tune by eye. Draw large `5eed0001`, `5eed0002`, `5eed0009` and `5eed000a`, and look at `country.png`, `region.png` and `countries.png`.
  - Raise `RIVER_STEP` if borders ignore rivers, lower `WATER` if islands join implausibly distant countries, and pick `BORDER` for contrast on grass, forest and sand.
  - The tuned values replace the starting ones in the constants, and the report names any change.
- [ ] **Step 5: Commit** `feat(worldgen): draw countries in the world previews`.

### Task 5: Pin, sweep and preview for the owner

**Files:** modify `test_worldgen.py` and `README.md`.

- [ ] **Step 1: Pin two fingerprints** in `fingerprints_are_pinned`: standard `5eed0001` and large `5eed0001`, the exact values `world.py` prints after tuning. Run the test script. Expected: every check `ok`.
- [ ] **Step 2: Sweep.** Run `python tools/worldgen/test_worldgen.py --seeds 100 --size standard`, then the same with `--size large`. Expected: every check `ok` on every world. Report the smallest country's share of land and its settlement count, and the island worlds' capital-less landmasses of 50 cells or more.
- [ ] **Step 3: Commit** `test(worldgen): pin two world fingerprints`.
- [ ] **Step 4: README.** Add the countries stage after Settlements, `snow` among the biomes, `--size large`, `countries.png` and the test command. Commit `docs(worldgen): describe countries, snow and large worlds`.
- [ ] **Step 5: Owner previews.** Run `python tools/worldgen/generate.py --size large --seed S` for two seeds of each template:
  - peninsula: `5eed0001` and `5eed0008`;
  - twin isles: `5eed0002` and `5eed0006`;
  - continent: `5eed0003` and `5eed000a`;
  - coast: `5eed0004` and `5eed0007`;
  - archipelago: `5eed0009` and `5eed000c`.

  Hand the `dist/worldgen/<seed>-large/` paths to the owner. Version 1 doesn't freeze until the owner has reviewed them.
- [ ] **Step 6: Gates.** Run the six gate commands of the Global constraints. Expected: all pass, and `export_map.py --check` prints `town.nmap matches its generator`.

### Task 6: The two snow tiles (done)

`tools/sprites` lies outside the Python-first boundary, so the orchestrator assigned this task. Done on 9 October 2026: 5e58bf0 draws `map8_snow` and `map16_snow`, and ef9b801 draws them in the previews.
- Draw `map8_snow` and `map16_snow` as code in `tools/sprites/map.py`, under the README's art rules.
- Rebuild with `build_all.py`, which refreshes `assets/LICENSES.md`, and pass `test_sprites.py`.
- Delete `mapdraw`'s stand-in, so `_tile` returns `map{size}_snow` like every other biome.
- The owner reviews the tiles.

## Part 2: the TypeScript port

> **Status:** step plan (9 October 2026). The owner asked for the map now, so it is written before M0.7 closes. Tasks 7–32 need only M0.7's layout, which is done. Task 33 builds on M0.7's word script, which landed in 60e4f8e, and Task 34 waits for the owner's review of 100 names.

**Goal:** `@nomos/worldgen` makes the same world as `tools/worldgen` for every seed, in a worker of its own. Every stage's fingerprint matches Python's in Node, Bun, Chromium, Firefox and WebKit. A standard world takes ≤ 100 ms and a large one ≤ 400 ms in desktop Chromium. The port adds regions and market territories, and names once M0.7's sound set lands.

**Architecture:**
- **Goldens.** `tools/worldgen/goldens.py` runs `world.generate`'s stages with `terrain.shape` and `drainage.drain` opened up. It folds each stage's output into a 32-bit fingerprint, for 100 seeds of each size, in `packages/worldgen/test/fixtures/goldens-v1.json`.
- **A mirror in TypeScript.** `packages/worldgen/test/engines/stages.ts` runs the same stages the same way and folds them. Each port task translates a few Python functions, line for line, and appends its stage's block to the mirror. A task is done when its fingerprints match.
- **The whole world.** `generateWorld` composes the ported stages and packs interfaces.md's `WorldMap`. `worldFingerprint` reproduces `world.fingerprint`, so the mirror's last stage proves the whole pipeline.
- **TypeScript-only stages.** Regions and names have no Python; their fingerprints are frozen from TypeScript in `frozen-v1.json`.
- **The map worker:** two small modules in `apps/web/src/map/` answer a `generate` message. M8.3 starts the worker and draws the map.

**Tech stack:** TypeScript 6 (strict, erasable syntax only), Vitest 5, Playwright with esbuild for the browser bundle, Bun 1.3 in CI, and Python 3.12 or later for the goldens.

**Spec:** the Python functions each task names are the spec. The contract is [interfaces.md, The world map](../../m0-pipeline/interfaces.md#the-world-map-owner-m81), and the exit checks are in [task.md](task.md).

### Who does what

"Junior" tasks run from this plan alone. Where code is given, type it as given; elsewhere the Python function is the spec, with the signatures, traps and mirror block below. The senior reviews each task before the next starts. "Senior" tasks need judgment.

| Task | What | Who | Needs |
| --- | --- | --- | --- |
| 7 | The country and name streams in `rng.py` | Junior | — |
| 8 | `goldens.py` and `goldens-v1.json` | Junior, exact code | 7 |
| 9 | The package, the kernel exports and the world-map codes | Junior, exact code | 8 |
| 10 | The generator lint and the dependency rules | Junior, exact code | 9 |
| 11 | Grid helpers, the heap, keyed draws and the fold | Junior, exact code | 9 |
| 12 | The golden harness and the falloff stage | Junior | 10, 11 |
| 13 | Five engines: the browser spec and CI | Junior, exact code | 12 |
| 14 | Relief and mountain chains | Junior | 12 |
| 15 | Raw height, land and the shape | Junior | 14 |
| 16 | Rain | Junior | 15 |
| 17 | Erosion: flood, accumulate and erode | Junior | 16 |
| 18 | Lakes, rivers and drainage | Junior | 17 |
| 19 | Temperature, moisture and coasts | Junior | 18 |
| 20 | Biomes, slopes and habitability | Junior | 19 |
| 21 | Settlements | Junior | 20 |
| 22 | Countries | Junior | 21 |
| 23 | Regions and market territories, and `frozen-v1.json` | Senior | 22 |
| 24 | Farmland and the route graph | Junior | 22 |
| 25 | Roads | Junior | 24 |
| 26 | Sea lanes | Junior | 24 |
| 27 | The survey and wonders | Junior | 25 |
| 28 | Landmarks | Junior | 27 |
| 29 | `generateWorld`, the `WorldMap` and the world fingerprint | Junior, exact code | 23, 26, 28 |
| 30 | Stand-in names and the map worker | Junior, exact code | 29 |
| 31 | The generation budget in a browser worker | Senior | 29 |
| 32 | The exit sweeps and the identity test | Junior, exact code | 29 |
| 33 | The place-name table and the picker | Senior, then junior | M0.7's `words.ts`, 30 |
| 34 | The owner's 100 names and the version 1 freeze | Senior and owner | 33 |
| 35 | Close M8.1 | Senior | 31–34 |

Tasks 24–28 don't touch Task 23's files, so they may run while the senior builds regions; the mirror then gains the regions block between countries and farmland.

### Global constraints

- **Integers only,** as in Part 1. Every random value comes from the keyed draw, on the stage's own stream.
- **`code.md` and the lints:** complexity ≤ 10 and depth ≤ 4 per function, and no nested ternaries. Split a long Python function into named helpers; never `eslint-disable`. Comment only the why.
- **Edit only the files a task names.** Shared files a task changes are named in its Files line.
- **Other agents share this tree,** M0.7's names among them:
  - stage with `git add <paths>` and commit with `git commit -- <paths>`;
  - before committing a shared file, check that `git diff <file>` shows only your hunks;
  - never `git add -A`, `git stash`, `git push` or `--no-verify`.
- **Commits:** `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`, each body starting `Task: M8.1 World generator, part 2: the TypeScript port`. Code and docs never share a commit.
- **Gates before every commit:** `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names`. From Task 12, also `node packages/worldgen/scripts/engines.ts`. A Python task also runs `python tools/worldgen/test_worldgen.py` and `vectors.py`, `mapfile.py` and `export_map.py` with `--check`.
- **The sim never moves:** `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- **Nothing reaches the first load.** The town has 234 B left under its 17 kB stand-in. No task here may add a byte to the entry, sim worker or renderer chunks.
- **A test that fails in another agent's files** may be their work in progress. Rerun once, and report it if it persists.

### Porting rules

Read these before every port task. Each catches a way a line-by-line port drifts from Python.

1. **Names and homes.** One Python function becomes one TypeScript function in camelCase, with the same parameters in the same order, in the file the task names: `_near_chain` becomes `nearChain`. Constants keep their Python names in upper case. Python's sub-purpose constants, such as `PICK, LAND, ... = range(7)`, keep their values exactly.
2. **Types.**
   - A Python `bytearray` becomes a `Uint8Array`. Python raises on a value over 255, so the values fit.
   - A per-cell Python list of ints becomes an `Int32Array`, never anything narrower: a typed array wraps silently where Python's ints grow.
   - Short lists, such as settlements and paths, become `number[]`. A Python dataclass becomes the interface the task gives.
   - Copy before changing: `list(x)` and `bytearray(x)` become `x.slice()`.
3. **Division and remainder.** The lint bans bare `/` and `%`, and floors are the reason.
   - Every `a // b` becomes `floorDiv(a, b)`, even when both look positive.
   - `a % b` becomes `floorMod(a, b)`. An unsigned draw's remainder, `draw(...) % n`, becomes `(draw(...) >>> 0) % n`.
   - A cell's coordinates are `xOf(cell, width)` and `yOf(cell, width)`.
4. **Python evaluates `*`, `//` and `%` left to right at one precedence.** `top // rank * f // 1000` is `floorDiv(floorDiv(top, rank) * f, 1000)`. Unary minus binds tighter: `-a // b` is `floorDiv(-a, b)`. In `A if c else B`, all of `A` is the branch.
5. **Draws.** Python's `draw(seed, S, a, b)` is `draw(seed, S, a, b)` from the kernels, or `draw2(seed, S, a, b)` in a loop over cells. Keep the keys and their order exactly. Python's `below(n, seed, S, *key)` is the kernels' `below`. A draw is a uint32: shift it with `>>>`, never `>>`.
6. **Roots and rounding.** `isqrt` from the kernels. The lint bans `Math.sqrt`, `trunc`, `round` and `ceil`.
7. **Ties.** `if best is None or key > best[0]` keeps the first of equal keys: compare with strict `>`, part by part, left to right. `min(xs, key=lambda i: (e[i], i))` is a loop with the same comparison. `max(counts)` with `counts.index(...)` is the first maximum.
8. **Sorting.** `sorted(xs, key=k)` becomes `.sort(cmp)` with a comparator that compares the same key parts left to right, such as `(a, b) => ka - kb || a - b`. `reverse=True` reverses every part: `(a, b) => kb - ka || b - a`. Every comparator is a total order: it never returns 0 for two different items.
9. **Heaps.** `heapq` with tuple keys becomes `MinHeap` from `grid/heap.ts`. `push(a, b, c)` takes the tuple's parts, and `pop()` leaves the smallest key in `heap.a`, `heap.b` and `heap.c`. Every heap here ends its key with a cell or a settlement index, so any correct heap pops in Python's order.
10. **Dicts and sets.** A membership set becomes a `Uint8Array(n)` of flags or a `Set<number>`. A dict whose order matters, such as `features.CHANCES`, becomes an array in Python's insertion order. `cost.get(m, d)` becomes a typed array holding a sentinel for "not seen".
11. **Simultaneous assignment.** `a, b = x, y` evaluates both right-hand sides first: in `_islands`, `first[i], second[i] = f, first[i]` keeps the old `first[i]` as the new `second[i]`.
12. **Neighbours.** `neighbours(width, height)` from `grid/grid.ts` lists north, east, south and west, then north-east, south-east, south-west and north-west, skipping cells off the map, as `grid.py` does. Walk a cell's list with `for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++)`.
13. **Truthiness and chains.** `if h:` is `h !== 0`; `0 <= x < w` is `0 <= x && x < w`; `any(...)` and `all(...)` are loops that stop early. `min(..., default=d)` returns `d` for nothing, so track whether anything was seen.
14. **When a fingerprint differs,** compare one function at a time with Python. For example, `python -c "import sys; sys.path.insert(0, 'tools/worldgen'); import terrain; print(terrain._blob(5, 3, 2, 1, 2, 1))"`, against the same call in a Node scratch script.

### Review focus

- A `//` ported as `Math.floor(a / b)` inside a helper, or as `| 0` or `>> 0`: only `floorDiv` floors.
- A typed array narrower than its values, or a `subarray` view where Python copies.
- A comparator that returns 0 for two different items.
- `_islands`' simultaneous assignment, and `_chain`'s `% 16` of a negative bearing.
- `features.CHANCES` in Python's order, and `shuffled` keyed on the position in the filtered list.
- The A\* scratch arrays reset between walks.
- The capital's clock tower moved to the front, as Python's `remove` and `insert(0, ...)` do.

### Rulings (agent, 9 October 2026; the owner can overturn them)

7. **The codes live in `sim-protocol`.** `WorldMap`, its name tables and the map worker's messages sit in `sim-protocol`'s leaf module `world-map/world-map.ts`, which `worldgen` imports. Each code then has one home, and `render-gl` draws a map without importing `worldgen`.
8. **The goldens.** 23 stages for 100 seeds of each size, from `5EED0001`. A stage's fingerprint folds each output's length and then its values. The mirror in `goldens.py` must equal `world.generate` on its first 2 seeds of each size, or the script stops. Vitest checks the first 10 standard and 2 large worlds on every run, a script all 200 in Node and Bun, and a spec all 200 in three browsers.
9. **`isqrt` joins `sim-core`'s `maths/int.ts`,** the home of exact integer maths, and the kernels export it. It is the float root corrected by one either way, exact below 2^52.
10. **Regions, provisional,** for M7.3 to adopt or revise:
    - every capital, city and town seats a region, in id order;
    - a country's regions grow from its own seats by the countries' growth, over its own land and any water, so every land cell gets a region of its own country;
    - market territories grow from the same seats with no fence.

    Large worlds `5eed0001`–`5eed0006` held 1–7 seats per country, and standard ones 1–7 (measured here). Over all 200 golden worlds, as built in Task 23 (measured here):
    - **Regions per country:** 1–12 in standard worlds and 1–11 in large ones, with a median of 3 and a mean of 3.7. Task 33's sweep and M8.3's Region view expect up to 12, and countries of a single region.
    - **Regions per world:** 11–19.
    - **Land whose market lies in another country:** 11–12% in the median world, and 25% at most.

    A one-region country is its capital's region.
11. **`variant` per cell.** The generator stores `mapdraw.py`'s keyed tile variant, so `render-gl` needs no draw.
12. **The map worker lives in `apps/web/src/map/`:** `generate.ts` answers a message, and `map-worker.ts` binds it. The page starts it by URL, so its chunk is `map-worker-*.js`, apart from the sim worker's `worker-*.js`.
13. **Stand-in names** keep M8.3's labels unblocked: `country-1`, and `capital-0` or `town-12` as Python names settlements, until Task 33 lands.
14. **Python's world streams all move to `rng.py`:** `COUNTRY` = 13 moves in from `countries.py`, and `NAME` = 14 is appended, settling Part 1's Ruling 1.
15. **`place_contexts` waits for M9.** The map needs no place seeds or contexts, and Python already keys them on the cell. M9 ports them with `place.py`.

### Files

- `tools/worldgen/rng.py`, `countries.py` (Task 7), `goldens.py` (new, Task 8) and `README.md` (Task 35).
- `packages/sim-core/src/kernels.ts`, `src/maths/int.ts`, `test/int.test.ts` and `test/fixtures/kernels.json` (Tasks 7 and 9).
- `packages/sim-protocol/package.json`, `src/world-map/world-map.ts` (new) and `test/world-map.test.ts` (new) (Task 9).
- `packages/worldgen/` (new): `package.json`, `tsconfig.json`, `src/` as interfaces.md lays it out, `test/`, `test/engines/`, `test/browser/`, `test/fixtures/` and `scripts/`.
- `apps/web/package.json`, `src/map/generate.ts` (new), `src/map/map-worker.ts` (new) and `test/map-worker.test.ts` (new) (Task 30).
- Root: `eslint.config.js`, `.dependency-cruiser.cjs` and `pnpm-lock.yaml` (Tasks 9, 10 and 30), and `.github/workflows/ci.yml` (Tasks 13, 23 and 32).

### Task 7: The country and name streams in `rng.py` (junior)

**Files:** modify `tools/worldgen/rng.py` and `tools/worldgen/countries.py`; regenerate `packages/sim-core/test/fixtures/kernels.json`.

- [ ] **Step 1: Move the stream.** In `rng.py`, replace the line `# Next world streams: COUNTRY = 13 (countries.py until the port), then NAME = 14.` with:

  ```python
  COUNTRY, NAME = 13, 14
  ```

  In `countries.py`, delete the comment block and `COUNTRY = 13` above `COUNT, COLOUR = range(2)`, and change the import to `from rng import COUNTRY, below, shuffled`.
- [ ] **Step 2: Regenerate the vectors.** Run `python tools/worldgen/vectors.py`, then `python tools/worldgen/vectors.py --check`. Expected: `streams: 14 cases`, then `packages/sim-core/test/fixtures/kernels.json matches`. `git diff` of `kernels.json` shows only `"COUNTRY": 13` and `"NAME": 14` added.
- [ ] **Step 3: Gates.** `python tools/worldgen/test_worldgen.py` prints `ok` for every check, `export_map.py --check` and `mapfile.py --check` match, and `pnpm test` passes: `looks.test.ts` checks the new streams stay below the agent salt.
- [ ] **Step 4: Commit** `feat(worldgen): move the country stream into rng.py and add NAME`, with the three files.

### Task 8: `goldens.py` and `goldens-v1.json` (junior, exact code)

**Files:** create `tools/worldgen/goldens.py`; it writes `packages/worldgen/test/fixtures/goldens-v1.json`.

- [ ] **Step 1: Write `goldens.py`** exactly as below. It was checked against `world.generate` on 3 seeds of each size (computed here).

  ```python
  """Per-stage golden fingerprints for the TypeScript port: python tools/worldgen/goldens.py [--seeds N] [--check]

  Runs world.generate's stages in order, with terrain.shape and drainage.drain opened up, and folds each stage's output
  into a 32-bit fingerprint, so a port that drifts names the stage where it starts. The mirror must match
  world.generate: on the first CHECKED seeds of each size it compares its world fingerprint with world.fingerprint of
  world.generate, and stops on a difference. Writes packages/worldgen/test/fixtures/goldens-v1.json. --check compares
  the committed file's first N worlds of each size with a fresh run instead.
  """
  import argparse
  import json
  import sys
  from concurrent.futures import ProcessPoolExecutor
  from pathlib import Path

  HERE = Path(__file__).resolve().parent
  sys.path.insert(0, str(HERE))

  import climate  # noqa: E402
  import countries  # noqa: E402
  import drainage  # noqa: E402
  import features  # noqa: E402
  import rng  # noqa: E402
  import roads  # noqa: E402
  import settle  # noqa: E402
  import terrain  # noqa: E402
  from grid import neighbours, parts  # noqa: E402
  from model import BIOMES, LANDMARKS, TIERS, WONDERS  # noqa: E402
  from noise import fbm  # noqa: E402
  from rng import ELEVATION, SHAPE, below, draw, mix  # noqa: E402
  from world import SIZES, World, fingerprint, generate  # noqa: E402

  ROOT = HERE.parents[1]
  FIXTURE = ROOT / 'packages' / 'worldgen' / 'test' / 'fixtures' / 'goldens-v1.json'
  VERSION = 1
  FIRST = 0x5EED0001
  SEEDS = 100
  CHECKED = 2
  FOLD_SEED = 0x57A6E
  SIDES = 'nesw'
  STAGES = ('falloff', 'relief', 'chains', 'raw', 'land', 'shape', 'rain', 'erode', 'lakes', 'drain', 'climate',
            'biomes', 'habitability', 'settle', 'countries', 'farm', 'routes', 'roads', 'lanes', 'survey', 'wonders',
            'landmarks', 'world')


  def fold(*parts_):
      """Each part is a sequence or one number; its length goes in first, then its values, as world.fingerprint feeds."""
      h = mix(FOLD_SEED)
      for part in parts_:
          values = part if isinstance(part, (list, tuple, bytes, bytearray)) else [part]
          h = mix(h ^ len(values))
          for v in values:
              h = mix(h ^ (v & rng.MASK))
      return h


  def rows(records):
      return [v for record in records for v in record]


  def paths(cell_paths):
      return [v for path in cell_paths for v in (len(path), *path)]


  def shape(seed, width, height, out):
      """terrain.shape, line for line, with a fold after each step."""
      t = terrain
      n = width * height
      template = t.TEMPLATES[below(len(t.TEMPLATES), seed, SHAPE, t.PICK)]
      lo, hi = t.LAND_PERMILLE[template]
      land_target = lo + below(hi - lo + 1, seed, SHAPE, t.LAND)
      falloff = [max(-4 * t.ONE, min(3 * t.ONE, f + e)) for f, e in
                 zip(t.SHAPES[template](seed, width, height, land_target), t._edges(seed, width, height, template))]
      out['falloff'] = fold(t.TEMPLATES.index(template), land_target, falloff)
      relief = [(fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * t.RELIEF // 16 for y in range(height) for x in range(width)]
      out['relief'] = fold(relief)
      coast = sorted(f + r for f, r in zip(falloff, relief))[n - n * land_target // 1000]
      rise = [f - coast for f in falloff]
      chains = t._chains(seed, width, height, rise)
      out['chains'] = fold(coast, chains)
      raw = [t.PLATEAU * min(u, t.RAMP) // t.RAMP + max(0, u - t.RAMP) // 16 + r + c if u > 0 else u + r + c
             for u, r, c in zip(rise, relief, chains)]
      raw = [v + draw(seed, ELEVATION, t.GRAIN, i) % (2 * t.GRAIN_RAW + 1) - t.GRAIN_RAW for i, v in enumerate(raw)]
      sea = sorted(raw)[n - n * land_target // 1000]
      out['raw'] = fold(sea, raw)
      land = t._tidy(bytearray(1 if v > sea else 0 for v in raw), width, height)
      out['land'] = fold(land)
      elevation = [min(t.TOP, max(1, 1 + (v - sea) * t.SCALE // t.ONE)) if land[i]
                   else max(-t.TOP, min(0, (v - sea) * t.SCALE // t.ONE)) for i, v in enumerate(raw)]
      water = bytearray(1 - v for v in land)
      label, _ = parts(neighbours(width, height), water)
      edge = set(label[i] for i in t._border(width, height) if water[i])
      ocean = bytearray(1 if water[i] and label[i] in edge else 0 for i in range(n))
      out['shape'] = fold(t.TEMPLATES.index(template), elevation, ocean)
      return template, elevation, ocean


  def drain(seed, width, height, elevation, ocean, rain, out):
      """drainage.drain, line for line: each erosion pass, then lakes, then the final drainage."""
      d = drainage
      passes = []
      for _ in range(d.EROSION_PASSES):
          filled, receiver, order = d.flood(seed, width, height, elevation, ocean)
          flow = d.accumulate(order, receiver, rain, ocean)
          elevation = d._erode(elevation, filled, receiver, flow, ocean)
          passes += [filled, receiver, order, flow, elevation]
      out['erode'] = fold(*passes)
      filled, receiver, order = d.flood(seed, width, height, elevation, ocean)
      lake, terminal, elevation = d._lakes(width, height, elevation, filled, ocean)
      out['lakes'] = fold(filled, receiver, order, lake, terminal, elevation)
      if any(terminal):
          sinks = bytearray(o | t for o, t in zip(ocean, terminal))
          filled, receiver, order = d.flood(seed, width, height, elevation, sinks)
          elevation = [f if f > e and not lake[i] else e for i, (e, f) in enumerate(zip(elevation, filled))]
      flow = d.accumulate(order, receiver, rain, ocean)
      river = d.rivers(width, height, flow, receiver, lake, ocean)
      out['drain'] = fold(elevation, lake, receiver, flow, river)
      return elevation, lake, receiver, river


  def stages(size, seed, check):
      """world.generate, line for line, folding each stage. Returns the fingerprints in STAGES order, as hex."""
      width, height = SIZES[size]
      out = {}
      w = World(seed, width, height)
      w.template, elevation, ocean = shape(seed, width, height, out)
      wet, w.wind = climate.rain(seed, width, height, elevation, ocean)
      out['rain'] = fold(SIDES.index(w.wind), wet)
      w.elevation, lake, w.receiver, w.river = drain(seed, width, height, elevation, ocean, wet, out)
      water = bytearray(o | k for o, k in zip(ocean, lake))
      w.temperature, w.cold = climate.temperature(seed, width, height, w.elevation)
      w.moisture = climate.moisture(seed, width, height, wet, water, w.river)
      w.coast = climate.coasts(width, height, w.elevation, ocean)
      out['climate'] = fold(SIDES.index(w.cold), w.temperature, w.moisture, w.coast)
      w.biome = climate.biomes(seed, width, height, w.elevation, w.temperature, w.moisture, ocean, lake, w.river, w.coast)
      out['biomes'] = fold(w.biome)
      slope = climate.slopes(width, height, w.elevation, water)
      score = settle.habitability(width, height, w.biome, w.elevation, w.river, w.coast, w.temperature, w.moisture, slope)
      out['habitability'] = fold(slope, score)
      land = len(water) - sum(water)
      w.settlements = settle.settle(seed, width, height, score, land)
      out['settle'] = fold(rows((s.id, s.x, s.y, TIERS.index(s.tier), s.population, s.uid) for s in w.settlements))
      w.country, w.countries = countries.found(seed, width, height, w.biome, w.river, w.receiver, w.settlements, land)
      out['countries'] = fold(w.country, rows((c.id, c.capital, c.colour) for c in w.countries),
                              [TIERS.index(s.tier) for s in w.settlements])
      w.biome = settle.farm(seed, width, w.biome, w.settlements)
      out['farm'] = fold(w.biome)
      mass = roads.landmasses(width, height, w.biome)
      out['routes'] = fold(rows(roads.route_graph(w.settlements, [mass[s.uid] for s in w.settlements])))
      w.roads, w.bridges = roads.build(width, height, w.biome, w.elevation, w.river, w.receiver, w.settlements)
      out['roads'] = fold(paths(w.roads), w.bridges)
      w.lanes = roads.lanes(width, height, w.biome, w.settlements)
      out['lanes'] = fold(paths(w.lanes))
      survey = features.survey(w)
      out['survey'] = fold(survey.slope, survey.forest_depth, survey.town, survey.big, survey.wet, survey.hotspot,
                           survey.hot_reach)
      w.wonders = features.wonders(w, survey)
      out['wonders'] = fold(rows((WONDERS.index(p.kind), p.x, p.y) for p in w.wonders))
      w.landmarks = features.landmarks(w, survey, w.wonders)
      out['landmarks'] = fold(rows((LANDMARKS.index(p.kind), p.x, p.y) for p in w.landmarks),
                              paths([LANDMARKS.index(k) for k in s.landmarks] for s in w.settlements))
      out['world'] = fingerprint(w)
      if check and out['world'] != fingerprint(generate(seed, width, height)):
          raise SystemExit(f'goldens.py no longer mirrors world.generate: {size} {seed:08x} differs')
      return ' '.join(f'{out[name]:08x}' for name in STAGES)


  def task(job):
      return stages(*job)


  def build(seeds):
      jobs = [(size, FIRST + k, k < CHECKED) for size in SIZES for k in range(seeds)]
      with ProcessPoolExecutor() as pool:
          prints = list(pool.map(task, jobs))
      return {
          'version': VERSION,
          'stages': list(STAGES),
          'streams': {name: number for name, number in vars(rng).items() if name.isupper() and name != 'MASK'},
          'names': {'biomes': list(BIOMES), 'tiers': list(TIERS), 'wonders': list(WONDERS), 'landmarks': list(LANDMARKS),
                    'templates': list(terrain.TEMPLATES)},
          'sizes': {size: list(cells) for size, cells in SIZES.items()},
          'worlds': [{'size': size, 'seed': seed, 'prints': p} for (size, seed, _), p in zip(jobs, prints)],
      }


  def check(seeds):
      """The committed file's first `seeds` worlds of each size against a fresh run, so CI can check a few quickly."""
      if not FIXTURE.exists():
          return False
      committed = json.loads(FIXTURE.read_text(encoding='utf-8'))
      fresh = build(seeds)
      picked = [w for w in committed['worlds'] if w['seed'] - FIRST < seeds]
      heads = [{k: v for k, v in data.items() if k != 'worlds'} for data in (committed, fresh)]
      return heads[0] == heads[1] and picked == fresh['worlds']


  def main():
      parser = argparse.ArgumentParser(description='Write the per-stage goldens for the TypeScript world generator.')
      parser.add_argument('--seeds', type=int, default=SEEDS, help=f'seeds of each size, from {FIRST:08x}')
      parser.add_argument('--check', action='store_true', help='compare with the committed file instead of writing it')
      args = parser.parse_args()
      name = FIXTURE.relative_to(ROOT).as_posix()
      if args.check:
          if check(args.seeds):
              print(f'{name} matches on {args.seeds} seeds of each size')
              return 0
          print(f'{name} is out of date: run python tools/worldgen/goldens.py and commit the result', file=sys.stderr)
          return 1
      text = json.dumps(build(args.seeds), indent=1) + '\n'
      FIXTURE.parent.mkdir(parents=True, exist_ok=True)
      FIXTURE.write_text(text, encoding='utf-8', newline='\n')
      print(f'wrote {name}: {args.seeds} seeds of each size, {len(STAGES)} stages ({len(text):,} bytes)')
      return 0


  if __name__ == '__main__':
      sys.exit(main())
  ```

- [ ] **Step 2: Run it.** `python tools/worldgen/goldens.py`. It uses every core, about 2 minutes on 12 (estimated from 14 s for 6 worlds here). Expected: `wrote packages/worldgen/test/fixtures/goldens-v1.json: 100 seeds of each size, 23 stages`. In the file, the first world is standard `5EED0001` (1592590337), and its prints end in `1ec8f880`, `test_worldgen.py`'s pinned fingerprint; large `5EED0001`'s end in `867cd479`.
- [ ] **Step 3: Check it.** `python tools/worldgen/goldens.py --check --seeds 3`. Expected: `matches on 3 seeds of each size`. Then the Python gates.
- [ ] **Step 4: Commit** `test(worldgen): write per-stage goldens for the TypeScript port`, with `goldens.py` and `goldens-v1.json`.

### Task 9: The package, the kernel exports and the world-map codes (junior, exact code)

**Files:** modify `packages/sim-core/src/kernels.ts`, `src/maths/int.ts` and `test/int.test.ts`; modify `packages/sim-protocol/package.json`; create `packages/sim-protocol/src/world-map/world-map.ts` and `test/world-map.test.ts`; create `packages/worldgen/package.json`, `tsconfig.json`, `src/random/streams.ts` and `test/codes.test.ts`; `pnpm-lock.yaml` changes. Shared: `kernels.ts`, `int.ts`, `sim-protocol/package.json` and the lockfile.

- [ ] **Step 1: Write the failing tests.**
  - Append to `packages/sim-core/test/int.test.ts`, inside its `describe`, and add `isqrt` to its import:

    ```ts
      it("roots like Python's math.isqrt", () => {
        const cases = [
          [0, 0], [1, 1], [2, 1], [3, 1], [4, 2], [15, 3], [16, 4], [17, 4], [99, 9], [100, 10],
          [2_147_483_647, 46_340], [2_147_483_648, 46_340], [999_999_999_999, 999_999], [1_000_000_000_000, 1_000_000],
          [4_503_599_627_370_495, 67_108_863],
        ];
        for (const [n, root] of cases) expect(isqrt(n), String(n)).toBe(root);
        expect(() => isqrt(-1)).toThrow(RangeError);
      });
    ```

  - Create `packages/sim-protocol/test/world-map.test.ts`:

    ```ts
    import { describe, expect, it } from 'vitest';
    import { LANDMARK_SLOTS, NO_LANDMARK, worldMapBuffers, type WorldMap } from '../src/world-map/world-map.ts';

    function tinyMap(): WorldMap {
      const cells = 6;
      return {
        version: 1,
        seed: 7,
        width: 3,
        height: 2,
        template: 0,
        wind: 1,
        cold: 2,
        elevation: new Int16Array(cells),
        biome: new Uint8Array(cells),
        temperature: new Uint8Array(cells),
        moisture: new Uint8Array(cells),
        river: new Uint8Array(cells),
        receiver: new Int32Array(cells).fill(-1),
        coast: new Uint8Array(cells),
        variant: new Uint8Array(cells),
        country: new Uint8Array(cells),
        region: new Uint16Array(cells),
        market: new Uint16Array(cells),
        settlements: {
          cell: new Int32Array([4]),
          tier: new Uint8Array([0]),
          population: new Int32Array([150_000]),
          country: new Uint8Array([1]),
          region: new Uint16Array([1]),
          landmarks: new Uint8Array(LANDMARK_SLOTS).fill(NO_LANDMARK),
        },
        countries: { capital: new Int32Array([0]), colour: new Uint8Array([2]) },
        regions: { seat: new Int32Array([0]), country: new Uint8Array([1]) },
        roads: { offsets: new Int32Array([0]), cells: new Int32Array(0) },
        lanes: { offsets: new Int32Array([0]), cells: new Int32Array(0) },
        bridges: new Int32Array(0),
        wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
        landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
      };
    }

    function views(value: unknown): ArrayBufferView[] {
      if (ArrayBuffer.isView(value)) return [value];
      if (typeof value !== 'object' || value === null) return [];
      return Object.values(value).flatMap(views);
    }

    describe('the world map', () => {
      it('lists every column buffer once, so one transfer moves them all', () => {
        const map = tinyMap();
        const buffers = worldMapBuffers(map);
        expect(new Set(buffers).size).toBe(buffers.length);
        expect(new Set(buffers)).toEqual(new Set(views(map).map((view) => view.buffer)));
        const moved = structuredClone(map, { transfer: buffers });
        expect(moved.settlements.population[0]).toBe(150_000);
        expect(map.elevation.byteLength).toBe(0);
      });
    });
    ```

  - Create `packages/worldgen/test/codes.test.ts`:

    ```ts
    import { readFileSync } from 'node:fs';
    import {
      BIOME_NAMES,
      LANDMARK_NAMES,
      TEMPLATE_NAMES,
      TIER_NAMES,
      WONDER_NAMES,
      WORLD_SIZES,
    } from '@nomos/sim-protocol/world-map';
    import { describe, expect, it } from 'vitest';
    import * as streams from '../src/random/streams.ts';

    interface Fixture {
      streams: Record<string, number>;
      names: Record<string, string[]>;
      sizes: Record<string, number[]>;
    }

    const fixture: Fixture = JSON.parse(readFileSync(new URL('./fixtures/goldens-v1.json', import.meta.url), 'utf8'));

    describe('the codes the port shares with tools/worldgen', () => {
      it("keeps model.py's tables and world.py's sizes", () => {
        expect([...BIOME_NAMES]).toEqual(fixture.names.biomes);
        expect([...TIER_NAMES]).toEqual(fixture.names.tiers);
        expect([...WONDER_NAMES]).toEqual(fixture.names.wonders);
        expect([...LANDMARK_NAMES]).toEqual(fixture.names.landmarks);
        expect([...TEMPLATE_NAMES]).toEqual(fixture.names.templates);
        expect({ standard: [...WORLD_SIZES.standard], large: [...WORLD_SIZES.large] }).toEqual(fixture.sizes);
      });

      // LOOK is sim-core's own stream (random/streams.ts); every other world stream is the generator's.
      it("keeps rng.py's world streams", () => {
        const { LOOK, ...world } = fixture.streams;
        expect(LOOK).toBe(11);
        expect({ ...streams }).toEqual(world);
      });
    });
    ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/sim-core/test/int.test.ts packages/sim-protocol packages/worldgen`. Expected: failures, since `isqrt`, `world-map.ts` and the package don't exist.
- [ ] **Step 3: `isqrt`.** Append to `packages/sim-core/src/maths/int.ts`:

  ```ts
  // Python's math.isqrt for 0 <= n < 2^52: the float root is off by at most one, so one step either way corrects it.
  export function isqrt(n: number): number {
    if (n < 0) throw new RangeError(`isqrt of ${n}`);
    let root = Math.floor(Math.sqrt(n));
    while (root * root > n) root--;
    while ((root + 1) * (root + 1) <= n) root++;
    return root;
  }
  ```

  In `packages/sim-core/src/kernels.ts`, change the first comment to `// The only sim-core values sim-culture and worldgen may import. None of these modules imports sim-culture, so the` (the second line stays), replace the `draw1`–`draw4` line, and add two lines:

  ```ts
  export { below, draw, draw1, draw2, draw3, draw4, mix } from './random/draw.ts';
  export { fbm, value } from './random/noise.ts';
  export { floorDiv, floorMod, isqrt } from './maths/int.ts';
  ```

- [ ] **Step 4: The world-map module.** Create `packages/sim-protocol/src/world-map/world-map.ts`:

  ```ts
  // The world M8.1's generator makes and M8.3's views draw (interfaces.md, The world map). Every code is an index into
  // one of these tables, which keep tools/worldgen's order. A leaf module, so the generator imports it without the rest.
  export const WORLDGEN_VERSION = 1;

  export const WORLD_SIZES = { standard: [96, 64], large: [192, 128] } as const;
  export type WorldSize = keyof typeof WORLD_SIZES;

  export const TEMPLATE_NAMES = ['continent', 'peninsula', 'coast', 'archipelago', 'twin-isles'] as const;
  export const SIDE_NAMES = ['n', 'e', 's', 'w'] as const;
  export const BIOME_NAMES = [
    'ocean',
    'lake',
    'grassland',
    'farmland',
    'forest-deciduous',
    'forest-conifer',
    'marsh',
    'sand',
    'hills',
    'mountain',
    'peak',
    'snow',
  ] as const;
  export const COAST_NAMES = ['inland', 'beach', 'cliffs'] as const;
  export const TIER_NAMES = ['capital', 'city', 'town', 'village', 'hamlet'] as const;
  export const WONDER_NAMES = [
    'waterfall',
    'giant-tree',
    'sea-arch',
    'stone-arch',
    'hot-springs',
    'geyser',
    'crystal-cave',
    'caldera-lake',
    'canyon-view',
    'glacier',
    'dune',
  ] as const;
  export const LANDMARK_NAMES = [
    'lighthouse',
    'viaduct',
    'observatory',
    'clock-tower',
    'glasshouse',
    'library',
    'amphitheatre',
    'windmill',
    'garden-terraces',
    'fountain',
  ] as const;
  export const LANDMARK_SLOTS = 3;
  export const NO_LANDMARK = 255;

  // Path p is cells[offsets[p]] up to cells[offsets[p + 1] - 1].
  export interface PathTable {
    offsets: Int32Array;
    cells: Int32Array;
  }

  export interface WorldMap {
    version: number;
    seed: number;
    width: number;
    height: number;
    template: number;
    wind: number;
    cold: number;
    elevation: Int16Array;
    biome: Uint8Array;
    temperature: Uint8Array;
    moisture: Uint8Array;
    river: Uint8Array;
    receiver: Int32Array;
    coast: Uint8Array;
    variant: Uint8Array;
    country: Uint8Array;
    region: Uint16Array;
    market: Uint16Array;
    settlements: {
      cell: Int32Array;
      tier: Uint8Array;
      population: Int32Array;
      country: Uint8Array;
      region: Uint16Array;
      landmarks: Uint8Array;
    };
    countries: { capital: Int32Array; colour: Uint8Array };
    regions: { seat: Int32Array; country: Uint8Array };
    roads: PathTable;
    lanes: PathTable;
    bridges: Int32Array;
    wonders: { kind: Uint8Array; cell: Int32Array };
    landmarks: { kind: Uint8Array; cell: Int32Array };
  }

  export type MapAppMessage = { type: 'generate'; seed: number; size: WorldSize };
  export type MapWorkerMessage = { type: 'world'; map: WorldMap; names: string[]; stageMs: Record<string, number> };

  // Every column owns its buffer, so each is listed once and the map worker can transfer them all.
  export function worldMapBuffers(map: WorldMap): ArrayBuffer[] {
    const { settlements: s, countries, regions, roads, lanes, wonders, landmarks } = map;
    const views: ArrayBufferView[] = [
      map.elevation,
      map.biome,
      map.temperature,
      map.moisture,
      map.river,
      map.receiver,
      map.coast,
      map.variant,
      map.country,
      map.region,
      map.market,
      s.cell,
      s.tier,
      s.population,
      s.country,
      s.region,
      s.landmarks,
      countries.capital,
      countries.colour,
      regions.seat,
      regions.country,
      roads.offsets,
      roads.cells,
      lanes.offsets,
      lanes.cells,
      map.bridges,
      wonders.kind,
      wonders.cell,
      landmarks.kind,
      landmarks.cell,
    ];
    return views.map((view) => view.buffer as ArrayBuffer);
  }
  ```

  In `packages/sim-protocol/package.json`, add `"./world-map": "./src/world-map/world-map.ts"` to `exports`, after `"."`. The barrel stays as it is, so no first-load chunk can pull the module in.
- [ ] **Step 5: The package.** Create `packages/worldgen/package.json`:

  ```json
  {
    "name": "@nomos/worldgen",
    "private": true,
    "type": "module",
    "sideEffects": false,
    "exports": {
      ".": "./src/index.ts"
    },
    "scripts": {
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "@nomos/sim-core": "workspace:*",
      "@nomos/sim-protocol": "workspace:*"
    }
  }
  ```

  `packages/worldgen/tsconfig.json`:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "types": ["node"]
    },
    "include": ["src", "test", "scripts"],
    "exclude": ["test/fixtures"]
  }
  ```

  `packages/worldgen/src/random/streams.ts`:

  ```ts
  // rng.py's world streams, one per purpose, append only. LOOK (11) is sim-core's, in its random/streams.ts.
  export const SHAPE = 1;
  export const ELEVATION = 2;
  export const RIDGES = 3;
  export const TEMPERATURE = 4;
  export const MOISTURE = 5;
  export const SETTLEMENT = 6;
  export const ROAD = 7;
  export const WONDER = 8;
  export const LANDMARK = 9;
  export const PLACE = 10;
  export const CROWD = 12;
  export const COUNTRY = 13;
  export const NAME = 14;
  ```

  `src/index.ts` arrives with Task 29. Then run `pnpm install`, which links the package and adds it to `pnpm-lock.yaml`.
- [ ] **Step 6: Run** the Step 2 command, then the gates. Expected: all pass.
- [ ] **Step 7: Nothing reached the first load.** Run `pnpm --filter @nomos/web build`, then `grep -c "Math.sqrt" apps/web/dist/assets/worker-*.js apps/web/dist/assets/index-*.js apps/web/dist/assets/render-gl-*.js`. Expected: 0 for each, as before this task: tree-shaking drops the unused `isqrt`.
- [ ] **Step 8: Commit** `feat(worldgen): add the package, the kernel exports and the world-map codes`, with every file above and the lockfile.

### Task 10: The generator lint and the dependency rules (junior, exact code)

**Files:** modify `eslint.config.js` and `.dependency-cruiser.cjs` (shared); create `packages/worldgen/test/lint.test.ts`, `test/depcruise.test.ts` and the fixture under `test/fixtures/deps/`.

- [ ] **Step 1: Write the failing tests.** `packages/worldgen/test/lint.test.ts`:

  ```ts
  import { fileURLToPath } from 'node:url';
  import { ESLint } from 'eslint';
  import { describe, expect, it } from 'vitest';

  const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../', import.meta.url)) });
  const PLANTED = 'packages/worldgen/src/terrain/planted.ts';

  async function ruleIds(code: string, filePath = PLANTED): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath });
    return result.messages.map((message) => message.ruleId ?? '');
  }

  // A fresh install's first ESLint load can pass Vitest's 5 s default.
  describe('the world generator lint', { timeout: 30_000 }, () => {
    it('rejects float maths, rounding, bare division and orderless sorts', async () => {
      const planted = [
        'export const a = Math.sin(1);',
        'export const b = Math.random();',
        'export const c = Math.sqrt(2);',
        'export const d = Math.round(2.5);',
        'export const e = Math.trunc(-2.5);',
        'export const f = 2 ** 3;',
        'export const g = BigInt(1);',
        'export const h = (n: number) => n / 2;',
        'export const i = (n: number) => n % 3;',
        'export const j = [3, 1].sort();',
      ];
      for (const code of planted) expect(await ruleIds(code), code).not.toEqual([]);
    });

    it('allows the integer helpers, unsigned remainders and ordered sorts', async () => {
      const allowed = [
        "import { floorDiv } from '@nomos/sim-core/kernels';\nexport const a = (n: number) => floorDiv(n, 2);\n",
        'export const b = (d: number) => (d >>> 0) % 7;\n',
        'export const c = [3, 1].sort((p, q) => p - q);\n',
        'export const d = Math.max(1, Math.abs(-2));\n',
      ];
      for (const code of allowed) expect(await ruleIds(code), code).toEqual([]);
    });

    it('leaves tests and scripts free', async () => {
      expect(await ruleIds('export const a = Math.sqrt(2) / 2;\n', 'packages/worldgen/test/planted.test.ts')).toEqual([]);
    });
  });
  ```

  `packages/worldgen/test/depcruise.test.ts`:

  ```ts
  import { join } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { cruise, type ICruiseResult } from 'dependency-cruiser';
  import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
  import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';
  import { describe, expect, it } from 'vitest';

  const REPO = fileURLToPath(new URL('../../../', import.meta.url));
  const PLANTED = fileURLToPath(new URL('./fixtures/deps/', import.meta.url));

  // The CLI's own steps, as sim-core's depcruise test takes them. The fixture mirrors the repo's folders.
  async function cruiseFrom(baseDir: string): Promise<ICruiseResult> {
    const options = await extractDepcruiseOptions(join(REPO, '.dependency-cruiser.cjs'));
    const tsConfig = extractTSConfig(join(REPO, options.tsConfig?.fileName ?? 'tsconfig.json'));
    const { output } = await cruise(['packages', 'apps'], { ...options, baseDir }, undefined, { tsConfig });
    return output as ICruiseResult;
  }

  function sources(result: ICruiseResult, rule: string): string[] {
    return result.summary.violations
      .filter((violation) => violation.rule.name === rule)
      .map((violation) => violation.from)
      .sort();
  }

  describe('the world generator in dependency-cruiser', { timeout: 30_000 }, () => {
    it('keeps the generator on the kernels and the world-map codes', async () => {
      const result = await cruiseFrom(PLANTED);
      expect(sources(result, 'worldgen-imports-kernels-only')).toEqual(['packages/worldgen/src/terrain/stray.ts']);
    });

    it('keeps the generator out of every page module but the map worker', async () => {
      const result = await cruiseFrom(PLANTED);
      expect(sources(result, 'worldgen-only-in-the-map-worker')).toEqual(['apps/web/src/panels/stray.ts']);
    });
  });
  ```

  The fixture, nine one-line files under `packages/worldgen/test/fixtures/deps/`:

  | File | Content |
  | --- | --- |
  | `packages/sim-core/src/kernels.ts` | `export const draw = 1;` |
  | `packages/sim-core/src/index.ts` | `export const step = 1;` |
  | `packages/sim-protocol/src/world-map/world-map.ts` | `export const WORLDGEN_VERSION = 1;` |
  | `packages/worldgen/src/index.ts` | `export { ok } from './terrain/ok.ts';` |
  | `packages/worldgen/src/terrain/ok.ts` | `import { draw } from '../../../sim-core/src/kernels.ts';` and `import { WORLDGEN_VERSION } from '../../../sim-protocol/src/world-map/world-map.ts';`, then `export const ok = draw + WORLDGEN_VERSION;` |
  | `packages/worldgen/src/terrain/stray.ts` | `import { step } from '../../../sim-core/src/index.ts';`, then `export const stray = step;` |
  | `apps/web/src/map/generate.ts` | `import { ok } from '../../../../packages/worldgen/src/index.ts';`, then `export const generated = ok;` |
  | `apps/web/src/map/map-worker.ts` | `import { generated } from './generate.ts';`, then `export const worker = generated;` |
  | `apps/web/src/panels/stray.ts` | `import { generated } from '../map/generate.ts';`, then `export const shown = generated;` |

- [ ] **Step 2: Run** `pnpm exec vitest run packages/worldgen`. Expected: the lint test fails on the planted division, sort and rounding, and the depcruise test finds no such rules.
- [ ] **Step 3: The lint.** In `eslint.config.js`:
  - after the `FLOOR_MOD` constant, add:

    ```js
    const PORT_MATHS =
      "Generator port (R9): tools/worldgen's maths is integer only, so use isqrt, floorDiv or floorMod, never a rounding.";
    const TOTAL_ORDER = 'Generator port (M8.1): sort only with a comparator, a total order with ties broken by cell index.';
    ```

  - replace the `GENERATOR_FILES` comment and constant with:

    ```js
    // The generator code: the keyed draw, value noise, the map parser and the world generator, M8.1's port of
    // tools/worldgen, built before M1 (owner, 9 October 2026).
    const WORLDGEN = 'packages/worldgen/src/**/*.ts';
    const GENERATOR_FILES = ['packages/sim-core/src/random/{draw,noise}.ts', 'packages/sim-protocol/src/map/map.ts', WORLDGEN];
    ```

  - add this block right before the block whose comment begins `// Its own copy of the core rule too`:

    ```js
    {
      // The generator is no sim package, so it takes the sim maths bans by name, plus the port's own (M8.1).
      files: [WORLDGEN],
      rules: {
        'no-restricted-properties': [
          'error',
          ...TRANSCENDENTAL_MATH.map((property) => ({ object: 'Math', property, message: EXACT_MATHS })),
          { object: 'Math', property: 'random', message: KEYED_DRAW },
          ...['sqrt', 'trunc', 'round', 'ceil', 'fround'].map((property) => ({ object: 'Math', property, message: PORT_MATHS })),
        ],
        'no-restricted-syntax': [
          'error',
          ...MATH_SYNTAX,
          ...BIGINT_SYNTAX,
          { selector: 'CallExpression[callee.property.name=/^(sort|toSorted)$/][arguments.length=0]', message: TOTAL_ORDER },
        ],
      },
    },
    ```

- [ ] **Step 4: The dependency rules.** In `.dependency-cruiser.cjs`, add before the `no-cycles` rule:

  ```js
  {
    name: 'worldgen-imports-kernels-only',
    comment:
      'M8.1: the generator takes sim-core values only through kernels.ts and sim-protocol only through its world-map codes, so it stays pure and small.',
    severity: 'error',
    from: { path: '^packages/worldgen/src/' },
    to: {
      path: '^packages/',
      pathNot: '^packages/worldgen/|^packages/sim-core/src/kernels\\.ts$|^packages/sim-protocol/src/world-map/world-map\\.ts$',
    },
  },
  {
    name: 'worldgen-only-in-the-map-worker',
    comment:
      'M8.1, owner (9 October 2026): the map runs in a worker of its own, so no page module but the map worker may reach the generator.',
    severity: 'error',
    from: { path: '^apps/web/src/', pathNot: '^apps/web/src/map/(map-worker|generate)\\.ts$' },
    to: { path: '^packages/worldgen/', reachable: true },
  },
  ```

- [ ] **Step 5: Run** the Step 2 command, then the gates: `pnpm depcruise` still passes on the real tree, and so does `packages/sim-core/test/depcruise.test.ts`.
- [ ] **Step 6: Commit** `build: lint the world generator and keep it in the map worker`, with both configs, both tests and the fixture.

### Task 11: Grid helpers, the heap, keyed draws and the fold (junior, exact code)

**Files:** create `packages/worldgen/src/grid/grid.ts`, `src/grid/heap.ts`, `src/random/keyed.ts`, `test/engines/fold.ts` and `test/grid.test.ts`.

This code was run against Python's outputs for the vectors below (measured here).

- [ ] **Step 1: Write the failing test,** `packages/worldgen/test/grid.test.ts`. Every expected value comes from `tools/worldgen` (computed here).

  ```ts
  import { describe, expect, it } from 'vitest';
  import { adjacency, distances, neighbours, parts, type Adjacency } from '../src/grid/grid.ts';
  import { MinHeap } from '../src/grid/heap.ts';
  import { chance, shuffled } from '../src/random/keyed.ts';
  import { fold } from './engines/fold.ts';

  function lists(nbrs: Adjacency): number[][] {
    const out: number[][] = [];
    for (let c = 0; c + 1 < nbrs.start.length; c++) out.push([...nbrs.cells.subarray(nbrs.start[c], nbrs.start[c + 1])]);
    return out;
  }

  function hex(value: number): string {
    return (value >>> 0).toString(16).padStart(8, '0');
  }

  describe('the grid helpers, as grid.py and rng.py', () => {
    it('lists neighbours in grid.py order', () => {
      expect(lists(neighbours(3, 2))).toEqual([[1, 3, 4], [2, 4, 0, 5, 3], [5, 1, 4], [0, 4, 1], [1, 5, 3, 2, 0], [2, 4, 1]]);
      expect(lists(neighbours(3, 2, false))).toEqual([[1, 3], [2, 4, 0], [5, 1], [0, 4], [1, 5, 3], [2, 4]]);
      expect(adjacency([[1], [], [0, 1]])).toEqual({ start: new Int32Array([0, 1, 1, 3]), cells: new Int32Array([1, 0, 1]) });
    });

    it('measures distances and parts', () => {
      expect([...distances(neighbours(4, 3), [0], null, 255)]).toEqual([0, 1, 2, 3, 1, 1, 2, 3, 2, 2, 2, 3]);
      const passable = new Uint8Array([1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1]);
      expect([...distances(neighbours(4, 3), [0, 11], passable, 3)]).toEqual([0, 1, 3, 2, 1, 3, 1, 1, 2, 2, 1, 0]);
      const split = parts(neighbours(4, 3, false), new Uint8Array([1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1]));
      expect([...split.label]).toEqual([0, 0, -1, 1, -1, -1, 1, 1, 2, -1, -1, 1]);
      expect(split.sizes).toEqual([2, 4, 1]);
    });

    it('shuffles and draws chances as rng.py', () => {
      expect(shuffled([0, 1, 2, 3, 4], 42, 13, 1)).toEqual([4, 2, 1, 3, 0]);
      expect(shuffled(['a', 'b', 'c'], 7, 9, 2, 5)).toEqual(['c', 'a', 'b']);
      expect([0, 1, 2, 3, 4, 5, 6, 7].map((k) => chance(500, 42, 9, k))).toEqual([false, true, false, false, true, true, true, true]);
    });

    it("folds as goldens.py's fold", () => {
      const prints = [
        fold(),
        fold([]),
        fold(0),
        fold(1, [2, 3], [-1]),
        fold([1], [2, 3, -1]),
        fold(new Uint8Array([255, 0, 7]), [2 ** 31, -(2 ** 31), 4_294_967_295, 250_000_000_000]),
      ];
      expect(prints.map(hex)).toEqual(['626ee42e', '8328c333', 'b074ca0d', 'ec093763', 'e01fa097', 'd2f755a2']);
    });
  });

  describe('the heap', () => {
    it('pops in sorted order, pushes and pops interleaved', () => {
      let state = 12_345;
      const next = (n: number): number => {
        state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
        return state % n;
      };
      const reference: number[][] = [];
      const heap = new MinHeap(1);
      for (let i = 0; i < 5_000; i++) {
        if (next(3) === 0 && reference.length > 0) {
          reference.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
          heap.pop();
          expect([heap.a, heap.b, heap.c]).toEqual(reference.shift());
        } else {
          const key = [next(1_000) - 500, 4_294_967_295 - next(7), i];
          reference.push(key);
          heap.push(key[0], key[1], key[2]);
        }
      }
      expect(heap.size).toBe(reference.length);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/worldgen/test/grid.test.ts`. Expected: fails, since the modules don't exist.
- [ ] **Step 3: Write the modules.** `packages/worldgen/src/grid/grid.ts`:

  ```ts
  import { floorDiv, floorMod } from '@nomos/sim-core/kernels';

  // A cell's neighbours are cells[start[cell]] up to cells[start[cell + 1] - 1].
  export interface Adjacency {
    readonly start: Int32Array;
    readonly cells: Int32Array;
  }

  // grid.py's fixed order, orthogonal steps first: north, east, south, west, then the diagonals clockwise from north-east.
  export const ORTHO: readonly (readonly [number, number])[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  export const DIAG: readonly (readonly [number, number])[] = [
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ];

  const built = new Map<string, Adjacency>();

  export function xOf(cell: number, width: number): number {
    return floorMod(cell, width);
  }

  export function yOf(cell: number, width: number): number {
    return floorDiv(cell, width);
  }

  export function dist2(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  export function adjacency(lists: readonly (readonly number[])[]): Adjacency {
    const start = new Int32Array(lists.length + 1);
    for (let c = 0; c < lists.length; c++) start[c + 1] = start[c] + lists[c].length;
    const cells = new Int32Array(start[lists.length]);
    for (let c = 0; c < lists.length; c++) cells.set(lists[c], start[c]);
    return { start, cells };
  }

  // Cached per grid, as grid.py's lru_cache does, since every stage asks for the same lists.
  export function neighbours(width: number, height: number, diagonal = true): Adjacency {
    const key = `${width}x${height}${diagonal ? 'd' : ''}`;
    const cached = built.get(key);
    if (cached) return cached;
    const steps = diagonal ? [...ORTHO, ...DIAG] : ORTHO;
    const lists: number[][] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const list: number[] = [];
        for (const [dx, dy] of steps) {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) list.push((y + dy) * width + x + dx);
        }
        lists.push(list);
      }
    }
    const made = adjacency(lists);
    built.set(key, made);
    return made;
  }

  // Steps to the nearest source, capped at limit; a cell whose passable flag is 0 is never entered.
  export function distances(
    nbrs: Adjacency,
    sources: readonly number[],
    passable: ArrayLike<number> | null,
    limit: number,
  ): Uint8Array {
    const n = nbrs.start.length - 1;
    const dist = new Uint8Array(n).fill(limit);
    const queue = new Int32Array(n + sources.length);
    let head = 0;
    let tail = 0;
    for (const cell of sources) {
      dist[cell] = 0;
      queue[tail++] = cell;
    }
    while (head < tail) {
      const c = queue[head++];
      const d = dist[c] + 1;
      if (d >= limit) continue;
      for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
        const m = nbrs.cells[k];
        if (dist[m] > d && (passable === null || passable[m])) {
          dist[m] = d;
          queue[tail++] = m;
        }
      }
    }
    return dist;
  }

  // Each connected group of member cells, labelled 0, 1, ... in index order; -1 elsewhere.
  export function parts(nbrs: Adjacency, member: ArrayLike<number>): { label: Int32Array; sizes: number[] } {
    const n = nbrs.start.length - 1;
    const label = new Int32Array(n).fill(-1);
    const sizes: number[] = [];
    const queue = new Int32Array(n);
    for (let first = 0; first < n; first++) {
      if (!member[first] || label[first] >= 0) continue;
      const id = sizes.length;
      label[first] = id;
      let head = 0;
      let tail = 0;
      queue[tail++] = first;
      while (head < tail) {
        const c = queue[head++];
        for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
          const m = nbrs.cells[k];
          if (member[m] && label[m] < 0) {
            label[m] = id;
            queue[tail++] = m;
          }
        }
      }
      sizes.push(tail);
    }
    return { label, sizes };
  }

  // Cells set in either: the ocean with the lakes, or the ocean with the terminal lakes.
  export function union(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] | b[i];
    return out;
  }

  export function sum(values: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < values.length; i++) total += values[i];
    return total;
  }
  ```

  `packages/worldgen/src/grid/heap.ts`:

  ```ts
  // heapq with keys of up to three integers, compared left to right as Python compares tuples. Every heap in
  // tools/worldgen ends its key with a cell or a settlement, so no two live keys differ only in order, and any correct
  // heap pops them in Python's order. pop() leaves the smallest key in a, b and c.
  export class MinHeap {
    size = 0;
    a = 0;
    b = 0;
    c = 0;
    private keyA: Float64Array;
    private keyB: Float64Array;
    private keyC: Float64Array;

    constructor(capacity: number) {
      this.keyA = new Float64Array(Math.max(1, capacity));
      this.keyB = new Float64Array(Math.max(1, capacity));
      this.keyC = new Float64Array(Math.max(1, capacity));
    }

    push(a: number, b: number, c = 0): void {
      if (this.size === this.keyA.length) this.grow();
      let at = this.size++;
      while (at > 0) {
        const up = (at - 1) >> 1;
        if (!this.keyBefore(a, b, c, up)) break;
        this.move(up, at);
        at = up;
      }
      this.put(at, a, b, c);
    }

    pop(): void {
      if (this.size === 0) throw new RangeError('pop from an empty heap');
      this.a = this.keyA[0];
      this.b = this.keyB[0];
      this.c = this.keyC[0];
      const last = --this.size;
      const a = this.keyA[last];
      const b = this.keyB[last];
      const c = this.keyC[last];
      let at = 0;
      for (;;) {
        let child = 2 * at + 1;
        if (child >= last) break;
        if (child + 1 < last && this.slotBefore(child + 1, child)) child++;
        if (this.keyBefore(a, b, c, child)) break;
        this.move(child, at);
        at = child;
      }
      this.put(at, a, b, c);
    }

    private keyBefore(a: number, b: number, c: number, slot: number): boolean {
      if (a !== this.keyA[slot]) return a < this.keyA[slot];
      if (b !== this.keyB[slot]) return b < this.keyB[slot];
      return c < this.keyC[slot];
    }

    private slotBefore(i: number, j: number): boolean {
      return this.keyBefore(this.keyA[i], this.keyB[i], this.keyC[i], j);
    }

    private move(from: number, to: number): void {
      this.put(to, this.keyA[from], this.keyB[from], this.keyC[from]);
    }

    private put(slot: number, a: number, b: number, c: number): void {
      this.keyA[slot] = a;
      this.keyB[slot] = b;
      this.keyC[slot] = c;
    }

    private grow(): void {
      this.keyA = doubled(this.keyA);
      this.keyB = doubled(this.keyB);
      this.keyC = doubled(this.keyC);
    }
  }

  function doubled(keys: Float64Array): Float64Array {
    const next = new Float64Array(keys.length * 2);
    next.set(keys);
    return next;
  }
  ```

  `packages/worldgen/src/random/keyed.ts`:

  ```ts
  import { draw } from '@nomos/sim-core/kernels';

  export function chance(perMille: number, seed: number, stream: number, ...key: number[]): boolean {
    return (draw(seed, stream, ...key) >>> 0) % 1000 < perMille;
  }

  // rng.shuffled: each item's rank is its own draw, keyed on its index in items, with ties to the lower index.
  export function shuffled<T>(items: readonly T[], seed: number, stream: number, ...key: number[]): T[] {
    const ranks = items.map((_, i) => draw(seed, stream, ...key, i));
    const order = items.map((_, i) => i).sort((i, j) => ranks[i] - ranks[j] || i - j);
    return order.map((i) => items[i]);
  }
  ```

  `packages/worldgen/test/engines/fold.ts`:

  ```ts
  import { mix } from '@nomos/sim-core/kernels';

  export type Part = number | ArrayLike<number>;

  const FOLD_SEED = 0x57a6e;

  // goldens.py's fold: each part's length, then its values, so [1], [2] and [1, 2] differ.
  export function fold(...parts: Part[]): number {
    let h = mix(FOLD_SEED);
    for (const part of parts) {
      if (typeof part === 'number') {
        h = mix(mix(h ^ 1) ^ part);
        continue;
      }
      h = mix(h ^ part.length);
      for (let i = 0; i < part.length; i++) h = mix(h ^ part[i]);
    }
    return h;
  }

  export function rows(records: readonly (readonly number[])[]): number[] {
    const out: number[] = [];
    for (const record of records) out.push(...record);
    return out;
  }

  export function paths(cellPaths: readonly (readonly number[])[]): number[] {
    const out: number[] = [];
    for (const path of cellPaths) out.push(path.length, ...path);
    return out;
  }
  ```

- [ ] **Step 4: Run** the Step 2 command, then the gates. Expected: all pass.
- [ ] **Step 5: Commit** `feat(worldgen): add the grid helpers, heap and keyed draws`, with the five files.

### Port tasks: the shared steps

Tasks 12 and 14–28 each follow these steps. A task lists only its files, spec, interfaces, traps and mirror block.

1. **Mirror first.** Add the task's imports and its block to `packages/worldgen/test/engines/stages.ts`, at the end of `stagePrints`, before `return prints;`.
2. **Run** `pnpm exec vitest run packages/worldgen/test/goldens.test.ts`. Expected: it fails, since the functions don't exist yet.
3. **Port** the spec's Python functions into the task's files, under the porting rules, with exactly the interfaces given.
4. **Run** the goldens test again until it passes. Then `node packages/worldgen/scripts/engines.ts`, which checks all 200 worlds and prints `node 24.x: N stage checks ok`. Then the gates.
5. **Commit** `feat(worldgen): port <the stage>`, with the task's files and `stages.ts`.

The senior reviews each port against its Python before the next task starts.

### Task 12: The golden harness and the falloff stage (junior)

**Files:** create `packages/worldgen/src/terrain/templates.ts`, `test/engines/stages.ts`, `test/engines/checks.ts`, `test/goldens.test.ts` and `scripts/engines.ts`.

**Spec:** `terrain.py`: the constants, `_blob`, `_continent`, `_peninsula`, `_coast`, `_islands`, `_archipelago`, `_twin_isles`, `SHAPES` and `_edges`, and `shape`'s first four lines: the template, the land target and the falloff.

**Interfaces,** in `src/terrain/templates.ts`:
- Every `terrain.py` constant, including the sub-purposes and `BEARINGS`, so `chains.ts` and `shape.ts` import them from here. `ONE` is `1 << 14`: terrain's own, not noise's.
- `CONTINENT`, `PENINSULA`, `COAST`, `ARCHIPELAGO` and `TWIN_ISLES`, the template codes, as `TEMPLATE_NAMES.indexOf(...)`; and `LAND_PERMILLE: readonly (readonly [number, number])[]`, by template code.
- `blob(width, height, cx, cy, rx, ry): Int32Array`.
- `continent`, `peninsula`, `coastShape`, `archipelago` and `twinIsles`, each `(seed, width, height, landPermille): Int32Array`, and `SHAPES`, an array of the five by template code. `_coast` becomes `coastShape`, since `coasts` names the climate stage.
- `islands(width, height, spots: readonly (readonly [number, number, number, number])[]): Int32Array`.
- `edges(seed, width, height, template: number): Int32Array`.
- `templateOf(seed): number`, `below(5, seed, SHAPE, PICK)`; `landPermilleOf(seed, template): number`, `lo + below(hi - lo + 1, seed, SHAPE, LAND)`; and `falloffOf(seed, width, height, template, landPermille): Int32Array`, the clamped sum of the template and its edges.

**Traps:**
- `_continent`'s `around` reads `cx`, `cy`, `rx` and `ry` from the enclosing function: pass them in. `cx + bx * rx * reach // 1600` is `cx + floorDiv(bx * rx * reach, 1600)`, with `bx` possibly negative.
- `_peninsula` picks `(a, c)` from four pairs by `root`, and `slant` and `half` may be negative: `floorDiv` throughout.
- `_islands`: `first[i], second[i] = f, first[i]` (porting rule 11).
- `_archipelago`: `gap` is `isqrt(dist2(...)) - floorDiv(rx + ry + sr + sq, 2)`, and the minimum defaults to 0 when no spot is placed yet. Keep the first best try on a tie (rule 7).
- `_edges`: the wiggle is `floorDiv(floorDiv((v - 32768) * ONE * 3, 32768), 8)`. For a peninsula, `reach` skips the root side; for a coast, there is no reach term.

**Harness, exact code.** `packages/worldgen/test/engines/stages.ts` starts as:

```ts
// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser. goldens.py's stages, line
// for line: each block runs a stage the way goldens.py opens world.generate up, and folds what it made. Each port task
// appends its block before the return.
import { WORLD_SIZES, type WorldSize } from '@nomos/sim-protocol/world-map';
import { fold } from './fold.ts';
import { falloffOf, landPermilleOf, templateOf } from '../../src/terrain/templates.ts';

export function stagePrints(seed: number, size: WorldSize): Map<string, number> {
  const [width, height] = WORLD_SIZES[size];
  const prints = new Map<string, number>();

  const template = templateOf(seed);
  const landPermille = landPermilleOf(seed, template);
  const falloff = falloffOf(seed, width, height, template, landPermille);
  prints.set('falloff', fold(template, landPermille, falloff));

  return prints;
}
```

`packages/worldgen/test/engines/checks.ts`:

```ts
// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser.
import type { WorldSize } from '@nomos/sim-protocol/world-map';
import { stagePrints } from './stages.ts';

export interface GoldenWorld {
  size: WorldSize;
  seed: number;
  // One 8-digit hex fingerprint per stage, in the file's stage order, separated by spaces.
  prints: string;
}

export interface Goldens {
  version: number;
  stages: string[];
  worlds: GoldenWorld[];
}

export interface EngineReport {
  cases: number;
  failures: string[];
}

export type WorldCounts = Record<WorldSize, number>;

const EVERY: WorldCounts = { standard: 100, large: 100 };

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function wanted(file: Goldens | null, world: GoldenWorld, stage: string): string | undefined {
  const index = file ? file.stages.indexOf(stage) : -1;
  if (!file || index < 0) return undefined;
  return file.worlds.find((w) => w.size === world.size && w.seed === world.seed)?.prints.split(' ')[index];
}

// Python's stages come in goldens-v1's order with none skipped; frozen stages may sit between them. A world stops at
// its first mismatch, since every later stage reads it.
function checkWorld(report: EngineReport, goldens: Goldens, frozen: Goldens | null, world: GoldenWorld): void {
  const name = `${world.size} ${hex(world.seed)}`;
  let next = 0;
  for (const [stage, print] of stagePrints(world.seed, world.size)) {
    report.cases++;
    const index = goldens.stages.indexOf(stage);
    if (index >= 0 && index !== next) {
      report.failures.push(`${name} ${stage}: out of order, ${goldens.stages[next]} comes first`);
      return;
    }
    if (index >= 0) next++;
    const want = wanted(goldens, world, stage) ?? wanted(frozen, world, stage);
    if (want === hex(print)) continue;
    report.failures.push(`${name} ${stage}: got ${hex(print)}, want ${want ?? 'no golden'}`);
    return;
  }
}

// The first counts[size] worlds of each size, against goldens-v1 (Python) and frozen-v1 (TypeScript only).
export function checkStages(goldens: Goldens, frozen: Goldens | null, counts: WorldCounts = EVERY): EngineReport {
  const report: EngineReport = { cases: 0, failures: [] };
  const taken: WorldCounts = { standard: 0, large: 0 };
  for (const world of goldens.worlds) {
    if (taken[world.size] >= counts[world.size]) continue;
    taken[world.size]++;
    checkWorld(report, goldens, frozen, world);
  }
  return report;
}
```

`packages/worldgen/test/goldens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkStages, type Goldens } from './engines/checks.ts';

const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens-v1.json', import.meta.url), 'utf8'));

// A sample on every run. scripts/engines.ts runs all 200 worlds in Node and Bun, and the browser spec in three browsers.
describe('the port against the Python goldens', { timeout: 120_000 }, () => {
  it('matches every stage ported so far on the first 10 standard and 2 large worlds', () => {
    const report = checkStages(goldens, null, { standard: 10, large: 2 });
    expect(report.failures).toEqual([]);
    expect(report.cases).toBeGreaterThan(0);
  });
});
```

`packages/worldgen/scripts/engines.ts`:

```ts
// Runs the golden checks under whichever runtime starts it: node here and in CI's check job, bun in CI's bun job. The
// browsers run the same checks from test/browser/engines.spec.ts.
import { readFileSync } from 'node:fs';
import { checkStages, type Goldens } from '../test/engines/checks.ts';

function readFixture(name: string): Goldens {
  return JSON.parse(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8'));
}

const runtime = process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`;
const report = checkStages(readFixture('goldens-v1.json'), null);
if (report.failures.length > 0) {
  console.error(`${runtime}: ${report.failures.length} worlds failed:\n  ${report.failures.slice(0, 20).join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log(`${runtime}: ${report.cases} stage checks ok`);
}
```

Commit as `feat(worldgen): port the land templates, with the golden harness`.

### Task 13: Five engines: the browser spec and CI (junior, exact code)

**Files:** create `packages/worldgen/test/browser/engines.spec.ts`; modify `.github/workflows/ci.yml` (shared).

- [ ] **Step 1: The spec,** `packages/worldgen/test/browser/engines.spec.ts`:

  ```ts
  import { readFileSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';
  import { build } from 'esbuild';
  import { expect, test } from 'playwright/test';
  import type { Goldens, WorldCounts } from '../engines/checks.ts';

  declare const nomosWorldgen: typeof import('../engines/checks.ts');

  const CHECKS = fileURLToPath(new URL('../engines/checks.ts', import.meta.url));
  const goldens: Goldens = JSON.parse(readFileSync(new URL('../fixtures/goldens-v1.json', import.meta.url), 'utf8'));
  const SIZES: [string, WorldCounts][] = [
    ['standard', { standard: 100, large: 0 }],
    ['large', { standard: 0, large: 100 }],
  ];

  for (const [size, counts] of SIZES) {
    test(`matches the Python goldens on every ${size} world`, async ({ page, browser, browserName }) => {
      // 100 worlds, each generated about twice over by the mirror's checks (unsourced estimate of the cost).
      test.setTimeout(300_000);
      const bundle = await build({
        entryPoints: [CHECKS],
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'nomosWorldgen',
      });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const report = await page.evaluate(
        ([fixture, limit]) => nomosWorldgen.checkStages(fixture, null, limit),
        [goldens, counts] as const,
      );
      test.info().annotations.push({ type: 'engine', description: `${browserName} ${browser.version()}` });
      expect(report.failures).toEqual([]);
    });
  }
  ```

- [ ] **Step 2: CI.** In `.github/workflows/ci.yml`:
  - in the `check` job, after `- run: python tools/atlas/test_atlas.py`, add `- run: python tools/worldgen/goldens.py --check --seeds 3`;
  - in the `check` job, after `- run: pnpm test`, add `- run: node packages/worldgen/scripts/engines.ts`;
  - in the `bun` job, after `- run: bun packages/sim-core/scripts/engines.ts`, add `- run: bun packages/worldgen/scripts/engines.ts`.
- [ ] **Step 3: Run** `pnpm exec playwright test packages/worldgen/test/browser/engines.spec.ts`. Expected: 6 passed, two sizes in each of Chromium, Firefox and WebKit. Record each project's time in the report. If Bun is installed here, run `bun packages/worldgen/scripts/engines.ts` too; otherwise CI's `bun` job proves it.
- [ ] **Step 4: Commit** `test(worldgen): check the port in five engines`, with the spec and `ci.yml`.

### Task 14: Relief and mountain chains (junior)

**Files:** create `packages/worldgen/src/terrain/chains.ts` and `src/terrain/shape.ts`.

**Spec:** `terrain.py`: `_chain`, `_near_chain` and `_chains`, and `shape`'s lines for `relief`, `coast` and `rise`.

**Interfaces:**
- In `chains.ts`: `chain(seed, j, cx, cy): Int32Array`, the 7 points' x and y in sixteenths of a cell, in `_chain`'s order; `nearChain(points: Int32Array, px, py): [number, number]`, `_near_chain`'s (squared distance, position); and `chains(seed, width, height, rise: Int32Array): Int32Array`.
- In `shape.ts`: `reliefOf(seed, width, height): Int32Array`; `cut(values: ArrayLike<number>, landPermille): number`, which is `sorted(values)[n - n * land_target // 1000]`; and `riseOf(falloff, relief, landPermille): { coastCut: number; rise: Int32Array }`.

**Traps:**
- `_chain`: `(b + below(...) - 1) % 16` can be −1 before the remainder: `floorMod`. `BEARINGS[b][0] * step // 16` is negative for western bearings: `floorDiv`.
- `_near_chain`'s `cross * cross` reaches about 6 × 10^11: exact in a double, but never put it through a bitwise operator.
- `_chains` starts with `best, best_score = 0, None`, and `room` defaults to 24 when no centre is placed. Keep `h = max(h, lift * (reach - d) // reach * taper // ONE)` left to right (rule 4).
- `cut` copies before sorting, and sorts numbers with `(a, b) => a - b`.

**Mirror block:**

```ts
  const relief = reliefOf(seed, width, height);
  prints.set('relief', fold(relief));
  const { coastCut, rise } = riseOf(falloff, relief, landPermille);
  const ridges = chains(seed, width, height, rise);
  prints.set('chains', fold(coastCut, ridges));
```

with `import { chains } from '../../src/terrain/chains.ts';` and `import { reliefOf, riseOf } from '../../src/terrain/shape.ts';`.

### Task 15: Raw height, land and the shape (junior)

**Files:** modify `packages/worldgen/src/terrain/shape.ts`.

**Spec:** `terrain.py`: the rest of `shape`, with `_smooth`, `_tidy` and `_border`.

**Interfaces,** in `shape.ts`:
- `interface Shape { template: number; elevation: Int32Array; ocean: Uint8Array }`;
- `rawOf(seed, rise, relief, chains): Int32Array`, the ramp and then the grain;
- `smooth(land: Uint8Array, nbrs: Adjacency): Uint8Array`, `tidy(land, width, height): Uint8Array` and `border(width, height): number[]`;
- `landOf(raw, sea, width, height): Uint8Array`, which is `tidy` of the cells above `sea`;
- `elevationOf(raw, sea, land): Int32Array` and `oceanOf(land, width, height): Uint8Array`;
- `shape(seed, width, height): Shape`, composing `templateOf` through `oceanOf` exactly as Python's `shape` does.

**Traps:**
- The raw line is one conditional expression: `A if u > 0 else u + r + c`, where `A` is `PLATEAU * min(u, RAMP) // RAMP + max(0, u - RAMP) // 16 + r + c`.
- The grain is `v + (draw2(seed, ELEVATION, GRAIN, i) >>> 0) % (2 * GRAIN_RAW + 1) - GRAIN_RAW`.
- `_tidy` finds islands with 4-neighbour parts and ponds with 8-neighbour parts.
- `_smooth` reads the old cells while it writes a copy, and counts a missing neighbour as the cell's own value.

**Mirror block:**

```ts
  const raw = rawOf(seed, rise, relief, ridges);
  const sea = cut(raw, landPermille);
  prints.set('raw', fold(sea, raw));
  prints.set('land', fold(landOf(raw, sea, width, height)));
  const shaped = shape(seed, width, height);
  prints.set('shape', fold(shaped.template, shaped.elevation, shaped.ocean));
```

with `cut`, `landOf`, `rawOf` and `shape` added to the `shape.ts` import.

### Task 16: Rain (junior)

**Files:** create `packages/worldgen/src/climate/rain.ts`.

**Spec:** `climate.py`: `rain`, and its sub-purposes `WIND` (0x100) and `WET` (0x101).

**Interface:** `rain(seed, width, height, elevation: Int32Array, water: Uint8Array): { rain: Int32Array; wind: number }`, where `wind` is the side's index, as in `SIDE_NAMES`.

**Traps:**
- The visiting order is `sorted(range(n), key=lambda i: (i % width * ux + i // width * uy, i), reverse=True)`: by projection, then by cell, both descending.
- `lx, ly = -uy, ux`. Each side cell falls back to `mid` when it lies off the map.
- `world.generate` passes the ocean as `water`, not the lakes.

**Mirror block:**

```ts
  const rained = rain(seed, width, height, shaped.elevation, shaped.ocean);
  prints.set('rain', fold(rained.wind, rained.rain));
```

with `import { rain } from '../../src/climate/rain.ts';`.

### Task 17: Erosion: flood, accumulate and erode (junior)

**Files:** create `packages/worldgen/src/drainage/flood.ts`.

**Spec:** `drainage.py`: its constants, `flood`, `accumulate` and `_erode`.

**Interfaces,** in `flood.ts`:
- `LAKE_DEPTH`, `MAX_LAKE`, `RAIN_UNIT`, `RIVER_CELLS`, `EROSION_PASSES` and `FLAT`;
- `interface Flood { filled: Int32Array; receiver: Int32Array; order: Int32Array }`;
- `flood(seed, width, height, elevation: Int32Array, sinks: Uint8Array): Flood`;
- `accumulate(order, receiver, rain: Int32Array, ocean: Uint8Array): Int32Array`;
- `erode(elevation, filled, receiver, flow, ocean): Int32Array`.

**Traps:**
- `flood`'s heap key is `(height, draw(seed, ELEVATION, FLAT, cell), cell)`. A seeded cell enters at its own `elevation`, and a reached cell at its new `filled` value.
- A cell is marked done when it is pushed, never when it is popped.
- `accumulate` walks `order` backwards, and skips the ocean.

**Mirror block:**

```ts
  let eroded = shaped.elevation;
  const passes: Part[] = [];
  for (let pass = 0; pass < EROSION_PASSES; pass++) {
    const flooded = flood(seed, width, height, eroded, shaped.ocean);
    const flow = accumulate(flooded.order, flooded.receiver, rained.rain, shaped.ocean);
    eroded = erode(eroded, flooded.filled, flooded.receiver, flow, shaped.ocean);
    passes.push(flooded.filled, flooded.receiver, flooded.order, flow, eroded);
  }
  prints.set('erode', fold(...passes));
```

with `import { EROSION_PASSES, accumulate, erode, flood } from '../../src/drainage/flood.ts';`, and `Part` added to the `fold.ts` import.

### Task 18: Lakes, rivers and drainage (junior)

**Files:** create `packages/worldgen/src/drainage/lakes.ts` and `src/drainage/drain.ts`.

**Spec:** `drainage.py`: `_lakes`, `_lowest`, `drain` and `rivers`.

**Interfaces:**
- In `lakes.ts`: `lakes(width, height, elevation, filled, ocean): { lake: Uint8Array; terminal: Uint8Array; level: Int32Array }` and `lowest(cells: readonly number[], elevation: Int32Array, nbrs: Adjacency): number[]`.
- In `drain.ts`: `rivers(width, height, flow, receiver, lake, ocean): Uint8Array`; `interface Drained { elevation: Int32Array; lake: Uint8Array; receiver: Int32Array; flow: Int32Array; river: Uint8Array }`; and `drain(seed, width, height, elevation, ocean, rain): Drained`.

**Traps:**
- `_lakes` groups pit cells with an adjacency of only the neighbours at the same filled height: build it with `adjacency()`. Each group's cells are in index order.
- The second pass of `_lakes` reads `before` and `closed`, copies taken before it starts, and writes `lake`, `terminal` and `level`.
- `_lowest`'s heap may hold one cell twice; pop it, and skip it if taken.
- `rivers` links each river cell with its receiver both ways. It keeps a river only where its linked group holds 3 or more cells.

**Mirror block:**

```ts
  const settled = flood(seed, width, height, eroded, shaped.ocean);
  const pools = lakes(width, height, eroded, settled.filled, shaped.ocean);
  prints.set('lakes', fold(settled.filled, settled.receiver, settled.order, pools.lake, pools.terminal, pools.level));
  const drained = drain(seed, width, height, shaped.elevation, shaped.ocean, rained.rain);
  prints.set('drain', fold(drained.elevation, drained.lake, drained.receiver, drained.flow, drained.river));
```

with `import { lakes } from '../../src/drainage/lakes.ts';` and `import { drain } from '../../src/drainage/drain.ts';`.

### Task 19: Temperature, moisture and coasts (junior)

**Files:** create `packages/worldgen/src/climate/biomes.ts` and `src/climate/climate.ts`.

**Spec:** `climate.py`: its codes and thresholds, `temperature`, `moisture` and `coasts`.

**Interfaces:**
- In `biomes.ts`, for now: `OCEAN` to `SNOW` as `BIOME_NAMES.indexOf(...)`; `INLAND`, `BEACH` and `CLIFFS` (0–2); and `HILLS_AT`, `MOUNTAIN_AT`, `PEAK_AT`, `SNOW_BELOW`, `CLIFF_AT`, `BEACH_BELOW` and `MARSH_BELOW`. Task 20 adds the function. `climate.ts` imports these from `biomes.ts`, never the other way, so the two modules never form a cycle.
- In `climate.ts`: the sub-purposes `EDGE` (0x102), `COLD` (0x103) and `SPAN` (0x104); `temperature(seed, width, height, elevation): { temperature: Uint8Array; cold: number }`, where `cold` is 0 for north and 2 for south; `moisture(seed, width, height, rain: Int32Array, water: Uint8Array, river: Uint8Array): Uint8Array`; and `coasts(width, height, elevation, ocean): Uint8Array`.

**Traps:**
- `(fbm(...) - 32768) // 1024` and `// 150` are negative half the time: `floorDiv` (R9's fourth trap).
- `moisture`'s water is the ocean with the lakes.

**Mirror block:**

```ts
  const water = union(shaped.ocean, drained.lake);
  const warmth = temperature(seed, width, height, drained.elevation);
  const wetness = moisture(seed, width, height, rained.rain, water, drained.river);
  const coast = coasts(width, height, drained.elevation, shaped.ocean);
  prints.set('climate', fold(warmth.cold, warmth.temperature, wetness, coast));
```

with `import { union } from '../../src/grid/grid.ts';` and `import { coasts, moisture, temperature } from '../../src/climate/climate.ts';`.

### Task 20: Biomes, slopes and habitability (junior)

**Files:** modify `packages/worldgen/src/climate/biomes.ts` and `src/climate/climate.ts`; create `src/settle/habitability.ts`.

**Spec:** `climate.py`: `slopes`, `_sandy`, `_crest`, `biomes` and `_despeckle`, with `BEACHES` (0x105); `settle.py`: `BASE`, `MARGIN`, `TOP_MARGIN` and `habitability`.

**Interfaces:**
- In `biomes.ts`: `biomes(seed, width, height, elevation, temperature, moisture, ocean, lake, river, coast): Uint8Array`.
- In `climate.ts`: `slopes(width, height, elevation, water): Int32Array`.
- In `habitability.ts`: `BASE`, an array by biome code holding −1 where Python's dict has no entry; and `habitability(width, height, biome, elevation, river, coast, temperature, moisture, slope: Int32Array): Int32Array`.

**Traps:**
- `biomes`' if-chain order is the rule: the first true branch wins. Split it into helpers for water and height, and for the lowland covers, to stay under the complexity limit.
- `_despeckle`'s soft covers are, in order, grassland, deciduous, conifer, marsh, sand and snow. A tie goes to the earliest of them.

**Mirror block:**

```ts
  const biome = biomes(seed, width, height, drained.elevation, warmth.temperature, wetness, shaped.ocean, drained.lake, drained.river, coast);
  prints.set('biomes', fold(biome));
  const slope = slopes(width, height, drained.elevation, water);
  const score = habitability(width, height, biome, drained.elevation, drained.river, coast, warmth.temperature, wetness, slope);
  prints.set('habitability', fold(slope, score));
```

with `biomes` and `slopes` imported, and `import { habitability } from '../../src/settle/habitability.ts';`.

### Task 21: Settlements (junior)

**Files:** create `packages/worldgen/src/settle/settle.ts`.

**Spec:** `settle.py`: its constants, `Settlement`, `_sites`, `settle` and `_tier`.

**Interfaces:**
- `interface Settlement { id: number; x: number; y: number; tier: number; population: number; uid: number; landmarks: number[] }`, where `tier` is a `TIER_NAMES` index and `landmarks` holds `LANDMARK_NAMES` indices.
- `CAPITAL`, `CITY`, `TOWN`, `VILLAGE` and `HAMLET` (0–4); `FIELDS`, by tier.
- `sites(seed, width, height, score: Int32Array, landCells): [number, number][]`, `settle(seed, width, height, score, landCells): Settlement[]` and `tierOf(id, population): number`.

**Traps:**
- `spacing` and `LEADER_SPACING` are squared distances, compared with `dist2` as they are.
- `top // rank * (750 + below(...)) // 1000` groups left to right (rule 4).
- Both sorts break ties by the lower index (rule 8).

**Mirror block:**

```ts
  const landCells = water.length - sum(water);
  const settlements = settle(seed, width, height, score, landCells);
  prints.set('settle', fold(rows(settlements.map((s) => [s.id, s.x, s.y, s.tier, s.population, s.uid]))));
```

with `sum` added to the grid import, `rows` to the `fold.ts` import, and `import { settle } from '../../src/settle/settle.ts';`.

### Task 22: Countries (junior)

**Files:** create `packages/worldgen/src/routes/costs.ts`, `src/countries/grow.ts` and `src/countries/countries.ts`.

**Spec:** `roads.py`'s `COVER`, `BRIDGE`, `STRAIGHT`, `DIAGONAL` and `SPAN2`; `countries.py`: all of it.

**Interfaces:**
- In `costs.ts`:

  ```ts
  import { BIOME_NAMES } from '@nomos/sim-protocol/world-map';

  // roads.py's step costs, which countries.py shares. Water has no cover: roads never enter it, and countries pay WATER.
  const COVER_BY_NAME: Record<string, number> = {
    grassland: 0,
    farmland: 0,
    sand: 6,
    'forest-deciduous': 8,
    'forest-conifer': 10,
    snow: 12,
    marsh: 18,
    hills: 14,
    mountain: 48,
    peak: 160,
  };
  export const COVER: readonly number[] = BIOME_NAMES.map((name) => COVER_BY_NAME[name] ?? 0);
  export const BRIDGE = 72;
  export const STRAIGHT = 10;
  export const DIAGONAL = 14;
  export const SPAN2 = 14 * 14;
  ```

- In `grow.ts`: `RIVER_STEP`, `WATER` and `FAR`; `slips(c, a, b, m, wet: Uint8Array, river, receiver): boolean`; and `grow(width, height, biome, river, receiver, sources: readonly number[]): Int32Array`, labels 1 to `sources.length` in source order, water included.
- In `countries.ts`: `COUNT`, `COLOUR`, `COLOURS`, `CAPITAL_TIERS` (the codes of capital, city and town) and `MIN_SETTLEMENTS`; `interface Country { id: number; capital: number; colour: number }`; `count(seed)`, `capitals(settlements, k, landCells): number[]` and `found(seed, width, height, biome, river, receiver, settlements: Settlement[], landCells): { country: Uint8Array; countries: Country[] }`.

**Traps:**
- `grow`'s heap key is `(cost, cell)`. Skip a popped key whose cost is above the cell's best.
- `found` sets each capital's `tier` to `CAPITAL` and changes nothing else. Its `small` list keeps id order, and it passes over the last entry.
- `shuffled(range(COLOURS), ...)` keys on positions 0–4.

**Mirror block:**

```ts
  const founded = found(seed, width, height, biome, drained.river, drained.receiver, settlements, landCells);
  const nations = rows(founded.countries.map((c) => [c.id, c.capital, c.colour]));
  prints.set('countries', fold(founded.country, nations, settlements.map((s) => s.tier)));
```

with `import { found } from '../../src/countries/countries.ts';`.

### Task 23: Regions and market territories, and `frozen-v1.json` (senior)

**Files:** modify `packages/worldgen/src/countries/grow.ts`; create `src/regions/regions.ts`, `scripts/frozen.ts`, `test/fixtures/frozen-v1.json` and `test/regions.test.ts`; modify `test/engines/stages.ts`, `test/goldens.test.ts`, `scripts/engines.ts`, `test/browser/engines.spec.ts` and `.github/workflows/ci.yml`.

- **`grow` gains `open: Uint8Array | null = null`.** A step into a cell whose flag is 0 is skipped, and `null` opens every cell, so countries' goldens can't move.
- **`regions(width, height, biome, river, receiver, country: Uint8Array, settlements): Regions`,** as Ruling 10 has it, where `Regions` is `{ region: Uint16Array; market: Uint16Array; seat: Int32Array; country: Uint8Array }`:
  - the seats are the capitals, cities and towns, in id order, and region r + 1 is `seat[r]`;
  - for each country k, one `grow` runs from k's seats, with `open` set on k's land and all water, and its labels map back to region ids on k's land;
  - one `grow` with no fence, from every seat, gives the market ids; water gets 0 in both.
- **Tests,** in `regions.test.ts`:
  - on a hand-made strip, a seat never claims land across a border, and an island of a country without a seat of its own on it joins that country's nearest region across the water;
  - over the 10 standard and 2 large sample worlds, every land cell's region belongs to the cell's country, and every seat lies in its own region.
- **The mirror** gains, after the countries block, `prints.set('regions', fold(zoned.region, zoned.market, zoned.seat, zoned.country))`.
- **`frozen.ts`** writes `frozen-v1.json`, `{ version: 1, stages: ['regions'], worlds }`, from the mirror over the same 200 worlds. With `--check` it compares instead, and Task 34 adds `names`.
- **Every checker passes the frozen file.** The goldens test, `engines.ts` and the browser spec pass it as `checkStages`' second argument. CI's `check` job adds `node packages/worldgen/scripts/frozen.ts --check`.
- **Commits:** `feat(worldgen): grow regions inside countries and markets across them`, then `test(worldgen): freeze the regions stage`.

### Task 24: Farmland and the route graph (junior)

**Files:** create `packages/worldgen/src/settle/farm.ts` and `src/routes/graph.ts`.

**Spec:** `settle.py`'s `farm`; `roads.py`'s `landmasses`, `route_graph` and `_around`.

**Interfaces:**
- `farm(seed, width, biome, settlements): Uint8Array`.
- `landmasses(width, height, biome): Int32Array`.
- `routeGraph(settlements, mass: readonly number[]): [number, number][]`, the edges in the order Python appends them.
- `around(links: readonly (readonly [number, number])[][], start, goal, limit): number`.

**Traps:**
- `farm` tests the old biome, never the fields it has just laid.
- `route_graph`'s second loop adds links as it goes, so a later pair sees an earlier extra.
- `_around`'s `best.get(m, limit + 1)` treats an unseen node as cost `limit + 1`.

**Mirror block:**

```ts
  const farmed = farm(seed, width, biome, settlements);
  prints.set('farm', fold(farmed));
  const mass = landmasses(width, height, farmed);
  prints.set('routes', fold(rows(routeGraph(settlements, settlements.map((s) => mass[s.uid])))));
```

with `import { farm } from '../../src/settle/farm.ts';` and `import { landmasses, routeGraph } from '../../src/routes/graph.ts';`.

### Task 25: Roads (junior)

**Files:** create `packages/worldgen/src/routes/roads.ts`.

**Spec:** `roads.py`'s `_steps`, `_walk` and `build`.

**Interfaces:**
- `interface Moves extends Adjacency { readonly base: Int32Array }`, `_steps`' moves with each one's base cost;
- `steps(width, height, biome, river, receiver): Moves`;
- `class Walker`, made once per build, with `walk(start, goal): number[]`. It keeps `_walk`'s `cost` and `came` dicts as two `Int32Array(n)`, with `UNSEEN` = 2^31 − 1 for "not seen", and resets the cells one walk touched before the next;
- `buildRoads(width, height, biome, elevation, river, receiver, settlements): { roads: number[][]; bridges: number[] }`.

**Traps:**
- The A\* key is `(g + ahead, g, cell)`. A push replaces nothing; a popped key whose `g` is above the cell's cost is skipped.
- `step //= 2` on a road cell happens after the base cost is computed: `floorDiv(step, 2)`.
- `pull` sorts by `-(people[a] * people[b] // d2)`, then `a`, then `b`. The product reaches 2.5 × 10^11.

**Mirror block:**

```ts
  const built = buildRoads(width, height, farmed, drained.elevation, drained.river, drained.receiver, settlements);
  prints.set('roads', fold(paths(built.roads), built.bridges));
```

with `paths` added to the `fold.ts` import, and `import { buildRoads } from '../../src/routes/roads.ts';`.

### Task 26: Sea lanes (junior)

**Files:** create `packages/worldgen/src/routes/lanes.ts`.

**Spec:** `roads.py`'s `lanes` and `_sail`.

**Interfaces:** `lanes(width, height, biome, settlements): number[][]` and `sail(start, goal, nbrs: Adjacency, biome): number[]`.

**Traps:**
- `_sail` is a breadth-first search from a land cell. It marks every neighbour it meets, sea or not, but only sea cells go on.
- Two landmasses join only when a path is found.

**Mirror block:**

```ts
  const sailed = lanes(width, height, farmed, settlements);
  prints.set('lanes', fold(paths(sailed)));
```

with `import { lanes } from '../../src/routes/lanes.ts';`.

### Task 27: The survey and wonders (junior)

**Files:** create `packages/worldgen/src/world/draft.ts`, `src/features/survey.ts` and `src/features/wonders.ts`.

**Spec:** `features.py`: the `WONDER` sub-purposes, `Land`, `survey`, `_xy`, `_at`, `_framed`, `_heated`, `_count`, the eleven site rules, `SITES` and `wonders`.

**Interfaces:**
- In `draft.ts`:

  ```ts
  import type { Settlement } from '../settle/settle.ts';

  export interface Spot {
    kind: number;
    x: number;
    y: number;
  }

  // What features.py reads of world.py's World.
  export interface FeatureWorld {
    seed: number;
    width: number;
    height: number;
    elevation: Int32Array;
    biome: Uint8Array;
    temperature: Uint8Array;
    moisture: Uint8Array;
    river: Uint8Array;
    receiver: Int32Array;
    coast: Uint8Array;
    settlements: Settlement[];
    roads: number[][];
    bridges: number[];
  }
  ```

- In `survey.ts`: `interface Land { nbrs: Adjacency; water: Uint8Array; slope: Int32Array; forestDepth: Uint8Array; town: Uint8Array; big: Uint8Array; wet: Uint8Array; hotspot: number; hotReach: number }`; `survey(world: FeatureWorld): Land`; and `at`, `framed`, `heated` and `countAround`, Python's `_at`, `_framed`, `_heated` and `_count`.
- In `wonders.ts`: `WONDER_GAP2`; one function per site rule, `(world: FeatureWorld, land: Land, cell: number) => number`; `SITES`, by `WONDER_NAMES` index; and `wonders(world: FeatureWorld, land: Land): Spot[]`.

**Traps:**
- `forest_depth`'s sources are the cells outside forest, and its search enters only forest.
- `hotspot` is the hills or mountain cell with the largest `(draw(seed, WONDER, HOTSPOT, cell), cell)`, or −1 when there is none.
- `wonders` tries the kinds in `shuffled(WONDERS, seed, WONDER, ORDER)` order. Each keeps the best `(score, draw(seed, WONDER, TIE, kind, cell))`, the first on a tie.

**Mirror block:**

```ts
  const world: FeatureWorld = {
    seed,
    width,
    height,
    elevation: drained.elevation,
    biome: farmed,
    temperature: warmth.temperature,
    moisture: wetness,
    river: drained.river,
    receiver: drained.receiver,
    coast,
    settlements,
    roads: built.roads,
    bridges: built.bridges,
  };
  const land = survey(world);
  prints.set('survey', fold(land.slope, land.forestDepth, land.town, land.big, land.wet, land.hotspot, land.hotReach));
  const spots = wonders(world, land);
  prints.set('wonders', fold(rows(spots.map((p) => [p.kind, p.x, p.y]))));
```

with `import type { FeatureWorld } from '../../src/world/draft.ts';`, `import { survey } from '../../src/features/survey.ts';` and `import { wonders } from '../../src/features/wonders.ts';`.

### Task 28: Landmarks (junior)

**Files:** create `packages/worldgen/src/features/landmarks.ts`.

**Spec:** `features.py`: the `LANDMARK` sub-purposes, `CHANCES`, `_lighthouse_spot`, `_fits`, `landmarks`, `_viaducts` and `_observatories`.

**Interfaces:** `CHANCES`, an array of `[landmark code, per mille by tier]` in Python's dict order; and `landmarks(world: FeatureWorld, land: Land, wonderSpots: readonly Spot[]): Spot[]`. It fills each settlement's `landmarks`, as Python does, and returns the lighthouses, viaducts and observatories.

**Traps:**
- `kinds` is filtered in `CHANCES` order before `shuffled(kinds, seed, LANDMARK, ARRANGE, s.uid)`, which keys on positions in the filtered list.
- A capital's clock tower moves to the front after the shuffle.
- `used` grows as lighthouses, viaducts and observatories are placed, settlement by settlement.
- `_viaducts` and `_observatories` sort descending over whole tuples (rule 8).

**Mirror block:**

```ts
  const own = landmarks(world, land, spots);
  prints.set('landmarks', fold(rows(own.map((p) => [p.kind, p.x, p.y])), paths(settlements.map((s) => s.landmarks))));
```

with `import { landmarks } from '../../src/features/landmarks.ts';`.

### Task 29: `generateWorld`, the `WorldMap` and the world fingerprint (junior, exact code)

**Files:** modify `packages/worldgen/src/world/draft.ts`; create `src/world/generate.ts`, `src/world/fingerprint.ts`, `src/index.ts` and `test/generate.test.ts`; modify `test/engines/stages.ts`.

- [ ] **Step 1: Write the failing test,** `packages/worldgen/test/generate.test.ts`. The two fingerprints are `test_worldgen.py`'s pinned ones.

  ```ts
  import { worldMapBuffers } from '@nomos/sim-protocol/world-map';
  import { describe, expect, it } from 'vitest';
  import { generateWorld, worldFingerprint } from '../src/index.ts';

  describe('generateWorld', { timeout: 60_000 }, () => {
    it("makes Python's world for each size", () => {
      expect(worldFingerprint(generateWorld(0x5eed0001, 'standard'))).toBe(0x1ec8f880);
      expect(worldFingerprint(generateWorld(0x5eed0001, 'large'))).toBe(0x867cd479);
    });

    it('times every stage in order', () => {
      const laps: string[] = [];
      generateWorld(0x5eed0002, 'standard', { lap: (stage) => laps.push(stage) });
      expect(laps).toEqual([
        'shape', 'rain', 'drain', 'climate', 'biomes', 'settle', 'countries', 'regions', 'farm', 'roads', 'lanes', 'features',
      ]);
    });

    it('gives every column a buffer of its own', () => {
      const buffers = worldMapBuffers(generateWorld(0x5eed0003, 'standard'));
      expect(new Set(buffers).size).toBe(buffers.length);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run packages/worldgen/test/generate.test.ts`. Expected: fails, since `src/index.ts` doesn't exist.
- [ ] **Step 3: Append to `draft.ts`:**

  ```ts
  // world.py's World, as generateWorld builds it before packing it as a WorldMap.
  export interface Draft extends FeatureWorld {
    template: number;
    wind: number;
    cold: number;
    lanes: number[][];
    wonders: Spot[];
    landmarks: Spot[];
    country: Uint8Array;
    countries: Country[];
    zones: Regions;
  }
  ```

  with `import type { Country } from '../countries/countries.ts';` and `import type { Regions } from '../regions/regions.ts';`.
- [ ] **Step 4: `src/world/generate.ts`:**

  ```ts
  import { draw2 } from '@nomos/sim-core/kernels';
  import {
    LANDMARK_SLOTS,
    NO_LANDMARK,
    WORLDGEN_VERSION,
    WORLD_SIZES,
    type PathTable,
    type WorldMap,
    type WorldSize,
  } from '@nomos/sim-protocol/world-map';
  import { biomes } from '../climate/biomes.ts';
  import { coasts, moisture, slopes, temperature } from '../climate/climate.ts';
  import { rain } from '../climate/rain.ts';
  import { found } from '../countries/countries.ts';
  import { drain } from '../drainage/drain.ts';
  import { landmarks } from '../features/landmarks.ts';
  import { survey } from '../features/survey.ts';
  import { wonders } from '../features/wonders.ts';
  import { sum, union } from '../grid/grid.ts';
  import { SHAPE } from '../random/streams.ts';
  import { regions } from '../regions/regions.ts';
  import { lanes } from '../routes/lanes.ts';
  import { buildRoads } from '../routes/roads.ts';
  import { farm } from '../settle/farm.ts';
  import { habitability } from '../settle/habitability.ts';
  import { settle } from '../settle/settle.ts';
  import { shape } from '../terrain/shape.ts';
  import type { Draft, Spot } from './draft.ts';

  export interface StageTimer {
    lap(stage: string): void;
  }

  // mapdraw.py's keyed tile variant, a sub-purpose of the SHAPE stream.
  const VARIANT = 0x200;
  const NO_TIMER: StageTimer = { lap() {} };

  // world.generate, stage by stage, packed as interfaces.md's WorldMap.
  export function generateWorld(seed: number, size: WorldSize, timer: StageTimer = NO_TIMER): WorldMap {
    const uint = seed >>> 0;
    const [width, height] = WORLD_SIZES[size];
    const shaped = shape(uint, width, height);
    timer.lap('shape');
    const rained = rain(uint, width, height, shaped.elevation, shaped.ocean);
    timer.lap('rain');
    const drained = drain(uint, width, height, shaped.elevation, shaped.ocean, rained.rain);
    timer.lap('drain');
    const water = union(shaped.ocean, drained.lake);
    const warmth = temperature(uint, width, height, drained.elevation);
    const wetness = moisture(uint, width, height, rained.rain, water, drained.river);
    const coast = coasts(width, height, drained.elevation, shaped.ocean);
    timer.lap('climate');
    const { elevation, lake, river, receiver } = drained;
    const biome = biomes(uint, width, height, elevation, warmth.temperature, wetness, shaped.ocean, lake, river, coast);
    const slope = slopes(width, height, elevation, water);
    const score = habitability(width, height, biome, elevation, river, coast, warmth.temperature, wetness, slope);
    timer.lap('biomes');
    const landCells = water.length - sum(water);
    const settlements = settle(uint, width, height, score, landCells);
    timer.lap('settle');
    const founded = found(uint, width, height, biome, river, receiver, settlements, landCells);
    timer.lap('countries');
    const zones = regions(width, height, biome, river, receiver, founded.country, settlements);
    timer.lap('regions');
    const farmed = farm(uint, width, biome, settlements);
    timer.lap('farm');
    const built = buildRoads(width, height, farmed, elevation, river, receiver, settlements);
    timer.lap('roads');
    const sailed = lanes(width, height, farmed, settlements);
    timer.lap('lanes');
    const draft: Draft = {
      seed: uint,
      width,
      height,
      template: shaped.template,
      wind: rained.wind,
      cold: warmth.cold,
      elevation,
      biome: farmed,
      temperature: warmth.temperature,
      moisture: wetness,
      river,
      receiver,
      coast,
      settlements,
      roads: built.roads,
      bridges: built.bridges,
      lanes: sailed,
      wonders: [],
      landmarks: [],
      country: founded.country,
      countries: founded.countries,
      zones,
    };
    const land = survey(draft);
    draft.wonders = wonders(draft, land);
    draft.landmarks = landmarks(draft, land, draft.wonders);
    timer.lap('features');
    return pack(draft);
  }

  function pathTable(paths: readonly (readonly number[])[]): PathTable {
    const offsets = new Int32Array(paths.length + 1);
    for (let p = 0; p < paths.length; p++) offsets[p + 1] = offsets[p] + paths[p].length;
    const cells = new Int32Array(offsets[paths.length]);
    for (let p = 0; p < paths.length; p++) cells.set(paths[p], offsets[p]);
    return { offsets, cells };
  }

  function spotColumns(spots: readonly Spot[], width: number): { kind: Uint8Array; cell: Int32Array } {
    return { kind: Uint8Array.from(spots, (p) => p.kind), cell: Int32Array.from(spots, (p) => p.y * width + p.x) };
  }

  function settlementColumns(draft: Draft): WorldMap['settlements'] {
    const { settlements, country, zones } = draft;
    const landmarks = new Uint8Array(settlements.length * LANDMARK_SLOTS).fill(NO_LANDMARK);
    settlements.forEach((s, id) => landmarks.set(s.landmarks, id * LANDMARK_SLOTS));
    return {
      cell: Int32Array.from(settlements, (s) => s.uid),
      tier: Uint8Array.from(settlements, (s) => s.tier),
      population: Int32Array.from(settlements, (s) => s.population),
      country: Uint8Array.from(settlements, (s) => country[s.uid]),
      region: Uint16Array.from(settlements, (s) => zones.region[s.uid]),
      landmarks,
    };
  }

  function variants(seed: number, cells: number): Uint8Array {
    const out = new Uint8Array(cells);
    for (let cell = 0; cell < cells; cell++) out[cell] = draw2(seed, SHAPE, VARIANT, cell) & 3;
    return out;
  }

  function pack(draft: Draft): WorldMap {
    const { seed, width, height, zones } = draft;
    return {
      version: WORLDGEN_VERSION,
      seed,
      width,
      height,
      template: draft.template,
      wind: draft.wind,
      cold: draft.cold,
      elevation: Int16Array.from(draft.elevation),
      biome: draft.biome,
      temperature: draft.temperature,
      moisture: draft.moisture,
      river: draft.river,
      receiver: draft.receiver,
      coast: draft.coast,
      variant: variants(seed, width * height),
      country: draft.country,
      region: zones.region,
      market: zones.market,
      settlements: settlementColumns(draft),
      countries: {
        capital: Int32Array.from(draft.countries, (c) => c.capital),
        colour: Uint8Array.from(draft.countries, (c) => c.colour),
      },
      regions: { seat: zones.seat, country: zones.country },
      roads: pathTable(draft.roads),
      lanes: pathTable(draft.lanes),
      bridges: Int32Array.from(draft.bridges),
      wonders: spotColumns(draft.wonders, width),
      landmarks: spotColumns(draft.landmarks, width),
    };
  }
  ```

- [ ] **Step 5: `src/world/fingerprint.ts`:**

  ```ts
  import { floorDiv, floorMod, mix } from '@nomos/sim-core/kernels';
  import { LANDMARK_SLOTS, NO_LANDMARK, type PathTable, type WorldMap } from '@nomos/sim-protocol/world-map';

  // world.py's fingerprint, read back from the map: the same values fed in the same order, so the two agree exactly.
  export function worldFingerprint(map: WorldMap): number {
    let h = feed(feed(mix(map.seed), map.width), map.height);
    for (const column of [map.elevation, map.biome, map.temperature, map.moisture, map.river, map.receiver, map.coast]) {
      h = feedColumn(h, column);
    }
    h = feedSettlements(h, map);
    h = feedPaths(feedPaths(h, map.roads), map.lanes);
    h = feedColumn(h, map.bridges);
    h = feedSpots(h, map.wonders.kind, map.wonders.cell, map.width);
    h = feedSpots(h, map.landmarks.kind, map.landmarks.cell, map.width);
    h = feed(h, map.countries.capital.length);
    for (let k = 0; k < map.countries.capital.length; k++) h = feed(feed(h, map.countries.capital[k]), map.countries.colour[k]);
    return feedColumn(h, map.country);
  }

  function feed(h: number, value: number): number {
    return mix(h ^ value);
  }

  function feedColumn(h: number, column: ArrayLike<number>): number {
    let out = feed(h, column.length);
    for (let i = 0; i < column.length; i++) out = feed(out, column[i]);
    return out;
  }

  function landmarkCount(landmarks: Uint8Array, first: number): number {
    let count = 0;
    while (count < LANDMARK_SLOTS && landmarks[first + count] !== NO_LANDMARK) count++;
    return count;
  }

  function feedSettlements(h: number, map: WorldMap): number {
    const { cell, tier, population, landmarks } = map.settlements;
    let out = feed(h, cell.length);
    for (let id = 0; id < cell.length; id++) {
      out = feed(feed(feed(out, id), floorMod(cell[id], map.width)), floorDiv(cell[id], map.width));
      out = feed(feed(out, tier[id]), population[id]);
      const first = id * LANDMARK_SLOTS;
      const count = landmarkCount(landmarks, first);
      out = feed(out, count);
      for (let k = 0; k < count; k++) out = feed(out, landmarks[first + k]);
    }
    return out;
  }

  function feedPaths(h: number, table: PathTable): number {
    const { offsets, cells } = table;
    let out = feed(h, offsets.length - 1);
    for (let p = 0; p + 1 < offsets.length; p++) {
      out = feed(out, offsets[p + 1] - offsets[p]);
      for (let c = offsets[p]; c < offsets[p + 1]; c++) out = feed(out, cells[c]);
    }
    return out;
  }

  function feedSpots(h: number, kind: Uint8Array, cell: Int32Array, width: number): number {
    let out = feed(h, kind.length);
    for (let k = 0; k < kind.length; k++) {
      out = feed(feed(feed(out, kind[k]), floorMod(cell[k], width)), floorDiv(cell[k], width));
    }
    return out;
  }
  ```

- [ ] **Step 6: `src/index.ts`:**

  ```ts
  export { generateWorld, type StageTimer } from './world/generate.ts';
  export { worldFingerprint } from './world/fingerprint.ts';
  ```

- [ ] **Step 7: The mirror's last block,** with `import { generateWorld, worldFingerprint } from '../../src/index.ts';`:

  ```ts
  prints.set('world', worldFingerprint(generateWorld(seed, size)));
  ```

- [ ] **Step 8: Run** the Step 2 command, the goldens test, `node packages/worldgen/scripts/engines.ts` and the gates. Expected: all pass; the engines script now checks 23 Python stages and the regions stage in every world.
- [ ] **Step 9: Commit** `feat(worldgen): generate a whole world as a WorldMap`.

### Task 30: Stand-in names and the map worker (junior, exact code)

**Files:** create `packages/worldgen/src/names/place-names.ts`; modify `packages/worldgen/src/index.ts` and `apps/web/package.json` (shared); create `apps/web/src/map/generate.ts`, `src/map/map-worker.ts` and `test/map-worker.test.ts`; `pnpm-lock.yaml` changes.

- [ ] **Step 1: Write the failing test,** `apps/web/test/map-worker.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { worldFingerprint } from '@nomos/worldgen';
  import { answerGenerate } from '../src/map/generate.ts';

  describe('the map worker', { timeout: 60_000 }, () => {
    it('answers generate with the world, its names and its timings, every buffer listed', () => {
      let now = 0;
      const { reply, transfer } = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => (now += 2));
      expect(reply.type).toBe('world');
      expect(worldFingerprint(reply.map)).toBe(0x1ec8f880);
      expect(reply.names).toHaveLength(reply.map.countries.capital.length + reply.map.settlements.cell.length);
      expect(reply.names.slice(0, 2)).toEqual(['country-1', 'country-2']);
      expect(Object.keys(reply.stageMs)).toEqual([
        'shape', 'rain', 'drain', 'climate', 'biomes', 'settle', 'countries', 'regions', 'farm', 'roads', 'lanes', 'features', 'names',
      ]);
      expect(Object.values(reply.stageMs).every((ms) => ms === 2)).toBe(true);
      expect(new Set(transfer).size).toBe(transfer.length);
      const moved = structuredClone(reply, { transfer });
      expect(worldFingerprint(moved.map)).toBe(0x1ec8f880);
    });
  });
  ```

- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/map-worker.test.ts`. Expected: fails.
- [ ] **Step 3: Write the code.** `packages/worldgen/src/names/place-names.ts`:

  ```ts
  import { TIER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';

  // Stand-ins until the place-name table lands (M8.1, Task 33): countries by id, and settlements as Python names them.
  export function placeNames(map: WorldMap): string[] {
    const names: string[] = [];
    for (let k = 1; k <= map.countries.capital.length; k++) names.push(`country-${k}`);
    for (let id = 0; id < map.settlements.tier.length; id++) names.push(`${TIER_NAMES[map.settlements.tier[id]]}-${id}`);
    return names;
  }
  ```

  Add `export { placeNames } from './names/place-names.ts';` to `src/index.ts`. `apps/web/src/map/generate.ts`:

  ```ts
  import { worldMapBuffers, type MapAppMessage, type MapWorkerMessage } from '@nomos/sim-protocol/world-map';
  import { generateWorld, placeNames } from '@nomos/worldgen';

  export interface MapAnswer {
    reply: MapWorkerMessage;
    transfer: ArrayBuffer[];
  }

  // The map worker's one job: a world and its names, every buffer listed, so the page never copies a column.
  export function answerGenerate(msg: MapAppMessage, now: () => number): MapAnswer {
    const stageMs: Record<string, number> = {};
    let last = now();
    const lap = (stage: string): void => {
      const at = now();
      stageMs[stage] = at - last;
      last = at;
    };
    const map = generateWorld(msg.seed, msg.size, { lap });
    const names = placeNames(map);
    lap('names');
    return { reply: { type: 'world', map, names, stageMs }, transfer: worldMapBuffers(map) };
  }
  ```

  `apps/web/src/map/map-worker.ts`:

  ```ts
  import type { MapAppMessage } from '@nomos/sim-protocol/world-map';
  import { answerGenerate } from './generate.ts';

  // M8.3 starts this with new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' }), so
  // Vite builds it as map-worker-*.js, apart from every first-load chunk (interfaces.md, The world map).
  self.onmessage = (event: MessageEvent<MapAppMessage>) => {
    const { reply, transfer } = answerGenerate(event.data, () => performance.now());
    self.postMessage(reply, { transfer });
  };
  ```

  In `apps/web/package.json`, add `"@nomos/worldgen": "workspace:*"` to `dependencies`, in name order, then run `pnpm install`.
- [ ] **Step 4: Run** the Step 2 command and the gates. `pnpm depcruise` passes, since only the two map modules reach the generator.
- [ ] **Step 5: Nothing reached the first load.** `pnpm --filter @nomos/web build && pnpm --filter @nomos/web size`. Expected: no `map-worker-*.js` in `apps/web/dist/assets/` yet, since nothing starts the worker until M8.3, and every limit passes.
- [ ] **Step 6: Commit** `feat(web): answer generate in a map worker of its own`, with the five source and test files, `apps/web/package.json` and the lockfile.

### Task 31: The generation budget in a browser worker (senior)

**Files:** create `packages/worldgen/test/browser/perf.spec.ts` and `test/browser/time-worlds.ts`.

- **The spec,** named `perf.spec.ts`, so it runs in the `perf` project after every other browser project:
  - it bundles `time-worlds.ts` with esbuild and starts it as a worker from a blob URL;
  - the worker generates seed `5EED0001` 9 times at each size;
  - the spec checks the fastest of each against 100 and 400 ms, and records every stage's time from `StageTimer` as an annotation.
- **Measure** in local Chromium and on CI's runner, with the engine, version and load average beside each figure (docs rules). Task 1's estimate is 50–150 ms for a large world (R9's inference). If a stage misses, profile it and optimise only it, first with `draw1`–`draw4` for variadic draws in per-cell loops.
- **The phone tier waits for the owner.** Map times on a mid-range Android phone and an iPhone set the map's phone tier (task.md, Verify first). This is the owner's step, as M0.5's device timings were. Until then, M8.3's progress line covers a slow phone.
- **Commit** `test(worldgen): time world generation in a browser worker`.

### Task 32: The exit sweeps and the identity test (junior, exact code)

**Files:** create `packages/worldgen/scripts/sweep.ts` and `test/identity.test.ts`; modify `.github/workflows/ci.yml` (shared).

`sweep.ts` checks task.md's exit checks over every world it makes, and exits 1 on any problem:

- [ ] **Step 1: Countries and regions,** over 100 seeds of each size from `5EED0001`:
  - K is 3–5, every water cell has country 0, every land cell has 1–K, and every settlement's country is its cell's;
  - each country holds ≥ 3 settlements, and its capital lies in it with tier 0 and a population of at least 5,000;
  - the colours are distinct, in 0–4;
  - every land cell's region is 1–R, with that region's country equal to the cell's; water has region 0 and market 0;
  - every seat has tier 0–2 and lies in its own region, and every land cell's market is 1–R.
- [ ] **Step 2: Wonders,** over 1,000 standard seeds from `5EED0001`:
  - each world has 4–8 wonders, and no kind twice;
  - every hot-springs, geyser and caldera-lake wonder lies within `hotReach` of the one hotspot that `survey` finds. Rebuild the `FeatureWorld` from the map for this: the elevation copied into an `Int32Array`, the settlements from their columns, and the roads from their `PathTable`.
- [ ] **Step 3: `identity.test.ts`.** Take standard `5EED0001`'s map, rebuild its `FeatureWorld` as in Step 2, and run `survey` and `landmarks` on it. Then run them again with the settlements in reverse order, ids renumbered. Every inland settlement keeps the same landmarks by cell; coastal ones may share a lighthouse cell, so the test skips them.
- [ ] **Step 4: CI.** In the `check` job, after the worldgen engines step, add `- run: node packages/worldgen/scripts/sweep.ts`.
- [ ] **Step 5: Run it.** `node packages/worldgen/scripts/sweep.ts` prints a count of worlds and problems, and its time. Expected: `0 problems`, in about a minute (unsourced estimate).
- [ ] **Step 6: Commit** `test(worldgen): sweep countries, regions and wonders over many seeds`.

### Task 33: The place-name table and the picker (senior, then junior)

**Builds on** M0.7's `tools/names/scripts/words.ts`, which landed in 60e4f8e. The senior expands this task against the script as built; the steps below are what it must do.

- **The table.** `words.ts` gains a second output:
  - 1,024 place words from the shared sound set, on a build seed of their own;
  - each word 4–10 letters and passing `rejectName`;
  - written to `packages/worldgen/src/names/words.ts` as `PLACE_WORDS`;
  - and checked by `--check`, with Fantasy Map Generator's licence copied beside it as `names/LICENSE-fmg.txt`.
- **The picker** replaces the stand-ins in `place-names.ts`, keeping `placeNames(map)`'s signature:
  - a name is `PLACE_WORDS[(draw4(seed, NAME, kind, uid, attempt) >>> 0) % PLACE_WORDS.length]`, capitalised, with kind 0 for a country and 1 for a settlement;
  - a country's uid is its capital's cell, and a settlement's is its own cell;
  - countries take names first, in id order, then settlements in uid order, never id order. A word already taken in the world takes the next attempt;
  - the output keeps its order: countries by id, then settlements by id.
- **No culture's naming custom** ever shapes a country name (Countries rule 4). Site words such as "Ford" and "Port" are never joined to a name.
- **Tests:**
  - every table word has 4–10 letters and passes `rejectName`, and `words.ts --check` passes;
  - over 1,000 seeds of each size, no name repeats within a world, which `sweep.ts` checks;
  - names key on cells: reversing the settlements' ids leaves every name with its cell;
  - `frozen.ts` gains a `names` stage, the fold of each name's table index.
- **Commits:** `feat(names): write the place-name table`, `feat(worldgen): name places and countries from the table`, and `test(worldgen): freeze the place names`.

### Task 34: The owner's 100 names and the version 1 freeze (senior and owner)

- **Print 100 sample names** for the owner: 10 countries and 90 settlements over 10 large seeds from `5EED0001`, one per line with its kind. The owner listens to every new sound, so this waits on the owner.
- **On approval, freeze version 1:**
  - `goldens-v1.json` and `frozen-v1.json` are final;
  - `WORLDGEN_VERSION` stays 1;
  - `tools/worldgen/README.md` says that version 1 is frozen, and that any change to the output now takes version 2, with new goldens beside the old.
- **If the owner wants changes,** the senior adjusts the table's build seed or filter, regenerates, and asks again.
- **Commit** `docs(worldgen): freeze world generator version 1`.

### Task 35: Close M8.1 (senior)

- **README.** `tools/worldgen/README.md` gains the goldens, the port, and the `goldens.py` and `--check` commands.
- **Re-baseline the counts.** M7's and M8's settlement counts become listed places plus a region tier, with Zipf fitted on true ranks (R9). This touches M7's and M8's task files, which `check_coverage.py` then checks.
- **Prove every exit check** with `verification-before-completion`, through `senior-qa`.
- **Review:** `/determinism-review` over `packages/worldgen`, then `code-reviewer` over the whole part.
- **Record it:** the Started, Done and Actual cells in `milestone.md`, then the next checkpoint, committed alone as `docs(plan): add checkpoint NNNN`.

### Task 36: The large world by default (senior; owner, 10 October 2026)

The owner asked for a bigger world map. The map now opens the `large` size: 192 × 128 cells, four times the standard world. The generator and its goldens already cover that size. Later on 10 October the owner made this the first task of the round: the bigger map, more cities, towns and villages, and more blobs in proportion come before everything else. Run it before Task 35 closes M8.1.

- **More settlements come free.** `settle.py` sets its target at the land's cell count divided by 50–70, so a large world holds about four times the cities, towns and villages, and the crowd grows with them, one dot per 100 people. Check the counts per tier on 20 large worlds.
- **Capitals stay one per country,** with 3–5 countries, as the Countries plan has it. More capitals would need more countries, an owner decision this task doesn't take.

- Make `large` the map's default size. Keep `standard` for tests and as a fallback.
- Measure generation in the map worker against Task 31's budget, on desktop, and on phones when the owner sends the timings.
- The crowd grows with the population, at one dot per 100 people. Re-check the Region view against the 2 ms bar.
- Check the zoom ladder's Fit, the labels, the legend and the Go to list on a world four times the size. Fit on small screens is still the owner's deferred call.
- **Done when:** the map opens a large world, the frame tests and size limits pass, and the generation time is recorded.

### Exit checks, and the tasks that prove them

| Exit check (task.md) | Proved by |
| --- | --- |
| A standard world in ≤ 100 ms and a large one in ≤ 400 ms in desktop Chromium | Task 31's `perf.spec.ts` |
| Per-stage fingerprints match Python in Node, Bun, Chromium, Firefox and WebKit | Tasks 12 and 13: `engines.ts` in Node and Bun, and `engines.spec.ts` in three browsers |
| Over 100 seeds of each size: 3–5 countries, every land cell and settlement in one, each holding ≥ 3 settlements | Task 32's sweep; Part 1's `test_worldgen.py --seeds 100` in Python |
| Names pass the filter over 1,000 seeds, and none repeats within a world | Task 33 |

### Risks

- **A heap or sort that differs from Python's on ties.** Every key here is unique, and porting rules 8 and 9 and the goldens catch the rest.
- **Large worlds in Firefox and WebKit.** The browser spec runs 200 worlds twice over. If it passes 5 minutes, Task 13's spec splits into more tests.
- **Phones.** Until the owner's timings land, M8.3 shows a progress line while the map is made.
- **A shared file changed by two agents at once.** Check `git diff` before every commit of `eslint.config.js`, `.dependency-cruiser.cjs`, `ci.yml`, `apps/web/package.json` or the lockfile.
