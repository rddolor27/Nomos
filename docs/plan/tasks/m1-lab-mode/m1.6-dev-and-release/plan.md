# M1.6 Dev and release: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

CI exists before this: M0.1 starts `ci.yml`, M0.5 and M0.6 add its gates and `perf.yml`, and M1.5 adds the IP gate and a manual dev deploy. M1.6 adds the CD half the owner asked for on 8 October 2026, which the [CI/CD plan](../../../cicd.md) describes: dev on every push, and releases on demand.

## Approach

- **Two environments, one build.**
  - **Dev** shows the newest `main` that passed CI, and updates on every push.
  - **Release** shows a numbered version, promoted from dev when the owner chooses.
  - A release ships the exact build artifact that dev already ran, so what the owner checked on dev is what goes out. Dev is the staging step; there is no third environment.
- **The version lives outside the bundle.** Each deploy writes `version.json`, and the HUD reads it after the page is interactive. The hashed bundle is therefore identical in dev and release, and nothing joins the critical path. A local build has no file and shows "local".
- **Dev, in `ci.yml`:**
  - a `web` job builds `apps/web/dist` once and uploads it as the `web` artifact, and the size and startup gates check that same build;
  - M1.5's `deploy-dev` job now runs on every push to `main`, after every other job passes. It writes `version.json` as `dev` with the commit, deploys to the host's `dev` alias, then runs the smoke test there;
  - `concurrency: deploy-dev` with cancel-in-progress, so the newest push wins.
- **Release, in `release.yml`, run by hand from the Actions page** with one input, the version:
  - **a new version** picks the newest `main` commit whose `ci.yml` and `perf.yml` runs both passed, and downloads that run's `web` artifact. It writes `version.json`, deploys to production and runs the smoke test. Only then does it create the tag and a GitHub Release with the notes and the zipped build;
  - **an existing version is a rollback:** it downloads that release's zip, redeploys it and smoke-tests it, with no new tag;
  - **only people with write access can run it,** so the owner is the gate. Claude runs it with `gh workflow run` only when the owner asks, like a push.
- **The smoke test checks the live site.** `apps/web/test/smoke.spec.ts` runs in Chromium against `SMOKE_URL`, and is skipped when that is unset. It checks that:
  - `/` answers 200 with COOP and COEP, and the page is `crossOriginIsolated`;
  - a hashed `/assets/*.js` carries `Cache-Control: public, max-age=31536000, immutable`;
  - the binary map arrives with its compressible type and a `content-encoding`. This answers M1.5's open measurement on every deploy;
  - the first frame draws, by M0.5's `frame:first` mark, with no console error;
  - `/version.json` names the expected version and commit, and the HUD shows it;
  - dev sends `X-Robots-Tag: noindex`, and release does not.
- **Release notes come from the commit headers.** GitHub's generated notes list merged pull requests ([GitHub docs](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes), fetched summary), and Nomos has none. `tools/release/notes.ts` reads the log since the previous tag and groups headers: breaking (`!`), added (`feat`), fixed (`fix`) and faster (`perf`). It skips other types and prints no author or email.
- **Versions are SemVer tags.** Before launch they are `v0.x`: a minor version for each milestone that ships, and a patch for fixes. The launch after M8 is `v1.0.0`, and `-rc.N` marks a rehearsal, published as a pre-release.
- **The host is M1.5's choice; Cloudflare Pages is suggested.**
  - **Cloudflare:** `cloudflare/wrangler-action@v4` runs `pages deploy apps/web/dist --project-name=<name> --branch=<dev or main>` ([CI guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), fetched summary). Its token needs Account › Cloudflare Pages › Edit (same page), and the job needs `permissions: deployments: write` ([action README](https://github.com/cloudflare/wrangler-action), fetched summary).
  - A branch other than production becomes a preview at `<branch>.<project>.pages.dev`, and every preview sends `X-Robots-Tag: noindex` by default ([preview docs](https://developers.cloudflare.com/pages/configuration/preview-deployments/), fetched summary). So dev gets `noindex` from the host.
  - **Netlify:** `netlify deploy --dir=apps/web/dist --alias=dev` gives `dev--<site>.netlify.app`, and `--prod` publishes ([CLI docs](https://docs.netlify.com/cli/get-started/), fetched summary). Netlify's `noindex` on such drafts is not confirmed, so the dev job would add the header to `_headers` itself.
- **GitHub environments `dev` and `release` hold the host secrets,** each limited to `main`. Free accounts get environments only on public repositories, which Nomos is ([environments docs](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment), fetched summary). Neither needs a reviewer, since only the owner can start a release.
- **Rollback:** rerun the release with the earlier version. Cloudflare's dashboard can also roll production back to an earlier production deploy ([rollback docs](https://developers.cloudflare.com/pages/configuration/rollbacks/), fetched summary), but that page does not mention direct uploads.
- **Least privilege:** workflows default to `contents: read`. Only the release job gets `contents: write` for the tag and release, `actions: read` to find runs and artifacts, and `deployments: write`. Third-party actions are pinned by commit SHA.

## Owner setup

Claude cannot open accounts or change repository settings, since the scope guard denies remote config changes. The owner does these once, in about 15 minutes (unsourced estimate):

1. M1.5 has already created the host project and the `dev` environment, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. In GitHub, Settings › Environments › New environment: `release`, with deployment branches set to `main` only and the same two secrets.
3. The host project's production branch is `main`. A direct-upload Cloudflare project sets it through the API, not the dashboard ([branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), fetched summary); the step plan gives the exact call.

## Packages and files

- `.github/workflows/ci.yml`: the `web` artifact job, and `deploy-dev` on every push with the smoke test.
- `.github/workflows/release.yml`, new.
- `apps/web`:
  - `test/smoke.spec.ts`, new;
  - a version line in the HUD, filled from `/version.json` once the page is interactive;
  - `public/_headers`: `Cache-Control: no-cache` on `/version.json`.
- `tools/release/`, new: `notes.ts` and its test, and the workflow test.
- `README.md`: a short "Dev and release" section with both URLs, and how to release and roll back. It goes in its own docs commit.

## Interfaces and data

- **`version.json`:** `{ "version": "dev" | "v0.1.0", "commit": "<40-hex sha>" }`. It has no time stamp, so redeploying a version writes the same file.
- **Notes:** `notes(log: { sha: string; header: string }[]): string`, Markdown with up to four sections in a fixed order. The CLI reads `git log --format=%H%x09%s <range>`.
- **Release asset:** `nomos-web-<version>.zip`, the built `dist` without `version.json`. It never expires, so rollbacks use it.
- **Artifact:** `web`, kept 90 days, the public-repo default ([retention docs](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization), fetched summary). A release promotes a recent push, so 90 days is ample (inference).
- **No interface in `interfaces.md` changes.**

## Method and sources

- **Hosting headers:** [R5 load notes](../../../../research/round-5-performance/notes/load-memory.md) §4–5, and M0.5's [`_headers` plan](../../m0-pipeline/m0.5-web-app/plan.md).
- **Host and GitHub facts:** the inline links above, checked on 8 October 2026 through a fetch tool that returns summaries, not full pages. They are labelled "fetched summary", and the step plan rechecks each flag it uses against the docs.

## Tests for the exit checks

- **actionlint** runs over `.github/workflows/` in CI.
- **`workflows.test.ts`** parses the YAML with the `yaml` package (ISC) and checks that:
  - `deploy-dev` needs every other `ci.yml` job and runs only on a push to `main`;
  - the release's pick step requires passing `ci.yml` and `perf.yml` runs for one commit;
  - no job but the release job has a write permission.
- **`notes.test.ts`:** a fixture log of `feat`, `fix`, `perf`, `feat!`, `docs` and `chore` commits gives the four sections in order, skips `docs` and `chore`, and contains no `@`.
- **The smoke test** runs on dev after every push, and on release in every release run.
- **Rehearsal:**
  - run `v0.1.0-rc.1`: production serves the same asset names and SHA-256s as the dev deploy of that commit, the smoke test passes, and a pre-release with notes and the zip appears;
  - push again and run `v0.1.0-rc.2`, then rerun `v0.1.0-rc.1`: `/version.json` reads `v0.1.0-rc.1` again.

## Risks and unknowns

- **Not confirmed:**
  - that a Cloudflare direct upload whose `--branch` is the production branch becomes the production deploy. The rehearsal settles it;
  - that the dashboard rollback covers direct uploads. The workflow rollback does not need it;
  - whether the Free plan's 500 builds a month count direct uploads ([limits](https://developers.cloudflare.com/pages/platform/limits/), fetched summary). At one dev deploy per push, Nomos stays far below it (inference).
- **Free-plan limits:** 20,000 files per site, 25 MiB per file and 100 `_headers` rules (same page). The web build holds tens of files (inference).
- **Every push runs CI and redeploys dev,** docs-only pushes included. That is harmless, and it keeps one rule: every pushed `main` has a CI run, so it can be released.
- **A flaky perf run blocks a release, never dev.** Rerun it; never skip it.
- **No personal email leaves the repo:** the workflow tags and publishes as `github-actions[bot]`, and the notes carry no authors.

## Open questions

- **Owner:** does lab mode go public when M1 closes, or wait for M8's launch? It decides whether `v0.1.0` is announced. Suggested: release `v0.1.0` unannounced, keep playtests on dev, and announce nothing until M8. Needed before: the step plan.
- **Owner:** may the public lab ship without offline play? M6.2 builds the service worker. Suggested: yes; lab mode needs no offline play, and M6.2 adds it before launch. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the notes tool and its test, then `version.json` and the HUD line, then the `web` artifact, `deploy-dev` and the smoke test. `release.yml` and the rehearsal come next, and `v0.1.0` last.
- **Keep it simple:** no preview per commit, no staging between dev and release, no automatic rollback and no changelog file in the repo. The pick step is a few lines of `gh run list`; keep it in the workflow unless it grows.
- **Later milestones build on this:**
  - M6.2's service worker names its cache after the deployed version, so each release replaces the last cache;
  - M6.3's links can pin the release version, which its open question on link versions needs;
  - M6.6's launch ships as `v1.0.0`, on a custom domain chosen after the name review.
