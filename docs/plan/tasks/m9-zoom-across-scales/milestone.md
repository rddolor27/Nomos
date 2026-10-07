# M9 Zoom across scales: sub-milestones

M9 holds 22 build tasks and 7 exit checks in the [implementation plan](../../implementation-plan.md#m9-zoom-across-scales), so it runs as six sub-milestones. Each one ends with software that runs and passes its own checks. M9 comes after launch, because round 9 moved launch to follow M8. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in earlier milestones can rescale them. The plan's M9 effort line, 20–30 days after round 9 dropped the village-kit authoring, covers round 4 only. The owner's plans add 1 day for patrols and 0.5–1 for the sound crossfade. The 8 tasks from rounds 6, 8 and 9 carry no estimate of their own. The plan's own figures sum to 21.5–32 days, and this breakdown to 25–40.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M9.1 Spawn and fold](m9.1-spawn-and-fold/task.md) | Zooming in spawns a settlement's people from its ledger, and zooming out folds them back exactly | 8–12 days | | | |
| [M9.2 Daily alignment](m9.2-daily-alignment/task.md) | Spawned agents kept in line with the ledger each day, with a divergence meter | 3–4 days | | | |
| [M9.3 Streets from the generator](m9.3-streets-from-the-generator/task.md) | Every settlement's streets generated on hover, with stable plans and dormant edits | 5–8 days | | | |
| [M9.4 Villages and the district window](m9.4-villages-and-the-district-window/task.md) | Village rules, and agents only in the districts in view above the device cap | 3–5 days | | | |
| [M9.5 Route strips and wonder views](m9.5-route-strips-and-wonder-views/task.md) | Roads drawn as strips whose caravans, bandits and patrols match the route ledger | 3–6 days | | | |
| [M9.6 Consequential focus](m9.6-consequential-focus/task.md) | The opt-in mode where watching changes history, and optional pinned live settlements | 3–5 days | | | |
| **Total** | | **25–40 days** | | | |

Two points apply throughout:
- **The ledger owns history.** Under the default shadow-canonical mode, agents never write the canonical ledger, so where the camera looks never changes the result (M7's decision).
- **Every switch is exact.** Spawning and folding must conserve money, goods, people, customs and life-satisfaction bands to the unit, or the zoom breaks the ledger's identities.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
