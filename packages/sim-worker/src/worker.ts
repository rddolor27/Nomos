import { createHomes, createStandInTown, createTown, type Tier, type World } from '@nomos/sim-core';
import { ENTITY_HOME, parseMap, type AppMessage } from '@nomos/sim-protocol';
import { createSimLoop } from './loop/loop.ts';

// One channel serves every yield: a posted message wakes the next turn without setTimeout's nested 4 ms clamp (R2 §2).
const channel = new MessageChannel();
let afterYield = (): void => {};
channel.port1.onmessage = () => afterYield();

// The startup gate's server prefixes this global to the worker script (R5 load notes §2); anything else runs at full speed.
const slowdown = Number((globalThis as { __nomosCpuSlowdown?: unknown }).__nomosCpuSlowdown);
const cpuSlowdown = Number.isFinite(slowdown) && slowdown >= 1 ? slowdown : 1;

// Nothing catches a bad map's MapError, so it leaves the handler and the page sees the Worker's error event. A page that
// names its tier with ?tier= sends agents, the tier's whole count in stand-in homes, which the perf specs measure. Any other
// start fills the map's own homes, one blob to a bed.
function makeWorld(seed: number, tier: Tier, map: ArrayBuffer, agents?: number): World {
  const ground = parseMap(map);
  if (agents !== undefined) return createStandInTown(seed, tier, ground, agents);
  return createTown(seed, tier, ground, createHomes(ground.entities.filter((entity) => entity.kind === ENTITY_HOME)));
}

const loop = createSimLoop(
  {
    now: () => performance.now(),
    sleep: (fn, ms) => {
      setTimeout(fn, ms);
    },
    yieldNow: (fn) => {
      afterYield = fn;
      channel.port2.postMessage(null);
    },
    post: (msg, transfer) => self.postMessage(msg, transfer),
    makeWorld,
  },
  cpuSlowdown,
);

self.onmessage = (event: MessageEvent<AppMessage>) => loop.handle(event.data);
