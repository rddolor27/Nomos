import { WebGLRenderer, Container, Sprite, Texture, Rectangle, ParticleContainer, Particle, TextureStyle } from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';
import { runBench, makeAtlasCanvas, makeMap, charRect, tileRect, MAP_W, MAP_H, VIEW_W, VIEW_H, ZOOM, MODE, camCenter, OUTFITS, facingOf, walkFrame } from './common.js';
const PART = MODE === 'particles', NOSORT = !!new URLSearchParams(location.search).get('nosort');
runBench('pixi-' + (PART ? 'particles' : 'sprites') + (NOSORT ? '-nosort' : ''), async (a) => {
  TextureStyle.defaultOptions.scaleMode = 'nearest';
  const canvas = document.getElementById('c'); const renderer = new WebGLRenderer();
  await renderer.init({ canvas, width: VIEW_W, height: VIEW_H, antialias: false, roundPixels: true, resolution: 1, background: '#000000', preference: 'webgl' });
  const base = Texture.from(makeAtlasCanvas()), src = base.source;
  const sub = r => new Texture({ source: src, frame: new Rectangle(...r) });
  const frames = []; for (let k = 0; k < OUTFITS * 12; k++) frames.push(sub(charRect(k)));
  const emoteTex = []; for (let e = 0; e < 8; e++) emoteTex.push(sub([e * 16, 1000, 16, 16]));
  const tcache = new Map(), tt = id => { let t = tcache.get(id); if (!t) { t = sub(tileRect(id)); tcache.set(id, t); } return t; };
  const stage = new Container(), world = new Container(); stage.addChild(world);
  // @pixi/tilemap uses 16-bit indices by default (<= 16,384 quads per Tilemap): one 256x256 CompositeTilemap renders blank,
  // so the map is chunked into 32x32-tile CompositeTilemaps (also enables culling).
  const map = makeMap(), ground = new Container(), roofs = new Container(), CH = 32;
  for (let cy = 0; cy < MAP_H / CH; cy++) for (let cx = 0; cx < MAP_W / CH; cx++) {
    const g = new CompositeTilemap(), r = new CompositeTilemap(); ground.addChild(g); roofs.addChild(r);
    for (let y = cy * CH; y < cy * CH + CH; y++) for (let x = cx * CH; x < cx * CH + CH; x++) { const i = (y * MAP_W + x) * 4;
      g.tile(tt(map[i]), x * 16, y * 16); if (map[i + 1]) g.tile(tt(map[i + 1]), x * 16, y * 16); if (map[i + 2]) r.tile(tt(map[i + 2]), x * 16, y * 16); } }
  if (new URLSearchParams(location.search).get('onemap')) { ground.removeChildren(); const g = new CompositeTilemap(); ground.addChild(g);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { const i = (y * MAP_W + x) * 4; g.tile(tt(map[i]), x * 16, y * 16); } }
  const people = PART ? new ParticleContainer({ texture: base, dynamicProperties: { position: true, uvs: true } }) : new Container();
  if (!PART && !NOSORT) people.sortableChildren = true;
  const objs = [];
  for (let i = 0; i < a.n; i++) {
    if (PART) { const p = new Particle({ texture: frames[a.outfit[i] * 12], x: a.cur[2 * i], y: a.cur[2 * i + 1], anchorX: 0.5, anchorY: 30 / 32 }); people.addParticle(p); objs.push(p); }
    else { const s = new Sprite(frames[a.outfit[i] * 12]); s.anchor.set(0.5, 30 / 32); s.position.set(a.cur[2 * i], a.cur[2 * i + 1]); people.addChild(s); objs.push(s); }
  }
  const emotes = new Container(), pool = [], who = new Int32Array(a.n); let ne = 0;
  world.addChild(ground, people, roofs, emotes);
  const last = new Uint8Array(a.n), [cx, cy] = camCenter();
  world.scale.set(ZOOM); world.position.set(-cx * ZOOM, -cy * ZOOM);
  const split = { u: [], r: [] };
  return {
    split,
    onTick(a) {
      ne = 0;
      for (let i = 0; i < a.n; i++) {
        last[i] = facingOf(a, i, last[i]);
        if (!PART && !NOSORT) objs[i].zIndex = a.cur[2 * i + 1];
        if (a.emote[i]) { let s = pool[ne]; if (!s) { s = new Sprite(emoteTex[0]); s.anchor.set(0.5, 46 / 16); pool.push(s); emotes.addChild(s); }
          s.texture = emoteTex[a.emote[i] - 1]; s.visible = true; who[ne++] = i; }
      }
      for (let k = ne; k < pool.length; k++) pool[k].visible = false;
    },
    frame(al, t) {
      const t0f = performance.now(); const P = a.prev, C = a.cur;
      for (let i = 0; i < a.n; i++) {
        const o = objs[i], x = P[2 * i] + (C[2 * i] - P[2 * i]) * al, y = P[2 * i + 1] + (C[2 * i + 1] - P[2 * i + 1]) * al;
        o.x = x; o.y = y; const tx = frames[a.outfit[i] * 12 + last[i] * 3 + walkFrame(a, i, t)]; if (o.texture !== tx) o.texture = tx;
      }
      for (let k = 0; k < ne; k++) { const i = who[k], s = pool[k]; s.x = P[2 * i] + (C[2 * i] - P[2 * i]) * al; s.y = P[2 * i + 1] + (C[2 * i + 1] - P[2 * i + 1]) * al; }
      const tm = performance.now(); renderer.render(stage); const te = performance.now(); split.u.push(tm - t0f); split.r.push(te - tm);
    },
  };
});
