---
checkpoint: 37
date: 2026-10-10
milestone: M2.2b
status: done
based_on: 94786e3
next: M3.1 Part 3's Tasks 12–16 and 19–21 (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md) once the owner says go; else M8.1's Tasks 31 and 35–36
waiting_on: [the owner's go for M3.1 Part 3, perf.yml started once by the owner]
---

# Checkpoint 0037: the economy on screen

## State

M2.2b and M0.8 are done.
- **The town:** the first screen's town runs the economy. The inspector shows a blob's job, employer and wage.
- **The panel:** it charts mean price, mean wage and unemployment, with the day's trades.
- **Speed:** 1×, 4× and 16× sit in the HUD.
- **The world map:** M8.1's place names landed, and world generator version 1 is frozen (Tasks 33–34).
- **Hashes:** `746a06a3`, the economy `6a652730`, `town` `b76fca4c`, and Highcourt's pins `d11bb532` and `8eb639aa`.

## Decisions

- **Owner:** up to four agents build at once, each on its own files, and only one runs Playwright.
- **Owner:** generated names need no review.
- **Coordinator:** M1.2's speed buttons came forward, and lil-gui moved behind `?dev=1`.
- **Coordinator:** a month's last and first days get an interim allocation allowance until M6.
- **Coordinator:** before the freeze, the name filter gained 17 crude words and 42 faith words.

## Open

- **CI:** it turned red at eea62ad on the allocation test, and the fix is in this push. Later runs weren't read, under the git-only rule.
- **perf.yml:** it hasn't run on the economy.
- **`HANDOFF.md`'s Open list:** the small UI follow-ups, the spawn transient, speed at 100k, stale docs, and the shared plan doc's sync.

## Next

1. With the owner's go: M3.1 Part 3's Tasks 12–16 and 19–21 (walls, towers, gates and farms), in `docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md`.
2. Without it: M8.1's Tasks 31 and 35–36 (`docs/plan/tasks/m8-country-map/m8.1-world-generator/plan.md`), or M2.4 Goods and food.
