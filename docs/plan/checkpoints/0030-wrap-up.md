---
checkpoint: 30
date: 2026-10-09
milestone: M0.8 and M3.1 part 2
status: paused
based_on: c0b5719
next: the asset-designer's sprites, following the plan below; then M0.8 from the ui-designer's commits after c0b5719; then M3.1 part 2, step 1
waiting_on: []
---

# Checkpoint 0030: wrap-up before usage ran out

## State

The owner asked to wrap up at once, as usage was nearly out, and to push with no QA. `main` was pushed to c0b5719. The asset-designer stopped before writing any files, and its plan is below. The ui-designer was wrapping up M0.8. Compare `git log` after c0b5719 for anything it committed, and `git status` for anything it left.

## Done since checkpoint 0029

- `main` was pushed from 0ef7592 to c0b5719, 22 commits, all under the no-reply address.
- **Asset-designer:** no commits. Its baseline atlas, in the gitignored `dist/asset-designer/atlas-before/`, has `atlas.webp` at 86,208 B and 2048 × 664 px, with 1,344 frames, well under the 300 kB "Atlas" entry.

## The asset-designer's plan, not built yet

- **Walls:** a new `tools/sprites/walls.py`.
  - An `abc.ABC` base for the wall pieces, with `Wall` (a straight run), `Tower` and `Gate` under it, per the `typescript-oop` skill.
  - It reuses the fort's stone coursing and `add_with_snow` from `military.py` and `buildings.py`.
  - The crenels repeat every 8 px, since the fort's 6 px doesn't divide a 16-px tile.
- **Houses:** two new styles, `board` (weatherboard walls under a fish-scale roof) and `rubble` (fieldstone walls), each in all 6 shapes and 5 roof colours.
- **Props,** six in `nature.py`: a notice board, a planter, a trough, a pump, sacks and a woodpile. The sheets already hold a well and a single crate.
- **References:** that session had no web tool, so `docs/mockups/town-references.md` waits for a session that has one. Links written from memory must be labelled as not opened.

## Decisions

As in checkpoint 0029, at ee790af in git history: the walls' look, the UI look, and QA only once an implementation is finished. The owner also said no QA for now.

## Next

1. Check `git status` for anything the ui-designer left uncommitted, and finish or drop it.
2. The asset-designer's plan above, then a preview sheet for the owner.
3. M3.1 part 2, step 1, bigger places (checkpoint 0028, at 1cf1b50 in git history).

## How to verify

As in checkpoint 0028.
