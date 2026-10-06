# World generator

Random worlds for Nomos, drawn with the sprites in `tools/sprites`. It is the Python reference for the sim's TypeScript world generator and a preview of how the art fits together.

- Make a new world: `python tools/worldgen/generate.py`. Every run draws a new seed and prints it with a summary.
- Rebuild a world: `python tools/worldgen/generate.py --seed 5eed0001`.
- Output goes to `dist/worldgen/<seed>/`:
  - `country.png`: the Country view, 8-px tiles;
  - `region.png`: the Region view around the capital, 16-px tiles;
  - the capital, the largest town and village, and every natural wonder's view;
  - `looks.png`: the world's first 48 people.
- Country maps only: `python tools/worldgen/world.py`. Hand-made test places: `python tools/worldgen/place.py --demo`.

## Randomness

- One 32-bit seed makes a whole world. A new game draws it from the OS. Saves and share links carry it, so any world can be replayed or shared.
- Every random value is `draw(seed, stream, *key)` (`rng.py`): the seed is hashed, then the stream and each key word are mixed in with lowbias32.
  - Draws keep no state, so they never depend on the order in which things are visited. A place rebuilds the same on every zoom.
  - Each purpose has its own stream, so adding draws to one stage never shifts another.
- Generation uses integers only, with no floats or trigonometry. Noise is value noise with 15-bit fractions (`noise.py`), and roots use `isqrt`. A TypeScript port using `Math.imul`, `>>> 0` and `>>` therefore makes identical worlds, and `world.fingerprint` checks this.

## Country (`world.py`)

1. **Shape** (`terrain.py`): a keyed template (continent, peninsula, coast, archipelago or twin isles), noise relief and keyed mountain chains. Sea level is cut to a keyed land share of 40–60%, and stray one-cell islands and ponds are tidied away.
2. **Drainage** (`drainage.py`):
   - Priority-flood from the sea fills pits, and deep ones become lakes.
   - Two erosion passes in stream-power style carve valleys.
   - Rivers of size 1–3 form where enough rain gathers.
3. **Climate** (`climate.py`):
   - Rain rides a keyed prevailing wind. It dries out crossing mountains, which leaves rain shadows, and picks up moisture again over water.
   - Temperature falls toward a keyed cold edge and with height.
4. **Biomes:** ocean, lake, peak, mountain, hills, sand (desert and beaches), marsh, conifer and deciduous forest, and grassland. Each coast is beach or cliffs.
5. **Settlements** (`settle.py`):
   - Habitability comes from land, water, slope and climate, and picks spaced sites.
   - Populations follow rank-size, giving tiers from capital to hamlet.
   - Farmland surrounds each settlement, wider for bigger ones.
   - Each settlement's draws key on its cell (`uid`), never on its population rank, so adding or removing a place re-rolls no other.
6. **Roads** (`roads.py`):
   - A spanning tree per landmass, plus shortcuts where the detour passes 1.5×.
   - Each road is routed by A* over the terrain, and reusing a road costs half, so routes merge into trunks.
   - Bridges go where roads cross rivers.
   - Sea lanes join the landmasses port to port: a spanning tree whose links are the closest pairs of ports.
7. **Natural wonders** (`features.py`):
   - 4–8 per world, each kind at most once, tried in a keyed order.
   - Each sits on the best site for its kind: a waterfall where a river drops, a dune deep in desert, a glacier on the coldest peak, a sea arch on a cliff coast, and so on.
   - Hot springs, a geyser and a caldera lake share one geothermal hotspot.
   - Wonders sit at least 8 cells apart. A kind with no fitting site is skipped, so a world without desert has no dune.
8. **Built landmarks:**
   - By tier and site, with keyed chances: a clock tower in every capital, lighthouses in coastal towns, windmills in farm villages, libraries in cities, terraces on hills.
   - Viaducts over steep river valleys and observatories on high ground near towns get map cells of their own.
9. **Place records:** each settlement and wonder gets its own seed and a context record (`model.PlaceContext`). The record holds the biome, climate, the sides facing the sea or fields, the coast type, the sides where rivers and roads arrive, its landmarks and its wonder.

## Places (`place.py`)

- `build(ctx)` lays out a district or a wonder view from the record, in this order:
  - ground by biome;
  - sea and rivers with autotiled shores;
  - roads and a plaza;
  - civic buildings by tier;
  - houses;
  - landmarks, and the wonder with viewpoints;
  - trees by climate;
  - fields and animals;
  - people.
- House styles are uniform draws, so no style reads as richer or poorer. Size follows density.
- Fields lean toward the sides that face farmland on the country map.
- Shore tidying judges every cell before flooding any, so the result never depends on the order cells are visited in. An editor that tidies only a stroke's cells gets the same map as a whole rebuild.
- `placedraw.render` draws the tiles, then the ground sprites, then everything standing sorted by anchor y.

## Looks (`looks.py`)

- A look is hue (6) × eye shape (4) × pattern (4), 96 looks in one byte per person: `draw(seed, LOOK, person id) % 96`.
- A look depends on nothing else: not parents, culture, place, job or wealth. It is never inherited and no sim rule reads it, so no look can mark a family, a group, a status or a mood.
- People draw in this order: body, pattern, face, job item. Only resting faces vary with eye shape; event faces are the same for everyone.
