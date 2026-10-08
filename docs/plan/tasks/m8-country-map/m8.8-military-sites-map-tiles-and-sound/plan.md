# M8.8 Military sites, map tiles and sound: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **New tiles first:** about 53–79, drawn as code in `tools/sprites` under the art rules (R9):
  - map-scale coast and cliff-coast overlays;
  - snow at street scale;
  - cliff faces for east, west and north;
  - rock ground and sand variants.

  M8.1 drew the two map-scale snow tiles with its snow biome. The seasonal snow overlays and the snowy conifer already cover part of the street snow.
- **Coast overlays join M8.3's views.** They draw in M8.3's tile pass, from the same map atlas page, over the water and land tiles (R9).
- **Military places (Military).** The world generator places them after landmarks:
  - garrisons in each country's capital, and in coastal or border towns;
  - forts at road junctions near coasts and borders;
  - watchtowers along long roads.

  The fort and watchtower map icons, and the military sounds near barracks and forts, exist; wire them in. Garrisons have only the street-scale barracks, with no map icon yet.
- **Borders (owner, 9 October 2026).** A border is the land boundary between two countries: the edges where neighbouring land cells belong to different countries. Coasts stay their own case, and neither the map edge nor region lines count.
  - A border town lies within 3 cells of a border, a proposed reach tuned on previews.
  - A border fort sits at a road junction within the same reach.
  - Neighbours are never enemies. Borders have no checkpoints, tolls or stops, and no soldier, barracks or fort carries a country's colour, name or emblem.
- **Sound (Sound):**
  - country and region music and ambience;
  - the 11 wonder loops, faint near wonders on the map, and full in wonder views once M9 builds them.

  The sounds exist; wire them in through M1.4's player and M3.8's router.

## Packages and files

- `tools/sprites/map.py` and `tools/sprites/nature.py`: the new tiles, manifests and licence rows.
- `packages/worldgen/src/country/military.ts`: garrison, fort and watchtower placement. Python has no military stage, so its goldens are frozen per generator version, as the milestone allows.
- `packages/render-gl/src/map/`: the coast overlays and the military icons, in M8.3's passes.
- `packages/audio`: map music, ambience and wonder-loop routing.

## Interfaces and data

- **Military places:** `{ kind: 'garrison' | 'fort' | 'watchtower', cell }`, from the generator, never placed by players.
- **Border reach:** one constant, in cells, read by garrison and fort placement.
- **Map icon table:** M8.3's table gains the military places and the coast overlays.

## Method and sources

- **Tiles needed:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "About 55–81 small tiles unblock every layer".
- **Garrisons, forts, watchtowers and borders:** [military.md](../../../military.md), and the owner's Countries decisions of 9 October 2026 ([M8 milestone](../milestone.md)).
- **Music, ambience and wonder loops:** [sound.md](../../../sound.md).

## Tests for the exit checks

- `military places by the rules`: over 100 seeds, garrisons sit only in capitals and in coastal or border towns, forts only at junctions within the reach of a coast or a border, and watchtowers only along long roads.
- `tiles complete`: every terrain combination the generator emits has a tile at map scale. A scan of 100 worlds finds no missing frame, coast overlays included.
- `no country on soldiers`: no military sprite, icon or sound reads a country id.

## Risks and unknowns

- **Drawing 53–79 tiles is art work.** It goes through the sprite rules and `test_sprites.py`, and the owner reviews them.
- **Shore tiles and landmarks have no snow yet,** an open item since checkpoint 0001.
- **Forts crowd small countries.** A country of a few settlements may hold several junctions near a border. Cap forts per country, as watchtowers are capped per road.

## Open questions

- **Owner:** Do shore tiles and landmarks get snow variants in this batch? M8.1's snow biome can reach cold coasts, where plain shore tiles would show seams (inference). Suggested: snowy shore tiles now, with landmarks left snow-free. Needed before: building.
- **Owner:** How does the map show a garrison? The plan asks for map icons, but [military.md](../../../military.md) drew them only for forts and watchtowers. Suggested: 8- and 16-px barracks icons, drawn as code under the art rules. Needed before: building.
- **Design:** Is 3 cells the right border reach? It sets how many towns count as border towns. Suggested: start at 3, and tune it on large-world previews so each land border has one or two forts. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** military placement and its rules test, then the map icons, then the new tiles and coast overlays, then sound.
- **Reuse:** M8.3's tile pass, icon pass and map atlas page; M8.1's countries and border edges; the existing `map8_` and `map16_` frames; M1.4's player, M3.8's router and `test_sprites.py`.
- **Keep it simple:** compute border distance once per world, with one breadth-first pass from every border cell, and read it for towns and junctions.
- **Pitfalls:** an untiled terrain mix draws as a hole, so drive the "tiles complete" scan from the generator's emitted combinations, not a hand list.
- **Hard and easy parts:** the tile art needs the most care; placement and wiring the existing icons and sounds are mechanical.
