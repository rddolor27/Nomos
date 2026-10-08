# M0.5 Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The page a visitor opens: an inline boot that starts the worker and the map fetch, a first frame of Skin A, a vanilla HUD, uPlot charts and lil-gui after the first frame, device tiers and accessibility basics, plus the asset ledger, the sprite-manifest schema and an atlas stub, all within the byte and first-frame budgets.

**Architecture:** `apps/web` is a Vite app. A post-build hook injects an inline `<head>` script with the hashed worker and map names, so both downloads start while the HTML parses; the entry module then parses the map, creates the renderer and sends `init`. uPlot and lil-gui are dynamic imports after the first frame. One `_headers` file sets caching, COOP/COEP and the map's content type for production, `vite preview` and the bench server alike.

**Tech Stack:** TypeScript, Vite 8, uPlot 1.6.32, lil-gui 0.21.0, Vitest, Playwright with @axe-core/playwright, size-limit with @size-limit/file, Ajv and json-schema-to-typescript, Python 3.12 with Pillow (and oxipng when installed).

**Spec:** [task.md](task.md), [interfaces.md](../interfaces.md), and the [M0 Pipeline][m0] and [Performance budget][perf] sections.

## Global Constraints

- Commit straight to `main` with `git -c user.name=rddolor27 -c user.email=80044625+rddolor27@users.noreply.github.com commit`: a `type(scope): description` header of at most 72 characters, no body, no co-author.
- Load order: an inline `<head>` script starts the worker and the map fetch; the first frame needs only the dots skin, the HUD and the worker; uPlot and lil-gui load after it, the atlas in idle time, and country mode, the inspector and WebGPU on demand (web rules, R5).
- Budgets: ≤ 100 KB brotli before the first frame, ≤ 35 KB of it JS; the town map ≤ 40 KB; first frame ≤ 1.5 s and interactive ≤ 2.0 s on cold Fast 4G with a mid-tier phone CPU; libraries about 45 KB gzip (web rules, Performance budget, R3).
- The HUD in vanilla TypeScript; richer UI in Solid, or Preact with signals; never React, PixiJS or Phaser (web rules).
- Static files only: `_headers` sets `Cache-Control: public, max-age=31536000, immutable` on hashed `/assets/*`, COOP `same-origin` and COEP `require-corp`, and the map's compressible type. The service worker and the real host are M6's (web rules, implementation plan M6).
- Accessibility: Play/Pause first in tab order, a paused start under `prefers-reduced-motion`, a data table for every chart, and the colour-blind-safe palette (web rules).
- The atlas ships as lossless WebP at native resolution with an oxipng PNG fallback, never lossless AVIF (web rules).
- CC0 packs may be committed with their licence file beside them; paid packs such as LimeZu never; Mana Seed is excluded; every asset file is in `assets/LICENSES.md` with author, commit-pinned URL, licence, SHA-256 and edits (content rules).
- No "Pokémon", "Poké-" or "-mon" names; anything drawn keeps one blob body, no role in black and neutral police (content rules).
- `web` imports only `sim-protocol` and `render-gl`, and starts the worker; tiers are `phone` 10,000, `phone-plus` 25,000 and `desktop` 100,000 (interfaces).
- Relative imports carry `.ts`; never import `docs/research/*/prototypes/`; keep it simple and comment only the why (code rules).

## Review Focus

1. **The map or the worker fails** (offline, a 404, a `MapError`): the page says so in an alert, never a blank canvas (Task 4).
2. **No WebGL2:** the app runs on Canvas2D and says it shows at most 5,000 agents (Task 5).
3. **Bad query parameters** (`?seed=abc`, `?tier=desktop` on a phone) are ignored or clamped, never fatal (Tasks 4 and 7).
4. **Hidden after the user paused:** returning to the tab keeps the sim paused (Task 5).
5. **Storage that throws**, as in Safari's private mode: the tier check is skipped and the app still starts (Task 7).

---

### Task 1: Assets by licence family (R3)

**Files:**
- Modify: `tools/licenses.py`, `assets/LICENSES.md`, `.gitignore`, `.github/workflows/ci.yml`
- Test: `tools/test_licenses.py`

**Interfaces:**
- Produces the families: originals in `assets/sprites`, `assets/sounds` and `assets/maps` under the repository licence; CC0 packs in `assets/cc0/<pack>/`, each with its licence file and a `SOURCE.json` (`author`, commit-pinned `url`, `licence`, `edits`) that feeds its ledger rows; paid packs only in the git-ignored `assets/paid/` ([summary][r3s]). Existing files stay where the tools write them.
- Produces `python tools/licenses.py --check`, which exits 1 when `assets/LICENSES.md` is stale or a file under `assets/` lies outside the families.

- [ ] **Step 1: Verify the licences first.** Read the canonical pages: Ninja Adventure (pixel-boy's itch.io page and the pack's licence file), Kenney (kenney.nl's support page), LimeZu Modern Exteriors and Interiors (itch.io), and Mana Seed's licence with its AI clause. Record each licence, URL, date read and decision (commit, buy or drop) in the ledger's header. Expected: every sprite and sound today is original, drawn as code, so nothing is committed or bought now; Mana Seed stays dropped; a CC0 pack enters only as a placeholder ([map-pipeline.md][mp], row 17).
- [ ] **Step 2: Write the failing test** `test_licenses.py`, in `test_sprites.py`'s style: `--check` passes on the repo; a copy holding `assets/stray.txt` fails, naming it; `assets/paid/x.png` is git-ignored (`git check-ignore`); `sprites/season_map.json` names `tools/sprites/seasons.py` as its source, since today's ledger names a `season_map.py` that does not exist. Run `python tools/test_licenses.py`. Expected: FAIL.
- [ ] **Step 3: Implement** a family table with per-file source overrides, the header, `SOURCE.json` rows and `--check`, and ignore `assets/paid/`. Run `python tools/licenses.py && python tools/test_licenses.py`. Expected: PASS. Add `python tools/licenses.py --check` to CI.
- [ ] **Step 4: Commit**

```bash
git add tools/licenses.py tools/test_licenses.py assets/LICENSES.md .gitignore .github/workflows/ci.yml
git commit -m "chore(assets): lay out assets by licence family"
```

### Task 2: The sprite manifest schema (R9)

**Files:**
- Create: `packages/sim-protocol/schema/sprite-manifest.schema.json`, `scripts/manifest-types.ts`, and the generated `src/sprite-manifest.ts`
- Modify: `packages/sim-protocol/package.json` (devDependencies `ajv` and `json-schema-to-typescript`; script `"types": "node scripts/manifest-types.ts"`), `src/index.ts`
- Test: `packages/sim-protocol/test/sprite-manifest.test.ts`

**Interfaces:**
- Produces the schema: JSON Schema 2020-12, `$id` `urn:nomos:sprite-manifest:1` ([editor-tech.md §4][et]). The top level holds exactly `image` (`^[a-z0-9_-]+\.png$`), `size` (two positive integers), `tile` (const 16) and `frames`, whose names match `^[a-z0-9]+(?:[_-][a-z0-9]+)*$`. A frame requires integers `x`, `y`, `w`, `h` and the integer pair `anchor`, and allows only: integer pairs `footprint`, `door`, `face`, `hitch`; `joins` in '', l, lr, r, u, ul, ur; `layer` in body, face, ground, job, night, pattern, snow; frame names `night`, `snow`, `target`; booleans `overlay`, `review_only`; `view` 'true'; `colour` `^[A-Z_]+$`; `corners` `^[01]{4}$`; integers `cord_row`, `frame`; `hue` in the six hues; `pose` in sit, sneak, stand, walk; `facing` in down, left, right, up; `job` in builder, clinic, farmer, merchant, police, soldier; `eyes` in dot, round, tall, wide; `pattern` in patch, speckle, spots. These are the values the 13 manifests hold today (computed).
- Produces the generated types `SpriteManifest` and `SpriteFrame` from `@nomos/sim-protocol`.

- [ ] **Step 1: Write the failing tests:** `validates every sprite manifest`: Ajv 2020 accepts each `assets/sprites/*.json` but `season_map.json`; `rejects atlas indices and unknown fields`: `buildings.json` fails with `frames.civic_clinic.atlas = 12` and with `tile: 32`; `names only frames the manifests define`: every `category/name` in the town map's frames exists in `assets/sprites/<category>.json`, so CI fails on an unknown name ([editor-tech.md §4][et]); `matches its generator`: regenerated types equal `src/sprite-manifest.ts`. Run `pnpm test -- sprite-manifest`. Expected: FAIL.
- [ ] **Step 2: Write the schema and generator**, then run `pnpm --filter @nomos/sim-protocol types && pnpm test`. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add packages/sim-protocol pnpm-lock.yaml
git commit -m "feat(sim-protocol): publish the sprite manifest schema"
```

### Task 3: The atlas build stub (R3, R5)

**Files:**
- Create: `tools/atlas/build_atlas.py`, `tools/atlas/test_atlas.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces `python tools/atlas/build_atlas.py [--out DIR]`, default `dist/atlas/`. It shelf-packs every manifest's sheet (`season_map.json` aside), tallest first with a 1-px gap, into one atlas 2,048 px wide, failing above 2,048 × 2,048, and writes `atlas.webp` (Pillow lossless, method 6), `atlas.png` (then `oxipng -o max --strip safe --alpha` when it is on the PATH) and `atlas.json`, `{ "size": [w, h], "frames": { "<category>/<name>": { "x", "y", "w", "h", "anchor" } } }`. Output is never committed ([load-memory.md §4][lm]). The sprites are drawn as code into sheets, so neither an Aseprite step nor a placeholder atlas is needed.

- [ ] **Step 1: Write the failing test** `test_atlas.py`: build into a temp dir; every manifest frame (1,342 today) appears once in `atlas.json`; every 37th frame's pixels equal its source sheet's, decoded from both the WebP and the PNG; neither side exceeds 2,048 px. Run `python tools/atlas/test_atlas.py`. Expected: FAIL.
- [ ] **Step 2: Implement** and rerun. Expected: PASS; note both file sizes for M0.6's atlas gate (≤ 300 KB WebP). Add the test to CI.
- [ ] **Step 3: Commit**

```bash
git add tools/atlas .github/workflows/ci.yml
git commit -m "build(atlas): stub the atlas build"
```

### Task 4: apps/web and the early boot (R5)

**Files:**
- Create: `apps/web/{package.json, tsconfig.json, vite.config.ts, index.html}`, `public/_headers`, `vite/{early-boot.ts, headers.ts}`, `src/{main.ts, boot.ts, query.ts, app.ts}`
- Modify: `vitest.config.ts` (include `apps/*/test/**/*.test.ts`), `playwright.config.ts` (a second `webServer` that builds, then runs `vite preview` on 4173)
- Test: `apps/web/test/{early-boot.test.ts, headers.test.ts, query.test.ts}`, `test/browser/boot.spec.ts`

**Interfaces:**
- Consumes: the worker messages and `Tier` (M0.3, from `sim-protocol`); the module-worker entry `@nomos/sim-worker/worker` (M0.3), imported with `?worker`; `parseMap`, `MAP_CONTENT_TYPE`, `createWorldRenderer`, `fitCamera` and `observeDeviceSize` (M0.4).
- Produces `window.__boot = { worker: Worker; map: Promise<ArrayBuffer> }` and `takeBoot(): Boot`, which starts both itself under `vite dev`. `earlyBoot(): Plugin`, a `transformIndexHtml` hook of order `post`, finds `assets/worker-*.js` and `assets/maps/town-*.nmap` in the bundle and injects, first in `<head>` ([load-memory.md §3][lm]):

  `<script>window.__boot={worker:new Worker('/assets/worker-….js',{type:'module',name:'sim'}),map:fetch('/assets/maps/town-….nmap').then(function(r){if(!r.ok)throw new Error('map '+r.status);return r.arrayBuffer()})};performance.mark('worker:new')</script>`
- Produces `parseHeaders(text: string): HeaderRule[]` with `HeaderRule = { pattern: string; headers: Record<string, string> }`, `headersFor(path: string, rules: HeaderRule[]): Record<string, string>` (every matching rule, in file order) and `headersFile(): Plugin`, which applies `public/_headers` under `vite dev` and `vite preview`.
- Produces `seedFrom(search: string, random: () => number): number`, a decimal `?seed=` in 0–4,294,967,295, else `random()`; and `backendFrom(search: string): 'auto' | 'canvas2d'`, Canvas2D for `?canvas`.
- Produces `startApp(boot: Boot, doc: Document): Promise<App>`, where `App = { renderer, worker, tier, seed, agents, tick, camera, paused, userPaused, frameMs: number[]; setPaused(paused: boolean, byUser: boolean): void; onStats(listener): void }`. It marks `main:eval`, sizes the renderer with `observeDeviceSize` on `#view`, awaits the map (`map:fetched`), parses it, calls `setMap` and `fitCamera`, and sends `init` with the seed, tier `phone` until Task 7, and the map transferred. `ready` marks `sim:ready`; each `snapshot` goes to `pushSnapshot`, whose `release` posts `{ type: 'return', buffer }` with transfer; the first draw marks `frame:first`. Animation frames draw with `alpha = min(1, (now − last snapshot) / 100)`. A failed map fetch, a `MapError` or the Worker's `error` event writes to `#status`.
- `index.html`, in order: `<header id="hud">` with `<button id="play" type="button">Pause</button>`, `<p id="status" role="alert"></p>` and the readouts; `<main id="view" tabindex="0">` with `<canvas id="world" role="img" aria-label="Town map with every agent as a dot">`; `<section id="charts" aria-label="Charts">`. Inline CSS stays under 1 KB.
- `_headers`, exactly:

  ```
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  /assets/maps/*
    Content-Type: application/x-protobuf
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```
- `vite.config.ts`: `assetsInclude` `**/*.nmap`, `worker.format: 'es'`, target es2022, `modulePreload.polyfill: false`, `.nmap` files named `assets/maps/[name]-[hash][extname]`, and `@nomos/render-gl` in its own `render-gl` chunk.

- [ ] **Step 1: Write the failing tests:** `injects the boot script first in head`, given a bundle with `assets/worker-a1.js` and `assets/maps/town-b2.nmap`, and `throws without a worker or map`; `serves the production headers`: `/assets/index-x.js` gets the immutable `Cache-Control` and COOP/COEP, `/assets/maps/town-x.nmap` also gets `MAP_CONTENT_TYPE`, and `/index.html` gets COOP/COEP without `Cache-Control`; `reads the seed`: `?seed=42` is 42, while `?seed=abc`, `?seed=-1`, `?seed=4294967296`, `?seed=1.5` and no seed give the random value, and `?canvas` gives Canvas2D. In Chromium on the preview: `starts the worker before the entry module runs` (`worker:new` before `main:eval`); `draws the first frame` (`frame:first` within 10 s, the canvas centre not #464C5E); `says when the map is missing` (`**/assets/maps/**` answered with 404 puts the map in `#status`). Run `pnpm test && pnpm --filter @nomos/web build && pnpm test:browser boot`. Expected: FAIL.
- [ ] **Step 2: Implement** and rerun. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add apps/web vitest.config.ts playwright.config.ts pnpm-lock.yaml
git commit -m "feat(web): boot the worker and map from the page head"
```

### Task 5: The HUD and page controls (R1, R2, R3, R5)

**Files:**
- Create: `apps/web/src/{hud.ts, lifecycle.ts, camera-input.ts}`
- Modify: `src/main.ts`
- Test: `apps/web/test/browser/hud.spec.ts`

**Interfaces:**
- Consumes: `App` (Task 4); `mountSkinToggle`, `skinFromQuery`, `zoomAt`, `panBy` and `CANVAS2D_AGENT_CAP` (M0.4).
- Produces `mountHud(root: HTMLElement, app: App): void`, in vanilla TypeScript: the Play/Pause button, labelled Play or Pause; `#hud-tick`; `#hud-agents`, "10,000 agents" or, under Canvas2D, "5,000 of 10,000 agents shown (no WebGL2)"; `#hud-tier`; `#hud-zoom`, such as "Zoom 2×"; the skin toggle, set from `?skin=`; and `#hud-systems`, a `<dl>` of each `systemMs` entry as "0.12 ms" plus a frame row, the median push-and-draw time of the last 60 frames. It refreshes at most 4 times a second and writes a `Text` node only when its value changes, because layout, not script, dominates HUD cost ([load-memory.md §1][lm]).
- Produces `bindLifecycle(doc: Document, win: Window, app: App): () => void`: hidden posts `pause`; visible posts `resume` unless `app.userPaused`; `pagehide` posts `pause`. The app ignores the worker's `checkpoint` until M6's saves.
- Produces `bindCameraInput(view: HTMLElement, app: App): () => void`: the wheel zooms one step about the pointer (device coordinates are CSS × dpr), dragging pans, and with `#view` focused (`aria-label="Town view: arrow keys pan, plus and minus zoom"`) the arrows pan 16 world px and `+` and `-` zoom about the centre.

- [ ] **Step 1: Write the failing tests** (Chromium, preview): `pauses and resumes`: after one click on Play/Pause `#hud-tick` holds for 1 s, and after a second it advances; `lists each system's milliseconds`: at least one row, each matching `^\d+\.\d{2} ms$`, plus the frame row; `says when Canvas2D caps the agents` under `?canvas`; `pauses while hidden`: a dispatched hidden `visibilitychange` holds the tick for 1 s, and visible resumes it; `stays paused after the user paused`: Pause, hidden, visible, and the tick still holds; `zooms and pans`: `+` on `#view` adds a step to `#hud-zoom`, a wheel-up adds another, and 20 presses of `-` reach "Zoom 1×". Run `pnpm test:browser hud`. Expected: FAIL.
- [ ] **Step 2: Implement** and rerun. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the HUD, pause on hide and camera input"
```

### Task 6: Charts and controls after the first frame (R1, R2, R5)

**Files:**
- Create: `apps/web/src/{charts.ts, controls.ts}`
- Modify: `src/main.ts`, `apps/web/package.json` (`uplot@1.6.32`, `lil-gui@0.21.0`)
- Test: `apps/web/test/browser/after-first-frame.spec.ts`

**Interfaces:**
- Produces `mountCharts(root: HTMLElement): Charts` with `push(tick: number, systemMs: Record<string, number>, frameMs: number): void`: two uPlot charts, "Tick time by system (ms)", one series per system, and "Frame time (ms)". Each is a `<figure>` with a `<figcaption>`, then `<details><summary>Data table</summary>` holding a table with the same caption, a Tick column plus one per series, and the last 20 samples; charts and tables refresh once a second.
- Produces `mountControls(app: App): GUI`: lil-gui with Zoom (1–16, step 1) and Level of detail (auto or fixed).
- `afterFirstFrame()` mounts the HUD, yields a task, imports and mounts `charts.ts`, yields again, imports and mounts `controls.ts`, then marks `app:interactive`; separate tasks keep any input's wait under 50 ms ([load-memory.md §2][lm]).

- [ ] **Step 1: Write the failing tests:** `loads uPlot and lil-gui after the first frame`: the Resource Timing `startTime` of `charts-*.js` and of `controls-*.js` is at or after the `frame:first` mark, and `app:interactive` exists; `gives every chart a data table`: each `#charts figure` has a table whose header row is Tick plus the chart's series labels, with 1–20 body rows, the last tick within 20 of `#hud-tick` after 2 s. Run `pnpm test:browser after-first-frame`. Expected: FAIL.
- [ ] **Step 2: Implement** and rerun. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): load charts and controls after the first frame"
```

### Task 7: Device tiers (R2)

**Files:**
- Create: `apps/web/src/tiers.ts`
- Modify: `src/main.ts`, `src/app.ts`
- Test: `apps/web/test/tiers.test.ts`

**Interfaces:**
- Consumes `Tier` and `TIER_AGENTS` from `sim-protocol` (M0.3).
- Produces `deviceClass(nav: { userAgent: string; userAgentData?: { mobile: boolean } }, coarsePointer: boolean): 'phone' | 'desktop'`: UA-CH `mobile`; else Android, iPhone, iPad or iPod in the UA; else a coarse pointer without hover, which catches iPads that report a Mac UA.
- Produces `tierFromQuery(search: string): Tier | null` and `chooseTier(device, verdict: Tier | null, override: Tier | null): Tier`: desktops get `desktop`; phones get the verdict or `phone`, and an override only up to `phone-plus`, so 100,000 stays desktop-only.
- Produces `tierVerdict(tickMs: number[]): 'phone' | 'phone-plus' | null`: null under 100 samples, else `phone-plus` when the median × 2.5 ≤ `PHONE_PLUS_MAX_MS = 13.3`, the 25k tick budget (Performance budget); `VERDICT_KEY = 'nomos.tier-check.v1'`; and `loadVerdict(storage: Storage | null): Tier | null` and `saveVerdict(storage: Storage | null, verdict: Tier): void`, which swallow storage errors.
- The start-up check: on a phone without a verdict, the app sums `systemMs` over the first 100 `stats` messages at `phone` and saves the verdict, which applies from the next start, because a mid-run switch would write canonical state outside the day boundary (sim-core rules).

- [ ] **Step 1: Write the failing tests:** `classifies devices`: UA-CH mobile, a Pixel Android UA, an iPhone UA and a Mac UA with a coarse pointer are phones, while a Mac UA with a fine pointer and Windows Chrome are desktops; `chooses tiers`: (desktop, null, null) desktop, (phone, null, null) phone, (phone, phone-plus, null) phone-plus, (phone, null, desktop) phone, (phone, null, phone-plus) phone-plus, (desktop, null, phone) phone; `judges the start-up check`: 99 samples give null, 100 of 5.3 ms phone-plus, 100 of 5.4 ms phone; `survives storage that throws`: a `Storage` whose methods throw loads null and saves without a throw, as does `null`. Run `pnpm test -- tiers`. Expected: FAIL.
- [ ] **Step 2: Implement**, wire it into `main.ts` and `app.ts`, and rerun. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(web): choose device tiers with a start-up check"
```

### Task 8: Accessibility basics (R2)

**Files:**
- Modify: `apps/web/src/main.ts`, `apps/web/package.json` (devDependency `@axe-core/playwright`)
- Test: `apps/web/test/browser/a11y.spec.ts`

**Interfaces:**
- Consumes: the worker's tick-0 snapshot after `ready` (interfaces.md, worker messages).
- Produces `prefersReducedMotion(win: Window): boolean`; when it holds, `main.ts` posts `pause` right after `init`, so no tick runs and the first frame shows tick 0.

- [ ] **Step 1: Write the failing tests:** `puts Play/Pause first in tab order`: one Tab from the top focuses `#play`; `starts paused under reduced motion`: with `emulateMedia({ reducedMotion: 'reduce' })` the button reads Play, `frame:first` exists, and `#hud-tick` reads 0 after 2 s; `passes axe on the HUD and charts`: `AxeBuilder` on `#hud` and `#charts` finds no serious or critical violation. Run `pnpm test:browser a11y`. Expected: FAIL on the second.
- [ ] **Step 2: Implement** and rerun. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): start paused under reduced motion"
```

### Task 9: The byte, library and first-frame budgets (R2, R3, R5)

**Files:**
- Create: `apps/web/.size-limit.json`, `apps/web/test/{serve.ts, startup.spec.ts, frameworks.test.ts}`
- Modify: `apps/web/package.json` (`size-limit`, `@size-limit/file`; scripts `size` and `startup`), `eslint.config.js`, `.github/workflows/ci.yml`

**Interfaces:**
- `.size-limit.json`: "Library budget" (`dist/assets/render-gl-*.js`, `charts-*.js` and `controls-*.js`, gzip) ≤ 45 kB, the renderer's 6–10 KB plus about 33 KB of libraries ([summary][r3s]); "Initial JS" (`index-*.js`, `render-gl-*.js` and `worker-*.js`, brotli) ≤ 35 kB; "Before the first frame" (those plus `index.html` and `maps/town-*.nmap`, brotli) ≤ 100 kB; "Town map" ≤ 40 kB.
- ESLint `no-restricted-imports` on `apps/**` and `packages/render-gl/**` bans `react`, `react-dom`, `react/*`, `pixi.js`, `@pixi/*` and `phaser`, citing the web rules.
- Produces `startServer({ root, latencyMs = 165, bytesPerSecond = 1_012_500, setupRtts = 3 }): Promise<{ url: string; close(): Promise<void> }>`: it serves `dist/` with the `headersFor` rules, brotli-11 for `text/*`, JS, JSON and `MAP_CONTENT_TYPE`, 165 ms added to every response, one shared download pacer, and 3 RTTs of setup per navigation. The network is modelled in the server because CDP throttling misses worker requests ([load-memory.md §2][lm]).

- [ ] **Step 1: Write the failing test** `keeps React, PixiJS and Phaser out`: linting a planted `import React from 'react'` in `apps/web/src/planted.ts` and `import 'pixi.js'` in `packages/render-gl/src/planted.ts` gives a `no-restricted-imports` message each, and no workspace `package.json` lists those packages. Run `pnpm test -- frameworks`. Expected: FAIL.
- [ ] **Step 2: Add the rule and `.size-limit.json`.** Run `pnpm test && pnpm --filter @nomos/web build && pnpm --filter @nomos/web size`. Expected: PASS, all four limits met; note the sizes. Add the build and `size` to CI.
- [ ] **Step 3: Measure the first frame** with `startup.spec.ts`, Chromium only and skipped unless run by `pnpm --filter @nomos/web startup`: 7 cold loads, each in a fresh context with `Emulation.setCPUThrottlingRate(4)`, collecting `frame:first`, `app:interactive` and the bytes received before `frame:first`. It asserts medians ≤ 1,500 and ≤ 2,000 ms, bytes ≤ 100,000 and JS bytes ≤ 35,000, and writes `test-results/startup.json` with the medians, min–max, Chromium version and `os.loadavg()`. The worker runs unthrottled until M0.6's busy-wait, so this run is optimistic by the worker's CPU time. Run it. Expected: PASS; note the numbers.
- [ ] **Step 4: Commit**

```bash
git add apps/web eslint.config.js .github/workflows/ci.yml pnpm-lock.yaml
git commit -m "test(web): measure the byte, library and first-frame budgets"
```

### Task 10: Device times and close M0.5

**Files:**
- Modify: `docs/plan/tasks/m0-pipeline/milestone.md`, the shared plan doc and its export `docs/plan/implementation-plan.md`

- [ ] **Step 1: Verify the device tiers** (owner, with the phones). Run `pnpm --filter @nomos/web build && pnpm --filter @nomos/web preview --host`; on a mid-range Android phone and an iPhone, open `/?seed=42&tier=phone`, then `&tier=phone-plus`, and after 60 s read the HUD's frame row and the sum of its system rows. Record device, OS, browser and both tiers in the shared doc's "Verify before hard-coding" row. Keep 10,000 and 25,000 if the Android phone's 10k tick sum stays within about 8 ms and its frame median within 1 ms (Performance budget); otherwise raise it with the owner before M0.3's `TIER_AGENTS` changes. A 25k frame median above 2 ms means M3.3 needs the phone framebuffer path ([rendering-tooling.md §4][rt]).
- [ ] **Step 2: Confirm CI passes on `main`** (`gh run list --limit 1`), record the pace against the 3–4-day estimate, and re-baseline the Performance budget's measured columns with Task 9's numbers, labelled with engine and load.
- [ ] **Step 3: Tick** M0.5's build items and exit checks in the shared doc's M0 section (R1, R2, R3, R5, R9), then export with `/sync-plan-doc`.
- [ ] **Step 4: Commit**

```bash
git add docs/plan/tasks/m0-pipeline/milestone.md
git commit -m "docs(plan): record the M0.5 pace and device times"
git add docs/plan/implementation-plan.md
git commit -m "docs(plan): sync the implementation plan from the doc"
```

[m0]: ../../../implementation-plan.md#m0-pipeline
[perf]: ../../../implementation-plan.md#performance-budget
[r3s]: ../../../../research/round-3-2d-look/summary.md
[rt]: ../../../../research/round-3-2d-look/notes/rendering-tooling.md
[lm]: ../../../../research/round-5-performance/notes/load-memory.md
[mp]: ../../../../research/round-9-maps-and-world-builder/notes/map-pipeline.md
[et]: ../../../../research/round-9-maps-and-world-builder/notes/editor-tech.md
