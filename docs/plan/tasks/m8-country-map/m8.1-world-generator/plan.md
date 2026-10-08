# M8.1 World generator: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Port the country stages of `tools/worldgen` to TypeScript, in pipeline order,** inside `packages/worldgen` beside M3.1's place port. It runs in the worker. Commit each stage only when its golden fingerprints match Python (R9):
  1. template and noise elevation;
  2. keyed mountain chains;
  3. priority-flood;
  4. flow accumulation;
  5. erosion-lite passes;
  6. climate;
  7. biomes and habitability, with a snow biome for cold lowland.
- **Round 9's four porting traps** apply throughout, and M0.6's generator lints guard them:
  - a signed draw before `%`;
  - `>> 16` for `>>> 16`;
  - truncating division;
  - truncated `//` in the terrain and moisture terms.
- **Settlements and routes on the square grid (R4, R9):**
  - **settlements:** capitals, then towns, then villages, with minimum spacing and P₁/k rank-size populations;
  - **land routes:** a spanning tree per landmass plus spanner shortcuts, routed by A\* with slope, bridge and road-reuse costs;
  - **sea lanes** between landmasses;
  - **regions and market territories,** grown by multi-source Dijkstra.

  `tools/worldgen` skips round 4's Delaunay step, so the port does too.
- **Stable identity (R9).** Place seeds, landmark draws and names key on the settlement's uid, which is its cell, never on population rank.
- **Wonders and landmarks (R9):**
  - 4–8 natural wonders per world by site rules, each kind at most once;
  - hot springs, geyser and caldera lake share one geothermal hotspot;
  - built landmarks by tier and site, placed on the settlement, or on cells of their own for viaducts, observatories and lighthouses.
- **Re-baseline counts.** M7's and M8's settlement counts become listed places plus a region tier, with Zipf fitted on true ranks (R9).

## Packages and files

- `packages/worldgen/src/country/`: `template.ts`, `elevation.ts`, `chains.ts`, `flood.ts`, `flow.ts`, `erosion.ts`, `climate.ts`, `biomes.ts`, `settle.ts`, `routes.ts`, `regions.ts` and `features.ts`, mirroring `tools/worldgen`'s modules one to one.
- `tools/worldgen/goldens.py`, extended from M3.1: per-stage fingerprints for the country stages.
- `packages/worldgen/test/country-goldens.test.ts`: runs in Node, and in Bun and three browsers through M0.6's engine harness.

## Interfaces and data

- **`generateWorld(seed: number, size: 'standard' | 'large', edits: EditLayer[], out: WorldWriter): void`**: 96×64 (standard) or 192×128 (large), with edits applied as stage inputs (M6.3, M8.7).
- **Per-stage outputs** are typed-array grids: elevation, flow, climate, biome and habitability. Each has a fingerprint.
- **Settlement record:** `{ cell, tier, population, region, port, crossroads, landmarks }`, which feeds M6.1's `CityContext` and M7's store.

## Method and sources

- **Layers, the square grid, identity across visits, porting traps and new tiles:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), part 1, and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md).
- **Rank-size, spacing, routes and regions:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md) and [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 2.
- **Reference code:** `tools/worldgen/` (`world.py`, `terrain.py`, `drainage.py`, `climate.py`, `settle.py`, `roads.py` and `features.py`).

## Tests for the exit checks

- `generates within budget`: in desktop Chromium, a standard 96×64 world takes ≤ 100 ms and a large 192×128 world ≤ 400 ms, as the fastest of 9 samples.
- `fingerprints match Python`: per-stage fingerprints match the goldens for 100 seeds in Node, Bun, Chromium, Firefox and WebKit.
- `identity by cell`: changing a far settlement's population leaves every other place's seed, landmarks and name unchanged.
- `wonders by the rules`: over 1,000 seeds, every world has 4–8 wonders, no kind twice, and the geothermal three share one hotspot.

## Risks and unknowns

- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones. They set the phone tier for country mode.
- **The Python reference may still change** before the port starts. Freeze a generator version first, and regenerate goldens and mockups together.
- **Sea cliffs form only on south coasts,** an open item since checkpoint 0001. Fix it in Python before freezing the goldens.

## Open questions

- **Measure:** Does a large 192×128 world fit 400 ms with A\* routes and Dijkstra regions? R9 timed only terrain (about 8 ms at 96×64); its 21–87 ms standard-world estimate becomes 84–348 ms at four times the cells (computed). Suggested: time each stage in Chromium in the first week, since A\* grows faster than the cell count. Needed before: building.
- **Measure:** What are day-step, spawn and generation times in browser workers on phones? They set country mode's phone tier. Suggested: one mid-range Android phone and one iPhone. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the elevation stage and its golden test in all five engines, proving the harness, then each stage in pipeline order, settlements and routes last.
- **Reuse:** M3.1's place port, M0.6's engine harness and generator lints, M0's keyed draw and integer noise, and `tools/worldgen/goldens.py`.
- **Keep it simple:** port the Python line for line, and optimise only a stage that misses the budget.
- **Pitfalls:** A\* and Dijkstra must break ties exactly as the Python heap does, or routes and regions drift from the goldens. Route lengths in kilometres use M7.1's cell scale.
- **Hard and easy parts:** routing and regions need the most care, for speed and tie order; climate, biomes and the wonder site rules are mechanical.
