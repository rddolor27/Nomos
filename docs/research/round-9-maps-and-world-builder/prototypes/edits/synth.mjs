// Synthetic editing sessions for sizing share links. The action mixes are unsourced estimates;
// strokes are random walks, so consecutive brush ops sit 0-2 cells apart.
import { K } from './codec.mjs';

const mix32 = x => {
  x >>>= 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
export const draw = (seed, ...key) => {
  let h = mix32(mix32(seed ^ 0x9e3779b9));
  for (const k of key) h = mix32(h ^ (k >>> 0));
  return h;
};

export const MIXES = {
  mixed: { sculpt: 25, paint: 20, river: 4, townAdd: 5, townMove: 3, townDelete: 1, lock: 3, roadAdd: 3, roadRemove: 1, wonder: 1, hearth: 1, name: 6, pin: 10, tile: 12, prop: 5 },
  terrain: { sculpt: 50, paint: 35, river: 10, townAdd: 1, name: 1, lock: 1, roadAdd: 1, wonder: 1 },
  builder: { townAdd: 15, townMove: 10, townDelete: 3, lock: 8, roadAdd: 15, roadRemove: 4, wonder: 3, hearth: 4, name: 25, sculpt: 6, paint: 7 },
  street: { pin: 35, tile: 40, prop: 20, name: 5 },
};

const ONSETS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'br', 'st', 'th'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ae', 'ei'];
const SITES = ['Ford', 'Port', 'Hill', 'Mere', 'Field'];

export function session(seed, n, { width = 96, height = 64, mix = MIXES.mixed } = {}) {
  const cells = width * height;
  const actions = Object.entries(mix);
  const total = actions.reduce((s, [, w]) => s + w, 0);
  const towns = Array.from({ length: 50 }, (_, i) => draw(seed, 7, i) % cells);
  const ops = [];
  let t = 0, made = 0;
  const r = (m, ...key) => draw(seed, t, ...key) % m;
  const town = salt => (made && r(4, salt) === 0 ? cells + r(made, salt, 1) : towns[r(towns.length, salt, 2)]);
  const place = () => towns[Math.floor(r(10, 30) * r(10, 31) / 10)];
  const name = () => {
    let s = '';
    for (let j = 0, m = 2 + r(3, 40); j < m; j++) s += ONSETS[r(ONSETS.length, 41, j)] + VOWELS[r(VOWELS.length, 42, j)];
    s = s[0].toUpperCase() + s.slice(1);
    return r(4, 43) === 0 ? `${s} ${SITES[r(SITES.length, 44)]}` : s;
  };
  const stroke = (k, value) => {
    let c = r(cells, 1);
    const rad = 1 + r(4, 2);
    for (let j = 0, len = 5 + r(36, 3); j < len && ops.length < n; j++) {
      ops.push({ k, cell: c, r: rad, v: value });
      const x = Math.min(width - 1, Math.max(0, (c % width) + r(5, 4, j) - 2));
      const y = Math.min(height - 1, Math.max(0, Math.floor(c / width) + r(5, 5, j) - 2));
      c = y * width + x;
    }
  };
  while (ops.length < n) {
    t++;
    let roll = r(total, 0), act = actions[0][0];
    for (const [a, w] of actions) { if (roll < w) { act = a; break; } roll -= w; }
    switch (act) {
      case 'sculpt': stroke(K.ELEV, (r(2, 6) ? 1 : -1) * 10 * (1 + r(10, 7))); break;
      case 'paint': stroke(K.BIOME, r(11, 6)); break;
      case 'river': {
        const path = [];
        let d = r(8, 10);
        for (let j = 0, len = 5 + r(36, 11); j < len; j++) { d = (d + r(3, 12, j) + 7) % 8; path.push(d); }
        ops.push({ k: K.RIVER, cell: r(cells, 13), path });
        break;
      }
      case 'townAdd':
        ops.push({ k: K.TOWN_ADD, cell: r(cells, 14), v: 2 + r(3, 15), uid: cells + made++ });
        if (r(10, 16) < 6 && ops.length < n) ops.push({ k: K.NAME, uid: cells + made - 1, text: name() });
        break;
      case 'townMove': ops.push({ k: K.TOWN_MOVE, uid: town(17), cell: r(cells, 18) }); break;
      case 'townDelete': ops.push({ k: K.TOWN_DELETE, uid: town(19) }); break;
      case 'lock': ops.push({ k: K.LOCK, uid: town(20) }); break;
      case 'roadAdd': ops.push({ k: K.ROAD_ADD, uid: town(21), uid2: town(22) }); break;
      case 'roadRemove': ops.push({ k: K.ROAD_REMOVE, uid: town(23), uid2: town(24) }); break;
      case 'wonder': ops.push({ k: K.WONDER, v: r(11, 25), cell: r(cells, 26) }); break;
      case 'hearth': ops.push({ k: K.HEARTH, v: r(8, 27), cell: r(cells, 28) }); break;
      case 'name': ops.push({ k: K.NAME, uid: town(29), text: name() }); break;
      case 'pin': ops.push({ k: K.PLACE_PIN, place: place(), obj: r(60, 32), x: r(48, 33), y: r(28, 34) }); break;
      case 'prop': ops.push({ k: K.PLACE_PROP, place: place(), x: r(48, 35), y: r(28, 36), v: r(21, 37) }); break;
      case 'tile': {
        const p = place(), v = r(8, 38);
        let x = r(48, 39), y = r(28, 40);
        for (let j = 0, len = 5 + r(26, 41); j < len && ops.length < n; j++) {
          ops.push({ k: K.PLACE_PAINT, place: p, x, y, v });
          x = Math.min(47, Math.max(0, x + r(3, 42, j) - 1));
          y = Math.min(27, Math.max(0, y + r(3, 43, j) - 1));
        }
        break;
      }
    }
  }
  return ops.slice(0, n);
}
