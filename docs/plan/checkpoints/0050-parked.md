---
checkpoint: 50
date: 2026-10-12
milestone: M3.2
status: paused
based_on: 6be0734
next: when the owner resumes, ask before starting. The approved queue is M3.2 Task 7 (friends and visits), then M3.1 Part 4 Task 26 (walls and gates, with the corner tiles), then M3.2 Task 8 by its step plan (docs/plan/tasks/m3-city-life/m3.2-daily-routines/plan.md)
waiting_on: [the owner's word to resume, perf.yml started once by the owner]
---

# Checkpoint 0050: parked

## State

Development is parked at the owner's word (12 October 2026, 09:43). Everything is pushed (1383563), and the tree is clean.

- **M2.7 Part 1 is done,** with its review and fixes.
- **M3.1 Part 4's Tasks 22, 27 and 23 are built:** varied street plans, the bell-curve town, every door reaching the plaza, and ways of up to 32 runs. Task 24's pieces are drawn.
- **M3.2's Tasks 1–6 and 9 are built,** with the owner's polish:
  - needs, traits and free time;
  - chats under bubbles;
  - spread sitters and partners;
  - walker lanes;
  - a selection ring;
  - a compact card.

**Pins:** Highcourt's are `9467e0f2` (phone) and `6c94faa4` (desktop), and the `streets` golden is `0388c8a7`. `42/phone` `746a06a3` and the economy `6a652730` never moved.

**Bytes:** initial JS is 37.99 of 40 kB.

## Decisions

- **Owner, 12 October:**
  - the four plans: M3.1 Part 4, M3.2, the house card, and trading;
  - ring towns, then lives, plus the bell curve;
  - a first-load JS budget of 40 KB;
  - the A bubbles;
  - diagonal walls with rounded corners;
  - Highcourt's crowd kept at 1,720;
  - next: the polish, then Tasks 7, 26 and 8;
  - parking.
- **Coordinator:**
  - Task 23 joined the build, and Task 27 ran before Task 26;
  - the household is the family until M5, and soldiers are paid from the local-government account;
  - decisions follow the `endTick` scan;
  - Task 8 keeps the pace, with step 2b if step 0 calls for it.

`HANDOFF.md` holds the details and the engineers' rulings.

## Open

- **Approved, not started:**
  - M3.2 Task 7;
  - M3.1 Part 4 Task 26, plus the corner tiles' wiring;
  - M3.2 Task 8, which has its step plan.
- **Not approved:** M3.1 Part 4's Tasks 25, 28, 29 and 30, and M3.2's Tasks 10 and 11.
- **Reviews owed:** one Opus `determinism-review` at M3.2's close (Task 11), and one at Part 4's close (Task 30).
- **Follow-ups:**
  - the ring's draw order;
  - wider lanes;
  - `street.spec.ts`'s deadline;
  - the bridge choke point;
  - dense sites;
  - the card's portrait scale;
  - more chats, with `NEAR_Q8`.
- **Backlog:**
  - a street `warmUp`;
  - the street snapshot row over budget at 10k and up;
  - the HUD wrapping away from Highcourt;
  - keeper election under a chunked step;
  - a worker split before launch;
  - the shared plan doc's sync (M3.1 Parts 3 and 4, M3.2's drops, the 40 KB budget).
- **perf.yml** hasn't run since the economy joined the step.

## Next

1. When the owner resumes, ask before starting anything, with a short plan.
2. The approved queue runs in this order, since each moves Highcourt's pins:
   1. Task 7;
   2. Task 26 with the corner tiles;
   3. Task 8, by its step plan;
   4. a pre-push browser round, and a push, after each.
3. **Uncommitted state:** none.
