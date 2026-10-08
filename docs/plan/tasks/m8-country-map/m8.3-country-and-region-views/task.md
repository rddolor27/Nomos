# M8.3 Country and Region views

Part of [M8 Country map](../milestone.md).

Needs: M3's tile pass, M7's garrison posts, and the synth and music player from M1 and M3.

- **Builds:**
  - about 55–81 tiles, drawn as code in `tools/sprites`: map-scale coast and cliff-coast overlays, snow at map and street scale, cliff faces for east, west and north, rock ground and sand variants; the seasonal snow overlays and snowy conifer already cover part of the street snow (R9);
  - the Country and Region views as 8- and 16-px tilemaps of the same cells, with settlement icons and routes by tier, label bands by zoom, map-scale coast overlays, and wonder and landmark icons; the icon art exists; wire it in (R4, R9);
  - garrisons in the capital and coastal or border towns, forts at road junctions near coasts and borders, and watchtowers along long roads, all placed by the world generator, with their map icons and the military sounds near barracks and forts; the fort and watchtower icons and the sounds exist, so wire them in, but garrisons have no map icon yet (Military);
  - country and region music and ambience, and the 11 wonder loops: faint near wonders on the map, and full in wonder views once M9 builds them; the sounds exist; wire them in (Sound).
- **Owner decision first:** the Military tab asks what counts as a border with no neighbouring country: the map edge, mountain passes or region lines. Garrison and fort placement waits for it.
- **Exit checks:**
  - Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar (R4).
