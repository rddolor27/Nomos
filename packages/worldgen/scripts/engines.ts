// Runs the golden checks under whichever runtime starts it: node here and in CI's check job, bun in CI's bun job. The
// browsers run the same checks from test/browser/engines.spec.ts.
import { readFileSync } from 'node:fs';
import { checkStages, type Goldens } from '../test/engines/checks.ts';
import { checkPlaces, ENGINE_WORLDS, type PlaceGoldens } from '../test/engines/places.ts';

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8')) as T;
}

const runtime = process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`;
const report = checkStages(readFixture<Goldens>('goldens-v1.json'), readFixture<Goldens>('frozen-v1.json'));
const places = checkPlaces(readFixture<PlaceGoldens>('place-goldens-v1.json'), ENGINE_WORLDS);
const failures = [...report.failures, ...places.failures];
if (failures.length > 0) {
  console.error(`${runtime}: ${failures.length} checks failed:\n  ${failures.slice(0, 20).join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log(`${runtime}: ${report.cases} stage checks and ${places.places} places ok`);
}
