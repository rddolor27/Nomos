# Builder scope: does Nomos need a world builder, for whom, and what first? (round 9, question 2)

Status: all four sub-questions answered, 6 October 2026.

Labels follow `.claude/rules/docs.md`: "opened" (read in full), "search summary", "measured here", "computed", "inference", "unsourced estimate". "Opened" web pages were read through a summarising fetch tool, so exact wording is slightly less certain than for repo files. "Measured there" marks figures from round 9's other notes.

Machine for "measured here": the round's Windows 10 Pro desktop (AMD Ryzen 5 3600) running CPython 3.14.6, with other research agents active. No figure is a phone timing. Both runs here check stage stability and paired-seed precision; their one timing (the Python reference, 12 samples after 1 warm-up) is indicative only.

**In brief**

- **Yes, but a small one: settings first, then the owner's tools, then teachers.** Level 1 settings and presets cost 2–4 days for towns (M6) and 5–8 days for the country (M8). A teacher's "card remix" costs 3–5 days. The owner's internal tool is LDtk plus validators (2–4 days). If hero towns are generated and then edited, it is a developer-flag Build mode (8–12 days) instead.
- **No god tools or player map editor before launch.** A lock-and-re-roll subset (6–9 days) can follow M8 if playtests ask for it. Full god tools cost 14–22 days, and a player street editor plus card authoring 22–34 days.
- **Teaching runs as paired arms on one world, with stable IDs.** In a toy, re-keyed IDs made paired arms as noisy as unpaired seeds, costing 7–8× the seeds.
- **No culture painting.** Players get a culture count only.
- **Copy:** presets with "Surprise me", stage badges, constrained input, lock and keyed re-roll, one undo log, setup-only previews, and two-tier validation.

## 1. Prior art: world and map builders in comparable games and tools

### Takeaway

- **Settings before generation are universal and cheap; editing after generation is where tools struggle.** RimWorld offers 6 world settings plus factions, Dwarf Fortress 7 basic ones and Factorio 9 presets. Editing a living world costs more. SimCity 4 disables most terraforming once a city is founded, and Azgaar's generator needs three edit modes (Erase, Keep, Risk).
- **Player builders are either settings plus presets, or constrained toys.** Full editors serve modders and developers: the Cities: Skylines asset editor, LDtk, Tiled, RPG Maker and Porymap. Townscaper (95% of 10,619 Steam reviews positive) lets players place only coloured blocks, and an algorithm makes every click valid.
- **Teaching tools customise parameters and visibility, not maps.** PhET's customisation hides controls, sets starting state and fixes values. NetLogo's BehaviorSpace runs every combination of settings × repetitions with seeded runs. Drawing appears as a late sandbox (Case: "at the end") or as a model-specific wall tool.
- **Sharing splits in two.** Settings travel as short strings: Factorio's map exchange string, Minecraft's preset codes, and a Townscaper town small enough for a tweet. Edited worlds travel as files: Azgaar's `.map`, Workshop items, RimWorld scenarios. Azgaar warns that a seed link from "a different generator version will produce a different map".
- **Failures cluster around exposed internals and agent-level scenario tools.** Minecraft removed its three-page Customized screen (2014–2018) when terrain generation was rewritten. Dwarf Fortress's World Painter, present in 0.47.05, is absent from current versions (v53.16). Civilization VI's scenario mode shipped "(Unsupported)" in 2019, and Civilization VII launched without a WorldBuilder.

| Tool | Serves | Relation to generation | Core tools | Sharing | Lesson for Nomos |
|---|---|---|---|---|---|
| Cities: Skylines map editor | Players who make maps | None; hand-sculpted or heightmap import | Shift, level, soften, slope brushes; water sources; resource paint; outside connections | In-game publish, Workshop | A publish checklist (water in the start area, one highway in and out) blocks unplayable maps |
| Cities: Skylines asset and theme editors | Modders | None | Templates, model import, LOD and triangle budgets; terrain textures and colours | Workshop; a theme must be shared separately from the map | Budgets and templates keep user content inside the engine's limits |
| Cities: Skylines II editor | Players and modders | None | One editor: 4,096² heightmap, four water-source types, climate and theme, resource maps | Paradox Mods | One editor for everything, released about 5 months after launch |
| SimCity 4 regions and God mode | Players | Region layout from a bitmap; terrain sculpted before founding | Terraform brushes, Raise, Lower, Erode, Smooth, Reconcile Edges, trees, animals | Region files (community) | Most terraforming is disabled once a city is founded: heavy edits come before the sim starts |
| Townscaper | Players | No seed or parameters; the algorithm resolves every placed block | Place and remove coloured blocks | The whole town packed into the URL hash | Constrained input that can never be invalid; a URL that holds the whole build |
| WorldBox | Players | Both: templates and sizes, then god powers on a live world | Terrain and biome brushes, spawning, disasters | Steam Workshop, Discord, GameBanana | Editing the live world is the core loop: right for a toy, at odds with seeded replays (inference) |
| Civilization IV–VII | Players and modders | Both: map scripts (Python, Lua, then JavaScript) plus WorldBuilder edits | Terrain, features, rivers, resources; units and cities in scenario modes | Map files and Workshop mods | Terrain editing stays stable; scenario tools that place agents break or ship late |
| RimWorld | Players | Settings before generation; a separate scenario editor | Seed, globe coverage 30/50/100%, rainfall, temperature, population, pollution; scenario parts | Scenarios via Workshop | Scenarios (start conditions, forced conditions) are a list of parts, not a map editor |
| Dwarf Fortress | Players, power users | Settings before generation; rejection checks after | 7 basic settings; dozens of advanced parameters; four seeds | Parameter sets in `world_gen.txt` | Changing a parameter changes the whole world; impossible minimums cause endless rejection |
| Minecraft | Players and data-pack authors | Presets and preset strings before generation | 6 presets; Superflat layer strings; data-pack world presets | Copy-paste preset strings; data packs | Exposed generator internals died with the generator rewrite |
| Azgaar's Fantasy Map Generator | Hobby mapmakers, game masters | Both: options, then editors, locks and per-layer regeneration | 9 heightmap brushes, templates, culture paint brush, locks, 100-step undo | `.map` file, seed URL, Dropbox | The best match for Nomos: locks plus regenerate, and an honest warning about seed links |
| Inkarnate | Hobby mapmakers | A landmass wizard, then painting | Landmass brushes, 30K+ stamps, brush and object layers | 237K+ cloneable maps | "Clone and remix" is the social loop |
| Wonderdraft | Hobby mapmakers | A landmass wizard, then painting | Landmass, water, symbols, paths, labels, themes | Image export, saved maps | Generate the coastline, then let people decorate |
| LDtk | Game developers | None; auto-layer rules skin painted IntGrid values | IntGrid, auto-layer rules, typed entities, worlds | JSON, "super simple export" | Nomos's planned kit editor (optional under question 1's pipeline); paint meaning, let rules draw tiles |
| Tiled | Game developers | None; automapping rules with random outputs | Stamp brush with random mode, terrain brush, automapping, saved stamps | TMX, JSON | Stamps with variations and probabilities make hand-made maps look less tiled |
| RPG Maker MZ | Hobby game makers | Both: Generate Dungeon, then hand edits | Pencil, rectangle, ellipse, fill, shadow pen; 4 layers or Auto; autotiles | Game projects | Generate "the bones", then edit; regenerate until a layout inspires |
| Porymap | Hackers of the pret decompilations (LGPL-3.0) | None | Metatile pencil, bucket, Smart Paths, prefabs, events, connections | Project files | Prefabs as saved selections with toggled cells; study only |
| NetLogo | Modellers, teachers, students | Setup procedures read sliders; models may let users paint | Sliders, switches, choosers, setup and go buttons; `mouse-down?` painting; BehaviorSpace | `.nlogo` files, NetLogo Web | Sweeps with seeded repetitions are the teacher's experiment tool |
| Nicky Case's explorables | Readers | Hand-built scenes, then a sandbox | Drag shapes, sliders, network drawing, emoji grid and rules | CC0 code; emoji sims load by URL parameter | The full sandbox goes at the end, after guided steps |
| PhET and PhET Studio | Teachers, students | Customise a fixed sim's state and interface | Hide controls, set starting state, rename labels, disable interaction | Studio-generated launch files; paid licence | Teachers want to shape the setup and hide distractions, not draw worlds |
| Factorio | Players | Presets and sliders before generation, with a live preview | Resource frequency, size and richness; water, trees, cliffs, enemies | Map exchange string | One pasteable string carries the seed and every setting |

### Cited Findings

City builders:

- **Cities: Skylines map editor** ([wiki](https://skylines.paradoxwikis.com/Map_Editor), opened). Shift, Level, Soften and Slope brushes run from size "50 to 2000" and strength "0.01 to 1.00". Heightmaps are "1081px x 1081px", 16-bit preferred. A map side "is 17,28 km so one city tile side equals 1,92 km", and the game play area is 25 of those tiles. Publishing requires a "Water stream in the starting area" and one highway in and out. The editor has no procedural generation.
- **Cities: Skylines asset editor** ([wiki](https://skylines.paradoxwikis.com/Asset_Editor), opened). Templates give "pre-defined asset types". Suggested LOD budgets are 100 triangles for growables and under 50 for props.
- **Cities: Skylines theme editor** ([wiki](https://skylines.paradoxwikis.com/Theme_Editor), opened). "The map theme is not embedded in the map asset but needs to be available separately."
- **Cities: Skylines scenario editor** (search summary of a [dev diary](https://forum.paradoxplaza.com/forum/threads/cities-skylines-natural-disasters-dev-diary-2-scenario-editor.971389/)). It adds win and lose conditions to a map or savegame through stacked triggers on population, cash, crime rate and more. The [Scenarios page](https://skylines.paradoxwikis.com/Scenarios) (opened) lists 14 shipped scenarios across four packs.
- **Cities: Skylines II editor** ([Modding Dev Diary #2](https://www.paradoxinteractive.com/games/cities-skylines-ii/modding/dev-diary-2-map-editor), opened). Heightmaps are "4096x4096 pixels", 16-bit PNG or TIFF, with an optional world map whose centre 1024² matches the playable area. Resource maps are 256×256 grayscale. Four water-source types exist. The map editor shipped on 25 March 2024 (search summary), about 5 months after the game's October 2023 launch (inference from the release dates).
- **SimCity 4** ([Wikipedia](https://en.wikipedia.org/wiki/SimCity_4), opened). Region layout "can be changed in a bitmap file provided for each region". Segments run from 1 km to 4 km a side. "Most terraforming tools are disabled after the city is named and founded", and Mayor-mode terraforming is "much smaller scale ... and costing money".
- **Townscaper** ([Steam](https://store.steampowered.com/app/1291340/Townscaper/), opened): "No goal. No real gameplay." Players "pick colors from the palette, plop down colored blocks", and the algorithm builds houses. 95% of 10,619 reviews are positive. [Hacker News thread](https://news.ycombinator.com/item?id=29404447) (opened): the town is URL-encoded as a bit array in a custom web-safe base 64; "He designed it so you can fit a saved town in a tweet" (a commenter quoting Stålberg).

God games and strategy:

- **WorldBox** ([Steam](https://store.steampowered.com/app/1206560/WorldBox__God_Simulator/), opened): "Generate worlds of different sizes" and "Share your maps"; 96% of 29,818 reviews positive. Update 0.14.0 added generator templates such as Continent, Islands and Donut (search summary of the [wiki changelog](https://the-official-worldbox-wiki.fandom.com/wiki/0.14.0_-_Everythingbox)). [Wikipedia](https://en.wikipedia.org/wiki/WorldBox) (opened) lists power groups from World Creation to Destruction.
- **Civilization VI WorldBuilder** ([CivFanatics, June 2019 patch notes](https://forums.civfanatics.com/threads/june-2019-patch-notes-discussion.646833/), opened): "WorldBuilder Basic Mode is now 'on' by default", beside "Worldbuilder Editor Advanced Mode (Unsupported)". A [2021 usage guide](https://forums.civfanatics.com/threads/world-builder-usage-guide-2021.666599/) (opened) reports that player cities and units placed in Advanced mode vanish after save and reload.
- **Civilization VII** ([CivFanatics thread, March 2025](https://forums.civfanatics.com/threads/world-builder.696372/), opened): no official WorldBuilder; "there are references to a Worldbuilder in the files". Map scripts are JavaScript files ([template thread, 7 February 2025](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/), opened). Firaxis's [map-generation post](https://civilization.2k.com/civ-vii/from-the-devs/map-generation/) (opened) moved to Voronoi plates after players called maps "too repetitive". It ships the scripts for modders and gives "normal" maps "95% of the time".
- **Civilization IV** (search summary of [CivFanatics](https://forums.civfanatics.com/threads/mapscript-scenariomap.315047/)): Python map scripts plus WorldBuilder saves; community tools convert saves into deterministic map scripts.

Colony sims and sandboxes:

- **RimWorld world generation** ([wiki](https://rimworldwiki.com/wiki/World_generation), opened): "A given seed always produces the same geographical features". Globe coverage is 30%, 50% or 100%, and larger coverage "takes a longer time to load up". There are rainfall, temperature, population and pollution settings, at most 11 factions, and maps of 200×200 to 400×400 cells.
- **RimWorld scenario editor** ([wiki](https://rimworldwiki.com/wiki/Scenario_system), opened): scenarios let players "choose, randomize, and customize special situations". Parts cover start conditions, pawns (at most 10), items, permanent game and map conditions and forced traits. They are saved, loaded and shared through Steam Workshop.
- **Dwarf Fortress basic generation** ([wiki](https://dwarffortresswiki.org/index.php/World_generation), opened): world size, history length, civilizations, sites, beasts, savagery and minerals. Worlds that fail checks are rejected and regenerated.
- **Dwarf Fortress advanced generation** ([wiki](https://dwarffortresswiki.org/index.php/Advanced_world_generation), opened). Sizes are 17 to 257 tiles a side. There are dozens of parameters and four seeds (world, history, name, creature). Sets live in `world_gen.txt`. Changing rainfall will not give "the same world but drier or wetter". If square minimums exceed the map, "you will get infinite world rejection".
- **Dwarf Fortress World Painter** ([wiki](https://dwarffortresswiki.org/index.php/World_painter), opened). It painted elevation, rainfall, temperature, drainage, savagery and volcanism as inputs to generation. It "does not currently exist in the game" (v53.16); the workaround is an old version or the third-party Perfect World DF.
- **Minecraft Old Customized** ([wiki](https://minecraft.wiki/w/Old_Customized), opened). It was added in 14w17a (2014) and removed in 18w06a (2018) "With the rewrite of terrain generation". It had three pages (18 basic options, 11 ore sections, 16 advanced options), 7 presets and JSON preset codes. Its 2020–2023 JSON successor was also removed ([wiki](https://minecraft.wiki/w/Customized), opened). Data packs replaced it.
- **Minecraft presets** ([world presets](https://minecraft.wiki/w/World_preset) and [Superflat](https://minecraft.wiki/w/Superflat), opened). There are six world presets and nine Superflat presets. "The preset code can be highlighted and copied, allowing it to be shared."
- **Factorio** ([wiki](https://wiki.factorio.com/Map_generator), opened). There are 9 presets and resource frequency, size and richness sliders. The map exchange string "can be used to share all map generation settings between different players". The preview lets players "experiment with different settings". **Oxygen Not Included** shares worlds as codes such as "SNDST-A-123456789-0" (search summary of [Steam discussions](https://steamcommunity.com/app/457140/discussions/0/2944710017716650820/)).

Map makers:

- **Azgaar's heightmap editor** ([wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization) and [source](https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/src/controllers/heightmap-editor.ts), both opened):
  - Erase "regenerates all data". Keep retains data but "does not allow changes to the coastline". Risk changes the coast and restores data, but "can potentially cause some errors".
  - Nine brushes have radius 1–100 and power 1–10, filtered to all, land or water cells.
  - Undo holds `historyLimit = 100` snapshots, each a full copy of the height column. Exit fails with "There should be at least 200 land cells!"
- **Azgaar's culture editor** ([source](https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/src/controllers/cultures-editor.ts), opened). It has a "Manually re-assign cultures" paint mode limited to land cells, a "Lock culture" toggle, and recalculation from growth attributes. It has no undo.
- **Azgaar's locks and regeneration** ([changelog](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog) and [Quick Start](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Quick-Start-Tutorial), opened). Version 1.89 added locks for states, provinces, cultures and religions. The Regenerate menu re-runs about 16 layers, from cultures to zones. Pre-generation options include template, points (10K recommended) and counts of cultures, states, burgs and religions. "The only reliable method is to have a `.map` file saved on your machine."
- **Azgaar's URL parameters** ([wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/URL-parameters), opened): `seed`, `options=default`, `width`, `height`, `maplink` and view parameters. A seed link works, but "a different generator version will produce a different map".
- **Inkarnate** ([homepage](https://inkarnate.com/), opened): browser-based, "30K+ Available Assets", "237K+ Cloneable Maps", "16M+ Maps Created", free tier and paid commercial use. The Landmass Wizard sets pattern, roughness and water level, then four landmass brushes refine it (search summary of a [layers guide](https://loreteller.com/learn/inkarnate-layers-guide/)).
- **Wonderdraft** ([quick guide](https://github.com/Megasploot/Wonderdraft/wiki/Quick-Guide), opened): new map and theme, then the Landmass Wizard, then Water, Landmass, Symbols, Labels and Overlay tabs, then PNG or JPEG export.

Tile editors:

- **LDtk** ([homepage](https://ldtk.io/), [auto-layers](https://ldtk.io/docs/general/auto-layers/) and [GitHub API](https://api.github.com/repos/deepnight/ldtk), opened): MIT, "By game devs, for game devs". Rules "paint tiles automatically" from hand-painted IntGrid values. It exports JSON or "a few PNGs per levels, a tiny JSON".
- **Tiled** ([tile layers](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) and [automapping](https://doc.mapeditor.org/en/stable/manual/automapping/), opened). It has a stamp brush with random mode, a terrain brush, fills and saved stamps with variations. Automapping can run "While Drawing", choosing a random output index weighted by probability.
- **RPG Maker MZ** ([help](https://rpgmakerofficial.com/product/MZ_help-en/01_07_01.html) and [blog](https://www.rpgmakerweb.com/blog/upgrading-a-generated-dungeon), opened). It has pencil, rectangle, ellipse, flood fill and shadow pen, plus Auto or layers 1–4 and autotiles. Generate Dungeon can be re-run until a layout suits; then "Build the bones", reshape walls and decorate.
- **Porymap** ([manual](https://huderlem.github.io/porymap/manual/editing-map-tiles.html) and [GitHub API](https://api.github.com/repos/huderlem/porymap), opened): LGPL-3.0, an editor for the pret decompilations. Smart Paths needs "a 3x3 metatile selection". Prefabs are saved selections "where individual metatiles can be toggled on/off".

Educational sims and explorables:

- **NetLogo** ([Interface tab](https://docs.netlogo.org/interfacetab.html), [dictionary](https://docs.netlogo.org/dictionary.html) and [BehaviorSpace](https://docs.netlogo.org/behaviorspace.html), opened):
  - Buttons, sliders, switches, choosers and input boxes set globals.
  - `if mouse-down? [ ask patch mouse-xcor mouse-ycor [ set pcolor red ] ]` paints patches.
  - BehaviorSpace runs "All combinations of the specified values" with repetitions, seeded by `random-seed (474 + behaviorspace-run-number)`, headless with threads.
- **NetLogo Diffusion Sandbox** ([model page](https://ccl.northwestern.edu/netlogo/models/PNoM1DiffusionSandbox), opened). It "enables students to draw a model to 'sketch' representations of new systems", with tools such as "draw basic wall" and "big eraser".
- **Nicky Case on sandboxes** ([design patterns](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md) and [method](https://github.com/ncase/blog/blob/main/src/posts/how-i-make-an-explorable-explanation.md), opened). Case puts "the full 'sandbox mode' at the end of the explorable", because open sandboxes overload readers. "At the end, I want them to explore their own questions."
- **Case's builds** ([Polygons](https://github.com/ncase/polygons/blob/gh-pages/index.html), [Crowds](https://github.com/ncase/crowds) and [emoji sim](https://github.com/ncase/sim), opened). Polygons asks readers to "drag & drop unhappy polygons", then ends with "a big ol' sandbox". The Crowds sandbox adds, moves and deletes people and links. The emoji sim loads models by URL parameter. All are CC0.
- **PhET customisation** ([PhET-iO customise](https://phet-io.colorado.edu/io-features/customize.html) and [DevGuide](https://phet-io.colorado.edu/devguide/), opened). It can hide screens and controls, disable interaction, set the starting state and rename labels. Studio generates "an HTML file that will launch the simulation in the customized state". PhET Studio launched in early 2025 as a paid annual licence for educators (search summary of [PhET pages](https://phet.colorado.edu/en/studio/overview/pricing)).

### Inferences

- **Azgaar's generator is the closest model for Nomos.** It is a seeded pipeline in the browser with options before generation, per-layer regeneration, locks and editors. Its three heightmap modes show the real cost: changing a coastline under existing settlements and cultures either erases them or risks errors.
- **Sims with deep state freeze heavy edits once time starts.** SimCity 4 disables terraforming after founding, and Cities: Skylines checks a map before publishing. Nomos's ledger and replay rules point the same way: terrain edits belong before day 0, never mid-run.
- **Agent-level scenario tools are the risky part, not terrain.** Civ VI's Advanced mode lost placed cities on reload years after release. RimWorld avoids map editing in scenarios: a scenario is a list of start conditions and forced rules. Nomos's lab cards already work that way.
- **Expose meaning, not generator internals.** Minecraft's three pages of 45-plus options died with a generator rewrite, and Dwarf Fortress shows that a rainfall change re-rolls the world. A few named settings plus presets survive generator versions.
- **Share links need a generator version, or the data.** Azgaar states it plainly, and Factorio and Minecraft share settings strings rather than worlds. Townscaper fits a whole build in a URL only because a town is a small bit array.
- **Teachers shape setups and hide distractions.** PhET Studio sells exactly that, and NetLogo's sweeps are the experiment engine. No teaching tool surveyed asks teachers to paint a world tile by tile.

### Gaps

- Fandom wikis (WorldBox, Civilization) and the SC4 Devotion wiki refused automated access (HTTP 402 or 403). WorldBox templates and Civ VI Basic-mode tools rest on search summaries.
- PhET Studio's own pages render client-side and returned no text. Its launch date, price and sharing flow are from search summaries.
- No usage figures were found for how many players open any of these editors, so "players want builders" is unmeasured. Workshop counts were not collected.
- The Cities: Skylines II "Behind the Scenes: Editor" diary sat behind a browser check and was not read.
- Inkarnate and Wonderdraft tool details come from homepages and a quick guide, not full manuals.

## 2. The spectrum for Nomos: four levels, who each serves, effort and MVP order

### Takeaway

- **Build Level 1 and Level 4 first, and only a sliver of Level 3.** World settings before generation cost about 2–4 days for towns (M6) and 5–8 days for the country (M8). A teacher "card remix" costs 3–5 days. Level 4 costs 2–4 days on the current LDtk plan. It becomes an 8–12-day developer-flag Build mode if question 1's "generate, then hand-edit" hero towns are adopted. The total is 12–29 days, 7–21 of them before launch (unsourced estimates).
- **The first builder user is the owner, then teachers, then players.** Question 4 proposes starting Build mode "behind a developer flag", and question 1 needs it to hand-edit generated hero towns. Players get settings and presets at launch. A player-facing map editor waits for demand.
- **Level 1 is cheap, but its settings must be grouped by stage.** About 10 world-level choices are already single keyed draws, so each becomes "the user's value, or the draw" (computed from the code). Changing the wonder count left every other stage identical in 12 of 12 seeds. Changing template or land share changed every stage in 12 of 12 (measured here).
- **Level 2 god tools cost 14–22 days; a lock-and-re-roll subset costs 6–9.** Brushes are easy, but every terrain edit cascades into drainage, climate, towns and roads, which is why Azgaar needs Erase, Keep and Risk modes. Defer Level 2 until after M8, and build it only if playtests ask for it.
- **A full Level 3 editor for players costs 22–34 days and carries the most content risk.** That is a street editor plus card authoring, 15–34% of the 100–150-day launch plan. Leave both out of the plan; serve teachers with card remix instead.

| Level | What it does | For whom | Reuses | Effort (unsourced estimate) | Main risk |
|---|---|---|---|---|---|
| 1a. Town settings (M6) | Seed with re-roll, 3–5 presets, and the place record's size tier, biome, river, coast and port (question 1 merges the records and drops walls) | Players, teachers, the owner | M6 city generator (round 4's prototype: 5–59 ms a town), share URL | 2–4 days | Size tiers must respect device tiers |
| 1b. Country settings (M8) | About 10 overrides, the standard (96×64) or large (192×128) map from question 1, and a culture count, grouped by stage, with presets, a live preview and validation | Players, teachers, the owner | M8 generator (question 1 estimates 15–35 ms in JS), culture-hearth fairness check, name filter | 5–8 days | Early settings re-roll everything; culture count must keep the land-quality balance |
| 2-lite. Lock and re-roll | Pin towns and wonders, re-roll a stage (its own salt), move a town to a valid site, undo through the edit log | Players, mapmakers | Stage-keyed draws, question 3's per-stage edit layers | 6–9 days | Pins must feed placement without breaking spacing or the culture balance |
| 2. Full god tools | Level 2-lite plus raise, lower and smooth brushes, biome paint, drawn rivers and roads with re-routing | Players who enjoy god games | Level 2-lite | 14–22 days in total | Terrain edits cascade into every later stage |
| 3a. Card remix | A teacher picks which knobs students see, locks values, chooses a treatment from the card's valid options, picks a prompt template, and shares a link or QR code | Teachers, curious players | M1 cards and runner, M6 links | 3–5 days | Hand-picked setups that flatter a result; free text |
| 3b. Street editor for players | Paint street tiles with autotiling, place buildings and props, edit home, shop and workplace zones | Creators, modders | Level 4's Build mode, opened to players | 16–24 days for question 4's first usable builder | Content rules (house styles, crime cues); asset import would invite Nintendo assets |
| 3c. Card authoring | New cards from scratch: arms, metrics, claim type, seeds, unlocks, prediction text | Advanced teachers, the owner | M1 statistics | 6–10 days | Under-powered or misleading claims; text that breaks the culture rules |
| 4. Internal content tool | Current plan: LDtk plus a validator CLI and a hot-reload preview. With question 1's generated-then-edited hero towns: a developer-flag Build mode (terrain brush, rectangle, fill, prefab stamps, undo, save and load, Play) | The owner, future contributors | M0 LDtk loader and converter; question 4's editor prototype | 2–4 days (LDtk path) or 8–12 days (question 4's minimal Build mode) | None new; the Build mode is also the seed of any later Level 3b |

**MVP order:**

1. **Level 4 with M3.** Use the LDtk path (2–4 days) if the default town stays hand-made. Build the developer-flag Build mode (8–12 days) if M3 adopts question 1's "generate, then hand-edit". Either way the owner is the first user.
2. **Level 1a with M6** (2–4 days): a "New town" panel, the first thing players and teachers can share.
3. **Level 3a once M1 cards and M6 links exist** (3–5 days): the teacher's builder, with no map painting.
4. **Level 1b with M8** (5–8 days): a "New country" panel.
5. **Level 2-lite after M8, only on playtest demand** (6–9 days). Add brushes later (8–13 more days).
6. **Levels 3b and 3c: not planned.** Revisit after launch only with evidence, such as repeated teacher requests. Level 3b would open the Build mode to players, at 8–12 more days for question 4's full first usable builder.

### Cited Findings

- **World-level choices in the reference generator** (`tools/worldgen`, read here; computed). Each choice below is one keyed draw:
  - template, `below(5, seed, SHAPE, PICK)` (`terrain.py` line 278);
  - land share, 400–600‰ by template (line 280);
  - mountain chains, 1–3 (line 213);
  - wind side and incoming wetness (`climate.py` lines 23 and 26);
  - cold edge, cold level and warm span (lines 53–55);
  - settlement density and capital size of 150,000–500,000 (`settle.py` lines 60 and 82);
  - wonder count, 4–8 (`features.py` line 194).

  `world.generate(seed, width=96, height=64)` already takes size. Culture count is not in the generator yet; M8 plans 4–8 hearths ([plan](../../../plan/implementation-plan.md), opened).
- **Stage sensitivity** (measured here; CPython 3.14.6 on the round's Windows desktop; Git Bash's emulated `/proc/loadavg` 8.75 / 4.78 / 3.29 before and 4.41 / 4.51 / 3.46 after, shared with other agents). Twelve seeds were run, each regenerated with one keyed draw shifted. Cells give how many of the 12 seeds kept each stage identical. "Biomes" includes farmland, which follows settlements.

  | Setting changed | Coast | Elevation | Rivers | Temperature and moisture | Biomes | Settlements | Roads | Wonders | Landmarks |
  |---|---|---|---|---|---|---|---|---|---|
  | Template | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
  | Land share | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
  | Mountain chains | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
  | Wind side | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
  | Wetness | 12 | 3 | 5 | 0 | 2 | 4 | 4 | 8 | 6 |
  | Cold edge | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 1 | 0 |
  | Settlement density | 12 | 12 | 12 | 12 | 0 | 0 | 0 | 8 | 0 |
  | Wonder count | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 1 | 12 |

- **Reference generator speed** (measured here, same run). One world on the 96×64 grid took a median of 1.59 s [1.31–2.48] over 12 samples after 1 warm-up. This is the Python reference, not the planned TypeScript port. Round 4's mesh prototype built a 1,000-settlement country in 0.59 s in Node ([round 4 report](../../round-4-multi-scale/report.md), opened), and M8's exit check is ≤ 1.5 s.
- **Generation speed for previews.** Round 4's town generator built a 48×48 village in 5 ms, a 128² town in 28 ms and a 256² city in 59 ms warm in Node ([round 4 report](../../round-4-multi-scale/report.md), opened). Round 9's other notes (measured there, desktop, not phones):
  - question 1's JS terrain stage took 8.6 ms in Node and 7.8 ms in Chromium at 96×64, matching Python on 300 of 300 seeds, and it estimates 15–35 ms for a whole country ([map-pipeline.md](map-pipeline.md), Q2 and Q4);
  - question 4 estimates 21–87 ms for a new seed in TypeScript, 17–45 ms after an elevation edit and about 6 ms after moving a settlement ([editor-tech.md](editor-tech.md), section 3).

  So both Level 1 panels can regenerate on every change, and Level 2 edits can re-run live once the port exists.
- **Edit blast radius** ([edits-and-saves.md](edits-and-saves.md), section 2; measured there, 30 seeds). Without locks, a radius-2 valley changed a median of 25 place layouts and an added village 35. With locks and stable uid keys, the village case fell to 2. Deleting a settlement without lowering the count respawned a replacement in 30 of 30 cases.
- **Builder effort from question 4** ([editor-tech.md](editor-tech.md), section 5; unsourced estimates there): 16–24 days for a first usable Build mode and 8–12 days for a terrain-and-prefab minimum. Question 4 suggests starting the mode "behind a developer flag".
- **Question 1's pipeline** ([map-pipeline.md](map-pipeline.md), Q1): hero towns "are generated, then hand-edited"; LDtk "becomes optional, for authoring kits and interop"; and the 3–5 days of village-kit authoring in M9 are dropped.
- **The plan's own effort anchors** ([plan](../../../plan/implementation-plan.md), opened):
  - launch is 20–30 weeks (100–150 days) and country mode 55–83 days;
  - M8 is 13–20 days;
  - authoring the default town is 3–5 days in M3, and village kits 3–5 days in M9;
  - M6 already parameterises the city generator by a context record and encodes seed and config in share URLs.
- **Azgaar's edit cost** (section 1, opened). Heightmap edits need Erase, Keep or Risk, and Risk re-runs biomes, cultures, burgs, provinces, religions and routes. Locks arrived in version 1.89, long after per-layer regeneration in v0.9b.

### Inferences

- **Effort breakdowns** (unsourced estimates; the totals are computed sums):
  - **Level 1a:** settings schema 0.5 day, panel with presets and live preview 1–1.5, link fields 0.5, tests 0.5–1. Round to 2–4 days.
  - **Level 1b:** overrides 1 day, stage grouping 0.5, preview in the worker 1.5–2, validation 1, links and 4–6 presets 0.5–1, tests 1. Round to 5–8 days.
  - **Level 2-lite:** stage salts 1 day, pins honoured by placement 2–3, lock, move and re-roll UI with undo 2–3, validation and tests 1–2. That gives 6–9 days.
  - **Full Level 2:** add brushes 2–3 days, places and routes 3–5, wider validation 2–3, save and share 2–3. That gives 14–22 days.
  - **Level 3a:** UI 1.5–2 days, card schema for exposed knobs and options 0.5–1, link 0.5, prompt templates instead of free text 0.5, tests 0.5–1. That gives 3–5 days.
  - **Level 3b:** my own split (tile painter 8–12 days, zone placement with validation 4–6, sharing 2) gives 14–20 days. That agrees with question 4's component table (16–24), which I adopt.
  - **Level 4, LDtk path:** validator CLI 1–2 days, preview page 1–2. That gives 2–4 days.
  - **Level 4, Build-mode path:** question 4's minimum, 8–12 days. M3's 3–5 days of town authoring remain, spent editing a generated town instead of drawing one in LDtk.
- **Re-roll per stage comes almost free.** Each stage already draws from its own stream. Folding a per-stage re-roll counter into that stream's salt re-rolls one stage and keeps earlier ones. The wonder-count row shows the property holds today for late stages.
- **Label each setting with what it keeps.** A Level 1 panel can say "keeps your coastline" for climate settings and "keeps the map" for towns and wonders. Template, land share and mountain chains should say "new world". This answers Dwarf Fortress's documented surprise.
- **The panel's order should follow the pipeline:** shape, then climate, then people, then features.
- **Card remix beats free placement for teachers.** Choosing among a card's pre-validated sites (for example police post A, B or C) can never be invalid. It fits in a short link, and it keeps the M1 verdict machinery meaningful. It is the Townscaper lesson applied to experiments.
- **Never accept asset import.** Any editor that loads user images would let shared links carry Nintendo or other unlicensed tiles. Keep every builder level on Nomos's own atlas.

### Gaps

- All efforts are unsourced estimates in the plan's style. I prototyped no editor code, and the AI-assistant speed-up is assumed, not measured.
- The stage-sensitivity run used the Python reference with one shifted draw per setting. The TypeScript port may couple stages differently if it changes stage order.
- Whole-country TypeScript times are estimates from ported kernels (questions 1 and 4). No phone timing exists.
- How often culture-hearth layouts fail M8's land-quality check, and so how many retries a culture-count setting causes, is untested: M8's tolerance is not set yet.

## 3. Fit with Nomos's goals: teaching, replays and sharing, solo capacity, content rules, culture painting

### Takeaway

- **Teachers get controlled experiments from paired arms, not from two hand-built towns.** In one world, arm B carries the one edit (for example the police post), and both arms run the same seed list. In a toy, moving a post one cell gave paired differences with an SD of 22.7 offences (arm correlation 0.92), against 61.4 for unpaired seeds (measured here).
- **Builder edits must keep entity IDs stable, or pairing is lost.** An edit that re-keyed agents' draws raised the SD to 63.4 (correlation 0.32), as bad as unpaired seeds. Seeds needed scale with SD², so that costs 7–8× the seeds. Shifting only home assignment cost 1.9× (measured here and computed).
- **Sharing stays cheap if the world is defined as generator version + seed + settings + edit log.** Level 1 settings add about 11 bytes, or 14 URL characters (computed). Question 3 measured 100 mixed edits at 326 URL characters, and 1,000 at 2,047, still inside a QR code's 2,953 bytes. Edits apply before day 0, never mid-run.
- **The content rules forbid whole classes of builder tools, and players should not paint cultures.** No house-style or district-wealth paint, no "criminal" or "gang" placement, no hue painting, no unfiltered names. Random user-placed culture hearths met question 3's fairness bars in 0 of 723 layouts. Round 8 found that housing clusters alone made 8.2× arrest gaps. Offer a culture count instead.

### Cited Findings

- **Paired seeds in the plan** ([plan, M1](../../../plan/implementation-plan.md), opened). Comparisons run "on 50 paired seeds per arm"; first seeds are hand-picked and labelled. Scripted events are allowed "only as logged inputs on lab and scenario cards". Round 2 notes that paired seeds halve the seeds needed when paired results correlate at 0.5 ([round 2 report](../../round-2-follow-up/report.md), opened).
- **Common random numbers** ([Wikipedia, Variance reduction](https://en.wikipedia.org/wiki/Variance_reduction), opened). CRN "requires synchronization of the random number streams": "a specific random number used for a specific purpose in one configuration is used for exactly the same purpose in all other configurations". The variance of a paired difference is [Var X₁ + Var X₂ − 2 Cov] / n.
- **Paired-arm toy** (measured here; CPython 3.14.6; Git Bash's emulated `/proc/loadavg` 3.17 / 3.45 / 3.32 before and 3.70 / 3.56 / 3.36 after). The setup:
  - 400 agents on a 32² grid, 70% of homes in a 10×10 cluster;
  - 100 ticks, offending 5% a tick, cut to 2% within 6 cells of the post;
  - the post moves from (8, 8) to (9, 9), over 50 seeds × 2 arms;
  - keyed draws use a lowbias32-style mix, as in round 4.

  Baseline was a mean of 1,165 offences per run, and B − A was about +126.

  | Arm B relative to arm A | SD of B − A | corr(A, B) | Seeds needed, relative to paired (computed, ∝ SD²) |
  |---|---|---|---|
  | Same world, same draws (stable IDs) | 22.7 | 0.922 | 1× |
  | Same draws, homes shifted by one index | 31.2 | 0.822 | 1.9× |
  | Same world, agents' draws re-keyed | 63.4 | 0.320 | 7.8× |
  | Unpaired seeds (different world and draws) | 61.4 | 0.213 | 7.3× |

  A first run with a three-cell move gave SDs of 33.4 (paired), 34.3 (homes shifted) and 56.3 (unpaired).
- **Generator versions break seed links** ([Azgaar URL parameters](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/URL-parameters), opened): "a different generator version will produce a different map". The plan already puts "generator versions" in M6 share URLs, and round 4 keeps "only edits and the generator version" in saves ([plan](../../../plan/implementation-plan.md); [round 4 report](../../round-4-multi-scale/report.md); both opened).
- **URL and QR limits.** "Chrome limits URLs to a maximum length of 2MB", and the omnibox shows at most 32 kB ([Chromium URL display guidelines](https://chromium.googlesource.com/chromium/src/+/main/docs/security/url_display_guidelines/url_display_guidelines.md), opened). A version 40 QR code at level L holds at most 2,953 bytes. I saw this only in a search summary of a [capacity guide](https://www.qr-code-generator.com/blog/qr-code-data-capacity/); question 3 opened the [Denso Wave standard](https://www.qrcode.com/en/about/standards.html).
- **Level 1 link size** (computed). A 32-bit seed, a 16-bit generator version and 11 settings of 2–4 bits each (an "auto" value plus a few choices) total 82 bits. That is about 11 bytes, or 14 base64url characters.
- **Edit-log links** ([edits-and-saves.md](edits-and-saves.md), sections 1 and 5; measured there, 20 synthetic logs on the 96×64 grid). Columnar varints, deflate-raw and base64url gave 90, 326, 2,047 and 17,083 URL characters for 10, 100, 1,000 and 10,000 mixed edits. Question 3 proposes plain links up to 2,000 characters (QR code and free Discord message), and a `.nomos` file above 8,000. It also recommends that links never carry free text.
- **Hearth fairness under user placement** ([edits-and-saves.md](edits-and-saves.md), section 4; measured there, 20 worlds × 40 layouts of 4–8 hearths).
  - Keyed Poisson-disc hearths gave a median people-weighted land-quality gap of 39.8%.
  - Uniform random hearths, "a user clicking anywhere", gave 40.3%.
  - Both bars (gap ≤ 10%, population shares ≤ 2×) held in 1 of 769 Poisson-disc layouts and 0 of 723 uniform ones.
  - Question 3 concludes "users should not place hearths in v1" and lets them choose the number of cultures (4–8).
- **Question 1 flags the same wealth-prefab conflict** ([map-pipeline.md](map-pipeline.md), Q1, conflict 16): "Drop; content rule 5 bans them".
- **Ledger spin-up comes after world creation.** M8 spins the culture ledger up "50–100 years before play" ([plan](../../../plan/implementation-plan.md), opened). Round 4's shadow-canonical design makes the ledger own history ([round 4 report](../../round-4-multi-scale/report.md), opened).
- **Plan effort** ([plan](../../../plan/implementation-plan.md), opened): 20–30 weeks to launch (100–150 days) and 55–83 days of country mode, all "unsourced guesses".
- **Content rules** (`.claude/rules/content.md`, opened):
  - "Wealth never shows in bodies, clothes or houses by default", and "Crime is an act, never a costume".
  - Hues are assigned "at random at birth; no sim rule ever reads hue".
  - Culture "never appears where crime is shown".
  - Generated names "must pass the CI filter".
- **M3's home rule** ([plan](../../../plan/implementation-plan.md), opened): "no tile, roof, size or decoration may depend on the occupant's wealth or the home's price". The reference generator draws house styles uniformly "so no style reads as richer or poorer" ([worldgen README](../../../../tools/worldgen/README.md), read here).
- **A conflict in round 4** ([round 4 report](../../round-4-multi-scale/report.md), opened): cities are "zoned into districts whose prefab variants reflect wealth and crime". That contradicts content rule 5 and M3's home rule.
- **Round 8's guardrails** ([summary](../../round-8-cultures/summary.md), opened):
  - clustered housing alone gave "3.2× stop and 8.2× arrest gaps between cultures";
  - abstract labels do not prevent stereotypes;
  - housing ignores culture, and the culture lens is opt-in and hides justice cues.
- **M8's hearth check** ([plan](../../../plan/implementation-plan.md), opened): "reject layouts whose cultures differ in mean land quality or development beyond a set tolerance". M4 already runs the audit "against a single-culture world".
- **Prior art paints cultures without a crime layer.** Azgaar has a "Manually re-assign cultures" brush (section 1, opened). Its cultures carry no policing, so it offers no precedent for Nomos's risk (inference).
- **PhET's implicit scaffolding** ([PER-Central abstract](https://www.per-central.org/items/detail.cfm?ID=12838), opened). A redesigned sim "demonstrate[s] increased usability and learning" for middle-school students. The framework uses affordances, constraints, cueing and feedback rather than explicit guidance (search summary of the [PhET research page](https://phet.colorado.edu/en/research)).

### Inferences

- **Teaching design:**
  - A teacher's setup is one treatment diff on one world, run as paired arms by the M1 runner. Show the arms as two synced small panels, as round 2 recommends for true and recorded crime.
  - Two towns side by side in one country are a worse design. Migration, trade and commuting couple them, and their keyed draws differ by settlement ID.
  - A hand-built map is one site, so its verdict should say "on this map". An optional "test on 10 generated worlds" run can show whether the result travels.
  - Teacher-made cards keep the "hand-picked setup" label and the toy-not-forecast note, and the bet locks before Run.
- **Stable IDs are a hard requirement for edits:**
  - Generated entities keep IDs keyed by (world seed, stage, local index); new entities get fresh appended IDs; deletions leave tombstones.
  - Extend round 4's check ("logging a focus change that touches nothing leaves the replay hash unchanged") to "a no-op edit leaves the hash unchanged".
  - Add "a treatment edit changes no unrelated entity ID".
- **No terrain edits after day 0.** Terrain changes would invalidate the ledger spin-up, the emulator's fit and the culture balance. God powers during a run, such as a harvest shock, stay logged scenario inputs, as M1 and M5 already allow.
- **Link hygiene.** A link is hand-editable, so the client re-runs the name filter and text lints on load. Simplest is no free text: names come from the generator with a re-roll button, and card prompts come from templates.
- **Solo capacity.** The recommended MVP is 12–29 days, of which 7–21 fall before launch: 5–21% of the 100–150-day launch plan (computed). The upper end applies only if M3 adopts the generated-then-edited town, whose Build mode replaces LDtk work. Full god tools (14–22 days) and a player street editor plus card authoring (22–34 days) would each rival a whole milestone. Every level also widens the surface that determinism tests, content lints and the culture audit must cover.
- **What the content rules exclude, tool by tool:**
  - House styles are a keyed uniform draw with a "restyle" re-roll. Offer no "fancy" or "poor" building sets and no district wealth paint.
  - Builders place conditions (stations, patrol routes, reporting rates, jobs), never kinds of people. There is no "thief" or "gang" placement, matching round 2's "a state a citizen enters and leaves".
  - No tool sets or paints hue.
  - The culture view, if any, hides justice cues, and lab-card treatments never key on culture.
  - Drop round 4's "prefab variants reflect wealth and crime". Question 1 reaches the same conclusion.
- **Why not paint cultures:**
  - A painted map is a culture surface by definition. Its effects flow into crime outcomes through exposure, as round 8's housing and festival toys showed.
  - Even the generator's own random hearths almost never balance land quality (question 3: 1 of 769), so free painting would fail the check nearly every time. Generator re-placement after each edit is the only route that can pass.
  - The nightly audit runs on generated seeds, not on user worlds, so a painted world would sit outside the audited distribution.
- **Culture count as the only culture setting.** Offer 4–8 for normal worlds, as question 3 proposes. Add a "single culture" switch for lab cards and classrooms, since M4 already audits against a single-culture world. Lessons about records and policing then run with no culture in play at all.
- **If a hearth tool ever ships,** it moves hearth points, never borders. It shows question 3's live balance meter, and it refuses layouts outside M8's tolerance. Hearth colours stay off the six body hues, and the view hides justice cues, as the culture lens does.

### Gaps

- The paired-arm toy is not Nomos's crime model: it has no movement, no patrols following records and no feedback. Its SDs show the mechanism, not Nomos's seed counts, and the normal approximation stands in for M1's Wilcoxon test.
- No teacher was asked what setups they want. Demand for card remix, god tools or culture painting is inferred from PhET's product, not measured.
- How small a classroom QR code must be to scan reliably from a projector is not sourced.
- Whether any user-world audit (for example a quick culture balance check before sharing) is feasible on a phone was not tested.

## 4. UX patterns worth copying

### Takeaway

- **Onboard with "Surprise me", named presets and a closed Advanced drawer.** Factorio ships 9 presets, Minecraft 6 world presets and 9 Superflat ones, and Dwarf Fortress and Civilization VI split Basic from Advanced. Nicky Case saves the sandbox "at the end". So unlock the builder after the first lab cards, as round 2 already unlocks sliders.
- **Paint meaning and let rules draw the tiles.** Townscaper, LDtk auto-layers, RPG Maker autotiles and Porymap's Smart Paths turn coarse input into valid art. Brushes need a radius, a strength and a land-or-water filter (Azgaar: radius 1–100, power 1–10). Question 4 found a 1-tile land brush lost 22 of 24 cells to tidying, so the minimum land brush is 3 tiles.
- **Lock, then re-roll the rest, with keyed re-rolls and one undo stack.** Azgaar's locks and 16-layer Regenerate menu are the model. Unlike Azgaar, Nomos should make re-rolls keyed, never renumber locked items, and hold locks and re-rolls in the same undo log that becomes the save (question 3). Locks cut a valley edit's changed place layouts from a median of 25 to 5 in question 3's runs.
- **Preview setup facts, never outcomes, until the bet is locked.** Cities: Skylines opens its coverage view as soon as a police station is picked, and Factorio previews settings live. For Nomos, show police coverage, farmland, reachability and device fit while editing, and show crime and wealth results only after Run. Predicting first is what makes watching teach (round 2).
- **Validate in two tiers, at the moment of use.** Hard errors block Play and Share, like Cities: Skylines' publish checklist and Azgaar's "at least 200 land cells". Soft warnings sit beside the setting that causes them, like RimWorld's coverage note. Never loop silently, as Dwarf Fortress's "infinite world rejection" can.

| Pattern | Seen in (section 1 unless noted) | Nomos version | Level |
|---|---|---|---|
| Random by default, presets, Advanced drawer | Factorio, Minecraft, Dwarf Fortress, Civ VI, Wonderdraft ("Pastel recommended for beginners") | "Surprise me" plus 4–6 named presets, settings grouped by stage, Advanced closed | 1 |
| Badges for what a setting keeps | Dwarf Fortress's warning that a rainfall change re-rolls the world | "Keeps coastline" or "New world" beside each setting, from the stage table in section 2 | 1 |
| Separate seeds per purpose | Dwarf Fortress's world, history, name and creature seeds | "Same land, new towns" and "same towns, new names" buttons | 1, 2-lite |
| Constrained input | Townscaper, Porymap Smart Paths, LDtk IntGrid plus rules, RPG Maker autotiles | Paint terrain kinds; the shore rule draws tiles; card remix offers only valid sites | 2, 3a, 4 |
| Brush with radius, strength and filter | Azgaar (1–100, 1–10, all, land or water), Cities: Skylines (50–2,000, 0.01–1.00), NetLogo brush-width slider | Integer radius and strength, land-or-water filter, minimum land brush of 3 tiles | 2, 4 |
| Stamps with variations | Tiled stamps with probabilities, Porymap prefabs with toggled cells, Inkarnate's 30K+ assets | Prefab stamps whose house style is a keyed uniform draw, never a picked "rich" variant | 2, 4 |
| Layers as stages, with Auto | RPG Maker (Auto or layers 1–4), Wonderdraft tabs, LDtk's IntGrid view, Tiled layer locks | Layers named after generator stages; Auto picks the layer; a "meaning view" shows walkability and zones | 2, 4 |
| Lock and re-roll | Azgaar (locks, 16 regenerate layers), RPG Maker (re-run Generate Dungeon) | Lock icon per town, wonder or road; per-stage re-roll counters; a conflict list instead of silent fixes | 2-lite |
| One undo stack | Azgaar (100 snapshots, but none in its culture editor), Porymap, Tiled | Every action, including locks and re-rolls, is an undoable op in the same log as the save | All |
| Live preview of settings | Factorio map preview, Azgaar's "Show drainage" overlay, RimWorld's globe | A country thumbnail regenerated on every change (an estimated 15–35 ms in JS) | 1 |
| Impact overlays on placement | Cities: Skylines (36 info views; coverage shown when a service is selected) | Police coverage and patrol reach when a station is selected; never predicted crime before the bet | 3a, 2 |
| Hard and soft validation | Cities: Skylines publish checklist, Azgaar's land minimum, RimWorld's performance note, Civ VI's "experimental" popup | Hard: reachability, pins in water, unfiltered names, payload caps. Soft: food margin, device tier, wonders that did not fit | All |
| Remix a shared world | Inkarnate (237K+ cloneable maps), Townscaper, Factorio and Minecraft strings | "Remix" opens a link as a new edit session that keeps the source fingerprint | 1, 2 |

### Cited Findings

- **Presets and modes** (opened; section 1):
  - Factorio ships 9 presets with a live preview.
  - Minecraft has 6 world presets and 9 Superflat presets; Old Customized had 7, across three pages of options.
  - Dwarf Fortress has a 7-option basic screen beside "dozens" of advanced parameters, and parameter sets saved by name.
  - Civilization VI made Basic mode the default and left Advanced "(Unsupported)".
  - Wonderdraft's guide starts beginners on the Pastel theme and the Landmass Wizard.
- **Sandbox last** ([Case, design patterns](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md), opened): "put the full 'sandbox mode' at the end of the explorable". Round 2 already unlocks city sliders through the lab card that introduces them ([round 2 report](../../round-2-follow-up/report.md), opened).
- **Constrained input** (opened; section 1):
  - Townscaper players "plop down colored blocks" while the algorithm builds valid houses.
  - LDtk rules "paint tiles automatically" from IntGrid values, with SHIFT+R to see either.
  - RPG Maker autotiles adjust borders automatically, and Shift disables them.
  - Porymap's Smart Paths need "a 3x3 metatile selection".
- **Brushes:**
  - Azgaar: radius 1–100, power 1–10, filter "all cells, only land cells or only water cells" ([wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization), opened).
  - Cities: Skylines: size 50–2,000, strength 0.01–1.00 ([wiki](https://skylines.paradoxwikis.com/Map_Editor), opened).
  - NetLogo: a paint procedure colours patches within a brush-width slider's radius (search summary of a [course lab](http://www.cs.sjsu.edu/~pearce/modules/labs/nlogo/painting/index.htm)).
  - Question 4: a 1-tile land brush lost 22 of 24 cells at pointer-up tidy, while a 3-tile brush lost none ([editor-tech.md](editor-tech.md), section 2; measured there).
- **Stamps** (opened; section 1): Tiled stores stamps in slots 1–9 and extends them "with variations". Its automapping picks a random output index weighted by "Probability". Porymap's prefabs are saved selections where cells "can be toggled on/off".
- **Layers:**
  - RPG Maker MZ offers "Auto" or Layers 1–4 ([help](https://rpgmakerofficial.com/product/MZ_help-en/01_07_01.html), opened).
  - Tiled automapping has `IgnoreLock` "since Tiled 1.10", so layers can be locked ([automapping](https://doc.mapeditor.org/en/stable/manual/automapping/), opened).
  - Inkarnate separates brush layers from object layers (search summary of a [layers guide](https://loreteller.com/learn/inkarnate-layers-guide/)).
- **Undo:**
  - Azgaar's heightmap editor keeps `historyLimit = 100` full snapshots; its cultures editor has none (source, opened).
  - Question 4 measured cell-diff undo at ≤ 0.07 ms per brush stroke, and 0.27 MB for 100 strokes ([editor-tech.md](editor-tech.md), section 3; measured there).
- **Locks and regeneration:**
  - Azgaar has 16 regenerate targets and locks since 1.89 (opened).
  - Question 3 found Azgaar re-rolls with `Math.random()` and renumbers locked burgs ([edits-and-saves.md](edits-and-saves.md), section 2; opened there).
  - With every settlement locked, a valley edit's changed layouts fell from a median of 25 to 5 (measured there).
  - My stage table (section 2, measured here) shows late-stage re-rolls leave earlier stages identical.
- **Impact previews:**
  - Cities: Skylines has "36 distinct info views". The crime view colours buildings "in red if there is high criminal activity", and "Police coverage is displayed by the colored roads". Info views are "shown automatically when accessing the build menu for city services" ([wiki](https://skylines.paradoxwikis.com/Info_views), opened).
  - Factorio's preview lets players "experiment with different settings" ([wiki](https://wiki.factorio.com/Map_generator), opened).
  - Azgaar added a "Show drainage" overlay to its heightmap editor in v1.153.0 ([changelog](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog), opened).
- **Predict before you see:**
  - Students who predicted a demonstration's outcome understood more than students who only watched (round 2, search summary of [Crouch and colleagues](https://mazur.harvard.edu/publications/classroom-demonstrations-learning-tools-or-entertainment)).
  - Case's "Place Your Bets!" pattern makes readers draw their guess before the reveal ([opened](https://github.com/ncase/blog/blob/main/src/posts/explorable-explanations-4-more-design-patterns.md)).
- **Validation** (opened; section 1):
  - Cities: Skylines requires "Water stream in the starting area" and highway connections before publishing.
  - Azgaar: "There should be at least 200 land cells!"
  - RimWorld: larger coverage "can also impact performance on lower-end systems".
  - Dwarf Fortress: "you will get infinite world rejection" when minimums exceed the map.
  - Question 3 proposes hard checks at Play, Share and open, and soft labels otherwise ([edits-and-saves.md](edits-and-saves.md), section 4).
- **Remix** (opened; section 1): Inkarnate advertises "237K+ Cloneable Maps", and Townscaper's whole town rides in the URL.

### Inferences

- **Map each pattern to a level, so nothing is built early.**
  - Level 1 needs only presets, badges, separate re-roll buttons, a live thumbnail and soft warnings.
  - Level 3a (card remix) needs constrained choices, coverage overlays and hard validation.
  - Brushes, stamps and layers wait for Level 4's Build mode, behind the developer flag.
- **Keep outcome previews out of the builder.** A "predicted crime" overlay would answer the bet before it is placed, and it would be an emulator claim the builder cannot certify. Coverage, reach and staffing are setup facts, so they may show.
- **Write warnings in the plan's plain style, with numbers.** For example: "Large world: about 200 listed places, 4× the cells", "3 of 5 wonders fit this land", "2 towns cannot reach the capital; add a road or a port".
- **Treat a re-roll as a logged op.** "Same land, new towns" bumps the settlement stage's counter and keeps the seed. The undo log, the save and the share link all hold it, so a re-rolled world replays. Azgaar's `Math.random()` re-rolls cannot.
- **Keep the art rules visible in the palette.** The building palette shows kinds (home, shop, clinic, police station), not styles. Style comes from the keyed draw and a "restyle" button. The palette holds no person, costume or culture items, so content rules 1, 3 and 5 hold by construction.
- **Accessibility carries over.** Question 4's toolbar, keyboard and drag-alternative rules apply to every pattern above. Presets and re-roll buttons are plain buttons, so Level 1 needs no special access work.

### Gaps

- No usability test compared presets, badges or re-roll buttons with real players or teachers.
- The impact-preview rule ("setup facts only") is reasoned from the prediction evidence. No study of previews inside simulation builders was found.
- Inkarnate's layer model and NetLogo's brush-width slider come from search summaries.
- Cities: Skylines II's editor UX was read only through its map-editor diary, not hands-on.
