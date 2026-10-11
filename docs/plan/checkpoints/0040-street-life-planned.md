---
checkpoint: 40
date: 2026-10-11
milestone: M2.4
status: paused
based_on: c4df9ef
next: Close M2.4 Part 1 (Task 7 in docs/plan/tasks/m2-economy/m2.4-goods-and-food/plan.md), then M2.2c, then M2.7 Part 1's code
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0040: life on the street, planned

## State

- **M2.4 Part 1:** Tasks 1–6 are built and pushed. Goods and food show in the panel, and the blob card shows job, pay, home, household, what it's doing, and its look.
- **M2.2c** (every town runs the sim) is briefed and approved.
- **M2.7 Part 1** (life on the street) is briefed (ce0f198): blobs walk to shops, market stalls and work, carry what they bought, and eat at home. The owner picked its mockups (3ec6b1e, d1d8be4).
- **Sprites:** at 11:07 (local time) an asset designer started Task 7's final sprites in `tools/sprites`. Any commits after `based_on` come from it.

## Decisions

- **Owner, 11 October 2026:**
  - M2.2c comes right after M2.4 Part 1, with Highcourt as each world's capital and away towns that keep living in summary form;
  - life on the street becomes M2.7 Part 1, with nights passing faster and several buildings per trade;
  - household stalls come in M3.5;
  - the mockup picks: the front-hip hold, the open-and-shut eating face, stall canopies by good, and bead pips.
- **Coordinator:** both looks of the Draper's and Fuel Store's fronts ship. Task 7's stand-in swap and the place goldens wait for M2.7's Task 2, so they regenerate once.

## Open

- **M2.4 Part 1's close:** the 50-seed confirmation, one Opus `economy-review`, `design.json`'s warm-up, and Tasks 5–6's `interfaces.md` lines, listed in `HANDOFF.md`'s log.
- **Unread checks:** CI results go unread under the git-only rule, and perf.yml hasn't run since the economy joined the step.

## Next

1. **Close M2.4 Part 1**, as checkpoint 0039 lists.
2. **M2.2c:** an Opus pass on how away towns advance, then Tasks 1–2 (the ground port, and one blob per bed in Highcourt's houses).
3. **M2.7 Part 1's code:**
   - Task 2 (premises) after M2.2c's Task 1;
   - Tasks 3–5 after its Task 2;
   - then Tasks 6, 8 and 9.
   - Check `git log` for Task 7's sprites first.
