import { CROWD_OUTLINE } from '../map/colours.ts';
import type { AtlasPage } from '../map/frames.ts';
import type { PlaceCamera } from './camera.ts';
import { INSTANCE_SHORTS, type PlaceSprites } from './sprites.ts';

export interface Canvas2dPainter {
  setAtlas(page: AtlasPage): void;
  draw(sprites: PlaceSprites | null, camera: PlaceCamera): void;
  dispose(): void;
}

const BACKGROUND = `#${CROWD_OUTLINE.toString(16).padStart(6, '0')}`;

// The same sprites in the same order as the WebGL2 pass, each one exact drawImage at whole device pixels with
// smoothing off, skipping any that lies off the canvas.
function drawSprites(context: CanvasRenderingContext2D, image: ImageBitmap, sprites: PlaceSprites, camera: PlaceCamera): void {
  const { scale } = camera;
  const camX = Math.round(camera.x * scale);
  const camY = Math.round(camera.y * scale);
  const { width, height } = context.canvas;
  const { data } = sprites;
  const end = INSTANCE_SHORTS * sprites.count;
  for (let at = 0; at < end; at += INSTANCE_SHORTS) {
    const x = data[at] * scale - camX;
    const y = data[at + 1] * scale - camY;
    const w = data[at + 4];
    const h = data[at + 5];
    if (x >= width || y >= height || x + w * scale <= 0 || y + h * scale <= 0) continue;
    context.drawImage(image, data[at + 2], data[at + 3], w, h, x, y, w * scale, h * scale);
  }
}

export function createCanvas2dPainter(canvas: HTMLCanvasElement): Canvas2dPainter | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  let image: ImageBitmap | null = null;
  return {
    setAtlas(page) {
      image = page.image;
    },
    // A resize resets the context, so smoothing goes off on every draw.
    draw(sprites, camera) {
      context.imageSmoothingEnabled = false;
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (sprites && image) drawSprites(context, image, sprites, camera);
    },
    dispose() {
      image = null;
    },
  };
}
