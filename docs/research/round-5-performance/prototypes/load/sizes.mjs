// usage: node sizes.mjs <dir|file>...  -> raw / gzip-9 / brotli-11 per file and totals
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
export function sz(buf) { return { raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length, br: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length }; }
function walk(p) { const st = fs.statSync(p); if (st.isFile()) return [p]; return fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))); }
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const arg of process.argv.slice(2)) {
    const files = walk(arg).filter((f) => /\.(js|css|html|json|mjs|webmanifest)$/.test(f));
    const tot = { raw: 0, gz: 0, br: 0 };
    for (const f of files) { const s = sz(fs.readFileSync(f)); for (const k in tot) tot[k] += s[k]; console.log(`${path.relative(arg, f).padEnd(48)} ${String(s.raw).padStart(8)} ${String(s.gz).padStart(7)} ${String(s.br).padStart(7)}`); }
    console.log(`${('TOTAL ' + arg).padEnd(48)} ${String(tot.raw).padStart(8)} ${String(tot.gz).padStart(7)} ${String(tot.br).padStart(7)}`);
  }
}
