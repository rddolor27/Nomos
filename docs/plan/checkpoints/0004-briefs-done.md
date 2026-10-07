---
checkpoint: 4
date: 2026-10-08
milestone: planning
status: in progress
based_on: 90dc85c
next: finish the M0 step plans (M0.3, M0.5, M0.6), then fact-check the briefs
waiting_on: [owner review of the M0 plans]
---

# Checkpoint 0004: every brief written, M0 plans half done

## State

Planning continues; there is still no product code. This checkpoint was written in a hurry, with the owner's usage nearly spent, so it lists what is unfinished in detail.

| Plans | State |
| --- | --- |
| M0.1, M0.2 and M0.4 step plans | Committed. M0.2 and M0.4 were written by agents and committed without a full review |
| M0.3 and M0.5 step plans | Two agents were still writing them when this was written; they may appear as untracked files |
| M0.6 step plan | Not started |
| M1–M9 briefs (61) | All committed, from 1abf8fa to 5a16f04, one commit per milestone |

## Done since checkpoint 0003

- **Briefs for M4–M9:** bd1093f, b2b7914, 4238afb, 998fb98, fcad7f7 and 5a16f04. Every `milestone.md` lead now says each sub-milestone has a brief, except M0's, which still says only M0.1 has a plan.
- **Step plans:** M0.2 (d5d80f4) and M0.4 (6c16ee6), linked in the roadmap (90dc85c).
- **Checks:** every relative link in `docs/plan/tasks/` resolves, and package names agree across all plans.

## Decisions

The rulings in checkpoint 0003 stand. The M4–M9 briefs add:
- **More packages:**
  - `sim-country` (M7.1);
  - `sim-wasm`, a Rust crate built to WASM SIMD (M6.2);
  - `tools/emulator`, `tools/audit` and `tools/sweeps`, in Python and TypeScript.
- **Guarded folders:** crime code, including jail and recidivism, stays in `crime/`, so the guarded list is exactly `crime/`, `police/`, `labour/`, `wages/`, `wealth/`, `ability/`, `housing/` and `migration/`.
- **Every guarded decision registers itself** with M4.1's registry, which the flip test reads.
- **Detached city runs** reuse M5.1's branch machinery (M8.5).

The M0.2 and M0.4 agents' reports were not received before usage ran low. Their interface refinements, rulings and open questions are therefore only in the plan files.

## Open

- **Owner review** of the M0.1, M0.2 and M0.4 plans.
- **Fact-check of the 61 briefs:** not done. Spot checks found four errors while they were written (fixed), so more are likely. The owner asked for this check.
- **`interfaces.md` refinements:**
  - compare the M0.2–M0.5 plans with `docs/plan/tasks/m0-pipeline/interfaces.md`, and merge any changed name or layout;
  - several briefs also refine it: lab `init`, the M1.2 messages, the `events` buffer, `patchTiles`, 16-bit positions, `fork`, `branch` and `progress`.
- **Still open from 0003:** the 25 owner decisions plus the repository licence, the values needing sign-off, the shared-doc fixes and the items carried from 0001.
- **Unpushed:** 57 commits since `origin/main` (09440c8). Pushing waits for the owner.

## Next

1. **Collect the remaining M0 plans:**
   - run `git status`;
   - if `m0.3-loop-and-protocol/plan.md` or `m0.5-web-app/plan.md` is untracked, check that it ends with its close task, then commit it on its own;
   - if either is missing, write it with the writing-plans skill from its `task.md` and `interfaces.md`.
2. **Reconcile interfaces:** read each M0 plan's Interfaces blocks against `interfaces.md`, and update it in one commit.
3. **Write the M0.6 step plan.** It uses:
   - M0.3's world step and system timing names;
   - the guarded folders above, for the dependency-cruiser `reachable` rule and the ESLint profile;
   - R8's banned column names: `culture`, `birthCulture`, `customs`, `homeRegion`, `festivalToday` and `nameKey`;
   - a stand-in `consumption/` file;
   - the name lint on file names, package names, code and strings, but not Markdown;
   - fixtures named without the franchise name, with licence files for third-party lists;
   - the kernel vectors and seed 42's replay hash in Bun and in Playwright's three browsers;
   - the budget, allocation, determinism and size gates, with the day-slice row;
   - size-limit and the startup benchmark, recording `/proc/loadavg`.

   Sources: [R5 CI drafts](../../research/round-5-performance/prototypes/load/ci/), the [R5 lint prototype](../../research/round-5-performance/prototypes/compute/lint/eslint.config.mjs), and [R8 customs notes](../../research/round-8-cultures/notes/customs-preferences.md), part d.
4. Update the lead of `m0-pipeline/milestone.md`.
5. **Fact-check the 61 briefs** with two `fact-checker` agents, one for M1–M4 and one for M5–M9. They check every figure against `task.md` or the cited source, every cited section, and cross-brief names, and fix errors in place. Commit their fixes per milestone.
6. Write checkpoint 0005.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: 11 known weak matches, 10 in M0 and 1 in M6.
- `git log --oneline origin/main..main`: the unpushed commits.
