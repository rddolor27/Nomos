---
checkpoint: 51
date: 2026-10-13
milestone: M3.2
status: paused
based_on: 734e27d
next: M3.2 Task 7 (friends and visits), with the drawing's follow-ups beside it, then the card's Friends row, a pre-push browser round and a push; then M3.1 Part 4 Task 26 with the corner tiles; then M3.2 Task 8 by its step plan (docs/plan/tasks/m3-city-life/m3.2-daily-routines/plan.md)
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0051: friends building

## State

The owner resumed development at 00:05 on 13 October, for the approved queue. Everything up to 4c7e7fa is pushed, and `street.spec.ts`'s deadline moved to 15:00 (734e27d).

Two agents launched at once, on separate files:
- **A `sim-engineer`,** on M3.2 Task 7 (friends and visits): `life/friends.ts`, visits in `choose.ts` and `legs.ts`, and `inspected` gaining friends.
- **A `render-engineer`,** on the drawing's follow-ups: the selection ring's front half drawn after the blobs south of it, and walker lanes widened to ±8 px.

**Pins:** Highcourt's are `9467e0f2` and `6c94faa4`, and the `streets` golden is `0388c8a7`. Task 7 moves them. `42/phone` `746a06a3` and the economy `6a652730` must hold.

## Decisions

- **Owner, 13 October:** resume the approved queue, and commit and update as we go.
- **Coordinator:** the card's Friends row goes to a web engineer after Task 7's `inspected` fields land, and the push follows a browser round.

## Open

See checkpoint 0050's lists. This queue adds nothing new.

## Next

1. **When Task 7 lands:** the card's Friends row (`junior-game-engineer` or `senior-game-engineer`).
2. **Then the pre-push round:** build, size, the browser specs one at a time, and screenshots of a visit and the card's friends. Then push.
3. **Then Task 26,** with the corner tiles (`sim-engineer`, worldgen): regenerate the place goldens before its push.
4. **Then Task 8:** step 0's measurement first, then steps 1–6.
5. **Uncommitted state:** none at launch. Agents commit by path and never push.
