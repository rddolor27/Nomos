# Checkpoints

A checkpoint records where Nomos stands, so any agent or person can pick up the work without the conversation that produced it. The file with the highest number is the current state.

## When to write one

- When a sub-milestone closes, after its exit checks pass.
- Before stopping partway, for example when usage runs out, so the next agent can resume mid-task.
- After an owner decision that changes the plan.

## How to resume from one

1. Open the highest-numbered file here.
2. Compare its `based_on` commit with `git log`: anything after it was done after the checkpoint and is not described in it.
3. Read the plan file that `next` names, and start there. Anything listed in `waiting_on` must be settled first.

## Format

Name each file `NNNN-short-slug.md`, numbered from 0001. Never edit a committed checkpoint; write a new one instead.

Every checkpoint starts with this front matter:

```yaml
---
checkpoint: 2                  # matches the file number
date: 2026-10-08               # UTC
milestone: M0.1                # the sub-milestone it closes or pauses, or "planning"
status: done                   # done, paused or blocked
based_on: f64d5a8              # the last commit before this checkpoint
next: M0.2 State and money (docs/plan/tasks/<plan file>.md)
waiting_on: []                 # owner decisions or reviews that block next
---
```

Then these sections, in this order:

1. **State:** two or three sentences on where the project stands.
2. **Done since the last checkpoint:** what landed, with commit ranges and the command that proves it.
3. **Decisions:** owner decisions and the agent's own rulings, each with its reason.
4. **Open:** owner decisions still pending, known gaps and deferred findings.
5. **Next:** the exact next task and its plan file. For a paused task, give the step reached and any uncommitted state.
6. **How to verify:** commands that should pass right now.

## Rules

- Write facts only. Every claim must be checkable in git or by running a command.
- The repo is public, so never write secrets, personal email addresses or private configuration into a checkpoint.
- When a sub-milestone closes, also fill in its Started, Done and Actual cells in its milestone file under `docs/plan/tasks/`.
- Commit each checkpoint on its own, with the header `docs(plan): add checkpoint NNNN`.

## Conventions for agents

- **Git:** commit straight to `main`, with no branches or pull requests. Use Conventional Commits headers only, at most 72 characters, with no body and no co-author. Author and committer are the owner's no-reply address: `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`. Push only when the owner asks.
- **Where things go:** plans in `docs/plan/`, task plans and milestone breakdowns in `docs/plan/tasks/`, checkpoints here, product code in `apps/`, `packages/` and `tools/`.
- **Source of truth:** the shared plan doc is the live plan, and `docs/plan/implementation-plan.md` is its export. Its milestone sections carry the rules each task must follow, such as determinism, budgets and content rules.
- **Art and sound rules:** `tools/sprites/README.md` and `tools/sounds/README.md`.
- **Plan tools:** after editing a milestone breakdown, run `python tools/plan/check_coverage.py` to catch dropped plan items, and `python tools/plan/roadmap.py` to rebuild the roadmap. The roadmap is generated; never edit it by hand.
