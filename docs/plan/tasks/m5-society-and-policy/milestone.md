# M5 Society and policy: sub-milestones

M5 holds 34 build tasks and 9 exit checks in the [implementation plan](../../implementation-plan.md#m5-society-and-policy), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0–M4 can rescale them. The plan's M5 effort line, about 2 weeks plus 1–2 days for the visual layer, covers rounds 1 and 3 only. The owner's plans add 3–6 days for the calendar, 1–2 for the defence budget and 1 for the gazette. The 25 tasks from rounds 2, 4, 6, 8 and 9 carry no estimate of their own. The plan's own figures sum to 16–21 days, and this breakdown to 36–56.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M5.1 Policies, budget and branches](m5.1-policies-budget-and-branches/task.md) | The treasury and policy settings with predicted sizes, set before Run, where a change forks a branch | 6–9 days | | | |
| [M5.2 Ageing and social ties](m5.2-ageing-and-social-ties/task.md) | Real ages, friends, rumours and fear, and culture-blind housing moves and partners | 6–9 days | | | |
| [M5.3 Wealth and resources](m5.3-wealth-and-resources/task.md) | Wealth and resource policies, development and wealth presets, and harvest shocks | 8–12 days | | | |
| [M5.4 Wellbeing and fear on screen](m5.4-wellbeing-and-fear-on-screen/task.md) | Life satisfaction tied to policy, and opt-in lenses and meters that never mark a person | 4–7 days | | | |
| [M5.5 Culture lens and audits](m5.5-culture-lens-and-audits/task.md) | The opt-in culture and exposure lenses, and the appearance audits extended to wealth, culture and looks | 7–11 days | | | |
| [M5.6 Calibration sweeps](m5.6-calibration-sweeps/task.md) | Sensitivity analysis over every policy and city size, logged for the country emulator | 3–5 days | | | |
| [M5.7 Year in review](m5.7-year-in-review/task.md) | The year-end card and gazette edition, and the follow-the-news camera | 2–3 days | | | |
| **Total** | | **36–56 days** | | | |

Three points apply throughout:
- **Policies are settings, not live sliders.** The owner made Nomos watch-only: every policy is set before Run, and a change during a run forks a labelled branch at the next day boundary (Calendar). Round 1's "policy sliders" are these settings.
- **Nothing marks a person.** Wealth, fear, mood and culture show only through places, overlays and opt-in lenses, never through how an agent looks (R3, R6, R8).
- **The model before the lenses.** M5.1–M5.3 build the policies and their effects; M5.4–M5.5 show them and prove nothing leaks into appearance.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
