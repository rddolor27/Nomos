# M3.3 Skin C town

Part of [M3 City life](../milestone.md).

Builds on M3.1's tiles and M3.2's inspector. Needs M0.4's renderer, camera and skin switch, M0.5's atlas stub, M8.3's tile pass and map atlas page, M1's sprite and bubble passes, and M1.2's light periods. M8.3 is built before M1 (owner, 9 October 2026), so the tile pass already draws the map when this starts. The estimate leaves out the optional human sheet.

- **Builds:**
  - Ninja Adventure as placeholders only: re-download it from its canonical page, confirm the CC0 text and drop culturally specific tiles; the original sprites, on a master palette of at most 64 colours, replace the 32-colour re-index (R3, R9);
  - the tile pass (a tile-index texture read with `texelFetch`, animated tiles) and the roof pass drawn over people: M8.3 built the tile pass for the map, and this adds animated tiles, the town's chunks and the roof pass (R3);
  - the atlas as lossless WebP at native resolution, with an oxipng PNG fallback, loaded in idle time after the first frame: M8.3 split out the map page, and this adds the town's pages (R5);
  - the phone path: render at one pixel per texel into a framebuffer and blit at integer scale, retiring the pixel-ratio cap of 2 for the world layer (R3);
  - M1.2's light periods extended to the town: buildings take the tint, and windows and lamps light from dusk to dawn; house window art exists; wire it in (R3, Calendar);
  - automatic skins, dots at city zoom and the town from district zoom inward, with 15% hysteresis and 150 ms cross-fades, keeping the manual override (R3);
  - the follow-cam at 5–6×, with a thought panel synced to the inspector (R3);
  - optional: a human character sheet for Skin C as an opt-in variant, with appearance redrawn at every birth, never inherited (R3).
- **Owner decision first:** whether the optional human sheet survives content rule 1's one shared blob body; round 3 tied it to M1's playtest of the blob cast.
- **Verify first:**
  - the canonical licence pages for Ninja Adventure, Kenney and LimeZu, and Mana Seed's AI clause, which decide the packs to commit, buy or drop;
  - tick and frame times on a mid-range Android phone and an iPhone, which decide device tiers and the phone framebuffer path.
- **Exit checks:**
  - outlines clear 3:1 against every walkable tile by day (round 3's yellow body, now the sun hue, needs none at night; M1.3 sets the night rule for the other five), skin switches drop no frame, and the framebuffer path is pixel-exact at a device pixel ratio of 3 (R3, R8);
  - windows and lamps light only from dusk to dawn, and every body hue clears 3:1 against every walkable tile in every light period, by its outline or its fill (Calendar).
