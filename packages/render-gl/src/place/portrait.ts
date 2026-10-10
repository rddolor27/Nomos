import { NO_CODE, PLACE_EXPRESSIONS, PLACE_FACINGS, PLACE_POSES, type PlacePeople } from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';
import { personFrames, type PersonFrames } from './people.ts';
import { INSTANCE_SHORTS, putPerson } from './sprites.ts';

// Body, pattern and face: a person with no job item and no emote.
const LAYERS = 3;
const STAND = PLACE_POSES.indexOf('stand');
const DOWN = PLACE_FACINGS.indexOf('down');
const NEUTRAL = PLACE_EXPRESSIONS.indexOf('neutral');

function lonePerson(): PlacePeople {
  return {
    look: new Uint8Array(1),
    pose: Uint8Array.of(STAND),
    facing: Uint8Array.of(DOWN),
    step: new Uint8Array(1),
    expression: Uint8Array.of(NEUTRAL),
    job: Uint8Array.of(NO_CODE),
    emote: Uint8Array.of(NO_CODE),
    x: new Int32Array(1),
    y: new Int32Array(1),
    lift: new Uint8Array(1),
  };
}

// One blob standing and facing down, drawn on a 2D canvas of its own from the layers the place pass stacks for a person of
// that look, so a portrait is the blob as the street shows it (owner request, 11 October 2026). Made once, with the atlas
// page, and drawn again for each look.
export class BlobPortrait {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly image: ImageBitmap;
  private readonly frames: PersonFrames;
  private readonly person: PlacePeople;
  private readonly data: Int16Array;

  constructor(canvas: HTMLCanvasElement, page: AtlasPage) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('this browser offers no Canvas2D for the portrait');
    this.canvas = canvas;
    this.context = context;
    this.image = page.image;
    this.frames = personFrames(page.frames);
    this.person = lonePerson();
    this.data = new Int16Array(INSTANCE_SHORTS * LAYERS);
  }

  // Each art pixel takes the whole number of device pixels nearest cssScale CSS pixels, so the sprite stays crisp at a ratio
  // such as 1.5, and the canvas's CSS size is its device size over the ratio.
  draw(look: number, cssScale: number, dpr: number): void {
    this.person.look[0] = look;
    const layers = putPerson(this.data, 0, this.frames, this.person, 0) / INSTANCE_SHORTS;
    const [left, top, right, bottom] = this.bounds(layers);
    const scale = Math.max(1, Math.round(cssScale * dpr));
    const { canvas, context } = this;
    // A new size clears the canvas and resets the context, smoothing included.
    canvas.width = (right - left) * scale;
    canvas.height = (bottom - top) * scale;
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    context.imageSmoothingEnabled = false;
    for (let layer = 0; layer < layers; layer++) {
      const [x, y, srcX, srcY, w, h] = this.data.subarray(INSTANCE_SHORTS * layer, INSTANCE_SHORTS * (layer + 1));
      context.drawImage(this.image, srcX, srcY, w, h, (x - left) * scale, (y - top) * scale, w * scale, h * scale);
    }
  }

  // The art-pixel box that holds every layer drawn: left, top, right and bottom.
  private bounds(layers: number): [number, number, number, number] {
    const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let layer = 0; layer < layers; layer++) {
      const [x, y, , , w, h] = this.data.subarray(INSTANCE_SHORTS * layer, INSTANCE_SHORTS * (layer + 1));
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x + w);
      box[3] = Math.max(box[3], y + h);
    }
    return box;
  }
}
