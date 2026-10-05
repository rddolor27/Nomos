import GUI from 'lil-gui';
export function mountControls(state: { paused: boolean; speed: number; skin: string; heatmap: boolean }, onSkin: (s: string) => void) {
  const gui = new GUI({ title: 'Simulation' }); gui.add(state, 'paused'); gui.add(state, 'speed', 1, 16, 1); gui.add(state, 'skin', ['dots', 'blobs', 'town']).onChange(onSkin); gui.add(state, 'heatmap');
  return gui;
}
