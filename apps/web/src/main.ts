import { startApp } from './app.ts';
import { takeBoot } from './boot.ts';
import { backendFrom, seedFrom } from './query.ts';

performance.mark('main:eval');

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

const search = location.search;
// startApp has already said in #status what failed; the console keeps the detail.
startApp(takeBoot(), document, { seed: seedFrom(search, randomSeed), tier: 'phone', backend: backendFrom(search) }).catch(
  (error: unknown) => console.error(error),
);
