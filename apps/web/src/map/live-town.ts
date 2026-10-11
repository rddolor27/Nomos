import { parseMap, type AppMessage, type MapV1, type WorkerMessage } from '@nomos/sim-protocol';
import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { App } from '../app/app.ts';

// Highcourt is place 0 of every map, and the town the page starts in (M2.2c Ruling 1).
export const HOME_PLACE = 0;
const HOME_NAME = 'Highcourt';

// A town to open: what the map worker laid out and wrote for it. The ground is its .nmap bytes, which go to the sim worker.
export interface TownEntry {
  place: number;
  name: string;
  layout: PlaceLayout;
  ground: ArrayBuffer;
}

// The page's own elements the live town writes to and moves the focus to.
export interface TownParts {
  // The HUD's Map control, which the way back to Highcourt sits beside.
  mapButton: HTMLElement;
  // The HUD's alert line.
  status: HTMLElement;
  // The town's view.
  view: HTMLElement;
}

type OpenedMessage = Extract<WorkerMessage, { type: 'opened' }>;

// A town asked for, its ground parsed for the renderer before the bytes leave, and the worker's answer once it is in.
interface Asked {
  readonly entry: TownEntry;
  readonly map: MapV1;
  opened: OpenedMessage | null;
}

// The HUD's way back to Highcourt and the name of the town away from it, made when the first town other than Highcourt
// opens, right after the Map button, so a phone's scrolling row shows it without a scroll.
class TownBar {
  private readonly view: HTMLElement;
  private readonly name: HTMLElement;
  private readonly home: HTMLButtonElement;

  constructor(parts: TownParts, onHome: () => void) {
    const doc = parts.view.ownerDocument;
    this.view = parts.view;
    this.name = doc.createElement('span');
    this.name.id = 'hud-town';
    this.name.setAttribute('aria-live', 'polite');
    this.home = doc.createElement('button');
    this.home.type = 'button';
    this.home.className = 'btn';
    this.home.textContent = `Back to ${HOME_NAME}`;
    this.home.addEventListener('click', onHome);
    parts.mapButton.after(this.home, this.name);
  }

  // Highcourt needs neither, so the row is as the first screen has it.
  show(name: string, away: boolean): void {
    this.name.textContent = name;
    // Hiding the button while it has focus would drop the focus to the page.
    if (!away && this.home.ownerDocument.activeElement === this.home) this.view.focus();
    this.home.hidden = !away;
    this.name.hidden = !away;
  }
}

// The town drawn and run now, and the way to change it (M2.2c): entering a settlement sends the sim worker an open message
// and, once it answers and the new town's first snapshot is in, hands the app the new ground and layout to show, so no
// frame draws one town's blobs on another's ground. Highcourt until a switch.
export class LiveTown {
  private readonly app: App;
  private readonly parts: TownParts;
  private readonly goHome: () => void;
  private bar: TownBar | null;
  private current: number;
  private asked: Asked | null;
  // The last text said, so a line that something else wrote stays.
  private said: string;

  // goHome asks the map for Highcourt, since only it holds the places.
  constructor(app: App, parts: TownParts, goHome: () => void) {
    this.app = app;
    this.parts = parts;
    this.goHome = goHome;
    this.bar = null;
    this.current = HOME_PLACE;
    this.asked = null;
    this.said = '';
    app.worker.addEventListener('message', this.onMessage.bind(this));
  }

  // The settlement now live, as the map numbers them.
  get place(): number {
    return this.current;
  }

  // A switch is under way, so another waits for it.
  get busy(): boolean {
    return this.asked !== null;
  }

  // The status line is the HUD's alert, which also tells of a stopped simulation, so it writes only over its own words.
  say(text: string): void {
    const { status } = this.parts;
    const shown = status.textContent;
    if (shown === text || (shown !== '' && shown !== this.said)) return;
    status.textContent = text;
    this.said = text;
  }

  open(entry: TownEntry): void {
    const { app } = this;
    this.asked = { entry, map: parseMap(entry.ground), opened: null };
    app.opening = true;
    this.say(`Opening ${entry.name}…`);
    const message: AppMessage = { type: 'open', place: entry.place, map: entry.ground };
    app.worker.postMessage(message, [entry.ground]);
  }

  private home(): void {
    if (this.asked === null) this.goHome();
  }

  private onMessage({ data }: MessageEvent<WorkerMessage>): void {
    const { asked } = this;
    if (asked === null) return;
    if (data.type === 'opened') {
      this.answered(asked, data);
      return;
    }
    // The town's first snapshot follows opened, and every snapshot before it is of the town left.
    const { opened } = asked;
    if (data.type === 'snapshot' && opened !== null && data.tick >= opened.tick) this.arrive(asked, opened);
  }

  // A different place than the one asked for means the sim refused it and the town stays.
  private answered(asked: Asked, opened: OpenedMessage): void {
    if (opened.place === asked.entry.place) {
      asked.opened = opened;
      return;
    }
    this.asked = null;
    this.app.opening = false;
    this.say(`${asked.entry.name} could not be opened.`);
  }

  private arrive(asked: Asked, opened: OpenedMessage): void {
    const { app } = this;
    const { entry } = asked;
    this.asked = null;
    this.current = entry.place;
    app.opening = false;
    app.agents = opened.agents;
    this.say('');
    this.bar ??= new TownBar(this.parts, this.home.bind(this));
    this.bar.show(entry.name, entry.place !== HOME_PLACE);
    app.showTown(asked.map, entry.layout, entry.name);
  }
}
