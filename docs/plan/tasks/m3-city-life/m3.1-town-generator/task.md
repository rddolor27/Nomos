# M3.1 Town generator

Part of [M3 City life](../milestone.md).

The port needs M0.1's keyed draw and noise, M0.4's binary map format and M0.5's sprite manifest types, and passes M0.6's generator lints. M8.1, built before M1 (owner, 9 October 2026), already created `packages/worldgen`, extended the lint's glob to it and wrote `tools/worldgen/goldens.py`, so the place port joins its country stages there.

- **Builds:**
  - the two shore saddle keys (`1001`, `0110`) for both shores, 4 frames or 8 with variants, drawn before the port so the corner set is complete and tidying can drop its diagonal clause (R9);
  - the TypeScript port of `tools/worldgen/place.py`, with plan-then-apply shore tidying, 64×64 districts, frontage lot packing and entity export (R9);
  - IntGrid values for wall, water, road, sidewalk, grass and door, and entities for homes, shops, workplaces and the market with capacity, owner and opening hours, all exported by the generator into the binary map; the LDtk project, with its auto-layer rules and roof and treetop layer, is set up only for the fallback town (R3, R9);
  - workplace entities per sector (farm, pasture or dock, lumber camp, quarry, mine, fuel works, workshop) with worker capacity, from the generator rather than LDtk, while services use the clinic, school, shop and market; art exists; wire it in (R6, R9);
  - the civic signals: teal-and-cream shop awnings with a gold coin sign, and home roofs chosen at random, never by wealth; art exists; wire it in (R3).
- **Exit checks:**
  - one map, now the binary map rather than one LDtk file, drives both walkability and tiles: every walkable cell has a ground tile and every zone entity a building (R3, R9).
- **Part 2, added by the owner on 10 October 2026,** built before M1 and ahead of the export above:
  - **bigger places:** places at four times the area. A capital or city is 96×56 tiles, a town 80×48, a village 64×40 and a hamlet 40×24. The change lands in `place.py` first, then in the port;
  - **crowds that grow with population:** on desktop, about 150–300 people in a capital or city, 60–120 in a town, 25–50 in a village and 10–20 in a hamlet. Phones show fewer;
  - **the starting town:** Highcourt grows to the capital's new size and is re-exported as the binary map. Its blob counts per tier are re-checked against the tick budgets;
  - **town walls with gates** around capitals and cities, with a gate where each road enters, drawn look-only;
  - **more house styles and props.**
- **Owner decision first:** the town walls' look, from the asset-designer's mockups, before the full sprite set is drawn.
- **Owner decision first:** how many blobs the grown starting town holds on each device tier, within the tick budgets.
- **Exit checks for part 2:**
  - the per-stage goldens are regenerated, and the TypeScript port matches them;
  - the town view's frame time stays under 2 ms for the biggest capital, in both backends;
  - every crowd stays within its tier's range;
  - walls never cross a road except at a gate.
