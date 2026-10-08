# M5.4 Wellbeing and fear on screen: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Settlement terms join M3.6's LS drivers:** −20 LS per point of settlement unemployment, and −7 per point of inflation. Each is computed once per settlement per day.
- **Every policy predicts its LS size** in M5.1's prediction table (R6).
- **Lenses and readouts, all opt-in:**
  - a district wellbeing lens;
  - a government-approval readout from mean LS;
  - a district panel of the suffering share and the strongest drivers;
  - a wealth lens;
  - fear-of-crime and trust-in-police meters.

  There is never mood per house, and no elections or protests (R6).
- **Bubbles:** sweat-drop and heart bubbles are rate-limited per agent per day, and fire from events only, never from the LS level. The art exists; wire it in (R3).
- **Policies show through places and overlays** — station staffing, patrol density and shop shutters — never through how agents look (R3).
- **Optional:** a happiness-affects-productivity switch at ±4% per ladder point, capped at ±8%, off by default. It ships only if the owner keeps it (decision below).

## Packages and files

- `packages/sim-core/src/wellbeing/drivers.ts`: the settlement terms.
- `packages/render-gl/src/lenses/`:
  - `wellbeing.ts`, `wealth.ts`, `fear.ts` and `trust.ts`;
  - each is a district-level overlay drawn from per-district aggregates, never per agent or per house.
- `packages/render-gl/src/overlays/policy.ts`: station staffing, patrol density and shutters.
- `apps/web`: the approval readout, the district panel and the meters.
- `packages/sim-core/src/firms/productivity.ts`: the optional switch, off by default and behind a setting.

## Interfaces and data

- **District aggregates,** published at the day boundary:
  - mean LS, the suffering, struggling and thriving shares, and the top three drivers;
  - mean fear and mean trust;
  - the wealth decile mix.
- **Lens state:** `'none' | 'wellbeing' | 'wealth' | 'fear' | 'trust' | 'culture' | 'exposure'`, the last two from M5.5. It is never saved in share cards by default.
- **Bubble limits:** per agent per day, set in the step plan, enforced by M1.3's bubble scheduler.

## Method and sources

- **Unemployment and inflation terms, approval, the suffering share and the productivity switch:** [R6 happiness notes](../../../../research/round-6-goods-and-wellbeing/notes/happiness-wellbeing.md), and the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md): "How it shows".
- **Lenses, bubbles and showing policy through places:** [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md).

## Tests for the exit checks

This sub-milestone has no exit check of its own; M5.5's appearance audits cover these lenses and bubbles. Its own tests:
- `settlement terms`: one point of unemployment lowers every resident's LS target by exactly 20, and one point of inflation by 7.
- `lenses are district-level`: no lens reads a per-agent or per-house value. A renderer test changes one agent's LS and finds no pixel change outside the district aggregate.
- `bubbles never from LS level`: with LS forced to its minimum and no events, no sweat or heart bubble fires.
- `productivity switch off by default`: with default settings, firm output never reads LS.

## Risks and unknowns

- **Owner decision first:** whether the optional happiness-affects-productivity switch ships at all, off by default.
- **Lenses can leak wealth** through district averages in small districts. M5.5's audit checks lens-off frames only; lens-on frames are opt-in by design.
- **Meters invite over-reading.** Label each with its source and "model output, not a measurement".

## Open questions

- **Owner:** Should the happiness-affects-productivity switch ship at all? LS carries custom-shaped terms, since festival attendance counts as social contact (R8 summary), so the switch opens a path from customs to work (inference). Suggested: don't ship it; if kept, M4.5's audit must cover it, since M4.1's flip test holds attendance fixed (inference). Needed before: the step plan.
- **Owner:** Should lenses hide districts with few residents? There a district value describes one or two people, which marks a person. Suggested: hide any district under 20 residents (unsourced estimate). Needed before: building.
- **Measure:** How many sweat and heart bubbles per agent per day keep a 10k screen readable? The brief leaves the cap to the step plan. Suggested: start at one of each per agent per day, under M1.3's limit of four to six bubbles on screen. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the settlement terms and district aggregates first, testable headless; then the lenses one at a time; then bubbles and meters; the policy overlays last.
- **Reuse:** M3.6's LS drivers, M4.4's fear and trust values, M1.3's bubble scheduler, the existing bubble art, and M5.1's prediction table.
- **Keep it simple:** one district-overlay renderer fed a value array and a palette per lens, rather than four lens modules.
- **Pitfalls:** lenses read only the day-boundary aggregates, never live agent columns, which makes the one-agent test pass by construction. Nothing in the sim reads the approval readout.
- **Hard and easy parts:** the district aggregates need care; the meters and overlays are routine.
