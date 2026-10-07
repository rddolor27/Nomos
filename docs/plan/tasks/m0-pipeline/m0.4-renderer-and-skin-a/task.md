# M0.4 Renderer and Skin A

Part of [M0 Pipeline](../milestone.md).

- **Builds:**
  - one WebGL2 `WorldRenderer` (`init`, `resize`, `setMap`, `pushSnapshot`, `draw`, `setSkin`, `setLod`, `dispose`) with context-loss handling and a Canvas2D fallback capped near 5,000 agents; no PixiJS (R2, R3);
  - Skin A: shape-coded dots at least 5 px across, in the sprite palette, with dark outlines on light ground and light rims on dark ground (R3);
  - the camera: integer device-pixel zoom, `devicePixelContentBoxSize` with a Safari fallback, texel and pixel snapping, and no CSS scaling (R3);
  - the skin switch: `?skin=dots|blobs|town`, a toolbar toggle and an automatic policy, with unbuilt skins falling back to dots (R3);
  - the one binary map format for generated and hand-made maps: terrain kinds, IntGrid walkability, and entities (homes with capacity, workplaces, shops with hours, civic buildings); `town.ldtk` converted to it at build time, served with a compressible content type, loaded in the worker, and its zone colours drawn as Skin A's minimap (R3, R5, R9).
- **Exit checks:**
  - Skin A draws a 10,000-agent replay in at most 1 ms of main-thread time per frame in CI, and golden-frame statistics agree at 1–4× zoom and device pixel ratios 1, 1.5 and 2 in Chromium, Firefox and WebKit (R3);
  - context loss recovers, outlines reach 3:1 contrast, and role colours differ by at least ΔE 20 under three simulated colour-blindness types (R2, R3).
