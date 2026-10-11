import { expect, test } from 'playwright/test';
import type { Differing } from '../../harness/town.ts';
import type { StreetAgent } from '../town-agents.ts';

// A small fixture place, with every blob drawn at 1x from its top-left, so a device px is an art px.
const PLACE = 'mountain-waterfall';
const BACKENDS = ['webgl2', 'canvas2d'] as const;
const BREAD = 1;
const STAND: Pick<StreetAgent, 'x' | 'y' | 'look'> = { x: 120, y: 160, look: 0 };
// A blob's body is an 18 x 22 canvas anchored at (9, 20), and the carried 8 x 8 item's top-left sits at the frame's hold
// point on it: (0, 15) when it stands facing down or left, and mirrored to (10, 15) facing right.
const ITEM_TOP = STAND.y - 20 + 15;
const ITEM_LEFT: Record<'down' | 'left' | 'right', number> = { down: STAND.x - 9, left: STAND.x - 9, right: STAND.x - 9 + 10 };

// What is wrong with where a frame with bread in hand differs from one without: it must paint most of the 8 x 8 cell at the
// hold point, and nothing outside it.
function strayed(facing: keyof typeof ITEM_LEFT, box: Differing | null | undefined): string[] {
  if (!box) return [`${facing}: nothing drawn`];
  const left = ITEM_LEFT[facing];
  const outside = box.left < left || box.right > left + 8 || box.top < ITEM_TOP || box.bottom > ITEM_TOP + 8;
  return [...(box.pixels < 20 ? [`${facing}: only ${box.pixels} pixels`] : []), ...(outside ? [`${facing}: outside its cell`] : [])];
}

let errors: string[] = [];

// The harness builds the town atlas on its first request, which takes seconds.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/town.html');
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

for (const backend of BACKENDS) {
  test(`draws the good a blob carries at its hold point, and none facing up, through ${backend}`, async ({ page }) => {
    const boxes = await page.evaluate(
      async ({ backend, place, stand, bread }) => {
        const harness = window.townHarness;
        if ((await harness.boot(place, backend === 'canvas2d' ? { backend } : undefined)) !== backend) return null;
        const out: Record<string, ReturnType<typeof harness.differ>> = {};
        for (const facing of ['down', 'left', 'right', 'up'] as const) {
          const bare: StreetAgent = { ...stand, facing };
          out[facing] = harness.differ([bare], [{ ...bare, item: bread }], 0);
        }
        return out;
      },
      { backend, place: PLACE, stand: STAND, bread: BREAD },
    );
    test.skip(boxes === null, `no ${backend} in this browser`);

    expect(boxes?.up).toBeNull();
    expect((['down', 'left', 'right'] as const).flatMap((facing) => strayed(facing, boxes?.[facing]))).toEqual([]);
  });
}

test('chews and lifts the item through the eating loop, and both backends draw every step alike', async ({ page }) => {
  const runs = await page.evaluate(
    async ({ backends, place, stand, bread }) => {
      const harness = window.townHarness;
      const out: { hashes: string[]; resting: string }[] = [];
      for (const backend of backends) {
        if ((await harness.boot(place, backend === 'canvas2d' ? { backend } : undefined)) !== backend) return null;
        const eater: StreetAgent = { ...stand, facing: 'down', item: bread, eating: true };
        const hashes: string[] = [];
        // Ticks 0, 3, 6 and 9 are the loop's four steps, and 12 starts it again.
        for (const tick of [0, 3, 6, 9, 12]) hashes.push((await harness.renderAgents([eater], tick)).sha256);
        out.push({ hashes, resting: (await harness.renderAgents([{ ...eater, eating: false }], 0)).sha256 });
      }
      return out;
    },
    { backends: BACKENDS, place: PLACE, stand: STAND, bread: BREAD },
  );
  test.skip(runs === null, 'no WebGL2 in this browser');

  for (const run of runs ?? []) {
    const [first, second, third, fourth, again] = run.hashes;
    // Steps 1 and 3 both lift the item to its middle step under mouth 1.
    expect(fourth).toBe(second);
    expect(again).toBe(first);
    expect(new Set([first, second, third]).size).toBe(3);
    expect(first).not.toBe(run.resting);
  }
  expect(runs?.[1]).toEqual(runs?.[0]);
});

test('draws no blob that is indoors, whatever it carries, through both backends', async ({ page }) => {
  const runs = await page.evaluate(
    async ({ backends, place, stand, bread }) => {
      const harness = window.townHarness;
      const out: { outside: string; withHome: string; seen: string }[] = [];
      for (const backend of backends) {
        if ((await harness.boot(place, backend === 'canvas2d' ? { backend } : undefined)) !== backend) return null;
        const outside: StreetAgent[] = [{ ...stand, facing: 'down', item: bread }, { ...stand, x: 240, facing: 'left' }];
        const home: StreetAgent = { ...stand, x: 180, look: 3, facing: 'down', item: bread, eating: true, indoors: true };
        out.push({
          outside: (await harness.renderAgents(outside, 4)).sha256,
          withHome: (await harness.renderAgents([...outside, home], 4)).sha256,
          seen: (await harness.renderAgents([...outside, { ...home, indoors: false }], 4)).sha256,
        });
      }
      return out;
    },
    { backends: BACKENDS, place: PLACE, stand: STAND, bread: BREAD },
  );
  test.skip(runs === null, 'no WebGL2 in this browser');

  for (const run of runs ?? []) {
    expect(run.withHome).toBe(run.outside);
    expect(run.seen).not.toBe(run.outside);
  }
  expect(runs?.[1]).toEqual(runs?.[0]);
});
