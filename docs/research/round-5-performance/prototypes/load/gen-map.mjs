// Generates a synthetic town map in LDtk 1.5.3 JSON layout (structure + defs copied from the official
// Typical_TopDown_example.ldtk sample), plus a runtime-trimmed JSON and a compact binary of the same map.
import fs from 'node:fs';
const sample = JSON.parse(fs.readFileSync('ldtk/ldtk-repo/app/extraFiles/samples/Typical_TopDown_example.ldtk', 'utf8'));
const W = +process.argv[2] || 256, H = W, G = 16, COLS = 128; const out = process.argv[3] || 'app/src/maps';
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const ig = new Uint8Array(W * H).fill(1); // 1 grass 2 road 3 wall 4 water 5 plaza
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x % 16 < 2 || y % 16 < 2) ig[y * W + x] = 2;
for (let by = 0; by < H; by += 16) for (let bx = 0; bx < W; bx += 16) {
  if (rnd() < 0.08) { for (let y = by + 2; y < by + 16; y++) for (let x = bx + 2; x < bx + 16; x++) ig[y * W + x] = 5; continue; }
  const k = 2 + ((rnd() * 3) | 0);
  for (let b = 0; b < k; b++) { const w = 3 + ((rnd() * 5) | 0), h = 3 + ((rnd() * 4) | 0); const x0 = bx + 3 + ((rnd() * (11 - w)) | 0), y0 = by + 3 + ((rnd() * (11 - h)) | 0);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x < W && y < H) ig[y * W + x] = 3; }
}
for (let y = 0; y < H; y++) { const cx = (W * 0.7 + Math.sin(y / 20) * 8) | 0; for (let x = cx; x < cx + 4; x++) if (x < W) ig[y * W + x] = 4; }
const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : ig[y * W + x]);
const tileObj = (cell, t, f, d) => ({ px: [(cell % W) * G, ((cell / W) | 0) * G], src: [(t % COLS) * G, ((t / COLS) | 0) * G], f, t, d, a: 1 });
const floor = [], walls = [], tops = [], decor = [];
const L = { floor: new Uint16Array(W * H).fill(0xffff), walls: new Uint16Array(W * H).fill(0xffff), tops: new Uint16Array(W * H).fill(0xffff), decor: new Uint16Array(W * H).fill(0xffff) };
for (let c = 0; c < W * H; c++) {
  const v = ig[c], x = c % W, y = (c / W) | 0;
  const t = v * 8 + (rnd() < 0.8 ? 0 : 1 + ((rnd() * 3) | 0)); floor.push(tileObj(c, t, 0, [130 + v, c])); L.floor[c] = t;
  if (v === 3) { const m = (at(x, y - 1) === 3 ? 1 : 0) | (at(x + 1, y) === 3 ? 2 : 0) | (at(x, y + 1) === 3 ? 4 : 0) | (at(x - 1, y) === 3 ? 8 : 0);
    const f = m === 8 ? 1 : 0; walls.push(tileObj(c, 64 + m, f, [156 + (m & 3), c])); L.walls[c] = (64 + m) | (f << 14);
    if (!(m & 1)) { tops.push(tileObj(c, 96 + (m >> 1), 0, [127, c])); L.tops[c] = 96 + (m >> 1); } }
  else if (v === 1 && rnd() < 0.12) { const t2 = 200 + ((rnd() * 12) | 0); decor.push(tileObj(c, t2, rnd() < 0.5 ? 1 : 0, [c])); L.decor[c] = t2 | ((decor[decor.length - 1].f) << 14); }
}
const ents = []; const ENT = ['Home', 'Shop', 'Police', 'Work'];
for (let i = 0; i < Math.round(400 * (W * H) / 65536); i++) { const type = i % 25 === 0 ? 2 : i % 5 === 0 ? 1 : i % 3 === 0 ? 3 : 0; const cx = (rnd() * W) | 0, cy = (rnd() * H) | 0;
  ents.push({ __identifier: ENT[type], __grid: [cx, cy], __pivot: [0, 0], __tags: [], __tile: null, __smartColor: '#B86F50', iid: `e${i.toString(16).padStart(8, '0')}-c640-11ed-8430-8169bab5952b`, width: 16, height: 16, defUid: 60 + type, px: [cx * G, cy * G],
    fieldInstances: [{ __identifier: 'capacity', __type: 'Int', __value: 1 + ((rnd() * 20) | 0), __tile: null, defUid: 90, realEditorValues: [{ id: 'V_Int', params: [3] }] }], __worldX: cx * G, __worldY: cy * G }); }
const tmpl = sample.levels[0];
const li = (id, type, extra) => ({ __identifier: id, __type: type, __cWid: W, __cHei: H, __gridSize: G, __opacity: 1, __pxTotalOffsetX: 0, __pxTotalOffsetY: 0, __tilesetDefUid: type === 'Entities' ? null : 104, __tilesetRelPath: type === 'Entities' ? null : 'atlas2048.png',
  iid: `${id}-0000-11ed-8430-8169bab5952b`, levelId: 0, layerDefUid: 1, pxOffsetX: 0, pxOffsetY: 0, visible: true, optionalRules: [], intGridCsv: [], autoLayerTiles: [], seed: 4242, overrideTilesetUid: null, gridTiles: [], entityInstances: [], ...extra });
const level = { ...tmpl, identifier: 'Town', pxWid: W * G, pxHei: H * G, layerInstances: [
  li('Entities', 'Entities', { entityInstances: ents }), li('Wall_tops', 'AutoLayer', { autoLayerTiles: tops }), li('Collisions', 'IntGrid', { intGridCsv: Array.from(ig), autoLayerTiles: walls }),
  li('Custom_floor', 'Tiles', { gridTiles: decor }), li('Default_floor', 'AutoLayer', { autoLayerTiles: floor })] };
const ldtk = { ...sample, levels: [level], toc: [] };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/town.ldtk`, JSON.stringify(ldtk)); // LDtk "minifyJson" style
fs.writeFileSync(`${out}/town.pretty.ldtk`, JSON.stringify(ldtk, null, '\t'));
// runtime-trimmed JSON: only what the game needs
const trim = { w: W, h: H, grid: G, intGrid: Array.from(ig), layers: [['Default_floor', floor], ['Collisions', walls], ['Wall_tops', tops], ['Custom_floor', decor]].map(([n, a]) => ({ n, t: a.flatMap((o) => [(o.px[1] / G) * W + o.px[0] / G, o.t, o.f]) })),
  entities: ents.map((e) => [ENT.indexOf(e.__identifier), e.__grid[0], e.__grid[1], e.fieldInstances[0].__value]) };
fs.writeFileSync(`${out}/town.trim.json`, JSON.stringify(trim));
// compact binary
const hdr = 16, nb = hdr + W * H + 4 * W * H * 2 + 2 + ents.length * 7; const buf = new ArrayBuffer(nb); const dv = new DataView(buf); let o = 0;
dv.setUint32(o, 0x50414d54, true); o += 4; dv.setUint16(o, 1, true); o += 2; dv.setUint16(o, W, true); o += 2; dv.setUint16(o, H, true); o += 2; dv.setUint8(o++, G); dv.setUint8(o++, 4); o = hdr;
new Uint8Array(buf, o, W * H).set(ig); o += W * H;
for (const k of ['floor', 'walls', 'tops', 'decor']) { new Uint8Array(buf, o, W * H * 2).set(new Uint8Array(L[k].buffer)); o += W * H * 2; }
dv.setUint16(o, ents.length, true); o += 2; for (const e of ents) { dv.setUint8(o++, ENT.indexOf(e.__identifier)); dv.setUint16(o, e.__grid[0], true); o += 2; dv.setUint16(o, e.__grid[1], true); o += 2; dv.setUint16(o, e.fieldInstances[0].__value, true); o += 2; }
fs.writeFileSync(`${out}/town.bin`, new Uint8Array(buf, 0, o));
console.log(JSON.stringify({ W, H, tiles: { floor: floor.length, walls: walls.length, tops: tops.length, decor: decor.length }, entities: ents.length }));
