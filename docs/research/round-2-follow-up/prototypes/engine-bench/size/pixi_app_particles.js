import { Application, ParticleContainer, Particle, Texture } from 'pixi.js';
const app = new Application();
await app.init({ width: 800, height: 600, preference: 'webgl' });
const pc = new ParticleContainer({ dynamicProperties: { position: true, color: true } });
for (let i = 0; i < 10; i++) pc.addParticle(new Particle({ texture: Texture.WHITE, x: i, y: i }));
app.stage.addChild(pc);
document.body.appendChild(app.canvas);
