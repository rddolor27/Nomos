# M8.2 Cultures and names

Part of [M8 Country map](../milestone.md).

Needs: M7's culture block and spin-up, M8.1's countries, regions, place-name table and picker, M0.7's sound set and name filter, and M3.7's naming customs.

- **Builds:**
  - 4–8 culture hearths by keyed Poisson-disc, never `Math.random`, with regions grown by multi-source Dijkstra over the grid's travel and terrain costs, a mixed border band and similar country-wide shares; layouts rejected when cultures differ in mean land quality or development beyond the set tolerance, single-culture development regions flagged, M7's 50–100-year spin-up run before play, and favoured foods taken from each hearth region's abundance (R8);
  - culture regions that cross country borders, so no country stands for a culture: hearths drawn near land borders where a world has them, and a check that every culture keeps a share of its people outside its main country and that no country is mostly one culture; culture placement reads countries only for this check, and no country name, colour or naming custom comes from a culture (R8, Countries);
  - names for regions and festivals from M8.1's place-name table, built from the shared sound set and checked by the name filter, with theme words and site words such as "Ford" and "Port" kept as separate UI-language words, never fused suffixes, checked over 1,000 seeds by the name filter, which replaces round 4's; M8.1 already names places and countries (R4, R8).
- **Owner decided:** on 9 October 2026 the owner set the crossing bars. After spin-up, every culture has at least 15% of its people outside its main country, and no country is over two-thirds one culture, in at least 90 of 100 seeds.
- **Owner decision first:**
  - round 8 left the hearth-balance tolerance undesigned, and the layout check needs a value;
  - the Gazette tab asks whether street and district names ever follow a culture's naming custom; region names raise the same question for the gazette's road-raid stories. Place and country names never do, an agent ruling that follows the owner's decision of 9 October 2026 that no country stands for a culture.
- **Exit checks:**
  - the name filter passes 1,000 seeds (R4);
  - after spin-up, cultures' mean development stays within the set tolerance, and the share of development regions holding only one culture is reported (R8);
  - after spin-up, over 100 seeds, every culture and every country meet the crossing bars the owner sets (Countries).
