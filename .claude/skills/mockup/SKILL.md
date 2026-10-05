---
name: mockup
description: Draw or revise pixel-art concept mockups for Nomos with the Pillow generator in docs/mockups/generator, following the art direction (one shared blob body, crime as an act, original art and CC0 tiles only). Use when the user asks for a mockup, concept image or picture of a screen or zoom level.
---

# Mockups

- **Generator:** `docs/mockups/generator/` holds:
  - `pix.py`: palette, ASCII sprites, outlines and a pixel font;
  - `chars.py` and `blobs.py`: characters;
  - `town.py`, `city.py`, `country.py` and `ladder.py`: one script per image.

  The scripts need Pillow, and the town tiles need the CC0 Ninja Adventure pack; `tiles.py` says where to get it.
- **Canvas:** draw at native 320×180 with 16-px tiles, then upscale 3× nearest-neighbour to 960×540. Ship native-resolution sprites in the product.
- **Palette:**
  - body #F7C948, police #283A7C, merchant #2A9D8F;
  - red and orange only for crime alerts;
  - a 1-px dark outline on characters by day.
- **Rules:** follow `.claude/rules/content.md`:
  - no Pokémon assets or names;
  - jobs are clothes;
  - crime is an act, not a costume;
  - records stay at institutions.
- **Provenance:** record every tile and sprite source in `docs/mockups/SOURCES.md`.
- **Before committing:** look at the result at full size and in zoomed crops. Check that no labels overlap and that the HUD numbers match the caption. Then commit the PNG and the script change as separate commits.
