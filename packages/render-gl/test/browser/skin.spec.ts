import { expect, test, type Page } from 'playwright/test';

const CITIZEN = '#f7c948';

let errors: string[] = [];

test.skip(({ browserName }) => browserName !== 'chromium', 'the toggle is plain DOM, so one engine proves it');

test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

// Draws a fresh frame and reports the skin drawn and whether citizens' dots show in it.
function drawFrame(page: Page): Promise<{ skin: string | undefined; dots: boolean }> {
  return page.evaluate((citizen) => {
    const harness = window.harness;
    harness.push(0);
    const stats = harness.draw();
    return { skin: harness.renderer?.drawnSkin, dots: (stats.counts[citizen] ?? 0) > 0 };
  }, CITIZEN);
}

test('follows the parameter and the toggle', async ({ page }) => {
  await page.goto('/?skin=town');
  await page.evaluate(() => window.harness.boot({ agents: 1_000 }));
  const radio = (name: string) => page.getByRole('radio', { name, exact: true });
  const output = page.locator('fieldset output');
  const dotsDrawn = { skin: 'dots', dots: true };

  await expect(radio('Town')).toBeChecked();
  await expect(output).toHaveText('Town is not built yet: showing dots');
  expect(await drawFrame(page)).toEqual(dotsDrawn);

  await radio('Dots').check();
  await expect(output).toBeEmpty();
  expect(await drawFrame(page)).toEqual(dotsDrawn);

  await radio('Auto').check();
  await expect(output).toBeEmpty();
  expect(await drawFrame(page)).toEqual(dotsDrawn);

  await radio('Auto').focus();
  await page.keyboard.press('ArrowRight');
  await expect(radio('Dots')).toBeChecked();
  await expect(radio('Dots')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(radio('Blobs')).toBeChecked();
  await expect(output).toHaveText('Blobs is not built yet: showing dots');
  await page.keyboard.press('ArrowLeft');
  await expect(radio('Dots')).toBeChecked();
  await expect(output).toBeEmpty();
  expect(await drawFrame(page)).toEqual(dotsDrawn);
});
