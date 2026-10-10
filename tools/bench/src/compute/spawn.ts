import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  LENGNICK,
  TIER_AGENTS,
  TIER_MEMORY_BYTES,
  createStandInHomes,
  layoutWorld,
  spawnFromLedger,
  standInGround,
  type Homes,
  type World,
} from '@nomos/sim-core';
import { SPAWN_ROW } from './budgets.ts';

const SPAWN_SEED = 1;
// Beds for twice the people, which always seat a mix of sizes (homes.test.ts).
const HOMES = 33_334;

// A desktop city of 100,000 people in households of 1 to 6, one firm to ten of them and 96,000 at work.
export function benchRecord(): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  record.set([12_000, 12_000, 6_000, 6_000, 2_000, 2_000], LEDGER_HOUSEHOLDS);
  record[LEDGER_EMPLOYED] = 96_000;
  record[LEDGER_UNEMPLOYED] = 4_000;
  record[LEDGER_FIRMS] = 10_000;
  record[LEDGER_HOUSEHOLD_CASH] = 31_000_000_000;
  record[LEDGER_FIRM_CASH] = 1_400_000_000;
  record[LEDGER_PRICE] = 3_000;
  record[LEDGER_WAGE] = 165_000;
  record[LEDGER_STOCK] = 2_700_000;
  return record;
}

export function benchHomes(): Homes {
  return createStandInHomes(standInGround(), HOMES);
}

function desktopWorld(): World {
  return layoutWorld(SPAWN_SEED, 'desktop', TIER_AGENTS.desktop, TIER_MEMORY_BYTES.desktop);
}

// One value per spawn: the ms from the call to its return, with the world laid out beforehand. The first spawn is not
// timed, so its path is compiled before the first sample.
export function sampleSpawn(samples: number, now: () => number): Record<string, Float64Array> {
  const record = benchRecord();
  const homes = benchHomes();
  spawnFromLedger(desktopWorld(), record, homes, LENGNICK, 0, 0);
  const spawnMs = new Float64Array(samples);
  for (let sample = 0; sample < samples; sample++) {
    const world = desktopWorld();
    const startMs = now();
    spawnFromLedger(world, record, homes, LENGNICK, 0, 0);
    spawnMs[sample] = now() - startMs;
  }
  return { [SPAWN_ROW.system]: spawnMs };
}
