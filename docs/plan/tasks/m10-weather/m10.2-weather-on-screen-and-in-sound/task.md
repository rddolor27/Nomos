# M10.2 Weather on screen and in sound

Part of [M10 Weather](../milestone.md).

Builds on M10.1's daily weather. The [Weather plan](../../../weather.md) gives the design.

- **Builds:**
  - the weather drawn over the world layer: rain and snow particles, fog, drifting cloud shadows, wet ground and puddles that dry, and weather tints stacked on the light periods, with people untinted (Weather);
  - calm weather: lightning is a soft glow at most once every few seconds, never a full-screen flash, and under reduced motion rain and snow draw as still overlays (Weather);
  - the weather art, drawn as code in `tools/sprites`: rain streaks, snowflakes, puddles, wet-ground palettes, fog, and HUD weather icons at 16 and 8 px (Weather);
  - the weather sounds, made as synth data in `tools/sounds`: light rain, heavy rain, storm wind and distant thunder, layered over the biome ambience within the voice caps (Weather);
  - the weather in the HUD beside the season icon, and in the gazette's calendar stories (Weather).
- **Needs:** M10.1's weather; M1.2's light periods and HUD date; M1.4's synth and audio buses; M3.3's tile pass, atlas and framebuffer path; M3.8's ambience, voice caps, snow schedule, record store and gazette.
- **Owner decision first:** whether snow cover follows snowfall instead of winter's fixed schedule from M3.8.
- **Verify first:** the owner listens to every new sound for likeness to well-known jingles before it is committed.
- **Exit checks:**
  - drawing or hiding the weather never changes the state hash (Weather);
  - no frame sequence flashes more than three times a second, and a reduced-motion golden run has no falling particles (Weather);
  - at its heaviest, weather keeps the town within its frame budget at 3× (Weather);
  - every weather sound has a visual twin, and the owner has listened to each (Weather).
