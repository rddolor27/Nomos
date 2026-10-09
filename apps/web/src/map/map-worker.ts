import type { PlaceRequest } from '@nomos/sim-protocol/place';
import type { MapAppMessage } from '@nomos/sim-protocol/world-map';
import type { PlaceContext } from '@nomos/worldgen';
import { answerGenerate, answerPlace } from './generate.ts';

// M8.3 starts this with new Worker(new URL('./map-worker.ts', import.meta.url), { type: 'module', name: 'map' }), so
// Vite builds it as map-worker-*.js, apart from every first-load chunk (interfaces.md, The world map).
let contexts: PlaceContext[] = [];
const now = (): number => performance.now();
// The place builder's chunk imports this one for the code they share, and WebKit then runs this module a second time
// (a probe in Playwright's WebKit 27.2, 9 October 2026). Only the first run listens, so the last world stays its own.
const scope = self as unknown as { mapWorkerListening?: boolean };

function onMessage(event: MessageEvent<MapAppMessage | PlaceRequest>): void {
  const msg = event.data;
  if (msg.type === 'place') {
    // answerPlace never throws: a request it cannot answer comes back as a place-error for that place.
    void answerPlace(msg, contexts, now).then(({ reply, transfer }) => self.postMessage(reply, { transfer }));
    return;
  }
  const answer = answerGenerate(msg, now);
  contexts = answer.contexts;
  self.postMessage(answer.reply, { transfer: answer.transfer });
}

if (!scope.mapWorkerListening) {
  scope.mapWorkerListening = true;
  self.onmessage = onMessage;
}
