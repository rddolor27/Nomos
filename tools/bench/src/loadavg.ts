import { existsSync, readFileSync } from 'node:fs';
import { loadavg } from 'node:os';

const PROC_LOADAVG = '/proc/loadavg';

// The 1, 5 and 15 minute load averages, recorded beside every timing (docs rules). Windows keeps none, and its
// os.loadavg() zeros would read as an idle machine, so it records null (M0.5 review).
export function readLoadavg(): string | null {
  if (existsSync(PROC_LOADAVG)) return readFileSync(PROC_LOADAVG, 'utf8').split(' ').slice(0, 3).join(' ');
  if (process.platform === 'win32') return null;
  return loadavg()
    .map((load) => load.toFixed(2))
    .join(' ');
}
