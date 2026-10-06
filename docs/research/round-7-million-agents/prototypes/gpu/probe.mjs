// Adapter, features and limits as Dawn reports them here. Usage: node probe.mjs [backend=d3d12|vulkan]
import { create, globals } from 'webgpu';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

Object.assign(globalThis, globals);
const backend = (process.argv.find((a) => a.startsWith('backend=')) || '').slice(8);
const gpu = create(backend ? [`backend=${backend}`] : []);
const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
if (!adapter) { console.log('no adapter'); process.exit(1); }
const info = {};
for (const k of ['vendor', 'architecture', 'device', 'description', 'subgroupMinSize', 'subgroupMaxSize', 'isFallbackAdapter']) info[k] = adapter.info?.[k];
const limits = {};
for (const k in adapter.limits) limits[k] = adapter.limits[k];
const features = [...adapter.features].sort();
const device = await adapter.requestDevice();
const dlimits = {};
for (const k in device.limits) dlimits[k] = device.limits[k];
const pkg = JSON.parse(readFileSync(new URL('./node_modules/webgpu/package.json', import.meta.url), 'utf8'));
const out = { webgpuNpm: pkg.version, node: process.version, backendRequested: backend || 'default', info, features, adapterLimits: limits, defaultDeviceLimits: dlimits };
console.log(JSON.stringify(out, null, 1));
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/probe-${backend || 'default'}.json`, import.meta.url), JSON.stringify(out, null, 1));
device.destroy();
process.exit(0);
