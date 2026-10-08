# M1.6 Dev and release

Part of [M1 Lab mode](../milestone.md).

The owner asked on 8 October 2026 for CI/CD in GitHub Actions with two environments, dev and release, once M1 is done. CI already runs from M0.1; this sub-milestone adds the deploys. The plan doc does not list it yet, so its items carry the owner's date instead of a tag.

- **Builds:**
  - dev: every push to `main` that passes CI deploys that build to the dev URL and runs a smoke test there (owner, 8 October 2026);
  - release: a version such as `v0.1.0`, run by hand from the Actions page, promotes the newest build that passed both CI and the perf gates to the release URL, smoke-tests it, then tags it and publishes a GitHub Release with notes and the zipped build. Running an earlier version redeploys it as a rollback (owner, 8 October 2026);
  - each deploy's version and commit in `version.json`, shown in the HUD, with the bundle itself the same in dev and release (owner, 8 October 2026);
  - release notes built from the Conventional Commit headers since the last release (owner, 8 October 2026);
  - lab mode shipped publicly once the exit checks pass, as the first release (R1).
- **Needs:** M1.5's IP gate, dev environment and manual dev deploy; M0.5's web build, `_headers` and first-frame mark; M0.6's gates in `ci.yml` and `perf.yml`.
- **Owner decision first:** whether lab mode still goes public when M1 closes, as round 1 planned, now that launch waits for M8 (R9), which decides whether `v0.1.0` is announced.
- **Exit checks:**
  - actionlint passes on every workflow, and a workflow test shows that the dev deploy needs every CI job and that a release needs passing CI and perf runs for its commit (owner, 8 October 2026);
  - after a push to `main`, the smoke test passes on the dev URL: COOP and COEP with the page cross-origin isolated, immutable caching on hashed assets, the map served compressed, a first frame, the pushed commit in `version.json`, and `noindex` on every response (owner, 8 October 2026);
  - a rehearsal release, `v0.1.0-rc.1`, serves the dev build's exact asset files, passes the smoke test without `noindex`, and publishes a pre-release with notes and the zipped build; rerunning an earlier rehearsal version brings that version back (owner, 8 October 2026);
  - the notes tool groups breaking changes, features, fixes and speed-ups from a fixture log, skips every other type, and prints no author or email (owner, 8 October 2026).
