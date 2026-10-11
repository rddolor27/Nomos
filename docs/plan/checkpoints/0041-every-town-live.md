---
checkpoint: 41
date: 2026-10-11
milestone: M2.2c
status: done
based_on: 88cfc51
next: M2.7 Part 1's code, from Task 2 (premises in the layout) in docs/plan/tasks/m2-economy/m2.7-street-link-and-the-112-day-year/plan.md
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0041: every town runs the sim

## State

M2.4 Part 1 and M2.2c are done and pushed.
- **Live towns:** every town opened from the map runs live from its own ledger row, one blob per bed in households of 1–6, and away towns live on in summary months.
- **The panel and the card:** goods and food show on the panel, and the blob card refreshes every second.
- **M2.7 Part 1** (life on the street) is briefed, its mockups are picked and its sprites drawn (bc8659b..7b6a0bc). Its code waits.

## Decisions

- **Owner, 11 October 2026:** every town live first, then M2.7's street. Nights pass at 8×, the blob card updates live, and the fish stall's fold is a darker blue.
- **Coordinator:**
  - Okun counts all output;
  - the burn-in is 31,883 days, from MSER-5 over 80,000 days;
  - a mid-month spawn funds the month so far;
  - away towns drift toward a live town's mean, with a bias-corrected fit;
  - a switch that can't seat the town is refused before any fold.

## Open

- **CI and perf.yml:** CI results go unread under the git-only rule, and perf.yml hasn't run since the economy joined the step.
- **Backlog** (in `HANDOFF.md`): the orphaned `shared/steering.ts`, a walk test for generated places, and the HUD wrapping while away below about 1,500 px.
- **The owner's phone tunnel:** a Cloudflare quick tunnel from `dist/cloudflared/` to port 4175, which serves `dist/phone-preview`, may still run. Stop both when the owner is done.

## Next

1. **M2.7 Part 1, Task 2,** premises in the layout:
   - `placeTrades` with several buildings per trade (owner);
   - Task 7's sprite swap;
   - the place goldens and `town.nmap` regenerated once.
2. **The rest of M2.7 Part 1:**
   - Tasks 3–5: fields, errands and the visual word;
   - Task 6: drawing, enabling the held-back `hold` and `eat` manifest fields (`HANDOFF.md` has the recipe);
   - nights at 8×;
   - Task 8: pips and the card's "Bought" line;
   - Task 9: the close, with an Opus determinism review.
