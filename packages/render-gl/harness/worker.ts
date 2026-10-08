import SimWorker from '@nomos/sim-worker/worker?worker';
import {
  MAP_CONTENT_TYPE,
  SNAPSHOT_BYTES,
  TILE_PX,
  parseMap,
  type AppMessage,
  type MapV1,
  type WorkerMessage,
} from '@nomos/sim-protocol';

const TOWN = '/maps/town.nmap';
const ERROR_WITHIN_MS = 2_000;
const SNAPSHOT_FLOATS = SNAPSHOT_BYTES / Float32Array.BYTES_PER_ELEMENT;

export interface Spawn {
  agents: number;
  tick: number;
  count: number;
  // Agents whose tile is blocked or off the map.
  offWalk: number;
}

export interface WorkerHarness {
  spawn(seed: number): Promise<Spawn>;
  mapContentType(): Promise<{ got: string | null; want: string }>;
  failOn(text: string): Promise<string>;
}

declare global {
  interface Window {
    workerHarness: WorkerHarness;
  }
}

async function fetchTown(): Promise<ArrayBuffer> {
  const response = await fetch(TOWN);
  if (!response.ok) throw new Error(`the town map answered ${response.status}`);
  return response.arrayBuffer();
}

function send(worker: Worker, msg: AppMessage, transfer: Transferable[] = []): void {
  worker.postMessage(msg, transfer);
}

function agentsOffWalk(map: MapV1, buffer: ArrayBuffer, count: number): number {
  const floats = new Float32Array(buffer, 0, count * SNAPSHOT_FLOATS);
  let off = 0;
  for (let i = 0; i < count; i++) {
    const tx = Math.floor(floats[i * SNAPSHOT_FLOATS] / TILE_PX);
    const ty = Math.floor(floats[i * SNAPSHOT_FLOATS + 1] / TILE_PX);
    const onMap = tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
    if (!onMap || map.walk[ty * map.width + tx] === 0) off++;
  }
  return off;
}

// Starts the worker on the town, checks its first snapshot, the spawn, against the map, and hands every snapshot
// buffer back as the app will, so the worker's pool never runs dry.
async function spawn(seed: number): Promise<Spawn> {
  const bytes = await fetchTown();
  const map = parseMap(bytes);
  const worker = new SimWorker();
  try {
    return await new Promise<Spawn>((resolve, reject) => {
      let agents = -1;
      worker.addEventListener('error', (event) => reject(new Error(event.message)));
      worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
        if (data.type === 'ready') agents = data.agents;
        if (data.type !== 'snapshot') return;
        const offWalk = agentsOffWalk(map, data.buffer, data.count);
        send(worker, { type: 'return', buffer: data.buffer }, [data.buffer]);
        resolve({ agents, tick: data.tick, count: data.count, offWalk });
      });
      send(worker, { type: 'init', seed, tier: 'phone', map: bytes }, [bytes]);
    });
  } finally {
    worker.terminate();
  }
}

async function mapContentType(): Promise<{ got: string | null; want: string }> {
  const response = await fetch(TOWN);
  return { got: response.headers.get('content-type'), want: MAP_CONTENT_TYPE };
}

// Resolves with the message of the error the worker raises for a map made of text, or rejects after 2 s.
async function failOn(text: string): Promise<string> {
  const worker = new SimWorker();
  try {
    return await new Promise<string>((resolve, reject) => {
      setTimeout(() => reject(new Error(`the worker raised no error within ${ERROR_WITHIN_MS} ms`)), ERROR_WITHIN_MS);
      worker.addEventListener('error', (event) => {
        // Handled here, so the page doesn't report it a second time as its own uncaught error.
        event.preventDefault();
        resolve(event.message);
      });
      const map = new TextEncoder().encode(text).buffer;
      send(worker, { type: 'init', seed: 42, tier: 'phone', map }, [map]);
    });
  } finally {
    worker.terminate();
  }
}

window.workerHarness = { spawn, mapContentType, failOn };
