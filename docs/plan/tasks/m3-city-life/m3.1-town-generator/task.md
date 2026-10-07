# M3.1 Town generator

Part of [M3 City life](../milestone.md).

The port needs M0.1's keyed draw and noise, M0.4's binary map format and M0.5's sprite manifest types, and passes M0.6's generator lints.

- **Builds:**
  - the two shore saddle keys (`1001`, `0110`) for both shores, 4 frames or 8 with variants, drawn before the port so the corner set is complete and tidying can drop its diagonal clause (R9);
  - the TypeScript port of `tools/worldgen/place.py`, with plan-then-apply shore tidying, 64×64 districts, frontage lot packing and entity export (R9);
  - IntGrid values for wall, water, road, sidewalk, grass and door, and entities for homes, shops, workplaces and the market with capacity, owner and opening hours, all exported by the generator into the binary map; the LDtk project, with its auto-layer rules and roof and treetop layer, is set up only for the fallback town (R3, R9);
  - workplace entities per sector (farm, pasture or dock, lumber camp, quarry, mine, fuel works, workshop) with worker capacity, from the generator rather than LDtk, while services use the clinic, school, shop and market; art exists; wire it in (R6, R9);
  - the civic signals: teal-and-cream shop awnings with a gold coin sign, and home roofs chosen at random, never by wealth; art exists; wire it in (R3).
- **Exit checks:**
  - one map, now the binary map rather than one LDtk file, drives both walkability and tiles: every walkable cell has a ground tile and every zone entity a building (R3, R9).
