# M1.3 Skin B blobs

Part of [M1 Lab mode](../milestone.md).

- **Already done:**
  - the blob sheet on an 18×22 canvas, not 16×24 cells: stand, walk, sit and sneak frames in four views, six faces, the navy police cap with badge, a teal headband and sash for merchants in place of the apron, and builder, clinic, farmer and soldier items in place of four neutral citizen items (R3);
  - the first bubbles, as original 12×12 art rather than 16×16, so the Kenney placeholders are not needed: "!", "?", coin, "Zz" and bread, plus heart and sweat (R3).
- **Builds:**
  - the carry and cheer frames, still missing from the blob sheet (R3);
  - the sprite pass: atlas cells from outfit, direction and frame, facing and walk frame from interpolated velocity, depth-test y-sorting, face overlays and staggered blinks; art exists; wire it in (R3);
  - the bubble pass: one bubble per agent, four to six on screen, priority justice > crime > economy > needs > mood, overflow to a ticker and a log line per bubble; art exists; wire it in (R3);
  - Skin B staged on the flat zone map: up to 40 agents, at most four protagonists with Primer-style wallet and hunger bars that ride with the sprite, and charts linked to the animation (R1, R3); wallet bars stay on lab cards, labelled lab-only, and never appear in city or town skins outside the wealth lens (R6);
  - faces driven by lab rules (angry eyes on a refused price, happy on a purchase, a wince and "?" on a victim), and takes shown only as acts: a sneak and the item hopping from victim to taker, with no thief bubble, sack, mask or colour; art exists; wire it in (R3);
  - Skin B under M1.2's light periods: the tint covers the flat zone map, bodies stay untinted, and a hue gets a night outline colour only if it falls below 3:1 against the night ground (R3, Calendar);
  - reduced motion: no hops, bobs or pans, 150 ms fades, camera cuts and static rings (R3).
- **Needs:** M1.1's engine events, M1.2's light periods, M0.3's visual word and action states, M0.4's renderer and skin switch, and M0.5's atlas stub and sprite manifest.
- **Verify first:** whether novices read the roles and bubble glyphs, colour-blind players tell the palette apart, and a diverse panel finds the blob cast fair. These decide the visual vocabulary.
- **Exit checks:**
  - the body layer is byte-identical across roles, a 40-agent card never shows more than six bubbles, and a reduced-motion golden run contains no hops or pans (R3);
  - every body hue clears 3:1 against the tinted ground in every light period, by its outline or its fill (Calendar).
