---
checkpoint: 24
date: 2026-10-09
milestone: M8.3
status: done
based_on: 19c93af
next: Push and confirm CI; then M8.1 Task 33, the place-name table and the picker (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md)
waiting_on: [owner: the map's phone timings (M8.1 Task 31), owner: hearing 100 sample place names (M8.1 Task 34), owner: device timings (M0.5)]
---

# Checkpoint 0024: M8.3 closed, with zoom to any settlement

M8.3 Country and Region views closed on 9 October 2026 at 21:05. The built app's Map control opens the generated world of five countries. You can zoom into any settlement by clicking it or picking it from a Go to list, and from the Region view in, each settlement's look-only crowd walks near home on its own country's land. M8.1 stays open for its last four tasks, two of which wait on the owner.

## State

- **M8.3:** every task is committed, 1–19, and every exit check is proven (below). `milestone.md` records it as done: about 495 min of work beside M8.1's port.
- **M8.1:** Tasks 7–30 and 32 are committed. Left:
  - Task 31, the generation budget, which needs the owner's phone timings;
  - Task 33, the place-name table and the picker;
  - Task 34, the owner hears 100 names, then the v1 freeze;
  - Task 35, the close.
- **Unpushed:** everything after e8c3bfb. The owner approved the push at this close.

## Done since checkpoint 0023

- **M8.3 Tasks 11–14:**
  - 580ec53: the size limits;
  - 440faf0 and 6f5beb7: the exit tests;
  - c2efc2b: the 2 ms bar;
  - 3c86da5: the Countries golden frame.
- **Zoom to any settlement (owner):**
  - 28a809c: the zoom buttons;
  - 2f28511: click or tap a town, and the Go to list;
  - 0423bf5: the list resets after every jump.
- **Accessibility:**
  - e3c31ff: Pause dots;
  - 90f91db: the status line is read on focus, and reduced motion is followed live.
- **Review fixes:**
  - **Crowd:** homes no longer lean north-west (f1cbb14). Legs never leave the settlement's country's land (e035a7f): 4.24% of dots did, over 74 worlds, and now none do.
  - **Pins:** the variant column, and the sweep checks each settlement's region (5b337af).
  - **Shared helpers** (a95889d).
  - **Renderer:** it redraws itself after a restored or lost context (2a3418c), and binds its textures with no array per frame (927b54c).
  - **Tests:** the crowd's buffers are transferred, and focus returns on close (7004d3e). The crowd's pixels are counted (10a2be1). Playwright ignores `dist/` (179f186).
- **Docs:**
  - bb391c4: the owner's answers;
  - e9904a7: the zoom plan;
  - 7c7d5c7: the crowd's rules as reviewed;
  - c273f3a: interfaces;
  - 19c93af: the close;
  - 08ccfc4: the worldgen README.
  - Checkpoint 0022 said a crowd leg "rarely crosses water". Since e035a7f, no leg leaves its country's land.

## Exit checks, proven on the final code (9 October 2026, Windows 10, Node 24.18, Chromium 156 on SwiftShader)

| Check | Evidence |
| --- | --- |
| ≤ 2 ms main-thread render time per frame (owner accepted) | `perf.spec.ts`: Country median 0.12 ms; Region median 0.51 ms, p95 0.66 ms, with 10,006 dots walking |
| Nothing of the map in the first load | The entry, renderer and worker chunks kept 13,171, 17,049 and 16,209 B through every task. Size limits pass: initial JS 16.78 of 17 kB, the map view 12.3 of 14.5 kB, the map worker 13.32 of 17 kB. `chunks.ts` reports 0 ungated chunks. Startup medians: 1,146 ms to the first frame, 1,549 ms to interactive |
| Every tile, icon, wonder and landmark has a frame; labels by band | `map-exits.test.ts` and `test_atlas.py` |
| Seed 42's Countries view matches its golden frame; every border draws; the legend names every country | `map-golden.spec.ts` |
| The town pauses under the map, resumes only if it was playing, and focus returns | `map.spec.ts` |
| The crowd: a dot per 100 people; stops and legs on its own country's land; drawn only from the Region view in; still under reduced motion and Pause dots | `crowd.test.ts`, `crowd-sweep.test.ts`, render-gl's `map-crowd.spec.ts` in three browsers, and the app's `map-crowd.spec.ts` |
| The town's replay never moves | `hash=b3b2c251` |

Senior QA also ran every step of CI's `check` job locally, and every step passed.

## Decisions

- **The owner, 9 October 2026:**
  - accepted the 2 ms bar;
  - accepted a rare country of 2 settlements: standard 5EED0215, 1 world in 1,000;
  - deferred Fit on small screens: at 1x, a 1,280 × 800 section can't show the whole large world at 8 px a cell;
  - chose zoom to any settlement: click or tap a town, or pick it from a Go to list. Opening a town as its own street view stays with M9;
  - approved the push at this close.
- **Agent rulings, which the owner can overturn:**
  - **Pause dots,** for WCAG 2.2.2: the walking crowd lasts beyond 5 s, so it needs a pause.
  - **Crowd stops:** stops 0 and 2 stand in the home cell, and stops 1 and 3 beside it, never diagonally, so legs stay ashore. Homes take the nearer of two draws.
  - **The Go to list resets after every jump.** As a result, arrow keys on a closed list jump to each town they pass, in Chromium on Windows and Linux. Keyboard users open the list with Alt+↓ or F4.
  - **Taps:** a tap must move under 5 CSS px. A close-step tie goes to the lower step.
  - **The map spec runs the town at the phone tier.** At the desktop tier, the town held headless Chromium's main thread for 20–66 s.
  - **Playwright ignores `dist/`,** so scratch copies there never run as specs.

## Open

1. **The owner:**
   - the map's phone timings (M8.1 Task 31);
   - 100 sample names (Task 34);
   - M0.5's device timings;
   - whether the crowd and the zoom go into the shared plan doc;
   - reviewing the snow tiles;
   - syncing the five colours into the shared doc.
2. **CI, after the push:**
   - **The Countries golden hash was made on Windows SwiftShader.** If Linux SwiftShader differs, take the hash from CI's log and record it with `UPDATE_GOLDEN=1`'s rule.
   - **The Bun leg** is untested locally.
   - **The GitHub CLI isn't installed here,** so read CI's result another way, or ask the owner.
3. **Flaky only under heavy local load,** with each test passing alone:
   - sim-core's 5 s Vitest timeouts in `day.test.ts`, `world.test.ts` and `flows.test.ts`;
   - render-gl's town frame budget, a p95 of 4 ms, failed 3 of 4 runs at 83–100% CPU.
4. **Deferred review nits, map view:**
   - one canvas field kept in two places;
   - the `#RRGGBB` string built three times;
   - the key list stated twice;
   - a helper named like the renderer method it wraps.
5. **QA's test gaps:** the perf spec gates only the median. The app's crowd hook `crowdDrawn` follows the view, and render-gl's pixel spec is the proof of record.
6. **Carried from 0019:** M0.7's deferrals, the wallet roll-up before M2.1, and the licence items.

## Next

1. **Push:**
   - run `git log --format='%ae %ce' origin/main..main`, which must show only the no-reply address;
   - push `main`;
   - confirm the `CI` and `perf` workflows.
2. **M8.1 Task 33:** the place-name table and the picker, run by a senior, then a junior.
3. **Then Task 34 with the owner:** they hear 100 names, then the v1 freeze. Task 31 runs when the phone timings arrive, and Task 35 closes M8.1.

## How to verify

- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0: 569 tests.
- `node packages/worldgen/scripts/engines.ts` prints `4800 stage checks ok`, and `sweep.ts` prints `0 problems`.
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- `pnpm exec playwright test apps/web/test/browser/map.spec.ts apps/web/test/browser/map-crowd.spec.ts apps/web/test/browser/map-goto.spec.ts apps/web/test/browser/map-golden.spec.ts --project=chromium --workers=1` passes 11 tests.
- **To see it:**
  1. `pnpm --filter @nomos/web build`;
  2. `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`;
  3. `pnpm --filter @nomos/web preview`;
  4. press Map, then click any town or pick it from Go to.
