# M9.3 Streets from the generator

Part of [M9 Zoom across scales](../milestone.md).

- **Builds:**
  - every tier's street maps built with the district generator, prefetched on hover and cross-faded in; building interiors stay abstract, as building cards (R4, R9);
  - place record version 2: a stable id and cell, edge biomes per side, elevation and relief, river size, road rank, region, founding tier and versions, with temperature and moisture quantised to the place generator's bands (R9);
  - each place's plan type locked at its founding tier, and keyed lots built by population, so growth never moves a street (R9);
  - place edits as reservations the generator flows around, stored per place uid with the place version and a record hash, going dormant rather than being dropped (R9);
  - music and ambience crossfaded between country, region, city and street (Sound; the music and ambience exist, so wire them in).
- **Needs:** M6.1's generated cities; M8.1's world generator and place records; M3.8's music player.
- **Verify first:** day-step, spawn and map-generation times in browser workers and on phones, which set the phone tier for country mode.
- **Exit checks:**
  - zooming from Region to City shows agents with no dropped frame: interior generation (≤ 60 ms; 59 ms warm in Node) and spawning (≤ 10 ms) start on hover and finish under the cross-fade (R4);
  - a zoom-consistency CI test passes: road, river and sea sides match the country exactly, every landmark icon appears in its place, and edge farmland shows as fields (R9).
