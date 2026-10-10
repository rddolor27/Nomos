import { element, startApp, type App } from './app/app.ts';
import { SIM_BUILD, takeBoot } from './app/boot.ts';
import { frameMedianMs, mountHud } from './panels/hud.ts';
import { bindLifecycle } from './app/lifecycle.ts';
import { backendFrom, devFrom, seedFrom } from './app/query.ts';
import { chooseTier, deviceClass, loadVerdict, saveVerdict, tierFromQuery, tierVerdict } from './app/tiers.ts';

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
    const verdict = tierVerdict(tickMs, app.agents);
    if (verdict === null) return;
    saveVerdict(storage, SIM_BUILD, verdict);
    judged = true;
  });
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Nothing waits on the economy panel: the app keeps the latest economy message for it, so it can mount after the page is
// interactive, and a chunk that fails to load leaves the rest of the page alone.
async function mountEconomyPanel(app: App): Promise<void> {
  const { mountEconomy } = await import('./panels/economy.ts');
  mountEconomy(element(document, '#economy'), app);
}

// uPlot, the view input and, for ?dev=1 only, lil-gui download only after the first frame (R5), all at once, since one
// after the other costs a round trip; each mount still runs in a task of its own, so input never waits behind them all
// (load-memory.md §2).
async function afterFirstFrame(app: App, dev: boolean): Promise<void> {
  await app.firstFrame;
  const cameraInputModule = import('./view/camera-input.ts');
  const chartsModule = import('./panels/charts.ts');
  const controlsModule = dev ? import('./panels/controls.ts') : null;
  mountHud(element(document, '#hud'), app);
  const { bindCameraInput, loadTownSkin } = await cameraInputModule;
  bindCameraInput(element(document, '#view'), app);
  await nextTask();
  const { mountCharts } = await chartsModule;
  const charts = mountCharts(element(document, '#charts'));
  app.onStats((tick, systemMs) => charts.push(tick, systemMs, frameMedianMs(app.frameMs)));
  if (controlsModule) {
    await nextTask();
    const { mountControls } = await controlsModule;
    mountControls(app);
  }
  performance.mark('app:interactive');
  mountEconomyPanel(app).catch((error: unknown) => console.error(error));
  // Last, as nothing waits on it; its art and layout then load in idle time (web rules).
  await loadTownSkin(app);
}

const search = location.search;
const storage = readStorage();
const device = deviceClass(navigator, matchMedia('(pointer: coarse) and (hover: none)').matches);
const verdict = loadVerdict(storage, SIM_BUILD);
const tierAsked = tierFromQuery(search);
const tier = chooseTier(device, verdict, tierAsked);

const start = {
  seed: seedFrom(search, randomSeed),
  tier,
  tierNamed: tierAsked !== null,
  backend: backendFrom(search),
  paused: prefersReducedMotion(window),
};
const dev = devFrom(search);

startApp(takeBoot(), document, start)
  .then((app) => {
    bindLifecycle(document, window, app);
    if (device === 'phone' && tier === 'phone' && verdict === null) checkTier(app, storage);
    return afterFirstFrame(app, dev);
  })
  // startApp has already said in #status what failed; the console keeps the detail.
  .catch((error: unknown) => console.error(error));
