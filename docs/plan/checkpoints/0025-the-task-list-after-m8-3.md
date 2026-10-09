---
checkpoint: 25
date: 2026-10-09
milestone: M8.1
status: paused
based_on: 9f26c16
next: M8.1 Task 33, the place-name table and the picker, once the owner says to go on (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md)
waiting_on: [owner: whether to start M8.1 Task 33, owner: the map's phone timings (Task 31), owner: hearing 100 names (Task 34), owner: device timings (M0.5)]
---

# Checkpoint 0025: the task list after M8.3

The owner asked on 9 October 2026, with 22% of usage left, for the task list brought up to date: what is built, and which tasks are done. Everything below is pushed to `origin/main` up to 9f26c16, except this file. Checkpoint 0024 holds the evidence for M8.3's exit checks.

## What is built

- **M0 Pipeline:**
  - the deterministic sim in a worker, with exact money;
  - Skin A dots and the HUD;
  - module folders, the `Blob` handle, and names and wallets shown on click.
  - M0.1–M0.4, M0.6 and M0.7 are done. M0.5 waits only on the owner's device timings.
- **The world generator** (`packages/worldgen`): Python's whole generator, ported line for line.
  - All 23 stages and the world fingerprint match Python on 200 worlds: `engines.ts` prints `4800 stage checks ok`.
  - It runs in a map worker. A sweep checks 1,100 worlds in CI.
- **The map** (M8.3, closed): a Map button opens the world of five countries.
  - **Views:** pixel-art Country and Region views, and a flat Countries view.
  - **On the map:** rivers, roads, sea lanes, borders with colour bands, labels and a legend.
  - **Moving around:** pan and zoom by mouse, touch and keys, plus the + and − buttons.
- **The crowd** (owner): a look-only dot per 100 people, about 10,000 a world.
  - The dots show from the Region view in, in the six body hues.
  - They walk near home and never leave their country's land.
  - Pause dots stops them.
- **Zoom to any settlement** (owner): click or tap a town, or pick it from the Go to list.
- **Quality bars:**
  - a frame takes about 0.1 ms in the Country view and 0.5 ms in the Region view, against the 2 ms bar;
  - the first load is unchanged;
  - the town's replay hash is `b3b2c251`.

## M8.1 World generator: 30 of 35 tasks done

| # | Task | State |
| --- | --- | --- |
| 1–6 | Python countries stage, previews and snow tiles | Done |
| 7–15 | Streams, goldens, kernels and codes, lint, harness, engines, relief, shape | Done |
| 16–25 | Rain, erosion, drainage, climate, biomes, settlements, countries, regions, farmland and the route graph, roads | Done |
| 26 | Sea lanes | Done, 7f18ead |
| 27 | The survey and wonders | Done, 1e19141 |
| 28 | Landmarks | Done, e64ae70 |
| 29 | `generateWorld` and the world fingerprint | Done, 5ce2f95 |
| 30 | Stand-in names and the map worker | Done, 05bd29a |
| 31 | The generation budget in a browser worker | Waits on the owner's phone timings |
| 32 | The exit sweeps and the identity test | Done, c78a742 |
| 33 | The place-name table and the picker | **Next**, run by a senior, then a junior; needs nothing from the owner |
| 34 | The owner hears 100 names, then the v1 freeze | Owner, after 33 |
| 35 | Close M8.1 | After 31–34 |

## M8.3 Country and Region views: 19 of 19 tasks done, closed 9f26c16

Tasks 1–9 build the atlas page, the camera, the overlay, labels, the legend and input, and the passes and renderer. Tasks 10–15 add the Map control, size limits, exit tests, the 2 ms bar, the colour check and golden frame, and the close. Tasks 16–19 are the crowd. The owner's zoom to any settlement and the review fixes came in the same round.

## Open, for the owner

1. Start M8.1 Task 33 now, or pause?
2. Phone timings for the map (Task 31), and the device timings for M0.5.
3. Hearing 100 sample place names (Task 34).
4. Whether the crowd and the zoom go into the shared plan doc.
5. Reviewing the snow tiles, and syncing the five colours into the shared doc.

## Next

1. Read CI's result for 9f26c16. A one-shot check was set for 21:27. If the Countries golden hash differs on Linux, re-record it from CI's log.
2. When the owner says go: M8.1 Task 33, then Tasks 34, 31 and 35.
3. After M8.1: M1 Lab mode.
