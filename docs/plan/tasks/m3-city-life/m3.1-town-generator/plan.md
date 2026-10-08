# M3.1 Town generator: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

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

## Packages and files

- `packages/worldgen` (`@nomos/worldgen`), from M8.1:
  - pure TypeScript under the generator lints, whose glob M8.1 extended to this package;
  - `src/place/` mirrors `place.py`'s functions one to one, so a diff against Python stays readable;
  - `src/place/export.ts` writes `MapV1` through `sim-protocol`'s writer.
- `tools/worldgen/goldens.py`, from M8.1: extended with per-stage fingerprints for the place stages. Golden fingerprints cost about 363 B per seed (R9).
- `tools/sprites`: the saddle keys, then `tools/worldgen/place.py`'s tidying without its diagonal clause, with the goldens regenerated in the same commit.
- `assets/maps/fallback-town.ldtk`: the fallback town only.

## Interfaces and data

- `generatePlace(ctx: PlaceContext, out: MapWriter): void`. `PlaceContext` mirrors `tools/worldgen/model.py`: seed, name, biome, temperature, and the extras the world generator passes.
- **Per-stage fingerprints:** a 32-bit hash of each stage's output grid, compared stage by stage, so a mismatch names the stage.
- **The map:** `MapV1` from M0.4, filled here with real towns. Any new entity field is a version bump of the format, recorded in `sim-protocol`.

## Method and sources

- **Port rules, traps, goldens and timings:** [R9 report](../../../../research/round-9-maps-and-world-builder/report.md) and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md).
- **Generated towns over LDtk:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md), owner decisions: "Where towns come from" and "The first town".
- **Workplaces per sector:** [R6 resources notes](../../../../research/round-6-goods-and-wellbeing/notes/resources-production.md), the recommendation.
- **IntGrid values and the roof layer:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), the LDtk sections.
- **Reference code:** `tools/worldgen/place.py`, plus `rng.py` and `noise.py`, which M0.1 already ported.

## Tests for the exit checks

- `one map drives walkability and tiles`: for 100 seeds:
  - every walkable IntGrid cell has a ground tile;
  - every zone entity has a building footprint on the tile layer;
  - every door touches a walkable cell.
- `matches Python stage by stage`: per-stage fingerprints equal the Python goldens for 100 seeds in Node, and in Bun, Chromium, Firefox and WebKit through M0.6's engine harness.
- `tidying is order-free`: tidying a shore in reversed cell order gives the same grid.
- `roofs never follow wealth`: the roof choice key contains no occupant or price field. A test generates a town, permutes household wealth, and gets identical roofs.

## Risks and unknowns

- **Python changes ripple.** Removing the diagonal clause changes Python's outputs too. Regenerate the goldens and the mockups that depend on them in the same commit.
- **Map format growth:** capacity, owner and hours may need fields `MapV1` lacks. Version the format, and never reuse a field.
- **Generation time:** round 9 sets ≤ 100 ms for a standard world in desktop Chromium, an M8.1 check met before M1. A town is generated apart from the world, so measure the town stage alone here.

## Open questions

- **Owner:** Build the LDtk fallback town now, or only if the port slips? M3.4 already names it the fallback, and its auto-layer rules and roof layer go unused if the port lands. Suggested: only if the port slips. Needed before: the step plan.
- **Owner:** Should capacity, hours, owner and sector be added to `place.py`, or derived in a TypeScript-only export stage? `place.py` exports none of these fields, but M0.4's `tools/worldgen/export_map.py` already derives home capacity and shop hours in Python, so goldens can cover those two; owner and sector have no Python source yet. Suggested: port `export_map.py`'s capacity and hours rules with the golden-checked stages, and add owner and sector in a TypeScript stage after them, from building-kind tables, with "owner" a kind (household, firm or town) that M2.2's spawn fills in. Needed before: the step plan.
- **Measure:** How long does the town stage take in desktop Chromium and on a mid-range phone? Round 9's ≤ 100 ms covers a whole world in M8, so the town needs headroom. Suggested: track it in M0.6's bench, with no gate until M8. Needed before: launch.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the place stages' fingerprints in `goldens.py` first, then the port stage by stage in `place.py`'s order, each green before the next. The saddle keys and the diagonal-clause removal come as their own step, then the export and the exit check.
- **Reuse:** M0.1's ported draw and noise; M8.1's `packages/worldgen`, `goldens.py` and golden test across five engines; M0.4's `parseMap`, building-kind tables and Python `write_map`, the reference for a TypeScript writer; M0.5's manifest types; M0.6's generator lints and five-engine harness.
- **Keep it simple:** bump the map format once, with every new field together, rather than once per field.
- **Pitfalls:**
  - Beyond round 9's four traps, Python sets iterate in hash order, while a JavaScript `Set` keeps insertion order. Loop over sorted cells where order matters. JavaScript objects also order integer keys ascending, and a sort comparator must return a number.
  - Regenerated mockups live in `docs/`, so they need their own commit after the goldens, since code and docs never share a commit ([interfaces.md](../../m0-pipeline/interfaces.md)).
- **Hard and easy parts:** bit-equality stage by stage is the hard part. The export, the civic signals and the walkability check are mechanical.
