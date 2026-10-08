# Nomos

A society simulation that runs entirely in the browser. Blob-shaped people work, trade, eat, celebrate and sometimes steal across a randomly generated country, and you can zoom from the whole map down to a single street. Money is exact to the cent, and every run replays identically from its seed. The core lesson: the crime record is not the crime, because what gets watched shapes what gets recorded.

<p>
  <img src="docs/mockups/random_world_country.png" width="49%" alt="A generated archipelago country with forests, a desert island, towns, roads and wonder icons">
  <img src="docs/mockups/random_world_capital.png" width="49%" alt="The same world's coastal capital: a plaza with a fountain and clock tower, houses, docks and blob people">
</p>

*One random world, seed `09f02ffe`: the country map and its capital up close. Both were drawn by `tools/worldgen` from the original sprites; the game itself is not built yet.*

**Status: planning done, building not started.** There is no game code yet. What exists today:
- nine research rounds, in [`docs/research/`](docs/research/);
- a ten-milestone build plan split into 67 sub-milestones, each with its tasks and the checks that close it, in [`docs/plan/`](docs/plan/); the first milestone's six have step-by-step plans;
- an original pixel-art sprite set of 1,342 sprites in 13 sheets, drawn as code, in [`tools/sprites/`](tools/sprites/), with seasons and snow;
- 94 original chiptune sounds in 7 banks, written as data for the game's own synth, in [`tools/sounds/`](tools/sounds/);
- a random world generator that previews worlds with that art, in [`tools/worldgen/`](tools/worldgen/).

## What it will be

- **Watch, never control.** You set up a world and its policies, press play and watch: pause, speed up, skip ahead a season or a year, follow and inspect people. Trying a different policy starts a new branch.
- **Seasons and years.** A year is four 28-day seasons. Crops are planted in spring and harvested in autumn, snow falls in winter, and people age a year at a time.
- **A new world every game.** Each game generates a country from a seed: coasts, mountains, rivers, climate, towns, roads, natural wonders and landmarks. The same seed always rebuilds the same world, so worlds can be shared.
- **Zoom from country to street.** Every settlement runs as an exact ledger. Zoom in and its people appear, spawned from the ledger; zoom out and they fold back into it.
- **An exact economy.** Money is stored in whole cents and always balances. Goods move through production chains, food spoils, and wellbeing and wealth respond to both.
- **Crime and policing.** Anyone can choose crime. The sim keeps true crime apart from recorded crime, so you can watch where police look shape the record. Crime is an act, never a costume: nobody looks like a criminal.
- **A town gazette.** Every town prints a daily paper written only from its records, so a crime nobody records never makes the news.
- **Soldiers on the roads.** Soldiers defend the country and patrol the roads between towns, but never police the towns themselves. They carry a sheathed sword or a shouldered spear, never a gun.
- **Fictional cultures.** Learned customs (foods, festivals, music, naming and home region) shape what people prefer, never their ability, honesty, work or crime.
- **One body, 96 looks.** Everyone shares one blob body with a random hue, eye shape and pattern. Looks are never inherited, and no rule reads them.
- **Lab mode.** Primer-style experiment cards: lock in a prediction, run paired seeds and see whether it held.
- **Three skins, one renderer.** Coloured dots, blobs or a GBA-era pixel-art town, switchable at any time.
- **Chiptune sound.** Original effects, ambience and music, written as data and played by the game's own synth. Sound follows the sim and never feeds it.
- **Browser only.** A TypeScript sim in a Web Worker and a custom WebGL2 renderer, with no backend. The plan's budgets cover 10,000 people on any phone, 25,000 on a capable phone and 100,000 on a desktop.

<p>
  <img src="docs/mockups/wonders_showcase.png" width="49%" alt="Natural wonders: a glacier, caldera lake, waterfall, giant tree, geyser, sea arch and canyon">
  <img src="docs/mockups/blob_looks.png" width="49%" alt="48 blob people in six hues with different eye shapes and patterns">
</p>

*Natural wonders, and the first 48 people of a world, each with a random look.*

<p>
  <img src="docs/mockups/seasons_showcase.png" alt="The same capital in four panels: fresh spring green, deep summer green, olive autumn ground with gold trees, and winter snow on the ground, roofs and bare trees">
</p>

*The capital through one year, from a single season map: palette swaps, bare trees in winter and snow on the ground and roofs.*

## The plan

The build runs in ten milestones. Each one closes when its exit checks pass in CI, not when the demo looks right. Launch comes after M8.

| Milestone | Delivers |
| --- | --- |
| M0 Pipeline | A deterministic core, the sim worker and one renderer, drawing people as dots |
| M1 Lab mode | Primer-style experiment cards drawn as blobs, with claims judged on paired seeds |
| M2 Economy | A calibrated economy of households and firms, with goods, food and wealth |
| M3 City life | Daily routines in a generated town, drawn as the pixel-art town |
| M4 Crime and police | Crime as an act anyone can choose, with true crime kept apart from recorded crime |
| M5 Society and policy | The social layer, and policies set before a run |
| M6 Scale and sharing | 100,000 people on desktop, and share links that replay in any browser |
| M7 Country of ledgers | Every settlement in a country advancing daily as an exact ledger |
| M8 Country map | Country mode, with a generated map and region views |
| M9 Zoom across scales | Zooming from a region down to a street, after launch |

The [roadmap](docs/plan/tasks/README.md) splits each milestone into sub-milestones. Each has a task file, saying what to build and the checks that close it, and a plan saying how. [Checkpoints](docs/plan/checkpoints/) record where the work stands.

The planned stack is Node 24, pnpm workspaces, strict TypeScript, Vitest, ESLint, Playwright on Chromium, Firefox and WebKit, Vite and GitHub Actions.

## Try the tools

You need Python 3.10 or newer, with Pillow and NumPy.

- `python tools/worldgen/generate.py` makes a new random world on every run and prints its seed. Add `--seed <hex>` to rebuild one. Output goes to `dist/worldgen/<seed>/`:
  - the country and region maps;
  - the capital, a town and a village up close;
  - every natural wonder's view;
  - a line-up of the world's first 48 people.
- `python tools/sprites/build_all.py` rebuilds every sprite sheet and `assets/LICENSES.md`.
- `python tools/sprites/test_sprites.py` checks every sheet against the art rules.
- `python tools/sounds/build_all.py` rebuilds every sound bank and `assets/LICENSES.md`, with WAV previews in `dist/sounds/`.
- `python tools/sounds/test_sounds.py` checks every bank against the sound rules.

## Layout

```
docs/              Research, plans and mockups: everything that is not product code
  plan/            The implementation plan, and the plans for sound, soldiers, the calendar and the gazette
    tasks/         The roadmap: a folder per milestone and per sub-milestone, each with its task and plan
    checkpoints/   Hand-off notes: where the work stands and what comes next
  research/        Nine research rounds, each with a summary, report, notes and prototypes (round 7 is paused)
  mockups/         Concept art, sprite showcases and world previews, with their sources
assets/            Sprite sheets, sound banks and manifests; LICENSES.md records every file's provenance
tools/             Python tools today; M0 adds the atlas builder, and cli, bench and names in TypeScript
  sprites/         The pixel-art sprite set, drawn as code
  sounds/          The chiptune sound banks, written as data
  worldgen/        The random world generator, a reference for the sim's own
  plan/            Scripts that build the roadmap and check that it covers the whole plan
apps/web/          Planned for M0: the web app
packages/          Planned for M0: sim-core, sim-protocol, sim-worker, sim-culture and render-gl
```

Code under `docs/research/*/prototypes/` is throwaway benchmark code from the research rounds. Do not import it.

## Where to start

1. [Implementation plan](docs/plan/implementation-plan.md): what to build, in order, and the checks that close each milestone.
2. [Roadmap](docs/plan/tasks/README.md): every sub-milestone in build order, and the owner decisions each one waits for.
3. [Checkpoints](docs/plan/checkpoints/): where the work stands; the highest number is current.
4. [Docs index](docs/README.md): every research round and what each file holds.
5. [Findings and plan](docs/research/round-1-baseline/findings-and-plan.md): the original research and architecture.
6. The [sprite](tools/sprites/README.md), [sound](tools/sounds/README.md) and [world generator](tools/worldgen/README.md) READMEs: the art and sound rules, and how worlds are made.

## Commits

Commits go straight to `main`; there is one maintainer. Messages follow [Conventional Commits](https://www.conventionalcommits.org/): a short `type(scope): description` header of at most 72 characters. The types are `feat`, `fix`, `chore`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci` and `revert`. Run `git config core.hooksPath .githooks` once per clone so the `commit-msg` hook checks the header.

## Names

During research the project was called "Dot Society" (codename) and "Civilization Simulation" (working title). The research files keep those names.

## Licences

No licence has been chosen for this repository yet; the plan assumes MIT for code. The sprites in `assets/sprites/` and the sounds in `assets/sounds/` are original, drawn and composed as code, and [`assets/LICENSES.md`](assets/LICENSES.md) records each file's checksum. The concept art in `docs/mockups/` is original, with two exceptions:
- the town mockups use CC0 tiles from the Ninja Adventure pack;
- `docs/mockups/previews/` holds unmodified CC0 images, each with its licence file.

Provenance is recorded in [`docs/mockups/SOURCES.md`](docs/mockups/SOURCES.md).
