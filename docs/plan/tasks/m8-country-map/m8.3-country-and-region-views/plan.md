# M8.3 Country and region views: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **New tiles first:** about 55–81, drawn as code in `tools/sprites` under the art rules (R9):
  - map-scale coast and cliff-coast overlays;
  - snow at map and street scale;
  - cliff faces for east, west and north;
  - rock ground and sand variants.

  The seasonal snow overlays and the snowy conifer already cover part of the street snow.
- **Two views of the same cells:** the Country view at 8 px per cell and the Region view at 16 px. Both reuse M3.3's tile pass, and show:
  - settlement icons and routes by tier;
  - label bands by zoom;
  - map-scale coast overlays;
  - wonder and landmark icons.

  The icon art exists; wire it in (R4, R9).
- **Military places (Military).** The world generator places:
  - garrisons in the capital and in coastal or border towns;
  - forts at road junctions near coasts and borders;
  - watchtowers along long roads.

  Their map icons, and the military sounds near barracks and forts, exist; wire them in.
- **Sound (Sound):**
  - country and region music and ambience;
  - the 11 wonder loops, faint near wonders on the map, and full in wonder views once M9 builds them.

  The sounds exist; wire them in through M1.4's player and M3.8's router.

## Packages and files

- `tools/sprites/map.py` and `tools/sprites/nature.py`: the new tiles, manifests and licence rows.
- `packages/render-gl/src/views/country.ts` and `region.ts`: map tilemaps, icons, routes and labels.
- `packages/render-gl/src/labels.ts`: label bands by zoom, collision-culled.
- `packages/worldgen/src/country/military.ts`: garrison, fort and watchtower placement.
- `packages/audio`: map music, ambience and wonder-loop routing.

## Interfaces and data

- **View state:** `'country' | 'region' | 'settlement' | 'district' | 'street'`. This sub-milestone adds the first two, and M9 joins them up.
- **Map icon table:** settlement tier, landmark, wonder and military place → frame name, from the manifests.
- **Military places:** `{ kind: 'garrison' | 'fort' | 'watchtower', cell }`, from the generator, never placed by players.

## Method and sources

- **Tiles needed and the square-grid views:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "About 55–81 small tiles unblock every layer" and "The country uses the square grid".
- **Map views, icons and label bands:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md).
- **Garrisons, forts and watchtowers:** [military.md](../../../military.md).
- **Music, ambience and wonder loops:** [sound.md](../../../sound.md).

## Tests for the exit checks

- `views render within 2 ms`: Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar.
- `tiles complete`: every terrain combination the generator emits has a tile at map scale. A scan of 100 worlds finds no missing frame.
- `military places by the rules`: garrisons sit only in the capital and in coastal or border towns, forts only at junctions near coasts or borders, and watchtowers only along long roads.

## Risks and unknowns

- **Owner decision first:** what counts as a border with no neighbouring country: the map edge, mountain passes or region lines. Garrison and fort placement waits for it.
- **Drawing 55–81 tiles is art work.** It goes through the sprite rules and `test_sprites.py`, and the owner reviews them.
- **Shore tiles and landmarks have no snow yet,** an open item since checkpoint 0001.

## Open questions

- **Owner:** With no neighbouring country, what counts as a border: the map edge, mountain passes or region lines? Garrison and fort placement waits for it, as M7.7's posts do. Suggested: region lines, which M8.1 already grows. Needed before: the step plan.
- **Owner:** Do shore tiles and landmarks get snow variants in this batch? M8.1's snow biome can reach cold coasts, where plain shore tiles would show seams (inference). Suggested: snowy shore tiles now, with landmarks left snow-free. Needed before: building.
- **Owner:** Is the proposed bar of 2 ms main-thread render time per frame in software-GL Chromium accepted? It is the only exit check here. Suggested: accept it, timed while panning with labels on. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the Country view with plain tiles and icons, timed against 2 ms, then routes, labels, the Region view, military places, new tiles and sound.
- **Reuse:** M3.3's tile pass, the existing `map8_` and `map16_` icon frames, M1.4's player, M3.8's router and `test_sprites.py`.
- **Keep it simple:** label bands are a fixed table of zoom ranges per settlement tier, with no layout beyond collision culling.
- **Pitfalls:** an untiled terrain mix draws as a hole, so drive the "tiles complete" scan from the generator's emitted combinations, not a hand list. Label culling runs every frame and must allocate nothing.
- **Hard and easy parts:** labels within 2 ms need the most care; wiring the existing icons and sounds is mechanical.
