import { personName } from '@nomos/sim-culture';
import type { WorkerMessage } from '@nomos/sim-protocol';
import { formatCount } from './hud.ts';
import { shopName } from './shop-name.ts';

type Inspected = Extract<WorkerMessage, { type: 'inspected' }>;

const NO_BLOB = 'No blob here';
const CENTS_PER_UNIT = 100;

// Whole cents split by integer maths, so every balance below 2^53 prints exactly; digits are grouped as the HUD groups
// them, since a first Intl formatter costs about 100 ms on a phone.
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const units = Math.floor(abs / CENTS_PER_UNIT);
  const rest = abs - units * CENTS_PER_UNIT;
  return `${sign}${formatCount(units)}.${String(rest).padStart(2, '0')}`;
}

function job(employer: number, wage: number): string {
  return employer < 0 ? 'out of work' : `works at ${shopName(employer)} for ${formatCents(wage)} a month`;
}

export function inspectorLine(reply: Inspected): string {
  if (reply.agent < 0) return NO_BLOB;
  return `${personName(reply.nameKey)}, ${job(reply.employer, reply.wage)}, wallet ${formatCents(reply.cents)}`;
}

// The only module that imports sim-culture, and it loads on demand, so names and their word table never reach the
// first load; a blob's name, work, pay and wallet show nowhere else (R8, content rule 5, M2.2b ruling 4). Made once, at
// the first inspect.
export function mountInspector(parent: HTMLElement, worker: Worker): void {
  const line = parent.ownerDocument.createElement('p');
  line.id = 'inspector';
  line.setAttribute('aria-live', 'polite');
  parent.append(line);
  worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type !== 'inspected') return;
    line.textContent = inspectorLine(data);
  });
}
