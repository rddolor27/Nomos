import { readFileSync } from 'node:fs';
import { expect, test } from 'playwright/test';

const PEOPLE = new Map(
  (JSON.parse(readFileSync(new URL('../fixtures/places-v1.json', import.meta.url), 'utf8')) as { places: { name: string; people: { x: number[] } }[] })
    .places.map((place) => [place.name, place.people.x.length]),
);

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

// The capital's skin swapped to a smaller town draws what a skin made on that town does, and swapped back draws the
// capital's first picture again, to the pixel.
for (const backend of ['webgl2', 'canvas2d'] as const) {
  test(`swaps to a smaller town and back, drawing each as a fresh skin does, through ${backend}`, async ({ page }) => {
    const shown = await page.evaluate(
      async ({ backend }) => {
        const harness = window.townHarness;
        const options = backend === 'canvas2d' ? { backend } : undefined;
        if ((await harness.boot('capital', options)) !== backend) return null;
        const first = await harness.render();
        harness.swap('coastal-town');
        const smaller = await harness.render();
        harness.swap('capital');
        const back = await harness.render();
        await harness.boot('coastal-town', options);
        const made = await harness.render();
        return { first, smaller, back, made };
      },
      { backend },
    );
    test.skip(shown === null, `no ${backend} in this browser`);

    expect([shown?.first.drawn, shown?.smaller.drawn]).toEqual([PEOPLE.get('capital'), PEOPLE.get('coastal-town')]);
    expect(shown?.smaller).toEqual(shown?.made);
    expect(shown?.back).toEqual(shown?.first);
    expect(shown?.smaller.sha256).not.toBe(shown?.first.sha256);
  });
}
