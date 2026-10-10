# Nomos hand-off

The rulings in force and a short log, a few lines per step. The latest checkpoint holds the state and the next task. The log before the restructure of 10 October 2026 is in git: `git show 6736fb6:docs/plan/HANDOFF.md`.

## Rulings in force

The owner can overturn any of these.

**Owner, 10 October 2026:**
- **Proof of concept.** Tests run in Node and in Chromium, which covers Chrome and Brave. Bun and Deno are dropped for good, and Firefox and WebKit return before launch. Where an older plan names them, or the deleted `scripts/engines.ts` and `stdlib.yml`, run the pnpm checks in Node and Chromium instead.
- **Testing.** Each task's code comes first, then its tests, covering the main behaviour and one edge case. Engineers run only those tests, plus lint and typecheck on the touched packages. `pnpm check` runs once per feature, with `pnpm test:browser` when the page changed. The perf workflow runs by hand, after a tick or frame path changes. One review per feature, and only for money, economy or determinism changes.
- **Decisions.** Claude settles open owner decisions itself, and records each here as a ruling.
- **Walled towns,** the final answers for M3.1 Part 3: density peaks at the plaza; stone walls with towers for capitals and cities, a palisade for towns, and none for villages and hamlets; roads by role; farms on the outskirts; the new buildings; suburbs, bridges, avenues and greens. Tasks 12–16 and 19–21 wait for the owner's go.

**The designers' calls, 10 October 2026:**
- houses: the corner houses' L-shaped wing, cream doors, and handed pieces drawn at random rather than in pairs;
- terrain: snow overlays on bridges (13 px of atlas), the palisade side gate as tall posts only, gates 2 tiles wide, and no palisade watchtower;
- buildings: `_large` rather than "grand", a joiner's shop, a stone threshing barn, a civic clock tower on the capital icon, and a watermill on east banks only, with no wheel animation.

**The coordinator's rulings:**
- **Places:** 176×112 for capitals and cities, 152×96 for towns, and the walls' look as drawn.
- **The first screen:** one blob per 2, 3 or 4 walkable tiles on desktop, phone-plus and phone (`TIER_TILES_PER_AGENT`), while a `?tier=` URL still runs a whole tier for perf. The Town skin holds up to 9,000 blobs in view, and stays up to 10,350.
- **Spawn:** the bench row for 100,000 agents is 35 ms, since M9 spawns only the districts in view.
- **The economy (M2.3):**
  - the pay-cut target is a tier-2 gap until M5's treasury brings inflation;
  - `burnInDays` is 17,295, from a 40,000-day run (Ruling 18);
  - no credit line, since Ruling 14's trigger didn't trip (s.d. 0.0104); recheck at M2.2b and M5;
  - exits off in `CITY` (`shortPayExitPpm` 0) until entry is designed; not yet applied.

## Open

Beyond the checkpoint's Open list:
- **7 Chromium browser specs fail** (local run, 10 October 2026): three in `map-crowd.spec.ts`, two in `map-goto.spec.ts`, `hud.spec.ts`'s "zooms and pans", and `town-skin.spec.ts`'s 2560×1440 case. CI's browser job has failed on every push since 01:42 on 10 October.
- **Stale docs:**
  - the 48×28 town in `place-camera.test.ts:11`, `interfaces.md`'s Places sizes, `countries.md:46`, the M3.1 plan (line 41) and the M0.4 plan (line 83);
  - the old hash `b3b2c251` in `interfaces.md:163`, the M8.1 plan (line 300) and the M8.3 plan (lines 85 and 1844).
- **The shared plan doc** still names five engines, Deno and the 2% pay cut. Update it at the next sync, with the owner.

## Log

- 10 Oct: **testing and rules restructured** (owner). `pnpm check` runs every check but the browser specs, and CI's check job runs only it. The stdlib workflow and the engine scripts are gone, perf runs by hand, and the place tests check 2 worlds. `pnpm check` passed locally in 349 s, with the unit tests at 65 s, down from 175 s.
