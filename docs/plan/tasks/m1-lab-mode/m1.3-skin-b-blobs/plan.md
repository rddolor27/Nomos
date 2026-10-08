# M1.3 Skin B blobs: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **Skin B is a second skin in the same renderer.** `setSkin('blobs')` now draws blobs instead of falling back to dots. It uses the same snapshot v1, camera and context-loss path as M0.4.
- **Agents are instanced quads.** Each instance carries its previous position, its current position (ping-pong buffers, so each tick uploads only the new snapshot) and the visual word, read with `vertexAttribIPointer`.
  - The vertex shader interpolates between ticks and derives facing and the walk frame from velocity.
  - It snaps positions to whole texels and device pixels.
  - Source: [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), the custom renderer design.
- **Y-sorting by the depth test.** Depth comes from y, with binary-alpha pixel art, so there is no CPU sort. Drop shadows go in a separate non-depth pass (R3).
- **Draw order per agent:** body, pattern, face, then job item (content rule 1, R9).
  - The look's 7 bits pick a hue, an eye shape and a pattern.
  - The action picks the frame stem: stand, walk, sit, sneak, carry or cheer.
  - The facing picks the view, and the job picks the item overlay.
  - Atlas cells are looked up from `assets/sprites/characters.json` by frame name, never by index (R9).
- **Missing frames.** Draw carry and cheer in `tools/sprites/characters.py` under the sprite rules, rebuild the sheet and add their manifest entries. Rows go in `assets/LICENSES.md` through `tools/licenses.py`.
- **Blinks.** Each agent gets a stagger phase from a hash of its id, done on the render side and never by the sim. Blinks average about 3.3 s apart and last 183 ms. Blinks never synchronise across a crowd, and none flashes ([R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md), "Flicker and reduced motion").
- **Bubble pass:**
  - one bubble per agent, at most six on screen;
  - priority runs justice > crime > economy > needs > mood;
  - overflow goes to a ticker in the HUD, with one log line per bubble;
  - a bubble hops about 15 px over about 11 frames, then holds about 1.0 s, or 1.5–2 s for justice events (R3);
  - bubble art is the existing 12×12 set: "!", "?", coin, "Zz", bread, heart and sweat.
- **Staging (R1, R3, R6):**
  - Skin B shows lab cards on the flat zone map, with up to 40 agents and at most four protagonists.
  - Protagonists carry Primer-style wallet and hunger bars that ride with the sprite. Charts are linked to the animation: each event sends a small particle to its chart's legend glyph.
  - Wallet bars exist only on lab cards, labelled "lab only". City and town skins never create the bar layer outside the wealth lens.
- **Faces from lab rules (R3):**
  - angry eyes on a refused price, happy on a purchase, and a wince with "?" on a victim;
  - a take is shown only as an act: the taker sneaks, and the item hops from victim to taker;
  - there is no taker bubble, sack, mask or colour, and nothing marks the taker afterwards.
- **Reduced motion:** no hops, bobs or pans, 150 ms fades, camera cuts and static rings (R3). Read `prefers-reduced-motion` and the app's own setting.

## Packages and files

- `packages/render-gl`:
  - `src/skins/blobs/`: the instanced pass, its shaders, atlas lookup and blink stagger;
  - `src/bubbles.ts`: the bubble scheduler, pure TypeScript and testable in Node;
  - `src/bars.ts`: protagonist bars, lab only;
  - `src/item-hop.ts`: the take animation.
- `packages/sim-lab`: lab rules set `emote` and `action` in the visual word, and emit bubble events with a priority.
- `apps/web`: the ticker and log lines, the reduced-motion setting, and chart particles.
- `tools/sprites/characters.py`: carry and cheer frames, rebuilt sheet and manifest.

## Interfaces and data

- **Bubble events** travel beside snapshots as `{ tick, agent, glyph, priority }` records in a small pooled buffer. The worker message gains an `events` buffer, which refines M0.3's `snapshot` message; update [interfaces.md](../../m0-pipeline/interfaces.md).
- **Priorities:** justice 4, crime 3, economy 2, needs 1 and mood 0.
- **The frame-name scheme follows the manifest:**
  - `blob_<hue>_<stem>_<facing>[_<frame>]`
  - `pattern_<pattern>_<hue>_<stem>_<facing>[_<frame>]`
  - `face_<expression><eyes>_<facing>`
  - `job_<job>_<stem>_<facing>[_<frame>]`
  - Generated TypeScript types from M0.5's manifest schema check every lookup at build time.
- **Protagonists** are a list of up to four agent ids, chosen by the card.

## Method and sources

- **Renderer design:** [R3 rendering notes](../../../../research/round-3-2d-look/notes/rendering-tooling.md), §2 and the prototype design. It covers instancing, GPU interpolation, depth y-sort and context loss.
- **Bubbles, blinks, expressions, staging, reduced motion and protagonist bars:** [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md). See the Primer expression set, bubble concurrency and priority, zoom tiers Z1–Z2, and part 6 on accessibility.
- **Wallet bars lab-only:** [R6 summary](../../../../research/round-6-goods-and-wellbeing/summary.md), "Wealth: start calibrated, keep it invisible".
- **Art rules:** one blob body, jobs as removable items, and crime as an act, as the [sprite README](../../../../../tools/sprites/README.md) states them.

## Tests for the exit checks

- `body layer is byte-identical across roles`: render the same look, action and facing with every job in an offscreen framebuffer with the job layer masked, and assert the pixels match byte for byte. In `tools/sprites`, also assert no body frame name contains a job.
- `never more than six bubbles`:
  - Run the bubble scheduler in Node against a 40-agent card's event stream for 20 lab days.
  - At every frame, at most six bubbles show and at most one per agent.
  - Higher priority always displaces lower.
  - Overflow appears in the ticker log.
- `reduced-motion golden run has no hops or pans`:
  - Playwright with `reducedMotion: 'reduce'` records, every frame, the camera offset and each bubble's and sprite's y-offset.
  - Every hop offset is 0.
  - The camera changes only by cuts, with no intermediate positions.
  - Fades last 150 ms ± one frame.
- `wallet bars only on lab cards`: switching to a town or city skin leaves the bar layer uncreated.
- `a take shows no marker`: after a take, the taker's visual word differs from a non-taker's only in `action` and only during the act.

## Risks and unknowns

- **Verify first:** whether novices read the roles and glyphs, colour-blind players tell the palette apart, and a diverse panel finds the cast fair. M1.5 runs these playtests. Plan for one art revision.
- **Depth y-sort needs strictly binary alpha.** Check every frame's alpha in `tools/sprites` tests.
- **Bubble events add a second buffer** per snapshot. Keep it pooled and transferable, so per-tick allocation stays at zero.
- **Sleep has no frame of its own.** Draw it as sit with the "Zz" bubble until a sleep frame is drawn.

## Open questions

- **Owner:** on the Canvas2D fallback, do lab cards draw blobs or Skin A dots? M0.4's fallback copies the dots pixel for pixel, and a blob copy would be a second sprite pass held to that standard. Suggested: dots, so blobs keep one implementation. Needed before: the step plan.
- **Owner:** should a few novices see the sprite previews before the passes are built? A glyph that fails in M1.5 loops back here, and a second formal playtest means recruiting again. Suggested: yes, an informal look, with M1.5's test still the gate. Needed before: building.
- **Measure:** do the navy cap and teal sash stay apart from all six body hues under simulated colour blindness? Round 3 cleared them only against the yellow body, at ΔE 33 or more in CAM02-UCS ([R3 report](../../../../research/round-3-2d-look/report.md), computed), and M0.4's palette test checks only that trio. Suggested: extend that colorspacious test to every hue against both item colours, at round 3's assumed ΔE ≥ 20. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the bubble scheduler and its six-bubble test in Node come first, then the body pass with the byte-identical test, then faces, items and blinks. The take, bars and reduced-motion golden come last, while carry and cheer are drawn alongside.
- **Keep it simple:** if every layer shares the 18×22 cell, composite body, pattern, face and item in one fragment shader, topmost opaque texel winning. Each agent is then one instance at one depth, so layers never interleave between agents. Resolve frame names to atlas rects once at load, into a small lookup texture.
- **Pitfalls:** the 3-bit `action` field is full and has no cheer, and work and talk have no stem. Map actions to stems in one table, carry cheer as an emote id, and record it in `interfaces.md`. Under reduced motion the item hop must become a 150 ms fade, or the take vanishes; chart particles fade too. R3 times the bubble hop in frames, about 183 ms at 60 Hz (computed), so time it in milliseconds.
- **Hard and easy parts:** the shader's interpolation, facing, snapping and depth, and the Playwright golden, need the most care. The scheduler, bars and manifest entries are mechanical.
