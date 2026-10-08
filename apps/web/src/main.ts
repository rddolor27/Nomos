import { element, startApp, type App } from './app.ts';
import { SIM_BUILD, takeBoot } from './boot.ts';
import { bindCameraInput } from './camera-input.ts';
import { frameMedianMs, mountHud } from './hud.ts';
import { bindLifecycle } from './lifecycle.ts';
import { backendFrom, seedFrom } from './query.ts';
import { chooseTier, deviceClass, loadVerdict, saveVerdict, tierFromQuery, tierVerdict } from './tiers.ts';

performance.mark('main:eval');

// The user's own setting, so the start counts as their pause: hiding and showing the tab never resumes it (R2).
function prefersReducedMotion(win: Window): boolean {
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// Reading localStorage itself throws where storage is blocked, as in Safari's private mode.
function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Sums each stats message's milliseconds until the verdict is in, then keeps it for this sim build. It applies from
// the next start: a switch mid-run would write canonical state outside the day boundary (sim-core rules).
function checkTier(app: App, storage: Storage | null): void {
  const tickMs: number[] = [];
  let judged = false;
  app.onStats((_tick, systemMs) => {
    if (judged) return;
    tickMs.push(Object.values(systemMs).reduce((sum, ms) => sum + ms, 0));
    const verdict = tierVerdict(tickMs);
    if (verdict === null) return;
    saveVerdict(storage, SIM_BUILD, verdict);
    judged = true;
  });
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// uPlot and lil-gui download only after the first frame (R5), both at once, since one after the other costs a round
// trip; each mount still runs in a task of its own, so input never waits behind them all (load-memory.md §2).
async function afterFirstFrame(app: App): Promise<void> {
  await app.firstFrame;
  mountHud(element(document, '#hud'), app);
  bindCameraInput(element(document, '#view'), app);
  const chartsModule = import('./charts.ts');
  const controlsModule = import('./controls.ts');
  await nextTask();
  const { mountCharts } = await chartsModule;
  const charts = mountCharts(element(document, '#charts'));
  app.onStats((tick, systemMs) => charts.push(tick, systemMs, frameMedianMs(app.frameMs)));
  await nextTask();
  const { mountControls } = await controlsModule;
  mountControls(app);
  performance.mark('app:interactive');
}

const search = location.search;
const storage = readStorage();
const device = deviceClass(navigator, matchMedia('(pointer: coarse) and (hover: none)').matches);
const verdict = loadVerdict(storage, SIM_BUILD);
const tier = chooseTier(device, verdict, tierFromQuery(search));

const start = {
  seed: seedFrom(search, randomSeed),
  tier,
  backend: backendFrom(search),
  paused: prefersReducedMotion(window),
};

startApp(takeBoot(), document, start)
  .then((app) => {
    bindLifecycle(document, window, app);
    if (device === 'phone' && tier === 'phone' && verdict === null) checkTier(app, storage);
    return afterFirstFrame(app);
  })
  // startApp has already said in #status what failed; the console keeps the detail.
  .catch((error: unknown) => console.error(error));
