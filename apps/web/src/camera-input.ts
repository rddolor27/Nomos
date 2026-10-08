import { panBy, zoomAt } from '@nomos/render-gl';
import type { App } from './app.ts';

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

interface Drag {
  pointer: number;
  x: number;
  y: number;
}

function devicePoint(view: HTMLElement, event: MouseEvent): [number, number] {
  const box = view.getBoundingClientRect();
  return [(event.clientX - box.left) * devicePixelRatio, (event.clientY - box.top) * devicePixelRatio];
}

function onKey(app: App, event: KeyboardEvent): void {
  // Ctrl or Cmd with plus and minus zooms the browser, which stays the browser's.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const pan = PAN_KEYS.get(event.key);
  const zoom = ZOOM_KEYS.get(event.key);
  const { canvas } = app.renderer;
  if (pan) app.camera = panBy(app.camera, pan[0] * PAN_WORLD_PX * app.camera.zoom, pan[1] * PAN_WORLD_PX * app.camera.zoom);
  else if (zoom) app.camera = zoomAt(app.camera, app.camera.zoom + zoom, canvas.width / 2, canvas.height / 2);
  else return;
  event.preventDefault();
}

export function bindCameraInput(view: HTMLElement, app: App): void {
  let wheelPx = 0;
  let wheelAtMs = 0;
  let drag: Drag | null = null;

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const px = event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
    const sameGesture = event.timeStamp - wheelAtMs < WHEEL_GESTURE_MS && Math.sign(px) === Math.sign(wheelPx);
    wheelPx = sameGesture ? wheelPx + px : px;
    wheelAtMs = event.timeStamp;
    if (Math.abs(wheelPx) < WHEEL_STEP_PX) return;
    const [x, y] = devicePoint(view, event);
    app.camera = zoomAt(app.camera, app.camera.zoom - Math.sign(wheelPx), x, y);
    wheelPx = 0;
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    view.setPointerCapture(event.pointerId);
  };
  // The world follows the pointer, so the camera moves the other way: panBy's delta moves the view.
  const onPointerMove = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const dpr = devicePixelRatio;
    app.camera = panBy(app.camera, (drag.x - event.clientX) * dpr, (drag.y - event.clientY) * dpr);
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onPointerEnd = (event: PointerEvent): void => {
    if (drag?.pointer === event.pointerId) drag = null;
  };
  const onKeyDown = (event: KeyboardEvent): void => onKey(app, event);

  view.setAttribute('aria-label', 'Town view: arrow keys pan, plus and minus zoom');
  view.addEventListener('wheel', onWheel, { passive: false });
  view.addEventListener('pointerdown', onPointerDown);
  view.addEventListener('pointermove', onPointerMove);
  view.addEventListener('pointerup', onPointerEnd);
  view.addEventListener('pointercancel', onPointerEnd);
  view.addEventListener('keydown', onKeyDown);
}
