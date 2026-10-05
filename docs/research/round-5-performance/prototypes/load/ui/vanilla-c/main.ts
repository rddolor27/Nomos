import '../common/style.css';
import './contain.css';
import { FRAMES, LEGEND, N, initialEvents, type Ev } from '../common/data';
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const root = document.getElementById('app')!; const app = h('div', 'app'); root.append(app);
let paused = false, speed = 4;
const panel = h('aside', 'panel'); panel.append(h('h2', '', 'Controls'));
const row = h('div', 'row'); const play = h('button', '', 'Pause'); play.onclick = () => { paused = !paused; play.textContent = paused ? 'Play' : 'Pause'; };
const step = h('button', '', 'Step'); const tickEl = h('span', 'tick', 'Day '); const tickT = document.createTextNode('0'); tickEl.append(tickT); row.append(play, step, tickEl); panel.append(row);
const sl = h('label', '', 'Speed '); const rng = h('input'); rng.type = 'range'; rng.min = '1'; rng.max = '16'; rng.value = String(speed);
const spd = h('span', '', speed + '×'); rng.oninput = () => { speed = +rng.value; spd.textContent = speed + '×'; }; sl.append(rng, spd); panel.append(sl);
const skl = h('label', '', 'Skin '); const sel = h('select'); for (const s of ['dots', 'blobs', 'town']) sel.append(new Option(s, s)); skl.append(sel); panel.append(skl);
for (const n of ['Heatmap', 'Hotspots', 'Trails']) { const l = h('label'); const c = h('input'); c.type = 'checkbox'; l.append(c, ' ' + n); panel.append(l); }
const tiles = h('section', 'tiles'); const tileRefs: { v: Text; ds: Text; d: HTMLElement }[] = [];
for (const t of FRAMES[0].tiles) { const d = h('div', 'tile'); const v = h('span', 'v', t.v); const dd = h('span', t.up ? 'd up' : 'd down', t.ds); d.append(h('span', 'k', t.k), v, dd); tiles.append(d); tileRefs.push({ v: v.firstChild as Text, ds: dd.firstChild as Text, d: dd }); }
const legend = h('section', 'legend'); for (const l of LEGEND) { const d = h('div', 'lg'); const i = h('i'); i.style.background = l.color; d.append(i, l.label); legend.append(d); }
const insp = h('section', 'inspector'); const title = h('h2', '', 'Agent #'); const titleT = document.createTextNode(String(FRAMES[0].agent.id)); title.append(titleT); const dl = h('dl'); const dds: Text[] = [];
for (const [k, v] of FRAMES[0].agent.fields) { const dd = h('dd', '', v); dl.append(h('dt', '', k), dd); dds.push(dd.firstChild as Text); } insp.append(title, dl);
const log = h('section', 'log'); log.append(h('h2', '', 'Events')); const ul = h('ul'); log.append(ul);
const row_ = (e: Ev) => { const li = h('li'); li.append(h('time', '', e.t), h('b', 'k-' + e.kind, e.kind), h('span', '', e.text)); return li; };
for (const e of initialEvents()) ul.append(row_(e));
app.append(panel, tiles, legend, insp, log);
function apply(i: number) {
  const f = FRAMES[i % N]; tickT.data = String(f.tick);
  for (let j = 0; j < 20; j++) { const t = f.tiles[j], r = tileRefs[j]; r.v.data = t.v; r.ds.data = t.ds; const c = t.up ? 'd up' : 'd down'; if (r.d.className !== c) r.d.className = c; }
  titleT.data = String(f.agent.id); for (let j = 0; j < dds.length; j++) dds[j].data = f.agent.fields[j][1];
  ul.prepend(row_(f.ev)); if (ul.childElementCount > 50) ul.lastElementChild!.remove();
}
(window as any).__ui = { apply, flush: () => {} };
