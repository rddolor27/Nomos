// M3.1 part 3's build-time baseline: node packages/worldgen/scripts/time-places.ts [--worlds N]. Takes up to six places
// of each tier from the first standard worlds from 5EED0001, in context order, builds each once to warm it and once
// timed, and prints a line per tier. After each layout task a capital's and a city's median stays within 2x of the
// baseline's and their worst within 2.5x of its worst, on the same machine.
import { parseArgs } from 'node:util';
import { TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { generateWorld, placeContexts, type PlaceContext } from '../src/index.ts';
import { crowdedPlace } from '../src/place/street-crowd.ts';

const FIRST_SEED = 0x5eed0001;
const WORLDS = 6;
const PER_TIER = 6;
const TIER_WIDTH = Math.max(...TIER_NAMES.map((tier) => tier.length));

interface Build {
  readonly ms: number;
  readonly walkCells: number;
  readonly crowdCells: number;
}

function worldCount(text: string): number {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`--worlds must be a whole number of at least 1, not ${text}`);
  return n;
}

// Wonders have no tier, so they are left out.
function sample(worlds: number): Map<string, PlaceContext[]> {
  const byTier = new Map(TIER_NAMES.map((tier): [string, PlaceContext[]] => [tier, []]));
  for (let k = 0; k < worlds; k++) {
    for (const ctx of placeContexts(generateWorld(FIRST_SEED + k, 'standard'))) {
      const taken = ctx.tier === null ? undefined : byTier.get(ctx.tier);
      if (taken && taken.length < PER_TIER) taken.push(ctx);
    }
  }
  return byTier;
}

function timedBuild(ctx: PlaceContext): Build {
  crowdedPlace(ctx);
  const start = performance.now();
  const { walks, crowd } = crowdedPlace(ctx);
  const ms = performance.now() - start;
  return { ms, walkCells: walks.cells.length, crowdCells: crowd.cells.length };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function lineOf(tier: string, builds: readonly Build[]): string {
  const ms = builds.map((build) => build.ms);
  return [
    tier.padEnd(TIER_WIDTH),
    `n=${builds.length}`,
    `median ${median(ms).toFixed(1)} ms`,
    `worst ${Math.max(...ms).toFixed(1)} ms`,
    `walk cells ${Math.max(...builds.map((build) => build.walkCells))}`,
    `crowd cells ${Math.max(...builds.map((build) => build.crowdCells))}`,
  ].join('  ');
}

const { values } = parseArgs({ options: { worlds: { type: 'string', default: String(WORLDS) } } });
for (const [tier, contexts] of sample(worldCount(values.worlds))) {
  console.log(lineOf(tier, contexts.map(timedBuild)));
}
