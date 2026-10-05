import Phaser from 'phaser';
new Phaser.Game({ type: Phaser.WEBGL, pixelArt: true, scene: { create() { const m = this.make.tilemap({ data: [[0]], tileWidth: 16, tileHeight: 16 }); m.createLayer(0, m.addTilesetImage('t'), 0, 0, true); this.add.sprite(0, 0, 'a').play('walk'); } } });
