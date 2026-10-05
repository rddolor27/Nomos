import { build } from 'esbuild';
for (const s of ['custom', 'pixi', 'phaser', 'canvas'])
  await build({ entryPoints: ['bench_' + s + '.js'], bundle: true, minify: true, format: 'iife', target: 'es2022', outfile: 'dist/bench_' + s + '.js', nodePaths: ['../node_modules'], logLevel: 'warning' });
console.log('built');
