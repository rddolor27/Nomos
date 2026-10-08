import { parseArgs } from 'node:util';
import { TIER_AGENTS, createWorld, currentTick, stateHash, step, type Tier } from '@nomos/sim-core';

const MAX_SEED = 0xffff_ffff;
const MAX_TICKS = 0x7fff_ffff;

function wholeNumber(flag: string, text: string, max: number): number {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw new RangeError(`--${flag} must be a whole number from 0 to ${max}, not ${text}`);
  }
  return n;
}

function isTier(name: string): name is Tier {
  return Object.hasOwn(TIER_AGENTS, name);
}

function hex8(hash: number): string {
  return hash.toString(16).padStart(8, '0');
}

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '42' },
    tier: { type: 'string', default: 'phone' },
    ticks: { type: 'string', default: '1000' },
  },
});

const seed = wholeNumber('seed', values.seed, MAX_SEED);
const ticks = wholeNumber('ticks', values.ticks, MAX_TICKS);
const tier = values.tier;
if (!isTier(tier)) throw new RangeError(`--tier must be one of ${Object.keys(TIER_AGENTS).join(', ')}, not ${tier}`);

const world = createWorld(seed, tier);
for (let t = 0; t < ticks; t++) step(world);
console.log(`seed=${seed} tier=${tier} tick=${currentTick(world)} hash=${hex8(stateHash(world))}`);
