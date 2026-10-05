import Phaser from 'phaser';
import { runBench, makeAtlasCanvas, makeMap, charRect, MAP_W, MAP_H, WORLD_W, WORLD_H, VIEW_W, VIEW_H, ZOOM, MODE, OUTFITS, facingOf, walkFrame } from './common.js';
const GPU = MODE !== 'cpu', NOSORT = !!new URLSearchParams(location.search).get('nosort');
runBench('phaser4-' + (GPU ? 'gpulayer' : 'tilemaplayer') + (NOSORT ? '-nosort' : ''), (a) => new Promise(resolve => {
  const canvas = document.getElementById('c');
  const game = new Phaser.Game({ type: Phaser.WEBGL, canvas, width: VIEW_W, height: VIEW_H, pixelArt: true, banner: false, audio: { noAudio: true },
    scene: { create() {
      const atlasC = makeAtlasCanvas(); this.textures.addCanvas('atlas', atlasC); const tex = this.textures.get('atlas');
      const frames = []; for (let k = 0; k < OUTFITS * 12; k++) { const [x, y, w, h] = charRect(k); frames.push(tex.add('c' + k, 0, x, y, w, h)); }
      const emoteF = []; for (let e = 0; e < 8; e++) emoteF.push(tex.add('e' + e, 0, e * 16, 1000, 16, 16));
      const tilesC = document.createElement('canvas'); tilesC.width = 1024; tilesC.height = 256; const tg = tilesC.getContext('2d'); tg.drawImage(atlasC, 0, 0, 1024, 256, 0, 0, 1024, 256); if (!new URLSearchParams(location.search).get('nofix')) tg.clearRect(0, 255, 1, 1); /* TilemapGPULayer samples texel (0,0) (GL orientation) for empty tiles */
      this.textures.addCanvas('tiles', tilesC);
      const m = makeMap(); const rows = ch => { const r = []; for (let y = 0; y < MAP_H; y++) { const row = new Array(MAP_W); for (let x = 0; x < MAP_W; x++) { const v = m[(y * MAP_W + x) * 4 + ch]; row[x] = (ch === 0 || v) ? v : -1; } r.push(row); } return r; };
      const layers = (new URLSearchParams(location.search).get('layers') || '012').split('').map(Number).map(ch => { const tm = this.make.tilemap({ data: rows(ch), tileWidth: 16, tileHeight: 16 }); const ts = tm.addTilesetImage('tiles'); const l = tm.createLayer(0, ts, 0, 0, GPU); l.setDepth(ch === 2 ? 1e7 : ch); return l; });
      const sprites = []; for (let i = 0; i < a.n; i++) sprites.push(this.add.sprite(a.cur[2 * i], a.cur[2 * i + 1], 'atlas', frames[a.outfit[i] * 12]).setOrigin(0.5, 30 / 32));
      const pool = [], who = new Int32Array(a.n); let ne = 0;
      this.cameras.main.setZoom(ZOOM); this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);
      const last = new Uint8Array(a.n);
      const split = { u: [], r: [] };
      setTimeout(() => { game.loop.stop(); resolve({ split,
        extra: 'layers:' + layers.map(l => l.constructor.name || l.type).join(','),
        onTick(a) {
          ne = 0;
          for (let i = 0; i < a.n; i++) { last[i] = facingOf(a, i, last[i]); if (!NOSORT) sprites[i].setDepth(10 + a.cur[2 * i + 1]);
            if (a.emote[i]) { let s = pool[ne]; if (!s) { s = game.scene.scenes[0].add.sprite(0, 0, 'atlas', emoteF[0]).setOrigin(0.5, 46 / 16).setDepth(2e7); pool.push(s); }
              s.setFrame(emoteF[a.emote[i] - 1], false, false); s.visible = true; who[ne++] = i; } }
          for (let k = ne; k < pool.length; k++) pool[k].visible = false;
        },
        frame(al, t) {
          const t0f = performance.now(); const P = a.prev, C = a.cur;
          for (let i = 0; i < a.n; i++) { const s = sprites[i]; s.x = P[2 * i] + (C[2 * i] - P[2 * i]) * al; s.y = P[2 * i + 1] + (C[2 * i + 1] - P[2 * i + 1]) * al;
            const f = frames[a.outfit[i] * 12 + last[i] * 3 + walkFrame(a, i, t)]; if (s.frame !== f) s.setFrame(f, false, false); }
          for (let k = 0; k < ne; k++) { const i = who[k], s = pool[k]; s.x = P[2 * i] + (C[2 * i] - P[2 * i]) * al; s.y = P[2 * i + 1] + (C[2 * i + 1] - P[2 * i + 1]) * al; }
          const tm = performance.now(); game.step(performance.now(), 1000 / 60); const te = performance.now(); split.u.push(tm - t0f); split.r.push(te - tm);
        } }); }, 50);
    } } });
}));
