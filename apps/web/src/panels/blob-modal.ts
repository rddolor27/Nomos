import { BlobPortrait } from '@nomos/render-gl/place';
import { townAtlas } from '../view/atlas.ts';
import './blob-modal.css';

// What the modal shows of one blob, already worded: panels/inspector.ts, the one module that may name a blob, makes it.
export interface BlobCard {
  name: string;
  // The blob's look, 0 to 95, which its portrait is drawn from.
  look: number;
  // Each row is a label and its value, in the order shown.
  rows: readonly (readonly [string, string])[];
}

const LOOK_NOTE = 'Looks are random at birth and change nothing in the sim.';
// CSS pixels to an art pixel in the portrait, which then takes the nearest whole number of device pixels.
const PORTRAIT_CSS_SCALE = 5;
const NO_LOOK = -1;

function create<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, text: string): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  node.textContent = text;
  return node;
}

// The blob's card, as a dialog in the town view: it leaves the town drawn, and a click on another blob fills it again. It
// is not a true modal, so the camera, the speed keys and the other controls stay live; Tab stays on its one control, as a
// modal's focus does, and Escape closes it and gives the view the focus back. Made once per page, at the first inspect.
export class BlobModal {
  private readonly view: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly title: HTMLElement;
  private readonly picture: HTMLCanvasElement;
  private readonly list: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  // Null until the atlas arrives, and the look shown, for the portrait that waited for it.
  private portrait: BlobPortrait | null;
  private look: number;

  constructor(view: HTMLElement) {
    const doc = view.ownerDocument;
    this.view = view;
    this.portrait = null;
    this.look = NO_LOOK;
    this.title = create(doc, 'h2', '');
    this.title.id = 'blob-name';
    this.closeButton = create(doc, 'button', 'Close');
    this.closeButton.type = 'button';
    this.closeButton.className = 'btn btn-quiet';
    // The Look row words the same, so the picture is for the eye alone, and it stays hidden until it is drawn.
    this.picture = doc.createElement('canvas');
    this.picture.setAttribute('aria-hidden', 'true');
    this.picture.hidden = true;
    this.list = doc.createElement('dl');
    this.dialog = doc.createElement('dialog');
    this.dialog.id = 'blob-modal';
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.dialog.append(this.title, this.closeButton, this.picture, this.list, create(doc, 'p', LOOK_NOTE));
    view.append(this.dialog);
    this.bind();
    this.loadPortrait();
  }

  // Opens the dialog and moves the focus into it, or, when it is open already, only fills it again.
  show(card: BlobCard): void {
    const doc = this.view.ownerDocument;
    this.title.textContent = card.name;
    this.list.replaceChildren(...card.rows.flatMap(([label, value]) => [create(doc, 'dt', label), create(doc, 'dd', value)]));
    this.look = card.look;
    this.paint();
    if (this.dialog.open) return;
    this.dialog.show();
    this.closeButton.focus();
  }

  hide(): void {
    if (!this.dialog.open) return;
    this.dialog.close();
    this.view.focus();
  }

  private bind(): void {
    this.closeButton.addEventListener('click', () => this.hide());
    // The view's drag captures the pointer on press, which would take the button's click.
    this.dialog.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') event.preventDefault();
    });
    // The dialog sits in the view, so its keys bubble there, and so does Escape from a press that left the focus on the view.
    this.view.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.dialog.open) return;
      event.preventDefault();
      this.hide();
    });
  }

  // The Town skin's atlas page, which the page fetches once. A card shown before it arrives is drawn as it does; a page that
  // cannot load it keeps the card without its picture.
  private loadPortrait(): void {
    townAtlas()
      .then((page) => {
        this.portrait = new BlobPortrait(this.picture, page);
        this.paint();
      })
      .catch((error: unknown) => console.error('The blob portrait did not load, so the card shows no picture:', error));
  }

  private paint(): void {
    if (!this.portrait || this.look === NO_LOOK) return;
    this.portrait.draw(this.look, PORTRAIT_CSS_SCALE, devicePixelRatio);
    this.picture.hidden = false;
  }
}
