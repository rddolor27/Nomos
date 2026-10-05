import { Delaunay } from 'd3-delaunay';
import fs from 'fs';
const d = JSON.parse(fs.readFileSync(process.argv[2]));
const R = +process.argv[3];
let t0 = performance.now();
const pts = new Float64Array(d.n * 2); for (let i = 0; i < d.n; i++) { pts[2*i] = d.X[i]; pts[2*i+1] = d.Y[i]; }
const del = new Delaunay(pts); const t1 = performance.now();
const out = new Uint8Array(R * R); let hint = 0;
for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { hint = del.find((x + 0.5) * 1000 / R, (y + 0.5) * 1000 / R, hint); out[y * R + x] = d.cls[hint]; }
const t2 = performance.now();
fs.writeFileSync(process.argv[4], out);
console.log(JSON.stringify({ R, cells: d.n, buildMs: +(t1 - t0).toFixed(1), rasterMs: +(t2 - t1).toFixed(1) }));
