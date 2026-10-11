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
- **Names.** The owner approves the generated place names without a review, so M8.1's Task 34 freezes version 1 without asking.
- **Parallel agents.** Up to four agents build at once, each on its own files, because one at a time was too slow. Each runs only its own test files at `nice -n 19`, and only one runs Playwright at a time.
- **Pushes.** The coordinator pushes `main` after each finished feature, with the owner's standing OK, so CI runs the full checks; agents never push.
- **Git only.** There is no `gh` CLI: Claude uses git alone, never asks the owner for `gh` or CI results, and skips any plan step that needs `gh`.
- **No dots on the world map.** The map's walking crowd is gone; the people and walkers in places stay, and Pause people keeps its own state.
- **Decisions.** Claude settles open owner decisions itself, and records each here as a ruling.
- **Walled towns,** the final answers for M3.1 Part 3: density peaks at the plaza; stone walls with towers for capitals and cities, a palisade for towns, and none for villages and hamlets; roads by role; farms on the outskirts; the new buildings; suburbs, bridges, avenues and greens. Tasks 12–16 and 19–21 wait for the owner's go.

**Owner, 11 October 2026,** after seeing M2.2b's flat monthly charts:
- **Ask first:** Claude asks the owner before starting each new step or feature, with a short plan, and waits for a go.
- **Every town runs the sim:** the town in view is live; leaving it folds it into its record, and the next spawns from its own. The first screen becomes one town among them.
- **Crowds:** a town holds one blob per bed in its houses, so Highcourt drops to about 2,688.
- **The blob modal:** a click shows the blob's picture, name, job and pay, home and household, what it is doing, and its look.
- **The order:** first food and goods (M2.4 Part 1) beside the modal; then every town running the sim; then trips to work and shops. Ask again before each step.

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
- **The economy on screen (M2.2b):**
  - M1.2's 1×, 4× and 16× buttons came forward (Ruling 6). Each turn still posts one snapshot, and keys 1–3 work only while the view or the HUD has focus.
  - lil-gui and the per-system timings load only with `?dev=1`, and the Map button is in the HUD.
  - A plain day keeps the 16 KiB allocation limit. A month's last and first days get an interim allowance until M6.
  - A town's crowd starts three in four walking.
  - One inspect quirk is accepted: at a month's last day, between ticks 12 and 13, an inspect can show the wrong wage.

## Open

Beyond the checkpoint's Open list:
- **Browser specs.** `hud.spec.ts`'s "zooms and pans", `town-skin.spec.ts`'s 2560×1440 case and `map-goto.spec.ts` are fixed by pausing the sim or crowding the scene (9d4c402, 25a084b, c44c526, fa9f56f). `map-crowd.spec.ts` went with the map crowd (75e2652); its one zoom-bar test moved to `map-goto.spec.ts`. CI passed its check and browser jobs on 3476e70 (run 81, read before the git-only ruling); later runs weren't read.
- **Stale docs:**
  - the 48×28 town in `place-camera.test.ts:11`, `interfaces.md`'s Places sizes, `countries.md:46`, the M3.1 plan (line 41) and the M0.4 plan (line 83);
  - the old hash `b3b2c251` in `interfaces.md:163`, the M8.1 plan (line 300) and the M8.3 plan (lines 85 and 1844).
- **The shared plan doc** still names five engines, Deno and the 2% pay cut. It also lacks M3.1 Part 3, whose suggested tag is "(Towns)". Update it at the next sync, with the owner, along with the deferred items in `git show 6736fb6:docs/plan/HANDOFF.md`.
- **Local specs:** a stray `vite preview` on port 4173 serves the last build of `apps/web/dist`, and Playwright reuses it outside CI. Build before a local spec run.
- **Perf to check:** the economy's month-start `searchShops` (1.78 ms at 10k), and `createTown`'s extra 11 ms at the worker's start. `pnpm budget`'s sampled days miss a month's start. perf.yml, which the owner starts by hand, measures them.
- **perf.yml:** it hasn't run since the economy joined the step. The owner starts it from the Actions page. Watch the startup gate, the tick budget at 10k, and the allocation allowance on a month's last day, whose readings swing 0.24–0.92 MB.
- **Speed at 100k:** at 16× the desktop tier saturates the worker, so M1.2's per-tier caps are still needed.
- **A spawn transient:** a spawned town matches the record's totals, but every shop starts at one wage. So unemployment falls from 8.3% to 4.8% at day 21 before it settles.
- **Small follow-ups for `junior-game-engineer`:**
  - fold the segmented-button CSS, now in `toolbar.ts`, `zoom-bar.ts` and `speed-bar.ts`, into one rule;
  - drop `#side`'s 72 px top padding without `?dev=1`;
  - show the phone's inspector line without a scroll;
  - move `SystemRows` into the controls chunk;
  - the charts chunk has only 0.08 kB spare.
- **Names:** re-running `build-real-world.ts` would overwrite the 42 hand-added religion words. A test catches that, and a merge file would make them last.
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

- 11 Oct: **M2.2c briefed** (1f9c645): every town runs the sim. It waits for the owner's go.
  - **One kind of town:** a place's layout plus a TypeScript port of its ground, with Highcourt as place 0, each world's capital.
  - **Switching:** entering a town logs `INPUT_FOCUS`. The worker runs out the day, then folds the old town and spawns the new at the boundary. Away towns stay frozen, as the owner's fold-and-spawn ruling means ("consequential focus" in R4's terms).
  - **Records:** a 14-field ledger row per settlement. A first visit scales `CITY_RECORD` to the town's beds, with a household mix of 22/28/20/17/8/5% for sizes 1–6 (an unsourced estimate, to check against UN DESA before M2.5).
  - **Homes:** one blob per bed in the drawn houses, as "House N".
  - **Walkers:** the decorative walkers go, and the Town skin draws every live town.
  - **First slice:** Highcourt's 2,688 blobs in its own houses, with the card's "Lives with" filled.
- 11 Oct: **M2.4 Part 1, Tasks 1–2** (24981a8..6072558).
  - **Built:** the seven goods, start and spawn by good, the dated food ring that spoils, and flow log schema 2.
  - **Hashes:** `CITY.goods` stays 0 until Task 4, so no hash moved.
  - **An interruption:** the agent hit the old account's usage limit right after its docs commit, and only two comment edits were left (committed).
- 11 Oct: **the blob modal** (5b6e505..b8bb600, owner request).
  - **What a click shows:** a card with the blob's own sprite drawn large, its name, job, pay, wallet, house, household, what it is doing, and its look. On phones it is a bottom sheet.
  - **How it behaves:** it is a non-modal dialog, so the town stays live, and Escape closes it from any focus.
  - **Checks:** inspector 19/19, with the portrait equal pixel for pixel to the atlas, and axe at desktop and 390×844. No hash moved.
  - **Known:** every card says "Lives with: No one" until households of 1–6 fill real homes (Step 2), and "Doing" is a snapshot from the click.
- 11 Oct: **M2.4 Part 1 briefed** (a38fc16): goods and food on screen.
  - **The goods:** seven, one per supplier link: bread, vegetables, fish and milk as food, and cloth, tools and fuel.
  - **Eating:** every blob eats 3 portions a day, and food spoils from a 16-day ring per shop.
  - **The hash:** the goods state is hashed only in goods worlds, so `LENGNICK` and its goldens can't move. The city's food share is ICP's upper-middle 18.6% (decided).
  - **The coordinator's calls:** milk is the seventh good, since the owner named none, and Part 1's shop waste of about 5% (inference) is a gap against R6's 0.5–3% until Part 2.
  - **The modal:** its worker side landed in 5b6e505.
- 11 Oct: **M2.2b done** (Tasks 5 and 8, the review, the allocation fix; 8e4a120..c20ce6e, b7eb873..1339b2c).
  - **The panel:** it charts mean price, mean wage and unemployment by day, each with a data table, above the day's last 16 trades, which name no buyer.
  - **The HUD:** Pause, 1×, 4×, 16× and Map sit on one row at 1280 px, with the developer panel behind `?dev=1`.
  - **The review** (Opus) found nothing serious, and its seven fixes landed.
  - **The allocation test:** it had failed since Task 3, which turned CI red. It passes again: a plain day allocates 2.9 KB, down from 83 KB.
  - **Checks:** twelve browser specs pass locally, and initial JS is 25.78 of 35 kB.
- 11 Oct: **M0.8 done:** lil-gui is behind `?dev=1`, and the town has Fit, Home and pinch.
- 10 Oct: **M2.2b Tasks 1–4 and 6 built** (1d8e5f0..ba0b44a).
  - **The town:** every app world is a town spawned settled from `CITY_RECORD`, and its crowd starts three in four walking.
  - **The economy:** it runs one system a tick. The inspector shows job, employer and wage, the worker posts a daily `economy` feed, and logged layoffs fire at the next day's start.
  - **Hashes:** the new `town` golden is `b76fca4c`, and Highcourt's pins are `d11bb532` and `8eb639aa`. `746a06a3` and `6a652730` held.
  - **Cost:** the economy's worst tick is 0.77 ms at 3,965 people and 1.78 ms at 10,000, a month's first-day shop search (measured here, Node, one run).
  - **Bytes:** initial JS is 24.42 kB of 35 kB, so the M0 stand-in rose to 25.5 kB (a8bd24d).
- 10 Oct: **place names, and world generator version 1 frozen** (M8.1 Tasks 33–34, 9f78552..fb5890b).
  - **The names:** the map names countries and settlements from a 1,024-word table, keyed on cells.
  - **Before the freeze:** the owner waived the review, and the coordinator dropped 17 crude-sounding words. The religion list gained 42 core faith words that the Wikidata extract missed, which replaced 4 person words and 7 place words.
  - **The freeze:** version 1 is frozen, with the road classes.
- 10 Oct: **the town's zoom** (M0.8, b44ed12): −, +, Fit, Home and pinch on the first screen's town.
- 10 Oct: **M2.3 closed** (41febe1..9a1bbff), with the review's fixes. Exits are off in `CITY` (Ruling 19). A hire resets the spell count, the slow-search bound applies only when someone is slow, and `design --out` must be new or empty. Okun is measured on units produced, and `design` runs 2 threads off CI. With exits off, the burn-in is 18,428 days. On seeds 2001–2050 all six tier-1 targets hold, Okun holds at −0.81, and `unemployment_sd` is 0.0110. The long test passed 13/13 in 74 s, and the goldens held (`6a652730`, `746a06a3`).
- 10 Oct: **the world map's walking dots removed** (owner; 75e2652, f1f9341, 1090702). The app, the map renderer, the protocol and worldgen lose the map crowd, and `interfaces.md` follows. No world or replay hash moves, since the crowd was never in the world. The M8.1, M8.3 and M3.1 plans say so too, and M8.3's Tasks 16–19 point to git for their old steps.
- 10 Oct: **git only, no `gh`** (owner). The M0 and M1.6 plans no longer name `gh`: their CI steps now just push `main`, and the owner starts `release.yml` from the Actions page.
- 10 Oct: **testing and rules restructured** (owner). `pnpm check` runs every check but the browser specs, and CI's check job runs only it. The stdlib workflow and the engine scripts are gone, perf runs by hand, and the place tests check 2 worlds. `pnpm check` passed locally in 349 s, with the unit tests at 65 s, down from 175 s.
- 10 Oct: **engineers default to Sonnet,** and lint and the determinism and economy reviews wait for the end of a feature (owner). The check after each edit keeps only quick guards, about 0.13 s, where linting took about 3 s.
- 10 Oct: **TypeScript only** (owner). `pnpm test:py` runs only the asset checks, the sprite test among them; the frozen generator's checks are gone, and `town.test.ts` no longer starts Python. M3.1 Part 3 builds its layouts in TypeScript.
- 10 Oct: **heavy test runs move to CI** (owner), since test runs had pinned the owner's CPU at 100%. Playwright runs one browser at a time and reports CI failures as annotations, and Vitest uses two workers locally (bd8ee04). Two of the three fixer agents were stopped mid-run.
