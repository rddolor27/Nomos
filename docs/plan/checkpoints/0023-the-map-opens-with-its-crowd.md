---
checkpoint: 23
date: 2026-10-09
milestone: M8.1 and M8.3
status: paused
based_on: 8fe6cf7
next: The queue below, from its first task without a commit; checkpoint 0020's rules for running and committing tasks still hold
waiting_on: [owner: whether a country may hold 2 settlements in rare worlds, before the v1 freeze at M8.1 Task 34]
---

# Checkpoint 0023: the map opens with its crowd

On 9 October 2026 the map reached the built app. Pressing Map pauses the town and opens the whole generated world: five countries with borders, names and a legend, and the look-only crowd walking near each settlement from the Region view in. The owner received three screenshots of it.

## State

- **M8.1:** Tasks 7–30 and 32 are committed.
  - All 23 Python stages, the regions and the world fingerprint match on 200 golden worlds: `engines.ts` prints `4800 stage checks ok`.
  - The sweep checks 1,100 worlds in about 50 s.
  - Left: Task 31, which needs the owner's phone timings; Task 33, the place-name table; Task 34, the owner's 100 names and the v1 freeze; and Task 35, the close.
- **M8.3:** Tasks 1–10, 14's colour check and 16–18 are committed, with Task 19's sweep.
  - Running at this checkpoint: Task 11 (size limits), Task 12 (exit tests), Task 13 (the 2 ms bar) and Task 14's golden frame.
  - Left after those: Task 19's screenshot step, which the screenshots below may stand in for, and Task 15, the close.
- **Unpushed:** everything after e8c3bfb.

## Done since checkpoint 0022

- **M8.1:**
  - Task 26, sea lanes: 7f18ead and 2ad7d91;
  - Task 27, the survey and wonders: 1e19141 and 9b54819;
  - Task 28, landmarks: e64ae70 and 9337916;
  - Task 29, `generateWorld`: 5ce2f95;
  - Task 30, the map worker, which also answers with the crowd: 05bd29a;
  - Task 32, the sweeps and the identity test, with a CI step: c78a742.
- **M8.3:**
  - Task 16, the crowd's homes and stops: 5232892;
  - Task 17, the crowd pass: 82434ae, with its tests in 06cc018, 1b3c132 and aa893fb, and docs in daae9f3;
  - Task 10, the Map control and the lazy map view: d5b6642;
  - Task 18, the crowd's motion and the view: f69f3e7, 09ff645 and 8fe6cf7;
  - Task 19's sweep: a5c44a7.
- **Docs:** 77040a6 and 84e65f7.
- **What the owner saw:** `dist/qa/map/` holds the screenshots sent: the whole map, the Region view on the capital and a closer step. The large world of seed 42 has 10,006 dots.

## Decisions

All of these are agent rulings, which the owner can overturn.
- **The wonder floor is 3.** Standard 5EED00F4 places 3 wonders, and Python does the same: no fourth kind has a site clear of the 8-cell wonder gap. That is 1 world in 1,000 standard seeds; the counts ran 3:1, 4:129, 5:363, 6:351, 7:196 and 8:60.
  - The 4–8 figure came from research round 9, not from the owner. So the sweep's floor became 3 (c78a742), and `task.md` and `interfaces.md` say so (84e65f7).
- **The crowd went into the map worker with Task 30.** This was Task 18's worker part, moved to save a round trip (05bd29a, 77040a6).
- **The crowd's look** (Task 17, render engineer):
  - dots are a tenth of a cell, rounded up: 4 px at 32 px a cell, so they are outlined wherever the Region view opens;
  - Canvas2D draws the same discs, not the plan's squares;
  - the crowd also draws over the flat view at a Region step.
- **The map view** (Tasks 10 and 18, senior game engineer):
  - the map's renderer is disposed on close and made again on the next open, as Ruling 1 says;
  - the map follows the town's backend;
  - the camera persists between openings;
  - the frame loop predicts the coming view, so the first Region frame after a zoom already has the crowd moving;
  - reduced motion is read live;
  - `#map` carries a key hint for screen readers.

## Open

1. **The owner:**
   - **Countries.** Standard 5EED0215 has a country holding 2 settlements, where the Countries plan says at least 3. Python does the same.
     - The plan's check covers 100 seeds of each size, and those all pass. The finding came from 1,000 standard seeds.
     - The cause: `smallCapitals` starts at n = 2, so the largest settlement's country is never passed over.
     - A fix in both Python and TypeScript would change no golden world. It is the owner's call, before the v1 freeze.
   - Whether the crowd goes into the shared plan doc.
   - Accepting the 2 ms bar, at Task 13.
   - The map's phone timings, at M8.1 Task 31.
   - 100 sample place names, at Task 34.
   - Reviewing the snow tiles.
   - Syncing the five colours into the shared doc.
   - The device timings for M0.5.
2. **Before the next push:**
   - **The browser engines spec.** Since Task 29, `packages/worldgen/test/browser/engines.spec.ts` builds each world twice, once more through `generateWorld`. Time it in Firefox and WebKit against its 300 s timeout.
   - **Bun.** Run the Bun leg, which isn't installed locally.
3. **Town load in headless SwiftShader Chromium.** Once the desktop-tier town plays, it saturates the main thread there. A Map click 8 s after load took about 20 s to show the map; clicked at once, it took about 1 s. Browser specs should open the map at once or use `?tier=phone`. On a real GPU this is unmeasured.
4. **Flaky under load.** Some sim-core tests can pass Vitest's 5 s timeout when several agents load the machine: `world.test.ts`'s checkpoint test and `flows.test.ts`. Each passes alone in under 1.5 s.
5. **Carried from 0019:** M0.7's deferrals, the wallet roll-up before M2.1, and the licence items.

## Next

1. Commit Tasks 11–14 as each reports.
2. Close M8.3 with Task 15: `senior-qa` proves the exit checks, `code-reviewer` reviews the whole part, and a docs commit and a checkpoint follow.
3. M8.1's Tasks 31, 33 and 34 wait on the owner.
4. Before any push, run the checks in Open item 2 and the identity check, then ask the owner.

## How to verify

- `node packages/worldgen/scripts/engines.ts` prints `4800 stage checks ok`.
- `node packages/worldgen/scripts/sweep.ts` prints `0 problems`.
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- **To see the map:**
  1. `pnpm --filter @nomos/web build`;
  2. `python tools/atlas/build_atlas.py --out apps/web/dist/atlas`;
  3. `pnpm --filter @nomos/web preview`;
  4. open the printed address and press Map in the Controls panel;
  5. zoom in with the wheel or `+` to see the crowd.
