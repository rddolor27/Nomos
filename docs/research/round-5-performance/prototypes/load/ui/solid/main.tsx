import '../common/style.css';
import { render } from 'solid-js/web';
import { createSignal, For, Index, batch } from 'solid-js';
import { FRAMES, LEGEND, N, initialEvents } from '../common/data';
const [tick, setTick] = createSignal(0), [tiles, setTiles] = createSignal(FRAMES[0].tiles), [events, setEvents] = createSignal(initialEvents()),
  [agent, setAgent] = createSignal(FRAMES[0].agent), [paused, setPaused] = createSignal(false), [speed, setSpeed] = createSignal(4);
const App = () => <div class="app">
  <aside class="panel"><h2>Controls</h2>
    <div class="row"><button onClick={() => setPaused(!paused())}>{paused() ? 'Play' : 'Pause'}</button><button>Step</button><span class="tick">Day {tick()}</span></div>
    <label>Speed <input type="range" min="1" max="16" value={speed()} onInput={(e) => setSpeed(+e.currentTarget.value)} /><span>{speed()}×</span></label>
    <label>Skin <select><option>dots</option><option>blobs</option><option>town</option></select></label>
    <For each={['Heatmap', 'Hotspots', 'Trails']}>{(n) => <label><input type="checkbox" /> {n}</label>}</For>
  </aside>
  <section class="tiles"><Index each={tiles()}>{(t) => <div class="tile"><span class="k">{t().k}</span><span class="v">{t().v}</span><span class={t().up ? 'd up' : 'd down'}>{t().ds}</span></div>}</Index></section>
  <section class="legend"><For each={LEGEND}>{(l) => <div class="lg"><i style={{ background: l.color }} />{l.label}</div>}</For></section>
  <section class="inspector"><h2>Agent #{agent().id}</h2><dl><Index each={agent().fields}>{(f) => <><dt>{f()[0]}</dt><dd>{f()[1]}</dd></>}</Index></dl></section>
  <section class="log"><h2>Events</h2><ul><For each={events()}>{(e) => <li><time>{e.t}</time><b class={'k-' + e.kind}>{e.kind}</b><span>{e.text}</span></li>}</For></ul></section>
</div>;
render(() => <App />, document.getElementById('app')!);
function apply(i: number) { const f = FRAMES[i % N]; batch(() => { setTick(f.tick); setTiles(f.tiles); setAgent(f.agent); setEvents([f.ev, ...events().slice(0, 49)]); }); }
(window as any).__ui = { apply, flush: () => {} };
