# Checkpoints

A checkpoint records where Nomos stands, so the next session can resume without the conversation behind it. This folder keeps only the current one; older ones are in git history.

## When to write one

- Before stopping, whether the work is done or paused, for example when usage runs out.
- After an owner decision that changes the plan.

## Format

Name it `NNNN-short-slug.md`, numbered on from the last, and keep each section to a few lines. Commit it alone as `docs(plan): add checkpoint NNNN`, removing the previous checkpoint in the same commit. Never edit a committed checkpoint; write a new one.

```yaml
---
checkpoint: 35                 # matches the file number
date: 2026-10-10               # UTC
milestone: M2.3                # the sub-milestone it closes or pauses, or "planning"
status: paused                 # done, paused or blocked
based_on: 6736fb6              # the last commit before this checkpoint
next: the next task, with its plan file
waiting_on: []                 # owner decisions or reviews that block next
---
```

Then four short sections:
1. **State:** two or three sentences.
2. **Decisions:** owner decisions and rulings since the last checkpoint, one line each; `docs/plan/HANDOFF.md` keeps the details.
3. **Open:** what is pending or known to be broken.
4. **Next:** the exact next task and its plan file; for paused work, the step reached and any uncommitted state.

## Rules

- Write facts only, each checkable in git or by running a command.
- The repo is public: no secrets, personal email addresses or private configuration.
- To resume, compare `based_on` with `git log`: later commits aren't described in the checkpoint.
