# Sprites

Original pixel art for Nomos, drawn as code. Each module draws one category with `spritekit.py` and writes `assets/sprites/<category>.png`, a `<category>.json` manifest and a labelled preview in `assets/sprites/previews/`.

- Build one category: `python tools/sprites/<category>.py`
- Build everything: `python tools/sprites/build_all.py`
- Check everything: `python tools/sprites/test_sprites.py`
- Draw a town scene from every category: `python tools/sprites/showcase.py` writes `docs/mockups/sprites_showcase.png`

## Style

- GBA-era top-down pixel art in three-quarter view: you see the top and the front of buildings, as in `docs/mockups/town_closeup_blobs.png`.
- Native resolution on a 16-px tile grid. Never scale in the source; the renderer zooms in integer steps.
- Only the colours in `spritekit.PALETTE` (at most 64), with no partial alpha. `Sheet.add` rejects anything else.
- Body hues are cosmetic: six abstract colours (`spritekit.BODY_HUES`), never skin tones, assigned at random and never read by any sim rule.
- Light comes from the top left: highlight the upper left, shade the lower right.
- Characters, animals, buildings and props get a 1-px `OUTLINE` ring, like the mockup tiles.
- Every person is the one shared blob body in `characters.py`, with event faces and job items as overlays on the same 18×22 canvas (ground on row 20). Draw body, then face, then job item at one anchor; each body frame's `face` field gives the face offset for that pose.

## Art direction

- No Pokémon or other copyrighted art, names or creature-like designs. Animals look like real animals, with small dot eyes. Draw everything fresh; never trace or recolour existing art, CC0 packs included.
- Wealth never shows in houses. The map picks house styles at random, so no style may read as richer or poorer: no gold trim, no ruined or patched variants, equal care in every style. Size follows household count and density, never wealth.
- Crime is an act, never a costume: no masks, stripes or other marks of a "criminal".
- Job items go on the head or in bands across the body. A blob is all face, so a panel under the eyes reads as teeth or a mask. Check every job item on all six hues.
- Culture shows in things such as emblems, banners, dishes and festival props, never on bodies or clothes. Emblem colours are mid tones, unlike the pastel body hues, and avoid the police navy, the merchant teal and the reds and oranges that round 3 keeps for crime.
- Police iconography stays neutral: no weapons, flags or heroic poses.
- No role wears black. `OUTLINE` is for outlines only, never a fill.
- Buildings use generic names (Clinic, Market, Police Station, Town Hall), and signs use pictograms rather than words. The Clinic never uses a red cross, which is a protected emblem.

## Naming and layout

- Names are lowercase, with underscores between parts and hyphens inside a part: `cow_walk_down_0`, `house_cottage_roof-slate`, `crop_grain_ripe`.
- Directions are `down`, `up`, `left` and `right`; `right` may mirror `left`.
- Anchors default to the bottom centre, the ground point used for y-sorting. A building anchors at the bottom centre of its footprint.
- Footprints are whole tiles. Small animals fit 16×16 and large animals 24×24.

## Provenance

Every PNG and JSON file is listed in `assets/LICENSES.md` with its generator, licence and SHA-256.
