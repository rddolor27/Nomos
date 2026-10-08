---
checkpoint: 9
date: 2026-10-08
milestone: planning
status: done
based_on: 9a1b1d0
next: owner review of the M0 plans, then build M0.1
waiting_on: [owner review of the M0 plans, owner answers to checkpoint 0005's open questions]
---

# Checkpoint 0009: CI/CD in the shared plan doc

## State

The shared plan doc now has a CI/CD tab, and M1 lists the dev and release work with the tag (CI/CD). The repo matches it. There is still no product code.

## Done since checkpoint 0008

- **Shared doc**, edited after the owner said "continue doing this":
  - a new CI/CD tab after Weather: two environments, how a release goes out, rules, what CI checks, work by milestone, and open questions;
  - Implementation plan: two (CI/CD) build items and one exit check in M1, the (CI/CD) tag in "Where items come from", a verify-first row for Cloudflare's production deploy and rollback, and the owner plans at 34.5–55.5 days, putting launch at about 213–327 days.
- **Exports** (4a475de, 6b3c5a7): `implementation-plan.md` synced, with the roadmap drawing restored, and the new `docs/plan/cicd.md`, listed in `docs/README.md`.
- **Roadmap script** (e637c3e): its note on the plan's own total says 213–327 days.
- **Task files** (9a1b1d0): M1.5's and M1.6's items carry (CI/CD), and M1 counts 27 build tasks and 8 exit checks.
- **Local Claude config,** gitignored: the sync skill maps the CI/CD tab to `docs/plan/cicd.md`, and the docs rule and CLAUDE.md list the (CI/CD) tag.

## Decisions

The owner's, on 8 October 2026:
- "continue doing this", taken as the go-ahead to add M1.6 to the shared doc, which checkpoint 0008 asked for.

Agent rulings; the owner can overturn any of them:
- **CI/CD is an owner-plan tab** like Weather, with its own tag, because the owner asked for it directly rather than through a research round.
- **The tab is written for the owner:** environments, steps and rules in plain words. The workflow details stay in the M1.6 brief.

## Open

- **Owner questions, unchanged from checkpoint 0008:** whether lab mode goes public when M1 closes, whether it may ship without offline play, and the host project's name.
- **Unconfirmed host facts:** a Cloudflare direct upload to the production branch, and dashboard rollback for direct uploads. They are in the plan's verify-first table now.
- Everything open in checkpoints 0007 and 0008 stays open.

## Next

1. **Owner review** of the M0 plans and checkpoint 0005's questions, then build M0.1. Nothing here blocks M0.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes. It prints 11 milestones, 331–519 days before launch and 30 owner decisions.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: M1 has 35 plan items and no weak match; the total stays 11 weak matches, 10 in M0 and 1 in M6.
- `python .claude/skills/sync-plan-doc/check_links.py`: the only broken links are in third-party READMEs under round 7's gitignored `node_modules`.
