# M8 Country map: sub-milestones

M8 holds 29 build tasks and 6 exit checks in the [implementation plan](../../implementation-plan.md#m8-country-map), so it runs as seven sub-milestones. It is the last milestone before launch. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes, and M8.1 when M7 closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the rest of the plan can be rescaled to the measured pace. The plan's own M8 effort line, 13–20 days, is round 4's and predates rounds 6, 8 and 9 and the owner's plans. Round 9's New country settings and god tools add 19–30 days. The other added tasks, from those rounds and the owner's sound, military and gazette plans, come to about 12–19 more.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M8.1 World generator](m8.1-world-generator/task.md) | A seeded country built in the worker, matching the Python generator stage by stage | 6–9 days | | | |
| [M8.2 Cultures and names](m8.2-cultures-and-names/task.md) | Culture home regions balanced after spin-up, and filtered names for places and festivals | 3–5 days | | | |
| [M8.3 Country and Region views](m8.3-country-and-region-views/task.md) | The country drawn as 8- and 16-px tilemaps, with military sites and country sound | 6–10 days | | | |
| [M8.4 Map modes, flows and papers](m8.4-map-modes-flows-and-papers/task.md) | Map modes, flow bands, route ledgers, town papers and the national gazette | 6–9 days | | | |
| [M8.5 Focus, fork and history](m8.5-focus-fork-and-history/task.md) | The breadcrumb, a what-if fork into City mode, and ten years of history in a save | 4–6 days | | | |
| [M8.6 New country settings](m8.6-new-country-settings/task.md) | The settings panel with presets, a live preview and validation | 5–8 days | | | |
| [M8.7 God tools](m8.7-god-tools/task.md) | Lock, re-roll, brushes and paint on the country, each edit rerun before day 0 | 14–22 days | | | |
| **Total** | | **44–69 days** | | | |

Three decisions apply throughout:
- **The grid replaces the mesh.** Round 9 replaces round 4's Voronoi mesh with the square grid of `tools/worldgen`, so tasks that named the mesh run on grid cells. A standard 96×64 world lists 40–61 settlements and a large 192×128 one 182–237; the rest of the people live in M7's region tier.
- **The Python generator stays the reference.** A ported stage lands only when its fingerprints match the Python goldens. A change to such a stage, like the snow biome, therefore goes into `tools/worldgen` first. Stages it lacks, such as regions, cultures, names and military sites, get goldens frozen per generator version, as M6 does for every release.
- **The builder closes on the Ongoing edit tests.** The plan's six M8 exit checks cover M8.1–M8.5, so M8.6 and M8.7 close on the two edit tests in its Ongoing list.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
