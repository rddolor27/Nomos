import Alea from 'alea'; import { gzipSync } from 'fflate';
const r = Alea('save');
for (const S of [100, 1000]) {
  // aggregate state: 48 Float32 fields per settlement (population by role, prices of 16 goods, crime true/recorded, police, stocks...)
  const state = new Float32Array(S * 48); for (let i = 0; i < state.length; i++) state[i] = r() * 1000;
  // history: 8 metrics x 520 weekly samples (10 years) per settlement, random walk
  const T = 520, M = 8; const f32 = new Float32Array(S * M * T), q16 = new Uint16Array(S * M * T);
  for (let s = 0; s < S; s++) for (let m = 0; m < M; m++) { let v = 500; for (let t = 0; t < T; t++) { v = Math.max(0, Math.min(1000, v + (r() - 0.5) * 10));
    f32[(s * M + m) * T + t] = v; q16[(s * M + m) * T + t] = Math.round(v / 1000 * 65535); } }
  const d16 = new Int16Array(q16.length); for (let i = 0; i < q16.length; i++) d16[i] = (i % T === 0) ? q16[i] - 32768 : q16[i] - q16[i - 1];
  // route state: per road edge traffic/robbery counters, ~2 edges per settlement x 8 Float32
  const routes = new Float32Array(S * 2 * 8); for (let i = 0; i < routes.length; i++) routes[i] = r() * 100;
  const gz = (a) => gzipSync(new Uint8Array(a.buffer), { level: 6 }).length;
  console.log(JSON.stringify({ S, aggregateState: { raw: state.byteLength, gz: gz(state) }, history10y_f32: { raw: f32.byteLength, gz: gz(f32) },
    history10y_u16delta: { raw: d16.byteLength, gz: gz(d16) }, routeState: { raw: routes.byteLength, gz: gz(routes) } }));
}
