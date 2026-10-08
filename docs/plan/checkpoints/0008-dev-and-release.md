---
checkpoint: 8
date: 2026-10-08
milestone: planning
status: done
based_on: b4d0185
next: owner review of the M0 plans, then build M0.1
waiting_on: [owner review of the M0 plans, owner answers to checkpoint 0005's open questions]
---

# Checkpoint 0008: dev and release pipelines planned as M1.6

## State

The owner asked for CI/CD in GitHub Actions with dev and release environments, once M1 is done. It is now M1.6 Dev and release, the last sub-milestone of M1, with a brief. There is still no product code, and the M0 plans are unchanged.

## Done since checkpoint 0007

- **M1 breakdown** (c2a0fca):
  - new `m1.6-dev-and-release/` with `task.md` and a brief, 2–3 days (unsourced estimate). Dev deploys on every push to `main` that passes CI. A release, run by hand from the Actions page, promotes the newest build that passed CI and the perf gates, then tags and publishes it. Running an earlier version rolls back;
  - M1.5 is renamed "IP gate and playtests" (folder `m1.5-ip-gate-and-playtests/`). It now deploys a playtest build to the dev URL by a manual run, and the public release moved to M1.6;
  - M1 is six sub-milestones and 23.5–38 days; the roadmap gives 331–519 days before launch.
- **Cross-references** (6a36a87): M6.2's service worker names its cache after M1.6's version, and M6.3's suggested link version can be M1.6's release version.
- **README** (b4d0185): 72 sub-milestones.

## Decisions

The owner's, on 8 October 2026:
- CI/CD in GitHub Actions, with a dev and a release environment, after M1.

Agent rulings, recorded in the M1.6 brief; the owner can overturn any of them:
- **M1.6 comes last in M1,** so M1.5 keeps its number. M1.5's playtests need a link before M1.6 exists, so M1.5 keeps a manual dev deploy, and M1.6 automates it.
- **A release ships dev's exact build.** The version and commit live in `version.json`, written at deploy time, so the bundle is identical in both. Dev is the staging step.
- **Releases run by hand from the Actions page,** with no reviewer on the environment, since only the owner can start one. Claude starts one only when the owner asks.
- **Versions are SemVer tags:** `v0.x` before launch, a minor version per shipped milestone, `v1.0.0` at launch, and `-rc.N` for rehearsals.
- **Release notes come from the commit headers,** by a small `tools/release/notes.ts`, because GitHub's generated notes list pull requests and Nomos has none.
- **Cloudflare Pages stays the suggested host,** and it sends `noindex` on every preview, so the dev alias is not indexed.

## Open

- **The shared plan doc** does not yet list M1.6. Adding a "CI/CD" tab and an M1 item, then re-exporting, needs the owner's go-ahead. Until then, M1.6's items carry "(owner, 8 October 2026)" instead of a tag.
- **Moved from M1.5 to M1.6:** whether lab mode goes public when M1 closes (now M1.6's row in the roadmap's owner-decisions table, still 30 rows), and whether it may ship without offline play.
- **New owner question in M1.5:** the host project's name, which sets the `*.pages.dev` address. Suggested: a neutral name now, and a custom domain at launch after M6.6's name review.
- **Unconfirmed host facts,** listed in the M1.6 brief: that a direct upload to the production branch becomes the production deploy, that dashboard rollback covers direct uploads, and whether direct uploads count against 500 builds a month. A fetch tool summarised the docs, so the step plan rechecks every flag.
- Everything open in checkpoint 0007 stays open.

## Next

1. **Owner review** of the M0 plans and checkpoint 0005's questions, then build M0.1. Nothing here blocks M0.
2. Ask the owner whether to add M1.6 to the shared plan doc.

## How to verify

- `python tools/plan/roadmap.py`, then `git diff`: no changes. It prints 11 milestones, 331–519 days before launch and 30 owner decisions.
- On Windows, `PYTHONIOENCODING=utf-8 python tools/plan/check_coverage.py`: 11 weak matches, 10 in M0 and 1 in M6, and none in M1.
- Every relative link in `docs/plan/tasks/` resolves (157 files at this checkpoint).
