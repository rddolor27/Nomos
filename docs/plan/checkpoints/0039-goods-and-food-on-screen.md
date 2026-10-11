---
checkpoint: 39
date: 2026-10-11
milestone: M2.4
status: paused
based_on: 5f191c6
next: Close M2.4 Part 1 (Task 7 in docs/plan/tasks/m2-economy/m2.4-goods-and-food/plan.md), then M2.2c (docs/plan/tasks/m2-economy/m2.2c-every-town-live/plan.md), which the owner has approved
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0039: goods and food on screen

## State

M2.4 Part 1's Tasks 1–6 are built and pushed.
- **The city:** `CITY` runs seven goods, bread, vegetables, fish and milk among them, and blobs buy and eat 3 portions a day.
- **The panel:** a goods table, food eaten, spoiled and unmet, sales by good, and trades like "2 bread at Bakery 12".
- **The blob card:** it shows job, pay, home, household, what the blob is doing, and its look.
- **Hashes:** `746a06a3` and the economy `6a652730` held. `town` is `1621b72b`, and Highcourt's pins are `4b1a37d3` and `49f7323c`.

## Decisions

- **Owner, 11 October 2026:** build M2.2c right after M2.4 Part 1, with Highcourt as each world's capital, and away towns that keep living in summary form.
- **Coordinator:** milk is the seventh good, and thin byte limits go to the measure plus about 1 kB.

## Open

- **CI and perf.yml:** CI results go unread under the git-only rule, and perf.yml hasn't run since the economy joined the step.
- **M2.4 Part 1's close:** the 50-seed confirmation, one Opus `economy-review`, `tools/cli/grids/design.json`'s stale warm-up, and Tasks 5–6's `interfaces.md` lines, listed in `HANDOFF.md`'s log.
- **Every card says "Lives with: No one"** until M2.2c's households of 1–6 fill real homes.

## Next

1. **Close M2.4 Part 1 (Task 7):**
   - write Tasks 5–6's `interfaces.md` lines;
   - fix `design.json`'s warm-up;
   - run `ECONOMY_LONG=1 nice -n 19 pnpm vitest run tools/cli/test/city-targets.test.ts` and write its table into `task.md`;
   - one Opus `economy-review` over 24981a8..dba1b48, then fill in the milestone row.
2. **Start M2.2c:**
   - an Opus pass on how away towns advance in summary form (the brief's status note);
   - then Tasks 1–2: the ground port, and one blob per bed in Highcourt's drawn houses.
