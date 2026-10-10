// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser.
import { below, draw, draw1, mix } from '../../src/random/draw.ts';
import { fade, fbm, value } from '../../src/random/noise.ts';
import { step } from '../../src/step/step.ts';
import { LOOKS } from '../../src/agents/store.ts';
import { LOOK } from '../../src/random/streams.ts';
import { economyDay } from '../../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../../src/economy/params.ts';
import { startEconomy } from '../../src/economy/start.ts';
import type { Tier } from '../../src/memory/tiers.ts';
import { DAYS_PER_MONTH } from '../../src/time/calendar.ts';
import { stateHash } from '../../src/world/checkpoint.ts';
import { createWorld } from '../../src/world/world.ts';

interface DrawCase {
  seed: number;
  stream: number;
  keys: number[];
  out: number;
}

interface BelowCase extends DrawCase {
  n: number;
}

interface NoiseCase {
  seed: number;
  stream: number;
  x: number;
  y: number;
  cell: number;
  out: number;
}

interface ValueCase extends NoiseCase {
  octave: number;
}

interface FbmCase extends NoiseCase {
  octaves: number;
}

interface LookCase {
  seed: number;
  id: number;
  out: number;
}

// The cases of kernels.json; its streams table is checked once, in Node, by looks.test.ts.
export interface KernelFixture {
  mix: [number, number][];
  draw: DrawCase[];
  below: BelowCase[];
  fade: [number, number][];
  value: ValueCase[];
  fbm: FbmCase[];
  look: LookCase[];
}

export interface Goldens {
  ticks: number;
  hashes: Record<string, string>;
  economy: { seed: number; tier: Tier; months: number; hash: string };
}

export interface EngineReport {
  cases: number;
  failures: string[];
}

function checkCase(
  report: EngineReport,
  kernel: string,
  input: unknown,
  got: number | string,
  want: number | string,
): void {
  report.cases++;
  if (got !== want) report.failures.push(`${kernel} ${JSON.stringify(input)}: got ${got}, want ${want}`);
}

export function checkKernels(fixture: KernelFixture): EngineReport {
  const report: EngineReport = { cases: 0, failures: [] };
  for (const [x, out] of fixture.mix) checkCase(report, 'mix', x, mix(x), out);
  for (const c of fixture.draw) checkCase(report, 'draw', c, draw(c.seed, c.stream, ...c.keys), c.out);
  for (const c of fixture.below) checkCase(report, 'below', c, below(c.n, c.seed, c.stream, ...c.keys), c.out);
  for (const [t, out] of fixture.fade) checkCase(report, 'fade', t, fade(t), out);
  for (const c of fixture.value) {
    checkCase(report, 'value', c, value(c.seed, c.stream, c.x, c.y, c.cell, c.octave), c.out);
  }
  for (const c of fixture.fbm) checkCase(report, 'fbm', c, fbm(c.seed, c.stream, c.x, c.y, c.cell, c.octaves), c.out);
  for (const c of fixture.look) checkCase(report, 'look', c, draw1(c.seed, LOOK, c.id) % LOOKS, c.out);
  return report;
}

export function replayHash(seed: number, tier: Tier, ticks: number): string {
  const world = createWorld(seed, tier);
  for (let tick = 0; tick < ticks; tick++) step(world);
  return stateHash(world).toString(16).padStart(8, '0');
}

// LENGNICK with its fiat issue on at 1% a month, so the run replays the issue along with wages, shopping and profits.
const ECONOMY: EconomyParams = { ...LENGNICK, fiatIssuePpm: 10_000 };

// The economy is not part of step yet, so it runs a day at a time, as the CLI does.
export function economyHash(seed: number, tier: Tier, months: number): string {
  const world = createWorld(seed, tier, undefined, ECONOMY.households);
  startEconomy(world, ECONOMY);
  for (let day = 0; day < months * DAYS_PER_MONTH; day++) economyDay(world, ECONOMY, day);
  return stateHash(world).toString(16).padStart(8, '0');
}

export function checkGoldens(goldens: Goldens): EngineReport {
  const report: EngineReport = { cases: 0, failures: [] };
  for (const [key, want] of Object.entries(goldens.hashes)) {
    const [seed, tier] = key.split('/');
    checkCase(report, 'replay', key, replayHash(Number(seed), tier as Tier, goldens.ticks), want);
  }
  const { hash, ...run } = goldens.economy;
  checkCase(report, 'economy', run, economyHash(run.seed, run.tier, run.months), hash);
  return report;
}
