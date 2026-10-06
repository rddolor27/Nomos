# Mockup sources and captions

Concept mockups for the browser society simulation, in a GBA/DS-era top-down pixel-art style. The four map images are PNG, 960×540. Each was drawn at a native 320×180 and scaled 3× with nearest-neighbour, so there is no blur: every native pixel is an exact 3×3 block. The scale ladder is a 1440×400 strip built from crops of three of them.

| File | What it is |
|---|---|
| `town_closeup.png` | Image 1: town close-up, the "lab mode" (zoomed-in) view, with human characters |
| `town_closeup_blobs.png` | Image 1b: the same close-up, with every agent drawn as one shared blob body |
| `city_zoomed_out.png` | Image 2: the whole city zoomed out, the "city mode" view |
| `country_map.png` | Image 3: one region of the country, the "region view" |
| `scale_ladder.png` | Image 4: the zoom from region to city to street, as one strip |
| `sprites_showcase.png` | Image 5: one town scene built only from the original sprites in `assets/sprites/`, drawn at 320×180 and scaled 3× by `tools/sprites/showcase.py`; no third-party art |
| `wonders_showcase.png` | Image 6: a wild landscape of the natural wonders on the shore, meadow and tree scenery, built only from the original sprites in `assets/sprites/`, drawn at 480×270 and scaled 2× by `tools/sprites/showcase_wonders.py`; no third-party art |
| `landmarks_showcase.png` | Image 7: a coastal town of the built landmarks, made the same way by the same script; no third-party art |
| `random_world_country.png` | Image 8: a random country from seed `09f02ffe`, an archipelago with seven natural wonders, drawn as the Country view (8-px tiles, scaled 2×) by `tools/worldgen/generate.py` from the original sprites; no third-party art |
| `random_world_region.png` | Image 9: the same world's Region view around the capital (16-px tiles, scaled 2×), made the same way |
| `random_world_capital.png` | Image 10: the same world's coastal capital zoomed in, with randomly styled houses and people with random looks (scaled 2×), made the same way |
| `random_world_dune.png` | Image 11: the same world's dune wonder with an oasis and visitors (scaled 2×), made the same way |
| `blob_looks.png` | Image 12: the same world's first 48 people, each with a random hue, eye shape and pattern, turned four ways so the patterns show (scaled 3×), made the same way |

## Captions

**Image 1: town close-up (lab mode).** This is one town block at a native 320×180 px (16×16 tiles, 20×11 visible), scaled 3×. A merchant in a striped apron and headband sells to a buyer at the MARKET counter (a "$" bubble and a coin in flight). Nearby, a citizen in the stealing state sneaks away. They have the same body and clothes as everyone else and differ only by the crouched pose and the loot sack, and the lab-mode inspector tags them STEALING. A police officer outside the station has spotted them, shown by a "!" bubble and a dotted line of sight. Other citizens walk in all four directions, one dozes on a bench ("Zz") and one is hungry. The HUD shows Day 12 · 08:40 and today's thefts: 9 true against 4 recorded.

**Image 1b: town close-up, blob-body variant (lab mode).** This keeps Image 1's scene, layout, HUD, emotes, STEALING tag and dotted line of sight, but all 12 agents share one warm-yellow blob body with simple white eyes, so no skin tone, hair or face shape can correlate with role. Jobs are shown only by accessories: police wear a navy peaked cap with a gold badge, and the merchant wears a vermillion headband and waist apron (behind the counter only the headband shows). Citizens carry only neutral items or nothing: a scarf, satchel, straw hat or beanie. The stealing citizen is the same plain blob, recognisable only by the crouched pose, the loot sack and the tag.

**Image 2: city zoomed out (city mode).** This uses the same palette and dark-outline style, zoomed out so that one 16 px tile becomes 4 px. Buildings become roof-coloured blocks: striped awnings mark shops and slate roofs mark police stations. People become dots by role: a white dot for a citizen, a gold square for a merchant, a blue diamond for police, and a red ring around a citizen's dot when that citizen is currently stealing. A semi-transparent, banded heatmap shows true thefts concentrated on the market street. The dashed blue outline is an illustrative "recorded hotspot" around the police stations, to contrast true and recorded crime. The dashed white box labelled LAB MODE is the area shown in Image 1, and the dots inside it are the same 12 people at 1/4 scale.

**Image 3: region map (region view).** This shows one invented region, not a whole country: a 1.2M-person country would have hundreds of settlements, and this view names twelve. The region has a coastline and islands, a river running from the mountains to the sea, forests, hills, a lake and patchwork farmland. Each settlement's icon shows its scale. The capital, STONEGATE, is a walled cluster with a keep tower and flag. The three towns (MILLBRIDGE, SALTHAVEN, FELLWICK) are clusters of roofs, and the eight villages are pairs of huts. Beside each settlement is a paired crime bar: a red column for the true rate and a thinner blue column for the recorded rate, highest in the capital. Every settlement except MILLBRIDGE also carries an "EST." mark because its numbers are modelled. Roads link the settlements. Two caravans are on the move, a red "!" marks a highway robbery on the forest road near FELLWICK, and three migration bands run alongside the roads from villages to STONEGATE, MILLBRIDGE and SALTHAVEN. MILLBRIDGE keeps a gold outline and a LIVE tag: it is the one settlement whose agents are shown, aligned to the record (it is the town in Images 1, 1b and 2). The other settlements run as aggregates. The HUD reads "REGION VIEW · YEAR 3 · POP 310K". A red "VIEW: TRUE" chip marks the bars' red columns and the "!" as true-world cues. The HUD also shows this year's thefts: 48K true against 12K recorded, so about a quarter are recorded. The footer legend adds "CRIME: TRUE / RECORDED (EST. = MODELLED)" and "LIVE = AGENTS SHOWN, ALIGNED TO THE RECORD · OTHERS = AGGREGATE".

**Image 4: scale ladder.** Three panels, labelled REGION, CITY and STREET, show one simulation at three zoom levels. Each panel is a crop of `country_map.png` (the region view), `city_zoomed_out.png` and `town_closeup_blobs.png`, shown at 2× nearest-neighbour (two-thirds of their published 3× scale). A gold box and connector lines show each zoom step: MILLBRIDGE on the region map becomes the city panel, and the box inside the city's dashed frame becomes the street panel. In the ladder only, that frame's chip reads STREET instead of LAB MODE, because lab mode is a separate scenario. The captions underneath read "REGION VIEW: SETTLEMENTS", "CITY MODE: AGENTS AS DOTS" and "STREET: AGENTS AS SPRITES".

## Third-party assets (CC0)

All third-party art comes from one pack: the **Superpowers "Ninja Adventure" asset pack by Pixel-boy (Sparklin Labs)**. It is CC0.

- Repository: https://github.com/sparklinlabs/superpowers-asset-packs
- Pinned commit: `e8674a03ab4456802f71f848c4df79eccca23f7a` (2019-09-21, "Fix font8x8.png inverted letters (N & M)")
- Author: Pixel-boy, for Sparklin Labs

| Asset (path in repo) | Pinned raw URL | Used for | Changes made |
|---|---|---|---|
| `ninja-adventure/background-elements/tileset.png` (448×640, sha256 `aa2708aa…f284a4`) | https://raw.githubusercontent.com/sparklinlabs/superpowers-asset-packs/e8674a03ab4456802f71f848c4df79eccca23f7a/ninja-adventure/background-elements/tileset.png | Images 1 and 1b, and the STREET panel of Image 4 (a crop of 1b). Tiles (column,row of 16 px): grass (14,16), grass with dry patches (13,16), grass with red flowers (16,16), paving (19,11); trees (0,10 2×2), (6,10 2×2), (2,9 4×3), (8,9 4×3); houses (0,0 4×3), (8,0 4×3), (4,0 4×3); tiled-roof hall (12,0 4×3) used as the police station; lantern (10,5 1×2), barrel (2,6), small wooden hut (12,6), well (5,6 1×2), fence (22,3), bush (0,6), flowers (1,8), (2,8) | Tiles cropped and placed. 4 pixel rows were inserted into each building's wall so the doors fit the 20 px characters. The police station's roof was recoloured to slate grey and its timber to navy. |
| `ninja-adventure/items/food/fish.png` | https://raw.githubusercontent.com/sparklinlabs/superpowers-asset-packs/e8674a03ab4456802f71f848c4df79eccca23f7a/ninja-adventure/items/food/fish.png | Images 1 and 1b (and the crop of 1b in Image 4): goods on the shop counter | none |
| `ninja-adventure/items/food/onigiri.png` | https://raw.githubusercontent.com/sparklinlabs/superpowers-asset-packs/e8674a03ab4456802f71f848c4df79eccca23f7a/ninja-adventure/items/food/onigiri.png | Images 1 and 1b (and the crop of 1b in Image 4): goods on the shop counter | none |

### Licence evidence and how it was checked

1. **`LICENSE.txt` at the repository root** is the full **CC0 1.0 Universal** legal code. Its first line is "CC0 1.0 Universal" (sha256 `36ffd9dc…af39673`).
   https://raw.githubusercontent.com/sparklinlabs/superpowers-asset-packs/e8674a03ab4456802f71f848c4df79eccca23f7a/LICENSE.txt
2. **`README.md` at the repository root**, lines 9–14: "The assets in this repository are created at Sparklin Labs by Pixel-boy. They are released under the Creative Commons Zero (CC0) license. … You can use the assets found in this repository in your own games, even commercial ones. Attribution is not required but appreciated."
3. **`ninja-adventure/README.md`**: "Assets created by Pixel-boy for Superpowers supporters! See https://github.com/sparklinlabs/superpowers-asset-packs for license information and more assets!"

To check this, the repository was cloned with git at the pinned commit and the three files above were read. The tileset was also downloaded from the pinned raw URL, and its sha256 matched the cloned copy.

Pixel-boy's newer repository, https://github.com/pixel-boy/NinjaAdventure, has no licence file, so nothing was taken from it.

## Original art (drawn for this mockup)

Everything else is original, drawn programmatically in Python with Pillow for this mockup:

- **Characters**:
  - All characters share one 16×20 body with 4 directions plus walk, sit, sleep and crouched-sneak poses.
  - Appearance is varied: 5 hair styles, 6 skin tones, and shirt and trouser colours. It is assigned independently of role.
  - The police cap, badge and navy uniform, and the merchant's headband and long striped apron, are original.
  - The loot sack is original.
- **Blob characters (Image 1b)**:
  - Every agent uses one shared body: a 16×16 warm-yellow blob (`#F7C948`) with a 1 px dark outline and Primer-style eyes (white with dark pupils).
  - The body has stand, squashed walk, sit/sleep and crouched-sneak poses.
  - Role accessories: a navy peaked cap with a gold badge (police), and a vermillion headband and waist apron (merchant).
  - Citizens' neutral items: a cream scarf, charcoal satchel, straw hat and grey beanie. These use low-saturation colours so they never compete with the blue and vermillion role colours.
- **Emotes and props**:
  - Emote bubbles: "!", "$", "Zz" and hungry.
  - The coin and the dust puffs.
  - The shop awning, the counter, benches, the blue police lamp, and the "POLICE" and "MARKET" sign plates.
- **Ground**: the sand paths, pebbles and path/grass edge rims.
- **Interface**:
  - A 3×5 pixel font (uppercase, digits, punctuation).
  - The HUD strip with true/recorded bars, the mode chips, the STEALING state tag and the dotted line of sight.
- **Image 2**: entirely procedural. This covers the map, roads, river, bridges, fields, building blocks, trees, the agent dots, the heatmap, the recorded-hotspot outline and the legend. Its colours are sampled from the CC0 tileset's palette so the two views match.
- **Image 3**: entirely procedural, and it uses no tiles.
  - Terrain: the coastline and islands come from value noise. The river, lake, mountains with snow caps, hills, forests, farmland with hedgerows, the pier and the sailboat are all drawn.
  - Overlays: the settlement icons (huts, town cluster with hall, walled capital with keep and flag), roads and bridges, caravan wagons, the "!" robbery marker, paired true/recorded crime bars with "EST." marks, migration bands that follow the roads, the LIVE outline and tag, the place-name labels, the HUD with its "VIEW: TRUE" chip, and the footer legend.
  - The region and all place names are invented. They avoid Pokémon region shapes, landmarks and town names, and also generic words that are Pokémon professor names.
- **Image 4**: an assembly of the project's own images. It uses crops of the three PNGs above, plus original frames, zoom boxes, connector lines and labels in the same 3×5 pixel font. The CITY panel is taken from a re-render of `city_zoomed_out.png` by the same script, identical except that the chip reads STREET. The published `city_zoomed_out.png` is unchanged. Image 4 adds no new third-party art.

## Exclusions and notes

- No Pokémon, Nintendo or Game Freak material is used anywhere. That means no ripped sprites, logos, Poké Balls, Pokémon characters, or Pokémon Center or Poké Mart building designs. "Like Pokémon" here means only the genre's top-down overworld look.
- The generator scripts and the downloaded pack are kept outside this folder, in the session scratchpad (`…/scratchpad/mockup/`: `pix.py`, `chars.py`, `blobs.py`, `tiles.py`, `town.py`, `city.py`, `country.py`, `ladder.py`). Image 1b is rendered by `town.py --blob`. Image 4 is built by `ladder.py` from the published PNGs in this folder.
- The `previews/` folder and `cc0_asset_previews.png` in this directory were produced separately. They are not used in these images.
