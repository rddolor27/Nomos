# Docs

This folder holds the research and planning behind Nomos; product code lives outside it. The plan was written in a shared Claude doc: https://claude.ai/code/artifact/599c64c6-a677-4b0e-8fb7-1b4c799dc152. The Markdown here was exported from it on 5 October 2026. If the two differ, the doc is the live version.

## Plan

| File | What it holds |
|---|---|
| [plan/implementation-plan.md](plan/implementation-plan.md) | Milestones M0–M9 with build checklists and exit checks, the visual skins, the performance budget and CI gates, and the verify-first table |

## Research rounds

| Round | Topic | Files |
|---|---|---|
| [1 · Baseline](research/round-1-baseline/) | Architecture, economy, crime, rendering and the first build plan | `findings-and-plan.md`, `full-report.md`, `sources.md` |
| [2 · Follow-up](research/round-2-follow-up/) | Calibration of the economy and crime models, validation statistics, engineering gaps, launch and ethics | `summary.md`, `report.md`, `notes/`, `prototypes/` |
| [3 · 2D look](research/round-3-2d-look/) | Pokémon-style art direction (style only), CC0 asset packs, renderer benchmarks, legal | `summary.md`, `report.md`, `notes/`, `prototypes/` |
| [4 · Multi-scale](research/round-4-multi-scale/) | Villages, cities and countries: ledgers, zoom, world maps, regularities between settlements | `summary.md`, `report.md`, `notes/`, `prototypes/`, `images/` |
| [5 · Performance](research/round-5-performance/) | Tick, memory and CI budgets: JS vs WebAssembly, workers, GC, country scale | `notes/compute.md`, `prototypes/compute/` (load, bundle and memory notes to follow) |

What each file type holds:

- **`summary.md`**: the round's tab from the shared doc, which is the short, edited version.
- **`report.md`**: the full fact-checked report behind that tab.
- **`notes/`**: the raw research notes. Each claim is labelled by how it was checked: "opened" means the source was read in full; "search summary" or "snippet only" means it was seen only in search results; "measured here" or "computed" means the research team produced it.
- **`prototypes/`**: benchmark and analysis code from the research. It is not product code. Some scripts read datasets or cloned repositories that are not included; the notes name the sources. Timings come from a 4-vCPU cloud VM, mostly under Node, and are not phone measurements.

## Mockups

[`mockups/`](mockups/) holds the concept images used in rounds 3 and 4:
- `town_closeup.png`, `town_closeup_blobs.png` and `city_zoomed_out.png`;
- `country_map.png` and `scale_ladder.png`;
- `cc0_asset_previews.png`;
- `generator/`, the Python (Pillow) scripts that drew them;
- `previews/`, unmodified CC0 images with their licences;
- [`SOURCES.md`](mockups/SOURCES.md), the provenance of every tile and sprite.
