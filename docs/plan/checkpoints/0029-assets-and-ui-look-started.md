---
checkpoint: 29
date: 2026-10-09
milestone: M0.8 and M3.1 part 2
status: paused
based_on: be91155
next: read the asset-designer's and ui-designer's reports and commits; then one QA pass over both, as models.md allows only once an implementation is finished
waiting_on: [owner: whether to push be91155 and the commits before it]
---

# Checkpoint 0029: assets and the UI look, started

## State

On 10 October 2026 the owner told the coordinator to go with its own suggestions for the open picks. They asked for references on town looks and more assets, for a professional UI look with the impeccable skill, for a rule that QA runs only once an implementation is finished, and for an OOP skill. Two agents were working when this was written: the `asset-designer` on references and sprites, and the `ui-designer` on M0.8. Their commits, after be91155, aren't described here; compare with `git log`.

## Done since checkpoint 0028

Local rules, skills and agents, which are gitignored and not committed:
- `.claude/rules/models.md` gains "QA only at the end", and `CLAUDE.md`'s "Working a sub-milestone" step 4 matches it;
- a new skill, `.claude/skills/impeccable/SKILL.md`: design guidance adapted from pbakaus/impeccable 4.5.2 (Apache 2.0), as text only, with no CLI or binary. `THIRD_PARTY.md` records it;
- a new skill, `.claude/skills/typescript-oop/SKILL.md`: the class rule in practice, in TypeScript and Python;
- the agents:
  - the TypeScript engineers, the ui-designer and the code reviewer now preload `typescript-oop`;
  - every agent with the Skill tool lists "Skills to reach for", to call only when needed;
  - the ui-designer preloads `impeccable` and can fetch, and the asset-designer can search and fetch.

## Decisions

- **Owner, 10 October 2026:** "just go with your suggestion" for the open picks, which the coordinator set as follows.
  - **The town walls' look:** grey stone, one tile thick, with a crenellated top; square towers at the corners; gates two tiles wide, as stone arches with open wooden doors; snow overlays; and no flags, banners or heraldry.
  - **The UI look:** calm, tinted slate surfaces with one accent, and the role colours and body hues kept out of the accents. One token module, the system font stack, buttons with every state, toolbars that never wrap over the picture, one zoom group of −, + and Fit everywhere, and the lil-gui panel behind `?dev=1`.
  - **The grown starting town's blob counts:** not yet set. Suggested: scale each tier's count with the town's area, capped by that tier's tick budget. Settle it in M3.1 part 2, step 4.
- **Owner, 10 October 2026:** QA runs once, when an implementation is finished. Engineers run only targeted tests until then.
- **Coordinator:** assets and the UI look start now, at the owner's request, ahead of M3.1 part 2's bigger places. The walls and houses are only sprites until the places grow; `place.py` doesn't change yet.

## Open

1. The designers' results, and one QA pass when both are finished.
2. The atlas: new sprites must still pack under 2,048 px, and `atlas.webp` must stay within its size-limit entry.
3. The push: be91155 and the commits back to b2bf42e are local.
4. Everything open in checkpoint 0028.

## Next

1. Read both reports, rebuild the owner's preview at :4180, and show the owner the screenshots and the sprite preview.
2. Then M3.1 part 2, step 1, bigger places, per checkpoint 0028.

## How to verify

As in checkpoint 0028.
