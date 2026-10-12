import { BlobPortrait } from '@nomos/render-gl/place';
import { townAtlas } from '../view/atlas.ts';
import './blob-modal.css';

// A label and its value.
export type CardRow = readonly [label: string, value: string];

// One need and how full it is, in whole percents of its range.
export interface Need {
  name: string;
  percent: number;
}

// What the modal shows of one blob, already worded: panels/inspector.ts, the one module that may name a blob, makes it.
export interface BlobCard {
  name: string;
  // The blob's look, 0 to 95, which its portrait is drawn from.
  look: number;
  // Under the name, in the order shown: what the blob is doing and how it feels.
  now: readonly CardRow[];
  // The needs, drawn as bars in the sim's order, and the personality in one line. A town that wanders has neither, so it
  // gives no needs and an empty personality.
  needs: readonly Need[];
  personality: string;
  // What the blob has, in the order shown.
  facts: readonly CardRow[];
  // Rows kept behind the More button.
  more: readonly CardRow[];
}

const LOOK_NOTE = 'Looks are random at birth and change nothing in the sim.';
// The needs and the personality say what they are, so their labels are for screen readers.
const NEEDS_LABEL = 'Needs';
const PERSONALITY_LABEL = 'Personality';
const MORE_LABEL = 'More';
const CLOSE_LABEL = 'Close';
// CSS pixels to an art pixel in the portrait, which then takes the nearest whole number of device pixels.
const PORTRAIT_CSS_SCALE = 3;
const NO_LOOK = -1;

function create<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

// Rewriting the same text would only make the page lay it out again.
function write(node: Element, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

// Labelled values, each label and value in a node kept from one fill to the next, so a refreshed card writes only what changed.
class RowList {
  readonly root: HTMLDListElement;

  constructor(doc: Document, className: string) {
    this.root = doc.createElement('dl');
    this.root.className = className;
  }

  fill(rows: readonly CardRow[]): void {
    const nodes = this.root.children;
    if (nodes.length !== 2 * rows.length) {
      const doc = this.root.ownerDocument;
      this.root.replaceChildren(...rows.flatMap(([label, value]) => [create(doc, 'dt', label), create(doc, 'dd', value)]));
      return;
    }
    rows.forEach(([label, value], row) => {
      write(nodes[2 * row], label);
      write(nodes[2 * row + 1], value);
    });
  }
}

// One need as its name, a bar and its percent. The percent says all the bar does, so the bar is for the eye alone.
class NeedBar {
  readonly root: HTMLElement;
  private readonly name: HTMLElement;
  private readonly level: HTMLElement;
  private readonly percent: HTMLElement;

  constructor(doc: Document) {
    this.name = create(doc, 'span', '', 'need-name');
    this.level = create(doc, 'span', '', 'need-level');
    this.percent = doc.createElement('span');
    const track = create(doc, 'span', '', 'need-track');
    track.setAttribute('aria-hidden', 'true');
    track.append(this.level);
    this.root = create(doc, 'div', '', 'need');
    // The space only separates the words where the text is read as one run.
    this.root.append(this.name, ' ', track, this.percent);
  }

  set({ name, percent }: Need): void {
    const text = `${percent}%`;
    write(this.name, name);
    write(this.percent, text);
    if (this.level.style.width !== text) this.level.style.width = text;
  }
}

// A blob's inner life: its needs side by side in one row, and under them its personality in one line.
class Life {
  readonly root: HTMLDListElement;
  private readonly bars: NeedBar[];
  private readonly needs: HTMLElement;
  private readonly personality: HTMLElement;

  constructor(doc: Document) {
    this.bars = [];
    this.needs = create(doc, 'dd', '', 'needs');
    this.personality = doc.createElement('dd');
    this.root = doc.createElement('dl');
    this.root.className = 'life';
    this.root.hidden = true;
    this.root.append(create(doc, 'dt', NEEDS_LABEL), this.needs, create(doc, 'dt', PERSONALITY_LABEL), this.personality);
  }

  fill(needs: readonly Need[], personality: string): void {
    this.root.hidden = needs.length === 0 && personality === '';
    while (this.bars.length < needs.length) {
      const bar = new NeedBar(this.root.ownerDocument);
      this.bars.push(bar);
      this.needs.append(bar.root);
    }
    while (this.bars.length > needs.length) this.bars.pop()?.root.remove();
    needs.forEach((need, at) => this.bars[at].set(need));
    write(this.personality, personality);
  }
}

// The blob's card, as a dialog in the town view: it leaves the town drawn, and a click on another blob fills it again. It
// is not a true modal, so the camera, the speed keys, Tab and the other controls stay live; the focus moves into it when it
// opens, and Escape closes it from any focus and gives the view the focus back. Made once per page, at the first inspect.
// The head, with the picture, name, what the blob is doing and how it feels, stays where it is while the rest scrolls.
export class BlobModal {
  private readonly view: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly title: HTMLElement;
  private readonly picture: HTMLCanvasElement;
  private readonly now: RowList;
  private readonly life: Life;
  private readonly facts: RowList;
  private readonly more: RowList;
  private readonly disclosure: HTMLDetailsElement;
  private readonly scroller: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  // Null until the atlas arrives, and the look shown, for the portrait that waited for it.
  private portrait: BlobPortrait | null;
  private look: number;
  // The look the picture was last drawn for, so a card filled again for the same blob leaves it alone.
  private drawn: number;

  constructor(view: HTMLElement) {
    const doc = view.ownerDocument;
    this.view = view;
    this.portrait = null;
    this.look = NO_LOOK;
    this.drawn = NO_LOOK;
    this.title = create(doc, 'h2');
    this.title.id = 'blob-name';
    this.closeButton = create(doc, 'button', '×', 'btn btn-quiet');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', CLOSE_LABEL);
    // The Look row words the same, so the picture is for the eye alone, and it stays hidden until it is drawn.
    this.picture = doc.createElement('canvas');
    this.picture.setAttribute('aria-hidden', 'true');
    this.picture.hidden = true;
    this.now = new RowList(doc, 'now');
    this.life = new Life(doc);
    this.facts = new RowList(doc, 'facts');
    this.more = new RowList(doc, 'more-rows');
    this.disclosure = create(doc, 'details', '', 'more');
    this.scroller = create(doc, 'div', '', 'body');
    this.dialog = doc.createElement('dialog');
    this.dialog.id = 'blob-modal';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.dialog.append(this.head(doc), this.body(doc));
    view.append(this.dialog);
    this.bind();
    this.loadPortrait();
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  // Opens the dialog and moves the focus into it, or, when it is open already, only fills it again, changing what differs.
  show(card: BlobCard): void {
    write(this.title, card.name);
    this.now.fill(card.now);
    this.life.fill(card.needs, card.personality);
    this.facts.fill(card.facts);
    this.more.fill(card.more);
    this.look = card.look;
    this.paint();
    if (this.dialog.open) return;
    this.dialog.show();
    this.closeButton.focus();
  }

  // Closes the dialog where it stands, as when the town changes under it, and leaves the focus alone.
  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  // Closes it for the user, who gives the view the focus back.
  hide(): void {
    if (!this.dialog.open) return;
    this.close();
    this.view.focus();
  }

  // The Close button comes right after the name, so the focus it takes on opening is followed by the card's rows.
  private head(doc: Document): HTMLElement {
    const head = create(doc, 'div', '', 'head');
    head.append(this.picture, this.title, this.closeButton, this.now.root);
    return head;
  }

  private body(doc: Document): HTMLElement {
    this.disclosure.append(create(doc, 'summary', MORE_LABEL), this.more.root, create(doc, 'p', LOOK_NOTE));
    this.scroller.append(this.life.root, this.facts.root, this.disclosure);
    return this.scroller;
  }

  private bind(): void {
    this.closeButton.addEventListener('click', () => this.hide());
    // What More opens lies at the body's foot, out of sight when the card stands at its height cap, so the body scrolls to it.
    this.disclosure.addEventListener('toggle', () => {
      if (this.disclosure.open) this.scroller.scrollTop = this.scroller.scrollHeight;
    });
    // The view's drag captures the pointer on press, which would take the button's click, and its wheel zooms the town, which
    // would take the wheel from a card that scrolls.
    this.dialog.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.dialog.addEventListener('wheel', (event) => event.stopPropagation());
    // Escape closes the card from any focus. A handler that took the key first, as the map's does, has prevented it, so the
    // map closes and the card stays.
    this.view.ownerDocument.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !this.dialog.open) return;
      event.preventDefault();
      this.hide();
    });
  }

  // The Town skin's atlas page, which the page fetches once. A card shown before it arrives gets its picture the moment it
  // does, and a page that cannot load it keeps the card without one.
  private loadPortrait(): void {
    townAtlas()
      .then((page) => {
        this.portrait = new BlobPortrait(this.picture, page);
        this.paint();
      })
      .catch((error: unknown) => console.error('The blob portrait did not load, so the card shows no picture:', error));
  }

  private paint(): void {
    if (!this.portrait || this.look === NO_LOOK || this.look === this.drawn) return;
    this.portrait.draw(this.look, PORTRAIT_CSS_SCALE, devicePixelRatio);
    this.drawn = this.look;
    this.picture.hidden = false;
  }
}
