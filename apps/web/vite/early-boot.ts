import type { HtmlTagDescriptor, Plugin } from 'vite';

const WORKER = /^assets\/worker-[\w-]+\.js$/;
const TOWN_MAP = /^assets\/maps\/town-[\w-]+\.nmap$/;

function find(fileNames: readonly string[], pattern: RegExp, what: string): string {
  const fileName = fileNames.find((name) => pattern.test(name));
  if (!fileName) throw new Error(`the early boot found no ${what} in the bundle`);
  return fileName;
}

// Starts the sim worker and the map fetch while the HTML still parses, before the entry module loads (R5). The
// no-op catch marks a failed fetch as handled, so it never reads as uncaught before the app awaits it and says why;
// the failed flag keeps a worker error that fires before the app listens, so the app can still say so.
export function bootTag(fileNames: readonly string[]): HtmlTagDescriptor {
  const worker = find(fileNames, WORKER, 'sim worker');
  const map = find(fileNames, TOWN_MAP, 'town map');
  const children =
    `window.__boot={worker:new Worker('/${worker}',{type:'module',name:'sim'}),` +
    `map:fetch('/${map}').then(function(r){if(!r.ok)throw new Error('map '+r.status);return r.arrayBuffer()})};` +
    `window.__boot.worker.onerror=function(){window.__boot.failed=true};` +
    `window.__boot.map.catch(function(){});performance.mark('worker:new')`;
  return { tag: 'script', children, injectTo: 'head-prepend' };
}

// Build only: under vite dev no bundle exists, and the entry module starts both itself.
export function earlyBoot(): Plugin {
  return {
    name: 'nomos-early-boot',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, { bundle }) => [bootTag(Object.keys(bundle ?? {}))],
    },
  };
}
