# M3 City life: sub-milestones

M3 holds 57 build tasks, one of them done, and 19 exit checks in the [implementation plan](../../implementation-plan.md#m3-city-life). That is more than any other milestone, so it runs as eight sub-milestones. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The plan's M3 effort line is 2–3 weeks plus 8–12 days for the visual layer. It covers round 1's routines and round 3's town, including 3–5 days editing the generated town. Later rounds and the owner's plans added most of the other tasks. The Build mode adds 8–12 days (R9), and the owner's plans add 10–16: calendar 2–3, sound 4.5–8, military 1 and gazette 2.5–4. This file estimates the rest, chiefly the `place.py` port, which round 9 moved from M6, and the round 2, 5, 6 and 8 tasks. The plan's own figures sum to 36–55 days, and this breakdown to 65.5–101. That is 3.5–5 days less than before, because work moved ahead of M1 (owner, 9 October 2026): M0.7 now builds the shared name sound set and the name filter, and M8.1 and M8.3 the `packages/worldgen` setup, the trigram name screen, the tile pass and the map atlas page. The Actual column records the real time, so later estimates can be rescaled to the measured pace.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M3.1 Town generator](m3.1-town-generator/task.md) | The TypeScript place generator: a 256² town from a seed, with walkability and entities in the binary map | 7.5–11 days | 9 Oct 2026, 21:49 (step plan for the place port and the owner's town view committed) | | |
| [M3.2 Daily routines](m3.2-daily-routines/task.md) | Agents who work, shop, eat and sleep on schedule, and the inspector that explains them | 12–18 days | | | |
| [M3.3 Skin C town](m3.3-skin-c-town/task.md) | The pixel-art town: tiles, roofs, light periods, automatic skins, the phone path and the follow-cam | 5–7.5 days | | | |
| [M3.4 Build mode and default town](m3.4-build-mode-and-default-town/task.md) | The owner's Build mode, and the hand-edited default town within budget on phones | 11–17 days | | | |
| [M3.5 Food and harvest](m3.5-food-and-harvest/task.md) | Pantries, shelf lives, a food-insecurity tally and one grain harvest a year | 6–9 days | | | |
| [M3.6 Wellbeing and housing](m3.6-wellbeing-and-housing/task.md) | Life satisfaction with named drivers, and homes that are owned, rented or mortgaged | 8–12 days | | | |
| [M3.7 Cultures and festivals](m3.7-cultures-and-festivals/task.md) | Customs passed on and adopted, festivals, music events and personal names | 7–11.5 days | | | |
| [M3.8 Seasons, sound and gazette](m3.8-seasons-sound-and-gazette/task.md) | Seasons in the town, its sounds and music, and a paper every morning | 9–15 days | | | |
| **Total** | | **65.5–101 days** | | | |

Three decisions apply throughout:
- **Generated, then hand-edited.** Round 9 makes the default town a fixed seed of the TypeScript place generator, edited in Build mode, with LDtk only as a fallback. Tasks that named LDtk files, homes or workplaces now read the binary map from M0.4, and carry both tags.
- **Wire in what exists.** The original sprites in `tools/sprites`, the Python generator in `tools/worldgen` and 94 sounds in 7 banks in `assets/sounds` are already built. Most art and sound tasks now only wire them in. Only the shore saddle keys, the lamp post's lit overlay, the gazette icon and panel frame, and the optional human sheet are still to draw.
- **Watch-only.** Build mode edits apply before day 0, and the inspector, follow-cam and gazette only read, so no M3 view steers a run.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
