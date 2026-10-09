# M3.1 Town generator: plan

> **Status:** step plan for the place port and the owner's town view, started 9 October 2026. The rest of M3.1 is still the brief further down: the export to the binary map, the saddle keys and the LDtk fallback. Expand it with the writing-plans skill before building it.

**Task:** [task.md](task.md)

## Step plan: the place port and the owner's town view

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

1. **A place is `place.py`'s district.** That is 48×28 tiles for a capital or city, 40×24 for a town, 32×20 for a village or hamlet, and 30×18 for a wonder's vista. The brief's "256² town" and "64×64 districts" do not match `place.py`, which stays the reference.
2. **People are look-only, like the map's crowd.** They are `place.py`'s people, with no names, money or sim. Some walk loops. The rest stand or sit where `place.py` puts them.
3. **Summer art only.** Seasons wait for M3.8.
4. **Wonders open their vistas too,** since the port builds them anyway.
5. **The atlas:** the full page that `tools/atlas` already builds (`atlas.webp`, 86 KB, and `atlas.json`) loads when the first place opens, never on first load.
6. **The first screen's town keeps Skin A dots.** Drawing it with these sprites is the next step, to offer the owner.

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
