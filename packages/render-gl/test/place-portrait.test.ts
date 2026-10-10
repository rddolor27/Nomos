import { LOOK_EYES, LOOK_HUES, LOOK_PATTERNS } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import type { AtlasFrame, AtlasPage } from '../src/map/frames.ts';
import { BlobPortrait } from '../src/place/portrait.ts';

// A standing blob's frames, 18 by 22 art px with the anchor at 9, 20, as the atlas holds them.
const WIDTH = 18;
const HEIGHT = 22;
const ANCHOR: [number, number] = [9, 20];

// Every stand-down body, pattern and neutral face, written with names as looks.py writes them. Frame i sits at atlas x = i,
// so a layer's source x names its frame.
function atlas(): { page: AtlasPage; nameAt: Map<number, string> } {
  const names = LOOK_HUES.map((hue) => `characters/blob_${hue}_stand_down`);
  for (const pattern of LOOK_PATTERNS.slice(1)) {
    for (const hue of LOOK_HUES) names.push(`characters/pattern_${pattern}_${hue}_stand_down`);
  }
  for (const eyes of LOOK_EYES) names.push(`characters/face_neutral${eyes === 'round' ? '' : `-${eyes}`}_down`);
  const frames: Record<string, AtlasFrame> = {};
  names.forEach((name, x) => {
    frames[name] = { x, y: 0, w: WIDTH, h: HEIGHT, anchor: ANCHOR, ...(name.includes('blob_') && { face: [0, 0] as [number, number] }) };
  });
  return { page: { image: {} as ImageBitmap, frames }, nameAt: new Map(names.map((name, x) => [x, name])) };
}

interface Layer {
  name: string | undefined;
  box: number[];
}

// A canvas that records what is drawn on it, as [x, y, width, height] of each layer in canvas pixels.
function fakeCanvas(nameAt: Map<number, string>) {
  const layers: Layer[] = [];
  const context = {
    imageSmoothingEnabled: true,
    drawImage(_image: unknown, sx: number, _sy: number, _sw: number, _sh: number, ...box: number[]) {
      layers.push({ name: nameAt.get(sx), box });
    },
  };
  const canvas = { width: 0, height: 0, style: { width: '', height: '' }, getContext: () => context };
  return { canvas, context, layers };
}

function portraitOf() {
  const { page, nameAt } = atlas();
  const { canvas, context, layers } = fakeCanvas(nameAt);
  return { portrait: new BlobPortrait(canvas as unknown as HTMLCanvasElement, page), canvas, context, layers };
}

describe("a blob's portrait", () => {
  it('stacks its body, pattern and face at a whole scale, and sizes its canvas to match', () => {
    const { portrait, canvas, context, layers } = portraitOf();
    // Look 68: hue 68 % 6 = 2 (rose), eyes floor(68 / 6) % 4 = 3 (wide), pattern floor(68 / 24) = 2 (spots).
    portrait.draw(68, 5, 1);
    expect(layers).toEqual([
      { name: 'characters/blob_rose_stand_down', box: [0, 0, 90, 110] },
      { name: 'characters/pattern_spots_rose_stand_down', box: [0, 0, 90, 110] },
      { name: 'characters/face_neutral-wide_down', box: [0, 0, 90, 110] },
    ]);
    expect([canvas.width, canvas.height, canvas.style.width, canvas.style.height]).toEqual([90, 110, '90px', '110px']);
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it('draws no pattern layer for a plain look, and the round face with no eye name', () => {
    const { portrait, layers } = portraitOf();
    portrait.draw(0, 5, 1);
    expect(layers.map(({ name }) => name)).toEqual(['characters/blob_sun_stand_down', 'characters/face_neutral_down']);
  });

  it('takes the whole device scale nearest the CSS scale, and sets the CSS size from the ratio', () => {
    const { portrait, canvas } = portraitOf();
    portrait.draw(0, 5, 2);
    expect([canvas.width, canvas.height, canvas.style.width, canvas.style.height]).toEqual([180, 220, '90px', '110px']);
    portrait.draw(0, 5, 1.5);
    expect([canvas.width, canvas.height, canvas.style.width]).toEqual([144, 176, '96px']);
    portrait.draw(0, 0.1, 1);
    expect([canvas.width, canvas.height]).toEqual([WIDTH, HEIGHT]);
  });
});
