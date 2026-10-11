import { readFileSync, readdirSync } from 'node:fs';
import { PLACE_TILE_PX, type PlaceLayout } from '@nomos/sim-protocol/place';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AtlasFrame, AtlasPage } from '../src/map/frames.ts';
import type { Camera, Retained } from '../src/renderer/types.ts';
import { NO_LEVEL, TownPips, withPipFrames, type PipSite } from '../src/town/pips.ts';
import { TownSkin } from '../src/town/town-skin.ts';
import { placeLayout } from './place-fixtures.ts';
import { townAgents } from './town-agents.ts';

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);

interface Manifest {
  frames: Record<string, { w: number; h: number; anchor: [number, number] }>;
}

// Every manifest frame on a one-row test page, frame i at x = i, so a drawn sprite's atlas x names its frame.
function testFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const file of readdirSync(SPRITES).filter((name) => name.endsWith('.json') && name !== 'season_map.json').sort()) {
    const manifest = JSON.parse(readFileSync(new URL(file, SPRITES), 'utf8')) as Manifest;
    for (const [name, f] of Object.entries(manifest.frames)) frames[`${file.slice(0, -5)}/${name}`] = { x: x++, y: 0, w: f.w, h: f.h, anchor: f.anchor };
  }
  return frames;
}

const FRAMES = testFrames();
const ALIASED = withPipFrames(FRAMES);
const NAME_AT = new Map(Object.entries(FRAMES).map(([name, frame]) => [frame.x, name]));
const IMAGE = {} as ImageBitmap;
const PAGE: AtlasPage = { image: IMAGE, frames: FRAMES };
const VIEW_PX = { width: 176 * PLACE_TILE_PX, height: 112 * PLACE_TILE_PX };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

// The capital fixture's two stalls and its general shop, as the app would name them: each sprite's frame and anchor.
const STALL = 'buildings/shop_market-stall';
const CLOSED = 'buildings/shop_market-stall_closed';
const SHOP = 'buildings/shop_general';
const CLINIC = 'buildings/civic_clinic';
const SITES: PipSite[] = [
  { frame: STALL, x: 1224, y: 943, stall: true },
  { frame: STALL, x: 1560, y: 943, stall: true },
  { frame: SHOP, x: 1408, y: 1103, stall: false },
];

function anchorY(frame: string): number {
  return FRAMES[frame].anchor[1];
}

// Where a pip is drawn, its top-left art px: the pip is 8 px wide and 8 tall, its bottom row lies one clear row above the
// sprite's top row, and it is centred on the sprite's anchor column, which is the pip's own column 4.
function pipCorner(site: PipSite): [number, number] {
  return [site.x - 4, site.y - anchorY(site.frame) - 1 - 1 - 7];
}

// The standing sprites a layout holds, from the first one past `from`, as the frame's name and its anchor.
function standingFrom(layout: PlaceLayout, from: number): [string, number, number][] {
  const found: [string, number, number][] = [];
  for (let at = 3 * from; at < layout.standing.length; at += 3) {
    found.push([layout.frames[layout.standing[at]], layout.standing[at + 1], layout.standing[at + 2]]);
  }
  return found;
}

function frameAt(layout: PlaceLayout, x: number, y: number): string[] {
  return standingFrom(layout, 0)
    .filter(([, sx, sy]) => sx === x && sy === y)
    .map(([name]) => name);
}

describe('stock pips', () => {
  const layout = placeLayout('capital');
  const own = layout.standing.length / 3;

  it('stands a pip at each premises, in the frame that hangs over its sprite, and closes a stall at 0', () => {
    const pips = new TownPips(layout, SITES, ALIASED);
    pips.set([3, 0, 1]);

    expect(pips.layout.standing.length).toBe(3 * (own + SITES.length));
    // A pip sorts at its premises' own anchor, and its frame is anchored to draw above the sprite's top.
    expect(standingFrom(pips.layout, own)).toEqual([
      [`icons/pip_stock_3@${anchorY(STALL)}`, 1224, 943],
      [`icons/pip_stock_0@${anchorY(STALL)}`, 1560, 943],
      [`icons/pip_stock_1@${anchorY(SHOP)}`, 1408, 1103],
    ]);
    expect(ALIASED[`icons/pip_stock_3@${anchorY(STALL)}`].anchor).toEqual([4, anchorY(STALL) + 1 + 8]);
    expect(pipCorner(SITES[0])).toEqual([1220, 887]);
    expect(frameAt(pips.layout, 1560, 943)).toContain(CLOSED);
    expect(frameAt(pips.layout, 1224, 943)).toContain(STALL);
    expect(frameAt(pips.layout, 1408, 1103)).toContain(SHOP);
    // The town's own sprites are all still there.
    expect(pips.layout.frames.slice(0, layout.frames.length)).toEqual(layout.frames);

    pips.set([1, 2, 0]);
    expect(frameAt(pips.layout, 1560, 943)).toContain(STALL);
    expect(frameAt(pips.layout, 1560, 943)).not.toContain(CLOSED);
    // A shop at 0 shows the empty beads and nothing closes: only a stall has a closed look.
    expect(frameAt(pips.layout, 1408, 1103)).toContain(SHOP);
    expect(standingFrom(pips.layout, own)[2][0]).toBe(`icons/pip_stock_0@${anchorY(SHOP)}`);
  });

  it('gives a town with no premises its own layout, and needs no pip frame from the atlas', () => {
    const bare: Record<string, AtlasFrame> = { ...FRAMES };
    for (const name of Object.keys(bare)) if (name.startsWith('icons/pip_')) delete bare[name];
    const frames = withPipFrames(bare);
    const pips = new TownPips(layout, [], frames);
    pips.set([]);

    expect(frames).toEqual(bare);
    expect(pips.layout).toBe(layout);
    expect(() => new TownPips(layout, SITES, frames)).toThrow(/no frame icons\/pip_stock_0 to hang over buildings\/shop_market-stall/);
  });

  it('refuses a premises whose sprite the atlas lacks', () => {
    expect(() => new TownPips(layout, [{ frame: 'buildings/shop_nothing', x: 8, y: 8, stall: false }], ALIASED)).toThrow(
      /no frame buildings\/shop_nothing/,
    );
  });
});

// One draw of the Town skin on a recording Canvas2D: the sprites it drew, in order, as a frame's name and its top-left art px.
type Drawn = [name: string, x: number, y: number];

interface FakeCanvas {
  width: number;
  height: number;
  hidden: boolean;
  style: object;
  getContext(): object;
}

function recordingCanvas(log: Drawn[]): HTMLCanvasElement {
  const canvas: FakeCanvas = {
    width: 0,
    height: 0,
    hidden: false,
    style: {},
    getContext: () => ({
      canvas,
      fillStyle: '',
      imageSmoothingEnabled: true,
      fillRect: () => undefined,
      drawImage(image: unknown, sx: number, _sy: number, _w: number, _h: number, dx: number, dy: number): void {
        if (image === IMAGE) log.push([NAME_AT.get(sx) ?? `atlas x ${sx}`, dx, dy]);
      },
    }),
  };
  return canvas as unknown as HTMLCanvasElement;
}

function rig(layout: PlaceLayout, sites: readonly PipSite[]): { skin: TownSkin; frame(agents: Retained): Drawn[] } {
  const scene: Drawn[] = [];
  vi.stubGlobal('document', { createElement: () => recordingCanvas([]) });
  vi.stubGlobal('requestAnimationFrame', () => 0);
  const skin = new TownSkin(recordingCanvas(scene), layout, PAGE, { backend: 'canvas2d' }, sites);
  const dots = { ...VIEW_PX, style: {} } as unknown as HTMLCanvasElement;
  return {
    skin,
    frame(agents) {
      scene.length = 0;
      skin.draw(CAMERA, 1, { drawnSkin: 'town', retained: agents, canvas: dots, dpr: 1 });
      return [...scene];
    },
  };
}

const isPip = ([name]: Drawn): boolean => name.startsWith('icons/pip_stock_');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the Town skin with stock pips', () => {
  const layout = placeLayout('capital');
  const agents = townAgents(layout);

  it('draws no pip until it has levels, then the pips and the closed stall, and keeps them when the crowd changes', () => {
    const { skin, frame } = rig(layout, SITES);
    expect(frame(agents).filter(isPip)).toEqual([]);

    skin.setPips([3, 0, 2]);
    const lit = frame(agents);
    expect(lit.filter(isPip)).toEqual([
      ['icons/pip_stock_3', ...pipCorner(SITES[0])],
      ['icons/pip_stock_0', ...pipCorner(SITES[1])],
      ['icons/pip_stock_2', ...pipCorner(SITES[2])],
    ]);
    const stalls = lit.filter(([name]) => name === STALL || name === CLOSED);
    expect(stalls).toContainEqual([STALL, 1224 - 24, 943 - 47]);
    expect(stalls).toContainEqual([CLOSED, 1560 - 24, 943 - 47]);
    expect(stalls).not.toContainEqual([STALL, 1560 - 24, 943 - 47]);

    const fewer = townAgents(placeLayout('mountain-waterfall'));
    expect(frame(fewer).filter(isPip)).toHaveLength(3);

    skin.setPips([NO_LEVEL, NO_LEVEL, NO_LEVEL]);
    expect(frame(agents).filter(isPip)).toEqual([]);
  });

  it('draws a pip after the building that stands behind its premises, which would otherwise cover it', () => {
    // A clinic whose bottom row lies against the stall's top row, so it sorts just after where the pip would sort by its own row.
    const row = 943 - anchorY(STALL) - 1;
    const behind = placeLayout('capital');
    behind.standing = Int32Array.from([...behind.standing, behind.frames.indexOf(CLINIC), 1224, row]);
    const { skin, frame } = rig(behind, SITES);
    skin.setPips([3, 3, 3]);
    const scene = frame(agents);
    const [pipX, pipY] = pipCorner(SITES[0]);
    const clinic = scene.findIndex(([name, x, y]) => name === CLINIC && x === 1224 - FRAMES[CLINIC].anchor[0] && y === row - anchorY(CLINIC));
    const pip = scene.findIndex(([name, x, y]) => isPip([name, x, y]) && x === pipX && y === pipY);

    expect(clinic).toBeGreaterThan(-1);
    expect(pip).toBeGreaterThan(clinic);
  });

  it('draws none for a town set with no premises', () => {
    const { skin, frame } = rig(layout, SITES);
    skin.setPips([3, 3, 3]);
    expect(frame(agents).filter(isPip)).toHaveLength(3);

    skin.setLayout(layout);
    skin.setPips([3, 3, 3]);
    const bare = frame(agents);
    expect(bare.filter(isPip)).toEqual([]);
    expect(bare.filter(([name]) => name === CLOSED)).toEqual([]);
  });
});
