# M5.5 Culture lens and audits: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The culture lens is opt-in.** It is off by default, and never appears in share cards or default replays (R8).
  - **What it shows:** customs only, as district shares in small multiples and the festival calendar. M8 adds the home-regions map mode.
  - **What it hides:** justice cues, the whole time it is on.
  - **Inspector:** separate Customs and Records tabs, never shown together.
  - **Colours:** a palette apart from body hues and crime colours, with icons or patterns so colour never carries meaning alone.
- **The culture panel,** inside the lens:
  - culture shares and the effective number of cultures;
  - customs from other cultures per person, 0–4;
  - generational retention.
- **City-mode inflow:** a boundary inflow of culturally different arrivals, default 0.5% a year.
- **The Exposure lens (R8):**
  - night outdoor hours, and victimisation and police contacts per 1,000 outdoor hours, by district and hour, never by culture;
  - any remedy it suggests acts only on places and times.
- **Appearance audit, extended to wellbeing and wealth (R6):**
  - no body pixel varies with LS;
  - faces stay event-driven;
  - bubbles are capped per agent per day;
  - outside the wealth lens, every rendered attribute has |Spearman| < 0.05 with wealth decile, over 50 seeds.
- **Culture rows in the audit (R8, R9):**
  - every rendered attribute outside the lens has |Cramér's V| < 0.05 with culture, over 50 seeds;
  - a hue × culture independence test runs over 10⁶ births, extended to eye shape and pattern;
  - no policy reads culture.
- **Soldiers (Military):** recruitment and postings never read culture, region, looks or wealth, and the appearance and culture audits cover soldiers.
- **The diverse playtest panel** looks at customs and names, asking two questions: which real people does each culture resemble, and which commits more crime? Results go in `docs/playtests/`, as M1.5 set up.

## Packages and files

- `packages/render-gl/src/lenses/culture.ts` and `exposure.ts`.
- `apps/web`:
  - `src/inspector/customs.ts` and `src/inspector/records.ts`, as separate tabs;
  - `src/panels/culture.ts`.
- `packages/sim-culture/src/inflow.ts`: arrivals' cultures. Arrivals themselves are migration, which stays culture-blind; `sim-culture` splits the totals.
- `tools/audit/appearance.ts`: the wealth, LS and culture rows, plus the hue, eye and pattern × culture tests.
- `docs/playtests/m5-culture-panel.md`: the panel's record.

## Interfaces and data

- **Lens availability:** the culture lens is never serialised into share links. A default replay starts with `lens: 'none'`.
- **Exposure counters:** M4.5's, which it keys by cell and period and enables only in audit builds; the lens needs them by district and hour in every build, with culture stripped before display.
- **Audit outputs:** per attribute, the statistic (Spearman or Cramér's V), its interval over 50 seeds, and pass or fail.

## Method and sources

- **The lens, the panel, inflow, the Exposure lens and the panel questions:** [R8 prior-art and ethics notes](../../../../research/round-8-cultures/notes/prior-art-ethics.md), the [R8 report](../../../../research/round-8-cultures/report.md), and the [R8 summary](../../../../research/round-8-cultures/summary.md).
- **Wealth and LS invisible on bodies:** the [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md) and [R6 wealth notes](../../../../research/round-6-goods-and-wellbeing/notes/wealth-assets.md), part e.
- **Looks drawn independently:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md) and the content rules in the [sprite README](../../../../../tools/sprites/README.md).

## Tests for the exit checks

- `no rendered attribute tracks wealth`: over 50 seeds, outside the wealth lens, every rendered attribute has |Spearman| < 0.05 with wealth decile.
- `no rendered attribute tracks culture`: the same over 50 seeds with |Cramér's V| < 0.05, outside the culture lens.
- `looks independent of culture`: over 10⁶ births, a χ² test of hue × culture, eye shape × culture and pattern × culture passes at p > 0.001.
- `soldiers never selected by culture, region, looks or wealth`: recruitment and posting decisions are registered in M4.1's flip test, which also flips region, look and wealth decile for this check. Every threshold stays unchanged.
- `lens hides justice cues`: with the culture lens on, no justice bubble, ring or panel draws.

## Risks and unknowns

- **Owner decision first:** the playtest panel's bar, proposed as at least 8 in 10 naming no real people and seeing no difference.
- **Verify first:**
  - whether animated crime streams or the gazette's justice column build illusory correlation, which sets how strict the lens rules must be;
  - round 8's transmission bands re-run with similar culture shares;
  - lens and emblem colours against body-hue shade tones (CIEDE2000 6.0–9.1), so no lens colour reads as a body colour.
- **Inflow changes outcomes** over long runs. Report it in the audit with its rate.

## Open questions

- **Owner:** Is the panel's bar at least 8 in 10 naming no real people and seeing no crime difference, and who recruits it? The answer decides whether customs and names ship or are rewritten. Suggested: round 8's 8 in 10, over at least 10 people recruited before M5.5 starts. Needed before: building.
- **Measure:** How far must lens and emblem colours sit from body-hue shades? Today's sit only 6.0–9.1 CIEDE2000 from the ice, sun, lilac and silver shades (R8 report, computed in its fact-check). Suggested: a palette test with a floor of 10 (unsourced estimate), and an icon or pattern on every lens colour. Needed before: building.
- **Research:** Do round 8's transmission bands hold with similar culture shares, not one 60% culture? They set the CI retention bands and the 0.5% inflow default. Suggested: re-run the transmission prototype with equal shares. Needed before: building.
- **Research:** Does a stream of animated crime events build illusory correlation? It sets how strict the lens rules must be. Suggested: reuse M4.6's playtest result. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the audit rows first, since they guard everything drawn later; then the Exposure lens; then the culture lens and panel.
- **Reuse:** M4.5's exposure counters, M4.1's flip test for soldiers, M4.6's appearance audit, M5.4's overlay renderer, and the M1.5 playtest records.
- **Keep it simple:** run the hue, eye and pattern × culture tests through the real birth function with synthetic parents, 10⁶ calls without stepping a world.
- **Pitfalls:** keep the culture lens out of links, saves and share cards by type, with a test. The culture panel shows customs only, and no justice figure shares its screen (R8 summary, "Never shown together").
- **Hard and easy parts:** the Spearman and Cramér's V rows over 50 seeds need care; drawing the lenses is routine.
