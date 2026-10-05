---
paths:
  - "docs/**"
---

# Docs and research rules

- **Where files go:**
  - the plan in `docs/plan/`;
  - each research round in `docs/research/round-N-<topic>/`, holding `summary.md`, `report.md`, `notes/` and `prototypes/`;
  - concept art in `docs/mockups/`.
- **Source of truth:** the shared Claude doc is the live version of the plan and summaries, and `docs/` holds exports of it. Change the doc first, then re-export with `/sync-plan-doc`.
- **Round tags:** every plan task carries the tag of the round it came from, (R1) to (R5). A new round takes the next number.
- **Evidence labels:** mark how every figure is known:
  - "opened": the source was read in full;
  - "search summary" or "snippet only": seen only in a search result;
  - "measured here" or "computed": produced by the research team;
  - "inference";
  - "unsourced estimate".
  Never present a summary-only figure as sourced.
- **Timings:** record the engine and version and the load average next to each one. Never present a desktop or VM timing as a phone timing.
- **Style:** lead with the answer, keep sentences under 25 words, and give numbers with units. Cite links inline next to the claim.
- **Prototypes are throwaway research code.** Never commit third-party code, datasets or build output beside them.
