# 2D game look: art direction and assets

Oct 5, 2026 · @Rd

## Bottom line

Borrow Pokémon's grammar, never its pixels: its 16-pixel tiles, walk cycles, "!" bubbles, roof-and-sign buildings and light periods, rebuilt from CC0 and original art. Build the look as three switchable skins over one small renderer, so dots, blobs and a pixel-art town are a setting rather than a fork.

- **Skins:** coloured dots from M0 for city mode and debugging, Primer-style blobs from M1 for lab cards, and a pixel-art town from an LDtk map and CC0 tiles from M3. All three read one 12-byte snapshot per agent: x, y and a 32-bit visual word.
- **Characters:** one shared, non-human blob body for everyone; jobs are removable caps and aprons; crime shows only as an act. Pokémon codes criminals by costume (the Burglar's sack, Rocket uniforms), which is exactly the cue the true-versus-recorded lesson argues against.
- **Palette** (own computation): yellow body #F7C948, navy police #283A7C, teal merchant #2A9D8F, with red and orange reserved for crime alerts; a 1-pixel dark outline on characters is mandatory by day.
- **Renderer:** a 3.6 KB custom WebGL2 prototype drew 10,000 animated, y-sorted agents in 0.3 ms of main-thread time per frame, against 17–19 ms for sorted PixiJS or Phaser 4 sprites (own measurement, software rendering).
- **Assets:** the CC0 Ninja Adventure and Kenney packs cover the town and can be committed to the MIT repo. No CC0 pack found has a police station, jail, officer or handcuffs, so those become recolours or original art; paid packs stay out of the public repo.
- **Legal** (not legal advice): apart from the Palworld patent suit, every Nintendo action found from 2016 to 2026 involved Pokémon names or marks, copied assets or a mimicked logo, so the look itself is the lowest-risk part.
- **Effort:** about 29–45 developer-days on top of the existing plan (unsourced estimate); the checklists are merged into the Implementation plan tab.

**Evidence:** GitHub, npm and PyPI opened, including the community decompilations of the GBA and DS games; itch.io, kenney.nl and most publishers were blocked. Licence wording from those sites and several statistics therefore come from search summaries, and every renderer timing was taken under software rendering.

## Concept mockup

This is what the dot society could look like in a GBA-era top-down style, built from CC0 tiles and original characters with no Pokémon material. Both images are drawn at 320×180 and scaled 3×.

![Town close-up: a market, a police station, an officer spotting a theft, and a true-vs-recorded thefts counter](../../mockups/town_closeup.png)

**Town close-up (lab mode).** Twelve characters: eight citizens, a merchant at the market counter, two officers, and one citizen in the stealing state, shown by a crouched pose and a loot sack rather than a costume. The officer's "!" marks a spotted theft, "$" marks a purchase, and the HUD counts 9 true thefts today against 4 recorded.

![City view: role-coded dots, roof-coloured buildings, a heatmap of true thefts and a dashed recorded hotspot](../../mockups/city_zoomed_out.png)

**City view (city mode).** At a quarter of the zoom, people become role-coded dots (citizen dot, merchant square, police diamond, red ring for stealing) and buildings become roof-coloured blocks. The heatmap shows true thefts over 7 days; the dashed blue outline is where records place the hotspot, invented here for illustration, and the dashed box marks the close-up's area.

![The same town with every character as one shared yellow blob, roles shown only by a cap or headband](../../mockups/town_closeup_blobs.png)

**Blob-body variant (recommended).** The same scene, but all 12 characters share one warm-yellow blob body with simple eyes, in the spirit of Primer's blobs. Police wear a navy peaked cap and the merchant a vermillion headband; citizens carry only a scarf, satchel, hat or nothing, and the stealing citizen is a plain blob, crouched, with a sack. No skin tone, hair or face shape can correlate with role, which the human version above can only avoid by careful casting.

Credits: tiles from Pixel-boy's Ninja Adventure pack, CC0, via [sparklinlabs/superpowers-asset-packs](https://github.com/sparklinlabs/superpowers-asset-packs); characters, emotes, font and HUD were drawn for this mockup.

## Asset packs

Two CC0 sources, Ninja Adventure and Kenney, cover most of the town and can be committed to the MIT repository with no conditions; no CC0 pack found covers the justice system. Because every agent shares one blob body, character packs matter far less: police and merchants become two accessory overlays on original sprites.

![CC0 asset previews: Kenney RPG Urban Pack tiles, a Ninja Adventure villager walk sheet and the Kenney Emotes pack](../../mockups/cc0_asset_previews.png)

| Source | Role in the project | Licence | Public MIT repo? | Cautions |
| --- | --- | --- | --- | --- |
| [Ninja Adventure](https://github.com/rinn7e/ninja-adventure-indigo/blob/master/assets/Ninja%20Adventure%20-%20Asset%20Pack/README.md) (Pixel-boy & AAA) | Base tileset: houses, market stalls, props, a fence for a jail yard, dialog UI; villagers as placeholders | CC0 1.0 | Yes | Leave out culturally specific tiles (torii gates, dojos); keep its licence file beside it |
| Kenney Roguelike Modern City, RPG Urban Pack, Tiny Town ([mirror](https://github.com/ETdoFresh/kenney.nl)) | Modern alternative: roads, crosswalks, a grocery store, cars, a park, six walking characters | CC0 | Yes | Tiny Town's own licence file was not seen, only a mirror-wide CC0 notice; re-index if mixed with Ninja Adventure |
| Kenney Emotes Pack | Placeholder bubbles: "!", "?", "$", zZ, anger | CC0 | Yes | Replace with the project's own glyphs by M1 |
| [Universal LPC generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | Not recommended: 64×64 frames from the 32-pixel family | Per file: CC0, OGA-BY, CC-BY, CC-BY-SA or GPL | Yes, with credits | 2,047 of 13,915 credit rows are copyleft-only (own count) |
| LimeZu Modern Exteriors ($5) and Interiors (from $1.50) | Optional police-station and jail themes | Custom: use allowed, no redistribution, credit required, no AI training (search summary) | No | Private submodule or a CI fetch with a secret |
| Mana Seed | Excluded | Custom: reportedly no use alongside any AI-generated assets, including code (search summary) | No | Conflicts with an AI-assisted codebase |
| PixelLab, Retro Diffusion | Drafting variants, cleaned up by hand | You own the output and may sell it; PixelLab bars training other models (search summary) | Yes, labelled CC0 | Never prompt with Pokémon |

- **Licence mechanics:** keep art and code apart. The code is MIT, each pack's licence file sits beside its files, and `assets/LICENSES.md` records the author, a commit-pinned source URL, the licence, a SHA-256 hash and any edits for every file. Share-alike and GPL reach only adapted art, not the MIT code (the team's reading), and packing sprites into an atlas is a format change.
- **Mixing:** Ninja Adventure, Kenney, LimeZu's 16-pixel set and Time Fantasy share a 16-pixel grid; LPC, PIPOYA and Cainos are 32-pixel. Ninja Adventure is warm and dark-outlined while Kenney's city is cooler, so a mix likely needs re-indexing to one 32-colour master palette.
- **Avoid** packs sold as "Pokémon-like" (their selling point is resemblance), and treat Tuxemon, an open-source Pokémon-like game, as study-only.

Caveat: the files examined came from third-party GitHub mirrors, because kenney.nl, itch.io and OpenGameArt were blocked, so read the canonical download and licence pages before committing anything.

## Art direction

Keep Pokémon's tiles, walks, bubbles and clock, but invert the two conventions that encode crime: the Burglar's costume and the policeman who appears only at night. With one body for everyone, only actions can look criminal.

**Borrow** (from the [pret decompilations](https://github.com/pret/pokeemerald) of the GBA games, opened; numbers only, never their graphics):

- 16×16 map tiles on a 240×160 GBA screen, with most townspeople drawn as 16×32 frames.
- Walk sheets with south, north and west drawn and east mirrored, played step–stand–step–stand in 8-frame beats.
- A 16×16 "!" that hops into place 16 px above the head and holds about 1 s; trainers see 1–7 tiles straight ahead (median 2–3, own count).
- HeartGold's five light periods, and buildings signalled by roof colour plus a sign.

**Bend:** tile-locked movement (path on the grid but draw smooth positions snapped to whole pixels), the player-centred camera (free pan plus a follow-cam), world-freezing "!" scenes (bubbles never block and are capped), night-only police (patrol schedules come from data) and crime as costume.

**Seven rules for every skin:**

1. One body in one non-realistic colour for everyone: no hair, age, gender or ethnic dress.
2. Jobs are clothes (cap and badge, apron), taken off at home.
3. Crime is an act: no mask, stripes, sack, black clothing or lasting icon; the stolen item rides with the taker in the true view only.
4. Records are paper: reports and ledgers live at institutions, never as marks over heads.
5. Wealth is not appearance: no shabby bodies, clothes or houses by default.
6. Police iconography is neutral: no weapons, flags or heroic poses, and wrongful stops are drawn as heavily as arrests.
7. No luminance morality: no role wears black.

These rules are inferences from the evidence rather than tested results. The shooter-bias and suspect-morphing studies behind them were seen only through search summaries.

**How many on screen.** At 1080p with 16-pixel tiles, 2× shows 2,025 tiles, 3× 900 and 4× 506. Viewers track about four moving objects (search summary), so town views should hold about 8–40 agents, at most four named protagonists and four to six bubbles at once; a 10,000-agent city looks like Pokémon only through a window, via semantic zoom.

**Palette** (own computation; ground colours are the art research's assumed tiles):

| Body / police / merchant | Smallest colour difference, ΔE (normal / protan / deutan / tritan) | Body vs night grass | Verdict |
| --- | --- | --- | --- |
| Primer blue #3E7EA0 / navy #1F2A6B / amber #E69F00 | 32 / 32 / 30 / 30 | 2.55:1 | Workable, weak at night |
| Yellow #F7C948 / navy #283A7C / vermillion #E34234 (mockup as drawn) | 42 / 39 / 27 / 37 | 7.28:1 | Merchant collides with crime red |
| **Yellow #F7C948 / navy #283A7C / teal #2A9D8F** | **43 / 34 / 39 / 33** | **7.28:1** | **Adopt** |

By day the yellow body reaches only 1.06:1 on sand and 1.73:1 on grass, so a 1-pixel near-black outline on characters and bubbles is mandatory. Shape-coded dots need to be about 5 px across, because at 3 px a circle and a diamond rasterise to the same plus sign.

**Event glyphs.** One glyph per event, the same in the bubble, chart marker, legend and log: "!" for a witness, "?" for a victim, a clipboard for a report, a handcuff ring for an arrest, bars for jail, a coin for a purchase, and bread, a sweat drop, an empty purse and "Zz" for needs. A theft itself has no bubble: the taker sneaks and the item hops from victim to taker. Two mockup fixes follow: swap the thief's sack for the stolen item, and the merchant's red for teal.

## Rendering and tools

Sprites don't reopen the engine question: one custom WebGL2 renderer draws all three skins, and one LDtk map file feeds both the simulation worker and the renderer.

| Renderer | 10k agents | 25k | 100k | Code (gzip) |
| --- | --- | --- | --- | --- |
| Custom WebGL2: instanced, GPU interpolation, depth-test y-sort | **0.3 ms** | 0.6 ms | 2.3 ms | **3.6 KB** |
| [PixiJS](https://github.com/pixijs/pixijs) 8.22 sprites, y-sorted | 18.8 ms | 45.9 ms | 298 ms | 107–215 KB |
| PixiJS ParticleContainer, unsorted | 2.9 ms | 4.9 ms | 143 ms | within PixiJS |
| [Phaser](https://github.com/phaserjs/phaser) 4.2.1 sprites, depth-sorted, GPU tilemap | 17.2 ms | 42.2 ms | 231 ms | 273–371 KB |
| Canvas2D, culled to the viewport | 0.4 ms | 0.9 ms | 3.8 ms | — |

Median main-thread time per frame, measured by the research team in headless Chromium with software WebGL on a 4-vCPU Xeon: compare the rows, not the absolute frame rates. The Canvas2D row covers culled street views only.

- **Snapshot v1:** float32 x and y plus a 32-bit visual word (outfit, idle facing, a 3-bit action, emote, indoor and teleport flags, status flags), 12 bytes per agent or 120 KB per tick at 10k. Facing and walk frame come from interpolated velocity on the GPU, so determinism is untouched. Open decision: the 3-bit action field holds eight states, so sneak and carry must displace two of the rendering research's list.
- **Engines:** PixiJS's iOS context-loss issue [#12224](https://github.com/pixijs/pixijs/issues/12224) is still open, its ParticleContainer can animate frames but cannot sort, and @pixi/tilemap drew a 256×256 layer blank until split into 32×32 chunks. Phaser 4 has been stable since April 2026, but its GPU tilemap painted empty cells with the tileset's corner texel in the team's test, and its GPU sprite layer targets tweens rather than simulated motion.
- **Tilemap:** a tile-index texture read with `texelFetch` costs 512 KB for a 256×256 town with four layers. One 2048² atlas holds 4,096 tiles plus character frames and fits every phone (device share from a search summary).
- **Pixel-exact:** integer zoom in device pixels, texel and camera snapping and no CSS scaling. On phones, render a 0.19-megapixel framebuffer at one pixel per texel and blit it at integer scale, about 0.37 million fragments for the tile passes instead of about 6 million; this replaces round 2's pixel-ratio cap of 2 for the world layer.
- **Map editor:** [LDtk](https://github.com/deepnight/ldtk) 1.5.3 (MIT). An IntGrid layer becomes the walkability grid, entities mark homes, shops, the market, police station, jail and records office, and auto-layer rules draw the tiles. The worker reads it through a 340-byte reader with quicktype-generated types. [Tiled](https://github.com/mapeditor/tiled) 1.12.2 is the alternative: the editor is GPL, but your maps are your own data (the team's reading).
- **Sprites:** Aseprite's command line exports fixed-grid sheets with extrusion; LibreSprite (GPLv2), Pixelorama (MIT) and Piskel (Apache-2.0) are free. A fixed grid lets the shader compute atlas cells from outfit, direction and frame.
- **Town size:** Emerald's towns are 20×20 tiles, while 10k agents need about 256×256 with apartment blocks, 25k about 400² and 100k 800²–1,024². Hand-author 256² and generate larger cities from prefab blocks on a seeded road grid.
- **Budget:** a production renderer of 800–1,200 lines and 6–10 KB gzip puts the library budget at about 39–43 KB, against about 144 KB with PixiJS.

| Zoom level | Skin | Tile on screen | Agents in view | Typical 1080p zoom | Shows |
| --- | --- | --- | --- | --- | --- |
| Z0 city | Dots | Under 6 CSS px | Any | 1× and below | Minimap, outlined role dots or a heatmap; charts lead |
| Z1 district | Town or blobs | 6 px or more | Up to about 500 | 2× | Sprites with accessories, static pins for crime and justice events |
| Z2 town | Town or blobs | 16 px or more | Up to about 40 | 4× at peak, 3× off-peak | Full sprites, faces, capped bubbles, signs, up to four named protagonists |
| Z3 follow-cam | Town or blobs | 16 px or more | The followed agent and neighbours | 5–6× | A thought panel and an inspector synced to the charts |

The renderer takes whichever of the tile-size and headcount rules gives the coarser level, with about 15% hysteresis and 150 ms cross-fades, and viewers can always override it.

## Legal

Copy the look, never the property: Nintendo's public actions target Pokémon names and marks, copied assets and mimicked logos, and none was found against a top-down pixel style alone. This summarises public notices, licence texts and press reports; it is not legal advice, and counsel should review the launch if the resemblance is deliberate.

| Date | Action | What it targeted |
| --- | --- | --- |
| Aug and Dec 2016 | Pokémon Uranium and Pokémon Prism taken down (search summary) | A Pokémon fan game and a ROM hack |
| Sep 2016 | [Game Jolt notice](https://github.com/gamejolt/dmca/blob/main/2016/2016-09-02-nintendo.md) listing 564 game pages (own count; press reported 562) | "the audiovisual work, music, fictional character depictions"; games found by content, e.g. "tall-grass" |
| Apr 2018 | [Game Jolt notice](https://github.com/gamejolt/dmca/blob/main/2018/2018-04-27-nintendo.md), 439 pages | The same |
| Aug 2018 | [GitHub notices](https://github.com/github/dmca/blob/master/2018/2018-08-30-Nintendo.md) against Pokémon Essentials mirrors | "characters, sprites, icons, music"; "Removal. No other changes are acceptable." |
| Dec 2020 | [Game Jolt notice](https://github.com/gamejolt/dmca/blob/main/2020/2020-12-29-nintendo.md), partly trademark (POKÉMON, US 2297050) | Pages using the mark in their titles |
| Sep 2024 onward | Palworld patent suit in Tokyo (search summary) | Mechanics, among them throw-to-summon and creature gliding; Pocketpair patched those out and the claims were later narrowed |
| 2026 | "The Poké Court" card shop renamed (search summary) | A "Poké-" name |
| 3 Sep 2026 | [GitHub notice](https://github.com/github/dmca/blob/master/2026/09/2026-09-03-nintendo.md) disabling 377 repositories of "animal-island-ui" | Copied Animal Crossing imagery and a logo "designed to mimic" Nintendo's |

Games openly inspired by Pokémon but built from original creatures, names and art, such as Temtem, Nexomon, Cassette Beasts and Coromon, sell on Nintendo's own eShop (search summary).

**Do and don't:**

- Copy, trace or recolour nothing from Nintendo, including the decompilation repositories; use them only for numbers such as frame timings.
- Keep "Pokémon", "Poké-" and creature names out of the title, repo and package names, domain, tags, store text, SEO, file names and code identifiers; Nintendo's 2020 notice matched page titles.
- Use generic buildings such as "Clinic", "Market", "Police Station" and "Town Hall", with no red-roofed healing centre bearing a ball emblem and no blue-roofed "Mart".
- Use an original or openly licensed pixel font and original or CC0 music, and no title screen or logo that echoes Pokémon's.
- Describe the style as "GBA-era top-down pixel art". A single factual README line naming Pokémon as an inspiration is low risk under nominative fair use (search summary), but leaving it out costs a free project little.
- In an open-source repo, one ripped sprite could take down every fork, so the name lint and asset ledger in M0 matter.

**AI-generated sprites:** under US law, prompt-only images are not copyrightable (the Copyright Office's January 2025 report; the Supreme Court declined *Thaler v. Perlmutter* on 2 March 2026; search summaries). Label unedited output CC0, edit by hand whatever you want to own, and never name Pokémon in a prompt.

## Changes to make

The visual layer adds work to every milestone, about 29–45 developer-days in all (unsourced estimate). The full checklists, tagged R3, are merged into the Implementation plan tab; this table is the summary.

| Milestone | Visual-layer deliverable | Exit check | Effort |
| --- | --- | --- | --- |
| M0 | Skin A dots, snapshot v1 with the visual word, the LDtk map in the worker, the integer-zoom camera, the skin switch, the asset ledger and CI checks | Skin A draws 10k agents in at most 1 ms per frame in CI; golden frames agree in three engines | 4–6 days |
| M1 | Skin B blobs: the sheet, faces, accessories, first bubbles, bubble caps, reduced motion and the IP gate | At least 8 of about 10 novices identify each role and glyph; the body layer is identical across roles | 6–9 days |
| M2 | Economy glyphs linked to the charts, and follow-the-money animation | Every economy event maps to one glyph | 1–2 days |
| M3 | Skin C: the LDtk town, tile and roof passes, the phone framebuffer, light periods, automatic skins and the follow-cam | One LDtk file drives walkability and tiles; 10k agents at 3× stay in budget, re-measured on phones | 8–12 days |
| M4 | Justice buildings and glyphs, the true-versus-recorded render filter, records off heads, and a police iconography audit | Nothing visual differs between agents who stole and agents who did not | 4–6 days |
| M5 | A wealth lens, fear and trust meters, and policy shown through places | No visual attribute correlates with wealth outside the lens | 1–2 days |
| M6 | A 100k heatmap, generated cities, Canvas2D for all skins, skins in share URLs, and a credits screen | 100k agents in budget; a generated map's hash is identical across engines | 5–8 days |

## Sources

101 links from this round, grouped by topic. Opened means read in full on GitHub, npm or PyPI; summary means seen only in search results, so check it before relying on it. Mockup and preview provenance is recorded file by file in the research folder's SOURCES.md and PREVIEWS.md.

**Pokémon conventions and crowd sizes**

- [pokeemerald defines.h](https://github.com/pret/pokeemerald/blob/master/include/gba/defines.h) · opened
- [fieldmap.h](https://github.com/pret/pokeemerald/blob/master/include/fieldmap.h) · opened
- [object\_event\_graphics\_info.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_graphics_info.h) · opened
- [object\_event\_pic\_tables.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_pic_tables.h) · opened
- [object\_event\_anims.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_anims.h) · opened
- [event\_object\_movement.c](https://github.com/pret/pokeemerald/blob/master/src/event_object_movement.c) · opened
- [pokeheartgold mmodel](https://github.com/pret/pokeheartgold/tree/master/files/data/mmodel/mmodel) · opened
- [pokefirered people](https://github.com/pret/pokefirered/tree/master/graphics/object_events/pics/people) · opened
- [trainer\_see.c](https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c) · opened
- [field\_effects.h](https://github.com/pret/pokeemerald/blob/master/include/constants/field_effects.h) · opened
- [pokefirered maps](https://github.com/pret/pokefirered/tree/master/data/maps) · opened
- [pokeemerald maps](https://github.com/pret/pokeemerald/tree/master/data/maps) · opened
- [gf\_rtc.c](https://github.com/pret/pokeheartgold/blob/master/src/gf_rtc.c) · opened
- [Pokémon Wiki](https://pokemon.fandom.com/wiki/Pok%C3%A9mon_Center) · summary
- [trainer\_see.h](https://github.com/pret/pokeemerald/blob/master/include/trainer_see.h) · opened
- [Bulbapedia: Police Officer](https://bulbapedia.bulbagarden.net/wiki/Police_Officer_%28Trainer_class%29) · summary
- [FBI 2024](https://hrc-prod-requests.s3-us-west-2.amazonaws.com/assets/images/Reported-Crimes-in-the-Nation-Quick-Stats.pdf) · opened
- [global.h](https://github.com/pret/pokeemerald/blob/master/include/constants/global.h) · opened
- [pokeemerald layouts](https://github.com/pret/pokeemerald/blob/master/data/layouts/layouts.json) · opened
- [pokefirered layouts](https://github.com/pret/pokefirered/blob/master/data/layouts/layouts.json) · opened
- [Alvarez & Franconeri](https://dash.harvard.edu/server/api/core/bitstreams/03b15edf-7de4-449c-9d80-8c80c53ccc96/content) · summary
- [Pelli & Tillman](https://www.cns.nyu.edu/~msl/courses/2223/Readings/Pelli-NatNeurosci2008.pdf) · summary
- [Pad semantic zoom (UMD HCIL)](https://www.cs.umd.edu/hcil/trs/2006-09/2006-09.htm) · summary

**Skins and rendering**

- [pixijs/pixijs](https://github.com/pixijs/pixijs) · opened
- [phaserjs/phaser](https://github.com/phaserjs/phaser) · opened
- [pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) · opened
- [pixijs-userland/tilemap](https://github.com/pixijs-userland/tilemap) · opened
- [TilemapGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/tilemaps/TilemapGPULayer.js) · opened
- [SpriteGPULayer.js](https://github.com/phaserjs/phaser/blob/master/src/gameobjects/spritegpulayer/SpriteGPULayer.js) · opened
- [OpenTTD zoom\_type.h](https://github.com/OpenTTD/OpenTTD/blob/master/src/zoom_type.h) · opened
- [Robertson et al.](https://dl.acm.org/doi/10.1109/TVCG.2008.125) · summary

**Art direction and fairness**

- [RWModdingResources](https://github.com/spdskatr/RWModdingResources/blob/master/artstyle.md) · opened
- [Prison Architect Wiki](https://prison-architect.fandom.com/wiki/Prisoner_Uniform) · summary
- [Sims Wiki](https://sims.fandom.com/wiki/Plumbob) · summary
- [Stardew Valley Wiki](https://stardewvalleywiki.com/Modding:Schedule_data) · summary
- [drawn\_market.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/drawn_market.py) · opened
- [drawn\_contest\_world.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/drawn_contest_world.py) · opened
- [constants.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/constants.py) · opened
- [burglar\_front\_pic.png](https://github.com/pret/pokefirered/blob/master/graphics/trainers/front_pics/burglar_front_pic.png) · opened
- [Atlas Obscura](https://www.atlasobscura.com/articles/decoding-the-classic-burglar-outfit) · summary
- [Correll et al. 2002](https://faculty.washington.edu/jdb/345/345%20Articles/Correll%20et%20al.pdf) · summary
- [Gilliam & Iyengar 2000](https://www.researchgate.net/publication/279714850_Prime_Suspects_The_Influence_of_Local_Television_News_on_the_Viewing_Public) · summary
- [Frank & Gilovich 1988](https://www.semanticscholar.org/paper/The-dark-side-of-self-and-social-perception:-black-Frank-Gilovich/673ae013bc538296b79325b69e08afcf3e2772e3) · summary
- [Jim Crow Museum](https://jimcrowmuseum.ferris.edu/question/2009/september.htm) · summary
- [UTS #51](https://unicode-org.github.io/unicode-reports/tr51/tr51.html) · summary
- [colorspacious](https://pypi.org/project/colorspacious/) · opened
- [Okabe–Ito in Bokeh](https://github.com/bokeh/bokeh/blob/HEAD/src/bokeh/palettes.py) · opened
- [WCAG 1.4.11](https://github.com/w3c/wcag/blob/main/understanding/21/non-text-contrast.html) · opened
- [WCAG 1.4.1](https://github.com/w3c/wcag/blob/main/understanding/20/use-of-color.html) · opened
- [WCAG 2.3.3](https://github.com/w3c/wcag/blob/main/understanding/21/animation-from-interactions.html) · opened
- [WCAG 2.3.1](https://github.com/w3c/wcag/blob/main/understanding/20/three-flashes-or-below-threshold.html) · opened
- [WCAG 2.2.2](https://github.com/w3c/wcag/blob/main/understanding/20/pause-stop-hide.html) · opened

**Legal**

- [Game Jolt DMCA 2016](https://github.com/gamejolt/dmca/blob/main/2016/2016-09-02-nintendo.md) · opened
- [Game Jolt DMCA 2018](https://github.com/gamejolt/dmca/blob/main/2018/2018-04-27-nintendo.md) · opened
- [Game Jolt DMCA 2020](https://github.com/gamejolt/dmca/blob/main/2020/2020-12-29-nintendo.md) · opened
- [GitHub DMCA 2018](https://github.com/github/dmca/blob/master/2018/2018-08-30-Nintendo.md) · opened
- [Pokémon Uranium (Wikipedia)](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Uranium) · summary
- [Pokémon Prism (Wikipedia)](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Prism) · summary
- [Kotaku](https://kotaku.com/pokemon-poke-court-nintendo-trainer-nyc-store-robbed-2000669827) · summary
- [GitHub DMCA 2026](https://github.com/github/dmca/blob/master/2026/09/2026-09-03-nintendo.md) · opened
- [Gamereactor](https://www.gamereactor.eu/temtem-vs-pokemon-crema-games-calls-its-game-a-love-letter-to-game-freaks-title-1228023/) · summary
- [Nintendo Life](https://www.nintendolife.com/news/2022/05/temtem-brings-pokemon-inspired-online-adventure-to-switch-this-september) · summary
- [Nintendo: Coromon](https://www.nintendo.com/us/store/products/coromon-switch/) · summary
- [Game Developer](https://www.gamedeveloper.com/business/pocketpair-is-changing-palworld-further-due-to-ongoing-nintendo-and-pok-mon-lawsuit) · summary
- [GoNintendo](https://www.gonintendo.com/contents/61830-report-claims-nintendo-s-current-palworld-patent-case-no-longer-threatens-new) · summary
- [Dexerto](https://www.dexerto.com/pokemon/nintendos-pokemon-patent-rejected-after-examiner-cites-2013-fan-game-3388757/) · summary
- [Anime News Network](https://www.animenewsnetwork.com/news/2026-04-02/us-patent-office-rejects-nintendo-patent-involving-summoning-characters-to-fight/.236043) · summary
- [Tetris Holding v. Xio (Wikipedia)](https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.) · summary
- [POKÉ BALL trademark (uspto.report)](https://uspto.report/TM/87982815) · summary
- [CC0 1.0](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/cc0-1.0.txt) · opened
- [Davis+Gilbert](https://www.dglaw.com/nominative-fair-use-defense-may-enable-use-of-anothers-trademark/) · summary
- [Siliconera](https://www.siliconera.com/fan-game-pokemon-wordle-to-be-taken-down/) · summary
- [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/us-copyright-office-releases-part-2-of-artificial-intelligence-report-clarifying-copyrightability-of-generative-ai-outputs) · summary
- [Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/03/the-final-word-supreme-court-refuses-to-hear-case-on-ai-authorship) · summary

**Asset packs and licences**

- [Ninja Adventure pack (vendored copy)](https://github.com/rinn7e/ninja-adventure-indigo/tree/master/assets/Ninja%20Adventure%20-%20Asset%20Pack) · opened
- [Ninja Adventure README](https://github.com/rinn7e/ninja-adventure-indigo/blob/master/assets/Ninja%20Adventure%20-%20Asset%20Pack/README.md) · opened
- [Kenney mirror](https://github.com/ETdoFresh/kenney.nl) · opened
- [Kenney index](https://github.com/shorepine/kenney/blob/main/index.tsv) · opened
- [ULPC](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) · opened
- [LimeZu Modern Interiors](https://limezu.itch.io/moderninteriors) · summary
- [Mana Seed licence](https://selieltheshaper.weebly.com/user-license.html) · summary
- [PixelLab ToS](https://www.pixellab.ai/termsofservice) · summary
- [Retro Diffusion](https://retrodiffusion.ai/) · summary
- [MIT licence text](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/mit.txt) · opened
- [CC BY 4.0](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by/4.0/legalcode.en.html) · opened
- [CC BY-SA 3.0](https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by-sa/3.0/legalcode.en.html) · opened
- [GPL-3.0](https://github.com/github/choosealicense.com/blob/gh-pages/_licenses/gpl-3.0.txt) · opened
- [CC FAQ](https://github.com/creativecommons/faq/blob/main/faq-en.md) · opened
- [eturner58/game-assets](https://github.com/eturner58/game-assets/blob/main/LICENSES.md) · opened
- [LimeZu Exteriors](https://limezu.itch.io/modernexteriors) · summary
- [maciaz "Pokemon-like" tileset](https://maciaz.itch.io/pokemon-like-top-down-tile-set) · summary
- [Tuxemon ATTRIBUTIONS.md](https://github.com/Tuxemon/Tuxemon/blob/development/ATTRIBUTIONS.md) · opened
- [pixel-boy/NinjaAdventure](https://github.com/pixel-boy/NinjaAdventure) · opened

**Map, tools and pixel-exact zoom**

- [web3dsurvey](https://web3dsurvey.com/webgl2/parameters/MAX_TEXTURE_SIZE) · summary
- [MDN browser-compat-data](https://github.com/mdn/browser-compat-data) · opened
- [deepnight/ldtk](https://github.com/deepnight/ldtk) · opened
- [JSON\_DOC.md](https://github.com/deepnight/ldtk/blob/master/docs/JSON_DOC.md) · opened
- [Tiled COPYING](https://github.com/mapeditor/tiled/blob/master/COPYING) · opened
- [pixi-tiledmap](https://github.com/riebel/pixi-tiledmap) · opened
- [Aseprite CLI](https://github.com/aseprite/docs/blob/main/cli.md) · opened
- [WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse) · opened
