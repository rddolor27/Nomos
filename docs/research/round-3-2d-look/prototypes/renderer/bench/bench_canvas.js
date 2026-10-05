import { runBench, makeAtlasCanvas, makeMap, charRect, tileRect, MAP_W, MAP_H, VIEW_W, VIEW_H, ZOOM, camCenter, OUTFITS, facingOf, walkFrame } from './common.js';
runBench('canvas2d', async (a) => {
  const canvas = document.getElementById('c'); canvas.width = VIEW_W; canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d', { alpha: false }); ctx.imageSmoothingEnabled = false;
  const atlas = makeAtlasCanvas(), map = makeMap(), CH = 32, NC = MAP_W / CH, S = CH * 16;
  const bake = (layers) => { const out = []; for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const i = ((cy * CH + y) * MAP_W + cx * CH + x) * 4;
      for (const L of layers) { const id = map[i + L]; if (id) { const [sx, sy] = tileRect(id); g.drawImage(atlas, sx, sy, 16, 16, x * 16, y * 16, 16, 16); } } }
    out.push(c); } return out; };
  const ground = bake([0, 1]), roofs = bake([2]);
  const last = new Uint8Array(a.n), vis = new Int32Array(a.n), [cx, cy] = camCenter(), vw = VIEW_W / ZOOM, vh = VIEW_H / ZOOM;
  const drawChunks = (arr) => { for (let y = 0; y < NC; y++) for (let x = 0; x < NC; x++) { const X = x * S, Y = y * S;
    if (X + S < cx || Y + S < cy || X > cx + vw || Y > cy + vh) continue;
    ctx.drawImage(arr[y * NC + x], Math.round((X - cx) * ZOOM), Math.round((Y - cy) * ZOOM), S * ZOOM, S * ZOOM); } };
  return {
    onTick(a) { for (let i = 0; i < a.n; i++) last[i] = facingOf(a, i, last[i]); },
    frame(al, t) {
      const P = a.prev, C = a.cur; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); drawChunks(ground);
      let nv = 0; for (let i = 0; i < a.n; i++) { const x = C[2 * i], y = C[2 * i + 1]; if (x > cx - 16 && x < cx + vw + 16 && y > cy - 16 && y < cy + vh + 48) vis[nv++] = i; }
      const v = vis.subarray(0, nv).sort((i, j) => C[2 * i + 1] - C[2 * j + 1]);
      for (let k = 0; k < nv; k++) { const i = v[k], x = P[2 * i] + (C[2 * i] - P[2 * i]) * al, y = P[2 * i + 1] + (C[2 * i + 1] - P[2 * i + 1]) * al;
        const [sx, sy] = charRect(a.outfit[i] * 12 + last[i] * 3 + walkFrame(a, i, t));
        ctx.drawImage(atlas, sx, sy, 16, 32, Math.round((Math.floor(x) - 8 - cx) * ZOOM), Math.round((Math.floor(y) - 30 - cy) * ZOOM), 16 * ZOOM, 32 * ZOOM); }
      drawChunks(roofs);
      for (let k = 0; k < nv; k++) { const i = v[k]; if (!a.emote[i]) continue; const x = C[2 * i], y = C[2 * i + 1];
        ctx.drawImage(atlas, (a.emote[i] - 1) * 16, 1000, 16, 16, Math.round((Math.floor(x) - 8 - cx) * ZOOM), Math.round((Math.floor(y) - 46 - cy) * ZOOM), 16 * ZOOM, 16 * ZOOM); }
    },
    extra: 'visible-only drawImage',
  };
});
