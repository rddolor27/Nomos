# M6.1 Generated cities

Part of [M6 Scale and sharing](../milestone.md).

Needs M3's TypeScript port of `place.py`. The Python reference in `tools/worldgen` already builds each place from a context record, `model.PlaceContext`, seeded by the world seed and the place's cell.

- **Builds:**
  - cities of 400² to 1,024² tiles on the place generator's district grid, building 64×64 districts lazily as they come into view, with no LDtk prefab blocks or wave function collapse (R3, R9);
  - the city generator parameterised by a context record (tier, population, route-entry bearings, river, coast, biome, port and crossroads, without walls) and seeded by the world seed and the settlement's stable cell id, never by the generator version (R4, R9);
  - each released generator version frozen with golden fingerprints for about 100 seeds, old versions shipped as lazy chunks, and an explicit "Rebuild on the latest generator" that lists conflicts (R9);
  - a "New town" settings panel: seed with re-roll, 3–5 presets, size tier, biome, river, coast and port (R9).
- **Exit checks:**
  - a generated city's map hash is identical across engines for a given seed (R3); the city generator returns byte-identical maps in Node, Bun, Deno and three browsers for 100 random context records (R4).
