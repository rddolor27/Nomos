import type { WorldMap } from '@nomos/sim-protocol/world-map';
import type { MapCamera, MapView } from './camera.ts';
import { CROWD_COLOURS, CROWD_OUTLINE, LINE_COLOURS } from './colours.ts';
import { DOT_CLEAR, DOT_HUE, crowdDotPx, dotCorner, dotPixel } from './crowd.ts';
import { flatFills } from './fills.ts';
import { settlementFrame, type AtlasPage } from './frames.ts';

export interface Canvas2dPainter {
  setWorld(map: WorldMap): void;
  setAtlas(page: AtlasPage): void;
  setCrowd(hue: Uint8Array, xy: Float32Array): void;
  draw(camera: MapCamera, view: MapView): void;
  dispose(): void;
}

interface Crowd {
  readonly hue: Uint8Array;
  readonly xy: Float32Array;
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
    const frame = page.frames[settlementFrame(map.settlements.tier[id])];
    const x = (cell % map.width) * tilePx + (tilePx >> 1) - frame.anchor[0];
    const y = Math.floor(cell / map.width) * tilePx + tilePx - 1 - frame.anchor[1];
    context.drawImage(page.image, frame.x, frame.y, frame.w, frame.h, x * scale - camX, y * scale - camY, frame.w * scale, frame.h * scale);
  }
}

function paintPixel(data: Uint8ClampedArray, at: number, colour: number): void {
  data[at] = (colour >> 16) & 255;
  data[at + 1] = (colour >> 8) & 255;
  data[at + 2] = colour & 255;
  data[at + 3] = 255;
}

// The six hues' dots side by side at one size, painted once a zoom step, so each dot is one exact drawImage.
function paintDots(strip: HTMLCanvasElement, size: number): void {
  strip.width = size * CROWD_COLOURS.length;
  strip.height = size;
  const image = new ImageData(strip.width, size);
  CROWD_COLOURS.forEach((hue, k) => {
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const kind = dotPixel(size, i, j);
        if (kind !== DOT_CLEAR) paintPixel(image.data, 4 * (j * strip.width + k * size + i), kind === DOT_HUE ? hue : CROWD_OUTLINE);
      }
    }
  });
  strip.getContext('2d')?.putImageData(image, 0, 0);
}

// In dot order, as the WebGL2 pass draws its instances, skipping any dot off the canvas.
function drawCrowd(context: CanvasRenderingContext2D, crowd: Crowd, strip: HTMLCanvasElement, camera: MapCamera, size: number): void {
  const camX = Math.round(camera.x * camera.cellPx);
  const camY = Math.round(camera.y * camera.cellPx);
  const { width, height } = context.canvas;
  for (let dot = 0; dot < crowd.hue.length; dot++) {
    const x = dotCorner(crowd.xy[2 * dot], camera.cellPx, size) - camX;
    const y = dotCorner(crowd.xy[2 * dot + 1], camera.cellPx, size) - camY;
    if (x <= -size || y <= -size || x >= width || y >= height) continue;
    context.drawImage(strip, crowd.hue[dot] * size, 0, size, size, x, y, size, size);
  }
}

// The fallback draws the flat fills, the crowd in the Region view, the settlement icons and, from the page, the labels;
// borders show as colour edges.
export function createCanvas2dPainter(canvas: HTMLCanvasElement): Canvas2dPainter | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const dots = document.createElement('canvas');
  let world: WorldMap | null = null;
  let fills: HTMLCanvasElement | null = null;
  let towns: number[] = [];
  let page: AtlasPage | null = null;
  let crowd: Crowd | null = null;
  return {
    setWorld(map) {
      world = map;
      fills = fillsImage(map);
      towns = rowOrder(map);
    },
    setAtlas(next) {
      page = next;
    },
    setCrowd(hue, xy) {
      crowd = { hue, xy };
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
      if (view === 'region' && crowd) {
        const size = crowdDotPx(camera.cellPx);
        if (dots.height !== size) paintDots(dots, size);
        drawCrowd(context, crowd, dots, camera, size);
      }
      if (page) drawTowns(context, world, page, towns, camera, view);
    },
    dispose() {
      world = null;
      fills = null;
      crowd = null;
    },
  };
}
