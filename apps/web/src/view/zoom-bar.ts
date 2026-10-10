// The town's −, + and Fit, the same group as the map's and the town view's bars (panels/toolbar.ts), in the view's corner
// as the HUD fills its top. The toolbar's rules load with the map, so this chunk carries the few it needs. The map makes
// the view inert while it covers it, and the last rule hides the bar then, so the page holds one set of zoom buttons.
const CSS = `
.town-zoom { position: absolute; left: 8px; bottom: 8px; z-index: 1; display: flex; padding: 8px; border-radius: var(--ui-r);
  background: var(--ui-bar); }
.town-zoom .btn { padding: 0 12px; border-radius: 0; }
.town-zoom .btn + .btn { margin-left: -1px; }
.town-zoom .btn:first-child { border-radius: var(--ui-r) 0 0 var(--ui-r); }
.town-zoom .btn:last-child { border-radius: 0 var(--ui-r) var(--ui-r) 0; }
.town-zoom .btn:focus-visible { z-index: 1; }
#view[inert] .town-zoom { display: none; }
`;

function button(doc: Document, text: string, label: string, onClick: () => void): HTMLButtonElement {
  const node = doc.createElement('button');
  node.type = 'button';
  node.className = 'btn';
  node.textContent = text;
  if (label) node.setAttribute('aria-label', label);
  node.addEventListener('click', onClick);
  return node;
}

export class ZoomBar {
  readonly root: HTMLElement;

  constructor(doc: Document, zoom: (steps: number) => void, fit: () => void) {
    const style = doc.createElement('style');
    style.textContent = CSS;
    doc.head.append(style);
    this.root = doc.createElement('div');
    this.root.className = 'town-zoom';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Zoom');
    this.root.append(
      button(doc, '\u{2212}', 'Zoom out', () => zoom(-1)),
      button(doc, '+', 'Zoom in', () => zoom(1)),
      button(doc, 'Fit', '', fit),
    );
    // The view's drag captures the pointer on press, which would take the button's click.
    this.root.addEventListener('pointerdown', (event) => event.stopPropagation());
  }
}
