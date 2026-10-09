---
checkpoint: 32
date: 2026-10-09
milestone: M8.1 Task 36, then M3.1 part 2
status: paused
based_on: f4bb766
next: M8.1 Task 36, the large world with more settlements (docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md); then M3.1 part 2, steps 1, 2 and 4 (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md)
waiting_on: [owner: whether the large world gets more countries, and so more capitals, than the Countries plan's 3–5]
---

# Checkpoint 0032: the bigger world first

## State

Later on 10 October 2026 the owner set a new first priority: a bigger map, new cities, towns and capitals, and more blobs, so that everything looks in proportion. The plans now put that first. Nothing else changed since checkpoint 0031, at f4bb766, which lists what was built and what's open.

## Decisions

- **Owner, 10 October 2026,** in this order:
  1. M8.1 Task 36: the large 192×128 world by default.
  2. M3.1 part 2, steps 1, 2 and 4: places at 4× the area, crowds by population, and the starting town.
  3. Then the walls and houses go into towns (step 5).
- **Coordinator:**
  - `settle.py` sets its settlement target from the land's area, so a large world holds about four times the cities, towns and villages with no generator change, and the map's crowd grows with them.
  - Capitals stay one per country. More capitals mean more countries, which is the owner's call.

## Open

1. The owner's call: more countries, and so more capitals, on the large world? The Countries plan says 3–5.
2. Everything open in checkpoint 0031.

## Next

1. M8.1 Task 36:
   - make the map open a large world;
   - check the settlement counts per tier on 20 large worlds;
   - measure generation in the map worker;
   - re-check the Region view's 2 ms bar with the bigger crowd;
   - check Fit, the labels, the legend and Go to.
2. M3.1 part 2, step 1, then steps 2 and 4. Expand the brief into a step plan first.
3. QA once, when these are finished (`models.md`).

## How to verify

As in checkpoint 0031.
