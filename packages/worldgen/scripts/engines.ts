// Runs the golden checks under whichever runtime starts it: node here and in CI's check job, bun in CI's bun job. The
// browsers run the same checks from test/browser/engines.spec.ts.
import { readFileSync } from 'node:fs';
import { checkStages, type Goldens } from '../test/engines/checks.ts';

function readFixture(name: string): Goldens {
  return JSON.parse(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8'));
}

const runtime = process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`;
const report = checkStages(readFixture('goldens-v1.json'), readFixture('frozen-v1.json'));
if (report.failures.length > 0) {
  console.error(`${runtime}: ${report.failures.length} worlds failed:\n  ${report.failures.slice(0, 20).join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log(`${runtime}: ${report.cases} stage checks ok`);
}
