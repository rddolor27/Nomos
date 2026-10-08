---
checkpoint: 7
date: 2026-10-08
milestone: planning
status: done
based_on: 1166420
next: owner review of the M0 plans, then build M0.1
waiting_on: [owner review of the M0 plans, owner answers to checkpoint 0005's open questions]
---

# Checkpoint 0007: briefs fact-checked, plan doc aligned

## State

Four fact-checker agents checked all 65 briefs for M1–M10 and fixed about 50 errors. The shared plan doc, now named "Nomos — Research & Build Plan", matches the repo again. There is still no product code.

## Done since checkpoint 0006

- **Fact-check** (25e8f1b, 98b0c6a, fe5f3b6, 7e2d709, 1ec6b46). Each agent checked a milestone group's task and plan files against `implementation-plan.md`, `interfaces.md`, the owner plans and the research, then fixed errors in place. The main finds:
  - **M1–M2:** M1.5 relied on a service worker from M0.5, but M6.2 builds it. M2.6's `Int16` shift rows overflow at ±250,000 ppm, so they are now `Int32`. M2.7 applied the hazard formula to interest. "Spring 12 … rest day" cannot happen, because day 12 of every season is a workday. Sit has three views and sneak two.
  - **M3–M4:** M3.3 reinvented M0.4's `autoSkin` and named the wrong atlas tool. M3.5 gained the missed-meals record that M3.6 and M4.3 cite. M3.6's scarring penalty was misread.
  - **M5, M6 and M10:** fitting M10's weather to M3.5's harvest does not spare old links their version. M5.3 cited a regrowth model that M3.5 does not build. M6.7's history resolutions were wrong.
  - **M7–M9:** five country files moved inside the culture wall's folders. M7.5's life-satisfaction units, M8.1's porting traps and M8.3's missing garrison icon were fixed or raised.
  - **Follow-ups from the agents' notes:** 37 edits in 25 files. M3.8 now builds the record store and M7.7 the route ledgers. M4.2 asks the owner whether darkness lowers witnessing, and M1.3, M1.5, M2.6, M4.5, M5.3, M7.1, M7.3, M7.4 and M10 carry new design questions.
- **Shared doc aligned** (a06f648, 67d0c07, f10355c, 24e09b0):
  - renamed from "Civilization Simulation" to "Nomos — Research & Build Plan";
  - the roadmap drawing redrawn with eleven milestones, launch after M8, M9 and M10 dashed, and the breakdowns' estimates in days (`docs/plan/images/roadmap.png`);
  - checkpoint 0002's six pending doc fixes made: M6's context record without walls or a generator-version seed, M8's routes without the Delaunay step, the "leaves out" page's one blob body and random looks, M7's route ledgers, M5's year-end culture clause and M3's record store;
  - the four values awaiting sign-off adopted as drawn: the 18×22 blob sheet with six faces and job items, 12×12 bubbles (ticked as done), the 64-colour palette and the 20,000-day test;
  - errors found in the exports, now fixed: "rest day" made "workday" in the calendar and M1, Godley–Lavoie's 38.44 made 38.46, the stale emblem branch note removed, M4's wrongful-stop priority clause restored, the gazette's "dawn (06:00)" made 06:00, and the Weather tab's replay promise corrected.

## Decisions

The owner's, on 8 October 2026:
- the doc is renamed to Nomos;
- Claude decides the four values that checkpoint 0002 left for sign-off.

Agent rulings, recorded in the plans; the owner can overturn any of them:
- **The four values follow the drawn art.** It already exists, and M0's `JOB_ITEMS` already uses the job items. The six faces cover every lab rule (angry, happy, wince), so M1 draws no surprise or sad face.
- **The gazette prints at a fixed 06:00,** as `gazette.md` said, not at the light period's dawn, which now moves with the season.
- **The roadmap drawing shows the breakdowns' estimates** in days, not round 1's weeks.
- **Old links replay through their version** under either harvest design, as the Weather tab now says.

## Open

Design questions, each needed before the step plan named:
1. Where the TypeScript generator lives. M0.6's lints cover `packages/sim-*/src/worldgen/**`, but M3.1, M3.4, M6, M8 and M9 name `packages/worldgen`. Also, whether generator code may sort, since `place.py` sorts four times. Needed before M0.6.
2. Whether the culture wall guards all of `packages/sim-country/src/**` (M7.1).
3. A geographic region column in M7.3's store, and M7.4's regional weather keyed on (region, year), both for M10.
4. M4.5's exposure counters in every build, by district and hour, with one meaning of night.
5. Fishing and logging limits in City mode before M7.4 has stocks (M5.3).

Owner questions:
- M4.2: does darkness lower the chance that a crime is witnessed? It is in the roadmap's owner-decisions table, now 30 rows.
- M1.5: may the public lab ship without offline play?
- M8.3: does a garrison need its own map icon?
- `military.md` says the soldier job needs "M2 wages and taxes", but taxes arrive in M5; M3.2 already asks.

Source items:
- Round 9's place counts (40–61 standard, 182–237 large) came from 10 and 3 seeds before its generator fixes. Today's generator gives 37–54 (seeds 1–12) and 152–215 (seeds 1–4), and the README still quotes 40–61.
- Round 9's capital range, 150,000–500,000, is the draw before jitter; the real range is 112,500–625,000.

Other open items:
- The artifact list may still show the doc's first title, "Dot Society Simulation"; the doc itself is renamed.
- This round's nine commits (a06f648 to 1ec6b46) were made in the same minute as the owner's new `Task:` line rule (af3a223), so they have no body. Adding one needs a history rewrite, which the owner must approve.
- Still open from checkpoints 0005 and 0006: the owner review of the M0 plans and its nine questions, the earlier roadmap decisions, the repository licence, and 0006's five questions.

## Next

1. **Owner review** of the M0 plans and checkpoint 0005's questions, then build M0.1. Nothing in this checkpoint blocks M0.
2. Settle design question 1 before M0.6 builds the generator lint.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes. It prints 11 milestones and 30 owner decisions.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: 11 known weak matches, 10 in M0 and 1 in M6.
- Every relative link in `docs/plan/tasks/` resolves (155 files at this checkpoint).
