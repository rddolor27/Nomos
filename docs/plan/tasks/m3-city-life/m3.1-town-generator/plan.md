# M3.1 Town generator: plan

> **Status:**
> - **Done:** the place port and the owner's town view, Tasks 0–8 (9–10 October 2026).
> - **Built:** Part 2, but for its 2 ms bar, which moved into Part 3's Task 19 (10 October 2026).
> - **Part 3** is a step plan for walled towns, roads by role and farms. Tasks 9–11, 17 and 18 have landed. Tasks 12–16 and 19–21 stay plans until the owner says to build them (checkpoint 0033).
> - **The rest of M3.1** is still the brief further down: the export to the binary map, the saddle keys and the LDtk fallback. Expand it with the writing-plans skill before building it.

**Task:** [task.md](task.md)

## Step plan: the place port and the owner's town view

> **Status:** done, 9–10 October 2026, from 6ceaffc to fda1f8f. Checkpoints 0026 and 0027, in git history at c96d81c and be81455, hold the account. QA's low bugs 2 and 3 stay open.
> - Task 0: 6ceaffc and eb89fca.
> - Tasks 1–3: 737474b, 20d53fd, 7d6d8f3 and 708e1a2, with the CI and engine checks in 048ef6c, a1da0c5 and 2fd4660.
> - Task 4: 598f5a1 and e897fd5.
> - Tasks 5–6: be2067e, 6a807d2 and b2cb2a1.
> - Task 7: 0cef4cf to f3fe6e6, and fda1f8f for QA's bug 1.
> - Task 8: 2f51e37 and b209aee in `interfaces.md`, and QA's tests 025dda5 and 605e16a.

On 9 October 2026 the owner asked why zooming into a settlement on the map still shows the map. They also asked for the sprite images and the houses next, and left the design to the coordinator.

**Goal:** zooming into a settlement or a wonder on the map opens its place. A place is `tools/worldgen/place.py`'s layout, drawn from the sprite atlas, with its blob people walking. Zooming out, Back to map or Escape returns to the map.

**Why the map stops short today:**
- The map's zoom ladder ends at 128 device px a world cell (`MAP_CELL_PX` in `packages/render-gl/src/map/camera.ts`).
- A whole settlement sits in one world cell, drawn as one icon.
- Go to centres on a settlement at about 64 CSS px a cell, and stays on the map.
- The street view of a settlement was planned for M9.1–M9.3 and M8.5, after launch.

**Architecture:**
- `@nomos/worldgen` ports `place.py` one to one, with `world.py`'s place contexts, and adds walk loops of its own.
- The map worker builds a place on request and transfers it.
- `@nomos/sim-protocol/place` holds the contract both sides share: `PlaceLayout`, `PlaceWalks`, and the request and reply.
- `render-gl`'s new place pass draws a layout from the full atlas page, pixel for pixel as `tools/worldgen/placedraw.py` does. Its Canvas2D fallback draws the same picture.
- `apps/web` adds the town view to the map panel, loaded with the atlas on the first entry only.

This pulls M3.1's port forward, and starts M3.3's atlas pages and sprite drawing early, as the owner's map-first order did for M8.1 and M8.3.

### Who does what

| Who | Tasks |
| --- | --- |
| `sim-engineer` (Opus) | 1–4: the port, the contexts, the walk loops and the worker |
| `render-engineer` (Opus) | 5–7: the place pass, the pixel check and the town view |
| Coordinator | 0 and 8: the contract and fixtures, size limits, reviews, docs and the checkpoint |

- Each agent commits its own work by path, with `git commit -- <paths>`.
- Neither edits the size-limit config, `interfaces.md` or the other agent's files. Each reports sizes and interface changes to the coordinator instead.

### Rulings (coordinator, 9 October 2026; the owner can overturn them)

1. **A place is `place.py`'s district.** That was 48×28 tiles for a capital or city, 40×24 for a town, 32×20 for a village or hamlet, and 30×18 for a wonder's vista, until Parts 2 and 3 grew them (Part 3, Ruling 1). The brief's "256² town" and "64×64 districts" do not match `place.py`, which stays the reference.
2. **People are look-only, like the map's crowd.** They are `place.py`'s people, with no names, money or sim. Some walk loops. The rest stand or sit where `place.py` puts them.
3. **Summer art only.** Seasons wait for M3.8.
4. **Wonders open their vistas too,** since the port builds them anyway.
5. **The atlas:** the full page that `tools/atlas` already builds (`atlas.webp`, 86 KB, and `atlas.json`) loads when the first place opens, never on first load.
6. **The first screen's town keeps Skin A dots.** Drawing it with these sprites is the next step, to offer the owner. Since 10 October 2026, the first screen opens in these sprites as the Town skin (M3.3).

### Owner decisions this plan leaves open

- M3.1's two open questions, below, gate the export to the binary map. This plan builds no export.
- M3.3's optional human sheet: none is built, and everyone keeps the one blob body.

### Global constraints

- **`packages/worldgen`:**
  - the generator lints: no bare `/` or `%` outside the floor-division helpers;
  - keyed draws only, with no `Math.random`, transcendental `Math`, `**` or clocks;
  - Python's set and dict order wherever the port iterates them;
  - round 9's four traps and the Pitfalls in the brief below.
- **Fairness:** looks stay `looks.py`'s draw on (place seed, person index). House styles stay keyed draws, never wealth (content rules 1 and 5).
- **`render-gl`:**
  - it imports only `sim-protocol`;
  - the place pass is a lazy subpath, `@nomos/render-gl/place`, kept out of the first-load chunk.
- **Drawing:** integer zoom steps, a camera snapped to whole device pixels, nearest texels and no CSS scaling. The Canvas2D fallback draws the same picture.
- **No allocation per frame** in the place pass or the walkers' motion.
- **Load:** first-load chunks must not change.
- **Code:** `code.md`'s concern folders, short functions, and comments only for the why.

### Task 0: The contract and the fixtures (coordinator)

- `packages/sim-protocol/src/place/place-layout.ts`, exported as `@nomos/sim-protocol/place`: the layout, the walks, the people's codes, and the worker's request and reply.
- `tools/worldgen/place_fixtures.py` writes `packages/render-gl/test/fixtures/places-v1.json`.
  - It holds three places: the coastal town, the capital and the mountain waterfall's vista.
  - Each is in `PlaceLayout`'s shape, with the SHA-256 of `placedraw.draw`'s RGBA pixels at 1×.
  - `--check` compares a fresh run with the committed file.

### Task 1: The place port (sim-engineer)

**Files:** `packages/worldgen/src/place/` (new), the package's exports, tests in `packages/worldgen/test/`, and golden scripts in `tools/worldgen/`.

- Port `place.py`'s `Site` and every stage one to one, keeping each function's name in camelCase. Port `looks.py`'s `look_for` too.
- `buildPlace(ctx): PlaceLayout`, where `frames` lists each name once in order of first use: tiles row by row, then ground, then standing.
- The port reads `w`, `h`, `anchor`, `footprint` and `door` from the sprite manifests. Generate a compact table of only the frames `place.py` can use, with a test that it matches `assets/sprites/*.json`.
- **Done when:**
  - the three fixtures' layouts equal the TypeScript layouts exactly;
  - fingerprints of every place of the first 20 standard worlds, about 700, equal Python's. Fingerprint each stage too where it helps find a drift. Python writes them to `packages/worldgen/test/fixtures/`;
  - `pnpm test && pnpm lint && pnpm typecheck` pass.

### Task 2: Place contexts (sim-engineer)

- Port `world.py`'s `_context` and `place_contexts` over the TypeScript world.
- Settlements come first, then wonders. Each seed is `draw(world seed, PLACE, 0, uid)` for a settlement and `draw(world seed, PLACE, 1, wonder index)` for a wonder.
- **Done when:** the contexts of the first 20 standard worlds equal Python's, and Task 1's fingerprints are built from them.

### Task 3: Walk loops (sim-engineer)

- `placeWalks`, in TypeScript only, since `place.py`'s people stand still.
- `place.py`'s walkers, and a keyed share of the standers with no job, each get a closed loop:
  - of 4-adjacent tiles people may walk on: a road, or a standable tile;
  - starting at the person's own tile;
  - through 3–6 waypoints within about 10 tiles.
- It draws on `CROWD` with sub-keys that `place.py` never uses.
- **Done when:** tests show, for the fixtures and for every place of 20 worlds:
  - every loop cell is walkable, and every step goes to a 4-adjacent tile;
  - each loop closes, and starts at its person's tile;
  - every run gives the same loops;
  - a place's loops hold at most 4,096 cells.

### Task 4: The worker builds places (sim-engineer)

**Files:** `apps/web/src/map/generate.ts`, `apps/web/src/map/map-worker.ts` and their unit tests.

- After generating a world, keep its place contexts before its columns are transferred away.
- Answer a `PlaceRequest` with a `PlaceReply`, transferring `placeBuffers`, with the build time in `ms`.
- **Done when:**
  - a unit test builds a settlement's place and a wonder's place from the map's world, and checks each reply;
  - the map worker chunk's brotli size, before and after, goes to the coordinator.

### Task 5: The place pass (render-engineer)

**Files:** `packages/render-gl/src/place/` (new), the `./place` export in `packages/render-gl/package.json`, and harness files.

- `createPlaceRenderer` with WebGL2 and Canvas2D backends, handling context loss as `MapRenderer` does.
- Load `atlas.json` and `atlas.webp`, which sit beside `map.*`, with the loader in `frames.ts`.
- Resolve frame names once per layout. Resolve each person's layers from their codes, by `looks.py`'s `layers` and `placedraw.py`'s `person_layers`:
  - body, then pattern;
  - then the face, at the body frame's `face` offset;
  - then the job item;
  - then the emote, at (7, face y − 15).
- Draw in `placedraw.py`'s order:
  1. the `OUTLINE` background;
  2. the tiles;
  3. the ground sprites, sorted by y;
  4. standing sprites and people together, sorted by y, then index, with standing sprites first.
- People move every frame, so re-sort in place, stably and with no allocation.
- Scale by an integer: device px per art px. Snap the camera to whole device px.
- **Done when:** Task 6 passes, and the harness shows a fixture with people moving.

### Task 6: The pixel check (render-engineer)

- A harness page draws each fixture at 1×.
- A Playwright spec hashes the RGBA pixels, top row first, and compares the hash with the fixture's SHA-256. It runs WebGL2 and the Canvas2D fallback in Chromium, and in Firefox and WebKit where they pass.
- **Done when:** all three fixtures match in both backends.

### Task 7: The town view (render-engineer)

**Files:** `apps/web/src/map/` (`map-view.ts` and a new town view module), `apps/web/vite.config.ts` and a new Playwright spec.

- **Entering:**
  - at the map's closest step, zooming in again near a settlement or wonder opens it. The zoom point is the cursor, the pinch centre or the view's centre;
  - a tap on the settlement already in focus opens it;
  - an "Enter <name>" button shows while a settlement or wonder is in focus.
- **The view:**
  - the place at an integer scale, centred, with at least 2 CSS px per art px where the screen allows;
  - pan, + and −, Fit, and the place's name, tier, population and country;
  - people walk their loops with walk frames. Pause dots and reduced motion stop them.
- **Leaving:** Back to map, Escape, or zooming out past the smallest scale returns to the map as it was.
- **Load:** the town view module, the place pass and the atlas load on the first entry only. Vite's `render-gl` group must leave `src/place` out, as it leaves `src/map` out.
- **Accessibility:**
  - the canvas has role `img` and a label naming the place and what it holds;
  - focus moves to Back to map on entry, and returns on exit;
  - the status line reads the place.
- **Done when:**
  - a Playwright spec at `?tier=phone` opens the map, goes to a settlement, enters it, sees the place drawn and a walker move, then returns;
  - axe finds no violations;
  - first-load chunk sizes are unchanged, and the new chunk's size goes to the coordinator.

### Task 8: Close (coordinator)

- size-limit entries for the new chunk, and for any growth of the map worker;
- `interfaces.md`: the place layout and the worker's place messages, in a docs commit;
- `code-reviewer` over the whole change, and `/determinism-review` on the port;
- screenshots for the owner, then the checkpoint.

## Part 2: bigger places, the starting town, then walls and houses (owner, 10 October 2026)

> **Status:** built on 10 October 2026. Step 3 moved into Part 3's Task 19, and Part 3 replaces steps 5 and 6.
> - **Steps 1 and 2,** bigger places and crowds by population: 81ac739, d1210d0 and 4932aef. Part 3's Task 11 then grew capitals and cities to 176×112 and towns to 152×96 (d68ff59).
> - **The town view fills the screen:** 0d0ce8a.
> - **Step 2b,** the street crowd: one walker per 150 residents, up to 3,000 on desktops and 600 on phones, one per cell of its own loops (06d6713, 8c18e75, 86437eb and 7406816).
> - **Step 4,** the starting town: Highcourt re-exported at 128×80 (217980a), then at 176×112 by Task 11. The first screen's blob counts follow its walkable tiles (dea6b06).
> - **Walking in any direction,** at the owner's request: 3cc98f0 cut the loops' corners. Then a530047 to d6e13d8 made the town view's people wander its street network by the sim's own steering rule.

The owner found the town views too small and their crowds too thin. They asked for bigger places and a bigger starting town, then town walls with gates and more houses. Later on 10 October they set the order:
- M8.1's Task 36, the large world with more settlements, goes first;
- then steps 1, 2 and 4 below, so places and crowds grow in proportion;
- then the walls and houses. Their sprites already exist (checkpoint 0031).

The steps, in order:

1. **Bigger places** (sim-engineer; asset-designer to tune the layout).
   - `place.py`'s `SIZES` are now 176×112 for a capital or city, 152×96 for a town, 80×48 for a village and 56×32 for a hamlet, and vistas stay 30×18. This step landed 128×80 and 112×64 at the owner's word (d1210d0), and Part 3's Task 11 grew them (d68ff59).
   - Retune `PLAZAS`, `BLOCK`, `REACH` and `HOUSES`, so the bigger districts fill with streets and houses rather than grass.
   - Regenerate the goldens and fixtures, then port the change to TypeScript stage by stage.
   - **The town view fills the screen** (owner, 10 October 2026: "it shouldn't be just a small rectangle"). `openPlaceCamera` opens at the smallest whole scale at which the place covers the whole view, never under 2 CSS px per art px, and the user pans. Fit stays a button. This is render-engineer work, done with this step.
2. **Crowds by population** (sim-engineer).
   - `CROWDS` becomes a count drawn from the settlement's population, banded by tier. On desktop that is about 150–300 for a capital or city, 60–120 for a town, 25–50 for a village and 10–20 for a hamlet.
   - Phones show a share of each tier's count.
   - Walk loops scale with the crowds, under a raised cell budget.
2b. **The street crowd** (render-engineer, with the town view). Later on 10 October the owner asked for far more blobs per settlement, since the sim aims at 100k and later a million.
   - The town view adds look-only walkers in proportion to population: about one per 100–200 residents.
   - The cap is up to 3,000 walkers on desktop and 600 on phones.
   - Several walkers share each walk loop, at staggered phases and speeds.
   - It is TypeScript only: no `place.py` change, so no golden changes. Looks come from the keyed look draw on (place seed, walker index).
   - The place pass draws them in its one instanced draw. Re-measure the 2 ms bar in step 3.
3. **Budgets** (render-engineer): re-measure the place pass and the walkers against the 2 ms bar with the bigger crowds, in both backends. **Moved to Part 3, Task 19,** once the walled towns settle.
4. **The starting town** (sim-engineer, with senior-game-engineer).
   - Highcourt, `export_map.py`'s pinned capital, is re-exported at the capital's size as `assets/maps/town.nmap`, now 176×112 with 15,862 walkable tiles.
   - The replay hash changes, so record the new one. Done: Highcourt's own hashes are pinned in `packages/sim-protocol/test/town-map.test.ts`, while the CLI's holds, since the CLI runs on the stand-in ground.
   - Re-check the blob counts per tier against the tick budgets. The owner picks the counts (task.md). Today they are 7,931, 5,287 and 3,965 on desktop, phone-plus and phone, well under the 100k, 25k and 10k the tick budgets cover.
5. **Replaced by Part 3.** **Town walls with gates** (asset-designer, then sim-engineer).
   - Mockups first, for the owner to pick.
   - Then the wall, corner, tower and gate sprites in `tools/sprites`.
   - `place.py` rings each capital and city with a wall, with a gate where each road enters, and the port follows.
   - They are drawn look-only: no sim rule reads them yet. Nothing military carries a flag or heraldry (content rule 6).
6. **Replaced by Part 3.** **More houses and props** (asset-designer). New house styles and sizes are drawn with equal care, so none reads as richer or poorer, along with the props the bigger towns need. The owner reviews a preview sheet first.

**Rules for all of part 2:**
- **Python stays the reference.** Every layout change lands in `place.py` first, with the goldens regenerated in the same commit; then the port matches it.
- **Classes:** new game objects, such as a `Wall` or a `Gate`, are classes (`code.md`, owner, 10 October 2026). Crowds stay typed arrays.
- **Version:** `WORLDGEN_VERSION` 1 is not frozen until M8.1's Task 34. Check before building whether the place layouts fall under that freeze.

**Done when:**
- each step's goldens match in TypeScript;
- the town view stays under 2 ms for the biggest capital;
- the starting town's new replay hash is recorded;
- the owner has approved the wall and house mockups.

**Risks:**
- **Build time:** building a place takes about four times as long (27–32 ms warm for a capital today). Measure it in the worker.
- **Walk loops:** bigger crowds mean more of them, so the 4,096-cell budget per place must rise.
- **Hashes:** growing the starting town moves every replay hash, and some goldens in the sim tests.

## Part 3: walled towns, roads by role and farms (owner, 10 October 2026)

> **Status:** step plan, written on 10 October 2026 by `sim-architect`. It replaces Part 2's steps 5 and 6. Run it with the executing-plans skill; steps use checkboxes. All the art it needs landed on 10 October 2026 (The art contract).
>
> Tasks 9–11, 17 and 18 landed on 10 October 2026, each marked done below. The owner then kept the round to plans: Tasks 12–16 and 19–21 wait until the owner says to build them (checkpoint 0033).

**Goal:** capitals, cities and towns become walled towns, packed round the plaza and thinning past the wall into suburbs along the roads, then a farm belt by climate. Villages and hamlets stay open among their fields. Every road takes a surface and width by its role, and the country map draws highways in stone and tracks in dirt, with walled icons.

**Architecture:**
- `place.py` stays the reference. Each layout task lands `place.py`, its TypeScript port, the regenerated goldens and fixtures, and Highcourt's `town.nmap` in one commit, as d1210d0 did, so every check stays green.
- Two stage groups join `SETTLEMENT_STAGES`, walls after the centre and farms after the buildings: water, centre, walls, buildings, farms, decor, nature and people.
- New game objects are classes: `Wall` and `Gate` for the ring, and `Plot` for the farm belt. Roads by role are one table, `ROADS`.
- On the country map, each road route gains one byte, its class, worked out after the roads from the routes that join the towns.

**Spec:** the owner's decisions below, and [task.md](task.md), Part 3.

### The owner's decisions (10 October 2026), all final

1. **Bell curve means town density.** Capitals, cities and towns are packed round the plaza and thin out toward the edge, with farms on the outskirts.
2. **Walls:** capitals and cities get stone walls with towers, towns a wooden palisade, and villages and hamlets stay open. Each wall rings the dense core, with sparser houses and farms outside, and has a gate wherever a road enters.
3. **Roads by role:**
   - main road: 3 tiles of cut stone, from each gate to the plaza;
   - street: 2 tiles of cobbles, the grid inside the walls;
   - lane: 1 tile of packed dirt, for paths to doors and alleys;
   - country road: 2 tiles of gravel, outside the walls and out to the map edge;
   - farm track: 1 tile of dirt, between fields.
4. **Order:** CI goes green first (217980a), then this round, with walking in any direction alongside (3cc98f0). The first-screen art and blob count follow the new layout.
5. **Farms:** grain and vegetable fields in long strips, pastures with herds, orchards, vineyards on warm, dry land and rice paddies on hot, wet land.
6. **Buildings:** corner houses, tall townhouses and cottages; an inn, bakery, smithy, stable, barn, granary and watermill; grander civic buildings for capitals and cities; and a polish of today's art.
7. **Extras:** suburbs outside the gates along the roads; stone bridges on main roads, while lanes keep footbridges; trees lining main roads; gardens and greens inside the walls. On the country map, major roads are stone highways, minor ones dirt tracks, and city icons have walls.
8. **Size:** grow places so the walled core keeps about today's 380–520 houses, with farms outside. Capitals and cities go to about 160×100, and towns grow in proportion. A capital may take about 1.5–2× as long to build (78 ms warm before the round), measured before committing.

The owner also said to settle open calls ourselves. The rulings below are those calls.

### Rulings (sim-architect, 10 October 2026; the owner can overturn them)

1. **Sizes** (the coordinator's ruling, 10 October 2026, over the sim-architect's 160×100 and 140×80). A capital or city is 176×112 tiles and a town 152×96. Villages (80×48), hamlets (56×32) and vistas (30×18) keep theirs.
   - The wall ring is 129×81 tiles in a capital or city and 113×61 in a town, centred on the plaza.
   - Measured here, a 129×81 ring holds about 420 houses with 2-tile streets, whatever the place's size, so the core keeps the owner's count.
   - The farm belt is about 24 tiles east and west and 16 north and south of a capital's or city's wall, and about 20 and 17 of a town's. At 160×100 it would be 15 and 9, about one row of plots north and south, too thin for the owner's "city outskirts to have farms".
   - The cost is about 1.2× the tiles of 160×100. If Task 11's builds break Task 9's budget at these sizes, fall back to 160×100 and 140×80, and report it.
   - Villages and hamlets have no wall, and over 90% of their land is open today, so they hold a farm belt as they are.
2. **The core holds the count, so the density falls across the wall.** The streets fill the ring nearly full, so the gradient shows in what is built: apartments and tall terraces by the plaza, low terraces and detached houses by the wall, cabins and farmhouses in the suburbs, then fields. Houses aim at bell-shaped targets, so the fill starts at the plaza and the tail spills past the gates.
3. **Highcourt is re-exported in every task that moves it.** The other session's `apps/web/test/town.test.ts` holds the port's Highcourt to `town.nmap` tile for tile, so the art the Town skin draws is the ground the sim walks. The owner's one re-export at the end becomes a check (Task 20). The replay hash stays, because the CLI runs on the stand-in ground.
4. **Gates are 2 tiles wide,** as drawn. A main road narrows to its gate's two tiles at the wall, and the country road beyond is as wide as the gate.
5. **The palisade follows the stone wall's plan** with its own pieces: 1×1 corner posts in place of 2×2 towers, and no towers along its runs.
6. **Bridges follow width.**
   - Main and country roads cross rivers on stone bridges: a piece per tile along the road, each the road's width, with end pieces on the shore tiles.
   - They are ground sprites over water, as footbridges are, so the river stays water.
   - Streets never bridge. They stop at a river and start again past it, so a town's bridges are its main roads'.
   - Lanes keep footbridges and causeways.
7. **A road's surface follows its role in the place,** never who lives there. The world map's class doesn't reach the place, so a hamlet on a minor road still has a 2-tile gravel road.
8. **Corner houses stand where a terrace meets a street,** as the houses designer advised. A townhouse terrace is laid out with corner ends, so its lot has room for them. Then each end whose outer side touches no road becomes a plain townhouse end, leaving one free tile. So the lot search stays as it is.
9. **House forms follow the zone,** a target's distance from the plaza in the ring's half-sizes. Materials and roofs stay uniform keyed draws over every form in every zone, now seven materials with board and rubble. So no style marks the centre or the edge (content rule 5).
10. **Crops follow climate only:**
    - vineyards where temperature ≥ 150 and moisture < 120;
    - rice where temperature ≥ 170 and moisture ≥ 160;
    - neither in a desert place, and grain and pasture alone below temperature 90.

    These sit beside `climate.py`'s own lines: sand from temperature 165 below moisture 85, and forest from moisture 130 or 140.
11. **Major roads are the routes that join the towns.** On each landmass, a spanning tree links its towns, cities and capitals, and the cheapest chain of routes between each linked pair is major. The roads themselves don't change; each only gains a class.
12. **Walled icons by tier and view.** The designer drew them as new frames for each map scale, so the map picks a capital's or city's walled icon and a town's palisaded one by its view. Villages and hamlets keep today's icons.
13. **Versions.** `WORLDGEN_VERSION` 1 freezes only at M8.1's Task 34, so every task rewrites the v1 goldens in place.
    - Places sit outside that freeze, which names only `goldens-v1.json` and `frozen-v1.json`, so `place-goldens-v1.json` keeps moving until M3.1 closes.
    - If Task 34 freezes version 1 before Task 17 lands, road classes take version 2, with `goldens-v2.json` beside v1. Ask the owner first.
14. **The town atlas page leaves out snow and night frames** until a feature draws them. Places draw summer days only, and those frames take 16% of the page (Task 10). When M3.8's seasons or the light periods need them, they take a second page.

### Measured here

On 10 October 2026, on Windows 10 with Python 3.14.6 and Node 24.18.0, while other agents ran. The load wasn't measured.
- **Houses a wall ring holds,** from a throwaway probe of `place.py`. It used 2-tile streets every 6 rows, cross streets every 16 or 24 columns, 3-tile spokes and bell-shaped targets, filled until 24 misses in a row. It built two capitals each: seed 5EED with roads on every side, and Highcourt.

  | Ring (tiles) | Place | Houses inside the ring | Outside |
  | --- | --- | --- | --- |
  | 105 × 65 | 160 × 100 | 260–273 | 32–58 |
  | 121 × 77 | 176 × 112 | 382–388 | 39–68 |
  | 129 × 81 | 160 × 100 | 421–423 | 44–52 |
  | 129 × 81 | 192 × 120 | 419–427 | 52–72 |
  | 145 × 89 | 208 × 128 | 553–555 | 63–64 |

  A town's 113×61 ring should hold about 275, scaled by its area (inference).
- **Today's capital is no denser by its plaza than toward its edge.** Counted in tenths of its half-sizes from the centre, seed 5EED's second tenth holds 7 of its 477 houses on 3% of its area. Each of its sixth to eighth tenths holds 94 on 11–15%.
- **Warm TypeScript builds** with the street crowd (`crowdedPlace`), over the first 6 standard worlds:
  - capitals 93–141 ms, median 117; cities 95–122 ms, median 106; towns 58–80 ms, median 63;
  - villages 30–44 ms, and hamlets 7–11 ms;
  - the largest people's loops held 6,498 cells, and the largest crowd 69,486 cells in 235 loops, for 1,760 walkers.
- **Python builds a capital in 4–5 s,** so goldens take minutes. The probe's walled capitals took 7–35 s up to their houses.
- **The first 20 standard worlds** hold 317 walled places: 147 on a river, 106 on the sea and 10 with no land road side. They also hold 14 hot, wet settlements and 49 warm, dry ones, so no new pinned place is needed.
- **The town atlas page** is 2048 × 1347 px against its 2048 px cap, at 191 kB of its 300 kB (the coordinator's figures). Of every frame's area, computed here from the manifests, snow variants take 14%, night overlays 2% and the houses' 7 materials and 5 roofs most of the rest.

### Global constraints

- **Reference first, one commit a task:** write `place.py`, regenerate, port, then commit the lot (Architecture). Python's sets and dicts never set an order: loop over cells, sides in `nesw` order and plots in lattice order.
- **The generator lints,** over `packages/worldgen/src`:
  - no transcendental `Math`, `Math.random`, `**`, clocks or `BigInt`;
  - no bare `/` or `%`: use `floorDiv` and `floorMod`;
  - a sort only with a comparator that is a total order, with ties broken by cell index. Better, no sort.
- **Draws:** every choice is `site.draw`, `below`, `chance` or `pick` on `PLACE`. New first keys follow `INLET` in `place.py` and `keys.ts`: `SPREAD` 20, `TRADE` 21, `GREEN` 22, `MILL` 23, `AVENUE` 24 and `GARDEN` 25. Plots draw on `FIELD`. The street crowd's new key is `LANE`, 0x125, on `CROWD`.
- **Classes:** `Wall`, `Gate` and `Plot` are classes in both languages, made while a place builds. Tables stay plain data. TypeScript stays erasable: no enums, namespaces or parameter properties.
- **Fairness** (`content.md`):
  - a road's surface follows its role, never who lives there;
  - house materials and roofs are uniform keyed draws over every form, in every zone;
  - crops follow temperature, moisture and biome only, never culture;
  - walls are look-only, with no flags or heraldry, and no sim rule reads any of it.
- **Art:** summer frames only, as the first step plan ruled. Every sprite the layout uses joins `scripts/place-frames.ts`'s `USED` list or `HOUSE_FORMS`, and `frames.ts` is regenerated in the same commit.
- **The shared tree:** commit by path, `git commit -- <paths>`, after `git diff -- <path>` shows only your hunks in each shared file. `export_map.py` rewrites `assets/LICENSES.md`, so run it only while `git status --short assets tools/sprites` shows nobody else's work. Otherwise ask the coordinator.
- **Python on Windows:** prefix every Python command with `PYTHONIOENCODING=utf-8`.
- **Tests:** each task runs only the tests it names (`models.md`). QA runs once, in Task 21.
- **Code:** `code.md`'s short single-purpose functions, comments only for the why, and no `eslint-disable`.

### Review focus

The five cases most likely to bite, and the tests that pin them:
1. **A river through the core,** in 147 of the 317 walled places. The wall must stop at its banks, the spokes bridge it, the streets stop at it, and no house stands on a bank. Tasks 11 and 12 test every walled place of 20 worlds.
2. **A walled place on the sea,** 106 of them. No wall piece may stand on water or a bank, and every map-edge road must still reach the plaza: Task 12's wall test and Task 11's entry test.
3. **A plaza pushed off-centre by water.** The ring clamps 6 tiles inside the place's edge. A spoke that stops short leaves its side with no gate, and that side's country road must reach another gate: Task 11's entry test.
4. **No land road side,** in 10 places. One keyed side still gets a spoke, a gate and a country road: Task 12 checks that every walled place has a gate.
5. **A search that fits nowhere scans the whole place:** a house, trade, green, farmyard or the watermill. Task 9's script prints each tier's worst build, held within 2.5× of the baseline's worst.

### Coordination with the other session

The hand-off's file split gives this round `place.py`, `packages/worldgen/src/place/**`, the sprites, M3.1's docs, `places-v1.json` and `assets/LICENSES.md`. These tasks also touch files outside it, which the coordinator clears with `nomos-bd` before each task starts:
- **Every layout task, 11–15:**
  - `assets/maps/town.nmap`, and `tools/worldgen/place_goldens.py` and `place_fixtures.py`;
  - `tools/worldgen/export_map.py`, in Tasks 12–14;
  - the numbers Highcourt pins in `packages/sim-protocol/test/town-map.test.ts`, `apps/web/test/tiers.test.ts` and `apps/web/test/map-worker.test.ts`.
- **Task 10:** `tools/atlas/build_atlas.py` and `test_atlas.py`, whose page the Town skin loads.
- **Task 17:** `tools/worldgen/{roads,world,goldens}.py`, `packages/worldgen/src/{routes,world}/`, `packages/worldgen/test/fixtures/goldens-v1.json` and `packages/sim-protocol/src/world-map/world-map.ts`.
- **Tasks 18 and 19:** `packages/render-gl/**`, `tools/worldgen/mapdraw.py` and `apps/web/test/browser/*`. **They start only after `nomos-bd` says its Town skin has landed.**
- **Any chunk that grows:** `apps/web/.size-limit.json` is `nomos-bd`'s, so report the new size to the coordinator rather than edit it.

`interfaces.md` changes go to the coordinator, who commits them on their own once `nomos-bd`'s edit there lands.

### The art contract

The designers drew and committed all of these on 10 October 2026. They are still polishing some sheets, which changes pixels, not names. If a name or footprint differs when a task starts, the coordinator corrects this table first.

| Kind | Frames | Footprint, in tiles | Task |
| --- | --- | --- | --- |
| Main road, street, country road | `nature/terrain_cut-stone`; `terrain_cobbles_0` and `_1`; `terrain_gravel_0` and `_1` | a tile | 11 |
| Farm track | `nature/terrain_farm-track_horizontal` and `_vertical`, and `terrain_dirt-path` where tracks cross or turn, the designer's rule | a tile | 14 |
| Lane | `nature/terrain_dirt-path`, as today | a tile | — |
| Stone bridges (be12d20) | `scenery/bridge_<main or country>_horizontal_<end-left, span or end-right>` and `scenery/bridge_<main or country>_vertical_<end-top, span or end-bottom>`: ground sprites, anchored at their footprint's bottom centre | main 1×3 across and 3×1 down; country 1×2 and 2×1 | 11 |
| Stone wall | `walls/wall_horizontal`, `wall_vertical`, `wall_tower`, `wall_gate_front`, and the side gate's pier `wall_gate_side-north` and cap `wall_gate_side-south` | runs 1×1, tower 2×2, gate 2×1 | 12 |
| Palisade (e298e55) | `walls/palisade_horizontal`, `palisade_vertical`, `palisade_corner_left` for the west corners, `palisade_corner_right` for the east ones, `palisade_gate_front`, `palisade_gate_side-north` and `palisade_gate_side-south` | posts 1×1, gate 2×1 | 12 |
| New houses (9272f2f, 1b34c9d) | forms `townhouse-left`, `-middle` and `-right` (2×4); `corner-left` and `corner-right` (3×4); `cabin` (2×3); and handed versions, with the door one column over, of the townhouse and row pieces: `townhouse-left-handed`, `townhouse-middle-handed`, `townhouse-right-handed`, `row-left-handed`, `row-middle-handed` and `row-right-handed`. Each comes in all 7 materials and 5 roofs, as `house_<material>_<form>_roof-<roof>` | as listed; handed pieces as their plain ones | 13 |
| The large civic set (1434809) | `buildings/civic_town-hall_large` (8×3), `civic_courthouse_large` (7×3), `civic_library_large` (7×3), `civic_school_large` (6×3) and `civic_clinic_large` (6×3) | as listed | 13 |
| Trades | `buildings/shop_inn` (5×2), `shop_bakery` (4×2), `work_smithy` (4×2) and `work_stable` (5×2) | as listed | 13 |
| Farm buildings (f8201a3) | `buildings/farm_barn` (5×2), `farm_granary` (2×2) and `farm_shed` (2×1), and `work_watermill` (4×2), whose wheel stands over the 2 tiles east of its footprint | as listed | 14 |
| Crops (8099986) | `nature/crop_vine_<stage>` and `crop_rice_<stage>`, each seedling, growing, ripe or stubble; `tree_orchard`; and today's grain, vegetables, pasture and soil | a tile | 14 |
| Greens, gardens and clutter (fd04bcd, cfbb5a5) | `nature/prop_hedge`, `terrain_flower-bed`, `prop_bench`, `prop_sacks`, `prop_woodpile` and `prop_trough` | a tile | 15 |
| Walled map icons (798f4f4) | `map/map8_settlement_capital-walled`, `map8_settlement_city-walled` and `map8_settlement_town-palisade` for the Country view, and the same with `map16_` for the Region view. Villages and hamlets keep `settlement_village` and `settlement_hamlet` | — | 18 |

### Files

- **Python:** `tools/worldgen/place.py` in every layout task; `place_goldens.py` for its kinds and stages; and `export_map.py` for kinds, capacities and hours.
- **The port,** in `packages/worldgen/src/place/`:
  - `roads.ts`, `settlement.ts`, `houses.ts`, `decor.ts`, `tiles.ts`, `site.ts`, `build.ts`, `keys.ts`, `walks.ts` and `street-crowd.ts`;
  - new `walls.ts`, and new `farms.ts`, to which `fence` moves from `decor.ts` while `placeFields` goes;
  - `frames.ts`, regenerated.
- **Scripts:** `packages/worldgen/scripts/place-frames.ts`, and new `time-places.ts`.
- **Tests,** in `packages/worldgen/test/`: `place-sizes`, `place-walks-drawn` and `street-crowd`, plus new `place-roads`, `place-walls`, `place-density`, `place-farms`, `place-decor` and `road-classes`.
- **The country map:**
  - `tools/worldgen/{roads,world,goldens,mapdraw}.py`;
  - `packages/worldgen/src/routes/{graph,classes}.ts` and `src/world/{generate,fingerprint}.ts`;
  - `packages/sim-protocol/src/world-map/world-map.ts`;
  - `packages/render-gl/src/map/{overlay,base-pass}.ts` and `map-colours.json`.

### Who does what

| Who | Tasks | Waits for |
| --- | --- | --- |
| `sim-engineer` (Sonnet) | 9: the timing script | — |
| `render-engineer` (Sonnet) | 10: the atlas cap, in `tools/atlas` only | — |
| `sim-engineer` (Opus) | 11–14: roads, walls, the bell-curve town and the farm belt, in order | Task 9 |
| `sim-engineer` (Sonnet) | 15 and 16: decor, and the crowd on wide roads | Task 14 |
| `sim-engineer` (Opus) | 17: road classes, beside Tasks 11–16 | Task 9 |
| `render-engineer` (Opus) | 18 and 19: the map's road styles and icons, then the 2 ms bar | `nomos-bd`'s Town skin; Task 17 for 18, Tasks 11–16 for 19 |
| `sim-engineer` and `senior-game-engineer` (Sonnet) | 20: Highcourt, the first screen and the owner's screenshots | Tasks 11–16 and 19 |
| Coordinator | 21: interfaces, QA once, review and the checkpoint | everything |

### Task 9: Time place builds (sim-engineer, Sonnet; done)

Done on 10 October 2026: 2664baa, with the baseline below (b035a86).

**Files:** create `packages/worldgen/scripts/time-places.ts`.

**Interfaces:** consumes `crowdedPlace(ctx)` from `src/place/street-crowd.ts`, and `generateWorld` and `placeContexts` from `src/index.ts`. Produces the timing command every later task runs.

- [ ] **Step 1: Write the script.**
  - Take the settlements of the first 6 standard worlds from 5EED0001, up to 6 per tier, in context order. `--worlds N` changes the count.
  - Build each with `crowdedPlace` once to warm it, then time a second build with `performance.now()`.
  - Print one line per tier, such as `capital  n=6  median 116.5 ms  worst 141.0 ms  walk cells 6498  crowd cells 69486`, with the tier's largest loop counts.
- [ ] **Step 2: Run it twice:** `node packages/worldgen/scripts/time-places.ts`. Expected: a line per tier, and the two runs' medians within 15% of each other.
- [ ] **Step 3: Check:** `pnpm lint && pnpm typecheck`.
- [ ] **Step 4: Commit** `test(worldgen): time warm place builds by tier`, with the body `Task: M3.1 Town generator, task 9: Time place builds` and both runs' capital and town lines. Report them to the coordinator, who records the baseline here.

**The budget it sets:** after each layout task, the capitals' and cities' median stays within 2× this baseline, and their worst within 2.5× the baseline's worst, on the same machine. Past that, profile and fix the hot spot before committing. The likely ones are `spur_reach`, rebuilt by every `find_lot`, and searches that fit nowhere.

**The baseline** (2664baa, 10 October 2026). Measured on Windows 10 with Node 24.18.0, while the other session's agents ran; the load wasn't measured. Two runs, each of 6 places a tier from 6 standard worlds:

| Tier | Median, ms | Worst, ms | Budget: median, worst |
| --- | --- | --- | --- |
| capital | 118.2 and 109.9 | 125.0 and 128.5 | 236 ms and 321 ms |
| city | 106.1 and 107.1 | 113.9 and 123.4 | 214 ms and 309 ms |
| town | 54.3 and 57.7 | 61.4 and 64.0 | — |
| village | 34.8 and 34.5 | 36.8 and 37.1 | — |
| hamlet | 8.7 and 8.5 | 10.8 and 11.0 | — |

Each budget doubles the higher median and multiplies the higher worst by 2.5. The largest loops: capitals 6,498 walk cells and 69,486 crowd cells, cities 5,946 and 22,498.

### Task 10: The atlas cap (render-engineer, Sonnet; done)

Done on 10 October 2026: 25d318c. The town page is now 2048 × 1161 px and 182,550 B of WebP, and its 169 snow and night frames stay on the map page (measured here).

The town page is 2048 × 1347 px against `tools/atlas`'s 2048 px cap, and the sheets are still growing (Measured here).

**Files:** `tools/atlas/build_atlas.py` and `tools/atlas/test_atlas.py`.

- [ ] **Step 1: Test,** in `test_atlas.py`: the town page holds no frame whose name ends in `_snow` or `_night`, and fails once it passes 1,920 px tall, a row of houses short of the cap. It prints the page's height and bytes on every run. Run `python tools/atlas/build_atlas.py && python tools/atlas/test_atlas.py`. Expected: FAIL, on the snow frames.
- [ ] **Step 2: Trim** (Ruling 14): `build_atlas.py` leaves frames ending in `_snow` or `_night` off the town page. The map page keeps every frame it packs today.
- [ ] **Step 3: Check:** `python tools/atlas/build_atlas.py && python tools/atlas/test_atlas.py` pass. `pnpm --filter @nomos/web build && pnpm --filter @nomos/web size` still passes, and the atlas's new bytes go to the coordinator.
- [ ] **Step 4: Commit** `build(atlas): leave snow and night frames off the town page`, with `Task: M3.1 Town generator, task 10: The atlas cap`.

**When the trimmed page nears 1,920 px,** the next step is a second page: the place pass would read a `TEXTURE_2D_ARRAY` with a layer for each page. That is render-gl work, after `nomos-bd`'s Town skin, and not part of this round.

### The layout tasks' steps

Tasks 11–15 each change `place.py` by their rules, then run these steps. Each task names its own tests and commit.
- [ ] **Step 1: Write the task's tests,** then run `pnpm vitest run <its test files>`. Expected: they fail.
- [ ] **Step 2: Change `place.py`** by the task's rules.
- [ ] **Step 3: Look:** `python tools/worldgen/place.py --demo` prints no `overlap:` line. Open `dist/worldgen/demo/capital.png` and `coastal-town.png`.
- [ ] **Step 4: Regenerate:**
  - `node packages/worldgen/scripts/place-frames.ts`, when the task adds frames;
  - `python tools/worldgen/place_goldens.py` and `python tools/worldgen/place_fixtures.py`;
  - `python tools/worldgen/export_map.py`, after the shared-tree check (Global constraints).
- [ ] **Step 5: Port it,** stage by stage, until `pnpm vitest run packages/worldgen` passes. The goldens name the first stage that drifts.
- [ ] **Step 6: Move Highcourt's pinned numbers** to what the new `town.nmap` gives:
  - the size in `packages/sim-protocol/test/town-map.test.ts`, and its title;
  - the capital's width in `apps/web/test/map-worker.test.ts`;
  - the three start counts in `apps/web/test/tiers.test.ts`.

  Then run `pnpm vitest run apps/web/test/town apps/web/test/tiers apps/web/test/map-worker packages/sim-protocol/test/town-map packages/render-gl/test/palette`. Expected: pass.
- [ ] **Step 7: Check:**
  - `python tools/worldgen/place_goldens.py --check --worlds 1`, `python tools/worldgen/place_fixtures.py --check` and `python tools/worldgen/export_map.py --check`;
  - `node packages/worldgen/scripts/engines.ts`;
  - `node packages/worldgen/scripts/time-places.ts`, within Task 9's budget;
  - `pnpm lint && pnpm typecheck`.
- [ ] **Step 8: Commit** by path: `place.py` and any other Python, the port and its tests, `frames.ts`, `place-goldens-v1.json`, `places-v1.json`, `town.nmap`, `assets/LICENSES.md` and the pinned tests. The body is the task's `Task:` line, plus the timing script's capital and town lines.

### Task 11: Roads by role, sizes and the town plan (sim-engineer, Opus; done)

Done on 10 October 2026: d68ff59, at the planned sizes with no fallback, and c4b8bc1, which draws cut stone in a dry ground colour on the dots map.
- Over two runs in Node on Task 9's machine, while other agents ran, a capital built in 178 and 200 ms median and 215 and 235 ms worst. That is within the 236 and 321 ms budgets (measured here).
- Highcourt is 176×112, with 15,862 walkable tiles and 387 homes.

**Interfaces:** produces these, in Python then TypeScript names:
- `ROADS`, a role's width and kind: `main` 3 `stone`, `street` 2 `cobble`, `country` 2 `gravel`, `track` 1 `track`, `lane` 1 `path`. `RANK` orders the kinds, lowest first: `path`, `track`, `gravel`, `cobble`, `stone`, `paving`;
- `lay_road(site, x, y, kind)` / `layRoad`, and `pave(site, cells, role='lane')` / `pave(site, cells, role = 'lane')`;
- `Site.cover(category, name, tx, ty, ground)`: a footprinted sprite anchored as `Site.build` anchors one, which marks no tile;
- `Wall(x0, y0, x1, y1, material)`, with `contains(x, y)`, strictly inside the ring line, `on_line(x, y)` / `onLine`, and `reserve(site)`. `site.wall` holds it, or `None` / `null` in an open place;
- `road_sides(site)` / `roadSides`: `lay_roads`' sides, which the spokes share.

**Rules:**
1. **Sizes:** a capital or city 176×112, a town 152×96, the rest unchanged (Ruling 1, with its fallback).
2. **Laying a road tile,** `lay_road`: skip a tile outside the place, or one where `step` is `None` that isn't a road already. Mark it a road. Water keeps its kind; any other tile takes the kind if it is open ground or a lower-ranked road. `lay_path`, which lays lanes, stays as it is.
3. **Width:** a road `w` tiles wide covers, at each cell of its centreline, the `w`×`w` square whose top-left is `(x − (w − 1) // 2, y − (w − 1) // 2)`. `pave` keeps today's crossings for lanes and tracks, so vistas don't change. For wider roads it lays the squares, then the bridges.
4. **Stone bridges:** a wide road crosses water in a straight line, as `route` and `straight` keep it.
   - Its axis is `horizontal` where the centreline moves along x, else `vertical`.
   - Along the crossing, take every column (or row) in which any tile of the road's square is water, plus the shore tile before and after.
   - Each gets one ground piece through `cover`, its footprint's top-left at the road's first row (or column), `y − (w − 1) // 2`: `bridge_<main or country>_horizontal_end-left`, `_span` over water, then `_end-right`; down the map, `end-top`, `span` and `end-bottom`.
   - Every water tile under the square becomes a road. A tile already under a piece takes no second.
5. **Tiles:** `stone` draws `nature/terrain_cut-stone`. `cobble` and `gravel` draw `terrain_cobbles_<v>` and `terrain_gravel_<v>`, where `v = (x * 7 + y * 13) % 5 % 2`. `standable` takes open ground or any kind in `PAVED = ('path', 'paving', 'stone', 'cobble', 'gravel', 'track')`.
6. **The ring,** in `lay_town` after the plaza: `RINGS = {'capital': (64, 40), 'city': (64, 40), 'town': (56, 30)}` are half-sizes round `(cx, cy)`, each edge clamped to `BELT_MIN = 6` tiles inside the place. The material is `stone` for a capital or city and `palisade` for a town.
7. **Spokes:** for each road side in `nesw` order, `straight` lays a centreline from the plaza's edge outward to 2 tiles past the ring line, along column `cx` north and south or row `cy` east and west.
   - Its cells up to 2 tiles inside the line are `main`.
   - From 1 tile inside the line on, they are `country`, so the line carries exactly 2 road tiles there.
8. **Streets:**
   - rows `r = py − 6k` north of the plaza and `r = py + ph − 2 + 6k` south of it, for k ≥ 1, each covering rows r and r + 1;
   - cross streets at columns `px − 2` and `px + pw`, then every `CROSS = 24` columns outward, each covering columns c and c + 1;
   - each covers its two rows (or columns) from 2 tiles inside one ring line to 2 inside the other, on every tile where `step` isn't `None` and there is no water. It skips water and starts again past it, and lays no bridge. A street that won't fit between those bounds is left out.
9. **Reserve the ring:** `Wall.reserve` keeps every ring-line tile that isn't a road.
10. **Avenues,** last in `lay_town`, before any building, so their trunks and crowns keep their tiles: along each spoke's main-road cells k, counted from the plaza, at k ≥ 6 with k % 4 == 2, plant a tree on the tile 2 off the centreline on each side. That is x ± 2 on a north–south spoke and y ± 2 on an east–west one. Plant only where the tile is free and under no crown, as `choose(site, tree_mix(site), AVENUE, x, y)` through `site.tree`.
11. **Country roads:** `lay_roads` paves with `'country'`. In a walled place, the only roads past the ring line are spoke ends, so each country road ends at one.
12. **Viaducts:** an end may stand on a lane or track, never on a wider road.
13. **Goldens:** `place_goldens.py`'s `KINDS` gains `stone`, `cobble`, `gravel` and `track`.

**Tests:**
- `place-sizes.test.ts`: the new sizes.
- `place-roads.test.ts`, new:
  - `keeps the highest-ranked road laid on a tile`: on a bare site from `siteFor`, a lane, a street and a main road laid on one tile leave `stone`, a lane laid on `stone` leaves `stone`, and nothing replaces `paving`;
  - over every walled place of the first 20 standard worlds, `lays cut stone and cobbles only inside the ring line, and gravel only on or past it`, and `crosses the ring line only in pairs of road tiles`;
  - over every settlement of those worlds, `joins every map-edge entry to the centre by road`: a 4-neighbour search over road tiles from each `site.entries` cell reaches a tile within 3 of `(cx, cy)`;
  - over the same, `bridges every water tile under a road`, with a footbridge or a stone bridge piece over it;
  - over every walled place, `lines every spoke of 12 or more main-road cells with at least 2 trees`.
- `place-walks-drawn.test.ts`: `bridgedTiles` also counts each stone bridge piece's footprint.

**Commit:** `feat(worldgen): lay towns out on wide roads by role, with stone bridges`, with `Task: M3.1 Town generator, task 11: Roads by role, sizes and the town plan`.

### Task 12: Walls, towers and gates (sim-engineer, Opus)

**Interfaces:** produces `Wall.erect(site)`, `Wall.gates`, a list of `Gate(side, x, y)` at each gate's first tile, and `settle_walls(site)` / `settleWalls`.

**Rules:**
1. **Stages:** `settle_centre` now only lays the plan: `lay_town` or `lay_village`, then `lay_roads`. `settle_walls` follows and erects the wall, if the place has one. `settle_buildings` then starts with the civic set and plaza pieces, or the village shop, so no building's image rises over a wall. `SETTLEMENT_STAGES`, `build.ts` and `place_goldens.py`'s `STAGES['settlement']` gain `walls` after `centre`.
2. **A wallable tile** is inside the place, open ground rather than water or cliff, not a bank, not a road and not solid.
3. **`Wall.erect`** works the lines north, east, south and west, each from its west or north end, in these passes:
   1. **Gates.** Each run of road tiles on a line is a crossing. One of exactly 2 tiles gets a gate, and its `Gate` joins `wall.gates`:
      - on the north or south line, `<material>_gate_front`, standing, through `cover`, over the 2 road tiles;
      - on the east or west line, `<material>_gate_side-north` built on the tile above the crossing and `<material>_gate_side-south` on the tile below it, each where wallable.

      Other crossings stay open.
   2. **Corners.** Stone builds `wall_tower` with its 2×2 footprint inside each corner, at top-lefts `(x0, y0)`, `(x1 − 1, y0)`, `(x0, y1 − 1)` and `(x1 − 1, y1 − 1)`. A palisade builds `palisade_corner_left` on the two west corners and `palisade_corner_right` on the two east ones. Each stands only where its tiles are wallable.
   3. **Stone towers along the lines:** every 12th tile from a line's first corner, a 2×2 tower inside the line, clear of the far corner's. Skip one within 2 tiles of a gate, or with any tile not wallable.
   4. **Ends at gaps.** Where wallable line tiles meet a gap that isn't a road, such as water or a bank, stone builds a tower at that end if its 2×2 fits. A palisade puts a corner post on a north or south line's end: `_left` at the stretch's west end and `_right` at its east end.
   5. **Runs.** Every wallable line tile still bare takes `<material>_horizontal` on the north and south lines, and `<material>_vertical` on the east and west ones.

   Everything but the front gates goes through `Site.build`, so it is solid and shades the tiles its image rises over.
4. **`export_map.py`:** `KIND_OF_PREFIX` maps `wall` and `palisade` to a new built kind, `wall`, coloured `STONE_D` in `BUILT_COLOURS`; use `STONE` if the palette test objects.
5. **Frames:** the 13 wall and palisade pieces join `USED`, under `walls`.

**Tests:**
- `place-walls.test.ts`, new, over the first 20 standard worlds:
  - `walls capitals and cities in stone and towns in a palisade, and leaves villages and hamlets open`;
  - `stands no wall piece on a road, water or a bank`, front gates aside;
  - `gates every 2-tile crossing of the ring line, and gives every walled place a gate`;
  - `joins every gate to the plaza by road`;
  - `meets Highcourt's river with towers`: in Highcourt's context, as `export_map.py` pins it, at least two towers stand within 2 tiles of the river where it crosses the wall's line.
- `place-walks-drawn.test.ts`: front gates are passages, not held tiles.

**Commit:** `feat(worldgen): ring towns with stone walls and palisades, with gates`, with `Task: M3.1 Town generator, task 12: Walls, towers and gates`.

### Task 13: The bell-curve town (sim-engineer, Opus)

**Interfaces:** produces `zone(site, x, y)`, one of `'centre'`, `'rim'`, `'outside'` and `'open'`; `site.town_greens` / `townGreens`, the greens' rectangles; and the trades.

**Rules:**
1. **Materials:** `MATERIALS = ('board', 'brick', 'cottage', 'plaster', 'rubble', 'stone', 'timber')`, with roofs as today.
2. **Zones:** a place with no wall is `open`. Otherwise:
   - `hx` is `cx − x0` where `x < cx`, else `x1 − cx`, and `hy` likewise;
   - `d = max(|x − cx| * 1000 // hx, |y − cy| * 1000 // hy)`;
   - below 500 is `centre`, below 1000 `rim`, and beyond that `outside`.
3. **Bell targets:** in a walled place, house i aims at `(cx + spread(sx, i, 0), cy + spread(sy, i, 1))`.
   - `spread(n, i, axis)` sums `below(n + 1, SPREAD, i, axis, k)` over k = 0 to 3, then subtracts 2n: a bell from −2n to 2n, with a standard deviation of about 0.58n (Irwin–Hall).
   - `sx = (x1 − x0) // 2 * SPREAD_PER_MILLE // 1000`, and `sy` likewise, with `SPREAD_PER_MILLE = 900`.
   - Open places keep `(cx, cy)`.
4. **Forms follow the target's zone,** as the houses designer advised: the 4-deep townhouse terraces by the plaza, today's row terraces and detached houses in the middle ring, and detached houses, cabins and huts outside, with farmhouses for the fields. The draw is `below(1000, FORM, i)` over `ZONE_FORMS`, per mille:
   - centre: townhouse terrace 650, apartment 200, row terrace 150;
   - rim: row terrace 650, detached 200, townhouse terrace 150;
   - outside and open: detached 300, cabin 300, hut 200, farmhouse 200.
5. **Terraces** hold `n = min(left, 2 + below(4, FORM, i, 1))` houses:
   - a row terrace is `row-left`, `row-middle` × (n − 2), `row-right`;
   - a townhouse terrace is `corner-left`, `townhouse-middle` × (n − 2), `corner-right`, so the shortest is the two corners;
   - **handed:** each row or townhouse piece takes `-handed` where `below(2, FORM, i, unit, 2)` is 1, a uniform draw per house. Corners have no handed version;
   - as today, a terrace of more than 2 falls back to its 2-house version, then, in the centre and rim, to a detached house;
   - spurs are 0 for terraces. Single houses take 1 in the centre and rim, and 3 outside and in open places.
6. **Corners only at streets** (Ruling 8): once a townhouse terrace's lot is found, look at the tile beside each corner's outer side on its front row.
   - Where that tile is no road, the corner gives way to a `townhouse-left` or `townhouse-right` on its two inner columns, handed by the same draw, leaving its outer column free.
   - It does so only if the new end's door tile is a road; otherwise the corner stays.
7. **The large civic set:** `CIVIC['capital']` and `CIVIC['city']` become `civic_town-hall_large`, `civic_courthouse_large`, `civic_library_large`, `civic_records-office`, `civic_police-station`, `civic_clinic_large`, `civic_school_large`, `shop_general` and `shop_warehouse`, without the library where the landmarks hold `library`.
   - The first name is the hall, which faces the plaza from the north, as the town hall does today.
   - A building's salt is its index in its own place's list.
   - Every building's door is its manifest door where it has one, else its middle, in `find_lot` and in `settle`.
8. **Trades,** after the civic set and before the houses: `TRADES = {'capital': ('shop_inn', 'shop_inn', 'shop_bakery', 'shop_bakery', 'work_smithy', 'work_stable'), 'town': ('shop_inn', 'shop_bakery', 'work_smithy', 'work_stable'), 'village': ('work_smithy',)}`, with `city` as `capital`.
   - Trade i picks gate g with `below(len(gates), TRADE, i)`, and takes its outward step: north `(0, −1)`, east `(1, 0)`, and so on.
   - Its target: an inn a third of the way from g to `(cx, cy)`; a bakery `(cx, cy)`; a smithy 3 tiles inside g; a stable 4 tiles outside it. With no gate, or in a village, `(cx, cy)`.
   - Each takes `find_lot` with its door, spur 1, or 2 in a village, and salt `300 + i`. None is built where none fits.
9. **Greens,** after the trades: `GREENS = {'capital': 3, 'city': 3, 'town': 2}`.
   - Green g picks a direction `(dx, dy)` among the eight with `pick(EIGHT, GREEN, g)`, and targets `(cx + dx * hx * 2 // 3, cy + dy * hy * 2 // 3)`, with that side's hx and hy.
   - It takes `find_lot(6, 4, 0, [], target, ground_ok=buildable, salt=400 + g)`. Its tiles turn `meadow` and kept, and `site.town_greens` records it.
10. **Works go outside the wall:** in a walled place, `outskirts` aims 4 tiles past the ring line where its keyed direction points, and at `cx` or `cy` along a zero step. Open places keep a third of the place's size.
11. **`export_map.py`,** placeholders as the file's own are: `CAPACITY` gains `cabin` 3, 6 for each townhouse and corner piece, and each handed piece as its plain one. `HOURS` gains `shop_inn` (420, 1380) and `shop_bakery` (360, 1080).
12. **Frames:** the twelve new forms, handed ones included, join `HOUSE_FORMS`, and the large civic set and the trades join `USED`. `place-frames.test.ts` already checks every form in every material and roof.

**Tests:** `place-density.test.ts`, new, over the walled places of the first 20 standard worlds:
- `holds 380-520 houses inside the wall of the median capital or city, and 240-340 in the median town`, counting houses whose footprint lies inside the ring line;
- `covers more land with houses by the plaza than by the wall, and more inside the wall than past it`. The share of land under house footprints, in the centre, rim and outside zones, is compared by its medians; land here leaves out water, roads and other buildings;
- `puts 5-20% of a walled place's houses past its wall, in the median, each within 3 tiles of a road`;
- `draws each material and roof in every zone at half to twice its overall share`;
- `stands corner houses where terraces meet roads`: at least 80% of corner pieces have a road beside their outer side on the front row;
- `draws handed pieces for about half the terrace houses`: between 40% and 60% of the row and townhouse pieces;
- `builds the large civic set in capitals and cities, and today's in towns`;
- `keeps farms, pastures, quarries, mines and lumber camps outside the wall`.

**If the median capital holds under 380 houses inside its wall,** tune in this order, then report the numbers either way:
1. `CROSS` from 24 to 32;
2. the rim's detached share into row terraces;
3. `RINGS` for capitals and cities, up to (68, 42).

**Commit:** `feat(worldgen): pack towns round the plaza and thin them past the wall`, with `Task: M3.1 Town generator, task 13: The bell-curve town`.

### Task 14: The farm belt (sim-engineer, Opus)

**Interfaces:** produces `Plot(x, y, use)` with `sow(site)`; `site.plots`; `climate_of(site)` / `climateOf`; and `settle_farms(site)` / `settleFarms`. `site.fields` and `site.pastures` keep their meaning for the farmers, the herds and the windmill.

**Rules:**
1. **Stages:** `settle_farms` follows `settle_buildings`, and `STAGES['settlement']` gains `farms` after `buildings`. It replaces `place_fields` and `settle_buildings`' field count, and the windmill moves into it, last.
2. **Climate:** `desert` where `site.desert()`; `paddy` where temperature ≥ 170 and moisture ≥ 160; `vine` where temperature ≥ 150 and moisture < 120; `cold` below temperature 90; else `temperate`.
3. **The lattice:** plots are 12 × 6 tiles, plot (i, j)'s top-left at `(cx % 12 + 12i, cy % 6 + 6j)`. A plot's interior is its first 11 columns and 5 rows, and its last column and row are track lines. Plots whose interior leaves the place are skipped. Visit them row by row, west to east.
4. **A plot is farmed** if every interior tile is free and under no crown, and:
   - in a walled place, its interior lies outside the ring line with a tile to spare;
   - in an open place, its centre is at least 8 tiles from `(cx, cy)` in Chebyshev distance.
5. **Its use** is a weighted draw `below(total, FIELD, px, py)` over `USES[climate]`:
   - temperate: strips 5, pasture 2, orchard 1, farmyard 1, wild 2;
   - vine: vineyard 3, strips 3, orchard 2, pasture 1, farmyard 1, wild 1;
   - paddy: paddy 5, strips 1, orchard 1, farmyard 1, wild 2;
   - cold: strips 3, pasture 3, farmyard 1, wild 3;
   - desert: pasture 2, wild 6.

   Wild weighs 4 times as much where the plot's side from the centre, by `_toward`, isn't a farmland side. Farmland sides are `ctx.farmland`, or all four on farmland.
6. **`Plot.sow`,** keeping every tile it changes:
   - **strips:** interior rows 0–1, 2–3 and 4 are three strips, each one crop, `pick(STRIPS, FIELD, px, py, k)`. `STRIPS` is today's eight crops, or in the cold only the grain stages and soil. `site.fields` records the interior;
   - **pasture:** a fence on the interior's border, with its gate on the bottom row at `px + 1 + below(9, FIELD, px, py, 1)`, and `crop_pasture` inside. `site.pastures` records the inner 9 × 3;
   - **orchard:** `meadow`, with `tree_orchard` through `site.tree` at every even offset, 0–10 across and 0, 2 and 4 down;
   - **vineyard** and **paddy:** every interior tile `crop_vine_<stage>` or `crop_rice_<stage>`, one stage a plot, picked from seedling, growing, ripe and stubble on `FIELD, px, py, 2`. `site.fields` records it;
   - **farmyard,** after the tracks: `farm_barn` with its top-left at `(px, py + 3)`, `farm_granary` at `(px + 6, py + 3)` and `farm_shed` at `(px + 9, py + 4)`. Each is settled only where it fits, with its door on the track below;
   - **wild:** nothing.
7. **Tracks:** once every plot is sown, each free track-line tile round a farmed plot's interior, corners included, becomes `track` through `lay_road`. Its tile is:
   - `terrain_farm-track_horizontal` with a road east or west and none north or south;
   - `_vertical` with a road north or south and none east or west;
   - `terrain_dirt-path` otherwise.
8. **The watermill,** in a place with a river, takes the cheapest top-left `(tx, ty)` where:
   - its 4 × 2 footprint is open ground, not road, solid, kept or shaded, though a bank is allowed;
   - the 2 columns east of the footprint are river water, not sea, on both rows;
   - it lies outside the ring line with a tile to spare (walled), or 6 tiles or more from `(cx, cy)` (open);
   - its door reaches a road within 3 tiles.

   The cost is `|tx + 2 − cx| + |ty + 2 − cy| + below(6, MILL, tx, ty)`, ties to the first in reading order. Build it and lay its spur.
9. **The rest:** the windmill is today's `place_windmill`, last in this stage. Chickens peck by barns as by farmhouses, and people's spots leave out farm tracks.
10. **Tables:**
    - `export_map.py`: `KIND_OF_PREFIX['farm'] = 'workplace'`;
    - `place_goldens.py`: `KINDS` gains the vine and rice stages;
    - frames: `farm_barn`, `farm_granary`, `farm_shed`, `work_watermill` and `tree_orchard` join `USED`.

**Tests:** `place-farms.test.ts`, new:
- `grows vines only on warm, dry land and rice only on hot, wet land, and neither in a desert`: over the first 20 standard worlds, and on villages at (temperature, moisture) (170, 100), (200, 200), (120, 140) and (200, 40);
- `farms a village's farmland side more than its others`: summed over 20 seeds, a village whose one farmland side is west has at least a third more field tiles west of `cx` than east;
- `keeps every farmed plot outside the wall`;
- `draws tracks along their run and dirt where they cross or turn`, on an L of track tiles on a bare site;
- `stands every barn, granary and shed with its door on a road`;
- `turns every watermill's wheel over river water`.

**Commit:** `feat(worldgen): lay a farm belt by climate round every settlement`, with `Task: M3.1 Town generator, task 14: The farm belt`.

### Task 15: Lamps, greens and gardens (sim-engineer, Sonnet)

**Rules:**
1. **Lamps:** today's rule, beside road tiles of kind `stone` or `cobble` in a walled place. In an open place it runs beside `path` or `gravel` and puts flower patches, as today.
2. **Greens:** each 6 × 4 rectangle in `site.town_greens` gets, by offset from its top-left:
   - `prop_hedge` along row 0, and down columns 0 and 5;
   - `flower-bed`, kept, along row 1 from column 1 to 4;
   - a tree from the mix at row 2, column `1 + below(4, GREEN, g, 1)`;
   - `prop_bench` at row 3, column 3.

   Only tiles with nothing standing take them.
3. **Gardens:** for each house footprint whose centre's zone is `rim`, `outside` or `open`, in `sorted(site.places)` order as the clutter goes: with `chance(300, GARDEN, tx, ty)`, the first free tile of the two beside its front row, left then right, becomes `flower-bed`.
4. **Clutter:** the table gains `shop_inn` barrel and crate; `shop_bakery` sacks; `work_smithy` woodpile and barrel; `work_stable` hay bale and trough; `farm_barn` two hay bales; `farm_granary` sacks; and `work_watermill` sacks.
5. **Tiles and frames:** `flower-bed` draws `nature/terrain_flower-bed`, and joins `KINDS`. `prop_hedge`, `prop_sacks`, `prop_woodpile` and `prop_trough` join `USED`.

**Tests:** `place-decor.test.ts`, new, over the first 20 standard worlds:
- `lights walled places only beside cut stone, cobbles and paving`;
- `hedges, beds and benches every green`;
- `gives 15-45% of the houses in the rim, the suburbs and open places a flower bed`, in the median.

**Commit:** `feat(worldgen): light the streets and plant greens and gardens`, with `Task: M3.1 Town generator, task 15: Lamps, greens and gardens`.

### Task 16: The street crowd on wide roads (sim-engineer, Sonnet)

TypeScript only, so no golden moves.

**Rules:**
1. `walks.ts` exports `walkableGrid(site)`, and `street-crowd.ts` drops its copy of the rule and imports it.
2. **Hubs** are road tiles that aren't `track`, so the crowd keeps to the town and the country roads.
3. **Lanes:** hub i's tree visits its neighbours in `DIRS` order rotated by `below(4, seed, CROWD, LANE, i)`. Shortest paths often tie along a wide road, so loops from different trees keep to different rows.
4. **The budget:** a loop is left out once the crowd's cells would pass `CROWD_CELLS = 131_072`.

- [ ] **Step 1: Tests,** in `street-crowd.test.ts`:
  - `never sets a hub on a farm track`;
  - `keeps every place's crowd within 131,072 loop cells`, over the first 20 standard worlds; `place-walks.test.ts` already keeps the people's loops within 16,384;
  - `spreads the crowd over a main road's three rows`: in the median capital of the first 5 standard worlds, the busiest of the spokes' three rows holds at most 75% of their loop cells.

  Run `pnpm vitest run packages/worldgen/test/street-crowd`. Expected: FAIL.
- [ ] **Step 2: The rules,** until `pnpm vitest run packages/worldgen/test/street-crowd packages/worldgen/test/place-walks apps/web/test/walkers` passes.
- [ ] **Step 3: Check:** `node packages/worldgen/scripts/time-places.ts`, within Task 9's budget, and `pnpm lint && pnpm typecheck`.
- [ ] **Step 4: Commit** `feat(worldgen): spread the street crowd across wide roads`, with `Task: M3.1 Town generator, task 16: The street crowd on wide roads`.

### Task 17: Road classes on the country map (sim-engineer, Opus; done)

Done on 10 October 2026: b05bccc, and f84a9e2 for render-gl's tiny test world. Over 100 worlds of each size, 5,570 of 44,093 roads are major, and classing adds under 2 ms to a large world in Node (measured here).

It may run beside Tasks 11–16, since it shares no file with them and road classes never reach a place.

**Interfaces:** produces `roads.classes(width, height, biome, settlements, roads)` / `roadClasses(...)`, a `bytearray` / `Uint8Array` with one class per road path, 0 minor and 1 major; `ROAD_CLASS_NAMES = ['minor', 'major']`; and `WorldMap.roadClass`.

**Rules:**
1. `route_graph(settlements, mass, span2=SPAN2)`: with `span2=0`, it returns the spanning tree alone.
2. **`classes`:**
   - the hubs are the capitals, cities and towns, and their tree is `route_graph(hubs, their masses, span2=0)`;
   - the route graph's nodes are the settlements, and its edges the road paths, each joining the settlements at `path[0]` and `path[-1]`, weighted `len(path) − 1`;
   - for each tree edge in order, the cheapest route-graph path between its ends marks its routes major. It is found by Dijkstra, ties to the lower node index.
3. **`world.py`:** `w.road_class` follows the roads, and `fingerprint` feeds `len(road_class)` and the classes after the roads and lanes.
4. **`goldens.py`:** a `classes` stage after `roads`, folding the classes.
5. **The port:** `routes/graph.ts`'s `routeGraph` gains `span2`, and new `routes/classes.ts` holds `roadClasses`, using `grid/heap.ts`. `world/generate.ts` sets `roadClass`, `world/fingerprint.ts` folds it, and the goldens harness mirrors the `classes` stage.
6. **`world-map.ts`:** `ROAD_CLASS_NAMES`, and `WorldMap.roadClass: Uint8Array`, one `ROAD_CLASS_NAMES` index per road path, which `worldMapBuffers` lists.
7. **`sweep.ts`:** over its 100 seeds of each size, the major roads' cells join every hub of each landmass.

- [ ] **Step 1: Tests:**
  - Python: `test_worldgen.py` gains `major_roads_join_the_towns`, over its sample seeds;
  - TypeScript: `road-classes.test.ts`, new, with `classes every road`; `joins every town, city and capital of a landmass by major roads`, over the first 20 standard and 5 large worlds; and `leaves some roads minor`, in most of them.

  Run `pnpm vitest run packages/worldgen/test/road-classes`. Expected: FAIL.
- [ ] **Step 2: Python:** the rules, then `python tools/worldgen/goldens.py` and `python tools/worldgen/test_worldgen.py`.
- [ ] **Step 3: The port,** until `pnpm vitest run packages/worldgen packages/sim-protocol apps/web/test/map-worker` passes.
- [ ] **Step 4: Check:** `python tools/worldgen/goldens.py --check --seeds 3`, `node packages/worldgen/scripts/engines.ts`, `node packages/worldgen/scripts/frozen.ts --check`, `node packages/worldgen/scripts/sweep.ts`, and `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(worldgen): class country roads as highways and tracks`, with `Task: M3.1 Town generator, task 17: Road classes on the country map`.

### Task 18: Highways, tracks and walled icons on the map (render-engineer, Opus; done)

Done on 10 October 2026: 19ef31a. All 60 map browser specs pass in Chromium, Firefox and WebKit. The Countries golden came out byte-identical, since its flat view hides roads and icons, so Step 5's second commit wasn't needed.

**Waits for:** `nomos-bd`'s Town skin, and Task 17.

**Rules:**
1. `map-colours.json` gains `"highway": "#9AA2B4"`, the palette's `STONE_L`.
2. `mapdraw.py`'s `_routes` draws lanes, then minor roads dotted in `ROAD` as today, then major roads solid in the highway colour, at the same thickness.
3. `render-gl`'s `overlay.ts` adds a palette index, `HIGHWAY`, right after `ROAD`, shifting the later ones by one.
   - Minor roads draw dotted, then major roads solid.
   - The flat Countries view hides `HIGHWAY` with the other routes.
   - `base-pass.ts` gives it `LINE_COLOURS.highway`.
4. **Walled icons** (Ruling 12): a settlement's icon is `map8_settlement_<tier>-walled` in the Country view and `map16_settlement_<tier>-walled` in the Region view for a capital or city, `…_town-palisade` for a town, and today's `settlement_<tier>` for a village or hamlet.
   - `mapdraw.py` takes it from one function of tier and tile size, for `_overlays` and for `_beside`'s reach.
   - `render-gl`'s `settlementFrame(tier, view)` in `frames.ts` mirrors it, for `overlays` and `beside` in `icons.ts`.

- [ ] **Step 1: Tests:**
  - in `map-overlay.test.ts`, on a tiny world with one major and one minor road: every step of the major draws `HIGHWAY`, the minor draws `ROAD` dotted, and the flat view draws neither;
  - in `map-icons.test.ts`: each tier's icon in each view is the frame rule 4 names, and every one is on the map page.

  Run `pnpm vitest run packages/render-gl/test/map-overlay packages/render-gl/test/map-icons`. Expected: FAIL.
- [ ] **Step 2: The rules,** until `pnpm vitest run packages/render-gl/test/map-overlay packages/render-gl/test/map-icons packages/render-gl/test/map-colours` and `python tools/worldgen/test_worldgen.py` pass.
- [ ] **Step 3: The Countries golden,** since the icons changed: `UPDATE_GOLDEN=1 pnpm exec playwright test apps/web/test/browser/map-golden.spec.ts --project=chromium --workers=1`, then again without `UPDATE_GOLDEN`.
- [ ] **Step 4: Look:** `python tools/worldgen/generate.py` draws a world's previews. Check the highways and the walled icons in its Region view.
- [ ] **Step 5: Commit** `feat: draw highways in stone and tracks in dirt on the country map`, then `test(web): pin the countries view with walled icons`, each with `Task: M3.1 Town generator, task 18: Highways, tracks and walled icons on the map`.

### Task 19: The 2 ms bar and the pixel check (render-engineer, Opus)

**Waits for:** `nomos-bd`'s Town skin, and Tasks 11–16. Part 2's step 3 lands here.

- [ ] **Step 1: The place pass's pixel check,** in all three browsers: `pnpm exec playwright test packages/render-gl/test/browser/place.spec.ts --workers=1`. Expected: every fixture in the regenerated `places-v1.json` matches, in WebGL2 and Canvas2D.
- [ ] **Step 2: The 2 ms bar:** `pnpm exec playwright test apps/web/test/browser/perf.spec.ts --project=perf --no-deps --workers=1 -g "town view"`. Expected: the capital's town view pans within 2 ms a frame, in WebGL2 and in Canvas2D. Record the frame times, walkers and canvas size, with the engine and the machine.
- [ ] **Step 3: The place engine spec's timeouts,** since places grew again: run the worldgen browser engine spec in all three browsers.
- [ ] **Step 4: If the bar fails,** profile it. Fix the pass, in `nomos-bd`'s files, only with its agreement. The likely costs are the 56% more tiles and the walkers.
- [ ] **Step 5: Commit** only a spec that changed, as `test(web): …` with `Task: M3.1 Town generator, task 19: The 2 ms bar and the pixel check`. Report the numbers either way.

### Task 20: Highcourt and the first screen (sim-engineer and senior-game-engineer, Sonnet)

**Waits for:** Tasks 11–16 and 19.

- [ ] **Step 1 (sim-engineer):** `python tools/worldgen/export_map.py --check` and `pnpm vitest run apps/web/test/town` pass, since every layout task re-exported Highcourt.
- [ ] **Step 2 (sim-engineer): the replay hash.** `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000`. Expected: the hash on `main` when the task starts. The CLI runs on the stand-in ground, so this round never moves it, while the other session's economy does: it was `3c786124` after M2.1's Task 1.
- [ ] **Step 3 (sim-engineer):** report the first screen's start counts per tier from `tiers.test.ts`, with the tick budget each is held to. The owner decides the counts (task.md, Owner decision first).
- [ ] **Step 4 (senior-game-engineer): screenshots for the owner,** at 1,280 × 800, seed 42 and `?tier=desktop`, saved to `dist/qa/walled-towns/`:
  - the first screen, in the Town skin;
  - the town views of a capital, a town, a village and a hamlet, one of them on a river;
  - the map's Region view on a capital, with its highways and walled icon.
- [ ] **Step 5:** commit nothing unless a pinned number moved, and report the paths.

### Task 21: Close part 3 (coordinator)

- `interfaces.md`: the sim-architect's changes below. The coordinator applied them on 10 October 2026, after `nomos-bd`'s Town skin edit landed, and reconciled them with its `TownRequest`. At close, check them against the code, and if Task 11 took Ruling 1's fallback, change item 8's sizes.
  1. **The world map, The package:** add `classes.ts` to the `routes/` row's files, and "and its road classes" to its concern.
  2. **The world map, The package, `place/` row:** after "the stage files", add "(among them `walls.ts` and `farms.ts`, from M3.1's Part 3)" and `street-crowd.ts`. Make its concern "…plus the walk loops and the street crowd Python lacks…".
  3. **Generating:** add to the goldens bullet "From M3.1's Part 3 a `classes` stage follows `roads`", and to the `worldFingerprint` bullet "It folds `roadClass` after the roads and lanes."
  4. **`WorldMap`:** add the code table "`ROAD_CLASS_NAMES`: minor, major (M3.1's Part 3)". Add a row to "The rest": `roadClass`, a `Uint8Array` with one class per road path, in roads' order, as a `ROAD_CLASS_NAMES` index. Major roads are the cheapest chains of routes joining the towns, cities and capitals that a spanning tree links on each landmass.
  5. **`@nomos/render-gl/map`, Colours:** after "the line colours", add "with `highway`, the palette's `STONE_L` (M3.1's Part 3)".
  6. **`@nomos/render-gl/map`, What draws, "After the page":** replace "roads" with "minor roads dotted, major roads solid in `highway`". Add: a capital's or city's icon is `map8_settlement_<tier>-walled` in the Country view and `map16_…` in the Region view, a town's is `…_town-palisade`, and a village's or hamlet's stays `settlement_<tier>`.
  7. **`@nomos/render-gl/map`, Atlas page:** the map page holds 93 frames, not 81, since the walled icons and their highlight rings (b02c835).
  8. **Places, intro:** the sizes become 176 × 112 tiles for a capital or city, 152 × 96 for a town, 80 × 48 for a village and 56 × 32 for a hamlet (M3.1's Part 3), or a wonder's vista of 30 × 18. If Task 11 took Ruling 1's fallback, use 160 × 100 and 140 × 80.
  9. **The contract,** catching up with Part 2's street crowd, which `interfaces.md` never recorded:
     - `PlaceReply` becomes `{ type: 'place', place, layout, walks, crowd, ms }`, as `placeBuffers(layout, walks, crowd)` lists them;
     - add **`PlaceCrowd`:** look-only walkers, one per 150 residents and at most 3,000. Crowd loop r steps through `cells[offsets[r]]` to `cells[offsets[r + 1] − 1]` and back. Walker k has `look[k]` and `expression[k]`, follows loop `loop[k]`, and starts `phase[k]` art px along it.
  10. **Building a place:**
      - the loop budget reads "A place's loops hold at most 16,384 cells", the code's value, not 4,096;
      - add: the street crowd keeps to at most 300 loops of at most 4,000 cells, 131,072 cells in all. Its hubs lie on roads that aren't farm tracks, and each hub's search order is keyed by `LANE` (0x125) on `CROWD`, so loops spread across wide roads (M3.1's Part 3);
      - the stages become water, centre, walls, buildings, farms, decor, nature and people.
  11. **Building a place, a new bullet, "The walled town (M3.1's Part 3)":**
      - **New tile kinds:** `stone` (main road, 3 wide), `cobble` (street, 2), `gravel` (country road, 2), `track` (farm track, 1), `flower-bed`, and `crop_vine_<stage>` and `crop_rice_<stage>`. `path` stays the lane and `paving` the plaza. A road tile keeps the highest-ranked kind laid on it, in the order paving, stone, cobble, gravel, track, path.
      - **Wall rings:** half-sizes of 64 × 40 for capitals and cities, in stone, and 56 × 30 for towns, as a palisade. Each is centred on the plaza's centre and kept 6 tiles inside the place's edge.
      - **Gates** are 2 tiles wide. A front gate is a standing sprite over road that marks nothing solid; a side gate is a solid pier and cap beside a 2-tile gap.
      - **Bridges:** main and country roads cross rivers on ground-layer bridge pieces. The water tiles stay water and become road.
      - **`town.nmap`** gains the built kind `wall`, and `farm_` buildings count as workplaces.
  12. **The atlas in every build:** add "The town page leaves out frames ending in `_snow` or `_night`, and `test_atlas.py` fails past 1,920 px (M3.1's Part 3)."
- Once everything is committed, run `senior-qa` once to prove task.md's Part 3 checks, and `code-reviewer` once over the whole part. Then run `/determinism-review` over `packages/worldgen`.
- Fill in the Started, Done and Actual cells in `milestone.md`, then write the next checkpoint and commit it alone.

### Done-checks, and the tasks that prove them

| Check (task.md, Part 3) | Proved by |
| --- | --- |
| Places' sizes | Task 11 |
| Stone walls, palisades and open villages | Task 12 |
| No wall piece on a road, water or a bank; a 2-tile gate on every crossing | Task 12 |
| Every map-edge road and gate joins the plaza by road | Tasks 11 and 12 |
| Road surfaces inside and outside the wall | Task 11 |
| Bridges over every water tile under a road | Task 11 |
| Trees along main roads | Task 11 |
| Houses inside the median wall | Task 13 |
| Coverage falls from the plaza to the wall, and past it | Task 13 |
| Suburbs' share | Task 13 |
| Materials and roofs even in every zone | Task 13 |
| Crops by climate | Task 14 |
| Loop budgets | Task 16 |
| Build time | Task 9, and Step 7 of each layout task |
| Road classes | Task 17 |
| Goldens, fixtures and `town.nmap` | Tasks 11–15 |
| Walled icons by tier and view | Task 18 |
| The town atlas page within its cap | Task 10 |
| The 2 ms bar | Task 19 |

### Risks

- **The core's count sits near the owner's floor.** The probe holds about 420 at full packing, and the greens, trades and large civic set take some of that. Task 13 tunes in a fixed order.
- **Python is slow.** Goldens take minutes, and CI's `place_goldens.py --check --worlds 1` grows with the walled places. Measure it in Task 11; if it passes 5 minutes, ask the coordinator about checking fewer of the first world's places.
- **The farm belt costs build time** (Ruling 1). 176×112 holds about 1.2× the tiles of 160×100, and every plot is a search. Task 11 measures it against Task 9's budget, with the fallback ready.
- **Shared files:** both sessions touch `town.nmap`'s pinned tests and `assets/LICENSES.md`. The Global constraints' checks guard them.
- **The atlas keeps growing.** Task 10's trim buys about a sixth of the page, but each new house form costs 35 frames, one for each material and roof. The test's 1,920 px line warns before the cap breaks; a second page is the fix after that.
- **Art still being polished** changes pixels, so `places-v1.json` and the atlas move with each sheet. The coordinator regenerates them as the hand-off says.

### Open questions for the owner

1. **The first screen's blob count,** once Highcourt is 176×112. Task 20 reports what the town gives per tier, for the existing owner decision.

Settled on 10 October 2026, and open to the owner's overturning:
- **The farm belt's depth:** the coordinator chose 176×112 and 152×96 (Ruling 1).
- **The walls' look:** the owner said to draw the assets and then add them to the plans, so the drawn walls and palisade stand. Their previews went to the owner.

## The rest of M3.1: brief

> Expand this part into a step plan with the writing-plans skill before building it, against the code as it then stands.

### Approach

- **Port `tools/worldgen/place.py` to TypeScript** and prove it bit-equal against Python goldens. The Python generator stays the reference.
  - M8.1 ported the country stages first, before M1 (owner, 9 October 2026), following round 9's port order.
  - The place stages join them in `packages/worldgen`, and their fingerprints join M8.1's `goldens.py`.
- **Round 9's four traps** each broke 33–88% of results ([R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "The port matches so far, with four traps to avoid"):
  - a signed draw before `%`;
  - `>> 16` instead of `>>> 16`;
  - truncating instead of floor division;
  - truncated `//` in the terrain and moisture terms.

  M0.6's generator lints ban bare `/` and `%` outside the floor-division helpers.
- **Plan-then-apply shore tidying.** Each pass judges every cell before changing any, so the result is order-free.
  - First, `tools/sprites` draws the two missing shore saddle keys (`1001` and `0110`) for both shores: 4 frames, or 8 with variants.
  - Then the corner set is complete, and tidying can drop its diagonal clause, in both Python and TypeScript.
- **Districts and lots:** 64×64-tile districts and frontage lot packing, as in `place.py`.
- **Output is round 9's one binary map.**
  - IntGrid values: wall, water, road, sidewalk, grass and door.
  - Entities: homes, shops, workplaces and the market, each with capacity, owner and opening hours.
  - Workplaces by sector: farm, pasture or dock, lumber camp, quarry, mine, fuel works and workshop, each with worker capacity. Services use the clinic, school, shop and market.
  - Tiles name sprite frames, never atlas indices.
- **Civic signals,** from the existing art:
  - shops wear teal-and-cream awnings with a gold coin sign;
  - home roofs are chosen by keyed draw, never by wealth.
- **The LDtk project is a fallback only,** with auto-layer rules and a roof and treetop layer for the hand-made fallback town (R3).

### Packages and files

- `packages/worldgen` (`@nomos/worldgen`), from M8.1:
  - pure TypeScript under the generator lints, whose glob M8.1 extended to this package;
  - `src/place/` mirrors `place.py`'s functions one to one, so a diff against Python stays readable;
  - `src/place/export.ts` writes `MapV1` through `sim-protocol`'s writer.
- `tools/worldgen/goldens.py`, from M8.1: extended with per-stage fingerprints for the place stages. Golden fingerprints cost about 363 B per seed (R9).
- `tools/sprites`: the saddle keys, then `tools/worldgen/place.py`'s tidying without its diagonal clause, with the goldens regenerated in the same commit.
- `assets/maps/fallback-town.ldtk`: the fallback town only.

### Interfaces and data

- `generatePlace(ctx: PlaceContext, out: MapWriter): void`. `PlaceContext` mirrors `tools/worldgen/model.py`: seed, name, biome, temperature, and the extras the world generator passes.
- **Per-stage fingerprints:** a 32-bit hash of each stage's output grid, compared stage by stage, so a mismatch names the stage.
- **The map:** `MapV1` from M0.4, filled here with real towns. Any new entity field is a version bump of the format, recorded in `sim-protocol`.

### Method and sources

- **Port rules, traps, goldens and timings:** [R9 report](../../../../research/round-9-maps-and-world-builder/report.md) and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md).
- **Generated towns over LDtk:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md), owner decisions: "Where towns come from" and "The first town".
- **Workplaces per sector:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), the recommendation.
- **IntGrid values and the roof layer:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), the LDtk sections.
- **Reference code:** `tools/worldgen/place.py`, plus `rng.py` and `noise.py`, which M0.1 already ported.

### Tests for the exit checks

- `one map drives walkability and tiles`: for 100 seeds:
  - every walkable IntGrid cell has a ground tile;
  - every zone entity has a building footprint on the tile layer;
  - every door touches a walkable cell.
- `matches Python stage by stage`: per-stage fingerprints equal the Python goldens for 100 seeds in Node, and in Bun, Chromium, Firefox and WebKit through M0.6's engine harness.
- `tidying is order-free`: tidying a shore in reversed cell order gives the same grid.
- `roofs never follow wealth`: the roof choice key contains no occupant or price field. A test generates a town, permutes household wealth, and gets identical roofs.

### Risks and unknowns

- **Python changes ripple.** Removing the diagonal clause changes Python's outputs too. Regenerate the goldens and the mockups that depend on them in the same commit.
- **Map format growth:** capacity, owner and hours may need fields `MapV1` lacks. Version the format, and never reuse a field.
- **Generation time:** round 9 sets ≤ 100 ms for a standard world in desktop Chromium, an M8.1 check met before M1. A town is generated apart from the world, so measure the town stage alone here.

### Open questions

- **Owner:** Build the LDtk fallback town now, or only if the port slips? M3.4 already names it the fallback, and its auto-layer rules and roof layer go unused if the port lands. Suggested: only if the port slips. Needed before: the step plan for this part.
- **Owner:** Should capacity, hours, owner and sector be added to `place.py`, or derived in a TypeScript-only export stage? `place.py` exports none of these fields, but M0.4's `tools/worldgen/export_map.py` already derives home capacity and shop hours in Python, so goldens can cover those two; owner and sector have no Python source yet. Suggested: port `export_map.py`'s capacity and hours rules with the golden-checked stages, and add owner and sector in a TypeScript stage after them, from building-kind tables, with "owner" a kind (household, firm or town) that M2.2's spawn fills in. Needed before: the step plan for this part.
- **Measure:** How long does the town stage take in desktop Chromium and on a mid-range phone? Round 9's ≤ 100 ms covers a whole world in M8.1, built before M1, so the town needs headroom. Suggested: track it in M0.6's bench, with no gate until M8.1's world check covers it. Needed before: launch.

### Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the place stages' fingerprints in `goldens.py` first, then the port stage by stage in `place.py`'s order, each green before the next. The saddle keys and the diagonal-clause removal come as their own step, then the export and the exit check.
- **Reuse:** M0.1's ported draw and noise; M8.1's `packages/worldgen`, `goldens.py` and golden test across five engines; M0.4's `parseMap`, building-kind tables and Python `write_map`, the reference for a TypeScript writer; M0.5's manifest types; M0.6's generator lints and five-engine harness.
- **Keep it simple:** bump the map format once, with every new field together, rather than once per field.
- **Pitfalls:**
  - Beyond round 9's four traps, Python sets iterate in hash order, while a JavaScript `Set` keeps insertion order. Loop over sorted cells where order matters. JavaScript objects also order integer keys ascending, and a sort comparator must return a number.
  - Regenerated mockups live in `docs/`, so they need their own commit after the goldens, since code and docs never share a commit ([interfaces.md](../../m0-pipeline/interfaces.md)).
- **Hard and easy parts:** bit-equality stage by stage is the hard part. The export, the civic signals and the walkability check are mechanical.
