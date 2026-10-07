---
checkpoint: 3
date: 2026-10-08
milestone: planning
status: in progress
based_on: f3a57d9
next: M0.2–M0.6 step plans, then implementation briefs for M4–M9
waiting_on: [owner review of the M0 plans]
---

# Checkpoint 0003: implementation briefs under way

## State

Planning continues; there is still no product code.
- **Folders:** every milestone has a folder in `docs/plan/tasks/`, and every sub-milestone a folder with `task.md` (what to build and the checks that close it).
- **How to build it:** each folder is getting `plan.md` with one of two kinds of plan:
  - a full step-by-step plan for M0, in the writing-plans format;
  - an implementation brief for M1–M9, which becomes a step plan just before its sub-milestone is built.

| Plans | State |
| --- | --- |
| M0.1 step plan | Committed; waiting on owner review |
| M0.2–M0.5 step plans | Being written; not committed at this checkpoint |
| M0.6 step plan | Not started; it consumes names from the M0.3 plan |
| M1, M2 and M3 briefs (20) | Committed: 1abf8fa, 6ff1afb and f3a57d9 |
| M4–M9 briefs (41) | Not started |

## Done since checkpoint 0002

- **Folders:** `docs/plan/tasks/` was restructured (cb8fa46 and on), and the old dated breakdown files became `milestone.md` and `task.md` files.
  - `tools/plan/roadmap.py` writes the roadmap as `docs/plan/tasks/README.md`, linking each sub-milestone's task and its step plan or brief.
  - `tools/plan/check_coverage.py` reads the folders.
- **The M0 contract:** `docs/plan/tasks/m0-pipeline/interfaces.md` (fd989ce) fixes what M0's sub-milestones share:
  - package names and dependency directions;
  - the world step and `stateHash`;
  - snapshot v1, with the visual word's bit layout;
  - the worker messages, the binary map and `WorldRenderer`.

  Each item has one owning sub-milestone.
- **Briefs:** M1 (5), M2 (7) and M3 (8). Each holds the approach, packages and files, interfaces and data, method and sources with links into the research rounds, tests for each exit check, and risks.

## Decisions

These are rulings made in the briefs, each recorded in its file. The owner can overturn any of them before its sub-milestone is built.

- **Economy code lives in `sim-core` folders.** Round 8's guard covers `labour/`, `wages/`, `wealth/`, `housing/`, `crime/`, `police/`, `migration/` and `ability/`, and only `consumption/` may read culture. M0.6's dependency-cruiser and lint rules must use these folder names.
- **New packages:**
  - `sim-lab` (M1.1);
  - `claims`, for statistics (M1.1);
  - `audio` (M1.4);
  - `worldgen`, the TypeScript port of the generator (M3.1);
  - `gazette` (M3.8).
- **Claims are judged in Node CI** on pinned seeds, and ship as data (`claims.json`). A nightly job re-judges them on fresh seeds.
- **Protocol refinements,** each merged into `interfaces.md` when its sub-milestone gets its step plan:
  - lab mode in `init` (M1.1);
  - `speed`, `skip`, `settings`, `run`, `refused`, `state` and `cap` messages (M1.2);
  - an `events` buffer beside snapshots (M1.3);
  - `WorldRenderer.patchTiles` (M3.4).
- **M3.8 builds a minimal append-only record store,** written only at the day boundary, because no earlier task builds one and the gazette reads only records.
- **Playtest results** go in `docs/playtests/` (M1.5).
- **Proposed defaults** are marked in their briefs:
  - the key mapping for speeds;
  - the port-test tolerances for the synth;
  - the ±2-unit market convergence band;
  - a 22,050 Hz synth rate.

## Open

- **Owner review** of the M0.1 plan, and of M0.2–M0.6 once committed.
- **25 owner decisions,** listed in the roadmap's last section. The first is how late spoilage may land in sliced day work, before M0.3.
- **New owner decisions raised by the briefs:**
  - the repository licence, which must be chosen before anything is public (M1.5);
  - the soldiers' stopgap payer until M5's treasury (M3.2, already in the roadmap).
- **Still open from 0002:**
  - the values that need sign-off;
  - the shared-doc fixes, which need the doc's owning account;
  - the items carried from 0001.
- **Unpushed commits:** 47 commits since `origin/main` (09440c8). Pushing waits for the owner.

## Next

1. Finish, review and commit the M0.2–M0.5 step plans, one commit each, and merge any `interfaces.md` refinements they report.
2. Write the M0.6 step plan, using the M0.3 plan's names and the guarded folders above.
3. Update the lead of `m0-pipeline/milestone.md`, which still says only M0.1 has a plan.
4. Write the briefs for M4–M9, as for M1–M3: one commit per milestone, updating each `milestone.md` lead and regenerating the roadmap.
5. Write checkpoint 0004 when the briefs are done.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: the roadmap regenerates with no changes.
- `python tools/plan/check_coverage.py`: every milestone reports its plan items. The weak matches are the 11 known merged items: 10 in M0 and 1 in M6. On a Windows console, set `PYTHONIOENCODING=utf-8` first, or printing "χ" fails.
- Check every relative link in `docs/plan/tasks/`: none is broken.
- `git log --oneline origin/main..main`: lists the unpushed commits.
