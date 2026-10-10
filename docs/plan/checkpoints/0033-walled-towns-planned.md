---
checkpoint: 33
date: 2026-10-10
milestone: M3.1
status: paused
based_on: 70b359e
next: M3.1 Town generator, part 3, Task 12 "Walls, towers and gates" (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md), once the owner says to implement
waiting_on: [owner: when to implement Tasks 12–16 and 19–21 of M3.1's Part 3]
---

# Checkpoint 0033: walled towns planned, roads by role built

## State

On 10 October 2026 the owner asked for:
- walled towns that thin out from the plaza like a bell curve, with farms on the outskirts;
- roads of several widths and surfaces;
- new and polished building art;
- two road classes on the country map.

All the art is drawn, and M3.1's Part 3 plans the work as Tasks 9–21. The owner then kept the round to plans:
- **built:** the started tasks 9, 10, 11, 17 and 18;
- **waiting:** Tasks 12–16 and 19–21.

A second session, `nomos-bd`, works in the same tree on the first screen and the economy (M2.1). The two sessions split the files between them by message, as [HANDOFF.md](../HANDOFF.md) records.

## Done since checkpoint 0032

**This session, the walled-town round:**
- **Art.** The previews in `docs/mockups/` (`houses_preview.png`, `buildings_preview.png`, `map_icons_preview.png` and `town_edge_preview.png`) all went to the owner.
  - Houses (9272f2f to 35a5add): townhouses, corner houses, cabins and handed row pieces, in all 7 materials and 5 roofs, plus a polish of today's houses.
  - Other buildings (6422411 to 7e59786): an inn, bakery, smithy and stable; a barn, granary, shed and watermill; a large civic set; a polish of today's buildings; and walled and palisaded map icons.
  - Terrain (88478c6 to 95f41ed): cut stone, cobbles, gravel and farm tracks; vineyard, rice and orchard crops; hedges and flower beds; the palisade; and stone bridges.
  - Clean-up after the art: the map frame count, the licence ledger and the place fixtures (b02c835, a477031 and 2b69ec8).
- **The plan:** M3.1's Part 3, Tasks 9–21 (197f74e, f6f0239, 72f0ea6, f6ef4bc and b035a86), with its contract in `interfaces.md` (16d4ef5).
- **Task 9** (2664baa) adds `packages/worldgen/scripts/time-places.ts` and the build-time baseline: a capital's median is 118 ms and its worst 129 ms.
- **Task 10** (25d318c): the town atlas page leaves out snow and night frames. It is 2048 × 1161 px and 182,550 B of WebP, and `test_atlas.py` fails past 1,920 px.
- **Task 17** (b05bccc and f84a9e2): country roads gain `WorldMap.roadClass`, minor or major. Over 200 worlds, 5,570 of 44,093 roads are major.
- **Task 11** (d68ff59 and c4b8bc1):
  - places grow to 176 × 112 for a capital or city and 152 × 96 for a town;
  - roads take a width and surface by their role, main roads cross rivers on stone bridges with trees along them, and the wall ring is marked out, with no wall built yet;
  - Highcourt is re-exported at 176 × 112, with 15,862 walkable tiles;
  - a capital builds in 178–200 ms (median) against a 236 ms budget.
- **Task 18** (19ef31a): the country map draws major roads solid in stone grey and minor roads dotted. Capitals and cities get walled icons, and towns palisaded ones.

**The other session, `nomos-bd`** (town view, first screen and economy), in its own words:
- M2.1's Tasks 1–7 have landed (6b1778e to 1f7c791). Task 8, the economy day, CLI and burn-in, is running.
- The CLI hash is `3c786124`, and it moves again with Task 8. The first-load JS stand-in is raised to 20 kB, to be reset once Task 8 is measured.
- Next for it:
  - one economy, determinism and QA pass;
  - a shared steering function, so town-view walkers wander in any direction;
  - a minor re-test of the flagged specs.

  Details are under its heading in [HANDOFF.md](../HANDOFF.md).

## Decisions

**Owner, 10 October 2026:**
1. **The bell curve is town density:** packed round the plaza and thinning outward, with farms on the outskirts.
2. **Walls:** stone walls with towers for capitals and cities, a palisade for towns, and none for villages and hamlets, with a gate where each road enters.
3. **Roads by role:**
   - main road: 3 tiles of cut stone;
   - street: 2 tiles of cobbles;
   - lane: 1 tile of dirt;
   - country road: 2 tiles of gravel;
   - farm track: 1 tile of dirt.
4. **Farms:** grain and vegetable strips, pastures, orchards, and vineyards or rice by climate.
5. **Buildings:** new house shapes, trades and farm buildings, a large civic set, and a polish of today's art.
6. **Extras:** suburbs past the gates, stone bridges, avenue trees and greens, and road classes and walled icons on the country map.
7. **Size:** places grow so the walled core keeps about 380–520 houses.
8. **Scope:** draw the assets, then add them to the plans. After that, plans only, finishing just the tasks already started.

**The coordinator's rulings:**
- **Sizes:** 176 × 112 and 152 × 96 rather than 160 × 100 and 140 × 80. The farm belt is then about 24 tiles east and west of the wall and 16 north and south. The fallback to the smaller sizes wasn't needed.
- **The walls' look** stands as drawn, under the owner's "create the assets, then add them to the plans".
- **The dots map:** road kinds take a dry ground colour, so cut stone takes SAND_D rather than WATER_L (c4b8bc1).

**The planner's rulings,** listed in Part 3's "Rulings":
- gates are 2 tiles wide;
- streets never bridge rivers;
- crops follow climate thresholds;
- major roads follow a spanning tree of the towns;
- the town atlas leaves out snow and night frames.

**Task 11's rulings,** from its gitignored ledger, `.superpowers/sdd/plan-m3.1-town-generator/task11-ledger.md`:
- **Crossings:** a crossing counts water under any part of a wide road, and only water under a bridge piece becomes road. There are 96 such crossings over 20 worlds, the longest 9 cells.
- **Avenue trees** are planted from the tree code right after `lay_town` and before `lay_roads`, to avoid an import cycle.
- **Lanes** are laid through `lay_road`, and all 107 vistas keep their goldens.
- **Build time:** three changes in the port alone, to the field search and the lot scan, kept builds within budget with the output unchanged.

## Open

1. **Owner:** when to implement Tasks 12–16 and 19–21.
2. **Owner:** the designers' art calls, listed in `HANDOFF.md`:
   - the corner houses' L-shaped wing, the cream doors, and handed pieces drawn at random;
   - the bridges' snow overlays, the palisade's side gate, and gates 2 tiles wide;
   - the capital icon's clock tower, and a watermill on east banks only.
3. **Owner:** the first screen's blob counts, now 3,965, 5,287 and 7,931 by tier, from Highcourt's 15,862 walkable tiles.
4. **The shared plan doc** doesn't hold Part 3 yet. The planner suggests the tag "(Towns)". Editing the doc needs the owner.
5. **CI time:** `place_goldens.py --check --worlds 1` took 1 min 35 s on 12 cores, and the full Python goldens take 13–15 minutes.
6. **`tools/sprites/README.md`** still lacks the designers' suggested edits: the showcase scripts, the door and flower tables, the handed pieces' shared snow overlays, and the new season rules.
7. **`nomos-bd`'s `tools/bench/test/alloc.test.ts`** fails since a530047, and that session is fixing it.

## Next

When the owner says to implement, start with M3.1's Part 3, Task 12, "Walls, towers and gates", in [plan.md](../tasks/m3-city-life/m3.1-town-generator/plan.md).
- Then run Tasks 13–16, 19, 20 and 21, in the order its "Who does what" gives.
- Each layout task re-exports `town.nmap` and re-pins Highcourt's numbers in the same commit.
- If both sessions still share the tree, clear the shared files with `nomos-bd` first.

## How to verify

- `PYTHONIOENCODING=utf-8 python tools/worldgen/export_map.py --check`
- `PYTHONIOENCODING=utf-8 python tools/worldgen/place_goldens.py --check --worlds 1` and `python tools/worldgen/place_fixtures.py --check`
- `PYTHONIOENCODING=utf-8 python tools/worldgen/goldens.py --check --seeds 3` and `python tools/worldgen/test_worldgen.py`
- `python tools/atlas/test_atlas.py` and `python tools/licenses.py --check`
- `node packages/worldgen/scripts/engines.ts` and `node packages/worldgen/scripts/time-places.ts`
- `pnpm test && pnpm lint && pnpm typecheck`. `alloc.test.ts` stays red until `nomos-bd`'s fix lands.
