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
- **Favoured foods** come from what each hearth region produces in abundance, replacing M3.7's keyed draw.
- **Names (R4, R8):**
  - places, regions and festivals are named from the shared sound set plus a seeded foswig chain on an original corpus;
  - theme words and site words, such as "Ford" and "Port", stay separate UI-language words, never fused suffixes;
  - names are checked over 1,000 seeds by M3.7's name filter, which replaces round 4's.

## Packages and files

- `packages/sim-culture/src/country/hearths.ts`: Poisson-disc, Dijkstra growth, the border band and the fairness check.
- `packages/worldgen/src/names/`:
  - `chain.ts`: a seeded order-3 chain, reimplemented from foswig's idea (MIT) or vendored with its licence;
  - `corpus.ts`: the original corpus, written for Nomos;
  - `site-words.ts`.
- `tools/names/`: M3.7's filter, run over generated place, region and festival names.

## Interfaces and data

- **Hearth layout:** `{ hearths: Int32Array /* cells */, region: Uint8Array /* per cell */, border: Uint8Array }`.
- **Name API:** `placeName(seed, uid, culture, site): { name, siteWord }`. The site word stays a separate string, joined only by the UI.
- **Fairness report:** each culture's mean land quality and development, the tolerance, and the flagged single-culture regions.

## Method and sources

- **Hearths, Dijkstra regions, border bands and fairness:** [R8 customs notes](../../../../research/round-8-cultures/notes/customs-preferences.md), part c, and the [R8 summary](../../../../research/round-8-cultures/summary.md), "Home regions".
- **Players never paint cultures:** the [R9 summary](../../../../research/round-9-maps-and-world-builder/summary.md).
- **Seeded name chains and site words:** the [R4 report](../../../../research/round-4-multi-scale/report.md) and [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md).
- **The filter and the sound set:** M3.7.

## Tests for the exit checks

- `names pass the filter over 1,000 seeds`: every place, region and festival name passes.
- `cultures develop alike`: after spin-up, cultures' mean development stays within the set tolerance. The share of development regions holding only one culture is reported.
- `hearths keyed`: the same seed gives the same hearths and regions in Node and Chromium.
- `site words separate`: no generated name ends in a site word; site words appear only as separate strings.

## Risks and unknowns

- **Owner decision first:** the hearth-balance tolerance. Round 8 left it undesigned, and the layout check needs a value.
- **Owner decision first:** whether street, district, place and region names ever follow a culture's naming custom. The Gazette tab raises it for street and district names; place and region names raise it again for the gazette's road-raid stories.
- **Rejection loops:** if fair layouts are rare for some seeds, cap the re-draws, log them, and report the seeds that need many.
