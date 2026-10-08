---
checkpoint: 6
date: 2026-10-08
milestone: planning
status: done
based_on: 41d9c7d
next: owner review of the M0 plans, then build M0.1
waiting_on: [owner review of the M0 plans, owner answers to checkpoint 0005's open questions]
---

# Checkpoint 0006: day and night in M1, weather in M10

## State

The owner added time of day and weather on 8 October 2026. Day and night now arrive with M1's lab mode, and weather is a new last milestone, M10, after launch. There is still no product code, and the M0 plans are unchanged.

## Done since checkpoint 0005

- **Plan tools** (9291634, ceb03c2): `roadmap.py` and `check_coverage.py` accept two-digit milestones, so M10 enters the roadmap and the coverage check. The roadmap's launch line matches the plan's.
- **Shared doc**, edited with the owner's go-ahead and exported in 430cef8, f88c83b and d286a3e:
  - **Time & calendar** gained a "Time of day" section: five light periods from the sunrise table, a ground tint that never touches people, fades of at least 2 s, a tint-off toggle and the period in the HUD date. M1's calendar work grows by 1–1.5 days, to about 12–19 days in all.
  - **Weather** is a new tab with the tag (Weather): six kinds in wet and dry spells by season and biome, how they look and sound, and the open choice of whether they change daily life, in about 16–27 days.
  - **Implementation plan:**
    - M1 gains the light-period item and its exit check, and its HUD date shows the period;
    - M3's light item now extends M1's, with a new exit check for lit windows and lamps;
    - a new M10 section holds 9 build tasks and 6 exit checks;
    - it also gains the (Weather) tag, a roadmap note, a verify-first row for research round 10, and launch at about 211–324 days.
- **Task breakdowns** (a2ad9a8, 6b3c6c2):
  - M1.2 builds the light periods and the HUD period, now 6–10.5 days. M1.3 holds the six body hues to 3:1 in every period, and takes over the night-outline measure from M3.3. M3.3 adds buildings, lit windows and lamps to M1.2's light.
  - The new `m10-weather/` folder has four sub-milestones with briefs: M10.1 Weather in the sim (3–5 days), M10.2 on screen and in sound (7–11), M10.3 in daily life (4–7) and M10.4 across the country (2–4).
- **READMEs** (905ce3a, 41d9c7d): eleven milestones and 71 sub-milestones, a day-and-night feature line, M10 after launch, and the weather plan in the docs index.

## Decisions

The owner's, on 8 October 2026:
- Time of day starts in M1 with lab mode, not M0, so the finished M0 plans stay untouched.
- Weather is a new milestone, M10, after M9 and so after launch.
- The shared doc could be edited for both, then exported.

Agent rulings, recorded in the plans; the owner can overturn any of them:
- **Five light periods,** not round 3's four, because the owner asked for afternoon: dawn, morning, afternoon, dusk and night. Dawn and dusk span 30 minutes either side of sunrise and sunset (a design value), and morning runs to 12:00.
- **The tint keeps round 3's rules:** ground and buildings only, never people, with fades of at least 2 s and a tint-off toggle. All of it now arrives in M1, not M3.
- **No sim rule reads the light** yet. Whether darkness should lower witnessing in M4 is an open question in the calendar plan.
- **The renderer reads the period from the snapshot's tick,** so no worker message changes. M1.2's step plan adds `WorldRenderer.setTint(on)` and records it in `interfaces.md`.
- **Lab-day phases take the periods** if lab days stay discrete: morning stock in the morning, contests and trade in the afternoon, the walk home at dusk and the settlement at night.
- **Weather belongs to places:** one chain per region per day on `draw(seed, WEATHER, region, day)`, written at the day boundary. No crime, police or reporting code may read it.
- **M10.4's exit check** comes from its build task, since the plan gives it none.

## Open

New questions for the owner. The first four are in the roadmap's owner-decisions table:
1. **M10.3:** does weather change what people do, or only how the world looks and sounds? Suggested: it changes routines.
2. **M10.1:** when does research round 10 run? Suggested: before M3.5's step plan, so the harvest draw and the weather share one design.
3. **M10.1:** does the daily weather fit M3.5's harvest draw as it is, or does each run's version pick the rule? Suggested: fit.
4. **M10.2:** does snow cover follow snowfall? Suggested: keep the winter schedule, and add fresh snow on snowfall days.
5. **M1.2:** approve the five tint colours on a mockup before building? Suggested: yes.

Still open from checkpoint 0005:
- the owner review of the M0 plans and its nine questions;
- the 25 earlier roadmap decisions and the repository licence;
- fact-checking the briefs, now 65 with M10's four.

Known gaps:
- the lamp post, `prop_lamp-post`, has no lit overlay; M3.3's brief asks for one;
- the roadmap drawing in the doc still shows ten milestones, and a note under it names M10;
- no weather art or sounds exist yet.

## Next

1. **Owner review:** the M0 plans and checkpoint 0005's questions, then build M0.1, as before. Nothing in this checkpoint blocks M0.
2. The new questions are needed only before M1.2 (the tint colours), M3.5 (when round 10 runs) and M10.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes. It prints 11 milestones and 29 owner decisions.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: 11 known weak matches, 10 in M0 and 1 in M6, and none in M1, M3 or M10.
- Every relative link in `docs/plan/tasks/` resolves (155 files at this checkpoint).
