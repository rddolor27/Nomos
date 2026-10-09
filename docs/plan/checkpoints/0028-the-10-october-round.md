---
checkpoint: 28
date: 2026-10-09
milestone: planning
status: paused
based_on: 03c5c32
next: M3.1 part 2, step 1, bigger places. Expand its brief first (docs/plan/tasks/m3-city-life/m3.1-town-generator/plan.md, "Part 2")
waiting_on: [owner: the town walls' look (M3.1 part 2), owner: the starting town's blob counts per tier (M3.1 part 2), owner: the UI look from mockups (M0.8), owner: whether to push 03c5c32 and the commits before it]
---

# Checkpoint 0028: the 10 October round

## State

The owner's town view is built and tested (checkpoint 0027, in git history at be81455). On 10 October 2026, with about 20% of usage left, the owner set the next round and asked to update the rules, agents and plans first, without testing. This checkpoint records that round. No product code changed since checkpoint 0027.

## Done since checkpoint 0027

- **Plans,** in 03c5c32:
  - M3.1 gains part 2: bigger places, crowds that grow with population, the starting town, town walls with gates, and more houses. Its `task.md` and the brief in `plan.md`, "Part 2", hold it.
  - M8.1 gains Task 36: the large world by default.
  - M0 gains M0.8, the UI look, as a new sub-milestone with a task and a brief. The roadmap was regenerated.
- **Local rules and agents,** which are gitignored and not committed:
  - `.claude/rules/code.md`'s classes section now holds the OOP rule;
  - `code-reviewer.md` treats game objects as classes as the rule, not a finding;
  - two new agents: `.claude/agents/ui-designer.md` and `.claude/agents/asset-designer.md`;
  - `CLAUDE.md` gains the state, the round's order, the class rule and the two agents.

## Decisions

The owner, 10 October 2026:
1. **OOP for the game.** Houses, buildings, walls, props, sprites, places, renderers, views and UI panels are classes, with inheritance at most two levels deep and only where two or more kinds share a base. Blobs and other crowds stay typed-array rows behind handles such as `Blob`, for the tick and frame budgets. The rule applies to new code and to code that changes; working code isn't rewritten only to convert it.
2. **Bigger town views.** Places get four times the area: 96×56 for a capital or city, 80×48 for a town, 64×40 for a village and 40×24 for a hamlet. Crowds grow with population: about 150–300, 60–120, 25–50 and 10–20 on desktop, fewer on phones.
3. **The starting town,** Highcourt, grows to match.
4. **The world map** opens the large size, 192×128, by default.
5. **The UI:** improve the buttons, the zoom and how users read the graphs. The ui-designer shows mockups first.
6. **Agents:** teach every agent the new rules, and add a UI/UX agent and an asset/level agent.
7. **Walls are town walls with gates,** around capitals and cities. They and more houses come after the sizes.
8. **Plans:** update the repo's plans now, and the shared Claude doc later.

## Open

1. Sync this round into the shared plan doc, with `/sync-plan-doc` after editing the doc. The owner deferred it.
2. **The owner's picks:** the walls' look, the starting town's blob counts per tier, and the UI look.
3. **The push:** 03c5c32 and the commits back to b2bf42e are local. `origin/main` moved to 0ef7592 by a push nobody asked for (see checkpoint 0026, at c96d81c).
4. **QA's low bugs** 2 and 3 in the town view (checkpoint 0027).
5. Everything open in checkpoints 0026 and 0027 still stands, such as M8.1 Tasks 31 and 33–35.

## Next

1. **M3.1 part 2, step 1, bigger places.** Expand the brief into a step plan on Opus, then run it with `sim-engineer`; `asset-designer` tunes the layout.
2. Then:
   - step 2, the crowds;
   - step 3, the budgets;
   - step 4, the starting town;
   - M8.1 Task 36;
   - M0.8, starting with mockups for the owner;
   - M3.1 part 2, steps 5 and 6, after the owner picks the walls' look.

## How to verify

No product code changed, so checkpoint 0027's checks still hold. Plans: `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py` reports M3 with 0 weak matches and M8 with 0; M0's 10 were already there.
