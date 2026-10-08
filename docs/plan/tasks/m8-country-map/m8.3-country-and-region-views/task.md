# M8.3 Country and Region views

Part of [M8 Country map](../milestone.md). It is built right after M8.1 and before M1, as the owner decided on 9 October 2026.

Needs: M8.1's `WorldMap` and names, M0.4's renderer, camera and skin switch, M0.5's app, lazy loading, camera input and atlas stub, and M0.6's byte, chunk and startup gates. It builds the tile pass and the map atlas page that M3.3 had planned, and M3.3 later extends both to the town. The military sites, the new tiles and the country sound moved to M8.8, since they need M7, M1 and M3.

- **Builds:**
  - the map, opened on demand from the town: the world generated in a map worker of its own, so the sim worker and the first frame stay as they are, and the town paused while the map shows (Countries);
  - the tile pass in `render-gl`: a tile-index texture read with `texelFetch` and drawn one quad per chunk, from a map atlas page of the map-scale frames (R3, R9);
  - the Country and Region views as 8- and 16-px tilemaps of the same cells, with settlement icons and routes by tier, rivers, sea lanes and bridges as pixel lines, label bands by zoom, and wonder and landmark icons; the icon art exists; wire it in (R4, R9);
  - countries on the map: border lines with a band of each side's map colour, country names at Country zoom, a legend of each country's name, colour, capital and towns, and a flat Countries view that also draws before the atlas page loads (Countries);
  - the table of five country map colours, kept apart from body hues, role and crime colours, black and the culture emblem colours, and used only on map overlays and the legend, never on a person, building or soldier (Countries);
  - pan and zoom by mouse, touch and keys, with the Country view giving way to the Region view by CSS pixels per cell, under the auto-skin's 15% hysteresis (R4).
- **Owner decided:** on 9 October 2026 the owner chose:
  - five map-only country colours outside the 64-colour sprite palette, each kept well apart from every reserved colour; the owner picks the five from a swatch sheet when M8.3 starts;
  - that the page still opens on the town, with the map a click away and loaded on demand.
- **Owner decision first:** pick the five country map colours from the swatch sheet.
- **Exit checks:**
  - Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar (R4).
