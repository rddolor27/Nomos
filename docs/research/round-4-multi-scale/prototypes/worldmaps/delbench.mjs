import Delaunator from 'delaunator'; import Alea from 'alea';
for (const n of [10000, 100000, 1000000]) { const r = Alea('x'); const c = new Float64Array(2 * n); for (let i = 0; i < 2 * n; i++) c[i] = r() * 1000;
  const ts = []; for (let k = 0; k < 6; k++) { const t0 = performance.now(); new Delaunator(c); ts.push(performance.now() - t0); }
  console.log(n, 'cold', ts[0].toFixed(1), 'ms; warm median', ts.slice(1).sort((a, b) => a - b)[2].toFixed(1), 'ms'); }
