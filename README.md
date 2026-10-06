# Nomos

A society simulation that runs entirely in the browser. Thousands of citizens, merchants and police live in a pixel-art town. Any agent can choose crime, money is exact to the cent, and every run replays identically from a share link. The model grows from one town to villages, cities and a generated country. Its core lesson is that the crime record is not the crime: what gets watched shapes what gets recorded.

**Status: planning.** There is no product code yet. The research and the build plan are in [`docs/`](docs/).

## Layout

```
docs/        Research, plans and mockups: everything that is not product code
  plan/      Implementation plan: milestones M0–M9, the performance budget and CI gates
  research/  Five research rounds, each with a summary, full report, raw notes and benchmark prototypes
  mockups/   Concept art and the scripts that drew it

apps/        Planned for M0: the web app
packages/    Planned for M0: sim-core, sim-protocol, sim-worker, render-gl
tools/       Planned for M0: cli, bench
```

Product code goes in `apps/`, `packages/` and `tools/`, as milestone M0 lays out: a pnpm monorepo whose `sim-core` is pure TypeScript with no DOM. Code under `docs/research/*/prototypes/` is throwaway benchmark code from the research rounds. Do not import it.

## Commits

Work on a branch named `type/short-description` and merge it through a squash-merged pull request. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): a `type(scope): description` header of at most 72 characters, with types `feat`, `fix`, `chore`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci` and `revert`. Run `git config core.hooksPath .githooks` once per clone so the `commit-msg` hook checks the header.

## Where to start

1. [Implementation plan](docs/plan/implementation-plan.md): what to build, in order, and the checks that close each milestone.
2. [Findings and plan](docs/research/round-1-baseline/findings-and-plan.md): the original research and architecture.
3. [Docs index](docs/README.md): every research round and what each file holds.

## Names

During research the project was called "Dot Society" (codename) and "Civilization Simulation" (working title). The research files keep those names.

## Licences

No licence has been chosen for this repository yet; the plan assumes MIT for code. The concept art in `docs/mockups/` is original, with two exceptions:
- the town mockups use CC0 tiles from the Ninja Adventure pack;
- `docs/mockups/previews/` holds unmodified CC0 images, each with its licence file.

Provenance is recorded in [`docs/mockups/SOURCES.md`](docs/mockups/SOURCES.md).
