import { createWorld } from '@nomos/sim-core';
import type { AppMessage } from '@nomos/sim-protocol';
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
  // The map goes unread until M0.4 builds the world's ground from it.
  makeWorld: (seed, tier) => createWorld(seed, tier),
});

self.onmessage = (event: MessageEvent<AppMessage>) => loop.handle(event.data);
