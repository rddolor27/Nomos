// Worker side: hand-written LDtk reader -> walkability grid + zones (no dependency)
self.onmessage = (e) => {
  const p = JSON.parse(e.data), lvl = p.levels[0];
  const col = lvl.layerInstances.find(l => l.__identifier === 'Collision');
  const W = col.__cWid, H = col.__cHei, walk = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) walk[i] = col.intGridCsv[i] === 1 ? 0 : 1;
  const ents = lvl.layerInstances.find(l => l.__identifier === 'Zones').entityInstances
    .map(z => ({ kind: z.__identifier, x: z.__grid[0], y: z.__grid[1], w: z.width / col.__gridSize, h: z.height / col.__gridSize,
      props: Object.fromEntries(z.fieldInstances.map(f => [f.__identifier, f.__value])) }));
  self.postMessage({ W, H, walk, ents }, [walk.buffer]);
};
