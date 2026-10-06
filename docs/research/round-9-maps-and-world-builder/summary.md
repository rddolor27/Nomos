# Maps and world builder

Oct 6, 2026 · @Rd

Every layer of a Nomos world comes from its seed, on one square grid. Hero towns are generated, then hand-edited. Players get a full world builder (settings, god tools, a street editor and card authoring), with the content rules built into the tools. Round 9 answered four questions:
- how each map layer gets made;
- who the builder is for;
- how edits live on a seeded world;
- how to build the editor in a browser.

The resulting tasks are in Implementation plan, tagged (R9).

## Maps: every layer from the seed

| Layer | How it is made |
| --- | --- |
| Country | The TypeScript port of `tools/worldgen` on a square grid: 96×64 standard, 192×128 large |
| Region | The same cells, drawn at 16 px |
| Settlement plan | From the place seed and record: arterials from road sides, a plaza, district zones |
| District and street | 64×64-tile districts generated when they come into view; hero towns generated, then hand-edited |
| Interior | Abstract building cards; no walk-in interiors |
| Route | Strip maps built from the route's cells by the place code |

**This replaces three planned methods:** LDtk village kits, LDtk prefab towns and wave function collapse filler. Round 4's wealth-keyed prefabs are dropped too; content rule 5 bans them.

**The grid replaces round 4's mesh.** The 8- and 16-px art is square, and a mesh would have to be rasterised back onto this grid anyway. The existing shore rule draws 99.6% of coast cells.

**The ported parts match Python exactly.**
- A JavaScript port of the keyed draw and noise matched Python on 1,132,769 cases.
- The terrain stage matched on 300 of 300 seeds, in Node and Chromium.
- It ran 90–100× faster than Python, so a whole country should take tens of milliseconds.
- The later stages and most of the place code are not ported yet.

**A standard world lists 40–61 settlements, not 1,000.** The rest of the population folds into a region tier, and M8's exit check is re-baselined.

**A place stays identical across visits, growth and versions.**
- Its record gains edge biomes, relief, river size, road rank and a founding tier.
- Growth adds lots and districts but never moves a street.
- Generator versions select the code but never enter the seed.

## Edits: inputs to stages, keyed by stable ids

**A world is a seed, pinned generator versions and per-stage edit layers.**
- Each edit feeds one stage and reruns everything after it.
- Hand-placed things are pins the generator flows around.
- A delete is a tombstone that lowers the count.
- A re-roll is a logged, keyed counter.
- Conflicts block play, and no edit is ever silently dropped.

| Towns rebuilt by one edit | Today | With locks | With locks and stable ids |
| --- | --- | --- | --- |
| Add a village (median) | 35 | 23 | 2 |
| Delete a settlement (median) | 10 | 22 | 2 |

| Share link length | Mixed edits that fit |
| --- | --- |
| 2,000 characters (fits a QR code) | about 980 |
| 8,000 characters | about 4,550 |
| Larger | a `.nomos` file with the same bytes |

**Links ride in the URL fragment, which servers never see.** They carry a CRC32 that catches corrupted links, caps that stop decompression bombs, and no free text.

**Validation runs on Play, on Share and on every open:**
- every settlement reaches the capital by road or sea lane;
- food is checked per country;
- names pass round 8's filter in ASCII;
- cultures are placed by the generator after every edit, never by users.

## World builder: every level, by the owner's choice

The research recommended a small builder: settings for players and a tool for the owner. The owner chose a full player editor. Every level on a pre-launch milestone ships by launch. The country-level tools ship with M8, which the plan places after launch.

| Level | Milestone | Effort |
| --- | --- | --- |
| The owner's Build mode | M3 | 8–12 days |
| New town settings | M6 | 2–4 days |
| Street editor for players | M6 | 8–12 more days |
| Card remix | Once M1 cards and M6 links exist | 3–5 days |
| Card authoring | Once M1 cards and M6 links exist | 6–10 days |
| New country settings | M8 | 5–8 days |
| God tools, including lock and re-roll | M8 | 14–22 days |
| **Total** | | **about 46–73 days**, beyond the plan's current milestone budgets |

**The content rules hold by construction.**
- The palette offers building kinds, never styles; a house's style is a keyed draw with a "restyle" button.
- There are no person, costume, culture or hue tools, and no asset import.
- Players choose a culture count; they never paint cultures. Random user-placed culture hearths met the fairness bars in 0 of 723 layouts.
- Card prompts come from templates, and M1's statistics judge every claim.

**Teaching uses paired arms on one world.** Builder edits must keep entity ids stable. In a toy, re-keyed ids made paired arms as noisy as unpaired seeds, costing 7–8× the seeds.

## Editor: a Build mode inside the app

- **Loading:** it loads only when chosen, so the first frame keeps its 8 KB of JS. The renderer gains one method that patches 32×32 tile chunks.
- **Speed:** on a 1,024² map, a brush event costs under 0.07 ms and a whole stroke 0.06–3.0 ms (desktop). Map-wide edits go to the worker.
- **Undo:** per-edit commands holding cell diffs, as in Tiled. 100 strokes hold 0.27 MB.
- **Tidying:** shores tidy once per stroke, judging every cell before changing any. The smallest land brush is 3 tiles.
- **LDtk:** it stays only for hand-made kits until the builder can author them, importing kinds and entities. The sprite manifest is the shared vocabulary.

## Generator fixes made now

The reference generator was fixed before its outputs become test goldens:
- every settlement's draws key on its cell;
- shore tidying is order-free;
- towns beside farmland draw fields;
- sea lanes join islands port to port.

## Decisions the owner settled

On 6 October 2026 the owner accepted every recommended default but one, and chose the full player editor.

| Decision | Adopted |
| --- | --- |
| Country representation | The square grid |
| Where towns come from | Generated from the place record |
| The first town | Generated, then hand-edited; LDtk only as a fallback |
| Building interiors | Abstract building cards |
| Who the builder is for | Players, at every level; the country tools ship with M8 |
| Culture in the builder | A culture count and a single-culture switch; no painting |
| When edits apply | Before day 0 only |
| Share links | `#w1.` in the URL fragment with a CRC32; a file above 8,000 characters |
| Settlement identity | A stable id: the cell |
| World sizes | 96×64 standard, 192×128 large |
| Art | About 55–81 new tiles and a snow biome |

The fact-checked report, with every source, measurement and open question, is `docs/research/round-9-maps-and-world-builder/report.md` in the repo. Its notes and prototypes sit beside it.
