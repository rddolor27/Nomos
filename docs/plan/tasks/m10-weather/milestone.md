# M10 Weather: sub-milestones

M10 holds 9 build tasks and 6 exit checks in the [implementation plan](../../implementation-plan.md#m10-weather), so it runs as four sub-milestones. Each one ends with software that runs and passes its own checks. M10 comes last, after M9 and after launch, as the owner decided on 8 October 2026. The [Weather plan](../../weather.md) gives the design. Each sub-milestone has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in earlier milestones can rescale them. The plan's M10 effort line, 16–27 days, comes from the Weather tab, and this breakdown sums to the same.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M10.1 Weather in the sim](m10.1-weather-in-the-sim/task.md) | Each region's daily weather from keyed draws, in wet and dry spells by season and biome, agreeing with the harvest | 3–5 days | | | |
| [M10.2 Weather on screen and in sound](m10.2-weather-on-screen-and-in-sound/task.md) | Rain, snow, fog, storms and cloud shadows drawn calmly over the light periods, with their art, sounds and HUD icon | 7–11 days | | | |
| [M10.3 Weather in daily life](m10.3-weather-in-daily-life/task.md) | People shelter from rain and storms, if the owner chooses it, with crime changing only through who is out | 4–7 days | | | |
| [M10.4 Weather across the country](m10.4-weather-across-the-country/task.md) | Each region's weather on the country map, the same as a zoom into it shows | 2–4 days | | | |
| **Total** | | **16–27 days** | | | |

Two points apply throughout:
- **Weather replays.** Every value comes from keyed draws at the day boundary, so a seed always brings the same weather, and a share link made before M10 still replays.
- **Weather belongs to places, never to people.** It changes the picture, the sound and, if the owner chooses, where people go. No crime, police or reporting rule reads it, and nothing in it depends on looks, wealth or culture.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
