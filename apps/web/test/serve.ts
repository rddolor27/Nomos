import { readdirSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, relative, sep } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import { MAP_CONTENT_TYPE } from '@nomos/sim-protocol';
import { headersFor, parseHeaders } from '../vite/headers.ts';

// Chrome DevTools' Fast 4G: 165 ms latency and 1,012,500 bytes a second down, with 3 round trips of DNS, TCP and TLS
// before each navigation's first byte. CDP's CPU throttling skips workers, so workerSlowdown tells the sim worker to
// wait as a CPU that many times slower would (R5 load notes §2).
export interface ServeOptions {
  root: string;
  latencyMs?: number;
  bytesPerSecond?: number;
  setupRtts?: number;
  workerSlowdown?: number;
}

export interface Served {
  url: string;
  close(): Promise<void>;
}

interface File {
  body: Buffer;
  headers: Record<string, string>;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const WORKER_CHUNK = /^\/assets\/worker-[^/]+\.js$/;

function compressible(type: string): boolean {
  return type.startsWith('text/') || type.startsWith('application/json') || type === MAP_CONTENT_TYPE;
}

// The worker module reads the global when it creates its loop, after this line has run.
function slowedWorker(body: Buffer<ArrayBuffer>, workerSlowdown: number): Buffer<ArrayBuffer> {
  return Buffer.concat([Buffer.from(`globalThis.__nomosCpuSlowdown=${workerSlowdown};`), body]);
}

// Everything is read and compressed up front, so no request spends brotli-11's CPU while a load is timed.
function loadFiles(root: string, workerSlowdown: number): Map<string, File> {
  const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8'));
  const files = new Map<string, File>();
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name === '_headers') continue;
    const path = `/${relative(root, join(entry.parentPath, entry.name)).split(sep).join('/')}`;
    const headers: Record<string, string> = {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      ...headersFor(path, rules),
    };
    let body = readFileSync(join(entry.parentPath, entry.name));
    if (workerSlowdown !== 1 && WORKER_CHUNK.test(path)) body = slowedWorker(body, workerSlowdown);
    if (compressible(headers['Content-Type'])) {
      body = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      headers['Content-Encoding'] = 'br';
    }
    files.set(path, { body, headers: { ...headers, 'Content-Length': String(body.length) } });
  }
  return files;
}

function pathOf(req: IncomingMessage): string {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  return path.endsWith('/') ? `${path}index.html` : path;
}

export async function startServer({
  root,
  latencyMs = 165,
  bytesPerSecond = 1_012_500,
  setupRtts = 3,
  workerSlowdown = 1,
}: ServeOptions): Promise<Served> {
  const files = loadFiles(root, workerSlowdown);
  // One link shared by every response, as on a phone: each waits its turn, then takes its bytes' time.
  let linkFreeAtMs = 0;

  const respond = (req: IncomingMessage, res: ServerResponse): void => {
    const file = files.get(pathOf(req));
    const nowMs = performance.now();
    const navigation = req.headers['sec-fetch-dest'] === 'document';
    if (navigation) linkFreeAtMs = 0;
    const firstByteMs = nowMs + latencyMs * (navigation ? 1 + setupRtts : 1);
    const bytes = file?.body.length ?? 0;
    linkFreeAtMs = Math.max(firstByteMs, linkFreeAtMs) + (bytes * 1000) / bytesPerSecond;
    setTimeout(() => {
      if (res.destroyed) return;
      if (!file) res.writeHead(404).end();
      else res.writeHead(200, file.headers).end(file.body);
    }, linkFreeAtMs - nowMs);
  };

  const server = createServer(respond);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close() {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
