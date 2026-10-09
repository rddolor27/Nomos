import type { PlaceRequest } from '@nomos/sim-protocol/place';
import type { MapAppMessage } from '@nomos/sim-protocol/world-map';
import type { PlaceContext } from '@nomos/worldgen';
import { answerGenerate, answerPlace } from './generate.ts';

// M8.3 starts this with new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' }), so
// Vite builds it as map-worker-*.js, apart from every first-load chunk (interfaces.md, The world map).
let contexts: PlaceContext[] = [];
const now = (): number => performance.now();

self.onmessage = (event: MessageEvent<MapAppMessage | PlaceRequest>) => {
  const msg = event.data;
  if (msg.type === 'place') {
    const { reply, transfer } = answerPlace(msg, contexts, now);
    self.postMessage(reply, { transfer });
    return;
  }
  const answer = answerGenerate(msg, now);
  contexts = answer.contexts;
  self.postMessage(answer.reply, { transfer: answer.transfer });
};
