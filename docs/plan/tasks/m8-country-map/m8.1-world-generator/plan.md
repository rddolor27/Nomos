# M8.1 World generator: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status:** Part 1, the Python countries stage, is a step plan (9 October 2026). It touches only `tools/worldgen`, so it runs while M0.7 is planned. Part 2 stays a brief: version 1's freeze and goldens, the place-name table and the TypeScript port need M0.7's `tools/names` and module layout, so their step plan is written when M0.7 closes (owner, 9 October 2026).

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
4. **The snow tiles wait for `tools/sprites`.** `map8_snow` and `map16_snow` belong in `tools/sprites/map.py`, outside this session's boundary (Task 6). Until then `mapdraw.py` fills snow cells with a flat stand-in colour.
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

### Task 6: The two snow tiles (outside this session)

`tools/sprites` lies outside the Python-first boundary, so the orchestrator assigns this task.
- Draw `map8_snow` and `map16_snow` as code in `tools/sprites/map.py`, under the README's art rules.
- Rebuild with `build_all.py`, which refreshes `assets/LICENSES.md`, and pass `test_sprites.py`.
- Delete `mapdraw`'s stand-in, so `_tile` returns `map{size}_snow` like every other biome.
- The owner reviews the tiles.

## Part 2: brief for the freeze, the names and the port

Written when M0.7 closes. Part 1 settles the countries stage, snow and the previews; this brief keeps the rest.

### Approach

- **Finish the Python reference, then port it.** Two phases, with an owner review between them:
  1. **In `tools/worldgen`:** Part 1. The owner reviews about 10 large-world previews from `generate.py`. Then the generator freezes as version 1, and `goldens.py` writes its goldens.
  2. **In `packages/worldgen`:** port every stage in pipeline order. Commit each stage only when its golden fingerprints match Python in all five engines (R9).
- **The countries stage (Countries)** is Part 1's `countries.py`. The port follows it line for line, with its heap keyed by (cost, cell). It runs after `settle` and before `farm`, because a capital's tier sets its farmland, its clock tower and the wonder spacing.
- **What a probe found** (measured here: a scratch probe on the Python generator, 20 large worlds, seeds `5eed0001`–`5eed0014`, Python 3.14.6):
  - These rules make sizeable countries. The smallest held 8–22% of the land, and every country held at least 3 settlements in 20 of 20 worlds.
  - Rivers here are mostly short streams that run to the coast, and capitals sit on rivers, since river cells score highest for habitability. So rivers seldom lie between two capitals. Borders touched a river on 9.9% of their edges, against 7.7% of all land edges, even with near-impassable river costs.
  - Mountains and lakes shaped borders more visibly: mountain or peak cells lay on 3.7–4.0% of border edges, against 1.2% of all land edges.
  - So keep the costs simple, and judge borders by eye on the previews rather than chasing a border-on-river share.
- **Fingerprints.**
  - Part 1 extends `world.fingerprint` with the country count, each country's capital id and colour index, and the per-cell country column. Its value changed for every seed, since capitals re-tier settlements, so goldens and mockups regenerate together.
  - `goldens.py` (new) writes one fingerprint per stage for 100 seeds of each size, so a mismatch names its stage. Countries are a stage of their own. Golden fingerprints cost about 363 B per seed (R9).
- **Port the country stages to TypeScript, in pipeline order,** in `packages/worldgen`, which this sub-milestone creates. The generation runs in a worker (M8.3 starts it). Commit each stage only when its golden fingerprints match Python (R9):
  1. template and noise elevation;
  2. keyed mountain chains;
  3. priority-flood;
  4. flow accumulation;
  5. erosion-lite passes;
  6. climate;
  7. biomes and habitability, with the snow biome for cold lowland;
  8. settlements, then countries;
  9. farmland, roads, sea lanes, wonders and landmarks.
- **Round 9's four porting traps** apply throughout. M0.6's ban on bare `/` and `%` catches three once its generator glob covers `packages/worldgen`, and only the goldens catch `>>` for `>>>`:
  - a signed draw before `%`;
  - `>> 16` for `>>> 16`;
  - truncating division;
  - truncated `//` in the terrain and moisture terms.
- **Settlements and routes on the square grid (R4, R9):**
  - **settlements:** capitals, then towns, then villages, with minimum spacing and P₁/k rank-size populations;
  - **land routes:** a spanning tree per landmass plus spanner shortcuts, routed by A\* with slope, bridge and road-reuse costs;
  - **sea lanes** between landmasses;
  - **regions and market territories,** grown by multi-source Dijkstra. Regions grow inside each country, with the countries' growth function and a mask. Market territories ignore borders, since trade crosses them.

  `tools/worldgen` skips round 4's Delaunay step, so the port does too. Borders change no route, lane or territory cost, because countries are map facts only.
- **Stable identity (R9).** Place seeds, landmark draws and names key on the settlement's uid, which is its cell, never on population rank. A country's uid is its capital's cell.
- **Wonders and landmarks (R9):**
  - 4–8 natural wonders per world by site rules, each kind at most once;
  - hot springs, geyser and caldera lake share one geothermal hotspot;
  - built landmarks by tier and site, placed on the settlement, or on cells of their own for viaducts, observatories and lighthouses.
- **Names for places and countries (R4, R8, Countries).** `tools/worldgen` has no name scheme today: settlements are named `capital-0` or `town-12`. M0.7 builds what names need, and this adds only what places need.
  - **One mixed style for all names (owner, 9 October 2026).** Towns and countries, like people, take names in one style shared by everyone: Greek-like sounds mixed with sounds from several other languages, picked at random. No culture owns a sound.
  - **From M0.7, reused as is:** that one shared sound set, in `tools/names/src/sound-set/`; the name filter `rejectName` and its fixtures; and `scripts/words.ts`, which keeps only words of 4–10 letters that pass the filter and writes them as a generated table, with `--check`.
  - **A place-name table of its own.** `words.ts` gains a second output: 1,024 place words from the same mixed sound set, on their own build seed, written to `packages/worldgen/src/names/words.ts`. Places then sound like the people but mostly use other words. The table sits in `worldgen` because the page may import `sim-culture`, which holds the person table, only in its inspector (M0.7).
  - **No trigram screen.** The owner dropped the screen against real name bases on 9 October 2026, since the style borrows real languages' sounds on purpose. The edit-distance filter stays: Pokémon names, real countries, demonyms, languages, ethnonyms and religions, and profanity.
  - **Picking:** each name is a table index drawn on the world stream `NAME`, keyed on (seed, kind, uid, attempt). A repeat within the world takes the next attempt. Places are named in uid order, countries first, so a name depends only on the set of places, never on visiting order.
  - **Outside canonical state:** the map worker computes names for labels, and no sim rule reads a name. Python needs none, so names get goldens frozen per generator version.
  - **Why a table, not round 4's foswig chain:** the filter's fixtures stay test-only, so a name shown at run time must come from a list checked before release. A chain's outputs can't be listed; a table is the list.
  - **Country names never come from a culture.** They come from the place table, never from a culture's naming custom, so no country stands for a culture (Countries).
- **Re-baseline counts.** M7's and M8's settlement counts become listed places plus a region tier, with Zipf fitted on true ranks (R9). With the map first, this lands before M7's step plans are written.

### Packages and files

- `tools/worldgen`:
  - Part 1's files;
  - `rng.py`: move `COUNTRY = 13` in from `countries.py` and append `NAME = 14`, then rerun `vectors.py`, since `packages/sim-core/test/fixtures/kernels.json` records every world stream (Part 1, Ruling 1);
  - `goldens.py` (new): per-stage fingerprints, written to `packages/worldgen/test/fixtures/goldens-v1.json`.
- `tools/sprites/map.py`: `map8_snow` and `map16_snow` (Part 1, Task 6).
- `packages/worldgen` (`@nomos/worldgen`), new, in M0.7's layout of concern folders under `src/`:
  - pure TypeScript with no DOM, importing only `@nomos/sim-core/kernels`, under M0.6's generator lints, whose glob this sub-milestone extends to cover it;
  - `src/country/`: `template.ts`, `elevation.ts`, `chains.ts`, `flood.ts`, `flow.ts`, `erosion.ts`, `climate.ts`, `biomes.ts`, `settle.ts`, `countries.ts`, `grow.ts`, `routes.ts`, `regions.ts` and `features.ts`, one file per stage. `grow.ts` serves countries and regions. Python has no regions stage, so `regions.ts` gets goldens frozen per generator version;
  - `src/names/`: the picker, and the generated place table `words.ts`;
  - `test/country-goldens.test.ts`: runs in Node, and in Bun and three browsers through M0.6's engine harness.
- `tools/names`, from M0.7: `scripts/words.ts` gains a second output, the place table, on its own build seed. A possible source for the mixed sounds, which M0.7 settles, is Fantasy Map Generator's name bases at commit `546c41d37e1daf842df620139e3228553e2f0847`. They are MIT with one added permission paragraph, and their 33 real-world bases include Greek. Any use commits that licence beside the data.

### Interfaces and data

- **`generateWorld(seed: number, size: 'standard' | 'large'): WorldMap`.** M6.3, M8.6 and M8.7 add edit layers as stage inputs later. None exist before M1, so none are taken now.
- **`WorldMap`,** in `sim-protocol`, so `render-gl` reads it without importing `worldgen`:
  - per cell, row-major: `elevation`, `biome`, `river`, `receiver`, `coast`, `temperature`, `moisture`, `country` (0 for water, 1–K on land) and `region`, as typed arrays;
  - settlements in id order, as typed-array columns: `cell`, `tier`, `population`, `country` and up to three landmark kinds each;
  - roads and sea lanes as CSR paths (`offsets` and `cells`), and `bridges`;
  - wonders and own-cell landmarks as kind and cell columns;
  - countries as `capital` (a settlement id) and `colour` (an index).

  Every buffer is transferable. The step plan adds it to [interfaces.md](../../m0-pipeline/interfaces.md) as "The world map (owner: M8.1)".
- **`placeNames(map: WorldMap): string[]`:** country names, then settlement names in id order.
- **Settlement record,** for M6.1's `CityContext` and M7's store: `{ cell, tier, population, country, region, port, crossroads, landmarks }`.

### Method and sources

- **Layers, the square grid, identity across visits, porting traps and new tiles:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), part 1, and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md).
- **Rank-size, spacing, routes and regions:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md) and [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 2.
- **The sound set and the filter:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c; M0.7's [brief](../../m0-pipeline/m0.7-modules-and-blob-facts/plan.md), "Names"; and the owner's decision of 9 October 2026 on one mixed name style.
- **Countries:** the owner's decisions of 9 October 2026 ([M8 milestone](../milestone.md)).
- **Reference code:** `tools/worldgen/` (`world.py`, `terrain.py`, `drainage.py`, `climate.py`, `settle.py`, `countries.py`, `roads.py` and `features.py`).

### Tests for the exit checks

- `generates within budget`: in desktop Chromium, a standard 96×64 world takes ≤ 100 ms and a large 192×128 world ≤ 400 ms, as the fastest of 9 samples.
- `fingerprints match Python`: per-stage fingerprints, countries included, match the goldens for 100 seeds in Node, Bun, Chromium, Firefox and WebKit.
- `countries cover the land`: over 100 seeds of each size, K is 3–5, every land cell has one country and water none, each settlement's country is its cell's, each country holds at least 3 settlements, and every capital is a town or larger. Part 1's `test_worldgen.py --seeds 100` checks the same in Python.
- `names pass the filter`: every place-table word has 4–10 letters and passes `rejectName`, `words.ts --check` passes, and 1,000 seeds of each size name every place and country with no repeat within a world.
- `identity by cell`: changing a far settlement's population leaves every other place's seed, landmarks and name unchanged.
- `wonders by the rules`: over 1,000 seeds, every world has 4–8 wonders, no kind twice, and the geothermal three share one hotspot.

### Risks and unknowns

- **Verify first:** map-generation times in browser workers and on phones. They set the phone tier for the map.
- **The Python reference changed before the port starts.** Countries and snow change its outputs. Regenerate goldens and mockups together, and freeze version 1 only after the owner's preview review.
- **Sea cliffs form only on south coasts** in place views, an open item since checkpoint 0001. It moved to M8.8 with its new cliff faces (Part 1, Ruling 2).
- **Island worlds may put every capital on one island,** and the others then join by sea. Previews of archipelago and twin-isles seeds decide whether capitals need a landmass rule.
- **A 1,024-word table repeats across worlds.** A large world names up to about 240 places and countries, so two worlds share about a quarter of their names (computed). Grow the table, or add a second word for the largest places, only if previews show it.

### Open questions

- **Measure:** Does a large 192×128 world fit 400 ms with A\* routes and two Dijkstra passes? R9 timed only terrain, at about 8 ms at 96×64. Its 21–87 ms standard-world estimate becomes 84–348 ms at four times the cells (computed). Suggested: time each stage in Chromium in the first week, since A\* grows faster than the cell count. Needed before: building.
- **Measure:** What are map-generation times in browser workers on phones? They set the map's phone tier. Suggested: one mid-range Android phone and one iPhone. Needed before: the step plan.
- **Design:** How many regions does each country hold? R4's max(4, settlements ÷ 40) gives 4–6 regions on a whole large world, about one per country (computed from R9's 182–237 places), while the market areas of each country's towns would give about 4–6 per country. Suggested: M8.1 sets a provisional count, which M7.3's region tier adopts or revises. Needed before: the step plan.
- **Owner review:** 10 large-world previews and a sample of 100 generated names, before version 1 freezes, as the owner listens to every new sound. Needed before: the freeze.

### Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:**
  1. Python: Part 1; the owner's review; the freeze and `goldens.py`.
  2. The place table in `tools/names`, which shares no files with the port, so they can run in parallel.
  3. The port: the elevation stage and its golden test in all five engines, proving the harness, then each stage in pipeline order, settlements, countries and routes last, then regions and names.
- **Reuse:** `roads.COVER` for terrain costs, `grid.neighbours` for the fixed neighbour order, `rng.shuffled` for colours, M0.6's engine harness and lints, M0's keyed draw and integer noise.
- **Keep it simple:** port the Python line for line, and optimise only a stage that misses the budget. One growth function serves countries and regions.
- **Pitfalls:** A\* and Dijkstra must break ties exactly as the Python heap does, or routes, countries and regions drift from the goldens. Sort only with total orders, ties broken by cell index. Route lengths in kilometres use a provisional cell scale set in M8.1, which M7.1 adopts or revises.
- **Hard and easy parts:** routing, countries and regions need the most care, for speed and tie order; climate, biomes, colours and the wonder site rules are mechanical.
