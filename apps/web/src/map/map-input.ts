// The map's view and the town view both take these gestures, and each moves its own camera.
export interface MapInputTarget {
  // Zooms steps about a device point in the view; each view decides what a step past its last does.
  zoom(steps: number, deviceX: number, deviceY: number): void;
  // Moves the view right or down for a positive delta, in device px.
  pan(dxDevice: number, dyDevice: number): void;
  // How far one arrow press pans, in device px.
  arrowPx(): number;
  fit(): void;
  close(): void;
  // A press that lifted without a drag, at its device point in the view.
  tap(deviceX: number, deviceY: number): void;
}

// A press that moves less than this, in CSS px, is a tap, and the map holds still until a drag passes it.
const TAP_SLOP_PX = 5;
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

// The zoom keys and the zoom buttons both zoom about the view's centre.
export function zoomAtCentre(view: HTMLElement, target: MapInputTarget, steps: number): void {
  target.zoom(steps, (view.clientWidth * devicePixelRatio) / 2, (view.clientHeight * devicePixelRatio) / 2);
}

function onKey(view: HTMLElement, target: MapInputTarget, event: KeyboardEvent): void {
  // Ctrl or Cmd with plus and minus zooms the browser, which stays the browser's.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const pan = PAN_KEYS.get(event.key);
  const zoom = ZOOM_KEYS.get(event.key);
  if (pan) target.pan(pan[0] * target.arrowPx(), pan[1] * target.arrowPx());
  else if (zoom) zoomAtCentre(view, target, zoom);
  else if (event.key === 'Home') target.fit();
  else if (event.key === 'Escape') target.close();
  else return;
  event.preventDefault();
}

// Drag, tap, wheel, pinch and keys, bound once when the map view is first made.
export function bindMapInput(view: HTMLElement, target: MapInputTarget): void {
  const pointers = new Map<number, [number, number]>();
  let pinchAt = 0;
  let wheelPx = 0;
  let wheelAtMs = 0;
  let pressX = 0;
  let pressY = 0;
  // A drag past the slop, or a second pointer, makes the press no tap.
  let dragged = false;

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const px = event.deltaY * WHEEL_UNIT_PX[event.deltaMode];
    const sameGesture = event.timeStamp - wheelAtMs < WHEEL_GESTURE_MS && Math.sign(px) === Math.sign(wheelPx);
    wheelPx = sameGesture ? wheelPx + px : px;
    wheelAtMs = event.timeStamp;
    if (Math.abs(wheelPx) < WHEEL_STEP_PX) return;
    const [x, y] = devicePoint(view, event.clientX, event.clientY);
    target.zoom(-Math.sign(wheelPx), x, y);
    wheelPx = 0;
  };
  const onPinch = (): void => {
    const [distance, midX, midY] = spread(pointers);
    const ratio = distance / pinchAt;
    if (ratio < PINCH_STEP && ratio > 1 / PINCH_STEP) return;
    const [x, y] = devicePoint(view, midX, midY);
    target.zoom(ratio > 1 ? 1 : -1, x, y);
    pinchAt = distance;
  };
  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || pointers.size === 2) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    view.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      pinchAt = spread(pointers)[0];
      dragged = true;
      return;
    }
    pressX = event.clientX;
    pressY = event.clientY;
    dragged = false;
  };
  // One pointer drags the map once it passes the slop, so the camera moves the other way; two pointers pinch instead.
  // Under the slop the pointer's last place stays at the press, so the drag's first step covers the whole way.
  const onMove = (event: PointerEvent): void => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    if (!dragged && Math.hypot(event.clientX - pressX, event.clientY - pressY) < TAP_SLOP_PX) return;
    dragged = true;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) {
      onPinch();
      return;
    }
    const dpr = devicePixelRatio;
    target.pan((last[0] - event.clientX) * dpr, (last[1] - event.clientY) * dpr);
  };
  const onUp = (event: PointerEvent): void => {
    const tapped = !dragged && pointers.size === 1 && pointers.has(event.pointerId);
    pointers.delete(event.pointerId);
    if (!tapped) return;
    const [x, y] = devicePoint(view, event.clientX, event.clientY);
    target.tap(x, y);
  };
  const onCancel = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
  };

  view.addEventListener('wheel', onWheel, { passive: false });
  view.addEventListener('pointerdown', onDown);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', onCancel);
  view.addEventListener('keydown', (event) => onKey(view, target, event));
}
