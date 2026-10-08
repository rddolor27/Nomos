# M1 Lab mode: sub-milestones

M1 holds 25 build tasks and 7 exit checks in the [implementation plan](../../implementation-plan.md#m1-lab-mode), so it runs as six sub-milestones. The sixth, M1.6 Dev and release, is the owner's CI/CD request of 8 October 2026, which the plan does not list yet. Each one ends with software that runs and passes its own checks. Each has an implementation brief in its `plan.md`, which becomes a step-by-step plan when the sub-milestone before it closes; M1.1's does so when M0 closes.

Estimates are full-time days for one person coding by hand (unsourced estimates). The Actual column records the real time, so the pace measured in M0 can rescale them. The plan's M1 effort line, 1–2 weeks plus 6–9 days for the visual layer, covers rounds 1 and 3 only. About half of that visual layer is pixel art, which is now mostly drawn. The Calendar and Sound tabs add 3–5 and 4.5–6.5 days; the Calendar's share includes the light periods the owner moved to M1 on 8 October 2026. The seven tasks from rounds 2, 6 and 8 carry no estimate of their own, and M1.6's 2–3 days are not in the plan at all.

| Sub-milestone | Delivers | Estimate | Started | Done | Actual |
| --- | --- | --- | --- | --- | --- |
| [M1.1 Lab engine and claims](m1.1-lab-engine-and-claims/task.md) | The thief/trader contest and the ±1 market in discrete days as Skin A dots, with claims judged on paired seeds | 5–8 days | | | |
| [M1.2 Bet cards and watch-only runs](m1.2-bet-cards-and-watch-only-runs/task.md) | Bet cards that lock a prediction before Run, runs the player can only pause, speed up or skip, and day and night on screen | 6–10.5 days | | | |
| [M1.3 Skin B blobs](m1.3-skin-b-blobs/task.md) | The lab drawn as blobs, with faces, bubbles, takes shown as acts, and reduced motion | 4–6 days | | | |
| [M1.4 Sound](m1.4-sound/task.md) | The TypeScript synth, the audio controls and the UI sounds, silent until the first click | 4.5–6.5 days | | | |
| [M1.5 IP gate and playtests](m1.5-ip-gate-and-playtests/task.md) | The IP gate, and playtests with novices and a diverse panel on a dev build | 2–4 days | | | |
| [M1.6 Dev and release](m1.6-dev-and-release/task.md) | GitHub Actions deploys to dev on every push and releases on demand, and lab mode's first release | 2–3 days | | | |
| **Total** | | **23.5–38 days** | | | |

Two points apply throughout:
- **Runs are watch-only.** Lab cards set every treatment before Run, and a running card accepts only pause, speed, skip and read-only queries (owner, 7 October 2026).
- **The assets exist.** `tools/sprites` has drawn nearly all the blob cast and its bubbles, and `tools/sounds` has built every sound M1 plays. M1 mostly writes the code that draws and plays them.

Each sub-milestone has its own folder: `task.md` says what to build and the checks that close it, and `plan.md` says how to build it.
