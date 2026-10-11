---
checkpoint: 44
date: 2026-10-11
milestone: M2.7
status: paused
based_on: 324f4e3
next: M2.7 Part 1, Task 9 - one Opus determinism-review over its sim commits (4918377..HEAD), then its fixes, then mark Part 1 done (docs/plan/tasks/m2-economy/m2.7-street-link-and-the-112-day-year/plan.md)
waiting_on: [perf.yml started once by the owner]
---

# Checkpoint 0044: life on the street, built

## State

M2.7 Part 1 is implemented and pushed. In every live town:
- blobs walk to work and to shops and market stalls;
- a buyer shows a coin bubble at the counter;
- buyers carry the good home at the hip and eat it on the doorstep;
- blobs are indoors from 22:00 to 06:00, and nights pass at 8×.

The town first shows 07:00, its morning rush. Stock pips sit over each premises, and the blob card shows what the blob bought today.

**Hashes:**
- `42/phone` `746a06a3`;
- the economy `6a652730`;
- `town` `8f1f75bb`;
- `switch` `cc4584e8`;
- `visit` `a7bd4005`;
- Highcourt on the shops path, `cca95710` and `a9f09068`.

## Decisions

- **Owner, 11 October 2026:** pause once the implementation lands; spend compute carefully; checkpoint, log and push after every landed piece.
- **Coordinator:**
  - a town opens at 07:00;
  - `EMOTE_COIN` is 1 at `PHASE_BUYING`;
  - pips are per good, since the feed has no per-shop stock;
  - the Opus review runs once, next session, to save compute.

## Open

- **The review:** M2.7 Part 1's one Opus `determinism-review` hasn't run, so Part 1's milestone Done cell waits for it.
- **Unread checks:** perf.yml hasn't run since the economy joined the step (watch the startup gate: worker `init` is now about 100 ms in Node). CI results go unread under the git-only rule.
- **Small follow-ups** (`HANDOFF.md`'s 11 October log):
  - an `emote` case in `town-street.spec.ts`;
  - a "Bought today" assertion in a browser spec;
  - simpler pips (an `over` sprite list).
- **Backlog:**
  - homes cut off behind rivers in some towns;
  - the orphaned `shared/steering.ts`;
  - no walk test for generated places;
  - the HUD wrapping while away;
  - `?tier=` can't return to Highcourt;
  - `warmUp` has no street town, so the street code starts cold.

## Next

1. **Run one Opus `determinism-review`** over M2.7 Part 1's sim commits (`git log 4918377..HEAD -- packages/sim-core/src packages/sim-protocol/src packages/sim-worker/src packages/worldgen/src`). Check replay, the `STREETS` hash rule, mid-trip checkpoints, keyed draws, zero allocation, fairness and the edges. Fix what it finds, re-run the touched tests, and push.
2. **Close Part 1:** fill in M2.7's milestone cells, log it in `HANDOFF.md`, write the next checkpoint, then ask the owner what comes next.
