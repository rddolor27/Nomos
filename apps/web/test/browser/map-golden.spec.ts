import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { WorldMap } from '@nomos/sim-protocol/world-map';
import { generateWorld, placeNames } from '@nomos/worldgen';
import type { Page } from 'playwright/test';
import { expect, test } from '../../../../packages/render-gl/test/browser/scale.ts';
import { WEB } from './web.ts';

// Chromium is the one engine the config pins to a software GL, SwiftShader, on every machine. Firefox and WebKit draw
// on the host's GL, and where WebGL2 is missing the map's Canvas2D fallback shows borders as colour edges only.
test.skip(({ browserName }) => browserName !== 'chromium', "the hash pins SwiftShader's WebGL2");
test.use({ baseURL: WEB });

const GOLDEN = new URL('../golden/map-countries.json', import.meta.url);
const UPDATE = process.env.UPDATE_GOLDEN === '1';
const SEED = 42;
// The map's one colour table, read as data: Node imports no JSON module without an import attribute.
const TABLE = JSON.parse(
  readFileSync(new URL('../../../../packages/render-gl/src/map/map-colours.json', import.meta.url), 'utf8'),
) as { countries: string[]; border: string };
const COUNTRY_COLOURS = TABLE.countries.map(colourValue);
// The map covers the page's first column, beside the charts' 22rem of 15 px, so the canvas is 1,280 × 800 CSS px.
const VIEWPORT = { width: 1280 + 22 * 15, height: 800 };
// At 2x, Fit centres the whole large world at 8 device px a cell, where each pixel of the Country view's 8-px art takes
// one device px, so every border is in the frame.
const DPR = 2;
const DEVICE = [1280 * DPR, 800 * DPR];
const CELL_PX = 8;
// A border's line is the last pixel column or row of its west or north cell, with a band of each side's colour beside
// it (overlay.ts, drawBorders).
const LINE = Array<number>(CELL_PX).fill(colourValue(TABLE.border));

interface Golden {
  width: number;
  height: number;
  sha256: string;
}

interface Frame extends Golden {
  colours: number[];
}

// A land edge between two countries: other lies east of cell, or south of it.
interface Edge {
  cell: number;
  other: number;
  east: boolean;
}

function colourValue(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

function rgb(colour: number): string {
  return `rgb(${colour >> 16}, ${(colour >> 8) & 255}, ${colour & 255})`;
}

function colourOf(map: WorldMap, cell: number): number {
  return COUNTRY_COLOURS[map.countries.colour[map.country[cell] - 1]];
}

function borderEdges(map: WorldMap): Edge[] {
  const { width, height, country } = map;
  const edges: Edge[] = [];
  for (let cell = 0; cell < country.length; cell++) {
    if (country[cell] === 0) continue;
    for (const [other, inside, east] of [
      [cell + 1, (cell % width) + 1 < width, true],
      [cell + width, Math.floor(cell / width) + 1 < height, false],
    ] as const) {
      if (inside && country[other] !== 0 && country[other] !== country[cell]) edges.push({ cell, other, east });
    }
  }
  return edges;
}

// An edge's ten pixels, x then y on the world: its line's eight, then the band pixel halfway along on each side.
function edgePixels(map: WorldMap, edge: Edge): [number, number][] {
  const x = (edge.cell % map.width) * CELL_PX;
  const y = Math.floor(edge.cell / map.width) * CELL_PX;
  const half = CELL_PX >> 1;
  const along = (k: number): [number, number] => (edge.east ? [x + CELL_PX - 1, y + k] : [x + k, y + CELL_PX - 1]);
  const across = (k: number): [number, number] => (edge.east ? [x + k, y + half] : [x + half, y + k]);
  return [...Array.from({ length: CELL_PX }, (_, k) => along(k)), across(CELL_PX - 2), across(CELL_PX)];
}

// Each edge's pixels on the canvas, with the world centred in it.
function devicePoints(map: WorldMap, edges: readonly Edge[]): number[] {
  const left = (DEVICE[0] - map.width * CELL_PX) / 2;
  const top = (DEVICE[1] - map.height * CELL_PX) / 2;
  return edges.flatMap((edge) => edgePixels(map, edge).flatMap(([x, y]) => [left + x, top + y]));
}

function brokenBorders(map: WorldMap, edges: readonly Edge[], colours: readonly number[]): string[] {
  const broken: string[] = [];
  edges.forEach((edge, e) => {
    const want = [...LINE, colourOf(map, edge.cell), colourOf(map, edge.other)];
    const got = colours.slice(want.length * e, want.length * (e + 1));
    if (got.some((colour, k) => colour !== want[k])) {
      const at = `${edge.cell % map.width},${Math.floor(edge.cell / map.width)}`;
      broken.push(`${edge.east ? 'east' : 'south'} of cell ${at}: ${got.map(hex).join(' ')}`);
    }
  });
  return broken;
}

// openAtScale opens the town at /, whose chunks load after its first frame. The Map control mounts after them all, so
// waiting for it keeps the next navigation from cutting an import short, which Firefox and WebKit log as an error.
// The atlas page's files are answered with HTML, as vite preview answers a missing file, so the page fails to load and
// the view stays flat whether or not the build made it.
async function openFlatMap(page: Page): Promise<void> {
  const mapControl = page.getByRole('button', { name: 'Map', exact: true });
  await mapControl.waitFor();
  await page.route('**/atlas/map.*', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.setViewportSize(VIEWPORT);
  await page.goto(`/?seed=${SEED}&tier=phone`);
  await mapControl.click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('#map [role="status"]')).toHaveText(/flat colours/);
  expect(await page.evaluate(() => window.__map?.view)).toBe('country');
}

async function expectLegend(page: Page, map: WorldMap): Promise<void> {
  const names = placeNames(map);
  const count = map.countries.capital.length;
  const items = page.locator('#map .map-legend li');
  await expect(items).toHaveCount(count);
  for (let k = 0; k < count; k++) {
    const capital = names[count + map.countries.capital[k]];
    await expect(items.nth(k)).toContainText(`${names[k]}: capital ${capital},`);
    await expect(items.nth(k).locator('.map-swatch')).toHaveCSS('background-color', rgb(COUNTRY_COLOURS[map.countries.colour[k]]));
  }
}

// preserveDrawingBuffer is off, so the pixels are read in the frame that draws them: Fit asks for a frame, and a
// callback asked after it runs after the map's draw.
function readFrame(page: Page, points: readonly number[]): Promise<Frame> {
  return page.evaluate(async (points) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#map canvas');
    const gl = canvas?.getContext('webgl2');
    const fit = [...document.querySelectorAll<HTMLButtonElement>('#map button')].find((button) => button.textContent === 'Fit');
    if (!canvas || !gl || !fit) throw new Error('the map shows no WebGL2 canvas with a Fit button');
    fit.click();
    const pixels = await new Promise<Uint8Array<ArrayBuffer>>((resolve) => {
      requestAnimationFrame(() => {
        const read = new Uint8Array(4 * canvas.width * canvas.height);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, read);
        resolve(read);
      });
    });
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', pixels));
    const colours: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      const at = 4 * ((canvas.height - 1 - points[i + 1]) * canvas.width + points[i]);
      colours.push((pixels[at] << 16) | (pixels[at + 1] << 8) | pixels[at + 2]);
    }
    const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return { width: canvas.width, height: canvas.height, sha256, colours };
  }, points);
}

function readGolden(): Golden | null {
  return existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, 'utf8')) : null;
}

function writeGolden(golden: Golden): void {
  mkdirSync(new URL('.', GOLDEN), { recursive: true });
  writeFileSync(GOLDEN, `${JSON.stringify(golden, null, 2)}\n`);
}

// The legend and borders are checked before the hash, so UPDATE_GOLDEN can never pin a broken frame.
test("matches seed 42's flat Countries view, with every border drawn and every country in the legend", async ({
  openAtScale,
}) => {
  test.setTimeout(60_000);
  const map = generateWorld(SEED, 'large');
  const edges = borderEdges(map);
  const page = await openAtScale(DPR);
  await openFlatMap(page);
  await expectLegend(page, map);
  const { colours, ...frame } = await readFrame(page, devicePoints(map, edges));
  expect([frame.width, frame.height], 'the canvas in device px').toEqual(DEVICE);
  expect(brokenBorders(map, edges, colours), `of ${edges.length} borders`).toEqual([]);
  if (UPDATE) writeGolden(frame);
  const golden = readGolden();
  if (!golden) throw new Error('no golden: run this spec once with UPDATE_GOLDEN=1');
  expect(frame).toEqual(golden);
});
