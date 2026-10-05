import * as Phaser from '../p3/node_modules/phaser/dist/phaser.esm.js';
new Phaser.Game({ type: Phaser.WEBGL, pixelArt: true, scene: { create() { const m = this.make.tilemap({ data: [[0]], tileWidth: 16, tileHeight: 16 }); m.createLayer(0, m.addTilesetImage('t'), 0, 0); this.add.sprite(0, 0, 'a').play('walk'); } } });
