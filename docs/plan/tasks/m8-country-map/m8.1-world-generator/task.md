# M8.1 World generator

Part of [M8 Country map](../milestone.md).

Needs: M0's keyed draw and integer noise, and M7's region tier and country CI suite.

- **Builds:**
  - the terrain stage in the worker, ported from `tools/worldgen` in pipeline order: template and noise elevation, keyed mountain chains, priority-flood, flow accumulation, erosion-lite passes, climate, biomes and habitability, each stage proven against the Python golden fingerprints (R4, R9);
  - a snow biome for cold lowland (R9);
  - settlements and routes on the grid: capitals, then towns, then villages, with minimum spacing and P₁/k rank-size populations; routes as a spanning tree per landmass plus spanner shortcuts (`tools/worldgen` skips round 4's Delaunay step), routed by A\* with slope, bridge and road-reuse costs; sea lanes between landmasses; regions and market territories grown by multi-source Dijkstra (R4, R9);
  - place seeds, landmark draws and names keyed on a stable settlement uid, its cell, never on population rank (R9);
  - 4–8 natural wonders per world by site rules, each kind at most once, with hot springs, geyser and caldera lake sharing one geothermal hotspot; built landmarks by tier and site, on the settlement or, for viaducts, observatories and lighthouses, on cells of their own (R9);
  - M7's and M8's settlement counts re-baselined to listed places plus a region tier, with Zipf fitted on true ranks (R9).
- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones, which set the phone tier for country mode.
- **Exit checks:**
  - a standard 96×64 world generates in ≤ 100 ms and a large 192×128 world in ≤ 400 ms in desktop Chromium, with per-stage fingerprints matching the Python goldens in Node, Bun, Chromium, Firefox and WebKit (R4, R9).
