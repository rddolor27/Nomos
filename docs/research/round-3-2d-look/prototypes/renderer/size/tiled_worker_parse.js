// Worker side: parse a Tiled .tmj with pixi-tiledmap's data-only API (no renderer)
import { parseMap, tileAt } from 'pixi-tiledmap';
self.onmessage = async (e) => { const map = parseMap(e.data.json); self.postMessage(tileAt ? map.width : 0); };
