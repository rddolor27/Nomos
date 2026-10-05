import { createTownRenderer, packWords } from '../src/townRenderer.js';
const c = document.querySelector('canvas');
const r = createTownRenderer(c, { atlas: new ImageData(16,16), atlasCols: 64, charOrigin: [0,512], charCols: 32, emoteOrigin: [0,1000], map: new Uint16Array(4*4*4), mapW: 4, mapH: 4, tileAvg: new Uint8Array(64), palette: new Uint8Array(32), maxAgents: 1000 });
const xy = new Float32Array(2000), w = new Uint32Array(1000);
packWords(xy, xy, new Uint8Array(1000), new Uint8Array(1000), new Uint8Array(1000), w, 1000);
r.pushSnapshot(xy, w, 1000); r.draw(0, 0, 3, 0.5, 1, [1,1,1]); r.resize(800,600,2); window.R = r;
