// PixiJS v8 typical app: Application (auto-detect WebGL/WebGPU) + Assets loader + AnimatedSprite + @pixi/tilemap
import { Application, Assets, Container, Sprite, AnimatedSprite, Texture, ParticleContainer, Particle } from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';
const app = new Application(); await app.init({ resizeTo: window, antialias: false, roundPixels: true });
const sheet = await Assets.load('atlas.json');
const tm = new CompositeTilemap(); tm.tile(Texture.WHITE, 0, 0); app.stage.addChild(tm);
const a = new AnimatedSprite(sheet.animations.walk); a.play(); app.stage.addChild(a);
const pc = new ParticleContainer({ dynamicProperties: { position: true, uvs: true } }); pc.addParticle(new Particle({ texture: Texture.WHITE })); app.stage.addChild(pc);
document.body.appendChild(app.canvas);
