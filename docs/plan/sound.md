# Sound plan

Status: draft, 7 October 2026. No code or audio exists yet. This plan is not in the shared plan doc, and its tasks carry no round tag, because no research round has checked them. Every figure is an unsourced estimate unless marked otherwise.

## The answer

- **The game sounds GBA-era: original chiptune, made as code like the sprites.** A small Web Audio synth plays sound effects and music written as text in `tools/sounds/`. The game ships almost no audio files and nothing to license.
- **Sound follows the sim and never feeds it.** Only the renderer plays sound, from the same snapshots and events it draws. A replay sounds the same, and turning sound off changes no state hash.
- **Sound obeys the content rules:**
  - justice sounds are neutral;
  - wrongful stops sound as prominent as arrests;
  - nothing is keyed to wealth, hue or look;
  - culture is heard only at festivals and music events, as differences in tempo, loudness and structure.
- **Sound is optional.** It stays silent until the first click, has a mute and three volume sliders, and every sound has a visual twin.
- **It lands in steps:** UI sounds in M1 and the town in M3, then justice in M4, the country and wonders in M8, and zoom in M9. That is about 18–28 days in all.

## What players hear

| Layer | Examples | When it plays |
| --- | --- | --- |
| UI | Click, toggle, bet locked, Run, result revealed | Menus, lab cards, the builder |
| Town events | Purchase, emote blips (heart, question, food, sleep), door, harvest, building work | Near the camera, at street and district zoom |
| Justice | Theft (true view only), report filed, stop, arrest, wrongful stop, release | Under the same rules as the visuals |
| Military | Drill drum cadence, a short horn call for the change of watch, marching steps, a gate creak; no battle sounds or fanfare | Near garrisons, forts and patrols ([military plan](military.md)) |
| Ambience | Birds by day, crickets at night, sea, river, wind, marsh frogs, a crowd murmur that rises with visible density | By biome, time of day and zoom |
| Wonders | Waterfall roar, geyser rumble and burst, waves at the sea arch, wind on the glacier, bubbling hot springs, cave drips, birds at the giant tree, desert wind at the dune | In wonder views, and faintly nearby |
| Music | Title, lab, town by day, town by night, country map, festival styles | One track at a time, crossfaded |

## Style and source

- **Voices:** pulse, triangle and noise channels, plus a few short sounds rendered by code. This fits the GBA-era look without copying any game.
- **Sounds as code.** `tools/sounds/` mirrors `tools/sprites/`:
  - each effect is a small parameter set (wave, pitch sweep, envelope, noise);
  - each track is a text pattern (notes, tempo, instrument);
  - a build writes WAV previews for review and a JSON bank for the game;
  - the game's synth plays the same definitions, so previews and the game always match.
- **IP rules,** following the content rules:
  - never copy, transcribe or imitate a Nintendo or Pokémon melody, jingle or sound, such as a healing jingle, a level-up fanfare or creature cries;
  - every new track gets a by-ear check against well-known jingles before it is committed;
  - CC0 packs (Kenney, Ninja Adventure) may stand in as placeholders, each with its licence file and a row in `assets/LICENSES.md`;
  - paid packs never enter the public repo.

## Rules

1. **The sim never reads audio.** Audio reads only the renderer's snapshots and events. Music and ambience variations come from keyed draws on (world seed, place, day), so replays sound alike.
2. **Crime is an act, never a costume.**
   - The theft sound plays only in the true view, and is the same for everyone.
   - No motif follows a person, and no sound marks anyone afterwards.
3. **Policing stays neutral.**
   - No heroic fanfare and no siren drama.
   - A wrongful stop matches an arrest in loudness and length, as the visuals draw both "as heavily".
4. **Wealth is never audible.** One purchase sound plays for every purchase, whatever the amount or buyer.
5. **No mood sounds.** Faces show events, never wellbeing, so no person or town sound tracks happiness or wealth.
6. **Culture is heard only at festivals and music events** (round 8).
   - Styles differ only in tempo, loudness and structure, from one shared instrument set, with invented names.
   - No instrument, scale or rhythm recognisably tied to a real-world culture.
   - Culture music never plays in justice views, and the culture lens's sounds stay off crime events.
7. **Looks are silent.**
   - No voice or pitch keyed to hue, eye shape or pattern.
   - Emote blips are one shared set, with a small random pitch wobble per event.
   - No gendered or age-coded voices.
8. **Sound never carries information alone.** Every cue has a bubble, log line or icon beside it.

## Mixing and performance

- **Buses:** master, then music, ambience, effects and UI. Effects briefly duck the music.
- **Crowds aggregate.**
  - Cap concurrent voices (about 24) and each kind of sound per second.
  - When many events happen at once, a bustle layer rises instead. A busy market swells; it never plays 100 coin sounds.
- **Space and zoom:**
  - Only events in or near the view play, panned by screen position.
  - Street zoom carries event sounds. District zoom carries softer ones. City, region and country zoom carry ambience and music only.
  - M9 crossfades between the zoom levels.
- **Time of day:** ambience swaps at dawn and dusk, with the town's light periods.
- **Load:**
  - No audio on the first-frame path.
  - The audio chunk (synth plus banks, about 10–20 KB brotli) loads after the first frame.
  - The audio context starts on the first click, as browsers require.
- **CPU:** the synth runs in an AudioWorklet. Main-thread audio work stays under about 0.5 ms a frame at 100,000 agents.
- **Loudness:** one target for music and one for effects, and no clipping. The exact levels are set in M1 and checked by the sound tool's tests.

## Controls and accessibility

- Silent until the first click; a sound button in the HUD; `M` toggles mute.
- Sliders for music, ambience and effects, saved per device. Settings never ride in share links.
- A classroom mode that starts muted.
- No sudden loud stingers; result reveals stay gentle, whichever way the bet went.
- Any sound longer than 3 seconds can be paused, stopped or turned down, as WCAG's audio-control rule asks (to verify against WCAG 2.2).

## Tasks by milestone (draft)

**M1 Lab mode**
- [ ] Load the audio chunk after the first frame and start the audio context on the first click. Add buses, mute, the three sliders, per-device saving and classroom mode (2–3 days).
- [ ] UI sounds: click, toggle, bet locked, Run, result revealed (0.5–1 day).
- [ ] `tools/sounds/` (2–3 days):
  - text definitions;
  - WAV previews and a JSON bank;
  - tests for determinism (same bytes from the same definitions), peaks, length and loudness;
  - every file listed in `assets/LICENSES.md`.

**M3 City life**
- [ ] Event sounds near the camera: purchase, emotes, doors, work. Add voice and rate caps, and the bustle layer (2–3 days).
- [ ] Ambience by biome and time of day, with a crowd murmur that follows visible density (2–3 days).
- [ ] Music: title, and the town by day and by night, composed as code (3–5 days).
- [ ] Festival and music events: culture styles from one instrument set, varying only tempo, loudness and structure (1–2 days).

**M4 Crime and police**
- [ ] Justice sounds: a neutral act cue in the true view only, plus report, stop, arrest and wrongful stop. A wrongful stop and an arrest match in loudness and length (1–2 days).

**M6 Scale and sharing**
- [ ] Profile at 100,000 agents: aggregation, voice caps and worklet cost within budget (0.5–1 day).
- [ ] Builder sounds for the Build mode's tools (0.5 day).

**M8 Country map**
- [ ] Country and region music and ambience, plus the 11 wonder ambiences (2–3 days).

**M9 Zoom across scales**
- [ ] Crossfade music and ambience between country, region, city and street (0.5–1 day).

## Exit checks

- [ ] No sound before the first click; mute and sliders survive a reload.
- [ ] A replay with sound on and off gives identical state hashes.
- [ ] Audio audit: outside festival music, no sound parameter differs by hue, look, culture, wealth decile or offender status in the recorded view. A wrongful stop and an arrest match in loudness and length.
- [ ] Every event type that has a sound also has a visual twin.
- [ ] Every bank entry comes from `tools/sounds/` or from a CC0 file listed in `assets/LICENSES.md`.
- [ ] The audio chunk stays within about 20 KB brotli, and main-thread audio work within about 0.5 ms a frame at 100,000 agents.

## Open questions

- Chiptune only, or soft sampled instruments for some music?
- If any recorded files are used, which format plays everywhere, including Safari?
- The voice cap, loudness targets and budgets above are estimates to set in M1.
- Should a lean research round first check browser autoplay rules, accessibility, and how cosy games handle ambience (Stardew Valley, Animal Crossing, Townscaper)?
