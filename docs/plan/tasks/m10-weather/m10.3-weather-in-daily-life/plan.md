# M10.3 Weather in daily life: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Built only if the owner chooses routines.** With looks only, this sub-milestone closes with nothing built, and a run is identical in every weather.
- **Weather enters one place: the score of going out.** Rain and storms lower the utility of outdoor leisure, market trips and festivals by an integer factor through `mulPpm`.
  - Work and needs trips still happen, so outdoor hours fall while daily life goes on.
  - Rain and snow slow travel.
- **Never a direct rule.** No crime, police or reporting code reads the weather. Crime can change only because fewer people are outside, as targets, offenders and witnesses, so the gap between true and recorded crime can move. That is the lesson ([Weather plan](../../../weather.md), "In daily life").
- **A bet card,** "Does rain lower crime, or only the record of it?", runs on paired seeds framed by place and weather, never by culture. It reuses M1.2's card shell and M5.5's exposure counters.
- **Festivals thin in bad weather,** but no rule cancels them.

## Packages and files

- `packages/sim-core/src/agents/utility.ts`: the weather factor in M3.2's utility scoring.
- `packages/sim-core/src/movement/`: travel speed by weather.
- `packages/sim-lab/src/cards/rain.ts`: the bet card and its claims.
- `tools/analysis/`: outdoor hours, and true against recorded crime, by weather kind.
- `.dependency-cruiser.cjs`: a rule that keeps crime, police and reporting code from importing the weather module.

## Interfaces and data

- **Weather factors:** a table of ppm multipliers per kind for leisure, market, festival and travel speed, applied with `mulPpm`.

## Method and sources

- **Design:** the [Weather plan](../../../weather.md), "In daily life".
- **Evidence:** research round 10, not yet run.
- **Exposure counters:** M5.5's place-and-hour lens, extended with weather.

## Tests for the exit checks

- `rain lowers outdoor hours`: on 50 paired seeds, a forced rain day lowers outdoor hours against a forced clear day, and the comparison Holds by M1.1's rules.
- `crime by weather, never by culture`: the report gives true against recorded crime by weather kind, and no output pairs weather or crime with culture.
- `justice code never reads weather`: dependency-cruiser fails a planted import of the weather module into crime, police or reporting code.

## Risks and unknowns

- **Owner decision first:** routines or looks only.
- **Calibration.** Rain's effect on time outdoors and on crime is a research question. Until round 10, every factor is a labelled design value.
- **Fairness.** Weather is a property of places, so it never interacts with looks or culture.

## Open questions

- **Owner:** Routines or looks only? Suggested: routines, since a gap between true and recorded crime that moves with the weather fits the core lesson. Needed before: the step plan.
- **Owner:** Do storms cancel festivals, or only thin them? Suggested: thin them, and let no rule cancel one. Needed before: the step plan.
- **Research:** How much does rain cut time outdoors, and street crime? Suggested: round 10. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the utility factor and the outdoor-hours test first, then travel speed, then the report and the bet card.
- **Keep it simple:** one factor per activity kind, with no forecasts and no rain gear.
- **Pitfalls:** force a test's weather with a logged input on a scenario card, never by editing the chain mid-run.
- **Hard and easy parts:** calibration needs care; the factor table and the dependency rule are mechanical.
