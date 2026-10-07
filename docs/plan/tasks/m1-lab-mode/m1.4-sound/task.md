# M1.4 Sound

Part of [M1 Lab mode](../milestone.md).

- **Already done:**
  - `tools/sounds/`: sound definitions as data, 7 JSON banks holding 94 sounds, WAV previews, licence rows, and tests for determinism, levels, length, loop seams and wrongful stop against arrest (Sound).
- **Builds:**
  - the audio chunk, loaded after the first frame, with the audio context started on the first click; master, music, ambience, effects and UI buses with ducking; `M` to mute; three sliders saved per device and never in share links; and a classroom mode that starts muted (Sound);
  - the TypeScript synth in an AudioWorklet, ported from `tools/sounds/soundkit.py` (hash32, waves, envelopes, sweeps, one-pole filters, loop folding and the step sequencer), with a port test that renders every bank entry in both and compares them within a tolerance (Sound);
  - the UI bank: clicks, toggles, panels, the lab bet, Run and the three result reveals, which match in length and loudness; the sounds exist; wire them in (Sound).
- **Needs:** M1.2's bet cards for the lab sounds, M0.5's load order and M0.6's size-limit gate.
- **Owner decision first:**
  - whether the sounds pass a listen: the Sound tab asks the owner to play `dist/sounds/` before M1, above all the nine tracks against well-known jingles;
  - whether the synth renders at 22,050 Hz like the previews, or at the audio context's 44.1 or 48 kHz.
- **Verify first:** WCAG 2.2's audio-control rule and browser autoplay rules, which decide the sound controls and the first-click start. The Sound tab asks whether a lean research round should check them.
- **Exit checks:**
  - no sound plays before the first click, mute and sliders survive a reload, and a replay with sound on and off gives identical state hashes (Sound);
  - every bank entry renders in the TypeScript synth within the port test's tolerance, and comes from `tools/sounds/` or a CC0 file listed in `assets/LICENSES.md` (Sound).
