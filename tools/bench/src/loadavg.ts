import { existsSync, readFileSync } from 'node:fs';
import { loadavg } from 'node:os';

const PROC_LOADAVG = '/proc/loadavg';

// The 1, 5 and 15 minute load averages, recorded beside every timing (docs rules). Windows reports zeros.
export function readLoadavg(): string {
  if (existsSync(PROC_LOADAVG)) return readFileSync(PROC_LOADAVG, 'utf8').split(' ').slice(0, 3).join(' ');
  return loadavg()
    .map((load) => load.toFixed(2))
    .join(' ');
}
