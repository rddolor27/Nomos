import '../common/style.css';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, memo } from 'react';
import { FRAMES, LEGEND, N, initialEvents, type Ev, type Tile, type Agent } from '../common/data';
interface Model { tick: number; tiles: Tile[]; events: Ev[]; agent: Agent }
let setModel: (f: (m: Model) => Model) => void = () => {};
function Controls({ tick }: { tick: number }) {
  const [paused, setPaused] = useState(false); const [speed, setSpeed] = useState(4);
  return <aside className="panel"><h2>Controls</h2>
    <div className="row"><button onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button><button>Step</button><span className="tick">Day {tick}</span></div>
    <label>Speed <input type="range" min="1" max="16" value={speed} onChange={(e) => setSpeed(+e.target.value)} /><span>{speed}×</span></label>
    <label>Skin <select><option>dots</option><option>blobs</option><option>town</option></select></label>
    {['Heatmap', 'Hotspots', 'Trails'].map((n) => <label key={n}><input type="checkbox" /> {n}</label>)}
  </aside>;
}
const Tiles = ({ tiles }: { tiles: Tile[] }) => <section className="tiles">{tiles.map((t, i) => <div className="tile" key={i}><span className="k">{t.k}</span><span className="v">{t.v}</span><span className={t.up ? 'd up' : 'd down'}>{t.ds}</span></div>)}</section>;
const Legend = memo(() => <section className="legend">{LEGEND.map((l) => <div className="lg" key={l.label}><i style={{ background: l.color }} />{l.label}</div>)}</section>);
const Inspector = ({ agent }: { agent: Agent }) => <section className="inspector"><h2>Agent #{agent.id}</h2><dl>{agent.fields.map(([k, v]) => [<dt key={'k' + k}>{k}</dt>, <dd key={'v' + k}>{v}</dd>])}</dl></section>;
const Log = ({ events }: { events: Ev[] }) => <section className="log"><h2>Events</h2><ul>{events.map((e) => <li key={e.id}><time>{e.t}</time><b className={'k-' + e.kind}>{e.kind}</b><span>{e.text}</span></li>)}</ul></section>;
function App() {
  const [m, set] = useState<Model>(() => ({ tick: 0, tiles: FRAMES[0].tiles, events: initialEvents(), agent: FRAMES[0].agent }));
  setModel = set;
  return <div className="app"><Controls tick={m.tick} /><Tiles tiles={m.tiles} /><Legend /><Inspector agent={m.agent} /><Log events={m.events} /></div>;
}
createRoot(document.getElementById('app')!).render(<App />);
function apply(i: number) { const f = FRAMES[i % N]; flushSync(() => setModel((m) => ({ tick: f.tick, tiles: f.tiles, agent: f.agent, events: [f.ev, ...m.events.slice(0, 49)] }))); }
(window as any).__ui = { apply, flush: () => {} };
