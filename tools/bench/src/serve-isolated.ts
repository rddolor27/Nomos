import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
};

export interface IsolatedServer {
  readonly origin: string;
  close(): Promise<void>;
}

// COOP and COEP make the page and its workers cross-origin isolated, so Chromium's clock resolves 5 µs, not 100 µs (R5).
// Each file is served at its key, such as '/index.html'.
export async function serveIsolated(files: Readonly<Record<string, string>>): Promise<IsolatedServer> {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (!Object.hasOwn(files, path)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.slice(path.lastIndexOf('.') + 1)] ?? 'text/plain; charset=utf-8',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    });
    response.end(files[path]);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
