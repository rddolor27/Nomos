import { personName } from '@nomos/sim-culture';
import {
  ACTION_IDLE,
  ACTION_NAMES,
  ACTION_WALK,
  GOOD_NAMES,
  type AppMessage,
  type Purchase,
  type WorkerMessage,
} from '@nomos/sim-protocol';
import { LOOK_EYES, LOOK_HUES, LOOK_PATTERNS } from '@nomos/sim-protocol/place';
import type { App } from '../app/app.ts';
import { BlobModal, type BlobCard } from './blob-modal.ts';
import { formatCount } from './hud.ts';
import { shopName } from './shop-name.ts';

type Inspected = Extract<WorkerMessage, { type: 'inspected' }>;

const NO_BLOB = 'No blob here';
const BLOB_GONE = 'That blob is gone';
const CENTS_PER_UNIT = 100;
// An open card asks for its blob again about once a second, so what it is doing changes as the town runs (owner, 11 October
// 2026).
const REFRESH_MS = 1000;
const NO_ROW = -1;
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

// What the economy day sold the blob today, food first, each as the good and the shop it came from. The day sells in its first
// 20 ticks, so a card opened in them may hold only some of it.
function boughtToday(bought: readonly Purchase[]): string {
  if (bought.length === 0) return 'Nothing yet';
  return sentence(bought.map(({ good, firm }) => `${GOOD_NAMES[good].toLowerCase()} at ${shopName(good, firm)}`).join(', '));
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
      ['Bought today', boughtToday(reply.bought)],
      ['Look', lookName(reply.look)],
    ],
  };
}

// The only module that imports sim-culture, and it loads on demand, so names and their word table never reach the
// first load; a blob's name, work, pay and wallet show nowhere else (R8, content rule 5, M2.2b ruling 4). Made once, at
// the first inspect. A blob found opens its card; a click that finds none says so in a short line, and leaves the card.
// An open card asks the worker for its blob again by its row, and updates only from an answer for that row.
export class Inspector {
  private readonly app: App;
  private readonly line: HTMLElement;
  private readonly modal: BlobModal;
  // Whether each request not yet answered is a refresh, oldest first, since the worker answers in the order it was asked.
  private readonly asked: boolean[];
  // The row of the blob the card shows.
  private shown: number;

  constructor(hud: HTMLElement, view: HTMLElement, app: App) {
    this.app = app;
    this.line = hud.ownerDocument.createElement('p');
    this.line.id = 'inspector';
    this.line.setAttribute('aria-live', 'polite');
    hud.append(this.line);
    this.modal = new BlobModal(view);
    this.asked = [];
    this.shown = NO_ROW;
    app.worker.addEventListener('message', this.onMessage.bind(this));
    setInterval(this.refresh.bind(this), REFRESH_MS);
  }

  // The blob nearest a world point.
  at(x: number, y: number): void {
    this.send({ type: 'inspect', x, y }, false);
  }

  private send(message: AppMessage, refresh: boolean): void {
    this.asked.push(refresh);
    this.app.worker.postMessage(message);
  }

  // From the moment open is sent a query would be answered for the new town's rows, so none goes until it has landed, and
  // none queues behind another that is waiting.
  private refresh(): void {
    if (!this.modal.isOpen || this.app.opening || this.asked.length > 0) return;
    this.send({ type: 'inspectAgent', agent: this.shown }, true);
  }

  private onMessage({ data }: MessageEvent<WorkerMessage>): void {
    // Whatever town opened, the card's row means another blob now, so the card goes.
    if (data.type === 'opened') this.modal.close();
    else if (data.type === 'inspected') this.answered(data, this.asked.shift() === true);
  }

  private answered(reply: Inspected, refresh: boolean): void {
    if (refresh) this.refreshed(reply);
    else this.clicked(reply);
  }

  private clicked(reply: Inspected): void {
    const found = reply.agent >= 0;
    this.line.textContent = found ? '' : NO_BLOB;
    if (!found) return;
    this.shown = reply.agent;
    this.modal.show(blobCard(reply));
  }

  // Only the card's own row updates it, and a row the town no longer holds closes it.
  private refreshed(reply: Inspected): void {
    if (!this.modal.isOpen) return;
    if (reply.agent === this.shown) {
      this.modal.show(blobCard(reply));
    } else if (reply.agent < 0) {
      this.modal.close();
      this.line.textContent = BLOB_GONE;
    }
  }
}

export function mountInspector(hud: HTMLElement, view: HTMLElement, app: App): Inspector {
  return new Inspector(hud, view, app);
}
