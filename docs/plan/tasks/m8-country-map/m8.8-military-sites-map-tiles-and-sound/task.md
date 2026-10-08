# M8.8 Military sites, map tiles and sound

Part of [M8 Country map](../milestone.md). It holds the parts of M8.3 that stayed after M7 when M8.3's views moved ahead of M1 (owner, 9 October 2026).

Needs: M8.3's views and tile pass, M7.7's garrison posts, M8.1's countries, and the synth and music player from M1 and M3.

- **Builds:**
  - about 53–79 tiles, drawn as code in `tools/sprites`: map-scale coast and cliff-coast overlays, snow at street scale, cliff faces for east, west and north, rock ground and sand variants; M8.1 already drew the two map-scale snow tiles, and the seasonal snow overlays and snowy conifer cover part of the street snow (R9);
  - the map-scale coast overlays wired into M8.3's Country and Region views (R9);
  - garrisons in each country's capital and in coastal or border towns, forts at road junctions near coasts and borders, and watchtowers along long roads, all placed by the world generator, with their map icons and the military sounds near barracks and forts; the fort and watchtower icons and the sounds exist, so wire them in, but garrisons have no map icon yet (Military);
  - a border is the land boundary between two countries, as the owner settled on 9 October 2026: border towns and border forts lie within 3 cells of one, a proposed reach (Military, Countries);
  - country and region music and ambience, and the 11 wonder loops: faint near wonders on the map, and full in wonder views once M9 builds them; the sounds exist; wire them in (Sound).
- **Exit checks:** the plan sets none here. Proposed:
  - garrisons sit only in capitals and in coastal or border towns, forts only at junctions near coasts or borders, and watchtowers only along long roads, over 100 seeds (Military);
  - every terrain combination the generator emits has a tile at map scale, coast overlays included, over 100 worlds (R9).
