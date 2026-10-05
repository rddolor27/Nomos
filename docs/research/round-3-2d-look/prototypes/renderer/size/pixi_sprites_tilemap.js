// PixiJS v8 WebGL-only + Sprite/AnimatedSprite/Spritesheet + ParticleContainer + @pixi/tilemap
import { WebGLRenderer, Container, Sprite, AnimatedSprite, Spritesheet, Texture, ParticleContainer, Particle } from 'pixi.js';
import { CompositeTilemap } from '@pixi/tilemap';
const r = new WebGLRenderer(); await r.init({ width: 800, height: 600, antialias: false, roundPixels: true });
const sheet = new Spritesheet(Texture.WHITE, { frames: {}, meta: { scale: 1 }, animations: {} }); await sheet.parse();
const stage = new Container(); const tm = new CompositeTilemap(); tm.tile(Texture.WHITE, 0, 0); stage.addChild(tm);
const a = new AnimatedSprite([Texture.WHITE, Texture.WHITE]); a.play(); stage.addChild(a);
const pc = new ParticleContainer({ dynamicProperties: { position: true, uvs: true, color: true } });
pc.addParticle(new Particle({ texture: Texture.WHITE })); stage.addChild(pc); stage.tint = 0x8080ff;
r.render(stage); document.body.appendChild(r.canvas);
