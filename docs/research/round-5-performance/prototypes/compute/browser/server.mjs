// Static server with cross-origin isolation headers (COOP/COEP) -> SharedArrayBuffer + 5us timers in Chromium.
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
export function startServer(port = 0, coi = true) {
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); const p = path.join(root, decodeURIComponent(u.pathname));
    if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
    try { const data = await readFile(p); const h = { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
      if (coi) Object.assign(h, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' });
      res.writeHead(200, h); res.end(data); } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}
