// Writes src/place/frames.ts, the sprite fields tools/worldgen/place.py reads, from assets/sprites/*.json:
// node packages/worldgen/scripts/place-frames.ts. The map worker cannot read the manifests, and needs only these.
import { readFileSync, writeFileSync } from 'node:fs';

interface ManifestFrame {
  w: number;
  anchor: [number, number];
  footprint?: [number, number];
  door?: [number, number];
}

const SPRITES = new URL('../../../assets/sprites/', import.meta.url);
const TABLE = new URL('../src/place/frames.ts', import.meta.url);

// Every frame place.py passes to frame(), prop(), tree() or build(), by sheet. Houses come by form, below.
const USED: Record<string, readonly string[]> = {
  nature: [
    'prop_barrel', 'prop_bench', 'prop_bush', 'prop_cart_grain_left', 'prop_crate', 'prop_fence_corner_bottom-left',
    'prop_fence_corner_bottom-right', 'prop_fence_corner_top-left', 'prop_fence_corner_top-right',
    'prop_fence_horizontal', 'prop_fence_vertical', 'prop_flower-patch', 'prop_hay-bale', 'prop_lamp-post',
    'prop_signpost', 'prop_well', 'rock_boulder', 'rock_coal', 'rock_ore', 'rock_outcrop', 'tree_conifer',
    'tree_deciduous_mature', 'tree_deciduous_stump', 'tree_deciduous_young', 'tree_fruit', 'tree_log',
  ],
  scenery: [
    'bridge_country_horizontal_end-left', 'bridge_country_horizontal_end-right', 'bridge_country_horizontal_span',
    'bridge_country_vertical_end-bottom', 'bridge_country_vertical_end-top', 'bridge_country_vertical_span',
    'bridge_main_horizontal_end-left', 'bridge_main_horizontal_end-right', 'bridge_main_horizontal_span',
    'bridge_main_vertical_end-bottom', 'bridge_main_vertical_end-top', 'bridge_main_vertical_span',
    'prop_beach-rocks', 'prop_picnic-table', 'prop_reeds', 'prop_viewer', 'prop_viewpoint-rail', 'tree_autumn',
    'tree_blossom', 'tree_palm',
  ],
  buildings: [
    'civic_clinic', 'civic_courthouse', 'civic_police-station', 'civic_records-office', 'civic_school',
    'civic_town-hall', 'shop_general', 'shop_market-stall', 'shop_warehouse', 'work_dock', 'work_farm',
    'work_fuel-works', 'work_lumber-camp', 'work_mine', 'work_pasture', 'work_quarry', 'work_workshop',
  ],
  landmarks: [
    'landmark_amphitheatre', 'landmark_clock-tower', 'landmark_fountain_0', 'landmark_garden-terraces',
    'landmark_glasshouse', 'landmark_library', 'landmark_lighthouse_0', 'landmark_observatory',
    'landmark_viaduct_end-left', 'landmark_viaduct_end-right', 'landmark_viaduct_span', 'landmark_windmill_0',
  ],
  wonders: [
    'wonder_caldera-lake', 'wonder_canyon-view', 'wonder_crystal-cave_1', 'wonder_dune', 'wonder_geyser_2',
    'wonder_giant-tree', 'wonder_glacier', 'wonder_hot-springs_0', 'wonder_sea-arch_0', 'wonder_stone-arch',
    'wonder_waterfall_0',
  ],
};
export const HOUSE_FORMS = ['apartment', 'detached', 'farmhouse', 'hut', 'row-left', 'row-middle', 'row-right'];
// Every house of a form shares its size, anchor and door, whatever its material and roof; the test checks each one.
const SAMPLE_HOUSE = 'brick';
const SAMPLE_ROOF = 'green';

export function manifestFrames(sheet: string): Record<string, ManifestFrame> {
  return JSON.parse(readFileSync(new URL(`${sheet}.json`, SPRITES), 'utf8')).frames;
}

export function fieldsOf(frame: ManifestFrame): number[] {
  const [fw, fh] = frame.footprint ?? [0, 0];
  return [frame.w, frame.anchor[0], frame.anchor[1], fw, fh, frame.door ? frame.door[0] : 0];
}

function entry(key: string, frame: ManifestFrame | undefined): string {
  if (!frame) throw new Error(`no frame ${key} in assets/sprites`);
  return `  '${key}': [${fieldsOf(frame).join(', ')}],`;
}

export function placeFramesSource(): string {
  const lines = [
    '// Generated from assets/sprites/*.json by node packages/worldgen/scripts/place-frames.ts; do not edit.',
    '// Per frame: w, anchor x, anchor y, footprint w, footprint h, door x, and 0 where the manifest has none.',
    'export const FRAMES: Record<string, readonly number[]> = {',
  ];
  for (const [sheet, names] of Object.entries(USED)) {
    const frames = manifestFrames(sheet);
    for (const name of names) lines.push(entry(`${sheet}/${name}`, frames[name]));
  }
  const houses = manifestFrames('houses');
  for (const form of HOUSE_FORMS) {
    lines.push(entry(`houses/${form}`, houses[`house_${SAMPLE_HOUSE}_${form}_roof-${SAMPLE_ROOF}`]));
  }
  lines.push('};', '');
  return lines.join('\n');
}

if (import.meta.main) {
  writeFileSync(TABLE, placeFramesSource());
  console.log('wrote packages/worldgen/src/place/frames.ts');
}
