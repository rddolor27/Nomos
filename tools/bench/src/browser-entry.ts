import type { Tier } from '@nomos/sim-core';
import { SAMPLE_DAYS, sampleTier } from './sample.ts';

// A module worker, as the sim runs in the app. It reports its own isolation, which sets its clock's resolution.
self.onmessage = (event: MessageEvent<Tier>) => {
  const samples = sampleTier(event.data, SAMPLE_DAYS, () => performance.now());
  self.postMessage({ isolated: self.crossOriginIsolated, samples });
};
