# M8 Country map: sub-milestones

M8 holds 29 build tasks and 6 exit checks in the [implementation plan](../implementation-plan.md#m8-country-map), so it runs as seven sub-milestones. It is the last milestone before launch. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes, and M8.1 when M7 closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the rest of the plan can be rescaled to the measured pace. The plan's own M8 effort line, 13–20 days, is round 4's and predates rounds 6, 8 and 9 and the owner's plans. Round 9's New country settings and god tools add 19–30 days. The other added tasks, from those rounds and the owner's sound, military and gazette plans, come to about 12–19 more.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M8.1 World generator | A seeded country built in the worker, matching the Python generator stage by stage | 6–9 days | | | |
| M8.2 Cultures and names | Culture home regions balanced after spin-up, and filtered names for places and festivals | 3–5 days | | | |
| M8.3 Country and Region views | The country drawn as 8- and 16-px tilemaps, with military sites and country sound | 6–10 days | | | |
| M8.4 Map modes, flows and papers | Map modes, flow bands, route ledgers, town papers and the national gazette | 6–9 days | | | |
| M8.5 Focus, fork and history | The breadcrumb, a what-if fork into City mode, and ten years of history in a save | 4–6 days | | | |
| M8.6 New country settings | The settings panel with presets, a live preview and validation | 5–8 days | | | |
| M8.7 God tools | Lock, re-roll, brushes and paint on the country, each edit rerun before day 0 | 14–22 days | | | |
| **Total** | | **44–69 days** | | | |

Three decisions apply throughout:
- **The grid replaces the mesh.** Round 9 replaces round 4's Voronoi mesh with the square grid of `tools/worldgen`, so tasks that named the mesh run on grid cells. A standard 96×64 world lists 40–61 settlements and a large 192×128 one 182–237; the rest of the people live in M7's region tier.
- **The Python generator stays the reference.** A ported stage lands only when its fingerprints match the Python goldens. A change to such a stage, like the snow biome, therefore goes into `tools/worldgen` first. Stages it lacks, such as regions, cultures, names and military sites, get goldens frozen per generator version, as M6 does for every release.
- **The builder closes on the Ongoing edit tests.** The plan's six M8 exit checks cover M8.1–M8.5, so M8.6 and M8.7 close on the two edit tests in its Ongoing list.

## M8.1 World generator

Needs: M0's keyed draw and integer noise, and M7's region tier and country CI suite.

- **Builds:**
  - the terrain stage in the worker, ported from `tools/worldgen` in pipeline order: template and noise elevation, keyed mountain chains, priority-flood, flow accumulation, erosion-lite passes, climate, biomes and habitability, each stage proven against the Python golden fingerprints (R4, R9);
  - a snow biome for cold lowland (R9);
  - settlements and routes on the grid: capitals, then towns, then villages, with minimum spacing and rank-size populations; routes as a spanning tree per landmass plus spanner shortcuts, routed by A\* with slope, bridge and road-reuse costs; sea lanes between landmasses; regions and market territories grown by multi-source Dijkstra (R4, R9);
  - place seeds, landmark draws and names keyed on a stable settlement uid, its cell, never on population rank (R9);
  - 4–8 natural wonders per world by site rules, each kind at most once, with hot springs, geyser and caldera lake sharing one geothermal hotspot; built landmarks by tier and site, on the settlement or, for viaducts, observatories and lighthouses, on cells of their own (R9);
  - M7's and M8's settlement counts re-baselined to listed places plus a region tier, with Zipf fitted on true ranks (R9).
- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones, which set the phone tier for country mode.
- **Exit checks:**
  - a standard 96×64 world generates in ≤ 100 ms and a large 192×128 world in ≤ 400 ms in desktop Chromium, with per-stage fingerprints matching the Python goldens in Node, Bun, Chromium, Firefox and WebKit (R4, R9).

## M8.2 Cultures and names

Needs: M7's culture block and spin-up, and M3's shared sound set and name filter.

- **Builds:**
  - 4–8 culture hearths by keyed Poisson-disc, never `Math.random`, with regions grown by multi-source Dijkstra over the grid's travel and terrain costs, a mixed border band and similar country-wide shares; layouts rejected when cultures differ in mean land quality or development beyond the set tolerance, single-culture development regions flagged, M7's 50–100-year spin-up run before play, and favoured foods taken from each hearth region's abundance (R8);
  - names for places, regions and festivals from the shared sound set and a seeded foswig chain, with theme words and site words such as "Ford" and "Port" kept as separate UI-language words, never fused suffixes, checked over 1,000 seeds by M3's name filter, which replaces round 4's (R4, R8).
- **Owner decision first:** round 8 left the hearth-balance tolerance undesigned, and the layout check needs a value. The Gazette tab asks whether street and district names ever follow a culture's naming custom. Place and region names raise the same question for the gazette's road-raid stories.
- **Exit checks:**
  - the name filter passes 1,000 seeds (R4);
  - after spin-up, cultures' mean development stays within the set tolerance, and the share of development regions holding only one culture is reported (R8).

## M8.3 Country and Region views

Needs: M3's tile pass, M7's garrison posts, and the synth and music player from M1 and M3.

- **Builds:**
  - about 55–81 tiles, drawn as code in `tools/sprites`: map-scale coast and cliff-coast overlays, snow at map and street scale, cliff faces for east, west and north, rock ground and sand variants; the seasonal snow overlays and snowy conifer already cover part of the street snow (R9);
  - the Country and Region views as 8- and 16-px tilemaps of the same cells, with settlement icons and routes by tier, label bands by zoom, map-scale coast overlays, and wonder and landmark icons; the icon art exists; wire it in (R4, R9);
  - garrisons in the capital and coastal or border towns, forts at road junctions near coasts and borders, and watchtowers along long roads, all placed by the world generator, with their map icons and the military sounds near barracks and forts; the icons and sounds exist; wire them in (Military);
  - country and region music and ambience, and the 11 wonder loops: faint near wonders on the map, and full in wonder views once M9 builds them; the sounds exist; wire them in (Sound).
- **Owner decision first:** the Military tab asks what counts as a border with no neighbouring country: the map edge, mountain passes or region lines. Garrison and fort placement waits for it.
- **Exit checks:**
  - Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar (R4).

## M8.4 Map modes, flows and papers

Needs: M7's settlement and route ledgers, M4's true and recorded split, M5's culture lens, and the gazette from M3–M5.

- **Builds:**
  - map modes as (state, entity) → {base, stripe}: true crime as base and recorded as stripe, plus population, growth, clearance, police, prices, wages, trade and danger (R4);
  - goods map modes: main product per settlement (eight classes, icon plus colour), the price of a chosen good, days of stock, and resource health (fish B/K, forest V/K, ore left) (R6);
  - the home-regions map mode in the culture lens: dominant culture with hatching for diversity, and labels; it never uses the six body-hue colours or the police, merchant and crime colours, and is never the default view (R8);
  - flows as directed, side-offset bands along routes, aggregated per level, with capped particles for the selected flow only; the caravan and boat art exists; wire it in (R4);
  - route ledgers on the map (traffic, bandit pressure, patrols, incidents), with robbery markers in the recorded view only once they are reported (R4);
  - in country mode, each town's own paper from its ledger, one paper per town, plus the national gazette from the aggregate ledgers: harvests, prices, migration and recorded raids on the roads (Gazette).
- **Verify first:** culture lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1), which decide whether a lens colour reads as a body colour.
- **Exit checks:**
  - the national gazette's figures equal the ledgers' recorded figures (Gazette).

## M8.5 Focus, fork and history

Needs: M2's spawner, M5's what-if branches, and M6's city generator and country save sections.

- **Builds:**
  - the focus state, the breadcrumb (Country › Region › Settlement › District) and charts re-keyed by focus, with shared colour scales and "estimated" labels on every ledger-driven panel (R4);
  - "Open in City mode": a detached City-mode run seeded from a settlement's ledger and labelled as a what-if (R4);
  - multi-resolution history, weekly for a year and monthly before that, quantised to Uint16 with delta coding (R4).
- **Exit checks:**
  - a render-filter test checks that the recorded view never shows a true-only cue; a fork's fold at its first tick equals the source ledger; a save with ten years of history stays under about 3 MB gzip, since history alone came to about 1.9 MB on synthetic data (R4).

## M8.6 New country settings

Needs: M6's share links and per-stage edit layers.

- **Builds:**
  - a "New country" settings panel: about 10 overrides, grouped by stage and badged ("keeps coastline", "new world"); standard or large size; a culture count and a single-culture switch; presets, a live preview and validation (R9);
  - validation on Play, on Share and on every open: every settlement reaches the capital by road or sea lane, food capacity per country, no pin in water, names through round 8's filter in ASCII, and payload caps (R9).
- **Exit checks:**
  - the Ongoing edit tests cover country settings: a no-op edit leaves the replay hash unchanged, and a treatment edit changes no unrelated entity id (R9).

## M8.7 God tools

Needs: M3's Build mode tools and M6's per-stage edit layers.

- **Builds:**
  - god tools on the country: lock and re-roll with per-stage keyed counters; raise, lower and smooth brushes; biome paint; drawn rivers and roads; town and wonder placement; pins, tombstones that lower counts, a conflict list and one undo log; every edit reruns from its first dirty stage, and the generator re-places cultures (R9).
- **Exit checks:**
  - the Ongoing rerun test covers country edits: a partial rerun from the first dirty stage equals a full rerun, byte for byte, for random edit logs (R9).
