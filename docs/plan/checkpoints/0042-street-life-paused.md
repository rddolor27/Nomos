---
checkpoint: 42
date: 2026-10-11
milestone: M2.7
status: paused
based_on: 10aaa95
next: M2.7 Part 1, Task 4's last steps, then Tasks 5–6, then fast nights, pips, the card's "Bought" line and Task 9 (docs/plan/tasks/m2-economy/m2.7-street-link-and-the-112-day-year/plan.md)
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0042: life on the street, paused for the owner's GPU change

## State

- **Done and pushed, 10–11 October:**
  - M2.3;
  - M2.2b, the economy on screen;
  - M0.8, the UI look;
  - M8.1's place names, with world generator version 1 frozen;
  - M2.4 Part 1, goods and food;
  - the blob modal;
  - M2.2c, every town runs the sim.
- **M2.7 Part 1** (life on the street) has its brief, the owner's mockup picks and final sprites. Task 2 (premises) and Task 3 (fields and runs) are done.
- **Task 4** (errands) is committed but not yet on screen (093cd98, 1ae12d6): the street engine walks 8,220 trips on 3 Highcourt days, correctly.
- **Task 5** has started: the visual word's bits and the seam (483176d).
- **The tree is clean.** There is no stash and no half-edited file.
- **Hashes:** `42/phone` `746a06a3`, the economy `6a652730`, `town` `8f1f75bb`, `switch` `cc4584e8` and `visit` `a7bd4005`. Highcourt's pins are `498f12cb` and `4bf399fa`: 2,600 blobs in 375 homes, with 22 premises.

## Decisions

- **Owner, 11 October 2026:**
  - ask before each new step;
  - every town live, with one blob per bed;
  - life on the street: nights at 8×, several buildings per trade, household stalls in M3.5, the mockup picks, the live blob card and the fish stall's darker blue;
  - up to four agents at once;
  - git only, with no `gh` and no CI reading;
  - pause after this implementation.
- **Coordinator:**
  - 2,600 blobs, since premises take street frontage;
  - diagonal steps cost two;
  - a worker commutes only if the way is 300 ticks or less;
  - trips must be home by 22:00.

## Open

- **CI and perf.yml:** CI results go unread, and perf.yml hasn't run since the economy joined the step.
- **Backlog** (in `HANDOFF.md`'s Open list and log):
  - homes cut off behind rivers in some towns;
  - the orphaned `shared/steering.ts`;
  - no walk test for generated places;
  - the HUD wrapping while away;
  - `?tier=` can't return to Highcourt;
  - the street code starts cold, since `warmUp` has no street town.

## Next

1. **Finish Task 4,** in the order the 11 October log in `HANDOFF.md` gives:
   - `premises.ts` gains `stall`;
   - the worker wiring: `createShops(premisesOf(map))` into `createTown` and `requestTown`, and `streetsAsleep` stepping after `init` and after a switch;
   - `errands.test.ts`;
   - a re-pin of Highcourt on the shops path;
   - timing at 10k;
   - the docs.
2. **Task 5's wiring:** `snapshot/street.ts`'s `indoorsAt`, `itemAt` and `eatingAt` take `(world, blob)` and read the errand store.
3. **Task 6:** the `hold` and `eat` sprite fields, then drawing the item and eating, skipping `indoors`. The drawing agent's steps are in the log. This is when the owner sees blobs carrying bread and eating.
4. **Then the rest:**
   - fast nights (8×) in `loop.ts`;
   - the stock pips (Task 8);
   - the card's "Bought" line;
   - Task 9: push, then an Opus determinism review.
