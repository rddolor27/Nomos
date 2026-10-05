import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
const PWA = process.env.PWA; const SPLIT = process.env.SPLIT !== '0', EARLY = process.env.EARLY === '1', PRELOAD = process.env.PRELOAD === '1', LAZYPRE = process.env.LAZYPRE;
// Post-build: optionally start the worker + map fetch from an inline head script, and/or modulepreload the worker chunk.
function earlyBoot(): Plugin {
  return { name: 'early-boot', apply: 'build', transformIndexHtml: { order: 'post', handler(html, ctx) {
    const files = Object.keys(ctx.bundle ?? {}); const w = files.find((f) => /worker-.*\.js$/.test(f)); const bin = files.find((f) => /town-.*\.bin$/.test(f)); const js = files.find((f) => /town-.*\.ldtk$/.test(f));
    let tags = '';
    if (LAZYPRE) for (const f of files.filter((f) => /assets\/(chart|controls)-.*\.js$/.test(f))) tags += `<link rel="${LAZYPRE}" href="/${f}"${LAZYPRE === 'modulepreload' ? '' : ' as="script"'}>`;
    if (PRELOAD && w) tags += `<link rel="modulepreload" href="/${w}">`;
    if (EARLY && w) tags += `<script>(function(){var q=new URLSearchParams(location.search);window.__boot={worker:new Worker('/${w}',{type:'module',name:'sim'}),mapP:fetch(q.get('map')==='json'?'/${js}':'/${bin}').then(function(r){return r.arrayBuffer()})};performance.mark('worker:new')})()</script>`;
    return html.replace('<title>', tags + '<title>');
  } } };
}
// Hand-written ~1 KB service worker: precache the hashed build output (cache-first), network-first for HTML.
function tinySW(): Plugin {
  return { name: 'tiny-sw', apply: 'build', enforce: 'post',
    transformIndexHtml: { order: 'post', handler: (html) => html.replace('</body>', `<script>if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))</script></body>`) },
    generateBundle(_o, bundle) {
      const files = Object.keys(bundle).filter((f) => /\.(js|css|bin|webp)$/.test(f) && !/\.(png|ldtk)$/.test(f)).map((f) => '/' + f);
      const v = files.join('|').length.toString(36) + Date.now().toString(36);
      const src = `const C='app-${v}',A=${JSON.stringify(files)};
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['/index.html',...A])))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin)return;
if(e.request.mode==='navigate'){const net=fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put('/index.html',c));return r});e.waitUntil(net.catch(()=>{}));e.respondWith(caches.match('/index.html').then(r=>r||net));return}
e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    } };
}
export default defineConfig({
  base: '/', logLevel: 'warn', assetsInclude: ['**/*.ldtk', '**/*.bin'],
  resolve: { alias: { '@loaders': new URL(SPLIT ? './src/loaders.lazy.ts' : './src/loaders.eager.ts', import.meta.url).pathname } },
  worker: { format: 'es' },
  build: { outDir: process.env.OUT || 'dist', emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, reportCompressedSize: false, modulePreload: { polyfill: false } },
  plugins: [earlyBoot(), ...(PWA === 'workbox' ? [VitePWA({ injectRegister: 'inline', registerType: 'autoUpdate', manifest: false,
    workbox: { globPatterns: ['**/*.{js,css,html,bin,webp}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, cleanupOutdatedCaches: true, navigateFallback: null, ignoreURLParametersMatching: [/^wslow$/, /^n$/] } })] : []),
    ...(PWA === 'tiny' ? [tinySW()] : [])],
});
