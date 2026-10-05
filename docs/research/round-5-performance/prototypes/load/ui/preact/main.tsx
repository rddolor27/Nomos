import '../common/style.css';
import { render } from 'preact';
import { signal, batch } from '@preact/signals';
import { FRAMES, LEGEND, N, initialEvents } from '../common/data';
const tick = signal(0), tiles = signal(FRAMES[0].tiles), events = signal(initialEvents()), agent = signal(FRAMES[0].agent), paused = signal(false), speed = signal(4);
function Controls() {
  return <aside class="panel"><h2>Controls</h2>
    <div class="row"><button onClick={() => (paused.value = !paused.value)}>{paused.value ? 'Play' : 'Pause'}</button><button>Step</button><span class="tick">Day {tick}</span></div>
    <label>Speed <input type="range" min="1" max="16" value={speed.value} onInput={(e) => (speed.value = +(e.target as HTMLInputElement).value)} /><span>{speed}×</span></label>
    <label>Skin <select><option>dots</option><option>blobs</option><option>town</option></select></label>
    {['Heatmap', 'Hotspots', 'Trails'].map((n) => <label key={n}><input type="checkbox" /> {n}</label>)}
  </aside>;
}
const Tiles = () => <section class="tiles">{tiles.value.map((t, i) => <div class="tile" key={i}><span class="k">{t.k}</span><span class="v">{t.v}</span><span class={t.up ? 'd up' : 'd down'}>{t.ds}</span></div>)}</section>;
const Legend = () => <section class="legend">{LEGEND.map((l) => <div class="lg" key={l.label}><i style={{ background: l.color }} />{l.label}</div>)}</section>;
const Inspector = () => <section class="inspector"><h2>Agent #{agent.value.id}</h2><dl>{agent.value.fields.map(([k, v]) => [<dt>{k}</dt>, <dd>{v}</dd>])}</dl></section>;
const Log = () => <section class="log"><h2>Events</h2><ul>{events.value.map((e) => <li key={e.id}><time>{e.t}</time><b class={'k-' + e.kind}>{e.kind}</b><span>{e.text}</span></li>)}</ul></section>;
const App = () => <div class="app"><Controls /><Tiles /><Legend /><Inspector /><Log /></div>;
render(<App />, document.getElementById('app')!);
function apply(i: number) { const f = FRAMES[i % N]; batch(() => { tick.value = f.tick; tiles.value = f.tiles; agent.value = f.agent; events.value = [f.ev, ...events.value.slice(0, 49)]; }); }
(window as any).__ui = { apply, flush: () => Promise.resolve() };
