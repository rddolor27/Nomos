// node check.mjs VECTORS.json: compares the JS port with the Python golden vectors.
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { compare } from './compare.mjs';

const vectors = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const started = performance.now();
const result = compare(vectors);
result.engine = `node ${process.version} (V8 ${process.versions.v8})`;
result.python = vectors.python;
result.cpu = os.cpus()[0].model;
result.os = `${os.type()} ${os.release()} ${os.arch()}`;
result.ms = Math.round(performance.now() - started);
console.log(JSON.stringify(result, null, 2));
