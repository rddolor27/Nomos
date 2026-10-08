import skinA from './skin-a.json';

export function rgbOf(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

export const OUTLINE = rgbOf(skinA.outline.rgb);
export const RIM = rgbOf(skinA.rim.rgb);
export const BACKGROUND = rgbOf(skinA.background.rgb);

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: number): number {
  return 0.2126 * linear(rgb >> 16) + 0.7152 * linear((rgb >> 8) & 255) + 0.0722 * linear(rgb & 255);
}

export function contrastRatio(a: number, b: number): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// #020202 and #F6F0DE leave every ground at least 4.26:1 from one of them, above WCAG's 3:1 for graphics (R3).
export function edgeFor(rgb: number): 'outline' | 'rim' {
  return contrastRatio(rgb, OUTLINE) >= contrastRatio(rgb, RIM) ? 'outline' : 'rim';
}
