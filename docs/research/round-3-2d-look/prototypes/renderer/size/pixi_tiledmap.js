// PixiJS v8 Application + Assets + pixi-tiledmap loader (Tiled runtime)
import { Application, extensions, Assets, AnimatedSprite, Texture } from 'pixi.js';
import { tiledMapLoader } from 'pixi-tiledmap';
extensions.add(tiledMapLoader);
const app = new Application(); await app.init({ resizeTo: window });
const { container } = await Assets.load('town.tmj'); app.stage.addChild(container);
const a = new AnimatedSprite([Texture.WHITE]); app.stage.addChild(a); document.body.appendChild(app.canvas);
