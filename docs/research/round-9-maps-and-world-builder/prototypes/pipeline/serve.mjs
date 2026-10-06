// node serve.mjs VECTORS.json RESULT.json [port]: serves this folder for a browser run of
// check.html and writes the page's posted result to RESULT.json, then exits.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [vectorsPath, resultPath, port = '8765'] = process.argv.slice(2);
const here = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.json': 'application/json' };

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/result') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      writeFileSync(resultPath, body);
      res.end('ok');
      server.close();
    });
    return;
  }
  const name = req.url === '/vectors.json' ? vectorsPath : join(here, req.url.split('?')[0]);
  try {
    res.setHeader('Content-Type', types[extname(name)] ?? 'application/octet-stream');
    res.end(readFileSync(name));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
server.listen(Number(port), '127.0.0.1');
setTimeout(() => process.exit(2), 300_000).unref();
