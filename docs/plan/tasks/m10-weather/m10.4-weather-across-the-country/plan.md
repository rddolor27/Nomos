# M10.4 Weather across the country: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Every region steps its chain in the country day.** M10.1's chain runs per region inside M7's daily step, a few integer operations each, and settlements take their region's weather.
- **One weather at every scale.** The settlement store's weather (M7.4), the map's icon and a zoom into the region (M9) all read the same value, so the sky never changes on zoom.
- **On the map:** a weather map mode, with one icon per region, at its centre in the Country view and over its settlements in the Region view, reusing M10.2's HUD icons.

## Packages and files

- `packages/sim-country/src/weather.ts`: stepping every region's chain in the country day, beside M7.3's region tier.
- `packages/render-gl/src/country/weather.ts`: the map mode and the icons.

## Interfaces and data

- **Region weather:** M10.1's kind and minutes, one record per region per day in M7.3's region tier.

## Method and sources

- **Design:** the [Weather plan](../../../weather.md), "On screen and in sound".
- **Country day budgets:** the Performance budget in the [implementation plan](../../../implementation-plan.md#performance-budget): 1.5 ms a day at 1,000 settlements and 12 ms at 10,000.

## Tests for the exit checks

- `the map matches the zoom`: on every day of 3 seeds × 1 year, each region's map icon, its settlements' ledger weather and the weather in a zoomed-in town agree.
- `the country day stays in budget`: the day-step gate passes at 1,000 and 10,000 settlements with weather on.

## Risks and unknowns

- **No exit check in the plan.** The plan gives this task none, so it closes on the map-matches-zoom test, taken from its build task.
- **Regions step independently,** so a storm never crosses a border. Moving fronts would look better, but cost a spatial pass.

## Open questions

- **Measure:** Does weather fit the country day at 10,000 settlements? Suggested: step per region, never per settlement, and read the cost in M7's gate. Needed before: building.
- **Design:** Should neighbouring regions' weather correlate, as M7.4's brief asks for the harvest? Suggested: share one season-level draw per country, and leave fronts out. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** region stepping in the country day, then the map icons, then the zoom test.
- **Keep it simple:** no moving fronts; any correlation comes through one shared country draw.
- **Hard and easy parts:** the zoom test needs M9's spawn path; the icons are mechanical.
