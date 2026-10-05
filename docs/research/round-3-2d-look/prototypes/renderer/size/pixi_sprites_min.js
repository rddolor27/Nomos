// PixiJS v8 minimal sprite path: WebGL-only renderer, Container, Sprite, Spritesheet, Texture (no Assets loader)
import { WebGLRenderer, Container, Sprite, Spritesheet, Texture } from 'pixi.js';
const r = new WebGLRenderer(); await r.init({ width: 800, height: 600, antialias: false, roundPixels: true });
const sheet = new Spritesheet(Texture.from(await createImageBitmap(new ImageData(16,16))), { frames: {}, meta: { scale: 1 } }); await sheet.parse();
const stage = new Container(); const s = new Sprite(Texture.WHITE); stage.addChild(s); stage.tint = 0x8080ff;
r.render(stage); document.body.appendChild(r.canvas);
