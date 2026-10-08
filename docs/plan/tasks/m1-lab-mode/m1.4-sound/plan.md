# M1.4 Sound: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Sound is data, played by the game's own synth.** The 7 banks in `assets/sounds/*.json` are the definitions. The TypeScript synth renders them as `tools/sounds/soundkit.py` does, and no recorded audio ships ([sound.md](../../../sound.md), "How it is built").
- **The synth core is a pure function.** `render(def, seed, rate): Float32Array` runs in Node for the port test and in an AudioWorklet in the browser. Its parts:
  - `hash32`: lowbias32 over index XOR seed, two `Math.imul` rounds, with `>>> 0` after each step;
  - waves: pulse with duty, triangle, saw, sine and noise;
  - ADSR envelopes;
  - exponential frequency sweeps;
  - one-pole filters, where a = 1 − e^(−2π · cutoff / rate) and high-pass = input − low-pass;
  - loop folding with a 0.25 s constant-power crossfade;
  - the step sequencer.
- **Seeds follow the bank rules:**
  - effect layer i uses seed + i;
  - loop event k of group e draws from `hash32(seed × 1000 + e, 4k … 4k + 3)`;
  - music note j of track i uses seed + 7919 i + j.

  Reduce any seed past 2^32 with `>>> 0`.
- **Caching:** short effects are cached once rendered. Music and loops render as they play, because rendering every bank up front would hold about 76 MB of float samples ([sound.md](../../../sound.md), computed).
- **Loading:**
  - Nothing audio sits on the first-frame path.
  - The audio chunk (synth plus banks) loads after the first frame, with a dynamic `import()`.
  - The audio context starts on the first click or key press, as browsers require.
  - If the chunk passes its budget, music loads as its own chunk when first needed ([sound.md](../../../sound.md), open questions).
- **Mixing:**
  - Buses run master, then music, ambience, effects and UI.
  - Effects briefly duck the music.
  - At most about 24 voices play, with a cap per sound kind each second.
  - These numbers are unsourced starting points to set in this sub-milestone.
- **Controls:**
  - a sound button in the HUD, and `M` to toggle mute;
  - sliders for music, ambience and effects, saved per device in `localStorage` and never written to share links;
  - a classroom mode that starts muted.
- **UI bank:** clicks, toggles, panels, bet locked, Run started and the three result reveals. Each reveal lasts 0.8 s at the same loudness, so no outcome is cheered. The sounds exist; wire them to M1.2's card events.
- **The sim never reads audio.** The audio package reads only app and renderer events. A dependency rule forbids any `sim-*` package from importing it.

## Packages and files

- `packages/audio` (`@nomos/audio`), new:
  - `src/synth/` holds the pure core: `hash.ts`, `waves.ts`, `envelope.ts`, `filter.ts`, `loop.ts` and `sequencer.ts`;
  - `src/worklet.ts`: the AudioWorklet processor around the core;
  - `src/mixer.ts`: buses, ducking and voice caps;
  - `src/controls.ts`: mute, sliders, classroom mode and storage;
  - `src/banks.ts`: the bank loader and its types.
- `apps/web`:
  - the HUD sound button and slider panel;
  - the first-click start;
  - the UI bank wiring for M1.2's card events;
  - the size-limit entry for the audio chunk.
- `tools/sounds`: an export of reference renders for the port test, as raw float32 per bank entry. They are gitignored and regenerated in CI, never committed, because their size grows with the banks.
- `.dependency-cruiser.cjs`: forbid `packages/sim-*` from reaching `packages/audio`.

## Interfaces and data

- **Bank file:** `{ "rate": 22050, "sounds": { <name>: { kind, seed, seconds, peak_db, rms_db, def } } }`.
  - `kind` is `effect`, `loop` or `music`.
  - The seed is the CRC-32 of `<bank>/<name>`.
  - Generated TypeScript types come from a JSON Schema for the bank format, matching M0.5's manifest pattern.
- **Synth API:** `render(def: SoundDef, seed: number, rate: number): Float32Array`.
- **Player API:**
  - `play(name: string, opts?: { pan?: number, gain?: number })`;
  - `setBus(bus: 'music' | 'ambience' | 'effects' | 'ui', gain: number)`;
  - `mute(on: boolean)`.
- **Storage key:** `nomos.audio.v1`, holding the slider gains, mute and classroom mode.

## Method and sources

- **Port rules, seeds, filters, crossfade and memory:** [sound.md](../../../sound.md), "Porting the synth to TypeScript (M1)".
- **Buses, voices, loading and controls:** [sound.md](../../../sound.md), "Mixing, performance and controls".
- **Levels per bank and length caps:** [sound.md](../../../sound.md), the levels table and "Tests". Reuse `tools/sounds/test_sounds.py`'s thresholds in the port test.
- **Load order:** M0.5's load path and [R5 load notes](../../../../research/round-5-performance/notes/load-memory.md): no audio before the first frame.

## Tests for the exit checks

- `no sound before the first click`:
  - Playwright loads the page and waits 3 s.
  - The audio context is absent or `suspended`, and the player's started-voice counter reads 0.
  - After one click it is `running`.
- `mute and sliders survive a reload`: set mute and each slider, reload, and read the same values from the controls.
- `sound never changes the state`: replay seed 42 to tick 10,000 with sound on and with sound off. The state hashes are equal.
- `every bank entry matches the Python render`:
  - Node renders each of the 94 entries with the TypeScript core and compares them with the reference renders.
  - It passes when the peak difference is ≤ 1e-3 and the RMS of the difference is at least 60 dB below the sound's RMS.
  - Both tolerances are starting values for the step plan.
  - `Math.sin` and `Math.pow` may differ from numpy in the last bit, so the port cannot be bit-equal.
- `every bank entry is accounted for`: every name in every bank comes from `tools/sounds/build_all.py --check`, or from a CC0 file with a row in `assets/LICENSES.md`.
- `the audio chunk fits`: the size-limit entry holds the audio chunk at its budget, about 10–20 KB brotli. Splitting out music is the fallback.

## Risks and unknowns

- **Owner decision first:** the listen pass. Claude and its agents cannot hear audio, so the owner plays `dist/sounds/` first, above all the nine tracks against well-known jingles.
- **Owner decision first:** the render rate.
  - 22,050 Hz matches the previews and the port test; let the browser resample.
  - The context's 44.1 or 48 kHz sounds crisper, but changes the noise.
  - Default: 22,050 Hz.
- **Verify first:** WCAG 2.2's audio-control rule and current autoplay rules. These decide the controls and the first-click start, and a lean research round could check them.
- **Bundle size.** The banks deflate to 19.7 KB, 9.0 KB of it music, so with the synth one chunk passes 20 KB (measured, zlib).
- **AudioWorklet support:** Safari's worklet timing and suspend behaviour need a check on a real iPhone.

## Open questions

- **Owner:** do the sounds pass a listen, above all the nine tracks against well-known jingles? Only a person can hear a resemblance ([sound.md](../../../sound.md), rule 9). Suggested: play all of `dist/sounds/` before M1 starts, as task.md asks. Needed before: building.
- **Owner:** does the synth render at 22,050 Hz or at the context's 44.1 or 48 kHz? It fixes the port test's references and where resampling happens. Suggested: 22,050 Hz. Needed before: the step plan.
- **Owner:** may the AudioWorklet wait for M3's music player, though task.md and [sound.md](../../../sound.md), "Work by milestone", put it in M1? M1 plays only the UI bank, whose cached effects need no streaming. Suggested: yes; M1 builds the pure core, its port test and UI playback. Needed before: the step plan.
- **Measure:** do the port tolerances, 1e-3 peak and −60 dB RMS, pass on all 94 entries? Loose bounds hide a wrong port, and tight ones fail on last-bit maths. Suggested: keep them unless the first effect, loop and track ported show last-bit error alone exceeds them. Needed before: building.
- **Research:** do WCAG 2.2's audio-control rule (SC 1.4.2) and the browsers' autoplay rules accept a first-click start, with `M` and the HUD button as controls? They decide the controls and the start. Suggested: a lean research round that opens each source. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the pure core and its port test in Node come first, one wave and filter at a time, starting with the UI bank. Then come the first-click start, controls and storage with UI sounds playing, then the buses, and the size-limit entry last.
- **Keep it simple:** render each UI effect once into a 22,050 Hz `AudioBuffer` and let the browser resample it on playback. Ship only the UI bank in M1's chunk, extending the brief's music split; the other banks load with the features that play them.
- **Pitfalls:** whenever it is built, a worklet runs at the context's rate (inference). At 22,050 Hz it must resample itself or run in a context created at that rate. A 120 s track also needs a block renderer that carries filter and sequencer state across 128-sample calls, tested equal to the whole render.
- **Hard and easy parts:** sweeps, filters and loop folding need the most care, and Safari needs a real iPhone. Controls, storage, `M` and the dependency rule are mechanical.
