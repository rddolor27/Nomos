// Checks the @stdlib digests in Firefox, which runs SpiderMonkey where Node and Chromium run V8 and Safari runs JavaScriptCore.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { firefox } from 'playwright';
import { differences } from './stdlib-probe.ts';

const fixture = new URL('../test/fixtures/stdlib-digests.json', import.meta.url);

// node:fs stays external: the probe loads it only where import.meta.main is set, and a browser leaves that unset.
const bundle = await build({
  stdin: {
    contents: "import { probeStdlib } from './stdlib-probe.ts'; globalThis.digests = probeStdlib();",
    resolveDir: import.meta.dirname,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  external: ['node:*'],
});

const browser = await firefox.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`page error: ${error.message}`));
  await page.addScriptTag({ type: 'module', content: bundle.outputFiles[0].text });
  const digests = await page.evaluate<Record<string, string>>('globalThis.digests');
  const engine = `firefox ${browser.version()}`;
  const differing = differences(JSON.parse(readFileSync(fixture, 'utf8')) as Record<string, string>, digests);
  if (differing.length > 0) {
    console.error(`@stdlib digests differ on ${engine}:\n  ${differing.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log(`@stdlib digests match the fixture on ${engine}`);
  }
} finally {
  await browser.close();
}
