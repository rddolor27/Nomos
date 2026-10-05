// Static server approximating a CDN: precompressed brotli/gzip, immutable caching for hashed assets, optional COOP/COEP.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ldtk': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.ldtk', '.bin', '.svg', '.webmanifest', '.wasm']);
// Server-side network emulation (applies to every request, including dedicated-worker scripts, which CDP
// page-level emulation does not throttle): per-request latency (TTFB), one-off connection setup on the
// navigation request (DNS+TCP+TLS as N RTTs, h2-style single connection), and a shared download pacer.
export const throttle = { rtt: 0, bps: 0, connRtts: 0 };
const active = new Set(); let ticker = null;
function pace() { if (ticker) return; ticker = setInterval(() => {
  if (!active.size) { clearInterval(ticker); ticker = null; return; }
  const share = Math.max(1, Math.floor((throttle.bps * 0.004) / active.size));
  for (const a of [...active]) { const n = Math.min(share, a.body.length - a.off); a.res.write(a.body.subarray(a.off, a.off + n)); a.off += n; if (a.off >= a.body.length) { a.res.end(); active.delete(a); } }
}, 4); }
function send(res, body, head, isNav) {
  const delay = throttle.rtt * (1 + (isNav ? throttle.connRtts : 0));
  setTimeout(() => { res.writeHead(200, head); if (!throttle.bps || head === 'HEAD') return res.end(body); active.add({ res, body, off: 0 }); pace(); }, delay);
}
export function serve(root, port, { coi = true } = {}) {
  const cache = new Map();
  const load = (fp) => { let e = cache.get(fp); if (!e) { const raw = fs.readFileSync(fp); const ext = path.extname(fp); e = { raw, ext };
    if (COMPRESSIBLE.has(ext)) { e.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }); e.gz = zlib.gzipSync(raw, { level: 9 }); }
    cache.set(fp, e); } return e; };
  // precompress everything up front so first-request timing is not polluted
  const walk = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).forEach((f) => walk(path.join(p, f))) : load(p); walk(root);
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (u.endsWith('/')) u += 'index.html';
    const fp = path.join(root, u); if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    const e = load(fp); const h = { 'Content-Type': TYPES[e.ext] || 'application/octet-stream', 'Vary': 'Accept-Encoding',
      'Cache-Control': /\/assets\//.test(u) ? 'public, max-age=31536000, immutable' : 'no-cache', 'Timing-Allow-Origin': '*' };
    if (coi) { h['Cross-Origin-Opener-Policy'] = 'same-origin'; h['Cross-Origin-Embedder-Policy'] = 'require-corp'; h['Cross-Origin-Resource-Policy'] = 'same-origin'; }
    const ae = req.headers['accept-encoding'] || ''; let body = e.raw;
    if (e.br && /\bbr\b/.test(ae)) { body = e.br; h['Content-Encoding'] = 'br'; } else if (e.gz && /gzip/.test(ae)) { body = e.gz; h['Content-Encoding'] = 'gzip'; }
    h['Content-Length'] = body.length; send(res, req.method === 'HEAD' ? Buffer.alloc(0) : body, h, u === '/index.html');
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}
if (import.meta.url === `file://${process.argv[1]}`) { serve(path.resolve(process.argv[2]), +process.argv[3] || 8080).then(() => console.log('serving', process.argv[2])); }
