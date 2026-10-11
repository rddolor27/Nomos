// Fingerprints every place of the golden worlds from the TypeScript builder, stage by stage: node
// packages/worldgen/scripts/place-goldens.ts [--check]. Writes test/fixtures/place-goldens-v1.json, keeping its contexts,
// world seeds and stage lists; --check compares instead. tools/worldgen/place_goldens.py wrote the file until M2.7 gave
// towns premises, which place.py never laid out, so its prints from the centre stage on are this builder's, as frozen.ts
// keeps frozen-v1.json. All 20 worlds take about 3 minutes.
import { readFileSync, writeFileSync } from 'node:fs';
import type { PlaceContext } from '../src/place/context.ts';
import { placeContexts } from '../src/place/contexts.ts';
import { generateWorld } from '../src/world/generate.ts';
import { placePrints, type PlaceGoldens } from '../test/engines/places.ts';

const FILE = new URL('../test/fixtures/place-goldens-v1.json', import.meta.url);
const NAME = 'packages/worldgen/test/fixtures/place-goldens-v1.json';

function printsOf(ctx: PlaceContext, kinds: readonly string[]): string {
  return placePrints(ctx, kinds)
    .map((print) => (print >>> 0).toString(16).padStart(8, '0'))
    .join(' ');
}

function worldPrints(seed: number, places: readonly string[], kinds: readonly string[]): string[] {
  const contexts = placeContexts(generateWorld(seed, 'standard'));
  if (contexts.length !== places.length) {
    throw new Error(`world ${seed.toString(16)} has ${contexts.length} places, but the goldens list ${places.length}`);
  }
  console.error(`world ${seed.toString(16)}: ${contexts.length} places`);
  return contexts.map((ctx) => printsOf(ctx, kinds));
}

function build(goldens: PlaceGoldens): PlaceGoldens {
  const { kinds } = goldens;
  const pinned = goldens.pinned.map((pin) => ({ ...pin, prints: printsOf(pin.context, kinds) }));
  const worlds = goldens.worlds.map((world) => ({ ...world, places: worldPrints(world.seed, world.places, kinds) }));
  return { ...goldens, pinned, worlds };
}

const goldens: PlaceGoldens = JSON.parse(readFileSync(FILE, 'utf8'));
const text = `${JSON.stringify(build(goldens), null, 1)}\n`;
const places = goldens.pinned.length + goldens.worlds.reduce((total, world) => total + world.places.length, 0);
if (!process.argv.includes('--check')) {
  writeFileSync(FILE, text);
  console.log(`wrote ${NAME}: ${places} places`);
} else if (readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n') === text) {
  console.log(`${NAME} matches on ${places} places`);
} else {
  console.error(`${NAME} is out of date: run node packages/worldgen/scripts/place-goldens.ts and commit the result`);
  process.exitCode = 1;
}
