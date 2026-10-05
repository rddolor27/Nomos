# Nomos: notes for Claude

Nomos is a society simulation that runs entirely in the browser: a TypeScript sim in a Web Worker, a custom WebGL2 renderer, exact money and seeded replays. It is still in planning; start with `docs/plan/implementation-plan.md`.

## Commits

- Break work into small commits, one logical change each. Never bundle unrelated changes.
- Give each commit its own short message: a subject of 50 characters or fewer, imperative mood ("Add …", "Fix …"). Add one or two short body lines only when the subject is not enough.
- Credit the owner on every commit:
  `Co-Authored-By: rddolor27 <80044625+rddolor27@users.noreply.github.com>`
  This is the owner's GitHub no-reply address. The repo is public, so never put a personal email in a commit.

## Layout

- `docs/` holds research, plans and mockups. Product code goes in `apps/`, `packages/` and `tools/`, as milestone M0 in `docs/plan/implementation-plan.md` lays out.
- Code under `docs/research/*/prototypes/` is throwaway research code. Never import it.

## Rules, skills and agents (`.claude/`)

- **Rules:**
  - `sim-core.md`: determinism and zero-allocation rules for `packages/sim-*`.
  - `web.md`: renderer, load order, bundle and accessibility rules for `apps/web` and `packages/render-gl`.
  - `content.md`: IP, asset-licence and art-direction rules, which apply everywhere.
  - `docs.md`: where research goes and how evidence is labelled.
- **Skills:**
  - `/commit`: small commits with the co-author trailer.
  - `/research-round`: run a new research round.
  - `/perf-check`: measure against the performance budgets.
  - `/determinism-review`: review sim changes.
  - `/sync-plan-doc`: export the shared Claude doc into `docs/`.
  - `/mockup`: draw pixel-art concept images.
- **Agents:** `researcher` and `fact-checker`, used by `/research-round`.
