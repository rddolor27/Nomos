// x and y are the cell at the view's top-left, fractional; cellPx is whole device pixels per cell, from MAP_CELL_PX.
export interface MapCamera {
  x: number;
  y: number;
  cellPx: number;
}

export type MapView = 'country' | 'region';

// Every step past the first is a multiple of 16, so both views draw their art at whole scales: the Country view's 8-px
// tiles at cellPx / 8 and the Region view's 16-px tiles at cellPx / 16.
export const MAP_CELL_PX: readonly number[] = [8, 16, 32, 48, 64, 96, 128];

// Region art shows each art pixel at one CSS pixel or more from 16 CSS px a cell. As autoSkin does, a switch needs 15%
// past that, so a camera resting on the limit never flickers (R4).
const REGION_ENTER_CSS_PX = 18.4;
const REGION_STAY_CSS_PX = 13.6;

export function mapViewFor(current: MapView, cellPx: number, dpr: number): MapView {
  if (cellPx < 16) return 'country';
  const limit = current === 'region' ? REGION_STAY_CSS_PX : REGION_ENTER_CSS_PX;
  return cellPx / dpr >= limit ? 'region' : 'country';
}

// The largest step that shows every cell, centred; a view too small for any still gets the smallest.
export function fitMapCamera(width: number, height: number, deviceWidth: number, deviceHeight: number): MapCamera {
  let cellPx = MAP_CELL_PX[0];
  for (const step of MAP_CELL_PX) {
    if (step * width <= deviceWidth && step * height <= deviceHeight) cellPx = step;
  }
  return { x: (width - deviceWidth / cellPx) / 2, y: (height - deviceHeight / cellPx) / 2, cellPx };
}

// Moves steps along MAP_CELL_PX, keeping the cell under the device point where it was.
export function zoomMapAt(camera: MapCamera, steps: number, deviceX: number, deviceY: number): MapCamera {
  const at = Math.max(0, MAP_CELL_PX.indexOf(camera.cellPx));
  const next = MAP_CELL_PX[Math.min(MAP_CELL_PX.length - 1, Math.max(0, at + steps))];
  const pointX = camera.x + deviceX / camera.cellPx;
  const pointY = camera.y + deviceY / camera.cellPx;
  return { x: pointX - deviceX / next, y: pointY - deviceY / next, cellPx: next };
}

// A positive delta moves the view right or down, as the town's panBy does.
export function panMapBy(camera: MapCamera, dxDevice: number, dyDevice: number): MapCamera {
  return { x: camera.x + dxDevice / camera.cellPx, y: camera.y + dyDevice / camera.cellPx, cellPx: camera.cellPx };
}

// The view's top-left in whole device pixels, which every draw snaps to, so each texel lands on whole pixels.
export function cameraDevice(camera: MapCamera): [number, number] {
  return [Math.round(camera.x * camera.cellPx), Math.round(camera.y * camera.cellPx)];
}
