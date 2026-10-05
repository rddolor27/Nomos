// Vanilla TS HUD (eager): 20 stat tiles + 50-row event log + legend, updated from sim frames.
const h = (t: string, c = '', x = '') => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };
const LABELS = ['Population', 'Births', 'Deaths', 'Thefts (true)', 'Thefts (rec.)', 'Arrests', 'Trades', 'Avg wealth', 'Gini', 'Unemployment', 'Avg hunger', 'Police', 'Merchants', 'Citizens', 'Homeless', 'Migrants in', 'Migrants out', 'Food stock', 'Tax revenue', 'Clearance'];
export function mountHud(root: HTMLElement) {
  const tiles = h('section', 'tiles'); const vals: Text[] = [];
  for (const l of LABELS) { const d = h('div', 'tile'); const v = document.createTextNode('0'); const s = h('span', 'v'); s.append(v); d.append(h('span', 'k', l), s); tiles.append(d); vals.push(v); }
  const legend = h('section', 'legend'); for (const [l, c] of [['Citizen', '#f7f7f7'], ['Merchant', '#e8b423'], ['Police', '#3b6fd8'], ['Stealing', '#d83b3b']]) { const d = h('div', 'lg'); const i = h('i'); i.style.background = c; d.append(i, l); legend.append(d); }
  const log = h('section', 'log'); const ul = h('ul'); log.append(h('h2', '', 'Events'), ul);
  root.append(tiles, legend, log); let ev = 0;
  return { update(stats: number[], msg?: string) { for (let i = 0; i < vals.length; i++) vals[i].data = String(stats[i] ?? 0);
    if (msg) { const li = h('li', '', `#${ev++} ${msg}`); ul.prepend(li); if (ul.childElementCount > 50) ul.lastElementChild!.remove(); } } };
}
