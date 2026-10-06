# Round 9 · Maps and world builder

Status: 6 October 2026. This report answers four questions:
- how each map layer gets made;
- whether Nomos needs a world builder, and for whom;
- how edits live on top of a seeded world;
- how to build an editor in the browser.

It draws on four sets of notes:
- [`notes/map-pipeline.md`](notes/map-pipeline.md);
- [`notes/builder-scope.md`](notes/builder-scope.md);
- [`notes/edits-and-saves.md`](notes/edits-and-saves.md);
- [`notes/editor-tech.md`](notes/editor-tech.md).

The notes give the full citations, and the prototypes are in [`prototypes/`](prototypes/).

Labels follow the docs rules:
- "opened": the source was read in full;
- "search summary": seen only in a search result, and flagged wherever it appears;
- "measured here" and "computed": produced by the research team;
- "inference";
- "unsourced estimate".

Every timing ran on one busy Windows desktop (Ryzen 5 3600) under Node 24.18, Chromium 153 or CPython 3.14. None is a phone timing.

## The answer

**World builder: yes. The owner chose a full player editor before launch.** The research recommended a smaller builder. On 6 October 2026 the owner chose the full one, so every level ships before launch:
- **The owner's Build mode, behind a developer flag (M3, 8–12 days),** to hand-edit generated hero towns.
- **"New town" settings in M6 (2–4 days), and the Build mode opened to players as a street editor (8–12 more days):** paint tiles, place buildings and props, edit zones.
- **Card remix (3–5 days) and card authoring (6–10 days) once M1 cards and M6 links exist.**
- **"New country" settings in M8 (5–8 days), plus god tools on the country (14–22 days):** lock and re-roll, terrain brushes, biome paint, drawn rivers and roads.
- **Players never paint cultures.** They choose a culture count. The content rules hold by construction:
  - the palette offers building kinds, never styles;
  - no person, costume, culture or hue tools;
  - no asset import;
  - no free text in links.
- **Builder edits must keep entity ids stable.** In a toy, re-keyed ids made paired arms as noisy as unpaired seeds, costing 7–8× the seeds (measured here).
- **Cost:** about 46–73 full-time days in all. That is computed by summing the levels' unsourced estimates, against 12–29 days for the recommended smaller builder.


**Maps: every layer comes from the seed, on one square grid.**
- The country is the TypeScript port of `tools/worldgen` on its 96×64 grid. Round 4's Voronoi mesh is dropped, because the 8- and 16-px art would force it back onto this grid anyway.
- The Region view draws the same cells at 16 px.
- Each settlement gets a plan, then 64×64-tile districts generated when they come into view.
- Hero places (the default town, the tutorial village) are generated, then hand-edited.
- Building interiors stay abstract, as building cards.
- Routes become strip maps built by the same place code.
- This replaces LDtk village kits, LDtk prefab towns and wave function collapse (WFC) filler as the source of towns.

**The port is proven exact.**
- A JavaScript port of the keyed draw and noise matched Python on 1,132,769 cases, and the terrain stage matched on 300 of 300 seeds, in Node and Chromium (measured here).
- The JS terrain stage runs 90–100× faster than Python, so a whole country should take tens of milliseconds (inference).

**Edits sit on the seed as inputs to the generator's stages, never as patches on its output.**
- A world is a seed, pinned generator versions and per-stage edit layers.
- Hand-placed things are pins that the generator flows around.
- Every per-settlement draw keys on a stable id, never on population rank. That one change cuts the towns rebuilt by "add a village" from 35 to 2 (measured here).
- About 980 edits fit in a 2,000-character share link, carried in the URL fragment that servers never see (measured here).

**The editor is a lazily loaded Build mode inside the app.**
- It reuses `WorldRenderer` plus one chunk-patch method.
- Brushes cost under 0.07 ms per event on a 1,024² map (measured here, desktop).
- A first usable builder takes 16–24 full-time days; a minimal one 8–12 (unsourced estimates).

**Fix the reference generator before its outputs are frozen as goldens.** Four changes:
- key place seeds, landmark draws and names on a stable settlement id (its cell);
- make shore tidying order-free (plan, then apply);
- pass neighbour biomes to places, so towns beside farmland draw fields;
- add sea lanes, so island settlements connect.

**Decisions.** On 6 October 2026 the owner made these calls:
- accepted the recommended defaults (a)–(d) and (f)–(k);
- chose the full player editor for (e);
- approved the shared-doc update;
- asked for the four generator fixes now.

| # | Decision | Recommended default | Main reason |
| --- | --- | --- | --- |
| (a) | Country representation | The square grid; drop round 4's Voronoi mesh | The art is square, the grid is proven deterministic, and its terrain stage takes about 8 ms in JS |
| (b) | Where towns come from | Generated from the place record; drop LDtk village kits, LDtk prefab towns and WFC filler | The generator already draws GBA-style towns from the sprite set |
| (c) | M3's default town | A fixed seed, generated and then hand-edited in the developer Build mode; LDtk only as a fallback if the port slips | One pipeline, and the Build mode becomes the seed of every later builder |
| (d) | Building interiors | Abstract building cards; no walk-in interiors | No interior art exists, and the sim needs only "indoors" |
| (e) | Who the builder is for | The owner first; players get settings and presets; teachers get card remix; no player map editor before launch. **Owner's choice: a full player editor before launch, at every level** | Settings are universal and cheap; editing a living world is where builders struggle |
| (f) | Culture in the builder | A culture count (4–8) plus a single-culture switch; no culture painting | 0 of 723 user-placed layouts met the fairness bars |
| (g) | When edits apply | Before day 0 only; mid-run edits later as timed day-boundary inputs | Keeps replays, ledgers and the culture balance exact |
| (h) | Share links | `#w1.` in the URL fragment with a CRC32; no free text; a `.nomos` file above 8,000 characters | About 980 edits fit 2,000 characters, and the server never sees them |
| (i) | Settlement identity | A stable uid (the cell) for place seeds, landmark draws and names | Cuts "add a village" from 35 rebuilt towns to 2 |
| (j) | World sizes | Standard 96×64 and large 192×128; M7 and M8 re-baselined to listed places plus a region tier | 96×64 lists 40–61 places, not 1,000 |
| (k) | Art | Draw about 55–81 tiles (coasts, snow, cliffs, rock, sand, shore saddles), and add a snow biome | Every layer and the wonder views need them |

## 1. How each map layer gets made

### Every layer is generated; hand work enters as kits and edits

**The current plan assembles towns from hand-made parts.**
- Round 3 planned a hand-made 256² default town in LDtk, and cities "from a seeded road grid stamped with hand-made prefab blocks", with WFC only for filler.
- Round 4 planned three tiers:
  - villages from LDtk kits with procedural dressing;
  - towns from BSP blocks and prefabs;
  - cities, with prefab variants "keyed to district wealth and crime" ([round 3 report](../round-3-2d-look/report.md); [round 4 world-maps notes](../round-4-multi-scale/notes/world-maps.md), opened).

**`tools/worldgen` now builds GBA-style villages and towns in code from a small context record.** That makes three planned methods unnecessary as the source of towns: LDtk village kits, LDtk prefab towns and WFC filler. The wealth-keyed prefabs are banned outright by content rule 5.

**Other games split layers the same way.**
- Dwarf Fortress generates every layer, region tiles only "as you scroll around" ([DFHack docs](https://github.com/DFHack/dfhack/blob/develop/docs/plugins/export-world-map.rst), opened).
- Cataclysm: DDA knows where buildings are but picks their layouts lazily from hand-authored 24×24 pieces ([OVERMAP.md](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/doc/JSON/OVERMAP.md), opened).
- Caves of Qud keeps five static villages and generates the rest per biome ([Qud wiki](https://wiki.cavesofqud.com/wiki/Village), opened).
- Azgaar's FMG passes each town a seed plus a small context record ([burgs-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/src/generators/burgs-generator.ts), opened).

**The recommended pipeline:**

| Layer | How it is made |
| --- | --- |
| Country | The TS port of `tools/worldgen` on the square grid |
| Region | The same cells, drawn at 16 px |
| Settlement plan | From the place seed and record: arterials from road sides, a plaza, district zones. It doubles as the City-zoom minimap |
| District and street | 64×64-tile districts generated when they enter view, keyed by (place seed, district x, y), using the code-drawn sprites and small block templates. Hero places are generated, then hand-edited |
| Interior | Abstract building cards with occupants and stock pips. Walk-in interiors would need about 110 new sprites |
| Route | Strip maps chained from the route's cells, built by the place code |

**The place code must be restructured before M3.**
- Today a place is one 32×20 to 48×28 view. It takes 0.1–1.6 s in Python, ignores population, and exports no walkability or entities (measured here).
- M3 needs a 256² town, and M6 needs cities of 400²–1,024².
- Lot placement scans every footprint position, so its cost grows with cells × lots (computed). Block-local frontage packing and lazy districts fix that.
- Round 4's BSP prototype packed a 256² city in 59 ms.

**One binary map serves both generated and hand-made maps.** It carries terrain kinds, an IntGrid for walkability, and entities: homes with capacity, workplaces, shops with hours and civic buildings. The spawner reads only this map.

### The country uses the square grid, not round 4's mesh

**The art already fits the grid.**
- One cell is one 8-px Country tile and one 16-px Region tile.
- The existing 12-tile shore rule covers 99.6% of coast cells (3,618 of 3,633), so map-scale shores need no new tile shapes (measured here).

**The grid is faster.**
- The integer grid's terrain stage takes about 8 ms in JS at 96×64 (measured here).
- Round 4's mesh spent 116–145 ms on Delaunay and adjacency alone at 30,000 cells (round 4, measured there).

**The grid is easier to prove deterministic.** It has a fixed neighbour order and integer arithmetic. A mesh adds float coordinates and a third-party triangulator to the determinism surface.

**It changes the settlement count.**
- A 96×64 world lists 40–61 settlements, not M8's 1,000.
- At 384×256 it lists 938, but 904 of those are hamlets (measured here).
- Keep 96×64 as the standard world and 192×128 (182–237 places) as "large".
- The 56–63% of people in unlisted places fold into M7's region tier (computed).
- M8's exit check becomes:
  - a standard world in ≤ 100 ms and a large one in ≤ 400 ms, in desktop Chromium;
  - per-stage fingerprints that match the goldens in every engine.

### A place stays identical across visits, growth and versions

**Places already match the country map.**
- On 5 worlds, places showed every promised road side (650/650) and river side (125/125), and 97.1% of landmarks (measured here).
- They miss fields: 94.9% of settlements sit beside farmland, but towns never draw fields, because the place record lacks neighbour biomes (measured here).

**Place record version 2** keeps today's `PlaceContext` and adds:
- per-side edge biomes;
- elevation and relief;
- river size and road rank;
- region;
- a founding tier;
- generator versions.

Port and crossroads are derived. Walls are dropped.

**Growth must not move streets.**
- About 10% of settlements sit within 10% of a tier threshold (measured here).
- Lock the plan type at the founding tier, and let population choose only how many keyed lots and districts are built.

**Seeds never include the generator version.**
- Mixing the version in would reshuffle places no code change touched.
- The version selects which code runs, and goldens freeze each released version.

**Hash the world seed first.** Seeds 2s and 2s+1 then share none of 4,096 draws, against all 4,096 with the plan's old `seed ^ entity` form (measured here). This closes a verify-first item.

### The port is proven, with four traps to avoid

**Results.**
- The JS port of `draw`, `below`, `fade`, `value` and `fbm` matched Python on all 1,132,769 cases in Node 24.18 and Chromium 153.
- A full port of the terrain stage matched 300 of 300 seeds across five templates and three grid sizes (measured here).
- Round 9's editor research separately matched a JS priority flood and the shore rule bit for bit.

**Four naive transliterations each break 33–88% of results (measured here):**
- a signed draw before `%`;
- `>> 16` instead of `>>> 16`;
- truncating instead of floor division;
- truncated `//` in the terrain terms.

**Port in pipeline order.**
- Lint-ban bare `/` and `%` outside floor-division helpers.
- Commit each stage only when its golden fingerprints match.
- Port `place.py` last.
- The goldens cost 363 B per seed (measured here) and become a test fixture per generator version.

### About 55–81 small tiles unblock every layer

| Layer | Missing | Tiles |
| --- | --- | --- |
| Country and Region | Map-scale coast-edge overlays | 24 |
| Country and Region | Cliff-coast versions of those (recommended) | 24 |
| Country and Region | Snow | 2 |
| Street | Snow ground and shores | about 16 |
| Street | Cliff faces for east, west and north | about 8 |
| Street | Rock ground | 2 |
| Street | More sand, ripples | 3–5 |

**Snow needs a generator rule first.** No cell can be snow today: cold lowland stays forest or grassland.

**Rivers and roads stay pixel lines.** 66.5% of river links and 40.1% of road steps are diagonal (measured here).

**The gaps hit wonder views hardest.** 18.6% of wonders are cold, 36.3% sit on high ground and 8.0% are cliff coasts not facing south (measured here).

## 2. Does Nomos need a world builder?

### Prior art: settings are universal; editing a living world is where builders struggle

**Settings before generation are common and cheap.**
- RimWorld offers 6 world settings plus factions, Dwarf Fortress 7 basic ones, and Factorio 9 presets with a live preview. All were opened ([RimWorld wiki](https://rimworldwiki.com/wiki/World_generation); [DF wiki](https://dwarffortresswiki.org/index.php/World_generation); [Factorio wiki](https://wiki.factorio.com/Map_generator)).
- Factorio and Minecraft share settings as short strings, not as worlds.

**Editing a generated, living world is hard.**
- SimCity 4 disables "most terraforming tools … after the city is named and founded" ([Wikipedia](https://en.wikipedia.org/wiki/SimCity_4), opened).
- Azgaar's heightmap editor needs three modes, Erase, Keep and Risk, and Risk "can potentially cause some errors" ([wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization), opened).

**Full editors serve modders and developers; player builders are settings or constrained toys.**
- The editors in this group are the Cities: Skylines asset editor, LDtk, Tiled, RPG Maker and Porymap.
- Townscaper lets players place only coloured blocks, and its algorithm makes every click valid. 95% of 10,619 Steam reviews are positive ([Steam](https://store.steampowered.com/app/1291340/Townscaper/), opened).

**Teaching tools customise parameters and visibility, not maps.**
- PhET's customisation hides controls and sets the starting state ([PhET-iO](https://phet-io.colorado.edu/io-features/customize.html), opened).
- NetLogo's BehaviorSpace runs every combination of settings with seeded repetitions ([docs](https://docs.netlogo.org/behaviorspace.html), opened).
- Nicky Case puts "the full 'sandbox mode' at the end" ([design patterns](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md), opened).

**Failures cluster around exposed internals and agent-level scenario tools.**
- Minecraft removed its three-page Customized screen "with the rewrite of terrain generation" ([wiki](https://minecraft.wiki/w/Old_Customized), opened).
- Civilization VI shipped its advanced WorldBuilder as "(Unsupported)" ([patch notes](https://forums.civfanatics.com/threads/june-2019-patch-notes-discussion.646833/), opened).
- Civilization VII launched without a WorldBuilder.
- WorldBox and some Civilization details rest on search summaries, because those wikis blocked automated access.

### Four levels, an MVP order and the cost

| Level | What it does | For whom | Effort (unsourced estimate) |
| --- | --- | --- | --- |
| 1a. New town settings (M6) | Seed with re-roll, 3–5 presets, size tier, biome, river, coast, port | Players, teachers, the owner | 2–4 days |
| 1b. New country settings (M8) | About 10 overrides grouped by stage, standard or large map, culture count, live preview, validation | Players, teachers, the owner | 5–8 days |
| 2-lite. Lock and re-roll | Pin towns and wonders, re-roll one stage, move a town to a valid site, undo | Players, mapmakers | 6–9 days |
| 2. Full god tools | Plus terrain brushes, biome paint, drawn rivers and roads | God-game players | 14–22 days in total |
| 3a. Card remix | A teacher picks the visible knobs and a pre-validated treatment, then shares a link or QR code | Teachers | 3–5 days |
| 3b. Street editor for players | Paint tiles, place buildings, edit zones | Creators | 16–24 days (question 4) |
| 3c. Card authoring | New cards from scratch | Advanced teachers | 6–10 days |
| 4. Internal content tool | A developer-flag Build mode, or LDtk plus validators | The owner | 8–12 or 2–4 days |

**The research's MVP order:**
1. Level 4 with M3.
2. Level 1a with M6.
3. Level 3a once M1 cards and M6 links exist.
4. Level 1b with M8.
5. Level 2-lite after M8, only on playtest demand.
6. Levels 2, 3b and 3c not planned.

**The owner's choice: every level before launch, in this order** (unsourced estimates):

| Level | Milestone | Effort |
| --- | --- | --- |
| 4. The owner's Build mode | M3 | 8–12 days |
| 1a. Town settings | M6 | 2–4 days |
| 3b. The Build mode opened to players | M6 | 8–12 more days |
| 3a. Card remix | Once M1 cards and M6 links exist | 3–5 days |
| 3c. Card authoring | Once M1 cards and M6 links exist | 6–10 days |
| 1b. Country settings | M8 | 5–8 days |
| 2. God tools, including lock and re-roll | M8 | 14–22 days |
| **Total** | | **about 46–73 days** (computed) |

The guardrails decide whether the extra levels are safe:
- **Card authoring:** prompts come from templates, and claims are judged by M1's statistics.
- **Street editing:** offers kinds, never styles or people.
- **God tools:** every terrain edit reruns the stages after it, before day 0.

**Settings must be grouped by the stage they touch** (measured here, 12 seeds):
- Changing the wonder count left every other stage identical in 12 of 12 seeds.
- Changing the template or land share changed every stage in 12 of 12.
- So each setting carries a badge, such as "keeps your coastline" or "new world".

### Fit with teaching, sharing and the content rules

**Teaching uses paired arms on one world, not two hand-built towns.** In a toy, moving a police post one cell gave paired differences with an SD of 22.7 offences (arm correlation 0.92). Unpaired seeds gave 61.4. An edit that re-keyed agents' draws raised it to 63.4, which costs 7–8× the seeds (measured here). So builder edits must keep entity ids stable, and "a no-op edit leaves the replay hash unchanged" joins the CI tests.

**Settings add about 14 URL characters to a link** (computed). Edits apply before day 0, never mid-run.

**The content rules forbid whole classes of tools.**
- No house-style or district-wealth paint.
- No "criminal" or "gang" placement: builders place conditions such as stations and patrols, never kinds of people.
- No hue paint, and no asset import, which would let links carry Nintendo tiles.
- No free text in links.

**Players never paint cultures.**
- A painted culture map is a culture surface, and round 8 found housing clusters alone made 8.2× arrest gaps between cultures.
- Random user-placed hearths met question 3's fairness bars in 0 of 723 layouts.
- So the builder offers a culture count (4–8) and a single-culture switch for lab cards and classrooms.

### UX patterns to copy

- **Onboarding:** "Surprise me", 4–6 named presets and a closed Advanced drawer, as Factorio, Minecraft and Dwarf Fortress do. Unlock the builder after the first lab cards, as round 2 already unlocks sliders.
- **Constrained input:** paint meaning (terrain kinds) and let rules draw the tiles, as Townscaper, LDtk auto-layers and RPG Maker autotiles do.
- **Lock, re-roll and undo:** lock items, then re-roll the rest with keyed counters, all in one undo log that becomes the save. This is Azgaar's model, made reproducible.
- **Previews:** show setup facts, never outcomes, until the bet is locked. Police coverage, farmland and reachability may show; predicted crime may not.
- **Validation in two tiers:** hard errors block Play and Share, like Cities: Skylines' publish checklist; soft warnings sit beside the setting that causes them.

## 3. Edits on a seeded world

### A world is a seed, pinned versions and per-stage edit layers

**Each edit is an input to one generator stage.** Within a stage, edits keep their order. Across stages, order never matters.

**Edits encode far smaller than the whole world.**
- 1,000 mixed edits take 2,047 URL characters [1,862–2,225] as columnar varints, deflate-raw and base64url (measured here).
- The materialised 96×64 world takes 26,466 characters, about 13× more. That fits a file, never a link.

**Other games do one of two things.**
- No Man's Sky and Valheim keep edits beside the seed. Valheim's format is from a search summary.
- Minecraft, Dwarf Fortress, Factorio and FMG save what was generated.

**Caps must fail loudly.** A player study found No Man's Sky silently overwrites old terrain edits past 15,000 ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2526352095), opened; a player study). Nomos should refuse an edit at a cap instead.

### Regeneration rules

**An edit reruns its own stage and everything after it.** In the reference generator's ten-stage chain:
- an elevation edit reruns from rain onward;
- biome paint reruns from settlements onward;
- a settlement edit reruns farmland, roads, wonders and landmarks.

**Without locks, small edits rebuild many towns.** Over 30 seeds, adding one village changed 35 place layouts [14–50] (measured here).

| Edit | Layouts changed today | With locks | With locks and stable-id keys |
| --- | --- | --- | --- |
| Add a village | 35 [14–50] | 23 [7–42] | 2 [1–6] |
| Delete a settlement | 10 [1–44] | 22 [2–44] | 2 [0–5] |
| Lower land, radius 2 | 25 [0–45] | 5 [0–51] | 4.5 [0–14] |

**The rules:**
1. Edits are stage inputs.
2. Hand-placed features are pins: placed first and never renumbered.
3. A lock copies a generated feature into the edit layer.
4. A delete is a tombstone that also lowers the target count. Otherwise the stage refilled the slot in 30 of 30 deletes.
5. "Regenerate" is a logged, keyed reroll counter, never `Math.random`. FMG's rerolls are not reproducible ([burgs-generator.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/burgs-generator.ts), opened).
6. Conflicts block play, but edits are never silently dropped.

**Caching the seed-only noise cuts a rerun.** The noise fields depend only on the seed and cell, so caching them makes an elevation edit's rerun about 20% of a full generation (computed).

### Stable identities make cross-zoom edits safe

**Country edits reach a place only through its seed and its record.** A changed place seed rebuilds a town completely: 0% of houses stay put (measured here).

**Per-settlement draws key on a uid.** For a generated settlement the uid is its cell; a user-made one gets the next free uid. The draws are place seeds, landmark draws and names.

**Place edits go in as reservations the generator flows around.** Patching them on afterwards fails: one extra river side would make 80.8% of pinned houses collide (measured here).

**Each place's edit layer stores** its place uid, the place generator version and a hash of its record. Ops that no longer fit go dormant and are listed, as FMG's override anchors do ([graph-override.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/354eeaa7a6aa6e0e57abb8e2f5af5e62cef8aab4/src/generators/graph-override.ts), opened).

**Quantise climate in the record.** Rounding temperature and moisture to the bands the place generator actually uses stops small climate shifts from rebuilding towns (inference).

### Guardrails, checked on Play, on Share and on every open

| Check | Rule | Evidence |
| --- | --- | --- |
| Reachability | Every settlement joins the capital by road or sea lane | 9.9% of generated settlements have no land route (measured here) |
| Food | Checked per country, not per town | 10% of generated villages and 17% of hamlets have no farmland (measured here) |
| Culture hearths | Placed by the generator after every edit; users can't place them in v1 | Random layouts left a 39.8% land-quality gap; 1 of 769 met both bars (measured here) |
| Names | ASCII only, 2–24 characters, round 8's filter on a normalised form, on save and again on open | Round 8 filter; [UTS #39](https://www.unicode.org/reports/tr39/) (opened) |
| Links | No free text, no URLs, no people's names | Content-in-URL sites draw abuse ([itty.bitty](https://github.com/arfct/itty-bitty/blob/25aa3cd78b53d80b6625774d61ef98d1e1ba9e3b/README.md), opened; the abuse reports are a search summary) |

**Content rules hold by construction.** No tool can dress or mark an individual. House styles stay cosmetic and unread by the sim, and police staffing comes from the ledger.

**Moderation needs no backend.**
- The viewer's own browser re-filters names.
- A "hide custom names" switch swaps in generated ones.
- A report button emails the owner.
- Reported link hashes can ship as a static blocklist.
- No legal source covers moderation of backend-free share links. That is the owner's call, and this is not legal advice.

### Share links, saves and versions

**A link is `#w1.` plus deflate-raw columns, base64url and a CRC32.** It rides in the URL fragment, which "is not sent in requests" ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-17.11), opened).

| Link length | Mixed edits that fit (measured here) |
| --- | --- |
| 2,000 characters (QR code; Discord's cap, a search summary) | about 980 |
| 8,000 characters (RFC 9110's recommended minimum) | about 4,550 |
| Larger | a `.nomos` file with the same bytes |

**Encoding is cheap and safe.**
- Encoding plus decoding takes under 0.6 ms at 1,000 edits (measured here).
- The CRC32 cut silently wrong decodes of corrupted links from 372 of 9,859 to 0, for about 7 characters.
- Caps of 32 KiB of link, 1 MiB inflated and 20,000 ops stop a decompression bomb in about 1 ms.

**Generator versions are pinned per world and frozen by goldens.**
- Old versions ship as lazy chunks, about 20 KB gzip each by a source-size proxy (computed).
- Upgrading is an explicit "rebuild on the new generator" that lists conflicts. Minecraft's buried builds show the cost of silent migration ([Java Edition 1.18](https://minecraft.wiki/w/Java_Edition_1.18), opened).

**Edits are initial state.** World edits happen before play. Mid-run edits, if ever allowed, are timed inputs at a day boundary that move people and cents exactly.

## 4. Building the editor in the browser

### A lazily loaded Build mode that reuses the renderer

**The Build mode loads by dynamic import when chosen.** The first frame keeps its 8 KB of JS and 33 KB map. The prototype's editor core is 4.8 KB brotli (measured here), and a first builder an estimated 10–20 KB (inference).

**The renderer gains one method, `patchTiles`.** It uploads 32×32 chunks straight from the full tile array. In Chromium this read back with 0 mismatches (measured here).

**The editor owns the map while the sim is paused.** The main thread holds the map document. Play hands a copy to the worker, which re-derives homes and jobs and restarts. Map-wide jobs of 35–46 ms run in the worker.

**Start it behind a developer flag.** It can author kits and hero towns first.

### Tools, autotile and undo

**Five layers, each with one source of truth:**
- painted terrain kinds;
- derived tiles;
- ground sprites;
- standing sprites with an occupancy grid;
- zones with typed fields.

**Copy Tiled and LDtk's tools and shortcuts:**
- brush, rectangle, flood fill, eraser, eyedropper and line;
- stamps and prefabs;
- rectangle select, magic wand and select-same.

Sources: [Tiled manual](https://github.com/mapeditor/tiled/blob/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/manual/editing-tile-layers.rst); [LDtk Tool.hx](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/src/electron.renderer/Tool.hx); both opened.

**Keep `place.py`'s shore rule, but tidy once per edit, as plan-then-apply passes.**
- The JS port matched on 191,840 cells (measured here).
- Tidying on every pointer event gave a different map from a whole-map rebuild in 1–4 of 10 strokes. Tidying once at pointer-up gave 0 of 150.
- Switching the reference to plan-then-apply changes 446 of 12,262 flooded cells. So do it before saves exist.

**A 1-tile land brush over water loses 22 of 24 cells to tidying.** Set the minimum land brush to 3 tiles, or draw the 2 missing "saddle" shore tiles.

**Undo is a stack of per-edit commands holding cell diffs, as in Tiled.** 100 strokes hold 0.27 MB, and an undo takes ≤ 0.07 ms (measured here).

### Performance on a 1,024² map (desktop)

| Edit | Time, median [min–max] |
| --- | --- |
| A brush pointer event | ≤ 0.07 ms at p99 |
| A whole stroke, 1- to 33-tile brush | 0.06–3.0 ms |
| 128×128 rectangle | 2.1–2.5 ms |
| Filling a 32,351-cell lake | 5.0 ms |
| Replacing 215,653 cells | 37 ms (move to the worker) |
| GL chunk patch per frame | ≤ 0.02 ms at p99 |

All measured here. Chromium ran within 2–22% of Node, on software WebGL.

**Country edits become interactive once ported.** A TypeScript country should rerun in about 17–45 ms after an elevation edit and 6 ms after moving a settlement. This is computed from measured kernel ratios of 16–206×.

### LDtk and formats

**Keep LDtk for hand-made kits until the builder can author them, importing only meaning.**
- Import the IntGrid kinds and the entities named after manifest frames.
- Nomos's own rule draws the tiles, because LDtk's auto-layer rules "are completely resolved internally by the editor" ([LDtk JSON docs](https://github.com/deepnight/ldtk/blob/2b7b5512f2f88fa281cb6492debbb26ead7838d4/docs/JSON_DOC.md), opened).

**The sprite manifest becomes the shared vocabulary.** The generator, builder and renderer all use its fields: `footprint`, `anchor`, `layer`, `overlay`, `door`, `joins` and `corners`. Publish it as a versioned JSON Schema with generated types.

**Two kinds of file.**
- Kits stay as diffable JSON in the repo.
- Saves and builder documents use one versioned binary container of tagged sections.

### UI and effort

**UI.**
- Vanilla DOM for the toolbar and palette.
- lil-gui for options.
- Keyboard first, using Tiled's shortcuts.

**Accessibility.**
- A click alternative for every drag, as WCAG 2.2 SC 2.5.7 requires.
- Targets of at least 24×24 px.
- Pointer Events on tablets.

Source: [WCAG 2.2](https://github.com/w3c/wcag/blob/23bad5904949904275a08f1c6e395b78a02aa6f3/understanding/22/dragging-movements.html), opened.

**Effort (unsourced estimates):**
- A first usable builder: 16–24 full-time days with an AI assistant.
- A minimum (terrain brush, rectangle, fill, prefab stamps, undo, save, Play): 8–12 days.
- For the developer's own first town, LDtk at 3–5 days is cheaper than building the editor first.

## Plan changes, proposed (R9)

These go into the shared doc's Implementation plan once the owner approves. They also carry the plan tasks owed for `tools/worldgen` and the blob looks.

**M0 Pipeline**
- [ ] Make worldgen's `draw(seed, stream, ...keys)`, with the seed hashed first, the sim's single keyed draw, with fixed-arity hot-path variants. Lint-ban bare `/` and `%` in generator code outside floor-division helpers (R9).
- [ ] Define one binary map for generated and hand-made maps: terrain kinds, IntGrid walkability, and entities (homes with capacity, workplaces, shops with hours, civic buildings) (R9).
- [ ] Publish the sprite manifest as a versioned JSON Schema with generated TypeScript types. Maps name frames, never atlas indices (R9).
- [ ] Exit check: the kernel fuzzer (draw, below, fade, value, fbm) matches the Python vectors in Node, Bun, Chromium, Firefox and WebKit (R9).

**M3 City life**
- [ ] Port `place.py` to TypeScript, with plan-then-apply shore tidying, 64×64 districts, frontage lot packing and entity export (R9).
- [ ] Make the default town a fixed seed of the place generator, hand-edited in a developer-flag Build mode. LDtk is the fallback if the port slips (R9).
- [ ] Build the developer-flag Build mode as a lazy chunk:
  - `WorldRenderer.patchTiles` over 32×32 chunks;
  - brush, rectangle, fill, eraser, eyedropper and line tools, with a 3-tile minimum land brush;
  - cell-diff undo;
  - prefab stamps and zones;
  - save and load in a versioned container;
  - a Play hand-off to the worker (R9).
- [ ] Draw the two shore saddle tiles, so the corner set is complete and tidying can drop its diagonal clause (R9).

**M6 Scale and sharing**
- [ ] Generate cities with the district generator at 400²–1,024², building districts lazily. Drop WFC and LDtk prefab blocks (R9).
- [ ] Define a world as seed + pinned generator versions + per-stage edit layers. Edits are stage inputs, applied before day 0 (R9).
- [ ] Share links: `#w1.` + deflate-raw columns + base64url + CRC32, carried in the URL fragment.
  - Caps: 32 KiB of link, 1 MiB inflated and 20,000 ops.
  - A `.nomos` file above 8,000 characters.
  - No free text (R9).
- [ ] Freeze each released generator version with golden fingerprints for about 100 seeds, and ship old versions as lazy chunks. "Rebuild on the latest generator" is explicit and lists conflicts (R9).
- [ ] Add a "New town" settings panel: seed with re-roll, 3–5 presets, size tier, biome, river, coast and port (R9).

**M8 Country map**
- [ ] Replace the mesh terrain task with the TypeScript port of `tools/worldgen` on the square grid, covering terrain, drainage, climate and biomes. Prove each stage against Python goldens, and port in pipeline order (R9).
- [ ] Run settlements and routes on the grid, and add sea lanes between landmasses. Grow regions by multi-source Dijkstra (R9).
- [ ] Key place seeds, landmark draws and names on a stable settlement uid (its cell), never on population rank (R9).
- [ ] Place 4–8 natural wonders per world by site rules, each kind at most once. Hot springs, geyser and caldera lake share one geothermal hotspot (R9).
- [ ] Place built landmarks by tier and site: in-place ones on the settlement, and viaducts, observatories and lighthouses on cells of their own (R9).
- [ ] Draw the Country and Region views as 8- and 16-px tilemaps of the same cells, with map-scale coast overlays and wonder and landmark icons (R9).
- [ ] Add a snow biome for cold lowland (R9).
- [ ] Add a "New country" settings panel:
  - about 10 overrides, grouped by stage and badged ("keeps coastline", "new world");
  - standard or large size;
  - a culture count and a single-culture switch;
  - presets, a live preview, and validation (R9).
- [ ] Validate on Play, on Share and on every open (R9):
  - every settlement reaches the capital by road or sea lane;
  - food capacity per country;
  - no pin in water;
  - names through round 8's filter in ASCII;
  - payload caps.
- [ ] Exit check: in desktop Chromium, a standard 96×64 world generates in ≤ 100 ms and a large 192×128 world in ≤ 400 ms. Per-stage fingerprints match the goldens in every engine (R9).
- [ ] Re-baseline M7's and M8's settlement counts to listed places plus a region tier, and fit Zipf on true ranks (R9).

**M9 Zoom across scales**
- [ ] Replace "interiors by tier" with the district generator for every tier. Building interiors stay abstract, as building cards (R9).
- [ ] Adopt place record version 2 (R9):
  - edge biomes per side, relief, river size, road rank, region, founding tier and versions;
  - temperature and moisture quantised to the place generator's bands.
- [ ] Lock each place's plan type at its founding tier, and build keyed lots by population, so growth never moves a street (R9).
- [ ] Build route strips from route cells with the place code, and wonder views with vista props (R9).
- [ ] Place edits are reservations the generator flows around. They are stored per place uid with the place version and a record hash, and go dormant rather than being dropped (R9).
- [ ] Exit check: a zoom-consistency CI test (R9):
  - road, river and sea sides match the country exactly;
  - every landmark icon appears in its place;
  - edge farmland shows as fields.

**Player editor (the owner's choice: every level before launch)**
- [ ] M6: open the Build mode to players as a street editor (R9).
  - Tools: paint terrain, place buildings and props, edit home, shop and workplace zones.
  - The palette offers building kinds, never styles. Style is a keyed uniform draw with a "restyle" button.
  - It has no person, costume, culture or hue tools, and no asset import.
  - Edits apply before day 0. They pass hard validation (doors on roads, capacity, reachability) and are shared as links or `.nomos` files.
- [ ] M6: on opening a player-made world, show a "made by a player" badge, a "hide custom names" switch, and a report button that emails the owner (R9).
- [ ] After M1 and M6: card remix (R9).
  - Choose the visible knobs and a pre-validated treatment, then share a link or QR code.
  - Paired arms keep entity ids stable.
- [ ] After M1 and M6: card authoring (R9).
  - Players set arms, metrics, claim type and seeds.
  - Prompts come from templates, not free text, and claims are judged by M1's statistics with the "hand-picked setup" label.
  - Treatments never key on culture.
- [ ] M8: god tools on the country (R9).
  - Lock and re-roll with per-stage keyed counters.
  - Raise, lower and smooth brushes; biome paint; drawn rivers and roads; town and wonder placement.
  - Pins, tombstones that lower counts, a conflict list and one undo log.
  - Every edit reruns from its first dirty stage, and cultures are re-placed by the generator.

**Looks**
- [ ] Replace round 8's hue column with a one-byte look (R9):
  - hue × eye shape × pattern = 96 looks;
  - drawn at birth from `draw(seed, LOOK, id)`, never inherited;
  - drawn as body, pattern, face, then job item.
  
  Extend the appearance audit and the hue × culture test to eyes and pattern.

**Art**
- [ ] Draw about 55–81 tiles (R9):
  - map-scale coast and cliff-coast overlays;
  - snow at map and street scale;
  - cliff faces for east, west and north;
  - rock ground and sand variants.

**Ongoing tests**
- [ ] A no-op edit leaves the replay hash unchanged, and a treatment edit changes no unrelated entity id (R9).
- [ ] A partial rerun from the first dirty stage equals a full rerun, byte for byte, for random edit logs (R9).

## Open questions

| Question | Why it matters | When |
| --- | --- | --- |
| Do Bun (JavaScriptCore), Firefox and WebKit match the goldens? Only Node and Chromium ran here | Cross-engine replays | M0 |
| Phone timings for brushes and generation | All figures here are desktop | M3, M8 |
| Round 8's culture fairness tolerance, and the gaps after spin-up | Culture count and re-placement depend on it | M8 |
| How growth-stable lot ordering looks as towns grow | Streets must not move | M3, M6 |
| Hosting duties for backend-free share links with user names | No legal source was found, and this is not legal advice | Before Share ships (M6) |
| Safari's URL limit and chat apps' link handling (search summaries only) | The link tiers | M6 |
| Whether map-scale coast overlays read at 8 px, and where snow starts | The Country and Region look | M8 |
| Whether teachers want card remix | The builder's second user | After M1 |
| How many players use a street editor or god tools; no usage figures were found for any surveyed editor | The full player editor costs about 46–73 days | Playtests before M6 and M8 |

The full list of 21 conflicts with rounds 3–4 is in [`notes/map-pipeline.md`](notes/map-pipeline.md), Q1.
