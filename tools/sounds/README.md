# Sounds

Original chiptune sound for Nomos, written as data. Each module builds one bank with `soundkit.py` and writes `assets/sounds/<category>.json`, plus WAV previews in `dist/sounds/<category>/` (gitignored). The JSON holds only definitions, which the game's synth will play, so the previews and the game always match. The plan is in [`docs/plan/sound.md`](../../docs/plan/sound.md).

- Build one bank: `python tools/sounds/<category>.py`
- Build everything: `python tools/sounds/build_all.py`
- Check everything: `python tools/sounds/test_sounds.py`

## Definitions

| Kind | Holds |
|---|---|
| `effect` | `layers`: oscillator layers, each with an optional `start` in seconds |
| `loop` | `length`, held `layers` (noise beds and drones, with an optional `swell`), and seeded `events` scattered over the loop. It wraps without a seam |
| `music` | `tempo`, `steps`, `step_beats`, `instruments` by name, and `tracks` of notes `[step, midi note, length in steps, velocity]`. It loops unless `loop` is false |

A layer has these fields:
- `wave`: `pulse` (with `duty`), `triangle`, `saw`, `sine` or `noise`;
- pitch: `note` (MIDI) or `freq` `[start, end]` in Hz, swept exponentially over the gate. For noise it is the hold rate: the lower it is, the darker the noise;
- envelope: `length` (the gate, in seconds), `attack`, `decay`, `sustain` and `release`;
- `volume`, and optional `detune` (semitones), `vibrato` `[rate, depth]`, `arp` (semitone steps) with `arp_rate`, `lowpass` and `highpass` (Hz).

Everything random (noise, event times, pitch and volume wobble) comes from `hash32`, a 32-bit integer hash. A TypeScript synth can therefore reproduce every sample. Each sound's seed is the CRC-32 of `<bank>/<name>`, stored in the bank.

## Levels

| Bank | Peak | Loudness (RMS) |
|---|---|---|
| UI | ≤ −8 dBFS | −30 to −22 dBFS |
| Events and justice | ≤ −6 dBFS | −28 to −18 dBFS |
| Ambience and wonders | ≤ −6 dBFS | −36 to −24 dBFS |
| Music | ≤ −3 dBFS | −24 to −16 dBFS |

These targets are unsourced starting points. Nothing may pass −1 dBFS: `Bank.add` rejects it.

## Rules

- **Original sound only.** Never copy, transcribe or imitate a Nintendo or Pokémon melody, jingle or sound, such as the healing jingle, a level-up fanfare or creature cries. A person listens to every new track for resemblance to well-known jingles before it is committed.
- **Crime is an act, never a costume.**
  - The theft cue plays only in the true view and is the same for everyone.
  - No motif follows a person, and no sound marks anyone afterwards.
- **Policing stays neutral.** No heroic fanfare or siren drama. A wrongful stop matches an arrest in loudness (RMS within 1 dB) and length.
- **Wealth is never audible.** One purchase sound plays whatever the amount.
- **No mood sounds.** Nothing tracks a person's or a town's happiness or wealth.
- **Culture is heard only at festivals and music events.**
  - Styles share one instrument set and differ only in tempo, loudness and structure.
  - Style names are invented.
  - No instrument, scale or rhythm recognisably tied to a real-world culture.
- **Looks are silent.** No voice or pitch is keyed to hue, eye shape or pattern, and no voice is gendered or age-coded. Emote blips are one shared set.
- **Sound never carries information alone.** Every cue has a visual twin in the game.

## Naming

Names are lowercase, with underscores between parts and hyphens inside a part, like the sprites: `ui_click`, `emote_heart`, `amb_coast_day`, `music_town-day`.
