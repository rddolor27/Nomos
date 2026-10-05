const M = (n: string) => performance.mark(n);
M('main:eval');
import * as Comlink from 'comlink';
import { createDots } from './gl/dots';
import { mountHud } from './ui/hud';
import type { SimApi } from './sim/worker';
import { loadControls, loadChart, loadTownSkin, loadCountry, loadInspector, loadWebGpu } from '@loaders';
import mapBinUrl from './maps/town.bin?url';
import mapJsonUrl from './maps/town.ldtk?url';
import atlasPngUrl from './atlas/atlas2048.png?url';
import atlasWebpUrl from './atlas/atlas2048.webp?url';
const q = new URLSearchParams(location.search);
const n = +(q.get('n') ?? 10000), skin = q.get('skin') ?? 'dots', mapFmt = q.get('map') ?? 'bin', atlasFmt = q.get('atlas') ?? 'png';
const B = (window as any).__boot ?? {};
const worker: Worker = B.worker ?? new Worker(new URL('./sim/worker.ts', import.meta.url), { type: 'module', name: 'sim' });
if (!B.worker) M('worker:new');
const mapP: Promise<ArrayBuffer> = B.mapP ?? fetch(mapFmt === 'bin' ? mapBinUrl : mapJsonUrl).then((r) => r.arrayBuffer());
const sim = Comlink.wrap<SimApi>(worker);
const canvas = document.getElementById('c') as HTMLCanvasElement; canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio;
const dots = createDots(canvas); M('gl:ready');
const townP = skin === 'town' ? loadTownSkin().then((m) => m.loadTown(dots, atlasFmt === 'webp' ? atlasWebpUrl : atlasPngUrl, M)) : null;
const mapBuf = await mapP; M('map:fetched');
const init = await sim.init(Comlink.transfer(mapBuf, [mapBuf]), mapFmt, n, +(q.get('wslow') ?? 1)); M('sim:ready');
const wo = init.wOrigin - performance.timeOrigin; // worker -> main timeline offset
performance.mark('w:eval', { startTime: init.tEval + wo }); performance.mark('w:parse0', { startTime: init.tParse0 + wo }); performance.mark('w:parse1', { startTime: init.tParse1 + wo }); performance.mark('w:spawned', { startTime: init.tSpawn1 + wo });
dots.setGrid(init.grid, init.W, init.H);
let snap = await sim.snapshot(); M('snap:received');
let renderer: { upload(p: Float32Array, k: Uint8Array): void; draw(): void } = dots;
if (townP) { const town = await townP; town.setMap(init.tiles, init.W); renderer = town; }
renderer.upload(snap.p, snap.k);
const longTasks: number[] = []; const loaf: any[] = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true }); new PerformanceObserver((l) => l.getEntries().forEach((e: any) => loaf.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration), render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0), scripts: e.scripts.map((s: any) => ({ inv: s.invoker, src: (s.sourceURL || '').split('/').pop(), dur: Math.round(s.duration), comp: Math.round(s.executionStart - s.startTime) })) }))).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
requestAnimationFrame(() => { renderer.draw(); M('frame:first'); requestAnimationFrame(() => { M('frame:presented'); afterFirstFrame(); }); });
async function afterFirstFrame() {
  const hudRoot = document.getElementById('hud')!; const hud = mountHud(hudRoot); M('hud:mounted');
  const state = { paused: false, speed: 4, skin, heatmap: false };
  const [{ mountControls }, { mountChart }] = await Promise.all([loadControls(), loadChart()]); M('lazy:loaded');
  mountControls(state, (s) => { if (s === 'town') loadTownSkin(); }); M('controls:mounted');
  const chart = mountChart(document.getElementById('card')!); M('chart:mounted');
  let t = 0; const frameTimes: number[] = []; const stepTimes: number[] = [];
  await sim.start(Comlink.proxy((s: { p: Float32Array; k: Uint8Array; stepMs: number }) => { snap = s; stepTimes.push(s.stepMs); }), 30);
  const loop = () => { const t0 = performance.now(); renderer.upload(snap.p, snap.k); renderer.draw(); frameTimes.push(performance.now() - t0); if (++t % 10 === 0) { hud.update([n, t, 0, t >> 3, t >> 4]); chart.push(t, t >> 3, t >> 4); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  canvas.addEventListener('click', async () => { const m = await loadInspector(); m.mountInspector(hudRoot).show(await sim.agent(0)); });
  (window as any).__lazy = { loadCountry, loadWebGpu, loadInspector, loadTownSkin, dots, sim };
  M('app:interactive');
  const marks = Object.fromEntries(performance.getEntriesByType('mark').map((m) => [m.name, +m.startTime.toFixed(1)]));
  const res = performance.getEntriesByType('resource').map((r: any) => ({ name: r.name.split('/').pop(), type: r.initiatorType, start: +r.startTime.toFixed(1), resStart: +r.responseStart.toFixed(1), end: +r.responseEnd.toFixed(1), transfer: r.transferSize, body: r.encodedBodySize, decoded: r.decodedBodySize }));
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  (window as any).__startup = { marks, res, nav: { responseEnd: nav.responseEnd, domInteractive: nav.domInteractive, transfer: nav.transferSize }, longTasks, loaf, frameTimes, stepTimes, n, skin, mapFmt, atlasFmt };
}
