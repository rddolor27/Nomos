# Sprites

Original pixel art for Nomos, drawn as code. Each module draws one category with `spritekit.py` and writes `assets/sprites/<category>.png`, a `<category>.json` manifest and a labelled preview in `assets/sprites/previews/`.

- Build one category: `python tools/sprites/<category>.py`
- Build everything: `python tools/sprites/build_all.py`
- Check everything: `python tools/sprites/test_sprites.py`
- Draw a town scene from every category: `python tools/sprites/showcase.py` writes `docs/mockups/sprites_showcase.png`
- Draw the wonders: `python tools/sprites/showcase_wonders.py` writes `docs/mockups/wonders_showcase.png` (natural wonders) and `docs/mockups/landmarks_showcase.png` (built landmarks)
## Style

- GBA-era top-down pixel art in three-quarter view: you see the top and the front of buildings, as in `docs/mockups/town_closeup_blobs.png`.
- Native resolution on a 16-px tile grid. Never scale in the source; the renderer zooms in integer steps.
- Only the colours in `spritekit.PALETTE` (at most 64), with no partial alpha. `Sheet.add` rejects anything else.
- Body hues are cosmetic: six abstract colours (`spritekit.BODY_HUES`), never skin tones, assigned at random and never read by any sim rule.
- Light comes from the top left: highlight the upper left, shade the lower right.
- Characters, animals, buildings and props get a 1-px `OUTLINE` ring, like the mockup tiles.
- Every person is the one shared blob body in `characters.py`, with patterns, event faces and job items as overlays on the same 18×22 canvas (ground on row 20). Draw body, pattern, face, then job item at one anchor; each body frame's `face` field gives the face offset for that pose.

## Art direction

- No Pokémon or other copyrighted art, names or creature-like designs. Animals look like real animals, with small dot eyes. Draw everything fresh; never trace or recolour existing art, CC0 packs included.
- Wealth never shows in houses. The map picks house styles at random, so no style may read as richer or poorer: no gold trim, no ruined or patched variants, equal care in every style. Size follows household count and density, never wealth.
- Crime is an act, never a costume: no masks, stripes or other marks of a "criminal".
- Job items go on the head or in bands across the body. A blob is all face, so a panel under the eyes reads as teeth or a mask. Check every job item on all six hues.
- Looks are cosmetic: hue, eye shape and pattern are drawn independently at random at birth, never inherited and never read by the sim, so no look marks a group, a status or a mood. Every eye shape is open and calm. Patterns are tone-on-tone marks in the body's light tone, kept off the face and lower face, with no stripes or emblem motifs.
- Culture shows in things such as emblems, banners, dishes and festival props, never on bodies or clothes. Emblem colours are mid tones, unlike the pastel body hues, and avoid the police navy, the merchant teal and the reds and oranges that round 3 keeps for crime.
- What a blob buys is a separate 8×8 item shown over the body at the frame's `hold` point: one frame for every hue, so no item says what its carrier earns, and no sack, which reads as a crime costume. Eating swaps the resting face for `face_chew_0` and `face_chew_1`, the same round eyes over a mouth that shuts and opens, and moves the item to the mouth: the loop runs the `eat` positions 0, 1, 2, 1 under the faces 0, 1, 0, 1.
- Stock pips, `pip_stock_0` to `pip_stock_3`, hang over a premises: three 2×2 beads lit bottom left, bottom right, then top, with the unlit beads showing the capacity.
- Police iconography stays neutral: no weapons, flags or heroic poses.
- Soldiers defend and patrol the roads and never police towns, so nothing about them reads as police. Their job item is a steel kettle hat and a leather baldric slanting to a sheathed sword, in steel and leather only: no police navy, merchant teal, crime red or culture colour. Weapons stay sheathed or shouldered, and nothing military carries a flag, banner or heraldry.
- No role wears black. `OUTLINE` is for outlines only, never a fill.
- Buildings use generic names (Clinic, Market, Police Station, Town Hall), and signs use pictograms rather than words. The Clinic never uses a red cross, which is a protected emblem.

## Seasons

Nothing is redrawn per season. `seasons.py` writes `assets/sprites/season_map.json`, which tells the renderer what each 28-day season changes:
- **Palette swaps:** `GRASS_L`, `GRASS` and `LEAF_D` swap to spring, autumn or winter colours, only on the sprites listed under `recolour`, so green roofs, flower boxes and icons keep their colours. Ground and foliage swap separately: autumn ground turns olive, so roads keep their contrast, and autumn leaves take the gold of `tree_autumn`.
- **Sprite swaps:** deciduous trees go bare in winter, and the blossom and autumn trees show their colours only in their own season.
- **Snow:** in winter, on places no warmer than `max_temperature`, snow tiles lie over grass, sand, soil and crops. Cover runs light, then full, then patchy over the season. Roads only ever get light snow, so the streets stay readable. Conifers swap to `tree_conifer_snow`, and every sprite with a `snow` field draws that overlay.
- **Roof snow:** houses get one overlay per shape and style, which fits every roof colour. Buildings and military set pieces are drawn again under `buildings.snowfall()`, and the pixels that change become `<name>_snow`. The lowest eave row keeps the roof's own colour.
- **Season icons:** the HUD icons are one tree through the year, never a sun, leaf or flower, because those are culture emblems.

## Naming and layout

- Names are lowercase, with underscores between parts and hyphens inside a part: `cow_walk_down_0`, `house_cottage_roof-slate`, `crop_grain_ripe`.
- Directions are `down`, `up`, `left` and `right`; `right` may mirror `left`.
- Anchors default to the bottom centre, the ground point used for y-sorting. A building anchors at the bottom centre of its footprint.
- Footprints are whole tiles. Small animals fit 16×16 and large animals 24×24.

## Manifest fields

Every frame has `x`, `y`, `w`, `h` and `anchor`. Some carry more:

| Field | Meaning |
|---|---|
| `footprint` | Tiles a building or set piece occupies, `[w, h]` |
| `door` | Pixel where people enter a house |
| `joins` | Edges that tile seamlessly with a neighbour: `lr`, `l` or `r` |
| `layer` | `ground` draws with the terrain, under people (bridges, steps, snow tiles); `night` is a lit overlay and `snow` a winter one; characters use `body`, `pattern`, `face` and `job` |
| `night` | Name of the overlay drawn over this sprite after dark |
| `snow` | Name of the overlay drawn over this sprite while snow lies |
| `overlay` | A map icon that rises into the tile above, so draw it after that row |
| `corners` | Shore autotile key: land (1) or water (0) at nw, ne, sw, se. A land cell takes `_<side>` from water on that side, `_<corner>-outer` from water on two sides, and `_<corner>-inner` from water on one diagonal |
| `target` | The icon a highlight ring belongs to |
| `view` | `true` for marks shown only in the true view, such as true-crime pins |
| `colour` | The culture colour an emblem or banner carries, for the culture lens |
| `cord_row` | Row where festival strips hang, so any strips join |
| `hitch` | Point where a cart hitches to its animal |
| `hold`, `eat` | On a body frame that carries an item, the top-left pixel of the item's 8×8 sprite, and on standing frames its three positions while eating; the item is drawn unflipped, so a right frame holds its own point. Facing up, sitting and sneaking carry none. Written by `characters.build(holds=True)`, which waits until the manifest schema names them |
| `face`, `hue`, `pose`, `facing`, `frame`, `job`, `eyes`, `pattern` | Character metadata; `face` is the offset for face overlays, `eyes` the eye shape of a resting face |
| `review_only` | Review strips, never drawn in the game |

## Provenance

Every PNG and JSON file is listed in `assets/LICENSES.md` with its generator, licence and SHA-256.
