# M8.3 Country and Region views: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands. It is built right after M8.1, before M1 (owner, 9 October 2026).

**Task:** [task.md](task.md)

## Approach

- **The town stays the first frame; the map opens on demand.** A "Map" control loads the map's chunks only when pressed, so the 100 KB before the first frame and the startup gate don't move (R5). The owner decides whether the page should open on the map instead (below).
- **A map worker of its own.** It runs M8.1's `generateWorld(seed, 'large')` and `placeNames`, then posts the `WorldMap` and the names with every buffer transferred.
  - The sim worker's chunk, capped at 15 kB, never carries the generator.
  - The seed is the page's `?seed`, so a link shows the same world.
  - The map is display data, not sim state, so nothing in it is hashed or saved yet.
  - M8.6's live preview later reuses this worker.
- **The town pauses while the map shows,** as it does when the tab is hidden, and resumes on return only if it was playing. Nobody watches it then, and it would spend battery on phones (agent ruling).
- **One renderer, two scenes.** The map draws through M0.4's `WorldRenderer` as a second scene, so one canvas, one context, one context-loss path and one Canvas2D fallback serve the town and the map. The map scene's code loads lazily from `@nomos/render-gl/map`, so the renderer chunk stays under its 10 kB limit. The step plan updates `WorldRenderer` in [interfaces.md](../../m0-pipeline/interfaces.md).
- **What the map shows,** in this order:
  1. **Terrain:** the `map8_` and `map16_` tile for each cell's biome, with the keyed grassland and farmland variants `mapdraw.py` uses, and peaks as overlays.
  2. **Lines:** rivers, roads, sea lanes and bridge decks as pixel lines, as `mapdraw.py` draws them. Round 9 keeps them as lines, since 66.5% of river links and 40.1% of road steps are diagonal (R9).
  3. **Countries:** a neutral border line along cell edges between countries, with a band of each side's map colour, 1 px wide in the Country view and 2 px in the Region view.
  4. **Icons:** settlements by tier, each country's capital with the capital icon, then wonders and landmarks, drawn in row order.
  5. **Labels by band (R4):** the Country view shows country names, capitals and cities; the Region view shows every settlement. Labels are culled by priority, country first, so none overlap.
  6. **The legend,** in the HUD: each country's colour swatch, name, capital and number of towns. It is also the text alternative for screen readers.
- **The flat Countries view.** A toggle fills each country's land with its map colour and the sea with water, keeping borders, icons and labels. It needs no atlas, so it is also what draws while the map atlas page loads. M8.4 later makes it one of its map modes.
- **The tile pass (R3, R9).** A tile-index texture, read with `texelFetch`, draws the cells in one quad per chunk. The map atlas page holds the 83 map-scale frames, about 17,657 px of art (measured here), so it fits one 256×128 page. M3.3 later adds animated tiles, the town's chunks and its pages.
- **One camera over cells.** M0.4's `fitCamera`, `zoomAt` and `panBy` work in cells. The view switches from Country (8-px tiles) to Region (16-px tiles) by CSS pixels per cell, with `autoSkin`'s 15% hysteresis. Tiles draw only at whole-number scales, so the pixel art stays crisp.
- **Input and access.** M0.5's `bindCameraInput` gives drag, wheel, pinch, arrow keys and +/−. A fit button shows the whole world. Under reduced motion, zoom cuts rather than animates.

## Packages and files

All paths follow M0.7's layout: concern folders under `src/`, with entry files at `src/` only, as its lint requires.
- `apps/web/src/map/`:
  - `open.ts`: the Map control, the lazy entry and the town's pause;
  - `worker.ts`: the map worker around `generateWorld` and `placeNames`;
  - `legend.ts` and `labels.ts`: the legend and a fixed pool of label elements.
- `packages/render-gl/src/map/`: `tiles.ts`, `lines.ts`, `countries.ts`, `icons.ts` and `scene.ts`, behind a `./map` subpath export whose entry file sits at `src/`.
- `tools/atlas/build_atlas.py`: writes the map page apart from the rest, with one frame table for both.
- `apps/web/.size-limit.json`: entries for the map view chunk, the map worker chunk and the map atlas page, with limits set from the first build plus headroom, as M0.5 set its stand-ins. M0.6's chunk gate fails on any chunk left ungated.
- The dependency-cruiser config: `web` may import `@nomos/worldgen` from its map worker only.

## Interfaces and data

- **Map scene:** `createMapScene(map: WorldMap, names: string[], page: AtlasPage)`, handed to `WorldRenderer`, which draws it and restores it after a context loss.
- **View state:** `'country' | 'region'` here. M8.5 adds the focus state, and M9 adds settlement, district and street.
- **Country colours:** one table of five RGB values, read by `render-gl` and `tools/worldgen/mapdraw.py`. M8.1's colour index points into it.
- **Map icon table:** settlement tier, landmark and wonder → frame name, from the manifests. M8.8 adds military places and coast overlays.

## Method and sources

- **Tiles and the square-grid views:** the [R9 report](../../../../research/round-9-maps-and-world-builder/report.md), "The country uses the square grid".
- **Map levels, icons and label bands:** [R4 world map notes](../../../../research/round-4-multi-scale/notes/world-maps.md), the four levels.
- **Tile pass and atlas pages:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), and the Performance budget's "Images" and "Load order".
- **What the previews draw:** `tools/worldgen/mapdraw.py`.

## Tests for the exit checks

- `views render within 2 ms`: Country and Region views take ≤ 2 ms of main-thread render time per frame in CI's software-GL Chromium, a proposed bar, timed while panning with labels on.
- `first frame untouched`: the before-the-first-frame bytes and the startup gate stay within their limits, and no map chunk loads before the Map control is pressed.
- `tiles complete`: every biome, settlement tier, wonder and landmark the generator emits over 100 worlds has a frame on the map atlas page.
- `countries drawn`: a golden frame of seed 42's Countries view; every border edge is drawn, and the legend lists every country with its name and capital.
- `labels by band`: the Country view shows only country, capital and city labels, the Region view every settlement's, and no two labels overlap.
- `town pauses and resumes`: opening the map pauses the town; closing it resumes the town only if it was playing.

## Risks and unknowns

- **Labels are the hard part of the 2 ms bar.** Culling runs whenever the camera moves, so it must allocate nothing per frame.
- **The renderer chunk is capped at 10 kB.** Keep every map pass in the lazy chunk.
- **Phones take longer to generate.** Desktop is about twice as fast as a budget Android phone under the plan's multipliers, so a 400 ms desktop world may take about 0.8 s there (inference). Show a progress line in the map's place meanwhile.

## Open questions

- **Owner, decided on 9 October 2026: option (a),** five map-only colours that the owner picks from a swatch sheet. Which five colours do countries take? The sprite palette holds 61 of its 64 colours. Of the free hues, nearly all belong to body hues, police navy, merchant teal, crime reds and oranges, black, the gold coin or the eight culture emblems. Options:
  - (a) a map-only table of five colours outside the sprite palette, used only on map overlays and the legend, and tested to stay at CIEDE2000 ≥ 15 from all 47 reserved colours and outside the red–orange and body-hue families. 6,976 of 79,507 colours on a 6-step RGB grid pass the distance bar (computed here);
  - (b) raise the palette cap from 64 to 66 and add the five as palette entries;
  - (c) five existing palette tones, accepting closeness to terrain and emblem colours.

  The owner chose (a). No sprite ever uses a country colour, so the table can sit outside the palette. Still needed before building: the five picks from the swatch sheet.
- **Owner, decided on 9 October 2026: the town,** with the map a click away. Does the page open on the town, with the map a click away, or on the map? Opening on the map puts the generator and map chunks before the first frame, likely past the 35 kB initial-JS limit: 16.2 kB today plus an estimated 15–25 kB (unsourced estimate). Suggested: the town, until the map links to the streets in M9. Needed before: the step plan.
- **Owner:** Is the proposed bar of 2 ms main-thread render time per frame in software-GL Chromium accepted? It is the only exit check here. Suggested: accept it, timed while panning with labels on. Needed before: building.
- **Design:** Labels as DOM elements or a pixel font in the atlas? DOM text is crisp, reads to screen readers and costs no atlas space. Suggested: a fixed pool of DOM labels moved by transforms, updated only when the camera moves. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the map worker and the flat Countries view first, then the map atlas page and the tile pass, timed against 2 ms. Then lines, icons, country bands, labels and the legend, then the Region view and the Canvas2D fallback.
- **Reuse:** M0.4's renderer, camera helpers and `autoSkin`; M0.5's lazy loading, `bindCameraInput` and atlas stub; M8.1's `WorldMap` and names; the existing `map8_` and `map16_` frames.
- **Keep it simple:** label bands are a fixed table of zoom ranges per kind, with no layout beyond culling. The Canvas2D fallback draws the flat Countries view, icons and labels only.
- **Pitfalls:** the flat view must never wait for the atlas. Frames are looked up by name, never by atlas index (R9). The map worker must transfer its buffers, or a large world is copied on the main thread.
- **Hard and easy parts:** labels within 2 ms and the line pass need care; the legend, the flat view and wiring the existing icons are mechanical.
