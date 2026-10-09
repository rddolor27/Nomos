import { SNAPSHOT_BYTES, TILE_PX, jobOf } from '@nomos/sim-protocol';
import { BACKGROUND, OUTLINE, RIM, rgbOf } from '../dots/colour.ts';
import { JUMP_PX, MASK_FILL, MASK_GROUND, ROLES, ROLE_SHAPE, dotCentre, dotFill, dotMask, roleOfJob } from '../dots/dots.ts';
import skinA from '../dots/skin-a.json';
import type { Camera, Painter, Retained } from '../renderer/types.ts';

// Round 2's fallback budget: Canvas2D draws one image per agent, so it stops at this many in view.
export const CANVAS2D_AGENT_CAP = 5000;

const FLOATS_PER_AGENT = SNAPSHOT_BYTES / 4;
// Dot images are ordered role by role, outline then rim, as the minimap's alpha flags them (0 outline, 255 rim).
const EDGES = [OUTLINE, RIM];
const OUTLINE_EDGE = 0;
const RIM_EDGE = 1;
const BACKGROUND_CSS = `#${BACKGROUND.toString(16).padStart(6, '0')}`;

// A detached canvas, not an OffscreenCanvas, which Playwright's WebKit on Windows lacks.
function putPixels(image: ImageData, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
  return canvas;
}

// The minimap's alpha only flags the edge; drawn as alpha, it would blend the ground away.
function opaqueMinimap(width: number, height: number, minimap: Uint8Array): HTMLCanvasElement {
  const image = new ImageData(width, height);
  image.data.set(minimap);
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
  return putPixels(image, width, height);
}

function dotImage(mask: Uint8Array, side: number, fill: number, edge: number): HTMLCanvasElement {
  const image = new ImageData(side, side);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === MASK_GROUND) continue;
    const rgb = mask[i] === MASK_FILL ? fill : edge;
    image.data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], i * 4);
  }
  return putPixels(image, side, side);
}

// The same dotMask the WebGL2 shader reads, so both backends draw the same cells.
function bakeDots(fill: number): HTMLCanvasElement[] {
  const images: HTMLCanvasElement[] = [];
  for (const role of ROLES) {
    const mask = dotMask(ROLE_SHAPE[role], fill);
    for (const edge of EDGES) images.push(dotImage(mask, fill + 2, rgbOf(skinA[role].rgb), edge));
  }
  return images;
}

function edgeAt(retained: Retained, texelX: number, texelY: number): number {
  const { map, minimap } = retained;
  if (!map || !minimap || texelX < 0 || texelY < 0) return RIM_EDGE;
  const column = Math.floor(texelX / TILE_PX);
  const row = Math.floor(texelY / TILE_PX);
  if (column >= map.width || row >= map.height) return RIM_EDGE;
  return minimap[(row * map.width + column) * 4 + 3] === 0 ? OUTLINE_EDGE : RIM_EDGE;
}

// GLSL's mix(prev, cur, alpha), or cur after a jump; exact at alpha 0 and 1, where the frames are compared.
function along(prev: number, cur: number, alpha: number, jump: boolean): number {
  return jump ? cur : prev * (1 - alpha) + cur * alpha;
}

function drawDots(ctx: CanvasRenderingContext2D, retained: Retained, images: HTMLCanvasElement[], camera: Camera,
  alpha: number): number {
  const { slot, count } = retained;
  const cur = retained.floats[slot];
  const prev = retained.floats[slot ^ 1];
  const words = retained.words[slot];
  const zoom = camera.zoom;
  const camX = Math.round(camera.x * zoom);
  const camY = Math.round(camera.y * zoom);
  const reach = ((dotFill(zoom) - 1) >> 1) + 1;
  let drawn = 0;
  for (let i = 0; i < count && drawn < CANVAS2D_AGENT_CAP; i++) {
    const at = i * FLOATS_PER_AGENT;
    const jump = Math.abs(cur[at] - prev[at]) > JUMP_PX || Math.abs(cur[at + 1] - prev[at + 1]) > JUMP_PX;
    const x = along(prev[at], cur[at], alpha, jump);
    const y = along(prev[at + 1], cur[at + 1], alpha, jump);
    const left = dotCentre(x, camX, zoom) - reach;
    const top = dotCentre(y, camY, zoom) - reach;
    if (left + 2 * reach < 0 || top + 2 * reach < 0 || left >= ctx.canvas.width || top >= ctx.canvas.height) continue;
    const role = ROLES.indexOf(roleOfJob(jobOf(words[at + 2])));
    ctx.drawImage(images[role * EDGES.length + edgeAt(retained, Math.floor(x), Math.floor(y))], left, top);
    drawn++;
  }
  return drawn;
}

export function createCanvas2dPainter(canvas: HTMLCanvasElement, retained: Retained): Painter | null {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  let minimap: HTMLCanvasElement | null = null;
  // Baked on first use per fill: a zoom change, never a frame at a settled zoom.
  const dots: HTMLCanvasElement[][] = [];
  const painter: Painter = {
    mapChanged() {
      const map = retained.map;
      minimap = map && retained.minimap ? opaqueMinimap(map.width, map.height, retained.minimap) : null;
    },
    // Canvas2D reads the retained snapshots when it draws, so a push has nothing to upload.
    snapshotPushed() {},
    draw(camera, alpha) {
      const zoom = camera.zoom;
      // Resizing a canvas resets its context, smoothing included.
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BACKGROUND_CSS;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (minimap) {
        const scale = TILE_PX * zoom;
        ctx.drawImage(minimap, -Math.round(camera.x * zoom), -Math.round(camera.y * zoom), minimap.width * scale,
          minimap.height * scale);
      }
      if (retained.count === 0) return 0;
      const fill = dotFill(zoom);
      dots[fill] ??= bakeDots(fill);
      return drawDots(ctx, retained, dots[fill], camera, alpha);
    },
    // Nothing here outlives the canvas.
    dispose() {},
  };
  painter.mapChanged();
  return painter;
}
