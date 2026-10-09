import { observeDeviceSize } from '@nomos/render-gl';
import {
  LINE_COLOURS,
  MAP_CELL_PX,
  createMapRenderer,
  fitMapCamera,
  loadAtlasPage,
  mapViewFor,
  panMapBy,
  zoomMapAt,
  type AtlasPage,
  type MapCamera,
  type MapRenderer,
  type MapView,
} from '@nomos/render-gl/map';
import type { PlaceError, PlaceReply, PlaceRequest } from '@nomos/sim-protocol/place';
import type { MapAppMessage, MapWorkerMessage, WorldMap } from '@nomos/sim-protocol/world-map';
import type { App } from '../app/app.ts';
import { crowdAt } from './crowd-motion.ts';
import { cameraOn, goToGroups, mountGoTo, placeInFocus, placeInfo, placeUnder } from './goto.ts';
import { mountLabels, type Labels } from './labels.ts';
import { legendRows, mountLegend } from './legend.ts';
import { bindMapInput, zoomAtCentre, type MapInputTarget } from './map-input.ts';
import type { PlaceHost } from './place-view.ts';
import { OverflowMenu, addToolbarStyles, group, iconButton, zoomGroup } from '../panels/toolbar.ts';

// What the map's browser tests read, as window.__app exposes the town.
interface MapHook {
  open: boolean;
  view: MapView;
  // The last frame's main-thread time: moving the crowd, renderer.draw and labels.update.
  frameMs: number;
  dots: number;
  // Whether the last frame drew the crowd, which only the Region view does.
  crowdDrawn: boolean;
  // The last frame's camera, and the world, so a test can find a place on screen.
  camera: MapCamera | null;
  map: WorldMap | null;
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
  pauseDots: HTMLButtonElement;
  goTo: HTMLSelectElement;
  enter: HTMLButtonElement;
  status: HTMLElement;
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  legend: HTMLElement;
  // The legend, the status and Enter, at the bottom of the map.
  info: HTMLElement;
}

// A place asked of the map worker, which answers it or fails it in time.
interface PendingPlace {
  place: number;
  onReply: (reply: PlaceReply) => void;
  onFail: (why: string) => void;
  timer: ReturnType<typeof setTimeout>;
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
  // Pause dots stops the crowd's clock: the time it has stood is taken off the frame time, so it walks on from where it
  // stood.
  dotsPaused: boolean;
  pausedAtMs: number;
  stoodMs: number;
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
  // Kept after the world arrives, to build its places on request.
  worker: Worker | null;
  pending: PendingPlace | null;
  // The place at the view's centre in the Region view, which Enter, or a tap on it, opens; -1 for none. It is found
  // again whenever the camera or the view changes.
  focus: number;
  focusCamera: MapCamera | null;
  focusView: MapView | null;
  // While the town view covers the map, the map draws nothing.
  placeOpen: boolean;
  // Counted up by every entry and every close, so a town view whose map closed while it loaded never opens.
  entries: number;
  host: PlaceHost | null;
}

// An arrow press moves four cells, so a large world takes about 50 presses to cross.
const PAN_CELLS = 4;
// A place takes tens of ms to build, so a reply this late means the worker is lost.
const PLACE_TIMEOUT_MS = 15_000;

const WATER = `#${LINE_COLOURS.water.toString(16).padStart(6, '0')}`;
// The bar, the focus ring and the buttons come from the toolbar and index.html. Labels carry a dark outline to read on any
// tile, and swatches a light edge for the darker country colours.
const CSS = `
#map { z-index: 2; background: ${WATER}; }
#map canvas { position: absolute; top: 0; left: 0; }
.map-labels { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.map-label { position: absolute; top: 0; left: 0; white-space: nowrap; font: 600 12px/1.2 system-ui, sans-serif;
  text-shadow: -1px -1px var(--ui-ink), 1px -1px var(--ui-ink), -1px 1px var(--ui-ink), 1px 1px var(--ui-ink); }
.map-country { font-size: 14px; letter-spacing: .12em; text-transform: uppercase; }
.map-legend { margin: 0; padding: 0; list-style: none; }
.map-swatch { display: inline-block; width: .8em; height: .8em; margin-right: .5em; outline: 1px solid var(--ui-text);
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
  addToolbarStyles(doc);
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.append(style);
  const parts: Parts = {
    section: make(doc, 'section', {
      id: 'map',
      class: 'ui-view',
      'aria-label': 'Map of the world',
      'aria-describedby': 'map-keys map-status',
      tabindex: '0',
      hidden: '',
    }),
    keys: make(doc, 'p', { id: 'map-keys', hidden: '' }, KEYS),
    bar: make(doc, 'div', { class: 'ui-bar' }),
    close: iconButton(doc, '\u{2715}', 'Close map', 'btn btn-quiet'),
    fit: make(doc, 'button', { type: 'button', class: 'btn' }, 'Fit'),
    zoomIn: make(doc, 'button', { type: 'button', class: 'btn', 'aria-label': 'Zoom in' }, '+'),
    zoomOut: make(doc, 'button', { type: 'button', class: 'btn', 'aria-label': 'Zoom out' }, '\u{2212}'),
    flat: make(doc, 'button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, 'Countries'),
    pauseDots: make(doc, 'button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, 'Pause dots'),
    goTo: make(doc, 'select', { 'aria-label': 'Go to a settlement', disabled: '' }),
    enter: make(doc, 'button', { type: 'button', class: 'btn btn-primary', hidden: '' }, 'Enter'),
    status: make(doc, 'p', { id: 'map-status', role: 'status' }),
    canvas: make(doc, 'canvas', { role: 'img', 'aria-label': 'Map of the countries; the legend after it lists each one' }),
    labels: make(doc, 'div', { class: 'map-labels', 'aria-hidden': 'true' }),
    legend: make(doc, 'div', {}),
    info: make(doc, 'div', { class: 'ui-info' }),
  };
  parts.goTo.append(make(doc, 'option', { value: '', disabled: '', hidden: '', selected: '' }, 'Go to…'));
  const { close, fit, zoomIn, zoomOut, flat, pauseDots, goTo, enter, status, legend } = parts;
  const more = new OverflowMenu(doc, 'map-more', flat, pauseDots);
  parts.bar.append(close, zoomGroup(doc, zoomOut, zoomIn, fit), goTo, more.root);
  parts.info.append(enter, group(doc, 'ui-panel', status, legend));
  parts.section.append(parts.keys, parts.bar, parts.canvas, parts.labels, parts.info);
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
    hook: { open: false, view: 'country', frameMs: 0, dots: 0, crowdDrawn: false, camera: null, map: null },
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
    dotsPaused: false,
    pausedAtMs: 0,
    stoodMs: 0,
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
    worker: null,
    pending: null,
    focus: -1,
    focusCamera: null,
    focusView: null,
    placeOpen: false,
    entries: 0,
    host: null,
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
    zoom: (steps, deviceX, deviceY) => zoom(panel, steps, deviceX, deviceY),
    pan: (dxDevice, dyDevice) => setCamera(panel, panMapBy(panel.camera, dxDevice, dyDevice)),
    arrowPx: () => PAN_CELLS * panel.camera.cellPx,
    fit: refit,
    close: () => close(panel),
    tap: (deviceX, deviceY) => tapAt(panel, deviceX, deviceY),
  };
  parts.close.addEventListener('click', () => close(panel));
  parts.fit.addEventListener('click', refit);
  parts.zoomIn.addEventListener('click', () => zoomAtCentre(parts.section, target, 1));
  parts.zoomOut.addEventListener('click', () => zoomAtCentre(parts.section, target, -1));
  parts.flat.addEventListener('click', () => toggleFlat(panel));
  parts.pauseDots.addEventListener('click', () => setDotsPaused(panel, !panel.dotsPaused));
  parts.enter.addEventListener('click', () => enter(panel, panel.focus, parts.enter));
  bindGoTo(panel, parts.goTo);
  // A drag captures the pointer on the section, which would take a bar button's click, and a press on the bar or the
  // info box is no tap on the map, so both keep their pointers.
  for (const part of [parts.bar, parts.info]) part.addEventListener('pointerdown', (event) => event.stopPropagation());
  panel.reducedMotion.addEventListener('change', () => onMotionPreference(panel));
  bindMapInput(parts.section, target);
  observeDeviceSize(parts.section, (width, height, dpr) => onSize(panel, width, height, dpr));
}

// The list's keys stay its own; only Escape reaches the map, to close it.
function bindGoTo(panel: MapPanel, list: HTMLSelectElement): void {
  list.addEventListener('change', () => goTo(panel, Number(list.value)));
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') event.stopPropagation();
  });
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
  panel.entries++;
  panel.placeOpen = false;
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

// The worker stays for the page once the world is made, to build its places on request.
function makeWorld(panel: MapPanel): void {
  const worker = new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' });
  panel.worker = worker;
  panel.making = true;
  panel.failure = '';
  worker.addEventListener('message', ({ data }: MessageEvent<MapWorkerMessage | PlaceReply | PlaceError>) => {
    onWorkerMessage(panel, data);
  });
  // The worker answers each place itself, with a place-error when it cannot build one, so only an error while the world
  // is made is the map's; a later one stays in the console.
  worker.addEventListener('error', (event) => {
    if (!panel.making) return;
    event.preventDefault();
    worker.terminate();
    panel.worker = null;
    panel.making = false;
    panel.failure = event.message || 'its worker did not start';
    showStatus(panel);
  });
  const generate: MapAppMessage = { type: 'generate', seed: panel.app.seed, size: 'large' };
  worker.postMessage(generate);
}

// A message of a kind the map does not know is no world, so it is left alone.
function onWorkerMessage(panel: MapPanel, data: MapWorkerMessage | PlaceReply | PlaceError): void {
  if (data.type === 'place') placeAnswered(panel, data);
  else if (data.type === 'place-error') placeFailed(panel, data.place, data.message);
  else if (data.type === 'world') {
    panel.making = false;
    adoptWorld(panel, data);
  }
}

function placeAnswered(panel: MapPanel, reply: PlaceReply): void {
  const pending = panel.pending;
  if (!pending || pending.place !== reply.place) return;
  clearTimeout(pending.timer);
  panel.pending = null;
  pending.onReply(reply);
}

// Fails the pending request for that place only; an answer for any other place lands nowhere.
function placeFailed(panel: MapPanel, place: number, why: string): void {
  const pending = panel.pending;
  if (!pending || pending.place !== place) return;
  clearTimeout(pending.timer);
  panel.pending = null;
  pending.onFail(why);
}

// One place at a time: a new request drops any earlier one's callbacks, so a late reply for a place left behind lands
// nowhere.
function requestPlace(panel: MapPanel, place: number, onReply: PendingPlace['onReply'], onFail: PendingPlace['onFail']): void {
  if (panel.pending) clearTimeout(panel.pending.timer);
  panel.pending = null;
  if (!panel.worker) {
    onFail('the map worker has stopped');
    return;
  }
  const timer = setTimeout(() => placeFailed(panel, place, 'the map worker did not answer'), PLACE_TIMEOUT_MS);
  panel.pending = { place, onReply, onFail, timer };
  const request: PlaceRequest = { type: 'place', place };
  panel.worker.postMessage(request);
}

function placeHost(panel: MapPanel): PlaceHost {
  panel.host ??= {
    map: panel.parts.section,
    backend: panel.app.renderer.backend === 'canvas2d' ? 'canvas2d' : 'auto',
    request: (place, onReply, onFail) => requestPlace(panel, place, onReply, onFail),
    paused: () => panel.dotsPaused,
    setPaused: (paused) => setDotsPaused(panel, paused),
    left: () => {
      panel.placeOpen = false;
      requestDraw(panel);
    },
  };
  return panel.host;
}

// The town view, the place pass and the town atlas load on the first entry only, in a chunk of their own.
function enter(panel: MapPanel, place: number, returnFocus: HTMLElement): void {
  if (!panel.world || panel.placeOpen || place < 0) return;
  panel.placeOpen = true;
  const entry = ++panel.entries;
  const info = placeInfo(panel.world.map, panel.world.names, place);
  import('./place-view.ts')
    .then(({ openPlace }) => {
      if (entry === panel.entries) openPlace(placeHost(panel), info, returnFocus);
    })
    .catch((error: unknown) => {
      panel.placeOpen = false;
      requestDraw(panel);
      console.error(error);
    });
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
  panel.hook.map = world.map;
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
  mountGoTo(panel.parts.goTo, goToGroups(world.map, world.names));
  fit(panel);
}

// A tap near a settlement or wonder jumps there, and a tap on the place in focus opens it; a tap on empty map changes
// nothing.
function tapAt(panel: MapPanel, deviceX: number, deviceY: number): void {
  if (!panel.world) return;
  const place = placeUnder(panel.world.map, panel.camera, deviceX, deviceY, panel.dpr);
  if (place >= 0 && place === panel.focus) enter(panel, place, panel.parts.section);
  else if (place >= 0) goTo(panel, place);
}

// The jump is instant: the view centres on the place at the close step, where its crowd walks. The Go to list shows its
// placeholder again after every jump, so it never names a place the view has left.
function goTo(panel: MapPanel, place: number): void {
  panel.parts.goTo.value = '';
  if (!panel.world || panel.deviceWidth === 0 || panel.deviceHeight === 0) return;
  panel.camera = cameraOn(panel.world.map, place, panel.deviceWidth, panel.deviceHeight, panel.dpr);
  requestDraw(panel);
}

function setCamera(panel: MapPanel, camera: MapCamera): void {
  panel.camera = camera;
  requestDraw(panel);
}

// Zooming in again at the closest step opens the settlement or wonder nearest the zoom point, if one lies within reach.
function zoom(panel: MapPanel, steps: number, deviceX: number, deviceY: number): void {
  if (steps <= 0 || panel.camera.cellPx < MAP_CELL_PX[MAP_CELL_PX.length - 1]) {
    setCamera(panel, zoomMapAt(panel.camera, steps, deviceX, deviceY));
    return;
  }
  if (!panel.world) return;
  enter(panel, placeUnder(panel.world.map, panel.camera, deviceX, deviceY, panel.dpr), panel.parts.section);
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
  const ready = `${panel.world.map.countries.capital.length} countries; the legend lists them.`;
  return panel.pageFailed ? `${ready} The map shows flat colours, as its art did not load.` : ready;
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

// Read live: switched on, the dots go back to their time-0 places; switched off, they walk on.
function onMotionPreference(panel: MapPanel): void {
  if (panel.reducedMotion.matches && panel.world) crowdAt(panel.world.crowd, 0, panel.xy);
  requestDraw(panel);
}

// WCAG 2.2.2: anything that moves for over five seconds can be paused (agent ruling). The town view's walkers share it.
function setDotsPaused(panel: MapPanel, paused: boolean): void {
  if (paused === panel.dotsPaused) return;
  panel.dotsPaused = paused;
  panel.parts.pauseDots.setAttribute('aria-pressed', String(paused));
  if (paused) panel.pausedAtMs = performance.now();
  else panel.stoodMs += performance.now() - panel.pausedAtMs;
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
  if (panel.dotsPaused || panel.reducedMotion.matches) return false;
  return mapViewFor(renderer.view, panel.camera.cellPx, panel.dpr) === 'region';
}

// The Enter button names the place in focus, found only when the camera or the view has changed since.
function updateFocus(panel: MapPanel, world: MapWorkerMessage, view: MapView): void {
  if (panel.camera === panel.focusCamera && view === panel.focusView) return;
  panel.focusCamera = panel.camera;
  panel.focusView = view;
  const focus = view === 'region' ? placeInFocus(world.map, panel.camera, panel.deviceWidth, panel.deviceHeight, panel.dpr) : -1;
  if (focus === panel.focus) return;
  panel.focus = focus;
  const { enter, section } = panel.parts;
  // Hiding the button while it has focus, as arrow keys pressed on it pan the map, would drop focus to the page.
  if (focus < 0 && document.activeElement === enter) section.focus();
  enter.hidden = focus < 0;
  if (focus >= 0) enter.textContent = `Enter ${placeInfo(world.map, world.names, focus).name}`;
}

function drawNow(panel: MapPanel, nowMs: number): void {
  const { renderer, labels, world, camera, dpr } = panel;
  if (!renderer || !labels || !world || panel.placeOpen || panel.deviceWidth === 0 || panel.deviceHeight === 0) return;
  const startMs = performance.now();
  const walks = walking(panel, renderer);
  if (walks) crowdAt(world.crowd, nowMs - panel.stoodMs, panel.xy);
  renderer.draw(camera);
  labels.update(camera, renderer.view, panel.deviceWidth / dpr, panel.deviceHeight / dpr, dpr);
  panel.hook.frameMs = performance.now() - startMs;
  panel.hook.view = renderer.view;
  panel.hook.crowdDrawn = renderer.view === 'region';
  panel.hook.camera = camera;
  updateFocus(panel, world, renderer.view);
  if (walks) requestDraw(panel);
}
