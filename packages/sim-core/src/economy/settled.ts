import { foldToLedger } from '../spawn/fold.ts';
import { LEDGER_FIELDS } from '../spawn/record.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import { createWorld, type World } from '../world/world.ts';
import { economyDay } from './economy.ts';
import type { EconomyParams } from './params.ts';
import { startEconomy } from './start.ts';

// R* comes from this seed's hand-built city (M2.2 Ruling 12).
const SOURCE_SEED = 42;

// R*: the preset's hand-built city, run to the first month end on or after its burn-in, and folded into a ledger record.
export function settledRecord(preset: EconomyParams): Float64Array {
  const world = createWorld(SOURCE_SEED, 'phone', undefined, preset.households);
  startEconomy(world, preset);
  const days = Math.ceil(preset.burnInDays / DAYS_PER_MONTH) * DAYS_PER_MONTH;
  for (let day = 0; day < days; day++) economyDay(world, preset, day);
  return createFolded(world);
}

function createFolded(world: World): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}
