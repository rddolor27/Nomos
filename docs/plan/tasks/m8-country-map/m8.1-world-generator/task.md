# M8.1 World generator

Part of [M8 Country map](../milestone.md). It is built right after M0 and before M1, with M8.3, as the owner decided on 9 October 2026.

Needs: M0's keyed draw, integer noise and five-engine harness, M0.6's generator and name lints, M0.7's module layout, shared sound set, name filter and word-table script, and `tools/worldgen`. It no longer waits for M7, so M7 later runs on its worlds. It creates `packages/worldgen` and `tools/worldgen/goldens.py`, which M3.1 had planned to create.

- **Builds:**
  - a countries stage, in `tools/worldgen` first: 3–5 countries per world, picked by the seed; capitals taken from the largest settlements, spaced well apart; each country grown from its capital by multi-source Dijkstra over terrain costs, so its borders bend to mountains, lakes, rivers and coasts; every land cell and settlement in exactly one country; a map colour per country by keyed draw; borders and colours drawn in `generate.py`'s previews (Countries);
  - the terrain stage in the worker, ported from `tools/worldgen` in pipeline order: template and noise elevation, keyed mountain chains, priority-flood, flow accumulation, erosion-lite passes, climate, biomes and habitability, each stage proven against the Python golden fingerprints (R4, R9);
  - a snow biome for cold lowland, in `tools/worldgen` first, with its two map-scale snow tiles (R9);
  - settlements and routes on the grid: capitals, then towns, then villages, with minimum spacing and P₁/k rank-size populations; routes as a spanning tree per landmass plus spanner shortcuts (`tools/worldgen` skips round 4's Delaunay step), routed by A\* with slope, bridge and road-reuse costs; sea lanes between landmasses; regions and market territories grown by multi-source Dijkstra, with regions nested inside countries (R4, R9);
  - place seeds, landmark draws and names keyed on a stable settlement uid, its cell, never on population rank (R9);
  - names for places and countries from a place-name table, a second output that M8.1 adds to M0.7's word script, built from the one shared sound set, a single mixed style of Greek-like sounds and sounds from several other languages that no culture owns (owner, 9 October 2026), keeping only words that pass the full name filter: distinctive Pokémon town and species names and a profanity list, kept as a test fixture only, and the real-world list; names are keyed on the capital's or the settlement's cell, no name repeats within a world, country names never follow a culture's naming custom, site words such as "Ford" and "Port" stay separate, and this replaces round 4's seeded foswig chain on an original corpus with site suffixes (R4, R8, Countries);
  - 4–8 natural wonders per world by site rules, each kind at most once, with hot springs, geyser and caldera lake sharing one geothermal hotspot; built landmarks by tier and site, on the settlement or, for viaducts, observatories and lighthouses, on cells of their own (R9);
  - M7's and M8's settlement counts re-baselined to listed places plus a region tier, with Zipf fitted on true ranks (R9).
- **Verify first:** map-generation times in browser workers and on phones, which set the phone tier for the map. Day-step and spawn times follow in M7 and M9.
- **Exit checks:**
  - a standard 96×64 world generates in ≤ 100 ms and a large 192×128 world in ≤ 400 ms in desktop Chromium, with per-stage fingerprints matching the Python goldens in Node, Bun, Chromium, Firefox and WebKit (R4, R9);
  - over 100 seeds of each size, every world has 3–5 countries, every land cell and settlement belongs to exactly one, and each country holds at least 3 settlements (Countries);
  - the name filter passes 1,000 seeds: every place and country name passes, and none repeats within a world (R4, Countries).
