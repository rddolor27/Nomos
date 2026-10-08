# M1.5 Public lab: implementation brief

> **Status:** brief. Before building, expand it into a step-by-step plan with the writing-plans skill, in this file, against the code as it then stands.

**Task:** [task.md](task.md)

## Approach

- **The IP gate is a CI job plus a short manual checklist.**
  - **Automated:**
    - M0.6's name lint passes over every file name, package name, code identifier, page title and card string;
    - every file under `assets/` and in the web build's `dist/` has a row in `assets/LICENSES.md`, with a matching SHA-256 and an "original" or CC0 licence;
    - no paid pack sits in the tree.
  - **Manual:**
    - the owner reviews the shipped sprites and sounds once more against the content rules;
    - the repository licence is chosen. `assets/LICENSES.md` says the assets "share the repository's licence once one is chosen (none yet; the plan assumes MIT for code)", so publishing waits for that choice.
- **Sprite previews never ship.** They are gitignored review images, so they need no licence rows. The gate fails if any appears in `dist/`.
- **Playtests are run by people, with no telemetry.**
  - **Recognition test:**
    - about 10 novices see each role and each M1 glyph at 2× and 3×, in random order, and pick its meaning from a short list;
    - a pass is at least 8 of about 10 per item;
    - the test page is a static route in `apps/web`, behind a query flag, so the exact shipped art is tested.
  - **Panels:** colour-blind players and a demographically diverse panel play the lab cards and note readability and fairness issues.
  - **Results:** the facilitator records them in `docs/playtests/m1-lab.md`, with the date, the build commit, each item's score and each issue's resolution. No personal data is kept.
- **Shipping:**
  - static files on Cloudflare Pages or Netlify;
  - `Cache-Control: public, max-age=31536000, immutable` on hashed `/assets/*` through `_headers`;
  - COOP and COEP headers;
  - no service worker yet, since M6.2 builds it, not M0.5.

  Deploy only from `main`, after the M1 exit checks pass.

## Packages and files

- `tools/ip-gate.py`, new: it checks licence rows and hashes against `assets/` and `dist/`, using `tools/licenses.py`'s table, and fails on any missing, extra or mismatched row.
- `.github/workflows/ci.yml`: an `ip-gate` job after the web build.
- `apps/web`:
  - `src/playtest/recognition.ts`: the recognition page, which loads only when the `?playtest=recognition` flag is set;
  - `public/_headers`: the hosting headers.
- `docs/playtests/m1-lab.md`: the playtest record. Add the folder to `docs/README.md`.
- `.github/workflows/deploy.yml`: deploy on a tag or a manual run from `main`. Pushes and deploys still wait for the owner.

## Interfaces and data

- **The gate's input** is the `assets/LICENSES.md` table: file, author, source, licence, SHA-256 and edits. Its output is one line per problem and a non-zero exit on any.
- **Recognition items** are a list of `{ id, art: frameName, scale: 2 | 3, choices: string[], answer: string }`.
  - The frame names come from the sprite manifests.
  - Every choice string passes the name and text lints.

## Method and sources

- **IP gate:** the [R3 summary](../../../../research/round-3-2d-look/summary.md), legal section: names and marks, copied assets and mimicked logos are the risks; the look itself is low risk. Notes: [R3 legal notes](../../../../research/round-3-2d-look/notes/legal-ip.md). This is not legal advice.
- **Recognition threshold and panels:** [R3 art direction](../../../../research/round-3-2d-look/notes/art-direction.md), parts 5 and 6, and the [R2 summary](../../../../research/round-2-follow-up/summary.md), presentation and ethics.
- **Hosting headers and the service worker:** [R5 load notes](../../../../research/round-5-performance/notes/load-memory.md), and the Performance budget section of the [implementation plan](../../../implementation-plan.md#performance-budget).

## Tests for the exit checks

- **`ip-gate` fails on:**
  - a planted unlisted PNG in `assets/`;
  - a changed byte in a listed file, through its hash;
  - a planted preview in `dist/`;
  - a planted "poké" in a card string.

  It passes on the clean tree.
- `recognition page shows every item`: Playwright opens the flagged page and finds every role and every M1 glyph at both scales, each with its choices.
- **Recognition result:** each item scores at least 8 of about 10 in `docs/playtests/m1-lab.md`. This check is manual and recorded, not automated.
- **Panel result:** the record lists every readability and fairness issue the panels raised, each resolved or explicitly accepted by the owner.

## Risks and unknowns

- **Owner decision first:** whether lab mode still goes public when M1 closes, as round 1 planned, now that launch waits for M8 (R9).
- **Owner decision first:** the repository licence. It must be chosen before anything is public.
- **Playtests need people.** Recruiting about 10 novices, colour-blind players and a diverse panel is the slowest step, so start recruiting while M1.3 is built.
- **A failed glyph means redrawn art,** which loops back to M1.3. Budget one revision.

## Open questions

- **Owner:** does lab mode go public when M1 closes, or wait for M8's launch? It decides whether M1.5 ships a public site or only a playtest build. Suggested: deploy to an unlisted URL for the playtests, and announce nothing until M8. Needed before: the step plan.
- **Owner:** which licence covers the code and the original assets? `assets/LICENSES.md` waits on it, and nothing goes public without it. Suggested: MIT for both, as the plan assumes for code. Needed before: launch.
- **Owner:** Cloudflare Pages or Netlify? The deploy workflow, its secret and the header checks depend on the host. Suggested: Cloudflare Pages, whose header, caching and compression docs R5 opened; it could not confirm Netlify's compression ([R5 load notes](../../../../research/round-5-performance/notes/load-memory.md), §5). Needed before: the step plan.
- **Owner:** who takes the playtests, and how many? R3 sets 8 of about 10 novices but no panel sizes, and recruiting is the slowest step. Suggested: exactly 10 novices, about 3 colour-blind players and 5–8 panellists, all adults and unnamed (unsourced estimate). Needed before: building.
- **Measure:** does the host compress the binary map once `_headers` gives it a compressible type? R5 could not verify it (§4), and its test map would ship at 593 KB instead of 33 KB. Suggested: check the response on the first preview deploy, and if it fails, pre-gzip the map and inflate it with `DecompressionStream`. Needed before: launch.
- **Owner:** ship the public lab without offline play? M6.2 builds the service worker. Suggested: yes; lab mode needs no offline play, and M6.2 adds it before launch. Needed before: the step plan.

## Implementation notes

Suggestions for the step plan, which makes the final call.

- **Build order:** the `ip-gate` script and its four planted failures come first, since they need no people, then `_headers` and a preview deploy, then the recognition page.
- **Keep it simple:** the recognition page can draw atlas frames layer by layer with Canvas2D `drawImage` at whole scales. It needs no worker, sim or WebGL, yet shows the shipped pixels (inference).
- **Pitfalls:** derived files, such as the packed atlas and hashed JS chunks, have no source row. Check them through their inputs, or the gate fails every build. Upload no `.br` files to Cloudflare Pages, which compresses at the edge (R5).
