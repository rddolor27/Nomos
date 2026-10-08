# M10.2 Weather on screen and in sound: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **One weather pass after the people.** Rain streaks or snowflakes draw as instanced quads in screen space, placed by a render-side hash of (particle, frame), never by sim draws. Fewer fall when zoomed out, and none at country zoom.
- **Fog and cloud shadows** are one full-screen pass each: fog a soft white veil, and cloud shadows a slow-scrolling, low-frequency mask. Like the light tint, they touch only ground and buildings.
- **Wet ground** is a palette swap on ground tiles while it rains and for a time after, with puddle tiles on paving and dirt that dry in steps.
- **Weather tints stack on the light:** the light period's colour times a weather colour, so a rainy afternoon is greyer and a stormy night darker. People stay untinted.
- **Calm lightning.** A storm brightens the sky tint softly, at most once every few seconds, keyed on (seed, region, day, minute) and capped on the render side to one glow every few seconds of real time, so 16× does not bring them sixteen times as fast. It never fills the screen, so no sequence passes WCAG's three flashes a second. Under reduced motion lightning is off, and rain and snow draw as still overlays.
- **Sounds.** Light rain, heavy rain and storm loops join the ambience bank, and a thunder event joins the event bank, all made in `tools/sounds` as synth data.
  - They layer over the biome loops on the ambience bus, and thunder counts toward M3.8's voice caps.
  - Each has a visual twin: rain with its particles, thunder with the glow.
- **HUD and gazette.** A weather icon sits beside the season icon. The gazette reads only the record store, so the day's weather becomes a calendar record at the day boundary, and the calendar template can report it.

## Packages and files

- `packages/render-gl/src/weather/`: the particle pass, the fog and cloud passes, wet ground and the weather tint.
- `tools/sprites/weather.py`: streaks, flakes, puddles, wet-ground palettes, fog and the HUD icons, with manifest entries, and `assets/LICENSES.md` rows through `tools/licenses.py`.
- `tools/sounds/`: the new loops and the thunder event in their banks, with WAV previews for the owner.
- `apps/web/src/hud/`: the weather icon and the weather-off view setting.
- `packages/sim-core/src/records/store.ts` and `packages/gazette`: the weather record and its line in the calendar story.

## Interfaces and data

- **Renderer:** it reads the day's weather from M10.1's message and the minute from the snapshot tick, as the light does. Hiding the weather is a per-device view setting, like the tint-off toggle. Record any new `WorldRenderer` method in [interfaces.md](../../m0-pipeline/interfaces.md).
- **Frame names** follow the sprite README and the season icons' pattern, such as `weather_rain_16` for the HUD icon.

## Method and sources

- **Design:** the [Weather plan](../../../weather.md), "On screen and in sound".
- **Flashes:** WCAG 2.2, success criterion 2.3.1, "Three Flashes or Below Threshold".
- **Sound rules:** the [sound README](../../../../../tools/sounds/README.md), and M3.8's ambience and voice caps.
- **Art rules:** the [sprite README](../../../../../tools/sprites/README.md) and the content rules.

## Tests for the exit checks

- `hiding weather changes no hash`: runs with the weather drawn and hidden reach the same `stateHash` at every day boundary.
- `no flashes`: over a storm day at 1× and 16×, a trace of frame luminance never shows more than three flashes in any one-second window, by WCAG's general flash definition.
- `reduced motion has no falling particles`: a Playwright golden under reduced motion shows the still overlay identical from frame to frame.
- `storms fit the frame budget`: the town at 3×, in heavy rain with fog, stays within its frame budget in CI and on the reference phones.
- `every sound has a twin`: a table maps each new bank entry to its visual cue, and a test fails on any entry without one. The owner's listening is recorded before the sounds are committed.
- `hues clear 3:1 under weather`: every body hue clears 3:1 against every walkable tile in every light period under every weather tint, by its outline or its fill, extending M1.3's and M3.3's checks.

## Risks and unknowns

- **Owner decision first:** whether snow cover follows snowfall.
- **Fill rate.** Full-screen fog and cloud passes cost fill on phones, so draw them at the framebuffer path's one pixel per texel (M3.3).
- **No agent can hear.** Every new sound waits for the owner's listening.

## Open questions

- **Owner:** Should snow cover follow snowfall instead of winter's fixed schedule? Suggested: keep M3.8's schedule, and add fresh snow on snowfall days only. Needed before: the step plan.
- **Measure:** How many particles fit the frame budget at 3× on the reference phones? Suggested: measure on M3.3's town, then cap the count by zoom. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the art and the weather tint first, as still frames, then particles and fog, then wet ground, then the sounds, the HUD icon and the gazette line.
- **Keep it simple:** one particle pass for rain and snow, switched by a uniform, with no physics or collisions.
- **Pitfalls:** particles use render-side hashes, never sim draws, so golden frames stay reproducible. Keep every weather tint off people, or M1.3's contrast checks fail. Weather icons follow the season icons' rule: never a sun, leaf or flower, which are culture emblems ([sprite README](../../../../../tools/sprites/README.md)), so clear skies need another mark.
- **Hard and easy parts:** calm lightning, phone fill rate and the sound design need the most care; the HUD icon and manifest entries are mechanical.
