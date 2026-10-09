import type { MapAppMessage } from '@nomos/sim-protocol/world-map';
import { answerGenerate } from './generate.ts';

// M8.3 starts this with new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' }), so
// Vite builds it as map-worker-*.js, apart from every first-load chunk (interfaces.md, The world map).
self.onmessage = (event: MessageEvent<MapAppMessage>) => {
  const { reply, transfer } = answerGenerate(event.data, () => performance.now());
  self.postMessage(reply, { transfer });
};
