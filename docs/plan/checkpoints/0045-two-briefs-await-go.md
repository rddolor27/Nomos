---
checkpoint: 45
date: 2026-10-12
milestone: planning
status: paused
based_on: a1a365c
next: ask the owner which goes first, M3.2's Tasks 1-6 (docs/plan/tasks/m3-city-life/m3.2-daily-routines/plan.md) or M3.1 Part 4's Task 22 (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md), with M2.7 Part 1's Opus determinism review beside it
waiting_on: [the owner's go for M3.2 or M3.1 Part 4, perf.yml started once by the owner]
---

# Checkpoint 0045: two briefs await a go

## State

M2.7 Part 1 is built and pushed, but its Opus review hasn't run. On 12 October the owner asked for four additions, all plan only. Each is now in its milestone's plan, and none is built:
- the house card, then the interior view (M3.6);
- trading of both kinds (M3.5);
- varied town layouts with walls (M3.1 Part 4, 67a794b);
- blobs with lives of their own (M3.2, 8aafff7).

No hash has moved since checkpoint 0044: `42/phone` is `746a06a3` and the economy `6a652730`.

## Decisions

- **Owner, 12 October 2026, all plan only:**
  - the house card, then the interior view;
  - trading of both kinds;
  - a mix of town styles drawn per town, with the walled towns folded in;
  - needs and wants with a keyed personality, four kinds of activity, and the economy still deciding purchases.
- **Sim-architect, M3.1 Part 4:**
  - rings, winding lanes or a grid, dealt 2:1:1;
  - octagon walls;
  - Highcourt pinned as rings;
  - `connect` gives every door a way to the plaza;
  - `MAX_RUNS` goes to 32.
- **Sim-architect, M3.2:**
  - needs change only when a blob's state changes;
  - a blob decides when each activity ends;
  - chats go through a per-cell mailbox;
  - six friend slots a blob.
- **Coordinator:**
  - keep the walking pace until the owner sees the evenings;
  - the household is the family until M5;
  - soldiers are paid from the local-government account;
  - decisions follow the `endTick` scan, with a timing wheel only if a gate fails (`sim-core.md` updated).

## Open

- **The review:** M2.7 Part 1's Opus `determinism-review` (checkpoint 0044's Next, step 1) hasn't run.
- **perf.yml** hasn't run since the economy joined the step.
- **The shared plan doc** needs the owner at the next sync, for M3.1 Parts 3 and 4 and M3.2's drops.
- **Art previews** go to the owner first: M3.1 Part 4's diagonal walls and optional road corners, and M3.2's speech, music and ball bubbles.
- **Backlog:** as in checkpoint 0044, except that the cut-off homes move to M3.1 Part 4's Task 23.

## Next

1. Ask the owner which goes first, M3.2's Tasks 1–6 or M3.1 Part 4's Task 22. Both move Highcourt's pins, so their sim tasks run one after the other, and the art previews can run beside either.
2. Run M2.7 Part 1's review beside the first build, since both briefs build on its street code.
3. Checkpoint at launch, then log and push after each landed task.
