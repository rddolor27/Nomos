// Free of Node imports, so the same file runs in Node and, bundled, in the browser.
import { below, draw, draw1, mix } from '../../src/random/draw.ts';
import { fade, fbm, value } from '../../src/random/noise.ts';
import { step } from '../../src/step/step.ts';
import { LOOKS } from '../../src/agents/store.ts';
import { LOOK } from '../../src/random/streams.ts';
import { requestTown } from '../../src/day/day.ts';
import { economyDay } from '../../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../../src/economy/params.ts';
import { startEconomy } from '../../src/economy/start.ts';
import type { Tier } from '../../src/memory/tiers.ts';
import { stepAwayTown } from '../../src/spawn/away.ts';
import { createStandInHomes, createStandInTownHomes } from '../../src/spawn/homes.ts';
import { LEDGER_FIELDS, townRecord } from '../../src/spawn/record.ts';
import { spawnFromLedger } from '../../src/spawn/spawn.ts';
import { createStandInTown, createTown } from '../../src/spawn/town.ts';
import { DAYS_PER_MONTH, TICKS_PER_DAY } from '../../src/time/calendar.ts';
import { checkpoint, restoreWorld, stateHash } from '../../src/world/checkpoint.ts';
import { standInGround } from '../../src/world/ground.ts';
import { TICK, createWorld, layoutWorld } from '../../src/world/world.ts';
import { randomRecord } from './records.ts';
import { streetTown } from './street-town.ts';

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
  // Place p is a stand-in town of people[p], and place 0 is live at tick 0. Each [tick, place] of requests asks to enter that
  // place at that tick, and the world is hashed after ticks.
  switch: { seed: number; tier: Tier; people: number[]; requests: [number, number][]; ticks: number; hash: string };
  // A town of people beds, its largest home holding largestHome, left away through summary months 1 to months: it ends as row.
  away: { seed: number; people: number; largestHome: number; months: number; row: number[] };
  // The switch's place 1 entered for the first time by one step on day, and hashed after it.
  visit: { seed: number; tier: Tier; people: number[]; day: number; hash: string };
  // A town of people on a synthetic street ground with three shops, one of them a stall, stepped for ticks from its first
  // morning. A twin restored from a checkpoint taken at saved, while blobs are mid-trip, and stepped on to ticks ends at the
  // same hash.
  streets: { seed: number; tier: Tier; people: number; saved: number; ticks: number; hash: string };
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
  const world = createStandInTown(seed, tier, standInGround(), people);
  for (let tick = 0; tick < ticks; tick++) step(world);
  return stateHash(world).toString(16).padStart(8, '0');
}

// A town that switches towns inside the step: each request lands at the next day boundary, where the live town folds into
// its ledger row and the requested one spawns, and the hash covers the table, the live place and the new town's blobs.
export function switchHash(
  seed: number,
  tier: Tier,
  people: readonly number[],
  requests: readonly (readonly [number, number])[],
  ticks: number,
): string {
  const ground = standInGround();
  const homes = people.map((count) => createStandInTownHomes(ground, count));
  const world = createTown(seed, tier, ground, homes[0]);
  let next = 0;
  for (let tick = 0; tick < ticks; tick++) {
    while (next < requests.length && requests[next][0] === tick) {
      const place = requests[next++][1];
      if (!requestTown(world, place, ground, homes[place])) throw new Error(`the request for place ${place} was refused`);
    }
    step(world);
  }
  return stateHash(world).toString(16).padStart(8, '0');
}

// A town's first record, advanced by the summary month once for each of months 1 to `months`, as a town off screen is. The
// step's noise and rounding use Math.sqrt and Math.round, which the browser has to agree on.
export function awayRow(seed: number, people: number, largestHome: number, months: number): number[] {
  const row = new Float64Array(LEDGER_FIELDS);
  townRecord(people, largestHome, row);
  const anchor = new Float64Array(LEDGER_FIELDS);
  for (let month = 1; month <= months; month++) stepAwayTown(row, 0, seed, month, anchor);
  return Array.from(row);
}

// Place 1 is entered for the first time by a single step at the first tick of `day`, which is the way a switch lands: the live
// town folds, and the new one spawns after the summary months that began before the day, with the month so far filled in. The
// days between are skipped, since the hash covers the new town and the two rows alone.
export function visitHash(seed: number, tier: Tier, people: readonly number[], day: number): string {
  const ground = standInGround();
  const homes = people.map((count) => createStandInTownHomes(ground, count));
  const world = createTown(seed, tier, ground, homes[0]);
  if (!requestTown(world, 1, ground, homes[1])) throw new Error('the request for place 1 was refused');
  world.globals[TICK] = day * TICKS_PER_DAY;
  step(world);
  return stateHash(world).toString(16).padStart(8, '0');
}

// A town whose blobs walk to work and to three shops, on a ground made in street-town.ts and not a map, so the pinned hash never
// moves with the generator. Day 0 is a workday, and 1,000 ticks reach the walk home from work.
export function streetsHash(seed: number, tier: Tier, people: number, ticks: number): string {
  const world = streetTown(seed, tier, people);
  for (let tick = 0; tick < ticks; tick++) step(world);
  return stateHash(world).toString(16).padStart(8, '0');
}

// The same town checkpointed at `saved`, with blobs mid-trip, then restored into a twin that is stepped on to `ticks`. The fields
// and the shops' columns lie outside the hash but inside a checkpoint, so only stepping the twin on shows a restore that lost them.
export function restoredStreetsHash(seed: number, tier: Tier, people: number, saved: number, ticks: number): string {
  const world = streetTown(seed, tier, people);
  for (let tick = 0; tick < saved; tick++) step(world);
  const twin = restoreWorld(seed, tier, checkpoint(world), world.ground);
  for (let tick = saved; tick < ticks; tick++) step(twin);
  return stateHash(twin).toString(16).padStart(8, '0');
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
  const { hash: switchWant, ...switched } = goldens.switch;
  const switchGot = switchHash(switched.seed, switched.tier, switched.people, switched.requests, switched.ticks);
  checkCase(report, 'switch', switched, switchGot, switchWant);
  const { row: awayWant, ...away } = goldens.away;
  checkCase(report, 'away', away, awayRow(away.seed, away.people, away.largestHome, away.months).join(), awayWant.join());
  const { hash: visitWant, ...visit } = goldens.visit;
  checkCase(report, 'visit', visit, visitHash(visit.seed, visit.tier, visit.people, visit.day), visitWant);
  const { hash: streetsWant, ...streets } = goldens.streets;
  checkCase(report, 'streets', streets, streetsHash(streets.seed, streets.tier, streets.people, streets.ticks), streetsWant);
  const restored = restoredStreetsHash(streets.seed, streets.tier, streets.people, streets.saved, streets.ticks);
  checkCase(report, 'streets restored', streets, restored, streetsWant);
  const { seed, hashes } = goldens.spawn;
  for (let index = 0; index < hashes.length; index++) {
    checkCase(report, 'spawn', { seed, index }, spawnHash(seed, index), hashes[index]);
  }
  return report;
}
