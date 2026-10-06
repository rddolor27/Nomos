# Round 9 · Maps and world builder: questions and status

Before the rest of the build, the owner wants a plan for how Nomos's maps get made, and asked whether Nomos needs a world builder as well.

Every new game already gets a random world from a seed. `tools/worldgen/` is a Python reference generator that builds:
- a country: its shape, rivers, climate, biomes, settlements, roads, natural wonders and landmarks;
- zoomed-in places, from the sprite set.

Rounds 3 and 4 planned two things:
- city maps from a seeded road grid with LDtk prefabs;
- a mesh-based country generator.

This round reconciles those plans with the reference generator, and decides whether and how people can build or edit worlds.

This is a lean round, following `/research-round`: four researchers, then a report, a fact-check and plan tasks tagged (R9).

| # | Question | Notes | Status |
|---|---|---|---|
| 1 | How should each map layer be made, from country to street, now that a reference generator exists: procedural, hand-made kits, or generated then edited? | `notes/map-pipeline.md` | Done, with prototypes in `prototypes/pipeline/` |
| 2 | Does Nomos need a world builder, for whom, and what should it do first? | `notes/builder-scope.md` | Done |
| 3 | How do edits live on top of a seeded world: edit logs, locks and regeneration, validation and guardrails, saves and share links? | `notes/edits-and-saves.md` | Done, with prototypes in `prototypes/edits/` |
| 4 | How should the editor be built in the browser within the plan's budgets: renderer reuse, tools, undo, autotiling, performance and interop? | `notes/editor-tech.md` | Done, with prototypes in `prototypes/editor/` |

## Status

All four questions are answered. `report.md` is written and fact-checked, and `summary.md` is drafted.

On 6 October 2026 the owner made four calls:
- accepted the recommended defaults (a)–(d) and (f)–(k);
- chose a full player editor for (e);
- approved the shared-doc update;
- asked for the four generator fixes, which are now in `tools/worldgen`.

Still to do: add `summary.md` as a tab in the shared doc, add the (R9) tasks to its Implementation plan tab, then export with `/sync-plan-doc`. The doc belongs to the account used earlier, so it needs sharing with the current one first. The same day the owner moved launch after M8, so every builder level ships before launch.
