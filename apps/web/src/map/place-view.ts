import { observeDeviceSize } from '@nomos/render-gl';
import { loadAtlasPage, type AtlasPage } from '@nomos/render-gl/map';
import {
  PLACE_SCALES,
  clampPlaceCamera,
  createPlaceRenderer,
  fitPlaceCamera,
  openPlaceCamera,
  panPlaceBy,
  zoomPlaceAt,
  type PlaceCamera,
  type PlaceRenderer,
} from '@nomos/render-gl/place';
import { PLACE_TILE_PX, type PlaceLayout, type PlaceReply } from '@nomos/sim-protocol/place';
import type { PlaceInfo } from './goto.ts';
import { bindMapInput, zoomAtCentre, type MapInputTarget } from './map-input.ts';
import { Walkers } from './walkers.ts';

// What the town view's browser tests read, as window.__map exposes the map.
interface PlaceHook {
  open: boolean;
  place: number;
  // True once a frame has drawn the place's sprites.
  ready: boolean;
  backend: string;
  scale: number;
  // The last frame's main-thread time: moving the walkers and renderer.draw.
  frameMs: number;
  walkers: number;
  // Where the first walker stands, in art px.
  walkerX: number;
  walkerY: number;
}

declare global {
  interface Window {
    __place?: PlaceHook;
  }
}

// What the map view lends the town view.
export interface PlaceHost {
  // The map's section, which the town view covers, inert, while it shows.
  readonly map: HTMLElement;
  readonly backend: 'auto' | 'canvas2d';
  // Asks the map worker for a place; one of the two callbacks runs, in time.
  request(place: number, onReply: (reply: PlaceReply) => void, onFail: (why: string) => void): void;
  // Pause dots, shared by the map's crowd and the town's walkers.
  paused(): boolean;
  setPaused(paused: boolean): void;
  // Runs once the town view has hidden, before focus goes back.
  left(): void;
}

interface Parts {
  section: HTMLElement;
  keys: HTMLElement;
  bar: HTMLElement;
  back: HTMLButtonElement;
  retry: HTMLButtonElement;
  fit: HTMLButtonElement;
  zoomIn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  pause: HTMLButtonElement;
  title: HTMLElement;
  about: HTMLElement;
  status: HTMLElement;
  // The image the place shows as, named for it. The canvas inside is swapped on every exit and by the Canvas2D fallback,
  // so the name stays on this wrapper and the canvas is hidden from assistive tech.
  picture: HTMLElement;
  canvas: HTMLCanvasElement;
}

// Made on the first entry and kept for the page, with the atlas; the renderer lives only while a place shows.
interface PlaceView {
  readonly host: PlaceHost;
  readonly parts: Parts;
  readonly hook: PlaceHook;
  readonly onFrame: FrameRequestCallback;
  readonly reducedMotion: MediaQueryList;
  canvas: HTMLCanvasElement;
  renderer: PlaceRenderer | null;
  // The town atlas, loaded on the first entry; a failed load is tried again on the next entry or on Try again.
  page: AtlasPage | null;
  pageLoading: boolean;
  pageFailed: boolean;
  info: PlaceInfo | null;
  layout: PlaceLayout | null;
  walkers: Walkers | null;
  failure: string;
  camera: PlaceCamera;
  fitted: boolean;
  deviceWidth: number;
  deviceHeight: number;
  dpr: number;
  // How long the walkers have walked, and the last walking frame's time, or -1 after a frame that stood still.
  walkedMs: number;
  lastWalkMs: number;
  frameAsked: boolean;
  returnFocus: HTMLElement | null;
}

// The town view covers the map, its bar shaped like the map's (.map-bar), over the place's own dark ground.
const CSS = `
#place { grid-area: 1 / 1; z-index: 3; position: relative; overflow: hidden; touch-action: none; background: #020202; }
#place:focus-visible { outline: none; }
#place:focus-visible::after { content: ""; position: absolute; inset: 0; z-index: 2; border: 3px solid #f7c948;
  pointer-events: none; }
#place .place-picture { position: absolute; inset: 0; }
#place canvas { position: absolute; top: 0; left: 0; }
#place h2 { margin: 0; font-size: inherit; }
`;

const KEYS =
  'Arrow keys pan the place, the plus and minus keys or buttons zoom it, Home fits it to the view, and Escape goes back ' +
  'to the map.';
// An arrow press moves two tiles.
const ARROW_TILES = 2;
// A frame later than this walks the walkers only this far, so a stalled tab never jumps them across the place.
const MOST_WALK_MS = 100;
// What a place holds, by its standing sprites' frames, as the picture's name tells it.
const HOLDINGS: [part: string, one: string, many: string][] = [
  ['houses/', 'home', 'homes'],
  ['buildings/civic_', 'civic building', 'civic buildings'],
  ['buildings/shop_', 'shop or stall', 'shops and stalls'],
  ['buildings/work_', 'workplace', 'workplaces'],
  ['landmarks/', 'landmark', 'landmarks'],
  ['wonders/', 'wonder', 'wonders'],
  ['/tree_', 'tree', 'trees'],
];

let placeView: PlaceView | null = null;

// The map view's one call, made when a place is entered.
export function openPlace(host: PlaceHost, info: PlaceInfo, returnFocus: HTMLElement): void {
  placeView ??= createView(host);
  show(placeView, info, returnFocus);
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string>, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.textContent = text;
  return node;
}

function buildParts(): Parts {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const parts: Parts = {
    section: make('section', {
      id: 'place',
      'aria-labelledby': 'place-title',
      'aria-describedby': 'place-keys place-status',
      tabindex: '0',
      hidden: '',
    }),
    keys: make('p', { id: 'place-keys', hidden: '' }, KEYS),
    bar: make('div', { class: 'map-bar' }),
    back: make('button', { type: 'button' }, 'Back to map'),
    retry: make('button', { type: 'button', hidden: '' }, 'Try again'),
    fit: make('button', { type: 'button' }, 'Fit'),
    zoomIn: make('button', { type: 'button', class: 'map-zoom', 'aria-label': 'Zoom in' }, '+'),
    zoomOut: make('button', { type: 'button', class: 'map-zoom', 'aria-label': 'Zoom out' }, '\u{2212}'),
    // The map's Pause dots, by the name its walkers go by here; both share one state.
    pause: make('button', { type: 'button', 'aria-pressed': 'false' }, 'Pause people'),
    title: make('h2', { id: 'place-title' }),
    about: make('p', {}),
    status: make('p', { id: 'place-status', role: 'status' }),
    picture: make('div', { class: 'place-picture', role: 'img' }),
    canvas: make('canvas', { 'aria-hidden': 'true' }),
  };
  const { back, retry, fit, zoomIn, zoomOut, pause, title, about, status } = parts;
  parts.bar.append(back, retry, fit, zoomIn, zoomOut, pause, title, about, status);
  parts.picture.append(parts.canvas);
  parts.section.append(parts.keys, parts.bar, parts.picture);
  return parts;
}

function createView(host: PlaceHost): PlaceView {
  const parts = buildParts();
  host.map.after(parts.section);
  const view: PlaceView = {
    host,
    parts,
    hook: { open: false, place: -1, ready: false, backend: '', scale: 0, frameMs: 0, walkers: 0, walkerX: 0, walkerY: 0 },
    onFrame: (nowMs) => {
      view.frameAsked = false;
      drawNow(view, nowMs);
    },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)'),
    canvas: parts.canvas,
    renderer: null,
    page: null,
    pageLoading: false,
    pageFailed: false,
    info: null,
    layout: null,
    walkers: null,
    failure: '',
    camera: { x: 0, y: 0, scale: PLACE_SCALES[0] },
    fitted: false,
    deviceWidth: 0,
    deviceHeight: 0,
    dpr: 1,
    walkedMs: 0,
    lastWalkMs: -1,
    frameAsked: false,
    returnFocus: null,
  };
  bindView(view);
  window.__place = view.hook;
  return view;
}

function bindView(view: PlaceView): void {
  const { parts } = view;
  const target: MapInputTarget = {
    zoom: (steps, deviceX, deviceY) => zoom(view, steps, deviceX, deviceY),
    pan: (dxDevice, dyDevice) => moveCamera(view, panPlaceBy(view.camera, dxDevice, dyDevice)),
    arrowPx: () => ARROW_TILES * PLACE_TILE_PX * view.camera.scale,
    fit: () => fit(view),
    close: () => leave(view),
    tap: () => undefined,
  };
  parts.back.addEventListener('click', () => leave(view));
  parts.retry.addEventListener('click', () => retry(view));
  parts.fit.addEventListener('click', () => fit(view));
  parts.zoomIn.addEventListener('click', () => zoomAtCentre(parts.section, target, 1));
  parts.zoomOut.addEventListener('click', () => zoomAtCentre(parts.section, target, -1));
  parts.pause.addEventListener('click', () => togglePause(view));
  // A drag captures the pointer on the section, which would take a bar button's click.
  parts.bar.addEventListener('pointerdown', (event) => event.stopPropagation());
  view.reducedMotion.addEventListener('change', () => onMotionPreference(view));
  bindMapInput(parts.section, target);
  observeDeviceSize(parts.section, (width, height, dpr) => onSize(view, width, height, dpr));
}

function show(view: PlaceView, info: PlaceInfo, returnFocus: HTMLElement): void {
  Object.assign(view, { info, returnFocus, layout: null, walkers: null, failure: '', fitted: false, walkedMs: 0, lastWalkMs: -1 });
  Object.assign(view.hook, { open: true, place: info.place, ready: false, walkers: 0 });
  const { parts, host } = view;
  parts.title.textContent = info.name;
  parts.about.textContent = aboutText(info);
  parts.picture.setAttribute('aria-label', `${info.name}, being built`);
  parts.pause.setAttribute('aria-pressed', String(host.paused()));
  host.map.inert = true;
  parts.section.hidden = false;
  view.renderer = openRenderer(view);
  loadPage(view);
  ask(view, info);
  showStatus(view);
  parts.back.focus();
  requestDraw(view);
}

function ask(view: PlaceView, info: PlaceInfo): void {
  view.host.request(info.place, (reply) => adopt(view, info, reply), (why) => fail(view, info, why));
}

// Asks again for whatever failed: the town atlas, the place, or both.
function retry(view: PlaceView): void {
  const { info } = view;
  if (!info) return;
  if (view.pageFailed) loadPage(view);
  if (view.failure) {
    view.failure = '';
    ask(view, info);
  }
  showStatus(view);
}

function leave(view: PlaceView): void {
  if (!view.hook.open) return;
  Object.assign(view.hook, { open: false, ready: false });
  view.parts.section.hidden = true;
  closeRenderer(view);
  view.layout = null;
  view.walkers = null;
  view.host.map.inert = false;
  view.host.left();
  view.returnFocus?.focus();
}

// The map follows the town's backend, and the town view the map's.
function openRenderer(view: PlaceView): PlaceRenderer {
  const renderer = createPlaceRenderer(view.canvas, { backend: view.host.backend });
  renderer.init();
  if (view.deviceWidth > 0 && view.deviceHeight > 0) renderer.resize(view.deviceWidth, view.deviceHeight, view.dpr);
  if (view.page) renderer.setAtlas(view.page);
  return renderer;
}

// dispose loses the context for good, so the next entry draws on a fresh canvas.
function closeRenderer(view: PlaceView): void {
  const renderer = view.renderer;
  if (!renderer) return;
  renderer.dispose();
  view.renderer = null;
  view.canvas = renderer.canvas.cloneNode(false) as HTMLCanvasElement;
  renderer.canvas.replaceWith(view.canvas);
}

// A reply for a place left behind changes nothing.
function adopt(view: PlaceView, info: PlaceInfo, reply: PlaceReply): void {
  if (!view.hook.open || view.info !== info) return;
  view.layout = reply.layout;
  view.walkers = new Walkers(reply.layout, reply.walks);
  view.hook.walkers = view.walkers.count;
  view.renderer?.setPlace(reply.layout);
  view.parts.picture.setAttribute('aria-label', holdingsText(info, reply.layout));
  if (view.deviceWidth > 0 && view.deviceHeight > 0) openCamera(view);
  showStatus(view);
  requestDraw(view);
}

function fail(view: PlaceView, info: PlaceInfo, why: string): void {
  if (!view.hook.open || view.info !== info) return;
  view.failure = why;
  showStatus(view);
}

// The town atlas loads on the first entry and stays for the page. A failed load is not kept: the next entry, or Try
// again, loads it anew, as a server can answer a missing file with its index page.
function loadPage(view: PlaceView): void {
  if (view.page || view.pageLoading) return;
  view.pageLoading = true;
  view.pageFailed = false;
  const base = document.baseURI;
  loadAtlasPage(new URL('atlas/atlas.json', base).href, new URL('atlas/atlas.webp', base).href).then(
    (page) => {
      view.page = page;
      view.pageLoading = false;
      view.renderer?.setAtlas(page);
      showStatus(view);
      requestDraw(view);
    },
    () => {
      view.pageLoading = false;
      view.pageFailed = true;
      showStatus(view);
    },
  );
}

// Such as "a town of 1,800 people in Velantia"; every tier name starts with a consonant.
function kindText(info: PlaceInfo): string {
  const where = info.country ? ` in ${info.country}` : '';
  if (info.kind === 'wonder') return `a wonder${where}`;
  return `a ${info.kind} of ${info.population.toLocaleString('en')} people${where}`;
}

function aboutText(info: PlaceInfo): string {
  const text = kindText(info);
  return text[0].toUpperCase() + text.slice(1);
}

function count(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
}

function listed(items: readonly string[]): string {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function holdingsText(info: PlaceInfo, layout: PlaceLayout): string {
  const counts = HOLDINGS.map(() => 0);
  for (let at = 0; at < layout.standing.length; at += 3) {
    const frame = layout.frames[layout.standing[at]];
    const kind = HOLDINGS.findIndex(([part]) => frame.includes(part));
    if (kind >= 0) counts[kind]++;
  }
  const told = HOLDINGS.flatMap(([, one, many], k) => (counts[k] > 0 ? [count(counts[k], one, many)] : []));
  told.push(count(layout.people.look.length, 'person', 'people'));
  return `${info.name}: ${listed(told)}`;
}

function statusText(view: PlaceView): string {
  const { info, layout, walkers } = view;
  if (!info) return '';
  if (view.failure) return `${info.name} could not be built: ${view.failure}`;
  if (view.pageFailed) return `${info.name} could not be drawn, as its art did not load.`;
  if (!layout || !walkers || !view.page) return `Building ${info.name}…`;
  const out = count(layout.people.look.length, 'person is', 'people are');
  return `${info.name}, ${kindText(info)}: ${out} out, ${walkers.count.toLocaleString('en')} of them walking.`;
}

// Rewriting the same text would make some screen readers announce it again. Try again shows only after a failure.
function showStatus(view: PlaceView): void {
  const text = statusText(view);
  if (view.parts.status.textContent !== text) view.parts.status.textContent = text;
  view.parts.retry.hidden = !view.failure && !view.pageFailed;
}

function placeSize(layout: PlaceLayout): [number, number] {
  return [layout.width * PLACE_TILE_PX, layout.height * PLACE_TILE_PX];
}

function openCamera(view: PlaceView): void {
  if (!view.layout) return;
  view.camera = openPlaceCamera(...placeSize(view.layout), view.deviceWidth, view.deviceHeight, view.dpr);
  view.fitted = true;
}

function moveCamera(view: PlaceView, camera: PlaceCamera): void {
  view.camera = view.layout ? clampPlaceCamera(camera, ...placeSize(view.layout), view.deviceWidth, view.deviceHeight) : camera;
  requestDraw(view);
}

// Zooming out past the smallest scale goes back to the map.
function zoom(view: PlaceView, steps: number, deviceX: number, deviceY: number): void {
  if (steps < 0 && view.camera.scale <= PLACE_SCALES[0]) leave(view);
  else moveCamera(view, zoomPlaceAt(view.camera, steps, deviceX, deviceY));
}

function fit(view: PlaceView): void {
  if (!view.layout || view.deviceWidth === 0 || view.deviceHeight === 0) return;
  view.camera = fitPlaceCamera(...placeSize(view.layout), view.deviceWidth, view.deviceHeight);
  requestDraw(view);
}

function togglePause(view: PlaceView): void {
  const paused = !view.host.paused();
  view.host.setPaused(paused);
  view.parts.pause.setAttribute('aria-pressed', String(paused));
  requestDraw(view);
}

// Read live: switched on, the walkers go back to where place.py put them; switched off, they walk on.
function onMotionPreference(view: PlaceView): void {
  if (view.reducedMotion.matches && view.walkers) {
    view.walkers.standStill();
    view.walkedMs = 0;
  }
  requestDraw(view);
}

// Drawn at once, inside the observer, so a resized canvas never shows a blank frame before the next one.
function onSize(view: PlaceView, width: number, height: number, dpr: number): void {
  Object.assign(view, { deviceWidth: width, deviceHeight: height, dpr });
  if (!view.renderer || width === 0 || height === 0) return;
  view.renderer.resize(width, height, dpr);
  if (!view.fitted) openCamera(view);
  else moveCamera(view, view.camera);
  drawNow(view, performance.now());
}

function requestDraw(view: PlaceView): void {
  if (view.frameAsked) return;
  view.frameAsked = true;
  requestAnimationFrame(view.onFrame);
}

function walking(view: PlaceView): boolean {
  return view.walkers !== null && view.walkers.count > 0 && !view.host.paused() && !view.reducedMotion.matches;
}

// The walkers' clock runs only on walking frames, so a pause or a hidden tab holds them where they stand. It counts whole
// ms, small integers that never box into heap numbers as a frame's fractional times would.
function walk(view: PlaceView, walkers: Walkers, nowMs: number): void {
  const now = Math.floor(nowMs);
  if (view.lastWalkMs >= 0) view.walkedMs += Math.min(MOST_WALK_MS, Math.max(0, now - view.lastWalkMs));
  view.lastWalkMs = now;
  walkers.walk(view.walkedMs);
}

// The backend too, which a lost context can turn to Canvas2D.
function readHook(view: PlaceView, renderer: PlaceRenderer, layout: PlaceLayout, walkers: Walkers | null): void {
  const { hook } = view;
  hook.ready = view.page !== null;
  hook.backend = renderer.backend;
  hook.scale = view.camera.scale;
  if (walkers && walkers.count > 0) {
    hook.walkerX = layout.people.x[walkers.person(0)];
    hook.walkerY = layout.people.y[walkers.person(0)];
  }
}

function drawNow(view: PlaceView, nowMs: number): void {
  const { renderer, layout, walkers } = view;
  if (!renderer || !layout || view.deviceWidth === 0 || view.deviceHeight === 0) return;
  const startMs = performance.now();
  const walks = walkers !== null && walking(view);
  if (walks) walk(view, walkers, nowMs);
  else view.lastWalkMs = -1;
  renderer.draw(view.camera);
  view.hook.frameMs = performance.now() - startMs;
  readHook(view, renderer, layout, walkers);
  if (walks) requestDraw(view);
}
