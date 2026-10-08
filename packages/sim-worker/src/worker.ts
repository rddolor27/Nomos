import { createWorld } from '@nomos/sim-core';
import { parseMap, type AppMessage } from '@nomos/sim-protocol';
import { createSimLoop } from './loop.ts';

// One channel serves every yield: a posted message wakes the next turn without setTimeout's nested 4 ms clamp (R2 §2).
const channel = new MessageChannel();
let afterYield = (): void => {};
channel.port1.onmessage = () => afterYield();

const loop = createSimLoop({
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
});

self.onmessage = (event: MessageEvent<AppMessage>) => loop.handle(event.data);
