# CI/CD

Oct 8, 2026 · @Rd

Nomos ships through two environments in GitHub Actions: dev, which updates on every push to `main` that passes CI, and release, a numbered version promoted from dev by hand. The owner asked for it on 8 October 2026, built once M1 is done, so it is M1.6, the last part of M1. The tasks are in Implementation plan, tagged (CI/CD).

## Two environments

Both serve the same files: a release ships the exact build that dev already ran.

| What | Dev | Release |
| --- | --- | --- |
| Shows | The newest `main` that passed CI | A numbered version, such as `v0.1.0` |
| Updates | On every push to `main` | When the owner runs a release |
| Address | The host's `dev` alias, such as `dev.<project>.pages.dev` | The main address, and a custom domain at launch |
| Search engines | Kept out: every Cloudflare preview sends `noindex` | Allowed |
| Before it goes live | Every CI gate passes | CI and the perf gates both passed on that build |
| After it goes live | A smoke test on the live site | The same smoke test, then a tag and release notes |

## How a release goes out

A release takes one click on the Actions page, and it goes live only after its checks pass.

1. The owner checks the build on dev.
2. The owner runs Release from the repository's Actions page with a version, such as `v0.1.0`, or asks Claude to start it.
3. It picks the newest `main` build that passed both CI and the perf gates: the build dev is showing.
4. It deploys those exact files and writes the version and commit into `version.json`, which the HUD shows.
5. A smoke test checks the live site: isolation headers, caching, the map's compression, a first frame and the version.
6. Only then does it tag the version and publish a GitHub Release, with notes from the commit headers and the zipped build.

To roll back, run Release again with an earlier version: it redeploys that version's zipped build.

## Rules

What the owner checked on dev is what goes out, and nothing skips a check.

- **One build.** A release ships the exact files dev ran, so dev is the staging step and there is no third environment.
- **No check is skipped.** A flaky perf run is rerun, never bypassed.
- **Only the owner releases.** Only people with write access can run it, and Claude starts it only when asked.
- **No personal email.** The workflow tags and publishes as the GitHub Actions bot, and the notes list no authors.
- **Static files only,** on Cloudflare Pages (suggested) or Netlify, as M1.5 decides. Nomos has no backend.
- **Versions:** `v0.x` before launch, a minor version for each milestone shipped, `v1.0.0` at launch after M8, and `-rc.N` for rehearsals.

## What CI checks

CI exists before M1.6: M0.1 to M0.6 and M1.5 build it, and M1.6 adds only the deploys. By the end of M1, every push to `main` runs the kernel vectors, lint, types, tests, the licence check, size limits, the ledger and culture-wall checks, the name lint and the IP gate. A separate perf run times the tick, allocation and startup budgets.

## Work by milestone

M1.6 takes about 2–3 days (unsourced estimate), and later milestones build on its version.

| Part | Work | Days |
| --- | --- | --- |
| M1.5 IP gate and playtests | A manual deploy of `main` to dev, so playtesters have a link | Within M1.5 |
| M1.6 Dev and release | Dev on every push, the release workflow, `version.json`, the smoke test, notes, a rehearsal, then `v0.1.0` | 2–3 |
| M6.2 100,000 agents | The service worker's cache named after the version, so a release replaces it | Within M6.2 |
| M6.3 Worlds, saves and links | Links that can pin the release version | Within M6.3 |
| M6.6 Launch kit | Launch as `v1.0.0` on a custom domain | Within M6.6 |

## Open

Three owner questions and one fact remain before M1.6's step plan.

- **Owner:** does lab mode go public when M1 closes, or wait for launch after M8? Suggested: release `v0.1.0` unannounced.
- **Owner:** may the public lab ship without offline play? Suggested: yes, since M6.2 adds it before launch.
- **Owner:** what is the host project called? Its name sets the web address. Suggested: a neutral name now, and a custom domain after M6.6's name review.
- **Verify:** whether a Cloudflare direct upload to the production branch goes live as production, and whether dashboard rollback covers direct uploads. A rehearsal release settles the first.
