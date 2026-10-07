# M6 Scale and sharing: sub-milestones

M6 holds 29 build tasks and 9 exit checks in the [implementation plan](../../implementation-plan.md#m6-scale-and-sharing), so it runs as seven sub-milestones. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the later estimates can be rescaled to the measured pace. The plan's own M6 effort line, 2–4 weeks plus 5–8 days for the visual layer, comes from rounds 1 and 3. Round 4 adds 2–3 days, round 9's New town panel, street editor and cards 19–31, and the Sound plan 1–1.5. Rounds 2, 5, 8 and 9 add further work nobody estimated. With those, the sub-milestones below come to 49–81 days.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M6.1 Generated cities](m6.1-generated-cities/task.md) | Cities of 400² to 1,024² tiles from a context record, frozen generator versions and the New town panel | 7–12 days | | | |
| [M6.2 100,000 agents](m6.2-100-000-agents/task.md) | 100k agents at 60 fps on a desktop, with workers, WASM SIMD, the heatmap and offline starts | 9–16 days | | | |
| [M6.3 Worlds, saves and links](m6.3-worlds-saves-and-links/task.md) | Worlds as a seed plus edit layers, saves, and links that replay in any browser | 5–8 days | | | |
| [M6.4 Street editor](m6.4-street-editor/task.md) | The Build mode opened to players, with player-made towns shared as links or files | 9–14 days | | | |
| [M6.5 Card remix and authoring](m6.5-card-remix-and-authoring/task.md) | Lab cards that players remix and write, judged by M1's statistics | 9–15 days | | | |
| [M6.6 Launch kit](m6.6-launch-kit/task.md) | Preview cards, the "What this toy leaves out" page, credits, ODD+D and the name review | 8–13 days | | | |
| [M6.7 Country save hooks](m6.7-country-save-hooks/task.md) | Country sections in saves and links, once M7's ledgers exist | 2–3 days | | | |
| **Total** | | **49–81 days** | | | |

Three decisions apply throughout:
- **Watch-only.** The New town panel, the street editor and card treatments all act before Run. Edits apply before day 0, and a playing run refuses them (Calendar, R9).
- **Seeds never hold a generator version.** Place seeds key on the world seed and the stable cell id. A version only selects code, so it never reshuffles untouched places (R9, replacing round 4's formula).
- **Launch waits for M8.** Round 9 moved launch after M8, so M6.6 readies the launch kit and the page, and both go live after M8.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
