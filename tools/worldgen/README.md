# World generator

Random worlds for Nomos, drawn with the sprites in `tools/sprites`. It is the Python reference for the sim's TypeScript world generator and a preview of how the art fits together.

- Make a new world: `python tools/worldgen/generate.py`. Every run draws a new seed and prints it with a summary.
- Rebuild a world: `python tools/worldgen/generate.py --seed 5eed0001`.
- Make a large world, 192×128 cells instead of 96×64, as the explorable map uses: add `--size large`.
- Output goes to `dist/worldgen/<seed>/`, or `dist/worldgen/<seed>-large/` for a large world:
  - `country.png`: the Country view, 8-px tiles, with country borders;
  - `region.png`: the Region view around the largest capital, 16-px tiles;
  - `countries.png`: the flat Countries view, each country's land in its map colour. These previews and the app's map read the country colours from one table, `packages/render-gl/src/map/map-colours.json`;
  - the largest capital, the largest town and village, and every natural wonder's view;
  - `<capital>_seasons.png`: that capital in spring, summer, autumn and winter;
  - `looks.png`: the world's first 48 people.
- Country maps only: `python tools/worldgen/world.py`. Hand-made test places: `python tools/worldgen/place.py --demo`.
- Check the generator: `python tools/worldgen/test_worldgen.py`. Add `--seeds 100 --size large` to check 100 large worlds.
- Export the default town, Highcourt, as a binary map: `python tools/worldgen/export_map.py` writes `assets/maps/town.nmap` (seed `0xC0FFEE42`, 128×80 tiles) and refreshes `assets/LICENSES.md`. `--check` compares with the committed file and exits 1 on a difference.
- `mapfile.py` writes map v1, the format [`parseMap`](../../packages/sim-protocol/src/map/map.ts) reads, and raises `ValueError` on any map `parseMap` would reject. Run it to write the 3×2 test fixture `packages/sim-protocol/test/fixtures/tiny.nmap`; `--check` compares.

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
4. **Biomes:** ocean, lake, peak, mountain, hills, snow (lowland colder than 40), sand (desert and beaches), marsh, conifer and deciduous forest, and grassland. Each coast is beach or cliffs. Nobody settles snow or peaks.
5. **Settlements** (`settle.py`):
   - Habitability comes from land, water, slope and climate, and picks spaced sites.
   - Populations follow rank-size, giving tiers from capital to hamlet.
   - Farmland surrounds each settlement, wider for bigger ones.
   - Each settlement's draws key on its cell (`uid`), never on its population rank, so adding or removing a place re-rolls no other.
6. **Countries** (`countries.py`):
   - 3–5 per world, by a keyed draw. They are map facts only: no other stage reads them.
   - Capitals: the largest settlement, then each town or larger in population order, spaced at least isqrt(land ÷ countries) cells apart. The spacing shrinks by a quarter until all fit, and each capital takes the capital tier before farmland is laid out.
   - A capital whose country would hold fewer than 3 settlements is passed over for the next town in line, so every country holds at least 3.
   - One multi-source Dijkstra grows every country from its capital. Steps cost more through forest, hills and mountains, more again into rivers, and far more over sea and lakes. So borders bend to mountains, lakes, rivers and coasts, and an island without a capital joins the country with the cheapest crossing.
   - Ties break by (cost, cell), so a port draws the same borders. A diagonal step may not slip across a river or a one-cell strait.
   - Every land cell and settlement belongs to one country; water to none. Each country's map colour comes from a keyed shuffle of five provisional colours, until the owner picks the final five.
7. **Roads** (`roads.py`):
   - A spanning tree per landmass, plus shortcuts where the detour passes 1.5×.
   - Each road is routed by A* over the terrain, and reusing a road costs half, so routes merge into trunks.
   - Bridges go where roads cross rivers.
   - Each road is major or minor. On each landmass a spanning tree links the capitals, cities and towns, and the cheapest chain of roads between each linked pair is major.
   - Sea lanes join the landmasses port to port: a spanning tree whose links are the closest pairs of ports.
8. **Natural wonders** (`features.py`):
   - 4–8 per world, each kind at most once, tried in a keyed order.
   - Each sits on the best site for its kind: a waterfall where a river drops, a dune deep in desert, a glacier on the coldest peak, a sea arch on a cliff coast, and so on.
   - Hot springs, a geyser and a caldera lake share one geothermal hotspot.
   - Wonders sit at least 8 cells apart. A kind with no fitting site is skipped, so a world without desert has no dune.
9. **Built landmarks:**
   - By tier and site, with keyed chances: a clock tower in every capital, lighthouses in coastal towns, windmills in farm villages, libraries in cities, terraces on hills.
   - Viaducts over steep river valleys and observatories on high ground near towns get map cells of their own.
10. **Place records:** each settlement and wonder gets its own seed and a context record (`model.PlaceContext`). The record holds the biome, climate, the sides facing the sea or fields, the coast type, the sides where rivers and roads arrive, its landmarks and its wonder.

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
- A `placedraw.Season` redraws a place at another time of year from `assets/sprites/season_map.json`: palette and sprite swaps, and in winter snow on the ground, trees and roofs. Snow falls only where the place's temperature allows it.

## Looks (`looks.py`)

- A look is hue (6) × eye shape (4) × pattern (4), 96 looks in one byte per person: `draw(seed, LOOK, person id) % 96`.
- A look depends on nothing else: not parents, culture, place, job or wealth. It is never inherited and no sim rule reads it, so no look can mark a family, a group, a status or a mood.
- People draw in this order: body, pattern, face, job item. Only resting faces vary with eye shape; event faces are the same for everyone.
