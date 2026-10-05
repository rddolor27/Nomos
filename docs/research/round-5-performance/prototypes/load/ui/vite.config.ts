import { defineConfig } from 'vite';
const fw = process.env.FW!;
export default defineConfig(async () => {
  const plugins: any[] = [];
  if (fw.includes('solid')) plugins.push((await import('vite-plugin-solid')).default());
  if (fw.includes('svelte')) plugins.push((await import('@sveltejs/vite-plugin-svelte')).svelte());
  return {
    root: new URL('./' + fw, import.meta.url).pathname, base: './', plugins, logLevel: 'warn',
    oxc: fw.includes('preact') ? { jsx: { runtime: 'automatic', importSource: 'preact' } } : fw.includes('react') ? { jsx: { runtime: 'automatic' } } : undefined,
    build: { outDir: new URL('../dist-ui/' + fw, import.meta.url).pathname, emptyOutDir: true, modulePreload: { polyfill: false }, reportCompressedSize: false },
  };
});
