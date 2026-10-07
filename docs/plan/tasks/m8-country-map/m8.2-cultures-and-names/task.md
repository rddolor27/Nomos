# M8.2 Cultures and names

Part of [M8 Country map](../milestone.md).

Needs: M7's culture block and spin-up, and M3's shared sound set and name filter.

- **Builds:**
  - 4–8 culture hearths by keyed Poisson-disc, never `Math.random`, with regions grown by multi-source Dijkstra over the grid's travel and terrain costs, a mixed border band and similar country-wide shares; layouts rejected when cultures differ in mean land quality or development beyond the set tolerance, single-culture development regions flagged, M7's 50–100-year spin-up run before play, and favoured foods taken from each hearth region's abundance (R8);
  - names for places, regions and festivals from the shared sound set and a seeded foswig chain on an original corpus, with theme words and site words such as "Ford" and "Port" kept as separate UI-language words, never fused suffixes, checked over 1,000 seeds by M3's name filter, which replaces round 4's (R4, R8).
- **Owner decision first:** round 8 left the hearth-balance tolerance undesigned, and the layout check needs a value. The Gazette tab asks whether street and district names ever follow a culture's naming custom. Place and region names raise the same question for the gazette's road-raid stories.
- **Exit checks:**
  - the name filter passes 1,000 seeds (R4);
  - after spin-up, cultures' mean development stays within the set tolerance, and the share of development regions holding only one culture is reported (R8).
