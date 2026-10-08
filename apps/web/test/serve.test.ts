import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAP_CONTENT_TYPE } from '@nomos/sim-protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type Served } from './serve.ts';

const LATENCY_MS = 40;
const WORKER = 'self.onmessage = () => {};\n';
const HEADERS = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');

describe('the throttled test server', () => {
  let root = '';
  let server: Served;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'nomos-serve-'));
    mkdirSync(join(root, 'assets', 'maps'), { recursive: true });
    writeFileSync(join(root, '_headers'), HEADERS);
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>t</title>'.repeat(20));
    writeFileSync(join(root, 'assets', 'index-x.js'), 'export const a = 1;\n'.repeat(50));
    writeFileSync(join(root, 'assets', 'worker-x.js'), WORKER);
    writeFileSync(join(root, 'assets', 'maps', 'town-x.nmap'), Buffer.alloc(2000, 7));
    server = await startServer({ root, latencyMs: LATENCY_MS });
  });

  afterAll(async () => {
    await server.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('serves _headers and brotli as production does', async () => {
    const page = await fetch(`${server.url}/?tier=phone`);
    expect(page.headers.get('cross-origin-embedder-policy')).toBe('require-corp');
    expect(page.headers.get('cache-control')).toBeNull();
    expect(page.headers.get('content-encoding')).toBe('br');
    const script = await fetch(`${server.url}/assets/index-x.js`);
    expect(script.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await script.text()).toContain('export const a = 1;');
    const map = await fetch(`${server.url}/assets/maps/town-x.nmap`);
    expect(map.headers.get('content-type')).toBe(MAP_CONTENT_TYPE);
    expect(map.headers.get('content-encoding')).toBe('br');
    expect((await map.arrayBuffer()).byteLength).toBe(2000);
  });

  it('tells a slowed worker its CPU slowdown', async () => {
    expect(await (await fetch(`${server.url}/assets/worker-x.js`)).text()).toBe(WORKER);
    const slowed = await startServer({ root, latencyMs: 0, workerSlowdown: 4 });
    try {
      expect(await (await fetch(`${slowed.url}/assets/worker-x.js`)).text()).toBe(
        `globalThis.__nomosCpuSlowdown=4;${WORKER}`,
      );
      expect(await (await fetch(`${slowed.url}/assets/index-x.js`)).text()).toBe('export const a = 1;\n'.repeat(50));
    } finally {
      await slowed.close();
    }
  });

  it('answers a missing file with 404 after the latency', async () => {
    const start = performance.now();
    const missing = await fetch(`${server.url}/assets/nothing.js`);
    expect(missing.status).toBe(404);
    expect(performance.now() - start).toBeGreaterThanOrEqual(LATENCY_MS - 1);
  });
});
