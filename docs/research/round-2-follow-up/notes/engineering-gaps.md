# Browser-engineering gaps for a browser-only agent simulation (status: October 2026)

Scope: open engineering questions for a static-hosted TypeScript sim (10k–100k dots, SoA typed arrays in a dedicated worker, fixed timestep, Comlink, transferable Float32Array ping-pong, PixiJS v8 ParticleContainer or raw WebGL2 instanced quads, uPlot, SAB only at 100k tier, seeded sfc32, integer cents).

Current browser versions per MDN browser-compat-data 8.1.4 (data timestamp 2026-10-01): Chrome 154 (stable 2026-09-22; 155 beta 2026-10-06), Firefox 157 (2026-09-29), Safari 27 (2026-09-14; 27.2 beta). BCD's release dates show Chrome (152 on 2026-08-25, 153 on 09-08, 154 on 09-22) and Firefox (154 on 08-18 through 157 on 09-29) releasing two weeks apart since late summer 2026 (my reading of the dates). — [MDN browser-compat-data browsers/*.json](https://github.com/mdn/browser-compat-data) (opened: npm package 8.1.4 and GitHub source)

Caveat on engine source: Chromium, WebKit and Firefox code was read from their **main** branches in early October 2026, which run one or two milestones ahead of stable releases. V8 was read per release branch (`X.Y-lkgr`).

How sources were accessed: the session's egress proxy blocked nearly all documentation sites (see the list under Gaps in the first section). Primary documents were therefore read from their **GitHub source repositories** (Chromium, WebKit, Firefox, V8, LLVM, tc39/ecma262, whatwg/html, w3c/wcag, w3c/aria, csswg-drafts, KhronosGroup/WebGL, Playwright, Vitest), from **installed npm/PyPI packages** (MDN BCD 8.1.4, PixiJS 8.22.0, uPlot 1.6.32, @stdlib/*, tol-colors 2.2.0), or from **github.com issue pages** (via WebFetch). "(opened)" means I read the document itself. "(snippet only)" means I saw only a search-result snippet. "(measured locally)" means I ran the experiment in this session; the scripts are in `../prototypes/engine-bench`. The test host was an Intel Xeon @ 2.10 GHz with 4 vCPU on Linux 6.18. Engines: Node 22.22.0 (V8 12.4.254.21-node.33), Bun 1.3.14 (JavaScriptCore) and Deno 2.9.7 (V8 15.0.245.2, Chrome-150-era V8, from GitHub releases).

---

## 1. Phones: realistic limits for a worker sim + WebGL2 instanced dots on mid-range Android and recent iPhones

### Takeaway
I could not retrieve public mobile particle-count benchmarks or Speedometer/JetStream scores per device. The benchmark sites were egress-blocked, and the shared web-search budget ran out mid-task. Engine source does give hard platform limits:
- On iOS, WebKit caps canvas area at 8192×8192 device pixels.
- WebKit allows 16 active WebGL contexts on the main thread and 4 per worker thread.
- Safari halves requestAnimationFrame (rAF) to 30 fps in Low Power Mode and under aggressive thermal mitigation.
- Chrome on Android freezes background pages.

Recommendation: ship phones at a 10k default, with an on-device calibration step that decides whether 25k is allowed. Keep the 100k tier desktop-only.

### Cited Findings
- **iOS canvas size cap:** WebKit limits canvas area to `8192 * 8192` device pixels on `PLATFORM(IOS_FAMILY)` and to `16384 * 16384` elsewhere. Exceeding it logs "Canvas area exceeds the maximum limit". — [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp) (opened)
- **WebGL context caps in WebKit:** `maxActiveContexts = 16` on the main thread and `maxActiveWorkerContexts = 4` per worker thread. When exceeded, WebKit logs "There are too many active WebGL contexts on this page, the oldest context will be lost." — [WebKit WebGLRenderingContextBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp) (opened)
- **WebGL context caps in Chromium:** the caps come from preferences (`max_active_webgl_contexts`, `max_active_webgl_contexts_on_worker`). When they are exceeded, Chromium calls `ForciblyLoseOldestContext("WARNING: Too many active WebGL contexts. Oldest context will be lost.")`. — [Chromium webgl_rendering_context_base.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc) (opened). I did not find the numeric default values (see Gaps).
- **Safari rAF throttling:** WebKit's `halfSpeedThrottlingReasons = { LowPowerMode, NonInteractedCrossOriginFrame, VisuallyIdle, AggressiveThermalMitigation }`. Any of these drops rendering updates from 60 fps (`FullSpeedFramesPerSecond`) to 30 fps (`HalfSpeedThrottlingFramesPerSecond`), or halves a higher nominal rate. `OutsideViewport` stops them entirely. — [WebKit AnimationFrameRate.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/AnimationFrameRate.cpp), [AnimationFrameRate.h](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/AnimationFrameRate.h) (opened)
- **Safari main-thread timers under Low Power or thermal mitigation:** for visible pages, the DOM-timer alignment interval becomes 30 ms (`defaultAlignmentIntervalInLowPowerOrThermallyMitigatedMode() = 30_ms`; otherwise 0). — [WebKit DOMTimer.h](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.h), [Page.cpp `updateDOMTimerAlignmentInterval`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp) (opened)
- **WebKit memory-kill thresholds:** WebKit's generic `MemoryPressureHandler` defines them as follows on 64-bit: an active process is killed at 7 GB (15 GB if RAM > 16 GB) plus 1 GB per tab; an inactive process at min(3 GB + 1 GB per tab, 0.9 × RAM). These are WebKit's own thresholds; iOS jetsam limits are set by the OS and are not in this file. — [WebKit MemoryPressureHandler.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/MemoryPressureHandler.cpp) (opened)
- **HTML spec on frame rates:** user agents may drop a navigable to "a more sustainable 30 rendering opportunities per second" if it cannot sustain 60 Hz. If it is not visible, they may drop it to "a much slower 4 rendering opportunities per second, or even less". — [WHATWG HTML source, "rendering opportunity"](https://github.com/whatwg/html/blob/main/source) (opened)
- **Chrome on Android background pages:** a Chromium source comment says intensive wake-up throttling "is enabled by default on all platforms. However, on Android, it has no effect because page freezing kicks in at the same time." — [Chromium third_party/blink/common/features.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/common/features.cc) (opened)
- **Firefox on Android:** `dom.suspend_inactive.enabled` ("Whether we should suspend inactive tabs or not") defaults to `@IS_ANDROID@`. — [Firefox StaticPrefList.yaml](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml) (opened)
- **Device-memory hint:** `navigator.deviceMemory` exists only in Chromium browsers. From Chrome 147, Android reports buckets 1/2/4/8 and desktop reports 2/4/8/16/32. Firefox and Safari do not support it. — [MDN BCD 8.1.4 api.Navigator.deviceMemory](https://github.com/mdn/browser-compat-data) (opened)
- **Multi-tab PixiJS crash on iOS (open issue):** issue #12224, opened 2026-09-23, reports that several PixiJS 8.21.0 instances in separate tabs on iOS Safari cause unrecoverable WebGL context loss: "a permanent black screen or, in some cases, a complete page crash". The reporter used an iPhone 12 and an iPhone 14 Plus on iOS 26.7 and 27.0; PixiJS 6 worked. — [pixijs/pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) (opened). A related open PR #12226 is titled "fix: fall back to mediump precision when the test context is lost". — [PixiJS issue search listing](https://github.com/pixijs/pixijs/issues?q=context+lost+iOS+safari) (opened listing; PR body not read)
- **Desktop reference cost of transcendental calls:** on the 2.1 GHz Xeon, one transcendental call costs about 15–65 ns with Math.* and 33–60 ns with @stdlib (pow about 180 ns). See section 4 for the table. — [local benchmark run.mjs](../prototypes/engine-bench/run.mjs) (measured locally)

### Inferences
- **Per-tick budget arithmetic (desktop reference only):** at 100k agents, each per-agent transcendental call site costs about 2–6 ms per tick on the reference Xeon (100k × 20–60 ns), and pow about 18 ms. At 10k agents the same call site costs 0.2–0.6 ms. Phone CPUs can be faster or slower than this cloud core; no device data was retrieved, so the ratio must be measured.
- **DO THIS: population caps.**
  - Phones (touch + `(pointer: coarse)`, or `navigator.deviceMemory <= 4` where available): default **10k**.
  - Offer **25k** only if a calibration passes. Calibration: at startup, run 300 ticks at 10k with a fixed seed inside the sim worker and record p95 ms/tick. Allow 25k if p95 at 10k is ≤ 1.5 ms per tick at a 30 Hz sim (i.e. ≤ 6 ms extrapolated at 25k, leaving headroom for thermal slowdown).
  - **100k** stays desktop-only. It already needs COOP/COEP for SAB.
  - Re-run the calibration if the measured tick time drifts more than 50% upward for 10 s, which indicates thermal throttling, and drop a tier.
- **DO THIS: level-of-detail rules for phones.**
  - Decouple sim rate from render rate: sim at 30 ticks/s on phones, render on rAF with interpolation. Safari may deliver 30 fps (Low Power Mode or thermal), and the HTML spec allows 30 fps or less.
  - Cap the backing-store DPR at 2. A 430×932 CSS-px iPhone at DPR 3 is 1290×2796 = 3.6 MP; at DPR 2 it is 1.6 MP, about 56% fewer fragments.
  - Use `antialias:false` with shader smoothstep edges. Keep the dot radius at ≥ 1.5 CSS px.
  - Disable blending for opaque dots above 25k.
  - Throttle uPlot to ≤ 4 Hz and ≤ 2k points per series.
  - Stop rendering when the canvas is off-screen (IntersectionObserver). WebKit already stops rendering updates for `OutsideViewport`.
- **DO THIS: GPU contexts.** Use exactly **one** WebGL context per page. Avoid helper or test contexts (PixiJS #12224 and PR #12226 suggest extra contexts are a live iOS risk), and release the GL context on `pagehide`. WebKit allows only 4 WebGL contexts per worker thread and 16 on the main thread.
- **Memory is not the binding constraint at these sizes.** 100k agents × ~16 four-byte SoA fields = 6.4 MB. Three snapshot buffers × 100k × (8 B position + 4 B colour) = 3.6 MB. The risks are GPU context loss and OS process kills, so autosave tick-indexed checkpoints (OPFS) every N seconds and on `pagehide`.

### Gaps
- **No mobile benchmark numbers.** I found no public sprite/particle counts at 60 fps on mobile, no Speedometer 3 or JetStream 2 scores by device, no mobile-vs-desktop JS speed ratios, and no thermal-throttling curves. Reason: browserbench.org, browser.geekbench.com, notebookcheck.net, anandtech.com, gsmarena.com, nanoreview.net, gfxbench.com, reddit.com, stackoverflow.com and similar sites were egress-blocked (HTTP 403 at CONNECT). The session's WebSearch budget (200 calls, shared with parallel researchers) was exhausted before these searches could run. The project should measure on real devices (an iPhone 13–16 and a mid-range Android such as a Galaxy A5x or Pixel 8a) using the calibration harness above.
- **No iOS per-tab memory limit.** iOS Safari's per-tab jetsam limit and the exact conditions for "A problem repeatedly occurred" reloads are set by the OS and are undocumented in WebKit source. Not found.
- **Chromium's numeric WebGL context caps** (desktop vs Android) were not located; the value is set outside the files I opened.
- **Unreachable sites in this session (egress-blocked):** developer.chrome.com, developer.mozilla.org, caniuse.com, web.dev, webkit.org (blog), w3.org, pixijs.com, playwright.dev, vitest.dev, stdlib.io, bundlephobia.com, pkg-size.dev, browserbench.org, browser.geekbench.com, bugs.webkit.org, bugzilla.mozilla.org, chromium.googlesource.com, source.chromium.org, groups.google.com, hacks.mozilla.org, searchfox.org, khronos.org, personal.sron.nl (Paul Tol), jfly.uni-koeln.de (Okabe–Ito), ibm.com, unpkg.com, cdn.jsdelivr.net, chromestatus.com, html.spec.whatwg.org, nolanlawson.com, medium.com, dev.to, stackoverflow.com, reddit.com, notebookcheck.net, anandtech.com, tomshardware.com, arstechnica.com, phoronix.com, wikipedia.org, threejs.org, v8.dev, emscripten.org, chromium.org. Also blocked: the GitHub REST API for repos not attached to the session. Reachable: github.com, raw.githubusercontent.com, gist.github.com, developer.apple.com, and the npm and PyPI registries.

---

## 2. Background tabs: throttling of setTimeout, rAF and dedicated workers (2026), and pausing a deterministic sim

### Takeaway
In shipping Chrome, Safari and Firefox, a **dedicated worker's own timers are not throttled when the page is hidden**:
- Chromium's worker throttling feature is disabled by default.
- WebKit's code says "We don't throttle timers in worker threads".
- Firefox enables worker throttling only in Nightly.

So the sim worker's `setTimeout(4)` or MessageChannel loop keeps burning CPU and battery in a hidden tab unless the app pauses it. Main-thread timers and rAF are heavily throttled or stopped: in Chrome, 1 wake-up/s, then 1 wake-up per minute after a 60 s grace period once the page has loaded. Mobile browsers freeze or suspend background pages entirely. Pause explicitly on `visibilitychange` and resume without catch-up.

### Cited Findings
- **Chromium main-thread throttling layers.** A scheduler header comment lists three:
  - "1 wake up per second in a background page or hidden cross-origin frame";
  - "1% CPU time in a page that has been backgrounded for 10 seconds";
  - intensive throttling, which limits "wake ups from timers with a high nesting level … to 1 per minute on a page that has been backgrounded for GetIntensiveWakeUpThrottlingGracePeriod()".

  — [Chromium scheduler/common/features.h](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.h) (opened)
- **Chromium intensive-throttling grace period:** `kIntensiveWakeUpThrottling_GracePeriodSeconds_Default = 5 * 60` while the page is **loading** and `..._GracePeriodSecondsLoaded_Default = 60` once **loaded**. `GetIntensiveWakeUpThrottlingGracePeriod(loading)` returns the param value (default 5 min) if loading and otherwise 60 s, unless an enterprise policy overrides it. `kIntensiveWakeUpThrottling` is `FEATURE_ENABLED_BY_DEFAULT`. — [Chromium scheduler/common/features.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.cc), [features.h](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.h), [blink/common/features.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/common/features.cc) (opened)
- **Chromium conditions for intensive throttling:** it requires `!IsAudioPlaying() && !IsPageVisible()`. Delayed `scheduler.postTask()` tasks "are intensively throttled (no nesting-level exception or policy/flag opt-out)". — [Chromium frame_scheduler_impl.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/main_thread/frame_scheduler_impl.cc) (opened)
- **Chrome's 2021 description (snippet only):** the Chrome 88 blog listed "hidden > 5 minutes, silent ≥ 30 s, no WebRTC, chain ≥ 5" → one wake-up per minute. — [Chrome blog: Heavy throttling of chained JS timers beginning in Chrome 88](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/) (snippet only; site blocked). The current source above shows the loaded-page grace period is now 60 s. A blink-dev "Intent to Ship: Quick intensive timer throttling of loaded background pages" exists. — [blink-dev thread](https://groups.google.com/a/chromium.org/g/blink-dev/c/5SZB2CFFGqE) (snippet only)
- **Chromium dedicated workers are not throttled by default:** `WorkerThreadScheduler` creates CPU-time and wake-up budget pools only when `thread_type == kDedicatedWorkerThread && base::FeatureList::IsEnabled(kDedicatedWorkerThrottling)`. — [Chromium worker_thread_scheduler.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/worker/worker_thread_scheduler.cc) (opened). The feature is declared `BASE_FEATURE(kDedicatedWorkerThrottling, "BlinkSchedulerWorkerThrottling", base::FEATURE_DISABLED_BY_DEFAULT)`. — [scheduler/common/features.h](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.h) (opened). A TODO notes that worker throttling "doesn't match main thread throttling for initial visibility change, intensive throttling, timer nesting level properties … if this feature is ever revived." — [worker_scheduler_impl.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/worker/worker_scheduler_impl.cc) (opened)
- **WebKit timer rules:**
  - `DOMTimer::updateThrottlingStateIfNecessary` says: "We don't throttle timers in worker threads." — [WebKit DOMTimer.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.cpp) (opened)
  - Hidden pages align DOM timers to `hiddenPageAlignmentInterval() = 1_s`. `HiddenPageDOMTimerThrottlingEnabled` is true on `PLATFORM(COCOA) || PLATFORM(GTK)`; `HiddenPageDOMTimerThrottlingAutoIncreases` defaults to false. — [DOMTimer.h](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.h), [UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml), [Page.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp) (opened)
  - Clamping: `defaultMinimumInterval() = 4_ms`, applied once nesting reaches 5 for repeating timers and 10 for one-shot timers (`maxTimerNestingLevelForOneShotTimers = 10`). Non-user-observable timers are throttled to 1 s. — [DOMTimer.cpp/.h](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.cpp) (opened)
  - `PageVisibilityBasedProcessSuppressionEnabled` defaults to true. — [UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml) (opened)
  - A third-party GitHub issue claims "WebKit suspends the whole WebContent process when a window is hidden … suspension 20 seconds after the page stops being visible". — [lexluthor0304/NegativeConverter#241](https://github.com/lexluthor0304/NegativeConverter/issues/241) (snippet only; not verified in WebKit source)
- **Firefox prefs:**
  - `dom.min_timeout_value` = 4 ms; `dom.min_background_timeout_value` = 1000 ms.
  - Budget throttling `dom.timeout.enable_budget_timer_throttling` = true.
  - `dom.timeout.background_budget_regeneration_rate` = 100 ("Time (in ms) that it takes to regenerate 1ms", i.e. about 1% CPU); `dom.timeout.background_throttling_max_budget` = 50 ms; `dom.timeout.budget_throttling_max_delay` = 15000 ms.
  - `dom.timeout.throttling_delay` = 30000 ("Delay in ms from document load until we start throttling background timeouts").
  - **`dom.workers.throttling.enabled` = `@IS_NIGHTLY_BUILD@`**, i.e. worker throttling is on in Nightly only.

  — [Firefox StaticPrefList.yaml](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml) (opened)
- **HTML spec on rAF in hidden documents:** rendering opportunities depend on "whether its active document's visibility state is 'visible'". A hidden navigable may get "4 rendering opportunities per second, or even less". rAF callbacks run only as part of rendering updates. — [WHATWG HTML source](https://github.com/whatwg/html/blob/main/source) (opened)
- **Event support:**
  - `visibilitychange` is supported everywhere (Safari full support since 14.1, iOS since 14.5). BCD notes that older Safari did not fire it on navigation, and recommends also listening for `pagehide`.
  - `freeze`/`resume` events exist only in Chromium (Chrome 68+), not in Firefox or Safari.
  - `scheduler.postTask`: Chrome 94, Firefox 142, not Safari.

  — [MDN BCD 8.1.4](https://github.com/mdn/browser-compat-data) (opened)
- **Playwright disables throttling by default.** Its default Chromium switches include `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding`, so automated tests do not see real-user throttling. — [Playwright chromiumSwitches.ts](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts) (opened)

### Inferences
- **Answer to "does a dedicated worker's setTimeout loop get throttled when its page is hidden?"** No, in stable Chrome 154, Safari 27 and Firefox 157 release: the code paths above do not throttle worker timers. It can be throttled in Firefox Nightly and under a Chromium field trial. The page can also be frozen (Chrome Android) or its process suspended (Safari, Firefox Android), which stops the worker entirely. The loop will therefore run flat-out in a desktop background tab and drain laptop batteries.
- **DO THIS: explicit pause and resume.**
  ```ts
  // main.ts
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') simApi.pause();   // Comlink call
    else simApi.resume();
  });
  addEventListener('pagehide', () => simApi.checkpoint());       // persist tick-indexed state (OPFS); mobile may kill the page
  // sim.worker.ts (fixed timestep)
  let running = false, acc = 0, last = 0;
  function pause() { running = false; }
  function resume() { if (running) return; running = true; acc = 0; last = performance.now(); loop(); } // no catch-up
  function loop() {
    if (!running) return;
    const now = performance.now(); acc = Math.min(acc + (now - last), MAX_FRAME_MS); last = now;
    while (acc >= DT_MS) { step(); acc -= DT_MS; }   // deterministic: state depends only on tick count + recorded inputs
    if (snapshotBufferAvailable) postSnapshot();      // ping-pong gives natural back-pressure when main stops rendering
    port.postMessage(0);                               // MessageChannel yield (no 4 ms clamp)
  }
  ```
- **Determinism is unaffected by pausing.** State depends only on tick index plus inputs recorded with their tick numbers, never on wall-clock time. Clamp the accumulator (`MAX_FRAME_MS`) so that a long stall, or a resume after process suspension, never triggers a catch-up spiral.
- **Optional "keep running in background"** can be a user toggle (headless fast-forward without snapshot posting). It works on desktop because workers are not throttled, but assume mobile will freeze or kill it.
- **Timer clamping in the worker loop:** `setTimeout(4)` in a worker still hits the 4 ms nested-timer clamp (WebKit after nesting 5/10, Firefox `dom.min_timeout_value`). Keep the MessageChannel yield as the primary loop. Never drive sim ticks from rAF, because hidden pages and Low Power Mode change the rAF rate.
- **Test the visibility logic** with a page-level shim (override `document.visibilityState` and dispatch `visibilitychange`). Playwright's default flags disable real background throttling.

### Gaps
- Chromium source does not show the WebRTC and "silent for 30 s" conditions from the 2021 blog; I saw only the audio-playing check. The blog page was blocked.
- Which Chrome milestone first shipped the 60 s loaded-page grace period could not be determined: the blink-dev thread and chromestatus were blocked, and GitHub API history access for chromium was not enabled.
- Safari's background-tab process suspension timing (desktop and iOS) was not verified in source; only a third-party snippet was seen.

---

## 3. OffscreenCanvas: support matrix and the three render layouts

### Takeaway
`transferControlToOffscreen` plus a WebGL2 context in a worker is supported in Chrome/Edge 69+, Firefox 105+ and Safari/iOS **17+** (2D-only OffscreenCanvas arrived in Safari 16.4), so it is usable on every 2026 evergreen browser. The costs are pointer-event forwarding, manual resize/DPR handling (Safari lacks `devicePixelContentBoxSize`) and PixiJS's `WebWorkerAdapter`. uPlot must stay on the main thread.

Recommendation: keep **main-thread rendering as the baseline**. Build the renderer behind a narrow interface so the 100k tier can move to a **separate render worker**. Do not render inside the sim worker.

### Cited Findings
- **Support matrix (MDN BCD 8.1.4, 2026-10-01):**

  | Feature | Chrome | Edge | Firefox | Safari | iOS Safari | Chrome Android | Firefox Android | Samsung |
  |---|---|---|---|---|---|---|---|---|
  | `transferControlToOffscreen` / `OffscreenCanvas` | 69 | 79 | 105 | 16.4 | 16.4 | 69 | 105 | 10.0 |
  | `OffscreenCanvas.getContext('webgl2')` | 69 | 79 | 105 | **17** | **17** | 69 | 105 | 10.0 |
  | `OffscreenCanvas.getContext('webgpu')` | 144 (113–144 partial) | 144 | 141 partial (Windows) | 26 | 26 | 121 | no | 25.0 |
  | `DedicatedWorkerGlobalScope.requestAnimationFrame` | 69 (not in nested workers) | 79 | 99 | 16.4 | 16.4 | 69 | 99 | 10.0 |
  | `OffscreenCanvas` `contextlost`/`contextrestored` events (2D) | 99 | 99 | 125 | **no** | **no** | 99 | 125 | 18.0 |
  | `ResizeObserverEntry.devicePixelContentBoxSize` | 84 | 84 | 108 | **no** | **no** | 84 | 108 | 14.0 |
  | `HTMLCanvasElement.getContext('webgl2')` (main thread) | 56 | 79 | 51 | 15 | 15 | 56 | 51 | 6.0 |

  — [MDN browser-compat-data 8.1.4](https://github.com/mdn/browser-compat-data) (opened: queried the installed package). caniuse shows the same iOS 17.0+ picture for webgl2-in-OffscreenCanvas. — [caniuse](https://caniuse.com/mdn-api_offscreencanvas_getcontext_webgl2_context) (snippet only; blocked)
- **Safari 16.4–16.6 caveat:** these versions shipped OffscreenCanvas without WebGL. A BCD issue reports that WebGL2 in a worker does work on Mobile Safari 17+. — [mdn/browser-compat-data#21127](https://github.com/mdn/browser-compat-data/issues/21127) (snippet only)
- **devicePixelRatio in Safari:** it does not change when the page is zoomed (WebKit bug 124862). — [MDN BCD api.Window.devicePixelRatio](https://github.com/mdn/browser-compat-data) (opened)
- **WebKit worker context cap:** 4 active WebGL contexts per worker thread (16 on the main thread). — [WebKit WebGLRenderingContextBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp) (opened)
- **PixiJS 8.22.0 worker support:** it ships `environment-webworker/WebWorkerAdapter`, whose `createCanvas` returns `new OffscreenCanvas(w,h)`. It also implements `getCanvasRenderingContext2D → OffscreenCanvasRenderingContext2D`, `getNavigator → navigator`, `getBaseUrl → globalThis.location.href` and `fetch`, and parses XML with `DOMParser` from `@xmldom/xmldom`. The adapter is activated with `DOMAdapter.set(WebWorkerAdapter)` (doc comment in `environment/adapter.d.ts`). — [PixiJS 8.22.0 package source](https://github.com/pixijs/pixijs) (opened: `lib/environment-webworker/WebWorkerAdapter.mjs`, `lib/environment/adapter.d.ts`, `package.json` dependency `@xmldom/xmldom ^0.8.15`)
- **uPlot needs the DOM.** uPlot 1.6.32 binds `const doc = domEnv ? document : null`, reads `devicePixelRatio`, and uses `matchMedia` to track DPR changes; it creates DOM elements for its wrapper and legend, so it cannot run in a worker. — [uPlot 1.6.32 dist/uPlot.esm.js](https://github.com/leeoniya/uPlot) (opened: package source)
- **WebGL context-loss events and recovery:** the WebGL spec dispatches `webglcontextlost` at the canvas, and recovery requires `preventDefault()` in the handler. — [Khronos WebGL 1.0 spec source](https://github.com/KhronosGroup/WebGL/blob/main/specs/latest/1.0/index.html) (opened). BCD has no entry for `webglcontextlost` on `OffscreenCanvas` specifically (lookup returned "missing").

### Inferences
- **Layout A — render on the main thread (current plan).**
  - Pros: works on every target, including Safari 15/16 (main-thread WebGL2 since Safari 15). The PixiJS default path, input events, resize and DPR are native. uPlot lives there anyway. Sim and render threads are naturally decoupled through the snapshot ping-pong.
  - Cons: main-thread jank (GC, layout, uPlot redraws, Comlink traffic) can drop frames, and every snapshot crosses into the busiest thread.
  - Best default up to 25k.
- **Layout B — separate render worker (`transferControlToOffscreen`).**
  - Pros: rendering is isolated from main-thread jank. The sim worker can send snapshots straight to the render worker over a `MessageChannel` (transferables) or SAB at 100k, bypassing the main thread. Worker rAF exists in all three engines.
  - Cons (pitfalls):
    - Needs Safari/iOS 17+ for WebGL2, so feature-detect and fall back to A.
    - Pointer and wheel events must be forwarded from the main thread, with coordinates converted using the canvas's `getBoundingClientRect()`.
    - Resize must be done manually: `ResizeObserver` on main, post `{cssW, cssH, dpr}`, and the worker sets `canvas.width/height`. Never set the size on the placeholder `<canvas>` after transfer. Safari has no `devicePixelContentBoxSize`, so use `Math.round(contentRect.width * devicePixelRatio)`. Listen for DPR changes via `matchMedia('(resolution: Xdppx)')` as uPlot does, and note that Safari's DPR ignores zoom.
    - PixiJS needs `DOMAdapter.set(WebWorkerAdapter)` (adds `@xmldom/xmldom`). PixiJS's DOM-bound systems (events, accessibility) will not work in the worker; this is unverified, so test it.
    - Context-loss events on OffscreenCanvas are not documented for Safari, so also poll `gl.isContextLost()` each frame.
    - It is one more thread on phones.
  - Best for the 100k desktop tier.
- **Layout C — render inside the sim worker.**
  - Pros: zero-copy reads of the SoA arrays; simplest data flow.
  - Cons: GPU driver stalls, shader compiles and buffer uploads block sim ticks, adding timing jitter (determinism still holds if ticks are counted, not timed). Render and sim compete for one core exactly at the 100k tier, where the sim budget is tightest. Worker rAF throttling then also throttles the sim.
  - Not recommended, except possibly for a tiny "embed" build.
- **DO THIS: renderer interface.** Define `interface DotRenderer { init(c: HTMLCanvasElement | OffscreenCanvas): void; resize(w: number, h: number, dpr: number): void; draw(snap: Snapshot): void; dispose(): void }`, and ship A first. Gate B on `'transferControlToOffscreen' in HTMLCanvasElement.prototype`, plus a worker-side `new OffscreenCanvas(1,1).getContext('webgl2') !== null` probe.

### Gaps
- PixiJS 8's official worker guide (pixijs.com) could not be opened because it is blocked. Which PixiJS systems (events, accessibility, text) work under `WebWorkerAdapter` was not verified.
- No measured comparison of A vs B frame times was found (and none was run: no GPU browser was available).

---

## 4. Deterministic math: libraries, soundness, speed (with local measurements)

### Takeaway
@stdlib's ports of FreeBSD msun (sin/cos/ln/pow), Go-via-FreeBSD (exp) and Go (atan2) use only IEEE double arithmetic. I measured them **bit-identical across V8 12.4, V8 15.0 and JavaScriptCore on 800k results** (0 mismatches), at about 1.0–1.5× the cost of Math.* except pow (about 3–10×). Math.* is non-deterministic, and the landscape changed in 2026:
- **Chrome 150+ (V8 15.0) switched Math.sin/cos/exp/log/atan2/tan to LLVM libc**, which is correctly rounded; I measured 0 misrounded results.
- **Math.pow now calls the platform's `std::pow`**, which differs by OS.
- Firefox uses fdlibm for most functions but the OS libm for sin/cos/tan/pow.
- Safari uses Apple's libm.

The guarantee for basic arithmetic is sound: the spec mandates IEEE 754 roundTiesToEven for `+ − × ÷` and exact `Math.sqrt`, and there is no FMA contraction. Recommendation: ban Math transcendental functions and `**` in the sim core. Use a lookup table (LUT) built with stdlib for hot paths and stdlib for rare calls.

### Cited Findings
- **ECMAScript spec on arithmetic and Math functions.**
  - "the Number value for x" is chosen by a procedure that "corresponds exactly to the behaviour of the IEEE 754-2019 roundTiesToEven mode". `Number::add`, `Number::multiply` and `Number::divide` are specified per IEEE 754-2019.
  - `Math.sqrt` returns "𝔽(the square root of ℝ(n))", i.e. exactly rounded.
  - Most Math functions are "implementation-approximated": "The behaviour of the functions acos, acosh, asin, asinh, atan, atanh, atan2, cbrt, cos, cosh, exp, expm1, hypot, log, log1p, log2, log10, pow, random, sin, sinh, tan, and tanh is not precisely specified". The spec recommends (but does not require) fdlibm.
  - The `**` operator (`Number::exponentiate`) also "returns an implementation-approximated value".

  — [tc39/ecma262 spec.html](https://github.com/tc39/ecma262/blob/main/spec.html) (opened)
- **V8 (Chrome) history, read from branch sources.**
  - V8 ≤ 14.9: `src/base/ieee754.cc` is "adapted from fdlibm". Under `V8_USE_LIBM_TRIG_FUNCTIONS` (GN default `v8_use_libm_trig_functions = is_clang`; runtime flag `use_libm_trig_functions` default **true** in 14.9), sin/cos come from bundled glibc (`libm_sin → glibc_sin`). — [v8 14.9-lkgr ieee754.cc](https://github.com/v8/v8/blob/14.9-lkgr/src/base/ieee754.cc), [v8.gni](https://github.com/v8/v8/blob/14.9-lkgr/gni/v8.gni), [flag-definitions.h](https://github.com/v8/v8/blob/14.9-lkgr/src/flags/flag-definitions.h) (opened)
  - V8 15.0: `atan`, `atan2`, `exp`, `log`, `log1p`, `log2`, `log10`, `expm1`, `tan` and `legacy::pow` return `LIBC_NAMESPACE::shared::…` (LLVM libc). The fallback `fdlibm_cos`/`fdlibm_sin` now also call LLVM libc. `use_libm_trig_functions` defaults to **false**. `use_std_math_pow` defaults to **true** ("use std::pow instead of our custom implementation"; false only on AIX), and `src/numbers/ieee754.cc::pow` handles the JS special cases (NaN exponent, ±1^±∞ → NaN, NaN base) before calling `std::pow`. — [v8 15.0-lkgr base/ieee754.cc](https://github.com/v8/v8/blob/15.0-lkgr/src/base/ieee754.cc), [numbers/ieee754.cc](https://github.com/v8/v8/blob/15.0-lkgr/src/numbers/ieee754.cc), [flag-definitions.h](https://github.com/v8/v8/blob/15.0-lkgr/src/flags/flag-definitions.h) (opened)
  - V8 15.2: sin/cos unconditionally call LLVM libc. By 15.5, `v8_use_libm_trig_functions` is gone from v8.gni. — [v8 15.2-lkgr ieee754.cc](https://github.com/v8/v8/blob/15.2-lkgr/src/base/ieee754.cc) (opened)
  - V8 version `x.y` = Chromium milestone ÷ 10, so V8 15.0 = Chrome 150 (stable 2026-06-30) and 15.2 = Chrome 152 (stable 2026-08-25). — [v8.dev docs/version-numbers.md](https://github.com/v8/v8.dev/blob/main/src/docs/version-numbers.md) (opened); [BCD chrome.json release dates](https://github.com/mdn/browser-compat-data) (opened)
- **LLVM libc accuracy:** double `sin`, `cos`, `exp`, `log`, `pow` and `hypot` are marked "correctly rounded for all 4 rounding modes"; double `atan2` is marked "1 ULP". — [LLVM libc docs/headers/math/index.rst](https://github.com/llvm/llvm-project/blob/main/libc/docs/headers/math/index.rst) (opened)
- **Firefox (SpiderMonkey) `js/src/builtin/Math.cpp`:**
  - `fdlibm_acos/asin/atan/atan2/exp/log/log10/log2/log1p/expm1/cosh/sinh/tanh/acosh`;
  - `std::sin/cos/tan` unless pref `use_fdlibm_for_sin_cos_tan`;
  - `pow_libm_or_fdlibm`, which "dispatches to fdlibm on the ARM Android subset whose bionic pow diverges; everywhere else it's plain std::pow".

  — [Firefox Math.cpp](https://github.com/mozilla-firefox/firefox/blob/main/js/src/builtin/Math.cpp) (opened)
- **JavaScriptCore:** `MathObject.cpp` calls `Math::exp`, `Math::sin`, `std::hypot`/`std::hypotl` and `operationMathPow`, i.e. C-library implementations. — [WebKit MathObject.cpp](https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/runtime/MathObject.cpp) (opened)
- **@stdlib provenance (source headers):**
  - `exp`: "Go … which in turn was based on … FreeBSD … e_exp.c".
  - `sin`, `kernel-sin`, `rempio2`: FreeBSD msun `s_sin.c`, `k_sin.c`, `e_rem_pio2.c` (Sun 1993).
  - `ln`: FreeBSD `e_log.c`.
  - `pow`: FreeBSD (Sun 2004).
  - `atan2`: "from Go".
  - `hypot`: stdlib's own (no attribution).

  Versions installed: exp 0.2.5, sin/cos/pow/atan2 0.3.1, ln 0.2.5, hypot 0.2.4. — [stdlib-js/math-base-special-exp](https://github.com/stdlib-js/math-base-special-exp), [-sin](https://github.com/stdlib-js/math-base-special-sin), [-ln](https://github.com/stdlib-js/math-base-special-ln), [-pow](https://github.com/stdlib-js/math-base-special-pow), [-atan2](https://github.com/stdlib-js/math-base-special-atan2) (opened: npm package `lib/main.js`)
- **Measurement method** (scripts: [geninputs.mjs, run.mjs, compare3.mjs, cr_ref.py, lut.mjs](../prototypes/engine-bench); measured locally):
  - 100,000 inputs per case, generated once with seeded sfc32 using only `+ − × ÷` and `Math.floor`, saved as binary and read by every engine.
  - Ranges: sin_small ∈ [−2π, 2π]; sin_mid/cos ∈ [−1000, 1000]; exp ∈ [−50, 50]; ln roughly log-uniform 2⁻⁴¹…2⁴¹; pow base ∈ (0.001, 10.001] and exponent ∈ [−10, 10]; atan2/hypot arguments ∈ [−1000, 1000].
  - Outputs compared as raw 64-bit patterns.
  - Correct rounding was checked against mpmath 1.4.1 at 160-bit precision with round-to-nearest; the pow disagreements were re-checked at 600 bits.
- **Bit-mismatch rates** (100k results per case; measured locally):

  | case | Math: V8 12.4 vs JSC | Math: V8 15.0 vs JSC | Math: V8 15.0 vs V8 12.4 | **@stdlib: V8 12.4 vs V8 15.0 vs JSC** |
  |---|---|---|---|---|
  | sin [−2π,2π] | 3.38% | 0.12% | 3.41% | **0 / 0** |
  | sin [−1e3,1e3] | 3.16% | 0.14% | 3.21% | **0 / 0** |
  | cos [−1e3,1e3] | 3.25% | 0.14% | 3.31% | **0 / 0** |
  | exp | 9.59% | 0.07% | 9.60% | **0 / 0** |
  | log | 1.67% | 0.01% | 1.67% | **0 / 0** |
  | pow | 9.74% | 0.00% | 9.74% | **0 / 0** |
  | atan2 | 17.77% | 0.09% | 17.78% | **0 / 0** |
  | hypot | 35.56% (max 2 ulp) | 35.56% | 0.00% | **0 / 0** |

  All other mismatches were exactly 1 ulp. The Node-22-vs-Bun figures reproduce the plan's earlier numbers (3.4 / 9.9 / 9.7 / 16.4 / 42.7%) to within input-range effects.
- **Share of results NOT correctly rounded** (max error vs the mpmath reference; measured locally):

  | case | V8 12.4 Math (Node 22) | V8 15.0 Math (Deno 2.9.7) | JSC Math (Bun 1.3.14, Linux) | @stdlib (any engine) |
  |---|---|---|---|---|
  | sin small / mid | 3.41% / 3.21% (1 ulp) | **0.00% / 0.00%** | 0.12% / 0.14% | 3.28% / 3.05% (1 ulp) |
  | cos mid | 3.31% | **0.00%** | 0.14% | 3.11% |
  | exp | 9.60% | **0.00%** | 0.07% | 9.60% |
  | log | 1.67% | **0.00%** | 0.01% | 1.67% |
  | pow | 9.75% | 0.08% | 0.08% | 9.63% |
  | atan2 | 17.78% | **0.00%** | 0.09% | 26.04% (1 ulp) |
  | hypot | 35.55% (2 ulp) | 35.55% (2 ulp) | 0.63% | 35.55% (2 ulp) |

  On 81 pow inputs, V8 15.0 and Bun/JSC returned the **same** non-correctly-rounded value; the 600-bit reference confirmed the reference was right. This is consistent with V8 15's `Math.pow` going to the host `std::pow` (glibc here) rather than LLVM libc. — measured locally ([powcheck.py](../prototypes/engine-bench/powcheck.py))
- **Speed** (median ns per call including loop and array overhead; 100k inputs × 10 reps × 9 samples, each function in its own `new Function` loop so call sites stay monomorphic; Xeon 2.1 GHz; measured locally):

  | case | V8 12.4 Math / stdlib | JSC Math / stdlib | V8 15.0 Math / stdlib |
  |---|---|---|---|
  | sin [−2π,2π] | 25.0 / 34.7 | 22.8 / 32.9 | 27.2 / 33.8 |
  | sin [−1e3,1e3] | 37.6 / 45.5 | 32.2 / 46.7 | 34.9 / 40.6 |
  | cos | 37.7 / 44.8 | 35.5 / 49.0 | 34.6 / 43.1 |
  | exp | 19.7 / 36.6 | 17.5 / 59.7 | 27.9 (min 16.6) / 38.6 |
  | log | 19.0 / 48.3 | 14.0 / 39.4 | 15.3 / 44.2 |
  | pow | 64.2 / **190.8** | 18.5 / **184.1** | 17.2 / **176.6** |
  | atan2 | 53.5 / 56.3 | 43.8 / 44.9 | 40.3 / 45.2 |
  | hypot | 33.9 / 44.9 | 33.5 / 34.0 | 25.3 / 41.9 |

  — [run.mjs](../prototypes/engine-bench/run.mjs) (measured locally)
- **LUT test:** a 4096-entry linearly interpolated sin table **built with @stdlib sin** (not Math.sin) used only `+ − ×` and `Math.floor`. It ran at 15.8–16.9 ns/call versus 37–39 ns for stdlib sin and 36–46 ns for Math.sin in the same harness. Its maximum absolute error was 2.94e-7, and its results were **bit-identical across V8 12.4, V8 15.0 and JSC** (0 / 100k mismatches). — [lut.mjs](../prototypes/engine-bench/lut.mjs) (measured locally)

### Inferences
- **Soundness.**
  - Results are bit-identical across conforming engines for code that uses only `+ − × ÷`, `Math.sqrt`, `Math.fround`, `floor/ceil/trunc/round/abs/min/max/sign`, `Math.imul`/`clz32` and integer ops. The spec fixes each operation's rounding, which rules out fused multiply-add contraction and extended precision.
  - Residual risks: engine or JIT bugs; NaN bit patterns (canonicalize before hashing typed-array bytes); `-0` vs `+0` in hashes; and any use of the implementation-approximated functions listed above. 32-bit x87 double rounding is a theoretical risk on very old x86 and was not verified.
- **Math.* is now a moving target even within one browser.**
  - Chrome ≤ 149 used fdlibm-derived code (plus bundled glibc sin/cos), and Chrome ≥ 150 uses correctly-rounded LLVM libc. A replay recorded in Chrome 149 and replayed in Chrome 154 with Math.exp would diverge on about 9.6% of exp calls (V8 12.4 vs 15.0 above).
  - Chrome's `Math.pow` follows the OS libm (Windows UCRT, macOS, Android bionic and glibc all differ).
  - Node's gyp-built V8 does not match Chrome's GN-built V8 for sin/cos at the same version. Node 22 sin behaved like fdlibm, and Node's `features.gypi` has no trig flag.
- **Firefox vs Chrome 150+ (expected, not measured).** Firefox's fdlibm exp/log/atan2 should match fdlibm-style results (like Node 22 and stdlib exp, which were identical on all 100k inputs) and therefore differ from Chrome 150+ on roughly 9.6% (exp), 1.7% (log) and 17.8% (atan2) of inputs.
- **DO THIS: lint ban in the sim core.**
  ```js
  // eslint.config.js — applies to src/sim/**
  const banned = ['sin','cos','tan','asin','acos','atan','atan2','sinh','cosh','tanh','asinh','acosh','atanh',
                  'exp','expm1','log','log1p','log2','log10','pow','cbrt','hypot','random'];
  export default [{ files: ['src/sim/**/*.ts'], rules: {
    'no-restricted-properties': ['error', ...banned.map(p => ({ object: 'Math', property: p,
        message: 'Engine/OS-dependent. Use det-math (LUT or @stdlib).' }))],
    'no-restricted-syntax': ['error',
      { selector: "BinaryExpression[operator='**']", message: '** is implementation-approximated; use x*x or det-math.' },
      { selector: "AssignmentExpression[operator='**=']", message: 'same as **' }],
  } }];
  ```
- **DO THIS: a `det-math` module.**
  - Hot paths (per agent per tick): LUTs **generated at build time with @stdlib**, or at runtime with @stdlib, never Math.*, and shipped as `Float64Array`/`Float32Array` data.
  - Rare calls (setup, per-tick aggregates): @stdlib directly.
  - Avoid stdlib `pow` in per-agent loops (about 180 ns). Rewrite `x**k` for integer k as multiplications, and use `exp(y*ln(x))` from stdlib only where accuracy is not critical.
  - Replace `Math.hypot` with `Math.sqrt(x*x + y*y)`, or better, compare squared distances.
- **DO THIS: cross-engine replay tests in CI.** Run golden replay-hash tests on Node + Bun + Deno for the core, and on Chromium + Firefox + WebKit via Playwright (section 6). That catches any Math.* leak or third-party dependency (e.g. a noise library) that slips past lint.

### Gaps
- SpiderMonkey was not available in the sandbox: jsvu/Mozilla archive hosts are blocked, and no npm-distributed shell was found. Firefox bit-identity of @stdlib therefore rests on the spec and on the three engine builds tested.
- ARM64 (phones, Apple Silicon) was not tested.
- Safari's Apple-libm results were not measured; Bun on Linux exercises JSC with glibc, not Apple's libm.
- I did not determine when `use_std_math_pow` first defaulted to true; only V8 15.0 was checked.
- Other deterministic-math options were not benchmarked: decimal.js-style arbitrary precision, which is deterministic by construction but slow, and libm compiled to WebAssembly. WebAssembly's deterministic float semantics were not verified in this session.

---

## 5. WebGL robustness: context loss, iOS quirks, limits, powerPreference, PixiJS behaviour

### Takeaway
Context loss is routine on phones (memory pressure, too many contexts, GPU process restarts). Handle it explicitly:
- `preventDefault` on `webglcontextlost`.
- Rebuild buffers and programs on `webglcontextrestored`.
- Keep the sim running while lost.
- Test recovery with `WEBGL_lose_context`.

PixiJS 8.22 already does the `preventDefault` and re-emits `contextChange`, but an open iOS multi-tab context-loss bug (PixiJS #12224, 2026-09) argues for a single context and a tested fallback. At 100k instances the per-frame data is about 1.2 MB, well inside any WebGL2 limit. iOS-specific limits are an 8192² canvas area and no linear filtering of float textures on iPhone.

### Cited Findings
- **WebGL spec on loss and attributes:** `webglcontextlost` is dispatched at the canvas, and the spec's example shows `canvas.addEventListener("webglcontextlost", function(e) { e.preventDefault(); }, false)` as required to allow restoration. `WebGLContextAttributes` includes `preserveDrawingBuffer = false` and `powerPreference = "default"`, with `enum WebGLPowerPreference { "default", "low-power", "high-performance" }`. With `preserveDrawingBuffer` false, after compositing "the contents of the drawing buffer shall be cleared to their default values". — [Khronos WebGL 1.0 spec source](https://github.com/KhronosGroup/WebGL/blob/main/specs/latest/1.0/index.html) (opened)
- **PixiJS 8.22.0 `GlContextSystem`:**
  - It registers `webglcontextlost` and `webglcontextrestored` on the canvas.
  - `handleContextLost(event)` calls `event.preventDefault()`. For a forced loss it schedules `extensions.loseContext?.restoreContext()` via `setTimeout(0)`.
  - `handleContextRestored()` calls `getExtensions()` and `runners.contextChange.emit(gl)`, so GPU resources are rebuilt by each system.
  - `forceContextLoss()` uses `WEBGL_lose_context`.
  - Context creation passes `powerPreference: options.powerPreference ?? "default"` and `preserveDrawingBuffer: false` by default.

  — [PixiJS 8.22.0 lib/rendering/renderers/gl/context/GlContextSystem.mjs](https://github.com/pixijs/pixijs) (opened: package source)
- **Recent PixiJS iOS issues:**
  - Issue #12224 (open, 2026-09-23): multiple tabs running PixiJS 8.21 on iOS Safari 26.7/27.0 (iPhone 12, 14 Plus) lose context unrecoverably. — [pixijs/pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) (opened)
  - PR #12226: "fall back to mediump precision when the test context is lost". — [listing](https://github.com/pixijs/pixijs/issues?q=context+lost+iOS+safari) (opened listing)
  - Issue #9676 (2023, closed): iOS Safari 17.0 "WebGL: context lost … Unable to auto-detect a suitable renderer" with PixiJS 7.3.0; the resolution was not visible. — [pixijs/pixijs#9676](https://github.com/pixijs/pixijs/issues/9676) (opened)
- **Context caps:** WebKit allows 16 contexts on the main thread and 4 per worker, and loses the oldest beyond that. Chromium forcibly loses the oldest when its preference-defined maximum is exceeded. — [WebKit WebGLRenderingContextBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp), [Chromium webgl_rendering_context_base.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc) (opened)
- **iOS limits:**
  - Canvas area on iOS ≤ 8192×8192 device pixels. — [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp) (opened)
  - `OES_texture_float_linear` on safari_ios is "Only supported on iPadOS". `EXT_color_buffer_float` arrived in Safari/iOS 15. `WEBGL_lose_context` is supported in Safari/iOS 8+, Chrome 26+ and Firefox 22+. `webglcontextlost`/`webglcontextrestored` are supported everywhere (Safari 5.1, iOS 8). — [MDN BCD 8.1.4](https://github.com/mdn/browser-compat-data) (opened)
- **`drawingBufferStorage`** (for choosing the backbuffer format) is Chromium-only (122+). — [MDN BCD 8.1.4](https://github.com/mdn/browser-compat-data) (opened)

### Inferences
- **DO THIS: a context-loss contract** (raw WebGL2 or PixiJS):
  ```ts
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); renderer.lost = true; }); // sim keeps running
  canvas.addEventListener('webglcontextrestored', () => { renderer.createResources(); renderer.lost = false; });
  // each frame: if (renderer.lost || gl.isContextLost()) skip draw; next snapshot re-uploads all instance data anyway
  ```
  Dots need no textures, so restoring means recompiling two shaders, recreating three buffers and one VAO, then drawing the next snapshot. Also handle `getContext('webgl2') === null` at startup with a message, plus an optional Canvas2D fallback capped at about 5k dots.
- **DO THIS: limits and buffer use.**
  - Exactly one WebGL context per page. Never create probe or test contexts that linger.
  - On `pagehide`, call `WEBGL_lose_context.loseContext()` to free GPU memory promptly. This helps multi-tab iOS use (#12224).
  - Pre-allocate instance buffers with `DYNAMIC_DRAW` at max capacity and update via `bufferSubData(…, 0, n)`. At 100k × (2 × f32 + 4 × u8) = 1.2 MB per frame, buffer-size and instance-count limits are irrelevant.
  - For GPU heatmaps or trails, avoid relying on float-texture linear filtering (not available on iPhone).
- **DO THIS: powerPreference.**
  - Use `"default"` for the 10k/25k tiers and request `"high-performance"` only for the desktop 100k tier. On dual-GPU laptops, "high-performance" can wake the discrete GPU and cost battery; this rationale is general knowledge, not verified in source this session.
  - Expose a "battery saver" toggle that sets `"low-power"` and caps DPR to 1.
- **DO THIS: CI tests.** Add a test that calls `WEBGL_lose_context.loseContext()`, waits for the lost event, calls `restoreContext()`, and asserts a non-blank frame afterwards (section 6).

### Gaps
- I found no authoritative per-browser description of how `powerPreference` maps to GPU switching on macOS or Windows in 2026: the Chromium/WebKit docs and blogs are blocked, and I did not locate the relevant source.
- WebGL2-specific maxima (MAX_ELEMENT_INDEX, uniform/attribute limits on iOS) were not retrieved; the WebGL 2.0 spec and webglreport.com were not opened.
- PixiJS ParticleContainer's own behaviour on context restore (re-upload of static properties) was not traced beyond the `contextChange` runner.

---

## 6. Testing in CI: headless WebGL2, visual regression, Vitest browser mode, workers

### Takeaway
Use three layers:
1. **Vitest in Node** for the pure sim core: deterministic golden hashes, also run on Bun/Deno for cross-engine checks.
2. **Worker and protocol tests**, either simulated in Node with `@vitest/web-worker` or run for real in **Vitest 5 browser mode** with the `@vitest/browser-playwright` provider.
3. **Playwright e2e** on Chromium (software WebGL via ANGLE/SwiftShader flags), Firefox and WebKit. These cover replay-hash equality, context-loss recovery and a small number of tolerant screenshots, run inside the Playwright Docker image.

### Cited Findings
- **Playwright screenshots:**
  - `await expect(page).toHaveScreenshot()` creates a baseline on the first run.
  - Snapshot names include browser and platform (e.g. `-chromium-darwin.png`) because "Browser rendering can vary based on the host OS, version, settings, hardware, power source (battery vs. power adapter), headless mode, and other factors".
  - `threshold` (0 strict … 1 lax, default 0.2) and `maxDiffPixels` (unset by default) control tolerance.
  - `stylePath` injects CSS for screenshots.
  - Baselines are updated with `--update-snapshots`.

  — [Playwright docs/src/test-snapshots-js.md](https://github.com/microsoft/playwright/blob/main/docs/src/test-snapshots-js.md) (opened). `toHaveScreenshot` has an `animations` option ("default disabled") since v1.23. — [class-pageassertions.md](https://github.com/microsoft/playwright/blob/main/docs/src/api/class-pageassertions.md) (opened)
- **Playwright headless modes:** it uses "chromium headless shell" for headless runs by default. `npx playwright install --with-deps --only-shell` skips the full browser. `channel: 'chromium'` opts into "new headless", which "is the real Chrome browser", and `--no-shell` skips the shell. — [Playwright docs/src/browsers.md](https://github.com/microsoft/playwright/blob/main/docs/src/browsers.md) (opened). CI guidance: use the Docker image `mcr.microsoft.com/playwright:v<version>-noble`. — [docs/src/ci.md](https://github.com/microsoft/playwright/blob/main/docs/src/ci.md) (opened). `ignoreDefaultArgs` can filter default switches. — [class-browsertype.md](https://github.com/microsoft/playwright/blob/main/docs/src/api/class-browsertype.md) (opened). Playwright main is at 1.64.0-next. — [package.json](https://github.com/microsoft/playwright/blob/main/package.json) (opened)
- **Playwright's default Chromium args** include `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding`. — [chromiumSwitches.ts](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts) (opened)
- **Chromium software-WebGL switches:**
  - `--use-angle=<impl>`, with implementations `swiftshader` and `swiftshader-webgl` (`kANGLEImplementationSwiftShaderForWebGLName`).
  - `--enable-unsafe-swiftshader` ("Allow usage of SwiftShader for WebGL").
  - `EnableSwiftShaderIfNeeded` switches to software WebGL when accelerated WebGL/GL is not enabled, unless the software rasterizer is disabled or the user requested a GL implementation.

  — [Chromium ui/gl/gl_switches.cc](https://github.com/chromium/chromium/blob/main/ui/gl/gl_switches.cc), [gpu/config/gpu_util.cc](https://github.com/chromium/chromium/blob/main/gpu/config/gpu_util.cc) (opened)
- **Vitest browser mode** (vitest main = **5.0.3**):
  - Install `vitest @vitest/browser-playwright` and configure `browser: { provider: playwright(), instances: [...] }`. Providers are `preview` (local only, simulated events), `playwright` and `webdriverio`.
  - `launchOptions`, `connectOptions` and `contextOptions` go into `playwright({...})` "at the top level or inside instances". Setting `channel: 'chromium'` in `launchOptions` opts into new headless.
  - `test.projects` supports multi-project configs.

  — [vitest docs/guide/browser/index.md](https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/index.md), [docs/config/browser/playwright.md](https://github.com/vitest-dev/vitest/blob/main/docs/config/browser/playwright.md), [docs/guide/projects.md](https://github.com/vitest-dev/vitest/blob/main/docs/guide/projects.md), [package.json](https://github.com/vitest-dev/vitest/blob/main/package.json) (opened)
- **Vitest visual regression:** `toMatchScreenshot` (e.g. `await expect(page.getByRole('button')).toMatchScreenshot()`) stores references in `__screenshots__`, with `comparatorName: 'pixelmatch'` configurable. The docs stress that results are "most reliable when run in a standardized and tightly controlled environment" (Docker/CI-only), and that differences come from "GPU, drivers, and hardware acceleration" and "Font rendering pipelines". — [vitest docs/guide/browser/visual-regression-testing.md](https://github.com/vitest-dev/vitest/blob/main/docs/guide/browser/visual-regression-testing.md) (opened)
- **`@vitest/web-worker`** "Simulates Web Worker, but in the same thread". It supports `new Worker(path)`, `new SharedWorker(path)` and `import W from './worker?worker'`, with a `clone: 'native' | 'ponyfill' | 'none'` option, and is enabled via `setupFiles: ['@vitest/web-worker']`. — [vitest packages/web-worker/README.md](https://github.com/vitest-dev/vitest/blob/main/packages/web-worker/README.md) (opened)
- **Canvas readback:** with `preserveDrawingBuffer: false` (the default), the drawing buffer is cleared after compositing, so canvas readback must happen in the same task as the draw, or test builds should set `preserveDrawingBuffer: true`. — [WebGL 1.0 spec source](https://github.com/KhronosGroup/WebGL/blob/main/specs/latest/1.0/index.html) (opened)

### Inferences
- **DO THIS: Vitest 5 config.**
  ```ts
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';
  import { playwright } from '@vitest/browser-playwright';
  const swiftshader = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  export default defineConfig({ test: { projects: [
    { test: { name: 'core', include: ['src/sim/**/*.test.ts'], environment: 'node' } },          // golden hashes; also run with bun/deno
    { test: { name: 'worker-node', include: ['src/**/*.worker.test.ts'], setupFiles: ['@vitest/web-worker'] } },
    { test: { name: 'browser', include: ['src/**/*.browser.test.ts'], browser: {
        enabled: true, headless: true,
        provider: playwright({ launchOptions: { args: swiftshader } }),
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }] } } },
  ] } });
  ```
- **DO THIS: Playwright e2e config.**
  ```ts
  // playwright.config.ts
  import { defineConfig, devices } from '@playwright/test';
  export default defineConfig({
    use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    expect: { toHaveScreenshot: { maxDiffPixels: 200, threshold: 0.2 } },
    webServer: { command: 'npx vite preview --port 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } },
      { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    ],
  });
  // CI: run inside mcr.microsoft.com/playwright:v<same-version>-noble so baselines are generated and compared in one environment.
  ```
- **DO THIS: tests that matter for this architecture.**
  1. **Replay hash:** load `?seed=42&ticks=2000&headless=1`, read `window.__simHash` from the worker, and assert it is equal across chromium/firefox/webkit and the Node golden. This catches non-determinism leaks.
  2. **Context loss:** in-page `gl.getExtension('WEBGL_lose_context').loseContext()`, then `restoreContext()`; assert `renderer.lost === false` and that the frame's non-background pixel count is above a threshold.
  3. **Visibility:** shim `document.visibilityState` + `visibilitychange`, then assert that the worker tick counter stops and resumes without catch-up. Real throttling cannot be observed under Playwright defaults.
  4. **Canvas pixels:** use `readPixels` statistics (e.g. non-background pixel count within ±2%, role-colour histogram) rather than exact screenshots for WebGL, because SwiftShader output differs from GPUs.
  5. **Screenshots:** use `toHaveScreenshot`/`toMatchScreenshot` only for DOM/uPlot panels and one canvas frame at a fixed seed and tick in Docker.
- **SwiftShader caveat.** It runs everywhere but is slow, so use small populations (≤ 5k) in e2e and keep performance tests out of CI, or run them on a self-hosted GPU runner.

### Gaps
- Whether Chrome 15x headless shell still enables SwiftShader WebGL automatically, or now requires `--enable-unsafe-swiftshader`, was not confirmed from release notes (blocked). The switch exists, so pass it explicitly.
- GPU availability on GitHub-hosted runners in 2026 was not checked (docs.github.com not tested; most docs domains blocked). Assume no GPU.
- The exact `toMatchScreenshot` option names beyond `comparatorName` (e.g. pixel-ratio tolerances) were not extracted.

---

## 7. Accessibility for an animated simulation

### Takeaway
WCAG 2.2 Level A/AA obligations for this app:
- **2.2.2 Pause, Stop, Hide (A):** a pause control for the moving dots and for auto-updating charts (or control of their update frequency).
- **2.3.1 Three Flashes (A):** no large-area flashing above 3 per second.
- **1.4.1 Use of Color (A):** role must not be colour-only.
- **1.4.11 Non-text Contrast (AA):** role colours and UI ≥ 3:1 against the background.
- **2.1.1 Keyboard (A):** all controls operable by keyboard.
- **4.1.3 Status Messages (AA):** announcements via role="status" / polite live regions.

**2.3.3 (AAA)** plus `prefers-reduced-motion` justify starting paused or reduced. uPlot has no built-in accessibility (issue #954 has been open since 2024), so pair charts with text summaries and a data table. Colour-blind-safe 4–6-role sets that pass 3:1 on a dark background are listed below with computed distinguishability.

### Cited Findings
- **2.2.2 Pause, Stop, Hide (Level A), normative text:** "For any moving, blinking or scrolling information that (1) starts automatically, (2) lasts more than five seconds, and (3) is presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide it unless … essential; and … For any auto-updating information that (1) starts automatically and (2) is presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide it or to control the frequency of the update". — [w3c/wcag guidelines/sc/20/pause-stop-hide.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/pause-stop-hide.html) (opened)
- **2.3.1 Three Flashes or Below Threshold (A):** "Web pages do not contain anything that flashes more than three times in any one second period, or the flash is below the general flash and red flash thresholds." — [sc/20/three-flashes-or-below-threshold.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/three-flashes-or-below-threshold.html) (opened)
- **Flash thresholds:** content passes if it has no more than 3 general and/or red flashes per second, or if the combined flashing area is ≤ 0.006 sr (25% of any 10° field). "A general flash is … opposing changes in relative luminance of 10% or more … where the relative luminance of the darker image is below 0.80". A 341×256 px rectangle at 1024×768 approximates a 10° field. — [w3c/wcag guidelines/terms/20/general-flash-and-red-flash-thresholds.html](https://github.com/w3c/wcag/blob/main/guidelines/terms/20/general-flash-and-red-flash-thresholds.html) (opened)
- **2.3.3 Animation from Interactions (AAA):** "Motion animation triggered by interaction can be disabled, unless the animation is essential". — [sc/21/animation-from-interactions.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/21/animation-from-interactions.html) (opened)
- **1.4.1 Use of Color (A):** "Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element." — [sc/20/use-of-color.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/use-of-color.html) (opened)
- **1.4.11 Non-text Contrast (AA):** "contrast ratio of at least 3:1 against adjacent color(s)" for UI components and for "Graphical Objects: Parts of graphics required to understand the content". — [sc/21/non-text-contrast.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/21/non-text-contrast.html) (opened)
- **2.1.1 Keyboard (A):** "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes". — [sc/20/keyboard.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/20/keyboard.html) (opened)
- **4.1.3 Status Messages (AA):** "status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus." — [sc/21/status-messages.html](https://github.com/w3c/wcag/blob/main/guidelines/sc/21/status-messages.html) (opened)
- **WAI-ARIA live-region semantics:**
  - With `polite`, assistive technologies "notify users of updates but generally do not interrupt the current task, and updates take low priority", and updates are presented "at the next graceful opportunity".
  - With `assertive`, they "immediately notify the user … and could potentially clear the speech queue of previous updates".
  - Authors "SHOULD NOT use the assertive value unless the interruption is" necessary.

  — [w3c/aria index.html](https://github.com/w3c/aria/blob/main/index.html) (opened)
- **`prefers-reduced-motion: reduce`** "Indicates that user has notified the system that they prefer an interface that removes or replaces the types of motion-based animation that either trigger discomfort for those with vestibular motion sensitivity, or distraction for those with attention deficits." — [csswg-drafts mediaqueries-5/Overview.bs](https://github.com/w3c/csswg-drafts/blob/main/mediaqueries-5/Overview.bs) (opened). Support: Chrome 74, Firefox 63, Safari 10.1, iOS 10.3. — [MDN BCD](https://github.com/mdn/browser-compat-data) (opened)
- **`ariaNotify()`** (Element/Document) is now in Chrome/Edge 141, Firefox 150 and Safari/iOS **27**. BCD notes that on macOS "an announcement may not be spoken if another accessibility event fires at the same time" (a VoiceOver limitation), and that it is exposed on ChromeOS "but announcements are never spoken". — [MDN BCD 8.1.4 api.Document.ariaNotify](https://github.com/mdn/browser-compat-data) (opened)
- **uPlot accessibility:** issue #954 "Accessibility" (opened 2024-05-27) is open with no labels, assignee or visible maintainer response. — [leeoniya/uPlot#954](https://github.com/leeoniya/uPlot/issues/954) (opened); [uPlot issue search](https://github.com/leeoniya/uPlot/issues?q=accessibility) (opened)
- **Palette sources and hex values:**
  - Okabe–Ito ("Colorblind8"): `#0072B2 #E69F00 #F0E442 #009E73 #56B4E9 #D55E00 #CC79A7 #000000`. — [Bokeh palettes.py](https://github.com/bokeh/bokeh/blob/HEAD/src/bokeh/palettes.py) (opened)
  - Paul Tol **bright** `#4477AA #EE6677 #228833 #CCBB44 #66CCEE #AA3377 #BBBBBB`; **vibrant** `#EE7733 #0077BB #33BBEE #EE3377 #CC3311 #009988 #BBBBBB`; **muted** `#CC6677 #332288 #DDCC77 #117733 #88CCEE #882255 #44AA99 #999933 #AA4499 #DDDDDD`; **light** `#77AADD #EE8866 #EEDD88 #FFAABB #99DDFF #44BB99 #BBCC33 #AAAA00 #DDDDDD`. — [tol-colors 2.2.0 colors.json (PyPI)](https://pypi.org/project/tol-colors/) (opened: wheel contents)
  - Petroff accessible sequences: petroff6 `#5790FC #F89C20 #E42536 #964A8B #9C9CA1 #7A21DD`; petroff8 `#1845FB #FF5E02 #C91F16 #C849A9 #ADAD7D #86C8DD #578DFF #656364`; petroff10 `#3F90DA #FFA90E #BD1F01 #94A4A2 #832DB6 #A96B59 #E76300 #B9AC70 #717581 #92DADD`. — [matplotlib lib/matplotlib/_cm.py](https://github.com/matplotlib/matplotlib/blob/main/lib/matplotlib/_cm.py) (opened)
  - Colour-vision-deficiency simulation used Machado et al. (2009) severity-1.0 matrices as packaged in DaltonLens. The DaltonLens docs recommend Viénot 1999 for full protan/deutan and Brettel 1997 for tritan; I used Machado for all three. — [DaltonLens-Python simulate.py](https://github.com/DaltonLens/DaltonLens-Python/blob/master/daltonlens/simulate.py) (opened)
- **Computed contrast and distinguishability** (WCAG relative-luminance contrast; CIEDE2000 in CIELAB D65 after CVD simulation in linear RGB; script [pal.py](../../round-3-2d-look/prototypes/palette/pal.py); measured locally). Contrast vs `#0B0F14`:
  - Okabe–Ito: 0072B2 3.7, E69F00 8.5, F0E442 14.5, 009E73 5.6, 56B4E9 8.3, D55E00 5.0, CC79A7 6.3.
  - Tol bright: 4477AA 4.1, EE6677 6.2, 228833 4.2, CCBB44 9.8, 66CCEE 10.5, AA3377 **3.2**, BBBBBB 10.0.
  - Tol muted: 332288 **1.6 (fails)**, 882255 **2.2 (fails)**, 117733 3.4, all others ≥ 3.7.
  - Petroff6: 7A21DD **2.8 (fails)**.

  Best subsets, each colour ≥ 3:1 vs `#121212`, maximising the worst-case minimum pairwise ΔE00 over normal/protan/deutan/tritan vision:

  | Roles | Recommended set | worst-case min ΔE00 | runner-up |
  |---|---|---|---|
  | 4 | Tol muted `#DDCC77 #117733 #88CCEE #AA4499` | **24.9** | Okabe–Ito `#0072B2 #F0E442 #56B4E9 #D55E00` (20.0); Tol bright `#228833 #CCBB44 #66CCEE #AA3377` (19.7) |
  | 5 | Petroff6 `#5790FC #F89C20 #E42536 #964A8B #9C9CA1` | **17.7** | Tol muted `#117733 #44AA99 #999933 #AA4499 #DDDDDD` (16.3); Tol bright `#EE6677 #228833 #CCBB44 #66CCEE #AA3377` (15.3) |
  | 6 | Tol muted `#DDCC77 #117733 #44AA99 #999933 #AA4499 #DDDDDD` | **15.5** | Tol bright (6 + grey) `#EE6677 #228833 #CCBB44 #66CCEE #AA3377 #BBBBBB` (15.1); Okabe–Ito 6 (12.1, weakest under protan/tritan) |

### Inferences
- **DO THIS: controls and motion (2.2.2, 2.3.3, 2.1.1).**
  - Provide a visible Play/Pause button first in tab order, plus keyboard shortcuts (Space = pause, `.` = step, `+`/`-` = speed), and a chart "freeze" toggle or chart update-rate selector.
  - When `matchMedia('(prefers-reduced-motion: reduce)')` matches: start **paused**; disable camera pan/zoom tweens, trails and pulses; offer "step mode" (one update per second or on keypress).
  - Re-check the media query on change.
- **DO THIS: flashing (2.3.1).** Never flash the background or large regions, e.g. on "crash" events. Blink individual dots at ≤ 2 Hz. If many dots change simultaneously, keep the luminance change < 10% or the affected area well under 25% of a 341×256 px region.
- **DO THIS: redundant encoding (1.4.1).** Encode role by **shape** in the instanced fragment shader: circle, square, triangle, diamond, ring and plus/cross can all be signed-distance functions selected by a per-instance `u8` shape ID. Add a 1 px dark outline (or light outline on dark backgrounds) for edge contrast. Use the same shapes in the legend, and use line dash patterns plus direct end-of-line labels in uPlot.
- **DO THIS: contrast (1.4.11).**
  - Pick role colours from the table above. All recommended sets pass 3:1 on `#121212`/`#0B0F14`; `#117733` is the tightest at 3.4.
  - Avoid Tol `#332288` and `#882255` and Petroff `#7A21DD` on dark backgrounds.
  - Tiny dots need larger colour differences than these ΔE figures suggest (general colour-science knowledge, not sourced here), which is another reason for shape encoding.
- **DO THIS: screen-reader summaries (4.1.3).**
  - A visually hidden `<div role="status" aria-live="polite" aria-atomic="true">` updated **at most every 10 s**, only on meaningful change. Example: "Tick 1,200. Traders 41%, Hoarders 22%; median wealth $18.40, down 3% in the last 10 s." Updates are opt-in and silenced while the sim is paused.
  - Never use `assertive` except for errors.
  - Progressive enhancement: `document.ariaNotify?.(msg)` (Chrome 141+, Firefox 150+, Safari 27+), keeping the live region as fallback.
- **DO THIS: uPlot.** Each chart gets `role="img"` with an `aria-label` summarising the trend, a "Show data table" toggle rendering the last N samples as a `<table>`, and CSV download. uPlot's canvas is not accessible, and its legend is DOM, so keyboard-test it.

### Gaps
- IBM's colour-blind-safe palette (commonly cited as `#648FFF #785EF0 #DC267F #FE6100 #FFB000`) could not be verified from a primary source (ibm.com blocked), so it was not included in the computed comparison. Treat the values as unverified.
- The original Okabe–Ito and Paul Tol pages (jfly.uni-koeln.de, personal.sron.nl) were blocked. Values come from the Bokeh and tol-colors packages, which reproduce them.
- No screen-reader testing was done. Recommended announcement rates (≤ 1 per 10 s) are my inference; no normative rate exists in WCAG or ARIA.

---

## 8. Bundle size: PixiJS v8 (full and particle-only), uPlot, Comlink, lil-gui, Tweakpane; is raw WebGL2 worth it?

### Takeaway
I measured these locally with esbuild because bundlephobia and pkg-size were blocked. PixiJS 8.22.0 costs about **110 KB gzip** for a WebGL-only `WebGLRenderer` + `ParticleContainer`, about **157 KB** via `Application` auto-detect, and **265 KB** for everything. A hand-written WebGL2 instanced-dot renderer with context-loss handling is about **1.1 KB gzip**. For dots-only rendering, raw WebGL2 saves about 110–155 KB gzip and removes a dependency that has an open iOS context-loss bug. Keep PixiJS only if you need sprites, text, filters, hit-testing or its WebGPU path.

### Cited Findings
- **Method and results** (esbuild 0.28.2, `--bundle --minify --format=esm --target=es2022`, single file without code-splitting, `gzip -9`, brotli quality 11; package versions as installed 2026-10-04):

  | Entry | min (B) | gzip-9 (B) | brotli-11 (B) |
  |---|---|---|---|
  | pixi.js 8.22.0 — `export * from 'pixi.js'` | 921,029 | **264,835** | 212,639 |
  | pixi.js — `Application` (auto-detect) + `ParticleContainer`/`Particle`/`Texture` | 545,027 | **157,113** | 129,120 |
  | pixi.js — `WebGLRenderer` + `Container` + `ParticleContainer` (WebGL only) | 391,814 | **110,496** | 92,943 |
  | uplot 1.6.32 (JS) | 51,990 | **22,994** | 20,836 |
  | uPlot.min.css | 1,857 | 772 | — |
  | comlink 4.4.2 (main side, `import * as Comlink`) | 4,431 | **2,004** | 1,765 |
  | comlink 4.4.2 (worker side, `expose`) | 3,992 | 1,826 | 1,597 |
  | lil-gui 0.21.0 | 30,665 | **7,926** | 7,009 |
  | tweakpane 4.0.5 | 150,953 | **31,065** | 27,170 |
  | hand-written WebGL2 instanced dots (shaders, VAO, 2 instance buffers, context-loss handlers) | 2,313 | **1,073** | 938 |

  — [local size harness](../prototypes/engine-bench/size) (measured locally)
- **PixiJS 8.22.0 runtime dependencies:** `@xmldom/xmldom ^0.8.15`, `earcut ^3.0.2`, `eventemitter3 ^5.0.1`. — [PixiJS package.json](https://github.com/pixijs/pixijs/blob/dev/package.json) (opened)
- **PixiJS on iOS:** issue #12224 is open (see section 5). — [pixijs/pixijs#12224](https://github.com/pixijs/pixijs/issues/12224) (opened)

### Inferences
- **DO THIS: renderer choice.** Use raw WebGL2 for the dot layer: instanced quads with SDF shapes, about 60–150 lines including shape encoding, DPR/resize and context loss. Keep the `DotRenderer` interface (section 3) so PixiJS can be swapped in later if labels or sprites are needed.
  - If PixiJS stays, import `WebGLRenderer` directly (110 KB) rather than `Application` (157 KB), and rely on Vite code-splitting. Whether Vite's splitting keeps the WebGPU renderer out of the initial chunk with `Application` was not measured.
- **DO THIS: GUI library.** Use lil-gui (about 8 KB gzip) unless Tweakpane-specific controls (graphs, folders/tabs styling) are needed (about 31 KB gzip).
- **Budget estimate.** Raw WebGL2 + uPlot + Comlink + lil-gui ≈ 1 + 23 + 2 + 8 = **about 34 KB gzip** of libraries, versus about 144 KB with PixiJS's WebGL-only build.

### Gaps
- bundlephobia and pkg-size were blocked, so there is no third-party cross-check; numbers are esbuild single-file bundles and real Vite 8 (Rolldown) output may differ by a few percent.
- The PixiJS "particle-only" figure still includes PixiJS's extension registrations and side-effect imports. A more aggressive manual import path (e.g. `pixi.js/…` subpaths) was not explored.
