---
checkpoint: 35
date: 2026-10-10
milestone: M2.3
status: paused
based_on: 10f18b4
next: Fix the 7 failing Chromium browser specs (docs/plan/HANDOFF.md, Open), then M2.3's review fixes (docs/plan/tasks/m2-economy/m2.3-calibration-and-design-runner/plan.md)
waiting_on: []
---

# Checkpoint 0035: lighter testing, shorter rules

## State

The owner's restructure of testing and rules is done (d8c797d to 10f18b4). Every check runs from `pnpm check`, in Node and Chromium only, and it passed here in 349 s; `node tools/cli/src/main.ts --seed 42 --tier phone --ticks 1000` still prints `746a06a3`. M2.3 is still one fix short of closing.

## Decisions

- **Owner:** Bun and Deno are dropped for good, and Firefox and WebKit return before launch.
- **Owner:** each task's code comes first, then its tests, covering the main behaviour and one edge case; `pnpm check` runs once per feature.
- **Owner:** `perf.yml` runs only by hand, the place tests check 2 worlds, and the rules and logs are shorter.
- `docs/plan/HANDOFF.md` holds every ruling in force.

## Open

- 7 Chromium browser specs fail, so CI's browser job stays red; `HANDOFF.md`'s Open list names them. The last green CI run was on b41cad9, and 8e70a4f, the toolbar restyle, came next.
- The unpushed commits, `git log origin/main..main`, wait for the owner's word.
- M2.3's critical bug, its four minor findings and the docs items, as checkpoint 0034 lists them: `git show 6736fb6:docs/plan/checkpoints/0034-economy-calibrated-paused.md`.

## Next

1. Fix the 7 failing browser specs.
2. Push, when the owner says.
3. M2.3's review fixes, which close it, then the economy on screen.
