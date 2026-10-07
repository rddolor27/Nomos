# Sound

Oct 7, 2026 · @Rd

Nomos sounds GBA-era: original chiptune, written as data and played by the game's own synth, following the sim and never feeding it. 94 sounds in 7 banks already exist in `assets/sounds/`, built by `tools/sounds/`. The tasks are in Implementation plan, tagged (Sound).

## What players hear

Seven layers play, each from its own bank in `assets/sounds/`, and only events in or near the view make a sound.

| Layer | Bank | What it holds | When it plays |
| --- | --- | --- | --- |
| UI | `ui`, 17 effects | Click, toggles, panels, notify, error, save; lab bet locked, Run started and three result reveals; builder brush, place, erase and undo | Menus, lab cards and the builder |
| Town events | `events`, 28 effects | Purchase, 7 emotes, doors, footsteps on 4 surfaces, harvest, hammer, clock chime, windmill and 10 animal calls | Near the camera, at street and district zoom |
| Justice | `justice`, 7 effects | Theft, report filed, stop, arrest, wrongful stop, release, record filed | Under the same rules as the visuals |
| Military | `military`, 7 effects | Drill drum, watch horn, march, march step, gate creak, spear tap, helmet clink | Near barracks, forts and patrols |
| Ambience | `ambience`, 15 loops | Grassland, forest and coast by day and night; river, marsh, desert, mountain, snow; quiet, busy and market town; country | By biome, time of day, season and zoom |
| Wonders | `wonders`, 11 loops | One per natural wonder: waterfall roar, geyser bursts, waves at the sea arch, cave drips and the rest | In a wonder's view, and faintly nearby |
| Music | `music`, 9 tracks | Title, lab, town by day, town by night, country map, and the festival styles Brightstep, Turnwheel, Echofield and Evenstride | One track at a time, crossfaded |

**Which event plays which sound** (draft; the triggers are set in M3, M4 and M8):

| The renderer shows | Sound |
| --- | --- |
| A purchase, any amount and any buyer | `trade_purchase` |
| An emote bubble | `emote_<name>` (heart, question, exclaim, food, sleep, sweat, coin), with a small random pitch wobble |
| A door; a footstep at street zoom | `door_open`, `door_close`; `step_<surface>` (grass, path, paving, sand) for the tile underfoot |
| Work | `work_harvest` in fields; `work_hammer` at workshops and building sites |
| The hour | `town_clock-chime` from a clock tower in view |
| Theft, in the true view only | `justice_theft` |
| A report, stop, arrest, wrongful stop, release or filed record | `justice_<event>`; the wrongful stop matches the arrest |
| A drill, the change of watch, a passing patrol, a fort gate | `military_drill-drum`, `military_watch-horn`, `military_march` with `military_march-step`, `military_gate-creak` |
| A lab result | `ui_lab_result-held`, `-failed` or `-inconclusive`: each 0.8 s at the same loudness, so no outcome is cheered |

## Rules

Sound follows the same content rules as the art, and the audio audit in M4 checks them.

1. **The sim never reads audio.** Audio reads only the renderer's snapshots and events. Music and ambience variations come from keyed draws on (world seed, place, day), so a replay sounds the same.
2. **Crime is an act, never a costume.** The theft cue plays only in the true view and is the same for everyone. No motif follows a person, and no sound marks anyone afterwards.
3. **Policing stays neutral.** There is no heroic fanfare and no siren drama. A wrongful stop matches an arrest in length and loudness (RMS within 1 dB), and the justice bank's build asserts it.
4. **Wealth is never audible.** One purchase sound plays for every purchase, whatever the amount or the buyer.
5. **No mood sounds.** Faces show events, never wellbeing, so no person or town sound tracks happiness or wealth.
6. **Culture is heard only at festivals and music events** (round 8).
   - Styles share one instrument set and differ only in tempo, loudness and structure. Their names are invented.
   - No instrument, scale or rhythm is recognisably tied to a real-world culture.
   - Culture music never plays in justice views, and the culture lens adds no sound to crime events.
7. **Looks are silent.** No voice or pitch is keyed to hue, eye shape or pattern. Emote blips are one shared set, and no voice is gendered or age-coded.
8. **Sound never carries information alone.** Every cue has a bubble, log line or icon beside it.
9. **Original sound only.** Never copy, transcribe or imitate a Nintendo or Pokémon melody, jingle or sound, such as a healing jingle, a level-up fanfare or creature cries.
   - A person listens to every new track for resemblance to well-known jingles before it is committed.
   - CC0 packs (Kenney, Ninja Adventure) may stand in as placeholders, each with its licence file and a row in `assets/LICENSES.md`. Paid packs never enter the public repo.
10. **Soldiers sound at rest.** Drills, horns, marching and gates only: no battle sounds, clashing steel or fanfare.

## How it is built

Every sound is data: `tools/sounds/` writes each bank as JSON definitions, and the game's synth plays those same definitions. No recorded audio ships.

- **Build:** `python tools/sounds/build_all.py` writes the 7 banks to `assets/sounds/<bank>.json`, WAV previews to `dist/sounds/` (gitignored), and the bank rows of `assets/LICENSES.md`.
- **Check:** `python tools/sounds/test_sounds.py`. It passes today.
- **Bank file:** `{"rate": 22050, "sounds": {<name>: {kind, seed, seconds, peak_db, rms_db, def}}}`. The seed is the CRC-32 of `<bank>/<name>`. Music entries also carry key, meter and form.
- **Names:** lowercase, underscores between parts and hyphens inside a part, like the sprites: `ui_click`, `amb_coast_day`, `music_town-day`.

| Kind | Its definition holds |
| --- | --- |
| `effect` | `layers`, each with an optional `start` in seconds, and a `gain` in dB |
| `loop` | `length`; held `layers` (noise beds and drones, with an optional `swell` of \[rate, depth\]); seeded `events`, each a count, pitch range, volume range and sound. It wraps without a seam |
| `music` | `tempo`, `steps`, `step_beats`, named `instruments`, and `tracks` of notes \[step, MIDI note, length in steps, velocity\]. It loops unless `loop` is false |

**A layer** is one oscillator:

- `wave`: pulse (with `duty`), triangle, saw, sine or noise;
- pitch: `note` (MIDI) or `freq` \[start, end\] in Hz, swept exponentially over the gate; for noise it is the hold rate, and lower is darker;
- envelope: `length` (the gate), `attack`, `decay`, `sustain` and `release`, in seconds;
- `volume`, and optional `detune` (semitones), `vibrato` \[rate, depth\], `arp` steps with `arp_rate`, and one-pole `lowpass` and `highpass` in Hz.

**Levels** are unsourced starting points. Nothing may pass −1 dBFS; `Bank.add` rejects it.

| Bank | Peak | Loudness (RMS) |
| --- | --- | --- |
| UI | ≤ −8 dBFS | −30 to −22 dBFS |
| Events, justice, military | ≤ −6 dBFS | −28 to −18 dBFS |
| Ambience, wonders | ≤ −6 dBFS | −36 to −24 dBFS |
| Music | ≤ −3 dBFS | −24 to −16 dBFS |

**Tests** cover determinism (a JSON round trip renders the same samples), peak and loudness per bank, length caps (effects 3 s, loops 30 s, music 120 s), seamless loop wraps, click-free effect ends, and wrongful stop against arrest.

**Porting the synth to TypeScript (M1).** `tools/sounds/soundkit.py` is the reference renderer.

- `hash32` is lowbias32 over (index XOR seed): two `Math.imul` rounds, with `>>> 0` after each step. Reduce any seed past 2^32 with `>>> 0`; loop keys reach seed × 1,000.
- Noise takes a new level every 1/f seconds: level = `hash32(seed, floor(Σ f / rate))` / 2^32 × 2 − 1.
- Seeds:
  - effect layer i uses seed + i;
  - loop event k of event group e takes its time, pitch, volume and own seed from `hash32(seed × 1000 + e, 4k)` to `4k + 3`;
  - music note j of track i uses seed + 7919 i + j.
- Filters are one-pole: a = 1 − e^(−2π · cutoff / rate); high-pass = input − low-pass.
- Loops crossfade 0.25 s at the seam with constant-power ramps, because a linear fade dips noise by 3 dB.
- Samples can't be bit-equal: `Math.sin` and `Math.pow` may differ from numpy in the last bit. A port test compares each render with the Python one within a tolerance. Audio never feeds the sim, so no determinism is lost.
- Rendering every bank up front would hold about 390 s of music and 470 s of loops: about 76 MB as 32-bit floats at 22,050 Hz (computed). The synth therefore caches short effects and renders music and loops as they play.

## Mixing, performance and controls

Sound stays light: about 24 voices at most, an audio chunk of about 10–20 KB brotli loaded after the first frame, and main-thread work under about 0.5 ms a frame. These are unsourced estimates, set in M1.

- **Buses:** master, then music, ambience, effects and UI. Effects briefly duck the music.
- **Crowds aggregate.** Cap concurrent voices (about 24) and each sound kind per second. When many events happen at once, the town bed steps up from `amb_town_quiet` to `amb_town_busy` and `amb_town_market` instead. A busy market never plays 100 coin sounds.
- **Space and zoom:**
  - only events in or near the view play, panned by screen position;
  - street zoom carries event sounds and district zoom softer ones;
  - city, region and country zoom carry ambience and music only;
  - M9 crossfades between the zoom levels.
- **Time and season** (Time & calendar): ambience swaps at dawn and dusk with the town's light periods, winter brings `amb_snow`, and music moves between town day and town night.
- **Load:** no audio on the first-frame path. The audio chunk (synth and banks) loads after the first frame, and the audio context starts on the first click, as browsers require.
- **CPU:** the synth runs in an AudioWorklet, keeping main-thread audio work under about 0.5 ms a frame at 100,000 agents.
- **Controls:**
  - silent until the first click, with a sound button in the HUD, and `M` toggles mute;
  - sliders for music, ambience and effects, saved per device and never carried in share links;
  - a classroom mode that starts muted.
- **Accessibility:**
  - no sudden loud stingers, and result reveals stay gentle whichever way the bet went;
  - any sound longer than 3 s can be paused, stopped or turned down, as WCAG's audio-control rule asks (to verify against WCAG 2.2).

## Work by milestone

The sounds exist, so about 12–19 days of wiring remain (unsourced estimate). Each task is in Implementation plan, tagged (Sound).

| Milestone | Work | Days |
| --- | --- | --- |
| Done, 7 October 2026 | `tools/sounds/` and 94 sounds in 7 banks, with tests and licence rows | — |
| M1 Lab mode | Audio chunk, first-click start, buses, mute, sliders and classroom mode (2–3); the TypeScript synth in an AudioWorklet, with a port test (2–3); play the UI bank (0.5) | 4.5–6.5 |
| M3 City life | Town events with voice caps and the bustle bed (2–3); ambience by biome, time and season (1–2); the music player (1–2); festival music (0.5–1) | 4.5–8 |
| M4 Crime and police | Justice sounds under the visual rules | 0.5–1 |
| M6 Scale and sharing | Profile at 100,000 agents (0.5–1); builder sounds (0.5) | 1–1.5 |
| M8 Country map | Country and region music and ambience, and the 11 wonder loops | 1 |
| M9 Zoom across scales | Crossfades between zoom levels | 0.5–1 |

**Exit checks:**

- M1: no sound before the first click, and mute and sliders survive a reload.
- M1: a replay with sound on and off gives identical state hashes.
- M1: every bank entry renders in the TypeScript synth within the port test's tolerance of the Python render.
- M1: every bank entry comes from `tools/sounds/` or from a CC0 file listed in `assets/LICENSES.md`.
- M3: every event type with a sound also has a visual twin.
- M4: the audio audit. Outside festival music, no sound parameter differs by hue, look, culture, wealth decile or offender status in the recorded view. A wrongful stop and an arrest match in loudness and length.
- M6: the audio chunks stay within budget, and main-thread audio work stays under about 0.5 ms a frame at 100,000 agents.

## Open questions

- **Someone must listen.** Claude and its agents cannot hear audio; they only check numbers. The owner should play `dist/sounds/` before M1, above all the 9 tracks against well-known jingles.
- **The chunk budget is tight.** The 7 banks minify to 137 KB and deflate to 19.7 KB, 9.0 KB of it music (measured here; zlib level 9 per bank, brotli not measured). With the synth added, one chunk passes 20 KB. Proposed: music loads as its own chunk when first needed.
- Render at 22,050 Hz and let the browser resample, matching the previews? Or synthesise at the context's 44.1 or 48 kHz, crisper but with slightly different noise?
- Eight culture emblems share four festival styles. Should each culture draw a style at world generation, or should more styles be written?
- Chiptune only, or soft sampled instruments for some music?
- If any recorded files are used, which format plays everywhere, including Safari?
- The voice cap, loudness targets and budgets are estimates to set in M1.
- Should a lean research round first check browser autoplay rules, accessibility, and how cosy games handle ambience?
