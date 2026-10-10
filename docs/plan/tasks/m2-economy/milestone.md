# M2 Economy: sub-milestones

M2 holds 30 build tasks and 12 exit checks in the [implementation plan](../../implementation-plan.md#m2-economy), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes. M2.1 and M2.2 were built before M1.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0 and M1 can rescale them. The plan's M2 effort line, 2–3 weeks plus 1–2 days for the visual layer, covers rounds 1 and 3 only. Round 4 adds 2–3 days and the Calendar tab 1–2 days. Rounds 2, 6 and 8 added 24 tasks with no estimate, which explain most of the gap between that line and the total here.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M2.1 Lengnick core](m2.1-lengnick-core/task.md) | Lengnick's households and firms in fixed and fiat money, passing the known-answer tests | 7–10 days | 10 Oct 2026, 04:08 (step plan committed) | 10 Oct 2026, 12:47 | About 250 min of work, 1–4 agents, beside the walled-town round and the shared steering (a usage pause of 4 h 31 min excluded) |
| [M2.2 Spawn and fold](m2.2-spawn-and-fold/task.md) | A city spawned from a ledger record and folded back into it exactly | 2–3.5 days | 10 Oct 2026, 13:38 (step plan committed) | 10 Oct 2026, 15:16 | 98 min of work, 1–3 agents; its one test pass is still to come |
| [M2.3 Calibration and design runner](m2.3-calibration-and-design-runner/task.md) | Two presets that hit the measured economy targets, and a headless design runner | 4–7 days | 10 Oct 2026, 16:07 (step plan committed) | 10 Oct 2026, 22:26 | About 160 min of work in two sittings, 16:07–18:21 and 21:58–22:26, 1–5 agents; the owner's restructure of testing came between them |
| [M2.4 Goods and food](m2.4-goods-and-food/task.md) | Eight sectors, a call auction per good, and dated food lots that balance in portions | 4–6.5 days | | | |
| [M2.5 Household wealth](m2.5-household-wealth/task.md) | Balance sheets, dividends, saving by income quintile, and wealth spawned from the record | 4–6.5 days | | | |
| [M2.6 Culture in the basket](m2.6-culture-in-the-basket/task.md) | Culture that moves food tastes only, at equal cost and independent of wealth | 3–5 days | | | |
| [M2.7 Street link and the 112-day year](m2.7-street-link-and-the-112-day-year/task.md) | Money glyphs, the follow-the-money view, and a final calibration on the 112-day year | 2.5–4.5 days | | | |
| **Total** | | **26.5–43 days** | | | |

Three points apply throughout:
- **Lengnick's clock.** Rounds 1 and 2 counted one tick as one Lengnick day and a month as 21 days. This file therefore reads "20k ticks" as 20,000 sim days, about 179 years of 112 days (computed). At 1,440 ticks a day, 20k ticks would be under 14 days.
- **The 112-day year from the start.** Every rate is written per day or per 112-day year, as the calendar's rescaling rules ask. M2.7 then recalibrates the presets and checks the shares.
- **Checks stay on.** Each exit check joins CI when its sub-milestone closes, so the goods, wealth and culture work must keep M2.3's targets.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
