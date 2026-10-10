import { CANVAS2D_AGENT_CAP, mountSkinToggle, skinFromQuery, type SkinRenderer } from '@nomos/render-gl';
import type { Tier } from '@nomos/sim-protocol';
import { element, type App } from '../app/app.ts';
import { SpeedBar, speedForKey } from './speed-bar.ts';

const REFRESH_MS = 250;
const TIER_LABELS: Record<Tier, string> = { phone: 'Phone tier', 'phone-plus': 'Phone-plus tier', desktop: 'Desktop tier' };

// A page's first Intl formatter sets up ICU, about 100 ms at the startup gate's phone CPU rate before the first frame,
// so the HUD groups digits itself.
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type Write = (text: string) => void;

// Layout, not script, dominates HUD cost, so a text node is written only when its text changes (load-memory.md §1).
function textWriter(node: Text): Write {
  let shown = node.data;
  return (text) => {
    if (text === shown) return;
    shown = text;
    node.data = text;
  };
}

// A readout holds only its value, so tests and screen readers get the number without its label.
function readout(root: HTMLElement, id: string, label = ''): Write {
  const doc = root.ownerDocument;
  const value = doc.createElement('span');
  value.id = id;
  const text = doc.createTextNode('');
  value.append(text);
  const item = doc.createElement('span');
  item.append(label, value);
  root.append(item);
  return textWriter(text);
}

function row(list: HTMLElement, name: string, before: Element | null): Write {
  const doc = list.ownerDocument;
  const term = doc.createElement('dt');
  term.textContent = name;
  const text = doc.createTextNode('');
  const value = doc.createElement('dd');
  value.append(text);
  const item = doc.createElement('div');
  item.append(term, value);
  list.insertBefore(item, before);
  return textWriter(text);
}

function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

export function frameMedianMs(frameMs: readonly number[]): number {
  if (frameMs.length === 0) return 0;
  return [...frameMs].sort((a, b) => a - b)[frameMs.length >> 1];
}

function agentsText(app: App): string {
  const total = formatCount(app.agents);
  if (app.renderer.backend !== 'canvas2d') return `${total} agents`;
  return `${formatCount(Math.min(CANVAS2D_AGENT_CAP, app.agents))} of ${total} agents shown (no WebGL2)`;
}

function bindPlay(play: HTMLButtonElement, app: App): void {
  const label = (): void => {
    play.textContent = app.paused ? 'Play' : 'Pause';
  };
  play.addEventListener('click', () => {
    app.setPaused(!app.paused);
    label();
  });
  app.worker.addEventListener('error', () => {
    play.disabled = true;
  });
  label();
  play.disabled = false;
}

// The toggle reaches the renderer through the app, so a paused view still redraws in the skin chosen.
function skinRenderer(app: App): SkinRenderer {
  return {
    setSkin(skin) {
      const drawn = app.renderer.setSkin(skin);
      app.redraw();
      return drawn;
    },
    setLod(policy) {
      app.renderer.setLod(policy);
      app.redraw();
    },
  };
}

// The map and its scene load only when asked for, in a chunk of their own (interfaces.md, In web).
function showMap(app: App, button: HTMLElement): void {
  import('../map/map-view.ts')
    .then(({ openMap }) => openMap(app, button))
    .catch((error: unknown) => console.error(error));
}

// Its name stays exactly "Map": the map's specs find it by that name, and it takes the focus back when the map closes.
function mapButton(doc: Document, app: App): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  button.textContent = 'Map';
  button.addEventListener('click', () => showMap(app, button));
  return button;
}

// A digit pressed on a HUD control picks a speed, as in the town view (view/camera-input.ts), so a click on a button
// does not leave the keys dead.
function bindSpeedKeys(root: HTMLElement, app: App, bar: SpeedBar): void {
  root.addEventListener('keydown', (event) => {
    const speed = speedForKey(event);
    if (speed === undefined) return;
    app.setSpeed(speed);
    bar.show(speed);
    event.preventDefault();
  });
}

export function mountHud(root: HTMLElement, app: App): void {
  const doc = root.ownerDocument;
  const play = element<HTMLButtonElement>(doc, '#play');
  bindPlay(play, app);
  const speedBar = new SpeedBar(doc, (speed) => app.setSpeed(speed));
  play.after(speedBar.root, mapButton(doc, app));
  bindSpeedKeys(root, app, speedBar);
  app.worker.addEventListener('error', () => speedBar.disable());
  const tick = readout(root, 'hud-tick', 'Tick ');
  const agents = readout(root, 'hud-agents');
  const tier = readout(root, 'hud-tier');
  const zoom = readout(root, 'hud-zoom');
  mountSkinToggle(root, skinRenderer(app), skinFromQuery(doc.location.search) ?? 'auto');
  const systems = doc.createElement('dl');
  systems.id = 'hud-systems';
  root.append(systems);
  const frame = row(systems, 'frame', null);
  const frameRow = systems.lastElementChild;
  const systemRows = new Map<string, Write>();
  let latest: Record<string, number> = {};
  app.onStats((_tick, systemMs) => {
    latest = systemMs;
  });
  // The status line stays last, after everything mounted here.
  root.append(element(doc, '#status'));

  const refresh = (): void => {
    tick(formatCount(app.tick));
    agents(agentsText(app));
    tier(TIER_LABELS[app.tier]);
    zoom(`Zoom ${app.camera.zoom}×`);
    speedBar.show(app.speed);
    for (const [name, ms] of Object.entries(latest)) {
      let write = systemRows.get(name);
      if (!write) {
        write = row(systems, name, frameRow);
        systemRows.set(name, write);
      }
      write(formatMs(ms));
    }
    frame(formatMs(frameMedianMs(app.frameMs)));
  };
  refresh();
  setInterval(refresh, REFRESH_MS);
}
