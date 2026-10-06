// OffscreenCanvas render worker: reads the SharedArrayBuffer snapshot directly, so the main thread
// does no per-frame rendering work.
import { initGL } from './gl.js';
import { createLoop } from './loop.js';

let loop, raf = 0, running = false;

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    const R = initGL(m.canvas, m.w, m.h);
    loop = createLoop(R, { ...m.opts, sab: m.sab, w: m.w, h: m.h });
    running = true;
    const tick = (now) => { if (!running) return; loop.frame(now); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    postMessage({ type: 'ready', renderer: R.renderer, raf: typeof requestAnimationFrame });
  } else if (m.type === 'reset') loop.reset();
  else if (m.type === 'view') loop.setView(m.view);
  else if (m.type === 'summary') postMessage({ type: 'summary', ...loop.summary() });
  else if (m.type === 'stop') { running = false; cancelAnimationFrame(raf); loop.dispose(); postMessage({ type: 'stopped' }); }
};
