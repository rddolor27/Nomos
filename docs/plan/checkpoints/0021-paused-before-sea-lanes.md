---
checkpoint: 21
date: 2026-10-09
milestone: M8.1 and M8.3
status: paused
based_on: 139ae51
next: Checkpoint 0020's queue, from M8.1 Task 26 Sea lanes (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md), once the owner says to go on
waiting_on: [owner: say when to resume, owner: whether blobs should appear on the map before M7 and M9]
---

# Checkpoint 0021: paused before sea lanes

The owner paused the work on 9 October 2026, after M8.1 Task 25, to hear where things stand. Checkpoint 0020's queue, its rules for running tasks and its Open items still hold. The hourly resume job is off.

## State

- **M8.1:** Tasks 7–25 are committed.
  - `node packages/worldgen/scripts/engines.ts` prints `3800 stage checks ok`: 19 Python stages over 200 worlds. A Bun copy in the scratchpad gave the same.
  - The regions freeze matches on 200 worlds.
  - Left: Tasks 26–28, the last stages; Task 29, `generateWorld`; Task 30, the map worker; then 31–35.
- **M8.3:** Tasks 1–9 are committed, plus Task 14's colour check. Its golden frame, and Tasks 10–13 and 15, wait on M8.1 Tasks 29 and 30.
- **Fixes F1–F10 are committed.** Every one came from the 9 October reviews and screenshots.
  - F5 and F7–F10 pin the choices the goldens can't see: drainage, biomes, settlements, countries and farmland.
  - F6 and the Task 25 refactor share helpers that had been copied.
- **Unpushed:** everything after e8c3bfb.

## What the owner expected

The owner expected to open the map locally and see many blobs across the countries.
- **The map:** it reaches the page only with M8.3 Task 10, which needs M8.1 Tasks 26–30 first. That is about 2.5–3.5 hours of work at today's pace (inference).
- **Blobs across countries are not in this phase.** On 9 October the owner chose map first, with blobs staying in the town. The plan brings people across countries with M7, the country of ledgers, and M9, which spawns people when the view zooms into a place.
- **Whether blobs should show on the map sooner** is a plan change for the owner to decide. It is not settled here.

## Done since checkpoint 0020

- **M8.1:**
  - Tasks 16–22: rain, erosion, drainage, climate, biomes, settlements and countries;
  - Task 23: regions, with the frozen fingerprints (1b53705, 83a6cc7);
  - Task 24: farmland and the route graph;
  - Task 25: roads (4529497, 139ae51).
- **M8.3:**
  - Task 9: the `MapRenderer` (4020e4f);
  - Task 14: the colour check (f757344), with a pair bar of 11.95, because the owner's blue and deep violet sit 11.96 apart for deutan vision (543be59).
- **Measured, recorded in Ruling 10 (ddb1c73):** regions per country run 1–12 over 200 worlds.

## Next

When the owner says to go on, continue checkpoint 0020's queue from M8.1 Task 26, Sea lanes. Re-create the hourly resume job if the owner wants it.
