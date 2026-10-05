import { runBench, makeAtlasCanvas, makeMap, MAP_W, MAP_H, VIEW_W, VIEW_H, ZOOM, camCenter, OUTFITS } from './common.js';
import { createTownRenderer, packWords } from '../src/townRenderer.js';
runBench('custom-webgl2', async (a) => {
  const canvas = document.getElementById('c'); canvas.width = VIEW_W; canvas.height = VIEW_H;
  const atlas = await createImageBitmap(makeAtlasCanvas()), map = makeMap();
  const tileAvg = new Uint8Array(MAP_W * MAP_H * 4);
  for (let i = 0; i < MAP_W * MAP_H; i++) { const id = map[i * 4 + 2] || map[i * 4]; tileAvg[i * 4] = (id * 53) & 255; tileAvg[i * 4 + 1] = 120 + (id * 17) % 100; tileAvg[i * 4 + 2] = (id * 91) & 255; tileAvg[i * 4 + 3] = 255; }
  const palette = new Uint8Array(OUTFITS * 4); for (let k = 0; k < OUTFITS; k++) palette.set([(k * 97) & 255, (k * 45 + 80) & 255, (k * 151) & 255, 255], k * 4);
  const r = createTownRenderer(canvas, { atlas, atlasCols: 64, charOrigin: [0, 512], charCols: 32, emoteOrigin: [0, 1000], map, mapW: MAP_W, mapH: MAP_H, tileAvg, palette, maxAgents: a.n });
  const words = new Uint32Array(a.n), last = new Uint8Array(a.n); const [cx, cy] = camCenter();
  return {
    onTick(a) { packWords(a.prev, a.cur, a.outfit, a.emote, last, words, a.n); r.pushSnapshot(a.cur, words, a.n); },
    frame(alpha, t) { r.draw(cx, cy, ZOOM, alpha, t, [1, 1, 1]); },
  };
});
