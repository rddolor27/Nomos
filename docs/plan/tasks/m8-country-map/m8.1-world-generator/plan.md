# M8.1 World generator: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands. It is built right after M0.7, before M1 (owner, 9 October 2026).

**Task:** [task.md](task.md)

## Approach

- **Finish the Python reference, then port it.** Two phases, with an owner review between them:
  1. **In `tools/worldgen`:** add the countries stage, the snow biome and the sea-cliff fix, and draw countries in the previews. The owner reviews about 10 large-world previews from `generate.py`. Then the generator freezes as version 1, and `goldens.py` writes its goldens.
  2. **In `packages/worldgen`:** port every stage in pipeline order. Commit each stage only when its golden fingerprints match Python in all five engines (R9).
- **The countries stage (Countries).** It runs after `settle` and before `farm`, because a capital's tier sets its farmland, its clock tower and the wonder spacing.
  - **Count:** K = 3 + `below(3, seed, COUNTRY, COUNT)`, so 3–5, on both world sizes. The map uses the large size.
  - **Capitals:** the largest settlement first, then each town or larger, in population order, at least D cells from every capital already chosen. D starts at isqrt(land cells ÷ K) and shrinks by a quarter until K fit, as `settle._sites` shrinks its spacing.
  - **Capital tier:** each capital takes the existing `capital` tier. Landmarks, fields, map icons and `place.py` already handle it, and `place.py` builds capitals and cities alike, so no new tier is needed.
  - **Growth:** one multi-source Dijkstra from the capitals over every cell, keyed by (cost, cell), so ties break exactly as Python's heap does.
    - A step costs 10 straight or 14 diagonal, scaled by `roads.py`'s terrain cover.
    - Entering a river cell adds a cost per river size.
    - Entering sea or lake costs far more than any land step, so a capital-less island joins the country that reaches it cheapest by sea.
    - Water cells keep no country. Every land cell gets exactly one, since the sea reaches every landmass.
    - All costs are integers, tuned on previews.
  - **Towns:** each settlement belongs to its cell's country.
  - **Colours:** a keyed shuffle of a fixed table of five colours gives each country a colour index. The generator stores only the index. One table of RGB values serves both `mapdraw.py` and `render-gl`, and M8.3's owner decision fills it.
- **What a probe found** (measured here: a scratch probe on the Python generator, 20 large worlds, seeds `5eed0001`–`5eed0014`, Python 3.14.6):
  - These rules make sizeable countries. The smallest held 8–22% of the land, and every country held at least 3 settlements in 20 of 20 worlds.
  - Rivers here are mostly short streams that run to the coast, and capitals sit on rivers, since river cells score highest for habitability. So rivers seldom lie between two capitals. Borders touched a river on 9.9% of their edges, against 7.7% of all land edges, even with near-impassable river costs.
  - Mountains and lakes shaped borders more visibly: mountain or peak cells lay on 3.7–4.0% of border edges, against 1.2% of all land edges.
  - So keep the costs simple, and judge borders by eye on the previews rather than chasing a border-on-river share.
- **Fingerprints.**
  - `world.fingerprint` feeds, after today's fields, the country count, each country's capital id and colour index, and the per-cell country column. Its value changes for every seed, since capitals re-tier settlements, so goldens and mockups regenerate together.
  - `goldens.py` (new) writes one fingerprint per stage for 100 seeds of each size, so a mismatch names its stage. Countries are a stage of their own. Golden fingerprints cost about 363 B per seed (R9).
- **Port the country stages to TypeScript, in pipeline order,** in `packages/worldgen`, which this sub-milestone creates. The generation runs in a worker (M8.3 starts it). Commit each stage only when its golden fingerprints match Python (R9):
  1. template and noise elevation;
  2. keyed mountain chains;
  3. priority-flood;
  4. flow accumulation;
  5. erosion-lite passes;
  6. climate;
  7. biomes and habitability, with the snow biome for cold lowland;
  8. settlements, then countries;
  9. farmland, roads, sea lanes, wonders and landmarks.
- **Round 9's four porting traps** apply throughout. M0.6's ban on bare `/` and `%` catches three once its generator glob covers `packages/worldgen`, and only the goldens catch `>>` for `>>>`:
  - a signed draw before `%`;
  - `>> 16` for `>>> 16`;
  - truncating division;
  - truncated `//` in the terrain and moisture terms.
- **Settlements and routes on the square grid (R4, R9):**
  - **settlements:** capitals, then towns, then villages, with minimum spacing and P₁/k rank-size populations;
  - **land routes:** a spanning tree per landmass plus spanner shortcuts, routed by A\* with slope, bridge and road-reuse costs;
  - **sea lanes** between landmasses;
  - **regions and market territories,** grown by multi-source Dijkstra. Regions grow inside each country, with the countries' growth function and a mask. Market territories ignore borders, since trade crosses them.

  `tools/worldgen` skips round 4's Delaunay step, so the port does too. Borders change no route, lane or territory cost, because countries are map facts only.
- **Stable identity (R9).** Place seeds, landmark draws and names key on the settlement's uid, which is its cell, never on population rank. A country's uid is its capital's cell.
- **Wonders and landmarks (R9):**
  - 4–8 natural wonders per world by site rules, each kind at most once;
  - hot springs, geyser and caldera lake share one geothermal hotspot;
  - built landmarks by tier and site, placed on the settlement, or on cells of their own for viaducts, observatories and lighthouses.
- **Names for places and countries (R4, R8, Countries).** `tools/worldgen` has no name scheme today: settlements are named `capital-0` or `town-12`. M0.7 builds what names need, and this adds only what places need.
  - **From M0.7, reused as is:** the one shared invented sound set, round 8's design H, in `tools/names/src/sound-set/`; the name filter `rejectName` and its fixtures; and `scripts/words.ts`, which keeps only words of 4–10 letters that pass the filter and writes them as a generated table, with `--check`.
  - **A place-name table of its own.** `words.ts` gains a second output: 1,024 place words on their own build seed, written to `packages/worldgen/src/names/words.ts`. Places then sound like the people but mostly use other words. The table sits in `worldgen` because the page may import `sim-culture`, which holds the person table, only in its inspector (M0.7).
  - **The trigram screen,** which M0.7 left to this brief: `tools/names` compares both tables with real name bases by trigram similarity. Below 0.26 passes, 0.26–0.40 goes to review and above 0.40 fails. Design H scored 0.209 in round 8 (measured there).
  - **Picking:** each name is a table index drawn on the world stream `NAME`, keyed on (seed, kind, uid, attempt). A repeat within the world takes the next attempt. Places are named in uid order, countries first, so a name depends only on the set of places, never on visiting order.
  - **Outside canonical state:** the map worker computes names for labels, and no sim rule reads a name. Python needs none, so names get goldens frozen per generator version.
  - **Why a table, not round 4's foswig chain:** the filter's fixtures stay test-only, so a name shown at run time must come from a list checked before release. A chain's outputs can't be listed; a table is the list.
  - **Country names never come from a culture.** They come from the place table, never from a culture's naming custom, so no country stands for a culture (Countries).
- **Re-baseline counts.** M7's and M8's settlement counts become listed places plus a region tier, with Zipf fitted on true ranks (R9). With the map first, this lands before M7's step plans are written.

## Packages and files

- `tools/worldgen`:
  - `countries.py` (new): capitals, growth and colour indices;
  - `world.py`, `settle.py` (capital tiers), `climate.py` (snow and the cliff fix), `mapdraw.py` (borders, colour bands and a flat `countries.png`) and `generate.py` (a summary line per country);
  - `rng.py`: append `COUNTRY` = 13 and `NAME` = 14, then rerun `vectors.py`, since `packages/sim-core/test/fixtures/kernels.json` records every world stream;
  - `goldens.py` (new): per-stage fingerprints, written to `packages/worldgen/test/fixtures/goldens-v1.json`.
- `tools/sprites/map.py`: `map8_snow` and `map16_snow`.
- `packages/worldgen` (`@nomos/worldgen`), new, in M0.7's layout of concern folders under `src/`:
  - pure TypeScript with no DOM, importing only `@nomos/sim-core/kernels`, under M0.6's generator lints, whose glob this sub-milestone extends to cover it;
  - `src/country/`: `template.ts`, `elevation.ts`, `chains.ts`, `flood.ts`, `flow.ts`, `erosion.ts`, `climate.ts`, `biomes.ts`, `settle.ts`, `countries.ts`, `grow.ts`, `routes.ts`, `regions.ts` and `features.ts`, one file per stage. `grow.ts` serves countries and regions. Python has no regions stage, so `regions.ts` gets goldens frozen per generator version;
  - `src/names/`: the picker, and the generated place table `words.ts`;
  - `test/country-goldens.test.ts`: runs in Node, and in Bun and three browsers through M0.6's engine harness.
- `tools/names`, from M0.7:
  - `scripts/words.ts`: a second output, the place table, on its own build seed;
  - the trigram screen against Fantasy Map Generator's 33 name bases (MIT), with its licence file, run on both tables.

## Interfaces and data

- **`generateWorld(seed: number, size: 'standard' | 'large'): WorldMap`.** M6.3, M8.6 and M8.7 add edit layers as stage inputs later. None exist before M1, so none are taken now.
- **`WorldMap`,** in `sim-protocol`, so `render-gl` reads it without importing `worldgen`:
  - per cell, row-major: `elevation`, `biome`, `river`, `receiver`, `coast`, `temperature`, `moisture`, `country` (0 for water, 1–K on land) and `region`, as typed arrays;
  - settlements in id order, as typed-array columns: `cell`, `tier`, `population`, `country` and up to three landmark kinds each;
  - roads and sea lanes as CSR paths (`offsets` and `cells`), and `bridges`;
  - wonders and own-cell landmarks as kind and cell columns;
  - countries as `capital` (a settlement id) and `colour` (an index).

  Every buffer is transferable. The step plan adds it to [interfaces.md](../../m0-pipeline/interfaces.md) as "The world map (owner: M8.1)".
- **`placeNames(map: WorldMap): string[]`:** country names, then settlement names in id order.
- **Settlement record,** for M6.1's `CityContext` and M7's store: `{ cell, tier, population, country, region, port, crossroads, landmarks }`.

## Method and sources

- **Layers, the square grid, identity across visits, porting traps and new tiles:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), part 1, and [R9 map pipeline notes](../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md).
- **Rank-size, spacing, routes and regions:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md) and [R4 economy and demography notes](../../../../research/round-4-multi-scale/notes/economy-demography.md), part 2.
- **The sound set, the filter and the screen:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, and M0.7's [brief](../../m0-pipeline/m0.7-modules-and-blob-facts/plan.md), "Names".
- **Countries:** the owner's decisions of 9 October 2026 ([M8 milestone](../milestone.md)).
- **Reference code:** `tools/worldgen/` (`world.py`, `terrain.py`, `drainage.py`, `climate.py`, `settle.py`, `roads.py` and `features.py`).

## Tests for the exit checks

- `generates within budget`: in desktop Chromium, a standard 96×64 world takes ≤ 100 ms and a large 192×128 world ≤ 400 ms, as the fastest of 9 samples.
- `fingerprints match Python`: per-stage fingerprints, countries included, match the goldens for 100 seeds in Node, Bun, Chromium, Firefox and WebKit.
- `countries cover the land`: over 100 seeds of each size, K is 3–5, every land cell has one country and water none, each settlement's country is its cell's, each country holds at least 3 settlements, and every capital is a town or larger.
- `names pass the filter`: every place-table word has 4–10 letters and passes `rejectName`, `words.ts --check` passes, both tables pass the trigram screen, and 1,000 seeds of each size name every place and country with no repeat within a world.
- `identity by cell`: changing a far settlement's population leaves every other place's seed, landmarks and name unchanged.
- `wonders by the rules`: over 1,000 seeds, every world has 4–8 wonders, no kind twice, and the geothermal three share one hotspot.

## Risks and unknowns

- **Verify first:** map-generation times in browser workers and on phones. They set the phone tier for the map.
- **The Python reference changes before the port starts.** Countries, snow and the cliff fix all change its outputs. Regenerate goldens and mockups together, and freeze version 1 only after the owner's preview review.
- **Sea cliffs form only on south coasts,** an open item since checkpoint 0001. Fix it in Python before freezing the goldens.
- **Island worlds may put every capital on one island,** and the others then join by sea. Previews of archipelago and twin-isles seeds decide whether capitals need a landmass rule.
- **A 1,024-word table repeats across worlds.** A large world names up to about 240 places and countries, so two worlds share about a quarter of their names (computed). Grow the table, or add a second word for the largest places, only if previews show it.

## Open questions

- **Measure:** Does a large 192×128 world fit 400 ms with A\* routes and two Dijkstra passes? R9 timed only terrain, at about 8 ms at 96×64. Its 21–87 ms standard-world estimate becomes 84–348 ms at four times the cells (computed). Suggested: time each stage in Chromium in the first week, since A\* grows faster than the cell count. Needed before: building.
- **Measure:** What are map-generation times in browser workers on phones? They set the map's phone tier. Suggested: one mid-range Android phone and one iPhone. Needed before: the step plan.
- **Design:** How many regions does each country hold? R4's max(4, settlements ÷ 40) gives 4–6 regions on a large world, about one per country (computed from R9's 182–237 places). Suggested: regions as the market areas of each country's towns, about 4–6 per country, settled with M7.3's region tier. Needed before: the step plan.
- **Owner review:** 10 large-world previews and a sample of 100 generated names, before version 1 freezes, as the owner listens to every new sound. Needed before: the freeze.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:**
  1. Python: the countries stage, its previews and fingerprint; snow and the cliff fix; the owner's review; the freeze and `goldens.py`.
  2. The place table and the screen in `tools/names`, which share no files with the port, so they can run in parallel.
  3. The port: the elevation stage and its golden test in all five engines, proving the harness, then each stage in pipeline order, settlements, countries and routes last, then regions and names.
- **Reuse:** `roads.COVER` for terrain costs, `grid.neighbours` for the fixed neighbour order, `rng.shuffled` for colours, M0.6's engine harness and lints, M0's keyed draw and integer noise.
- **Keep it simple:** port the Python line for line, and optimise only a stage that misses the budget. One growth function serves countries and regions.
- **Pitfalls:** A\* and Dijkstra must break ties exactly as the Python heap does, or routes, countries and regions drift from the goldens. Sort only with total orders, ties broken by cell index. Route lengths in kilometres use M7.1's cell scale.
- **Hard and easy parts:** routing, countries and regions need the most care, for speed and tie order; climate, biomes, colours and the wonder site rules are mechanical.
