# World maps: country generation, storage and country-to-street zoom for Dot Society

Status: October 2026. Scope: how to generate, store and present a country of villages, towns and cities with routes between them, plus the zoom from country to street, for a static-hosted, browser-only, seeded TypeScript simulation. The sim runs in a Web Worker and is drawn by a custom WebGL2 renderer with three skins (dots, blobs, GBA/DS-style 16×16 pixel art).

Source labels:
- **opened**: I read the file or page myself. Most of these are GitHub repositories cloned at the commits given below.
- **snippet only**: from a search-result summary. The host was blocked, so I could not open the page.
- **my measurement**: a local run of my scripts in `../prototypes/worldmaps`. Node v22.22.0 on a 4-vCPU Intel Xeon @ 2.80 GHz Linux container. Each configuration ran as a fresh process (cold JIT). I report the median of 3 runs unless stated.
- **background, unverified**: my prior knowledge, which I did not check against a source.

Commits opened:
- Azgaar FMG `b944003c14` (2026-10-03) and its wiki `73aca78fc7` (2026-09-30)
- redblobgames mapgen4 `c1d8cb018a` and mapgen2 `f16f485a62` (both 2026-03-29); dual-mesh `4a8504dbb1`
- watabou TownGeneratorOS `7fbc87a939` (2019-04-07)
- deepnight/ldtk `6d69bd1d6b` (2026-07-12; docs v1.5.3)
- pret/pokeemerald `731ad5bfd6` and pokefirered `037335f4c7`
- CleverRaven/Cataclysm-DDA `6c506a7544`
- OpenTTD `4b5f010b41`
- OpenVic-Simulation `dd311914fb`
- t-mw/citygen `aec49d2efa`
- probabletrain/MapGenerator `f487e4cee3`
- DFHack `c872dc4c64`
- Tw1ddle/markov-namegen-lib `e6c80568ad`; mrsharpoblunto/foswig.js `62ef9c625f`
- shorepine/kenney mirror `3694c6879e`

## Q1. Procedural country generation: deterministic from a seed and fast in a browser

### Takeaway
A mesh-based pipeline fits this project. Use about 10k–30k Voronoi/Delaunay cells for the whole country, stored as struct-of-typed-arrays in the worker. This is the same family as Azgaar's FMG (MIT) and Red Blob's mapgen2/mapgen4 (Apache-2.0).

The pipeline:
1. Noise or template elevation.
2. Priority-flood drainage, flow accumulation and a few stream-power passes ("erosion-lite").
3. Habitability score.
4. Score-sorted settlement placement with minimum (Poisson-style) spacing, and Zipf rank-size populations.
5. Route graph: Delaunay graph → MST plus spanner or Urquhart extra edges.
6. Each route drawn as an A*/Dijkstra path on the cell graph, with terrain costs and a road-reuse discount.
7. Regions from multi-source Dijkstra.

In my runs a 1,000-settlement country generated in about 0.6 s with 30k cells and about 1.4 s with 100k cells (cold Node 22). The stored result is tens of KB gzipped. All core JS libraries are ISC, MIT or Apache-2.0. Watabou's TownGeneratorOS is GPL-3.0 and MapGenerator is LGPL-3.0, so read them for ideas only.

### Cited Findings
**Reference implementations and their licences**
- **FMG licence and stack.** FMG is MIT ("Copyright 2017-2024 Max Haniyeu (Azgaar)"). The current package is v1.153.1, built with TypeScript and Vite. Runtime npm dependencies are alea, d3 v7, delaunator 5, polylabel, lineclip, three, quill and driver.js. Vendored browser bundles include flatqueue and simplify.js. — [FMG LICENSE](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/LICENSE) (opened); [FMG package.json](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/package.json) (opened); [FMG wiki: Dependencies](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Dependencies) (opened)
- **Rights to FMG maps.** "Maps you create are yours, for any purpose, commercial included, with no attribution required". Some bundled assets (fonts, icon sets, coat-of-arms artwork) carry their own licences. — [FMG wiki: Policy](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Policy) (opened)
- **FMG pipeline order.** FMG declares its generation sequence as a pipeline: grid → heightmap → markupGrid → depressionLakes → nearSeaLakes → mapSize → temperatures → precipitation → regraph (pack) → rivers → biomes → ice → goods → rankCells → cultures → burgs → states → routes → religions → burgsSpecify → provinces → riversSpecify → featureNames → markets → production → taxes → military → markers → zones → journeys. — [generation-pipeline.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/generation-pipeline.ts) (opened)
- **FMG cell counts.** The FMG "Points number" slider covers 1K–100K cells in 13 steps (1K, 2K, 5K, 10K, 20K … 100K) and defaults to 10K. Its tooltip says "Highly affects performance. 10K is the only recommended value". The readout turns red above 50K ("where performance starts to suffer"). — [graph-density.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/data/graph-density.ts) (opened); [options-tab.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/components/options/tabs/options-tab.ts) (opened)
- **FMG data model.** World data is typed arrays per cell:
  - `h`: Uint8 in [0,100], where 20 is the minimum land height
  - `s` (suitability): Uint16
  - `pop`: Float32
  - `burg`, `state`, `province`, `culture`: Uint16
  - `fl` (river flux): Uint16
  - `haven`: per coastal cell, used to build sea routes

  — [FMG data-model.md](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/docs/architecture/data-model.md) (opened)
- **FMG heightmaps.** Elevation comes from template "tools" applied in sequence: Hill, Pit, Range, Trough, Strait, Mask, Invert, Add, Multiply, Smooth. These are designer-controllable blob and ridge operations, not raw noise only. — [heightmap-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/heightmap-generator.ts) (opened)
- **FMG habitability score (`rankCells`).**
  - Start from the biome's habitability.
  - Add normalised river flux plus confluence × 250.
  - Subtract (h−50)/5, so lower ground is valued.
  - Coastal bonuses: estuary +15, ocean coast +5, safe harbour +20, freshwater lake +30, salt lake +10, frozen +1, dry −5, sinkhole −5, lava −30.
  - Divide by 5, then add a bonus for nearby "goods".
  - Rural population = suitability × cell area / mean area.

  — [population-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/population-generator.ts) (opened)
- **FMG settlement ("burg") placement.**
  - Capitals: populated cells are sorted by score × random(0.5–1.0). A capital is accepted only if no other capital lies within spacing = (width+height)/2/capitalsNumber, checked with a d3-quadtree. If placement fails, spacing is divided by 1.2 and the step retried.
  - Towns: spacing = (width+height)/150/(burgsNumber^0.7/66), with a per-candidate Gaussian jitter. Spacing halves if too few towns fit.
  - Population: cells.s/5, ×1.5 for capitals, × route connectivity, × Gaussian noise.

  — [burgs-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/burgs-generator.ts) (opened)
- **FMG routes.**
  - FMG builds an Urquhart graph: the Delaunay triangulation with the longest edge of each triangle removed ("code from https://observablehq.com/@mbostock/urquhart-graph").
  - It does this separately for capitals (main roads), all burgs (trails) and ports (sea routes), per landmass.
  - Each graph edge is routed by `findPath` on the cell graph. This is Dijkstra with a FlatQueue and early exit, not A*.
  - Land step cost = distance² × habitability modifier [1–1.1] × height modifier [1–3] × 0.5 if the step reuses an existing route connection × 3 if the next cell has no burg. Water and uninhabitable cells are impassable.
  - Sea cost multipliers by depth class: coastline 1, sea 1.8, open sea 4, ocean 6, far ocean 8. Water colder than −4 °C is impassable.

  — [routes-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/routes-generator.ts) (opened); [pathUtils.ts findPath](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/utils/pathUtils.ts) (opened)
- **FMG economy layer.**
  - Market centres are burgs scored by population (capitals ×2.5, ports ×1.2, plus noise) and accepted with a quadtree minimum spacing.
  - Market territories are then expanded across cells.
  - `Deal` records hold {seller, buyer, good, units, price, tax}.
  - Price floor and ceiling factors are 0.1 and 5.0.

  — [markets-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/markets-generator.ts) (opened)
- **FMG Transform and Submap tools.** These rebuild the map, or a part of it, at a different points number and try to keep the details. This is a precedent for regenerating a region at higher mesh density when zoomed. — [FMG wiki: Knowledge Base](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base) (opened)
- **mapgen4 design and licence.** Its README says mapgen4 is "designed to run fast enough to regenerate in real time as you paint terrain". "The underlying code can support 1 million+ Voronoi cells (change spacing in config.js to 0.7) … but the rendering code and other parameters are designed to look prettiest around 25k cells". Calculations run in `worker.ts`. Mapgen4 and its helper libraries (dual-mesh, prng) are Apache v2, "including commercial projects". It uses Delaunator (ISC) and fast-2d-poisson-disk-sampling (MIT); package.json adds flatqueue, gl-matrix and simplex-noise ^4. Towns, roads, names and nations are left "for a future project". — [mapgen4 README.org](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/README.org) (opened); [mapgen4 package.json](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/package.json) (opened)
- **mapgen4 points and rivers.**
  - Default `spacing` is 5.5 and `mountainSpacing` is 35.
  - Boundary and Poisson-disc points are precomputed offline and saved as quantised Uint16 pairs (`build/points-5.5.data`).
  - Rivers come from `assignDownslope`, a FlatQueue priority queue "starting with the ocean triangles and moving upwards using elevation as the priority". This is effectively priority-flood.

  — [config.js](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/config.js) (opened); [generate-points-file.ts](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/generate-points-file.ts) and [serialize-points.ts](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/serialize-points.ts) (opened); [map.ts](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/map.ts) (opened)
- **mapgen2.** An Apache-2.0 JavaScript port of the 2010 polygon map generator. Steps: choose points (jittered grid or Poisson) → add boundary points → Delaunator → dual-mesh with "ghost" elements → `WorldMap` assigns elevation, rivers and biomes. It uses struct-of-arrays and coordinates 0–1000. dual-mesh (Apache-2.0) is the 2017 library, which the author replaced in 2023. — [mapgen2 README.org](https://github.com/redblobgames/mapgen2/blob/f16f485a62/README.org) (opened); [dual-mesh README.org](https://github.com/redblobgames/dual-mesh/blob/4a8504dbb1/README.org) (opened)
- **Watabou TownGeneratorOS.**
  - GPL-3.0, Haxe/OpenFL. It is the old source of the Medieval Fantasy City Generator and "lacks some of the latest features, namely waterbodies, options UI".
  - The model builds Voronoi "patches" from nPatches×8 spiral points (15 patches by default) and relaxes them. Then it runs optimizeJunctions → buildWalls → buildStreets → createWards → buildGeometry.
  - Ward types: Castle, Cathedral, Market, Craftsmen, Merchant, Military, Patriciate, Slum, Farm, Park, Gate, Administration.

  — [TownGeneratorOS README](https://github.com/watabou/TownGeneratorOS/blob/7fbc87a939/README.md) and [Model.hx](https://github.com/watabou/TownGeneratorOS/blob/7fbc87a939/Source/com/watabou/towngenerator/building/Model.hx) (opened)
- **Watabou's newer generators.** The current City Generator, Village Generator and Dwellings are hosted on watabou.github.io and itch.io, which are blocked here. The itch.io page says images can be used "as you like, including for commercial RPG adventures", that attribution is appreciated but not required, and that the author disapproves of selling generated maps. — [Village Generator on itch.io](https://watabou.itch.io/village-generator) (snippet only); [Watabou FAQ](https://watabou.github.io/faq.html) (snippet only)
- **City-street generators.**
  - t-mw/citygen is MIT, TypeScript/Vite. It implements a Parish–Müller-style road growth with a `localConstraints()` step. — [citygen LICENSE/README](https://github.com/t-mw/citygen/blob/aec49d2efa/README.md) and [generate.ts](https://github.com/t-mw/citygen/blob/aec49d2efa/src/city-gen/generate.ts) (opened)
  - probabletrain/MapGenerator ("Create procedural American-style cities") is LGPL-3.0-only. — [MapGenerator README](https://github.com/probabletrain/MapGenerator/blob/f487e4cee3/README.md) (opened)
- **Parish & Müller (2001).** Their "Procedural Modeling of Cities" extends L-systems with global goals and local constraints, grows roads from terrain and population maps, and supports loops and intersections. — [Parish & Müller PDF](https://people.eecs.berkeley.edu/~sequin/CS285/PAPERS/Parish_Muller01.pdf) (snippet only; host blocked)
- **Galin et al. (2010).** "Procedural Generation of Roads" exists as a PDF, but I could not open it. Its terrain-cost shortest-path method (slope, rivers, bridges) is background, unverified. — [Galin et al. 2010](https://perso.liris.cnrs.fr/egalin/Articles/2010-roads.pdf) (snippet only)

**Library versions and licences (npm registry, opened 2026-10-05)**

| Package | Version | Licence | Published |
|---|---|---|---|
| delaunator | 5.1.0 | ISC | 2026-03-23 |
| d3-delaunay | 6.0.4 | ISC (depends on delaunator 5) | 2023 |
| simplex-noise | 4.0.3 | MIT | |
| open-simplex-noise | 3.0.0 | Unlicense | |
| fast-simplex-noise | 4.0.0 | Unlicense | |
| poisson-disk-sampling | 2.3.1 | MIT | |
| fast-2d-poisson-disk-sampling | 1.0.3 | MIT | |
| flatqueue | 3.1.0 | ISC | |
| tinyqueue | 3.0.0 | ISC | |
| alea | 1.0.1 | MIT | |
| pure-rand | 8.4.2 | MIT | |
| seedrandom | 3.0.5 | MIT | 2019 |
| flatbush | 4.6.2 | ISC | |
| kdbush | 4.1.0 | ISC | |
| d3-quadtree | 3.0.1 | ISC | |
| d3-contour | 4.0.2 | ISC | |
| simplify-js | 1.2.4 | BSD-2-Clause | |
| polylabel | 2.1.0 | ISC | |
| polygon-clipping | 0.15.7 | MIT | |
| earcut | 3.2.4 | ISC | |
| fflate | 0.8.3 | MIT | |
| @msgpack/msgpack | 3.1.3 | ISC | |
| foswig | 3.0.1 | MIT | |
| ngraph.path | 1.6.1 | MIT | |
| easystarjs | 0.4.4 | MIT | |
| ldtk (importer) | 0.8.7 | MIT | last published 2021-01-28 |
| pathfinding | 0.4.18 | no licence field | |

— [registry.npmjs.org (e.g. /delaunator)](https://registry.npmjs.org/delaunator) (opened); [delaunator LICENSE](https://github.com/mapbox/delaunator/blob/main/LICENSE) (opened); [d3-delaunay LICENSE](https://github.com/d3/d3-delaunay/blob/main/LICENSE) (opened); [simplex-noise LICENSE](https://github.com/jwagner/simplex-noise.js/blob/main/LICENSE) (opened)

**Determinism across browsers**
- **ECMAScript Math functions.** The spec says the behaviour of `acos, acosh, asin, asinh, atan, atanh, atan2, cbrt, cos, cosh, exp, expm1, hypot, log, log1p, log2, log10, pow, random, sin, sinh, tan, tanh` "is not precisely specified". fdlibm is recommended but not required. `Math.sqrt` is not in this list. — [ecma262 spec.html, "Function Properties of the Math Object"](https://github.com/tc39/ecma262/blob/main/spec.html) (opened)
- **Poisson-disc sampling.** fast-2d-poisson-disk-sampling places candidates with `Math.cos(currentAngle)` and `Math.sin(currentAngle)`, at lines 190–191 of `src/fast-poisson-disk-sampling.js`. It accepts an injectable RNG. Delaunator uses arithmetic and only exactly specified Math functions (`abs`, `ceil`, `floor`, `max`, `sqrt`), plus the constant `Math.pow(2,-52)`. — [fast-2d-poisson-disk-sampling source](https://github.com/kchapelier/fast-2d-poisson-disk-sampling/blob/master/src/fast-poisson-disk-sampling.js) (opened via npm 1.0.3 tarball); [delaunator index.js](https://github.com/mapbox/delaunator/blob/main/index.js) (opened via npm 5.1.0 tarball)

**Settlement-size and spacing theory**
- **Zipf's law.** The rank-size rule: city sizes follow G(S)=a/S^ζ with ζ≈1, so the 2nd city is about ½ the 1st and the 3rd about ⅓. Gabaix estimates ζ = 1.005 for the 135 largest US metro areas (1991) and explains it by Gibrat-type growth. — [Gabaix, "Zipf's Law for Cities: An Explanation"](https://xgabaix.scholars.harvard.edu/sites/g/files/omnuum7761/files/xgabaix/files/zipfs_law.pdf) (snippet only)
- **Christaller's central place theory (1933).** Settlements of the same order are spaced on a triangular/hexagonal lattice, and larger centres are farther apart. There are marketing (K=3), transport (K=4) and administrative (K=7) principles. — [Central place theory (Wikipedia)](https://en.wikipedia.org/wiki/Central_place_theory) (snippet only); [PSU Christaller model](https://www.e-education.psu.edu/geog597i_02/node/680) (snippet only)

**My measurements (bench/country.mjs)**

Pipeline:
1. Alea-seeded jittered grid (or Poisson).
2. Delaunator plus CSR adjacency.
3. 6-octave simplex fBm with a continental falloff.
4. 4 passes of priority-flood (FlatQueue) and flow accumulation, three of them with stream-power incision ("erosion-lite").
5. River threshold.
6. Habitability (FMG-like).
7. Score-sorted greedy placement with a grid-hash minimum spacing, and rank-size populations P_k = 250,000 × k^-1.05 × noise.
8. Settlement Delaunay → Kruskal MST → greedy-spanner extra edges (added when current graph distance exceeds 1.6× straight distance).
9. A* on the mesh: cost = distance × (1 + 25·|Δh| + highland penalty) × 3 for river entry, × 0.5 for reusing a road; edges processed in order of population product / distance².
10. Multi-source Dijkstra regions.
11. foswig names.

| Cells | Settlements | Total gen (ms) | Delaunay + adjacency | Flood/flow/erosion | A* roads | Regions | Road edges (MST) | Paths found | Road cells |
|---|---|---|---|---|---|---|---|---|---|
| 10,000 | 100 | 216 | 64 | 31 | 42 | 20 | 177 (99) | 168 | 1,178 |
| 10,000 | 300 | 227 | 53 | 29 | 60 | 21 | 576 (299) | 566 | 2,058 |
| 29,929 | 300 | 510 | 145 | 65 | 152 | 30 | 564 (299) | 538 | 3,651 |
| 29,929 | 1,000 | 587 | 116 | 66 | 210 | 56 | 1,990 (999) | 1,947 | 6,575 |
| 99,856 | 300 | 1,072 | 245 | 200 | 296 | 62 | 551 (299) | 536 | 6,507 |
| 99,856 | 1,000 | 1,366 | 218 | 220 | 517 | 65 | 1,991 (999) | 1,968 | 12,043 |

(my measurement, [country.mjs](../prototypes/worldmaps/country.mjs); raw rows in runs_jitter.jsonl)

- **Points.** Poisson-disc points instead of the jittered grid cost 48.5 ms vs about 8–10 ms at 10k cells, and 133 ms vs 20 ms at 30k cells (my measurement).
- **Delaunator alone.** On uniform random points: 10k in 11 ms warm (37 ms cold); 100k in about 120 ms (99 ms cold); 1M in about 1.7 s (my measurement, [delbench.mjs](../prototypes/worldmaps/delbench.mjs)).
- **Repeatability.** All 3 runs of every configuration produced identical fingerprints (elevation, roads and names hashed) on the same engine (my measurement).
- **Rank-size output for 1,000 settlements** (≥50k = city, ≥5k = town, ≥500 = village): 4–5 cities, 35–39 towns, about 325 villages, about 630 hamlets. For 100 settlements: 4 cities, 35 towns, 61 villages (my measurement).
- **Edge counts.** The spanner gives about 2 route edges per settlement (1,990 for 1,000). About 1–5 % of edges found no land path (from 23 of 1,991 to 9 of 177); these cross water and would become sea or ferry links (my measurement).
- **Sizes (gzip level 9; raw/gz in bytes)** (my measurement):

| Item | 10k cells, 300 settlements | 30k cells, 1,000 settlements | 100k cells, 1,000 settlements |
|---|---|---|---|
| Settlement table JSON | 29,636 / 7,435 | 99,620 / 24,310 | 99,885 / 24,497 |
| Route graph edges JSON | 7,081 / 2,916 | 25,433 / 10,221 | 25,431 / 10,251 |
| Road cell paths, JSON | 24,249 / 8,402 | 78,682 / 30,176 | 155,011 / 57,788 |
| Road cell paths, delta+varint | 8,327 / 3,810 | 25,527 / 11,652 | 46,425 / 16,475 |
| Per-cell binary incl. quantised XY (9 B/cell) | 90,000 / ~69,000 | 269,361 / 206,654 | 898,704 / 663,499 |
| Columnar per-cell without XY (elevation u8 + flags + region u16) | | 119,716 / 31,266 | |

The XY noise in the per-cell binary barely compresses, which is why the columnar layout without XY is so much smaller.
- **Visual check.** A 512² render of the 30k-cell, 1,000-settlement country showed a plausible continent with lakes, highlands, rivers and a dense road web (my measurement, overview512.png in the scratchpad worldmaps/bench folder).

### Inferences
**Recommended worker-side pipeline**
- **Seeding.** Derive a sub-seed per stage by string hash (e.g. `${worldSeed}/terrain`, `${worldSeed}/settlements`) so one stage's RNG use does not reshuffle the others. Use integer or arithmetic PRNGs only (sfc32, Alea).
- **Points.** Jittered grid, which uses no trigonometry. Use 10k cells for ≤300 settlements and 20k–30k for 1,000. At 10k cells and 1,000 settlements there are only about 5.7 land cells per settlement (my run), too coarse for distinct roads. For a blue-noise look without runtime trigonometry, ship precomputed Poisson points as quantised Uint16, as mapgen4 does (about 120 KB raw for 30k points).
- **Elevation.** Combine FMG-style template operations (hills, ranges, troughs, masks), which give art direction ("a central mountain chain, a bay in the south-east"), with simplex fBm for detail and a continental falloff.
- **Hydrology ("erosion-lite").**
  - Priority-flood gives depression filling, lakes and receivers in one pass, as in mapgen4's `assignDownslope`.
  - Then flow accumulation, then 2–3 stream-power incision passes, then rivers where flux exceeds a threshold.
  - This is about 30–70 ms at 10–30k cells.
- **Habitability.** Use FMG-like terms: biome base + river and confluence bonus + harbour/coast/lake bonus − elevation − slope.
- **Settlements.**
  - Place capitals first with wide spacing, then towns, then villages, as FMG does and as Christaller's hierarchy suggests.
  - Assign Zipf ranks by score, so the largest cities land at estuaries and confluences.
  - Use q=1 exactly so that P_k = P₁/k (plain division, deterministic). Otherwise use a lookup table instead of `Math.pow`.
- **Route graph.**
  - Build the Delaunay triangulation of the settlements → MST, which guarantees connectivity → extra edges from the Urquhart graph (FMG) or a greedy t-spanner (detour 1.5–1.8).
  - Label tiers by endpoint ranks: highway (capital–capital), road, track.
  - Route the edges in descending importance with A* on the cell graph. Make the step cost depend on slope, river crossings (a bridge penalty) and water (impassable), with a 0.5× discount on existing road cells so roads merge into trunks (FMG's `connectionModifier`).
  - Edges with no land path become sea lanes, using FMG's depth cost classes.
- **Regions and markets.** Multi-source Dijkstra from capitals with terrain cost gives provinces and borders. FMG-style market centres with territory flood-fill give price regions, which suits the sim's market economy.
- **Time budget.** About 0.25 s (10k cells, 300 settlements) to about 0.6 s (30k cells, 1,000 settlements) at "new game" in the worker. Show a progress bar and cache the result.

**Determinism**
- Anything that must regenerate bit-identically on another browser (settlement interiors, re-derivation from a seed) must avoid `Math.sin/cos/exp/pow/hypot/atan2`. Use +, −, ×, ÷, `Math.sqrt`, integer RNG and table-driven noise.
- Simpler alternative: generate the country once, persist the arrays in the save, and treat the seed as provenance only.
- My benchmark still used `Math.pow` (rank-size) and `Math.hypot` (edge lengths). Both are easy to replace.

**What to store and what to reuse**
- **Storage.** Keep geometry implicit: store seed + parameters + edits. If you cache derived data, store columnar quantised arrays without coordinates (about 31 KB gz for 30k cells), not per-cell records.
- **Licensing.**
  - Can be copied with notices: FMG code and ideas (MIT), mapgen2/mapgen4 (Apache-2.0, which requires NOTICE handling), Delaunator, d3-delaunay, simplex-noise and the other libraries above (ISC/MIT).
  - Re-implement from the idea only, without copying code into a non-GPL project: TownGeneratorOS (GPL-3.0) and MapGenerator (LGPL-3.0).
- **Hybrid authoring path.** FMG exports JSON (full, minimal, pack cells, grid cells) and GeoJSON (cells, routes, rivers, markers, zones) ([FMG Knowledge Base](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base), opened). A designer could sculpt a showcase country in FMG and convert it at build time into the sim's binary format, since maps are free for any use.

### Gaps
- No in-browser timings (Chrome, Firefox, Safari). Node/V8 cold runs are a proxy; JavaScriptCore (Safari) may differ.
- FMG's own generation time is unmeasured: it needs a DOM, and I found no published figure.
- Red Blob's articles and blog posts (redblobgames.com, simblob.blogspot.com) were blocked. Only READMEs and code were opened.
- The licence of Watabou's newer generators and of their source is snippet-only. I found no public source for them.
- The Galin et al. and Parish & Müller PDFs were not opened.

## Q2. Hand-authored versus procedural: can LDtk hold a country, and when to hand-make

### Takeaway
LDtk's world layouts (Free, GridVania, Linear) with `__neighbours`, separate level files and the multi-worlds option can hold a small linked region: a Pokémon-sized region of about 15–20 towns and cities plus routes. But:
- The level form clamps each level to ≤4,096 px per side, which is 256×256 tiles at 16 px. That is exactly the project's current city size.
- LDtk has no level-of-detail or procedural layer.
- A whole Pokémon overworld (Emerald) is only about 126k tiles, about two of the project's 256² cities.

Hand-make small, curated regions and hero settlements. Generate countries of 100–1,000 settlements. Use LDtk as the prefab and village-kit library feeding the generator.

### Cited Findings
- **World layouts.** LDtk JSON v1.5.3: `worldLayout` is one of `Free`, `GridVania`, `LinearHorizontal`, `LinearVertical`. `worldGridWidth/Height` apply only to GridVania. Levels carry `worldX/worldY` in pixels and `worldDepth`. `__neighbours` lists touching levels with `dir` n/s/w/e; corners ne/nw/se/sw were added in 1.5.3, and `<`/`>` for depth neighbours in 1.4.0. — [LDtk JSON_DOC.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/JSON_DOC.md) (opened)
- **Multi-worlds.** "in current version, a LDtk project file can only contain a single world with multiple levels in it". The `worlds` array stays empty unless the "Multi-Worlds" advanced project option is enabled; that option moves `levels` and the layout settings into `worlds`. — [LDtk JSON_DOC.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/JSON_DOC.md) (opened)
- **Separate level files** (`externalLevels`, since 0.7.0). Each level is saved as its own `.ldtkl` file, and the project JSON keeps the levels with `layerInstances` set to null plus an `externalRelPath`. The changelog calls this "A much needed feature to reduce JSON size and optimize parsing times". — [JSON_DOC.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/JSON_DOC.md) (opened); [CHANGELOG.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/CHANGELOG.md) (opened)
- **Table of contents and image export.**
  - `toc` (since 1.2.4) lists all instances of entities flagged `exportToToc` at project level; fields can also be exported to it since 1.5.0.
  - `imageExportMode` can be `None`, `OneImagePerLayer`, `OneImagePerLevel` or `LayersAndLevels`, which gives pre-rendered PNGs per level.

  — [JSON_DOC.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/JSON_DOC.md) (opened)
- **Size limits.**
  - The level properties form clamps width and height with `i.setBounds(project.defaultGridSize, 4096)`.
  - The world panel allows a default new-level size up to 9,999 px.
  - Layer grid size is capped by `Const.MAX_GRID_SIZE = 1024`.

  — [LevelInstanceForm.hx](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/src/electron.renderer/ui/LevelInstanceForm.hx) (opened, lines ~223–236); [WorldPanel.hx](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/src/electron.renderer/ui/modal/panel/WorldPanel.hx) (opened); [Const.hx](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/src/electron.renderer/Const.hx) (opened)
- **Changelog history.**
  - 0.6.0 introduced the world map, with levels arranged "freely on a vast 2D map, in a large grid system (aka 'grid-vania'), horizontally, vertically".
  - The 0.1.5-alpha entry said "it's still recommended to work on levels with smaller dimensions" (an old version).
  - The 1.5.0 entry reports that "large projects loading time should be significantly faster, especially if your project contained large levels".

  — [CHANGELOG.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/CHANGELOG.md) (opened)
- **LDtk licence.** LDtk is MIT ("Copyright (c) 2020, Sébastien Benard - Deepnight Games"). — [LDtk LICENSE](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/LICENSE) (opened)
- **Pokémon map sizes, pret data, numbers only.**
  - Emerald towns are 20×20 tiles; Pacifidlog is 20×40.
  - Emerald cities: Petalburg 30×30, Mauville and Fortree 40×20, Rustboro and Slateport 40×60, Sootopolis 60×60, Lilycove and Mossdeep 80×40, Ever Grande 40×80.
  - Emerald routes run from 20×20 (Route 101) to 140×20 (Route 123) and 80×80 (Routes 124, 126, 127), with a median area of 3,200 tiles.
  - FireRed towns are 24×20; cities range from 48×40 to 66×55 (Saffron); route median is 1,440 tiles.

  — [pokeemerald layouts.json](https://github.com/pret/pokeemerald/blob/731ad5bfd6/data/layouts/layouts.json) (opened, my tally); [pokefirered layouts.json](https://github.com/pret/pokefirered/blob/037335f4c7/data/layouts/layouts.json) (opened, my tally)
- **Pokémon overworld structure.** Emerald's outdoor overworld is 50 maps (towns, cities, numbered routes), linked by 119 edge "connections" (with offsets) plus 181 warps. Their total area is 126,180 tiles, about a 355×355-tile square. Littleroot has a single connection ("up" to Route 101). — [pokeemerald data/maps/*/map.json](https://github.com/pret/pokeemerald/tree/731ad5bfd6/data/maps) (opened, my tally)
- **Hoenn and Kyushu.** Hoenn was based on Kyushu rotated 90°, reportedly for the GBA's horizontal screen. — [Bulbapedia: Hoenn](https://bulbapedia.bulbagarden.net/wiki/Hoenn) (snippet only)
- **Cataclysm: DDA precedent.**
  - The overmap is 180×180 overmap terrains (with 21 z-levels). One overmap terrain = 2×2 submaps, and a submap = 12×12 map squares, so one overmap tile is 24×24 squares. "Large-scale mapgen (e.g. city layout) happens one overmap at a time."
  - The overmap knows "where the cities are, where the roads are, where the buildings are, what types the buildings are" but not "what the actual road terrain looks like … building layout … items". Those are filled in as the player explores.
  - The licence is CC BY-SA 3.0.

  — [CDDA OVERMAP.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/doc/JSON/OVERMAP.md) (opened); [POINTS_COORDINATES.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/doc/c++/POINTS_COORDINATES.md) (opened); [CDDA LICENSE.txt](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/LICENSE.txt) (opened)

### Inferences
- **Hand-make** when the region is small and curated: ≤10–20 settlements for a tutorial, a story scenario or a teaching "model country", where every town should be legible and memorable, as in Pokémon. The effort scales with tile area. All of Hoenn's outdoor tiles (126k) equal about 1.9 of the planned 256×256 cities.
- **Generate** for 100–1,000 settlements, replayability and seeded experiments (comparing policing policies across many countries).
- **Hybrid.** Generate the country, then pin a few hand-authored "hero" settlements (capital, tutorial village) to generated sites with matching parameters such as coast, river and entry directions.
- **Keep the country out of LDtk.**
  - Hundreds of levels of up to 4,096 px is an editor-scale burden, and LDtk has no LOD.
  - The country belongs in the sim's typed arrays. Use LDtk for:
    - prefab blocks (each a level in a Free-layout "prefab library" project, tagged by enums or fields for zone, size, door positions and road connectors)
    - village kits
    - hero settlements
  - Enable separate level files so the runtime lazy-loads only the prefabs a settlement uses, and use `toc` for indexing.
- **The 4,096 px cap.** A generated 256×256 city already sits at LDtk's per-level limit. Anything larger, or any authored city to be edited in LDtk, must be split across several levels or chunks.
- **If a hand-made region is wanted,** mirror Pokémon's structure: town levels plus separate route levels, linked through `__neighbours` (GridVania or Free). Routes then become places (see Q5).

### Gaps
- No measurements or reports of LDtk editor or runtime performance with hundreds or thousands of levels. ldtk.io and the GitHub issue pages (e.g. the multi-worlds issue #231) were blocked; only repository files opened.
- I did not check whether levels resized by dragging in world view can exceed 4,096 px. The JSON format itself shows no level-count limit.

## Q3. Settlement interiors at different sizes, generated on demand from a seed

### Takeaway
Generate each street map lazily when the viewer zooms in. Inputs: a per-settlement seed (worldSeed, settlementId, generatorVersion) plus country-level context (tier and population, bearings of incoming roads, river, coast and sea direction, biome, wealth). This mirrors how FMG hands seeds and parameters to Watabou's city and village generators, and how Cataclysm: DDA and Dwarf Fortress defer local detail.

A tile-grid generator (entry roads by A*, BSP blocks with 2-tile streets, zone-weighted prefab fill) built a 256×256 city in about 60 ms, a 128² town in about 28 ms and a 48² village in about 5 ms (my measurement). It was deterministic using integer-only RNG, and its output is 0.2–4.4 KB gzipped, so regenerating is cheaper than storing.

### Cited Findings
- **FMG → Watabou city generator.**
  - Per-settlement seed = map seed + burg index zero-padded to 4 digits, unless a stored `MFCG` seed overrides it.
  - City URL parameters: name, population, `size` = 2.13 × (population / urban density)^0.385 clamped to 6–100, seed, river, coast, farms, citadel, urban_castle, `hub` (the burg is a road crossroad), plaza, greens, temple, walls, shantytown, style, and `sea` (0 = east, 0.5 = north, 1 = west, 1.5 = south).
  - Village URL parameters: pop, name, seed, and width/height by population (400–1,600 px). Style is sand, snow or default by biome and temperature.
  - Village tags: estuary, island, coast, confluence, river, pond; highway, dead end or isolated from route connectivity; uncultivated or farmland; no orchards; no square; palisade; sparse or dense.
  - A third preview option, which a burg group can select, links to Watabou's Dwellings, with tags by population (small, low, tall, large).

  — [burgs-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/burgs-generator.ts) (opened, lines ~574–735)
- **FMG settlement groups.** Default groups: capital, city (90th percentile and population ≥5 points), fort, monastery, caravanserai (desert biomes), trading post, village (0.1–2 points), hamlet (≤0.1) and town (the default). Each maps to a preview generator ("watabou-city" or "watabou-village"). One population point = 1,000 people by default. "Urban density. Average people per building in medieval fantasy city generator. By default: 10". — [burgs-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/burgs-generator.ts) (opened); [FMG wiki: Scale and distance](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Scale-and-distance) (opened)
- **Cataclysm: DDA lazy decisions.** A per-special decision is "Resolved lazily when the first OMT reaches mapgen. Result is persisted on the overmap and survives save/load". Cities "begin [their] life as a single intersection" with an assigned size, and roads are generated before specials. — [CDDA OVERMAP.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/doc/JSON/OVERMAP.md) (opened)
- **Dwarf Fortress scales.** A world tile = 16×16 region tiles = 768×768 local tiles; a region tile = 48×48 local tiles. Region tiles "are only generated by DF as you scroll around on the zoomed-in embark map". — [DFHack docs: Maps API](https://github.com/DFHack/dfhack/blob/c872dc4c64/docs/api/Maps.rst) (opened); [DFHack export-world-map](https://github.com/DFHack/dfhack/blob/c872dc4c64/docs/plugins/export-world-map.rst) (opened)
- **Size references.** Pokémon towns are about 20×20 tiles and cities 30×30–80×40 ([pret layouts](https://github.com/pret/pokeemerald/blob/731ad5bfd6/data/layouts/layouts.json), opened). The Watabou TownGeneratorOS ward/patch algorithm and the Parish–Müller/citygen road growth are described in Q1.
- **My measurements ([town.mjs](../prototypes/worldmaps/town.mjs)).**
  - Generator: FNV hash → sfc32 RNG; entry tiles from integer bearings by walking the square perimeter (no trigonometry); turn-penalised 4-direction A* from each entry to the plaza, with bridges over water; recursive BSP blocks with 2-tile streets (towns and cities); a 9-tile lattice for villages; prefab packing per block from a 12-entry catalogue, zoned by distance to the plaza and with quotas for market, police and civic buildings.
  - Results:

| Tier | Size (tiles) | Entries | Warm / first run | Prefabs placed | Blocks | A* expansions | Layers raw / gz |
|---|---|---|---|---|---|---|---|
| Village | 48×48 | 2 | 5.4 ms / 10.7 ms | 21 | | | 6,912 B / 174 B |
| Town | 128×128 (river) | 3 | 28 ms / 50 ms | 80 | 54 | 47,552 | 49 KB / 1.3 KB |
| City | 256×256 (river and coast) | 5 | 59 ms / 63 ms | 290 | 207 | 339,386 | 197 KB / 4.4 KB |

  - Ground and building layers were byte-identical across runs (my measurement).
  - The city render showed a coast strip, a meandering river, arterials from 5 entries to a central plaza, a BSP street grid and prefab footprints (my measurement; city256.png in the scratchpad worldmaps/bench folder).

### Inferences
**Tier mapping (proposal)**
- **Hamlet or village** (≲2k people; about 20×20–48×48 tiles): hand-made LDtk village kits, a few variants per biome and coast/river case. Pick one by seed, then add procedural dressing (house count from population, fences, fields, market stall if the village is on a highway). This matches Pokémon towns and the user's "village as a small LDtk level".
- **Town** (about 2k–20k; 64–128 tiles): arterials from the real road entries to a plaza, a BSP street grid, and LDtk prefab blocks (8×8–16×16) chosen by zone: shops near the centre, homes outside, quotas for police post, market and civic buildings.
- **City** (≥20k; 256×256, which is the 10k-agent cap): seeded arterials and a ring road, district zoning (market core, wealthy, poor, industrial, docks), BSP blocks and prefabs. Prefab variants can be keyed to district wealth and crime: run-down vs well-kept versions of the same footprint, so the pixel skin "shows" the sim state.

**Coupling to the country map** (FMG's parameters are a good checklist):
- entry points = bearings of incident route edges where their polylines cross the settlement radius
- river crossing and orientation; coast and sea direction (FMG's `sea`)
- biome, which picks the tileset variant
- population, which sets the block count
- port flag, hub (crossroad) and walls

The same entries later serve as spawn and despawn points for travellers (see Q5).

**Determinism and saves**
- seed = hash(worldSeed, settlementId, generatorVersion). Use integer RNG and no implementation-approximated Math functions.
- Persist only diffs from sim or user events (buildings destroyed, built, repurposed) keyed by tile or prefab id.
- Store the generator version in the save so old saves regenerate identically after updates.
- Cache the last few generated settlements in memory: about 197 KB raw for a 256² city's two layers.

**Agents on zoom**
- On zoom-in, instantiate individual agents consistent with the settlement's aggregate state: counts by role (citizens, police, thieves, merchants), wealth distribution and price levels.
- On zoom-out, fold the agent statistics back into the aggregate model.
- Generation (≤60 ms) is small relative to the agent spin-up the main design already budgets. This is inference; I did not measure agent spin-up.

**Licensing:** re-implement Watabou-like ward and street ideas. Do not port the GPL Haxe code.

### Gaps
- Not measured: LDtk prefab parse and instantiate time, and WebGL tile upload for a freshly generated 256² map (needs a browser).
- The algorithms of Watabou's newer generators are not public, so I found no primary source.

## Q4. Presentation across scales: how games do it, and the country-to-street semantic zoom design

### Takeaway
The games surveyed don't use one continuous zoom. They switch between 2–4 discrete representations, each with its own symbols:
- Pokémon: a symbolic 28×15-square Town Map, plus per-town PokéNav city maps.
- Dwarf Fortress: world → region → local, with fixed 16× and 48× steps.
- Cataclysm: DDA: overmap tiles, each standing for 24×24 squares.
- Victoria 3: a 3D terrain map when zoomed in and a paper map when zoomed out, with 40+ map modes.
- Civilization VI: lenses plus a separate strategic view.
- OpenTTD: small-map modes plus a link-graph flow overlay.

For this project the zoom range is about 800× (inference below), so use 4 semantic levels: Country → Region → Settlement → Street.
- Map modes are pure functions of aggregate state (OpenVic's base and stripe colour pattern), so the dots, blobs and pixel skins all share them.
- Flows are directed, offset parallel bands along the actual routes (OpenTTD and EU4 style), aggregated per level.
- Transitions are cross-fades at zoom thresholds, with integer pixel snapping at street level.
- One "focus" state drives both the camera and the charts.

### Cited Findings
- **Pokémon Emerald's Town Map.** A grid of 28×15 squares (`MAP_WIDTH 28`, `MAP_HEIGHT 15`) with a full mode and a zoomed mode. Of 213 map sections, 95 have map positions: 16 towns and cities, each 1×1 square; 34 routes, each 1×1 to 1×6 squares (e.g. Route 111 is 1×6); and 45 others. The PokéNav also has 22 per-town "city maps". — [region_map.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/region_map.c) (opened); [region_map_sections.json](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/region_map/region_map_sections.json) (opened, my tally); [city_map_entries.h](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/region_map/city_map_entries.h) (opened)
- **Pokémon Gen I Town Map and Fly.** The Gen I Town Map lists towns, routes and dungeons as selectable locations. Fly travels instantly to previously visited locations, mostly towns and cities. — [Bulbapedia: Town Map](https://bulbapedia.bulbagarden.net/wiki/Town_Map) (snippet only); [Bulbapedia: Fly](https://m.bulbapedia.bulbagarden.net/wiki/Fly_(move)) (snippet only)
- **Dwarf Fortress views.** World tiles are shown on the world map before embarking, in the fortress-mode civilisation map and in the adventure-mode quest log. Region tiles are shown when resizing an embark and in zoomed-out fast travel. Blocks (16×16 local tiles) are shown in zoomed-in fast travel. — [DFHack Maps.rst](https://github.com/DFHack/dfhack/blob/c872dc4c64/docs/api/Maps.rst) (opened)
- **Cataclysm: DDA overmap view.** The overmap is the "view map (m)" screen of symbol tiles. Overmap terrains have `see_cost` and vision levels; the most limited shows only "vague, only cursory details such as from a quick glance - broad features". — [CDDA OVERMAP.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/doc/JSON/OVERMAP.md) (opened)
- **Victoria 3 zoom and map modes.** "You can zoom in and see a physical map, or you can zoom out and see a paper map". The paper map has illustrations. There are "over 40 different map modes", selectable and lockable. Cities visibly expand as building thresholds are reached ("Hub expansion"). — [Steam: Bring Back Paper Map](https://steamcommunity.com/app/529340/discussions/0/3114781060447976575/) (snippet only); [Victoria 3 Wiki: Map modes](https://vic3.paradoxwikis.com/Map_modes) (snippet only); [Dev Diary #50 Living Map](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-50-living-map.1531318/) (snippet only)
- **OpenVic map modes (MIT, a Victoria 2 clone).**
  - Each map mode is a colour function that returns a `base_stripe_t` (base colour plus stripe colour) per province.
  - Modes: terrain, political, militancy, diplomatic, region, infrastructure, colonial, administrative, recruitment, national focus, RGO, population, culture (shaded), sphere, supply, party loyalty, ranking, migration, civilisation level, relations, crisis, naval, province.
  - Population is drawn as green intensity relative to the most populous province.
  - The map module also contains `Crime.cpp`.

  — [Mapmode.cpp](https://github.com/OpenVicProject/OpenVic-Simulation/blob/dd311914fb/src/openvic-simulation/map/Mapmode.cpp) and [Mapmode.hpp](https://github.com/OpenVicProject/OpenVic-Simulation/blob/dd311914fb/src/openvic-simulation/map/Mapmode.hpp) (opened)
- **Civilization VI.** Lenses overlay information (Appeal, Continent, District placement, Settler, Political, Religion, Tourism…), some switched on automatically by context such as placing a district. "lenses overlay information onto the map, strategic view is an alternate way of rendering the map". — [Civilopedia: Lenses](https://www.civilopedia.net/en-US/standard-rules/concepts/world_7/) (snippet only); [Steam: Strategic view discussion](https://steamcommunity.com/app/289070/discussions/0/366298942111054217/) (snippet only)
- **EU4 trade map mode.** 85 static trade nodes; arrows show one-way flow direction; end nodes have no outgoing arrows. — [Paradox forum: EU4 trade guide](https://forum.paradoxplaza.com/forum/threads/oooh-shinies-a-guide-to-the-eu4-trade-system.707915/) (snippet only)
- **OpenTTD (GPL-2.0).**
  - Small-map types: Contour, Vehicles, Industries, LinkStats, Routes, Vegetation, Owners.
  - The link-graph overlay draws each link as a line coloured from a 12-step gradient by usage/capacity, dashed when "shared". It is offset sideways according to the driving side, so the two directions appear as parallel lines beside a dark grey centre line.
  - Tooltips report usage and percentage saturation.
  - Cargo demand between stations is scaled by distance (the `demand_distance` setting).

  — [linkgraph_gui.cpp](https://github.com/OpenTTD/OpenTTD/blob/4b5f010b41/src/linkgraph/linkgraph_gui.cpp) (opened); [smallmap_gui.cpp](https://github.com/OpenTTD/OpenTTD/blob/4b5f010b41/src/smallmap_gui.cpp) (opened); [demands.cpp](https://github.com/OpenTTD/OpenTTD/blob/4b5f010b41/src/linkgraph/demands.cpp) (opened)
- **FMG semantic zoom and flow animation.**
  - Label groups have `zoom.min` and `zoom.max` visibility bands.
  - The viewport renders labels only for a "materialised" bounds and re-materialises them when the zoom ratio passes a threshold or the view nears a guard margin.
  - The Performance setting "Redraw on zoom" can be "While zooming" or "After zoom".
  - Trade "deals" are animated as markers following stored route geometry: 30 concurrent by default, with a land duration modifier of 5 and separate land and water costs.

  — [labels-renderer.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/renderers/labels/labels-renderer.ts) (opened); [viewport-renderer.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/renderers/viewport/viewport-renderer.ts) (opened); [FMG wiki: Performance settings](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Performance-settings) (opened); [trade-animation-options.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/data/trade-animation-options.ts) and [trade-animation.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/renderers/trade-animation.ts) (opened)
- **Songs of Syx.** The world map is made of bordered regions containing settlements. Hovering a region shows population per species and growth, army divisions, farms and mines. The player founds a capital settlement on the world map. — [Songs of Syx Wiki: World](https://songsofsyx.com/wiki/index.php/World) (snippet only)
- **Semantic zooming.** Pad++ objects "change the way they look depending on their size …"; such changes are "called semantic zooming". An April 2026 arXiv paper is titled "Semantic Zooming and Edge Bundling for Multi-Scale Supply Chain Flow Visualization"; I saw only its title. — [Pad++ (Bederson et al.)](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p23-bederson.pdf) (snippet only); [arXiv 2604.08823](https://arxiv.org/pdf/2604.08823) (snippet only, title only)

### Inferences
**Scale.** Assume 1 street tile ≈ 2–4 m (background, unverified) and a country of about 200 km on a ~1,000 px screen. Then the zoom spans about 200 m per pixel (country) down to about 0.25 m per pixel (16 px tiles), roughly 800×. Continuous zoom cannot show both legibly, which is why the surveyed games use discrete levels.

**Four levels.** Thresholds are in screen pixels per street tile, with hysteresis bands. Use FMG's `zoom.min/max` pattern for label groups.

| Level | Shows | Rendering | Labels and markers |
|---|---|---|---|
| L0 Country (whole country visible) | Symbolic Town-Map style: terrain classes, settlement squares sized by tier, top-tier routes as bars, region borders | Draw the mesh into a low-resolution offscreen framebuffer (e.g. 480×270), palette-quantised and upscaled with nearest filtering. Alternatively draw it as an 8-px tilemap (see Q7) | Capitals and cities only |
| L1 Region / province | All settlements with tier icons and names, all roads and tracks, route segments selectable as places, flows | Same as L0 at higher density. Optionally re-mesh the region at higher density, like FMG's Submap tool | Names for all settlements |
| L2 Settlement overview (settlement fills the screen; a tile is 1–4 px) | The generated street map | A "minimap" colour per atlas tile, precomputed once as each tile's mean colour and drawn at 1 px per tile; or the dots/blobs skins | District choropleths: crime hot spots, prices by market, police beats |
| L3 Street (16 px tiles at integer scales ×1–×4) | Individual agents | Pixel-art skin with nearest sampling | Agents and buildings |

**Map modes.** Implement each as `(aggregateState, entity) → {base, stripe}`, following OpenVic. Share them across skins and across L0, L1 and L2 (where they become district overlays):

| Mode | Encoding |
|---|---|
| Population | Proportional symbols on settlements (√pop); choropleth only for regions (density) |
| Growth / net migration | Diverging colours |
| Crime, true vs recorded | Base colour = true rate, stripe = recorded rate; or a "dark figure" mode showing recorded/true as the reporting rate. This makes the true-vs-recorded gap visible in one glance |
| Clearance rate | |
| Police | Police per 1,000 people, patrol coverage on routes |
| Prices | Per good, diverging around the national median |
| Wages and unemployment | |
| Trade volume | |
| Danger | For routes (Q5) |

**Flows (trade, migration, couriers, commuters).**
- Draw them along the real route geometry, never as straight origin–destination chords at L1.
- Use directed, side-offset parallel bands (OpenTTD), width proportional to volume and colour by type or saturation.
- Aggregate per level: L0 shows region-to-region desire lines or bundled trunks; L1 shows per-route-edge bands; L2 shows inflow and outflow at the entry points.
- Optionally animate a capped number of particles (FMG uses 30) for the selected flow type only. Arrowheads or particle motion give direction, as in EU4's one-way arrows.

**Transitions.**
- Cross-fade between representations over a zoom band, anchored at the cursor or focus point.
- Snap to integer scales at L3 to keep the pixel art crisp.
- When zooming into a settlement, start the ≤60 ms interior generation as soon as the settlement is hovered or the zoom passes L1.
- When jumping (search or "fly to"), use a short fade or iris, as Pokémon's Fly does (background, unverified), rather than a long animated zoom.

**Synced charts.**
- Keep one focus state in the main thread: {level, entity (country, region, settlement, route, district), mapMode, timeWindow}.
- The camera updates the focus when it crosses a level threshold (entity = the region or settlement under the screen centre). Explicit selection overrides the camera and pins the focus.
- Charts subscribe to the focus and re-key to that level's aggregate series. A breadcrumb (Country › Region › Town › Street) lets the user climb back up.
- The map-mode legend and the chart y-axis share colour scales. "True vs recorded" uses the same pair of colours in both.

**Worker contract.**
- L0 and L1 need only per-settlement and per-route aggregate arrays each tick (S×K floats).
- Agents stream only for the focused settlement (L2 and L3).
- This keeps the renderer's world model shared and small.

### Gaps
- Nothing primary was opened on the user interfaces of Mount & Blade, Civilization, Victoria 3 or Songs of Syx; all of those findings are snippet-only.
- I found no studies comparing cross-fade with hard-cut transitions in strategy and simulation games. The arXiv flow-zoom paper could not be opened.

## Q5. Routes as places: travel between settlements and its level of detail

### Takeaway
Make every route edge a first-class entity with its own aggregate state: length, tier, terrain, travel time per mode, traffic by type, bandit pressure, patrol level, and true and recorded incidents. Simulate travel as flows and hazard rates. Instantiate individual travellers, caravans, bandits and a generated "route strip" map only when the user watches that route. The precedents:
- Pokémon: routes are their own maps.
- Mount & Blade: caravans and bandits move on the campaign map.
- RimWorld: abstract caravan travel, where an ambush generates a temporary local map.
- OpenTTD: a link graph with capacity and usage.
- FMG: journeys with transport types, speeds and travel days.

### Cited Findings
- **Pokémon routes.** Routes are separate maps: Emerald has 34 numbered routes, from 20×20 (Route 101) to long strips of 140×20 (Route 123) and sea areas of 80×80 (Routes 124, 126, 127), joined to towns by edge connections. They appear on the Town Map as bars of 1–6 squares. — [pret layouts.json](https://github.com/pret/pokeemerald/blob/731ad5bfd6/data/layouts/layouts.json) and [region_map_sections.json](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/region_map/region_map_sections.json) (opened)
- **Mount & Blade II: Bannerlord caravans.** Caravan routes are randomised, and warzones full of raiders sidetrack them. Merchants ask the player to escort caravans threatened by "roaming bandits and raiders". Desert and steppe bandits are a known trade-route hazard. — [GamerGuides: Escort Merchant Caravan](https://www.gamerguides.com/mount-and-blade-ii-bannerlord/guide/campaign/quests/escort-merchant-caravan) (snippet only); [Steam guide: The Silk Road](https://steamcommunity.com/sharedfiles/filedetails/?id=2042902036) (snippet only)
- **Mount & Blade settlement counts.** Bannerlord's Calradia has 53 towns, 67 castles and 267 villages (387 settlements); one source says 57 towns. Warband had 22 towns, 48 castles and 110 villages (180). — [Mount & Blade Wiki: Towns (Bannerlord)](https://mountandblade.fandom.com/wiki/Towns_(Bannerlord)) (snippet only)
- **RimWorld caravans.** Ambushes by enemy factions or manhunting animals generate a temporary local map. Colonists can't leave until the attackers are defeated. These temporary maps don't count toward the colony limit. The feature was introduced in Alpha 16. — [RimWorld Wiki: Caravan](https://rimworldwiki.com/wiki/Caravan) (snippet only)
- **FMG Journeys.**
  - 20 default transport types (from "On foot (laden)" to "Teleport") in 4 domains: land, water, air, stay.
  - Each has a speed and hours of travel per day: "A caravan walks about 8, a ship under sail runs 24".
  - Land legs follow roads where they exist; off-road legs travel at half speed.
  - Generated journeys use 18 archetypes, including Caravan, Courier ride, Smuggling run, Refugee flight, Raid and Royal progress, which set transport preferences, off-road probability and stopovers.

  — [FMG wiki: Journeys](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Journeys) (opened)
- **Cataclysm: DDA road rules.**
  - Overmap connections define where a road may run: "a road may be placed on fields, forests, swamps and rivers". Fields are preferred over forests, forests over swamps, and swamps over rivers. "a road crossing a river will be a bridge".
  - Autotravel cost types are road, field, dirt_road, trail, forest, shore, swamp, water and others.

  — [CDDA OVERMAP.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/6c506a7544/doc/JSON/OVERMAP.md) (opened)
- **OpenTTD cargo distribution.** Flows are assigned over a link graph by a multi-commodity-flow solver (`mcf.cpp`: "Definition of Multi-Commodity-Flow solver") with distance-scaled demand (`demands.cpp`). The overlay shows usage against capacity. — [OpenTTD src/linkgraph](https://github.com/OpenTTD/OpenTTD/tree/4b5f010b41/src/linkgraph) (opened)
- **Simulation LOD research.**
  - "Level of Detail AI for Virtual Characters in Games and Simulation" (Springer) applies LOD to agent AI.
  - The "LOD Trader" "optimizes the perceptual quality of a simulation while respecting computational resource constraints by selectively reducing the level of detail with which less important entities are simulated", using a viewer-centric perceptual measure.

  — [Springer chapter](https://link.springer.com/chapter/10.1007/978-3-642-16958-8_20) (snippet only); [ACM: LOD Trader](https://dl.acm.org/doi/10.1145/2522628.2541250) (snippet only)

### Inferences
**Route entity.** `{id, a, b, tier (highway/road/track/sea), cell polyline, length, terrain mix, travelTime[mode], capacity, traffic{freight, commuters, couriers, migrants}, banditPressure, patrol, incidents{true, recorded}, lastReport}`.

**Aggregate model per tick** (cheap: O(routes)):
- Trade flows come from price gaps between markets, net of transport cost (FMG-style markets); migration and commuting from a gravity model (pop_i·pop_j/d^β) adjusted by wage and crime gaps. OpenTTD's distance-scaled demand is a working precedent.
- Robbery hazard per km = f(banditPressure, patrol, traffic, night share, cargo value). Expected incidents follow a Poisson process with rate = hazard × exposure.
- Recorded incidents = true incidents × reporting probability. Reporting depends on patrols and on couriers reaching a police post. Routes therefore feed the true-vs-recorded crime map mode, with realistic reporting delays.

**Discrete trips only where they matter:**
- caravans, which carry merchant inventories between market towns
- couriers, which carry police reports and orders (and delay "recorded" crime reaching the capital)
- patrols

Commuters exist only between settlements under about an hour apart, and stay flows, never sprites, at L0 and L1.

**Level of detail:**

| Level | Routes shown as |
|---|---|
| L0 | Flows and danger shading only |
| L1 | Bands plus sampled caravan icons (only trips above a value threshold) moving along the polyline |
| L3 (watching a route) | A seeded route strip map |

The L3 route strip is in Pokémon style: about 20–40 tiles wide, its length a compressed function of the real length, with terrain from the cells the route crosses. Caravans, bandits and patrols are spawned as agents only while observed; the outcome is folded back into the aggregate. This is the RimWorld "temporary map" pattern applied to watching rather than ambush.

**Time and consistency.**
- When the focused settlement runs at street-level time steps (minutes), other settlements and routes tick at coarser steps (hours or days).
- Arrivals into the focused settlement are released as agents at the matching entry tiles (Q3), and departures are removed there. This keeps flows conserved across the LOD boundary.

### Gaps
- None of the game mechanics above (Mount & Blade, RimWorld) come from opened primary sources.
- I found no published parameter values for robbery hazards or reporting rates; these need design and tuning.

## Q6. Naming and IP: original place names, avoiding Pokémon names and region shapes

### Takeaway
Use a seeded, MIT-licensed Markov or syllable generator: FMG's syllable Markov chain, foswig (order-n characters, injectable RNG, can exclude exact training words) or Tw1ddle's markov-namegen. Train it on an original, project-authored corpus and add feature-based suffixes. Add a dev-time check that rejects exact and near (small edit-distance) matches against Pokémon place names taken from pret's data, used as a filter only and never shipped. Avoid Pokémon's naming schemes (colour-word cities in Kanto; nature compounds in Hoenn) and keep hand-drawn outlines away from Pokémon region shapes, which were themselves rotated real islands.

### Cited Findings
- **FMG name generator.** FMG builds a Markov chain over pseudo-syllables from comma-separated "name bases". It ships 43 bases (German, English, French, … Korean, Chinese, Japanese, … Elven, Dwarven, Draconic, …) in an 85,846-byte data file. — [names-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/names-generator.ts) (opened); [name-bases.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/data/name-bases.ts) (opened)
- **FMG route names.** Route names come from models (`burg_suffix`, `prefix_suffix`, `the_descriptor_prefix_suffix` …) with prefixes such as King, Old, New, Silver and Iron, and suffix lists per route type (roads, trails, sea routes). — [routes-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/b944003c14/src/generators/routes-generator.ts) (opened)
- **foswig.js (MIT).** Constraints: `minLength`, `maxLength`, `allowDuplicates` ("Can the output be an exact match of a dictionary input word or not"), `maxAttempts`, and `random` (a custom RNG function). The chain order is configurable. — [foswig README](https://github.com/mrsharpoblunto/foswig.js/blob/62ef9c625f/README.md) (opened)
- **markov-namegen-lib (MIT, Haxe).** Katz back-off with high-order models, a Dirichlet prior, filtering by length, start, end, content and regex, and Damerau–Levenshtein similarity sorting. — [markov-namegen-lib README](https://github.com/Tw1ddle/markov-namegen-lib/blob/e6c80568ad/README.md) (opened)
- **My measurement.** foswig order-3, trained on 400 names built from an invented syllable inventory, produced 1,000 unique names in about 15 ms: e.g. "Dunwyngate", "Holgorburn", "Velmoor", "Seldunby", "Morharmere", and some odd ones ("Briithhaven"), so a filter pass is needed ([country.mjs](../prototypes/worldmaps/country.mjs)).
- **Pokémon place names in pret data.**
  - Kanto: Pallet, Viridian, Pewter, Cerulean, Vermilion, Lavender, Celadon, Fuchsia, Saffron, Cinnabar (colour words).
  - Hoenn: Littleroot, Oldale, Petalburg, Rustboro, Dewford, Slateport, Mauville, Verdanturf, Fallarbor, Lavaridge, Fortree, Lilycove, Mossdeep, Sootopolis, Pacifidlog, Ever Grande.
  - Emerald defines 213 map sections in all.

  — [pokeemerald region_map_sections.json](https://github.com/pret/pokeemerald/blob/731ad5bfd6/src/data/region_map/region_map_sections.json) (opened); [pokefirered region_map_sections.json](https://github.com/pret/pokefirered/blob/037335f4c7/src/data/region_map/region_map_sections.json) (opened)
- **Real-world bases for Pokémon regions.** Hoenn is based on Kyushu rotated 90°, and individual Hoenn locations map to real Kyushu places (e.g. Mount Chimney to Mount Aso). — [Bulbapedia: Hoenn](https://bulbapedia.bulbagarden.net/wiki/Hoenn) (snippet only); [Bulbapedia: Pokémon world in relation to the real world](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_world_in_relation_to_the_real_world) (snippet only)

### Inferences
**Naming grammar by tier and feature:**
- Settlements: Markov stem + suffix chosen by site: river crossing → "-ford" or "-bridge"; estuary → "-mouth"; coast → "-haven" or "-port"; hill → "-don"/"-ridge"; market town → "Market X".
- Routes: "<A>–<B> Road", "Old <A> Road", "Coast Road", "Salt Way". Consider names over Pokémon-style "Route 101" numbering for clearer distance, though numbered roads are generic in real life.
- Regions: capital name + "-shire"/"-march", or invented names.

**Corpus.** Write an original syllable inventory, or use FMG's real-language bases only as inspiration. foswig's `allowDuplicates:false` excludes only exact training words. A corpus of one country's real town names will regenerate some real names, which may or may not matter.

**IP filter.**
- Build a dev or CI test that generates N names per seed and fails on:
  - exact matches with Pokémon place names (copied as a test fixture from pret's sections file, names only, not shipped in the game)
  - Damerau–Levenshtein ≤1–2 for short names
  - a profanity list
- Avoid the distinctive Kanto pattern of colour-word + "City".

**Shapes.** Procedural coastlines avoid region-shape copying by construction. For any hand-drawn showcase country, don't base it on Japanese islands, and don't trace or rotate Pokémon region outlines.

**Determinism.** Pass the world RNG into the generator (foswig's `random`). Names are then reproducible per seed.

### Gaps
- I opened no legal source on the protection of place names or region shapes. My understanding that individual names are weak IP while trademarks and trade dress matter is background, unverified; seek counsel if the project is commercial.

## Q7. Storage and performance: data sizes, chunked loading, country-zoom atlases, save formats

### Takeaway
A 1,000-settlement country is small:
- settlement table about 24 KB gz
- route graph about 10 KB gz
- road geometry about 12–16 KB gz (varint)
- optional cached terrain columns about 31 KB gz (30k cells)

Even pre-rendered overview PNGs are only 31–167 KB. The real storage risks are:
- per-settlement time-series history: 6–14 MB gz for 1,000 settlements × 8 metrics × 10 years weekly in my synthetic test
- agent state for the focused settlement

Store seed + edits for geometry and regenerate street maps. Use columnar typed-array binary sections compressed with the built-in CompressionStream, saved in OPFS or IndexedDB. Render the country zoom at runtime from the mesh.

### Cited Findings
- **Country data sizes.** See the Q1 sizes table (my measurement).
- **Overview raster** (my measurement, [raster.mjs](../prototypes/worldmaps/raster.mjs)). The 30k-cell mesh was rasterised by `d3-delaunay` `find()` with a raster-order hint. Building the Delaunay took about 72–84 ms. The 9-colour indexed PNGs were written by PIL with `optimize=True`.

| Resolution | Raster time | Indexed PNG size |
|---|---|---|
| 512² | 56 ms | 30,837 B |
| 1024² | 210 ms | 72,801 B |
| 2048² | 395 ms | 167,024 B |

- **Save sizes on synthetic data** (my measurement, [savesize.mjs](../prototypes/worldmaps/savesize.mjs); random values and random walks, so close to worst-case compressibility). For 1,000 settlements:

| Item | Raw | gz |
|---|---|---|
| Aggregate state, 48 Float32 per settlement | 192 KB | 173 KB |
| 10-year weekly history, 8 metrics, Float32 | 16.6 MB | 14.1 MB |
| Same history, quantised Uint16 + delta | 8.3 MB | 6.1 MB |
| Route state, 2 edges/settlement × 8 floats | 64 KB | 57 KB |

  For 100 settlements, the delta-coded history is 832 KB raw / 613 KB gz.
- **Street maps.** A generated 256² city's layers are 197 KB raw / 4.4 KB gz, and regeneration takes about 60 ms (my measurement, Q3).
- **FMG file sizes.** FMG's `.map` size "mostly depends on the points number", and FMG loads gzip-compressed `.map.gz` directly. Data can be exported as GeoJSON or JSON, but "only a little of it can be imported back". — [FMG wiki: Knowledge Base](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base) (opened)
- **mapgen4 storage.** mapgen4 ships its precomputed mesh points as a quantised Uint16 binary (see Q1). — [serialize-points.ts](https://github.com/redblobgames/mapgen4/blob/c1d8cb018a/serialize-points.ts) (opened)
- **Browser support (MDN browser-compat-data, opened).** `CompressionStream` (gzip/deflate): Chrome 80, Firefox 113, Safari 16.4. OPFS `navigator.storage.getDirectory()`: Chrome 86, Firefox 111, Safari 15.2. `StorageManager.persist()`: Chrome 55, Firefox 57, Safari 15.2. — [BCD CompressionStream.json](https://github.com/mdn/browser-compat-data/blob/main/api/CompressionStream.json) (opened); [BCD StorageManager.json](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json) (opened)
- **LDtk chunking.** LDtk's separate level files keep heavy layer data in one `.ldtkl` per level, which suits lazy loading of authored prefabs and hero towns (Q2). — [JSON_DOC.md](https://github.com/deepnight/ldtk/blob/6d69bd1d6b/docs/JSON_DOC.md) (opened)
- **Kenney Minimap Pack.** 150 tiles of 8×8 px in 6 colour styles (25 each): path pieces (straight, corner, T, cross, end) and markers (house, skull, "S", "X"). That suits a Town-Map-style route diagram at L0/L1. It is CC0 and described as "for use in metroidvania games". — [shorepine/kenney mirror: Minimap Pack/Tiles](https://github.com/shorepine/kenney/tree/3694c6879e/2d/Minimap%20Pack/Tiles) (opened; the mirror holds no licence file); [Kenney: Minimap Pack](https://kenney.nl/assets/minimap-pack) (snippet only); [OpenGameArt: Minimap pack](https://opengameart.org/content/minimap-pack) (snippet only)
- **Other Kenney packs in the mirror.** "Map Pack" (188 tiles, 64×64), "Tiny Town" (132 tiles, 16×16), "Tiny Battle" (198 tiles, 16×16) and "Roguelike City Pack" (1,036 files). — [shorepine/kenney mirror](https://github.com/shorepine/kenney/tree/3694c6879e/2d) (opened via an index another researcher built in the scratchpad, shore_index.tsv)
- **Dwarf Fortress lazy detail.** DF itself generates region-tile detail lazily; DFHack's export works only on tiles DF has already generated. — [DFHack export-world-map](https://github.com/DFHack/dfhack/blob/c872dc4c64/docs/plugins/export-world-map.rst) (opened)

### Inferences
**Country-zoom imagery: render at runtime, don't pre-render.** 30k cells is about 60k triangles, trivial for WebGL2.
- Option A, fastest pixel look: rasterise the mesh into a small offscreen framebuffer, quantise to the project palette, and upscale with nearest filtering.
- Option B, closest to the Pokémon Town Map: classify each 8×8 px "overworld" cell (by sampling the mesh) into water, plain, forest, hill, mountain, town or road, then draw an 8-px tilemap with autotiling for coasts and roads. Kenney Minimap pieces give route and marker glyphs; terrain tiles can be drawn in-house or taken from other CC0 packs.

Static pre-rendered PNGs are worth it only for a fixed showcase seed or a social preview image (512² ≈ 31 KB).

**L2 settlement overview.** Precompute each atlas tile's mean colour once; the 16×16 tileset becomes a palette. Draw the street map at 1 px per tile, avoiding mipmap bleeding on pixel atlases (background, unverified).

**Chunking.**
- The whole country model fits in memory and needs no chunking.
- Chunk or lazy-load only:
  - street maps, one per settlement, regenerated on demand
  - LDtk prefab and hero levels (separate level files)
  - agent state, focused settlement only
  - history series, per settlement, loaded when a chart needs them
- Render the street map in 16×16-tile chunks so edits rebuild only one chunk's buffers (background, unverified).

**Save format.**
- Header: {format version, generator versions, worldSeed, params, created/tick}.
- Sections as columnar typed arrays: settlement aggregate state, route state, regions/markets, edits (tile diffs per settlement), the focused settlement's agent arrays, history.
- Compress each section with `CompressionStream('gzip')` (no library needed; fflate as fallback). Write to OPFS, or IndexedDB where OPFS is missing. Call `navigator.storage.persist()`. Export/import as a single `.gz` file. Use JSON only for the small header.

**History budget.**
- Full weekly history for 1,000 settlements is MBs. Use multi-resolution retention: weekly for the last year, monthly before that (about 31% of the weekly sample count over 10 years).
- Alternatively keep full detail only for regions and watched settlements.
- Quantise to Uint16 and delta-encode, about 2.3× smaller than gzip'd Float32 in my synthetic test.

**Worker ↔ renderer.**
- Send the world model once after generation as transferable ArrayBuffers.
- Then send per-tick aggregate deltas (S×K floats, about 200 KB per tick for 1,000×48 Float32 if fully re-sent; send only changed fields or lower the rate for L0 and L1).
- Stream agent buffers only for the focused settlement.

**Budgets:**
- new game ≤1.5 s
- settlement zoom-in ≤60 ms generation plus agent spin-up
- country-zoom frame: one mesh or tilemap draw call plus route and flow lines
- aggregate tick for 1,000 settlements and about 2,000 routes: O(S+E), negligible

### Gaps
- No browser memory, time or WebGL measurements (all numbers are Node and PIL).
- History compressibility on real simulation output is unknown; I used synthetic random walks.
- The Kenney Minimap Pack licence is confirmed only by search snippets; the GitHub mirror has no licence file.
- WebGL2 texture-size and array-layer limits for big atlases were not verified. The WebGL 2.0 spec I opened doesn't restate the ES 3.0 minimums.
