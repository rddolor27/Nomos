// Runs the kernel and replay checks under whichever runtime starts it: node here, bun in CI.
// The browsers run the same checks from test/browser/engines.spec.ts.
import { readFileSync } from 'node:fs';
import { checkGoldens, checkKernels, type Goldens, type KernelFixture } from '../test/engines/checks.ts';

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8'));
}

const runtime = process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`;
const kernelReport = checkKernels(readFixture<KernelFixture>('kernels.json'));
const goldenReport = checkGoldens(readFixture<Goldens>('goldens.json'));
const failures = [...kernelReport.failures, ...goldenReport.failures];

if (failures.length > 0) {
  console.error(`${runtime}: ${failures.length} checks failed:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log(`${runtime}: kernels ${kernelReport.cases} ok, goldens ${goldenReport.cases} ok`);
}
