---
name: sync-plan-doc
description: Re-export the shared Claude doc "Civilization Simulation — Research & Build Plan" into docs/ as Markdown, restoring images and diagrams and checking every link, then commit each tab separately. Use after the doc changes, or when the user asks to update the plan or summaries in the repo.
---

# Sync the plan doc

The live plan is a Claude doc that needs the Claude Docs connector: https://claude.ai/code/artifact/599c64c6-a677-4b0e-8fb7-1b4c799dc152

| Doc tab | Repo file |
|---|---|
| Implementation plan | `docs/plan/implementation-plan.md` |
| Findings & plan | `docs/research/round-1-baseline/findings-and-plan.md` |
| Full report | `docs/research/round-1-baseline/full-report.md` |
| Sources | `docs/research/round-1-baseline/sources.md` |
| Follow-up research | `docs/research/round-2-follow-up/summary.md` |
| 2D game look & assets | `docs/research/round-3-2d-look/summary.md` |
| Villages, cities & countries | `docs/research/round-4-multi-scale/summary.md` |

## Steps

1. Export each changed tab with the Docs `export` tool, format `markdown`. A large result is saved to a file as JSON; base64-decode `data.bytes_b64` from it.
2. Replace the export's placeholders:
   - `&#91;image: <alt>\]` → `![<alt>](<relative path into docs/mockups/>)`;
   - `&#91;embedded content: <caption>\]` → the diagram PNG in that tab's `images/` folder. If the diagram changed, re-capture it with the Docs `read` tool (`kind: "screenshot"`).
3. Run `python3 .claude/skills/sync-plan-doc/check_links.py`. Every relative link must resolve.
4. Commit one tab per commit with `/commit`, for example "Sync implementation plan from doc".
