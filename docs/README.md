# Docs

This folder holds the research and planning behind Nomos; product code lives outside it. The plan was written in a shared Claude doc: https://claude.ai/code/artifact/599c64c6-a677-4b0e-8fb7-1b4c799dc152. The Markdown here was last exported from it on 9 October 2026. If the two differ, the doc is the live version.

## Plan

| File | What it holds |
|---|---|
| [plan/implementation-plan.md](plan/implementation-plan.md) | Milestones M0–M10 with build checklists and exit checks, the visual skins, the performance budget and CI gates, and the verify-first table |
| [plan/sound.md](plan/sound.md) | Chiptune sound as data: what plays when, the sound rules, the bank format, porting the synth, mixing and controls |
| [plan/military.md](plan/military.md) | Soldiers who defend and patrol roads, never towns: rules, how patrols feed the route ledgers, and the finished art and sounds |
| [plan/calendar.md](plan/calendar.md) | Watch-only runs and the 112-day year: date maths, seasons, day and night, speeds, branches and the rescaling rules |
| [plan/gazette.md](plan/gazette.md) | The daily town paper, printed only from records: its sections, rules, how editions are built, and the follow-the-news camera |
| [plan/weather.md](plan/weather.md) | Weather after launch, in M10: six kinds in wet and dry spells by season and biome, how they look and sound, and whether they change daily life |
| [plan/cicd.md](plan/cicd.md) | CI/CD in GitHub Actions, in M1.6: dev on every push to `main`, releases promoted from dev by hand, rollback, and the version scheme |
| [plan/structure.md](plan/structure.md) | The owner's code and blob decisions of 9 October 2026: module folders, the `Blob` handle, a name and a wallet per blob, and walking in any direction |
| [plan/countries.md](plan/countries.md) | A world of 3–5 countries, in the map built before M1: natural borders, map facts only, cultures across borders, and the new build order |
| [plan/tasks/](plan/tasks/) | The roadmap, and a folder per milestone: its overview and progress, then a folder per sub-milestone with the task and its implementation plan |
| [plan/checkpoints/](plan/checkpoints/) | Hand-off notes for agents and people: where the project stands, what is decided and what comes next; the highest number is current |

## Research rounds

| Round | Topic | Files |
|---|---|---|
| [1 · Baseline](research/round-1-baseline/) | Architecture, economy, crime, rendering and the first build plan | `findings-and-plan.md`, `full-report.md`, `sources.md` |
| [2 · Follow-up](research/round-2-follow-up/) | Calibration of the economy and crime models, validation statistics, engineering gaps, launch and ethics | `summary.md`, `report.md`, `notes/`, `prototypes/` |
| [3 · 2D look](research/round-3-2d-look/) | Pokémon-style art direction (style only), CC0 asset packs, renderer benchmarks, legal | `summary.md`, `report.md`, `notes/`, `prototypes/` |
| [4 · Multi-scale](research/round-4-multi-scale/) | Villages, cities and countries: ledgers, zoom, world maps, regularities between settlements | `summary.md`, `report.md`, `notes/`, `prototypes/`, `images/` |
| [5 · Performance](research/round-5-performance/) | Tick, load, bundle and memory budgets: JS vs WebAssembly, workers, GC, country scale, startup, assets, caching, CI gates | `notes/compute.md`, `notes/load-memory.md`, `prototypes/compute/`, `prototypes/load/` (draft CI configs in `prototypes/load/ci/`) |
| [6 · Goods and wellbeing](research/round-6-goods-and-wellbeing/) | Resources and production chains, food quality and spoilage, happiness, wealth, their cost, and Norland as prior art | `summary.md`, `report.md`, `questions.md`, `notes/`, `prototypes/` |
| [7 · Million agents](research/round-7-million-agents/) | Paused: compute, memory and rendering for up to 1 million agents; prototypes and results only, no notes yet | `questions.md`, `prototypes/` |
| [8 · Cultures](research/round-8-cultures/) | Fictional, learned cultures: how customs pass on and mix, customs as preferences, prior art and ethics, and the guardrails that keep culture out of crime and wealth | `summary.md`, `report.md`, `questions.md`, `notes/`, `prototypes/` |
| [9 · Maps and world builder](research/round-9-maps-and-world-builder/) | How each map layer is made, the world builder's scope, edits on a seeded world, and the browser editor | `summary.md`, `report.md`, `questions.md`, `notes/`, `prototypes/` |

What each file type holds:

- **`summary.md`**: the round's tab from the shared doc, which is the short, edited version.
- **`report.md`**: the full fact-checked report behind that tab.
- **`notes/`**: the raw research notes. Each claim is labelled by how it was checked: "opened" means the source was read in full; "search summary" or "snippet only" means it was seen only in search results; "measured here" or "computed" means the research team produced it.
- **`prototypes/`**: benchmark and analysis code from the research. It is not product code. Some scripts read datasets or cloned repositories that are not included; the notes name the sources. Timings come from a 4-vCPU cloud VM (rounds 2–5) or a Windows desktop (rounds 6–9), mostly under Node, and are not phone measurements.

## Mockups

[`mockups/`](mockups/) holds concept images and previews:
- `town_closeup.png`, `town_closeup_blobs.png` and `city_zoomed_out.png`;
- `country_map.png` and `scale_ladder.png`;
- `cc0_asset_previews.png`;
- `sprites_showcase.png`, `wonders_showcase.png` and `landmarks_showcase.png`, built from the original sprites by `tools/sprites/`;
- `random_world_*.png` and `blob_looks.png`, one generated world drawn by `tools/worldgen/`;
- `generator/`, the Python (Pillow) scripts that drew the concept images;
- `previews/`, unmodified CC0 images with their licences;
- [`SOURCES.md`](mockups/SOURCES.md), the provenance of every tile and sprite.
