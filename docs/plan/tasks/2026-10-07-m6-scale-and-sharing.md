# M6 Scale and sharing: sub-milestones

M6 holds 29 build tasks and 9 exit checks in the [implementation plan](../implementation-plan.md#m6-scale-and-sharing), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. None has a step-by-step plan yet; each gets one when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the later estimates can be rescaled to the measured pace. The plan's own M6 effort line, 2–4 weeks plus 5–8 days for the visual layer, comes from rounds 1 and 3. Round 4 adds 2–3 days, round 9's New town panel, street editor and cards 19–31, and the Sound plan 1–1.5. Rounds 2, 5, 8 and 9 add further work nobody estimated. With those, the sub-milestones below come to 49–81 days.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| M6.1 Generated cities | Cities of 400² to 1,024² tiles from a context record, frozen generator versions and the New town panel | 7–12 days | | | |
| M6.2 100,000 agents | 100k agents at 60 fps on a desktop, with workers, WASM SIMD, the heatmap and offline starts | 9–16 days | | | |
| M6.3 Worlds, saves and links | Worlds as a seed plus edit layers, saves, and links that replay in any browser | 5–8 days | | | |
| M6.4 Street editor | The Build mode opened to players, with player-made towns shared as links or files | 9–14 days | | | |
| M6.5 Card remix and authoring | Lab cards that players remix and write, judged by M1's statistics | 9–15 days | | | |
| M6.6 Launch kit | Preview cards, the "What this toy leaves out" page, credits, ODD+D and the name review | 8–13 days | | | |
| M6.7 Country save hooks | Country sections in saves and links, once M7's ledgers exist | 2–3 days | | | |
| **Total** | | **49–81 days** | | | |

Three decisions apply throughout:
- **Watch-only.** The New town panel, the street editor and card treatments all act before Run. Edits apply before day 0, and a playing run refuses them (Calendar, R9).
- **Seeds never hold a generator version.** Place seeds key on the world seed and the stable cell id. A version only selects code, so it never reshuffles untouched places (R9, replacing round 4's formula).
- **Launch waits for M8.** Round 9 moved launch after M8, so M6.6 readies the launch kit and the page, and both go live after M8.

## M6.1 Generated cities

Needs M3's TypeScript port of `place.py`. The Python reference in `tools/worldgen` already builds each place from a context record, `model.PlaceContext`, seeded by the world seed and the place's cell.

- **Builds:**
  - cities of 400² to 1,024² tiles on the place generator's district grid, building 64×64 districts lazily as they come into view, with no LDtk prefab blocks or wave function collapse (R3, R9);
  - the city generator parameterised by a context record (tier, population, route-entry bearings, river, coast, biome, port and crossroads, without walls) and seeded by the world seed and the settlement's stable cell id, never by the generator version (R4, R9);
  - each released generator version frozen with golden fingerprints for about 100 seeds, old versions shipped as lazy chunks, and an explicit "Rebuild on the latest generator" that lists conflicts (R9);
  - a "New town" settings panel: seed with re-roll, 3–5 presets, size tier, biome, river, coast and port (R9).
- **Exit checks:**
  - a generated city's map hash is identical across engines for a given seed (R3); the city generator returns byte-identical maps in Node, Bun, Deno and three browsers for 100 random context records (R4).

## M6.2 100,000 agents

Needs M6.1's large cities, and M3's timing wheel, per-cell aggregates and voice caps.

- **Builds:**
  - a `_headers` file with immutable caching for hashed assets plus COOP/COEP, and a hand-written service worker for offline starts (R5);
  - staggered decisions and per-cell aggregates at 100k, extending M3's timing wheel and default aggregates (R1);
  - SharedArrayBuffer workers only when `crossOriginIsolated` is true and a phase carries at least 0.5 ms: fixed 1,024-agent chunks, chunk-ordered reductions, a spin of at most 50 µs before `Atomics.wait`, and at most min(hardwareConcurrency − 2, 3) helpers (R1, R5);
  - the exact neighbour query in Rust compiled to WASM SIMD, with raw pointer exports, no wasm-bindgen and integer JS fallbacks; the settlement model joins in M7.5, once M7 has built it (R5);
  - semantic zoom for 25k and 100k agents: a Skin A heatmap from 128×128 render-side bins with a log ramp, visible-set compaction, and optional 16-bit positions at 8 bytes per agent (R3);
  - the Canvas2D fallback for all three skins (R3);
  - sound profiled at 100,000 agents: aggregation, voice caps and worklet cost within budget (Sound).
- **Exit checks:**
  - on a desktop, 100k agents keep decisions at 10–20 Hz and rendering at 60 fps, in Skin A at city zoom and Skin C at street zoom (R1, R3);
  - a 100k-agent tick fits 16 ms on the reference machine, exact queries run only through WASM SIMD or workers, and state hashes match for one to four workers (R5);
  - the audio chunks stay within budget, and main-thread audio work stays under about 0.5 ms a frame at 100,000 agents (Sound).

## M6.3 Worlds, saves and links

Needs M6.1's frozen generator versions.

- **Builds:**
  - a world defined as seed + pinned generator versions + per-stage edit layers, with edits as stage inputs applied before day 0 (R9);
  - saves and share URLs that encode seed, config, skin, zoom and camera, and replay identically across browsers (R1, R2, R3);
  - share links as `#w1.` + deflate-raw columns + base64url + CRC32 in the URL fragment, capped at 32 KiB of link, 1 MiB inflated and 20,000 ops, with a `.nomos` file above 8,000 characters and no free text (R9).
- **Exit checks:**
  - a share URL restores the same skin and frame and replays identically in Chromium, Firefox and WebKit (R2, R3).

## M6.4 Street editor

Needs M3's developer Build mode and M6.3's links.

- **Builds:**
  - the Build mode opened to players as a street editor: M3's tools plus an eraser, an eyedropper and a line tool, buildings and props, and home, shop and workplace zones; a palette of building kinds, never styles, which come from a keyed draw with a "restyle" button; no person, costume, culture or hue tools and no asset import; edits validated (doors on roads, capacity, reachability), applied before day 0 and shared as links or `.nomos` files (R9);
  - a "made by a player" badge, a "hide custom names" switch and a report button that emails the owner, shown when a player-made world opens (R9);
  - the builder sounds (`ui_build_*`) for brush, place, erase and undo in the street editor; the sounds exist, so wire them in (Sound).
- **Exit checks:** M6 lists none for the editor, so two of the plan's ongoing tests close it:
  - a no-op edit leaves the replay hash unchanged (R9);
  - a partial rerun from the first dirty stage equals a full rerun, byte for byte, for random edit logs (R9).

## M6.5 Card remix and authoring

Needs M1's cards and statistics, and M6.3's links.

- **Builds:**
  - card remix: players choose the visible knobs and a pre-validated treatment, then share a link or QR code, and paired arms keep entity ids stable (R9);
  - card authoring: players set arms, metrics, claim type and seeds, prompts come from templates rather than free text, M1's statistics judge every claim with the "hand-picked setup" label, and treatments never key on culture (R9).
- **Exit checks:** M6 lists none for cards, so one of the plan's ongoing tests closes it:
  - a treatment edit changes no unrelated entity id (R9).

## M6.6 Launch kit

Needs M1's bet cards, M4's outcome audit and M6.3's links.

- **Builds:**
  - the launch kit: playable with no signup, a 1200×600 preview card per scenario drawn in Skin C with blobs and alt text, a share text that carries a bet, and translation-ready text files (R2, R3);
  - the "What this toy leaves out" page, live at launch, explaining why every agent shares one blob body and a random look that no sim rule reads (R2, R3, R8, R9), and naming the class colours, culture conflict and punishment spectacles that games like Norland use and Nomos excludes (R6);
  - the page's culture section: cultures are fictional, learned, preference-only and never drawn, real cultures are far richer, housing ignores culture, and festival and taste spending never crowds out food (Atkin; Banerjee and Duflo); it names what Nomos leaves out on purpose (real cultures, discrimination by law as in Victoria 3, xenophobia and culture conflict as in Norland), states the outcome-audit result in words, and links the illusory-correlation and generic-language studies (R8);
  - the custom catalogue and a sample of generated names reviewed by sensitivity readers or the diverse panel before launch (R8);
  - ODD+D with purpose and patterns first, a TRACE notebook, and a CoMSES submission (R2);
  - `THIRD_PARTY_NOTICES` and an in-app credits screen covering every asset, with the look described as "GBA-era top-down pixel art" in all launch copy (R2, R3);
  - optional: LLM narration of a clicked agent, called rarely and asynchronously, with a deterministic fallback and every output logged (R1, R2).
- **Owner decision first:** whether the optional LLM narration ships; it would add about 2–3 days (unsourced estimate).
- **Verify first:** the effect sizes behind the stereotype studies, which decide how the page cites them.
- **Exit checks:**
  - launch metadata passes the name lint (R3).

## M6.7 Country save hooks

Needs M7's settlement and route ledgers and their blocks, so it runs once M7 closes. Round 4 placed these hooks in M6 when country mode followed launch. M8 and M9 fill the history, notables and edit-diff sections later.

- **Builds:**
  - country sections in the save format (settlement and route ledgers, regions and markets, per-settlement edit diffs, the notables cache, multi-resolution history, generator versions), gzipped with `CompressionStream` into OPFS or IndexedDB, and share links extended with `mode=country`, the world seed, generator versions and the focus log (R4);
  - the settlement culture block in saves as top-3 sparse counts, with dense counts where needed, budgeted at 50–118 KB gzip for 10,000 settlements and measured before the format freezes (R8).
- **Owner decision first:** whether the culture block must fit under the 0.5 MB save cap, or the cap rises to round 8's projected 0.55–0.62 MB.
- **Exit checks:**
  - a save of 10,000 settlement ledgers with goods, food, happiness and wealth blocks stays under about 0.5 MB gzip, replacing round 4's 0.3 MB (R4, R6); a share URL with a focus log restores the same canonical hash (R4).
