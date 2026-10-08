# M9.6 Consequential focus: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The default is shadow-canonical (R4).**
  - The ledger is canonical.
  - A focused city is a view aligned to it, and never writes back.
  - Every viewer sees the same world, whatever they focus.
- **Consequential focus is opt-in (R4).**
  - Agents become canonical while a settlement is focused, and fold back into the aggregate on exit.
  - Focus changes are logged as inputs at day boundaries, like player commands.
  - An observer-effect notice explains that looking now changes the run.
  - The focus log travels in share URLs (M6.3), so a run replays.
- **Optional pinned live settlements:**
  - chosen at world creation: one on phones, up to three on desktops;
  - agent-canonical all the time, folded exactly into the national accounts every day.

  They ship only if the owner decides so.

## Packages and files

- `packages/sim-country/src/focus/mode.ts`: shadow-canonical against consequential, and the canonical write path for the latter.
- `packages/sim-country/src/focus/pinned.ts`: pinned live settlements, behind the owner decision.
- `apps/web/src/focus/notice.ts`: the observer-effect notice.
- `packages/sim-protocol/src/link.ts`: the focus log in links. This extends M6.3, as M6.7 began.

## Interfaces and data

- **Focus mode:** `'shadow' | 'consequential'`, part of the world settings and fixed before Run.
- **Focus log:** `{ tick, settlement, enter }[]`, which is canonical only under consequential focus.
- **Pinned settlements:** `Int32Array` of settlement uids, fixed at world creation.

## Method and sources

- **Detail levels, the determinism decision, consequential focus and the hand-off twin test:** [R4 architecture notes](../../../../research/round-4-multi-scale/notes/architecture-lod.md), parts 3.1, 3.2, 3.7 and 3.8.
- **Divergence evidence:** M9.2's meter.

## Tests for the exit checks

- `shadow-canonical ignores focus`: for one seed, three different focus logs give identical replay hashes.
- `consequential replays with its log`: the same focus log gives the same hash.
- `notables reappear`: on revisits, notables and followed agents return with consistent records, in both modes.
- `hand-off twin test`:
  - under consequential focus, a focused twin and an unfocused twin keep output, prices, crime and money per head within the ledger's noise;
  - under shadow-canonical it passes by construction, so M9.2's divergence meter does that job.
- `pinned settlements fold exactly`: if built, each pinned settlement's fold matches the national accounts every day.

## Risks and unknowns

- **Owner decision first:** whether pinned live settlements ship.
- **Verify first:** alignment nudges with the real emulator, read on M9.2's divergence meter. They decide between shadow-canonical as the default and pinned live cities.
- **The observer effect can confuse players.** The notice and a clear mode label in the HUD are required, and consequential focus stays off by default.

## Open questions

- **Owner:** Do pinned live settlements ship? They add a second canonical path to build and test. Suggested: no, unless M9.2's meter fails its bar on presets, and then at most one. Needed before: the step plan.
- **Measure:** What is "the ledger's noise" in the hand-off twin test? Without a definition the test can't fail. Suggested: M7.2's 5–95% seed band of the always-aggregate twin, over the same seed count. Needed before: the step plan.
- **Measure:** Does a long focus log fit R9's 32 KiB link cap? Each switch adds an entry. Suggested: delta-code the ticks and compress, with M6.3's `.nomos` file above 8,000 characters. Needed before: building.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the shadow-canonical hash test over three focus logs, which should already pass, then consequential writes, the notice and links, and pinned settlements if approved.
- **Reuse:** M9.1's switch log and fold, M9.2's meter and M6.3's links.
- **Keep it simple:** under consequential focus, skip alignment; focused agents' own flows fold into the ledger at the day boundary, so no reconciliation path is needed.
- **Pitfalls:** under consequential focus the focus log is canonical input, so it travels with every save and link, or replays diverge. The shadow hash test must include the focused settlement's own ledger, where a stray write-back would show.
- **Hard and easy parts:** the consequential write path and its exact fold need care; the notice and the mode label are mechanical.
