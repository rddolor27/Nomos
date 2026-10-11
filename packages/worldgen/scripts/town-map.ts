// Writes assets/maps/town.nmap, Highcourt's ground and every world's place 0, from the place builder:
// node packages/worldgen/scripts/town-map.ts [--check]. The first screen loads this file, so it waits for no generator.
// It parses what it builds, so a map that reaches disk loads; --check compares the file with the builder's output instead.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseMap, writeMap } from '@nomos/sim-protocol/map';
import { buildPlace } from '../src/place/build.ts';
import { TOWN } from '../src/place/town.ts';

const FILE = new URL('../../../assets/maps/town.nmap', import.meta.url);
const NAME = 'assets/maps/town.nmap';

function townBytes(): Uint8Array {
  const { map } = buildPlace(TOWN);
  if (map === null) throw new Error('Highcourt has no ground map');
  const bytes = writeMap(map);
  parseMap(bytes);
  return new Uint8Array(bytes);
}

function firstDifference(got: Uint8Array, want: Uint8Array): number {
  const shared = Math.min(got.length, want.length);
  for (let i = 0; i < shared; i++) {
    if (got[i] !== want[i]) return i;
  }
  return got.length === want.length ? -1 : shared;
}

const built = townBytes();
if (!process.argv.includes('--check')) {
  writeFileSync(FILE, built);
  console.log(`wrote ${NAME}: ${built.length} bytes`);
} else {
  const committed = new Uint8Array(readFileSync(FILE));
  const at = firstDifference(built, committed);
  if (at < 0) {
    console.log(`${NAME} matches the place builder: ${built.length} bytes`);
  } else {
    console.error(
      `${NAME} differs from the place builder at byte ${at} (built ${built.length} bytes, committed ${committed.length}): ` +
        'run node packages/worldgen/scripts/town-map.ts and commit the result',
    );
    process.exitCode = 1;
  }
}
