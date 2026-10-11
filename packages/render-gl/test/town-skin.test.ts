import { readFileSync, readdirSync } from 'node:fs';
import { PLACE_TILE_PX, type PlaceLayout } from '@nomos/sim-protocol/place';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AtlasFrame, AtlasPage } from '../src/map/frames.ts';
import type { Camera, Retained } from '../src/renderer/types.ts';
import { TownSkin } from '../src/town/town-skin.ts';
import { placeLayout } from './place-fixtures.ts';
import { townAgents } from './town-agents.ts';

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);

interface Manifest {
  frames: Record<string, { w: number; h: number; anchor: [number, number]; face?: [number, number] }>;
}

// Every manifest frame on a one-row test page, frame i at x = i, so a drawn sprite's atlas x names its frame.
function testFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const file of readdirSync(SPRITES).filter((name) => name.endsWith('.json') && name !== 'season_map.json').sort()) {
    const manifest = JSON.parse(readFileSync(new URL(file, SPRITES), 'utf8')) as Manifest;
    for (const [name, f] of Object.entries(manifest.frames)) {
      frames[`${file.slice(0, -5)}/${name}`] = { x: x++, y: 0, w: f.w, h: f.h, anchor: f.anchor, ...(f.face && { face: f.face }) };
    }
  }
  return frames;
}

const FRAMES = testFrames();
const NAME_AT = new Map(Object.entries(FRAMES).map(([name, frame]) => [frame.x, name]));
const IMAGE = {} as ImageBitmap;
const PAGE: AtlasPage = { image: IMAGE, frames: FRAMES };
// Both places fit in this view, drawn from their top-left at 1x, so the Canvas2D painter culls none of their sprites.
const VIEW_PX = { width: 176 * PLACE_TILE_PX, height: 112 * PLACE_TILE_PX };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

// A sprite the painter drew: its frame's name and its top-left art px. The ground's offscreen canvas, blitted over the
// background in one call, is GROUND and its size.
const GROUND = 'ground';
type Drawn = [name: string, x: number, y: number];

interface FakeCanvas {
  width: number;
  height: number;
  hidden: boolean;
  style: object;
  getContext(): object;
}

function recordingContext(canvas: object, log: Drawn[]): object {
  return {
    canvas,
    fillStyle: '',
    imageSmoothingEnabled: true,
    fillRect: () => undefined,
    drawImage(image: unknown, sx: number, _sy: number, w: number, h: number, dx: number, dy: number): void {
      log.push(image === IMAGE ? [NAME_AT.get(sx) ?? `atlas x ${sx}`, dx, dy] : [GROUND, w, h]);
    },
  };
}

function recordingCanvas(log: Drawn[]): HTMLCanvasElement {
  const canvas: FakeCanvas = { width: 0, height: 0, hidden: false, style: {}, getContext: () => recordingContext(canvas, log) };
  return canvas as unknown as HTMLCanvasElement;
}

// What one draw sent the Canvas2D painter: the ground's tiles and sprites it painted on the offscreen canvas, and what it
// drew on the town's own.
interface Frame {
  drawn: number | undefined;
  ground: Drawn[];
  scene: Drawn[];
}

// A skin on the Canvas2D backend with a recording canvas, and a way to draw one frame of agents with it.
function rig(layout: PlaceLayout): { skin: TownSkin; frame(agents: Retained): Frame } {
  const scene: Drawn[] = [];
  const ground: Drawn[] = [];
  vi.stubGlobal('document', { createElement: () => recordingCanvas(ground) });
  vi.stubGlobal('requestAnimationFrame', () => 0);
  const skin = new TownSkin(recordingCanvas(scene), layout, PAGE, { backend: 'canvas2d' });
  const dots = { ...VIEW_PX, style: {} } as unknown as HTMLCanvasElement;
  return {
    skin,
    frame(agents) {
      scene.length = 0;
      ground.length = 0;
      const drawn = skin.draw(CAMERA, 1, { drawnSkin: 'town', retained: agents, canvas: dots, dpr: 1 });
      return { drawn, ground: [...ground], scene: [...scene] };
    },
  };
}

const bodies = (scene: Drawn[]): number => scene.filter(([name]) => name.startsWith('characters/blob_')).length;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Town skin's swap", () => {
  const large = placeLayout('capital');
  const small = placeLayout('coastal-town');
  const largeAgents = townAgents(large);
  const smallAgents = townAgents(small);

  it("draws a smaller town, its ground and buildings and the sim's agents, as a skin made on it does", () => {
    const swapped = rig(large);
    swapped.frame(largeAgents);
    swapped.skin.setLayout(small);
    // Before the sim's agents change, which the count of them would show, the town has already changed.
    expect(swapped.frame(largeAgents).scene[0]).toEqual([GROUND, small.width * PLACE_TILE_PX, small.height * PLACE_TILE_PX]);
    const after = swapped.frame(smallAgents);
    const made = rig(small).frame(smallAgents);

    expect(after).toEqual(made);
    expect(after.drawn).toBe(smallAgents.count);
    expect(bodies(after.scene)).toBe(smallAgents.count);
    expect(after.ground).toHaveLength(small.tiles.length + small.ground.length / 3);
    // The ground is painted once for the swap, never again by a frame.
    expect(swapped.frame(smallAgents)).toEqual({ ...made, ground: [] });
  });

  it('draws the first town again, exactly as before, when swapped back', () => {
    const swapped = rig(large);
    const first = swapped.frame(largeAgents);
    swapped.skin.setLayout(small);
    const between = swapped.frame(smallAgents);
    swapped.skin.setLayout(large);
    const back = swapped.frame(largeAgents);

    expect(first.ground).toHaveLength(large.tiles.length + large.ground.length / 3);
    expect(bodies(first.scene)).toBe(largeAgents.count);
    expect(between.scene[0]).not.toEqual(first.scene[0]);
    expect(back).toEqual(first);
  });
});
