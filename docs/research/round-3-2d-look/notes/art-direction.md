# Art direction for a Pokémon-style pixel-art "society of dots": readable, fair and teachable (status October 2026)

**How sources were accessed.** The session's egress proxy blocked almost every non-GitHub host, for both curl and WebFetch. Primary material therefore comes from GitHub, raw.githubusercontent.com and the npm/PyPI registries:
- **Pokémon overworld rules** were read from the community decompilations' *code and map data*:
  - pret/pokeemerald @731ad5b (2026-10-01)
  - pret/pokefirered @037335f (2026-09-26)
  - pret/pokeheartgold @9d8b759 (2026-09-20)
- **GBA hardware:** the Tonc guide, gbadev-org/tonc @36b7def.
- **Primer:** Helpsypoo/primer @0487fc3 (2026-01-27) and Primer-Learning/PrimerTools @bae613a (2026-06-22).
- **RimWorld art criteria:** spdskatr/RWModdingResources @80e0b38.
- **WCAG Understanding documents:** w3c/wcag @23bad59 (2026-10-04).
- **Okabe–Ito and Tol palettes:** bokeh/bokeh `palettes.py`.

The decomp repositories also contain extracted Nintendo graphics. I opened three FRLG sprite sheets only to *describe* how police, grunts and burglars are coded, and nothing should be reused (see Q7, "IP"). Pages are tagged in three ways:
- **(opened)**: I read the file or page itself.
- **(computed)**: I derived the number in this session from opened data, or ran colorspacious 1.1.2 (PyPI) or Pillow.
- **(snippet only)**: the claim comes from a web-search result summary because the host was blocked. Treat these as leads to verify.

WebSearch use: 33 of the 35 allowed searches.

**Blocked hosts tried this session** (curl → HTTP 000 / CONNECT 403; WebFetch → EGRESS_BLOCKED):
- **Pokémon references:** bulbapedia.bulbagarden.net, spriters-resource.com, pokemondb.net, serebii.net
- **Accessibility guidelines:** gameaccessibilityguidelines.com, learn.microsoft.com (Xbox Accessibility Guidelines), w3.org
- **Game wikis and studio sites:** stardewvalleywiki.com, stardewvalley.net, prisonarchitect.paradoxwikis.com, introversion.co.uk, rimworldgame.com, ludeon.com, songsofsyx.com, bay12games.com, kitfoxgames.com, primerlearning.org
- **Stores, video and publishing:** store.steampowered.com, steamcommunity.com, youtube.com, archive.org, gamedeveloper.com, medium.com, caniplaythat.com, ablegamers.org, accessible.games
- **Pixel-art and trope sites:** lospec.com, tvtropes.org
- **Academic and research:** pubmed.ncbi.nlm.nih.gov, www.ncbi.nlm.nih.gov, scholar.google.com, researchgate.net, journals.sagepub.com, tandfonline.com, semanticscholar.org (including its API), api.crossref.org, dl.acm.org, frontiersin.org, osf.io, psyarxiv.com, escholarship.org, jstor.org
- **Other sites:** ncase.me and \*.github.io sites (redblobgames.github.io, ableplayer.github.io)
- **GitHub REST search API:** blocked for repos not attached to the session.

The task brief also lists Wikipedia, gdcvault.com and news sites as blocked.

---

## 1. Pokémon overworld conventions (RSE/FRLG, DPPt/HGSS, BW): what they are, which transfer to a simulation, which fight it

### Takeaway
The Gen 3–4 overworld has a tight, documentable grammar:
- **Grid and screen:** a 16-px map grid shown on a 240×160 (GBA) or 256×192 (DS) screen.
- **Sprites:** NPC frames are 16×32 on GBA and 32×32 on DS, with 16 colours each. Three directions are drawn and the fourth is a mirror. The walk is three poses in 8-frame beats.
- **Movement:** tile-locked at 1 px per frame, i.e. 16 frames, or about 0.27 s, per tile.
- **Population:** at most 16 live map objects. Outdoor towns hold about 3–35 objects (median 7 people).
- **Emotes:** a 16×16 "!", "?" or heart icon hops in 16 px above the head and holds for 1 s.
- **Spotting:** trainers see in a straight line 1–7 tiles ahead (median 2–3).
- **Buildings:** function is signalled by roof colour plus a sign.
- **Clock:** HGSS uses a five-period day.

What transfers: tile size, sprite grammar, emote timing and anchoring, sight-line spotting, roof-plus-sign coding and discrete light periods.

What fights a society simulation:
- tile-locked, one-object-per-tile movement;
- a player-centric camera;
- world-freezing "!" sequences;
- trainer classes that make criminality a costume (Burglar, Team Rocket);
- police who appear only at night.

### Cited Findings
**Screen, tiles and hardware**
- GBA resolution: `#define DISPLAY_WIDTH 240`, `#define DISPLAY_HEIGHT 160`, and hardware tiles are 8×8 (`TILE_WIDTH 8`, `TILE_HEIGHT 8`) — [pokeemerald include/gba/defines.h](https://github.com/pret/pokeemerald/blob/master/include/gba/defines.h) (opened)
- A map metatile is `NUM_TILES_PER_METATILE 8`. My reading is two layers of 2×2 8-px tiles, i.e. a 16×16-px map cell — [pokeemerald include/fieldmap.h](https://github.com/pret/pokeemerald/blob/master/include/fieldmap.h) (opened)
- GBA hardware (Tonc):
  - "240x160 LCD screen capable of displaying 32768 colors (15 bits)" and "4 individual tilemap layers (backgrounds) and 128 sprites (objects)" — [Tonc hardware.md](https://github.com/gbadev-org/tonc/blob/master/content/hardware.md) (opened)
  - Refresh is "just shy of 60 frames per second (59.73 Hz)" — [Tonc video.md](https://github.com/gbadev-org/tonc/blob/master/content/video.md) (opened)
  - Tiles "come in 4bpp (16 colors / 16 palettes) and 8bpp (256 colors / 1 palette) variants" — [Tonc objbg.md](https://github.com/gbadev-org/tonc/blob/master/content/objbg.md) (opened)
  - There is "a limit to the amount of sprite pixels you can cram in one scanline. About 960, if the fora are anything to go by" (hedged in the source) — [Tonc regobj.md](https://github.com/gbadev-org/tonc/blob/master/content/regobj.md) (opened)
- DS screen: `#define GX_LCD_SIZE_X 256`, `#define GX_LCD_SIZE_Y 192` — [pokeheartgold lib/include/nitro/gx/gx.h](https://github.com/pret/pokeheartgold/blob/master/lib/include/nitro/gx/gx.h) (opened)

**Overworld sprites**
- Emerald's `object_event_graphics_info.h` defines 245 overworld graphics. By size:
  - 16×32: 119 (the player and most people);
  - 16×16: 65 (small objects and Pokémon);
  - 32×32: 55 (bikes, large NPCs);
  - 64×64: 3;
  - one each at 48×48, 88×32 and 96×40.
  
  — [pokeemerald object_event_graphics_info.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_graphics_info.h) (opened; computed)
- A walking person has **9 frames**: 0 = face south, 1 = north, 2 = west, 3–4 = south steps, 5–6 = north steps, 7–8 = west steps. **East reuses west with `.hFlip = TRUE`** — [object_event_pic_tables.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_pic_tables.h), [object_event_anims.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_anims.h) (opened)
- The walk cycle is four 8-frame beats: step, stand, other step, stand. For example `sAnim_GoSouth` is `FRAME(3,8), FRAME(0,8), FRAME(4,8), FRAME(0,8)`, which is 32 frames, or about 0.54 s at 59.73 Hz — [object_event_anims.h](https://github.com/pret/pokeemerald/blob/master/src/data/object_events/object_event_anims.h) (opened; computed)
- Movement is tile-locked:
  - `Step1` adds one unit vector per frame, and normal speed runs 16 `Step1` calls (`sStepTimes[MOVE_SPEED_NORMAL] = ARRAY_COUNT(sStep1Funcs)`). That is 16 px per tile in 16 frames: about 3.7 tiles/s, or 268 ms per tile.
  - Faster speeds use 2-, 3-, 4- and 8-px steps.
  
  — [pokeemerald src/event_object_movement.c](https://github.com/pret/pokeemerald/blob/master/src/event_object_movement.c) (opened; computed)
- HGSS (DS) overworld NPCs are 3D billboard textures:
  - Every texture in the NSBTX files I parsed is **32×32 in 16-colour (4bpp) format**.
  - Ordinary NPCs have 16 frames each (`babyboy1.1…16`, `picnicgirl.1…16`); the heroine has 32.
  
  — [pokeheartgold files/data/mmodel/mmodel/*.NSBTX](https://github.com/pret/pokeheartgold/tree/master/files/data/mmodel/mmodel) (opened; parsed and computed)
- Palette discipline: the FRLG overworld sheets are 144×32, i.e. nine 16×32 frames. The policeman sheet uses 12 indexed colours and the Rocket grunt sheet 14, both counting transparency. Battle portraits are 64×64 with 16 colours — [pokefirered graphics/object_events/pics/people/](https://github.com/pret/pokefirered/tree/master/graphics/object_events/pics/people) (opened; computed with Pillow)

**Limits on live objects**
- `OBJECT_EVENTS_COUNT 16` (live map objects) and `OBJECT_EVENT_TEMPLATES_COUNT 64` (objects defined per map) — [pokeemerald include/constants/global.h](https://github.com/pret/pokeemerald/blob/master/include/constants/global.h) (opened)
- The software sprite manager caps at `MAX_SPRITES 64` — [pokeemerald include/sprite.h](https://github.com/pret/pokeemerald/blob/master/include/sprite.h) (opened)

**Real town densities** (outdoor town and city maps; "people-like" is my heuristic filter that drops item balls, boulders, signs and similar; NPCs inside buildings are on separate maps and are excluded)

| | Towns and cities | Map size (tiles) | Map objects | Median people-like objects | Tiles per person |
|---|---|---|---|---|---|
| FRLG | 9 | 24×20 to 66×55 | 3–16 | 7 | 160–519 (median ≈267) |
| Emerald | 16 | 20×20 to 80×40 | 0–35 (Slateport 35) | 7 | 44–267 (median ≈100) |

— [pokefirered data/layouts/layouts.json](https://github.com/pret/pokefirered/blob/master/data/layouts/layouts.json) and `data/maps/*/map.json`; [pokeemerald data/layouts/layouts.json](https://github.com/pret/pokeemerald/blob/master/data/layouts/layouts.json) and `data/maps/*/map.json` (opened; computed)

**The "!" when a trainer spots you, and the other emotes**
- Spotting sequence: `TrainerExclamationMark` starts `FLDEFF_EXCLAMATION_MARK_ICON` and turns the trainer to face the player. `WaitTrainerExclamationMark` blocks until the icon effect ends. Then `TRSEE_MOVE_TO_PLAYER` walks the trainer over — [pokeemerald src/trainer_see.c](https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c) (opened)
- Icon mechanics:
  - Size: 16×16, 4bpp (`SPRITE_SHAPE(16x16)`).
  - Duration: one animation frame held for **60 frames (≈1 s)**.
  - Position: `sprite->y = objEventSprite->y - 16`, i.e. 16 px above the owner, and it follows the owner while shown.
  - Entrance: it starts with `sYVelocity = -5`, and velocity rises by 1 per frame. I computed a ~15-px hop that returns in about 11 frames.
  - Effects: "!" (`FLDEFF_EXCLAMATION_MARK_ICON` = 0), "?" (`FLDEFF_QUESTION_MARK_ICON` = 33) and heart (`FLDEFF_HEART_ICON` = 46). The art files are named `emotion_exclamation.png` and `emotion_question.png`.
  
  — [trainer_see.c](https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c), [include/constants/field_effects.h](https://github.com/pret/pokeemerald/blob/master/include/constants/field_effects.h) (opened; computed)
- Sight is a straight line along the facing axis. For example, `GetTrainerApproachDistanceSouth` returns a distance only if the player is in the same column and within `range` tiles, and `CheckPathBetweenTrainerAndPlayer` then checks for obstacles. At most **2** trainers can approach at once: `gApproachingTrainers[2]` — [trainer_see.c](https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c), [include/trainer_see.h](https://github.com/pret/pokeemerald/blob/master/include/trainer_see.h) (opened)
- Sight ranges in the shipped maps (`trainer_sight_or_berry_tree_id` for normal trainers; median excludes range 0) — map.json files in [pokefirered](https://github.com/pret/pokefirered/tree/master/data/maps) and [pokeemerald](https://github.com/pret/pokeemerald/tree/master/data/maps) (opened; computed):

  | | Trainers | Range 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Median |
  |---|---|---|---|---|---|---|---|---|---|---|
  | FRLG | 432 | 22 | 148 | 73 | 92 | 59 | 27 | 7 | 4 | 2 tiles |
  | Emerald | 542 | 22 | 88 | 84 | 168 | 79 | 48 | 34 | 19 | 3 tiles |

**How trainer classes code police and criminals**
- FRLG defines `TRAINER_CLASS_BURGLAR 67` and `TRAINER_CLASS_TEAM_ROCKET 85`, plus overworld graphics `OBJ_EVENT_GFX_POLICEMAN 60`, `OBJ_EVENT_GFX_ROCKET_M 49` and `OBJ_EVENT_GFX_ROCKET_F 50` — [pokefirered include/constants/trainers.h](https://github.com/pret/pokefirered/blob/master/include/constants/trainers.h), [include/constants/event_objects.h](https://github.com/pret/pokefirered/blob/master/include/constants/event_objects.h) (opened)
- In the FRLG maps:
  - Team Rocket trainers use dedicated uniform sprites: 45 use `ROCKET_M` and 3 use `ROCKET_F`.
  - All 6 Burglar trainers reuse the generic `OBJ_EVENT_GFX_POKE_MANIAC` overworld sprite. Burglars are therefore not visually distinct on the map; only their battle portrait codes them.
  
  — [pokefirered data/maps](https://github.com/pret/pokefirered/tree/master/data/maps) `map.json` + `scripts.inc` (opened; computed by linking `trainerbattle` script labels to object graphics)
- What the sprites look like (viewed for description only):
  - **FRLG policeman (overworld):** a navy/indigo peaked cap and uniform with a yellow badge and buttons. The cap silhouette reads strongly even at 16×32.
  - **Rocket grunt (overworld):** black/charcoal cap and uniform, a red chest emblem, grey gloves and boots.
  - **Burglar (battle portrait):** backwards cap, round dark glasses, stubble, a loot sack over the shoulder and a tiptoe sneaking pose.
  
  — [policeman.png](https://github.com/pret/pokefirered/blob/master/graphics/object_events/pics/people/policeman.png), [rocket_m.png](https://github.com/pret/pokefirered/blob/master/graphics/object_events/pics/people/rocket_m.png), [burglar_front_pic.png](https://github.com/pret/pokefirered/blob/master/graphics/trainers/front_pics/burglar_front_pic.png) (opened)
- The Police Officer class ("Policeman" in Gens IV–V) is drawn with "flashlights and batons". They "only battle at night in Generations II and IV", 8 p.m.–4 a.m., as the night counterparts to Joggers — [Bulbapedia: Police Officer](https://bulbapedia.bulbagarden.net/wiki/Police_Officer_(Trainer_class)), [Pokémon Wiki (fandom)](https://pokemon.fandom.com/wiki/Police_Officer) (snippet only)

**Building function**
- A Pokémon Center "can typically be identified from its red roof". Since Gen III it has a Poké Ball symbol on the roof and automatic doors. Since Gen III, Poké Marts are recognised by "a distinct blue roof" and a sliding door. From Gen V onward the Mart is merged into the Center — [Pokémon Wiki: Pokémon Center](https://pokemon.fandom.com/wiki/Pok%C3%A9mon_Center), [Pokémon Wiki: Poké Mart](https://pokemon.fandom.com/wiki/Pok%C3%A9_Mart) (snippet only)

**Day/night in HGSS**
- `sTimeOfDayByHour[24]` maps hours as follows:
  - 0–3 → LATE
  - 4–9 → MORN
  - 10–16 → DAY
  - 17–19 → EVE
  - 20–23 → NITE
  
  Wild-encounter logic collapses these to three periods (MORN; DAY+EVE; NITE+LATE). A helper returns TRUE ("night") for NITE or LATE — [pokeheartgold src/gf_rtc.c](https://github.com/pret/pokeheartgold/blob/master/src/gf_rtc.c), [include/gf_rtc.h](https://github.com/pret/pokeheartgold/blob/master/include/gf_rtc.h) (opened)

### Inferences
- **Conventions that transfer directly:**
  - A 16×16 tile.
  - A sprite grammar of three drawn directions plus one mirror, with step–stand–step–stand at about 8 art frames per beat.
  - The **"!" spotting grammar** maps one-to-one onto "a witness or officer notices a theft": face the target, a 16×16 icon 16 px overhead for ~1 s, then approach.
  - **Straight-line, short-range sight (1–7 tiles, median 2–3)** is a legible, teachable "who can see what" rule. Pair it with a visible sight-line overlay in lab mode.
  - **Roof colour plus a sign glyph plus a door type** for building function.
  - **Discrete light periods** rather than a continuous sun.
- **Conventions that fight a society simulation:**
  1. **Tile-locked, one-object-per-tile movement.** It quantises time to 268 ms per tile and causes queueing and deadlock with hundreds of agents. Path on the tile graph, but render continuous interpolated positions with sub-tile offsets and soft separation, snapped to whole art pixels at draw time.
  2. **The player-centric camera and blocking "!".** Pokémon freezes the trainer while the icon plays, and handles at most two approaching trainers. A simulation must never pause the world for an emote. Emotes are non-blocking and capped, and the excess goes to a log.
  3. **Trainer classes make crime an identity.** The Burglar's sack, shades and sneak, and Rocket's black uniform with a red emblem, contradict "thief is a temporary state". Keep the uniform convention only for jobs (police, merchant).
  4. **Night-only police.** This teaches a schedule-as-stereotype ("crime happens at night"). Let patrol schedules come from simulation data.
- **Ceiling on population.** Pokémon's own ceiling (16 live objects; outdoor towns at about 1 person per 100–270 tiles) is the opposite of city mode's 10k agents. "Pokémon-feel" is achievable only for *local views* of a few dozen agents (see Q5).

### Gaps
- Black/White (Gen 5) overworld specifics (sprite size, camera tilt, how seasons and day/night tint the map) were not verified. There is no BW decomp data in this session and Bulbapedia/TCRF were blocked.
- I found no source for HGSS's actual night *tint colours or blend method*. The decomp gives the hour table only.
- The Pokémon Center/Mart roof facts and the Policeman's night-only rule are snippet-only.
- I did not check whether any trainer class in Gens 3–5 wears a striped "burglar" shirt. The FRLG Burglar portrait does not.

---

## 2. How colony and simulation games keep many small characters readable (role, state, events, stated limits)

### Takeaway
The clearest designer statement on readability limits is RimWorld's (Tynan Sylvester, GDC 2017, as paraphrased in a modding guide):
- simplify to cut "noise";
- build an **intensity hierarchy with outlines**: pawns get thicker outlines than items, and plants get green or no outline;
- treat details under 3 px as wasted unless high-contrast.

How the other games code role, state and events:

| Game | Role | State and events |
|---|---|---|
| Prison Architect | whole-body uniform colour per prisoner category | a marker over prisoners left too long without a cell |
| The Sims | — | the plumbob over the selected Sim, coloured by mood |
| Stardew Valley | — | a small emote vocabulary (!, ?, heart, sleep, angry…); NPCs follow time-and-tile schedules |
| Dwarf Fortress (Steam) | — | a 32×32 tileset built for "at a glance" reading |
| Songs of Syx | — | up to ~30,000 individuals in pixel art |

No source gave a numeric "max readable characters" figure.

### Cited Findings
**RimWorld** (all from one source, opened) — [RWModdingResources/artstyle.md](https://github.com/spdskatr/RWModdingResources/blob/master/artstyle.md) (opened; secondary paraphrase of the GDC talk, whose Vault page is blocked)
- The guide paraphrases Tynan's GDC 2017 talk ("RimWorld: Contrarian, Ridiculous, and Impossible Game Design Methods", at about 12:00).
- Graphics "are abstracted icons that force players to tell the story in their mind": "RimWorld has graphics like a novel has a typeface."
- **Criteria:** not ugly; easily identifiable; minimal noise ("a game like RimWorld can have hundreds of objects on the screen. Scanning what matters becomes harder and harder"); intensity hierarchy; fast implementation; room for interpretation.
- **Outline hierarchy:** "Pawns have a thicker outline than items. Buildings and items in the game have a solid black outline, but plants have a dark green outline or no outline at all … In a big field of trees the character really pop out."
- **Craft rules:**
  - "Details are wasted. You can't get away with detail that's less than 3 pixels wide, unless it has a big colour contrast."
  - "Vanilla art has a 2-3 pixel black border for 'story relevant' things."
  - "There are no/very few black inlines."
  - Item textures are drawn at 128×128 and resized to 64×64.
- Tynan wrote on X/Twitter: "I wrote about why the RimWorld art style is the way it is". Search summaries say he borrowed the Prison Architect style as a stopgap, citing his lack of character-art skill — [Tynan Sylvester on X](https://x.com/TynanSylvester/status/457370327132418048) (snippet only)

**Prison Architect**
- Prisoner category is coded by uniform colour:
  - Minimum Security: grey
  - Medium: orange
  - Maximum: red
  - SuperMax: maroon
  - Protective Custody: yellow
  - Death Row: black
  - Criminally Insane: white
  
  Colours are customisable with the Second Chances DLC — [Prison Architect Wiki (fandom): Prisoner](https://prison-architect.fandom.com/wiki/Prisoner), [Prisoner Uniform](https://prison-architect.fandom.com/wiki/Prisoner_Uniform) (snippet only)
- "Prisoners who go too long without being assigned to a cell will have a marker pointing to them for easy identification" — [Prison Architect Wiki](https://prisonarchitect.paradoxwikis.com/Guard) (snippet only)

**The Sims**
- The plumbob is "a diamond-shaped halo above a Sim's head" that marks the selected Sim and shows mood. The Sims (2000) used green (great), white (neutral) and red (horrible). The Sims 2 shades it from bright green through green-yellow to orange or red — [Sims Wiki: Plumbob](https://sims.fandom.com/wiki/Plumbob) (snippet only)

**Stardew Valley**
- Vanilla multiplayer emotes: happy, sad, heart, exclamation, note, sleep, game, question, x, pause, blush, angry. Jar, music and taunt are hidden — [Stardew Valley Wiki: Multiplayer/Emotes](https://stardewvalleywiki.com/Multiplayer/Emotes) (snippet only)
- NPC schedules are slash-separated entries of the form `[time] [location] <tileX> <tileY> [facingDirection] [animation] [dialogue]`, e.g. `"1000 ArchaeologyHouse 11 9 0/1800 Town 47 87 0/2200 SeedShop 1 9 3 abigail_sleep"`. Facing: up 0, right 1, down 2, left 3 — [Stardew Valley Wiki: Modding:Schedule data](https://stardewvalleywiki.com/Modding:Schedule_data) (snippet only)

**Dwarf Fortress (Steam)**
- The first official tileset is **32×32**, by Michał "Mayday" Madej and Patrick "Meph" Schroeder under Kitfox's guidance. It "makes everything far easier to understand at a glance". Large creatures (elephants, dragons) spill into neighbouring tiles, and text is decoupled from sprite size — [Gaming Reinvented](https://gamingreinvented.com/news/dwarf-fortress-is-coming-to-steam-complete-with-new-art-style/), [RPG Codex thread](https://rpgcodex.net/forums/threads/dwarf-fortress-now-on-steam-with-a-graphical-overhaul.126631/) (snippet only)

**Songs of Syx**
- "You can grow from ten settlers until there are 30,000 individual people", with a pixelated style. The solo developer aimed for "tens of thousands of units on screen" — [TheGamer](https://www.thegamer.com/songs-of-syx-is-my-new-favourite-colony-sim/), [GamingOnLinux](https://www.gamingonlinux.com/2019/07/songs-of-syx-a-city-builder-with-empire-management-tactical-battles-and-rpg-elements/) (snippet only)

### Inferences
- **Converging grammar.** Whole-body uniform colour is the role channel that survives distance (Prison Architect, Pokémon's navy policeman, Rocket black). Overhead icons are the state channel (plumbob, Stardew emotes, Pokémon "!"). Outline weight is the "what matters" channel (RimWorld). That matches Primer's "one trait per visual channel".
- **Lesson from Prison Architect's colour table.** It is a ready-made warning. Its palette encodes *criminal-justice categories onto bodies*: black = death row, orange/red = dangerous. Do not import those colour meanings. In particular, avoid orange and black as body or role colours for ordinary agents (see Q4 and Q6).
- **Stardew's schedule format** (time → place → tile → facing) is a good model for agent routines that viewers can *learn*. Once routines are learned, deviations such as a theft detour stand out. Treating routine as a legibility device is my inference, not a stated Stardew design goal.
- **Applying RimWorld's 3-px rule at 16×16:**
  - eyes need high contrast (white or black against the body);
  - accessories need a 3-px minimum dimension;
  - any 1–2 px "detail" (stripes, buttons) is noise.

### Gaps
- I found no primary designer statement from Introversion (Prison Architect), Gamatron (Songs of Syx), Kitfox/Bay 12 (Dwarf Fortress) or Maxis (Sims thought balloons) on readability *limits*. Their sites, the GDC Vault and Steam were blocked.
- Prison Architect guard/staff colour coding and its need-icon system were not confirmed.
- Whether The Sims' thought balloons show need icons was not sourced in this session, so it is not claimed.
- Classic Dwarf Fortress "profession colours" in ASCII mode were not verified.

---

## 3. Primer's visual language, and "Primer blobs in a Pokémon-style town" at 16×16 / 16×24

### Takeaway
Primer's blobs are one simple body with large eyes and a hideable mouth. The code shows a small, fixed expression set:
- normal, angry, surprise and wince eyes;
- show/hide mouth;
- cheer, evil pose, wave, nod, shake, eat, dance;
- random blinks about every 3 s, lasting 183 ms.

Colour carries **one trait at a time**: buyer vs seller, a blue→red "fight chance" gradient, a speed gradient. Size carries size. Momentary outcomes are expressions:
- price too high → angry eyes and no mouth;
- robbed → wince;
- taker → evil pose.

PrimerTools (Godot) keeps the colour-as-trait idea (strategy colours mixed per allele), but its blob models are private.

At 16×16 or 16×24 this translates into:
- a 14×11-px body;
- 2×3-px eyes as the main expression carrier;
- headgear in the top 8 rows of a 16×24 canvas.

Non-human blobs remove skin tone and facial features as channels. They do *not* by themselves stop racial or class coding, which leaks through colour valence, costume, voice and behaviour (Q4).

### Cited Findings
**Primer (Blender era), `blobject.py`**
- The `Blobject` class defines `walk_to, move_head, add_beard, hold_gift, blob_wave, blob_scoop, evil_pose, cheer, angry_eyes, normal_eyes, surprise_eyes, shrug` ("Not implemented. Just evil pose for now"), `hello, wince, nod_yes, shake_no, hold_object, show_mouth, hide_mouth, eat_animation, dance`. The default material is `creature_color3`, and the mouth is optional (`mouth` kwarg) — [Helpsypoo/primer blender_scripts/tools/blobject.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/blobject.py) (opened)
- How expressions are built:
  - `angry_eyes` drives each eye's shape key `'Key 1'` to 1, and `normal_eyes` returns it to 0.
  - `surprise_eyes` scales the eyes to 1.2.
  - `wince` squashes the eyes to scale `[1, 0.3, 0.3]`, tilts them ±20°, overrides blinks, and shakes the head.
  
  — [blobject.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/blobject.py) (opened)
- Blinks: `BLINK_CHANCE = 0.005` per frame, `BLINK_LENGTH = 11` frames, `BLINK_CYCLE_LENGTH = 1200`, `FRAME_RATE = 60`. That gives a mean of about 3.3 s between blinks, each 183 ms (computed) — [primer blender_scripts/constants.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/constants.py) (opened; computed)
- Palette, colour scheme 2 ("Main"), as RGB: (47,51,54) dark ground, (243,242,240) off-white, **(62,126,160) blue (the default creature)**, (255,148,0) orange, (231,226,71) yellow, (214,59,80) red, (105,143,63) green, (219,90,186) pink, plus grey and black. `creature_colorN` uses `COLORS[N-1]` — [constants.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/constants.py), [helpers.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/helpers.py) (opened)
- **Market video:**
  - `BUYER_MAT = 'creature_color4'` (orange) and `SELLER_MAT = 'creature_color3'` (blue).
  - `price_reaction`: an acceptable price → `normal_eyes` + `show_mouth`; a price beyond the agent's limit → `angry_eyes` + `hide_mouth`.
  - Each `DrawnAgent` carries its own bar display. Its mode is `'camera_left'`, `'camera_right'`, `'above'`, `'table'` or `'graph'`, with price lines and surplus highlights attached to the blob. `add_price_line(..., emote=True)` triggers the face reaction.
  
  — [primer blender_scripts/tools/drawn_market.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/drawn_market.py) (opened)
- **Hawk–dove video:**
  - Blob colour = `mix_colors(COLORS_SCALED[2], COLORS_SCALED[5], fight_chance)`, i.e. a blue→red gradient.
  - On a take, `loser.wince(...)` and `taker.evil_pose(...)`.
  - In a fight, both `blob_wave` and then `wince`.
  
  — [primer blender_scripts/tools/drawn_contest_world.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/drawn_contest_world.py) (opened)
- **Natural-selection video:**
  - Speed was mapped to a colour gradient (black→purple→blue→green→yellow…). That code was later commented out with "I just want blue creatures now".
  - Size maps to scale (`eater.size * BASE_CREATURE_SCALE`).
  
  — [primer blender_scripts/tools/natural_sim.py](https://github.com/Helpsypoo/primer/blob/master/blender_scripts/tools/natural_sim.py) (opened)

**PrimerTools (Godot/C#)**
- `PrimerColor` exposes Blue, Orange, Yellow, Red, Green, Purple, Gray, White, Black and a Rainbow array.
- `PrimerConfig` defaults map them to Godot named colours (DodgerBlue, Crimson, ForestGreen, DarkOrange, DarkOrchid, Gold, Gray, LightGray, White, Black).
- Colours are mixed "in linear space" (`InterpolateInLinearSpace`, `MixColorsByWeight`).

— [PrimerTools Utilities/PrimerColor.cs](https://github.com/Primer-Learning/PrimerTools/blob/main/Utilities/PrimerColor.cs), [PrimerConfig.cs](https://github.com/Primer-Learning/PrimerTools/blob/main/PrimerConfig.cs) (opened)
- The rock–paper–scissors evolution animator is commented out "because it references the blob model from the private assets repo". In it:
  - strategy colours are Rock = Red, Paper = Blue, Scissors = Yellow;
  - blob colour = `MixColorsByWeight` of its allele colours;
  - blobs come from a `Pool<Blob>`, appear by scaling up from `Vector3.Zero`, and move with `duration: distance / _creatureSpeed`.
  
  — [PrimerTools Simulation/DiscreteStageSims/EvoGameTheorySimAnimator.cs](https://github.com/Primer-Learning/PrimerTools/blob/main/Simulation/DiscreteStageSims/EvoGameTheorySimAnimator.cs) (opened)
- README: "I keep my 3D models separate from this repo, and it's private because it contains the blob models which I don't want to be public" — [PrimerTools README](https://github.com/Primer-Learning/PrimerTools) (opened)
- Primer is described as an "edutainment web animation series starring colorful blob creatures". Blobs in the evolution videos have mutating traits (speed, sight/sense, size) — [TV Tropes: Primer Learning](https://tvtropes.org/pmwiki/pmwiki.php/WebAnimation/PrimerLearning), [YouTube Wiki: Primer](https://youtube.fandom.com/wiki/Primer) (snippet only)

### Inferences
- **What to borrow from Primer:**
  - a **single body** for everyone;
  - **expression = momentary outcome** (angry at price, wince when robbed);
  - **colour = one assigned variable**;
  - **pop-in/pop-out by scale**;
  - **per-agent mini-charts that ride with the agent** (DrawnAgent bars). The last one is the concrete code precedent for "charts that move with the creatures".
- **Translating to pixels.** A 16-px tile with a blob body of about 14×11 px plus a 1-px outline leaves room for:
  - **eyes of 2×3 px**, the main expression carrier;
  - a 2–3 px mouth that is usually hidden (Primer hides it by default);
  - 0–2 px of squash/stretch.
  
  Headgear (the role cue) needs 3–5 px above the body, so draw on a **16×24 canvas**. Anchor the emote bubble 16 px above the canvas top, as Pokémon does.
- **Primer's expression set mapped to the simulation:**
  - angry eyes → price too high, or anger at a victimiser;
  - wince → victim of theft, or fear;
  - surprise eyes → spotted something (pairs with "!");
  - cheer → a successful purchase, a wage, or release;
  - blink → idle life signal.
  
  Do **not** port `evil_pose` to thieves as a persistent pose. If anything, it may play once at the moment of the act in lab mode's "true view". Otherwise it reintroduces "the criminal look".
- **Do non-human blobs solve representation?** Partly. They remove skin tone, hair and facial morphology. Q4's evidence (Jynx, orcs, Disney accents, black uniforms) shows coding re-enters through body colour valence, costume, voice and how roles are distributed. Hence the rule set in Q4 and Q7.

### Gaps
- I could not see Primer's Godot-era blob *expressions*. The models and animation clips are in a private repo, and YouTube was blocked. Nothing in PrimerTools' public code drives eyes or mouths, so the expression list above is from the Blender-era code.
- I found no statement by Justin Helps on *why* blobs, or on readability limits. Primer's own pages were blocked.

---

## 4. Representation and ethics: documented stereotyping problems and concrete rules for this project

### Takeaway
There is solid evidence that appearance cues paired with crime or threat activate and reinforce stereotypes:
- **Shooter bias:** in a simple video game, participants decided to shoot armed Black targets faster and decided *not* to shoot unarmed White targets faster.
- **Suspect morphing:** showing the same news suspect as Black rather than White raised support for punitive policy.
- **Game stereotypes:** games over-represent dangerous minority-male stereotypes.
- **Colour valence:** black uniforms are judged, and act, more aggressive.
- **Non-human characters:** they still get racially coded (Jynx's black face recoloured purple; orcs; foreign-accented Disney villains).
- **The burglar costume:** it is a 19th-century cartoon shorthand (mask, prison stripes, swag bag).

Concrete rules follow:
- one body colour for everyone, chosen to be non-realistic;
- jobs = clothing; crime = action; records = paper;
- no costume, colour, body type or neighbourhood art marks criminality or poverty;
- neutral police iconography;
- bias shown only in patrols, reporting and records.

### Cited Findings
- **Correll, Park, Judd & Wittenbrink (2002), "The Police Officer's Dilemma"** (JPSP 83:1314–1329):
  - Method: "Using a simple videogame", Black or White targets holding guns or other objects appeared in complex backgrounds.
  - Result: "White participants made the correct decision to shoot an armed target more quickly if the target was African American than if he was White, but decided to 'not shoot' an unarmed target more quickly if he was White."
  - Moderators: the size of the bias varied with perceived cultural stereotype and contact, "but not with personal racial prejudice".
  
  — [Correll et al. PDF (UW course copy)](https://faculty.washington.edu/jdb/345/345%20Articles/Correll%20et%20al.pdf); [ResearchGate](https://www.researchgate.net/publication/10974305_The_Police_Officer's_Dilemma_Using_Ethnicity_to_Disambiguate_Potentially_Threatening_Individuals) (snippet only)
- **Burgess, Dill, Stermer et al. (2011), "Playing with Prejudice"** (Media Psychology):
  - Content analysis of top-selling game magazines and 149 game covers found overt racial stereotyping. White male characters were 76.4% of images.
  - Study 2 found the "dangerous" minority-male stereotype.
  - Participants classified violent stimuli faster after games with Black characters.
  
  — [vgresearcher summary](https://vgresearcher.wordpress.com/2012/01/29/playing-with-prejudice-in-videogames-burgess-et-al-2011/); [Dill & Burgess 2013 (Simulation & Gaming)](https://journals.sagepub.com/doi/abs/10.1177/1046878112449958) (snippet only)
- **Gilliam & Iyengar (2000), "Prime Suspects"** (AJPS 44(3):560–573):
  - The same suspect was digitally morphed to appear Black or White in a local-news story.
  - Showing him as African-American significantly increased endorsement of punitive policies.
  - In the LA news sample, over 50% of crime stories identified a suspect, more often non-white.
  
  — [ResearchGate](https://www.researchgate.net/publication/279714850_Prime_Suspects_The_Influence_of_Local_Television_News_on_the_Viewing_Public) (snippet only)
- **Frank & Gilovich (1988)** (JPSP 54:74–85):
  - NFL and NHL teams in black uniforms were penalised more. Switching to black brought "an immediate increase in penalties".
  - Lab work attributed this to both referees' biased judgments and players' increased aggression. The authors tie it to a cultural association of black with malevolence.
  
  — [Semantic Scholar](https://www.semanticscholar.org/paper/The-dark-side-of-self-and-social-perception:-black-Frank-Gilovich/673ae013bc538296b79325b69e08afcf3e2772e3); [Psychology Today](https://www.psychologytoday.com/us/blog/attitude-check/201610/do-uniform-colors-matter-in-sports) (snippet only)
- **Lippi-Green (*English with an Accent*)** studied 371 characters in 24 Disney animated films. About 20% of US-English speakers were "bad" characters versus about 40% of non-native English speakers — [Mediekultur follow-up study](https://www.mediekultur.dk/article/view/135083); [UPenn handout](https://ccat.sas.upenn.edu/~haroldfs/popcult/handouts/wenkeric.htm) (snippet only)
- **Jynx:**
  - In January 2000 Carole Boston Weatherford argued that Jynx's black face and large red lips echoed blackface caricature.
  - The face was recoloured from black to purple, and an anime appearance was cut or pulled.
  - Sources conflict on *when* the recolour happened: "in the second generation" (late 1999–2000) vs "in 2002". This is unresolved.
  
  — [Jim Crow Museum (Ferris State)](https://jimcrowmuseum.ferris.edu/question/2009/september.htm), [Wikipedia: Jynx](https://en.wikipedia.org/wiki/Jynx), [SVG](https://www.svg.com/302568/why-jynx-was-such-a-controversial-character-in-pokemon-games/) (snippet only)
- **Racially coded non-human species.** Commentary traces orcs to colonial "savage Other" imagery. Early D&D gave orcs low Intelligence and high Strength, and "evil" species drew on non-European coding — [James Mendez Hodes](https://jamesmendezhodes.com/blog/2019/6/30/orcs-britons-and-the-martial-race-myth-part-ii-theyre-not-human); [Linnaeus University blog](https://blogg.lnu.se/adecolonialview/blog/blogg/stereotypes-and-racism-portrayal-of-races-in-fantasy-video-games-a-reflection-of-the-real-world/) (snippet only; essay and blog-level sources, not empirical studies)
- **Origins of the burglar costume:**
  - The domino mask comes from 17th-century masquerades.
  - Stripes are prison stripes (or French sailors' jerseys).
  - The "swag" bag comes from F. Anstey's "Burglar Bill" (Punch, 1888).
  
  The full outfit became cartoon shorthand for "this is a criminal" — [Atlas Obscura](https://www.atlasobscura.com/articles/decoding-the-classic-burglar-outfit) (snippet only)
- **Pokémon's own coding** (see Q1): the Burglar's sack, shades and sneaking pose; Rocket's black uniform with a red emblem; police with flashlights and batons, at night only — [pokefirered graphics](https://github.com/pret/pokefirered/tree/master/graphics) (opened); [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Police_Officer_(Trainer_class)) (snippet only)
- **Playing police changes judgments.** Players who played a violent police officer judged real officers who committed crimes less negatively, and gave them shorter sentences, than generic criminals committing similar crimes — [Computers in Human Behavior (2010)](https://www.sciencedirect.com/science/article/abs/pii/S0747563210000427) (snippet only)
- **"Copaganda":** media portrayals justifying police power; research on media copaganda finds it "skews public opinion in a positive direction for police" — [Law & Society Review, "Academic Copaganda"](https://www.cambridge.org/core/journals/law-and-society-review/article/academic-copaganda/1D096FAF1C38403739FCBB8D482FE24A) (snippet only)
- **Unicode UTS #51 neutral tone.** Human emoji with no skin-tone modifier "should use a generic, non-realistic skin tone, such as RGB #FFCC22". The guidance is to keep depictions "as neutral or generic as possible" so that no real skin tone becomes the implied default — [UTS #51](https://unicode-org.github.io/unicode-reports/tr51/tr51.html) (snippet only); critique of modifiers in [First Monday, "Technically white"](https://firstmonday.org/ojs/index.php/fm/article/download/10060/8048) (snippet only)

### Inferences
**Concrete representation rules (proposed).** R1–R6 are design inferences grounded in the findings above. R7 restates the brief's own rule.
- **R1 — One species, one body colour, non-realistic.** Every agent uses the same blob body in one non-human hue. That is Primer blue, or emoji-style yellow following UTS #51's logic. No skin-tone ramps, no black/brown/white bodies, no hair, no age or gender markers, no ethnic dress, no voices or accents. Names, if any, come from neutral generated syllables.
- **R2 — Jobs are clothes.** Police and merchants are shown by *removable* uniform pieces (cap, apron) and an accent colour. Option: they take them off at home, which teaches that "the job is not the person".
- **R3 — Crime is an action.** There is no thief costume, colour, outline, aura or persistent icon: no mask, stripes, sack or black clothing.
  - A theft is shown only by the act: a sneak animation, the item hopping from victim to taker, short-lived bubbles.
  - Afterwards the agent looks like everyone else. At most, a carried-goods glyph shows while stolen goods are held, *in the true view only*.
- **R4 — Records are paper.** In the headline true-vs-recorded scenario, the "recorded" layer is drawn as reports, clipboards and ledger entries attached to *places and institutions*, not as marks on people. This keeps bias in reporting, patrols and records, as the previous round's rule requires.
- **R5 — Wealth is not appearance.** No shabby bodies, clothes or houses for poor agents by default. Wealth appears in the inspector, the charts, or an opt-in lens overlay. This prevents a visual "poor = criminal" pairing when poverty and theft correlate in the simulation.
- **R6 — Neutral police iconography:**
  - cap and badge only;
  - no weapons, batons, thin-blue-line or flag motifs, heroic or aggressive poses;
  - the same emote vocabulary as citizens (police also wince, err, get confused "?");
  - wrongful stops and missed crimes get the same visual weight as arrests.
- **R7 — No luminance morality.** Never map dark = bad or light = good: no black for any role, no darker blobs for any group.
- **Process.**
  - Keep an "appearance audit" checklist: does any visual feature correlate with crime *by construction*?
  - Make an automated test that the body sprite is byte-identical across roles except for accessory layers.
  - Playtest with a demographically diverse panel before launch.

### Gaps
- I found no published studio diversity guideline about criminal or police iconography in games (e.g. from Microsoft, Ubisoft or the IGDA). Searches did not surface one, and studio sites were blocked.
- A search for Ubisoft removing "thin blue line" symbols from Rainbow Six Siege in 2020 returned nothing verifiable, so the claim is not included.
- Empirical studies of whether *non-human* characters still trigger racial stereotyping (as opposed to essays and content analyses) were not found within budget.
- Burgess et al., Correll et al., Gilliam & Iyengar and Frank & Gilovich are snippet-only. Their effect sizes and replications are not reported here. Later work on shooter bias (e.g. the 2020 JMP follow-up) was seen only as titles.

---

## 5. Scale: how many 16×16 characters fit and stay readable; semantic zoom, follow-cams and district "towns"

### Takeaway
On a 1920×1080 screen with 16-px tiles:
- 2× shows 2,025 tiles;
- 3× shows 900;
- 4× shows 506.

Pokémon-like density (about 1 person per 100–270 tiles) means only about 2–20 people on screen. Physically packing one agent per tile gives about 500–2,000. Neither is the readability limit. Human attention is:
- observers track about 4 (up to 8 if slow, 1 if fast) moving objects;
- peripheral identification fails when neighbours sit closer than about 0.4–0.5× eccentricity. At 3×, that is about 1.6–2 tiles at 5° from fixation.

So:
- lab and town views should hold about 8–40 agents with ≤4 highlighted;
- city mode (10k) must switch representation, not just scale (semantic zoom);
- follow-cam gives a roughly GBA-sized window (1.5–2 GBA screens) around one agent;
- districts become "towns" you drop into.

### Cited Findings
- **Screen capacity** (computed; 16-px tiles):

  | Zoom on 1920×1080 | Logical px | Tiles visible | Agents at 1 per tile | at 1 per 4 tiles | at Pokémon outdoor density (1 per ~100–270 tiles) |
  |---|---|---|---|---|---|
  | 1× | 1920×1080 | 120×67.5 = 8,100 | 8,040 | 2,025 | 30–81 |
  | 2× | 960×540 | 60×33.75 = 2,025 | 1,980 | 506 | 7.5–20 |
  | 3× | 640×360 | 40×22.5 = 900 | 880 | 225 | 3.3–9 |
  | 4× | 480×270 | 30×16.9 = 506 | 480 | 127 | 1.9–5 |
  | 5× | 384×216 | 24×13.5 = 324 | 312 | 81 | 1.2–3.2 |
  | 6× | 320×180 | 20×11.25 = 225 | 220 | 56 | 0.8–2.3 |

  - Other screens: 1366×768 at 3× = 28.5×16 = 455 tiles; a 390×844-CSS-px phone at 2× = 12.2×26.4 = 321 tiles, and at 3× = 142 tiles.
  - The GBA frame (15×10 = 150 tiles) integer-scales into 1080p at 6× (1440×960); the DS frame (16×12 = 192 tiles) at 5× (1280×960).
  
  Pokémon densities come from the Q1 map data — [pokeemerald](https://github.com/pret/pokeemerald/tree/master/data/maps), [pokefirered](https://github.com/pret/pokefirered/tree/master/data/maps) (opened; computed)
- **Visual angle** (computed). On a 24-inch 16:9 1080p monitor at 60 cm, one pixel ≈ 0.0264° and the screen is about 50.7° wide. A tile spans 0.85° at 2×, 1.27° at 3× and 1.69° at 4×. With Bouma's 0.4–0.5 fraction, flankers start to "crowd" a target:

  | Eccentricity | 2× | 3× | 4× |
  |---|---|---|---|
  | 2° | 0.9–1.2 tiles | 0.6–0.8 tiles | 0.5–0.6 tiles |
  | 5° | 2.4–3.0 tiles | 1.6–2.0 tiles | 1.2–1.5 tiles |
  | 10° | 4.7–5.9 tiles | 3.2–3.9 tiles | 2.4–3.0 tiles |

  (computed from the Bouma fraction below)
- **Bouma law** (named by Pelli & Tillman 2008). The critical spacing below which flankers impair identification is proportional to eccentricity, "approximately 0.4 to 0.5 times the eccentricity" — [JOV: Bouma law revised](https://jov.arvojournals.org/article.aspx?articleid=2212997); [Pelli & Tillman 2008 PDF](https://www.cns.nyu.edu/~msl/courses/2223/Readings/Pelli-NatNeurosci2008.pdf) (snippet only)
- **Multiple-object tracking:**
  - Pylyshyn & Storm (1988): people track "4 to 5 independent targets at once", and performance declines from 5 targets — [PMC: Ensemble perception during MOT](https://pmc.ncbi.nlm.nih.gov/articles/PMC8049938/) (snippet only)
  - Alvarez & Franconeri (2007): up to **eight** targets at slow speeds, "just one" at high speeds, with a speed–number trade-off — [Harvard DASH PDF](https://dash.harvard.edu/server/api/core/bitstreams/03b15edf-7de4-449c-9d80-8c80c53ccc96/content); [JOV](https://jov.arvojournals.org/article.aspx?articleid=2121950) (snippet only)
- **Semantic zoom.** Pad (Perlin & Fox 1993) introduced "semantic zooming, which allows objects to be represented differently at different scales". Maps are the standard example — [UMD HCIL tech report](https://www.cs.umd.edu/hcil/trs/2006-09/2006-09.htm); [Hornbæk et al. (UMD)](http://www.cs.umd.edu/~bederson/images/pubs_pdfs/p362-hornbaek.pdf) (snippet only)
- **Pokémon's caps** (see Q1): 16 live objects; at most 2 approaching trainers handled at once; a 150-tile GBA viewport — [pokeemerald global.h](https://github.com/pret/pokeemerald/blob/master/include/constants/global.h), [trainer_see.h](https://github.com/pret/pokeemerald/blob/master/include/trainer_see.h) (opened)
- **Comparators:** Songs of Syx simulates up to about 30,000 individuals in pixel art (snippet; Q2). RimWorld warns that "hundreds of objects on the screen" make scanning hard (opened; Q2).

### Inferences
- **Readable caps (proposed):**
  - **Lab mode:** one town of about 20×15 to 30×17 tiles, which fits 4× at 1080p. Use 8–40 agents, about 1 per 10–60 tiles. That is denser than Pokémon but within a single view.
  - **≤4 "protagonist" agents** get name tags and charts, following MOT's ~4.
  - **≤4–6 concurrent emote bubbles** on screen, following MOT and Pokémon's 2-approacher cap. Overflow goes to a ticker.
- **Tile occupancy.**
  - On walkways at town zoom, aim for ≤1 agent per tile, so faces and bubbles never overlap.
  - Queues and markets may hold up to 4 per tile with sub-tile offsets.
  - Above 4, replace the pile with a "crowd stack" sprite plus a count badge.
  - The Bouma figures imply that faces and bubbles in the *periphery* are unreadable whenever neighbours are within about 2 tiles (3×). So events must be signalled by **pop-out** cues (bubble shape plus a single hop) that draw the eye, not by facial detail.
- **City mode (10k).** Never draw 10k walking sprites. Use semantic zoom levels Z0–Z3 (Q7 §7):
  - city: dots or heatmap;
  - district: sprites without faces, with event pins;
  - town: full sprites and bubbles;
  - follow-cam: about a 20×11–24×13-tile window at 5–6×, i.e. 1.5–2 GBA screens (the GBA shows 15×10).
- **District "towns".** Split the city into districts of about 100–200 agents, roughly the agent count of a large Pokémon city including interiors. Each district renders as a town at Z2. The rest run unanimated, matching Primer's "small on-screen populations with large unanimated runs behind them".
- **Integer zoom and device pixels.** Pixel art should be scaled by integers in *device* pixels. On DPR 1.25/1.5 laptops, render the world to an offscreen canvas at art resolution, then scale by the largest integer that fits and letterbox. This is my inference; see the prior engineering notes on DPR handling.

### Gaps
- No study gave a direct "max readable sprites per screen" number for games. The limits above are transferred from vision science (MOT, crowding) and are untested on this exact display.
- The Bouma and MOT findings are snippet-only. Viewing distance and monitor size are my assumptions (24-inch, 60 cm).
- Pokémon NPC counts exclude building interiors. The "people-like" filter is heuristic.

---

## 6. Accessibility with pixel art: colour-blind-safe role coding, emote readability, contrast on busy tiles, flicker vs reduced motion

### Takeaway
Role must be carried by **silhouette** (cap or apron) plus colour, and building function by **sign glyph** plus roof colour. That follows WCAG 1.4.1 and the Game Accessibility Guidelines' basic rule.

Computed checks:
- **A CVD-robust triad exists.** For example, Okabe–Ito yellow body / blue police / vermillion merchant keeps every pair at ΔE ≥ 31 (CAM02-UCS) under simulated protanopia, deuteranopia and tritanopia.
- **Some pairs fail.** Blue + bluish-green (tritan ΔE 12), blue + reddish-purple (protan ΔE 14) and light grey + yellow (tritan ΔE 13) should be avoided.
- **Mid-tone fills don't contrast with grass.** All role fills fall below 3:1 against a mid-green grass tile, so a 1-px dark outline is mandatory: 5.2:1 on grass, 9.5:1 on sand.
- **Outlines fail at night.** That outline collapses to about 1.5:1 on night-tinted ground. Tint only the background, and swap to a light rim at night.

Motion rules:
- no flashes above 3 per second;
- stop blinking within 5 s;
- support reduced motion: no hop, bob or pans; fades instead;
- provide pause and step controls;
- pair every bubble with a text log line.

### Cited Findings
- **WCAG 1.4.1 Use of Color:**
  - "Use information in addition to color, such as shape or text, to convey meaning."
  - A lightness difference with "a contrast ratio of 3:1 or greater" counts as an additional visual distinction.
  
  — [w3c/wcag understanding/20/use-of-color.html](https://github.com/w3c/wcag/blob/main/understanding/20/use-of-color.html) (opened)
- **WCAG 1.4.11 Non-text Contrast:** "Ensure meaningful visual cues achieve 3:1 against the background" — [understanding/21/non-text-contrast.html](https://github.com/w3c/wcag/blob/main/understanding/21/non-text-contrast.html) (opened)
- **WCAG 2.2.2 Pause, Stop, Hide:** "Let users control content changes that occur in parallel with other content". Benefits include "content that stops blinking after five seconds" — [understanding/20/pause-stop-hide.html](https://github.com/w3c/wcag/blob/main/understanding/20/pause-stop-hide.html) (opened)
- **WCAG 2.3.1 Three Flashes:** "Avoid content that flashes, or keep it under thresholds". The reference block is 341×256 px, representing "a 10 degree viewport at a typical viewing distance" — [understanding/20/three-flashes-or-below-threshold.html](https://github.com/w3c/wcag/blob/main/understanding/20/three-flashes-or-below-threshold.html) (opened)
- **WCAG 2.3.3 Animation from Interactions:**
  - "Support user preferences for motion, and eliminate unnecessary motion effects".
  - It cites vestibular reactions and parallax.
  - Example: a transition that "respects the prefers-reduced-motion CSS media query".
  - "Animation that is essential to the functionality or information … is allowed".
  
  — [understanding/21/animation-from-interactions.html](https://github.com/w3c/wcag/blob/main/understanding/21/animation-from-interactions.html) (opened)
- **Game Accessibility Guidelines (basic):** "Ensure no essential information is conveyed by a colour alone" (e.g. red vs green enemy outlines) and "Avoid flickering images and repetitive patterns" — [accessibilityguide.org mirror of GAG](https://accessibilityguide.org/game-accessibility-guidelines/) (snippet only; gameaccessibilityguidelines.com blocked)
- **Xbox Accessibility Guidelines:**
  - **XAG 103:** express visual and audio cues "by using multiple sensory methods".
  - **XAG 117:** let players "pause or completely stop any content that scrolls, blinks, auto-updates, or otherwise moves", including background animation behind text.
  
  — [XAG 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), [XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117) (snippet only)
- **Palettes.** Okabe–Ito: `#0072B2 #E69F00 #F0E442 #009E73 #56B4E9 #D55E00 #CC79A7 #000000`. Tol Bright: `#4477AA #EE6677 #228833 #CCBB44 #66CCEE #AA3377 #BBBBBB` — [bokeh src/bokeh/palettes.py](https://github.com/bokeh/bokeh/blob/HEAD/src/bokeh/palettes.py) (opened)
- **CVD distinguishability of role triads** (computed with colorspacious 1.1.2, Machado-style dichromacy at severity 100, ΔE in CAM02-UCS). Each cell is the minimum pairwise ΔE; higher is better.

  | Triad (body / police / merchant) | Normal | Protan | Deutan | Tritan |
  |---|---|---|---|---|
  | **Y: #F0E442 / #0072B2 / #D55E00** | 42 | 40 | 31 | 41 |
  | **P: #3E7EA0 (Primer blue) / #1F2A6B navy / #E69F00** | 32 | 32 | 30 | 30 |
  | off-white #F3F2F0 / #0072B2 / #D55E00 | 51 | 49 | 45 | 51 |
  | off-white #F3F2F0 / #0072B2 / #E69F00 | 38 | 40 | 37 | 34 |
  | #F0E442 / #0072B2 / #009E73 (bluish-green) | 35 | 35 | 35 | **12** |
  | #F0E442 / #0072B2 / #CC79A7 (reddish-purple) | 44 | **14** | 28 | 29 |
  | light grey #DDDDDD / #0072B2 / #F0E442 | 32 | 34 | 31 | **13** |
  | Tol sand / blue / green (#DDCC77 #4477AA #228833) | 39 | 29 | 34 | **7** |

  — [colorspacious on PyPI](https://pypi.org/project/colorspacious/) (opened as a package; computed)
- **WCAG contrast of sprite colours vs assumed ground tiles** (computed). The tile colours are my test assumptions, not a palette standard.

  | Sprite colour | Grass #5A9E4B | Sand #D8C08A | Paving #A8A8A8 | Night grass #24402A | Night paving #3A3F55 |
  |---|---|---|---|---|---|
  | Outline #1A1C2C | 5.16 | 9.49 | 7.09 | **1.48** | **1.62** |
  | Off-white #F3F2F0 | 2.92 | — | — | 10.19 | — |
  | Police #0072B2 | 1.59 | 2.92 | 2.18 | **2.20** | **2.00** |
  | Merchant #E69F00 | 1.45 | 1.27 | 1.06 | 5.06 | 4.61 |
  | Yellow #F0E442 | 2.47 | 1.34 | 1.80 | 8.62 | 7.85 |
  | White bubble #FFFFFF | 3.27 | **1.78** | 2.38 | 11.40 | 10.39 |

  - Dark glyph on a white bubble: 16.8:1.
  - Eye whites vs body: Primer blue 4.47:1; yellow body 1.32:1 (so use dark "bean" eyes on yellow).
  - Light-blue police variant #56B4E9 vs night grass: 4.94:1.
- **Practitioner pixel-art guidance:**
  - Silhouette test: "black out your character… if you can't tell a knight from a mage, no amount of shading will fix it".
  - "Distinctive silhouettes come from asymmetry and things that stick out—… a hat."
  - "At 16x16, outlines eat precious pixels—full 1px black borders maximize readability and work on any background."
  - "If your sprite overlaps widely varying backgrounds, hard black or shade-matched outlines guarantee legibility."
  - Use 2–3 colours per part and 6–12 per character.
  - Test "at actual size".
  
  — [pixel-editor.com outlines guide](https://www.pixel-editor.com/articles/pixel-art-outlines), [sprite-ai.art 16×16 guide](https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art) (snippet only; practitioner sites, low authority)
- RimWorld's 2–3 px black border for story-relevant things, and its "<3 px detail is wasted unless high contrast" rule — [RWModdingResources/artstyle.md](https://github.com/spdskatr/RWModdingResources/blob/master/artstyle.md) (opened)

### Inferences
- **Role coding that survives colour blindness.** Each cue works on its own and is backed up by the others:
  1. **Silhouette:** a police peaked cap, about 10×4 px with a brim; a merchant apron, about 8×5 px, with a 3×3 coin glyph.
  2. **Colour** from triad Y or P.
  3. At dot level (Z0), **SDF shape**: circle citizen, square police, triangle merchant, as in the previous round.
  
  Pass/fail test: min ΔE ≥ 20 under all three dichromacies, plus a greyscale silhouette test. The threshold is my choice, not a standard.
- **Emote readability:**
  - Use 16×16 bubbles, as in Pokémon, at ≥2× (≥32 CSS px) on desktop and ≥2× on phones.
  - Draw the glyph in 1–2 colours plus a 1-px dark outline. Keep glyph strokes ≥2 art px (≥3 px where possible, per RimWorld).
  - Give each event category a distinct *glyph shape*, so colour stays secondary.
  - White bubbles must carry a dark outline because white on sand is only 1.78:1.
- **Contrast on busy tiles:**
  - Give characters and bubbles the strongest outlines.
  - Draw ground and decoration with low internal contrast and no black outlines; plants get dark-green or no outline (RimWorld's hierarchy).
  - Automate a test: every sprite outline must be ≥3:1 against every walkable tile in every lighting state.
- **Night:**
  - Tint only ground and buildings.
  - Swap outlines to a light rim (or a soft "lantern" disc under each agent) at night, because the dark outline drops to about 1.5:1.
  - Pick role fills with ≥3:1 against night ground. #0072B2 police fails (2.2:1), so use a lighter variant (#56B4E9) or a light rim.
- **Flicker and reduced motion:**
  - The simulation's motion is "essential", but decorative motion is not.
  - With `prefers-reduced-motion` or the in-app toggle:
    - idle bob, emote hop, walk bounce and camera pans are off;
    - bubbles fade in over about 150 ms and out;
    - camera cuts instead of panning;
    - event "pulses" become static rings.
  - Never loop-blink markers. Any attention blink stops within 5 s (WCAG 2.2.2).
  - Keep event flashes ≤3 Hz and ≤1 tile in area.
  - Primer-style blinks (183 ms every ~3.3 s, small area) are not flashes in the WCAG sense. Still, stagger them per agent so a crowd doesn't blink in sync.
- **Multi-channel events** (XAG 103): bubble glyph + optional short sound per category + a text log line with the same glyph + a screen-reader live region rate-limited to about one line per second.

### Gaps
- I could not open gameaccessibilityguidelines.com or the Xbox guidelines. Their wording is snippet-only, and their minimum icon or text sizes were not retrieved.
- The ΔE ≥ 20 threshold and the ground-tile colours are my assumptions. Run real palette tests and user tests with colour-blind players.
- No empirical source on minimum *pixel-art emote size* was found. The 16×16-at-≥2× rule rests on the Pokémon precedent and the arithmetic in Q5.

---

## 7. Deliverable: a draft art bible ("Dot Society: Town Edition", v0.1)

### Takeaway
The draft below turns the findings into rules:
- 16-px grid; integer zooms 2×/3×/4× plus a 5–6× follow-cam;
- a 32-colour master palette with ≤15 colours per sprite;
- one blob body for everyone, with jobs worn as accessories;
- 4-direction, 3-pose walk sheets;
- 8 Primer-derived eye/mouth overlays;
- a 16×16 emote vocabulary with priorities and caps;
- roof + glyph + silhouette building signals;
- HGSS-style light periods that tint only the background;
- four semantic zoom levels.

Every rule cites its evidence in Q1–Q6. Choices with no evidence are marked as proposals.

### Cited Findings
Evidence anchors used by the bible. Details and full citations are in Q1–Q6.
- **Grid and sprites:** 16×16 map cells; NPC frames of 16×32 (GBA) and 32×32/4bpp (DS); 9-frame sheets with mirrored east; an 8-frame-beat walk; 16 frames per tile — [pokeemerald](https://github.com/pret/pokeemerald), [pokeheartgold](https://github.com/pret/pokeheartgold) (opened)
- **Emotes:** 16×16, held 60 frames, anchored y−16, ~15-px hop-in; "!", "?" and heart; trainers wait for the icon, then approach — [pokeemerald trainer_see.c](https://github.com/pret/pokeemerald/blob/master/src/trainer_see.c) (opened)
- **Light periods:** LATE 0–3, MORN 4–9, DAY 10–16, EVE 17–19, NITE 20–23 — [pokeheartgold gf_rtc.c](https://github.com/pret/pokeheartgold/blob/master/src/gf_rtc.c) (opened)
- **Hardware palettes:** 16 colours per 4bpp sub-palette; FRLG overworld sheets use 12–14 colours — [Tonc objbg.md](https://github.com/gbadev-org/tonc/blob/master/content/objbg.md) (opened); [pokefirered graphics](https://github.com/pret/pokefirered/tree/master/graphics/object_events/pics/people) (opened; computed)
- **Common palette sizes:** PICO-8 (16), DawnBringer 16/32 and Endesga 32 are among Lospec's most-used palettes. DB32 dates from 2014 and has 32 colours — [Lospec](https://lospec.com/) (snippet only)
- **Primer's expression set and trait mapping:** angry/normal/surprise/wince eyes, show/hide mouth, cheer, blinks (3.3 s mean, 183 ms) — [Helpsypoo/primer](https://github.com/Helpsypoo/primer) (opened)
- **RimWorld:** outline hierarchy, the 3-px detail rule, a 2–3-px border on story-relevant things — [RWModdingResources](https://github.com/spdskatr/RWModdingResources/blob/master/artstyle.md) (opened)
- **Accessibility:** WCAG 1.4.1, 1.4.11, 2.2.2, 2.3.1, 2.3.3 — [w3c/wcag](https://github.com/w3c/wcag) (opened); GAG and XAG (snippet only); CVD and contrast tables (computed, Q6)
- **Ethics:** Correll et al.; Gilliam & Iyengar; Burgess et al.; Frank & Gilovich; Lippi-Green; Jynx; UTS #51 (all snippet only, Q4)
- **IP:**
  - Nintendo issued a DMCA takedown of *Pokémon Uranium* soon after its 6 Aug 2016 release, by which point it had been downloaded 1.5 million times in its first week.
  - It filed DMCA notices against 562 fan games on GameJolt in early September 2016.
  - It sent a cease-and-desist to *Pokémon Prism* in December 2016.
  
  — [MyNintendoNews](https://mynintendonews.com/2016/08/14/nintendo-files-multiple-takedown-notices-against-pokemon-uranium/), [Wikipedia: Pokémon Uranium](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Uranium), [Wikipedia: Pokémon Prism](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Prism) (snippet only)

### Inferences
The art bible below is my synthesis. Numbers that come from sources are marked [src]; the rest are proposals.

#### 0. Pillars
1. **Legible before pretty (RimWorld):** abstract icons, minimal noise, an outline hierarchy, no detail under 3 px unless high-contrast.
2. **One meaning per channel (Primer):**

   | Channel | Meaning |
   |---|---|
   | Body | the same for everyone |
   | Uniform colour + shape | job |
   | Face | momentary feeling |
   | Bubble | event |
   | Ground overlay | place statistics |
   | Charts | aggregates |
3. **Crime is an act, records are paper, jobs are clothes** (Q4 R1–R7).
4. **Everything twice:** shape + colour for every status; icon + motion (+ text and sound) for every event (WCAG 1.4.1, XAG 103).
5. **GBA/DS feel, original art:** genre conventions yes; Nintendo assets, logos, names and trade dress never (see §10).

#### 1. Grid, camera and movement

| Item | Spec |
|---|---|
| Tile | **16×16 px** [src: Pokémon map cells]. World coordinates in tiles; agents hold continuous float positions; draw snapped to whole art pixels. |
| Zoom steps (1080p) | **2×** district (60×34 tiles) · **3×** town default (40×22.5) · **4×** street (30×17) · **6×** follow-cam (20×11, about 1.5 GBA screens; the GBA shows 15×10) [computed]. Laptops 1366×768: 2× and 3×. Phones: 2× (12×26 portrait), 3× optional. |
| Scaling | Nearest-neighbour; integer factors in device pixels (offscreen art-resolution canvas → largest integer fit → letterbox). |
| Camera | Free pan in town and district; follow-cam keeps the selected agent centred with a dead zone of about 3×2 tiles; cuts, not pans, under reduced motion. |
| Movement | Path on the tile graph; render continuous interpolation. Default walk **≈3.7 tiles/s** at 1× simulation speed [src: 16 frames per tile]. Walk-cycle beat ≈8 art frames at 60 Hz (≈134 ms) [src]. Above about 4× sim speed, drop walk cycles (glide). Above about 16×, switch to the Z0 dot view. |
| Occupancy | ≤1 agent per tile on walkways at Z2/Z3; ≤4 with sub-tile offsets in queues and markets; >4 → crowd-stack sprite + "×N" badge. |
| Sight lines | Witness and police notice range: straight-line or cone, 3 tiles by default (Pokémon median 2–3, max 7 [src]). Drawable as an overlay in lab mode. |

#### 2. Palette

| Item | Spec |
|---|---|
| Master palette | **32 colours** (DB32/Endesga-32-sized; custom). Each sprite ≤15 colours + transparent [src: GBA 4bpp]; characters 6–10 colours. |
| Body (everyone) | **Option Y:** #F0E442 (Okabe–Ito yellow, emoji-neutral logic), dark 2×2 "bean" eyes. **Option P:** #3E7EA0 (Primer blue), white 2×3 eyes with 1×2 pupils (eye contrast 4.47:1) [computed]. |
| Role accents | **Option Y:** police #0072B2, merchant #D55E00 (min ΔE ≥31 under all dichromacies). **Option P:** police navy #1F2A6B, merchant #E69F00 (≥30) [computed]. Night variant for police: #56B4E9 or a light rim. |
| Forbidden as body or role colours | black; skin-tone ramps (beige/brown); white as the "default" body; prison-coded orange or black for any person-state; red for any person. |
| Outline | Day: 1-px #1A1C2C (5.2–9.5:1 on grass/sand/paving). Night: 1-px light rim (or lantern disc) because the dark outline drops to about 1.5:1 [computed]. |
| Event accent colours (bubbles only) | Crime/alert: red-orange glyph · Economy: gold · Needs: blue · Justice/records: violet/grey. Each category also has a distinct glyph shape. |

#### 3. Characters (sprite list)

| Item | Spec |
|---|---|
| Canvas | **16×24** (body in the bottom 16×16; 8 px of headroom for headgear and hop). Origin bottom-centre. Emote anchor 16 px above the canvas top [src: y−16]. |
| Body | One blob for all agents: about 14×11-px dome + 1-px outline; eyes 2×3 (P) or 2×2 (Y); mouth 2–3 px, hidden by default (Primer). No hair, ears, clothing, age or gender cues. |
| Directions | 4: S, N, W drawn; **E = mirrored W** [src]. |
| Frames per direction | idle ×2 (open, blink); walk/hop ×3 (squash, neutral, stretch), played step–neutral–step–neutral like Pokémon [src]; sneak ×2 (lowered, eyes sideways; usable by *any* agent); carry ×2 (item above head). |
| Specials (south-facing only) | sleep ×2, sit ×1 (home or jail yard), cheer ×2, wince ×1. |
| Expression overlays (Primer set) | normal · blink · angry (slanted 1-px brows) · surprise (eyes +1 px) · wince ("><" squint) · happy (mouth up) · sad/fear (brows up) · asleep (closed line) → 8 × 3 directions = 24 tiny overlays. |
| Role accessories (overlays) | Police: peaked cap about 10×4 + brim + 2×2 badge. Merchant: apron about 8×5 with a 3×3 coin glyph (or a visor). Citizen: none. 2 accessories × 3 directions = 6, offset per frame in code. Removed at home (optional "job ≠ person" cue). |
| Count | About 33 body frames + 24 overlays + 6 accessories ≈ 63 sprites, plus about 20 emotes. Fits one 256×256 atlas (16×24 cells: 16 per row × 10 rows). Role variants via palette swap of the accessory layer only; the body layer is identical for all agents (testable). |

#### 4. Emote vocabulary (16×16 bubbles)

**Format.** Each bubble is a white fill with a 1-px dark outline and a 1–2-colour glyph.
- **Animation:** hops in about 15 px over about 11 frames, then holds about 1.0 s (Pokémon timing [src]); 1.5–2 s for justice events. Under reduced motion: no hop, 150 ms fade.
- **Concurrency:** one bubble per agent at a time; ≤4–6 on screen; overflow goes to the ticker.
- **Priority:** justice > crime > economy > needs > mood.

| Simulation event | Who shows it | Glyph (shape first) | Face / animation | Chart/log link | View |
|---|---|---|---|---|---|
| Theft committed | taker | none (no "thief" bubble) | sneak ×2 → item hops from victim to taker | +1 on **true crime** line (marker = small hand glyph) | true view only |
| Witness spots theft | witness | **"!"** [src: Pokémon spotting] | surprise eyes, faces the act | log "X saw a theft" | true and recorded |
| Victim notices loss | victim | **"?"** then lightning-mark | wince (Primer) | — | both |
| Report filed | reporter (witness or victim) | **clipboard/paper** | walks to station; paper flies to records office | +1 on **recorded crime** line (same clipboard glyph) | both |
| Police spots suspect | officer | **"!"** | faces, then approaches (Pokémon grammar, non-blocking) | — | both |
| Arrest | officer + arrestee | **handcuff ring** | escort walk, same speed | +1 arrests | both |
| Jailed | jail building | **bars** counter on roof sign | agent sits in jail yard | jail occupancy | both |
| Released | released agent | **open door** | cheer ×1 | — | both |
| Purchase | buyer | **coin "$"** | happy mouth (Primer show_mouth) | price chart tick at the trade price | both |
| Price too high / no sale | buyer or seller | none (face only) | **angry eyes, mouth hidden** [src: Primer price_reaction] | — | both |
| Wage / income | worker | coin with "+" | cheer | income chart | both |
| Hungry (need ≥ threshold) | agent | **bread/drumstick** | sad brows | needs histogram | both (repeat ≤ once per 10 s) |
| Afraid (crime nearby, recent victim) | agent | **sweat drop** | wince | fear meter | both |
| Bankrupt | agent / shop | **empty purse "0"** | sad; shop shutter closes | bankruptcies | both |
| Sleeping | agent | **"Zz"** [Stardew "sleep"] | asleep eyes; window dark | — | both |
| Social / content | agent | heart / note [Pokémon heart; Stardew] | happy | — | optional |

#### 5. Buildings
Each building type uses at least two channels: roof colour + sign glyph + silhouette. This mirrors Pokémon's roof + emblem + door coding [src: snippet] without copying its emblem or its red/blue pairing.

| Building | Roof | Sign glyph | Silhouette and state cues |
|---|---|---|---|
| Home | varied neutral roofs (random, *not* by wealth) | none | door; window lit when occupants are awake at night, dark when asleep |
| Shop / market stall | amber awning stripes | coin | counter + stock crates (visible inventory); shutter down when out of stock or bankrupt |
| Police station | slate blue-grey | badge (plain star/shield; no flags) | patrol-route board; officers leave and return here |
| Jail | stone grey | bars | barred windows, fenced yard; occupancy counter on the sign |
| Records office / town hall | violet-grey | ledger/paper | reports fly in from the station (the "recorded" pipeline in the true-vs-recorded scenario) |
| Workplace / farm (if wages) | brown or green | crate or wheat | work animation at the door |
| Street lamps | — | — | light pools at night (also serve as night contrast aids) |

No "slum" decay tied to wealth by default. Neighbourhood statistics such as poverty, patrol intensity and report rates appear only as toggleable ground overlays (R5, R7).

#### 6. Day/night
- **Clock periods** (HGSS model [src]): morning 04–09, day 10–16, evening 17–19, night 20–03. Simulation logic must not assume "crime = night" or "police = night" (unlike Pokémon's night-only officers [src: snippet]).
- **Rendering:**
  - multiply-tint the ground and building layers only; sprites, bubbles and role colours stay untinted;
  - switch sprites to the night rim;
  - light windows and lamps;
  - fade period changes over ≥2 s (no flashes);
  - provide a "tint off" toggle.

#### 7. Semantic zoom: what appears at each level

| Level | Zoom (1080p) | Visible | Agents | Shows | Hides |
|---|---|---|---|---|---|
| Z0 City | ≤1× | ≥8,100 tiles | up to 10k | 1–3-px dots: role colour + shape (circle/square/triangle) or a density heatmap; event pulses aggregated per district at ≤3 Hz; district names; charts are primary | sprites, faces, bubbles |
| Z1 District | 2× | about 2,025 tiles | about 100–500 | 16×24 sprites with role accessories; only justice and crime *pins* (static icons) | faces, minor bubbles (to ticker) |
| Z2 Town (lab default) | 3–4× | 506–900 tiles | 8–40 | full sprites, expressions, all bubbles (capped), building signs, sight lines (lab), ≤4 protagonists with name tags | — |
| Z3 Follow-cam | 5–6× | 225–324 tiles (1.5–2 GBA screens) | the followed agent + neighbours | thought panel (needs, money, plan), captions for its events, inspector synced to charts | other agents' bubbles dimmed |

Plus:
- Large unanimated batch runs feed the charts.
- City mode's 10k agents are split into district "towns" of about 100–200 agents. The viewer drops into one district at Z2 while the rest runs unanimated.

#### 8. Charts that move with the creatures
- Use **the same glyphs** in bubbles, chart markers, legend and log. For example:
  - the "!" of a witnessed theft and the hand marker on the *true crime* line;
  - the clipboard on the *recorded crime* line;
  - the coin on the price chart.
- Each event emits a small particle that flies from the agent to the chart's legend glyph (off under reduced motion).
- Protagonists at Z2/Z3 carry Primer-style **mini bars** (wallet, hunger) that ride with the sprite, following Primer's `DrawnAgent` display modes [src].

#### 9. Accessibility checklist (automatable where possible)
- Role = accessory silhouette + colour (+ dot shape at Z0). Building = roof + glyph + silhouette. Event = glyph shape + colour + optional sound + log line.
- **Contrast:** every outline ≥3:1 against every walkable tile in every light period (unit test over the palette and tile set). Bubble outline likewise.
- **CVD:** role triad min ΔE ≥ 20 (CAM02-UCS) under simulated protan, deutan and tritan; greyscale silhouette test of all roles.
- **Motion:**
  - with `prefers-reduced-motion` or the in-app toggle: no hop, bob or pans; fades instead; static rings instead of pulses;
  - pause, step and speed controls always visible;
  - no element flashes >3 Hz;
  - attention blinks stop within 5 s.
- **Text:** event log with glyph + words; screen-reader live region throttled to about one line per second.
- **Sizes:** never render sprites or bubbles below 2× (32 CSS px per 16 art px). Phones default to 2×.

#### 10. IP and originality (Pokémon look without Pokémon assets)
- **Never use:** ripped sprites (Spriters Resource), any graphics from the decomp repositories, Poké Ball or other Pokémon emblems, Pokémon fonts, names (e.g. "Poké Mart"), music, or the specific red-roof-with-ball/blue-roof-Mart trade dress.
- Nintendo has enforced aggressively against fan games (Uranium, 562 GameJolt titles, Prism; 2016).
- Generic genre conventions (16-px grid, top-down ¾ view, 4-direction walk cycles, "!" bubbles) are widely shared across non-Nintendo games. Treat this as a design observation, not legal advice. Have counsel review before a public launch if the resemblance is deliberate.

#### 11. Representation rules (summary of Q4)
Same body for all. Jobs are clothes. Crime is an act. Records are paper. Wealth is not appearance. Police iconography is neutral. No luminance morality. Bias lives in patrol, reporting and records overlays. There is an automated test that the body layer is identical across all agents.

### Gaps
- The bible's specific numbers have not been playtested; they are proposals. Examples: 14×11 body, ≤4–6 concurrent bubbles, crowd stack at >4 per tile, district size 100–200 agents, ΔE ≥ 20.
- **Palette choice is open.** Option Y gives better CVD margins and follows the emoji-neutral logic. Option P is more Primer-faithful and keeps eye contrast. Neither was user-tested.
- The 32-colour master palette is not specified colour by colour. Lospec could not be opened to compare DB32 and Endesga 32 values.
- I did not test glyph legibility (clipboard vs paper vs ledger at 16×16). These need a quick recognition test with novices at 2× and 3×.
- The IP section is not legal advice. I found no authoritative source on which overworld conventions are protectable.
