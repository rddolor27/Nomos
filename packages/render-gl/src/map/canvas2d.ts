import type { WorldMap } from '@nomos/sim-protocol/world-map';
import type { MapCamera, MapView } from './camera.ts';
import { LINE_COLOURS } from './colours.ts';
import { flatFills } from './fills.ts';
import { settlementFrame, type AtlasPage } from './frames.ts';

export interface Canvas2dPainter {
  setWorld(map: WorldMap): void;
  setAtlas(page: AtlasPage): void;
  draw(camera: MapCamera, view: MapView): void;
  dispose(): void;
}

// One pixel a cell, drawn at cellPx with smoothing off, so each cell fills whole device pixels.
function fillsImage(map: WorldMap): HTMLCanvasElement {
  const image = document.createElement('canvas');
  image.width = map.width;
  image.height = map.height;
  const context = image.getContext('2d');
  if (!context) throw new Error('this browser offers no Canvas2D for the map');
  context.putImageData(new ImageData(new Uint8ClampedArray(flatFills(map)), map.width, map.height), 0, 0);
  return image;
}

// Settlement ids by row, then column, as mapdraw.py draws its towns.
function rowOrder(map: WorldMap): number[] {
  const { cell } = map.settlements;
  return Array.from(cell, (_, id) => id).sort((a, b) => cell[a] - cell[b]);
}

function drawTowns(context: CanvasRenderingContext2D, map: WorldMap, page: AtlasPage, towns: number[], camera: MapCamera, view: MapView): void {
  const tilePx = view === 'region' ? 16 : 8;
  const scale = camera.cellPx / tilePx;
  const camX = Math.round(camera.x * camera.cellPx);
  const camY = Math.round(camera.y * camera.cellPx);
  for (const id of towns) {
    const cell = map.settlements.cell[id];
    const frame = page.frames[settlementFrame(map.settlements.tier[id], view)];
    const x = (cell % map.width) * tilePx + (tilePx >> 1) - frame.anchor[0];
    const y = Math.floor(cell / map.width) * tilePx + tilePx - 1 - frame.anchor[1];
    context.drawImage(page.image, frame.x, frame.y, frame.w, frame.h, x * scale - camX, y * scale - camY, frame.w * scale, frame.h * scale);
  }
}

// The fallback draws the flat fills, the settlement icons and, from the page, the labels;
// borders show as colour edges.
export function createCanvas2dPainter(canvas: HTMLCanvasElement): Canvas2dPainter | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  let world: WorldMap | null = null;
  let fills: HTMLCanvasElement | null = null;
  let towns: number[] = [];
  let page: AtlasPage | null = null;
  return {
    setWorld(map) {
      world = map;
      fills = fillsImage(map);
      towns = rowOrder(map);
    },
    setAtlas(next) {
      page = next;
    },
    // A resize resets the context, so smoothing goes off on every draw.
    draw(camera, view) {
      context.imageSmoothingEnabled = false;
      context.fillStyle = `#${LINE_COLOURS.water.toString(16).padStart(6, '0')}`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (!world || !fills) return;
      const camX = Math.round(camera.x * camera.cellPx);
      const camY = Math.round(camera.y * camera.cellPx);
      context.drawImage(fills, -camX, -camY, world.width * camera.cellPx, world.height * camera.cellPx);
      if (page) drawTowns(context, world, page, towns, camera, view);
    },
    dispose() {
      world = null;
      fills = null;
    },
  };
}
