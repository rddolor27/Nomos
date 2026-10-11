import { personName } from '@nomos/sim-culture';
import { ACTION_IDLE, ACTION_NAMES, ACTION_WALK, type WorkerMessage } from '@nomos/sim-protocol';
import { LOOK_EYES, LOOK_HUES, LOOK_PATTERNS } from '@nomos/sim-protocol/place';
import { BlobModal, type BlobCard } from './blob-modal.ts';
import { formatCount } from './hud.ts';
import { shopName } from './shop-name.ts';

type Inspected = Extract<WorkerMessage, { type: 'inspected' }>;

const NO_BLOB = 'No blob here';
const CENTS_PER_UNIT = 100;
// What a blob is doing, by its action code. Trips to work and to the shops add their codes to the sim, and their words here;
// until then a code with no words shows the sim's name for it.
const DOING = new Map<number, string>([
  [ACTION_IDLE, 'Idle'],
  [ACTION_WALK, 'Walking'],
]);

// Whole cents split by integer maths, so every balance below 2^53 prints exactly; digits are grouped as the HUD groups
// them, since a first Intl formatter costs about 100 ms on a phone.
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const units = Math.floor(abs / CENTS_PER_UNIT);
  const rest = abs - units * CENTS_PER_UNIT;
  return `${sign}${formatCount(units)}.${String(rest).padStart(2, '0')}`;
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// A look is hue look % 6, eyes floor(look / 6) % 4 and pattern floor(look / 24), named as the sprite tools name them
// (place-layout.ts).
function lookName(look: number): string {
  const hue = LOOK_HUES[look % LOOK_HUES.length];
  const eyes = LOOK_EYES[Math.floor(look / LOOK_HUES.length) % LOOK_EYES.length];
  const pattern = LOOK_PATTERNS[Math.floor(look / (LOOK_HUES.length * LOOK_EYES.length))];
  return `${sentence(hue)} body, ${eyes} eyes, ${pattern} pattern`;
}

function livesWith(members: readonly number[]): string {
  return members.length === 0 ? 'No one' : members.map((nameKey) => personName(nameKey)).join(', ');
}

export function blobCard(reply: Inspected): BlobCard {
  const { employer } = reply;
  return {
    name: personName(reply.nameKey),
    look: reply.look,
    rows: [
      ['Job', employer < 0 ? 'Out of work' : `Works at ${shopName(reply.employerGood, employer)}`],
      ['Pay', employer < 0 ? 'None' : `${formatCents(reply.wage)} a month`],
      ['Wallet', formatCents(reply.cents)],
      ['Home', reply.home < 0 ? 'No home' : `House ${reply.home + 1}`],
      ['Lives with', livesWith(reply.members)],
      ['Doing', DOING.get(reply.action) ?? sentence(ACTION_NAMES[reply.action])],
      ['Look', lookName(reply.look)],
    ],
  };
}

// The only module that imports sim-culture, and it loads on demand, so names and their word table never reach the
// first load; a blob's name, work, pay and wallet show nowhere else (R8, content rule 5, M2.2b ruling 4). Made once, at
// the first inspect. A blob found opens its card; a click that finds none says so in a short line, and leaves the card.
export function mountInspector(hud: HTMLElement, view: HTMLElement, worker: Worker): void {
  const line = hud.ownerDocument.createElement('p');
  line.id = 'inspector';
  line.setAttribute('aria-live', 'polite');
  hud.append(line);
  const modal = new BlobModal(view);
  worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type !== 'inspected') return;
    const found = data.agent >= 0;
    line.textContent = found ? '' : NO_BLOB;
    if (found) modal.show(blobCard(data));
  });
}
