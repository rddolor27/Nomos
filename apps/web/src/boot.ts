import workerUrl from '@nomos/sim-worker/worker?worker&url';
import townMapUrl from '../../../assets/maps/town.nmap?url';

export interface Boot {
  worker: Worker;
  map: Promise<ArrayBuffer>;
}

declare global {
  interface Window {
    __boot?: Boot;
  }
}

// The worker's URL, hashed in production, so it names the sim build: a stored tier verdict lapses when it changes.
export const SIM_BUILD = workerUrl;

async function fetchMap(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`map ${response.status}`);
  return response.arrayBuffer();
}

// A build's inline <head> script has already started both downloads. Under vite dev nothing has, so they start here;
// these two imports are also what puts the worker and the map in the build.
export function takeBoot(): Boot {
  if (window.__boot) return window.__boot;
  const worker = new Worker(workerUrl, { type: 'module', name: 'sim' });
  performance.mark('worker:new');
  return { worker, map: fetchMap(townMapUrl) };
}
