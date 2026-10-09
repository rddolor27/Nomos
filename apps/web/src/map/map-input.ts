import { panMapBy, zoomMapAt, type MapCamera } from '@nomos/render-gl/map';

export interface MapInputTarget {
  camera(): MapCamera;
  setCamera(camera: MapCamera): void;
  fit(): void;
  close(): void;
}

// An arrow press moves four cells, so a large world takes about 50 presses to cross.
const PAN_CELLS = 4;
// As the town's input: a mouse notch is 100 px in Chromium and 3 lines in Firefox, and a trackpad sends many small
// deltas, so the wheel steps once per 40 px gathered in one gesture, a gesture being deltas under 250 ms apart.
const WHEEL_STEP_PX = 40;
const WHEEL_GESTURE_MS = 250;
const WHEEL_UNIT_PX = [1, 16, 400];
// Two pointers step the zoom whenever they spread or close by a quarter.
const PINCH_STEP = 1.25;
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

function devicePoint(view: HTMLElement, clientX: number, clientY: number): [number, number] {
  const box = view.getBoundingClientRect();
  return [(clientX - box.left) * devicePixelRatio, (clientY - box.top) * devicePixelRatio];
}

// The two pointers' distance, and their midpoint in client px.
function spread(pointers: Map<number, [number, number]>): [number, number, number] {
  const [a, b] = [...pointers.values()];
  return [Math.hypot(a[0] - b[0], a[1] - b[1]), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function onKey(view: HTMLElement, target: MapInputTarget, event: KeyboardEvent): void {
  // Ctrl or Cmd with plus and minus zooms the browser, which stays the browser's.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const camera = target.camera();
  const pan = PAN_KEYS.get(event.key);
  const zoom = ZOOM_KEYS.get(event.key);
  const step = PAN_CELLS * camera.cellPx;
  if (pan) target.setCamera(panMapBy(camera, pan[0] * step, pan[1] * step));
  else if (zoom) target.setCamera(zoomMapAt(camera, zoom, (view.clientWidth * devicePixelRatio) / 2, (view.clientHeight * devicePixelRatio) / 2));
  else if (event.key === 'Home') target.fit();
  else if (event.key === 'Escape') target.close();
  else return;
  event.preventDefault();
}

// Drag, wheel, pinch and keys, bound once when the map view is first made.
export function bindMapInput(view: HTMLElement, target: MapInputTarget): void {
  const pointers = new Map<number, [number, number]>();
  let pinchAt = 0;
  let wheelPx = 0;
  let wheelAtMs = 0;

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const px = event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
    const sameGesture = event.timeStamp - wheelAtMs < WHEEL_GESTURE_MS && Math.sign(px) === Math.sign(wheelPx);
    wheelPx = sameGesture ? wheelPx + px : px;
    wheelAtMs = event.timeStamp;
    if (Math.abs(wheelPx) < WHEEL_STEP_PX) return;
    const [x, y] = devicePoint(view, event.clientX, event.clientY);
    target.setCamera(zoomMapAt(target.camera(), -Math.sign(wheelPx), x, y));
    wheelPx = 0;
  };
  const onPinch = (): void => {
    const [distance, midX, midY] = spread(pointers);
    const ratio = distance / pinchAt;
    if (ratio < PINCH_STEP && ratio > 1 / PINCH_STEP) return;
    const [x, y] = devicePoint(view, midX, midY);
    target.setCamera(zoomMapAt(target.camera(), ratio > 1 ? 1 : -1, x, y));
    pinchAt = distance;
  };
  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || pointers.size === 2) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    view.setPointerCapture(event.pointerId);
    if (pointers.size === 2) pinchAt = spread(pointers)[0];
  };
  // One pointer drags the map, so the camera moves the other way; two pointers pinch instead.
  const onMove = (event: PointerEvent): void => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) {
      onPinch();
      return;
    }
    const dpr = devicePixelRatio;
    target.setCamera(panMapBy(target.camera(), (last[0] - event.clientX) * dpr, (last[1] - event.clientY) * dpr));
  };
  const onEnd = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
  };

  view.addEventListener('wheel', onWheel, { passive: false });
  view.addEventListener('pointerdown', onDown);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onEnd);
  view.addEventListener('pointercancel', onEnd);
  view.addEventListener('keydown', (event) => onKey(view, target, event));
}
