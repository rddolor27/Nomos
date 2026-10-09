import { OUTLINE } from '../map/colours.ts';
import type { AtlasPage } from '../map/frames.ts';
import { INSTANCE_SHORTS, type PlaceSprites } from './sprites.ts';

// left and top are the view's top-left in whole device px.
export interface Canvas2dPainter {
  setAtlas(page: AtlasPage): void;
  draw(sprites: PlaceSprites | null, scale: number, left: number, top: number): void;
  dispose(): void;
}

// placedraw.py fills a place with the palette's OUTLINE.
const BACKGROUND = `#${OUTLINE.toString(16).padStart(6, '0')}`;

// Sprites from..to of the list, in the WebGL2 pass's order, each one exact drawImage at whole device pixels, skipping
// any that lies off the canvas. camX and camY are the view's snapped top-left.
function drawSprites(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  sprites: PlaceSprites,
  scale: number,
  camX: number,
  camY: number,
  from: number,
  to: number,
): void {
  const { width, height } = context.canvas;
  const { data } = sprites;
  for (let at = INSTANCE_SHORTS * from; at < INSTANCE_SHORTS * to; at += INSTANCE_SHORTS) {
    const x = data[at] * scale - camX;
    const y = data[at + 1] * scale - camY;
    const w = data[at + 4];
    const h = data[at + 5];
    if (x >= width || y >= height || x + w * scale <= 0 || y + h * scale <= 0) continue;
    context.drawImage(image, data[at + 2], data[at + 3], w, h, x, y, w * scale, h * scale);
  }
}

// The tiles and ground sprites never move, so they are drawn once at 1x over the background, and a frame then draws
// them in one scaled drawImage: some 1,400 calls fewer for a capital, which keeps the fallback within the 2 ms bar.
function paintFixed(fixed: HTMLCanvasElement, image: ImageBitmap, sprites: PlaceSprites): void {
  fixed.width = sprites.width;
  fixed.height = sprites.height;
  const context = fixed.getContext('2d', { alpha: false });
  if (!context) throw new Error('this browser offers no Canvas2D for the place');
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, sprites.width, sprites.height);
  drawSprites(context, image, sprites, 1, 0, 0, 0, sprites.fixed);
}

export function createCanvas2dPainter(canvas: HTMLCanvasElement): Canvas2dPainter | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const fixed = document.createElement('canvas');
  let image: ImageBitmap | null = null;
  // The sprites whose tiles and ground the fixed canvas holds.
  let painted: PlaceSprites | null = null;
  return {
    setAtlas(page) {
      image = page.image;
      painted = null;
    },
    // A resize resets the context, so smoothing goes off on every draw.
    draw(sprites, scale, left, top) {
      context.imageSmoothingEnabled = false;
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (!sprites || !image) return;
      if (sprites !== painted) {
        paintFixed(fixed, image, sprites);
        painted = sprites;
      }
      const { width, height } = sprites;
      // Taken from 0 rather than negated, which would make -0 of a 0 and box it on every frame.
      context.drawImage(fixed, 0, 0, width, height, 0 - left, 0 - top, width * scale, height * scale);
      drawSprites(context, image, sprites, scale, left, top, sprites.fixed, sprites.count);
    },
    dispose() {
      image = null;
      painted = null;
    },
  };
}
