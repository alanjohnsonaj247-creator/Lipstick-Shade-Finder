import type { ShadeData, ColorMatchResult } from "@/types";

/**
 * Convert hex color string to CIE Lab color space
 * for perceptually accurate Delta-E color distance
 */
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  // Normalize to 0-1
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  // Gamma correction (sRGB)
  rn = rn > 0.04045 ? ((rn + 0.055) / 1.055) ** 2.4 : rn / 12.92;
  gn = gn > 0.04045 ? ((gn + 0.055) / 1.055) ** 2.4 : gn / 12.92;
  bn = bn > 0.04045 ? ((bn + 0.055) / 1.055) ** 2.4 : bn / 12.92;

  // Observer: 2°, D65 illuminant
  const x = rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375;
  const y = rn * 0.2126729 + gn * 0.7151522 + bn * 0.072175;
  const z = rn * 0.0193339 + gn * 0.119192 + bn * 0.9503041;

  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // Reference white D65
  const rx = x / 0.95047;
  const ry = y / 1.0;
  const rz = z / 1.08883;

  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const fx = f(rx);
  const fy = f(ry);
  const fz = f(rz);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return [L, a, b];
}

export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * CIE76 Delta-E color distance
 * < 1.0: imperceptible difference
 * 1-2: noticeable on close inspection
 * 2-10: perceptibly different
 * > 10: clearly different
 */
export function deltaE76(hex1: string, hex2: string): number {
  const [L1, a1, b1] = hexToLab(hex1);
  const [L2, a2, b2] = hexToLab(hex2);
  return Math.sqrt((L2 - L1) ** 2 + (a2 - a1) ** 2 + (b2 - b1) ** 2);
}

/**
 * Find shades similar to a target hex, sorted by perceptual closeness.
 * threshold: maximum Delta-E distance to include (default 15)
 */
export function findSimilarShades(
  targetHex: string,
  shadeDb: ShadeData[],
  threshold: number = 15
): ColorMatchResult[] {
  return shadeDb
    .map((shade) => ({
      shade,
      distance: deltaE76(targetHex, shade.hexColor),
    }))
    .filter((r) => r.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Get closest shade match from the database
 */
export function findClosestShade(
  targetHex: string,
  shadeDb: ShadeData[]
): ColorMatchResult {
  const results = shadeDb.map((shade) => ({
    shade,
    distance: deltaE76(targetHex, shade.hexColor),
  }));
  return results.sort((a, b) => a.distance - b.distance)[0];
}
