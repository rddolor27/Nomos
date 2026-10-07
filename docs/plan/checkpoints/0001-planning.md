---
checkpoint: 1
date: 2026-10-07
milestone: planning
status: paused
based_on: f64d5a8
next: Finish the M1–M9 breakdowns in docs/plan/tasks/, then M0.1 (docs/plan/tasks/2026-10-07-m0-1-kernels.md)
waiting_on: [owner review of the M0.1 plan]
---

# Checkpoint 0001: planning

## State

Nomos is still in planning, and no product code exists yet. The plan, the art, the sounds and a Python reference world generator are done. M0 is split into six sub-milestones with a step-by-step plan for M0.1, and the M1–M9 breakdowns were being drafted when this checkpoint was written.

## Done since the last checkpoint

This is the first checkpoint, so it covers everything so far.

- **Plan:** `docs/plan/implementation-plan.md`, exported from the shared plan doc (https://claude.ai/code/artifact/599c64c6-a677-4b0e-8fb7-1b4c799dc152). It holds milestones M0–M9 with about 448 open tasks. The owner's plans are `sound.md`, `military.md`, `calendar.md` and `gazette.md` in `docs/plan/`.
- **Research:** rounds 1–9 in `docs/research/`, all done except round 7 (one million agents), which is paused.
- **M0 breakdown:** `docs/plan/tasks/2026-10-07-m0-pipeline.md` splits M0 into M0.1–M0.6, 18–27 days by hand. `docs/plan/tasks/2026-10-07-m0-1-kernels.md` is the step-by-step plan for M0.1.
- **Art:** `tools/sprites` draws 1,342 sprites in 13 sheets into `assets/sprites`, including the seasons sheet, snow overlays and `season_map.json`.
- **Sound:** `tools/sounds` builds 94 sounds in 7 banks into `assets/sounds`.
- **World generator:** `tools/worldgen` makes random countries and places in Python. It is the reference for the TypeScript port, and it draws any place in all four seasons.
- **Git:** `origin/main` is at 09440c8. Two later commits, b86aade and f64d5a8 (the M0 plans), are local only.

## Decisions

Owner decisions from 5–7 October 2026:
- **Watch-only.** Nobody is controlled during a run. The world and policies are set before Run, and a different policy forks a branch.
- **Time.** One tick is one in-game minute: 1,440 ticks a day at 10 ticks a second at 1×. A year is 112 days of four 28-day seasons, and a week is 5 workdays plus 2 rest days. Ages are real.
- **Military.** Soldiers defend and patrol roads and never police towns. Weapons stay sheathed or shouldered, with no guns or flags.
- **Gazette.** One paper per town, plus a national paper in country mode.
- **Launch.** Launch comes after M8, so M9 follows it. A full player world editor ships before launch.
- **People.** Cultures are fictional and learned. Every person has one of 96 random looks, never inherited. The content rules are in `tools/sprites/README.md`.
- **Who builds.** Claude Code is the orchestrator and planner; the owner does not code by hand. The plan's estimates are full-time days for one person by hand, and M0.1's Actual time will calibrate Claude Code's pace.
- **Git.** Commit straight to `main` with header-only messages under the owner's no-reply address. Push only when the owner asks.

## Open

- **Waiting for review:** the owner has not yet reviewed the M0.1 plan, and nothing is built until they do.
- **M1–M9 breakdowns:** five agents started drafting `docs/plan/tasks/2026-10-07-m1-lab-mode.md` through `2026-10-07-m9-zoom-across-scales.md` on 7 October 2026. None existed when this checkpoint was written. Any that exist now are unchecked and uncommitted.
- **Owner decisions pending:**
  - how late spoilage may land under sliced day work, which blocks M0.3's slice task (round 6);
  - whether the gazette's true view shows a note counting unrecorded crimes;
  - whether the year-in-review card pauses the run;
  - what counts as a border when placing forts;
  - how eight cultures share four festival music styles;
  - whether the synth renders at 22,050 Hz or at the browser's rate;
  - the licence for code and art (none yet; the plan assumes MIT for code).
- **Known gaps:** shore tiles and landmarks get no snow, and sea cliffs form only on south coasts. With the synth, the audio passes its 20 KB chunk budget, so music should load on its own.

## Next

1. Check each M1–M9 breakdown in `docs/plan/tasks/`: every build task and exit check of its milestone in exactly one sub-milestone, every verify-first row in place. Fill gaps, re-draft any missing file from the M0 breakdown as the template, and commit one file per commit (`docs(plan): split M<N> into sub-milestones`).
2. Write `docs/plan/tasks/2026-10-07-roadmap.md` listing every sub-milestone with its estimate and progress columns, and add checkpoint 0002.
3. After the owner reviews the M0.1 plan, build M0.1 with the executing-plans skill, and record Started, Done and Actual.

## How to verify

- `python tools/sprites/test_sprites.py`: every sheet reports ok.
- `python tools/sounds/test_sounds.py`: every bank passes.
- `python tools/worldgen/generate.py --seed 09f02ffe`: writes the maps, places and `capital-0_seasons.png` to `dist/worldgen/09f02ffe/`.
- `git log --oneline origin/main..main`: lists the local commits not yet pushed.
