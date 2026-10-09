---
checkpoint: 20
date: 2026-10-09
milestone: M8.1 and M8.3
status: paused
based_on: 8538a3c
next: The first task in this file's queue that has no commit yet (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md and m8.3-country-and-region-views/plan.md)
waiting_on: [owner: device timings on an Android phone and an iPhone (closes M0.5)]
---

# Checkpoint 0020: the map task queue

The owner asked on 9 October 2026 that every remaining map task be written down in order, with how to run it, so that no compute is lost when usage runs out. This file is that queue. It stays valid as tasks land: each task commits with a `Task:` line naming it, so `git log --oneline 8538a3c..HEAD` shows what has landed since. Resume with the first task in the queue that has no commit. Checkpoint 0019's Decisions and Open items still hold.

## State

- **M0.7:** closed and pushed (e8c3bfb). CI's `CI` and `perf` workflows passed on it.
- **M8.1:** Tasks 7–15 are committed. Six of the 23 golden stages match Python on all 200 worlds, in Node and in three browsers (a4db45d). Task 16, rain, was in progress and uncommitted: `packages/worldgen/test/engines/stages.ts` and the new `packages/worldgen/src/climate/`.
- **M8.3:** Tasks 1–8 are committed. The lead was building Task 9.
- **Unpushed:** 12 commits after e8c3bfb, plus this checkpoint. They go out at a sub-milestone close, after the identity check.
- **Screenshots** (QA, 9 October):
  - the inspector shows a clicked blob's name and wallet;
  - the country previews use only the owner's five colours;
  - the map atlas page holds all 81 frames.

  QA also found two bugs, F1 and F2 below.

## Done since checkpoint 0019

- **M8.1:**
  - Task 10, the generator lint (91eba3e);
  - Task 12, the golden harness and the land templates (ccdc41c);
  - Task 13, five engines (a4db45d);
  - Task 14, relief and chains (49ab705);
  - Task 15, raw height, land and the shape (5601302).
- **M8.3:**
  - Task 1, the map atlas page (c76ae12);
  - Task 3, frames (28b7b8c);
  - Task 4, the overlay (1f84f5a);
  - Task 5, labels (4590f22);
  - Task 6, the legend and input (e6e98ef);
  - Task 7, the base pass (daf05bb);
  - Task 8, the icons pass (8538a3c).

## The queue

Run tasks in this order. "Junior" tasks follow their plan section alone, and the senior lead takes "Senior" ones. At most two juniors run at once, and never two tasks that edit the same shared file. The shared files are:
- `eslint.config.js` and `.dependency-cruiser.cjs`;
- `.github/workflows/ci.yml` and `playwright.config.ts`;
- `apps/web/.size-limit.json`, `apps/web/package.json` and `pnpm-lock.yaml`;
- `packages/worldgen/test/engines/stages.ts`, which every M8.1 port task appends to.

### M8.1, the world generator

Each port task, 16–28, is done when `node packages/worldgen/scripts/engines.ts` reports all its stages ok on all 200 worlds.

| # | Task | Who | After |
| --- | --- | --- | --- |
| 16 | Rain (in progress) | Junior | 15 |
| 17 | Erosion: flood, accumulate and erode | Junior | 16 |
| 18 | Lakes, rivers and drainage | Junior | 17 |
| 19 | Temperature, moisture and coasts | Junior | 18 |
| 20 | Biomes, slopes and habitability | Junior | 19 |
| 21 | Settlements | Junior | 20 |
| 22 | Countries | Junior | 21 |
| 23 | Regions and market territories, and `frozen-v1.json` | Senior | 22; beside 24–28 |
| 24 | Farmland and the route graph | Junior | 22 |
| 25 | Roads | Junior | 24 |
| 26 | Sea lanes | Junior | 24; beside 25 |
| 27 | The survey and wonders | Junior | 25 |
| 28 | Landmarks | Junior | 27 |
| 29 | `generateWorld`, the `WorldMap` and the world fingerprint | Junior, exact code | 23, 26, 28 |
| 30 | Stand-in names and the map worker | Junior, exact code | 29 |
| 31 | The generation budget in a browser worker | Senior | 29; the owner's phone timings |
| 32 | The exit sweeps and the identity test | Junior, exact code | 29 |
| 33 | The place-name table and the picker | Senior, then junior | 30 |
| 34 | The owner hears 100 names, then the v1 freeze | Senior and owner | 33 |
| 35 | Close M8.1 | Senior | 31–34 |

### M8.3, the Country and Region views

| # | Task | Who | After |
| --- | --- | --- | --- |
| 9 | `MapRenderer`, context loss and the Canvas2D fallback (in progress) | Senior | 8 |
| 14 | The colour check and the Countries golden frame | Senior | 9 |
| 10 | The Map control and the lazy map view | Senior | 9, M8.1 Task 30 |
| 11 | Size limits and the startup gate | Junior, exact steps | 10 |
| 12 | Exit tests | Junior, exact code | 10, M8.1 Task 29 |
| 13 | The 2 ms bar; the owner accepts it | Senior and owner | 10 |
| 15 | Close M8.3 | Senior | 11–14 |

### Fixes, for a free junior slot

| # | Fix | Who | Files |
| --- | --- | --- | --- |
| F1 | **The 2x inspector case isn't a real 2x run.** In Chromium, `deviceScaleFactor: 2` on the context alone leaves the canvas at half size, so the case passes without testing the 2x path. Launch that case with `--force-device-scale-factor=2`, as `packages/render-gl/test/browser/scale.ts` does. Check Firefox and WebKit separately. | Junior | `apps/web/test/browser/inspector.spec.ts` |
| F2 | **The town view's focus ring is invisible.** `#view:focus-visible`'s inset outline sits under the absolutely positioned canvas (WCAG 2.4.7). Make it show above the canvas, within `index.html`'s 1.5 kB limit, and add a check to the a11y spec. | Senior game engineer | `apps/web/index.html`, `apps/web/test/browser/a11y.spec.ts` |
| F3 | **Lock in the neighbour choices** that the goldens barely see: 4-neighbour islands, 8-neighbour ponds and ocean, and smoothing that reads the old grid. Use hand-made bitmaps, with expected values from Python. The Task 15 junior was asked to do this; it isn't committed yet. | Junior | `packages/worldgen/test/shape-neighbours.test.ts` |
| F4 | **Assert the map atlas count.** Task 1's test should assert 81 map frames, not just print the count. | Junior | `tools/atlas/test_atlas.py` |

## How to run a task

- **Juniors run on Sonnet:**
  - `sim-engineer` for `packages/worldgen` and `tools/worldgen`;
  - `render-engineer` for `packages/render-gl`;
  - `junior-game-engineer` for `apps/web`;
  - `junior-qa` for checks and screenshots.
- **A junior's brief** names:
  - the plan section by line;
  - the plan's Global constraints, plus the Porting rules and Review focus for M8.1 ports;
  - the files;
  - what "done" means: the task's checks, `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` with the Bash tool, and `hash=b3b2c251` from the CLI;
  - when to stop and report;
  - the other agents' files.

  It forbids `git add`, `commit`, `push`, `stash`, `reset`, `checkout` and `restore`, and `pnpm install` unless the task needs it. The junior reports its files, outputs, departures, gates and a commit header.
- **The orchestrator commits** after checking the diff, with `git add` on new files and then `git commit -- <paths>`, under the owner's no-reply address.
  - The header stays at 72 characters or fewer.
  - The body starts `Task: M8.x <title>, task N: <title>`.
  - In PowerShell, keep double quotes out of `-m` text.
- **The senior lead runs on Opus.** It commits its own tasks by path and never pushes.
- **Push only at a sub-milestone close:**
  1. run the identity check, `git log --format='%ae %ce' origin/main..main`, which must show only the no-reply address;
  2. push;
  3. confirm the `CI` and `perf` workflows on GitHub.

## Open

1. **The owner:**
   - the map's phone timings, at M8.1 Task 31;
   - 100 sample place names, at Task 34;
   - accepting the 2 ms bar, at M8.3 Task 13;
   - reviewing the snow tiles;
   - whether to sync the five colours into the shared doc;
   - the device timings for M0.5.
2. **Carried from 0019:** M0.7's deferrals, the wallet roll-up before M2.1, and the licence items.

## How to verify

- `node packages/worldgen/scripts/engines.ts` prints `1200 stage checks ok`, or more as ports land.
- `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` prints `hash=b3b2c251`.
- `pnpm test && pnpm lint && pnpm typecheck && pnpm depcruise && pnpm names` exits 0.
