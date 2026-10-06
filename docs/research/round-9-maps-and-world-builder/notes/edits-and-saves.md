# Edits on a seeded world: data model, locks, cross-zoom identity, guardrails, saves and share links

Round 9, question 3: how edits live on top of a seeded world. Researcher notes, 6 October 2026.

All timings ran on one Windows 10 Pro desktop (AMD Ryzen 5 3600, 6 cores, 12 threads) under Node 24.18.0 or CPython 3.14.6, with other research jobs running. Windows has no load average, so PowerShell's CPU load and Git Bash's MSYS `/proc/loadavg` are quoted beside each timing. None is a browser, WASM or phone timing.

The prototypes in [`prototypes/edits/`](../prototypes/edits/) use only Node and Python built-ins and the repo's own `tools/worldgen`. No third-party code or data entered the repo.

Labels: "opened" (source read in full), "search summary" (seen only in a search result), "measured here", "computed", "inference", "unsourced estimate". "Opened, WebFetch extract" means the page was read through a summarising fetch tool because the host blocked plain downloads, so exact wording is slightly less certain.

Scope: the edit model, regeneration, identity, guardrails and formats. Map layers are in `map-pipeline.md`, builder scope in `builder-scope.md` and editor tech in `editor-tech.md`.

## 1. Data model

### Takeaway

- **Recommendation: seed + pinned generator versions + per-stage edit layers.** Each edit is an op that feeds one generator stage as an input. Ops keep their order inside a stage and commute across stages. Materialised arrays are only a cache, keyed by the world fingerprint.
- **The op log is the smallest share form.** 1,000 mixed edits take 2,047 URL characters [1,862–2,225] as columnar varints, deflate-raw and base64url. JSON takes 4,440 and per-cell override layers 4,495 (measured here, 20 logs).
- **A materialised world is about 13× larger.** The 96×64 reference world packs to 50,658 B and deflates to 19,848 B [17,572–22,466], or 26,466 base64 characters (measured here, 20 seeds). That fits a file, never a 2 KB or 8 KB link.
- **Every surveyed game splits seed and edits, or materialises what was touched.** Minecraft, Dwarf Fortress, Factorio and Fantasy Map Generator (FMG) save generated content. No Man's Sky (NMS) and Valheim keep edits beside the seed. None re-derives edited content from the seed alone.
- **Caps must fail loudly.** NMS caps terrain edits at 15,000 in 256 spatial buffers and silently overwrites old ones, so player holes "regenerate" (player study). Nomos should refuse an edit at a cap, never drop an old one.

### Cited Findings

- **Minecraft region files** hold 32×32 = 1,024 chunks in 4 KiB sectors. Compression ids are 1 (gzip, "unused in practice"), 2 (zlib), 3 (none), 4 (LZ4) and 127 (custom). A chunk is at most 255 sectors (1,020 KiB); larger ones spill to a `.mcc` file ([Minecraft Wiki: Region file format](https://minecraft.wiki/w/Region_file_format), opened, WebFetch extract).
- **Minecraft chunks store full content, not diffs.** Block states are a palette plus "a packed array of 4096 indices". A `Status` field records ten generation stages from `minecraft:empty` to `minecraft:full`, and `blending_data` "stores the heights to blend terrain to" ([Chunk format](https://minecraft.wiki/w/Chunk_format), opened, WebFetch extract).
- **Minecraft keeps old chunks across generator changes.** In 1.18 "the biomes and terrain from old and new chunks now seamlessly blend, preventing the hard cut borders from before". It warns that "any player-made structures in these chunks may either be intact, buried, or deteriorated" ([Java Edition 1.18](https://minecraft.wiki/w/Java_Edition_1.18), opened, WebFetch extract).
- **No Man's Sky keeps a capped edit list beside the seed.** A two-week player study with the NMSSaveEditor found `TerrainEditData` grouped into spatial buffers, with "an upper limit of 15,000 edits and 256 buffers". Edits inside a claimed base are flagged `BufferProtected`. Past a limit, older unprotected buffers were overwritten and dug holes filled back in ([Steam guide, 27 June 2021](https://steamcommunity.com/sharedfiles/filedetails/?id=2526352095), opened; a player study, not Hello Games).
- **FMG saves the whole materialised map, with the seed as provenance.** `prepareMapData` joins about 50 sections with `\r\n`. They start with the version, seed and size, the settings and the serialised SVG. Then come grid heights, temperature and precipitation, every packed cell array, and the cultures, states, burgs, routes and markets ([save.ts @354eeaa](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/services/io/save.ts), opened).
- **FMG stores user edits as [original, custom] pairs and drops stale ones.** `GraphOverride` keeps "property name → element id → [original value, custom value]". After a rebuild, `restore` skips an entry whose original no longer matches: "the graph changed, the id means another point" ([graph-override.ts @354eeaa](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/graph-override.ts), opened).
- **Materialised formats accumulate migration code.** FMG's `auto-update.ts` is 2,376 lines with about 60 version comparisons ([auto-update.ts @354eeaa](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/services/io/auto-update.ts), opened; lines counted here).
- **Factorio shares generator inputs, not maps.** A map exchange string holds the Factorio version, the map-gen settings with the seed, the map settings and a CRC32 "of all preceding data". It is zlib-compressed since 0.16, base64-encoded and wrapped in `>>>` and `<<<`. The same format stores the settings "inside save files for future chunk generation" ([Factorio Wiki: Map exchange string format](https://wiki.factorio.com/Map_exchange_string_format), opened, raw wikitext). Integers below 255 take one byte, otherwise 255 then the full width ([Data types](https://wiki.factorio.com/Data_types), opened).
- **Factorio shares user-built content as a versioned string.** A blueprint string is JSON "compressed with zlib deflate using compression level 9 and then encoded using base64 with a version byte in front". The byte "is currently 0 (for all Factorio versions through 2.0)" ([Blueprint string format](https://wiki.factorio.com/Blueprint_string_format), opened, raw wikitext).
- **Dwarf Fortress materialises, and its seeds are only partly reproducible.** It uses separate `SEED`, `HISTORY_SEED`, `NAME_SEED` and `CREATURE_SEED` values. "In the current version... you will get changes in events which will result in a very different world history" ([DF Wiki: Advanced world generation, rev 286840](https://dwarffortresswiki.org/index.php/DF2014:Advanced_world_generation), opened).
- **Dwarf Fortress pins its data version in each save.** A save folder holds "the raws directly copied from the time the world was generated". Feature files exist "only for parts of the world you have explored", and saves range "from 20 MB for small saves to several hundred megabytes" ([Saved game folder, rev 320157](https://dwarffortresswiki.org/index.php/DF2014:Saved_game_folder), opened).
- **Cities: Skylines maps are hand-made, materialised heightmaps with no seed.**
  - Cities: Skylines imports 1,081×1,081 16-bit heightmaps over 25 tiles of 1.92 km ([Map Editor](https://skylines.paradoxwikis.com/Map_Editor), opened, WebFetch extract).
  - Cities: Skylines II uses 4,096×4,096 16-bit heightmaps. Its maps store terrain, water sources, resources, trees, rocks and buildings, and the diary mentions no seed ([Modding Dev Diary #2](https://www.paradoxinteractive.com/games/cities-skylines-ii/modding/dev-diary-2-map-editor), opened, WebFetch extract).
  - Saves, maps and assets share one `.crp` container with a "CRAP" header and a file table ([Archive Team: Cities Skylines CRP](http://fileformats.archiveteam.org/wiki/Cities_Skylines_CRP), opened).
- **Valheim** keeps a small `.fwl` with the seed and a "world generator version", beside a `.db` holding terrain edits and builds ([xgamingserver docs](https://xgamingserver.com/docs/valheim/world-save-files), search summary).
- **Measured sizes** ([bench.mjs](../prototypes/edits/bench.mjs) `sizes`, [codec.mjs](../prototypes/edits/codec.mjs), [synth.mjs](../prototypes/edits/synth.mjs); 20 synthetic logs per row on the 96×64 reference grid; URL characters include a 26-character prefix; medians [min–max]).

  | Encoding of the mixed log | 10 ops | 100 ops | 1,000 ops | 10,000 ops |
  |---|---|---|---|---|
  | JSON objects | 204 | 645 | 4,440 | 40,309 |
  | JSON arrays | 197 | 565 | 4,068 | 38,174 |
  | Binary rows, absolute cells | 94 | 435 | 3,434 | 32,372 |
  | Binary rows, delta cells | 90 | 371 | 2,705 | 24,569 |
  | **Binary columns, delta cells** | **90 [82–136]** | **326 [266–409]** | **2,047 [1,862–2,225]** | **17,083 [16,454–17,504]** |
  | Per-cell override layers | 94 | 588 | 4,495 | 20,009 |

  - The columns put each field in its own stream, so deflate sees runs of like values: 24% smaller than rows at 1,000 ops and 30% at 10,000.
  - Per-cell layers win only for street tile painting, where strokes overwrite the same tiles: 1,367 against 1,728 characters at 1,000 ops.
  - A 200×150 grid, standing in for M8's 30,000-cell mesh, changed the columnar size by 0–4%.
- **Materialised world** ([regen.py](../prototypes/edits/regen.py) `sizes`, 20 seeds, CPython zlib 1.3.1.zlib-ng level 9). Elevation as Int16, five byte columns, receivers as direction bytes, settlements, roads as direction chains, wonders and landmarks: 50,658 B raw [50,345–51,099], 19,848 B deflated [17,572–22,466].

### Inferences

- **Why stage inputs, not patches.** The reference generator is a strict chain, so an edit means something only as an input to a stage. A patch on a stage's output is erased whenever an upstream stage reruns. FMG offers both, as its Keep and Erase heightmap modes (section 2).
- **Why per-stage layers, not one global log.** Inside a layer, order matters: paint over paint is last-writer-wins, and clamped elevation deltas do not commute. Across layers, each stage applies only its own ops, so order cannot matter. The editor's global undo log can therefore be stably partitioned by layer at save time without changing the world.
- **The three models against Nomos's needs:**

  | Need | Seed + ordered log | Per-layer per-cell diffs | Materialised state | Per-stage edit layers (recommended) |
  |---|---|---|---|---|
  | Share link at 1,000 edits | 2.0–2.7k chars | 4.5k chars | 26k chars | 2.0k chars |
  | Keeps brush intent and undo | Yes | No | No | Yes (editor log) |
  | Survives upstream regeneration | Only if ops are stage inputs | Yes, with dormant cells | No | Yes |
  | Needs the old generator to load | Yes | Yes | No | Yes, unless the cache is present |
  | Migration burden | Op format only | Layer format only | Every field (FMG: 2,376 lines) | Op format only |

- **The cache.** A local save may store the materialised arrays beside the layers, keyed by `fingerprint(seed, versions, layers)`. Loading checks the fingerprint, so a stale cache is rebuilt and never trusted. The cache makes loads instant and lets a save open even if a generator version is ever lost.
- **Compaction is optional.** Dropping ops fully covered by later ops in the same layer is deterministic. Per-cell compaction is worth adding only for place tile layers, and only if real sessions turn out to be paint-heavy (YAGNI).

### Gaps

- No real Nomos editing sessions exist. The four action mixes are unsourced estimates, and strokes are random walks.
- The NMS limits come from one player study, not from Hello Games.
- Valheim's format is from search summaries only, and Cities: Skylines save internals were not opened beyond the container.

## 2. Locks and partial regeneration

### Takeaway

- **The reference generator is a strict chain of ten stages, so an edit invalidates its own stage and every later one.** Elevation and coastline edits rerun everything from rain on. Biome paint reruns settlements onward. Settlement edits rerun farmland, roads, wonders and landmarks. Roads rerun only landmarks and place contexts. Names rerun nothing.
- **Without locks, one small edit rebuilds many places.** Over 30 seeds, with a median of 46.5 settlements per world, a radius-2 valley changed a median of 25 place layouts [0–45], and adding one village changed 35 [14–50] (measured here).
- **Locking every settlement cuts that to 5 [0–51] and 23 [7–42]. Keying draws by stable ids then cuts the village case to 2 [1–6].** Today's generator keys place seeds and landmarks by population rank, so inserting a village still re-rolls its neighbours (section 3).
- **Locks create conflicts that must be shown, not resolved silently.** A locked town ended up in new water in 4 of 30 valley edits. A plain delete always respawned a replacement settlement (30 of 30), because the stage refills its target count.
- **Partial reruns are a speed-up, never a semantic.** Seed-only noise is 82–98% of the slowest stages, so caching it makes an elevation edit's rerun about 20% of a full generate. Settlement-onward reruns already cost only about 9% (CPython, measured here).

### Cited Findings

- **Stage order and data flow in `tools/worldgen`** (opened: `world.py`, `terrain.py`, `drainage.py`, `climate.py`, `settle.py`, `roads.py`, `features.py`, `rng.py`, `model.py`; `place.py` in parts):

  | # | Stage | Reads | Writes |
  |---|---|---|---|
  | 1 | Shape | seed (`SHAPE`, `ELEVATION`, `RIDGES` streams) | template, raw elevation, ocean |
  | 2 | Rain | raw elevation, ocean | rain, wind side |
  | 3 | Drainage | raw elevation, ocean, rain | eroded elevation, lakes, receivers, flow, rivers |
  | 4 | Climate | elevation, rain, water, rivers | temperature, moisture, coast type |
  | 5 | Biomes | elevation, temperature, moisture, ocean, lakes, rivers, coast | biome |
  | 6 | Settlements | habitability from biome, elevation, rivers, coast, climate, slope | sites; ids in population order, id 0 the capital |
  | 7 | Farmland | biome, settlements | farmland around each settlement |
  | 8 | Roads | biome (cover cost), elevation, rivers, receivers, settlements | road paths, bridges |
  | 9 | Wonders | terrain, climate, distances to towns (≥ 2) and cities (≥ 3) | 4–8 wonders |
  | 10 | Landmarks | settlement tier, site and **id** (keyed draws), coast, roads and bridges (viaducts), wonder cells | in-place landmarks, lighthouses, viaducts, observatories |
  | – | Place contexts | the cell's layers; seed `draw(world seed, PLACE, 0, settlement id)` | `PlaceContext` |
  | – | Place layout | the context's biome, temperature, moisture, tier, sea, coast, river, roads, landmarks, wonder and seed; never `population` or `name` | layout |

- **Which edit reruns what** (computed from the table above):

  | Edit | First stage rerun | What can change downstream |
  |---|---|---|
  | Elevation brush, coastline | 2 Rain | Rivers, lakes, climate, biomes, all settlements, roads, wonders, landmarks, every context |
  | River or lake carve, as a channel in elevation | 2 Rain (3 if forced after drainage) | As above, smaller in practice |
  | Biome paint | 6 Settlements | Habitability, sites, farmland, road costs, wonders, landmarks |
  | Settlement add, move, delete, re-tier | 6 Settlements | Ids and tiers by rank, farmland, roads, wonders (town distances), landmarks |
  | Road add or remove | 8 Roads | Viaducts; context road sides |
  | Wonder place or move | 9 Wonders | Landmarks avoiding its cell; its own context |
  | Landmark add or remove | 10 Landmarks | Contexts only |
  | Rename | none | Nothing; the name filter only |
  | Place-level edit | the place only | That place's layout |

- **FMG declares its order as data and treats it as the dependency graph.** "The execution order _is_ the dependency graph." An earlier `dependsOn` design "always named the immediately preceding step", so it was removed ([generation-pipeline.md @354eeaa](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/docs/architecture/generation-pipeline.md), opened).
- **FMG offers three ways to apply a heightmap edit** (same document, opened):
  - Erase "clears `pack.cultures/burgs/states/provinces/religions`" and reruns every step from `markupGrid` to `zones`.
  - Keep "copies edited grid heights into the existing pack cells" and touches nothing else, "which is why the coastline cannot change".
  - Risk rebuilds the graph but preserves entities. It re-runs hydrology, climate and the repack, restores the graph overrides and "re-locates each burg, culture and province centre". The economy is rebuilt "because cell ids no longer match".
- **FMG's locks keep features, but its regeneration is neither keyed nor id-stable** ([burgs-generator.ts @354eeaa](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/burgs-generator.ts), [routes-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/routes-generator.ts), [states-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/states-generator.ts), all opened):
  - `Burgs.regenerate` places locked burgs first into its spacing tree, then fills the rest from `cells.s.map(value => value * Math.random())`.
  - Locked burgs are renumbered: `lockedBurg.i = newId`.
  - `Routes.regenerate` keeps locked routes and calls `this.generate(lockedRoutes, Math.random())`.
  - States refuse to regenerate when every state is locked: "Unable to regenerate as all states are locked".
  - Burgs, states, cultures, routes and markers each have `setLocked`, and FMG notes "Anything that rebuilds burgs, states or provinces must rebuild the economy too".
- **Blast radius on the reference generator** ([regen.py](../prototypes/edits/regen.py) `blast`; 30 seeds, one keyed edit of each kind per seed, compared with the unedited world; medians [min–max]). "Free" lets every stage regenerate. "Locked" pins every existing settlement and fixes the count. "Layouts changed" counts settlements whose place seed or layout-relevant context changed, plus new ones.

  | Edit | Free: layouts changed | Free: rank ids changed | Locked: layouts changed | Locked: conflicts |
  |---|---|---|---|---|
  | Raise +200, radius 2 | 10.5 [0–47] | 6 [0–33] | 4 [0–15] | 0 |
  | Lower −150, radius 2 | 25 [0–45] | 16 [0–39] | 5 [0–51] | town in new water, 4 of 30 |
  | Paint conifer, radius 2 | 0 [0–34], nonzero in 8 of 30 | 0 [0–30] | 0 [0–3] | 0 |
  | Add a village | 35 [14–50] | 26.5 [11–47] | 23 [7–42] | 0 |
  | Add a road | 0 [0–3], nonzero in 10 of 30 | 0 | 0 [0–3] | 0 |
  | Delete a settlement | 10 [1–44]; a replacement appeared in 30 of 30 | 6.5 [0–22] | 22 [2–44] | 0 |

  - Locks also cut changed road cells, for example 84 → 13.5 for the valley, and changed biome cells 48 → 18.
  - Under locks, "add a village" and "delete" still shifted a median of 21 rank ids, and through them the landmark draws of 8.5–10.5 settlements. Section 3 tests keying those by cell.
  - Wonders moved after 16 of 30 raises without locks and 15 of 30 with them, because wonder sites read terrain directly.
- **Stage timings** (`regen.py stages`; CPython 3.14.6, 5 seeds × 2 timed repeats after one warm-up; Windows load 74% before and 48% after, with other research jobs running; a desktop, not a phone):

  | Stage | Median ms [min–max] | Share |
  |---|---|---|
  | Shape | 739 [682–799] | 47.7% |
  | Rain | 8.0 [6.8–11.7] | 0.5% |
  | Drainage | 112 [91–139] | 7.2% |
  | Climate | 542 [509–635] | 35.0% |
  | Biomes | 6.8 [4.7–15.2] | 0.4% |
  | Settlements | 26 [18–28] | 1.7% |
  | Farmland | 3.5 [2.9–4.8] | 0.2% |
  | Roads | 65 [40–76] | 4.2% |
  | Wonders | 44 [31–65] | 2.8% |
  | Landmarks | 3.9 [2.7–5.4] | 0.3% |
  | Total | 1,551 | 100% |

- **Seed-only noise dominates the slow stages** (one seed, median of 3 runs): shape takes 725 ms, of which relief noise is 507 ms and coast wiggle 87 ms. Temperature takes 210 ms, of which noise is 205 ms; moisture takes 351 ms, of which noise is 302 ms. These fields depend only on (seed, cell), so edits never change them (measured here).

### Inferences

- **Proposed rule set.**
  1. **One declared stage list.** Like FMG's pipeline, but each stage also names the layers it reads, so the editor knows the first dirty stage. A full rerun and a partial rerun must give identical bytes; a CI test compares them for random edit logs.
  2. **Edits are stage inputs.** Each stage applies its own layer's ops at a fixed point, for example elevation deltas after shape and biome paint after classification. Ops never patch a later stage's output.
  3. **Hand-placed features are pins.** The stage places them first, counts them in spacing, routing and wonder-distance rules, and never moves or renumbers them. FMG renumbers locked burgs; Nomos must not.
  4. **A lock is a pin of a generated feature.** Locking copies the generated record (cell, tier, population band, landmarks) into the layer under its stable id. Any settlement with place edits or a custom name is locked automatically.
  5. **Delete is a tombstone that also lowers the count.** Otherwise the stage refills the slot, as it did in 30 of 30 deletes.
  6. **Rerolls are keyed, never random.** "Regenerate settlements" adds a reroll counter to that layer and mixes it into the stage's draw keys. It is one logged op, so the result replays; FMG's `Math.random()` rerolls cannot.
  7. **Conflicts block play but never delete edits.** A pin made invalid upstream (a town now in a lake) stays in its layer, flagged. Paint that no longer fits (forest on new water) goes dormant and returns if the upstream edit is undone. FMG silently skips stale overrides; Nomos should list them.
  8. **Per-entity draws use stable ids.** Place seeds, landmark draws and names key on the settlement uid, never on population rank (section 3).
  9. **The generator version is pinned per world** (section 5).
- **Cache seed-only fields.** Relief, wiggle, temperature and moisture noise are pure functions of (seed, cell). Cached in the worker, they cut an elevation edit's rerun to about 305 of 1,551 ms in CPython, about 20%. That is rain, drainage, climate minus its 507 ms of noise, then biomes through landmarks (computed from the measured parts). A TypeScript port should be several times faster, but that is unmeasured.
- **Live preview.** At these costs the editor can rerun from the dirty stage on mouse-up, and preview a brush stroke by rerunning only the stage it touches while dragging.
- **Why not FMG's Keep mode.** Keep would let a mountain stand without rain shadow or rivers, so climate and drainage would disagree with the terrain. That suits a map drawing, not a simulation whose farms read the climate.

### Gaps

- All timings are CPython on a loaded desktop. The TypeScript port and phones are unmeasured.
- The edits are synthetic: one random location per seed, radius 2. Real users will make bigger, clustered changes.
- Wonder and landmark changes were counted, not their effect on wonder views.

## 3. Cross-zoom propagation and identity

### Takeaway

- **Country edits reach places only through two inputs: the place seed and the PlaceContext.** A place is `build(context, place generator version)` plus its own edits, so propagation is deterministic by construction.
- **Today's generator keys place seeds and landmark draws by population rank, so unrelated edits re-roll towns.** A new place seed rebuilds a town completely: 37.3% of terrain cells changed and 0% of houses stayed put (measured here, 30 places).
- **Key every per-settlement draw by a stable uid; with locks the blast radius collapses.** With both, adding a village changed a median of 2 place layouts [1–6], against today's 35 [14–50]. A delete changed 2 [0–5] against 10 [1–44] (measured here, 30 seeds).
- **Structural context changes rebuild a place, so place edits must be generator inputs.** One extra river side kept 0% of houses (median) and would make 80.8% of houses pinned at their old tiles collide. One extra road side would make 12.5% collide. Temperature, moisture and population changes rarely matter (measured here).
- **Place edits survive country regeneration if they are:** stored per place uid with the place generator version and a context hash; applied as pins before houses are placed; anchored to generator-emitted object ids; and listed as dormant, never dropped, when they no longer fit. Round 4's "per-settlement edit diffs" become per-place op layers.

### Cited Findings

- **How a place gets its inputs** (opened: `world.py`, `model.py`, `place.py`):
  - `place_contexts` builds one `PlaceContext` per settlement with seed `draw(world.seed, PLACE, 0, s.id)` and name `f'{s.tier}-{s.id}'`. Wonders use `draw(world.seed, PLACE, 1, WONDERS.index(p.kind))`.
  - Settlement ids come from population order (`settle.settle`), and landmark chances and order are keyed by `s.id` (`features.landmarks`).
  - `place.build(ctx)` reads `biome` 22 times, `tier` 17, `sea` 12, `seed` 6, `moisture` 5, `river` 5, `wonder` 5, `coast` 4, `temperature` 3, `landmarks` 3 and `roads` 2. It never reads `population` or `name` (counted here).
  - Houses are placed in a loop over attempt index `i` and unit `u`, and styles are keyed by `(i, u)`. Each lot comes from `find_lot`, whose cost depends on everything laid before it. River carving accepts an `avoid` set (`carve_river`).
- **Layout churn when one context field changes** ([regen.py](../prototypes/edits/regen.py) `places`; 10 seeds × 1 town-or-city and 2 villages-or-hamlets = 30 places; medians [min–max]):

  | Change | n | Terrain cells changed | Houses unchanged | Civic buildings unchanged | A house pinned at its old tiles would collide |
  |---|---|---|---|---|---|
  | Population × 2 (control) | 30 | 0% | 100% | 100% | 0% |
  | Temperature + 8 | 30 | 0% [0–83] | 100% | 100% | 0% |
  | Moisture + 8 | 30 | 0.2%, max under 0.5% | 100% | 100% | 0% |
  | Landmark + 1 | 13 | 0% | 100% [42–100] | 100% [62–100] | 0% [0–55] |
  | Biome swap | 30 | 6.3% [2–11] | 100% [50–100] | 66.7% [50–93] | 0% [0–29] |
  | Road side + 1 | 18 | 1.1% [0–22] | 87.5% [0–100] | 100% [33–100] | 12.5% [0–100] |
  | River side + 1 | 29 | 22.3% [2–46] | 0% [0–100] | 25% [0–100] | 80.8% [0–100] |
  | Place seed + 1 | 30 | 37.3% [13–57] | 0% [0–4] | 0% [0–67] | 87.5% [60–100] |

  - The collision column (`regen.py pins`) counts original house footprints that would overlap water, roads, paving or another building in the rebuilt layout.
  - The temperature maximum of 83% is a threshold crossing: `place.py` switches to desert ground when moisture is under 70 and temperature over 165.
  - The same place built twice was byte-identical.
- **Stable ids against rank ids** (`regen.py blast` and `uid`; 30 seeds; median 46.5 settlements per world). "Rank keys" is today's generator. "Uid keys" keys place seeds and landmark draws by the settlement's cell. Each cell gives layouts changed, median [min–max]:

  | Edit | Rank keys, free | Uid keys, free | Rank keys, locked | Uid keys, locked |
  |---|---|---|---|---|
  | Raise +200, radius 2 | 10.5 [0–47] | 5.5 [0–41] | 4 [0–15] | 4 [0–15] |
  | Lower −150, radius 2 | 25 [0–45] | 10.5 [0–34] | 5 [0–51] | 4.5 [0–14] |
  | Add a village | 35 [14–50] | 10.5 [3–34] | 23 [7–42] | 2 [1–6] |
  | Delete a settlement | 10 [1–44] | 5 [1–37] | 22 [2–44] | 2 [0–5] |

  - Under locks and uid keys, what remains is road sides near the edit (median 1–2 contexts) and moisture or river sides beside terrain edits.
  - Without locks, the stage still re-sites 1–5 settlements per edit and re-tiers 0–2.5 by rank (medians).
- **Round 4 planned this split.** Saves "keep only edits and the generator version". Street maps are generated on zoom from `hash(worldSeed, settlementId, generatorVersion)` plus a context record, and the save format has "per-settlement edit diffs" ([round 4 report](../../round-4-multi-scale/report.md); [world-maps notes, Q7](../../round-4-multi-scale/notes/world-maps.md), both opened).
- **FMG's override anchor** stores the original value with each edit and skips the edit when the regenerated original differs (section 1). FMG's Risk mode re-locates burgs and culture centres onto a rebuilt graph instead of keeping ids (section 2).

### Inferences

- **Identities:**

  | Thing | Identity | Changes only when |
  |---|---|---|
  | World | format, country and place generator versions, seed, size; checked by fingerprint | Any of these changes |
  | Cell | Index in the pinned generator's scanline order (grid, or jittered-grid mesh) | The generator version or map size changes |
  | Generated settlement | uid = its cell when generated | Regeneration sites it on another cell, making it a new place; locked ones never move |
  | User-made settlement | uid = cell count + a counter, never reused | Never; a user move keeps the uid |
  | Wonder | Its kind while each kind appears at most once; its cell if the editor allows repeats | — |
  | In-place landmark | (settlement uid, kind) | — |
  | Map landmark | (kind, cell) | — |
  | Road | Unordered pair of settlement uids; the path is derived | An end is deleted |
  | River | None; derived from elevation, edited as a channel carve | — |
  | Culture | Round 8's stable culture uid, plus its hearth cell | — |
  | Place seed | `draw(world seed, PLACE, 0, uid)`, under the pinned place generator version | — |
  | Place object | Ids the place generator emits: house `(i, u)`, civic building by name, field by index | A rebuild may drop or move it |
  | Place edit layer | (place uid, place generator version, context hash) | The context hash changes, which triggers a rebase |

- **Why uid = cell for generated settlements.** It is free, unique (one settlement per cell) and survives rank changes. A regenerated village on the same cell is meaningfully "the same place", so it keeps its seed and name. Names (M8's foswig chain) must key on the uid too, or a rank change renames towns.
- **Propagation rule.** After any country edit, recompute every context and hash its layout-relevant fields. A place whose hash and seed are unchanged keeps its layout and edits untouched. Any other place rebuilds and rebases its edits.
- **Rebase rule for place edits:**
  1. **Pins in.** Moved or added buildings, painted water and moved roads become reservations. They pass to `build` before water, roads and houses are laid, through the existing `avoid` hooks. The generator flows around them; a post-hoc patch would collide in 12.5–87.5% of cases.
  2. **Patches out.** Cosmetic edits (props, trees, tile variants) apply after generation, only on tiles still free.
  3. **Anchor and check.** Each op names its generator object id and the original value, like FMG's `GraphOverride`. If the regenerated original differs, the op goes dormant and is listed.
  4. **Never drop.** Dormant ops stay in the layer and revive if the country edit is undone.
- **A place with street-level edits locks itself at country level** (section 2, rule 4): its cell, tier and uid hold. The user may also add a context lock. Then any country edit that would change the place's context becomes a conflict, shown before it applies. A lock refuses such edits rather than freezing a stale context, so the country map and the street never disagree.
- **Cheap stability.** Quantising temperature and moisture in the context to the bands `place.py` actually thresholds would stop small climate shifts from rebuilding places at all. It costs nothing, since the generator only compares those values against fixed cut-offs (inference from the 0% medians and the 83% threshold case).
- **Wonders and towns placed by users.** A placed wonder changes its own view, any landmark or observatory spacing near it, and nothing in towns, because towns never read `wonder`. An added town changes its own place and the road sides of 0–5 neighbours.

### Gaps

- Pins as generator inputs were not prototyped in `place.py`. Only the collision rate of post-hoc patches was measured.
- Mesh cell ids (M8) may not be scanline-ordered; if the mesh is regenerated, uid = cell needs a remap table.
- Route-strip views and district interiors (M9) were not covered.

## 4. Validation and guardrails

### Takeaway

- **Validate when the user presses Play or Share, and again on every open.** Hard errors block play: a settlement with no road or sea lane, a town in water, an unfiltered name, a payload over its caps. Soft findings label the world instead.
- **Reachability must count sea lanes.** Generated worlds already leave 97 of 979 settlements (9.9%) with no land route to the capital, in 8 of 20 worlds. So the rule is "connected by roads or sea lanes", rechecked after every edit (measured here).
- **Food must be checked per country or region, not per town.** 10% of generated villages and 17% of hamlets have no farmland in their field radius. Country food land spans 0.77–4.80 farmable cells per 1,000 people (median 2.06). A per-town rule would reject generated worlds (measured here).
- **Culture fairness cannot come from random hearths.** Over 20 worlds, random hearth layouts gave a people-weighted land-quality gap of 39.8% (median), and only 1% came within 10%. Population shares differed 47× because one region holds the capital. Only 1 of 769 Poisson-disc layouts and 0 of 723 uniform ones met both bars (measured here).
- **So users should not place hearths in v1.** The generator re-places them after every edit, and round 8's after-spin-up development check decides. Typed names pass round 8's filter on save and again on open, in ASCII only. Links never carry free text, people's names or URLs.

### Cited Findings

- **Reachability on generated worlds** ([regen.py](../prototypes/edits/regen.py) `checks`, 20 seeds): 97 of 979 settlements (9.9%) sit on a landmass without the capital, in 8 of 20 worlds. The reference roads stage builds a spanning tree per landmass only (`roads.py`, opened), and round 4 planned sea lanes where no land path exists ([round 4 report](../../round-4-multi-scale/report.md)).
- **Edits can cut reachability.** In the blast runs, the land-route count to the capital changed after 1 of 30 raises, 1 of 30 valleys and 7 of 30 village additions. For example, a new lake split a landmass, or a new village landed on an island (section 2 data).
- **Food land** (`checks`, 20 seeds; farmable means farmland, grassland or broadleaf forest within the field radius plus one):

  | Tier | n | Farmable cells, median [min–max] | Farmland, median | With no farmland |
  |---|---|---|---|---|
  | Capital | 20 | 37 [25–49] | 26 | 0% |
  | City | 87 | 23 [7–29] | 14 | 0% |
  | Town | 193 | 21 [0–29] | 13 | 1% |
  | Village | 462 | 11 [0–13] | 5 | 10% |
  | Hamlet | 217 | 10 [0–13] | 5 | 17% |

  Farmland is laid only on grassland and broadleaf forest (`settle.farm`, opened), so settlements in conifer, hills, marsh or sand get none.
- **Hearth fairness** (`checks`, 20 seeds × 40 layouts each of 4–8 hearths on the capital's landmass). Regions grow by multi-source Dijkstra with road cover costs, and quality is the generator's habitability score:

  | Layout | Area-mean quality gap | People-weighted quality gap | Within 10% / 20% / 30% (people-weighted) | Largest ÷ smallest population share |
  |---|---|---|---|---|
  | Keyed Poisson-disc, 12-cell spacing | 65.0% [8.4–218] | 39.8% [6.1–79.6] | 1% / 4% / 23% | 46.6× |
  | Uniform random (a user clicking anywhere) | 65.3% [7.8–231] | 40.3% [5.1–80.7] | 1% / 5% / 23% | 59.4× |

  Both bars at once (people-weighted gap ≤ 10% and shares ≤ 2×) held for 1 of 769 Poisson-disc layouts and 0 of 723 uniform ones. Rejection sampling found such a layout within 40 tries in 1 of 20 worlds.
- **Round 8's rules**: reject hearth layouts whose cultures differ in mean land quality or development beyond a set tolerance. The tolerance is "not designed" yet ([round 8 report](../../round-8-cultures/report.md), decision (r) and verify-first table).
- **Round 8's name filter** ([round 8 report](../../round-8-cultures/report.md), section 2 and M3 tasks):
  - distinctive Pokémon town, city and species names, at edit distance 1 up to 5 letters and 2 above;
  - the "poke" and "-mon" bans;
  - LDNOOBW lists, exact for 3-letter entries and substring for 4+;
  - real festival names, and a real-world fixture of countries, demonyms, languages, ethnonyms and religions.
- **LDNOOBW is explicitly subjective.** Its maintainers say "what goes in these lists is subjective" and built it for autocomplete, not for moderating input. The English list has 403 lines at commit 5faf2ba ([README](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/blob/5faf2ba42d7b1c0977169ec3611df25a3c08eb13/README.md), opened; lines counted here).
- **ASCII-only is the strictest Unicode restriction level.** UTS #39 defines it as "All characters in the string are in the ASCII range", which rules out mixed-script confusables ([UTS #39 revision 34, 27 Aug 2026](https://www.unicode.org/reports/tr39/), opened).
- **Content-in-URL sites attract abuse.** itty.bitty compresses whole pages into the URL fragment. A urlquery report flagged an itty.bitty link as malicious through DNS4EU ([itty-bitty README](https://github.com/arfct/itty-bitty/blob/25aa3cd78b53d80b6625774d61ef98d1e1ba9e3b/README.md), opened; abuse reports search summary).
- **The server never sees a fragment.** "Fragment identifiers used within URI references are not sent in requests" ([RFC 9110 §17.11](https://www.rfc-editor.org/rfc/rfc9110#section-17.11), opened). A static host therefore holds no copy of shared worlds to moderate or take down.

### Inferences

- **Proposed checks, cheapest first:**

  | Check | Kind | Rule |
  |---|---|---|
  | Payload caps | Hard, on open | ≤ 32 KiB of link, ≤ 1 MiB inflated, ≤ 20,000 ops, every field in range, CRC32 matches (section 5) |
  | Names | Hard, on save and open | Round 8's filter on a normalised form; ASCII letters, space, hyphen and apostrophe; 2–24 characters |
  | Pins valid | Hard | No settlement or wonder in water or off the map; no two settlements on one cell |
  | Reachable | Hard | Every settlement joins the capital by roads or sea lanes |
  | Food | Hard below the generated minimum, soft below the median | Country food capacity per 1,000 people ≥ the lowest generated world (0.77 farmable cells here) |
  | Culture fairness | Hard for generator-placed hearths, through re-placement | Round 8's after-spin-up development tolerance |
  | Content rules | By construction | See below |

- **Food in the sim's own units.** The farmable-cell count is a stand-in. Once M7 exists, the check should use the ledger's production capacity, so the editor and the sim agree.
- **Why users should not place hearths yet.** Random placement nearly always fails any tight tolerance, and the capital's region dominates population before spin-up. Users choose the number of cultures (4–8). After each edit the generator re-places the hearths by a keyed search. It then runs the 50–100-year spin-up, about 0.14 s for 1,000 settlements (round 8). If a later version adds a hearth tool, it must pass the same check, with a live meter and an "auto-balance" button.
- **Users placing towns** shift development between culture regions. The same re-placement and after-spin-up check catch this, so no separate rule is needed.
- **Names, step by step:**
  1. Normalise: NFKC, lower case, strip anything outside the allowed set, map common digit swaps (0→o, 1→i, 3→e, 4→a, 5→s, 7→t), collapse repeats.
  2. Filter the normalised form with round 8's lists. The real-world fixture matters most here, because a town named after a real people would put that name on crime map modes.
  3. Culture and festival names also pass round 8's hierarchy-word lint and a crime-word list, since culture must never sit next to crime.
  4. There are no user-named people in v1. A real person's name on an arrest log is a defamation risk, and round 8 keeps personal names UI-generated.
- **Content rules hold by construction, not by checking user art.**
  - House styles a user paints are cosmetic. No sim rule reads them, so household-to-home assignment stays style-blind and wealth never shows (content rule 5).
  - No tool can dress, mark or label an individual agent (rules 3 and 4).
  - The editor offers no "rich" or "poor" style presets.
  - Police staffing comes from the ledger, never from the user, and housing ignores culture. So moving a station inside a town cannot target a culture (round 8).
- **Moderation without a backend:**
  - The viewer's client is the only moderator. It re-filters every name on open, whatever the sender's filter version.
  - User worlds open with a "made by a player" badge and a one-click "hide custom names", which swaps in generated names.
  - "Report" opens a pre-filled email to the owner with the link's hash, and hides the world locally.
  - Each deploy can ship a small static blocklist of reported link hashes, so reports take effect without a server.
  - A curated gallery is possible as reviewed files in the repo, moderated by pull-request review.
- **Keep links text-light.** No descriptions, URLs or free text means a hostile link can show at most a few filtered 24-character names. That keeps the itty.bitty failure mode, arbitrary content on a trusted domain, out of reach.

### Gaps

- The farmable-cell measure is cosmetic in the reference generator. Real food capacity awaits M7's production model.
- The fairness runs used habitability as land quality and no spin-up. Round 8's tolerance is still undesigned, and post-spin-up gaps were not measured.
- No moderation or legal source was found for static, backend-free share links. Whether a site that never stores user content has hosting duties is a legal question for the owner, and this is not legal advice.
- Filter evasion (spacing, homoglyphs beyond ASCII, multilingual slurs) was not tested.

## 5. Saves, share links and versioning

### Takeaway

- **Link format:** `https://<host>/#w1.` plus base64url of deflate-raw over the columnar edit layers and a CRC32. The payload rides in the fragment, which browsers never send to the server. So Cloudflare's 16 KB URL cap and server logs never see it.
- **What fits** (mixed edits, 96×64 reference grid, 20 logs):

  | Link length | Edits that fit |
  |---|---|
  | 2,000 characters | about 980 [880–1,092] |
  | 8,000 characters | about 4,550 [4,240–4,680] |
  | 16,000 characters | about 9,340 |

  Logs heavy in names fit about half as many: 557 and 2,535. For one log, 10, 100, 1,000 and 10,000 edits take 90, 326, 2,047 and 17,083 characters, plus about 7 for the CRC (measured here).
- **When to fall back:**
  - Up to 2,000 characters, use a plain link: it fits a QR code (2,953 bytes) and a free Discord message (2,000 characters).
  - From 2,000 to 8,000, use a link with a "long link" note; 8,000 octets is RFC 9110's recommended minimum.
  - Above 8,000, offer a `.nomos` file holding the same bytes, or "copy as text".
- **Codec cost is negligible.** Encoding plus decoding took under 0.6 ms at 1,000 edits, and 6.5 ms plus 0.8 ms at 10,000 (Node 24, desktop, not a phone). Caps stop a 65 KB payload that would inflate to 64 MiB in under 1.1 ms. The CRC32 turned 372 silently wrong decodes of 9,859 corrupted links into 0 (measured here).
- **Pin generator versions; never migrate silently.** Every world records its country and place generator versions. Released versions are frozen by golden fingerprints and kept as lazy chunks, about 20 KB gzip each by a source-size proxy. Upgrading is an explicit "rebuild on the new generator" that reports conflicts.
- **Edits are initial state.** A run is (world definition, config, input log), and the world's fingerprint in the link proves the rebuild matched. Mid-run edits, if ever allowed, are timed inputs at a day boundary, recorded with the new fingerprint.

### Cited Findings

- **Fragments stay in the browser.** "Fragment identifiers used within URI references are not sent in requests" ([RFC 9110 §17.11](https://www.rfc-editor.org/rfc/rfc9110#section-17.11), opened). A fragment is "dereferenced solely by the user agent" ([RFC 3986 §3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5), opened).
- **URL length limits:**
  - "It is RECOMMENDED that all senders and recipients support, at a minimum, URIs with lengths of 8000 octets" ([RFC 9110 §4.1](https://www.rfc-editor.org/rfc/rfc9110#section-4.1), opened).
  - Chromium: `kMaxURLChars = 2 * 1024 * 1024`, the "Max GURL length passed between processes" ([url_constants.h](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/url/url_constants.h), opened).
  - Firefox: `network.standard-url.max-length` is 1,048,576, "The maximum allowed length for a URL - 1MB default" ([StaticPrefList.yaml @4b5e436](https://github.com/mozilla-firefox/firefox/blob/4b5e436b8bc908fe7feb7341209140771397dda1/modules/libpref/init/StaticPrefList.yaml), opened).
  - Safari: about 80,000 characters, with no published limit (search summary).
  - Cloudflare: "URLs have a limit of 16 KB. Request headers have a total limit of 128 KB" ([Connection limits, updated 23 Jul 2026](https://developers.cloudflare.com/fundamentals/reference/connection-limits/), opened). This covers path and query only, since fragments are not sent.
- **Where links travel:**
  - A QR code holds at most 2,953 8-bit bytes ([Denso Wave: QR Code standards](https://www.qrcode.com/en/about/standards.html), opened). Base64url uses lower-case letters, which QR's alphanumeric mode lacks, so a link needs byte mode (inference).
  - Discord messages are capped at 2,000 characters, or 4,000 with Nitro (third-party guides, search summary).
- **Browser support** (MDN browser-compat-data @d295504, opened):
  - `CompressionStream('deflate-raw')` arrived in Chrome 103, Firefox 113 and Safari 16.4.
  - Brotli in `CompressionStream` is in Firefox 147 and Safari 18.4, but not Chrome.
  - `Uint8Array.prototype.toBase64` and `fromBase64` arrived in Chrome 140, Firefox 133, Safari 18.2 and Node 25.
  - Sharing files through the Web Share API works in Chrome Android 76 and Safari 14, but not Firefox.
- **Prior art for state in URLs:**
  - Mermaid Live Editor serialises its state as JSON, deflates it at level 9 with pako, encodes base64url and writes `#pako:<data>` into the hash. A prefix-less old link still decodes as plain base64 ([serde.ts @6a612aa](https://github.com/mermaid-js/mermaid-live-editor/blob/6a612aa996cde944394710232998bfec14f7a213/src/lib/util/serde.ts), [state.svelte.ts](https://github.com/mermaid-js/mermaid-live-editor/blob/6a612aa996cde944394710232998bfec14f7a213/src/lib/util/state.svelte.ts), opened).
  - The TypeScript Playground reads `#code/` with lz-string and still accepts the "old school" `#src=` ([getInitialCode.ts @6556b08](https://github.com/microsoft/TypeScript-Website/blob/6556b08756b766fd41d0f887174cb0b042e5f72c/packages/sandbox/src/getInitialCode.ts), opened).
  - Factorio puts a version in front and a CRC32 at the end (section 1).
- **Decompression bombs:** deflate's theoretical limit is 1032:1, and zlib's implementation reaches "about 1030.3:1" ([zlib technical details](https://zlib.net/zlib_tech.html), opened). At Chromium's 2 MiB URL cap, a hostile link could therefore inflate to about 1.5 GB (computed).
- **Atomic local saves:** a `FileSystemWritableFileStream` leaves "either... its old contents or... whatever data was written... until the stream has been closed". This is "typically implemented by writing data to a temporary file", and closing "is expected... to atomically update" the file ([WHATWG File System Standard](https://fs.spec.whatwg.org/), opened).
- **Prior art for versions** (section 1): Minecraft keeps old chunks and blends the seams; Dwarf Fortress copies its raws into every save; FMG migrates forward through 2,376 lines; Factorio writes the game version into every exchange string; Valheim stores a world generator version (search summary).
- **Codec timings** ([bench.mjs](../prototypes/edits/bench.mjs) `timing`; Node 24.18.0, V8 13.6.233.17, zlib 1.3.1; AMD Ryzen 5 3600 (6 cores, 12 threads), Windows 10 Pro 10.0.19045. CPU load was 14% before and 26% after by PowerShell; MSYS `/proc/loadavg` read 2.67 3.64 3.31 before and 3.60 3.81 3.37 after.) Encode runs canonical order, columns, CRC32, deflate level 9 and base64url; decode reverses it with caps, the checksum and range checks. Medians [min–max] per call:

  | Edits | Link chars | zlib encode | zlib decode | CompressionStream encode | CompressionStream decode |
  |---|---|---|---|---|---|
  | 10 | 96 | 0.043 ms [0.024–3.66] | 0.017 ms [0.011–0.55] | 0.281 ms [0.189–1.06] | 0.212 ms [0.181–1.66] |
  | 100 | 333 | 0.070 ms [0.047–1.03] | 0.055 ms [0.037–0.33] | 0.264 ms [0.202–0.63] | 0.169 ms [0.130–3.27] |
  | 1,000 | 2,144 | 0.491 ms [0.425–3.70] | 0.091 ms [0.071–3.23] | 0.662 ms [0.524–2.17] | 0.276 ms [0.176–1.44] |
  | 10,000 | 17,128 | 6.53 ms [5.87–9.00] | 0.813 ms [0.658–9.59] | 4.72 ms [4.19–11.4] | 0.984 ms [0.826–11.2] |

  Warm-up and samples were 200 and 400 for zlib and 50 and 100 for streams, or 20 and 60 at 10,000 edits. Each row is one log (salt 1). A run before the CRC was added gave the same picture within about 10%.
- **Compression level:** Node's `CompressionStream('deflate-raw')` produced exactly level-6 output, 0.7–1.7% larger than level 9. Brotli at quality 11 was 11–16% smaller at 1,000–10,000 edits, but Chrome lacks it in streams (measured here, 20 logs).
- **Caps** (`bench.mjs bomb`): 64 MiB of zeros deflated to 65,232 B (1029:1), an 87,002-character link.
  - A 32 KiB length cap rejected it in 0.09 ms.
  - `inflateRawSync` with `maxOutputLength` of 1 MiB rejected it in 0.6–1.1 ms.
  - A `DecompressionStream` reader counting bytes rejected it in 11.7 ms.
  - Uncapped, it inflated 64 MiB in 67 ms.
- **Corruption** (`bench.mjs corrupt`; 20 logs × 500 single-character changes):

  | Variant | Changes | Rejected | Decoded to a different world |
  |---|---|---|---|
  | No checksum | 9,859 | 9,412 | 372 (3.8%) |
  | CRC32 trailer | 9,859 | 9,793 | 0 |

  The CRC adds 7 [5–13] characters. All 3,494 truncations were rejected, by deflate's end-of-stream check and the column length checks.
- **Generator code size, as a proxy for a pinned version** (computed here): the Python reference sources gzip to 19,665 B for the country stages (64,632 B raw) and 21,425 B for places (80,792 B raw).

### Inferences

- **Link layout:** `#w1.` names the link format, like Mermaid's `pako:`. A new layout takes `w2.`, and decoders for every released prefix stay forever.
  - The payload holds: format byte, country generator version, place generator version, seed (u32), world fingerprint (u32), op count, the six column lengths and columns, then the CRC32.
  - Skin, zoom and camera, which M6 adds, ride as separate fragment keys, so a camera move never re-encodes the world.
- **One codec for links, files and saves.** A `.nomos` file holds the same bytes as a link payload. A local save adds sections: the canonical edit layers and an optional materialised cache keyed by fingerprint. The sim sections planned in rounds 4, 6 and 8 follow. Saves write through OPFS `createWritable` (atomic on close) or one IndexedDB transaction, after `navigator.storage.persist()`. That meets code.md's atomic, consistent and durable rules.
- **CRC32 in the browser** is a 256-entry table and a few lines, since no browser exposes zlib's `crc32`. The fingerprint is the end-to-end check, but it needs a full rebuild, so the CRC rejects bad links before any work starts.
- **Generator versioning policy:**
  1. Every world stores `worldgenVersion` and `placegenVersion`, and regeneration always uses them.
  2. A released version is immutable. CI holds golden `fingerprint` values for about 100 seeds per version, plus golden place-layout hashes. Any change in output needs a new version number, and the README's integer-only rule keeps the port engine-independent.
  3. Old versions ship as lazy chunks. At about 20–40 KB gzip per version pair, ten versions add 200–400 KB to the static host and nothing to the first load.
  4. "Rebuild on the latest generator" creates a new world from the same seed and layers, lists conflicts as in section 2, and keeps the old world. It is never automatic: Minecraft's seams and "buried" builds show the cost.
  5. If a version ever has to go, saves still open from their materialised cache. Links needing it show which version they need.
- **Edits as initial state.** The world definition (seed, versions, layers) is part of a run's identity, beside config and the input log. The editor's undo history is not.
  - Replays first rebuild the world, then compare the fingerprint, then run the inputs. A mismatch is an error, never a silent divergence, which also catches cross-engine bugs.
- **Mid-run edits, if ever, are timed inputs.** They apply at a day boundary and are logged like player commands (sim-core rule).
  - Cost: a terrain edit reruns about 305–1,551 ms of CPython generation. Round 6's day slices have a 0.35 ms budget, so the sim must pause for the edit, and the input records the new fingerprint.
  - Exactness: removing a town mid-run must move its people and cents through migration flows, keeping Σ = 0. Any watched place must fold and respawn through M9's machinery.
  - So v1 should allow world edits only before play, and later add cheap mid-run kinds such as names, or roads as construction projects.

### Gaps

- No phone or browser timings. Every timing is Node on a loaded desktop.
- Safari's URL limit and Discord's message cap come from search summaries. How chat apps (Slack, WhatsApp, X, SMS) truncate or wrap 2–8 KB links is untested.
- The source-size proxy for a generator version is Python, not the TypeScript port.
- Real editing sessions may have a different mix. The builder mix shows names halve the capacity.
