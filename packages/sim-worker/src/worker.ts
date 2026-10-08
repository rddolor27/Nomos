import { createWorld } from '@nomos/sim-core';
import { parseMap, type AppMessage } from '@nomos/sim-protocol';
import { createSimLoop } from './loop.ts';

// One channel serves every yield: a posted message wakes the next turn without setTimeout's nested 4 ms clamp (R2 §2).
const channel = new MessageChannel();
let afterYield = (): void => {};
channel.port1.onmessage = () => afterYield();

// The startup gate's server prefixes this global to the worker script (R5 load notes §2); anything else runs at full speed.
const slowdown = Number((globalThis as { __nomosCpuSlowdown?: unknown }).__nomosCpuSlowdown);
const cpuSlowdown = Number.isFinite(slowdown) && slowdown >= 1 ? slowdown : 1;

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
    // Nothing catches a bad map's MapError, so it leaves the handler and the page sees the Worker's error event.
    makeWorld: (seed, tier, map) => createWorld(seed, tier, parseMap(map)),
  },
  cpuSlowdown,
);

self.onmessage = (event: MessageEvent<AppMessage>) => loop.handle(event.data);
