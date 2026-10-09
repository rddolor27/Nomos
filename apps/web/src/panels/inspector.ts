import { personName } from '@nomos/sim-culture';
import type { WorkerMessage } from '@nomos/sim-protocol';
import { formatCents } from './cents.ts';

const NO_BLOB = 'No blob here';

// The only module that imports sim-culture, and it loads on demand, so names and their word table never reach the
// first load; a blob's name and wallet show nowhere else (R8, content rule 5). Made once, at the first inspect.
export function mountInspector(parent: HTMLElement, worker: Worker): void {
  const line = parent.ownerDocument.createElement('p');
  line.id = 'inspector';
  line.setAttribute('aria-live', 'polite');
  parent.append(line);
  worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type !== 'inspected') return;
    line.textContent = data.agent < 0 ? NO_BLOB : `${personName(data.nameKey)}, wallet ${formatCents(data.cents)}`;
  });
}
