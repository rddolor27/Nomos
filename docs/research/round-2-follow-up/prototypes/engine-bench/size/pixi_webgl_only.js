import { WebGLRenderer, Container, ParticleContainer, Particle, Texture } from 'pixi.js';
const r = new WebGLRenderer();
await r.init({ width: 800, height: 600 });
const stage = new Container();
const pc = new ParticleContainer({ dynamicProperties: { position: true, color: true } });
for (let i = 0; i < 10; i++) pc.addParticle(new Particle({ texture: Texture.WHITE, x: i, y: i }));
stage.addChild(pc);
r.render(stage);
document.body.appendChild(r.canvas);
