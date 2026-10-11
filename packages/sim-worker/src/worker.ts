import { createHomes, createShops, createStandInTown, createTown, type Homes, type Shops, type Tier, type World } from '@nomos/sim-core';
import { ENTITY_HOME, leisureOf, parseMap, premisesOf, type AppMessage, type MapV1 } from '@nomos/sim-protocol';
import { createSimLoop, type TownSite } from './loop/loop.ts';

// One channel serves every yield: a posted message wakes the next turn without setTimeout's nested 4 ms clamp (R2 §2).
const channel = new MessageChannel();
let afterYield = (): void => {};
channel.port1.onmessage = () => afterYield();

// The startup gate's server prefixes this global to the worker script (R5 load notes §2); anything else runs at full speed.
const slowdown = Number((globalThis as { __nomosCpuSlowdown?: unknown }).__nomosCpuSlowdown);
const cpuSlowdown = Number.isFinite(slowdown) && slowdown >= 1 ? slowdown : 1;

function homesOf(map: MapV1): Homes {
  return createHomes(map.entities.filter((entity) => entity.kind === ENTITY_HOME));
}

// The map's shops and stalls give its town streets: blobs walk to work and to the shops they bought from (M2.7). Its plaza, greens
// and water edges follow the premises as sites of their own, where blobs spend their free time (M3.2).
function shopsOf(map: MapV1): Shops {
  return createShops([...premisesOf(map), ...leisureOf(map)]);
}

// Nothing catches a bad map's MapError, so it leaves the handler and the page sees the Worker's error event. A page that
// names its tier with ?tier= sends agents, the tier's whole count in stand-in homes, which the perf specs measure, and those
// have no streets. Any other start fills the map's own homes, one blob to a bed, with its streets.
function makeWorld(seed: number, tier: Tier, map: ArrayBuffer, agents?: number): World {
  const ground = parseMap(map);
  if (agents !== undefined) return createStandInTown(seed, tier, ground, agents);
  return createTown(seed, tier, ground, homesOf(ground), shopsOf(ground));
}

// An open message's map, read the same way, and just as uncaught.
function readTown(map: ArrayBuffer): TownSite {
  const ground = parseMap(map);
  return { ground, homes: homesOf(ground), shops: shopsOf(ground) };
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
    readTown,
  },
  cpuSlowdown,
);

self.onmessage = (event: MessageEvent<AppMessage>) => loop.handle(event.data);
