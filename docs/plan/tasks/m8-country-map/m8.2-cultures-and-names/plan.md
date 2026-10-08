# M8.2 Cultures and names: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Culture hearths (R8):**
  - 4–8 hearths placed by keyed Poisson-disc sampling, never `Math.random`;
  - regions grown from them by multi-source Dijkstra over the grid's travel and terrain costs;
  - a mixed border band between regions;
  - similar country-wide shares.
- **Hearths must be fair.**
  - A layout is rejected and re-drawn when cultures differ in mean land quality or development beyond the set tolerance (owner decision below).
  - Development regions holding a single culture are flagged.
  - M7's 50–100-year spin-up runs before play, and the fairness check runs again after it.
  - Players never place hearths: random user-placed hearths met the fairness bars in 0 of 723 layouts (R9).
- **Cultures cross borders (Countries).** The owner ruled on 9 October 2026 that no country stands for a culture. Placement alone doesn't deliver that:
  - **The evidence** (measured here: a scratch probe on the Python generator, 20 large worlds, land-weighted, before any spin-up):
    - with hearths placed independently of countries, every culture kept 15% or more of its land outside its main country in 1 of 20 worlds, and no country was over 67% one culture in 3 of 20;
    - counted by people, it was worse: in a 10-world run, every world had a country over two-thirds one culture, because a capital holds most of its country's people and sits in one culture's region;
    - drawing hearths from settlements within 6 cells of a land border raised those counts to 8 of 20 and 8 of 20, but both held together in only 1 of 20;
    - growth costs barely mattered: letting rivers join cultures and making straits cheaper changed almost nothing.
  - **So the design has four parts:**
    1. **Near-border hearths:** draw hearth candidates from settlements near land borders where a world has them, so most culture regions straddle a border.
    2. **The spin-up mixes the rest:** migration ignores borders, and capitals become melting pots of 2.0–4.2 effective cultures (R8).
    3. **A check after spin-up,** people-weighted, with bars the owner sets (below). It joins the fairness check in the keyed hearth search.
    4. **Nothing on screen ties a country to a culture:** country names come from M8.1's place table, never a culture's naming custom; country colours stay CIEDE2000-distant from the emblem colours; the home-regions mode draws country borders only as thin neutral lines; and no panel shows a country's culture mix outside the culture lens.
  - Culture placement may read country ids for this check only. Countries stay map facts, and no sim rule reads them.
- **Favoured foods** come from what each hearth region produces in abundance, replacing M3.7's keyed draw.
- **Names for regions and festivals (R4, R8):**
  - they reuse M8.1's place-name table, built from M0.7's shared sound set and kept only where words pass the filter, so they pass by construction;
  - theme words and site words, such as "Ford" and "Port", stay separate UI-language words, never fused suffixes;
  - names are checked over 1,000 seeds by M3.7's name filter, which replaces round 4's.

## Packages and files

- `packages/sim-culture/src/country/hearths.ts`: Poisson-disc, Dijkstra growth, the border band, near-border candidates, and the fairness and crossing checks.
- `packages/worldgen/src/names/`: region and festival names on M8.1's picker, and `site-words.ts`.
- `tools/names/`: the filter, run over generated region and festival names.

## Interfaces and data

- **Hearth layout:** `{ hearths: Int32Array /* cells */, region: Uint8Array /* per cell */, border: Uint8Array }`.
- **Name API:** `regionName(seed, uid)` and `festivalName(seed, uid)`, on M8.1's picker, each returning `{ name, siteWord }`. The site word stays a separate string, joined only by the UI.
- **Fairness report:** each culture's mean land quality and development, the tolerance, the flagged single-culture regions, and each culture's share outside its main country and each country's largest culture share.

## Method and sources

- **Hearths, Dijkstra regions, border bands and fairness:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, and the [R8 summary](../../../../research/round-8-cultures/summary.md), "Home regions".
- **Capitals as melting pots, and regions kept after 100 years:** the [R8 report](../../../../research/round-8-cultures/report.md), "The country keeps regions, and capitals become melting pots".
- **Players never paint cultures:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md).
- **Seeded name chains and site words:** the [R4 report](../../../../research/round-4-multi-scale/report.md) and [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md).
- **The filter and the sound set:** M0.7, with M8.1's place table and M3.7's naming customs.

## Tests for the exit checks

- `names pass the filter over 1,000 seeds`: every region and festival name passes.
- `cultures develop alike`: after spin-up, cultures' mean development stays within the set tolerance. The share of development regions holding only one culture is reported.
- `cultures cross borders`: after spin-up, over 100 seeds, every culture keeps at least the set share of its people outside its main country, and no country's largest culture passes the set share.
- `hearths keyed`: the same seed gives the same hearths and regions in Node and Chromium.
- `site words separate`: no generated name ends in a site word; site words appear only as separate strings.

## Risks and unknowns

- **Owner decision first:** the hearth-balance tolerance. Round 8 left it undesigned, and the layout check needs a value.
- **Owner decided, 9 October 2026:** the crossing bars, as suggested below. The probe shows that placement alone rarely meets them, so they set how hard the hearth search works.
- **Owner decision first:** whether street, district or region names ever follow a culture's naming custom. The Gazette tab raises it for street and district names, and region names raise it again for the gazette's road-raid stories.
- **Rejection loops:** if fair layouts are rare for some seeds, cap the re-draws, log them, and report the seeds that need many.
- **Island and single-neighbour countries** sit inside one culture's region more often in the probe, so they fail the country bar first. The spin-up's mixing is their main help.

## Open questions

- **Owner:** What hearth-balance tolerance, and what counts as "development"? The layout check and the after-spin-up check both need them. Suggested: R9's trial bar, a people-weighted land-quality gap of at most 10%, and income per head within 10% after spin-up (unsourced estimate). Needed before: the step plan.
- **Owner, decided on 9 October 2026: the suggested bars.** What are the crossing bars, and must every world meet them or 90% of worlds? Strict per-world bars need a search that may not converge; a rate over 100 seeds tolerates odd geometries. Suggested: after spin-up, every culture keeps at least 15% of its people outside its main country and no country is over two-thirds one culture, in at least 90% of 100 seeds, with the rest reported (unsourced estimate). Needed before: the step plan.
- **Owner:** Do street, district or region names ever follow a culture's naming custom? Road-raid stories name places, and culture must never appear where crime is shown (content rule 8). Suggested: never; all of these come from M8.1's place table. Needed before: the step plan.
- **Owner:** What happens when a world fails the after-spin-up checks? Re-placing hearths means another 50–100-year spin-up. Suggested: no re-spin at run time; CI fails if more than the agreed share of 100 seeds fall outside the bars. Needed before: the step plan.
- **Measure:** Which hearth placement and border-band width meet the crossing bars after spin-up while regional G\_ST stays at 0.3 or more? A wider band mixes more but blurs regions. Suggested: sweep both on 100 seeds in M7.7's spin-up before fixing them. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** region and festival names first, since they need no spin-up, then hearths, regions, the land-quality check and the crossing check, then the after-spin-up checks.
- **Reuse:** M8.1's multi-source Dijkstra, countries, regions, place table and name picker; M0.7's sound set and filter; M3.7's naming customs; M7.7's spin-up.
- **Keep it simple:** use a keyed search that moves one hearth at a time toward balance and crossing, with a fixed step cap, rather than open-ended re-draws.
- **Pitfalls:** rejection alone almost never succeeds. R9's fairness bars held together in 1 of 769 Poisson-disc layouts, and 40 re-draws succeeded in 1 of 20 worlds (R9 edits notes, measured there). The capital's region skews population shares 47× before spin-up. Measure crossing people-weighted after spin-up, since land shares flatter it.
- **Hard and easy parts:** the hearth search needs the most care; site words and the name API are mechanical.
