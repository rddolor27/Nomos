// Free of Node imports, so the same file runs in Node and, bundled, in the browser.
import { below, draw, draw1, mix } from '../../src/random/draw.ts';
import { fade, fbm, value } from '../../src/random/noise.ts';
import { step } from '../../src/step/step.ts';
import { LOOKS } from '../../src/agents/store.ts';
import { LOOK } from '../../src/random/streams.ts';
import { economyDay } from '../../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../../src/economy/params.ts';
import { startEconomy } from '../../src/economy/start.ts';
import type { Tier } from '../../src/memory/tiers.ts';
import { createStandInHomes } from '../../src/spawn/homes.ts';
import { LEDGER_FIELDS } from '../../src/spawn/record.ts';
import { spawnFromLedger } from '../../src/spawn/spawn.ts';
import { createTown } from '../../src/spawn/town.ts';
import { DAYS_PER_MONTH } from '../../src/time/calendar.ts';
import { stateHash } from '../../src/world/checkpoint.ts';
import { standInGround } from '../../src/world/ground.ts';
import { createWorld, layoutWorld } from '../../src/world/world.ts';
import { randomRecord } from './records.ts';

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
  // A town of people on the stand-in ground, stepped for ticks.
  town: { seed: number; tier: Tier; people: number; ticks: number; hash: string };
  // seed is randomRecord's, and hashes[index] is spawnHash(seed, index).
  spawn: { seed: number; hashes: string[] };
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

// A hand-built world outside the step, so it runs the economy a day at a time, as the CLI does.
export function economyHash(seed: number, tier: Tier, months: number): string {
  const world = createWorld(seed, tier, undefined, ECONOMY.households);
  startEconomy(world, ECONOMY);
  for (let day = 0; day < months * DAYS_PER_MONTH; day++) economyDay(world, ECONOMY, day);
  return stateHash(world).toString(16).padStart(8, '0');
}

// A spawned town runs CITY inside the step, so this replays its walking start, its movement and as much of the economy as
// the ticks reach.
export function townHash(seed: number, tier: Tier, people: number, ticks: number): string {
  const world = createTown(seed, tier, standInGround(), people);
  for (let tick = 0; tick < ticks; tick++) step(world);
  return stateHash(world).toString(16).padStart(8, '0');
}

// A random record fits a phone world laid out for 1,500 agents in 1 MiB, and 500 stand-in homes hold over twice its
// people, so any record seats. Each index spawns into its own world seed, settlement and day.
const SPAWN_AGENTS = 1_500;
const SPAWN_BYTES = 1 << 20;
const SPAWN_HOMES = 500;
const SPAWN_SETTLEMENTS = 4;
const SPAWN_DAYS_PER_INDEX = 21;

export function spawnHash(recordSeed: number, index: number): string {
  const record = new Float64Array(LEDGER_FIELDS);
  randomRecord(recordSeed, index, record);
  const world = layoutWorld(index + 1, 'phone', SPAWN_AGENTS, SPAWN_BYTES);
  const homes = createStandInHomes(standInGround(), SPAWN_HOMES);
  spawnFromLedger(world, record, homes, LENGNICK, index % SPAWN_SETTLEMENTS, SPAWN_DAYS_PER_INDEX * index);
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
  const { hash: townWant, ...town } = goldens.town;
  checkCase(report, 'town', town, townHash(town.seed, town.tier, town.people, town.ticks), townWant);
  const { seed, hashes } = goldens.spawn;
  for (let index = 0; index < hashes.length; index++) {
    checkCase(report, 'spawn', { seed, index }, spawnHash(seed, index), hashes[index]);
  }
  return report;
}
