# Load time, bundle size, assets, memory, offline caching and CI gates for the static browser civilization simulation

Scope: startup, bytes, asset formats, memory, service worker and CI budgets for the static-hosted simulation (TypeScript sim in a Web Worker, custom WebGL2 renderer, uPlot, Comlink, lil-gui, LDtk maps, Vite 8, Cloudflare Pages or Netlify). Sim tick budgets are covered in the parallel `compute.md` notes. This file only cross-references them.

**How numbers are labelled.**
- "Measured here" means run by me in this session. Unless a line says otherwise, the setup was:
  - Machine: a 4-vCPU Intel Xeon @ 2.80 GHz VM with 16 GB RAM, Linux 6.18, Node 22.22.0.
  - Browser: Chromium 141.0.7390.37 (chrome-headless-shell), driven by Playwright 1.56.1 (the preinstalled build), with SwiftShader software WebGL2. The npm registry's latest Playwright is 1.63.0, but it was not used, because its browsers are not installed.
  - Load: the VM was shared with another agent's CPU benchmarks. The 1-minute load average was logged for every run: 0.6–2.2 for the startup and UI timing runs, and up to ≈5 for the frame-time, repeat-visit and memory runs, which are flagged where they appear. Timing batches waited for load < 1.5, or < 2.0 for the UI benchmark, for up to 30–120 s before giving up. Treat the absolute timings as upper bounds. Byte counts and memory sizes do not depend on load.
  - Statistics: every timing is a median over runs, with [min–max] across runs.
- Scripts, builds and raw JSON results are in `../prototypes/load`, written below as `perf-load/`.
- Cited sources are marked "opened" when I read the page or the raw file on GitHub or npm, and "snippet only" when I saw only a search-result summary.

**Versions measured (npm registry, October 2026).**
- Build: vite 8.3.2 (rolldown 1.2.12, Oxc minifier) and esbuild 0.28.2.
- UI frameworks: preact 11.0.0 with @preact/signals 2.11.3, solid-js 1.9.15 (vite-plugin-solid 2.11.14), svelte 5.57.1 (@sveltejs/vite-plugin-svelte 7.3.1), lit 3.3.3 (BSD-3-Clause), react and react-dom 19.3.0.
- Libraries: uplot 1.6.32, comlink 4.4.2 (Apache-2.0), lil-gui 0.21.0.
- Offline: vite-plugin-pwa 2.0.0, workbox-build and workbox-window 7.4.1.
- Budget tools: size-limit and @size-limit/file 14.1.0, bundlewatch 0.4.2, @lhci/cli 0.15.1, lighthouse 13.5.0.
- Image tools: sharp 0.35.5 (libvips 8.18.7, libwebp 1.6.0, aom 3.15.1, libheif 1.23.5), oxipng 10.2.1 (built with cargo), zopflipng (google/zopfli HEAD), pngquant 3.0.3, cwebp 1.6.0 (built from libwebp HEAD), Pillow 12.3.0 (libavif 1.4.2).
- Source: `npm view` against registry.npmjs.org. All packages above are MIT unless marked. [npm registry](https://www.npmjs.com/package/vite)

---

## 1. UI shell: vanilla TS vs Lit vs Preact+signals vs Solid vs Svelte 5 vs React 19 (4–10 Hz control panel, inspector, legend, event log)

### Takeaway
At 4–10 Hz the framework hardly changes per-update CPU. Every option re-rendered a 50-row event log, 20 stat tiles and a 12-field inspector in 1.0–1.3 ms at 1× CPU and 5.8–8.5 ms at 4× (median), and style plus layout, identical for every framework, was 70–90% of that. So bytes decide, and they differ by a factor of 35.
- Equivalent app, brotli: vanilla 1.7 KB, Solid 5.9 KB, Lit 7.2 KB, Preact+signals 8.6 KB, Svelte 14.9 KB, React 59.5 KB.
- Recommendation: **Solid**. It has the smallest runtime of the component frameworks and fine-grained updates with no VDOM diff.
- Use Preact+signals instead if React familiarity or compatibility matters (+2.7 KB br). Keep vanilla TS for the always-visible HUD if the first paint must carry no framework at all.
- Drop React: 59.5 KB br is about 7× the app's whole initial-load JS.

### Cited Findings
- **Test app (measured here).** One Vite 8.3.2 build per framework (`perf-load/ui/*`).
  - Panels: a control panel (play/pause, speed slider, skin select, 3 checkboxes), 20 stat tiles, an 8-entry legend, a 12-field inspector, and a keyed 50-row event log.
  - All six variants share the same data module (pre-generated frames) and CSS.
  - Each update pushes one event (the 50-row keyed list shifts by one), replaces all 20 tile values and deltas, and updates the inspector.
  - Every variant produced byte-identical DOM text after 137 updates (`distinct DOM signatures: 1`).
  - Idioms used: Solid `<For>`/`<Index>`; Svelte `$state.raw` + keyed `{#each}`; Lit `repeat()` in light DOM; Preact signals with `batch`; React 19 `flushSync`; vanilla `Text.data` updates plus `prepend` and `remove`.
- **Bundle sizes (measured here).** JS only; gzip level 9 and brotli quality 11 via Node zlib; plus 1,355 B CSS (598 gz / 501 br) shared by all.

  | Framework | Equivalent app JS (raw / gzip / brotli, bytes) | "Hello world" runtime floor (raw / gzip / brotli) | esbuild 0.28.2 cross-check of app (gzip) |
  |---|---|---|---|
  | Vanilla TS | 3,690 / 1,822 / 1,651 | 199 / 152 / 113 | 1,843 |
  | Solid 1.9.15 | 16,085 / 6,487 / 5,891 | 10,128 / 4,000 / 3,635 | (needs babel-preset-solid; Vite only) |
  | Lit 3.3.3 | 20,102 / 7,977 / 7,232 | 14,800 / 5,654 / 5,116 | 8,309 |
  | Preact 11.0.0 + @preact/signals 2.11.3 | 23,761 / 9,479 / 8,624 | 20,427 / 8,005 / 7,289 | 9,644 |
  | Svelte 5.57.1 | 41,661 / 16,397 / 14,914 | 24,510 / 9,737 / 8,906 | (compiler; Vite only) |
  | React 19.3.0 + react-dom | 222,801 / 68,991 / 59,517 | 219,041 / 67,474 / 58,070 | 70,737 |

  — measured here (`perf-load/ui/`, `perf-load/sizes.mjs`). The Vite build used `build.modulePreload.polyfill:false`; the default polyfill adds a little.
- **Per-update main-thread cost (measured here).** Method:
  - Chromium 141 headless shell at a 1280×800 viewport, 5 fresh page loads per cell.
  - Each load ran 100 warm-up updates, then 300 timed updates. One timed update is apply → framework flush (sync for vanilla, Solid and React `flushSync`; microtask for Preact; `flushSync()` for Svelte; `updateComplete` for Lit) → forced style and layout (`offsetHeight`).
  - "Script" is apply + flush without layout.
  - CPU throttling was set with CDP `Emulation.setCPUThrottlingRate`.
  - Cells give the median of per-load medians [min–max], p95 in parentheses. Load average was 0.6–2.2.

  | Framework | Total per update @1× (ms) | Script only @1× | Total per update @4× | Script only @4× | Main-thread task time per update at 10 Hz, natural scheduling (CDP `TaskDuration`, idle subtracted) @1× / @4× |
  |---|---|---|---|---|---|
  | Vanilla TS | 0.96 [0.95–1.00] (p95 1.17) | 0.09 | 5.77 [5.10–6.33] (p95 8.61) | 0.67 | 4.2 / 19.7 |
  | Lit | 1.17 [1.07–1.17] (p95 1.76) | 0.20 | 7.25 [6.79–7.42] (p95 11.8) | 1.49 | 2.3 / 13.5 |
  | Preact + signals | 1.17 [1.13–1.29] (p95 1.83) | 0.37 | 8.47 [7.83–9.48] (p95 13.8) | 2.79 | 3.9 / 20.5 |
  | Solid | 1.10 [1.07–1.15] (p95 1.78) | 0.21 | 7.71 [7.13–8.40] (p95 12.2) | 1.76 | 4.5 / 14.7 |
  | Svelte 5 | 1.13 [1.06–1.17] (p95 1.68) | 0.26 | 7.25 [6.08–8.14] (p95 10.5) | 1.89 | 4.7 / 13.4 |
  | React 19 | 1.34 [1.25–1.45] (p95 2.21) | 0.42 | 8.23 [8.02–9.53] (p95 13.4) | 2.80 | 3.3 / 16.2 |

  — measured here (`perf-load/bench-ui.mjs`, `perf-load/ui-bench.json`).
  - The last column (CDP `Performance.getMetrics` over 30 updates at 10 Hz) includes paint, GC and timer work, so it is noisy. Run spreads reached ±50% (for example Lit @4× 10.4–22.7 ms). Use it for scale only, not for ranking.
- **Layout and containment (measured here).** CDP metrics put layout at ≈1.1–1.3 ms per update at 1× and ≈5.5–6.8 ms at 4× for every framework, versus 0.1–0.4 ms of script at 1×.
  - **CSS containment did not help (measured here, `ui-contain.json`, 5 loads each).** I added `contain: content` on the five panels and fixed tile and row heights.
    - Vanilla: 0.98 → 1.00 ms @1×, 5.87 → 5.82 ms @4×.
    - Solid: 1.09 → 1.04 ms @1×, 5.94 → 6.43 ms @4×.
    - Layout per update stayed ≈1.0–1.4 ms @1×.
    - So the cost scales with the number of text nodes changed (≈35 strings per update plus one inserted row of 3 texts). Text shaping and line layout of changed runs are the probable cause; this is my inference, not profiled.
  - **Batch-to-batch variation at 4× was up to ≈25%** on this shared VM. Solid @4× measured 7.71 ms in the main batch and 5.94 ms in the containment batch; vanilla 5.77 vs 5.87.
    - Differences between frameworks at 4× (5.8–8.5 ms) are therefore not significant.
    - The 1× totals were stable between batches (vanilla 0.96/0.98, Solid 1.10/1.09). So were the script-only rankings: vanilla < Lit ≈ Solid < Svelte < Preact ≈ React.
- **Framework facts (opened).** Comlink 4.4.2 is Apache-2.0 and lit 3.3.3 is BSD-3-Clause. The other frameworks are MIT. [npm registry](https://www.npmjs.com/package/comlink)

### Inferences
- **The framework is not the bottleneck at 4–10 Hz; layout is.** At 4× CPU (a mid-tier-phone proxy, see section 2) a 10 Hz log-plus-tiles refresh cost ≈6–8.5 ms of synchronous work per update, and ≈13–20 ms of main-thread task time once paint and GC are included. That is roughly 13–20% of a phone's main thread at 10 Hz.
  - Cut the number of text nodes that change per update: write only values that changed, refresh the tiles and log at ≤ 4 Hz, and show only the visible log rows. That saves more than any framework switch. CSS containment alone measured no gain.
- **Bytes are the real differentiator.** React 19 alone (58 KB br floor) is about 7× the whole measured initial-load JS of the representative app (8.1 KB br, section 3).
  - On Fast 4G (≈1 MB/s effective) 50 KB is only ≈50 ms of transfer, but at 4× it also costs parse and compile time on the main thread, and it is permanent weight on the critical path.
- **Ranking for this app.**
  1. Solid: 3.6 KB br floor, 5.9 KB app, second-lowest framework script time.
  2. Lit: 5.1 KB floor, lowest framework script time, but web-component and shadow-DOM ergonomics.
  3. Preact+signals: 7.3 KB floor; React-like API and `preact/compat` escape hatch.
  4. Svelte 5: 8.9 KB floor; its compiled per-component output was the largest, +6.7 KB gz over its floor for this app.
  5. React 19.
- **Vanilla TS is fastest and smallest** (0.09 ms script at 1×, 1.7 KB br). It is viable for the HUD tiles and log, which are fixed structures, but becomes maintenance debt as inspector and lab-card UIs grow. A hybrid also works: vanilla HUD in the entry chunk and the component framework only in lazy chunks (inspector, lab cards).
- **lil-gui stays** for developer-style controls (8.0 KB gz measured, section 3). Do not build those controls a second time in the framework.

### Gaps
- No real-device runs. 4× throttling on this VM approximates "mid-tier mobile" by Lighthouse's BenchmarkIndex brackets (section 2), but iOS Safari/JavaScriptCore was not measured at all.
- The test app is small. Framework overheads that scale with component count (context, effects, hydration-like work) were not exercised.
- The holistic per-update task time (last column) is noisy on this shared VM. Its run-to-run spread is as large as the differences between frameworks.

---

## 2. Startup: time to first frame and time to interactive under phone-like throttling, stage breakdown, budget

### Takeaway
I measured a representative split build: dots skin, binary map, 10k agents, 42.5 KB on the wire before the first frame. Profile: Fast 4G (165 ms latency, 9 Mbps×0.9), a cold connection with 3-RTT setup, 4× CPU.
- **Split build:** first frame 1.21 s (median, [1.18–1.23]); interactive 1.66 s.
- **Early boot**, where the worker and map fetch start from an inline `<head>` script: first frame **1.06 s**, interactive 1.55 s.
- **Where the time goes:** 0.67 s is connection setup plus the HTML response; three more round trips (entry JS, worker script, map) take most of the rest. All CPU stages together (parse/compile, worker start, map parse, spawn, GL init, first draw) are under 0.15 s at 4×.
- **Proposed budget:** first frame ≤ 1.5 s and interactive ≤ 2.0 s on cold Fast 4G + 4× CPU (≈30% headroom over what was measured).
- **Conditions:** keep the 2048² atlas and LDtk JSON off the critical path. Each of them alone added 0.7–1.0 s.

### Cited Findings
- **Throttling presets (opened).**
  - Chrome DevTools "Fast 4G": download 9 Mbps × 0.9, upload 1.5 Mbps × 0.9, latency 60 ms × 2.75 = 165 ms. [devtools-frontend NetworkManager.ts](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts)
  - Chrome DevTools "Slow 4G" (renamed from "Fast 3G" in May 2024): 1.6 Mbps × 0.9 down, 750 kbps × 0.9 up, 150 ms × 3.75 = 562.5 ms. Same file.
  - Lighthouse mobile defaults: 150 ms RTT, 1.6 Mbps down / 750 kbps up. Lighthouse says its "constant 4x CPU multiplier … moves a typical run in the high-end desktop bracket somewhere into the mid-tier mobile bracket." [Lighthouse docs/throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- **CPU calibration of this VM (measured here).** I ran Lighthouse's `computeBenchmarkIndex` logic (copied from [page-functions.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/page-functions.js), opened) in Chromium 141:
  - 1×: 1,510–1,635. That is Lighthouse's "high-end desktop" bracket (1500–2000).
  - CDP 4×: 360–388, which is "mid-tier mobile" (125–800).
  - CDP 6×: 230–264 (bracket table opened in Lighthouse docs/throttling.md).
  - So 4× on this VM is a mid-tier phone and 6× is a lower mid-tier phone. Source: `perf-load/bench-decode.mjs`, `decode.json`.
- **Two CDP pitfalls found (measured here, `perf-load/test-throttle.mjs`).**
  - (a) `Emulation.setCPUThrottlingRate` sent to a dedicated-worker target returns "Operation is only supported for pages, not workers". Page-level throttling slowed a CPU loop in the worker only 1.2–2.3× at "4×" (the main thread slowed 3.1×) and 1.1–2.5× at "6×" (main thread 4.5×).
  - (b) Page-level `Network.emulateNetworkConditions` (Fast 4G) did not delay the dedicated worker's script request: it arrived 4 ms after `new Worker()`, against ≈175 ms with throttling in the server.
  - Fixes used here: I throttled the network in the static server instead (`perf-load/server.mjs`):
    - 165 ms added to every response;
    - one shared 1,012,500 B/s download pacer;
    - 3 RTT (495 ms) of DNS+TCP+TLS setup on the navigation request only, to model one HTTP/2 connection to a CDN.
  - I slowed worker CPU with a busy-wait multiplier equal to the CDP rate (`?wslow=`). CPU throttling of the main thread stayed in CDP.
- **Representative app (measured here, `perf-load/app/`).**
  - Vite 8.3.2 build.
  - `src/main.ts`: Comlink, a WebGL2 "dots" renderer (R8UI map texture plus `gl.POINTS`), a vanilla HUD.
  - `src/sim/worker.ts`: SoA typed-array sim in a module worker.
  - Map: LDtk-derived 256×256 town as a compact binary, 33.3 KB brotli.
  - Lazy after the first frame: lil-gui controls and the uPlot "lab card" chart.
  - Separate chunks: town skin with the 2048² atlas, country mode, inspector and WebGPU path.
  - Serving: brotli-11, `Cache-Control: immutable` on hashed assets, COOP/COEP.
  - Marks: `performance.mark` on the main thread, plus worker timestamps mapped through `performance.timeOrigin`. Long animation frames (LoAF) and long tasks were recorded. 7 cold runs per configuration, each in a fresh browser context.
- **Stage breakdown, Fast 4G cold connection + 4× CPU, 10k agents** (ms from navigation start, median [min–max] of 7 runs, gate load 1.35–1.50):

  | Stage | Split build (worker created in `main.ts`) | Early boot (inline `<head>` script starts worker + map fetch) |
  |---|---|---|
  | Connection setup + HTML received (0.6 KB) | 669 [668–675] | 671 [670–678] |
  | Entry JS received (index 4.0 KB br + shared GL chunk 1.3 KB br, modulepreloaded) | 896 [880–907] | 906 [897–912] |
  | Entry parsed + compiled + evaluated (`main:eval`) | 910 [890–926] (≈14 ms after download) | 919 [906–932] |
  | `new Worker()` called | 913 [894–929] | **759 [753–771]** |
  | Worker script (2.9 KB br) received | 1,086 [1,068–1,105] | 938 [932–948] |
  | Worker top-level evaluated | 1,102 [1,083–1,119] | 985 [962–1,019] |
  | Map (33 KB br) received | 1,120 [1,106–1,146] | 974 [963–980] |
  | Map parse, binary (worker, 4× emulated) | 2.6 ms [2.4–3.3] | 2.6 ms [2.3–3.4] |
  | Spawn 10k agents (worker, 4× emulated) | 36.8 ms [26.4–53.9] | 33.3 ms [28.6–44.5] |
  | WebGL2 context + 2 programs linked (SwiftShader, main thread, overlaps the fetches) | 53 ms [39–57] | 45 ms [38–62] |
  | Sim ready on main thread | 1,196 [1,159–1,210] | 1,042 [1,034–1,087] |
  | **First frame drawn** | **1,210 [1,179–1,234]** | **1,058 [1,051–1,104]** |
  | Next rAF (presented) | 1,217 [1,189–1,240] | 1,068 [1,058–1,106] |
  | **Interactive** (HUD + lil-gui + uPlot mounted, sim loop running) | **1,661 [1,621–1,700]** | **1,548 [1,509–1,582]** |
  | Bytes on the wire before first frame | 42.5 KB | 42.7 KB |
  | Long tasks (sum) | 291 ms [225–371] | 294 ms [265–348] |

  — measured here (`perf-load/bench-startup.mjs`; `startup-A.json`, `startup-B.json`).
- **Other profiles (measured here; 7 runs each).**

  | Profile | Split: first frame / interactive (ms) | Early boot: first frame / interactive |
  |---|---|---|
  | No throttling ("desktop") | 111 [98–120] / 190 [183–236] | 111 [107–117] / 195 [184–204] (early + lazy-chunk modulepreload) |
  | Fast 4G, warm connection (no setup RTTs), 4× | 691 [688–705] / 1,161 [1,128–1,182] | — |
  | Fast 4G cold, 6× | 1,279 [1,246–1,309] / 1,861 [1,845–2,004] | 1,144 [1,112–1,182] / 1,766 [1,669–1,814] |
  | Slow 4G cold (562.5 ms latency), 4× | 3,804 [3,769–3,829] / 4,831 [4,740–4,891] | 3,192 [3,182–3,221] / 4,194 [4,135–4,232] |

- **What happens between first frame and interactive, early boot + modulepreloaded lazy chunks, Fast 4G + 4× (measured here, `startup-D.json`).**
  - First frame 1,116; HUD mounted 1,134; lil-gui + uPlot chunks evaluated 1,414; controls mounted 1,431; chart mounted 1,450; interactive 1,569.
  - The same at 1×: 111 → 162 (chunks) → 195 (interactive).
  - The ≈450 ms gap at 4× is main-thread CPU (chunk compile and evaluate, DOM and canvas mount, SwiftShader compositing). It is not download: modulepreloading the chunks moved interactive by only ≈30 ms.
- **Agent count barely affects first frame (measured here, Fast 4G + 4×).**
  - 25k: first frame 1,223 ms (spawn 52.7 ms).
  - 100k: first frame 1,295 ms (spawn 113.7 ms [101.8–120.0]).
- **Long animation frames (measured here).** The largest LoAF entries during startup at 4× were:
  - ≈90–120 ms of HTML parse and style with no script attribution;
  - ≈55–70 ms evaluating the entry module, mostly the WebGL2 context and shader link;
  - ≈50–65 ms for the first frame's render step.
  - Source: `startup-*.json`, field `loaf0`.

### Inferences
- **The critical path is round trips.**
  - Cold-connection setup and HTML take ≈670 ms. The real CDN DNS/TCP/TLS cost varies, and 3 RTT is an assumption.
  - After that come: entry JS (≈230 ms) → worker script and map in parallel (≈190–210 ms) → worker init (≈40–80 ms at 4×) → frame.
  - Starting the worker and map fetch from the HTML removes one serial round trip: −152 ms on Fast 4G, −612 ms on Slow 4G.
- **CPU work is small but grows with throttling.** The entry evaluates in ≈14 ms. WebGL context creation and linking take 45–75 ms but overlap the network wait. On real phones, shader compile and link on a real driver can be longer or shorter than SwiftShader; this is a gap.
- **Proposed startup budget** (cold Fast 4G, 3-RTT connection setup, CPU calibrated to BenchmarkIndex ≈375, i.e. "4×" here):
  - First frame ≤ **1,500 ms**. Measured 1,058–1,210.
  - Interactive ≤ **2,000 ms**. Measured 1,521–1,661.
  - Warm-connection first frame ≤ 1,000 ms. Measured 691.
  - Desktop unthrottled first frame ≤ 300 ms and interactive ≤ 500 ms. Measured 111 and 190.
  - Informational, not gated: Slow 4G first frame ≤ 4,000 ms (measured 3,192–3,804) and 6× first frame ≤ 1,600 ms (measured 1,144–1,279).
  - Per-stage budgets are in section 8.
- **The "interactive" milestone is dominated by main-thread work after the first frame**, about 450 ms at 4×. To shorten it:
  - mount lil-gui and uPlot in separate tasks (yield with `scheduler.yield()` or `setTimeout` between them) so input is never blocked for more than 50 ms;
  - or mount the chart only when the lab card opens.

### Gaps
- No real phones. The CPU proxy is CDP throttling on a shared VM. Worker slowdown is emulated with a busy-wait, not real throttling.
- The server-side network model ignores TCP slow start, packet loss and HTTP/2 prioritisation. HTTP/1.1 on localhost was used, with pacing in the server.
- SwiftShader is not a mobile GPU. GL init, shader link, texture upload and draw times are CPU-emulated.
- I have no measured DNS/TLS figures for Cloudflare or Netlify edges from mobile networks. The 3-RTT setup is an assumption.

---

## 3. Code splitting and lazy loading: what loads first vs later; `modulepreload`; worker preloading

### Takeaway
- **Load first:** the dots skin, the HUD and the sim worker. That is ≈8.1 KB br of JS plus a 33 KB br binary map.
- **Start early:** the worker and the map fetch, from an inline `<head>` script.
- **Fetch after the first frame:** uPlot (20 KB br), lil-gui (7 KB br), and in idle time the town atlas.
- **Load on demand:** country mode, inspector and WebGPU.

Measured on Fast 4G + 4×:
- A single eager bundle delayed the first frame by +169 ms.
- Putting the PNG or WebP atlas on the critical path added +973 / +789 ms.
- Shipping the raw LDtk JSON added +717 ms.
- `modulepreload` of the worker alone gained nothing until the map fetch was also started early.

### Cited Findings
- **Chunk sizes of the split build (measured here; Vite 8.3.2; `perf-load/dist-app/split`).** Bytes as raw / gzip-9 / brotli-11.

  | Chunk | Raw | Gzip | Brotli | When |
  |---|---|---|---|---|
  | `index.html` (no inline boot script) | 1,022 | 601 | 414 | initial |
  | `index-*.js` entry (main, Comlink, HUD, WebGL dots renderer setup) | 9,814 | 4,389 | 3,973 | initial |
  | `dots-*.js` shared WebGL helper chunk (Vite auto-`modulepreload`) | 3,116 | 1,438 | 1,298 | initial |
  | `worker-*.js` (sim stand-in + Comlink) | 7,081 | 3,160 | 2,866 | initial, parallel |
  | `town-*.bin` map, 256×256 cells, 4 tile layers + IntGrid + 400 entities | 592,642 | 42,520 | 33,321 | initial |
  | `chart-*.js` (uPlot 1.6.32 + wrapper) + `chart-*.css` | 51,292 + 1,644 | 22,141 + 690 | 19,978 + 545 | after first frame |
  | `controls-*.js` (lil-gui 0.21.0; injects its own CSS) | 30,804 | 8,012 | 7,038 | after first frame |
  | `town-*.js` (town skin renderer) | 2,874 | 1,322 | 1,201 | on skin switch or idle prefetch |
  | `atlas2048-*.webp` (lossless; PNG fallback 472,311 B) | 291,538 | n/a | n/a | with town skin |
  | `country-*.js` (aggregate settlements + renderer stand-in) | 1,988 | 898 | 814 | on demand |
  | `inspector-*.js` | 398 | 248 | 185 | on click |
  | `webgpu-*.js` (compute path stub) | 914 | 574 | 502 | only if `navigator.gpu` |
  | Eager single bundle, for comparison (`index-*.js`) | 99,249 | 37,169 | 32,940 | initial |

  - Stand-in code is smaller than the real sim and renderer will be. The renderer prototype is said to be 3.6 KB gzip and the production renderer 6–10 KB. The library chunk sizes (uPlot ≈22 KB gz, lil-gui ≈8 KB gz) match the plan's figures. Source: measured here (`sizes.mjs`).
- **Variants on Fast 4G cold + 4×, 7 runs each (measured here, `startup-B.json`, `startup-C.json`):**
  - Eager single bundle: first frame 1,379 [1,351–1,407] ms (+169 vs split); interactive 1,544 [1,525–1,606] (−117 ms, because no second round trip for lazy chunks); 70.1 KB before first frame.
  - Split + `modulepreload` of the worker only: worker script arrived before `new Worker()` ran (899 vs 923 ms), so the worker reused the preloaded response. But first frame stayed 1,210 [1,194–1,262], because the map fetch (received 1,130 ms) became the critical path.
  - Early boot (inline classic script in `<head>` creates the module worker and starts the map `fetch`): first frame 1,058 [1,051–1,104], interactive 1,548.
  - Early boot + `modulepreload` of the lil-gui and uPlot chunks: first frame 1,078 [1,060–1,124], interactive 1,521 [1,490–1,585]; 69.7 KB before first frame. With `rel=prefetch` instead: 1,088 / 1,537.
  - Town skin first: with the PNG atlas, 472 KB arrives at 1,794 ms, decode 153 ms, upload 172 ms, first frame 2,183 [2,174–2,218]. With the WebP atlas, 292 KB at 1,608, decode 145, upload 172, first frame 1,999 [1,960–2,028].
  - Map as raw LDtk JSON (271 KB br): received 1,363 ms, worker parse 367 ms [336–413] at 4× emulated, first frame 1,926 [1,875–1,948].
- **Vite behaviour (opened).**
  - `build.modulePreload` defaults to `{ polyfill: true }` and accepts `resolveDependencies(filename, deps, …)` to filter or add preloads per dynamic import. [Vite build options](https://github.com/vitejs/vite/blob/main/docs/config/build-options.md)
  - Vite only detects a worker when `new URL('./worker.js', import.meta.url)` is written directly inside `new Worker(...)`, and options must be static literals (`{ type: 'module' }`). [Vite features: Web Workers](https://github.com/vitejs/vite/blob/main/docs/guide/features.md)
  - In the build here Vite emitted `assets/worker-[hash].js` and auto-injected `<link rel="modulepreload">` for the entry's static shared chunk (`dots-*.js`). Measured here.

### Inferences
- **Initial load (critical path).** `index.html` with ≤1 KB inline CSS and an inline boot script (≈0.3 KB) that:
  - creates the module worker;
  - starts `fetch()` of the binary map, then transfers the `ArrayBuffer` to the worker;
  - leaves the entry module (dots renderer, HUD, Comlink) and the worker as the only JS.
- **The boot script as measured.** A Vite `transformIndexHtml` hook (order `post`) injects it with the hashed names. `main.ts` then uses `window.__boot` when it exists:
  ```html
  <script>(function(){window.__boot={
    worker:new Worker('/assets/worker-[hash].js',{type:'module',name:'sim'}),
    mapP:fetch('/assets/town-[hash].bin').then(function(r){return r.arrayBuffer()})};
    performance.mark('worker:new')})()</script>
  ```
- **Why both downloads must start from the HTML.** The measured "modulepreload the worker only" variant gained nothing, because the map fetch then became the critical path. Both the worker script and the map must start from the HTML. The inline boot script does that.
  - An untested alternative is `<link rel=modulepreload>` for the worker plus `<link rel=preload as=fetch crossorigin>` for the map. It should work as long as the map stays a main-thread `fetch`, which then transfers to the worker. A preload made by the document is not reused by a `fetch()` issued inside the worker.
  - Either way the HTML needs the hashed file names. Inject them from Vite's bundle in a `transformIndexHtml` hook, as done in `perf-load/app/vite.config.ts`.
- **After first frame:** `modulepreload` (or `prefetch`) the lil-gui and uPlot chunks from the HTML so they download in parallel, but evaluate them only after the first frame, ideally in separate tasks.
- **Idle-time prefetch:** the town skin JS and the atlas (`requestIdleCallback` after interactive, or on hovering the skin selector). Decode the atlas with `createImageBitmap` off the critical path (section 4).
- **On demand:**
  - country mode (needs its own map/aggregate data);
  - the inspector (on first click);
  - the WebGPU path, behind `if ('gpu' in navigator)`, so non-WebGPU browsers never download it.
- **Never on the critical path:** the 2048² atlas (+0.8–1.0 s), LDtk JSON (+0.7 s at 4×), uPlot, lil-gui.

### Gaps
- `<link rel="preload" as="worker">` and `modulepreload` with `as="worker"` were not tested separately. Browser support for `as=worker` was not verified (caniuse and MDN are blocked).
- The stand-in sim and country code is much smaller than the real code, so the real initial JS will be larger. The budgets in section 8 include headroom for that.

---

## 4. Assets: PNG optimisers vs lossless WebP/AVIF on the real pixel art; decode times; atlas format; LDtk JSON vs compact binary

### Takeaway
- **Atlas format:** lossless WebP. For the atlas it is 38% smaller than the best PNG (285 KB vs 461 KB) and decodes as fast as PNG (65 vs 72 ms at 1×). On every image it was the smallest exact encoding.
- **Fallback:** keep an oxipng-optimised PNG only as a fallback. zopfli adds 1% at 10× the encode time.
- **pngquant:** lossless only when a sheet already has ≤256 colours, and then oxipng's own palette reduction gives the same bytes. The 1,115-colour atlas lost colours.
- **Avoid AVIF lossless:** 2.9× larger and 5× slower to decode.
- **Ship pixel art at native resolution:** 3× upscales cost 1.3–1.6× the bytes and 9× the pixels.
- **Maps:** convert LDtk JSON at build time to a compact binary. For the 256×256 town: 33 KB vs 271 KB brotli, and 0.4 ms vs 58 ms to parse at 1× (3 ms vs 277 ms at 4×).

### Cited Findings
- **Inputs.**
  - The 10 PNGs in `docs/mockups/` and `docs/mockups/previews/` (read-only, copies made).
  - The pinned Ninja Adventure `tileset.png` (sha256 `aa2708aa…f284a4`, matches SOURCES.md).
  - A realistic 2048×2048 atlas I shelf-packed from 236 real CC0 sheets: Ninja Adventure pack (rinn7e/ninja-adventure-indigo @83268ad), the mockup tileset and the Kenney previews. 75.2% fill, 1,115 unique RGBA colours.
  - Exactness was checked by decoding and comparing RGBA, with alpha-aware comparison: RGB under alpha=0 is ignored, which oxipng `--alpha` and cwebp alter.
  - Source: measured here (`perf-load/assets/run_assets.py`, `asset_results.json`). Encode times were taken under load ≈3.5 and are indicative only.
- **Sizes (KiB; "lossy" = not pixel-exact).**

  | Image (px, colours) | Original | oxipng -o max | oxipng -o max -Z | zopflipng -m | pngquant 256 + oxipng | WebP lossless -z 9 | AVIF lossless (sharp, effort 9) | AVIF q100 4:4:4 (Pillow) |
  |---|---|---|---|---|---|---|---|---|
  | cc0_asset_previews (1608×682, 593) | 76.6 | 53.0 | 51.5 | 51.5 | 33.8 (lossy) | **27.0** | 121.4 | 80.5 (lossy) |
  | city_zoomed_out (960×540, 180) | 43.6 | 19.6 | 19.4 | 19.5 | 19.6 | **17.7** | 122.3 | 82.5 (lossy) |
  | country_map (960×540, 78) | 35.4 | 15.2 | 15.0 | 15.4 | 15.2 | **14.1** | 83.0 | 57.3 (lossy) |
  | scale_ladder (1440×400, 245) | 61.5 | 26.8 | 26.6 | 26.6 | 26.8 | **23.8** | 85.5 | 61.1 (lossy) |
  | town_closeup (960×540, 206) | 28.0 | 13.4 | 13.2 | 13.2 | 13.4 | **10.8** | 65.2 | 48.1 (lossy) |
  | town_closeup_blobs (960×540, 151) | 26.3 | 12.3 | 12.2 | 12.2 | 12.3 | **9.9** | 62.7 | 44.4 (lossy) |
  | kenney emotes (80×96, 26) | 0.9 | 0.8 | 0.8 | 0.8 | 0.8 | **0.7** | 5.9 | 2.5 (lossy) |
  | kenney roguelike-modern-city (628×475, 169) | 45.2 | 22.6 | 22.3 | 22.4 | 22.5 | **20.7** | 144.0 | 91.5 (lossy) |
  | kenney rpg-urban tilemap (432×288, 112) | 16.9 | 15.1 | 15.1 | 15.1 | 15.1 | **14.6** | 87.1 | 63.5 (lossy) |
  | ninja Villager sheet (64×112, 10) | 4.9 | 0.9 | 0.9 | 0.9 | 0.9 | **0.9** | 13.5 | 15.2 (lossy) |
  | ninja tileset (448×640, 391) | 86.0 | 45.0 | 44.6 | 47.9 | 36.1 (lossy) | **34.7** | 112.9 | 107.5 (lossy) |
  | **atlas 2048² (1,115)** | 969.9 | 461.2 | 455.7 | 524.2 | 353.8 (lossy) | **284.7** | 1,340.3 | 1,186.8 (lossy) |

  - Atlas encode times: oxipng 36 s; oxipng -Z 376 s; zopflipng 196 s; pngquant 8 s; cwebp 12 s; AVIF 147 s.
  - Source: measured here.
- **Decode and upload in Chromium 141** (Blob already in memory, median of 11; measured here, `perf-load/bench-decode.mjs`, `decode.json`, load 1.26–1.62):

  | File | `createImageBitmap` @1× | `img.decode()` @1× | `texImage2D` RGBA8 + `finish` @1× (SwiftShader) | `createImageBitmap` @4× | `img.decode()` @4× | upload @4× |
  |---|---|---|---|---|---|---|
  | Atlas PNG (oxipng, 461 KB) | 71.5 ms [63.9–91.2] | 59.3 | 21.2 | 137.7 | 68.4 | 100.6 |
  | Atlas PNG8 (pngquant, lossy, 354 KB) | 42.3 [40.8–58.3] | 28.1 | 20.9 | 113.9 | 36.8 | 99.6 |
  | Atlas WebP lossless (285 KB) | 64.8 [58.1–78.7] | 53.6 | 20.5 | 137.5 | 65.1 | 103.0 |
  | Atlas AVIF lossless (1,340 KB) | 375.3 [354.1–534.7] | 380.8 | 21.5 | 451.9 | 391.6 | 103.2 |
  | town_closeup PNG / WebP / AVIF (13.4 / 10.8 / 65.2 KB) | 7.2 / 9.2 / 40.4 | 7.3 / 9.0 / 39.9 | 2.2 / 2.8 / 2.4 | 21.6 / 23.6 / 57.2 | 13.2 / 15.6 / 47.1 | — |

  - `img.decode()` was barely affected by CDP 4× main-thread throttling, so decoding happens off the main thread. `createImageBitmap(blob)` slowed 2× under throttling.
- **Native vs upscaled pixel art (measured here).** The four 960×540 mockups are exact 3× nearest-neighbour upscales of 320×180 (verified). At native size:
  - town_closeup: 8.4 KiB PNG / 8.0 KiB WebP, vs 13.4 / 10.8 at 3×;
  - city: 13.2 / 13.1 vs 19.6 / 17.7;
  - country: 10.5 / 10.5 vs 15.2 / 14.1.
- **LDtk sizes (measured here, `perf-load/ldtk/`).** The format is LDtk 1.5.3 (`jsonVersion` of the official samples in deepnight/ldtk @6d69bd1, 2026-07-12, opened). [LDtk samples](https://github.com/deepnight/ldtk/tree/6d69bd1d6be92f01ac30778f6a934f0da8448b16/app/extraFiles/samples)
  - The synthetic town reuses the sample's `defs` and the exact per-tile object shape (`{"px":[x,y],"src":[sx,sy],"f":0,"t":id,"d":[rule,cell],"a":1}`).
  - It has 5 layers: 65,536 floor tiles, 11,312 wall tiles, 1,925 wall tops, 4,065 decor tiles, and 400 entities.

  | File | Raw | gzip-9 | brotli-11 |
  |---|---|---|---|
  | Official `Typical_TopDown_example.ldtk` (pretty / minified) | 304,143 / 230,964 | 29,565 / 28,127 | 19,975 / 19,110 |
  | Official `WorldMap_GridVania_layout.ldtk` (pretty / minified) | 2,447,956 / 1,874,819 | 197,508 / 188,970 | 95,137 / 90,501 |
  | Town 128×128: LDtk pretty / LDtk minified / runtime-trimmed JSON / compact binary | 4,633,977 / 1,467,509 / 240,816 / 148,174 | 163,985 / 138,909 / 60,491 / 11,539 | 89,041 / 77,707 / 33,499 / **9,156** |
  | Town 256×256: LDtk pretty / LDtk minified / runtime-trimmed JSON / compact binary | 18,569,019 / 5,878,439 / 1,009,751 / 592,642 | 646,890 / 527,282 / 237,873 / 42,520 | 316,701 / 271,372 / 131,765 / **33,321** |

  - Compact binary layout: 16-byte header, then a `u8` IntGrid per cell, then four `u16[cells]` tile layers (14-bit tile id + 2 flip bits; `0xFFFF` = empty), then 7-byte entity records.
  - Runtime-trimmed JSON: only IntGrid plus `[cell, tile, flip]` triplets and entity tuples.
- **Parse cost in Chromium 141**, main thread, including building the typed arrays (measured here, `decode.json`):

  | Map | @1× | @4× |
  |---|---|---|
  | LDtk minified (5.9 MB) | 57.5 ms [48.2–157.2] | 277 ms [235–710] |
  | Trimmed JSON | 6.8 ms [5.4–9.8] | 40.8 ms [35.3–63.4] |
  | Binary | 0.40 ms [0.37–0.48] | 3.0 ms [1.3–4.5] |

  - In the full app, the LDtk path cost 367 ms of worker time at 4× emulated (section 3).
- **Cloudflare compression scope (opened).** Cloudflare compresses responses with gzip, Brotli or Zstandard only for a listed set of content types: `text/*`, `application/javascript`, `application/json`, `application/wasm`, `application/manifest+json`, `image/svg+xml`, `application/x-protobuf` and others.
  - `application/octet-stream` and images are not on the list.
  - Minimum response size: 48 B for gzip, 50 B for brotli and zstd.
  - [cloudflare-docs compression.mdx @c896795](https://github.com/cloudflare/cloudflare-docs/blob/c896795b8e8bab68d05ae78d64c9cbcda1fdb104/src/content/docs/speed/optimization/content/compression.mdx)

### Inferences
- **Atlas.** Use one lossless WebP (`cwebp -lossless -z 9`), 285 KB for a 75%-full 2048² atlas of real CC0 art.
  - Decode it with `createImageBitmap(blob, {premultiplyAlpha:'none', colorSpaceConversion:'none'})` in idle time, or in the worker via `OffscreenCanvas`/`createImageBitmap`.
  - Upload with `texStorage2D` + `texSubImage2D`, using NEAREST filtering and no mipmaps.
  - Keep `oxipng -o max --strip safe --alpha` as the PNG pipeline for sources. Do not use zopfli (−1% for 10× time) or AVIF.
  - WebP decoding is assumed to work in every browser that can run WebGL2. Support tables were not checked (caniuse is blocked), so treat this as a gap for very old iOS releases.
- **GPU memory is the same whatever the file format:** 2048² RGBA8 = 16 MiB.
  - Quarter it to 4 MiB by keeping the atlas at 1024² if the content fits. The mockup tileset plus the four preview sheets total ≈0.72 MP, so they would fill a 1024² atlas to ≈69%. The 2048² test atlas reached 75% only because ≈230 extra Ninja Adventure sheets were added.
  - Or quarter it to 4 MiB with an indexed R8 atlas plus a 256-entry palette texture, if each skin's palette stays ≤256 colours. That holds for every individual sheet measured here (10–593 colours), but not for the combined atlas (1,115 colours).
- **Maps.** Keep LDtk as the editing format. A build step (Vite plugin) emits the compact binary as `assets/town-[hash].bin`.
  - On Cloudflare, `.bin` served as `application/octet-stream` would go out uncompressed: 593 KB instead of 33 KB.
  - Two fixes: pre-gzip the file and decode it with `DecompressionStream('gzip')`, or serve it with a compressible `Content-Type` through `_headers`. Whether Cloudflare compresses based on a `_headers`-overridden content type was not verified.

### Gaps
- Decode and upload times come from Chromium with software GL. No Safari or real-GPU numbers were measured.
- Basis/KTX2 GPU-compressed textures (UASTC/ETC1S) were not tested. Their block artifacts on 16×16 pixel art and the transcoder size (~200 KB wasm) need their own trial.
- The synthetic town map's tile-variant randomness (80/20 base/variant) sets its compressibility. A real hand-made LDtk map may compress somewhat better or worse.

---

## 5. Caching and offline: service worker precache, hashed filenames, Brotli/gzip and cache headers on Cloudflare Pages and Netlify

### Takeaway
- **Bytes:** a precaching service worker was the largest repeat-visit win measured. On Fast 4G + 4×, the repeat-visit first frame dropped from ≈1.0 s (HTTP cache only, still paying connection setup plus the HTML round trip) to ≈0.36–0.39 s median, and the app then also started offline.
- **SW choice:** a hand-written SW (0.5 KB br) performed as well as Workbox via vite-plugin-pwa 2.0.0 (5.2 KB br including the Workbox runtime). Neither touches the page's critical path.
- **Hosting:** both hosts default to revalidate-every-time caching: Cloudflare Pages sends `public, max-age=0, must-revalidate` + ETag, and Netlify's documented default is the same `max-age=0, must-revalidate, public` (snippet only).
- **Cache rule:** set `Cache-Control: public, max-age=31536000, immutable` for Vite's `/assets/*` (content-hashed), and leave `index.html` and `sw.js` on the defaults.

### Cited Findings
- **Cloudflare Pages defaults (opened).**
  - Pages "always sends `Etag` headers for `200 OK` responses" and answers matching `If-None-Match` with `304`.
  - It "will also serve Gzip and Brotli responses whenever possible".
  - Default headers include `Cache-Control: public, max-age=0, must-revalidate` when the asset is cacheable, and `Cache-Control: no-transform` + `Content-Encoding` when the asset has been encoded.
  - The edge cache keeps assets per data centre with "a time-to-live (TTL) of one week".
  - [serving-pages.mdx @c896795](https://github.com/cloudflare/cloudflare-docs/blob/c896795b8e8bab68d05ae78d64c9cbcda1fdb104/src/content/docs/pages/configuration/serving-pages.mdx)
- **Cloudflare `_headers` file (opened).**
  - A plain-text file in the output directory with URL patterns and indented headers.
  - "You may define up to 100 header rules. Each line … has a 2,000 character limit."
  - Rules do not apply to Pages Functions responses.
  - Example in the docs: `Cache-Control: public, max-age=31556952, immutable`.
  - [headers.mdx](https://github.com/cloudflare/cloudflare-docs/blob/c896795b8e8bab68d05ae78d64c9cbcda1fdb104/src/content/docs/pages/configuration/headers.mdx)
  - Workers Static Assets uses the same default (`public, max-age=0, must-revalidate` + ETag) and the same `_headers` mechanism, including `! Header` to remove a header. [workers/static-assets/headers.mdx](https://github.com/cloudflare/cloudflare-docs/blob/c896795b8e8bab68d05ae78d64c9cbcda1fdb104/src/content/docs/workers/static-assets/headers.mdx)
- **Cloudflare compression (opened).**
  - gzip, Brotli and Zstandard; Zstandard is enabled through Compression Rules.
  - Only 200 responses (and 403/404) are compressed, and only for the listed content types (section 4).
  - When it compresses, Cloudflare "may omit the `Content-Length`"; `cache-control: no-transform` from the origin prevents that.
  - [compression.mdx](https://github.com/cloudflare/cloudflare-docs/blob/c896795b8e8bab68d05ae78d64c9cbcda1fdb104/src/content/docs/speed/optimization/content/compression.mdx)
- **Netlify (snippet only; docs.netlify.com and developers.netlify.com are blocked here).**
  - Default `cache-control` is "max-age=0, must-revalidate, public", while the Netlify CDN caches static assets itself ("public, s-maxage=31536000, must-revalidate" at the edge), per the search summary of [Netlify Caching overview](https://docs.netlify.com/build/caching/caching-overview/).
  - Netlify parses header rules "from both `_headers` and `netlify.toml`" (opened). [netlify/build headers-parser README](https://github.com/netlify/build/blob/main/packages/headers-parser/README.md)
  - I found no openable source for Netlify's Brotli behaviour.
- **Tooling (opened).**
  - vite-plugin-pwa 2.0.0 is "Zero-config PWA Framework-agnostic Plugin for Vite", MIT, and generates "service worker with offline support (via Workbox)". [vite-plugin-pwa README](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/README.md)
  - Workbox is MIT ("Copyright 2018 Google LLC"). [Workbox LICENSE](https://github.com/GoogleChrome/workbox/blob/v7/LICENSE)
  - Versions from npm: workbox-build 7.4.1, workbox-window 7.4.1, vite-plugin-pwa 2.0.0.
- **Service worker sizes (measured here; built from the same app, `perf-load/dist-app/pwa-*`).**
  - **vite-plugin-pwa 2.0.0, `generateSW`, Workbox 7.4.1.** Output: `sw.js` 1,419 B raw / 772 gz / 671 br, plus `workbox-*.js` 14,617 / 5,048 / 4,565, plus an inline registration script in `index.html`.
    - Precache manifest: 13 entries (HTML, every JS/CSS chunk, the `.bin` map, the WebP atlas).
    - I had to raise `maximumFileSizeToCacheInBytes` to admit large files, and set `ignoreURLParametersMatching` for the app's own query parameters. Without it a URL like `/index.html?wslow=4` missed the precached HTML and the offline start failed (5 of 5 runs, measured).
  - **Hand-written SW** (≈30 lines, generated in a Vite `generateBundle` hook with the hashed file list; cache-first for assets, cache-first with background refresh for navigations): `sw.js` 1,105 B raw / 584 gz / 520 br.
- **Repeat visits and offline (measured here, `perf-load/bench-repeat.mjs`).**
  - Method: the first visit is unthrottled and waits for SW activation and a complete precache. Then `about:blank`, then a repeat navigation under Fast 4G cold (3-RTT setup) + 4× CPU. 5 runs each.
  - Load was 1.9–5.0 because the other agent was busy, so treat these as upper bounds. The SW runs were bimodal: most were ≈330–400 ms, one or two were ≈0.8–1.1 s.

  | Variant | Repeat visit: first frame / interactive (ms) | Network bytes on repeat | Offline start |
  |---|---|---|---|
  | No SW, HTTP cache only (`immutable` assets, `no-cache` HTML) | 999 [986–1,033] / 1,324 [1,303–1,357] | 0.9 KB (HTML) | fails (0/5) |
  | Hand-written SW (0.5 KB br) | 379 [329–924] / 703 [667–1,270] | 0 | works (5/5): 837 [330–1,019] / 1,158 |
  | Workbox via vite-plugin-pwa | 361 [329–872] / 665 [638–1,181]; second batch 394 [325–1,077] / 726 | 0 | works (5/5): 344 [327–806] / 706; second batch 876 [343–980] |

### Inferences
- **`_headers` for both hosts** (the same syntax works on Cloudflare Pages and Netlify):
  ```
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  /sw.js
    Cache-Control: no-cache
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```
  - COOP/COEP are needed for `SharedArrayBuffer` and for `performance.measureUserAgentSpecificMemory`. Leave `index.html` on the default `max-age=0, must-revalidate`, so ETag revalidation costs one RTT and no body.
- **Service worker.** Precache the app shell (`index.html`, every hashed JS/CSS chunk), the binary maps and the WebP atlas. That was about 1 MB uncompressed here.
  - Leave the raw `.ldtk` and the PNG fallbacks out.
  - Serve navigations cache-first and refresh in the background. Then a repeat visit skips the connection setup and HTML round trip, which was ≈660 ms of the ≈1.0 s HTTP-cache-only repeat visit.
  - Register the SW after the `load` event, so it does not compete with the first-visit critical path. Pre-caching ≈1 MB then happens in the background.
  - **Choose vite-plugin-pwa (Workbox)** if you want update flows, revisioning and stale-cache cleanup off the shelf (MIT, +5.2 KB br fetched only by the SW). **Choose a ≈30-line hand-written SW** for the smallest result. Both measured about the same.
- **Hashed filenames.** Vite's default `assets/[name]-[hash].js` naming, and its hashed `?url` imports for maps and atlas as used here, make `immutable` safe. Only `index.html` and `sw.js` need revalidation.
- **Compression:** do not upload `.br` files to Cloudflare Pages. It compresses at the edge. Make sure every text-like asset has a compressible MIME type; the binary map does not by default (section 4).

### Gaps
- Netlify's compression behaviour and the exact header precedence between `_headers` and `netlify.toml` could not be confirmed from an openable source.
- A real CDN round trip (edge TTFB, 304 revalidation cost) was not measured.
- Workbox's precache-size limit default (`maximumFileSizeToCacheInBytes`, believed to be 2 MiB) was set explicitly here and not verified against Workbox docs.

---

## 6. Memory: JS heap and GPU memory at 10k / 25k / 100k agents plus the atlas; per-tier budgets; iOS Safari limits

### Takeaway
The app's own memory is small, and the browser's fixed overhead dwarfs it. Chromium 141 measured:
- **Agents and canvas:** 10k agents used 12.3 MB in all (`measureUserAgentSpecificMemory`: main JS 1.2, worker JS including typed arrays 1.8, canvas 8.4 MB). 100k agents used 17.0 MB (main 2.7, worker 5.0, canvas 8.4).
- **Atlas:** the 2048² atlas added ≈16 MB of GPU-process memory (+15.5 MB PSS), as expected for 16 MiB of RGBA8.
- **Browser overhead:** the whole browser (browser + renderer + SwiftShader GPU process) was ≈389 MB PSS with zero agents.
- **The real memory risks:**
  - canvas drawing buffers at high devicePixelRatio (≈24 MB at DPR 3 on a 1170×2532 phone);
  - the atlas, which is 16 MiB whatever the file format;
  - any WASM reservation (32–128 MB per `compute.md`).
- **Proposed budgets (app-attributable):** ≤ 64 MB on a 10k phone, ≤ 72 MB at 25k, ≤ 160 MB on 100k desktop (more if WASM memory is reserved). Keep the whole iOS tab well under ≈300 MB.

### Cited Findings
- **Per-tier memory (measured here; `perf-load/bench-memory.mjs`, `memory.json`).**
  - Setup: full Chromium 141 binary in new-headless mode (chrome-headless-shell lacks `measureUserAgentSpecificMemory`), 1280×800 viewport, page cross-origin isolated.
  - Each value was taken 3 s after "interactive" with the sim running at 30 Hz. Median of 3 fresh contexts; reps varied ≤ 0.6 MB.
  - Load average was 3.4–4.9 during these runs. Memory figures do not depend on load.

  | Config | uASM total (MB) | Window JS | Worker JS (incl. typed arrays) | Canvas | Sim typed arrays (worker-reported) | Renderer PSS | GPU-process PSS (RSS) | All Chromium processes PSS |
  |---|---|---|---|---|---|---|---|---|
  | 0 agents (map only) | 11.8 | 1.1 | 1.4 | 8.4 | 1.06 | 96.4 | 113.0 (163.6) | 388.7 |
  | 10k agents | 12.3 | 1.2 | 1.8 | 8.4 | 1.42 | 100.3 | 119.2 (170.3) | 399.3 |
  | 25k agents | 13.1 | 1.4 | 2.3 | 8.4 | 1.97 | 101.5 | 120.8 (172.0) | 403.1 |
  | 100k agents | 17.0 | 2.7 | 5.0 | 8.4 | 4.69 | 107.8 | 123.1 (175.6) | 411.0 |
  | 10k + town skin (2048² WebP atlas) | 12.8 | 1.9 | 1.8 | 8.4 | 1.42 | 110.2 | 134.7 (193.5) | 424.0 |
  | 100k + town skin | 16.8 | 3.0 | 5.0 | 8.4 | 4.69 | 118.2 | 134.7 (193.5) | 431.6 |

  - Worker JS grew by 3.2 MB from 10k to 100k agents, ≈36 B per agent for the stand-in SoA sim. `measureUserAgentSpecificMemory` counts ArrayBuffer backing stores inside "JavaScript".
  - "Canvas" (8.4 MB) is two 1280×800 RGBA buffers (2 × 4.1 MB).
  - CDP `JSHeapUsedSize` (main thread only) stayed at 1.8–2.0 MB in every tier, so it misses worker and canvas memory.
- **WebKit source: memory policy (opened).** `MemoryPressureHandler::Configuration` uses `baseThreshold = min(3 GB, ramSize())`.
  - On iOS it enters the "Conservative" memory policy at 0.5 × base and "Strict" at 0.65 × base. On macOS the factors are 0.33 and 0.5.
  - With ≥3 GB of RAM that means Conservative at 1.5 GB and Strict at 1.95 GB of footprint.
  - The same file sets WebKit's own kill thresholds. For an active 64-bit process: 7 GB (15 GB if RAM > 16 GB) + 1 GB per tab. For an inactive process: min(3 GB + 1 GB per tab, 0.9 × RAM). The iOS jetsam limit is separate from these, and Apple does not publish it.
  - [WebKit MemoryPressureHandler.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/MemoryPressureHandler.cpp)
- **WebKit canvas limit (opened).** The maximum canvas area is `8192 * 8192` pixels on iOS and `16384 * 16384` elsewhere; above it, WebKit logs "Canvas area exceeds the maximum limit". [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp)
- **iOS tab budgets (snippet only).**
  - One summary says there is no fixed per-tab limit: the web content process gets the lower of WebKit's pressure limit and jetsam's.
  - Reports in the same summary: iPhone 15 Pro/Pro Max ≈3 GB before reload; iPhone 12 Pro ≈1.5 GB (≈3 GB right after reboot); low-RAM devices on iOS 26.2 crashing at 100–200 MB of JS memory.
  - Source: [Nehanth/pooled issue #207](https://github.com/Nehanth/pooled/issues/207).
  - Unity WebGL guidance says iOS Safari "enforces a roughly 300–500 MB limit on the WebGL heap". [bugnet.io](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)
  - Safari logs "Total canvas memory use exceeds the maximum limit (384 MB)" on iOS 15 ([react-pdf #1601](https://github.com/wojtekmaj/react-pdf/issues/1601)); 224 MB is cited in other reports ([Apple forums](https://developer.apple.com/forums/thread/112218)).
  - All of these are snippet only, not opened.
- **Measurement API (opened).**
  - `performance.measureUserAgentSpecificMemory()` "estimates memory usage of a web page including all its iframes and workers". It is "available only for cross-origin isolated web pages that opt in using the COOP+COEP headers", and its breakdown can attribute memory to `DedicatedWorkerGlobalScope`. [WICG performance-measure-memory](https://github.com/WICG/performance-measure-memory/blob/main/README.md)
  - In `chrome-headless-shell` 141 it threw `SecurityError: … is not available` even when cross-origin isolated. The full Chromium binary (new headless) was needed (measured here).

### Inferences
- **GPU memory arithmetic.** The measured GPU-process delta agrees with these figures.
  - Atlas 2048² RGBA8 = 16 MiB; with mipmaps, which pixel art does not need, it would be 21.3 MiB.
  - Map grid R8UI 256² = 64 KB.
  - Dots instance data = 9 B/agent (0.9 MB at 100k).
  - Town instances = 10 B each × (83k map tiles + agents), ≈1.8 MB at 100k. Upload the static map tiles once; the stand-in rebuilt them every frame.
  - Each RGBA drawing buffer = width × height × 4. At DPR 3 on a 1170×2532 phone that is 11.9 MB; double-buffered ≈24 MB.
  - Cap the canvas backing store at DPR ≤ 2, or render pixel art at native resolution and upscale with CSS `image-rendering: pixelated`.
- **Proposed per-tier memory budgets.** App-attributable means `measureUserAgentSpecificMemory` plus the GPU arithmetic above. CI gates take uASM and GPU-process PSS deltas.

  | Tier | Main JS | Worker (JS + typed arrays; + reserved WASM if used) | Canvas buffers | GPU textures + buffers | App total | Measured now (stand-in) |
  |---|---|---|---|---|---|---|
  | Phone, 10k agents | ≤ 8 MB | ≤ 16 MB (+32 MB WASM) | ≤ 16 MB (DPR ≤ 2) | ≤ 24 MB | ≤ 64 MB (≤ 96 with WASM) | 1.2 / 1.8 / 8.4 / 16.8 |
  | Capable phone, 25k | ≤ 8 MB | ≤ 24 MB (+32 MB WASM) | ≤ 16 MB | ≤ 24 MB | ≤ 72 MB (≤ 104) | 1.4 / 2.3 / 8.4 / 16.8 |
  | Desktop, 100k | ≤ 16 MB | ≤ 64 MB (+64–128 MB WASM) | ≤ 32 MB (2560×1440 at DPR 1–2) | ≤ 48 MB | ≤ 160 MB (≤ 288) | 2.7 / 5.0 / 8.4 / 18.6 |

  - Worker budgets leave room for `compute.md`'s "≤ 256 B/agent hot SoA + 24 B/agent snapshot" cap: 2.8 MB at 10k, 7 MB at 25k, 28 MB at 100k.
  - Country mode with 10k settlements at ≤ 1 KB each (`compute.md`) adds ≤ 10 MB to the worker.
- **iOS.**
  - WebKit's own policy starts shedding at 1.5 GB of footprint on ≥3 GB devices (opened source).
  - The reported crash and reload levels are far lower on small devices, as low as 100–200 MB of JS on low-RAM iPhones (snippet only).
  - The app total above (≤ 64–104 MB) plus WebKit's own tab overhead should stay well clear. Never create extra full-screen canvases or keep decoded `ImageBitmap`s alive: call `bmp.close()` after upload, as done here.
- **Leak gate.** After startup, run the sim for 60 s. Fail if uASM grows by more than 2 MB, or if any tier exceeds its budget. The stand-in allocates a new `Float32Array` per snapshot, about 0.9 MB/s at 100k and 30 Hz; that is GC churn, not a leak. Use pooled or `SharedArrayBuffer` double buffers in production.

### Gaps
- GPU memory was inferred from GPU-process PSS under SwiftShader plus arithmetic. Real-GPU drivers (Adreno, Mali, Apple) allocate differently, and on iOS GPU memory counts toward the WebContent/GPU process footprint.
- No Safari or iOS measurement was possible. The iOS limits above are snippet-level reports, not Apple documentation; Apple does not publish jetsam limits.

---

## 7. CI gates: bundle budgets (size-limit vs bundlewatch), Lighthouse CI vs Playwright startup benchmark, memory check, frame-time benchmark

### Takeaway
- **Bytes:** size-limit 14.1.0 with brotli by default, run locally and with no external service. It gates the initial and each lazy chunk.
- **Startup:** a Playwright benchmark of 7 cold loads.
  - Network throttling in the static server, because CDP misses worker requests.
  - CDP CPU throttling for the main thread, with the rate calibrated so the runner's Lighthouse BenchmarkIndex lands at ≈375.
  - A busy-wait multiplier for the worker.
  - It asserts medians against absolute budgets, plus a regression check (> 15% and > 20 ms) against main's baseline.
- **Memory:** `measureUserAgentSpecificMemory` in full Chromium.
- **Frame time:** main-thread upload+draw and worker step at 10k/25k/100k.
- **Lighthouse CI 0.15.1:** optional. Its `user-timings:<kebab-name>` assertions can gate the `frame:first` mark under `devtools` throttling, but it cannot throttle the worker.

### Cited Findings
- **size-limit (opened).**
  - "`@size-limit/file` checks the size of files with Brotli (default), Gzip or without compression."
  - Per check: `path` (globs/arrays), `limit` (`"10 kB"`, `"500 ms"`), `gzip: true`, and `brotli: false` (no compression).
  - The PR-comment action is `andresz1/size-limit-action`.
  - [ai/size-limit README](https://github.com/ai/size-limit/blob/main/README.md)
  - The `.size-limit.json` in section 8 ran green on the measured build (size-limit 14.1.0, measured here, `perf-load/sl/`):
    - index.html 623 B, initial JS 8.35 kB, uPlot chunk 19.98 kB, lil-gui 7.04 kB, town skin 1.2 kB, country 814 B, inspector 185 B, WebGPU 502 B (all brotli);
    - map 33.32 kB brotli; atlas 291.54 kB uncompressed.
    - Tightening the chart limit to 15 kB printed "Package size limit has exceeded by 4.98 kB" and exited with code 1.
- **bundlewatch 0.4.2 (opened).**
  - Config is `files: [{ path, maxSize, compression? }]`, default `defaultCompression: 'gzip'` (also `brotli` with the `brotli-size` package, or `none`).
  - PR status needs `BUNDLEWATCH_GITHUB_TOKEN` from the bundlewatch.io service.
  - Sources: [bundlewatch README](https://github.com/bundlewatch/bundlewatch/blob/master/README.md); npm tarball `lib/app/config/getConfig.js` and `ensureValid.js`.
- **Lighthouse CI (opened).**
  - `collect.staticDistDir` serves a static build. `numberOfRuns` defaults to 3.
  - Assertions are `level | [level, {minScore|maxNumericValue|maxLength, aggregationMethod}]`; `aggregationMethod` is one of `median`, `optimistic` (the default), `pessimistic`, `median-run`.
  - User timings are asserted as `"user-timings:<kebab-cased-name>": ["error", {"maxNumericValue": …}]`.
  - [lighthouse-ci configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)
  - The source kebab-cases names with `_.kebabCase(name, {alphanumericOnly: true})`, and uses `startTime` for marks. So a mark named `frame:first` is asserted as `user-timings:frame-first`. [assertions.js](https://github.com/GoogleChrome/lighthouse-ci/blob/main/packages/utils/src/assertions.js)
  - Lighthouse's default `simulate` throttling computes FCP/LCP with Lantern from an unthrottled load, so custom marks reflect the unthrottled run. Use `throttlingMethod: "devtools"` when gating marks. [throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- **Current GitHub Action tags** (`git ls-remote`, October 2026): actions/checkout v7.0.1, actions/setup-node v7.0.0, actions/upload-artifact v7.0.1, actions/download-artifact v8.0.1, actions/cache v6.1.0, andresz1/size-limit-action v1.8.0, treosh/lighthouse-ci-action v12.
- **Startup benchmark design (measured here).** `perf-load/bench-startup.mjs` plus `perf-load/ci/assert-startup.mjs`:
  - On the headline run the assertion printed `ok` for firstFrame 1209.8 ≤ 1500, interactive 1661.2 ≤ 2000, glReadyMs 53 ≤ 120, parseMs 2.6 ≤ 10, spawnMs 36.8 ≤ 80, initialKB 42.5 ≤ 60, totalKB 70.3 ≤ 120.
  - It printed `FAIL` when pointed at the Slow 4G results (first frame 3,804 > 1,500).
  - Run-to-run spread of first frame on this shared VM was ±3% (min–max 1,179–1,234 ms over 7 runs) under the deterministic server-side network model.
- **Frame-time benchmark (measured here; `perf-load/bench-frames.mjs`, `frames2.json`; an earlier batch at load 3–5 agreed within ≈15%, `frames.json`).**
  - Setup: 1280×800, 5 s of the running app after startup, 3 fresh loads per row.
  - Gate load ≤ 1.46 and run load 1.2–3.5, except the last row (4.3–4.8). Upper bounds.
  - "Main" is the main-thread `requestAnimationFrame` callback: buffer upload + draw-call submission.
  - "Worker step" is the stand-in sim step plus snapshot packing in the live 30 Hz loop. "Step bench" is 100 back-to-back steps.
  - At 4× the worker is slowed with the busy-wait multiplier.
  - rAF/s is SwiftShader-limited. Its software rasteriser and compositor cap the frame rate.

  | Config | rAF/s (SwiftShader) | Main per frame, median (p95) ms | Worker step, live (p95) ms | Step bench (p95) ms |
  |---|---|---|---|---|
  | Dots, 10k @1× | 30 | 0.13 (0.31) | 1.70 (6.63) | 1.08 (2.08) |
  | Dots, 25k @1× | 24.4 | 0.18 (0.39) | 4.05 (10.4) | 2.51 (4.65) |
  | Dots, 100k @1× | 13.4 | 0.40 (2.81) | 17.5 (31.0) | 11.3 (20.4) |
  | Dots, 10k @4× | 24.2 | 0.17 (1.99) | 8.0 (23.8) | 4.54 (7.99) |
  | Dots, 25k @4× | 18.6 | 0.60 (3.2) | 15.3 (42.9) | 11.6 (21.0) |
  | Dots, 100k @4× | 10.8 | 1.44 (6.8) | 60.0 (107) | 51.4 (99.5) |
  | Town skin, 10k @1× | 5.2 | 1.29 (1.57) | 1.64 (3.0) | 1.00 (1.18) |
  | Town skin, 10k @4× (load 4.3–4.8) | 5.4 | 6.47 (8.88) | 6.96 (19.9) | 5.12 (9.46) |

  - The town stand-in rebuilds its 83k static map-tile instance arrays every frame, which explains its 1.3/6.5 ms. The real renderer should upload static layers once.
- **Lighthouse CI, local run (measured here; `perf-load/lhci/`; @lhci/cli 0.15.1 bundling Lighthouse 12.6.1; full Chromium 141; 3 runs; load ≈1.8–3).** The `lighthouserc.json` from section 8 with `devtools` throttling passed every assertion on the build.
  - `frame:first` mark 955 / 680 / 681 ms; `app:interactive` 1,556 / 1,233 / 1,086 ms.
  - FCP 1,425 / 1,094 / 928 ms; TBT 89 / 75 / 54 ms; total bytes 94,348.
  - BenchmarkIndex reported by Lighthouse: 1,150–1,629.
  - LHCI's marks match the warm-connection Playwright figure (691 ms), because LHCI models neither connection setup nor worker requests.
  - FCP fires on the HUD text mounted after the WebGL frame, so it is a poor proxy for "first frame" in this app.
- **Cross-reference.** `compute.md` (parallel notes) recommends gating CPU micro-benchmarks on the **min of ≥9 samples** on shared runners, with a calibration kernel and a loadavg record.
  - Startup gates here use the median of 7, because network emulation dominates and is deterministic.
  - `assert-startup.mjs` compares medians against the baseline too. Switching its regression check to min-of-runs would resist noise further; that was not implemented.

### Inferences
- Use size-limit, not bundlewatch: no third-party service and brotli by default. Bundlewatch's value is its hosted PR status, which needs a token from bundlewatch.io.
- Do not trust Lighthouse CI alone for this app:
  - its network emulation does not reach dedicated-worker requests;
  - its CPU throttling does not reach the worker;
  - the 'simulate' mode ignores user timings.
- Keep LHCI as a secondary, non-blocking job for regressions in FCP, TBT and total bytes.
- Calibrate CPU throttling per runner. GitHub-hosted runners differ from this VM. Choose `rate = BenchmarkIndex(1×) / 375`, clamped to 1–10, so "mid-tier phone" means the same thing on every runner (`perf-load/ci/calibrate.mjs`).
- Gate structure:
  - absolute budgets on medians;
  - regression > 15% (and > 20 ms) against a baseline cached from `main`;
  - re-run once when 1-minute load is > 1.5 on self-hosted machines.

### Gaps
- The GitHub Actions workflow in section 8 was not executed on GitHub (no repository or runner was available). The scripts and Lighthouse CI ran locally only, and the YAML was checked only by inspection.
- Run-to-run noise on GitHub-hosted runners, and their BenchmarkIndex, were not measured. The calibration step is the mitigation, but its stability on hosted runners is unverified.
- `assert-memory.mjs` and `assert-frames.mjs` are specified in the workflow but were not written. Only `assert-startup.mjs` exists and was tested.

---

## 8. Deliverable: budget table and CI configuration

### Takeaway
In production, ship ≤ 100 KB (brotli) before the first frame: ≤ 35 KB br of JS, a ≤ 40 KB br binary map, and HTML. The stand-in build is gated at ≤ 60 KB and measured 42.5 KB in total. On Fast 4G, 100 KB is ≈0.1 s of transfer.
- First frame ≤ 1.5 s and interactive ≤ 2.0 s on cold Fast 4G with mid-tier-phone CPU. Measured 1.06–1.21 s and 1.52–1.66 s.
- Repeat visit with a service worker: first frame ≤ 0.6 s. Measured ≈0.36–0.39 s median.
- Memory, app-attributable: ≤ 64 / 72 / 160 MB for the 10k / 25k / 100k tiers. Measured 12–17 MB plus a 16 MiB atlas.
- Enforce with size-limit, a Playwright startup/memory/frame benchmark on a calibrated CPU, and an optional Lighthouse CI job. The configuration below was run locally against the measured build.

### Cited Findings
**A. Byte budgets.** Brotli unless noted; 1 kB = 1,000 B, as size-limit counts. "Measured" is the stand-in build, measured here (section 3, `perf-load/sl/` size-limit run).

| Item | Measured br (gz) | Budget | Gate |
|---|---|---|---|
| `index.html` incl. critical CSS + inline boot script | 0.41–0.62 kB (0.60–0.82) | ≤ 1.5 kB | size-limit |
| Initial JS: entry + shared GL chunk + sim worker | 8.35 kB (9.0) | stand-in ≤ 12 kB; production ≤ 35 kB (renderer ≤ 10, sim worker ≤ 15, HUD/UI ≤ 6, Comlink + glue ≤ 4) | size-limit |
| Town map, compact binary 256² | 33.3 kB (42.5) | ≤ 40 kB per town map; serve with a compressible type or pre-gzip | size-limit |
| Bytes on the wire before first frame (HTML + initial JS + map) | 42.5 KB | ≤ 60 KB (stand-in), ≤ 100 KB (production) | startup bench `initialKB` |
| Lazy: lab chart, uPlot | 20.0 kB + 0.5 CSS (22.1 + 0.7) | ≤ 21 kB | size-limit |
| Lazy: controls, lil-gui | 7.0 kB (8.0) | ≤ 8 kB | size-limit |
| Lazy: UI shell framework, if used (Solid floor / Preact+signals floor) | 3.6 / 7.3 kB (4.0 / 8.0) | ≤ 8 kB | size-limit |
| Lazy: town skin JS | 1.2 kB (1.3) | ≤ 4 kB | size-limit |
| Lazy: atlas 2048² lossless WebP (sent as is) | 291.5 kB | ≤ 300 kB (PNG fallback ≤ 475 kB) | size-limit (`brotli:false`) |
| Lazy: country mode JS (+ country data) | 0.8 kB stand-in | ≤ 10 kB JS + ≤ 60 kB br data | size-limit |
| Lazy: inspector | 0.2 kB stand-in | ≤ 3 kB | size-limit |
| Lazy: WebGPU path | 0.5 kB stand-in | ≤ 8 kB | size-limit |
| Service worker (hand-written / Workbox incl. runtime) | 0.52 / 5.2 kB | ≤ 6 kB | size-limit |
| Everything (all chunks + map + atlas) | ≈363 kB | ≤ 450 kB | LHCI `total-byte-weight` |

**B. Startup stage budgets.** Cold Fast 4G (165 ms latency, 9 Mbps × 0.9, 3-RTT connection setup), CPU calibrated to BenchmarkIndex ≈375 (CDP 4× on the reference VM), worker slowed by the same factor. Median of 7 runs; ms from navigation start unless marked "+". Measured here (section 2).

| Stage | Measured: split | Measured: early boot | Budget |
|---|---|---|---|
| Connection + HTML received | 669 | 671 | ≤ 700 (network-bound; informational) |
| Entry JS download after HTML | +227 | +235 | ≤ +250 |
| Entry parse/compile/evaluate | 14 | 13 | ≤ 30 |
| Worker start (`new Worker` → top-level evaluated) | 189 (serial) | 226 (overlaps entry) | ≤ 250, and must start before the entry module evaluates |
| Map fetch (binary) / parse | 207 / 2.6 | 215 overlapped / 2.6 | fetch ≤ 250; parse ≤ 10 |
| Spawn agents (worker) | 37 (10k), 53 (25k), 114 (100k) | 33 (10k) | ≤ 60 (10k), ≤ 80 (25k), ≤ 150 (100k) |
| WebGL2 context + programs (overlapped) | 53 | 45 | ≤ 80 (fail at > 120) |
| **First frame** | **1,210** | **1,058** | **≤ 1,500** |
| Chunks after first frame (lil-gui + uPlot evaluated) | +298 (1,414 − 1,116, early-mp) | — | ≤ +350 |
| **Interactive** | **1,661** | **1,548** | **≤ 2,000** |
| Long tasks during startup | sum 291, largest LoAF ≈90–120 | sum 294 | no single task > 120; sum ≤ 400 |
| Atlas fetch + decode + upload (idle, off the critical path) | WebP 292 KB: ≈450 ms fetch alone on Fast 4G (computed: 1 RTT + 292 KB ÷ 1.01 MB/s). When requested at startup it arrived ≈710 ms after the entry evaluated (1,608 vs 898 ms), including the town-chunk round trip. + 145 decode + 172 upload (SwiftShader) | — | ≤ 800 total, after interactive only |
| Repeat visit with SW: first frame / interactive | 361–394 / 665–726 | — | ≤ 600 / ≤ 1,000 |
| Desktop, unthrottled: first frame / interactive | 111 / 190 | 111 / 195 | ≤ 300 / ≤ 500 |
| Slow 4G + 4×: first frame (informational) | 3,804 | 3,192 | ≤ 4,000 |

**C. Memory budgets per tier.** App-attributable: `measureUserAgentSpecificMemory` plus GPU arithmetic. Measured here (section 6).

| Tier | Budget: main JS / worker / canvas / GPU / total | Measured: main / worker / canvas / GPU (atlas + buffers) |
|---|---|---|
| Phone, 10k | 8 / 16 (+32 WASM) / 16 / 24 / **≤ 64 MB** (≤ 96 with WASM) | 1.2 / 1.8 / 8.4 / ≈16.8 |
| Capable phone, 25k | 8 / 24 (+32 WASM) / 16 / 24 / **≤ 72 MB** (≤ 104) | 1.4 / 2.3 / 8.4 / ≈16.8 |
| Desktop, 100k | 16 / 64 (+64–128 WASM) / 32 / 48 / **≤ 160 MB** (≤ 288) | 2.7 / 5.0 / 8.4 / ≈18.6 |
| Leak check (any tier) | uASM growth ≤ 2 MB over 60 s of running | n/a |
| iOS whole-tab ceiling (guidance) | keep total footprint well under ≈300 MB; WebKit's own "Conservative" policy starts at 1.5 GB on ≥3 GB devices | not measurable here |

**D. Frame-time budgets.** CPU-side, SwiftShader, so these gate regressions in our code, not GPU throughput. Measured here (section 7).

| Metric | Measured (stand-in, median / p95) | Budget (gate) |
|---|---|---|
| Main-thread upload + draw per frame, dots, phone tiers (10k / 25k @4×) | 0.17 / 1.99 and 0.60 / 3.2 ms | median ≤ 1 ms (10k), ≤ 2 ms (25k); p95 ≤ 4 / ≤ 6 ms |
| Main-thread upload + draw per frame, dots, desktop (100k @1×) | 0.40 / 2.81 ms | median ≤ 1 ms; p95 ≤ 4 ms |
| Main-thread upload + draw per frame, town skin 10k (@1× / @4×) | 1.29 / 1.57 and 6.47 / 8.88 ms (rebuilds static tiles every frame) | median ≤ 2 ms @1×, ≤ 4 ms @4×, after uploading static layers once |
| Worker sim step | stand-in 10k: 1.08 @1×, 4.54 @4×; 100k: 11.3 @1× | use `compute.md`'s per-tier tick budgets (for example 5.3 ms on the reference machine for 10k on phones, 12 ms desktop) and its min-of-≥9-samples gate |
| Frame pacing in CI (SwiftShader) | 30 / 24 / 13 rAF/s at 10k / 25k / 100k | regression-only: fail if rAF/s drops > 20% vs the `main` baseline. No absolute fps gate, because SwiftShader is not a GPU. |
| Long animation frames during steady state | not separately measured | no LoAF > 50 ms during 10 s of steady state at 4× |

### Inferences
**E. CI configuration.** All files are in `perf-load/ci/`. size-limit and the startup assertion were executed locally; the workflow YAML was not run on GitHub.

`.size-limit.json` (paths relative to the repository root; `npx size-limit` exits 1 on any overrun):
```json
[
  { "name": "index.html (incl. inline boot script)", "path": "dist/index.html", "limit": "1.5 kB" },
  { "name": "Initial JS: entry + shared GL chunk + sim worker", "path": ["dist/assets/index-*.js", "dist/assets/dots-*.js", "dist/assets/worker-*.js"], "limit": "12 kB" },
  { "name": "Lazy: lab chart (uPlot)", "path": "dist/assets/chart-*.js", "limit": "21 kB" },
  { "name": "Lazy: controls (lil-gui)", "path": "dist/assets/controls-*.js", "limit": "8 kB" },
  { "name": "Lazy: town skin", "path": "dist/assets/town-*.js", "limit": "4 kB" },
  { "name": "Lazy: country mode", "path": "dist/assets/country-*.js", "limit": "10 kB" },
  { "name": "Lazy: inspector", "path": "dist/assets/inspector-*.js", "limit": "3 kB" },
  { "name": "Lazy: WebGPU path", "path": "dist/assets/webgpu-*.js", "limit": "8 kB" },
  { "name": "Town map (binary, brotli on the wire)", "path": "dist/assets/town-*.bin", "limit": "40 kB" },
  { "name": "Atlas 2048 (WebP lossless, sent as-is)", "path": "dist/assets/atlas2048-*.webp", "brotli": false, "limit": "300 kB" }
]
```
Raise "Initial JS" to 35 kB once the production renderer and sim exist, and keep each item's headroom near 10–20%.

`perf/budgets.json` (read by `assert-startup.mjs`, which fails on median > budget, or on regression > 15% **and** > 20 ms against the cached `main` baseline):
```json
{ "profile": "fast4g-4x", "runs": 7, "aggregate": "median",
  "maxMs": { "firstFrame": 1500, "interactive": 2000, "glReadyMs": 120, "parseMs": 10, "spawnMs": 80 },
  "maxKB": { "initialKB": 60, "totalKB": 120 },
  "maxRegressionVsBaseline": 0.15 }
```

`.github/workflows/perf.yml`:
```yaml
name: perf-budgets
on:
  pull_request:
  push:
    branches: [main]
concurrency: { group: perf-${{ github.ref }}, cancel-in-progress: true }
jobs:
  size:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build                      # vite build -> dist/
      - run: npx size-limit                     # .size-limit.json; non-zero exit on any overrun
      - uses: andresz1/size-limit-action@v1     # optional PR comment with the diff vs. base
        if: github.event_name == 'pull_request'
        with: { github_token: "${{ secrets.GITHUB_TOKEN }}", skip_step: install, build_script: build }

  browser-perf:
    runs-on: ubuntu-24.04
    needs: size
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - run: npx playwright install --with-deps chromium
      - name: Calibrate CPU throttling to a mid-tier phone (Lighthouse BenchmarkIndex ~375)
        run: node perf/calibrate.mjs | tee -a "$GITHUB_ENV"     # prints BENCHMARK_INDEX=… and CPU_RATE=…
      - name: Restore baseline measured on main
        uses: actions/cache/restore@v6
        with: { path: perf-baseline, key: perf-baseline-${{ github.sha }}, restore-keys: perf-baseline- }
      - name: Startup (7 cold loads, Fast 4G + 3-RTT setup in the static server, calibrated CPU)
        run: |
          RUNS=7 CONFIGS='[["dist","","fast4g-4x"]]' OUT=startup.json node perf/bench-startup.mjs
          node perf/assert-startup.mjs startup.json perf/budgets.json perf-baseline/startup.json
      - name: Memory (measureUserAgentSpecificMemory needs full Chromium + COOP/COEP)
        run: node perf/bench-memory.mjs && node perf/assert-memory.mjs memory.json perf/budgets.json
      - name: Frame time (main-thread upload+draw, worker step) at 10k/25k/100k
        run: node perf/bench-frames.mjs && node perf/assert-frames.mjs frames.json perf/budgets.json
      - uses: actions/upload-artifact@v7
        if: always()
        with: { name: "perf-${{ github.sha }}", path: "*.json" }
      - name: Save new baseline (main only)
        if: github.ref == 'refs/heads/main'
        run: mkdir -p perf-baseline && cp startup.json memory.json frames.json perf-baseline/
      - uses: actions/cache/save@v6
        if: github.ref == 'refs/heads/main'
        with: { path: perf-baseline, key: perf-baseline-${{ github.sha }} }

  lighthouse:            # secondary, informational; cannot throttle the worker
    runs-on: ubuntu-24.04
    needs: size
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - run: npx @lhci/cli@0.15.1 autorun
```

`lighthouserc.json`. Locally all assertions passed over 3 runs:
```json
{ "ci": {
  "collect": { "staticDistDir": "./dist", "numberOfRuns": 5,
    "settings": { "formFactor": "mobile", "throttlingMethod": "devtools",
      "throttling": { "requestLatencyMs": 165, "downloadThroughputKbps": 8100, "uploadThroughputKbps": 1350, "cpuSlowdownMultiplier": 4 },
      "chromeFlags": "--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist" } },
  "assert": { "assertions": {
    "user-timings:frame-first":      ["error", { "maxNumericValue": 1500, "aggregationMethod": "median" }],
    "user-timings:app-interactive":  ["error", { "maxNumericValue": 2000, "aggregationMethod": "median" }],
    "first-contentful-paint":        ["warn",  { "maxNumericValue": 1500, "aggregationMethod": "median" }],
    "total-blocking-time":           ["warn",  { "maxNumericValue": 300,  "aggregationMethod": "median" }],
    "resource-summary:script:size":  ["error", { "maxNumericValue": 120000 }],
    "total-byte-weight":             ["error", { "maxNumericValue": 450000 }] } },
  "upload": { "target": "filesystem", "outputDir": "./lhci" } } }
```

**What the benchmark scripts do.** `perf-load/bench-startup.mjs`, `bench-memory.mjs`, `bench-frames.mjs`, `server.mjs`, `ci/calibrate.mjs`, `ci/assert-startup.mjs`.
- The static server applies the network model: per-request latency, a shared bandwidth pacer, and RTTs for connection setup on the navigation. It also sets `immutable` and COOP/COEP headers, as the production `_headers` would.
- CPU throttling is `Emulation.setCPUThrottlingRate(CPU_RATE)` on the page. The worker receives the same factor as a busy-wait multiplier, because CDP refuses to throttle workers.
- Each run uses a fresh browser context, so caches are cold. Results are collected from `performance.mark` entries in the page and in the worker (rebased on `timeOrigin`), Resource Timing and LoAF.
- The memory job needs the full Chromium binary. Chrome-headless-shell throws on `measureUserAgentSpecificMemory`.
- Keep `assert-memory.mjs` and `assert-frames.mjs` symmetrical with `assert-startup.mjs`: absolute caps from tables C and D, plus a regression check against the baseline.
- On noisy shared runners, follow `compute.md` and gate micro-benchmarks on the min of ≥ 9 samples. Gate the network-dominated startup on the median of 7.

### Gaps
- The budgets are calibrated on a stand-in app. Re-baseline them once the real sim core, renderer and UI exist: keep the ratios and headroom and update the measured columns.
- No iOS or Android device validated these budgets. The first real-device pass should check first frame on a mid-range Android phone (for example one with a BenchmarkIndex of ≈300–400) and memory headroom on a 3–4 GB iPhone.
