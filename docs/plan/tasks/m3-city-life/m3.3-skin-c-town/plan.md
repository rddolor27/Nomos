# M3.3 Skin C town: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Skin C is the third skin in the one renderer.** It reuses M1.3's instanced blob pass for people and adds two passes:
  - **tile pass:** a tile-index texture, read with `texelFetch`, draws the ground in one quad per chunk. Animated tiles step by frame offset (R3).
  - **roof pass:** roofs and treetops draw over people, so agents walk "under" them.
- **Original art first.**
  - The original sprites, on a master palette of at most 64 colours, replace round 3's 32-colour re-index.
  - Ninja Adventure stays a placeholder only: re-download it from its canonical page, confirm the CC0 text, and drop culturally specific tiles (R3, R9).
- **The atlas ships as lossless WebP** at native resolution, with an oxipng PNG fallback, loaded in idle time after the first frame and never on the critical path (R5).
- **The phone path.**
  - Render the world at one pixel per texel into a framebuffer, then blit it at integer scale.
  - This cuts fill by zoom², and retires the device-pixel-ratio cap of 2 for the world layer (R3).
- **Four light periods** tint only ground and buildings, never people:
  - lit windows and lamps at night;
  - fades of at least 2 s;
  - a tint-off toggle.

  The house window and lamp art exists; wire it in (R3).
- **Automatic skins:** dots at city zoom, and the town from district zoom inward, with 15% hysteresis and 150 ms cross-fades. The manual override from M0.4 still wins (R3).
- **Follow-cam** at 5–6×, with a dead zone of about 3×2 tiles and a thought panel synced to M3.2's inspector. Under reduced motion it cuts rather than pans (R3).
- **Optional:** a human character sheet as an opt-in variant, with looks redrawn at every birth. It is blocked by the owner decision below.

## Packages and files

- `packages/render-gl`:
  - `src/skins/town/tile-pass.ts`, `src/skins/town/roof-pass.ts` and `src/skins/town/light.ts`;
  - `src/framebuffer-path.ts`;
  - `src/auto-skin.ts`;
  - `src/follow-cam.ts`.
- `tools/sprites/atlas.py`, extending M0.5's atlas stub:
  - packs every sheet into atlas pages of at most 2,048²;
  - writes lossless WebP and an oxipng PNG;
  - writes a frame table keyed by frame name.
- `assets/third-party/ninja-adventure/`, holding the placeholders with their licence file, or nothing if the original art covers every tile.
- `apps/web`: idle-time atlas loading and the tint-off toggle.

## Interfaces and data

- **Frame table:** `frameName → { page, x, y, w, h, anchorX, anchorY }`, generated with types from M0.5's manifest schema. Maps and skins look frames up by name only.
- **Light period:** an enum of night, dawn, day and dusk, from M0.1's sunrise and sunset tables. The tint is a uniform blended over ≥ 2 s.
- **Auto-skin policy:** `chooseSkin(zoom, current): Skin`, with the hysteresis band as a constant (15%).

## Method and sources

- **Tile pass, roof pass, framebuffer path, atlas limits and context loss:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), the design and the phone tier rows.
- **Light periods, follow-cam, zoom tiers and outline contrast:** [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md).
- **WebP against PNG and AVIF, and idle-time loading:** [R5 load notes](../../../../research/round-5-performance/notes/load-memory.md), and the Performance budget's "Images".
- **Asset licences:** [R3 asset notes](../../../../research/round-3-2d-look/notes/asset-packs.md) and `assets/LICENSES.md`.
- **Hues and outlines:** the [R8 summary](../../../../research/round-8-cultures/summary.md) and M0.4's outline rule.

## Tests for the exit checks

- `outlines clear 3:1 by day`:
  - for every walkable tile's colours and every body hue, the outline colour reaches a contrast ratio of at least 3:1 in the day period;
  - the night rule for the five hues besides sun is open, so this check covers day only and lists the night gaps.
- `skin switches drop no frame`: Playwright zooms through the auto-skin threshold 20 times. No frame takes more than twice the median frame time, and the hysteresis prevents flapping.
- `framebuffer path is pixel-exact at DPR 3`: a golden frame at device pixel ratio 3 matches, byte for byte, the 1-texel framebuffer blitted 3× in software.
- `light never tints people`: sample an agent's pixels in each light period, and they are identical.

## Risks and unknowns

- **Owner decision first:** whether the optional human sheet survives content rule 1's one shared blob body. Round 3 tied it to M1's playtest of the blob cast. Default: no human sheet.
- **Verify first:**
  - the canonical licence pages for Ninja Adventure, Kenney and LimeZu, and Mana Seed's AI clause;
  - tick and frame times on a mid-range Android phone and an iPhone, which decide the device tiers and the phone path.
- **Night outlines for five hues** have no rule yet. Round 3's yellow body is now the sun hue, and needs no outline at night.
- **Atlas size:** the 16 MiB atlas is a memory risk on iOS tabs (R5). Keep pages at 2,048² or smaller, and release pages unused at the current zoom.

## Open questions

- **Owner:** Drop the optional human sheet for good? Content rule 1 gives everyone one shared blob body, and round 3 tied the sheet to M1's playtest. Suggested: drop it, as the brief's default does. Needed before: the step plan.
- **Measure:** Does the original art in `tools/sprites` cover every tile the generated town uses? If it does, no third-party pack ships and the licence checks drop out; Mana Seed is already excluded, and paid LimeZu stays out of the public repo. Suggested: diff the frame names M3.1's export uses against the sprite manifests, and confirm the canonical CC0 text only for packs still needed. Needed before: the step plan.
- **Measure:** What tick and frame times do one mid-range Android phone and one iPhone reach at 10k agents? They decide the device tiers and whether the framebuffer path is the phone default, so task.md asks for them first. Suggested: measure M3.2's town drawn as blobs before building, and Skin C again once its tile and roof passes run. Needed before: building.
- **Measure:** Which of the five non-sun hues fall below 3:1 against night-tinted tiles? The exit check covers day only, and night has no outline rule. Suggested: compute night contrast per hue, and add a night outline colour only where it fails. Needed before: launch.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the tile pass on M3.1's map first, then the roof pass and the atlas pipeline, then the framebuffer path with its DPR 3 golden. Light periods, auto-skin and the follow-cam come last.
- **Reuse:** M1.3's instanced blob pass; M0.4's renderer, camera and skin switch; M0.5's atlas stub and manifest types; M3.2's inspector for the thought panel.
- **Keep it simple:** release atlas pages by zoom only if the iPhone measurement shows memory pressure.
- **Pitfalls:**
  - Until the idle-time atlas loads, auto-skin must stay on dots or blobs.
  - Shared CI machines give noisy timings (R5), so compare switch frames with a median over many frames, never one sample.
  - The blit needs nearest filtering and a canvas sized to whole multiples, or the DPR 3 golden drifts at the edges.
- **Hard and easy parts:** the pixel-exact framebuffer path and iOS memory are the hard parts. Auto-skin, the light enum and the follow-cam are mechanical.
