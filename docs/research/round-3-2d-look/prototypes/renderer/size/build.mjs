import { build } from 'esbuild';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { readFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
const defs = { WEBGL_RENDERER: 'true', CANVAS_RENDERER: 'false', FEATURE_SOUND: 'false', WEBGL_DEBUG: 'false', PLUGIN_CAMERA3D: 'false', PLUGIN_FBINSTANT: 'false' };
const entries = process.argv.slice(2);
console.log('| entry | min (B) | gzip-9 (B) | brotli-11 (B) |'); console.log('|---|---:|---:|---:|');
for (const e of entries) {
  try {
    const out = 'dist/' + e.replace(/\.js$/, '.min.js');
    await build({ entryPoints: [e], bundle: true, minify: true, format: 'esm', target: 'es2022', outfile: out, logLevel: 'error',
      define: e.includes('phaser4_custom') ? defs : {}, nodePaths: ['../node_modules'], external: ['phaser3spectorjs'] });
    const b = readFileSync(out);
    const gz = gzipSync(b, { level: 9 }).length, br = brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
    console.log(`| ${e} | ${b.length.toLocaleString('en')} | ${gz.toLocaleString('en')} | ${br.toLocaleString('en')} |`);
  } catch (err) { console.log(`| ${e} | ERROR ${String(err.message).slice(0, 300)} |`); }
}
