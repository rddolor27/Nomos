# M6.1 Generated cities: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Cities grow from M3.1's place generator,** scaled up to 400²–1,024² tiles on its 64×64 district grid. There are no LDtk prefab blocks and no wave function collapse (R3, R9).
- **Districts are built lazily.** A district is generated when it first comes into view, or when the worker needs it, from (world seed, settlement cell, district index). Order of generation never changes the result.
- **A context record parameterises each city:**
  - tier and population;
  - route-entry bearings;
  - river, coast and biome;
  - port and crossroads;
  - no walls, which round 9 dropped.

  The seed is the world seed plus the settlement's stable cell id, never the generator version (R4, R9).
- **Generator versions are frozen at release:**
  - each released version keeps golden fingerprints for about 100 seeds;
  - old versions ship as lazy chunks, so old worlds still open;
  - "Rebuild on the latest generator" re-runs a world on the newest version and lists every conflict with its edits (R9).
- **A "New town" settings panel:** the seed with a re-roll, 3–5 presets, size tier, biome, river, coast and port (R9).

## Packages and files

- `packages/worldgen`:
  - `src/city/` holds the context record, lazy districts, and route entries and crossroads;
  - `src/versions.ts` holds the version registry, with each frozen version as a lazy `import()`.
- `packages/worldgen/test/goldens/v<N>.json`: fingerprints for about 100 seeds per released version, at about 363 B each (R9).
- `apps/web/src/new-town/`: the settings panel.
- CI: the city generator under Node, Bun, Deno and three browsers through M0.6's engine harness.

## Interfaces and data

- **`CityContext`:** `{ seed, cell, tier, population, entries: Int16Array /* bearings */, river, coast, biome, port, crossroads }`.
- **`generateDistrict(ctx: CityContext, version: number, dx: number, dy: number, out: MapWriter): void`**: pure and order-free.
- **Map hash:** a 32-bit hash over the canonical map bytes of all districts, in district order.

## Method and sources

- **Generated towns and cities, versions, goldens and rebuilds:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md) and [edits and saves notes](../../../../research/round-9-maps-and-world-builder/notes/edits-and-saves.md).
- **Stable settlement ids and context records:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md), Q3, and `tools/worldgen/model.py`'s `PlaceContext`.
- **No wave function collapse or prefabs:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), which drops the prefab blocks and WFC filler that the [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md) proposed.

## Tests for the exit checks

- `map hash identical across engines`: for a fixed seed, the city's map hash matches in Node, Bun, Deno, Chromium, Firefox and WebKit.
- `byte-identical maps for 100 context records`: 100 random context records give byte-identical maps across the same six engines.
- `lazy order does not matter`: generating districts in random order gives the same bytes as row order.
- `frozen versions still match`: every released version's goldens match after any later change.

## Risks and unknowns

- **Version chunks grow** with every release. Keep each frozen version's code minimal, and measure the lazy chunk sizes in M0.6's size gate.
- **Deno joins CI** for the first time in M2.2. Reuse that setup.
- **1,024² cities** stress memory: about 1 MB per byte-per-tile layer. Build districts lazily in the renderer too, never the whole city at once.

## Open questions

- **Owner:** When does the first generator version freeze: at M6.1, or at launch? Each frozen version ships forever as a lazy chunk of about 20 KB gzip (R9 edits and saves notes, source-size proxy). Suggested: build and test the freezing now, and freeze v1 at launch. Needed before: the step plan.
- **Owner:** Which 3–5 presets does the New town panel offer? They are the first towns most players see, and their names must pass the name lint. Suggested: river, coast with port, and crossroads, with generic names. Needed before: building.
- **Measure:** How long does one 64×64 district take to generate in the worker? Lazy districts must be ready before the camera reaches them. Suggested: measure it, then prefetch a ring of districts around the camera. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the context record and one byte-identical district in Node first. Then lazy districts in any order, the six-engine check, goldens and versions, and the panel last.
- **Reuse:** M3.1's place generator and its goldens against `tools/worldgen`, M0.6's engine harness, M2.2's Deno setup, and sim-core's integer noise and keyed draw.
- **Keep it simple:** a frozen version is a copy of the generator code it ran, loaded by lazy `import()`; shared code never branches on the version.
- **Pitfalls:** one `Math.sin` in a river curve can break the six-engine check, so use integer noise and build-time tables. A district never reads a neighbour's bytes; roads and rivers that cross edges come from the context record.
- **Hard and easy parts:** seams where roads and rivers cross district edges need the most care. The panel is routine.
