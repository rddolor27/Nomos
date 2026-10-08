import type { Camera } from './types.ts';

// Device pixels per texel; the zoom is always whole, and a tile is 16 texels.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 16;
const TILE_PX = 16;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

// The largest whole zoom that shows the whole map, centred. A view smaller than the map still gets MIN_ZOOM.
export function fitCamera(mapWidth: number, mapHeight: number, deviceWidth: number, deviceHeight: number): Camera {
  const mapPxWidth = mapWidth * TILE_PX;
  const mapPxHeight = mapHeight * TILE_PX;
  const zoom = clampZoom(Math.floor(Math.min(deviceWidth / mapPxWidth, deviceHeight / mapPxHeight)));
  return { x: (mapPxWidth - deviceWidth / zoom) / 2, y: (mapPxHeight - deviceHeight / zoom) / 2, zoom };
}

// Keeps the world point under the device pixel where it was, so the texel there stays put.
export function zoomAt(camera: Camera, zoom: number, deviceX: number, deviceY: number): Camera {
  const next = clampZoom(zoom);
  return {
    x: camera.x + deviceX / camera.zoom - deviceX / next,
    y: camera.y + deviceY / camera.zoom - deviceY / next,
    zoom: next,
  };
}

// A positive delta moves the view right or down, so a drag passes the pointer's movement negated.
export function panBy(camera: Camera, dxDevice: number, dyDevice: number): Camera {
  return { x: camera.x + dxDevice / camera.zoom, y: camera.y + dyDevice / camera.zoom, zoom: camera.zoom };
}

// The camera the renderer draws from: its draw rounds x·zoom and y·zoom the same way.
export function snapCamera(camera: Camera): Camera {
  const { zoom } = camera;
  return { x: Math.round(camera.x * zoom) / zoom, y: Math.round(camera.y * zoom) / zoom, zoom };
}

export function cssPxPerTile(zoom: number, dpr: number): number {
  return (TILE_PX * zoom) / dpr;
}
