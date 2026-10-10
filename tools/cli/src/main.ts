import { parseArgs } from 'node:util';
import { TIER_AGENTS, createWorld, currentTick, logFocus, stateHash, step, warmUp, type Tier } from '@nomos/sim-core';
import { runDesign } from './design/run.ts';
import { runEconomy } from './economy/run.ts';
import { runTargets } from './targets/run.ts';

const MAX_SEED = 0xffff_ffff;
const MAX_INT32 = 0x7fff_ffff;

interface Focus {
  readonly tick: number;
  readonly settlement: number;
}

function wholeNumber(flag: string, text: string, max: number): number {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw new RangeError(`--${flag} must be a whole number from 0 to ${max}, not ${text}`);
  }
  return n;
}

// A focus is logged just before its tick's step, so its tick must be one this run steps.
function parseFocus(text: string, ticks: number): Focus {
  const parts = text.split(':');
  if (parts.length !== 2) throw new RangeError(`--focus takes <tick>:<settlement>, not ${text}`);
  return { tick: wholeNumber('focus', parts[0], ticks - 1), settlement: wholeNumber('focus', parts[1], MAX_INT32) };
}

function isTier(name: string): name is Tier {
  return Object.hasOwn(TIER_AGENTS, name);
}

function hex8(hash: number): string {
  return hash.toString(16).padStart(8, '0');
}

function runTicks(args: readonly string[]): void {
  const { values } = parseArgs({
    args: [...args],
    options: {
      seed: { type: 'string', default: '42' },
      tier: { type: 'string', default: 'phone' },
      ticks: { type: 'string', default: '1000' },
      focus: { type: 'string', multiple: true, default: [] },
      warmup: { type: 'boolean', default: false },
    },
  });

  const seed = wholeNumber('seed', values.seed, MAX_SEED);
  const ticks = wholeNumber('ticks', values.ticks, MAX_INT32);
  const tier = values.tier;
  if (!isTier(tier)) throw new RangeError(`--tier must be one of ${Object.keys(TIER_AGENTS).join(', ')}, not ${tier}`);
  const focuses = values.focus.map((text) => parseFocus(text, ticks));

  if (values.warmup) {
    const start = performance.now();
    warmUp();
    console.log(`warmup=${(performance.now() - start).toFixed(1)}ms`);
  }

  const world = createWorld(seed, tier);
  for (let tick = 0; tick < ticks; tick++) {
    for (const focus of focuses) {
      if (focus.tick === tick && !logFocus(world, focus.settlement)) throw new RangeError('the input log is full');
    }
    step(world);
  }
  console.log(`seed=${seed} tier=${tier} tick=${currentTick(world)} hash=${hex8(stateHash(world))}`);
}

const args = process.argv.slice(2);
if (args[0] === 'economy') runEconomy(args.slice(1));
else if (args[0] === 'design') await runDesign(args.slice(1));
else if (args[0] === 'targets') runTargets(args.slice(1));
else runTicks(args);
