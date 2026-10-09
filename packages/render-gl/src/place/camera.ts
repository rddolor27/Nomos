// x and y are the art pixel at the view's top-left, fractional; scale is whole device pixels per art pixel. Every
// draw snaps the view's top-left to round(x * scale) and round(y * scale) device pixels, so each texel lands on whole
// pixels.
export interface PlaceCamera {
  x: number;
  y: number;
  scale: number;
}

// Every scale a place draws at, in whole device pixels per art pixel, each step about a third or more past the last.
export const PLACE_SCALES: readonly number[] = [1, 2, 3, 4, 6, 8, 12, 16];

// A place opens at 2 CSS px per art px or more, so its pixel art reads (M3.1's plan, Task 7).
const OPEN_CSS_PX = 2;

// A view edge, x or y, in the whole device px every draw snaps it to. | 0 turns the -0 Math.round gives just left of or
// above the place into 0, since -0 boxes into a heap number on every call into GL or the canvas.
export function snapToDevice(at: number, scale: number): number {
  return Math.round(at * scale) | 0;
}

function centred(width: number, height: number, deviceWidth: number, deviceHeight: number, scale: number): PlaceCamera {
  return { x: (width - deviceWidth / scale) / 2, y: (height - deviceHeight / scale) / 2, scale };
}

// The largest scale that shows the whole place, centred; a view too small for any gets the smallest. width and height
// are the place's size in art px.
export function fitPlaceCamera(width: number, height: number, deviceWidth: number, deviceHeight: number): PlaceCamera {
  let scale = PLACE_SCALES[0];
  for (const step of PLACE_SCALES) {
    if (step * width <= deviceWidth && step * height <= deviceHeight) scale = step;
  }
  return centred(width, height, deviceWidth, deviceHeight, scale);
}

// The fitted view, but never under 2 CSS px per art px: a place too big for the view at that scale overflows it,
// centred, and is panned.
// A place opens covering the whole view, never as a small box inside it (owner, 10 October 2026): the smallest step at
// which it covers the view, and never under OPEN_CSS_PX CSS px an art px. Fit still shows it whole.
export function openPlaceCamera(width: number, height: number, deviceWidth: number, deviceHeight: number, dpr: number): PlaceCamera {
  const largest = PLACE_SCALES[PLACE_SCALES.length - 1];
  const readable = PLACE_SCALES.find((step) => step >= OPEN_CSS_PX * dpr) ?? largest;
  const covers = PLACE_SCALES.find(
    (step) => step >= readable && width * step >= deviceWidth && height * step >= deviceHeight,
  );
  return centred(width, height, deviceWidth, deviceHeight, covers ?? largest);
}

// Moves steps along PLACE_SCALES, keeping the art pixel under the device point where it was.
export function zoomPlaceAt(camera: PlaceCamera, steps: number, deviceX: number, deviceY: number): PlaceCamera {
  const at = Math.max(0, PLACE_SCALES.indexOf(camera.scale));
  const scale = PLACE_SCALES[Math.min(PLACE_SCALES.length - 1, Math.max(0, at + steps))];
  const pointX = camera.x + deviceX / camera.scale;
  const pointY = camera.y + deviceY / camera.scale;
  return { x: pointX - deviceX / scale, y: pointY - deviceY / scale, scale };
}

// A positive delta moves the view right or down, as the map's panMapBy does.
export function panPlaceBy(camera: PlaceCamera, dxDevice: number, dyDevice: number): PlaceCamera {
  return { x: camera.x + dxDevice / camera.scale, y: camera.y + dyDevice / camera.scale, scale: camera.scale };
}

// Keeps the view's centre over the place, so no drag can lose it.
export function clampPlaceCamera(camera: PlaceCamera, width: number, height: number, deviceWidth: number, deviceHeight: number): PlaceCamera {
  const halfX = deviceWidth / camera.scale / 2;
  const halfY = deviceHeight / camera.scale / 2;
  const x = Math.min(width - halfX, Math.max(-halfX, camera.x));
  const y = Math.min(height - halfY, Math.max(-halfY, camera.y));
  return x === camera.x && y === camera.y ? camera : { x, y, scale: camera.scale };
}
