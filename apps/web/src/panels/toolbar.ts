// The map's and the town view's bars, over the art, built from index.html's tokens. A view narrower than the full bar
// shows its icons alone and folds the less-used actions into More, so the bar keeps to one row.
const CSS = `
#map, #place { container-type: inline-size; }
.ui-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 1; display: flex; align-items: center; gap: 16px;
  padding: 8px; background: var(--ui-bar); white-space: nowrap; }
.ui-seg, .ui-more, .ui-more-items { display: flex; }
.ui-more, .ui-more-items { gap: 8px; }
.ui-seg .btn { padding: 0 12px; border-radius: 0; }
.ui-seg .btn + .btn { margin-left: -1px; }
.ui-seg .btn:first-child { border-radius: var(--ui-r) 0 0 var(--ui-r); }
.ui-seg .btn:last-child { border-radius: 0 var(--ui-r) var(--ui-r) 0; }
.ui-seg .btn:focus-visible { z-index: 1; }
.ui-bar select { min-width: 0; min-height: var(--ui-h); padding: 0 12px; border: 1px solid var(--ui-line);
  border-radius: var(--ui-r); background: var(--ui-raised); color: var(--ui-text); font: inherit; }
.ui-bar select:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 2px; }
.ui-title { flex: 1; min-width: 0; }
.ui-title h2, .ui-title p { margin: 0; overflow: hidden; text-overflow: ellipsis; }
.ui-title h2 { font-size: inherit; }
.ui-title p { color: var(--ui-muted); font-size: var(--ui-small); }
.ui-more { position: relative; }
.ui-more > .btn { display: none; }
.ui-info { position: absolute; left: 8px; bottom: 8px; z-index: 1; display: flex; flex-direction: column; align-items: start;
  gap: 8px; max-width: calc(100% - 16px); }
.ui-panel { display: flex; flex-direction: column; align-items: start; gap: 8px; padding: 8px 12px; border-radius: var(--ui-r);
  background: var(--ui-bar); font-size: var(--ui-small); }
.ui-panel p { margin: 0; }
@container (max-width: 47.5rem) {
  .ui-bar { gap: 8px; }
  .ui-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .ui-bar select { flex: 1; width: 0; }
  .ui-more > .btn { display: inline-flex; }
  .ui-more-items { display: none; position: absolute; top: calc(100% + 8px); right: 0; flex-direction: column;
    padding: 8px; border-radius: var(--ui-r); background: var(--ui-bar); }
  .ui-more > [aria-expanded="true"] + .ui-more-items { display: flex; }
}
@media (prefers-reduced-motion: reduce) { .ui-bar * { transition: none; } }
`;

// Both views call it; the styles go in once.
export function addToolbarStyles(doc: Document): void {
  if (doc.getElementById('ui-toolbar')) return;
  const style = doc.createElement('style');
  style.id = 'ui-toolbar';
  style.textContent = CSS;
  doc.head.append(style);
}

export function group(doc: Document, className: string, ...children: HTMLElement[]): HTMLElement {
  const box = doc.createElement('div');
  box.className = className;
  box.append(...children);
  return box;
}

// The same −, + and Fit on every view.
export function zoomGroup(doc: Document, zoomOut: HTMLElement, zoomIn: HTMLElement, fit: HTMLElement): HTMLElement {
  const box = group(doc, 'ui-seg', zoomOut, zoomIn, fit);
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Zoom');
  return box;
}

// On a narrow view only the icon shows, and the label, hidden from sight, still names the button.
export function iconButton(doc: Document, icon: string, label: string, className: string): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = className;
  const glyph = doc.createElement('span');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = icon;
  const text = doc.createElement('span');
  text.className = 'ui-label';
  text.textContent = label;
  button.append(glyph, text);
  return button;
}

// A disclosure, not an ARIA menu: More shows or hides the actions it holds, which stay plain buttons in tab order.
export class OverflowMenu {
  private readonly toggle: HTMLButtonElement;
  readonly root: HTMLElement;

  constructor(doc: Document, id: string, ...items: HTMLElement[]) {
    this.toggle = doc.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'btn';
    this.toggle.textContent = '\u{22EF}';
    this.toggle.setAttribute('aria-label', 'More');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.setAttribute('aria-controls', id);
    const list = group(doc, 'ui-more-items', ...items);
    list.id = id;
    this.root = group(doc, 'ui-more', this.toggle, list);
    this.toggle.addEventListener('click', this.flip.bind(this));
    this.root.addEventListener('focusout', this.onFocusOut.bind(this));
    this.root.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private isOpen(): boolean {
    return this.toggle.getAttribute('aria-expanded') === 'true';
  }

  private setOpen(open: boolean): void {
    this.toggle.setAttribute('aria-expanded', String(open));
  }

  private flip(): void {
    this.setOpen(!this.isOpen());
  }

  private onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.root.contains(next)) this.setOpen(false);
  }

  // Escape shuts an open menu before it reaches the view, which it would close, and focus goes back to More.
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.isOpen()) return;
    event.stopPropagation();
    this.toggle.focus();
    this.setOpen(false);
  }
}
