<script lang="ts">
  import { ui } from './store.svelte';
  import { LEGEND } from '../common/data';
</script>
<div class="app">
  <aside class="panel"><h2>Controls</h2>
    <div class="row"><button onclick={() => (ui.paused = !ui.paused)}>{ui.paused ? 'Play' : 'Pause'}</button><button>Step</button><span class="tick">Day {ui.tick}</span></div>
    <label>Speed <input type="range" min="1" max="16" bind:value={ui.speed} /><span>{ui.speed}×</span></label>
    <label>Skin <select><option>dots</option><option>blobs</option><option>town</option></select></label>
    {#each ['Heatmap', 'Hotspots', 'Trails'] as n}<label><input type="checkbox" /> {n}</label>{/each}
  </aside>
  <section class="tiles">{#each ui.tiles as t}<div class="tile"><span class="k">{t.k}</span><span class="v">{t.v}</span><span class={t.up ? 'd up' : 'd down'}>{t.ds}</span></div>{/each}</section>
  <section class="legend">{#each LEGEND as l}<div class="lg"><i style="background:{l.color}"></i>{l.label}</div>{/each}</section>
  <section class="inspector"><h2>Agent #{ui.agent.id}</h2><dl>{#each ui.agent.fields as f}<dt>{f[0]}</dt><dd>{f[1]}</dd>{/each}</dl></section>
  <section class="log"><h2>Events</h2><ul>{#each ui.events as e (e.id)}<li><time>{e.t}</time><b class={'k-' + e.kind}>{e.kind}</b><span>{e.text}</span></li>{/each}</ul></section>
</div>
