# Nomos hand-off (living file, 10 October 2026)

A living summary for the next session, appended as work lands. Start with `CLAUDE.md`, then the highest-numbered checkpoint (0032), then the progress log at the end of this file.

## Done in the session of 9–10 October 2026

1. **The town view.** Zooming into a settlement or wonder on the map opens its town, with houses, a plaza, a river and walking blobs.
   - `place.py` is ported to TypeScript, bit for bit against Python on 1,040 places.
   - The browser draws a place pixel for pixel as Python does, in Chromium, Firefox and WebKit.
   - A town opens by zooming in, by a tap on the place in focus, or by "Enter <name>".
2. **Rules:** game objects are classes, while blobs stay typed arrays (`code.md`); QA runs only once an implementation is finished (`models.md`).
3. **Skills:** `typescript-oop` and `impeccable`. **Agents:** `ui-designer` and `asset-designer`. Every agent lists "Skills to reach for".
4. **UI look, first pass (M0.8):** one-row toolbars, a −/+/Fit group, an orange accent, a More menu on phones, and labelled chart axes.
5. **Sprites:** stone walls, towers and gates; the `board` and `rubble` house styles; six props; `docs/mockups/town_walls_preview.png`.
6. **Plans:** the bigger world comes first. The map already opens the large 192×128 world (`map-view.ts` since d5b6642).

## Next, in order

1. **M3.1 part 2, steps 1–3: bigger towns.**
   - Places get 4× the area: 96×56 for a capital or city, 80×48 for a town, 64×40 for a village and 40×24 for a hamlet.
   - The town view fills the screen.
   - Crowds follow population: about 150–300 for a capital or city, 60–120 for a town, 25–50 for a village and 10–20 for a hamlet.
2. **Step 4:** the starting town, Highcourt, grows to 96×56, with more blobs.
3. **Steps 5–6:** walls with gates and the new houses go into `place.py`. Follow the side-gate layout in checkpoint 0031.
4. **M8.1 Task 36,** checks only: settlement counts, generation time, the Region view's 2 ms bar, and an optional `?world=standard`.
5. **M0.8's leftovers:** lil-gui behind `?dev=1`, the town's Fit, Home and pinch, and `toolbar.ts` in `interfaces.md`.
6. **At the end only:** one `senior-qa` pass and one `code-reviewer` pass.
7. **Later:**
   - M8.1 Tasks 33, 34, 31 and 35;
   - QA's low bugs 2 and 3;
   - syncing the shared plan doc;
   - checking the reference links.

## Agents, at most three at a time

1. **`sim-engineer`:** `place.py` and the port, for steps 1, 2 and 4 and the layout part of step 5.
2. **`render-engineer`:** the town view filling the screen, and the 2 ms bar with the bigger crowds.
3. **`asset-designer`:** tuning the bigger towns so they fill with streets and houses, and the walls' layout.

## Rules to remember

- Commit straight to `main` by path, under the no-reply address. Push only when the owner says.
- Never build into `apps/web/dist`.
- Run browser specs with `--workers=1` and `?tier=phone`.
- The scope guard blocks `..` in shell commands.
- The owner's preview is http://127.0.0.1:4180, over `dist/owner-preview`.

## Progress log

- 10 Oct: handoff written. Next: the town view fills the screen (`openPlaceCamera`).
- 10 Oct: **the town view opens filling the screen,** done.
  - `openPlaceCamera` takes the smallest step at which the place covers the view, and never less than 2 CSS px an art px. Fit still shows the whole place.
  - Proof: `place-camera.test.ts`, 5 of 5, plus lint and typecheck. The browser specs weren't rerun, so rerun `town-view.spec.ts` next session.
  - Next: M3.1 part 2, step 1, bigger places, with `sim-engineer`.
- 10 Oct: **started M3.1 part 2, steps 1 and 2** (bigger places and crowds), with `sim-engineer` on Sonnet. If the session ended before its report:
  - check `git log` for a commit whose body reads "Part 2: Bigger places and crowds", and `git status` for its uncommitted work in `tools/worldgen/place.py` and `packages/worldgen/src/place/`;
  - finish only when `place_goldens.py --check` and the worldgen Vitest suite pass, and the TypeScript port matches.
- 10 Oct: **the owner wants far more blobs per settlement,** since the sim aims at 100k and later a million.
  - Planned as M3.1 part 2, step 2b, the street crowd: TypeScript-only walkers on the walk loops, about one per 100–200 residents, up to 3,000 on desktop and 600 on phones.
  - It runs after steps 1 and 2, with `render-engineer`.
- 10 Oct: the owner asked for **bigger settlements still,** and for the street crowd now.
  - The sim engineer was asked for capital and city 128×80, town 112×64, village 80×48 and hamlet 56×32, as long as a capital builds in about 150 ms warm or less; otherwise the largest that fits.
  - The render engineer started the street crowd: `packages/worldgen/src/place/street-crowd.ts`, `place-builder.ts`, `walkers.ts` and the place pass's buffers. Up to 3,000 walkers on desktop and 600 on phones.
  - If the session ended: check `git log` for "Bigger places and crowds" and "The street crowd", and `git status` for unfinished work. Commit only green work, then push.
- 10 Oct: **the street crowd landed** (06d6713 and 8c18e75): one walker per 150 residents, up to 3,000.
  - A new `PlaceCrowd` contract, with `placeBuffers(layout, walks, crowd)`.
  - 3,008 walkers draw in 0.59 ms median in WebGL2; 600 under Canvas2D take 0.25 ms.
  - **The bug:** walkers pile into lines, because a capital has only about 8 people loops. The render engineer is giving the crowd its own loops, about one per 10 walkers, spread over every street, capped near one walker per two loop cells.
  - When the sizes land, `apps/web/test/map-worker.test.ts`'s width-48 assertion must change with them.
