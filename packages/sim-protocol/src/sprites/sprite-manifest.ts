/* Generated from schema/sprite-manifest.schema.json by `pnpm --filter @nomos/sim-protocol types`; do not edit. */

/**
 * One sprite sheet's manifest, as tools/sprites writes it to assets/sprites/<category>.json. Frames are named; the atlas build gives them places, so a manifest never holds an atlas index.
 */
export interface SpriteManifest {
  image: string;
  /**
   * @minItems 2
   * @maxItems 2
   */
  size: [number, number];
  tile: 16;
  frames: {
    [k: string]: SpriteFrame;
  };
}
/**
 * One sprite on its sheet: its pixels, the point it stands on, and what the renderer and map tools read from it.
 */
export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  anchor: [number, number];
  /**
   * @minItems 2
   * @maxItems 2
   */
  footprint?: [number, number];
  /**
   * @minItems 2
   * @maxItems 2
   */
  door?: [number, number];
  /**
   * @minItems 2
   * @maxItems 2
   */
  face?: [number, number];
  /**
   * @minItems 2
   * @maxItems 2
   */
  hitch?: [number, number];
  joins?: '' | 'l' | 'lr' | 'r' | 'u' | 'ul' | 'ur';
  layer?: 'body' | 'face' | 'ground' | 'job' | 'night' | 'pattern' | 'snow';
  night?: string;
  snow?: string;
  target?: string;
  overlay?: boolean;
  review_only?: boolean;
  view?: 'true';
  colour?: string;
  corners?: string;
  cord_row?: number;
  frame?: number;
  hue?: 'ice' | 'lilac' | 'mint' | 'rose' | 'silver' | 'sun';
  pose?: 'sit' | 'sneak' | 'stand' | 'walk';
  facing?: 'down' | 'left' | 'right' | 'up';
  job?: 'builder' | 'clinic' | 'farmer' | 'merchant' | 'police' | 'soldier';
  eyes?: 'dot' | 'round' | 'tall' | 'wide';
  pattern?: 'patch' | 'speckle' | 'spots';
}
