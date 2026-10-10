// Rewrites test/fixtures/goldens.json: run it in any commit that moves the sim on purpose, and commit the result.
import { writeFileSync } from 'node:fs';
import { TIER_AGENTS, type Tier } from '../src/memory/tiers.ts';
import { economyHash, replayHash, spawnHash, type Goldens } from '../test/engines/checks.ts';

const SEED = 42;
const TICKS = 1_000;
const ECONOMY_TIER = 'phone';
const ECONOMY_MONTHS = 3;
const SPAWN_SEED = 2026;
const SPAWN_RECORDS = 20;

const goldens: Goldens = {
  ticks: TICKS,
  hashes: {},
  economy: { seed: SEED, tier: ECONOMY_TIER, months: ECONOMY_MONTHS, hash: economyHash(SEED, ECONOMY_TIER, ECONOMY_MONTHS) },
  spawn: { seed: SPAWN_SEED, hashes: [] },
};
for (const tier of Object.keys(TIER_AGENTS) as Tier[]) {
  goldens.hashes[`${SEED}/${tier}`] = replayHash(SEED, tier, TICKS);
}
for (let index = 0; index < SPAWN_RECORDS; index++) goldens.spawn.hashes.push(spawnHash(SPAWN_SEED, index));

writeFileSync(new URL('../test/fixtures/goldens.json', import.meta.url), `${JSON.stringify(goldens, null, 2)}\n`);
for (const [key, hash] of Object.entries(goldens.hashes)) console.log(`${key} tick=${TICKS} hash=${hash}`);
console.log(`${SEED}/${ECONOMY_TIER} economy months=${ECONOMY_MONTHS} hash=${goldens.economy.hash}`);
for (const [index, hash] of goldens.spawn.hashes.entries()) console.log(`${SPAWN_SEED}/${index} spawn hash=${hash}`);
