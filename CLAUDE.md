# Nomos: notes for Claude

## Commits

- Break work into small commits, one logical change each. Never bundle unrelated changes.
- Give each commit its own short message: a subject of 50 characters or fewer, imperative mood ("Add …", "Fix …"). Add one or two short body lines only when the subject is not enough.
- Credit the owner on every commit:
  `Co-Authored-By: rddolor27 <80044625+rddolor27@users.noreply.github.com>`
  This is the owner's GitHub no-reply address. The repo is public, so never put a personal email in a commit.

## Layout

- `docs/` holds research, plans and mockups. Product code goes in `apps/`, `packages/` and `tools/`, as milestone M0 in `docs/plan/implementation-plan.md` lays out.
- Code under `docs/research/*/prototypes/` is throwaway research code. Never import it.
