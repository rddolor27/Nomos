import '../common/style.css';
import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FRAMES, LEGEND, N, initialEvents, type Ev, type Tile, type Agent } from '../common/data';
class SimUi extends LitElement {
  static properties = { tick: { state: true }, tiles: { state: true }, events: { state: true }, agent: { state: true }, paused: { state: true }, speed: { state: true } };
  declare tick: number; declare tiles: Tile[]; declare events: Ev[]; declare agent: Agent; declare paused: boolean; declare speed: number;
  constructor() { super(); this.tick = 0; this.tiles = FRAMES[0].tiles; this.events = initialEvents(); this.agent = FRAMES[0].agent; this.paused = false; this.speed = 4; }
  createRenderRoot() { return this; }
  render() {
    return html`<div class="app">
      <aside class="panel"><h2>Controls</h2>
        <div class="row"><button @click=${() => (this.paused = !this.paused)}>${this.paused ? 'Play' : 'Pause'}</button><button>Step</button><span class="tick">Day ${this.tick}</span></div>
        <label>Speed <input type="range" min="1" max="16" .value=${String(this.speed)} @input=${(e: Event) => (this.speed = +(e.target as HTMLInputElement).value)}><span>${this.speed}×</span></label>
        <label>Skin <select><option>dots</option><option>blobs</option><option>town</option></select></label>
        ${['Heatmap', 'Hotspots', 'Trails'].map((n) => html`<label><input type="checkbox"> ${n}</label>`)}
      </aside>
      <section class="tiles">${this.tiles.map((t) => html`<div class="tile"><span class="k">${t.k}</span><span class="v">${t.v}</span><span class=${t.up ? 'd up' : 'd down'}>${t.ds}</span></div>`)}</section>
      <section class="legend">${LEGEND.map((l) => html`<div class="lg"><i style="background:${l.color}"></i>${l.label}</div>`)}</section>
      <section class="inspector"><h2>Agent #${this.agent.id}</h2><dl>${this.agent.fields.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl></section>
      <section class="log"><h2>Events</h2><ul>${repeat(this.events, (e) => e.id, (e) => html`<li><time>${e.t}</time><b class=${'k-' + e.kind}>${e.kind}</b><span>${e.text}</span></li>`)}</ul></section>
    </div>`;
  }
}
customElements.define('sim-ui', SimUi);
const el = document.createElement('sim-ui') as SimUi; document.getElementById('app')!.append(el);
function apply(i: number) { const f = FRAMES[i % N]; el.tick = f.tick; el.tiles = f.tiles; el.agent = f.agent; el.events = [f.ev, ...el.events.slice(0, 49)]; }
(window as any).__ui = { apply, flush: () => el.updateComplete };
