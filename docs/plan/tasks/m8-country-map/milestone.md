# M8 Country map: sub-milestones

M8 holds 29 build tasks and 6 exit checks in the [implementation plan](../../implementation-plan.md#m8-country-map), plus the owner's Countries decisions of 9 October 2026, so it runs as eight sub-milestones. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

**Map first (owner, 9 October 2026).** M8.1 and M8.3 are built right after M0, once M0.7 Modules and blob facts closes, and before M1. Together they give an explorable map: the Python generator's worlds, ported to TypeScript and drawn in the browser with Country and Region views, pan and zoom. M8.1's step plan is written when M0.7 closes, and M8.3's when M8.1 closes. The other six keep M8's place after M7 and before launch, so M8.2's step plan is written when M7 closes. Blobs stay in the starting town, Highcourt, 176×112 tiles since 10 October 2026, until M9 joins the map to the streets.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the rest of the plan can be rescaled to the measured pace. The plan's own M8 effort line, 13–20 days, is round 4's and predates rounds 6, 8 and 9 and the owner's plans. Round 9's New country settings and god tools add 19–30 days. The other added tasks, from those rounds and the owner's sound, military and gazette plans, come to about 12–19 more. The Countries decisions add about 3.5–5.5 days of new work: the countries stage, the place-name table, drawing countries and the culture crossing check. M8.2 absorbs the crossing check's 0.5–1 day within its 3–5. The move brings about 2–3 days in from M3: the `packages/worldgen` setup, the tile pass, the map atlas page and the trigram name screen. The rows' total exceeds these parts by 3.5–5.5 days, mostly from splitting M8.3 into the early views and M8.8 (computed from the rows; the split's share is an inference). M0.7 already builds the shared sound set and the name filter, which M8.1 reuses.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M8.1 World generator](m8.1-world-generator/task.md) | Built after M0: a seeded world of 3–5 countries made in a worker, matching the Python generator stage by stage, with names for places and countries | 9.5–14 days | 9 Oct 2026, 08:31 (step plan committed) | | |
| [M8.3 Country and Region views](m8.3-country-and-region-views/task.md) | Built after M8.1: the world drawn as 8- and 16-px tilemaps, with countries, labels, pan and zoom | 7–11 days | 9 Oct 2026, 12:28 (step plan committed) | 9 Oct 2026, 21:05 | About 495 min of work, 1–7 agents, beside M8.1's port, with the owner's pause of about 25 min excluded. It also built the owner's crowd, removed on 10 October 2026, and zoom to any settlement, which the estimate predates |
| [M8.2 Cultures and names](m8.2-cultures-and-names/task.md) | Culture home regions that cross borders and stay balanced after spin-up, and filtered names for regions and festivals | 3–5 days | | | |
| [M8.8 Military sites, map tiles and sound](m8.8-military-sites-map-tiles-and-sound/task.md) | Garrisons, forts and watchtowers on the map, the new coast, cliff and snow tiles, and country sound | 4–7 days | | | |
| [M8.4 Map modes, flows and papers](m8.4-map-modes-flows-and-papers/task.md) | Map modes, flow bands, route ledgers, town papers and a gazette per country | 6–9 days | | | |
| [M8.5 Focus, fork and history](m8.5-focus-fork-and-history/task.md) | The breadcrumb, a what-if fork into City mode, and ten years of history in a save | 4–6 days | | | |
| [M8.6 New country settings](m8.6-new-country-settings/task.md) | The settings panel with presets, a live preview and validation | 5–8 days | | | |
| [M8.7 God tools](m8.7-god-tools/task.md) | Lock, re-roll, brushes and paint on the country, each edit rerun before day 0 | 14–22 days | | | |
| **Total** | | **52.5–82 days** | | | |

The table lists the sub-milestones in build order. M8.8 holds the parts of the old M8.3 that still wait for later work: the military sites, which need M7.7's garrisons, the country sound, which needs M1's synth and M3's music player, and the new tiles.

Five decisions apply throughout:
- **Countries are map facts (owner, 9 October 2026).** A world holds 3–5 countries, picked by its seed. They differ only by name, map colour, capital, borders and towns. Laws, money and cultures stay shared. So no sim rule reads a country id, and trade, migration and taxes cross borders as if they weren't there. Neighbours are never at war (Military).
- **Cultures cross borders.** No country stands for a culture: country names and colours never come from a culture, and M8.2 checks that culture regions cut across countries.
- **The grid replaces the mesh.** Round 9 replaces round 4's Voronoi mesh with the square grid of `tools/worldgen`, so tasks that named the mesh run on grid cells. A standard 96×64 world lists 40–61 settlements and a large 192×128 one 182–237; the rest of the people live in M7's region tier. The explorable map uses the large world.
- **The Python generator stays the reference.** A ported stage lands only when its fingerprints match the Python goldens. A change to such a stage, like the snow biome or the new countries stage, therefore goes into `tools/worldgen` first, where `generate.py`'s previews let the owner see it. Stages it lacks, such as regions, cultures, names and military sites, get goldens frozen per generator version, as M6 does for every release.
- **The builder closes on the Ongoing edit tests.** The plan's six M8 exit checks cover M8.1–M8.5, so M8.6 and M8.7 close on the two edit tests in its Ongoing list, and M8.8 on its own tests.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
