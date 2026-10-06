// Port of tools/worldgen terrain.py (stage 1) and the grid.py helpers it uses. Every // and %
// on a value that can go negative goes through floorDiv or mod, which match Python.
import { below, draw, fbm, floorDiv, mix, value } from './port.mjs';

const SHAPE = 1;
const ELEVATION = 2;
const RIDGES = 3;

export const TEMPLATES = ['continent', 'peninsula', 'coast', 'archipelago', 'twin-isles'];
const LAND_PERMILLE = {
  continent: [440, 540], peninsula: [420, 560], coast: [450, 600], archipelago: [400, 460], 'twin-isles': [400, 500],
};
const ONE = 1 << 14;
const PLATEAU = floorDiv(ONE * 2, 5);
const RAMP = ONE / 4;
const STRAIT = ONE;
const RELIEF = 5;
const SCALE = 520;
const GRAIN_RAW = floorDiv(6 * ONE, SCALE);
const TOP = 1000;
const MIN_ISLAND = 10;
const MIN_POND = 4;
const BEARINGS = [[16, 0], [15, 6], [11, 11], [6, 15], [0, 16], [-6, 15], [-11, 11], [-15, 6],
  [-16, 0], [-15, -6], [-11, -11], [-6, -15], [0, -16], [6, -15], [11, -11], [15, -6]];
const JOINTS = 3;
const [PICK, LAND, CENTRE, RADIUS, LOBE, SIDE, ISLAND] = [0, 1, 2, 3, 4, 5, 6];
const [CHAINS, CENTRE_AT, BEARING, LENGTH, TURN, WIDTH, LIFT] = [0x100, 0x101, 0x102, 0x103, 0x104, 0x105, 0x106];
const WIGGLE = 0x108;
const GRAIN = 0x109;

const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIAG = [[1, -1], [1, 1], [-1, 1], [-1, -1]];

export const mod = (a, n) => ((a % n) + n) % n;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

export function isqrt(n) {
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

const neighbourCache = new Map();
export function neighbours(width, height, diagonal = true) {
  const id = `${width}x${height}${diagonal}`;
  if (!neighbourCache.has(id)) {
    const steps = diagonal ? ORTHO.concat(DIAG) : ORTHO;
    const out = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const list = [];
        for (const [dx, dy] of steps) {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) list.push((y + dy) * width + x + dx);
        }
        out.push(list);
      }
    }
    neighbourCache.set(id, out);
  }
  return neighbourCache.get(id);
}

export function parts(nbrs, member) {
  const label = new Array(nbrs.length).fill(-1);
  const sizes = [];
  for (let start = 0; start < nbrs.length; start++) {
    if (!member[start] || label[start] >= 0) continue;
    label[start] = sizes.length;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      for (const m of nbrs[queue[head]]) {
        if (member[m] && label[m] < 0) {
          label[m] = sizes.length;
          queue.push(m);
        }
      }
    }
    sizes.push(queue.length);
  }
  return [label, sizes];
}

function blob(width, height, cx, cy, rx, ry) {
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out.push(ONE - floorDiv((x - cx) * (x - cx) * ONE, rx * rx) - floorDiv((y - cy) * (y - cy) * ONE, ry * ry));
    }
  }
  return out;
}

function continent(seed, width, height) {
  const k = (n, ...key) => below(n, seed, SHAPE, ...key);
  const cx = floorDiv(width, 2) + k(floorDiv(width, 5) + 1, CENTRE, 0) - floorDiv(width, 10);
  const cy = floorDiv(height, 2) + k(floorDiv(height, 5) + 1, CENTRE, 1) - floorDiv(height, 10);
  const rx = floorDiv(width * (30 + k(8, RADIUS, 0)), 100);
  const ry = floorDiv(height * (30 + k(8, RADIUS, 1)), 100);
  const around = (j, reach, size) => {
    const [bx, by] = BEARINGS[k(16, LOBE, j)];
    return blob(width, height, cx + floorDiv(bx * rx * reach, 1600), cy + floorDiv(by * ry * reach, 1600),
      Math.max(2, floorDiv(rx * size, 100)), Math.max(2, floorDiv(ry * size, 100)));
  };
  let out = blob(width, height, cx, cy, rx, ry);
  for (const j of [0, 1]) {
    const lobe = around(j, 55 + k(30, LOBE, j, 0), 40 + k(25, LOBE, j, 1));
    out = out.map((a, i) => Math.max(a, lobe[i]));
  }
  const bay = around(2, 95 + k(20, LOBE, 2, 0), 22 + k(18, LOBE, 2, 1));
  return out.map((a, i) => a - 2 * Math.max(0, bay[i]));
}

function peninsula(seed, width, height) {
  const k = (n, ...key) => below(n, seed, SHAPE, ...key);
  const root = k(4, SIDE);
  const [along, across] = root === 0 || root === 2 ? [height, width] : [width, height];
  const length = floorDiv(along * (68 + k(18, RADIUS, 0)), 100);
  const base = floorDiv(across * (28 + k(10, RADIUS, 1)), 100);
  const tip = Math.max(3, floorDiv(base * (30 + k(20, RADIUS, 2)), 100));
  const mid = floorDiv(across, 2) + k(floorDiv(across, 4) + 1, CENTRE, 0) - floorDiv(across, 8);
  const slant = k(floorDiv(across, 3) + 1, CENTRE, 1) - floorDiv(across, 6);
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [a, c] = [[y, x], [width - 1 - x, y], [height - 1 - y, x], [x, y]][root];
      const t = Math.min(a, length);
      const half = base - floorDiv((base - tip) * t, length);
      const off = c - mid - floorDiv(slant * t, length);
      const over = Math.max(0, a - length);
      out.push(ONE - floorDiv(off * off * ONE, half * half) - floorDiv(over * over * ONE, tip * tip));
    }
  }
  return out;
}

function coast(seed, width, height) {
  const mode = below(3, seed, SHAPE, SIDE, 0);
  const first = below(4, seed, SHAPE, SIDE, 1);
  const seas = mode === 0 ? [first] : [first, (first + 1 + (mode % 2)) % 4];
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let f = 3 * ONE;
      for (const s of seas) {
        const inland = [y, width - 1 - x, height - 1 - y, x][s];
        const span = s === 0 || s === 2 ? height : width;
        f = Math.min(f, floorDiv((inland * 2 - span) * ONE, span));
      }
      out.push(f);
    }
  }
  return out;
}

function islands(width, height, spots) {
  const first = new Array(width * height).fill(-4 * ONE);
  const second = first.slice();
  for (const [cx, cy, rx, ry] of spots) {
    blob(width, height, cx, cy, rx, ry).forEach((f, i) => {
      if (f > first[i]) {
        second[i] = first[i];
        first[i] = f;
      } else if (f > second[i]) {
        second[i] = f;
      }
    });
  }
  return first.map((a, i) => a - Math.max(0, STRAIT - (a - second[i])));
}

function archipelago(seed, width, height, land) {
  const k = (n, ...key) => below(n, seed, SHAPE, ...key);
  const count = 3 + k(4, ISLAND);
  const area = floorDiv(floorDiv(width * height * land * 5, 4000), count);
  const spots = [];
  for (let j = 0; j < count; j++) {
    const r = floorDiv(isqrt(floorDiv(area * 113, 355)) * (85 + k(31, RADIUS, j)), 100);
    const rx = Math.max(3, floorDiv(r * (85 + k(31, LOBE, j)), 100));
    const ry = Math.max(3, Math.min(floorDiv(height, 2) - 3, floorDiv(r * r, rx)));
    let best = null;
    let bestGap = null;
    for (let t = 0; t < 16; t++) {
      const x = rx + 2 + k(Math.max(1, width - 2 * rx - 4), ISLAND, j, t, 0);
      const y = ry + 2 + k(Math.max(1, height - 2 * ry - 4), ISLAND, j, t, 1);
      let gap = spots.length ? Infinity : 0;
      for (const [sx, sy, sr, sq] of spots) gap = Math.min(gap, isqrt(dist2(x, y, sx, sy)) - floorDiv(rx + ry + sr + sq, 2));
      if (bestGap === null || gap > bestGap) {
        best = [x, y, rx, ry];
        bestGap = gap;
      }
    }
    spots.push(best);
  }
  return islands(width, height, spots);
}

function twinIsles(seed, width, height, land) {
  const k = (n, ...key) => below(n, seed, SHAPE, ...key);
  const r = isqrt(floorDiv(floorDiv(width * height * land * 5, 8000) * 113, 355));
  const big = 90 + k(21, RADIUS);
  const layout = k(3, CENTRE);
  const ends = [[[26, 50], [74, 50]], [[28, 36], [72, 64]], [[28, 64], [72, 36]]][layout];
  const sizes = [big, 200 - big];
  const spots = ends.map(([px, py], j) => {
    const rr = floorDiv(r * sizes[j], 100);
    const x = floorDiv(width * px, 100) + k(7, CENTRE, j, 0) - 3;
    const y = floorDiv(height * py, 100) + k(7, CENTRE, j, 1) - 3;
    return [x, y, floorDiv(rr * 6, 5), Math.min(floorDiv(height, 2) - 3, floorDiv(rr * 5, 6))];
  });
  return islands(width, height, spots);
}

const SHAPES = { continent, peninsula, coast, archipelago, 'twin-isles': twinIsles };

function edges(seed, width, height, template) {
  const root = template === 'peninsula' ? below(4, seed, SHAPE, SIDE) : -1;
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wiggle = floorDiv(floorDiv((value(seed, SHAPE, x, y, 7, WIGGLE) - 32768) * ONE * 3, 32768), 8);
      if (template === 'coast') {
        out.push(wiggle);
        continue;
      }
      let reach = Infinity;
      [y, width - 1 - x, height - 1 - y, x].forEach((d, s) => { if (s !== root) reach = Math.min(reach, d); });
      out.push(wiggle + Math.min(0, floorDiv((reach - 4) * ONE, 2)));
    }
  }
  return out;
}

function chain(seed, j, cx, cy) {
  const bearing = below(16, seed, RIDGES, BEARING, j);
  const step = floorDiv((16 + below(26, seed, RIDGES, LENGTH, j)) * 16, 2 * JOINTS);
  const centre = [cx * 16 + 8, cy * 16 + 8];
  const halves = [];
  for (const half of [0, 1]) {
    let b = (bearing + 8 * half) % 16;
    let [x, y] = centre;
    const points = [];
    for (let k = 0; k < JOINTS; k++) {
      b = mod(b + below(3, seed, RIDGES, TURN, j, half, k) - 1, 16);
      x += floorDiv(BEARINGS[b][0] * step, 16);
      y += floorDiv(BEARINGS[b][1] * step, 16);
      points.push([x, y]);
    }
    halves.push(points);
  }
  return halves[1].slice().reverse().concat([centre], halves[0]);
}

function nearChain(points, px, py) {
  let best = null;
  const last = points.length - 1;
  for (let k = 0; k < last; k++) {
    const [ax, ay] = points[k];
    const [bx, by] = points[k + 1];
    const [ux, uy, wx, wy] = [bx - ax, by - ay, px - ax, py - ay];
    const den = ux * ux + uy * uy;
    const dot = wx * ux + wy * uy;
    let d2;
    let t;
    if (dot <= 0) {
      d2 = wx * wx + wy * wy;
      t = 0;
    } else if (dot >= den) {
      d2 = dist2(px, py, bx, by);
      t = ONE;
    } else {
      const cross = wx * uy - wy * ux;
      d2 = floorDiv(cross * cross, den);
      t = floorDiv(dot * ONE, den);
    }
    if (best === null || d2 < best[0]) best = [d2, floorDiv(k * ONE + t, last)];
  }
  return best;
}

function chains(seed, width, height, falloff) {
  const centres = [];
  const ranges = [];
  const count = 1 + below(3, seed, RIDGES, CHAINS);
  for (let j = 0; j < count; j++) {
    let best = 0;
    let bestScore = null;
    for (let t = 0; t < 16; t++) {
      const i = below(width * height, seed, RIDGES, CENTRE_AT, j, t);
      const x = i % width;
      const y = floorDiv(i, width);
      let room = centres.length ? Infinity : 24;
      for (const [cx, cy] of centres) room = Math.min(room, isqrt(dist2(x, y, cx, cy)));
      const inset = Math.min(x, y, width - 1 - x, height - 1 - y, 12);
      const score = Math.min(falloff[i], ONE) + floorDiv(Math.min(room, 24) * ONE, 24) + floorDiv(inset * ONE, 12);
      if (bestScore === null || score > bestScore) {
        best = i;
        bestScore = score;
      }
    }
    centres.push([best % width, floorDiv(best, width)]);
    const reach = (3 + below(4, seed, RIDGES, WIDTH, j)) * 16;
    const lift = floorDiv((85 + below(51, seed, RIDGES, LIFT, j)) * ONE, 100);
    ranges.push([chain(seed, j, ...centres[centres.length - 1]), reach, lift]);
  }
  const out = new Array(width * height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const land = Math.min(ONE, Math.max(0, (falloff[i] + ONE / 4) * 2));
      if (!land) continue;
      let h = 0;
      for (const [points, reach, lift] of ranges) {
        const [d2, s] = nearChain(points, x * 16 + 8, y * 16 + 8);
        const d = isqrt(d2);
        if (d < reach) {
          const taper = Math.min(ONE, floorDiv(8 * s * (ONE - s), ONE));
          h = Math.max(h, floorDiv(floorDiv(lift * (reach - d), reach) * taper, ONE));
        }
      }
      if (h) {
        const crest = floorDiv(ONE * 4, 5) + floorDiv((fbm(seed, RIDGES, x, y, 8, 3) - 32768) * 4, 3);
        out[i] = floorDiv(floorDiv(h * Math.min(ONE, Math.max(floorDiv(ONE * 9, 20), crest)), ONE) * land, ONE);
      }
    }
  }
  return out;
}

function smooth(land, nbrs) {
  const out = Uint8Array.from(land);
  for (let i = 0; i < land.length; i++) {
    let count = (8 - nbrs[i].length) * land[i];
    for (const m of nbrs[i]) count += land[m];
    if (count >= 5) out[i] = 1;
    else if (count <= 3) out[i] = 0;
  }
  return out;
}

function border(width, height) {
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (x === 0 || x === width - 1 || y === 0 || y === height - 1) out.push(y * width + x);
  }
  return out;
}

function tidy(landIn, width, height) {
  const nbrs8 = neighbours(width, height);
  let land = smooth(smooth(landIn, nbrs8), nbrs8);
  let [label, sizes] = parts(neighbours(width, height, false), land);
  land = land.map((v, i) => (v && sizes[label[i]] >= MIN_ISLAND ? 1 : 0));
  const water = land.map((v) => 1 - v);
  [label, sizes] = parts(nbrs8, water);
  const edge = new Set(border(width, height).filter((i) => water[i]).map((i) => label[i]));
  return land.map((v, i) => (v || (!edge.has(label[i]) && sizes[label[i]] < MIN_POND) ? 1 : 0));
}

// Same fold as stages.py, so a stage's columns hash to its golden fingerprint.
export function foldColumns(...columns) {
  let h = mix(0x57a6e);
  for (const column of columns) {
    const values = typeof column === 'number' ? [column] : column;
    h = mix(h ^ values.length);
    for (let i = 0; i < values.length; i++) h = mix(h ^ values[i]);
  }
  return h;
}

export function checkShapes(golden) {
  const rows = golden.map(({ seed, width, height, stages }) => {
    const t0 = performance.now();
    const { template, elevation, ocean } = shape(seed, width, height);
    const ms = performance.now() - t0;
    const got = foldColumns(TEMPLATES.indexOf(template), elevation, ocean).toString(16).padStart(8, '0');
    return { seed, width, height, template, got, expected: stages.shape, ms };
  });
  return { rows, matches: rows.filter((r) => r.got === r.expected).length };
}

export function shape(seed, width, height) {
  const template = TEMPLATES[below(TEMPLATES.length, seed, SHAPE, PICK)];
  const [lo, hi] = LAND_PERMILLE[template];
  const landTarget = lo + below(hi - lo + 1, seed, SHAPE, LAND);
  const n = width * height;
  const body = SHAPES[template](seed, width, height, landTarget);
  const edge = edges(seed, width, height, template);
  const falloff = body.map((f, i) => Math.max(-4 * ONE, Math.min(3 * ONE, f + edge[i])));
  const relief = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) relief.push(floorDiv((fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * RELIEF, 16));
  }
  const cut = n - floorDiv(n * landTarget, 1000);
  const coastLevel = Int32Array.from(falloff, (f, i) => f + relief[i]).sort()[cut];
  const rise = falloff.map((f) => f - coastLevel);
  const ridge = chains(seed, width, height, rise);
  const raw = rise.map((u, i) => {
    const v = u > 0
      ? floorDiv(PLATEAU * Math.min(u, RAMP), RAMP) + floorDiv(Math.max(0, u - RAMP), 16) + relief[i] + ridge[i]
      : u + relief[i] + ridge[i];
    return v + (draw(seed, ELEVATION, GRAIN, i) % (2 * GRAIN_RAW + 1)) - GRAIN_RAW;
  });
  const sea = Int32Array.from(raw).sort()[cut];
  const land = tidy(Uint8Array.from(raw, (v) => (v > sea ? 1 : 0)), width, height);
  const elevation = raw.map((v, i) => (land[i]
    ? Math.min(TOP, Math.max(1, 1 + floorDiv((v - sea) * SCALE, ONE)))
    : Math.max(-TOP, Math.min(0, floorDiv((v - sea) * SCALE, ONE)))));
  const water = land.map((v) => 1 - v);
  const [label] = parts(neighbours(width, height), water);
  const edgeLabels = new Set(border(width, height).filter((i) => water[i]).map((i) => label[i]));
  const ocean = water.map((w, i) => (w && edgeLabels.has(label[i]) ? 1 : 0));
  return { template, elevation, ocean };
}
