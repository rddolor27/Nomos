import { SPEEDS, type Speed } from '@nomos/sim-protocol';

// The same joined buttons as the zoom bar's, scoped to this group, since the HUD mounts before the view's bar loads.
const CSS = `
#speed { display: flex; }
#speed .btn { padding: 0 12px; border-radius: 0; }
#speed .btn + .btn { margin-left: -1px; }
#speed .btn:first-child { border-radius: var(--ui-r) 0 0 var(--ui-r); }
#speed .btn:last-child { border-radius: 0 var(--ui-r) var(--ui-r) 0; }
#speed .btn:focus-visible { z-index: 1; }
`;

const KEYS = new Map<string, Speed>(SPEEDS.map((speed, index): [string, Speed] => [String(index + 1), speed]));

// Keys 1 to 3 pick the speeds in order. With Ctrl, Cmd or Alt a digit switches the browser's tabs, which stay the browser's.
export function speedForKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): Speed | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  return KEYS.get(event.key);
}

// The speed buttons, one pressed at a time. A click picks a speed at once; show() follows a change made elsewhere, such as
// a key in the town view.
export class SpeedBar {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private shown: Speed | null;

  constructor(doc: Document, choose: (speed: Speed) => void) {
    const style = doc.createElement('style');
    style.textContent = CSS;
    doc.head.append(style);
    this.root = doc.createElement('div');
    this.root.id = 'speed';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Speed');
    this.buttons = SPEEDS.map((speed) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = `${speed}\u{00D7}`;
      button.addEventListener('click', () => {
        choose(speed);
        this.show(speed);
      });
      return button;
    });
    this.root.append(...this.buttons);
    this.shown = null;
  }

  // Touches the DOM only when the speed changes.
  show(speed: Speed): void {
    if (speed === this.shown) return;
    this.shown = speed;
    SPEEDS.forEach((value, index) => this.buttons[index].setAttribute('aria-pressed', String(value === speed)));
  }

  disable(): void {
    for (const button of this.buttons) button.disabled = true;
  }
}
