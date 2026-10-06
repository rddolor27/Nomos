// Frame loop shared by the main thread and the OffscreenCanvas render worker.
// Full mode keeps two GPU buffers (prev, cur) and uploads each new tick into the older one.
// Visible mode uploads self-contained 20-byte records that carry both interpolation endpoints.
// LOD 'auto' switches dots → density heatmap when visible × dot area covers half the screen.
import { makeAgentBuffer, makeVao, drawAgents, clearTarget, makeTarget, resolveDensity } from './gl.js';
import * as P from './protocol.js';

const LONG_FRAME_MS = 25;
const HEAT_ON = 0.5, HYSTERESIS = 1.15;

function stat(a) {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!s.length) return null;
  return { med: s[s.length >> 1], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], min: s[0], max: s[s.length - 1], k: s.length };
}

export function createLoop(R, o) {
  const gl = R.gl, n = o.n, visibleMode = o.upload === 'visible', rec = P.recordBytes(o.upload);
  const bufs = [makeAgentBuffer(R, n * rec), makeAgentBuffer(R, n * rec)];
  const vaos = visibleMode
    ? bufs.map((b) => makeVao(R, { cur: b, stride: 20, offPrev: 0, offCur: 8, offWord: 16 }))
    : [makeVao(R, { cur: bufs[0], prev: bufs[1] }), makeVao(R, { cur: bufs[1], prev: bufs[0] })];
  const H = o.sab ? P.views(o.sab) : null;
  const target = { fb: null, w: o.w, h: o.h };
  const den = R.floatBlend ? makeTarget(gl, o.w >> 2, o.h >> 2, gl.R32F) : null;
  const tickMs = 1000 / o.hz;
  let cur = 0, count = 0, vis = 0, tickT = 0, front = 2, last = 0, pending = null, have = false, heat = o.lod === 'heat';
  let st = { cpu: [], up: [], int: [], gpu: [], frames: 0 };
  const queries = [];

  const cam = () => [o.view.cam[0], o.view.cam[1], o.view.ppt, o.w, o.h];
  if (H) H.f32.set(cam(), P.CAM_F32);

  function upload(bytes, cnt, visCount, epochMs) {
    const dst = 1 - cur;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[dst]);
    const t0 = performance.now();
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bytes);
    st.up.push(performance.now() - t0);
    cur = dst; count = cnt; vis = visCount; tickT = epochMs - performance.timeOrigin; have = true;
  }

  function pollQueries() {
    while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = queries.shift();
      if (!gl.getParameter(R.timer.GPU_DISJOINT_EXT)) st.gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
  }

  function chooseLod() {
    if (o.lod !== 'auto' || !den) return;
    const occ = vis * o.size * o.size / (o.w * o.h);
    if (!heat && occ > HEAT_ON) heat = true;
    else if (heat && occ < HEAT_ON / HYSTERESIS) heat = false;
  }

  return {
    onSnap(m) { if (pending) o.returnBuf(pending.buf); pending = m; },
    setView(v) { o.view.cam[0] = v.cam[0]; o.view.cam[1] = v.cam[1]; o.view.ppt = v.ppt; },
    frame(now) {
      const t0 = performance.now();
      if (H) {
        H.f32.set(cam(), P.CAM_F32);
        if (Atomics.load(H.i32, P.ST) & P.FRESH) {
          front = Atomics.exchange(H.i32, P.ST, front) & 3;
          const cnt = visibleMode ? H.i32[P.COUNT_I32 + front] : n;
          upload(new Uint8Array(o.sab, P.slotOffset(front, n, o.upload), cnt * rec), cnt, H.i32[P.VIS_I32 + front], H.f64[P.TIME_F64 + front]);
        }
      } else if (pending) {
        const m = pending;
        pending = null;
        upload(new Uint8Array(m.buf, 0, m.count * rec), m.count, m.vis, m.t);
        o.returnBuf(m.buf);
        o.postCam?.(cam());
      }
      chooseLod();
      const alpha = o.interp ? Math.min(1, Math.max(0, (performance.now() - tickT) / tickMs)) : 1;
      const q = R.timer && st.frames % 2 === 0 ? gl.createQuery() : null;
      if (q) gl.beginQuery(R.timer.TIME_ELAPSED_EXT, q);
      if (heat && den && have) {
        clearTarget(R, den, 0, 0, 0);
        drawAgents(R, { vao: vaos[cur], n: count, prim: 'points', splat: true, view: o.view, target: den });
        resolveDensity(R, den.tex, Math.max(4, vis / (den.w * den.h) * 40), target);
      } else {
        clearTarget(R, target);
        if (have) drawAgents(R, { vao: vaos[cur], n: count, prim: o.prim, size: o.size, interp: o.interp, alpha, view: o.view, target });
      }
      if (q) { gl.endQuery(R.timer.TIME_ELAPSED_EXT); queries.push(q); }
      if (R.timer) pollQueries();
      st.cpu.push(performance.now() - t0);
      if (last) st.int.push(now - last);
      last = now;
      st.frames++;
    },
    summary() {
      return { frames: st.frames, cpu: stat(st.cpu), upload: stat(st.up), interval: stat(st.int), gpu: stat(st.gpu),
        longFrames: st.int.filter((x) => x > LONG_FRAME_MS).length, count, visible: vis, lod: heat ? 'heat' : 'dots',
        occupancy: vis * o.size * o.size / (o.w * o.h) };
    },
    reset() { st = { cpu: [], up: [], int: [], gpu: [], frames: 0 }; },
    dispose() { for (const b of bufs) gl.deleteBuffer(b); for (const v of vaos) gl.deleteVertexArray(v); },
  };
}
