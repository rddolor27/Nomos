// Rewrites test/fixtures/goldens.json: run it in any commit that moves the sim on purpose, and commit the result.
import { writeFileSync } from 'node:fs';
import { TIER_AGENTS, type Tier } from '../src/memory/tiers.ts';
import {
  awayRow,
  economyHash,
  replayHash,
  spawnHash,
  switchHash,
  townHash,
  visitHash,
  type Goldens,
} from '../test/engines/checks.ts';

const SEED = 42;
const TICKS = 1_000;
const ECONOMY_TIER = 'phone';
const ECONOMY_MONTHS = 3;
const TOWN_PEOPLE = 1_000;
// Place 0 to place 1 at tick 500, back at 2,000, hashed at 3,000, which is day 2's tick 120: past the economy's window.
const SWITCH_PEOPLE = [1_000, 600];
const SWITCH_REQUESTS: [number, number][] = [
  [500, 1],
  [2_000, 0],
];
const SWITCH_TICKS = 3_000;
// Highcourt's beds and largest home, away for a year of 12 summary months.
const AWAY_PEOPLE = 2_688;
const AWAY_LARGEST_HOME = 24;
const AWAY_MONTHS = 12;
// The switch's two towns, with place 1 first entered on day 50, after months 1 and 2 began.
const VISIT_DAY = 50;
const SPAWN_SEED = 2026;
const SPAWN_RECORDS = 20;

const goldens: Goldens = {
  ticks: TICKS,
  hashes: {},
  economy: { seed: SEED, tier: ECONOMY_TIER, months: ECONOMY_MONTHS, hash: economyHash(SEED, ECONOMY_TIER, ECONOMY_MONTHS) },
  town: { seed: SEED, tier: ECONOMY_TIER, people: TOWN_PEOPLE, ticks: TICKS, hash: townHash(SEED, ECONOMY_TIER, TOWN_PEOPLE, TICKS) },
  switch: {
    seed: SEED,
    tier: ECONOMY_TIER,
    people: SWITCH_PEOPLE,
    requests: SWITCH_REQUESTS,
    ticks: SWITCH_TICKS,
    hash: switchHash(SEED, ECONOMY_TIER, SWITCH_PEOPLE, SWITCH_REQUESTS, SWITCH_TICKS),
  },
  away: {
    seed: SEED,
    people: AWAY_PEOPLE,
    largestHome: AWAY_LARGEST_HOME,
    months: AWAY_MONTHS,
    row: awayRow(SEED, AWAY_PEOPLE, AWAY_LARGEST_HOME, AWAY_MONTHS),
  },
  visit: {
    seed: SEED,
    tier: ECONOMY_TIER,
    people: SWITCH_PEOPLE,
    day: VISIT_DAY,
    hash: visitHash(SEED, ECONOMY_TIER, SWITCH_PEOPLE, VISIT_DAY),
  },
  spawn: { seed: SPAWN_SEED, hashes: [] },
};
for (const tier of Object.keys(TIER_AGENTS) as Tier[]) {
  goldens.hashes[`${SEED}/${tier}`] = replayHash(SEED, tier, TICKS);
}
for (let index = 0; index < SPAWN_RECORDS; index++) goldens.spawn.hashes.push(spawnHash(SPAWN_SEED, index));

writeFileSync(new URL('../test/fixtures/goldens.json', import.meta.url), `${JSON.stringify(goldens, null, 2)}\n`);
for (const [key, hash] of Object.entries(goldens.hashes)) console.log(`${key} tick=${TICKS} hash=${hash}`);
console.log(`${SEED}/${ECONOMY_TIER} economy months=${ECONOMY_MONTHS} hash=${goldens.economy.hash}`);
console.log(`${SEED}/${ECONOMY_TIER} town people=${TOWN_PEOPLE} ticks=${TICKS} hash=${goldens.town.hash}`);
console.log(`${SEED}/${ECONOMY_TIER} switch people=${SWITCH_PEOPLE.join('+')} ticks=${SWITCH_TICKS} hash=${goldens.switch.hash}`);
console.log(`${SEED} away people=${AWAY_PEOPLE} months=${AWAY_MONTHS} row=${goldens.away.row.join(',')}`);
console.log(`${SEED}/${ECONOMY_TIER} visit people=${SWITCH_PEOPLE.join('+')} day=${VISIT_DAY} hash=${goldens.visit.hash}`);
for (const [index, hash] of goldens.spawn.hashes.entries()) console.log(`${SPAWN_SEED}/${index} spawn hash=${hash}`);
