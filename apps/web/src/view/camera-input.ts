import { panBy, worldAt, zoomAt } from '@nomos/render-gl';
import type { AppMessage } from '@nomos/sim-protocol';
import { element, type App } from '../app/app.ts';
import { speedForKey } from '../panels/speed-bar.ts';
import { Pinch } from './pinch.ts';
import { ZoomBar } from './zoom-bar.ts';

// One tile per arrow press.
const PAN_WORLD_PX = 16;
// A mouse notch is 100 px in Chromium and 3 lines in Firefox, and a trackpad sends many small deltas, so the wheel
// zooms one step per 40 px gathered in one gesture, a gesture being deltas under 250 ms apart in one direction.
const WHEEL_STEP_PX = 40;
const WHEEL_GESTURE_MS = 250;
// Pixels per wheel delta unit, indexed by WheelEvent.deltaMode: pixels, lines, pages.
const WHEEL_UNIT_PX = [1, 16, 400];
const PAN_KEYS = new Map<string, [number, number]>([
  ['ArrowLeft', [-1, 0]],
  ['ArrowRight', [1, 0]],
  ['ArrowUp', [0, -1]],
  ['ArrowDown', [0, 1]],
]);
const ZOOM_KEYS = new Map<string, number>([
  ['+', 1],
  ['=', 1],
  ['-', -1],
]);
// A press that never strays this far from where it went down is a click, not a drag (unsourced estimate).
const CLICK_CSS_PX = 4;

interface Drag {
  pointer: number;
  x: number;
  y: number;
  downX: number;
  downY: number;
  clickable: boolean;
}

// The panel and its word table load at the first inspect, never with the page (web rules: the inspector loads on
// demand). One per page, as bindCameraInput runs once.
let inspectorReady: Promise<void> | null = null;

// The Town skin's chunk, imported from this chunk rather than the entry, whose bytes the first frame waits on. main.ts
// calls it once the page is interactive.
export async function loadTownSkin(app: App): Promise<void> {
  const { mountTownSkin } = await import('./town-skin.ts');
  mountTownSkin(app);
}

export function isClick(dxCss: number, dyCss: number): boolean {
  return dxCss * dxCss + dyCss * dyCss < CLICK_CSS_PX * CLICK_CSS_PX;
}

function devicePoint(view: HTMLElement, clientX: number, clientY: number): [number, number] {
  const box = view.getBoundingClientRect();
  return [(clientX - box.left) * devicePixelRatio, (clientY - box.top) * devicePixelRatio];
}

function zoomBy(app: App, steps: number, deviceX: number, deviceY: number): void {
  app.camera = zoomAt(app.camera, app.camera.zoom + steps, deviceX, deviceY);
}

// The zoom keys and the zoom buttons both zoom about the view's centre.
function zoomAtCentre(app: App, steps: number): void {
  const { width, height } = app.renderer.canvas;
  zoomBy(app, steps, width / 2, height / 2);
}

function inspectAt(app: App, deviceX: number, deviceY: number): void {
  inspectorReady ??= import('../panels/inspector.ts').then(({ mountInspector }) => {
    mountInspector(element(document, '#hud'), element(document, '#view'), app.worker);
  });
  const [x, y] = worldAt(app.camera, deviceX, deviceY);
  const message: AppMessage = { type: 'inspect', x, y };
  inspectorReady.then(() => app.worker.postMessage(message)).catch((error: unknown) => console.error(error));
}

function onKey(app: App, event: KeyboardEvent): void {
  // Ctrl or Cmd with plus and minus zooms the browser, which stays the browser's.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const pan = PAN_KEYS.get(event.key);
  const zoom = ZOOM_KEYS.get(event.key);
  const speed = speedForKey(event);
  const { canvas } = app.renderer;
  if (pan) app.camera = panBy(app.camera, pan[0] * PAN_WORLD_PX * app.camera.zoom, pan[1] * PAN_WORLD_PX * app.camera.zoom);
  else if (zoom) zoomAtCentre(app, zoom);
  else if (speed !== undefined) app.setSpeed(speed);
  else if (event.key === 'Home') app.fit();
  // A button in the view keeps its own Enter.
  else if (event.key === 'Enter' && event.target === event.currentTarget) inspectAt(app, canvas.width / 2, canvas.height / 2);
  else return;
  event.preventDefault();
}

export function bindCameraInput(view: HTMLElement, app: App): void {
  let wheelPx = 0;
  let wheelAtMs = 0;
  let drag: Drag | null = null;
  const pinch = new Pinch();

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const px = event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
    const sameGesture = event.timeStamp - wheelAtMs < WHEEL_GESTURE_MS && Math.sign(px) === Math.sign(wheelPx);
    wheelPx = sameGesture ? wheelPx + px : px;
    wheelAtMs = event.timeStamp;
    if (Math.abs(wheelPx) < WHEEL_STEP_PX) return;
    const [x, y] = devicePoint(view, event.clientX, event.clientY);
    zoomBy(app, -Math.sign(wheelPx), x, y);
    wheelPx = 0;
  };
  // A second pointer down, as in a pinch, takes over the drag and is never a click.
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const { pointerId, clientX, clientY } = event;
    pinch.down(pointerId, clientX, clientY);
    drag = { pointer: pointerId, x: clientX, y: clientY, downX: clientX, downY: clientY, clickable: drag === null };
    view.setPointerCapture(pointerId);
  };
  // The world follows the pointer, so the camera moves the other way: panBy's delta moves the view. Two pointers zoom
  // about their midpoint instead.
  const onPointerMove = (event: PointerEvent): void => {
    const step = pinch.move(event.pointerId, event.clientX, event.clientY);
    if (pinch.active) {
      if (step !== 0) zoomBy(app, step, ...devicePoint(view, pinch.midX, pinch.midY));
      return;
    }
    if (!drag || event.pointerId !== drag.pointer) return;
    const dpr = devicePixelRatio;
    app.camera = panBy(app.camera, (drag.x - event.clientX) * dpr, (drag.y - event.clientY) * dpr);
    drag.x = event.clientX;
    drag.y = event.clientY;
    // A second button pressed or released during the press arrives as a move, so it ends the click here.
    if (event.buttons !== 1 || !isClick(event.clientX - drag.downX, event.clientY - drag.downY)) drag.clickable = false;
  };
  const onPointerUp = (event: PointerEvent): void => {
    pinch.up(event.pointerId);
    if (drag?.pointer !== event.pointerId) return;
    if (drag.clickable && event.button === 0) {
      const [x, y] = devicePoint(view, event.clientX, event.clientY);
      inspectAt(app, x, y);
    }
    drag = null;
  };
  const onPointerCancel = (event: PointerEvent): void => {
    pinch.up(event.pointerId);
    if (drag?.pointer === event.pointerId) drag = null;
  };
  const onKeyDown = (event: KeyboardEvent): void => onKey(app, event);

  view.setAttribute(
    'aria-label',
    'Town view: arrow keys pan, plus and minus zoom, Home fits the town, 1 to 3 set the speed, Enter shows the blob at the centre',
  );
  view.append(new ZoomBar(view.ownerDocument, (steps) => zoomAtCentre(app, steps), () => app.fit()).root);
  view.addEventListener('wheel', onWheel, { passive: false });
  view.addEventListener('pointerdown', onPointerDown);
  view.addEventListener('pointermove', onPointerMove);
  view.addEventListener('pointerup', onPointerUp);
  view.addEventListener('pointercancel', onPointerCancel);
  view.addEventListener('keydown', onKeyDown);
}
