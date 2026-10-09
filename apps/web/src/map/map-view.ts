import { observeDeviceSize } from '@nomos/render-gl';
import {
  LINE_COLOURS,
  MAP_CELL_PX,
  createMapRenderer,
  fitMapCamera,
  loadAtlasPage,
  mapViewFor,
  type AtlasPage,
  type MapCamera,
  type MapRenderer,
  type MapView,
} from '@nomos/render-gl/map';
import type { MapAppMessage, MapWorkerMessage } from '@nomos/sim-protocol/world-map';
import type { App } from '../app/app.ts';
import { crowdAt } from './crowd-motion.ts';
import { mountLabels, type Labels } from './labels.ts';
import { legendRows, mountLegend } from './legend.ts';
import { bindMapInput, zoomAtCentre, type MapInputTarget } from './map-input.ts';

// What the map's browser tests read, as window.__app exposes the town.
interface MapHook {
  open: boolean;
  view: MapView;
  // The last frame's main-thread time: moving the crowd, renderer.draw and labels.update.
  frameMs: number;
  dots: number;
  // Whether the last frame drew the crowd, which only the Region view does.
  crowdDrawn: boolean;
}

declare global {
  interface Window {
    __map?: MapHook;
  }
}

interface Parts {
  section: HTMLElement;
  keys: HTMLElement;
  bar: HTMLElement;
  close: HTMLButtonElement;
  fit: HTMLButtonElement;
  zoomIn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  flat: HTMLButtonElement;
  status: HTMLElement;
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  legend: HTMLElement;
}

// Made on the first opening and kept for the page: the world, its labels and the camera outlive a closing, and the
// renderer lives only while the map shows (Rulings 1 and 9).
interface MapPanel {
  readonly app: App;
  readonly parts: Parts;
  // The town's view and HUD, inert under the map (Ruling 8).
  readonly town: readonly HTMLElement[];
  readonly hook: MapHook;
  readonly onFrame: FrameRequestCallback;
  readonly reducedMotion: MediaQueryList;
  canvas: HTMLCanvasElement;
  renderer: MapRenderer | null;
  returnFocus: HTMLElement | null;
  resumeTown: boolean;
  world: MapWorkerMessage | null;
  // Each dot's place, x then y in cells, which crowdAt rewrites in place while the crowd walks.
  xy: Float32Array;
  making: boolean;
  failure: string;
  page: AtlasPage | null;
  pageFailed: boolean;
  labels: Labels | null;
  camera: MapCamera;
  fitted: boolean;
  flat: boolean;
  deviceWidth: number;
  deviceHeight: number;
  dpr: number;
  frameAsked: boolean;
}

const WATER = `#${LINE_COLOURS.water.toString(16).padStart(6, '0')}`;
// The map covers the town's view and HUD, so its bar and focus ring match theirs. Labels carry a dark outline to read on
// any tile, and swatches a light edge for the darker country colours.
const CSS = `
#map { grid-area: 1 / 1; z-index: 2; position: relative; overflow: hidden; touch-action: none; background: ${WATER}; }
#map:focus-visible { outline: none; }
#map:focus-visible::after { content: ""; position: absolute; inset: 0; z-index: 2; border: 3px solid #f7c948;
  pointer-events: none; }
#map canvas { position: absolute; top: 0; left: 0; }
.map-keys { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip-path: inset(50%);
  white-space: nowrap; }
.map-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 1; display: flex; flex-wrap: wrap; align-items: center;
  gap: .3rem 1rem; padding: .4rem .75rem; background: rgb(26 28 36 / .88); }
.map-bar button { font: inherit; min-width: 5.5em; padding: .2rem .8rem; }
.map-bar .map-zoom { min-width: 2.5em; }
.map-bar [aria-pressed="true"] { background: #f7c948; color: #1a1c24; }
.map-bar p { margin: 0; }
.map-labels { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.map-label { position: absolute; top: 0; left: 0; white-space: nowrap; font: 600 12px/1.2 system-ui, sans-serif;
  text-shadow: -1px -1px #1a1c24, 1px -1px #1a1c24, -1px 1px #1a1c24, 1px 1px #1a1c24; }
.map-country { font-size: 14px; letter-spacing: .12em; text-transform: uppercase; }
.map-legend { position: absolute; left: .75rem; bottom: .75rem; z-index: 1; margin: 0; padding: .4rem .75rem;
  list-style: none; background: rgb(26 28 36 / .88); }
.map-swatch { display: inline-block; width: .8em; height: .8em; margin-right: .5em; outline: 1px solid #f6f0de;
  vertical-align: -.05em; }
`;

// Read when the map takes focus; the keys are map-input.ts's.
const KEYS =
  'Arrow keys pan the map, the plus and minus keys or buttons zoom it, Home fits it to the view, and Escape closes it.';

let mapPanel: MapPanel | null = null;

// The Map control's one call. The first builds the panel; every call shows it and focuses it.
export function openMap(app: App, returnFocus: HTMLElement): void {
  mapPanel ??= createPanel(app);
  show(mapPanel, returnFocus);
}

function make<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: Record<string, string>,
  text = '',
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.textContent = text;
  return node;
}

function byId(doc: Document, id: string): HTMLElement {
  const found = doc.getElementById(id);
  if (!found) throw new Error(`the page has no #${id}`);
  return found;
}

function buildParts(doc: Document): Parts {
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.append(style);
  const parts: Parts = {
    section: make(doc, 'section', {
      id: 'map',
      'aria-label': 'Map of the world',
      'aria-describedby': 'map-keys',
      tabindex: '0',
      hidden: '',
    }),
    keys: make(doc, 'p', { id: 'map-keys', class: 'map-keys' }, KEYS),
    bar: make(doc, 'div', { class: 'map-bar' }),
    close: make(doc, 'button', { type: 'button' }, 'Close map'),
    fit: make(doc, 'button', { type: 'button' }, 'Fit'),
    zoomIn: make(doc, 'button', { type: 'button', class: 'map-zoom', 'aria-label': 'Zoom in' }, '+'),
    zoomOut: make(doc, 'button', { type: 'button', class: 'map-zoom', 'aria-label': 'Zoom out' }, '\u{2212}'),
    flat: make(doc, 'button', { type: 'button', 'aria-pressed': 'false' }, 'Countries'),
    status: make(doc, 'p', { role: 'status' }),
    canvas: make(doc, 'canvas', { role: 'img', 'aria-label': 'Map of the countries; the legend after it lists each one' }),
    labels: make(doc, 'div', { class: 'map-labels', 'aria-hidden': 'true' }),
    legend: make(doc, 'div', {}),
  };
  parts.bar.append(parts.close, parts.fit, parts.zoomIn, parts.zoomOut, parts.flat, parts.status);
  parts.section.append(parts.keys, parts.bar, parts.canvas, parts.labels, parts.legend);
  return parts;
}

function createPanel(app: App): MapPanel {
  const parts = buildParts(document);
  const town = [byId(document, 'view'), byId(document, 'hud')];
  town[0].after(parts.section);
  const panel: MapPanel = {
    app,
    parts,
    town,
    hook: { open: false, view: 'country', frameMs: 0, dots: 0, crowdDrawn: false },
    onFrame: (nowMs) => {
      panel.frameAsked = false;
      drawNow(panel, nowMs);
    },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)'),
    canvas: parts.canvas,
    renderer: null,
    returnFocus: null,
    resumeTown: false,
    world: null,
    xy: new Float32Array(0),
    making: false,
    failure: '',
    page: null,
    pageFailed: false,
    labels: null,
    camera: { x: 0, y: 0, cellPx: MAP_CELL_PX[0] },
    fitted: false,
    flat: false,
    deviceWidth: 0,
    deviceHeight: 0,
    dpr: 1,
    frameAsked: false,
  };
  bindPanel(panel);
  loadPage(panel);
  window.__map = panel.hook;
  return panel;
}

function bindPanel(panel: MapPanel): void {
  const { parts } = panel;
  const refit = (): void => {
    fit(panel);
    requestDraw(panel);
  };
  const target: MapInputTarget = {
    camera: () => panel.camera,
    setCamera: (camera) => {
      panel.camera = camera;
      requestDraw(panel);
    },
    fit: refit,
    close: () => close(panel),
  };
  parts.close.addEventListener('click', () => close(panel));
  parts.fit.addEventListener('click', refit);
  parts.zoomIn.addEventListener('click', () => zoomAtCentre(parts.section, target, 1));
  parts.zoomOut.addEventListener('click', () => zoomAtCentre(parts.section, target, -1));
  parts.flat.addEventListener('click', () => toggleFlat(panel));
  // A drag captures the pointer on the section, which would take a bar button's click, so the bar keeps its pointers.
  parts.bar.addEventListener('pointerdown', (event) => event.stopPropagation());
  bindMapInput(parts.section, target);
  observeDeviceSize(parts.section, (width, height, dpr) => onSize(panel, width, height, dpr));
}

function show(panel: MapPanel, returnFocus: HTMLElement): void {
  panel.returnFocus = returnFocus;
  if (!panel.hook.open) {
    panel.resumeTown = !panel.app.paused;
    if (panel.resumeTown) panel.app.setPaused(true);
    setTownInert(panel, true);
    panel.parts.section.hidden = false;
    panel.hook.open = true;
    panel.renderer = openRenderer(panel);
    if (panel.world && !panel.labels) mountWorld(panel, panel.world);
    if (!panel.world && !panel.making) makeWorld(panel);
    showStatus(panel);
    requestDraw(panel);
  }
  panel.parts.section.focus();
}

function close(panel: MapPanel): void {
  if (!panel.hook.open) return;
  panel.hook.open = false;
  panel.parts.section.hidden = true;
  closeRenderer(panel);
  setTownInert(panel, false);
  if (panel.resumeTown) panel.app.setPaused(false);
  panel.returnFocus?.focus();
}

function setTownInert(panel: MapPanel, inert: boolean): void {
  for (const part of panel.town) part.inert = inert;
}

// A new renderer starts from what the panel kept. The map follows the town's backend, so ?canvas draws both in Canvas2D.
function openRenderer(panel: MapPanel): MapRenderer {
  const backend = panel.app.renderer.backend === 'canvas2d' ? 'canvas2d' : 'auto';
  const renderer = createMapRenderer(panel.canvas, { backend });
  renderer.init();
  if (panel.deviceWidth > 0 && panel.deviceHeight > 0) renderer.resize(panel.deviceWidth, panel.deviceHeight, panel.dpr);
  if (panel.world) setWorld(renderer, panel.world, panel.xy);
  if (panel.page) renderer.setAtlas(panel.page);
  renderer.setFlat(panel.flat);
  return renderer;
}

// dispose loses the map's context for good, so the next opening draws on a fresh canvas (Ruling 1).
function closeRenderer(panel: MapPanel): void {
  const renderer = panel.renderer;
  if (!renderer) return;
  renderer.dispose();
  panel.renderer = null;
  panel.canvas = renderer.canvas.cloneNode(false) as HTMLCanvasElement;
  renderer.canvas.replaceWith(panel.canvas);
}

function makeWorld(panel: MapPanel): void {
  const worker = new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' });
  panel.making = true;
  panel.failure = '';
  worker.addEventListener('message', ({ data }: MessageEvent<MapWorkerMessage>) => {
    worker.terminate();
    panel.making = false;
    adoptWorld(panel, data);
  });
  worker.addEventListener('error', (event) => {
    event.preventDefault();
    worker.terminate();
    panel.making = false;
    panel.failure = event.message || 'its worker did not start';
    showStatus(panel);
  });
  const generate: MapAppMessage = { type: 'generate', seed: panel.app.seed, size: 'large' };
  worker.postMessage(generate);
}

// setCrowd sizes the renderer's buffers, so it runs once per renderer, never per frame.
function setWorld(renderer: MapRenderer, world: MapWorkerMessage, xy: Float32Array): void {
  renderer.setWorld(world.map);
  renderer.setCrowd(world.crowd.hue, xy);
}

// The crowd starts at its time-0 places, where it stays under reduced motion. A world that arrives after a closing waits
// for the next opening, where show mounts it.
function adoptWorld(panel: MapPanel, world: MapWorkerMessage): void {
  panel.world = world;
  panel.xy = new Float32Array(2 * world.crowd.hue.length);
  crowdAt(world.crowd, 0, panel.xy);
  panel.hook.dots = world.crowd.hue.length;
  showStatus(panel);
  if (!panel.renderer) return;
  setWorld(panel.renderer, world, panel.xy);
  mountWorld(panel, world);
  requestDraw(panel);
}

// Labels are measured as they mount, so they mount only while the map shows.
function mountWorld(panel: MapPanel, world: MapWorkerMessage): void {
  panel.labels = mountLabels(panel.parts.labels, world.map, world.names);
  mountLegend(panel.parts.legend, legendRows(world.map, world.names));
  fit(panel);
}

// Until the page arrives, or if it never does, the renderer draws the flat Countries view (Ruling 4).
function loadPage(panel: MapPanel): void {
  const base = document.baseURI;
  loadAtlasPage(new URL('atlas/map.json', base).href, new URL('atlas/map.webp', base).href).then(
    (page) => {
      panel.page = page;
      panel.renderer?.setAtlas(page);
      requestDraw(panel);
    },
    () => {
      panel.pageFailed = true;
      showStatus(panel);
    },
  );
}

function statusText(panel: MapPanel): string {
  if (panel.failure) return `The map could not be made: ${panel.failure}`;
  if (!panel.world) return 'Making the map…';
  return panel.pageFailed ? 'The map shows flat colours, as its art did not load.' : '';
}

// Rewriting the same text would make some screen readers announce it again.
function showStatus(panel: MapPanel): void {
  const text = statusText(panel);
  if (panel.parts.status.textContent !== text) panel.parts.status.textContent = text;
}

// A view too small to measure, or a world not yet here, keeps the camera where it is.
function fit(panel: MapPanel): void {
  if (!panel.world || panel.deviceWidth === 0 || panel.deviceHeight === 0) return;
  panel.camera = fitMapCamera(panel.world.map.width, panel.world.map.height, panel.deviceWidth, panel.deviceHeight);
  panel.fitted = true;
}

function toggleFlat(panel: MapPanel): void {
  panel.flat = !panel.flat;
  panel.parts.flat.setAttribute('aria-pressed', String(panel.flat));
  panel.renderer?.setFlat(panel.flat);
  requestDraw(panel);
}

// Drawn at once, inside the observer, so a resized canvas never shows a blank frame before the next one.
function onSize(panel: MapPanel, width: number, height: number, dpr: number): void {
  panel.deviceWidth = width;
  panel.deviceHeight = height;
  panel.dpr = dpr;
  if (!panel.renderer || width === 0 || height === 0) return;
  panel.renderer.resize(width, height, dpr);
  if (!panel.fitted) fit(panel);
  drawNow(panel, performance.now());
}

// The map draws on demand: a camera change, a resize, a toggle or an arrival asks for one frame. Only a walking crowd
// asks for the next frame itself.
function requestDraw(panel: MapPanel): void {
  if (panel.frameAsked) return;
  panel.frameAsked = true;
  requestAnimationFrame(panel.onFrame);
}

// The crowd walks only where it is drawn, in the Region view, which mapViewFor predicts as the renderer will choose it.
function walking(panel: MapPanel, renderer: MapRenderer): boolean {
  return !panel.reducedMotion.matches && mapViewFor(renderer.view, panel.camera.cellPx, panel.dpr) === 'region';
}

function drawNow(panel: MapPanel, nowMs: number): void {
  const { renderer, labels, world, camera, dpr } = panel;
  if (!renderer || !labels || !world || panel.deviceWidth === 0 || panel.deviceHeight === 0) return;
  const startMs = performance.now();
  const walks = walking(panel, renderer);
  if (walks) crowdAt(world.crowd, nowMs, panel.xy);
  renderer.draw(camera);
  labels.update(camera, renderer.view, panel.deviceWidth / dpr, panel.deviceHeight / dpr, dpr);
  panel.hook.frameMs = performance.now() - startMs;
  panel.hook.view = renderer.view;
  panel.hook.crowdDrawn = renderer.view === 'region';
  if (walks) requestDraw(panel);
}
