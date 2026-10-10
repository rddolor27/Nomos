# Nomos hand-off

The rulings in force and a short log, a few lines per step. The latest checkpoint holds the state and the next task. The log before the restructure of 10 October 2026 is in git: `git show 6736fb6:docs/plan/HANDOFF.md`.

## Rulings in force

The owner can overturn any of these.

**Owner, 10 October 2026:**
- **Proof of concept.** Tests run in Node and in Chromium, which covers Chrome and Brave. Bun and Deno are dropped for good, and Firefox and WebKit return before launch. Where an older plan names them, or the deleted `scripts/engines.ts` and `stdlib.yml`, run the pnpm checks in Node and Chromium instead.
- **Testing.** Each task's code comes first, then its tests, covering the main behaviour and one edge case. Engineers run only those tests and a typecheck of the touched packages, and nothing slow runs on each edit. Lint, `pnpm check` and the one review run once the whole feature is built, with `pnpm test:browser` when the page changed and the review only for money, economy or determinism changes. The perf workflow runs by hand, after a tick or frame path changes.
- **Models.** Engineer agents default to Sonnet; Opus is for design calls, plans, reviews and bugs of unknown cause.
- **TypeScript only.** The program runs in TypeScript, the map and town generators included. Python builds only assets: sprites, sounds, the atlas, mockups and licences. `tools/worldgen` is frozen, and its saved outputs still check the TypeScript for the parts they cover; a deliberate change to one of them first moves its regeneration to TypeScript, as `packages/worldgen/scripts/frozen.ts` does.
- **The owner's computer stays responsive.** Heavy runs (the whole unit suite, `pnpm check`, the headless runs, the browser suite and the bench) run in CI on GitHub, never on the owner's machine. Locally, run only the test files a task added or changed, one command at a time, at idle priority (`nice -n 19`); a task that changes no test runs none. Playwright runs one worker, and Vitest two outside CI.
- **Parallel agents.** Up to four agents build at once, each on its own files, because one at a time was too slow. Each runs only its own test files at `nice -n 19`, and only one runs Playwright at a time.
- **Pushes.** The coordinator pushes `main` after each finished feature, with the owner's standing OK, so CI runs the full checks; agents never push.
- **Git only.** There is no `gh` CLI: Claude uses git alone, never asks the owner for `gh` or CI results, and skips any plan step that needs `gh`.
- **No dots on the world map.** The map's walking crowd is gone; the people and walkers in places stay, and Pause people keeps its own state.
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
  - `burnInDays` is 18,428, from a 40,000-day run with exits off (Ruling 18);
  - no credit line, since Ruling 14's trigger didn't trip (s.d. 0.0110 on seeds 2001–2050); recheck at M2.2b and M5;
  - exits off in `CITY` (`shortPayExitPpm` 0) until entry is designed (Ruling 19), so the exit target is a tier-2 gap meanwhile.

## Open

Beyond the checkpoint's Open list:
- **Browser specs.** `hud.spec.ts`'s "zooms and pans", `town-skin.spec.ts`'s 2560×1440 case and `map-goto.spec.ts` are fixed by pausing the sim or crowding the scene (9d4c402, 25a084b, c44c526, fa9f56f). `map-crowd.spec.ts` went with the map crowd (75e2652); its one zoom-bar test moved to `map-goto.spec.ts`. CI passed its check and browser jobs on 3476e70 (run 81, read before the git-only ruling); later runs weren't read.
- **Stale docs:**
  - the 48×28 town in `place-camera.test.ts:11`, `interfaces.md`'s Places sizes, `countries.md:46`, the M3.1 plan (line 41) and the M0.4 plan (line 83);
  - the old hash `b3b2c251` in `interfaces.md:163`, the M8.1 plan (line 300) and the M8.3 plan (lines 85 and 1844).
- **The shared plan doc** still names five engines, Deno and the 2% pay cut. It also lacks M3.1 Part 3, whose suggested tag is "(Towns)". Update it at the next sync, with the owner, along with the deferred items in `git show 6736fb6:docs/plan/HANDOFF.md`.
- **The owner's go:** M3.1 Part 3's Tasks 12–16 and 19–21 (walls, towers, gates and farms). M0.5 waits only on the owner's device timings.
- **Backlog from before the restructure** (checkpoint 0034 and the nomos-bd hand-off):
  - **Unbuilt tasks:** M0.8's leftovers (lil-gui behind `?dev=1`, the town's Fit, Home and pinch, and `toolbar.ts` in the Layout table), and M8.1's Tasks 31 and 33–35.
  - **Checks:** the `names-only-in-the-inspector` dependency rule isn't `reachable`, and `fallback.spec` centres on the old 48×28 map.
  - **The app:** the Town skin and the town view fetch the atlas separately. The town view's reduced motion doesn't switch live in Chromium (low).
  - **The economy:** the slow-searcher trait keys on the row index, which M5's births must fix. M2.6's brief puts `spawn/culture.ts` in a guarded folder.
  - **Budgets:** the 35 ms spawn row for 100,000 agents has about 14% headroom, and CI's runner may be slower.
  - **Docs:**
    - `interfaces.md`'s desktop memory total, about 11.9 of 64 MiB, leaves out M2.2's and M2.3's roughly 1.1 MB;
    - M2.1's plan lines 220–221 and 258 are stale;
    - `tools/sprites/README.md` lacks the designers' edits;
    - `design` writes its columns in the machine's byte order, which `interfaces.md` records as little-endian on x64 and arm64.

## Log

- 10 Oct: **M2.3 closed** (41febe1..9a1bbff), with the review's fixes. Exits are off in `CITY` (Ruling 19). A hire resets the spell count, the slow-search bound applies only when someone is slow, and `design --out` must be new or empty. Okun is measured on units produced, and `design` runs 2 threads off CI. With exits off, the burn-in is 18,428 days. On seeds 2001–2050 all six tier-1 targets hold, Okun holds at −0.81, and `unemployment_sd` is 0.0110. The long test passed 13/13 in 74 s, and the goldens held (`6a652730`, `746a06a3`).
- 10 Oct: **the world map's walking dots removed** (owner; 75e2652, f1f9341, 1090702). The app, the map renderer, the protocol and worldgen lose the map crowd, and `interfaces.md` follows. No world or replay hash moves, since the crowd was never in the world. The M8.1, M8.3 and M3.1 plans say so too, and M8.3's Tasks 16–19 point to git for their old steps.
- 10 Oct: **git only, no `gh`** (owner). The M0 and M1.6 plans no longer name `gh`: their CI steps now just push `main`, and the owner starts `release.yml` from the Actions page.
- 10 Oct: **testing and rules restructured** (owner). `pnpm check` runs every check but the browser specs, and CI's check job runs only it. The stdlib workflow and the engine scripts are gone, perf runs by hand, and the place tests check 2 worlds. `pnpm check` passed locally in 349 s, with the unit tests at 65 s, down from 175 s.
- 10 Oct: **engineers default to Sonnet,** and lint and the determinism and economy reviews wait for the end of a feature (owner). The check after each edit keeps only quick guards, about 0.13 s, where linting took about 3 s.
- 10 Oct: **TypeScript only** (owner). `pnpm test:py` runs only the asset checks, the sprite test among them; the frozen generator's checks are gone, and `town.test.ts` no longer starts Python. M3.1 Part 3 builds its layouts in TypeScript.
- 10 Oct: **heavy test runs move to CI** (owner), since test runs had pinned the owner's CPU at 100%. Playwright runs one browser at a time and reports CI failures as annotations, and Vitest uses two workers locally (bd8ee04). Two of the three fixer agents were stopped mid-run.
